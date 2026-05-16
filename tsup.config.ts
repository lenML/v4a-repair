import { defineConfig } from "tsup";

// prettier-ignore
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['cjs', 'esm'],      // 输出 CommonJS 和 ESM
  dts: true,                   // 生成 .d.ts 类型声明文件
  clean: true,                 // 清空 dist
  sourcemap: true,             // 生成 .map 文件便于调试
  splitting: false,
  minify: false,
  target: 'node14',
  outDir: 'dist',
});
