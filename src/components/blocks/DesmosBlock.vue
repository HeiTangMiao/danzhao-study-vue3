<!--
  DesmosBlock —— 内容区块：Desmos 图形计算器演练场（desmos）
  职责：
   - 作为 content-schema 的 desmos 区块渲染器
   - 读取区块配置（title / initialExpressions）渲染 DesmosPlayground
   - 支持在内容中直接嵌入演练场
-->
<template>
  <section class="block desmos-block">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <DesmosPlayground :initial-expressions="block.initialExpressions || []" />
  </section>
</template>

<script setup>
import DesmosPlayground from '@/components/DesmosPlayground.vue'

// 区块数据：{ type:'desmos', title, initialExpressions? }
defineProps({
  block: { type: Object, required: true }
})
</script>

<style scoped>
.block-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: var(--spacer-16) 0 var(--spacer-8);
}
</style>