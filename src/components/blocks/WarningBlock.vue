<!--
  WarningBlock —— 警告提示区块
  职责：突出强调易错点、常考考点等警示性内容
  视觉（阶段 3 第二步）：与 tip 共用 .shell--note（左 2px 语义色细线），
  彻底删掉 rgba 填充、1px 描边、圆角。
-->
<template>
  <BlockShell variant="note" tone="tone-warn">
    <div class="warning-box">
      <span class="warning-icon"><AppIcon name="triangle-alert" :size="18" /></span>
      <MathJaxRender :text="block.text" />
    </div>
  </BlockShell>
</template>

<script setup>
import BlockShell from './BlockShell.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  // 区块数据：{ type:'warning', text:string }
  block: { type: Object, required: true }
})
</script>

<style scoped>
/* 左细线来自 .shell--note；此处只留差异：图标与文字的横向排布与间距 */
.warning-box {
  display: flex;
  gap: var(--spacer-8);
}
.warning-icon { color: var(--tone-warn); }
</style>
