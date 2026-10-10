<!--
  ReviewView —— 复习页（单卡会话式，P0-6）
  流程：进入即取到期队列 → 逐卡「先自答 → 翻面看答案 → 四档评分 → 下一题」→ 结算。
  骨架照 PracticeSession.vue（顶栏进度 / 卡面 / 底部 sticky 动作条），复用 --space-* 与 48px 触控约定。

  两条纪律：
   - 翻面前答案不进 DOM（检索练习的价值来自先自答；先给答案等于取消检索）。
   - 只有四档评分写库（gradeCard）；翻面/切卡/退出全是纯内存。**不引入任何自动判分**（H3）。
   - 复习**不调 recordAnswered**（复习不是做题，不污染「今日答题」口径）。
   - 离开不做 beforeunload/路由拦截（逐张已落库、随时可退），只做「有评分时点退出的二次确认」。
-->
<template>
  <div class="review">
    <!-- 卡点录入（P1-10）：入口放在复习现场 —— 卡点常在复习时才发现「这个操作想不起来」 -->
    <div class="rv-tools">
      <button class="rv-tool-btn" @click="composerOpen = true">
        <AppIcon name="square-pen" :size="15" /> 记一个卡点
      </button>
    </div>
    <StuckCardComposer :open="composerOpen" @saved="onStuckSaved" @close="composerOpen = false" />

    <!-- 顶栏：退出 + 进度条 + 计数 -->
    <header v-if="phase === 'session' || phase === 'done'" class="rv-top">
      <button class="rv-exit" aria-label="退出复习" @click="askExit"><AppIcon name="x" :size="18" /></button>
      <div class="rv-progress" aria-hidden="true">
        <div class="rv-progress-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
      <span class="rv-count">{{ countLabel }}</span>
    </header>

    <!-- 加载中 -->
    <div v-if="phase === 'loading'" class="rv-loading">加载中…</div>

    <!-- 今日已清零（空队列，不进空态） -->
    <section v-else-if="phase === 'cleared'" class="card rv-cleared">
      <div class="rv-cleared__icon"><AppIcon name="check" :size="30" /></div>
      <h2 class="rv-cleared__title">今日已清零</h2>
      <p class="rv-cleared__desc">到期错题已全部复习完，可以安心学新内容</p>
      <div class="rv-cleared__actions">
        <router-link to="/" class="rv-btn rv-btn--primary">去学习新内容</router-link>
        <router-link to="/practice" class="rv-btn">去做题</router-link>
      </div>
    </section>

    <!-- 单卡会话 -->
    <template v-else-if="phase === 'session' && current">
      <main class="rv-stage">
        <div class="rv-qmeta">
          <span class="subject-tag" :class="'tag-' + current.subject">{{ subjectName(current.subject) }}</span>
          <span v-if="current.unitTitle" class="rv-source">{{ current.unitTitle }}</span>
          <span v-if="current.wrongCount > 1" class="rv-tag rv-tag--warn">错 {{ current.wrongCount }} 次</span>
          <!-- 归因信息露出（批 A 落库、此前从未在任何界面露面）：复习时看到「当时为什么错」才是闭环 -->
          <span v-if="current.reason" class="rv-tag rv-tag--reason">{{ current.reason }}</span>
          <span v-if="current.kp" class="rv-tag">{{ current.kp }}</span>
          <span v-if="current.source === 'cloze'" class="rv-tag rv-tag--cloze">默写</span>
        </div>

        <!-- 按 kind 分支渲染：卡点卡（操作名/路径 默写形态）vs 错题卡（题面 + 答案） -->
        <StuckCard v-if="isStuck" :card="current" :revealed="flipped" @flip="store.flip()" />
        <div v-else class="error-card">
          <div class="rv-question"><MathJaxRender :text="current.question" /></div>

          <!-- 翻面前严禁渲染答案（见文件头纪律） -->
          <transition name="rv-fade">
            <div v-if="flipped" class="rv-answer">
              <div class="rv-answer-label"><AppIcon name="lightbulb" :size="15" /> 正确答案 / 解析</div>
              <div class="rv-answer-correct"><MathJaxRender :text="current.correctAnswer" /></div>
              <div v-if="current.userAnswer" class="rv-answer-user">我的作答：<MathJaxRender :text="current.userAnswer" /></div>
              <div v-if="current.explanation" class="rv-answer-expl"><MathJaxRender :text="current.explanation" /></div>
            </div>
          </transition>
        </div>
      </main>

      <footer class="rv-actions" data-no-swipe>
        <button v-if="!flipped" class="rv-btn rv-btn--primary rv-btn--wide" @click="store.flip()">翻面看答案</button>
        <GradeButtons v-else :error="current" :disabled="grading" @pick="onGrade" />
      </footer>
    </template>

    <!-- 结算 -->
    <section v-else-if="phase === 'done'" class="card rv-done">
      <h2 class="rv-done__title">本轮复习完成</h2>
      <p class="rv-done__stat">完成 <strong>{{ store.progress.done }}</strong> 张 · 忘了 <strong>{{ store.progress.again }}</strong> 张</p>
      <div class="rv-done__actions">
        <button v-if="hasMoreDue" class="rv-btn rv-btn--primary" @click="restart">再来一组</button>
        <router-link to="/" class="rv-btn">去学新内容</router-link>
        <button v-if="masteredCount > 0" class="rv-btn rv-btn--danger" @click="cleanMastered">清理已掌握（{{ masteredCount }}）</button>
      </div>
    </section>

    <!-- 退出二次确认（有评分时） -->
    <transition name="rv-fade">
      <div v-if="confirmOpen" class="rv-overlay" @click.self="confirmOpen = false">
        <div class="rv-confirm card">
          <div class="rv-confirm__title">确定要退出复习吗？</div>
          <p class="rv-confirm__msg">已评 {{ store.progress.done }} 张已计入复习记录；未复习的卡下次进来还在。</p>
          <div class="rv-confirm__actions">
            <button class="rv-confirm__btn rv-confirm__cancel" @click="confirmOpen = false">继续复习</button>
            <button class="rv-confirm__btn rv-confirm__ok" @click="confirmLeave">退出</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import GradeButtons from '@/components/GradeButtons.vue'
