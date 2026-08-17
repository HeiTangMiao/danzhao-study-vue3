/**
 * useKatex —— KaTeX 公式渲染 composable（替代 MathJax）
 * 职责：
 *  - 同步渲染 LaTeX 公式为 HTML（无需异步加载脚本）
 *  - 支持 \(...\)、$$...$$、\[...\] 三种定界符
 *  - 支持 **加粗** 和换行处理
 *  - 纯 npm 包，Vite 完美打包，无动态资源加载问题
 *  - 非公式文本自动 HTML 转义，防止标签误解析
 *
 * 优势（相比 MathJax）：
 *  - 同步渲染，无需等待脚本加载
 *  - 字体内嵌为 base64，不依赖外部资源
 *  - 体积更小，渲染更快
 *  - 在 Tauri/WebView 环境中 100% 可靠
 */
import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * 转义 HTML 特殊字符（用于非公式文本部分）
 */
function escapeHTML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 使用 KaTeX 渲染单个 LaTeX 公式为 HTML 字符串
 * @param {string} latex - LaTeX 源码
 * @param {boolean} displayMode - 是否块级展示
 * @returns {string} 渲染后的 HTML
 */
function renderFormula(latex, displayMode = false) {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
      trust: true
    })
  } catch (e) {
    return `<span style="color:var(--danger);font-family:monospace;">${escapeHTML(latex)}</span>`
  }
}

/**
 * 处理 **加粗** 标记为 <strong> 标签
 */
function processBold(text) {
  return text.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
}

/**
 * 处理 ==高亮== 标记为 <mark> 标签
 * 用于突出关键结论、易错点等重点内容
 */
function processHighlight(text) {
  return text.replace(/==([^=]+?)==/g, '<mark class="katex-hl">$1</mark>')
}

/**
 * 将包含 LaTeX 公式的文本渲染为 HTML
 *
 * 处理流程：
 *  1. 按数学定界符分割文本为「公式段」和「普通文本段」
 *  2. 普通文本段：HTML 转义 + 处理加粗 + 换行
 *  3. 公式段：KaTeX 渲染
 *  4. 拼接返回
 *
 * @param {string} text - 原始文本
 * @param {boolean} forceBlock - 是否强制块级展示（用于 FormulaCard 纯 LaTeX）
 * @returns {string} 可注入 v-html 的 HTML
 */
export function renderMath(text, forceBlock = false) {
  if (!text) return ''

  // 如果强制块级模式且文本不含任何数学定界符，直接作为整条公式渲染
  if (forceBlock) {
    const hasDelim = /\$\$|\\\(|\\\[/.test(text)
    if (!hasDelim) {
      // 纯 LaTeX 公式，直接用 KaTeX 块级渲染
      return renderFormula(text.trim(), true)
    }
  }

  // 按定界符分割文本，逐段处理
  // 匹配顺序：$$...$$ → \[...\] → \(...\)
  const parts = []
  let remaining = text
  let match

  // 统一正则：匹配三种定界符
  const delimRegex = /(\$\$([\s\S]+?)\$\$)|(\\\[([\s\S]+?)\\\])|(\\\(([\s\S]+?)\\\))/g

  let lastIndex = 0
  while ((match = delimRegex.exec(remaining)) !== null) {
    // match 之前的普通文本
    if (match.index > lastIndex) {
      const plain = remaining.slice(lastIndex, match.index)
      parts.push(processSegment(plain))
    }

    // 提取公式内容
    let latex, displayMode
    if (match[2] !== undefined) {
      // $$...$$ 块级
      latex = match[2]
      displayMode = true
    } else if (match[4] !== undefined) {
      // \[...\] 块级
      latex = match[4]
      displayMode = true
    } else if (match[6] !== undefined) {
      // \(...\) 行内
      latex = match[6]
      displayMode = false
    }

    parts.push(renderFormula(latex.trim(), displayMode))
    lastIndex = match.index + match[0].length
  }

  // 末尾剩余的普通文本
  if (lastIndex < remaining.length) {
    const plain = remaining.slice(lastIndex)
    parts.push(processSegment(plain))
  }

  return parts.join('')
}

/**
 * 处理普通文本段：HTML 转义 + 加粗 + 高亮 + 换行
 */
function processSegment(text) {
  let result = escapeHTML(text)
  result = processBold(result)
  result = processHighlight(result)
  result = result.replace(/\n/g, '<br>')
  return result
}

/**
 * 触发重新排版（兼容旧 API，KaTeX 为同步渲染无需此操作）
 */
export async function typesetMath(_root) {
  return Promise.resolve()
}

/**
 * 加载（兼容旧 API，KaTeX 已通过 import 同步加载）
 */
export async function loadMathJax() {
  return Promise.resolve()
}

export default { renderMath, typesetMath, loadMathJax }
