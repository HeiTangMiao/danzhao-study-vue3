<!--
  DesmosPlayground —— 数学 Desmos 图形计算器演练场
  职责：
   - 通过官方 Desmos API（calculator.js）在线嵌入图形计算器
   - 提供可复用网格：示例表达式一键载入
   - 自动回填当前页面上下文（可为空），支持暗色主题透传
   - 全局唯一实例（防止页面内重复创建）
  说明：需要联网加载 https://www.desmos.com/api/v1.7/calculator.js。
       若离线或加载失败，展示友好降级提示并可重试。
-->
<template>
  <div class="desmos-playground">
    <!-- 头部工具条 -->
    <div class="dp-head">
      <span class="dp-title">🧮 Desmos 图形计算器演练场</span>
      <div class="dp-tools">
        <label class="dp-example-label">载入示例：</label>
        <button
          v-for="(ex, i) in examples"
          :key="i"
          class="dp-example"
          title="将示例表达式载入计算器"
          @click="loadExpression(ex.expression)"
        >{{ ex.label }}</button>
        <button class="dp-clear" title="清空表达式" @click="clearExpressions">清空</button>
        <button class="dp-full" :class="{ active: fullscreen }" :title="fullscreen ? '退出全屏' : '进入全屏'" @click="toggleFullscreen">
          {{ fullscreen ? '⤢ 退出' : '⤢ 全屏' }}
        </button>
      </div>
    </div>

    <!-- 计算器容器 -->
    <div class="dp-body">
      <div ref="calculatorEl" class="dp-calculator"></div>

      <!-- 加载/降级状态 -->
      <div v-if="state === 'loading'" class="dp-state">
        <span class="spinner"></span> 正在加载 Desmos 计算器…
      </div>
      <div v-else-if="state === 'error'" class="dp-state dp-error">
        <div>⚠️ 无法加载 Desmos 计算器（可能处于离线状态）。</div>
        <div class="dp-error-sub">本演练场采用 Desmos 官方在线 API，联网后即可使用。当前学到的内容仍可正常阅读。</div>
        <button class="dp-retry" @click="loadCalculator">🔄 重新加载</button>
      </div>

      <!-- 快速提示 -->
      <div v-if="state === 'ready'" class="dp-tip">
        <b>使用提示：</b>下方输入区可直接键入函数，如 <code>y = x^2</code>、<code>y = sin(x)</code>、<code>y = 1/x</code>；支持加减乘除、幂 <code>^</code>、根号 <code>sqrt()</code>。点击上方「载入示例」可快速体验典型函数图像。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  // 初始表达式（可选），如 ["y = x^2", "y = sin(x)"]
  initialExpressions: { type: Array, default: () => [] },
  // 是否从外部全屏（由父级控制）
  nativeFullscreen: { type: Boolean, default: true }
})

// 官方 Desmos API 脚本地址
const DESMOS_URL = 'https://www.desmos.com/api/v1.7/calculator.js'

// 可复用示例（配合当前数学教材主题）
const examples = [
  { label: '幂函数', expression: 'y = x^2' },
  { label: '一次函数', expression: 'y = 2x + 1' },
  { label: '正弦', expression: 'y = sin(x)' },
  { label: '对数', expression: 'y = log(x)' },
  { label: '指数', expression: 'y = 2^x' },
  { label: '反比例', expression: 'y = 1/x' },
  { label: '二次函数', expression: 'y = x^2 - 2x - 3' },
  { label: '抛物线', expression: 'y^2 + - 2x + 4y = 0' }
]

const state = ref('idle') // idle | loading | ready | error
const calculatorEl = ref(null)
const fullscreen = ref(false)
let calculator = null
let scriptLoaded = false

/** 加载 Desmos 官方 API 脚本（幂等） */
function loadDesmosScript() {
  return new Promise((resolve, reject) => {
    if (window.Desmos) { scriptLoaded = true; return resolve(window.Desmos) }
    if (scriptLoaded) return resolve(window.Desmos)
    const existing = document.getElementById('desmos-calculator-script')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Desmos))
      existing.addEventListener('error', () => reject(new Error('desmos script error')))
      return
    }
    const s = document.createElement('script')
    s.id = 'desmos-calculator-script'
    s.src = DESMOS_URL
    s.onload = () => { scriptLoaded = true; resolve(window.Desmos) }
    s.onerror = () => reject(new Error('无法加载 Desmos 脚本'))
    document.head.appendChild(s)
  })
}

