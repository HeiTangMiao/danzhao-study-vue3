<!--
  FormulaCard —— 公式卡片区块
  职责：以卡片形式展示公式行，块级居中展示，突出核心公式
-->
<template>
  <section class="block formula">
    <div class="formula-card">
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
.formula-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacer-16);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacer-12);
}
.formula-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: var(--spacer-8);
}
.formula-line { margin-bottom: var(--spacer-4); }
</style>