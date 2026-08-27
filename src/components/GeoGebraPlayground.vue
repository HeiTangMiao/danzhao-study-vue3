<!--
  GeoGebraPlayground —— GeoGebra 图形计算器演练场
  职责：
   - 通过官方 GeoGebra Apps API（deployggb.js，www.geogebra.org）在线嵌入图形计算器
   - 提供可复用网格：示例表达式一键载入
   - 自动回填当前页面上下文（可为空），支持中文界面
   - 说明：需要联网加载 https://www.geogebra.org/apps/deployggb.js。
       若离线或加载失败，展示友好降级提示并可重试。
-->
<template>
  <div class="ggb-playground">
    <!-- 头部工具条 -->
    <div class="ggb-head">
      <span class="ggb-title">🧮 GeoGebra 图形计算器演练场</span>
      <div class="ggb-tools">
        <label class="ggb-example-label">载入示例：</label>
        <button
          v-for="(ex, i) in examples"
          :key="i"
          class="ggb-example"
          title="将示例表达式载入计算器"
          @click="loadExpression(ex.expression)"
        >{{ ex.label }}</button>
        <button class="ggb-clear" title="清空表达式" @click="clearExpressions">清空</button>
        <button class="ggb-full" :class="{ active: fullscreen }" :title="fullscreen ? '退出全屏' : '进入全屏'" @click="toggleFullscreen">
          {{ fullscreen ? '⤢ 退出' : '⤢ 全屏' }}
        </button>
      </div>
    </div>

    <!-- 计算器容器 -->
    <div class="ggb-body">
      <div ref="ggbEl" class="ggb-container"></div>

      <!-- 加载/降级状态 -->
      <div v-if="state === 'loading'" class="ggb-state">
        <span class="spinner"></span> 正在加载 GeoGebra 计算器…
      </div>
      <div v-else-if="state === 'error'" class="ggb-state ggb-error">
        <div>⚠️ 无法加载 GeoGebra 计算器（可能处于离线状态）。</div>
        <div class="ggb-error-sub">本演练场采用 GeoGebra 官方在线 API，联网后即可使用。当前学到的内容仍可正常阅读。</div>
        <button class="ggb-retry" @click="loadCalculator">🔄 重新加载</button>
      </div>

      <!-- 快速提示 -->
      <div v-if="state === 'ready'" class="ggb-tip">
        <b>使用提示：</b>下方输入区可直接键入函数，如 <code>f(x) = x^2</code>、<code>f(x) = sin(x)</code>、<code>f(x) = 1/x</code>；支持加减乘除、幂 <code>^</code>、根号 <code>sqrt()</code>。点击上方「载入示例」可快速体验典型函数图像。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  // 初始表达式（可选），如 ["f(x) = x^2", "f(x) = sin(x)"]
  initialExpressions: { type: Array, default: () => [] }
})

// 官方 GeoGebra Apps 部署脚本地址
const GGB_URL = 'https://www.geogebra.org/apps/deployggb.js'

// 可复用示例（配合当前数学教材主题，使用 GeoGebra 命令语法）
const examples = [
  { label: '幂函数', expression: 'f(x) = x^2' },
  { label: '一次函数', expression: 'f(x) = 2x + 1' },
  { label: '正弦', expression: 'f(x) = sin(x)' },
  { label: '对数', expression: 'f(x) = ln(x)' },
  { label: '指数', expression: 'f(x) = 2^x' },
  { label: '反比例', expression: 'f(x) = 1/x' },
  { label: '二次函数', expression: 'f(x) = x^2 - 2x - 3' },
  { label: '抛物线', expression: 'y^2 - 2x + 4y = 0' }
]

const state = ref('idle') // idle | loading | ready | error
const ggbEl = ref(null)
const fullscreen = ref(false)
let applet = null // GGBApplet 实例
let ggbApi = null // 应用 API（appletOnLoad 回调提供）
let loadTimer = null
let resizeTimer = null
let sizeObserver = null

