<!--
  WarningBlock —— 警告提示区块
  职责：突出强调易错点、常考考点等警示性内容
-->
<template>
  <section class="block warning">
    <div class="block-card block-card--md block-card--tone-warn warning-box">
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
/* 底色与描边来自 .block-card--tone-warn，圆角来自 --md，
 * 此处只留差异：横向排布、图标与文字的间距、较窄的内边距、块间距 */
.warning-box {
  display: flex;
  gap: var(--spacer-8);
  padding: var(--spacer-12) var(--spacer-16);
  margin-bottom: var(--spacer-12);
}
.warning-icon { color: var(--warning); }
</style>