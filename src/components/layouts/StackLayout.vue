<!--
  StackLayout —— 布局原语 stack：把 children 纵向依次堆叠
  说明：纵向堆叠本就是阅读流的默认节奏，本原语的价值是让「刻意的一列」
       在数据里有显式身份，并支持 gap 调节。
-->
<template>
  <section class="layout layout--stack" :class="`gap-${gap}`">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="layout__body"><slot /></div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  block: { type: Object, required: true }
})

const gap = computed(() => {
  const g = props.block.props?.gap
  return g === 'tight' || g === 'loose' ? g : 'normal'
})
</script>
