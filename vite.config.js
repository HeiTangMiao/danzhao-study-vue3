import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath, URL } from 'node:url'

/**
 * Vite 构建配置
 * 说明：
 * - build.outDir 指向 dist，供 Tauri frontendDist 消费
 * - base: './' 使用相对路径，兼容 Tauri 本地协议（tauri://）
 * - server.port 固定端口，供 Tauri devUrl 引用
 */
export default defineConfig({
  plugins: [
    vue(),
    // 体积分析开关：`ANALYZE=1` 时输出 bundle 明细到 dist/stats.html（网络图，便于人工排查大块）
    ...(process.env.ANALYZE === '1'
      ? [visualizer({ filename: 'dist/stats.html', gzipSize: true })]
      : [])
  ],
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
    sourcemap: false,
    // 超过该体积的 chunk 才告警
    // jsxgraph(~1MB) / mermaid 图类型(~700KB) 为动态按需加载库，属正常情况，故阈值放宽
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 函数式手动拆分：按依赖类别拆分 vendor chunk
        //  - 主 chunk 只保留业务代码，浏览器并行加载 + 长期缓存
        //  - mermaid / jsxgraph 保持动态 import 按需加载（chunk 间通过 import 连接）
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // 仅拆分静态导入的运行时依赖：
          //  - vue 全家桶独立成 chunk，浏览器可并行加载且长期缓存
          //  - katex 独立成 chunk
          //  - mermaid / jsxgraph 通过动态 import 按需加载，交由 Rollup 自动分割
          //    （强制合并会破坏按需加载并产生循环 chunk，故不在此处理）
          if (id.includes('/node_modules/vue/') || id.includes('/node_modules/pinia/') || id.includes('/node_modules/vue-router/')) return 'vendor-vue'
          if (id.includes('/node_modules/katex/')) return 'vendor-katex'
          // jsxgraph（几何画板，~1MB）仅被 GeometryBlock 动态引用；强制独立 chunk，避免被提升进主包
          if (id.includes('/node_modules/jsxgraph/')) return 'vendor-jsxgraph'
          return undefined
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    // 开发期把 /api 代理到本地后端（生产由 Nginx 反代）
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    },
    watch: {
      // 忽略 Rust 构建产物等重型目录，避免超出系统文件监听上限
      ignored: ['**/src-tauri/target/**', '**/dist/**', '**/node_modules/**']
    }
  }
})