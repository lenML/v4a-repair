import { PatchAutoFixer } from "../dist/main.mjs";
import { readFileSync } from "fs";

function main() {
  // 1. 读取 Codex 钩子传来的完整 JSON 数据
  const rawInput = readFileSync(0, "utf-8").trim();
  let hookData;
  try {
    hookData = JSON.parse(rawInput);
  } catch {
    // 解析失败 -> 阻止执行 (退出码0)，静默失败
    console.log("{}");
    process.exit(0);
  }

  const originalPatch = hookData?.tool_input?.command || "";
  if (!originalPatch) {
    // 无输入，直接放行
    console.log("{}");
    process.exit(0);
  }

  try {
    const fixer = new PatchAutoFixer();
    const result = fixer.parse(originalPatch);

    // 仅当修复成功且内容有变化时，替换 tool_input
    if (result.success && result.fixedText !== originalPatch) {
      const tool_input = result.fixedText;
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            permissionDecision: "allow",
            updatedInput: {
              command: tool_input,
            },
          },
        })
      );
      process.exit(0);
    }
  } catch {}
  console.log("{}");
  process.exit(0);
}

main();
