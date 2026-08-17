import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * Vite 构建配置
 * 说明：
 * - build.outDir 指向 dist，供 Tauri frontendDist 消费
 * - base: './' 使用相对路径，兼容 Tauri 本地协议（tauri://）
 * - server.port 固定端口，供 Tauri devUrl 引用
 */
export default defineConfig({
  plugins: [vue()],
  // 相对路径基础，兼容 Tauri 打包后的本地资源加载
  base: './',
  resolve: {
    alias: {
      // 使用 @ 指向 src，简化导入路径
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 关闭 sourcemap，减小打包体积（Tauri 应用体积敏感）
    sourcemap: false
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    watch: {
      // 忽略 Rust 构建产物等重型目录，避免超出系统文件监听上限
      ignored: ['**/src-tauri/target/**', '**/dist/**', '**/node_modules/**']
    }
  }
})