<!--
  WarningBlock —— 警告提示区块
  职责：突出强调易错点、常考考点等警示性内容
-->
<template>
  <section class="block warning">
    <div class="warning-box">
      <span class="warning-icon">⚠️</span>
      <MathJaxRender :text="block.text" />
    </div>
  </section>
</template>

<script setup>
import MathJaxRender from '@/components/MathJaxRender.vue'

defineProps({
  // 区块数据：{ type:'warning', text:string }
  block: { type: Object, required: true }
})
</script>

<style scoped>
.warning-box {
  display: flex;
  gap: var(--spacer-8);
  background: rgba(240, 140, 0, 0.10);
  border: 1px solid var(--warning);
  border-radius: var(--radius-md);
  padding: var(--spacer-12) var(--spacer-16);
  margin-bottom: var(--spacer-12);
}
.warning-icon { color: var(--warning); }
</style>