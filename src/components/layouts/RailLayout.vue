<!--
  RailLayout —— 布局原语 rail：侧轨 + 主内容
  排布契约：**第一个 child 为侧轨**（辅助信息 / 导航 / 摘要），其余为主内容；
           side 决定侧轨在左（start，默认）还是右（end）；width 为侧轨宽度档；sticky 让侧轨吸顶。
           容器不足宽时降为单列，侧轨自然回到内容之前（因为它是第一个 child）。
-->
<template>
  <section class="layout layout--rail" :class="`gap-${gap}`">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="layout-rail" :class="[`side-${side}`, `width-${width}`, { 'is-sticky': sticky }]">
      <slot />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  block: { type: Object, required: true }
})

const side = computed(() => (props.block.props?.side === 'end' ? 'end' : 'start'))
const width = computed(() => (props.block.props?.width === 'md' ? 'md' : 'sm'))
const sticky = computed(() => props.block.props?.sticky === true)

const gap = computed(() => {
  const g = props.block.props?.gap
  return g === 'tight' || g === 'loose' ? g : 'normal'
})
</script>
