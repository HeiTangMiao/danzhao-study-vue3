<!--
  GridLayout —— 布局原语 grid：让 children 等宽成网格
  排布契约：cols 为「容器够宽时的列数」（默认 2），容器不足宽时由 CSS 降为单列；
           本组件不感知视口，只把参数落到 CSS 变量，降级交给 layouts.css 的容器查询。
  为何没有 min 参数：曾有 min（自动填充时的最小列宽），但它对应的是 auto-fit + minmax(minWidth,1fr)
           模式，与当前固定列数模式（repeat(cols, minmax(0,1fr))）不兼容，且样式侧从未落地 ——
           留着一个对排布毫无作用的参数只会误导作者，故移除。将来真要做自动填充，再按 auto-fit 重做。
-->
<template>
  <section class="layout layout--grid" :class="`gap-${gap}`">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="layout-grid" :style="gridStyle"><slot /></div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  block: { type: Object, required: true }
})

/** 允许的 cols：2/3/4（越界值已被校验收敛，这里只做防御性兜底） */
const cols = computed(() => {
  const n = Number(props.block.props?.cols)
  return [2, 3, 4].includes(n) ? n : 2
})

const gap = computed(() => {
  const g = props.block.props?.gap
  return g === 'tight' || g === 'loose' ? g : 'normal'
})

// 只把列数作为 CSS 变量传出，具体断点与降级写在 layouts.css（单一真相源在样式侧）
const gridStyle = computed(() => ({ '--layout-grid-cols': String(cols.value) }))
</script>
