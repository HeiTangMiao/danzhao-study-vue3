/**
 * useKatex —— KaTeX 公式渲染 composable（KaTeX 引擎，异步预热）
 *
 * 职责：
 *  - warmKatex()：**幂等**异步加载 KaTeX（JS 523 KB / 155 KB gz + 样式），
 *    与 useMermaid 同一模式（模块级 katex / loadingPromise 两态）
 *  - renderMath()：**保持同步**（这是 KaTeX 相对 MathJax 的核心优势，不要丢）；
 *    引擎未就绪时退化为「剥掉定界符的纯文本」，避免闪出 \( \) $$ 这类乱码
 *  - engineVersion：就绪版本号（响应式）。renderMath 读的是模块级变量、无法被追踪，
 *    所以把「引擎就绪」这件事显式暴露出来，由 MathJaxRender 依赖它重渲染
 *
 * 为什么不能静态 import：523 KB 的引擎一旦进内容页关键路径，首屏就得等它下载完。
 * 现在改为「路由守卫并行预取 + 空闲预热 + 组件兜底」，正常导航路径下引擎早已就绪。
 * FOUT 的诚实结论见交接文档阶段 7.1：冷启动深链会有约 100–300ms 的纯文本窗口，
 * 闪的是普通文字而非乱码，且块级公式容器有 min-height 不产生布局跳动。
 *
 * 优势（相对 MathJax）：同步渲染无需等待脚本加载、字体内嵌无外部资源、
 * 在 Tauri/WebView 环境中 100% 可靠。
 */
import { ref } from 'vue'

/** KaTeX 模块实例（就绪前为 null） */
let katex = null
/** 进行中的加载（幂等：多处同时预热只发一次请求） */
let loadingPromise = null

/**
 * 引擎就绪版本号：0 = 未就绪，就绪后 +1
 * 供组件建立响应式依赖（renderMath 内部读的是模块级变量，追踪不到）
 */
export const engineVersion = ref(0)

/** 引擎是否已就绪（同步查询；renderMath 内部也用它决定是否降级） */
export function isKatexReady() {
  return !!katex
}

/**
 * 预热 KaTeX（幂等，失败不抛错 —— 渲染层会一直停留在纯文本兜底）
 * @returns {Promise<object|null>} KaTeX 模块；加载失败返回 null
 */
export function warmKatex() {
  if (katex) return Promise.resolve(katex)
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      const [mod] = await Promise.all([
        import('katex'),
        // 样式与 JS 同一条按需加载路径：不把 katex.min.css 挪进入口去换「零 FOUT」
        // （那会让所有页面都付 30 KB CSS 的钱，见交接文档阶段 7.1）
        import('katex/dist/katex.min.css')
      ])
      katex = mod.default || mod
      engineVersion.value += 1
      return katex
    } catch (e) {
      console.error('[useKatex] KaTeX 加载失败，公式降级为纯文本:', e)
      return null
    } finally {
      loadingPromise = null
    }
  })()

  return loadingPromise
}

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
 * 清理公式末尾的孤立反斜杠（历史内容数据遗留的换行符残留）
 * 末尾的 "\\" 或 "\" 在 KaTeX 顶层解析中是语法错误，
 * 会导致整条公式以红色源码显示（throwOnError: false 的降级表现）
 * @param {string} latex - 原始 LaTeX 源码
 * @returns {string} 清理后的 LaTeX 源码
 */
function sanitizeLatex(latex) {
  return latex.replace(/\s*\\+\s*$/g, '').trim()
}

/**
 * 使用 KaTeX 渲染单个 LaTeX 公式为 HTML 字符串
 * @param {string} latex - LaTeX 源码
 * @param {boolean} displayMode - 是否块级展示
 * @returns {string} 渲染后的 HTML
 */
