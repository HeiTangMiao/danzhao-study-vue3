<!--
  KnowledgeBlock —— 知识点区块
  职责：展示一个或多个知识点段落，支持 **加粗** 与 LaTeX 公式
  注：段落中 **文字** 会被渲染为加粗
-->
<template>
  <section class="block knowledge">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="block-card block-card--md block-card--rail-primary knowledge-box">
      <p v-for="(para, i) in paragraphs" :key="i" class="knowledge-para">
        <MathJaxRender :text="para" />
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

const props = defineProps({
  // 区块数据：{ type:'knowledge', title, paragraphs:[string] }
  block: { type: Object, required: true }
})

// 兼容两种字段：paragraphs（数组）或 paragraphs 单字符串
const paragraphs = computed(() => {
  const p = props.block.paragraphs
  return Array.isArray(p) ? p : [p]
})
</script>

<style scoped>
/* 外框（底色 / 描边 / 圆角 / 内边距 / 左粗边）来自 .block-card，
 * 此处只留差异：与下一块之间的间距 */
.knowledge-box {
  margin-bottom: var(--spacer-12);
}
.knowledge-para { margin-bottom: var(--spacer-8); }
</style>