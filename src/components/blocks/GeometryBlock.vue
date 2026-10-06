<!--
  GeometryBlock —— 几何演示区块（diagram）
  职责：
   - 接收 content-schema 的 diagram 区块（boardId + caption + 可选 boundingbox/height/fixed）
   - 按 boardId 惰性加载 src/geometry/boards/<boardId>.js 拿到 setup 回调
   - 把 setup 交给 JsxGraphBoard 渲染，并显示图注（caption）

  说明（2026-10 重构）：
   画板代码原先是内容数据里的 initCode 字符串，运行期用 new Function 编译。
   生产 CSP 的 script-src 'self' 不含 'unsafe-eval'，桌面端（WKWebView）必然抛
   EvalError → 20 张几何图全部渲染不出来。
   现在 initCode 已一次性 codemod 成 20 个真实 ES 模块（见 scripts/codemod-initcode.mjs），
   每个 boardId 一个文件、由 Vite 编译成独立惰性 chunk：
     - 零 eval，CSP 一字未改
     - 语法错误从此是构建错误，不再是运行时炸
     - 单页只拉取用到的那一个画板模块

  ⚠️ setup 由「同步 computed」变成了「异步取模块」：必须等模块到位后再渲染 JsxGraphBoard，
     否则 JsxGraphBoard 的 `if (props.setup)` 守卫会在模块到位前跑完，表现为
     「加载中 → ready 但空画板」。因此这里用 v-if="setupFn" 拦截渲染时机。
-->
<template>
  <section class="block diagram">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="block-card block-card--md diagram-box">
      <JsxGraphBoard
        v-if="setupFn"
        :key="block.boardId"
        :setup="setupFn"
        :boundingbox="boundingbox"
        :height="height"
        :fixed="block.fixed"
      />
      <div v-else-if="loadState === 'loading'" class="diagram-loading">
        <span class="block-spinner"></span> 正在加载画板…
      </div>
      <p v-else class="diagram-error">⚠️ {{ loadError || '画板加载失败，无法渲染。' }}</p>
      <p v-if="block.caption" class="diagram-caption">{{ block.caption }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import JsxGraphBoard from '@/components/JsxGraphBoard.vue'

const props = defineProps({
  // 区块数据：{ type:'diagram', boardId, caption, boundingbox?, height?, fixed? }
  block: { type: Object, required: true }
})

/**
 * 画板模块索引：src/geometry/boards/<boardId>.js
 * 非 eager glob → 每个画板各自一个 chunk，进入页面时才按需拉取。
 */
const loaders = import.meta.glob('@/geometry/boards/*.js')

/** 加载得到的 setup 回调；为 null 时子组件尚未渲染（避免空画板） */
const setupFn = ref(null)
/** 加载状态：loading / ready / error */
const loadState = ref('loading')
/** 失败原因（错误态文案） */
const loadError = ref('')

/**
 * 按 boardId 定位画板模块
 * @param {string} boardId 画板标识
 * @returns {string|null} glob 的键；未命中返回 null
 */
function findLoaderKey(boardId) {
  const suffix = `/${boardId}.js`
  return Object.keys(loaders).find((key) => key.endsWith(suffix)) || null
}

/** 按 boardId 惰性加载画板模块，拿到 setup 后再交给 JsxGraphBoard */
async function loadBoard() {
  setupFn.value = null
  loadError.value = ''
  loadState.value = 'loading'

  const boardId = props.block.boardId
  if (!boardId) {
    loadError.value = '图形区块缺少 boardId'
    loadState.value = 'error'
    return
  }

  const key = findLoaderKey(boardId)
  if (!key) {
    console.error('[GeometryBlock] 未找到画板模块:', boardId)
    loadError.value = `未找到画板模块「${boardId}」`
    loadState.value = 'error'
    return
  }

  try {
    const mod = await loaders[key]()
    const fn = mod && mod.default
    if (typeof fn !== 'function') {
      loadError.value = `画板模块「${boardId}」未导出 setup 函数`
      loadState.value = 'error'
      return
    }
    setupFn.value = fn
    loadState.value = 'ready'
  } catch (e) {
    console.error('[GeometryBlock] 画板模块加载失败:', boardId, e)
    loadError.value = `画板「${boardId}」加载失败`
    loadState.value = 'error'
  }
}

// boardId 变化时重新加载；immediate 保证首次渲染即开始加载
watch(() => props.block.boardId, loadBoard, { immediate: true })

// 画板边界框（可选，默认 [-6, 4, 6, -4]）
const boundingbox = computed(() => props.block.boundingbox || [-6, 4, 6, -4])
// 画板高度（可选，默认 320）
const height = computed(() => props.block.height || 320)
</script>

<style scoped>
/* 视口保留边框（阶段 3 第二步：diagram 视口仍需边框，去掉块间距，
 * 由 .block-anchor 统一负责） */
.diagram-box {
  padding: var(--spacer-12);
}
.diagram-caption {
  margin-top: var(--spacer-8);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--fs-md);
}
.diagram-error {
  margin-top: var(--spacer-8);
  text-align: center;
  color: var(--danger);
  font-size: var(--fs-md);
}
/* 画板模块加载中占位（复用全局 .block-spinner，高度与画板一致避免跳动） */
.diagram-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacer-8);
  min-height: 320px;
  color: var(--text-muted);
  font-size: var(--fs-md);
}
</style>
