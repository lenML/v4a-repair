#!/usr/bin/env node

const fs = require("fs");
const readline = require("readline");

// 获取 JSONL 文件路径
const filePath = process.argv[2];
if (!filePath) {
  console.error("用法: node extract_failed_patches.js <jsonl文件路径>");
  process.exit(1);
}

// 存储 call_id -> input 内容
const callMap = new Map();
let caseCounter = 0;

const rl = readline.createInterface({
  input: fs.createReadStream(filePath),
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (!line.trim()) return;

  try {
    const record = JSON.parse(line);
    const payload = record.payload;
    if (!payload || typeof payload !== "object") return;

    // 匹配 apply_patch 调用
    if (payload.type === "custom_tool_call" && payload.name === "apply_patch") {
      const callId = payload.call_id;
      if (callId && payload.input !== undefined) {
        callMap.set(callId, payload.input);
      }
    }
    // 匹配 apply_patch 验证失败
    else if (
      payload.type === "custom_tool_call_output" &&
      typeof payload.output === "string" &&
      payload.output.startsWith("apply_patch verification failed")
    ) {
      const callId = payload.call_id;
      const inputContent = callMap.get(callId);
      if (inputContent) {
        caseCounter++;
        const fileName = `./tests/temp/${callId}.txt`;
        fs.writeFileSync(fileName, inputContent, "utf8");
        console.log(`已生成: ${fileName}`);
        callMap.delete(callId); // 可选：清理已处理的条目
      } else {
        console.warn(`警告: 未找到 call_id ${callId} 对应的 apply_patch 调用`);
      }
    }
  } catch (err) {
    console.warn("解析行时出错:", err.message);
  }
});

rl.on("close", () => {
  console.log(`处理完成，共生成 ${caseCounter} 个文件。`);
});
