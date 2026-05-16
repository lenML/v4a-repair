import { UnexpectedInput } from "./v4a_parser";

// 辅助函数：从右侧分割字符串，最多 maxsplit 次
function rsplit(str: string, sep: string, maxsplit: number): string[] {
  if (maxsplit === 0) return [str];
  const parts = str.split(sep);
  if (maxsplit < 0 || parts.length <= maxsplit + 1) return parts;
  const left = parts.slice(0, parts.length - maxsplit).join(sep);
  const right = parts.slice(parts.length - maxsplit);
  return [left, ...right];
}

// 辅助函数：将字符串中的制表符替换为空格（expandtabs 模拟）
function expandTabs(str: string, tabSize: number = 8): string {
  let result = "";
  let col = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "\t") {
      const spaces = tabSize - (col % tabSize);
      result += " ".repeat(spaces);
      col += spaces;
    } else {
      result += ch;
      col++;
    }
  }
  return result;
}

function myFixedGetContext(text: string, span: number = 40): string {
  const pos = this.pos_in_stream;
  if (pos === null || pos === undefined) {
    return "Unable to show context: position unknown.";
  }

  const start = Math.max(pos - span, 0);
  const end = Math.min(pos + span, text.length);

  // 提取出错位置之前的一整行（从最近换行开始）
  const beforeSlice = text.slice(start, pos);
  const beforeLines = rsplit(beforeSlice, "\n", 1);
  const before = beforeLines[beforeLines.length - 1];

  // 提取出错位置之后直到下一个换行
  const afterSlice = text.slice(pos, end);
  const afterLines = afterSlice.split("\n", 1);
  const after = afterLines[0];

  // 计算指示符的位置：需要展开制表符以对齐列
  const beforeExpanded = expandTabs(before);
  const pointer = " ".repeat(beforeExpanded.length) + "^\n";

  return before + after + "\n" + pointer;
}

// 修补 UnexpectedInput 原型
if (UnexpectedInput.prototype.get_context !== myFixedGetContext) {
  UnexpectedInput.prototype.get_context = myFixedGetContext;
}
