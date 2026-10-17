import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * Vitest 测试配置
 * 复用 Vite 的 alias（@ -> src），保证测试与运行时导入路径一致
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globals: true,
    // ⚠️ 默认 5s 对「全仓扫描」类用例（content-style / csp-guard / 产物自检）过紧：
    //    它们要遍历 src/content/** 与 src/**，单机只要 2–6s，但并发争抢下会撞线
    //    （2026-10-17 实证：S5 新增 11 个测试文件后，CI 的并行跑法有 8 例超时）。
    //    放宽到 15s 只为消除「跑得慢」与「挂住了」的混淆；真正慢的（如 CLI 子进程）
    //    仍由用例自己显式声明超时，不靠全局兜底。
    testTimeout: 15000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // 覆盖范围 = 全部逻辑代码。此前只列 2 个文件，导致「哪些模块没测」只能靠
      // 引用关系粗估（QA R5 实证：137 个代码文件中 55 个未被任何测试文本引用）。
      // 排除 src/content/**：那是纯数据 ESM（零 import 的页面/题库数据），
      // 测它没有意义，且会把数字稀释到看不出问题。
      include: ['src/**/*.{js,vue}'],
      exclude: [
        'src/content/**',
        'src/types/**',        // 仅类型声明
        'src/assets/**',       // 静态资源
        '**/*.config.js'
      ]
    }
  }
})
