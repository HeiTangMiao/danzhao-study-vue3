<!--
  MindMapBlock —— 思维导图区块（Mermaid 封装）
  职责：
   - 将区块中的 mermaid 源码渲染为思维导图
   - 通过 npm 包动态加载 Mermaid 库，支持暗色主题联动
   - 方案 B2：语义着色（自动注入 classDef 分类配色）+ 缩放平移 + 点击联动正文知识点
   - 渲染失败时降级显示源码
-->
<template>
  <section class="block mindmap">
    <h3 class="block-title">🧠 {{ block.title || '知识结构导图' }}</h3>
    <div v-if="state === 'ready'" class="mm-legend">
      <span class="lg"><i class="dot c-key"></i>结论/性质</span>
      <span class="lg"><i class="dot c-method"></i>方法/技巧</span>
      <span class="lg"><i class="dot c-judge"></i>判定/识别</span>
      <span class="lg"><i class="dot c-err"></i>易错/注意</span>
      <span class="lg"><i class="dot c-conc"></i>概念/其他</span>
    </div>
    <div v-if="state === 'ready'" class="mm-toolbar">
      <button class="mm-btn" type="button" title="放大" @click="zoomIn">＋</button>
      <button class="mm-btn" type="button" title="缩小" @click="zoomOut">－</button>
      <button class="mm-btn" type="button" title="适应窗口" @click="fitToView">⤢</button>
      <button class="mm-btn" type="button" title="复位" @click="resetView">⟳</button>
      <span class="mm-hint">按钮缩放 · 拖拽移动 · 点击节点跳转正文</span>
    </div>
    <div ref="viewport" class="mindmap-viewport" @wheel.prevent="onWheel">
      <div ref="canvas" class="mindmap-canvas" :style="canvasStyle">
        <div ref="container" class="mindmap-content"></div>
      </div>
      <!-- 加载中 / 失败占位（覆盖在视口上，不卸载画布容器，便于重试复用） -->
      <div v-if="state === 'loading'" class="mm-status">
        <span class="block-spinner"></span> 正在加载思维导图…
      </div>
      <div v-else-if="state === 'error'" class="mm-status">
        <p class="mm-error-msg">⚠️ 思维导图加载失败</p>
        <button class="mm-retry" type="button" @click="renderMindmap">🔄 重试</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { loadMermaid, renderMermaidTo } from '@/composables/useMermaid'

const props = defineProps({
  block: { type: Object, required: true },
  // 页面上下文（用于点击联动定位到正文区块）
  context: { type: Object, default: () => ({ fileTitle: '' }) }
})

const viewport = ref(null)
const canvas = ref(null)
const container = ref(null)

// 加载状态：loading 加载中 / ready 就绪 / error 失败
const state = ref('loading')

// 缩放平移状态
const transform = reactive({ scale: 1, x: 0, y: 0 })
const MIN = 0.5, MAX = 4, STEP = 0.15

const canvasStyle = computed(() => ({
  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
  transformOrigin: '0 0'
}))

// 拖拽平移状态
let dragging = false, startX = 0, startY = 0
// 区分点击与拖拽：位移超过阈值视为拖拽
const DRAG_THRESHOLD = 5
let movedDist = 0

function zoomIn() { transform.scale = Math.min(MAX, +(transform.scale + STEP).toFixed(2)); clampPan() }
function zoomOut() { transform.scale = Math.max(MIN, +(transform.scale - STEP).toFixed(2)); clampPan() }

/**
 * 适应窗口：将思维导图整体缩放到视口内并居中（固定边界核心逻辑）
 * 内容小于视口时居中显示；大于视口时按比例缩小到刚好容纳。
 */
function fitToView() {
  if (!viewport.value || !container.value) return
  const vw = viewport.value.clientWidth
  const vh = viewport.value.clientHeight
  const cw = container.value.scrollWidth
  const ch = container.value.scrollHeight
  if (!cw || !ch) return
  const scale = Math.min(vw / cw, vh / ch, 1)
  transform.scale = Math.max(MIN, +(scale).toFixed(2))
  transform.x = (vw - cw * transform.scale) / 2
  transform.y = (vh - ch * transform.scale) / 2
}

function resetView() { fitToView() }

function onWheel(e) {
  const dir = e.deltaY < 0 ? 1 : -1
  const ns = Math.max(MIN, Math.min(MAX, +(transform.scale + dir * STEP).toFixed(2)))
  transform.scale = ns
  clampPan()
}

/**
 * 边界约束：内容始终被限制在固定视口内，无法被拖出边界。
 * 内容小于视口时居中；大于视口时限制平移范围，保证内容覆盖视口且不越界。
 */
function clampPan() {
  if (!viewport.value || !container.value) return
  const vw = viewport.value.clientWidth, vh = viewport.value.clientHeight
  const cw = container.value.scrollWidth * transform.scale
  const ch = container.value.scrollHeight * transform.scale
  transform.x = cw <= vw ? (vw - cw) / 2 : Math.max(vw - cw, Math.min(0, transform.x))
  transform.y = ch <= vh ? (vh - ch) / 2 : Math.max(vh - ch, Math.min(0, transform.y))
}

