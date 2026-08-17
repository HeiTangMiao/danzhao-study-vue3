<!--
  TipBlock —— 提示区块
  职责：展示记忆口诀、技巧等辅助性提示内容
-->
<template>
  <section class="block tip">
    <div class="tip-box">
      <span class="tip-icon">💡</span>
      <MathJaxRender :text="block.text" />
    </div>
  </section>
</template>

<script setup>
import MathJaxRender from '@/components/MathJaxRender.vue'

defineProps({
  // 区块数据：{ type:'tip', text:string }
  block: { type: Object, required: true }
})
</script>

<style scoped>
.tip-box {
  display: flex;
  gap: var(--spacer-8);
  background: rgba(47, 111, 237, 0.08);
  border: 1px solid var(--primary);
  border-radius: var(--radius-md);
  padding: var(--spacer-12) var(--spacer-16);
  margin-bottom: var(--spacer-12);
}
.tip-icon { color: var(--primary); }
</style>