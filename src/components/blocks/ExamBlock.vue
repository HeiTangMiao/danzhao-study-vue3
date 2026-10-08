<!--
  ExamBlock —— 模拟卷区块（计时 + 计分 + 结果页）
  职责：
   - 考试模式：倒计时、逐题作答、交卷评分
   - 选择题点击作答；判断/填空/解答题自评作答
   - 交卷后展示成绩、正确率、逐题回顾与错题入本
   - 单题耗时（P0-3）：按作答顺序结算每题历时（时间戳差值，非 setInterval 累加）→ 交卷批写入库
   - 错题归因（P0-4）：交卷后（结果页）逐题弹归因层，**不在作答中打断考试**
-->
<template>
  <section class="block exam">
    <!-- 考试介绍页（极简：无卡片，居中排版） -->
    <div v-if="phase === 'intro'" class="exam-intro">
      <div class="exam-intro-icon"><AppIcon name="clipboard-list" :size="28" /></div>
      <h2 class="exam-title">{{ block.title || '模拟卷' }}</h2>
      <div class="exam-meta">
        <span class="exam-meta-item"><AppIcon name="timer" :size="14" /> 时长 {{ block.duration || 90 }} 分钟</span>
        <span class="exam-meta-item">满分 {{ block.totalScore || 100 }} 分</span>
        <span class="exam-meta-item">及格 {{ block.passingScore || 60 }} 分</span>
        <span class="exam-meta-item">共 {{ block.items.length }} 题</span>
      </div>
      <p class="exam-intro-tip">建议独立限时完成，交卷后自动评分并生成错题回顾。</p>
      <button class="exam-start-btn" @click="startExam">开始考试</button>
    </div>

    <!-- 考试进行页 -->
    <div v-else-if="phase === 'running'" class="exam-running">
      <div class="block-card block-card--md block-card--shadow-xs exam-toolbar">
        <span class="exam-timer" :class="{ 'timer-warn': timeLeft <= 300 }"><AppIcon name="timer" :size="14" /> {{ fmtTime(timeLeft) }}</span>
        <span class="exam-progress">已答 {{ answeredCount }}/{{ block.items.length }}</span>
        <span class="exam-toolbar__actions">
          <button class="exam-jump-btn" :disabled="!hasUnanswered" title="跳转到下一道未答题" @click="jumpToNextUnanswered">下一未答</button>
          <button class="exam-submit-btn" :disabled="submitting" @click="handleSubmitClick">
            {{ submitting ? '提交中…' : '交卷' }}
          </button>
        </span>
      </div>

      <!-- 交卷失败提示 -->
      <div v-if="submitError" class="exam-error" role="alert">{{ submitError }}</div>

      <div
        v-for="(item, i) in block.items"
        :key="i"
        :ref="(el) => (questionEls[i] = el)"
        :class="{ 'exam-answered': answers[i]?.answered, 'exam-unanswered': !answers[i]?.answered, 'exam-jump-flash': jumpTarget === i }"
        class="exam-question"
      >
        <div class="exam-q-head">
          <span class="q-index">{{ i + 1 }}</span>
          <span class="difficulty-tag" :class="diffClass(item.difficulty)">{{ diffLabel(item.difficulty) }}</span>
          <span v-if="!answers[i]?.answered" class="exam-unanswered-tag">未答</span>
          <span class="exam-score">({{ item.score || 0 }} 分)</span>
        </div>
        <div class="exam-q-body">
          <MathJaxRender :text="item.question" />
        </div>

        <!-- 选择题 -->
        <div v-if="isChoice(item)" class="option-list">
          <button
            v-for="(opt, oi) in item.options"
            :key="oi"
            class="option-btn"
            :class="{ 'option-selected': answers[i]?.selected === oi }"
            @click="selectOption(i, oi)"
          >
            <span class="option-letter">{{ 'ABCDEFGH'[oi] }}</span>
            <span class="option-text"><MathJaxRender :text="opt" /></span>
          </button>
        </div>

        <!-- 非选择题：自评 -->
        <div v-else class="self-assess">
          <span class="self-label">作答情况：</span>
          <button class="self-btn self-ok" :class="{ active: answers[i]?.correct === true }" @click="selfAssess(i, true)"><AppIcon name="check" :size="14" /> 答对了</button>
          <button class="self-btn self-no" :class="{ active: answers[i]?.correct === false }" @click="selfAssess(i, false)"><AppIcon name="x" :size="14" /> 答错了</button>
        </div>
      </div>
    </div>

    <!-- 结果页（极简：无卡片） -->
    <div v-else class="exam-result">
      <div class="result-hero" :class="passed ? 'result-pass' : 'result-fail'">
        <div class="result-icon"><AppIcon :name="passed ? 'check' : 'book-open'" :size="36" :stroke-width="1.8" /></div>
        <div class="result-score">{{ score }}<span class="result-total"> / {{ block.totalScore || 100 }}</span></div>
        <div class="result-percent">{{ percent }}%</div>
        <div class="result-verdict">{{ passed ? '恭喜通过！' : '未达及格线，继续加油' }}</div>
      </div>

      <div class="result-stats">
        <div class="result-stat"><span class="rs-num">{{ correctCount }}</span><span class="rs-label">答对</span></div>
        <div class="result-stat"><span class="rs-num">{{ wrongCount }}</span><span class="rs-label">答错</span></div>
        <div class="result-stat"><span class="rs-num">{{ fmtTime(usedTime) }}</span><span class="rs-label">用时</span></div>
      </div>

      <button class="exam-restart-btn" @click="restartExam"><AppIcon name="refresh-cw" :size="16" /> 重新作答</button>

      <h3 class="result-review-title">逐题回顾</h3>
      <div v-for="(item, i) in block.items" :key="i" class="review-item" :class="answers[i]?.correct ? 'review-ok' : 'review-no'">
        <div class="review-head">
          <span class="review-mark"><AppIcon :name="answers[i]?.correct ? 'check' : 'x'" :size="14" :stroke-width="2.5" /></span>
          <span class="review-q"><MathJaxRender :text="item.question" /></span>
        </div>
        <div class="review-answer">
          <span class="review-label">正确答案：</span>
          <MathJaxRender :text="item.answer" />
        </div>
        <div v-if="answers[i]" class="review-user">
          <span class="review-label">你的作答：</span>
          <MathJaxRender :text="userAnswer(i)" />
        </div>
      </div>
    </div>

    <!-- 错题归因层（P0-4）：交卷后逐个弹出，一点即完成 / 可跳过 -->
    <ReasonChips
      :open="attrOpen"
      :question="attrCurrent ? attrCurrent.question : ''"
      @done="onAttrDone"
      @skip="onAttrSkip"
    />

    <!-- 提前交卷二次确认 -->
    <transition name="fade">
      <div v-if="confirmSubmit" class="submit-confirm-overlay" @click.self="confirmSubmit = false">
        <div class="submit-confirm card">
          <div class="submit-confirm__title">还有 {{ unansweredCount }} 题未作答</div>
          <p class="submit-confirm__msg">确定现在交卷吗？未作答的题目将按答错计分。</p>
          <div class="submit-confirm__actions">
            <button class="submit-confirm__btn submit-confirm__cancel" @click="confirmSubmit = false">继续作答</button>
            <button class="submit-confirm__btn submit-confirm__ok" @click="doEarlySubmit">确定交卷</button>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import ReasonChips from '@/components/ReasonChips.vue'
