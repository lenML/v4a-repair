# @lenml/v4a-repair

[![npm version](https://img.shields.io/npm/v/@lenml/v4a-repair.svg)](https://www.npmjs.com/package/@lenml/v4a-repair)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**v4a grammar repair** – 一个用于解析和自动修复 v4a patch 文件语法错误的 TypeScript 库。

v4a patch 是一种结构化 diff 格式，常用于代码生成、AI 辅助编辑等场景。本库基于 [Lark](https://github.com/lark-parser/lark) 语法解析器，能够识别常见的语法错误并自动修复，使不规范的 patch 文档仍能被正确解析。

## 特性

- ✅ 自动修复缺少行前缀（空格/`+`/`-`）的行
- ✅ 自动补全缺失的 `*** Begin Patch` / `*** End Patch`
- ✅ 纠正拼写错误的标记（如 `*** Begin Of Patch` → `*** Begin Patch`）
- ✅ 处理 `@@` 后多余空格导致换行的问题
- ✅ 在 `*** End Patch` 前自动关闭未闭合的 change block
- ✅ 返回详细的修复记录（类型、描述、计数等）
- ✅ **返回修复后的完整文本**（`fixedText`），可直接写回文件
- ✅ 纯 TypeScript 实现，提供完整类型定义

## 安装

```bash
npm install @lenml/v4a-repair
# 或
yarn add @lenml/v4a-repair
# 或
pnpm add @lenml/v4a-repair
```

## 快速开始

```typescript
import { PatchAutoFixer } from "@lenml/v4a-repair";

const fixer = new PatchAutoFixer();
const brokenPatch = `
*** Update File: example.ts
@@
-const old = 'value';
+const new = 'value';
*** End of the Patch
`.trim();

const { success, result, fixedText, fixes, error } = fixer.parse(brokenPatch);

if (success) {
  console.log("✅ 解析成功");
  console.log("修复后的 patch 文本：\n", fixedText);
  console.log("应用的修复：", fixes);
  // 可以继续使用 AST：result
} else {
  console.error("❌ 解析失败，错误信息：");
  if (error && typeof error === "object") {
    // 安全地输出错误信息，避免直接访问不存在的属性
    if ("token" in error)
      console.error(`   Token: ${JSON.stringify(error.token)}`);
    if ("expected" in error)
      console.error(`   Expected: ${Array.from(error.expected).join(", ")}`);
    if ("line" in error)
      console.error(`   Line: ${error.line}, Column: ${error.column}`);
  } else {
    console.error(error);
  }
}
```

## 获取修复后的文本

`parse` 方法返回的 `fixedText` 字段包含了所有自动修复应用后的完整 patch 文本。你可以直接将其写入文件，例如：

```typescript
import fs from "fs";
fs.writeFileSync("fixed.patch", fixedText);
```

## 自动修复示例

### 1. 缺少行前缀（空格/`+`/`-`）

```patch
@@
const foo = 123;
```

修复后：

```patch
@@
 const foo = 123;
```

### 2. 缺失 `*** Begin Patch`

```patch
*** Update File: test.txt
@@
+hello
```

修复后：

```patch
*** Begin Patch
*** Update File: test.txt
@@
+hello
```

### 3. 拼写错误的标记

```patch
*** Begin Of Patch
*** Update File: test.txt
@@
+world
*** End Of Patch
```

修复后：

```patch
*** Begin Patch
*** Update File: test.txt
@@
+world
*** End Patch
```

### 4. `@@` 后多余空格且直接换行

```patch
*** Begin Patch
*** Update File: test.txt
@@
 line
*** End Patch
```

修复后：

```patch
*** Begin Patch
*** Update File: test.txt
@@
 line
*** End Patch
```

## API 文档

### `class PatchAutoFixer`

#### `parse(sourceText: string, maxRetries?: number): ParseResult`

解析并修复 patch 文本。

- **参数**
  - `sourceText` – 原始 patch 字符串
  - `maxRetries` – 最大重试次数（默认 3）
- **返回值** `ParseResult`：

```typescript
interface ParseResult {
  success: boolean; // 解析是否成功
  result?: any; // 成功时的 AST（抽象语法树）
  fixedText?: string; // 修复后的完整 patch 文本（成功时）
  fixes: Fix[]; // 应用过的所有修复记录
  error?: any; // 失败时的原始错误对象
}

interface Fix {
  type: string; // 修复类型标识
  description: string; // 人类可读描述
  line?: number; // 涉及的行号（可选）
  count?: number; // 影响数量（可选）
}
```

### 修复类型说明

| type                               | 说明                                                     |
| ---------------------------------- | -------------------------------------------------------- |
| `missing_begin_patch`              | 文件开头缺少 `*** Begin Patch`，已自动添加               |
| `missing_end_patch`                | 文件末尾缺少 `*** End Patch`，已自动添加                 |
| `fix_begin_patch_spelling`         | 修正错误的 Begin 标记拼写                                |
| `fix_end_patch_spelling`           | 修正错误的 End 标记拼写                                  |
| `add_space_prefix`                 | 在 change block 内为缺少前缀的行添加空格                 |
| `remove_trailing_space_after_atat` | 移除 `@@ ` 后面的多余空格                                |
| `close_change_block_before_end`    | 在 `*** End Patch` 前插入 `@@` 关闭未闭合的 change block |

## Codex

在 `.codex/hooks.json` 中：

```json
{
  "event": "PreToolUse",
  "tool": "apply_patch",
  "command": "npx @lenml/v4a-repair codex",
  "timeout": 10000
}
```

## 许可证

MIT © [lenML](https://github.com/lenML)
