<!--
  QuizBlock —— 快速检测 / 练习题区块（交互升级版）
  职责：
   - 选择题：点击选项即时判定对错，绿色/红色反馈 + 自动展开解析
   - 非选择题：提供「我答对了 / 我答错了」自评按钮 + 查看答案
   - 答对奖励 XP（含连击加成），答错自动记录到错题本
   - 区块级答题统计（已答/正确率）与连击展示
   - 支持难度标签（基础/中等/提高/冲刺）
-->
<template>
  <section class="block quiz">
    <div class="quiz-head">
      <h2 class="block-title">{{ block.title || '快速检测' }}</h2>
      <!-- 答题统计 -->
      <div v-if="stats.answered > 0" class="quiz-stats">
        <span class="stat-chip">已答 {{ stats.answered }}/{{ block.items.length }}</span>
        <span class="stat-chip" :class="stats.accuracy >= 60 ? 'stat-good' : 'stat-bad'">
          正确率 {{ stats.accuracy }}%
        </span>
        <span v-if="game.sessionStreak >= 2" class="stat-chip stat-streak">🔥 连击 {{ game.sessionStreak }}</span>
      </div>
    </div>

    <ul class="exercise-list">
      <li
        v-for="(item, i) in block.items"
        :key="i"
        class="exercise-item"
        :class="{ 'is-answered': states[i]?.answered }"
      >
        <!-- 题目标题行：难度 + 题号 -->
        <div class="exercise-head">
          <span class="q-index">{{ i + 1 }}</span>
          <span class="difficulty-tag" :class="diffClass(item.difficulty)">
            {{ diffLabel(item.difficulty) }}
          </span>
          <span v-if="item.type === 'judge'" class="q-type-tag">判断题</span>
          <span v-else-if="item.type === 'fill'" class="q-type-tag">填空题</span>
          <span v-else-if="isChoice(item)" class="q-type-tag">选择题</span>
        </div>

        <!-- 题干 -->
        <div class="exercise-question">
          <MathJaxRender :text="item.question" />
        </div>

        <!-- 选择题选项（可点击作答） -->
        <div v-if="isChoice(item)" class="option-list">
          <button
            v-for="(opt, oi) in item.options"
            :key="oi"
            class="option-btn"
            :class="optionClass(item, oi, states[i])"
            :disabled="states[i]?.answered"
            @click="answerChoice(item, i, oi)"
          >
            <span class="option-letter">{{ 'ABCDEFGH'[oi] }}</span>
            <span class="option-text"><MathJaxRender :text="opt" /></span>
            <span v-if="states[i]?.answered && oi === item.correctIndex" class="option-mark ok">✓</span>
            <span v-else-if="states[i]?.answered && states[i]?.selected === oi" class="option-mark no">✗</span>
          </button>
        </div>

        <!-- 非选择题：自评作答 -->
        <div v-else class="self-assess">
          <template v-if="!states[i]?.answered">
            <span class="self-label">我的作答：</span>
            <button class="self-btn self-ok" @click="selfAssess(item, i, true)">✓ 我答对了</button>
            <button class="self-btn self-no" @click="selfAssess(item, i, false)">✗ 我答错了</button>
            <button class="answer-toggle" @click="toggle(i)">{{ opened[i] ? '隐藏答案' : '查看答案' }}</button>
          </template>
          <template v-else>
            <span class="self-result" :class="states[i].correct ? 'result-ok' : 'result-no'">
              {{ states[i].correct ? '✅ 答对了！' : '❌ 答错了，看看解析吧' }}
            </span>
            <button class="answer-toggle" @click="toggle(i)">{{ opened[i] ? '隐藏答案' : '查看解析' }}</button>
          </template>
        </div>

        <!-- 作答反馈 + 解析 -->
        <transition name="fade">
          <div v-if="states[i]?.answered" class="answer-panel">
            <div class="feedback-line" :class="states[i].correct ? 'fb-ok' : 'fb-no'">
              <span class="fb-icon">{{ states[i].correct ? '🎉' : '💡' }}</span>
              <span class="fb-text">
                {{ states[i].correct ? '回答正确' : '回答错误' }}
                <template v-if="states[i].xpGained > 0">，获得 +{{ states[i].xpGained }} XP</template>
              </span>
            </div>
            <div v-show="opened[i]" class="answer-text">
              <div class="answer-label">📖 解析</div>
              <MathJaxRender :text="item.answer" />
            </div>
          </div>
        </transition>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { reactive, computed } from 'vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import { useGameEngineStore } from '@/stores/gameEngine'

