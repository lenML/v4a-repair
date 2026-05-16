import { PatchAutoFixer } from "../dist/main.mjs";
import { readFileSync } from "fs";

function main() {
  // 1. 读取 Codex 钩子传来的完整 JSON 数据
  const rawInput = readFileSync(0, "utf-8").trim();
  let hookData;
  try {
    hookData = JSON.parse(rawInput);
  } catch {
    // 解析失败 -> 阻止执行 (退出码2)，且无任何输出
    process.exit(2);
  }

  // 2. 提取需要修复的补丁文本
  const originalPatch = hookData.tool_input || "";
  if (!originalPatch) {
    // 无输入，直接放行
    console.log(JSON.stringify(hookData));
    process.exit(0);
  }

  // 3. 调用 v4a-repair，并静默处理所有情况
  try {
    const fixer = new PatchAutoFixer();
    const result = fixer.parse(originalPatch);

    // 仅当修复成功且内容有变化时，替换 tool_input
    if (result.success && result.fixedText !== originalPatch) {
      hookData.tool_input = result.fixedText;
    }
    // 其他情况（修复失败或内容无变化）保持原始输入不变
  } catch {
    // 修复过程中出现任何异常，同样静默保留原始输入
  }

  // 4. 输出最终数据，放行
  console.log(JSON.stringify(hookData));
  process.exit(0);
}

main();
