<!--
  TableBlock —— 表格区块
  职责：渲染二维表格，支持 LaTeX 公式单元格与表头
-->
<template>
  <section class="block table">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="table-wrap">
      <table class="data-table">
        <thead v-if="block.headers">
          <tr>
            <th v-for="(h, i) in block.headers" :key="i"><MathJaxRender :text="h" /></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in block.rows" :key="ri">
            <td v-for="(cell, ci) in row" :key="ci"><MathJaxRender :text="cell" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import MathJaxRender from '@/components/MathJaxRender.vue'

defineProps({
  // 区块数据：{ type:'table', title, headers:[string], rows:[[string]] }
  block: { type: Object, required: true }
})
</script>

<style scoped>
.table-wrap { overflow-x: auto; }
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.data-table th {
  background: var(--surface-muted);
  font-weight: 600;
  text-align: left;
}
.data-table th, .data-table td {
  padding: 10px 14px;
  border: 1px solid var(--border);
}
.data-table tr:nth-child(even) { background: var(--surface-muted); }
</style>