const props = defineProps({
  // 区块数据：{ type:'quiz', title, items:[{type,difficulty,question,options,correctIndex,answer}] }
  block: { type: Object, required: true },
  // 页面上下文：{ subject, unitNum, fileKey, fileTitle, unitTitle }
  context: { type: Object, default: () => ({}) }
})

const game = useGameEngineStore()

// 每道题的作答状态
const states = reactive({})
// 答案展开状态
const opened = reactive({})

// 区块统计
const stats = computed(() => {
  const items = props.block.items || []
  let answered = 0
  let correct = 0
  items.forEach((_, i) => {
    if (states[i]?.answered) {
      answered++
      if (states[i].correct) correct++
    }
  })
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0
  return { answered, correct, accuracy }
})

// 是否选择题（有 options 且含正确索引）
function isChoice(item) {
  return Array.isArray(item.options) && item.options.length > 0 && item.correctIndex !== undefined
}

// 难度文案映射
const DIFF_LABEL = { basic: '基础', medium: '中等', advanced: '提高', sprint: '冲刺' }
const DIFF_CLASS = { basic: 'difficulty-basic', medium: 'difficulty-medium', advanced: 'difficulty-advanced', sprint: 'difficulty-sprint' }

function diffLabel(d) { return DIFF_LABEL[d] || '基础' }
function diffClass(d) { return DIFF_CLASS[d] || 'difficulty-basic' }

// 选项样式：正确/错误/选中/未选
function optionClass(item, oi, st) {
  if (!st?.answered) return ''
  if (oi === item.correctIndex) return 'option-correct'
  if (st.selected === oi) return 'option-wrong'
  return 'option-dim'
}

// 记录错题到错题本
async function recordToErrorBook(item, i, userAnswer) {
  try {
    const c = props.context || {}
    const selectedText = isChoice(item) && userAnswer !== undefined
      ? `选项 ${'ABCDEFGH'[userAnswer]}`
      : userAnswer || ''
    await game.recordError(
      c.subject || 'math',
      c.unitNum || '',
      item.question,
      item.answer,
      selectedText,
      `题目解析：${item.answer}`,
      {
        fileKey: c.fileKey || '',
        fileTitle: c.fileTitle || '',
        unitTitle: c.unitTitle || '',
        difficulty: item.difficulty || ''
      }
    )
  } catch (e) {
    console.error('[QuizBlock] 记录错题失败:', e)
  }
}

// 选择题作答
async function answerChoice(item, i, oi) {
  if (states[i]?.answered) return
  const correct = oi === item.correctIndex
  states[i] = { answered: true, selected: oi, correct, xpGained: 0 }
  opened[i] = true // 自动展开解析

  const c = props.context || {}
  const result = await game.trackAnswerResult(c.subject || 'math', c.unitNum || '', c.fileKey || '', correct)
  states[i].xpGained = result.xpGained || 0

  if (!correct) {
    await recordToErrorBook(item, i, oi)
  }
}

// 非选择题自评
async function selfAssess(item, i, correct) {
  if (states[i]?.answered) return
  states[i] = { answered: true, selected: null, correct, xpGained: 0 }
  opened[i] = true

  const c = props.context || {}
  const result = await game.trackAnswerResult(c.subject || 'math', c.unitNum || '', c.fileKey || '', correct)
  states[i].xpGained = result.xpGained || 0

  if (!correct) {
    await recordToErrorBook(item, i, '自评答错')
  }
}

// 切换解析显隐
function toggle(i) { opened[i] = !opened[i] }
</script>

<style scoped>
.quiz-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--spacer-8); margin-bottom: var(--spacer-12); }
.quiz-stats { display: flex; gap: 6px; flex-wrap: wrap; }
.stat-chip {
  font-size: 0.75rem; padding: 2px 10px; border-radius: var(--radius-full);
  background: var(--surface-muted); color: var(--text-muted);
}
.stat-good { background: rgba(47, 158, 68, 0.15); color: var(--success); }
.stat-bad { background: rgba(224, 49, 49, 0.12); color: var(--danger); }
.stat-streak { background: rgba(240, 140, 0, 0.15); color: var(--warning); font-weight: 600; }