/** 依据容器实际尺寸计算画布尺寸（移动端核心适配：真实测量而非固定基准） */
function computeSize() {
  const el = ggbEl.value
  if (!el) return null
  const cw = el.clientWidth
  if (!cw || cw <= 0) return null
  // 宽度紧跟容器（设合理上限）；高度沿用容器既有 min-height（桌面 480 / 移动 300 / 浮层按 vh），不破坏原有响应式
  const width = Math.min(Math.max(Math.floor(cw), 280), 1200)
  const height = Math.min(Math.max(el.clientHeight || 480, 300), 720)
  return { width, height }
}

/** 将计算器尺寸与当前容器同步，避免固定尺寸在移动端溢出或留白 */
function applySize() {
  const size = computeSize()
  if (!size) return
  if (ggbApi) {
    try { ggbApi.setSize(size.width, size.height) } catch (e) { /* ignore */ }
  }
  if (ggbEl.value) ggbEl.value.style.height = size.height + 'px'
}

/** 视口/容器尺寸变化（旋转屏幕、面板开合等）时重新适配 */
function onContainerResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(applySize, 150)
}

/** 加载 GeoGebra 部署脚本（幂等：已加载直接返回，加载中复用节点等待，失败清理节点） */
function loadGGBScript() {
  return new Promise((resolve, reject) => {
    // 已加载完成：直接返回
    if (window.GGBApplet) { return resolve(window.GGBApplet) }

    // 已存在脚本节点（加载中）：等待其完成，避免重复添加
    const existing = document.getElementById('geogebra-deploy-script')
    if (existing) {
      const onLoad = () => { cleanup(); resolve(window.GGBApplet) }
      const onError = () => {
        cleanup()
        // 移除失败节点，避免残留节点导致后续重试永远等待（事件只触发一次）
        try { existing.remove() } catch (e) { /* ignore */ }
        reject(new Error('geogebra script error'))
      }
      const cleanup = () => {
        existing.removeEventListener('load', onLoad)
        existing.removeEventListener('error', onError)
      }
      existing.addEventListener('load', onLoad)
      existing.addEventListener('error', onError)
      return
    }

    const s = document.createElement('script')
    s.id = 'geogebra-deploy-script'
    s.src = GGB_URL
    s.onload = () => { resolve(window.GGBApplet) }
    s.onerror = () => {
      // 移除失败节点，避免残留节点导致后续重试永远等待
      try { s.remove() } catch (e) { /* ignore */ }
      reject(new Error('无法加载 GeoGebra 脚本'))
    }
    document.head.appendChild(s)
  })
}

/** 创建/重新加载计算器 */
async function loadCalculator() {
  if (state.value === 'loading') return
  // 开始全新加载前清除可能悬挂的旧计时器，保证状态一致
  clearTimeout(loadTimer)
  state.value = 'loading'
  try {
    const GGBApplet = await loadGGBScript()
    if (!ggbEl.value) { state.value = 'error'; return }

    // 销毁旧的实例，避免重复
    if (applet) {
      try { applet.remove() } catch (e) { /* ignore */ }
      applet = null
      ggbApi = null
    }

    // 按容器实际尺寸注入，移动端不再依赖固定基准 + CSS 硬缩放
    const size = computeSize() || { width: 980, height: 480 }
    const params = {
      appName: 'graphing',
      width: size.width,
      height: size.height,
      showToolBar: false,
      showMenuBar: false,
      showAlgebraInput: true,
      showResetIcon: false,
      enableRightClick: false,
      enableShiftDragZoom: true,
      allowStyleBar: false,
      language: 'zh',
      appletOnLoad: (api) => {
        ggbApi = api
        // 加载完成后再同步一次容器尺寸，消除首屏误差
        applySize()
        // 载入初始表达式
        const exprs = props.initialExpressions
        exprs.forEach((expr) => {
          try { api.evalCommand(expr) } catch (e) { console.warn('[GeoGebra] 载入表达式失败:', e) }
        })
        clearTimeout(loadTimer)
        state.value = 'ready'
      }
    }
    // 加载超时兜底：官方脚本/CAS 引擎加载失败时不再无限转圈
    clearTimeout(loadTimer)
    loadTimer = setTimeout(() => {
      if (state.value === 'loading') {
        console.warn('[GeoGebraPlayground] 加载超时')
        state.value = 'error'
      }
    }, 30000)

    applet = new GGBApplet(params, true)
    applet.inject(ggbEl.value)
  } catch (e) {
    console.error('[GeoGebraPlayground] 加载失败:', e)
    clearTimeout(loadTimer)
    state.value = 'error'
  }
}

