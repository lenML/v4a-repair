import {
  LarkError,
  ConfigurationError,
  GrammarError,
  ParseError,
  LexError,
  UnexpectedInput,
  UnexpectedCharacters,
  UnexpectedEOF,
  UnexpectedToken,
  VisitError,
} from "../src/v4a_parser";
import path from "path";
import fs from "fs";
import { PatchAutoFixer } from "../src/main";

const load_case = (filepath: string) =>
  fs.readFileSync(filepath, "utf-8").replace(/\r\n/g, "\n");

const each_cases = (dir_path: string) =>
  fs
    .readdirSync(dir_path)
    .filter((f) => f.endsWith(".txt"))
    .map((x) => path.join(dir_path, x));

try {
  const cases = each_cases("./tests/temp");
  for (const case_name of cases) {
    console.log("=".repeat(5) + ` Case ${case_name}`);
    const sourceText = load_case(case_name);

    const fixer = new PatchAutoFixer();
    const { success, result, fixes, error } = fixer.parse(sourceText, 10);

    if (success) {
      console.log("✅ Parse succeeded");
      console.log(
        "Applied fixes:",
        fixes.map((x) => x.type)
      );
      console.log("Applied fixes:", fixes.length);
      // console.log("AST:", result);
    } else {
      console.log(`--- INPUT START ---\n${sourceText}\n--- INPUT END ---`);
      throw error;
    }

    console.log("=".repeat(5) + ` Case ${case_name}.txt DONE`);
  }
} catch (error) {
  // 1. 处理 Lark 自身的错误
  if (error instanceof UnexpectedInput) {
    // 所有 UnexpectedInput 子类都有 get_context 方法
    console.error("❌ Parsing/Lexing error:");
    if (error instanceof UnexpectedToken) {
      console.error(`   Unexpected token: ${JSON.stringify(error.token)}`);
      console.error(`   Expected: ${Array.from(error.expected).join(", ")}`);
      console.error(`   Line: ${error.line}, Column: ${error.column}`);
    } else if (error instanceof UnexpectedCharacters) {
      console.error(`   Unexpected character: '${error.char}'`);
      console.error(`   Allowed: ${error.allowed?.join(", ") || "unknown"}`);
      console.error(`   Line: ${error.line}, Column: ${error.column}`);
    } else if (error instanceof UnexpectedEOF) {
      console.error(`   Unexpected end of input`);
      console.error(`   Expected: ${Array.from(error.expected).join(", ")}`);
    }
  } else if (error instanceof GrammarError) {
    console.error("❌ Grammar error (invalid syntax definition):");
    console.error(`   ${error.message}`);
  } else if (error instanceof ConfigurationError) {
    console.error("❌ Configuration error:");
    console.error(`   ${error.message}`);
  } else if (error instanceof ParseError) {
    console.error("❌ Generic parse error:");
    console.error(`   ${error.message}`);
  } else if (error instanceof LexError) {
    console.error("❌ Lexer error:");
    console.error(`   ${error.message}`);
  } else if (error instanceof VisitError) {
    console.error("❌ Visitor error (while processing rule):");
    console.error(`   Rule: ${error.rule}`);
    console.error(`   Original exception: ${error.orig_exc}`);
  } else if (error instanceof LarkError) {
    // 其他 LarkError 基类
    console.error("❌ Lark error:");
    console.error(`   ${error.message}`);
  } else {
    // 非 Lark 异常（如文件不存在等）
    console.error("❌ Unexpected error:");
    console.error(error);
  }

  // 可选：打印堆栈以便调试（仅在开发环境或详细模式下）
  if (process.env.NODE_ENV !== "production") {
    console.error("\n--- Stack trace ---");
    console.error(error.stack);
  }
}
