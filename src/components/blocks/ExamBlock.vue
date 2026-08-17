<!--
  ExamBlock —— 模拟卷区块（计时 + 计分 + 结果页）
  职责：
   - 考试模式：倒计时、逐题作答、交卷评分
   - 选择题点击作答；判断/填空/解答题自评作答
   - 交卷后展示成绩、正确率、逐题回顾与错题入本
   - 高分（≥90%）触发成就与 XP 奖励
-->
<template>
  <section class="block exam">
    <!-- 考试介绍页 -->
    <div v-if="phase === 'intro'" class="exam-intro">
      <div class="exam-intro-icon">📝</div>
      <h2 class="exam-title">{{ block.title || '模拟卷' }}</h2>
      <div class="exam-meta">
        <span class="exam-meta-item">⏱ 时长 {{ block.duration || 90 }} 分钟</span>
        <span class="exam-meta-item">🏆 满分 {{ block.totalScore || 100 }} 分</span>
        <span class="exam-meta-item">✅ 及格 {{ block.passingScore || 60 }} 分</span>
        <span class="exam-meta-item">📋 共 {{ block.items.length }} 题</span>
      </div>
      <p class="exam-intro-tip">建议独立限时完成，交卷后自动评分并生成错题回顾。</p>
      <button class="exam-start-btn" @click="startExam">🚀 开始考试</button>
    </div>

    <!-- 考试进行页 -->
    <div v-else-if="phase === 'running'" class="exam-running">
      <div class="exam-toolbar">
        <span class="exam-timer" :class="{ 'timer-warn': timeLeft <= 300 }">⏱ {{ fmtTime(timeLeft) }}</span>
        <span class="exam-progress">已答 {{ answeredCount }}/{{ block.items.length }}</span>
        <button class="exam-submit-btn" :disabled="answeredCount < block.items.length" @click="submitExam">
          交卷
        </button>
      </div>

      <div v-for="(item, i) in block.items" :key="i" class="exam-question" :class="{ 'exam-answered': answers[i]?.answered }">
        <div class="exam-q-head">
          <span class="q-index">{{ i + 1 }}</span>
          <span class="difficulty-tag" :class="diffClass(item.difficulty)">{{ diffLabel(item.difficulty) }}</span>
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
          <button class="self-btn self-ok" :class="{ active: answers[i]?.correct === true }" @click="selfAssess(i, true)">✓ 答对了</button>
          <button class="self-btn self-no" :class="{ active: answers[i]?.correct === false }" @click="selfAssess(i, false)">✗ 答错了</button>
        </div>
      </div>
    </div>

    <!-- 结果页 -->
    <div v-else class="exam-result">
      <div class="result-hero" :class="passed ? 'result-pass' : 'result-fail'">
        <div class="result-icon">{{ passed ? '🎉' : '📚' }}</div>
        <div class="result-score">{{ score }}<span class="result-total"> / {{ block.totalScore || 100 }}</span></div>
        <div class="result-percent">{{ percent }}%</div>
        <div class="result-verdict">{{ passed ? '恭喜通过！' : '未达及格线，继续加油' }}</div>
        <div v-if="xpGained > 0" class="result-xp">+{{ xpGained }} XP</div>
      </div>

      <div class="result-stats">
        <div class="result-stat"><span class="rs-num">{{ correctCount }}</span><span class="rs-label">答对</span></div>
        <div class="result-stat"><span class="rs-num">{{ wrongCount }}</span><span class="rs-label">答错</span></div>
        <div class="result-stat"><span class="rs-num">{{ fmtTime(usedTime) }}</span><span class="rs-label">用时</span></div>
      </div>

      <button class="exam-restart-btn" @click="restartExam">🔄 重新作答</button>

      <h3 class="result-review-title">📖 逐题回顾</h3>
      <div v-for="(item, i) in block.items" :key="i" class="review-item" :class="answers[i]?.correct ? 'review-ok' : 'review-no'">
        <div class="review-head">
          <span class="review-mark">{{ answers[i]?.correct ? '✓' : '✗' }}</span>
          <span class="review-q"><MathJaxRender :text="item.question" /></span>
        </div>
        <div class="review-answer">
          <span class="review-label">正确答案：</span>
          <MathJaxRender :text="item.answer" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import { useGameEngineStore } from '@/stores/gameEngine'

