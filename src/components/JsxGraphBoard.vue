<!--
  JsxGraphBoard —— JSXGraph 几何画板封装（P1 可视化组件）
  职责：
   - 通过 npm 包动态导入 JSXGraph（Vite 自动代码分割）
   - 在容器内初始化画板
   - 通过 boardCode（函数字符串）或 setup callback 绘制图形
   - 适配暗色主题（传入主题色）
  说明：本组件为通用画板封装，具体图形由调用方通过 setup 回调定义。
-->
<template>
  <div ref="container" class="jxg-board" :style="{ minHeight: height + 'px' }">
    <!-- 加载中 / 失败占位 -->
    <div v-if="state !== 'ready'" class="jxg-status">
      <div v-if="state === 'loading'" class="jxg-status__inner">
        <span class="block-spinner"></span> 正在加载图形…
      </div>
      <div v-else class="jxg-status__inner">
        <p class="jxg-error-msg">⚠️ 图形组件加载失败</p>
        <button class="jxg-retry" type="button" @click="init">🔄 重试</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted } from 'vue'
// JSXGraph 样式（复制自 jsxgraph 包，避免包 exports 映射限制深路径导入）
import '@/assets/css/jsxgraph.css'

const props = defineProps({
  // 画板高度
  height: { type: Number, default: 300 },
  // 画板初始化回调 (board, colors) => void
  setup: { type: Function, default: null },
  // 边界框 [xMin, yMax, xMax, yMin]
  boundingbox: { type: Array, default: () => [-5, 4, 5, -4] },
  // 固定模式：仅作为图形示例时开启，禁止拖拽/缩放/平移
  fixed: { type: Boolean, default: false }
})

const container = ref(null)
// 加载状态：loading 加载中 / ready 就绪 / error 失败
const state = ref('loading')
let board = null

// 加载 JSXGraph 库（幂等，通过 npm 动态导入）
async function loadJsxGraph() {
  try {
    // 通过 Vite 动态导入 jsxgraph npm 包（ESM 入口 src/index.js）
    const mod = await import('jsxgraph')
    return window.JXG || mod.default || mod.JXG || mod
  } catch (e) {
    console.error('[JsxGraphBoard] 加载失败:', e)
    return null
  }
}

async function init() {
  state.value = 'loading'
  if (container.value) container.value.innerHTML = ''

  const JXG = await loadJsxGraph()
  if (!JXG || !container.value) {
    state.value = 'error'
    return
  }

  const isDark = document.documentElement.dataset.theme === 'dark'
  // 主题配色
  const colors = {
    bg: isDark ? '#1f232c' : '#ffffff',
    primary: isDark ? '#6a9bff' : '#2f6fed',
    accent: isDark ? '#ff8a4c' : '#e8590c',
    text: isDark ? '#e6e9ef' : '#1f2430',
    muted: isDark ? '#aab2c0' : '#5b6472'
  }

  // 初始化画板（固定模式禁用平移与缩放）
  board = JXG.JSXGraph.initBoard(container.value, {
    boundingbox: props.boundingbox,
    axis: false,
    showCopyright: false,
    grid: false,
    backgroundColor: colors.bg,
    pan: props.fixed ? { enabled: false } : { enabled: true },
    zoom: props.fixed ? { enabled: false } : { enabled: true }
  })

  // 调用业务方回调绘制图形
  if (props.setup) {
    try {
      props.setup(board, colors, JXG)
    } catch (e) {
      console.error('[JsxGraphBoard] setup 回调执行失败:', e)
    }
  }

  // 固定模式：冻结所有可拖拽元素（图形示例保持固定不变）
  if (props.fixed) {
    try {
      board.objectsList.forEach((el) => {
        if (el && typeof el.setAttribute === 'function') {
          el.setAttribute({ fixed: true })
        }
      })
    } catch (e) {
      console.warn('[JsxGraphBoard] 固定元素失败:', e)
    }
  }

  state.value = 'ready'
}

onMounted(init)

onUnmounted(() => {
  // 清理画板资源
  if (board) {
    try { board.suspendUpdate() } catch (e) { /* ignore */ }
  }
})
</script>

<style scoped>
.jxg-board { width: 100%; border-radius: var(--radius-md); overflow: hidden; }
.jxg-status {
  display: flex; align-items: center; justify-content: center;
  min-height: inherit; /* 继承画板高度，占位铺满 */
}
.jxg-status__inner {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; color: var(--text-muted); font-size: 0.85rem;
  padding: 24px;
}
.jxg-error-msg { color: var(--danger); }
.jxg-retry {
  min-height: 40px; padding: 0 18px;
  background: var(--primary); color: #fff;
  border-radius: var(--radius-full);
  font-size: 0.85rem; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
</style>
