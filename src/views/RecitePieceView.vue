<!--
  RecitePieceView —— 单篇默写作答页（T04；设计 §4.1 时序图 ② / §1 异议 9）

  流程：坐标命中产物 → `loadPage` → 取第 `blockIndex` 个 cloze 块 → **identity 守卫** → 挂 `ClozeBlock`

  ★ identity 守卫（I8，本页最重要的一段）：
    双源（包内产物 + 在线内容页）可能来自**不同新鲜度层**，此时 `blockIndex` 指向的可能
    根本不是同一篇。不拦的后果不是报错，而是**作答结果被写进另一个 pieceKey** ——
    学员的进度被静默记到别的篇上，且没有任何东西会报警。
    判据用 `block.title !== piece.title`：`title` 回答「是不是这一篇」，
    而 `fp` 回答「这一篇是否一字未动」—— 用 `fp` 会把「改了个错别字」误判成错位、
    反而拦住正常作答（§1 异议 9 末段 / §8.7 Q9）。

  ★ 判分零代码（I5）：本页**不 import 任何判分函数**，只监听 `ClozeBlock` 的 `@submitted`
    三键载荷 `{ total, correct, allCorrect }`，并**只由 `allCorrect` 布尔**驱动档位（I10 ①）。

  ★ 大冲关手动入口（`?manual=1`，I6/P0-9）：`submitResult(..., manual: true)` → 一行都不写，
    只提示「模拟完成，不计入进度」。

  ★ 离开保护降级为两层（§5 T04）：**不做 `beforeunload`**（每次作答已即时落库，
    「逐张已落库、随时可退」与 `ReviewView` 同款理由），只做「输入框有内容且未提交时点返回」的
    二次确认 —— 一层在页面返回按钮，一层在路由离开守卫。
-->
<template>
  <div ref="rootEl" class="rp">
    <header class="rp-top">
      <button class="rp-back" aria-label="返回背诵首页" @click="onBack">
        <AppIcon name="chevron-left" :size="20" />
      </button>
      <div class="rp-head">
        <div class="rp-head__title">{{ headTitle }}</div>
        <div class="rp-head__src">{{ headSource }}</div>
      </div>
      <span v-if="isManual" class="rp-head__tag">模拟考场</span>
    </header>

    <!-- 加载中 -->
    <div v-if="state === 'loading'" class="rp-loading">正在打开…</div>

    <!-- identity 守卫不通过 / 坐标失效：不渲染 ClozeBlock、不写任何 recite_progress -->
    <section v-else-if="state === 'stale'" class="card rp-notice">
      <div class="rp-notice__icon"><AppIcon name="refresh-cw" :size="24" /></div>
      <h2 class="rp-notice__title">内容已更新</h2>
      <p class="rp-notice__msg">
        这一篇的位置和素材不是同一版了。为避免把进度记到别的篇上，本次不作答。
      </p>
      <div class="rp-notice__actions">
        <button class="rp-btn rp-btn--primary" @click="goHome">刷新并返回</button>
      </div>
    </section>

    <!-- 素材加载失败（包内副本不可用） -->
    <section v-else-if="state === 'error'" class="card rp-notice">
      <div class="rp-notice__icon"><AppIcon name="triangle-alert" :size="24" /></div>
      <h2 class="rp-notice__title">素材加载失败</h2>
      <p class="rp-notice__msg">{{ loadError || '请检查网络后重试' }}</p>
      <div class="rp-notice__actions">
        <button class="rp-btn rp-btn--primary" :disabled="retrying" @click="retryLoad">
          {{ retrying ? '正在重试…' : '重试' }}
        </button>
        <button class="rp-btn" @click="goHome">返回</button>
      </div>
    </section>

    <!-- 防御：产物内恒为 input，不应触发（§4.1 时序图） -->
    <section v-else-if="state === 'unsupported'" class="card rp-notice">
      <div class="rp-notice__icon"><AppIcon name="circle-help" :size="24" /></div>
      <h2 class="rp-notice__title">该篇不可默写</h2>
      <p class="rp-notice__msg">这一篇是「点击揭晓」形态，没有可填入的空位。</p>
      <div class="rp-notice__actions">
        <button class="rp-btn rp-btn--primary" @click="goHome">返回背诵首页</button>
      </div>
    </section>

    <!-- 正常作答：挂 ClozeBlock（context 形状见 `buildReciteContext`，键恰好 5 个） -->
    <template v-else-if="state === 'ready'">
      <main class="rp-stage">
        <p v-if="isManual" class="rp-manual">
          模拟考场：本次作答只判分，不计入背诵进度
        </p>
        <ClozeBlock :block="block" :context="context" @submitted="onSubmitted" />
      </main>

      <!-- 动作条：**随文档流**，不做 fixed/sticky ——
           `ClozeBlock` 自带「提交 / 全部重默 / 只看错的那句」的底部 sticky 操作条（T01 冻结契约，
           本页不得改它），再叠一条 fixed 底栏会与之同屏重叠。两层底栏互斥是本仓既有纪律
           （对照 App.vue：移动 pill 与 ContentSidebar 底栏不可同屏）。 -->
      <div class="rp-actions" data-no-swipe>
        <button v-if="!submitted" class="rp-btn" @click="onBack">先不背了</button>
        <template v-else>
          <span class="rp-score">{{ scoreText }}</span>
          <button class="rp-btn rp-btn--primary" @click="goHome">{{ actionText }}</button>
        </template>
      </div>
      <p v-if="saveError" class="rp-save-error">{{ saveError }}</p>
    </template>

    <!-- 离开二次确认（输入框有内容且未提交时） -->
    <transition name="rp-fade">
      <div v-if="confirmOpen" class="rp-overlay" @click.self="confirmOpen = false">
        <div class="card rp-confirm">
          <div class="rp-confirm__title">放弃本次作答？</div>
          <p class="rp-confirm__msg">已填的内容不会保存；这一篇下次进来还在队列里。</p>
          <div class="rp-confirm__actions">
            <button class="rp-btn rp-btn--ghost" @click="confirmOpen = false">继续默写</button>
            <button class="rp-btn rp-btn--danger" @click="confirmLeave">离开</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ClozeBlock from '@/components/blocks/ClozeBlock.vue'