import StuckCard from '@/components/StuckCard.vue'
import StuckCardComposer from '@/components/StuckCardComposer.vue'
import { useReviewStore } from '@/stores/review'
import { useStudyDbStore } from '@/stores/studyDb'
import { useSpacedReview, isMastered, countDue, CARD_KINDS } from '@/composables/useSpacedReview'
import { SUBJECT_META } from '@/content/index'
import { warmKatex } from '@/composables/useKatex'

const store = useReviewStore()
const db = useStudyDbStore()
const spaced = useSpacedReview()
const router = useRouter()

// 退出会用到这些状态，直接解构成 ref 让模板够用
const phase = computed(() => store.phase)
const current = computed(() => store.current)
const flipped = computed(() => store.flipped)

const progressPct = computed(() => {
  const total = store.progress.total
  if (!total) return 0
  return Math.round((store.progress.done / total) * 100)
})
const countLabel = computed(() => {
  if (phase.value === 'session') return `${store.index + 1}/${store.queue.length}`
  return `${store.progress.total}/${store.progress.total}`
})

/** 学科中文名（唯一来源 SUBJECT_META；未学科目兜底原文） */
function subjectName(sub) {
  return SUBJECT_META[sub]?.name || sub || ''
}

/** 当前卡是否卡点（判据用 CARD_KINDS 常量，禁止内联 'stuck'） */
const isStuck = computed(() => current.value?.kind === CARD_KINDS.STUCK)

// ===== 卡点录入（P1-10）=====
const composerOpen = ref(false)
async function onStuckSaved() {
  composerOpen.value = false
  // 空态/未开始时，录入后立即重取队列，让新卡点直接进入本轮复习
  if (phase.value === 'cleared' || phase.value === 'idle') {
    await store.startSession({ kind: store.kindFilter })
  }
}

