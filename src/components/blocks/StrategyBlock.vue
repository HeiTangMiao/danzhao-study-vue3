<!--
  StrategyBlock —— 考试技巧区块
  职责：展示应试策略、时间分配、答题顺序等提分技巧
-->
<template>
  <section class="block strategy">
    <h2 class="block-title">🎯 {{ block.title || '考试技巧' }}</h2>
    <div v-for="(item, i) in block.items" :key="i" class="block-card block-card--md block-card--rail-accent strategy-card">
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
/* 外框来自 .block-card，此处只留差异：内边距略窄（14/16）与卡间距 */
.strategy-card {
  padding: var(--spacer-14) var(--spacer-16);
  margin-bottom: var(--spacer-12);
}
.strategy-head { display: flex; align-items: center; gap: var(--spacer-10); margin-bottom: var(--spacer-8); }
.strategy-num {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--fs-sm); font-weight: 700;
}
.strategy-title { font-weight: 700; font-size: var(--fs-lg); }
.strategy-content { color: var(--text); font-size: 0.92rem; padding-left: 36px; }
</style>