// 拖拽平移
function onPointerDown(e) {
  // 仅响应左键
  if (e.button !== 0 && e.pointerType === 'mouse') return
  dragging = true
  movedDist = 0
  startX = e.clientX - transform.x
  startY = e.clientY - transform.y
}
function onPointerMove(e) {
  if (!dragging) return
  const dx = e.clientX - startX - transform.x
  const dy = e.clientY - startY - transform.y
  movedDist = Math.max(movedDist, Math.hypot(dx, dy))
  if (movedDist < DRAG_THRESHOLD) return
  transform.x = e.clientX - startX
  transform.y = e.clientY - startY
  clampPan()
}
function onPointerUp() { dragging = false }

// 点击联动：节点 → 正文对应知识点锚点
function bindNodeClick() {
  const svg = container.value?.querySelector('svg')
  if (!svg) return
  // 给所有节点（g.node.withLabel）绑定点击
  const nodes = svg.querySelectorAll('.node')
  nodes.forEach((node) => {
    const textEl = node.querySelector('p, span, .nodeLabel')
    const label = (textEl?.textContent || '').trim()
    if (!label) return
    node.style.cursor = 'pointer'
    node.addEventListener('click', (e) => {
      // 拖拽后在原节点释放不应触发跳转
      if (movedDist >= DRAG_THRESHOLD) return
      e.stopPropagation()
      navigateToBlock(label)
    })
  })
}

function navigateToBlock(label) {
  // 联动条件：当前页有匹配区块标题的知识点
  // 工具函数：从标题关键词定位正文中的 knowledge 区块标题（如 "一、xxx" 等）
  const main = document.querySelector('.page-content')
  if (!main) return
  const anchors = main.querySelectorAll('.block-anchor')
  for (const a of anchors) {
    const h = a.querySelector('h3.block-title, .knowledge-title, .block h3')
    const t = h?.textContent?.trim() || ''
    // 匹配：导图节点标签包含正文标题主干，或标题包含节点标签主干
    const norm = (s) => s.replace(/^[一二三四五六七八九十]+[、.．]\s*/, '').replace(/\s*/g, '')
    const L = norm(label), T = norm(t)
    if (L && T && (L.includes(T) || T.includes(L)) && T.length >= 2) {
      a.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
  }
  // 未命中正文：无操作（保持导图可见）
}

// 渲染思维导图（可重试）：库加载/渲染失败时展示错误态
let dragBound = false
async function renderMindmap() {
  if (!container.value || !props.block.mermaid) {
    state.value = 'error'
    return
  }
  state.value = 'loading'
  try {
    const m = await loadMermaid()
    if (!m) { state.value = 'error'; return }

    await renderMermaidTo(container.value, props.block.mermaid, { decorate: true })
    // 库加载成功但容器仍无图（渲染静默失败）视为失败
    if (!container.value.querySelector('svg') && !container.value.querySelector('pre')) {
      state.value = 'error'
      return
    }

    bindNodeClick()
    state.value = 'ready'
    // 渲染完成后自动适应窗口（固定边界）
    requestAnimationFrame(() => fitToView())
    // 绑定视口拖拽（只绑定一次）
    if (!dragBound) {
      dragBound = true
      viewport.value.addEventListener('pointerdown', onPointerDown)
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    }
  } catch (e) {
    console.error('[MindMapBlock] 渲染失败:', e)
    state.value = 'error'
  }
}

onMounted(renderMindmap)

onBeforeUnmount(() => {
  viewport.value?.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  dragging = false
})
</script>

<style scoped>
.block-title { font-size: 1.05rem; font-weight: 600; margin: 0 0 12px; color: var(--text-primary, #2d3748); }
.mm-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-bottom: 10px; }
.lg { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-secondary, #4a5568); }
.lg .dot { width: 11px; height: 11px; border-radius: 3px; border: 1px solid rgba(0,0,0,.08); }
.c-key  { background: #FBF3E4; }
.c-method { background: #F4F6EC; }
.c-judge { background: #EBF3FE; }
.c-err  { background: #FDEFEB; }
.c-conc { background: #EEF4F2; }
.mm-toolbar { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.mm-btn {
  width: 30px; height: 30px; border: 1px solid var(--border, #e2e8f0);
  background: var(--surface, #fff); border-radius: 8px; cursor: pointer;
  font-size: 15px; line-height: 1; color: var(--text-primary, #2d3748);
  transition: background .15s, transform .1s;
}
.mm-btn:hover { background: var(--surface-muted, #f1f5f9); }
.mm-btn:active { transform: scale(.92); }
.mm-hint { font-size: 12px; color: var(--text-muted, #94a3b8); margin-left: 6px; }
.mindmap-viewport {
  position: relative; overflow: hidden;
  height: 460px; /* 固定边界：思维导图始终在固定高度的容器内 */
  border: 1px solid var(--border, #e2e8f0); border-radius: 12px;
  background: var(--surface, #fff); cursor: grab; touch-action: none;
}
.mindmap-viewport:active { cursor: grabbing; }
.mindmap-canvas { width: 100%; will-change: transform; }
.mindmap-content { padding: 16px; min-height: 100px; display: flex; align-items: center; justify-content: center; }
.mindmap-content svg { max-width: none; height: auto; display: block; }
.mindmap-content svg .node { transition: filter .15s; }
.mindmap-content svg .node:hover { filter: brightness(1.04); }

/* 加载中 / 失败占位 */
.mm-status {
  position: absolute; inset: 0; z-index: 2;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; background: var(--surface, #fff); color: var(--text-muted, #94a3b8);
  font-size: 0.85rem;
}
.mm-error-msg { color: var(--danger, #e03131); }
.mm-retry {
  min-height: 44px; padding: 0 20px;
  background: var(--primary); color: #fff;
  border-radius: 999px; font-size: 0.88rem; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
</style>