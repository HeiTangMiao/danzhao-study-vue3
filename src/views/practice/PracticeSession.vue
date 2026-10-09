<!--
  PracticeSession —— L3 做题会话（单题一屏，P6 核心，prd-mobile §5.3 L3）
  流程（§5.2 D2）：读题（参考答案默认折叠）→ 结构化题点选即判 / 自由文本脑内作答
  → 底部滑出参考答案卡 → 强制自评（我会了 / 我还不会）→ 下一题。
  心流保护：无倒计时；非阻断式答案卡；完成后可回看（结算页逐题解析）。
  离开保护（复用 ExamBlock 三层思路）：beforeunload + 路由守卫 + 退出二次确认；
  退出保留未完成会话（已答题数已逐题落库，不丢）。
  手势：左滑下一题，仅完成自评后可用（canNext 口径与「下一题」disabled 同源）。
-->
<template>
  <div class="psession">
    <header class="ps-top">
      <button class="ps-exit" aria-label="退出练习" @click="askExit"><AppIcon name="x" :size="18" /></button>
      <div class="ps-progress" aria-hidden="true">
        <div class="ps-progress-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
      <span class="ps-count">{{ store.session.index + 1 }}/{{ total }}</span>
    </header>

    <main
      ref="stageEl"
      class="ps-stage"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <div class="ps-qmeta">
        <span class="difficulty-tag" :class="diffClass(q.difficulty)">{{ diffLabel(q.difficulty) }}</span>
        <span v-if="q.gradable" class="ps-tag">选择题</span>
        <span class="ps-source">{{ q.unitTitle }} · {{ q.fileTitle }}</span>
      </div>

      <div class="ps-question"><MathJaxRender :text="q.question" /></div>

      <!-- 结构化题：点选即机器判定（判定后高亮正确项与所选项） -->
      <div v-if="q.gradable" class="option-list" data-no-swipe>
        <button
          v-for="(opt, oi) in q.options"
          :key="oi"
          class="option-btn"
          :class="optionClass(oi)"
          :disabled="rec.picked !== null"
          @click="store.pickOption(oi)"
        >
          <span class="option-letter">{{ 'ABCDEFGH'[oi] }}</span>
          <span class="option-text"><MathJaxRender :text="opt" /></span>
          <span v-if="rec.picked !== null && oi === q.correctIndex" class="option-mark option-mark--ok"><AppIcon name="check" :size="14" /></span>
          <span v-else-if="oi === rec.picked && oi !== q.correctIndex" class="option-mark option-mark--no"><AppIcon name="x" :size="14" /></span>
        </button>
      </div>

      <!-- 填空题（B-2）：输入 + 提交自动判分；未命中回落自评（不判错、不阻塞） -->
      <div v-else-if="isFill(q)" class="ps-fill" data-no-swipe>
        <div class="ps-fill-row">
          <input
            v-model="fillInput"
            type="text"
            class="ps-fill-input"
            placeholder="输入你的答案"
            :disabled="rec.autoMatched !== null"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            autocomplete="off"
            enterkeyhint="done"
            @keyup.enter="submitFill"
          />
          <button class="ps-fill-submit" :disabled="rec.autoMatched !== null || !fillInput.trim()" @click="submitFill">提交</button>
        </div>
        <p v-if="rec.autoMatched === true" class="ps-fill-hint ps-fill-hint--ok">回答正确（已自动判定），请确认后自评</p>
        <p v-else-if="rec.autoMatched === false" class="ps-fill-hint ps-fill-hint--miss">未自动匹配，请对照答案自评</p>
      </div>

      <!-- 参考答案卡：默认折叠，严禁与题面同屏可见（看答案后才滑出） -->
      <transition name="ps-fade">
        <div v-if="rec.revealed" class="ps-answer">
          <div class="ps-answer-label"><AppIcon name="lightbulb" :size="15" /> 参考答案 / 解析</div>
          <MathJaxRender :text="q.answer" />
        </div>
      </transition>
    </main>

    <!-- 底部常驻动作条（拇指区）：看答案 → 我会了 / 我还不会 → 下一题 -->
    <footer class="ps-actions" data-no-swipe>
      <button v-if="!rec.revealed" class="ps-btn ps-btn--primary" @click="store.revealAnswer()">看答案</button>
      <template v-else>
        <button
          class="ps-btn ps-btn--no"
          :class="{ 'ps-btn--active-no': rec.assess === 'unknown' }"
          :disabled="!!rec.assess"
          @click="assess('unknown')"
        >
          我还不会
        </button>
        <button
          class="ps-btn ps-btn--ok"
          :class="{ 'ps-btn--active-ok': rec.assess === 'known' }"
          :disabled="!!rec.assess"
          @click="assess('known')"
        >
          我会了
        </button>
        <button class="ps-btn ps-btn--next" :disabled="!store.canNext" @click="store.next()">
          {{ store.isLast ? '完成结算' : '下一题' }}
        </button>
      </template>
    </footer>

    <!-- 退出二次确认（有作答时） -->
    <transition name="ps-fade">
      <div v-if="confirmOpen" class="ps-overlay" @click.self="confirmOpen = false">
        <div class="ps-confirm card">
          <div class="ps-confirm__title">确定要退出吗？</div>
          <p class="ps-confirm__msg">
            已答 {{ store.answeredCount }} 题会计入练习统计；未完成的部分会保留，下次可从「继续上次练习」接着做。
          </p>
          <div class="ps-confirm__actions">
            <button class="ps-confirm__btn ps-confirm__cancel" @click="confirmOpen = false">继续练习</button>
            <button class="ps-confirm__btn ps-confirm__ok" @click="confirmLeave">退出</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 二级归因层（P0-4）：自评「我还不会」后弹出，一点即完成 / 可跳过 -->
    <ReasonChips
      :open="!!store.pendingAttribution"
      :question="attributionQuestion"
      @done="store.setAttribution"
      @skip="store.dismissAttribution"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import ReasonChips from '@/components/ReasonChips.vue'
