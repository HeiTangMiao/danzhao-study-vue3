<!--
  TipBlock —— 提示区块
  职责：展示记忆口诀、技巧等辅助性提示内容
-->
<template>
  <section class="block tip">
    <div class="block-card block-card--md block-card--tone-accent tip-box">
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
/* 底色与描边来自 .block-card--tone-accent，圆角来自 --md，
 * 此处只留差异：横向排布、图标与文字的间距、较窄的内边距、块间距 */
.tip-box {
  display: flex;
  gap: var(--spacer-8);
  padding: var(--spacer-12) var(--spacer-16);
  margin-bottom: var(--spacer-12);
}
.tip-icon { color: var(--primary); }
</style>