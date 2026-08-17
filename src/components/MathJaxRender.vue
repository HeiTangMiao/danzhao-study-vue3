<!--
  MathJaxRender —— 公式渲染组件（KaTeX 引擎）
  职责：
   - 接收包含 LaTeX 公式的文本，同步渲染为 HTML
   - 支持 \(...\)、$$...$$、\[...\] 定界符
   - 支持 **加粗** 和换行
   - block 属性控制是否块级居中展示
   - 对 FormulaCard 传入的纯 LaTeX 自动按块级公式渲染
  引擎说明：使用 KaTeX 替代 MathJax，同步渲染无需等待脚本加载，
            字体内嵌无外部资源依赖，Tauri 环境完全可靠。
-->
<template>
  <div class="mathjax-render" :class="{ 'mathjax-block': block }" v-html="html"></div>
</template>

<script setup>
import { computed } from 'vue'
import { renderMath } from '@/composables/useKatex'

const props = defineProps({
  // 待渲染的原始文本（含 \(...\) 或 $$...$$ 公式，或纯 LaTeX）
  text: { type: String, default: '' },
  // 是否块级展示（居中放大，用于公式卡片）
  block: { type: Boolean, default: false }
})

// 同步渲染：将文本中的 LaTeX 公式转为 HTML
const html = computed(() => {
  if (!props.text) return ''
  return renderMath(props.text, props.block)
})
</script>

<style scoped>
.mathjax-render { line-height: 1.8; }
.mathjax-block { display: block; text-align: center; margin: 8px 0; font-size: 1.15em; }
</style>