// ===== 评分（唯一写库动作；落库失败提示可重试，不静默跳过）=====
const grading = ref(false)
async function onGrade(g) {
  if (grading.value) return
  grading.value = true
  try {
    await store.grade(g)
  } catch (e) {
    console.error('[review] 评分失败:', e)
    window.alert('保存失败，请重试')
  } finally {
    grading.value = false
  }
}

// ===== 结算区：是否还有到期、已掌握数量（供「再来一组」「清理已掌握」）=====
const masteredCount = ref(0)
const hasMoreDue = ref(false)
async function refreshDoneInfo() {
  try {
    const errors = await db.getAllErrors()
    masteredCount.value = errors.filter(isMastered).length
    hasMoreDue.value = countDue(errors) > 0
  } catch (e) {
    console.error('[review] 结算信息读取失败:', e)
  }
}
watch(phase, (p) => { if (p === 'done') refreshDoneInfo() })

/** 「再来一组」：沿用本轮 kind 过滤再取一批（仍用 pickDue 排序截断） */
async function restart() {
  await store.startSession({ kind: store.kindFilter })
}

/** 「清理已掌握（K）」：软删全部 isMastered 行（与「已掌握」计数同源口径） */
async function cleanMastered() {
  if (!window.confirm(`确定清理 ${masteredCount.value} 张已掌握的卡片吗？`)) return
  const n = await spaced.removeMastered()
  console.info(`[review] 已清理已掌握 ${n} 张`)
  await refreshDoneInfo()
}

// ===== 退出 =====
const confirmOpen = ref(false)
function askExit() {
  if (store.progress.done > 0) {
    confirmOpen.value = true
  } else {
    store.quit()
    router.push('/')
  }
}
function confirmLeave() {
  confirmOpen.value = false
  store.quit()
  router.push('/')
}

onMounted(async () => {
  warmKatex() // 题目普遍含 \(...\)：进入复习前预热 KaTeX（幂等）
  await store.startSession()
})
</script>

<style scoped>
.review { display: flex; flex-direction: column; min-height: calc(100vh - var(--tabbar-h) - var(--space-6)); }
.rv-loading { text-align: center; padding: var(--spacer-48); color: var(--text-muted); }

/* 卡点录入入口行 */
.rv-tools { display: flex; justify-content: flex-end; }
.rv-tool-btn {
  display: inline-flex; align-items: center; gap: 5px;
  min-height: 40px; padding: 0 var(--space-4);
  border-radius: var(--radius-full); border: 1px solid var(--border);
  background: var(--surface); color: var(--text-muted); font-size: var(--fs-sm); cursor: pointer;
}
.rv-tool-btn:hover { border-color: var(--primary); color: var(--primary); }

/* 顶栏 */
.rv-top { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-1) 0; }
.rv-exit {
  flex: 0 0 auto; width: 36px; height: 36px; border-radius: var(--radius-full);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--text-muted); background: var(--surface-muted);
}
.rv-progress { flex: 1; height: 3px; border-radius: var(--radius-full); background: var(--surface-muted); overflow: hidden; }
.rv-progress-fill { height: 100%; background: var(--primary); border-radius: var(--radius-full); transition: width var(--dur-3) var(--ease-out); }
.rv-count { flex: 0 0 auto; font-size: var(--fs-md); color: var(--text-muted); font-variant-numeric: tabular-nums; }