import { diffLabel, diffClass } from '@/utils/blockMeta'
import { isFillItem } from '@/content/answerNorm'
import { usePracticeStore } from '@/stores/practice'
import { warmKatex } from '@/composables/useKatex'
import { useRouter } from 'vue-router'

const store = usePracticeStore()
const router = useRouter()

const q = computed(() => store.current)
const rec = computed(() => store.currentRecord)
const total = computed(() => store.session?.questions.length || 0)

// 待归因题的题干（供归因层展示上下文）
const attributionQuestion = computed(() => {
  const pa = store.pendingAttribution
  if (!pa || !store.session) return ''
  const target = store.session.questions[pa.index]
  return target ? target.question : ''
})

// 阅读进度：已自评题数 / 总题数（自评是单题完成的唯一标志）
const progressPct = computed(() => {
  if (!total.value) return 0
  return Math.round((store.answeredCount / total.value) * 100)
})

// 自评结果落库是异步的：动作条按钮在 await 期间要保持禁用，防止双击双记
const assessing = ref(false)
async function assess(kind) {
  // store.assess 内部还有同口径守卫；这里先挡一层避免无效请求
  if (assessing.value || rec.value.assess || !rec.value.revealed) return
  assessing.value = true
  try {
    await store.assess(kind)
  } catch (e) {
    console.error('[practice] 自评落库失败，可重试:', e)
  } finally {
    assessing.value = false
  }
}

// 结构化题判定高亮：正确项恒绿，错选红；未判定时只有 hover 态
function optionClass(oi) {
  if (rec.value.picked === null) return {}
  return {
    'option-right': oi === q.value.correctIndex,
    'option-wrong': oi === rec.value.picked && oi !== q.value.correctIndex
  }
}

// ===== 填空题输入（B-2）=====
const isFill = (item) => isFillItem(item)
// 输入框本地草稿：切题即清空（正式作答存 record.typed，随 record 持有）
const fillInput = ref('')
watch(
  () => store.session?.index,
  () => {
    fillInput.value = ''
  }
)

/** 提交判分：store.submitFill 幂等（已提交/已自评时 no-op），这里只挡无效提交 */
function submitFill() {
  if (!fillInput.value.trim() || rec.value.autoMatched !== null || rec.value.assess) return
  store.submitFill(fillInput.value)
}

// ===== 离开保护 =====
const confirmOpen = ref(false)
// 记录被拦截的导航目标：确认后补跳（undefined = 仅退出回首页）
let pendingLeave = null

function askExit() {
  if (store.answeredCount > 0) {
    pendingLeave = null
    confirmOpen.value = true
  } else {
    store.quitSession()
  }
}