.exercise-list { list-style: none; }
.exercise-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacer-12) var(--spacer-16);
  margin-bottom: var(--spacer-12);
  transition: border-color 0.2s ease;
}
.exercise-item.is-answered { border-color: var(--primary); }

.exercise-head { display: flex; align-items: center; gap: var(--spacer-8); margin-bottom: var(--spacer-8); }
.q-index {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--primary-soft); color: var(--primary);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
}
.difficulty-tag {
  display: inline-block; font-size: 0.72rem; padding: 1px 10px;
  border-radius: var(--radius-full);
}
.difficulty-basic { background: rgba(47, 158, 68, 0.15); color: var(--success); }
.difficulty-medium { background: rgba(240, 140, 0, 0.15); color: var(--warning); }
.difficulty-advanced { background: rgba(224, 49, 49, 0.12); color: var(--danger); }
.difficulty-sprint { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.q-type-tag {
  font-size: 0.72rem; padding: 1px 8px; border-radius: var(--radius-full);
  background: var(--surface-muted); color: var(--text-muted);
}

.exercise-question { margin-bottom: var(--spacer-10); }

/* 选择题选项 */
.option-list { display: flex; flex-direction: column; gap: 8px; }
.option-btn {
  display: flex; align-items: center; gap: var(--spacer-10);
  width: 100%; text-align: left;
  background: var(--surface-muted);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  transition: all 0.15s ease;
}
.option-btn:not(:disabled):hover { border-color: var(--primary); background: var(--primary-soft); }
.option-btn:disabled { cursor: default; }
.option-letter {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: var(--surface); border: 1px solid var(--border);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700; color: var(--text-muted);
}
.option-text { flex: 1; }
.option-correct {
  border-color: var(--success); background: rgba(47, 158, 68, 0.10);
}
.option-correct .option-letter { background: var(--success); color: #fff; border-color: var(--success); }
.option-wrong {
  border-color: var(--danger); background: rgba(224, 49, 49, 0.08);
}
.option-wrong .option-letter { background: var(--danger); color: #fff; border-color: var(--danger); }
.option-dim { opacity: 0.55; }
.option-mark { font-weight: 700; font-size: 1rem; }
.option-mark.ok { color: var(--success); }
.option-mark.no { color: var(--danger); }

/* 非选择题自评 */
.self-assess { display: flex; align-items: center; gap: var(--spacer-8); flex-wrap: wrap; }
.self-label { font-size: 0.85rem; color: var(--text-muted); }
.self-btn {
  padding: 5px 14px; border-radius: var(--radius-full); font-size: 0.85rem;
  border: 1px solid var(--border); background: var(--surface);
}
.self-ok:hover { border-color: var(--success); color: var(--success); background: rgba(47, 158, 68, 0.08); }
.self-no:hover { border-color: var(--danger); color: var(--danger); background: rgba(224, 49, 49, 0.08); }
.self-result { font-weight: 600; font-size: 0.9rem; }
.result-ok { color: var(--success); }
.result-no { color: var(--danger); }

.answer-toggle {
  background: var(--primary-soft); color: var(--primary);
  border: 1px solid var(--primary); border-radius: var(--radius-full);
  padding: 4px 14px; font-size: 0.82rem;
}
.answer-toggle:hover { background: var(--primary); color: #fff; }

/* 作答反馈面板 */
.answer-panel {
  margin-top: var(--spacer-10);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.feedback-line { display: flex; align-items: center; gap: var(--spacer-8); padding: 8px 12px; font-size: 0.9rem; font-weight: 600; }
.fb-ok { background: rgba(47, 158, 68, 0.12); color: var(--success); }
.fb-no { background: rgba(224, 49, 49, 0.10); color: var(--danger); }
.answer-text {
  background: rgba(47, 158, 68, 0.06);
  border: 1px solid var(--success);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  padding: var(--spacer-12);
}
.answer-label { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px; font-weight: 600; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