function renderFormula(latex, displayMode = false) {
  const cleaned = sanitizeLatex(latex)
  if (!cleaned) return ''
  try {
    return katex.renderToString(cleaned, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
      trust: true
    })
  } catch (e) {
    return `<span style="color:var(--danger);font-family:monospace;">${escapeHTML(cleaned)}</span>`
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
 * 处理普通文本段：HTML 转义 + 加粗 + 高亮 + 换行
 */
function processSegment(text) {
  let result = escapeHTML(text)
  result = processBold(result)
  result = processHighlight(result)
  result = result.replace(/\n/g, '<br>')
  return result
}

/** 是否含数学定界符（用于短路径与兜底判断） */
const HAS_DELIM_RE = /\$\$|\\\(|\\\[/

/**
 * 引擎未就绪时的兜底：剥掉数学定界符，按普通文本渲染
 * 目的：宁可先显示「文字」，也不要闪出 `\(x\)` 这种乱码；
 *      forceBlock 的纯 LaTeX 没有文字部分，同样按剥壳后的原文显示。
 * @param {string} text 原始文本
 */
export function renderPlainFallback(text) {
  const stripped = String(text).replace(/\$\$|\\\[|\\\]|\\\(|\\\)/g, '')
  return processSegment(stripped)
}

/**
 * 渲染结果 memo（阶段 7.2）
 *
 * 为什么用 FIFO 而不是 LRU：内容文本在运行时是**不可变**的，同一段文字会被反复渲染
 * （预览、切换页面、区块重挂载），命中分布走的是时间局部性而非访问偏斜 ——
 * LRU 的「命中后移到队尾」纯属额外开销，换不来更高命中率。
 *
 * 为什么按字符总量限界：条目大小差异极大（一行公式 vs 整段解析），按条数限界会让
 * 「几百字节的公式」把「几 KB 的段落」挤掉。上限 512 KB HTML 字符串足够装下
 * 单个内容页的全部渲染结果（实测中位页面正文约 3.5k 字符）。
 */
const CACHE_LIMIT = 512 * 1024
const cache = new Map()
let cacheSize = 0

/** 缓存键：块级/行内分开（同一段文本两种模式的输出不同） */
function cacheKeyOf(text, forceBlock) {
  return `${forceBlock ? 'B' : 'I'}\0${text}`
}

/** 写缓存并按 FIFO 淘汰到限额以内 */
function writeCache(key, html) {
  cache.set(key, html)
  cacheSize += html.length
  while (cacheSize > CACHE_LIMIT && cache.size > 1) {
    const oldest = cache.keys().next().value
    cacheSize -= cache.get(oldest).length
    cache.delete(oldest)
  }
}

/**
 * 清空渲染缓存（供测试与编辑器使用）
 * 编辑器里公式是「逐字符」在变的，每敲一下都是一个新键，退出编辑器时清一次最省事
 */
export function clearMathCache() {
  cache.clear()
  cacheSize = 0
}

/**
 * 将包含 LaTeX 公式的文本渲染为 HTML
 *
 * 处理流程：
 *  1. 引擎未就绪 → 纯文本兜底（见 renderPlainFallback），**不进缓存**
 *     （否则引擎就绪后会把兜底结果当成正式结果一直在命中）
 *  2. 命中 memo → 直接返回
 *  3. 不含定界符且非 forceBlock → 短路径：直接按普通文本处理，跳过正则扫描
 *  4. 按数学定界符分割文本为「公式段」和「普通文本段」，逐段处理
 *
 * @param {string} text - 原始文本
 * @param {boolean} forceBlock - 是否强制块级展示（用于 FormulaCard 纯 LaTeX）
 * @returns {string} 可注入 v-html 的 HTML
 */
export function renderMath(text, forceBlock = false) {
  if (!text) return ''

  // 引擎未就绪：降级为纯文本（MathJaxRender 会在 engineVersion 变化后重算）
  if (!katex) return renderPlainFallback(text)

  const key = cacheKeyOf(text, forceBlock)
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const html = renderMathUncached(text, forceBlock)
  writeCache(key, html)
  return html
}

/** 实际渲染（不含 memo），逻辑与改造前一致 */
function renderMathUncached(text, forceBlock) {
  // 短路径：正文段落里绝大多数文本没有公式，直接跳过下面的正则扫描
  if (!forceBlock && !HAS_DELIM_RE.test(text)) return processSegment(text)

  // 如果强制块级模式且文本不含任何数学定界符，直接作为整条公式渲染
  if (forceBlock) {
    const hasDelim = HAS_DELIM_RE.test(text)
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
 * 触发重新排版（兼容旧 API，KaTeX 为同步渲染无需此操作）
 */
export async function typesetMath(_root) {
  return Promise.resolve()
}

/**
 * 加载（兼容旧 API；现等价于 warmKatex，调用方可 await 引擎就绪）
 */
export function loadMathJax() {
  return warmKatex().then(() => undefined)
}

export default { renderMath, renderPlainFallback, warmKatex, isKatexReady, engineVersion, clearMathCache, typesetMath, loadMathJax }