<!--
  ExampleBlock —— 典型例题区块
  职责：
   - 展示例题的题干、解答过程与最终答案
   - 答案默认折叠，点击"查看答案"展开（交互式学习）
   - 支持 LaTeX 公式
-->
<template>
  <section class="block example">
    <h2 class="block-title">📝 {{ block.title || '典型例题' }}</h2>
    <div v-for="(item, i) in block.items" :key="i" class="example-card">
      <div class="ex-title">{{ item.title }}</div>
      <!-- 题干 -->
      <MathJaxRender :text="item.question" class="ex-question" />
      <!-- 解答过程（默认展开） -->
      <div v-if="item.solution" class="ex-solution">
        <MathJaxRender :text="item.solution" />
      </div>
      <!-- 答案折叠 -->
      <div v-if="item.answer" class="ex-answer-wrap">
        <button class="ex-toggle" @click="toggle(i)">
          {{ opened[i] ? '隐藏答案' : '查看答案' }}
        </button>
        <div v-show="opened[i]" class="ex-answer">
          <MathJaxRender :text="item.answer" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive } from 'vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

defineProps({
  // 区块数据：{ type:'example', title, items:[{title,question,solution,answer}] }
  block: { type: Object, required: true }
})

// 记录每个例题的答案是否展开
const opened = reactive({})

// 切换指定例题的答案显隐
function toggle(index) {
  opened[index] = !opened[index]
}
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
.ex-title { font-weight: 700; margin-bottom: var(--spacer-8); }
.ex-question { margin-bottom: var(--spacer-8); }
.ex-solution {
  background: var(--surface-muted);
  border-left: 3px solid var(--success);
  border-radius: var(--radius-md);
  padding: var(--spacer-12);
  margin: var(--spacer-8) 0;
}
.ex-answer-wrap { margin-top: var(--spacer-8); }
.ex-toggle {
  background: var(--primary-soft);
  color: var(--primary);
  border: 1px solid var(--primary);
  border-radius: var(--radius-full);
  padding: 4px 14px;
  font-size: 0.85rem;
}
.ex-toggle:hover { background: var(--primary); color: #fff; }
.ex-answer {
  background: rgba(47, 158, 68, 0.08);
  border: 1px solid var(--success);
  border-radius: var(--radius-md);
  padding: var(--spacer-12);
  margin-top: var(--spacer-8);
}
</style>