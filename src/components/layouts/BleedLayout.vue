<!--
  BleedLayout —— 布局原语 bleed：出血（让内容突破阅读版心的左右留白）
  排布契约：side 决定出血方向（默认 both），width 决定出血幅度（wide / full）。
  安全约束：只在容器本身足够宽时才出血，窄容器里自动回落为零出血 ——
           由 layouts.css 的容器查询兜底，避免把内容推出可视区。
-->
<template>
  <section class="layout layout--bleed" :class="[`side-${side}`, `width-${width}`]">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="layout__body"><slot /></div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  block: { type: Object, required: true }
})

const SIDES = ['start', 'end', 'both']
const WIDTHS = ['wide', 'full']

const side = computed(() => (SIDES.includes(props.block.props?.side) ? props.block.props.side : 'both'))
const width = computed(() => (WIDTHS.includes(props.block.props?.width) ? props.block.props.width : 'wide'))
</script>