/** 载入单条表达式（追加到当前构造） */
function loadExpression(expr) {
  if (!ggbApi) return
  try { ggbApi.evalCommand(expr) } catch (e) { console.warn('[GeoGebra] 载入表达式失败:', e) }
}

/** 清空所有表达式 */
function clearExpressions() {
  if (!ggbApi) return
  try { ggbApi.newConstruction() } catch (e) { /* ignore */ }
}

/** 切换全屏 */
function toggleFullscreen() {
  const el = ggbEl.value
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

onMounted(() => {
  loadCalculator()
  document.addEventListener('fullscreenchange', onFsChange)
  window.addEventListener('resize', onContainerResize)
  window.addEventListener('orientationchange', onContainerResize)
  // 容器尺寸变化（面板开合、折叠卡展开等）也能触发重新适配
  if (typeof ResizeObserver !== 'undefined' && ggbEl.value) {
    sizeObserver = new ResizeObserver(() => onContainerResize())
    sizeObserver.observe(ggbEl.value)
  }
})
onBeforeUnmount(() => {
  clearTimeout(loadTimer)
  clearTimeout(resizeTimer)
  if (sizeObserver) {
    try { sizeObserver.disconnect() } catch (e) { /* ignore */ }
    sizeObserver = null
  }
  window.removeEventListener('resize', onContainerResize)
  window.removeEventListener('orientationchange', onContainerResize)
  if (applet) { try { applet.remove() } catch (e) { /* ignore */ } }
  applet = null
  ggbApi = null
  document.removeEventListener('fullscreenchange', onFsChange)
})
</script>

<style scoped>
.ggb-playground {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  margin-bottom: var(--spacer-16);
}
.ggb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}
.ggb-title { font-weight: 700; font-size: 0.95rem; }
.ggb-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.ggb-example-label { font-size: 0.78rem; color: var(--text-muted); }
.ggb-example, .ggb-clear, .ggb-full {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-full);
  padding: 4px 12px;
  font-size: 0.78rem;
  transition: all 0.15s;
}
.ggb-example:hover { border-color: var(--primary); color: var(--primary); }
.ggb-clear:hover { border-color: var(--danger); color: var(--danger); }
.ggb-full:hover { border-color: var(--primary); color: var(--primary); }
.ggb-full.active { background: var(--primary); color: #fff; border-color: var(--primary); }

.ggb-body { position: relative; min-height: 480px; }
.ggb-container { width: 100%; min-height: 480px; }
.ggb-state {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  background: var(--surface);
}
.ggb-error { color: var(--danger); }
.ggb-error-sub { max-width: 420px; text-align: center; font-size: 0.85rem; color: var(--text-muted); }
.spinner {
  width: 22px; height: 22px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.ggb-retry {
  border: 1px solid var(--primary); color: var(--primary);
  background: var(--primary-soft); border-radius: var(--radius-full);
  padding: 6px 18px;
}
.ggb-tip { padding: 8px 14px; font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid var(--border); background: var(--surface-muted); }
.ggb-tip code { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 0 4px; }

/* 移动端适配 */
@media (max-width: 600px) {
  .ggb-body, .ggb-container { min-height: 300px; }
  .ggb-title { width: 100%; }
  .ggb-tools { width: 100%; }
  .ggb-example, .ggb-clear, .ggb-full {
    min-height: 44px;
    padding: 8px 14px;
    font-size: 0.82rem;
  }
}
</style>