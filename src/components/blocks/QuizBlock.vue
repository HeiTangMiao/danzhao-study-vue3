<!--
  QuizBlock —— 快速检测 / 练习题区块（自主学习版）
  职责：
   - 选择题：点击选项标记所选，不判定对错，直接展开答案/解析
   - 判断题（P0-1）：命中判据的判断题派生成「正确 / 错误」可点选题 —— 点选即**判定对错**
     （绿/红）+ 揭示答案（构建期与页面内共用 judgeDerive 同一纯函数，H7）
   - 非选择题（含未派生判断题）：仅提供「查看答案 / 隐藏答案」，不对作答情况判定
   - 不发放 XP、不记错题本、不计正确率（维持既有契约；错题落库仍只在练习/考试链路）
   - 区块级答题进度（已选 X/Y）与难度标签展示
-->
<template>
  <section class="block quiz">
    <div class="quiz-head">
      <h2 class="block-title">{{ block.title || '快速检测' }}</h2>
      <!-- 答题进度（仅统计已选选择题） -->
      <div v-if="stats.answered > 0" class="quiz-stats">
        <span class="stat-chip">已选 {{ stats.answered }}/{{ stats.total }}</span>
      </div>
    </div>

    <ul class="exercise-list">
      <li
        v-for="(item, i) in block.items"
        :key="i"
        class="exercise-item"
        :class="{ 'is-answered': states[i]?.selected !== undefined }"
      >
        <!-- 题目标题行：难度 + 题号 -->
        <div class="exercise-head">
          <span class="q-index">{{ i + 1 }}</span>
          <span class="difficulty-tag" :class="diffClass(item.difficulty)">
            {{ diffLabel(item.difficulty) }}
          </span>
          <span v-if="isJudge(item)" class="q-type-tag">判断题</span>
          <span v-else-if="item.type === 'fill'" class="q-type-tag">填空题</span>
          <span v-else-if="isChoice(item)" class="q-type-tag">选择题</span>
        </div>

        <!-- 题干 -->
        <div class="exercise-question">
          <MathJaxRender :text="item.question" />
        </div>

        <!-- 可点选题（原生选择 / 判断题派生）：选择题仅标记所选；判断题派生「正确/错误」并即时判定 -->
        <div v-if="choiceOf(item)" class="option-list">
          <button
            v-for="(opt, oi) in choiceOf(item).options"
            :key="oi"
            class="option-btn"
            :class="optionClass(i, oi)"
            :disabled="choiceOf(item).derived && states[i]?.selected !== undefined"
            @click="pickChoice(i, oi)"
          >
            <span class="option-letter">{{ choiceOf(item).derived ? (oi === 0 ? 'T' : 'F') : 'ABCDEFGH'[oi] }}</span>
            <span class="option-text"><MathJaxRender :text="opt" /></span>
          </button>
        </div>

        <!-- 非选择题：仅查看答案 -->
        <div v-else class="self-assess">
          <button class="answer-toggle" @click="toggle(i)">{{ opened[i] ? '隐藏答案' : '查看答案' }}</button>
        </div>

        <!-- 判断题派生判定结果（绿/红；仅本次点选算「自动判」） -->
        <p
          v-if="choiceOf(item)?.derived && states[i]?.correct !== undefined"
          class="judge-feedback"
          :class="states[i].correct ? 'judge-ok' : 'judge-no'"
        >
          {{ states[i].correct ? '回答正确' : '回答错误' }}
        </p>

        <!-- 答案 / 解析（不判定对错，仅展示参考答案） -->
        <transition name="fade">
          <div v-if="opened[i]" class="answer-panel">
            <div class="answer-text">
              <div class="answer-label"><AppIcon name="book-open" :size="15" /> 答案 / 解析</div>
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
import AppIcon from '@/components/AppIcon.vue'
import { diffLabel, diffClass } from '@/utils/blockMeta'
import { deriveJudge, isJudgeItem } from '@/content/judgeDerive'

const props = defineProps({
  // 区块数据：{ type:'quiz', title, items:[{type,difficulty,question,options,correctIndex,answer}] }
  block: { type: Object, required: true },
  // 页面上下文（仅透传，练习不再参与游戏化奖励）
  context: { type: Object, default: () => ({}) }
})

// 每道可点选题的作答状态：{ selected: number, correct?: boolean }
const states = reactive({})
// 答案展开状态
const opened = reactive({})

// 区块进度统计（统计「可点选题」= 原生选择题 + 判断题派生题）
const stats = computed(() => {
  const items = props.block.items || []
  const total = items.filter((_, i) => choiceOf(items[i]) !== null).length
  const answered = items.filter((_, i) => states[i]?.selected !== undefined).length
  return { answered, total }
})

// 是否判断题（形态判据：type==='judge' 或题干以「判断：」开头）
function isJudge(item) {
  return isJudgeItem(item)
}