import { loadPage as loadContentPage } from '@/content/loadPage'
import { RECITE_HOME_PATH, RECITE_PHASE, buildReciteContext, useReciteStore } from '@/stores/recite'

const route = useRoute()
const router = useRouter()
const store = useReciteStore()

/** 页面状态：loading | ready | stale | error | unsupported */
const state = ref('loading')
const block = ref(null)
const piece = ref(null)
const context = ref({})
const submitted = ref(false)
const saveError = ref('')
const retrying = ref(false)
/** 提交载荷汇总（只用于展示；档位推进只由 `allCorrect` 布尔决定，I10 ①） */
const resultMeta = ref({ total: 0, correct: 0, allCorrect: false })
/** 是否已放行离开（守卫与「完成」按钮共用的旁路开关，避免二次确认自锁） */
const allowLeave = ref(false)
const confirmOpen = ref(false)
/** 根节点（读输入框内容做离开确认，无需给 ClozeBlock 加任何接口） */
const rootEl = ref(null)
/** 被守卫拦下的目标地址 */
let pendingTarget = ''

/** 大冲关手动入口：`?manual=1`（I6 → 不写任何行） */
const isManual = computed(() => String(route.query.manual || '') === '1')

const loadError = computed(() => store.loadError)

const headTitle = computed(() => {
  if (piece.value) return piece.value.title
  return '单篇默写'
})

const headSource = computed(() => {
  if (!piece.value) return ''
  const blanks = piece.value.blankCount ? ` · ${piece.value.blankCount} 空` : ''
  return `${piece.value.fileTitle}${blanks}`
})

/**
 * 得分文案：**比率一律 `total > 0 ? correct / total : 0`**（I10 ②，禁止裸除法 ——
 * `total === 0` 时裸除法出 `NaN`，在 CSS/字符串里静默失效、测试抓不到）。
 */
const scoreText = computed(() => {
  const { total, correct, allCorrect } = resultMeta.value
  if (allCorrect === true) return '全部正确'
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  return `${correct}/${total} 空正确（${pct}%）`
})

/** 动作条文案：只按 `allCorrect` 布尔切换（I10 ①） */
const actionText = computed(() => {
  if (isManual.value) return '模拟完成，不计入进度'
  return resultMeta.value.allCorrect === true ? '记住了，明天见' : '完成今日背诵'
})

/**
 * 是否有未提交的输入（离开确认的唯一判据）。
 * 读 DOM 而不是给 `ClozeBlock` 加 prop：`ClozeBlock` 的公开契约是「三键 emit」，
 * 为父级的一次确认再开一个状态出口，等于把「判分 UI 组件」改成数据管道（§8.7 Q8 的同一取舍）。
 * @returns {boolean}
 */
function hasInput() {
  const root = rootEl.value
  if (!root || typeof root.querySelectorAll !== 'function') return false
  const inputs = root.querySelectorAll('.cloze-input')
  for (let i = 0; i < inputs.length; i++) {
    const value = inputs[i] && typeof inputs[i].value === 'string' ? inputs[i].value : ''
    if (value.trim()) return true
  }
  return false
}

