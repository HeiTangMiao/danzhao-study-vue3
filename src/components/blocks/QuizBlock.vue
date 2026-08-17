<!--
  QuizBlock —— 快速检测 / 练习题区块
  职责：
   - 展示题目列表，含难度标签（基础/中等/拓展）
   - 答案折叠，点击"查看答案"展开
   - 可配合 Pinia progressStore 记录答题是否正确（预留）
-->
<template>
  <section class="block quiz">
    <h2 class="block-title">{{ block.title || '快速检测' }}</h2>
    <ul class="exercise-list">
      <li v-for="(item, i) in block.items" :key="i" class="exercise-item">
        <span class="difficulty-tag" :class="diffClass(item.difficulty)">
          {{ diffLabel(item.difficulty) }}
        </span>
        <div class="exercise-question">
          <MathJaxRender :text="item.question" />
        </div>
        <button class="answer-toggle" @click="toggle(i)">
          {{ opened[i] ? '隐藏答案' : '查看答案' }}
        </button>
        <div v-show="opened[i]" class="answer-text">
          <MathJaxRender :text="item.answer" />
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { reactive } from 'vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

defineProps({
  // 区块数据：{ type:'quiz', title, items:[{difficulty,question,answer}] }
  block: { type: Object, required: true }
})

// 答案展开状态
const opened = reactive({})

function toggle(i) { opened[i] = !opened[i] }

// 难度文案映射
const DIFF_LABEL = { basic: '基础', medium: '中等', advanced: '拓展' }
const DIFF_CLASS = { basic: 'difficulty-basic', medium: 'difficulty-medium', advanced: 'difficulty-advanced' }

function diffLabel(d) { return DIFF_LABEL[d] || '基础' }
function diffClass(d) { return DIFF_CLASS[d] || 'difficulty-basic' }
</script>

<style scoped>
.exercise-list { list-style: none; }
.exercise-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacer-12) var(--spacer-16);
  margin-bottom: var(--spacer-12);
}
.difficulty-tag {
  display: inline-block;
  font-size: 0.75rem;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  margin-bottom: var(--spacer-8);
}
.difficulty-basic { background: rgba(47, 158, 68, 0.15); color: var(--success); }
.difficulty-medium { background: rgba(240, 140, 0, 0.15); color: var(--warning); }
.difficulty-advanced { background: rgba(224, 49, 49, 0.12); color: var(--danger); }
.exercise-question { margin-bottom: var(--spacer-8); }
.answer-toggle {
  background: var(--primary-soft);
  color: var(--primary);
  border: 1px solid var(--primary);
  border-radius: var(--radius-full);
  padding: 4px 14px;
  font-size: 0.85rem;
}
.answer-toggle:hover { background: var(--primary); color: #fff; }
.answer-text {
  background: rgba(47, 158, 68, 0.08);
  border: 1px solid var(--success);
  border-radius: var(--radius-md);
  padding: var(--spacer-12);
  margin-top: var(--spacer-8);
}
</style>