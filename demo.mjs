import { PatchAutoFixer } from "./dist/main.mjs";

const fixer = new PatchAutoFixer();
const brokenPatch = `
*** Begin Patch
*** Update File: example.ts
@@
-const old = 'value';
+const new = 'value';
*** End Patch
`
  .trim()
  .replace(/\r\n/g, "\n");

const { success, result, fixes, error } = fixer.parse(brokenPatch);

if (success) {
  console.log("解析成功，AST:", result);
  console.log("应用的修复:", fixes);
} else {
  console.error(`   Unexpected token: ${JSON.stringify(error.token)}`);
  console.error(`   Expected: ${Array.from(error.expected).join(", ")}`);
  console.error(`   Line: ${error.line}, Column: ${error.column}`);
}
