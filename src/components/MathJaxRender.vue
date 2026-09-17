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
  异步预热（阶段 7.1）：KaTeX 523 KB 不再走静态 import，由 warmKatex 按需加载；
  引擎就绪前先渲染「剥掉定界符的纯文本」，就绪后靠 engineVersion 自动重算。
-->
<template>
  <div class="mathjax-render" :class="{ 'mathjax-block': block }" v-html="html"></div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { renderMath, renderPlainFallback, engineVersion, warmKatex } from '@/composables/useKatex'

const props = defineProps({
  // 待渲染的原始文本（含 \(...\) 或 $$...$$ 公式，或纯 LaTeX）
  text: { type: String, default: '' },
  // 是否块级展示（居中放大，用于公式卡片）
  block: { type: Boolean, default: false }
})

// 同步渲染：将文本中的 LaTeX 公式转为 HTML
// ⚠️ engineVersion 是**必须显式引用**的依赖：renderMath 读的是模块级 katex 变量，
//    Vue 追踪不到它。少了这个分支，引擎就绪后公式不会重渲染（表现为「点了半天不更新」）。
const html = computed(() => {
  if (!props.text) return ''
  return engineVersion.value === 0
    ? renderPlainFallback(props.text)
    : renderMath(props.text, props.block)
})

// 兜底预热：正常导航路径下路由守卫已并行预取，这里保证任何渲染点都不会漏
onMounted(() => { warmKatex() })
</script>

<style scoped>
.mathjax-render { line-height: 1.8; max-width: 100%; min-width: 0; overflow-wrap: break-word; }
.mathjax-block {
  display: block; text-align: center; margin: 8px 0; font-size: 1.15em;
  /* 长公式在窄屏横向滚动，避免整页横向溢出/被裁切 */
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 2px 0;
  /* 引擎就绪前此处显示纯文本、就绪后换成公式，留一行高度避免布局跳动（阶段 7.1）*/
  min-height: 1.6em;
}
</style>