// 是否原生选择题（有 options 且含正确索引）
function isChoice(item) {
  return Array.isArray(item.options) && item.options.length > 0 && item.correctIndex !== undefined
}

/**
 * 该条目的「可点选题」形态：
 *  - 原生选择题 → 原样（derived=false，点击只标记所选、不判对错）
 *  - 判断题命中判据 → 派生成「正确/错误」可点选题（derived=true，点击即判定对错）
 *  - 其余 → null（退回「查看答案」）
 * 与构建脚本共用 deriveJudge 同一纯函数（H7 单一真相源）
 */
function choiceOf(item) {
  if (isChoice(item)) return { options: item.options, correctIndex: item.correctIndex, derived: false }
  const d = deriveJudge(item)
  return d ? { options: d.options, correctIndex: d.correctIndex, derived: true } : null
}

// 选项样式：原生选择题仅高亮所选；判断题派生分别高亮正确项（绿）与错选（红）
function optionClass(i, oi) {
  const st = states[i]
  if (!st || st.selected === undefined) return {}
  const eff = choiceOf(props.block.items[i])
  if (!eff || !eff.derived) return { 'option-selected': st.selected === oi }
  return {
    'option-correct': oi === eff.correctIndex,
    'option-wrong': st.selected === oi && oi !== eff.correctIndex
  }
}

// 标记所选选项并展开答案；判断题派生命中的同时即时判定对错（仅本题这次算「自动判」）
function pickChoice(i, oi) {
  const eff = choiceOf(props.block.items[i])
  if (!eff) return
  const next = { selected: oi }
  if (eff.derived) next.correct = oi === eff.correctIndex
  states[i] = next
  opened[i] = true
}

// 切换答案/解析显隐
function toggle(i) { opened[i] = !opened[i] }
</script>

<style scoped>
.quiz-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--spacer-8); margin-bottom: var(--spacer-12); }
.quiz-stats { display: flex; gap: 6px; flex-wrap: wrap; }
.stat-chip {
  font-size: var(--fs-xs); padding: 2px 10px; border-radius: var(--radius-full);
  background: var(--surface-muted); color: var(--text-muted);
}

.exercise-list { list-style: none; }
/* 题目去卡片（阶段 3 第二步）：改用发丝线分隔，选项选中态才用底色 */
.exercise-item {
  padding: var(--spacer-12) 0;
}
.exercise-item + .exercise-item { border-top: 1px solid var(--line); }

.exercise-head { display: flex; align-items: center; gap: var(--spacer-8); margin-bottom: var(--spacer-8); }
.q-index {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--primary-soft); color: var(--primary);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--fs-xs); font-weight: 700;
}
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
  cursor: pointer;
}
.option-btn:hover { border-color: var(--primary); background: var(--primary-soft); }
.option-selected { border-color: var(--primary); background: var(--primary-soft); }
/* 判断题派生：点选即判定 —— 正确项恒绿、错选红 */
.option-correct { border-color: var(--success); background: rgba(var(--success-rgb), 0.08); }
.option-correct .option-letter { background: var(--success); color: #fff; border-color: var(--success); }
.option-wrong { border-color: var(--danger); background: rgba(var(--danger-rgb), 0.06); }
.option-wrong .option-letter { background: var(--danger); color: #fff; border-color: var(--danger); }
.option-btn:disabled { cursor: default; }
.judge-feedback { margin-top: var(--spacer-8); font-size: var(--fs-sm); font-weight: 700; }
.judge-ok { color: var(--success); }
.judge-no { color: var(--danger); }
.option-letter {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: var(--surface); border: 1px solid var(--border);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--fs-sm); font-weight: 700; color: var(--text-muted);
}
.option-selected .option-letter { background: var(--primary); color: #fff; border-color: var(--primary); }
.option-text { flex: 1; }

/* 非选择题操作区 */
.self-assess { display: flex; align-items: center; gap: var(--spacer-8); flex-wrap: wrap; }

.answer-toggle {
  background: var(--primary-soft); color: var(--primary);
  border: 1px solid var(--primary); border-radius: var(--radius-full);
  padding: 4px 14px; font-size: 0.82rem;
}
.answer-toggle:hover { background: var(--primary); color: #fff; }
/* 触屏按压反馈（无 hover 环境下确认点中） */
.answer-toggle:active, .option-btn:active { transform: scale(0.97); }
.option-btn:active { border-color: var(--primary); background: var(--primary-soft); }

/* 答案面板 */
.answer-panel {
  margin-top: var(--spacer-10);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.answer-text {
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacer-12);
}
.answer-label { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px; font-weight: 600; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 移动端触控目标 ≥44px */
@media (max-width: 600px) {
  .answer-toggle, .option-btn {
    min-height: 44px;
    display: inline-flex; align-items: center; justify-content: center;
  }
}
</style>