import { diffLabel, diffClass } from '@/utils/blockMeta'
import { useStudyDbStore } from '@/stores/studyDb'
import { useProgressStore } from '@/stores/progress'
import { paperKeyOf } from '@/content/practiceBank'
import { TIMEOUT_MS } from '@/utils/practiceMetrics'

const props = defineProps({
  // 区块数据：{ type:'exam', title, duration, totalScore, passingScore, items:[...] }
  block: { type: Object, required: true },
  // 页面上下文
  context: { type: Object, default: () => ({}) }
})

const db = useStudyDbStore()
const progressStore = useProgressStore()

// 考试作答中状态：注入父级 UnitView（页内翻页/跳页前统一确认，防误触丢失作答）
const examState = inject('examState', null)

// 阶段：intro 介绍 / running 进行 / result 结果
const phase = ref('intro')
// 倒计时（秒）
const timeLeft = ref(0)
// 每题作答状态
const answers = ref({})
// 得分
const score = ref(0)
// 交卷中标记：防止连点/并发触发重复记分与错题入库
const submitting = ref(false)
// 交卷失败提示
const submitError = ref('')
// 计时器句柄
let timer = null
// 交卷截止时间戳（毫秒），用于时间戳基准校准倒计时
let deadline = 0
// 考试开始时间戳（毫秒）：单题耗时结算的起点基准
let examStartAt = 0
// 作答顺序（首次作答的题号与时间戳）：单题耗时按「相邻作答间隔」近似结算（单页考试无逐题进入事件）
let answerOrder = []
let answerAt = new Set()

