<!--
  BlockShell —— 区块外壳（阶段 3 第二步引入）
  职责：
   - 提供统一的区块标题（.block-title，全局一份样式，见 blocks.css）
   - 提供外壳变体：plain 纯留白 / note 左侧语义色细线 / formula 浅底色
   - 只负责「单根」区块；per-item 卡（例题 / 题目 / 易错项 / 技巧项）仍由
     各组件自己用 .block-card 处理，本组件不接管它们。
  约束：
   - 不在外壳上加 margin-bottom —— 块间距由 UnitView 的 .block-anchor 间距统一负责。
   - 保留 section.block 类：思维导图点击联动靠 .block-anchor 内的 h3.block-title 匹配。
-->
<template>
  <section class="block block-shell" :class="`shell--${variant}`" :style="toneStyle">
    <h3 v-if="title" class="block-title">{{ title }}</h3>
    <slot />
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 区块标题（可选：tip / warning 无标题时留空）
  title: { type: String, default: '' },
  // 外壳变体：plain 纯留白 / note 左细线 / formula 浅底色 / viewport 保边框 / definition 左细线+微底色
  variant: { type: String, default: 'plain' },
  // 语义色 token 名（如 'primary' | 'tone-warn'），映射为 --tone 供 .shell--note 使用
  tone: { type: String, default: '' }
})

// 把 tone 变成 --tone 自定义属性；未指定时保持未设置（.shell--note 用默认值兜底）
const toneStyle = computed(() => {
  if (!props.tone) return {}
  return { '--tone': `var(--${props.tone})` }
})
</script>
