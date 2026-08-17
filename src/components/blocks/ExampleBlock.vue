<!--
  ExampleBlock —— 典型例题区块（引导式学习升级版）
  职责：
   - 题干始终可见，解答与答案默认折叠，先思考后看解
   - 支持难度标签（基础/中等/提高/冲刺）
   - 解答过程与最终答案分别展开，避免一次性剧透
-->
<template>
  <section class="block example">
    <h2 class="block-title">📝 {{ block.title || '典型例题' }}</h2>
    <div v-for="(item, i) in block.items" :key="i" class="example-card">
      <div class="ex-head">
        <span class="ex-title">{{ item.title || `例题 ${i + 1}` }}</span>
        <span v-if="item.difficulty" class="difficulty-tag" :class="diffClass(item.difficulty)">
          {{ diffLabel(item.difficulty) }}
        </span>
      </div>
      <!-- 题干 -->
      <div class="ex-question">
        <MathJaxRender :text="item.question" />
      </div>
      <!-- 解答（默认折叠） -->
      <div v-if="item.solution" class="ex-solution-wrap">
        <button class="ex-toggle" @click="toggle('sol', i)">
          {{ opened.sol[i] ? '收起解答' : '💭 先思考，再看解答' }}
        </button>
        <transition name="fade">
          <div v-show="opened.sol[i]" class="ex-solution">
            <MathJaxRender :text="item.solution" />
          </div>
        </transition>
      </div>
      <!-- 答案（默认折叠） -->
      <div v-if="item.answer" class="ex-answer-wrap">
        <button class="ex-toggle" @click="toggle('ans', i)">
          {{ opened.ans[i] ? '隐藏答案' : '查看答案' }}
        </button>
        <transition name="fade">
          <div v-show="opened.ans[i]" class="ex-answer">
            <MathJaxRender :text="item.answer" />
          </div>
        </transition>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive } from 'vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

defineProps({
  // 区块数据：{ type:'example', title, items:[{title,difficulty,question,solution,answer}] }
  block: { type: Object, required: true }
})

// 记录每个例题的解答/答案展开状态
const opened = reactive({ sol: {}, ans: {} })

// 切换指定例题的解答或答案显隐
function toggle(kind, index) {
  opened[kind][index] = !opened[kind][index]
}

// 难度文案映射
const DIFF_LABEL = { basic: '基础', medium: '中等', advanced: '提高', sprint: '冲刺' }
const DIFF_CLASS = { basic: 'difficulty-basic', medium: 'difficulty-medium', advanced: 'difficulty-advanced', sprint: 'difficulty-sprint' }

function diffLabel(d) { return DIFF_LABEL[d] || '基础' }
function diffClass(d) { return DIFF_CLASS[d] || 'difficulty-basic' }
</script>

<style scoped>
.example-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacer-16);
  margin-bottom: var(--spacer-16);
  box-shadow: var(--shadow-sm);
}
.ex-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacer-8); margin-bottom: var(--spacer-8); }
.ex-title { font-weight: 700; }
.difficulty-tag { font-size: 0.72rem; padding: 1px 10px; border-radius: var(--radius-full); }
.difficulty-basic { background: rgba(47, 158, 68, 0.15); color: var(--success); }
.difficulty-medium { background: rgba(240, 140, 0, 0.15); color: var(--warning); }
.difficulty-advanced { background: rgba(224, 49, 49, 0.12); color: var(--danger); }
.difficulty-sprint { background: rgba(168, 85, 247, 0.15); color: #a855f7; }

.ex-question { margin-bottom: var(--spacer-10); }
.ex-solution-wrap, .ex-answer-wrap { margin-top: var(--spacer-8); }
.ex-toggle {
  background: var(--primary-soft); color: var(--primary);
  border: 1px solid var(--primary); border-radius: var(--radius-full);
  padding: 4px 14px; font-size: 0.85rem;
}
.ex-toggle:hover { background: var(--primary); color: #fff; }
.ex-solution {
  background: var(--surface-muted);
  border-left: 3px solid var(--success);
  border-radius: var(--radius-md);
  padding: var(--spacer-12);
  margin-top: var(--spacer-8);
}
.ex-answer {
  background: rgba(47, 158, 68, 0.08);
  border: 1px solid var(--success);
  border-radius: var(--radius-md);
  padding: var(--spacer-12);
  margin-top: var(--spacer-8);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