// 错题归因队列（P0-4）：交卷后逐个弹出，可跳过
const attrQueue = ref([])
const attrIndex = ref(0)
const attrOpen = computed(() => attrIndex.value < attrQueue.value.length)
const attrCurrent = computed(() => attrQueue.value[attrIndex.value] || null)

const usedTime = computed(() => {
  const total = (props.block.duration || 90) * 60
  return Math.max(0, total - timeLeft.value)
})

const answeredCount = computed(() => {
  return props.block.items.filter((_, i) => answers.value[i]?.answered).length
})

// ===== 未答跳转 =====
// 是否还有未答题（有未答题时交卷按钮保持禁用）
const hasUnanswered = computed(() => answeredCount.value < props.block.items.length)
// 题目卡片 DOM 引用（v-for :ref 收集）
const questionEls = ref([])
// 最近一次跳转的题号（用于从其后继续找下一未答）
let lastJumpIndex = -1
// 跳转高亮的目标题号
const jumpTarget = ref(-1)
let jumpTimer = null

// 跳转到下一道未答题：平滑滚动居中 + 短暂闪烁提示
function jumpToNextUnanswered() {
  if (!hasUnanswered.value) return
  const unanswered = props.block.items
    .map((_, i) => i)
    .filter((i) => !answers.value[i]?.answered)
  if (!unanswered.length) return
  // 优先找当前题之后的第一个未答，否则回到第一道未答
  const next = unanswered.find((i) => i > lastJumpIndex) ?? unanswered[0]
  lastJumpIndex = next
  jumpTarget.value = next
  if (jumpTimer) clearTimeout(jumpTimer)
  jumpTimer = setTimeout(() => { jumpTarget.value = -1 }, 1400)
  const el = questionEls.value[next]
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const correctCount = computed(() => {
  return props.block.items.filter((_, i) => answers.value[i]?.correct).length
})
const wrongCount = computed(() => {
  // 未作答按答错计（提前交卷时保证 答对 + 答错 = 总题数）
  return props.block.items.filter((_, i) => !answers.value[i]?.correct).length
})

const percent = computed(() => {
  const total = props.block.totalScore || 100
  return total ? Math.round((score.value / total) * 100) : 0
})
const passed = computed(() => percent.value >= (props.block.passingScore || 60))

// 是否选择题
function isChoice(item) {
  return Array.isArray(item.options) && item.options.length > 0 && item.correctIndex !== undefined
}

// 格式化时间 mm:ss
function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 开始考试
function startExam() {
  phase.value = 'running'
  deadline = Date.now() + (props.block.duration || 90) * 60 * 1000
  examStartAt = Date.now()
  timeLeft.value = (props.block.duration || 90) * 60
  answers.value = {}
  answerOrder = []
  answerAt = new Set()
  attrQueue.value = []
  attrIndex.value = 0
  timer = setInterval(() => {
    // 时间戳基准校准：后台/切标签回来后剩余时间自动修正，避免 setInterval 节流导致漂移
    timeLeft.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (timeLeft.value <= 0) {
      clearInterval(timer)
      timer = null
      submitExam()
    }
  }, 1000)
}

// 选择选项
function selectOption(i, oi) {
  const item = props.block.items[i]
  answers.value[i] = { answered: true, selected: oi, correct: oi === item.correctIndex }
  markAnswered(i)
}

// 自评
function selfAssess(i, correct) {
  answers.value[i] = { answered: true, selected: null, correct }
  markAnswered(i)
}

/** 记录某题「首次作答」顺序（单题耗时的结算序列；重复改答不重复计时） */
function markAnswered(i) {
  if (answerAt.has(i)) return
  answerAt.add(i)
  answerOrder.push({ i, t: Date.now() })
}

/**
 * 按作答顺序结算每题历时（毫秒）：以「上一次作答时间」为界，首题以考试开始为界。
 * 单页考试没有逐题进入事件，用相邻作答间隔近似（一律时间戳差值，避免后台节流漂移）。
 * @returns {Record<number, number>} 题号 → 历时
 */
function settleExamElapsed() {
  const byIndex = {}
  let prev = examStartAt || Date.now()
  for (const { i, t } of answerOrder) {
    byIndex[i] = Math.max(0, t - prev)
    prev = t
  }
  return byIndex
}

/** 组卷单题作答行（question_attempt，source 固定 exam） */
function buildExamAttempts() {
  const c = props.context || {}
  const fileKey = c.fileKey || ''
  const elapsedByIndex = settleExamElapsed()
  const out = []
  props.block.items.forEach((item, i) => {
    const a = answers.value[i]
    if (!a || !a.answered) return
    const choice = isChoice(item)
    const elapsedMs = elapsedByIndex[i] != null ? elapsedByIndex[i] : 0
    out.push({
      subject: c.subject || 'math',
      unitNum: c.unitNum || '',
      fileKey,
      questionKey: paperKeyOf({ fileKey, question: item.question }),
      itemType: item.type || '',
      source: 'exam',
      picked: choice && a.selected !== null ? a.selected : null,
      assess: choice ? null : a.correct ? 'known' : 'unknown',
      correct: choice ? a.correct === true : null,
      elapsedMs,
      timedOut: elapsedMs >= TIMEOUT_MS,
      reason: null,
      createdAt: Date.now(),
      createdAtDate: localDateStr()
    })
  })
  return out
}

/** 本地日期串 YYYY-MM-DD（与 studyDb.getDateStr 同口径） */
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 归因层：一点即完成 → 回写该错题；跳过 → 不写字段，仅前进
async function onAttrDone({ reason, kp }) {
  const cur = attrCurrent.value
  if (cur) {
    try {
      await db.attributeError(cur.id, { reason: reason || undefined, kp: kp || undefined })
    } catch (e) {
      console.error('[ExamBlock] 归因回写失败:', e)
    }
  }
  attrIndex.value++
}
function onAttrSkip() {
  attrIndex.value++
}

// 结果页：展示用户作答（选择题显示所选选项，自评题显示对错）
function userAnswer(i) {
  const a = answers.value[i]
  if (!a) return ''
  const item = props.block.items[i]
  if (isChoice(item) && a.selected !== undefined && a.selected !== null) {
    return `${'ABCDEFGH'[a.selected]}. ${item.options[a.selected] || ''}`
  }
  return a.correct ? '自评答对' : '自评答错'
}

// ===== 提前交卷 + 二次确认 =====
// 未答题数（确认弹窗文案用）
const unansweredCount = computed(() => props.block.items.length - answeredCount.value)
// 提前交卷确认弹窗开关
const confirmSubmit = ref(false)

// 交卷点击入口：有未答题时先二次确认，全部作答则直接交卷
function handleSubmitClick() {
  if (hasUnanswered.value) {
    confirmSubmit.value = true
  } else {
    submitExam()
  }
}
// 确认提前交卷
function doEarlySubmit() {
  confirmSubmit.value = false
  submitExam()
}

// 交卷
async function submitExam() {
  // 防重复交卷：已提交或正在提交时直接返回，避免并发造成重复记分/错题入本
  if (submitting.value || phase.value !== 'running') return
  submitting.value = true
  submitError.value = ''
  if (timer) { clearInterval(timer); timer = null }

  try {
    // 计算得分
    let total = 0
    props.block.items.forEach((item, i) => {
      if (answers.value[i]?.correct) total += item.score || 0
    })
    score.value = total

    // 记录测验成绩（写入真实页面 fileKey 行；测验页「完成」以交卷为标志）
    const c = props.context || {}
    await db.recordTest({
      subject: c.subject || 'math',
      unitNum: c.unitNum || '',
      unitTitle: c.unitTitle || '',
      fileKey: c.fileKey || '',
      fileTitle: c.fileTitle || '',
      earnedPoints: total,
      totalPoints: props.block.totalScore || 100
    })
    // 答题计数：本卷作答数计入当日统计与本页累计（仪表盘「答题总数 / 今日答题数」据此恢复非 0）
    if (answeredCount.value > 0) {
      await db.recordAnswered(answeredCount.value, { fileKey: c.fileKey || '' })
    }

    // 单题耗时批写（P0-3）：整卷一个事务；失败只记日志、不阻断交卷（与错题逐题容错同款）
    try {
      await db.addAttempts(buildExamAttempts())
    } catch (e) {
      console.error('[ExamBlock] 单题耗时落库失败:', e)
    }

    // 错题入本（逐题容错：单题入库失败不阻断整卷交卷；recordError 内部会按 题干+页面 去重）
    const queue = []
    for (const [i, item] of props.block.items.entries()) {
      if (answers.value[i]?.answered && !answers.value[i]?.correct) {
        const selectedText = isChoice(item) ? `选项 ${'ABCDEFGH'[answers.value[i].selected]}` : '自评答错'
        try {
          const r = await db.recordError(
            c.subject || 'math',
            c.unitNum || '',
            item.question,
            item.answer,
            selectedText,
            `模拟卷解析：${item.answer}`,
            { fileKey: c.fileKey || '', fileTitle: c.fileTitle || '', unitTitle: c.unitTitle || '', difficulty: item.difficulty || '' }
          )
          // 交卷后（结果页）逐题补标归因，避免作答中弹层打断考试（A-3 风险缓解）
          queue.push({ id: r.id, question: item.question })
        } catch (e) {
          console.error('[ExamBlock] 错题入本失败:', e)
        }
      }
    }
    attrQueue.value = queue
    attrIndex.value = 0

    phase.value = 'result'
    // 测验页已交卷 → 刷新完成快照，答题卡/首页进度即时更新
    progressStore.refresh().catch((e) => console.error('[ExamBlock] 刷新进度失败:', e))
  } catch (e) {
    console.error('[ExamBlock] 交卷失败:', e)
    // 交卷失败不丢作答：停留在进行页，提示用户可重试
    submitError.value = '交卷失败，请重试'
  } finally {
    submitting.value = false
  }
}

// 重新作答
function restartExam() {
  phase.value = 'intro'
  score.value = 0
  answers.value = {}
  submitError.value = ''
  answerOrder = []
  answerAt = new Set()
  attrQueue.value = []
  attrIndex.value = 0
  // 重置未答跳转状态
  lastJumpIndex = -1
  jumpTarget.value = -1
  if (jumpTimer) { clearTimeout(jumpTimer); jumpTimer = null }
}

// ===== 作答离开保护（三层） =====
// 作答中 = 进行中且已有作答
const isRunning = computed(() => phase.value === 'running' && answeredCount.value > 0)

// 1. 同步给父级 UnitView：页内翻页/跳页/切单元/跨路由离开统一由 UnitView 路由守卫弹确认
watch(isRunning, (v) => { if (examState) examState.active = v })

// 2. 刷新/关闭页面前提醒
function onBeforeUnload(e) {
  if (isRunning.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (jumpTimer) clearTimeout(jumpTimer)
  if (examState) examState.active = false
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<style scoped>
/* 介绍页（极简：无卡片，居中排版，靠上边距与页面留白分段） */
.exam-intro {
  text-align: center;
  padding: var(--spacer-24) var(--spacer-16);
  border-top: 1px solid var(--line);
}
.exam-intro-icon { font-size: 3rem; margin-bottom: var(--spacer-12); }
.exam-title { margin-bottom: var(--spacer-16); }
.exam-meta { display: flex; justify-content: center; gap: var(--spacer-12); flex-wrap: wrap; margin-bottom: var(--spacer-16); }
.exam-meta-item {
  background: var(--surface-muted); border-radius: var(--radius-full);
  padding: 4px 14px; font-size: var(--fs-md);
}
.exam-intro-tip { color: var(--text-muted); font-size: var(--fs-md); margin-bottom: var(--spacer-16); }
.exam-start-btn {
  background: var(--primary); color: #fff; border-radius: var(--radius-full);
  padding: 10px 32px; font-size: var(--fs-lg); font-weight: 600;
  transition: transform 0.15s ease;
}
.exam-start-btn:hover { transform: translateY(-2px); }

/* 进行页 */
/* 工具栏：唯一保留卡片底 + 极浅阴影（sticky 顶栏专用 --shadow-xs），
 * 其余部分不再用卡片。
 * 注意 position: sticky 依赖滚动祖先没有被 transform/filter/overflow 截断 ——
 * 这个祖先链上不要加动画 transform。 */
.exam-toolbar {
  position: sticky; top: 0; z-index: 5;
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  padding: var(--spacer-10) var(--spacer-16);
  margin-bottom: var(--spacer-16);
}
.exam-timer { font-weight: 700; font-size: 1.1rem; color: var(--primary); font-variant-numeric: tabular-nums; }
.timer-warn { color: var(--danger); animation: pulse 1s infinite; }
@keyframes pulse { 50% { opacity: 0.5; } }
.exam-progress { color: var(--text-muted); font-size: var(--fs-md); }
.exam-toolbar__actions { display: flex; align-items: center; gap: 8px; }
.exam-jump-btn {
  background: var(--primary-soft); color: var(--primary);
  border: 1px solid var(--primary);
  border-radius: var(--radius-full);
  padding: 6px 12px; font-size: var(--fs-sm); font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
  white-space: nowrap;
}
.exam-jump-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.exam-submit-btn {
  background: var(--success); color: #fff; border-radius: var(--radius-full);
  padding: 6px 20px; font-weight: 600;
}
.exam-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 交卷失败提示 */
.exam-error {
  background: rgba(var(--danger-rgb), 0.1);
  border: 1px solid var(--danger);
  color: var(--danger);
  border-radius: var(--radius-md);
  padding: var(--spacer-12);
  margin-bottom: var(--spacer-12);
  font-size: 0.88rem;
}

/* 题目去卡片（阶段 3 第二步）：发丝线分隔，不用卡片；
 * 未答态不再用虚线框 + 底色，由「未答」标签提示 */
.exam-question {
  padding: var(--spacer-14) 0;
  border-top: 1px solid var(--line);
}
.exam-unanswered-tag {
  font-size: var(--fs-2xs); padding: 1px 8px;
  border-radius: var(--radius-full);
  background: rgba(var(--warning-rgb), 0.15); color: var(--warning);
  font-weight: 600;
}
/* 跳转目标短暂闪烁 */
.exam-jump-flash { animation: jumpFlash 1.4s ease; }
@keyframes jumpFlash {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  30% { box-shadow: 0 0 0 3px var(--primary); }
}
.exam-q-head { display: flex; align-items: center; gap: var(--spacer-8); margin-bottom: var(--spacer-8); }
.q-index {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--primary-soft); color: var(--primary);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--fs-xs); font-weight: 700;
}
.exam-score { margin-left: auto; font-size: var(--fs-sm); color: var(--text-muted); }
.exam-q-body { margin-bottom: var(--spacer-10); }

.option-list { display: flex; flex-direction: column; gap: 8px; }
.option-btn {
  display: flex; align-items: center; gap: var(--spacer-10);
  width: 100%; text-align: left;
  background: var(--surface-muted); border: 2px solid var(--border);
  border-radius: var(--radius-md); padding: 10px 14px;
  transition: all 0.15s ease;
}
.option-btn:hover { border-color: var(--primary); background: var(--primary-soft); }
.option-selected { border-color: var(--primary); background: var(--primary-soft); }
/* 触屏按压反馈 */
.option-btn:active, .self-btn:active, .exam-submit-btn:active, .exam-restart-btn:active, .exam-start-btn:active { transform: scale(0.97); }
.option-letter {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: var(--surface); border: 1px solid var(--border);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--fs-sm); font-weight: 700; color: var(--text-muted);
}
.option-selected .option-letter { background: var(--primary); color: #fff; border-color: var(--primary); }
.option-text { flex: 1; }

.self-assess { display: flex; align-items: center; gap: var(--spacer-8); flex-wrap: wrap; }
.self-label { font-size: var(--fs-md); color: var(--text-muted); }
.self-btn { padding: 5px 14px; border-radius: var(--radius-full); font-size: var(--fs-md); border: 1px solid var(--border); background: var(--surface); }
.self-ok.active { border-color: var(--success); color: var(--success); background: rgba(var(--success-rgb), 0.1); }
.self-no.active { border-color: var(--danger); color: var(--danger); background: rgba(var(--danger-rgb), 0.1); }

/* 结果页（极简：无卡片，靠发丝线与留白分段） */
.result-hero {
  text-align: center;
  padding: var(--spacer-24);
  border-top: 1px solid var(--line);
  border-radius: 0;
  margin-bottom: var(--spacer-16);
}
.result-pass { background: rgba(var(--success-rgb), 0.08); border: 2px solid var(--success); }
.result-fail { background: rgba(var(--danger-rgb), 0.06); border: 2px solid var(--danger); }
.result-icon { font-size: 2.5rem; margin-bottom: var(--spacer-8); }
.result-score { font-size: 2.6rem; font-weight: 800; }
.result-total { font-size: 1.2rem; font-weight: 400; color: var(--text-muted); }
.result-percent { font-size: 1.1rem; color: var(--text-muted); margin: 4px 0; }
.result-verdict { font-size: 1.1rem; font-weight: 600; }
.result-pass .result-verdict { color: var(--success); }
.result-fail .result-verdict { color: var(--danger); }
.result-stats { display: flex; justify-content: center; gap: var(--spacer-24); margin-bottom: var(--spacer-16); }
.result-stat { text-align: center; }
.rs-num { display: block; font-size: 1.6rem; font-weight: 700; }
.rs-label { font-size: var(--fs-sm); color: var(--text-muted); }
.exam-restart-btn {
  display: block; margin: 0 auto var(--spacer-24);
  background: var(--primary-soft); color: var(--primary);
  border: 1px solid var(--primary); border-radius: var(--radius-full);
  padding: 8px 24px; font-weight: 600;
}
.exam-restart-btn:hover { background: var(--primary); color: #fff; }
.result-review-title { margin-bottom: var(--spacer-12); }
.review-item {
  border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: var(--spacer-12) var(--spacer-16); margin-bottom: var(--spacer-10);
  border-left-width: 4px;
}
.review-ok { border-left-color: var(--success); }
.review-no { border-left-color: var(--danger); }
.review-head { display: flex; gap: var(--spacer-8); margin-bottom: var(--spacer-8); }
.review-mark { font-weight: 700; }
.review-ok .review-mark { color: var(--success); }
.review-no .review-mark { color: var(--danger); }
.review-q { flex: 1; }
.review-answer { font-size: var(--fs-base); background: var(--surface-muted); border-radius: var(--radius-md); padding: var(--spacer-10); }
.review-label { font-weight: 600; color: var(--text-muted); }
.review-user {
  font-size: var(--fs-base);
  background: rgba(var(--warning-rgb), 0.08);
  border: 1px dashed var(--warning);
  border-radius: var(--radius-md);
  padding: var(--spacer-10);
  margin-top: 6px;
}
.review-no .review-user { border-color: var(--danger); background: rgba(var(--danger-rgb), 0.06); }

/* 提前交卷确认弹窗 */
.submit-confirm-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  padding: var(--spacer-24);
}
.submit-confirm {
  width: min(360px, 100%);
  padding: var(--spacer-24);
}
.submit-confirm__title { font-weight: 700; font-size: 1.05rem; margin-bottom: var(--spacer-12); }
.submit-confirm__msg { color: var(--text-muted); font-size: var(--fs-base); line-height: 1.6; margin-bottom: var(--spacer-20); }
.submit-confirm__actions { display: flex; gap: var(--spacer-12); }
.submit-confirm__btn {
  flex: 1; min-height: 44px;
  border-radius: var(--radius-full);
  font-weight: 600; font-size: var(--fs-base);
  display: inline-flex; align-items: center; justify-content: center;
}
.submit-confirm__cancel { background: var(--surface-muted); color: var(--text); border: 1px solid var(--border); }
.submit-confirm__ok { background: var(--primary); color: #fff; }

/* 移动端触控目标 ≥44px */
@media (max-width: 600px) {
  .exam-start-btn, .exam-submit-btn, .exam-jump-btn, .self-btn, .exam-restart-btn {
    min-height: 44px;
    display: inline-flex; align-items: center; justify-content: center;
  }
}
</style>
