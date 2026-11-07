<!--
  FunctionPlayground —— 函数图像计算器（jsxgraph 版，替代原 GeoGebra 演练场）
  职责：
   - 用 jsxgraph 画函数图像（显函数用 curve，隐函数用 implicitcurve）
   - 表达式由 expr-eval 求值（CSP 安全：只用 evaluate 解释器路径，不用动态编译 API）
   - 支持自由输入（回车添加）、8 个示例一键载入、清空、全屏、尺寸自适应
   - 多条表达式各用一种颜色区分；单条解析失败只在该行报错，不影响其它条
  说明：完全离线、不联网、不碰 CSP。换掉 GeoGebra 是因为它的 GWT 引导脚本
        会在运行期注入内联 <script>，被生产 CSP 的 script-src 'self' 拦下 → 区块白屏。
-->
<template>
  <div class="fp-playground">
    <!-- 头部工具条 -->
    <div class="fp-head">
      <span class="fp-title">🧮 函数图像计算器</span>
      <div class="fp-tools">
        <label class="fp-example-label">载入示例：</label>
        <button
          v-for="(ex, i) in examples"
          :key="i"
          class="fp-example"
          type="button"
          title="载入该示例表达式"
          @click="loadExample(ex.expression)"
        >{{ ex.label }}</button>
        <button class="fp-clear" type="button" title="清空全部表达式" @click="clearExpressions">清空</button>
        <button
          class="fp-full"
          type="button"
          :class="{ active: fullscreen }"
          :title="fullscreen ? '退出全屏' : '进入全屏'"
          @click="toggleFullscreen"
        >{{ fullscreen ? '⤢ 退出' : '⤢ 全屏' }}</button>
      </div>
    </div>

    <!-- 画板 -->
    <div class="fp-body">
      <!-- jsxgraph 专用宿主：仅由 jsxgraph 填充，Vue 不管理其子节点（清空它不会波及下方状态节点）
           —— 复刻 JsxGraphBoard 的结论：绝不 innerHTML 清空 Vue 管理的节点，否则 insertBefore 噪声 -->
      <div ref="boardEl" class="fp-board"></div>

      <div v-if="state === 'loading'" class="fp-state">
        <span class="fp-spinner"></span> 正在加载图形引擎…
      </div>
      <div v-else-if="state === 'error'" class="fp-state fp-error">
        <div>⚠️ 图形引擎加载失败。</div>
        <button class="fp-retry" type="button" @click="initBoard">🔄 重新加载</button>
      </div>
    </div>

    <!-- 表达式列表 + 输入框 -->
    <div class="fp-inputs">
      <div
        v-for="item in entries"
        :key="item.id"
        class="fp-row"
        :class="{ 'fp-row--error': errors[item.id] }"
      >
        <span class="fp-swatch" :style="{ background: item.color }"></span>
        <code class="fp-expr">{{ item.text }}</code>
        <span v-if="errors[item.id]" class="fp-row-msg">{{ errors[item.id] }}</span>
        <button class="fp-remove" type="button" title="移除该表达式" @click="removeEntry(item.id)">✕</button>
      </div>

      <div class="fp-row fp-row--input">
        <input
          v-model="draft"
          class="fp-input"
          type="text"
          spellcheck="false"
          placeholder="输入表达式后回车，如：f(x)=x^2、y=2x+1、y^2-2x+4y=0"
          @keyup.enter="submitDraft"
        />
        <button class="fp-add" type="button" @click="submitDraft">添加</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { plotExpression } from '@/utils/functionPlot'

const props = defineProps({
  // 初始表达式（可选），字符串数组，如 ["y = x^2 - 2x - 3", "y = -(x+1)^2 + 4"]
  initialExpressions: { type: Array, default: () => [] }
})

// 可复用示例（8 个；最后一个为隐函数）
const examples = [
  { label: '幂函数', expression: 'f(x) = x^2' },
  { label: '一次函数', expression: 'f(x) = 2x + 1' },
  { label: '正弦', expression: 'f(x) = sin(x)' },
  { label: '对数', expression: 'f(x) = ln(x)' },
  { label: '指数', expression: 'f(x) = 2^x' },
  { label: '反比例', expression: 'f(x) = 1/x' },
  { label: '二次函数', expression: 'f(x) = x^2 - 2x - 3' },
  { label: '抛物线（隐式）', expression: 'y^2 - 2x + 4y = 0' }
]

