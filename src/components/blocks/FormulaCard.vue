<!--
  FormulaCard —— 公式卡片区块
  职责：以卡片形式展示公式行，块级居中展示，突出核心公式
  视觉（阶段 3 第二步）：全站唯一保留浅底色的类型；删边框、删阴影、圆角降一档；
  label 改小字号 + 加字距。
-->
<template>
  <BlockShell variant="formula">
    <div v-if="block.title" class="formula-label">{{ block.title }}</div>
    <div v-for="(line, i) in lines" :key="i" class="formula-line">
      <MathJaxRender :text="line" block />
    </div>
  </BlockShell>
</template>

<script setup>
import { computed } from 'vue'
import BlockShell from './BlockShell.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

const props = defineProps({
  // 区块数据：{ type:'formula', title, formulas:[string] }
  block: { type: Object, required: true }
})

// 兼容 formulas 和 lines 两种字段名（向后兼容旧数据）
const lines = computed(() => {
  const l = props.block.formulas || props.block.lines
  return Array.isArray(l) ? l : [l]
})
</script>

<style scoped>
/* 浅底色来自 .shell--formula，此处只留差异 */
.formula-label {
  font-size: var(--fs-sm);
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: var(--spacer-8);
}
.formula-line { margin-bottom: var(--spacer-4); }
</style>