/** 是否需要二次确认：非手动模式、尚未提交、且输入框里有内容 */
function needsConfirm() {
  if (allowLeave.value) return false
  if (isManual.value) return false
  if (submitted.value) return false
  return hasInput()
}

/**
 * 装载：产物坐标 → 内容页 → cloze 块 → identity 守卫。
 * @returns {Promise<void>}
 */
async function load() {
  state.value = 'loading'
  block.value = null
  piece.value = null

  try {
    await store.init()
  } catch (e) {
    console.error('[RecitePieceView] store 初始化异常:', e)
  }
  if (store.phase === RECITE_PHASE.ERROR) {
    state.value = 'error'
    return
  }

  // ① 产物坐标命中（命中不了 → 坐标失效，与 identity 守卫同一分支）
  const found = store.getPiece(route.params.unitNum, route.params.fileIndex, route.params.blockIndex)
  if (!found) {
    state.value = 'stale'
    // §7.4：提示 + 触发一次刷新（后台），由用户点「刷新并返回」回首页
    store.reload().catch((e) => console.warn('[RecitePieceView] 触发刷新失败:', e))
    return
  }
  piece.value = found

  // ② 防御分支：产物内恒为 'input'（reveal 篇构建期即排除）
  if (found.mode !== 'input') {
    state.value = 'unsupported'
    return
  }

  // I9：作答期间不接受 bank 热替换（远程新版推迟到 endAnswering 后应用）
  store.beginAnswering()

  // ③ 内容页（`loadPage` 内部已对远程层做静默回落，这里不做第二层 try 包远程）
  let page = null
  try {
    const ctx = buildReciteContext(found)
    page = await loadContentPage(ctx.subject, found.unitNum, found.fileIndex)
  } catch (e) {
    console.error('[RecitePieceView] 内容页加载失败:', e)
  }
  if (!page) {
    state.value = 'stale'
    store.reload().catch((e) => console.warn('[RecitePieceView] 触发刷新失败:', e))
    return
  }

  // ④ 取第 blockIndex 个 cloze 块：定位规则与构建期**完全一致**
  //    （`page.blocks.filter(type==='cloze')[blockIndex]`，见 §3.2 / §7.2）
  const blocks = Array.isArray(page.blocks) ? page.blocks : []
  const clozeBlocks = blocks.filter((b) => b && b.type === 'cloze')
  const target = clozeBlocks[found.blockIndex]

  // ★★ identity 守卫（I8）：块不存在 或 title 不符 → 中止
  //    → 不渲染 ClozeBlock（因此不可能 emit submitted）
  //    → 不写任何 recite_progress
  //    → 提示「内容已更新」并给返回
  if (!target || target.title !== found.title) {
    console.warn(
      `[recite] identity 守卫拦截：${found.key}（产物 title=${found.title} / 内容页 title=${
        target ? target.title : '（块不存在）'
      }）`
    )
    state.value = 'stale'
    store.reload().catch((e) => console.warn('[RecitePieceView] 触发刷新失败:', e))
    return
  }

  context.value = buildReciteContext(found)
  block.value = target
  state.value = 'ready'
}

/**
 * `ClozeBlock` 提交回调（本页唯一的判分消费点，只读三键）。
 * @param {{total: number, correct: number, allCorrect: boolean}} payload 提交载荷（契约冻结在三键）
 * @returns {Promise<void>}
 */
async function onSubmitted(payload) {
  const src = payload && typeof payload === 'object' ? payload : {}
  const total = Number.isFinite(Number(src.total)) ? Number(src.total) : 0
  const correct = Number.isFinite(Number(src.correct)) ? Number(src.correct) : 0
  submitted.value = true
  resultMeta.value = { total, correct, allCorrect: src.allCorrect === true }
  saveError.value = ''
  if (!piece.value) return
  try {
    await store.submitResult({
      pieceKey: piece.value.key,
      // I10 ①：判「是否全对」只看这个布尔，永不 `correct === total` 反推
      allCorrect: src.allCorrect === true,
      manual: isManual.value
    })
  } catch (e) {
    console.error('[RecitePieceView] 提交落库失败:', e)
    saveError.value = e && e.message ? e.message : '进度没保存成功，请重试'
  }
}

/** 回首页（放行守卫，避免二次确认自锁） */
function goHome() {
  allowLeave.value = true
  router.push(RECITE_HOME_PATH)
}

/** 页面返回按钮：有未提交输入 → 二次确认；否则直接回首页 */
function onBack() {
  if (needsConfirm()) {
    pendingTarget = RECITE_HOME_PATH
    confirmOpen.value = true
    return
  }
  goHome()
}

