<!--
  KnowledgeBlock —— 知识点区块
  职责：展示一个或多个知识点段落，支持 **加粗** 与 LaTeX 公式
  注：段落中 **文字** 会被渲染为加粗
  视觉（阶段 3 第二步）：去掉卡片外框，纯靠标题与留白分段；
  正文 max-width: 68ch，避免在宽屏下读长行。
  变体（阶段 4）：
   - plain      默认
   - definition 定义型（左 2px 细线 + 底色微区分）
   - aside      补充说明（降字号降色）
-->
<template>
  <BlockShell :title="block.title" :variant="shellVariant">
    <div class="knowledge-body" :class="{ 'is-aside': block.variant === 'aside' }">
      <p v-for="(para, i) in paragraphs" :key="i" class="knowledge-para">
        <MathJaxRender :text="para" />
      </p>
    </div>
  </BlockShell>
</template>

<script setup>
import { computed } from 'vue'
import BlockShell from './BlockShell.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

const props = defineProps({
  // 区块数据：{ type:'knowledge', title, variant?, paragraphs:[string] }
  block: { type: Object, required: true }
})

// 兼容两种字段：paragraphs（数组）或 paragraphs 单字符串
const paragraphs = computed(() => {
  const p = props.block.paragraphs
  return Array.isArray(p) ? p : [p]
})

// 变体映射到 BlockShell 外壳；aside 走默认 plain（字号降级由本组件类控制）
const shellVariant = computed(() => (props.block.variant === 'definition' ? 'definition' : 'plain'))
</script>

<style scoped>
/* 极简：无卡片外框，正文限制行长；段落间距由内边距控制 */
.knowledge-body { max-width: 68ch; }
.knowledge-para { margin-bottom: var(--spacer-8); }

/* aside 变体：降字号降色，弱化为「补充说明」层级 */
.knowledge-body.is-aside {
  max-width: none;
}
.is-aside .knowledge-para {
  font-size: var(--fs-base);
  color: var(--text-muted);
}
</style>
