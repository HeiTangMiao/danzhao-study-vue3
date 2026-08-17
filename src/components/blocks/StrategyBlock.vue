<!--
  StrategyBlock —— 考试技巧区块
  职责：展示应试策略、时间分配、答题顺序等提分技巧
-->
<template>
  <section class="block strategy">
    <h2 class="block-title">🎯 {{ block.title || '考试技巧' }}</h2>
    <div v-for="(item, i) in block.items" :key="i" class="strategy-card">
      <div class="strategy-head">
        <span class="strategy-num">{{ i + 1 }}</span>
        <span class="strategy-title">{{ item.title }}</span>
      </div>
      <div class="strategy-content">
        <MathJaxRender :text="item.content" />
      </div>
    </div>
  </section>
</template>

<script setup>
import MathJaxRender from '@/components/MathJaxRender.vue'

defineProps({
  // 区块数据：{ type:'strategy', title, items:[{title,content}] }
  block: { type: Object, required: true }
})
</script>

<style scoped>
.strategy-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  border-radius: var(--radius-md);
  padding: var(--spacer-14) var(--spacer-16);
  margin-bottom: var(--spacer-12);
}
.strategy-head { display: flex; align-items: center; gap: var(--spacer-10); margin-bottom: var(--spacer-8); }
.strategy-num {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700;
}
.strategy-title { font-weight: 700; font-size: 1rem; }
.strategy-content { color: var(--text); font-size: 0.92rem; padding-left: 36px; }
</style>
