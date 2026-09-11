<!--
  TipBlock —— 提示区块
  职责：展示记忆口诀、技巧等辅助性提示内容
  视觉（阶段 3 第二步）：与 warning 共用 .shell--note（左 2px 语义色细线），
  彻底删掉 rgba 填充、1px 描边、圆角。
-->
<template>
  <BlockShell variant="note" tone="primary">
    <div class="tip-box">
      <span class="tip-icon">💡</span>
      <MathJaxRender :text="block.text" />
    </div>
  </BlockShell>
</template>

<script setup>
import BlockShell from './BlockShell.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

defineProps({
  // 区块数据：{ type:'tip', text:string }
  block: { type: Object, required: true }
})
</script>

<style scoped>
/* 左细线来自 .shell--note；此处只留差异：图标与文字的横向排布与间距 */
.tip-box {
  display: flex;
  gap: var(--spacer-8);
}
.tip-icon { color: var(--primary); }
</style>