// 曲线配色（按添加顺序循环取用）
const PALETTE = ['#2f6fed', '#e8590c', '#12b886', '#e03131', '#7048e8', '#1098ad', '#f08c00', '#c2255c']

const boardEl = ref(null)
// 图形引擎加载状态：loading / ready / error
const state = ref('loading')
// 已添加的表达式条目：{ id, text, color }
const entries = ref([])
// 每条表达式的解析错误：{ [id]: message }
const errors = reactive({})
// 输入框草稿
const draft = ref('')
const fullscreen = ref(false)

let board = null
let drawnObjects = []
let seq = 0

/** 生成一条新表达式条目（分配自增 id 与配色） */
function makeEntry(text) {
  const id = ++seq
  return { id, text: String(text).trim(), color: PALETTE[(id - 1) % PALETTE.length] }
}

/** 动态导入 jsxgraph（幂等） */
async function loadJsxGraph() {
  try {
    const mod = await import('jsxgraph')
    return window.JXG || mod.default || mod.JXG || mod
  } catch (e) {
    console.error('[FunctionPlayground] 加载 jsxgraph 失败:', e)
    return null
  }
}

/** 按当前主题取画板配色 */
function themeColors() {
  const isDark = document.documentElement.dataset.theme === 'dark'
  return {
    bg: isDark ? '#1f232c' : '#ffffff',
    axis: isDark ? '#aab2c0' : '#5b6472',
    text: isDark ? '#e6e9ef' : '#1f2430'
  }
}

/** 取当前画板可见的 x 范围（用于显函数采样） */
function currentRange() {
  try {
    const bb = board && typeof board.getBoundingBox === 'function' ? board.getBoundingBox() : null
    if (Array.isArray(bb) && bb.length === 4) return [bb[0], bb[2]]
  } catch (e) {
    /* ignore */
  }
  return [-6, 6]
}

/** 初始化画板（可重入：重试时先释放旧画板） */
async function initBoard() {
  state.value = 'loading'
  if (board) {
    try { window.JXG.JSXGraph.freeBoard(board) } catch (e) { /* ignore */ }
    board = null
  }
  drawnObjects = []
  if (boardEl.value) boardEl.value.innerHTML = ''

  const JXG = await loadJsxGraph()
  if (!JXG || !boardEl.value) {
    state.value = 'error'
    return
  }

  const c = themeColors()
  board = JXG.JSXGraph.initBoard(boardEl.value, {
    boundingbox: [-6, 5, 6, -5],
    axis: true,
    grid: false,
    showCopyright: false,
    showNavigation: false,
    showInfobox: false,
    backgroundColor: c.bg,
    // 让坐标轴/刻度在当前主题下可见（默认是深色，暗色主题下会看不清）
    defaultAxes: {
      x: { strokeColor: c.axis, ticks: { strokeColor: c.axis, label: { strokeColor: c.text } } },
      y: { strokeColor: c.axis, ticks: { strokeColor: c.axis, label: { strokeColor: c.text } } }
    }
  })
  state.value = 'ready'
  redraw()
}

/** 重绘：清掉上一轮元素后按当前条目重画；单条失败只记该条错误 */
function redraw() {
  if (!board) return
  for (const el of drawnObjects) {
    try { board.removeObject(el) } catch (e) { /* ignore */ }
  }
  drawnObjects = []

  const range = currentRange()
  for (const item of entries.value) {
    try {
      const { elements } = plotExpression(board, item.text, { color: item.color, range })
      drawnObjects.push(...elements)
      if (errors[item.id]) delete errors[item.id]
    } catch (e) {
      errors[item.id] = e && e.message ? e.message : String(e)
    }
  }
  try { board.update() } catch (e) { /* ignore */ }
}

