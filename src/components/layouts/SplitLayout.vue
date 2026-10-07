<!--
  SplitLayout —— 布局原语 split：主次分栏
  排布契约：前两个 children 分列左右（前者起始侧、后者结束侧），ratio 为「开始侧:结束侧」的列宽比（默认 1:1）；
           容器不足宽时降为单列（layouts.css 的容器查询）。
           第 3 个及以后的 children 按行顺排（CSS 网格默认行流：填满一行再换行）——
           第 3 个落在第二行的起始侧（主侧）、第 4 个落在第二行结束侧，依此类推；多出的内容不静默丢弃。
  口径校正（2026-10-07 实测）：本注释早前写「第 3 个起排在结束侧之后」，与实现（CSS 网格默认行流）不符；
           实测确认实现为按行顺排，且该行为更贴合主次语义，故改文档而非改实现（layouts.css 未加 nth-child 规则）。
-->
<template>
  <section class="layout layout--split" :class="`gap-${gap}`">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="layout-split" :style="splitStyle"><slot /></div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  block: { type: Object, required: true }
})

/** ratio 取值域与 schema 一致；表驱动便于新增档位时只改一处 */
const RATIO_COLUMNS = {
  '1:1': '1fr 1fr',
  '1:2': '1fr 2fr',
  '2:1': '2fr 1fr',
  '1:3': '1fr 3fr',
  '3:1': '3fr 1fr'
}

const gap = computed(() => {
  const g = props.block.props?.gap
  return g === 'tight' || g === 'loose' ? g : 'normal'
})

const splitStyle = computed(() => ({
  '--layout-split-cols': RATIO_COLUMNS[props.block.props?.ratio] || RATIO_COLUMNS['1:1']
}))
</script>
