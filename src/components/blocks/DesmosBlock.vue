<!--
  DesmosBlock —— 内容区块：数学图形计算器演练场（desmos，渲染 GeoGebra）
  职责：
   - 作为 content-schema 的 desmos 区块渲染器（保持 schema 兼容）
   - 读取区块配置（title / initialExpressions）渲染 GeoGebraPlayground
   - 支持在内容中直接嵌入演练场
-->
<template>
  <section class="block desmos-block">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <GeoGebraPlayground :initial-expressions="block.initialExpressions || []" />
  </section>
</template>

<script setup>
import GeoGebraPlayground from '@/components/GeoGebraPlayground.vue'

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