<!--
  MindMapBlock —— 思维导图区块（Mermaid 封装）
  职责：
   - 将区块中的 mermaid 源码渲染为思维导图
   - 通过 npm 包动态加载 Mermaid 库，支持暗色主题联动
   - 渲染失败时降级显示源码
-->
<template>
  <section class="block mindmap">
    <h3 class="block-title">🧠 {{ block.title || '知识结构导图' }}</h3>
    <div class="mindmap-content" ref="container"></div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { loadMermaid, renderMermaidTo } from '@/composables/useMermaid'

const props = defineProps({
  // 区块数据：{ type:'mindmap', title, mermaid:string }
  block: { type: Object, required: true }
})

// 容器 DOM 引用
const container = ref(null)

onMounted(async () => {
  if (!container.value || !props.block.mermaid) return
  // 加载 Mermaid 并渲染到容器
  await loadMermaid()
  renderMermaidTo(container.value, props.block.mermaid)
})
</script>

<style scoped>
.mindmap-content {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacer-16);
  overflow-x: auto;
  min-height: 100px;
}
.mindmap-content svg { max-width: 100%; height: auto; }
</style>
