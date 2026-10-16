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
      include: ['src/composables/useSpacedReview.js', 'src/stores/studyDb.js']
    }
  }
})
