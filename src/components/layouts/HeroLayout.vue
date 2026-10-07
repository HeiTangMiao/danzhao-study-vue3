<!--
  HeroLayout —— 布局原语 hero：首屏 / 章节强调区
  排布契约：单列，align 控制内容对齐（默认 start，避免长文居中难读）；
           tone=accent 时给整块加一层极浅强调底色（不做大面积渐变，遵守阅读页克制原则）。
-->
<template>
  <section class="layout layout--hero" :class="[`align-${align}`, `tone-${tone}`]">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="layout__body"><slot /></div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  block: { type: Object, required: true }
})

const align = computed(() => (props.block.props?.align === 'center' ? 'center' : 'start'))
const tone = computed(() => (props.block.props?.tone === 'accent' ? 'accent' : 'plain'))
</script>
