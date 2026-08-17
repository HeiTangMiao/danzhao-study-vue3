<!--
  ObjectivesBlock —— 学习目标区块
  职责：展示页面学习目标列表，支持 LaTeX 公式
-->
<template>
  <section class="block objectives">
    <h3 class="block-title">🎯 {{ block.title || '学习目标' }}</h3>
    <div class="objectives-box">
      <p v-for="(item, i) in block.items" :key="i" class="objective-item">
        <span class="objective-dot">•</span>
        <MathJaxRender :text="item" />
      </p>
    </div>
  </section>
</template>

<script setup>
import MathJaxRender from '@/components/MathJaxRender.vue'

defineProps({
  // 区块数据：{ type:'objectives', title, items:[string] }
  block: { type: Object, required: true }
})
</script>

<style scoped>
.objectives-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacer-16);
}
.objective-item {
  display: flex;
  gap: var(--spacer-8);
  margin-bottom: var(--spacer-8);
}
.objective-dot { color: var(--primary); font-weight: 700; }
.block-title { margin-bottom: var(--spacer-12); }
</style>