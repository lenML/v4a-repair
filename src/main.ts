import "./parser_patch";
import { get_parser } from "./v4a_parser";
import { UnexpectedInput, UnexpectedToken, UnexpectedEOF } from "./v4a_parser";

export interface Fix {
  type: string;
  description: string;
  line?: number;
  count?: number;
}

export interface ParseResult {
  success: boolean;
  result?: any;
  fixes: Fix[];
  error?: any;
}

export class PatchAutoFixer {
  private parser: any;

  constructor() {
    this.parser = get_parser();
  }

  public parse(sourceText: string, maxRetries = 3): ParseResult {
    let currentText = sourceText;
    const fixes: Fix[] = [];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = this.parser.parse(currentText);
        return { success: true, result, fixes };
      } catch (error) {
        if (attempt < maxRetries && this.isFixableError(error)) {
          const fixResult = this.attemptFix(currentText, error as any);
          if (fixResult && fixResult.fixedText !== currentText) {
            currentText = fixResult.fixedText;
            fixes.push(fixResult.fix);
            continue;
          }
        }
        return { success: false, fixes, error };
      }
    }
    return { success: false, fixes, error: new Error("Max retries exceeded") };
  }

  private isFixableError(error: any): boolean {
    return error instanceof UnexpectedToken || error instanceof UnexpectedEOF;
  }

  private attemptFix(
    sourceText: string,
    error: UnexpectedInput
  ): { fixedText: string; fix: Fix } | null {
    if (error instanceof UnexpectedToken) {
      const token = error.token;
      const expected = Array.from(error.expected || []);

      // 场景1：文件意外结束（$END）
      if (token && token.type === "$END") {
        const fixedText = sourceText.trimEnd() + "\n*** End Patch\n";
        return {
          fixedText,
          fix: {
            type: "missing_end_patch",
            description: 'Appended "*** End Patch"',
          },
        };
      }

      // 场景2：缺少文件开头 "*** Begin Patch"
      if (token && token.start_pos === 0 && expected.includes("__ANON_0")) {
        if (!sourceText.trimStart().startsWith("*** Begin Patch")) {
          const fixedText = "*** Begin Patch\n" + sourceText;
          return {
            fixedText,
            fix: {
              type: "missing_begin_patch",
              description: 'Prepended "*** Begin Patch"',
            },
          };
        }
      }

      // 场景3：修正错误的 Begin/End Patch 标记（拼写错误）
      if (token && token.value && typeof token.value === "string") {
        const trimmed = token.value.trim();
        // 处理 "*** Begin" 类错误
        if (
          trimmed.match(/^\*\*\*\s*Begin/i) &&
          !trimmed.match(/^\*\*\*\s*Begin\s+Patch$/i)
        ) {
          const lineStartPos = token.start_pos - (token.column - 1);
          const lineEndPos = sourceText.indexOf("\n", token.start_pos);
          const line = sourceText.substring(
            lineStartPos,
            lineEndPos !== -1 ? lineEndPos : undefined
          );
          const fixedLine = line.replace(
            /^\*\*\*\s*Begin.*$/i,
            "*** Begin Patch"
          );
          const fixedText =
            sourceText.substring(0, lineStartPos) +
            fixedLine +
            sourceText.substring(
              lineEndPos !== -1 ? lineEndPos : sourceText.length
            );
          if (fixedText !== sourceText) {
            return {
              fixedText,
              fix: {
                type: "fix_begin_patch_spelling",
                description: 'Fixed "Begin" marker to "*** Begin Patch"',
              },
            };
          }
        }
        // 处理 "*** End" 类错误
        if (
          trimmed.match(/^\*\*\*\s*End/i) &&
          !trimmed.match(/^\*\*\*\s*End\s+Patch$/i)
        ) {
          const lineStartPos = token.start_pos - (token.column - 1);
          const lineEndPos = sourceText.indexOf("\n", token.start_pos);
          const line = sourceText.substring(
            lineStartPos,
            lineEndPos !== -1 ? lineEndPos : undefined
          );
          const fixedLine = line.replace(/^\*\*\*\s*End.*$/i, "*** End Patch");
          const fixedText =
            sourceText.substring(0, lineStartPos) +
            fixedLine +
            sourceText.substring(
              lineEndPos !== -1 ? lineEndPos : sourceText.length
            );
          if (fixedText !== sourceText) {
            return {
              fixedText,
              fix: {
                type: "fix_end_patch_spelling",
                description: 'Fixed "End" marker to "*** End Patch"',
              },
            };
          }
        }
      }

      // 场景4：*** End of Patch 出现在 change block 内部
      if (
        token &&
        (token.value === "*** End of Patch" ||
          token.value === "*** End Patch") &&
        (expected.includes("SPACE") ||
          expected.includes(" ") ||
          expected.includes("MINUS") ||
          expected.includes("-") ||
          expected.includes("PLUS") ||
          expected.includes("+"))
      ) {
        const marker = token.value;
        const regex = new RegExp(
          `(\\r?\\n)?(${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
          "g"
        );
        const fixedText = sourceText.replace(regex, "\n@@\n$2");
        if (fixedText !== sourceText) {
          return {
            fixedText,
            fix: {
              type: "close_change_block_before_end",
              description: `Inserted "@@" to close change block before "${marker}"`,
            },
          };
        }
      }

      // 场景5：缺少行前缀
      const hasSpaceExpected =
        expected.includes("SPACE") || expected.includes(" ");
      const hasMinusExpected =
        expected.includes("MINUS") || expected.includes("-");
      const hasPlusExpected =
        expected.includes("PLUS") || expected.includes("+");

      if (hasSpaceExpected || hasMinusExpected || hasPlusExpected) {
        const lines = sourceText.split(/\r?\n/);
        let inChangeBlock = false;
        let fixedCount = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const stripped = line.trimStart();

          if (stripped === "@@" || stripped.startsWith("@@ ")) {
            inChangeBlock = true;
            continue;
          }
          if (
            inChangeBlock &&
            (stripped === "@@" ||
              stripped.startsWith("@@ ") ||
              stripped === "*** End of File" ||
              stripped.startsWith("*** End"))
          ) {
            inChangeBlock = false;
            continue;
          }
          if (inChangeBlock && !/^[+\- ]/.test(line)) {
            lines[i] = " " + line;
            fixedCount++;
          }
        }
        if (fixedCount > 0) {
          const fixedText = lines.join("\n");
          return {
            fixedText,
            fix: {
              type: "add_space_prefix",
              description: `Added space prefix to ${fixedCount} line(s)`,
              count: fixedCount,
            },
          };
        }
        return null;
      }

      // 场景6：@@ 后有空格且直接换行
      if (token && token.type === "LF") {
        const fixedText = sourceText.replace(/@@ \r?\n/g, "@@\n");
        if (fixedText !== sourceText) {
          const count = (sourceText.match(/@@ \r?\n/g) || []).length;
          return {
            fixedText,
            fix: {
              type: "remove_trailing_space_after_atat",
              description: `Removed trailing space after @@ (${count} occurrence(s))`,
              count,
            },
          };
        }
      }

      return null;
    }

    if (error instanceof UnexpectedEOF) {
      const fixedText = sourceText.trimEnd() + "\n*** End Patch\n";
      return {
        fixedText,
        fix: {
          type: "missing_end_patch",
          description: 'UnexpectedEOF: appended "*** End Patch"',
        },
      };
    }
    return null;
  }
}