/** 追加一条表达式并重绘 */
function addText(text) {
  const t = String(text == null ? '' : text).trim()
  if (!t) return
  entries.value.push(makeEntry(t))
  redraw()
}

/** 提交输入框草稿 */
function submitDraft() {
  const t = draft.value.trim()
  if (!t) return
  addText(t)
  draft.value = ''
}

/** 载入示例 */
function loadExample(expr) {
  addText(expr)
}

/** 移除一条 */
function removeEntry(id) {
  entries.value = entries.value.filter((it) => it.id !== id)
  delete errors[id]
  redraw()
}

/** 清空全部 */
function clearExpressions() {
  entries.value = []
  Object.keys(errors).forEach((k) => delete errors[k])
  redraw()
}

/** 切换全屏 */
function toggleFullscreen() {
  const el = boardEl.value
  if (!el) return
  if (!document.fullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}
function onFsChange() {
  fullscreen.value = !!document.fullscreenElement
}

onMounted(async () => {
  document.addEventListener('fullscreenchange', onFsChange)
  await initBoard()
  // 播种初始表达式（一次重绘）
  const seed = Array.isArray(props.initialExpressions) ? props.initialExpressions : []
  let changed = false
  for (const t of seed) {
    if (typeof t === 'string' && t.trim()) {
      entries.value.push(makeEntry(t))
      changed = true
    }
  }
  if (changed) redraw()
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFsChange)
  if (board) {
    try { window.JXG.JSXGraph.freeBoard(board) } catch (e) { /* ignore */ }
    board = null
  }
})
</script>

<style scoped>
.fp-playground {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.fp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}
.fp-title { font-weight: 700; font-size: 0.95rem; }
.fp-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.fp-example-label { font-size: 0.78rem; color: var(--text-muted); }
.fp-example, .fp-clear, .fp-full {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-full);
  padding: 4px 12px;
  font-size: 0.78rem;
  transition: all 0.15s;
}
.fp-example:hover { border-color: var(--primary); color: var(--primary); }
.fp-clear:hover { border-color: var(--danger); color: var(--danger); }
.fp-full:hover { border-color: var(--primary); color: var(--primary); }
.fp-full.active { background: var(--primary); color: #fff; border-color: var(--primary); }

.fp-body { position: relative; }
.fp-board { width: 100%; height: 440px; }
.fp-state {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  background: var(--surface);
}
.fp-error { color: var(--danger); }
.fp-spinner {
  width: 22px; height: 22px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: fp-spin 0.8s linear infinite;
}
@keyframes fp-spin { to { transform: rotate(360deg); } }
.fp-retry {
  border: 1px solid var(--primary); color: var(--primary);
  background: var(--primary-soft); border-radius: var(--radius-full);
  padding: 6px 18px;
}

.fp-inputs {
  border-top: 1px solid var(--border);
  padding: 10px 14px;
  display: flex; flex-direction: column; gap: 8px;
  background: var(--surface);
}
.fp-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
.fp-row--error { color: var(--danger); }
.fp-swatch { width: 12px; height: 12px; border-radius: 3px; flex: 0 0 auto; }
.fp-expr {
  flex: 1 1 auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.fp-row-msg { color: var(--danger); font-size: 0.78rem; flex: 0 1 auto; }
.fp-remove {
  flex: 0 0 auto; width: 26px; height: 26px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--surface); color: var(--text-muted);
  line-height: 1;
}
.fp-remove:hover { color: var(--danger); border-color: var(--danger); }
.fp-input {
  flex: 1 1 auto; min-height: 38px; padding: 0 12px;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  background: var(--surface); color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
}
.fp-add {
  flex: 0 0 auto; min-height: 38px; padding: 0 16px;
  border: 1px solid var(--primary); color: #fff;
  background: var(--primary); border-radius: var(--radius-full);
  font-size: 0.85rem; font-weight: 600;
}

@media (max-width: 600px) {
  .fp-board { height: 300px; }
  .fp-title { width: 100%; }
  .fp-tools { width: 100%; }
  .fp-example, .fp-clear, .fp-full {
    min-height: 44px;
    padding: 8px 14px;
    font-size: 0.82rem;
  }
}
</style>