function confirmLeave() {
  confirmOpen.value = false
  store.quitSession()
  if (pendingLeave) {
    const target = pendingLeave
    pendingLeave = null
    router.push(target.fullPath || target)
  }
}

// 路由守卫：会话中有作答 → 拦下并弹二次确认（Tab 切换也会经过这里）
onBeforeRouteLeave((to, _from) => {
  if (store.phase !== 'session' || store.answeredCount === 0) return true
  pendingLeave = to
  confirmOpen.value = true
  return false
})

// 刷新/关闭页面前提醒（与 ExamBlock 同款）
function onBeforeUnload(e) {
  if (store.phase === 'session' && store.answeredCount > 0) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// ===== 左滑下一题（仅完成自评后可用；与 data-no-swipe 体系兼容）=====
const stageEl = ref(null)
let swipe = null

function onPointerDown(e) {
  // 触屏专属：桌面用按钮（与 useSwipePaging 的鼠标约定一致）
  if (e.pointerType === 'mouse') return
  const t = e.target
  if (t && t.closest && t.closest('[data-no-swipe]')) return
  swipe = { x: e.clientX, y: e.clientY, t0: e.timeStamp }
}

function onPointerUp(e) {
  if (!swipe) return
  const dx = e.clientX - swipe.x
  const dy = e.clientY - swipe.y
  const dt = e.timeStamp - swipe.t0
  swipe = null
  // 左滑（dx<0）且水平占优、距离达标、时长合理 → 下一题；未自评时 canNext 为 false，天然无响应
  if (dx >= 0 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2 || dt > 800) return
  if (assessing.value) return
  store.next()
}

function onPointerCancel() {
  swipe = null
}

onMounted(() => {
  // 题目普遍含 \(...\)：进入会话前预热 KaTeX（幂等）
  warmKatex()
  window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<style scoped>
.psession {
  display: flex;
  flex-direction: column;
  /* 单题一屏：视口高度减去顶部/底部留白，动作条常驻可视区 */
  min-height: calc(100vh - var(--tabbar-h) - var(--space-6));
}

/* 顶栏 */
.ps-top { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-1) 0; }
.ps-exit {
  flex: 0 0 auto; width: 36px; height: 36px; border-radius: var(--radius-full);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--text-muted); background: var(--surface-muted);
}
.ps-progress { flex: 1; height: 3px; border-radius: var(--radius-full); background: var(--surface-muted); overflow: hidden; }
.ps-progress-fill { height: 100%; background: var(--primary); border-radius: var(--radius-full); transition: width var(--dur-3) var(--ease-out); }
.ps-count { flex: 0 0 auto; font-size: var(--fs-md); color: var(--text-muted); font-variant-numeric: tabular-nums; }

/* 题面 */
.ps-stage { flex: 1; padding: var(--space-4) 0; }
.ps-qmeta { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); }
.ps-tag {
  font-size: var(--fs-2xs); padding: 1px 8px; border-radius: var(--radius-full);
  background: var(--surface-muted); color: var(--text-muted);
}
.ps-source { margin-left: auto; font-size: var(--fs-2xs); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 50%; }
.ps-question { font-size: 1.05rem; line-height: var(--lh-snug); margin-bottom: var(--space-4); }