/** 二次确认「离开」 */
function confirmLeave() {
  confirmOpen.value = false
  allowLeave.value = true
  const target = pendingTarget || RECITE_HOME_PATH
  pendingTarget = ''
  router.push(target)
}

/** 失败态重试：重载 store 后重新装载本页 */
async function retryLoad() {
  retrying.value = true
  try {
    await store.reload()
    await load()
  } catch (e) {
    console.error('[RecitePieceView] 重试失败:', e)
  } finally {
    retrying.value = false
  }
}

/**
 * 离开保护第二层：路由守卫（第一层是页面返回按钮）。
 * 返回 `false` 取消本次导航并弹二次确认 —— 确认后再带 `allowLeave` 重新导航。
 */
onBeforeRouteLeave((to) => {
  if (!needsConfirm()) return true
  pendingTarget = to.fullPath
  confirmOpen.value = true
  return false
})

onMounted(() => {
  load().catch((e) => {
    console.error('[RecitePieceView] 装载失败:', e)
    state.value = 'error'
  })
})

onUnmounted(() => {
  // I9：离开作答态后，作答期间到达的远程新版才允许落地
  store.endAnswering()
})
</script>

<style scoped>
.rp {
  max-width: 68ch;
  margin: 0 auto;
  padding: var(--space-4) var(--space-4) calc(var(--space-6) + var(--sab));
}

/* ===== 顶栏 ===== */
.rp-top {
  display: flex; align-items: center; gap: var(--space-2);
  margin-bottom: var(--space-4);
}
.rp-back {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; /* 触控 ≥44×44（A10） */
  margin-left: calc(-1 * var(--space-2));
  border: none; background: none; color: var(--text);
  border-radius: var(--radius-full);
  cursor: pointer;
}
.rp-back:active { background: var(--surface-muted); }
.rp-head { min-width: 0; flex: 1 1 auto; }
.rp-head__title {
  font-size: var(--fs-lg); font-weight: 600; color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rp-head__src {
  font-size: var(--fs-sm); color: var(--text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rp-head__tag {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: var(--fs-xs); font-weight: 600;
}

.rp-loading { padding: var(--space-8) 0; text-align: center; color: var(--text-muted); }

/* ===== 中止 / 失败提示 ===== */
.rp-notice { padding: var(--space-5); text-align: center; }
.rp-notice__icon { color: var(--primary); }
.rp-notice__title { margin: var(--space-2) 0 0; font-size: var(--fs-xl); color: var(--text); }
.rp-notice__msg { margin: var(--space-2) 0 var(--space-4); font-size: var(--fs-base); color: var(--text-muted); line-height: 1.6; }
.rp-notice__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: center; }

.rp-manual {
  margin: 0 0 var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  font-size: var(--fs-sm); color: var(--text-muted);
}

/* ===== 动作条（随文档流，理由见模板注释） ===== */
.rp-actions {
  display: flex; align-items: center; gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}
.rp-score {
  flex: 1 1 auto;
  font-size: var(--fs-sm); color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.rp-save-error {
  margin: var(--space-3) 0 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--danger);
  color: var(--danger);
  font-size: var(--fs-sm);
  text-align: center;
}

/* ===== 按钮（触控 ≥44px） ===== */
.rp-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  min-height: 48px; padding: 0 var(--space-5);
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font: inherit; font-size: var(--fs-base); font-weight: 600;
  cursor: pointer;
}
.rp-btn--primary { flex: 1 1 auto; background: var(--primary); border-color: var(--primary); color: #fff; }
.rp-btn--ghost { background: transparent; }
.rp-btn--danger { background: var(--danger); border-color: var(--danger); color: #fff; }
.rp-btn:disabled { opacity: 0.5; }

/* ===== 离开二次确认 ===== */
.rp-overlay {
  position: fixed; inset: 0; z-index: 20;
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.4);
}
.rp-confirm { width: 100%; max-width: 320px; padding: var(--space-5); }
.rp-confirm__title { font-size: var(--fs-lg); font-weight: 600; color: var(--text); }
.rp-confirm__msg { margin: var(--space-2) 0 var(--space-4); font-size: var(--fs-base); color: var(--text-muted); line-height: 1.6; }
.rp-confirm__actions { display: flex; gap: var(--space-2); }
.rp-confirm__actions .rp-btn { flex: 1 1 0; padding: 0 var(--space-3); }

.rp-fade-enter-active, .rp-fade-leave-active { transition: opacity 160ms ease; }
.rp-fade-enter-from, .rp-fade-leave-to { opacity: 0; }
</style>