const props = defineProps({
  // 区块数据：{ type:'exam', title, duration, totalScore, passingScore, items:[...] }
  block: { type: Object, required: true },
  // 页面上下文
  context: { type: Object, default: () => ({}) }
})

const game = useGameEngineStore()

// 阶段：intro 介绍 / running 进行 / result 结果
const phase = ref('intro')
// 倒计时（秒）
const timeLeft = ref(0)
// 每题作答状态
const answers = ref({})
// 得分 / XP
const score = ref(0)
const xpGained = ref(0)
// 计时器句柄
let timer = null

const usedTime = computed(() => {
  const total = (props.block.duration || 90) * 60
  return Math.max(0, total - timeLeft.value)
})

const answeredCount = computed(() => {
  return props.block.items.filter((_, i) => answers.value[i]?.answered).length
})

const correctCount = computed(() => {
  return props.block.items.filter((_, i) => answers.value[i]?.correct).length
})
const wrongCount = computed(() => {
  return props.block.items.filter((_, i) => answers.value[i]?.answered && !answers.value[i]?.correct).length
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

// 难度映射
const DIFF_LABEL = { basic: '基础', medium: '中等', advanced: '提高', sprint: '冲刺' }
const DIFF_CLASS = { basic: 'difficulty-basic', medium: 'difficulty-medium', advanced: 'difficulty-advanced', sprint: 'difficulty-sprint' }
function diffLabel(d) { return DIFF_LABEL[d] || '基础' }
function diffClass(d) { return DIFF_CLASS[d] || 'difficulty-basic' }

// 格式化时间 mm:ss
function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 开始考试
function startExam() {
  phase.value = 'running'
  timeLeft.value = (props.block.duration || 90) * 60
  answers.value = {}
  timer = setInterval(() => {
    timeLeft.value--
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
}

// 自评
function selfAssess(i, correct) {
  answers.value[i] = { answered: true, selected: null, correct }
}

// 交卷
async function submitExam() {
  if (timer) { clearInterval(timer); timer = null }
  // 计算得分
  let total = 0
  props.block.items.forEach((item, i) => {
    if (answers.value[i]?.correct) total += item.score || 0
  })
  score.value = total

  // 记录测验成绩（XP + 成就）
  const c = props.context || {}
  const result = await game.recordTest(
    c.subject || 'math',
    c.unitNum || '',
    total,
    props.block.totalScore || 100
  )
  xpGained.value = result.xpGained || 0

  // 错题入本
  props.block.items.forEach((item, i) => {
    if (answers.value[i]?.answered && !answers.value[i]?.correct) {
      const selectedText = isChoice(item) ? `选项 ${'ABCDEFGH'[answers.value[i].selected]}` : '自评答错'
      game.recordError(
        c.subject || 'math',
        c.unitNum || '',
        item.question,
        item.answer,
        selectedText,
        `模拟卷解析：${item.answer}`,
        { fileKey: c.fileKey || '', fileTitle: c.fileTitle || '', unitTitle: c.unitTitle || '', difficulty: item.difficulty || '' }
      )
    }
  })

  phase.value = 'result'
}

// 重新作答
function restartExam() {
  phase.value = 'intro'
  score.value = 0
  xpGained.value = 0
  answers.value = {}
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
/* 介绍页 */
.exam-intro { text-align: center; padding: var(--spacer-24); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); }
.exam-intro-icon { font-size: 3rem; margin-bottom: var(--spacer-12); }
.exam-title { margin-bottom: var(--spacer-16); }
.exam-meta { display: flex; justify-content: center; gap: var(--spacer-12); flex-wrap: wrap; margin-bottom: var(--spacer-16); }
.exam-meta-item {
  background: var(--surface-muted); border-radius: var(--radius-full);
  padding: 4px 14px; font-size: 0.85rem;
}
.exam-intro-tip { color: var(--text-muted); font-size: 0.85rem; margin-bottom: var(--spacer-16); }
.exam-start-btn {
  background: var(--primary); color: #fff; border-radius: var(--radius-full);
  padding: 10px 32px; font-size: 1rem; font-weight: 600;
  transition: transform 0.15s ease;
}
.exam-start-btn:hover { transform: translateY(-2px); }

/* 进行页 */
.exam-toolbar {
  position: sticky; top: 0; z-index: 5;
  display: flex; align-items: center; justify-content: space-between;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--spacer-10) var(--spacer-16);
  margin-bottom: var(--spacer-16); box-shadow: var(--shadow-sm);
}
.exam-timer { font-weight: 700; font-size: 1.1rem; color: var(--primary); font-variant-numeric: tabular-nums; }
.timer-warn { color: var(--danger); animation: pulse 1s infinite; }
@keyframes pulse { 50% { opacity: 0.5; } }
.exam-progress { color: var(--text-muted); font-size: 0.85rem; }
.exam-submit-btn {
  background: var(--success); color: #fff; border-radius: var(--radius-full);
  padding: 6px 20px; font-weight: 600;
}
.exam-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.exam-question {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--spacer-14) var(--spacer-16);
  margin-bottom: var(--spacer-12);
}
.exam-answered { border-color: var(--primary); }
.exam-q-head { display: flex; align-items: center; gap: var(--spacer-8); margin-bottom: var(--spacer-8); }
.q-index {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--primary-soft); color: var(--primary);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
}
.difficulty-tag { font-size: 0.72rem; padding: 1px 10px; border-radius: var(--radius-full); }
.difficulty-basic { background: rgba(47, 158, 68, 0.15); color: var(--success); }
.difficulty-medium { background: rgba(240, 140, 0, 0.15); color: var(--warning); }
.difficulty-advanced { background: rgba(224, 49, 49, 0.12); color: var(--danger); }
.difficulty-sprint { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.exam-score { margin-left: auto; font-size: 0.8rem; color: var(--text-muted); }
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
.option-letter {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: var(--surface); border: 1px solid var(--border);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700; color: var(--text-muted);
}
.option-selected .option-letter { background: var(--primary); color: #fff; border-color: var(--primary); }
.option-text { flex: 1; }

.self-assess { display: flex; align-items: center; gap: var(--spacer-8); flex-wrap: wrap; }
.self-label { font-size: 0.85rem; color: var(--text-muted); }
.self-btn { padding: 5px 14px; border-radius: var(--radius-full); font-size: 0.85rem; border: 1px solid var(--border); background: var(--surface); }
.self-ok.active { border-color: var(--success); color: var(--success); background: rgba(47, 158, 68, 0.1); }
.self-no.active { border-color: var(--danger); color: var(--danger); background: rgba(224, 49, 49, 0.1); }

/* 结果页 */
.exam-result { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--spacer-24); }
.result-hero { text-align: center; padding: var(--spacer-24); border-radius: var(--radius-lg); margin-bottom: var(--spacer-16); }
.result-pass { background: rgba(47, 158, 68, 0.08); border: 2px solid var(--success); }
.result-fail { background: rgba(224, 49, 49, 0.06); border: 2px solid var(--danger); }
.result-icon { font-size: 2.5rem; margin-bottom: var(--spacer-8); }
.result-score { font-size: 2.6rem; font-weight: 800; }
.result-total { font-size: 1.2rem; font-weight: 400; color: var(--text-muted); }
.result-percent { font-size: 1.1rem; color: var(--text-muted); margin: 4px 0; }
.result-verdict { font-size: 1.1rem; font-weight: 600; }
.result-pass .result-verdict { color: var(--success); }
.result-fail .result-verdict { color: var(--danger); }
.result-xp {
  display: inline-block; margin-top: var(--spacer-8);
  background: var(--warning); color: #fff; border-radius: var(--radius-full);
  padding: 3px 14px; font-weight: 700;
}
.result-stats { display: flex; justify-content: center; gap: var(--spacer-24); margin-bottom: var(--spacer-16); }
.result-stat { text-align: center; }
.rs-num { display: block; font-size: 1.6rem; font-weight: 700; }
.rs-label { font-size: 0.8rem; color: var(--text-muted); }
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
.review-answer { font-size: 0.9rem; background: var(--surface-muted); border-radius: var(--radius-md); padding: var(--spacer-10); }
.review-label { font-weight: 600; color: var(--text-muted); }
</style>