/* 选项（复用 QuizBlock 的选项视觉语言） */
.option-list { display: flex; flex-direction: column; gap: var(--space-2); }
.option-btn {
  display: flex; align-items: center; gap: var(--space-3);
  width: 100%; text-align: left;
  background: var(--surface-muted); border: 2px solid var(--border);
  border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
  transition: border-color var(--dur-1) var(--ease-standard), background var(--dur-1) var(--ease-standard);
}
.option-btn:disabled { cursor: default; }
.option-btn:not(:disabled):hover { border-color: var(--primary); }
.option-btn:not(:disabled):active { transform: scale(0.99); }
.option-letter {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: var(--surface); border: 1px solid var(--border);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--text-muted);
}
.option-text { flex: 1; }
.option-mark { flex-shrink: 0; display: inline-flex; }
.option-right { border-color: var(--success); background: rgba(var(--success-rgb), 0.08); }
.option-right .option-letter { background: var(--success); color: #fff; border-color: var(--success); }
.option-mark--ok { color: var(--success); }
.option-wrong { border-color: var(--danger); background: rgba(var(--danger-rgb), 0.06); }
.option-wrong .option-letter { background: var(--danger); color: #fff; border-color: var(--danger); }
.option-mark--no { color: var(--danger); }

/* 填空题输入（B-2）：移动端约定 —— 全部输入属性关闭、字号 ≥16px 防 iOS 聚焦缩放、触控目标 ≥44px */
.ps-fill { margin-bottom: var(--space-4); }
.ps-fill-row { display: flex; gap: var(--space-2); }
.ps-fill-input {
  flex: 1; min-height: 44px; font-size: 16px; font-family: inherit;
  background: var(--surface-muted); border: 2px solid var(--border);
  border-radius: var(--radius-md); padding: 0 var(--space-3); color: var(--text);
}
.ps-fill-input:focus { outline: none; border-color: var(--primary); }
.ps-fill-input:disabled { opacity: 0.7; }
.ps-fill-submit {
  flex: 0 0 auto; min-height: 44px; padding: 0 var(--space-4);
  background: var(--primary); color: #fff; border-radius: var(--radius-md);
  font-weight: var(--fw-semibold); font-size: var(--fs-base);
}
.ps-fill-submit:disabled { opacity: 0.45; }
.ps-fill-hint { margin-top: var(--space-2); font-size: var(--fs-sm); font-weight: var(--fw-semibold); }
.ps-fill-hint--ok { color: var(--success); }
.ps-fill-hint--miss { color: var(--warning); }

/* 参考答案卡（默认折叠，看答案后底部滑出，非阻断不夺焦点） */
.ps-answer {
  margin-top: var(--space-4);
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--space-4);
  line-height: var(--lh-normal);
}
.ps-answer-label {
  display: flex; align-items: center; gap: 4px;
  font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--text-muted);
  margin-bottom: var(--space-2);
}

/* 底部动作条：常驻拇指区，sticky 兜住长题干 */
.ps-actions {
  position: sticky; bottom: 0; z-index: 5;
  display: flex; gap: var(--space-2);
  padding: var(--space-3) 0 calc(var(--space-3) + var(--sab));
  background: var(--bg);
}
.ps-btn {
  min-height: 48px; border-radius: var(--radius-full);
  font-size: var(--fs-base); font-weight: var(--fw-semibold);
  display: inline-flex; align-items: center; justify-content: center;
  transition: transform var(--dur-1) var(--ease-standard), opacity var(--dur-1) var(--ease-standard);
}
.ps-btn:active:not(:disabled) { transform: scale(0.97); }
.ps-btn:disabled { opacity: 0.45; }
.ps-btn--primary { flex: 1; background: var(--primary); color: #fff; }
.ps-btn--no, .ps-btn--ok { flex: 1; border: 1.5px solid var(--border); background: var(--surface); }
.ps-btn--active-no { border-color: var(--danger); color: var(--danger); background: rgba(var(--danger-rgb), 0.08); }
.ps-btn--active-ok { border-color: var(--success); color: var(--success); background: rgba(var(--success-rgb), 0.1); }
.ps-btn--next { flex: 1.2; background: var(--primary); color: #fff; }
.ps-btn--next:disabled { background: var(--surface-muted); color: var(--text-muted); }

/* 退出确认 */
.ps-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-5);
}
.ps-confirm { width: min(360px, 100%); padding: var(--space-5); }
.ps-confirm__title { font-weight: var(--fw-semibold); font-size: 1.05rem; margin-bottom: var(--space-3); }
.ps-confirm__msg { color: var(--text-muted); font-size: var(--fs-base); line-height: var(--lh-snug); margin-bottom: var(--space-4); }
.ps-confirm__actions { display: flex; gap: var(--space-3); }
.ps-confirm__btn {
  flex: 1; min-height: 44px; border-radius: var(--radius-full);
  font-weight: var(--fw-semibold); font-size: var(--fs-base);
  display: inline-flex; align-items: center; justify-content: center;
}
.ps-confirm__cancel { background: var(--surface-muted); color: var(--text); border: 1px solid var(--border); }
.ps-confirm__ok { background: var(--primary); color: #fff; }

/* 淡入淡出（答案卡 / 确认层；时长读全局动效 token） */
.ps-fade-enter-active, .ps-fade-leave-active { transition: opacity var(--dur-3) var(--ease-out); }
.ps-fade-enter-from, .ps-fade-leave-to { opacity: 0; }
</style>
