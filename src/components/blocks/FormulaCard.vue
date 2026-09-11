<!--
  FormulaCard —— 公式卡片区块
  职责：以卡片形式展示公式行，块级居中展示，突出核心公式
-->
<template>
  <section class="block formula">
    <div class="block-card block-card--shadow formula-card">
      <div v-if="block.title" class="formula-label">{{ block.title }}</div>
      <div v-for="(line, i) in lines" :key="i" class="formula-line">
        <MathJaxRender :text="line" block />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
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
/* 外框（底色 / 描边 / 圆角 / 内边距 / 阴影）来自 .block-card，此处只留差异 */
.formula-card {
  margin-bottom: var(--spacer-12);
}
.formula-label {
  font-size: var(--fs-md);
  color: var(--text-muted);
  margin-bottom: var(--spacer-8);
}
.formula-line { margin-bottom: var(--spacer-4); }
</style>