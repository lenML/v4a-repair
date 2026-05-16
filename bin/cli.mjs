#!/usr/bin/env node
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

if (args[0] === "codex") {
  const codexScript = path.resolve(__dirname, "..", "scripts", "codex.mjs");
  const child = spawn(process.execPath, [codexScript], {
    stdio: "inherit",
  });
  child.on("exit", (code) => process.exit(code));
} else {
  console.log("Usage: npx @lenml/v4a-repair codex");
  process.exit(1);
}