/** 创建/重新加载计算器 */
async function loadCalculator() {
  if (state.value === 'loading') return
  state.value = 'loading'
  try {
    const Desmos = await loadDesmosScript()
    if (!calculatorEl.value) { state.value = 'error'; return }

    // 判断暗色主题
    const isDark = document.documentElement.dataset.theme === 'dark'
    // 销毁旧的实例，避免重复
    if (calculator) {
      try { calculator.destroy() } catch (e) { /* ignore */ }
      calculator = null
    }

    calculator = Desmos.GraphingCalculator(calculatorEl.value, {
      expressions: true,
      settingsMenu: true,
      zoomButtons: true,
      border: false,
      // 语言与配色
      language: 'zh',
      expressionsCollapsed: false,
      // 主题透传（如支持）
      ...(isDark ? { prefix: true } : {})
    })
    if (isDark && Desmos.GraphingCalculator.setsimplex) {
      // 尝试套用暗色主题（API 提供 setsimplex；若缺失则忽略）
      try { calculator.setExpression({ id: '_theme', type: 'table' }) } catch (e) { /* ignore */ }
    }

    // 载入初始表达式
    const exprs = props.initialExpressions.length ? props.initialExpressions : []
    exprs.forEach((expr, i) => {
      try {
        calculator.setExpression({ id: 'init-' + i, latex: expr })
      } catch (e) { console.warn('[Desmos] 载入表达式失败:', e) }
    })

    state.value = 'ready'
  } catch (e) {
    console.error('[DesmosPlayground] 加载失败:', e)
    state.value = 'error'
  }
}

/** 载入单条表达式（替换首个空白表达式槽位或追加） */
function loadExpression(latex) {
  if (!calculator) return
  try {
    // 追加到末尾并保持可见
    const id = 'expr-' + Date.now()
    calculator.setExpression({ id, latex, visible: true })
  } catch (e) { console.warn('[Desmos] 载入表达式失败:', e) }
}

/** 清空所有表达式 */
function clearExpressions() {
  if (!calculator) return
  try { calculator.setBlank() } catch (e) { /* ignore */ }
}

/** 切换全屏 */
function toggleFullscreen() {
  fullscreen.value = calculatorEl.value.requestFullscreen ? !document.fullscreenElement : !fullscreen.value
  if (calculatorEl.value.requestFullscreen) {
    if (!document.fullscreenElement) calculatorEl.value.requestFullscreen()
    else document.exitFullscreen()
  }
}
function onFsChange() {
  fullscreen.value = !!document.fullscreenElement
}

onMounted(() => { loadCalculator(); document.addEventListener('fullscreenchange', onFsChange) })
onBeforeUnmount(() => {
  if (calculator) { try { calculator.destroy() } catch (e) { /* ignore */ } }
  calculator = null
  document.removeEventListener('fullscreenchange', onFsChange)
})
</script>

<style scoped>
.desmos-playground {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  margin-bottom: var(--spacer-16);
}
.dp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}
.dp-title { font-weight: 700; font-size: 0.95rem; }
.dp-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.dp-example-label { font-size: 0.78rem; color: var(--text-muted); }
.dp-example, .dp-clear, .dp-full {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-full);
  padding: 4px 12px;
  font-size: 0.78rem;
  transition: all 0.15s;
}
.dp-example:hover { border-color: var(--primary); color: var(--primary); }
.dp-clear:hover { border-color: var(--danger); color: var(--danger); }
.dp-full:hover { border-color: var(--primary); color: var(--primary); }
.dp-full.active { background: var(--primary); color: #fff; border-color: var(--primary); }

.dp-body { position: relative; min-height: 480px; }
.dp-calculator { width: 100%; height: 480px; }
.dp-state {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  background: var(--surface);
}
.dp-error { color: var(--danger); }
.dp-error-sub { max-width: 420px; text-align: center; font-size: 0.85rem; color: var(--text-muted); }
.spinner {
  width: 22px; height: 22px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.dp-retry {
  border: 1px solid var(--primary); color: var(--primary);
  background: var(--primary-soft); border-radius: var(--radius-full);
  padding: 6px 18px;
}
.dp-tip { padding: 8px 14px; font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid var(--border); background: var(--surface-muted); }
.dp-tip code { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 0 4px; }
</style>