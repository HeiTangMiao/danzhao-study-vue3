<!--
  QuizBlock —— 快速检测 / 练习题区块（自主学习版）
  职责：
   - 选择题：点击选项标记所选，不判定对错，直接展开答案/解析
   - 非选择题：仅提供「查看答案 / 隐藏答案」，不对作答情况判定
   - 不做对错判断：无绿/红对错反馈，不发放 XP、不记错题本、不计正确率
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
          <span v-if="item.type === 'judge'" class="q-type-tag">判断题</span>
          <span v-else-if="item.type === 'fill'" class="q-type-tag">填空题</span>
          <span v-else-if="isChoice(item)" class="q-type-tag">选择题</span>
        </div>

        <!-- 题干 -->
        <div class="exercise-question">
          <MathJaxRender :text="item.question" />
        </div>

        <!-- 选择题选项（点击标记所选，不判定对错） -->
        <div v-if="isChoice(item)" class="option-list">
          <button
            v-for="(opt, oi) in item.options"
            :key="oi"
            class="option-btn"
            :class="{ 'option-selected': states[i]?.selected === oi }"
            @click="pickChoice(i, oi)"
          >
            <span class="option-letter">{{ 'ABCDEFGH'[oi] }}</span>
            <span class="option-text"><MathJaxRender :text="opt" /></span>
          </button>
        </div>

        <!-- 非选择题：仅查看答案 -->
        <div v-else class="self-assess">
          <button class="answer-toggle" @click="toggle(i)">{{ opened[i] ? '隐藏答案' : '查看答案' }}</button>
        </div>

        <!-- 答案 / 解析（不判定对错，仅展示参考答案） -->
        <transition name="fade">
          <div v-if="opened[i]" class="answer-panel">
            <div class="answer-text">
              <div class="answer-label">📖 答案 / 解析</div>
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

const props = defineProps({
  // 区块数据：{ type:'quiz', title, items:[{type,difficulty,question,options,correctIndex,answer}] }
  block: { type: Object, required: true },
  // 页面上下文（仅透传，练习不再参与游戏化奖励）
  context: { type: Object, default: () => ({}) }
})

// 每道选择题的所选选项索引
const states = reactive({})
// 答案展开状态
const opened = reactive({})

// 区块进度统计（仅统计已选的选择题，不涉及对错）
const stats = computed(() => {
  const items = props.block.items || []
  const total = items.filter((_, i) => isChoice(items[i])).length
  const answered = items.filter((_, i) => states[i]?.selected !== undefined).length
  return { answered, total }
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

// 标记选择题所选选项，并展开答案/解析（不做对错判定）
function pickChoice(i, oi) {
  states[i] = { selected: oi }
  opened[i] = true
}

// 切换答案/解析显隐
function toggle(i) { opened[i] = !opened[i] }
</script>

<style scoped>
.quiz-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--spacer-8); margin-bottom: var(--spacer-12); }
.quiz-stats { display: flex; gap: 6px; flex-wrap: wrap; }
.stat-chip {
  font-size: 0.75rem; padding: 2px 10px; border-radius: var(--radius-full);
  background: var(--surface-muted); color: var(--text-muted);
}

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
/* 暗色模式下提高冲刺难度标签对比度 */
:root[data-theme="dark"] .difficulty-sprint { color: #d8a1ff; }
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
.option-letter {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: var(--surface); border: 1px solid var(--border);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700; color: var(--text-muted);
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