/* 卡面 */
.rv-stage { flex: 1; padding: var(--space-4) 0; }
.rv-qmeta { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-3); }
.rv-source { font-size: var(--fs-2xs); color: var(--text-muted); }
.rv-tag { font-size: var(--fs-2xs); padding: 1px 8px; border-radius: var(--radius-full); background: var(--surface-muted); color: var(--text-muted); }
.rv-tag--warn { background: rgba(var(--danger-rgb), 0.1); color: var(--danger); }
.rv-tag--reason { background: var(--primary-soft); color: var(--primary); }
.rv-tag--cloze { background: rgba(var(--warning-rgb), 0.15); color: var(--warning); }
.subject-tag { font-size: 0.75rem; padding: 2px 10px; border-radius: var(--radius-full); font-weight: 600; }
.tag-math { background: rgba(79, 70, 229, 0.12); color: #4f46e5; }
.tag-chinese { background: rgba(220, 38, 38, 0.12); color: #dc2626; }
.tag-computer { background: rgba(14, 165, 233, 0.12); color: #0ea5e9; }
.rv-question { font-size: 1.05rem; line-height: var(--lh-snug); margin-bottom: var(--space-4); }
.rv-answer {
  margin-top: var(--space-4);
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--space-4);
  display: flex; flex-direction: column; gap: var(--space-2);
}
.rv-answer-label { display: flex; align-items: center; gap: 4px; font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--text-muted); }
.rv-answer-correct { color: var(--success); }
.rv-answer-user { color: var(--danger); font-size: var(--fs-sm); }
.rv-answer-expl { color: var(--text-muted); font-size: var(--fs-sm); }

/* 底部动作条 */
.rv-actions {
  position: sticky; bottom: 0; z-index: 5;
  display: flex; gap: var(--space-2);
  padding: var(--space-3) 0 calc(var(--space-3) + var(--sab));
  background: var(--bg);
}
.rv-btn {
  min-height: 48px; padding: 0 var(--space-4); border-radius: var(--radius-full);
  font-size: var(--fs-base); font-weight: var(--fw-semibold);
  border: 1.5px solid var(--border); background: var(--surface); color: var(--text);
  display: inline-flex; align-items: center; justify-content: center; text-decoration: none;
}
.rv-btn--primary { background: var(--primary); color: #fff; border-color: var(--primary); }
.rv-btn--danger { border-color: var(--danger); color: var(--danger); background: var(--surface); }
.rv-btn--wide { flex: 1; }

/* 今日已清零 */
.rv-cleared { text-align: center; padding: var(--spacer-40) var(--spacer-16); }
.rv-cleared__icon { color: var(--success); display: flex; justify-content: center; margin-bottom: var(--spacer-12); }
.rv-cleared__title { font-size: 1.3rem; margin-bottom: var(--spacer-8); }
.rv-cleared__desc { color: var(--text-muted); font-size: 0.9rem; margin-bottom: var(--spacer-20); }
.rv-cleared__actions { display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap; }

/* 结算 */
.rv-done { text-align: center; padding: var(--spacer-32) var(--spacer-16); }
.rv-done__title { font-size: 1.2rem; margin-bottom: var(--spacer-10); }
.rv-done__stat { color: var(--text-muted); margin-bottom: var(--spacer-20); }
.rv-done__stat strong { color: var(--primary); font-size: 1.1rem; }
.rv-done__actions { display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap; }

/* 退出确认 */
.rv-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  padding: var(--space-5);
}
.rv-confirm { width: min(360px, 100%); padding: var(--space-5); }
.rv-confirm__title { font-weight: var(--fw-semibold); font-size: 1.05rem; margin-bottom: var(--space-3); }
.rv-confirm__msg { color: var(--text-muted); font-size: var(--fs-base); line-height: var(--lh-snug); margin-bottom: var(--space-4); }
.rv-confirm__actions { display: flex; gap: var(--space-3); }
.rv-confirm__btn {
  flex: 1; min-height: 44px; border-radius: var(--radius-full);
  font-weight: var(--fw-semibold); font-size: var(--fs-base);
  display: inline-flex; align-items: center; justify-content: center;
}
.rv-confirm__cancel { background: var(--surface-muted); color: var(--text); border: 1px solid var(--border); }
.rv-confirm__ok { background: var(--primary); color: #fff; }

.rv-fade-enter-active, .rv-fade-leave-active { transition: opacity var(--dur-3) var(--ease-out); }
.rv-fade-enter-from, .rv-fade-leave-to { opacity: 0; }

@media (max-width: 600px) {
  .rv-cleared__actions .rv-btn, .rv-done__actions .rv-btn { flex: 1; }
}
</style>
