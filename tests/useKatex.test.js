/**
 * useKatex 公式渲染测试
 * 重点锁定：
 *  - 末尾孤立反斜杠的清理行为（历史内容数据遗留问题，曾导致公式以红色源码显示）
 *  - **引擎异步预热**（阶段 7.1）：未就绪时返回纯文本兜底，就绪后正常渲染
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  renderMath, renderPlainFallback, warmKatex, isKatexReady, engineVersion, clearMathCache
} from '@/composables/useKatex'

/** 拿到 KaTeX 模块，用于数「真正发生了多少次渲染」（memo 是否命中） */
async function katexSpy() {
  const mod = await import('katex')
  return vi.spyOn(mod.default, 'renderToString')
}

describe('renderMath 公式渲染（引擎已就绪）', () => {
  beforeEach(async () => {
    await warmKatex()
  })

  it('预热后引擎就绪，版本号被 bump', () => {
    expect(isKatexReady()).toBe(true)
    expect(engineVersion.value).toBeGreaterThan(0)
  })

  it('渲染正常的行内公式', () => {
    const html = renderMath('\\(\\lambda > 0\\) 时同向')
    expect(html).not.toContain('katex-error')
    expect(html).toContain('katex')
  })

  it('渲染正常的块级公式', () => {
    const html = renderMath('\\vec{AB} - \\vec{AC} = \\vec{CB}', true)
    expect(html).not.toContain('katex-error')
  })

  it('清理公式末尾的孤立反斜杠（历史数据遗留）', () => {
    // 字符串值末尾为单个反斜杠，曾是红色源码错误的直接原因
    const html = renderMath('\\lambda > 0\\', true)
    expect(html).not.toContain('katex-error')
  })

  it('清理公式末尾的多个反斜杠与空白', () => {
    const html = renderMath('\\lambda\\boldsymbol{a} \\\\  ', true)
    expect(html).not.toContain('katex-error')
  })

  it('保留 cases 环境内部的换行符，仅清理末尾残留', () => {
    const latex = '\\begin{cases} y = k_1 x + b \\\\ y = \\frac{k_2}{x} \\end{cases}\\'
    const html = renderMath(latex, true)
    expect(html).not.toContain('katex-error')
    // cases 被渲染为多行表格结构（mtable），且两行内容均在
    expect(html).toContain('mtable')
    expect(html).toContain('mfrac')
  })

  it('空公式返回空字符串', () => {
    expect(renderMath('', true)).toBe('')
    expect(renderMath('\\', true)).toBe('')
  })

  it('定界符分割渲染：公式与普通文本混合', () => {
    const html = renderMath('\\(\\boldsymbol{a}\\)（\\(\\lambda \\in \\mathbb{R}\\)）是一个向量：')
    expect(html).not.toContain('katex-error')
    expect(html).toContain('是一个向量')
  })

  it('短路径：正文里没有公式时直接按普通文本处理（加粗 / 高亮 / 换行仍生效）', () => {
    const html = renderMath('**加粗**与==高亮==\n第二行')
    expect(html).toContain('<strong>加粗</strong>')
    expect(html).toContain('katex-hl')
    expect(html).toContain('<br>')
    expect(html).not.toContain('katex-error')
  })
})

describe('引擎未就绪时的兜底（阶段 7.1）', () => {
  it('返回剥掉数学定界符的纯文本，不闪乱码', async () => {
    // 用干净的模块实例模拟「冷启动、引擎还没下载完」
    vi.resetModules()
    const fresh = await import('@/composables/useKatex')
    expect(fresh.isKatexReady()).toBe(false)
    expect(fresh.engineVersion.value).toBe(0)

    const html = fresh.renderMath('\\(x=1\\) 是方程，$$y=2$$ 也是')
    expect(html).not.toContain('katex')
    expect(html).not.toContain('\\(')
    expect(html).not.toContain('$$')
    expect(html).toContain('x=1 是方程')
    expect(html).toContain('y=2 也是')
  })

  it('兜底仍保留加粗 / 高亮 / 换行（与正式渲染同一套文本处理）', () => {
    const html = renderPlainFallback('**要点**\n==必记==')
    expect(html).toContain('<strong>要点</strong>')
    expect(html).toContain('katex-hl')
    expect(html).toContain('<br>')
  })

  it('warmKatex 幂等：并发预热只加载一次、版本号只 +1', async () => {
    vi.resetModules()
    const fresh = await import('@/composables/useKatex')
    const [a, b] = await Promise.all([fresh.warmKatex(), fresh.warmKatex()])
    expect(a).toBe(b)
    expect(fresh.engineVersion.value).toBe(1)
    await fresh.warmKatex()
    expect(fresh.engineVersion.value).toBe(1)
  })

  it('兜底结果**不进缓存**：引擎就绪后同一段文本必须换成公式', async () => {
    vi.resetModules()
    const fresh = await import('@/composables/useKatex')
    const text = '\\(x=1\\) 是方程'
    expect(fresh.renderMath(text)).toBe('x=1 是方程') // 冷启动：纯文本
    await fresh.warmKatex()
    expect(fresh.renderMath(text)).toContain('katex') // 就绪后：真公式（若兜底进过缓存，这里会一直返回纯文本）
  })
})

describe('渲染结果 memo（阶段 7.2）', () => {
  beforeEach(async () => {
    await warmKatex()
    clearMathCache()
  })

  it('同一段文本只真正渲染一次（第二次命中缓存）', async () => {
    const spy = await katexSpy()
    spy.mockClear()
    const text = '\\(\\alpha + \\beta\\) 的值'
    const first = renderMath(text)
    const callsAfterFirst = spy.mock.calls.length
    const second = renderMath(text)
    expect(second).toBe(first)
    expect(spy.mock.calls.length).toBe(callsAfterFirst)
    spy.mockRestore()
  })

  it('缓存键区分块级 / 行内两种模式', async () => {
    const spy = await katexSpy()
    spy.mockClear()
    const text = '\\(x = 1\\)'
    renderMath(text)
    renderMath(text, true)
    // 同一文本两种模式各渲染一次 —— 说明键里带了模式位（否则第二次会命中第一次的缓存）
    // 注：含定界符的文本里 \(...\) 始终按行内渲染，所以此刻两次输出恰好相同，
    //    但键不同这件事本身是必须的（forceBlock 的纯 LaTeX 场景输出确实不同）
    expect(spy.mock.calls.length).toBe(2)
    renderMath(text)
    renderMath(text, true)
    expect(spy.mock.calls.length).toBe(2) // 之后各自命中自己的键
    spy.mockRestore()
  })

  it('超过 512 KB 上限时按 FIFO 淘汰最早的一条', async () => {
    const spy = await katexSpy()
    spy.mockClear()
    // 单条渲染结果约 300 KB，写两条必然越过 512 KB，把最早的一条挤出去
    const big = (tag) => `\\(${tag}\\) ${'一段很长的正文，用来把缓存撑爆。'.repeat(20000)}`
    const a = big('第一段')
    renderMath(a)
    const afterA = spy.mock.calls.length
    renderMath(big('第二段'))
    // 第一条已被淘汰：重新渲染会再次真正调用引擎
    renderMath(a)
    expect(spy.mock.calls.length).toBeGreaterThan(afterA + 1)
    spy.mockRestore()
  })

  it('clearMathCache 之后重新渲染', async () => {
    const spy = await katexSpy()
    spy.mockClear()
    const text = '\\(\\gamma\\) 系数'
    renderMath(text)
    const n = spy.mock.calls.length
    clearMathCache()
    renderMath(text)
    expect(spy.mock.calls.length).toBeGreaterThan(n)
    spy.mockRestore()
  })
})

/**
 * 行内代码 `code`（内容侧 2026-10-24 转函：12 类字段共 739 处反引号原样上屏）
 *
 * 根因：processSegment 只有 转义 → 加粗 → 高亮 → 换行 四步，没有行内代码，
 *       而 escapeHTML 只转义 & < >（不转义反引号），于是 `print(...)` 连同反引号一起显示。
 *
 * 这里钉死三件事：
 *  1. 反引号内容必须变成 <code class="katex-inline-code">，且输出里不留孤立反引号；
 *  2. 代码内部是**字面量**：`2 ** 3`、`a == b` 不得被加粗/高亮误伤（内容侧大量存在）；
 *  3. 加粗标记常**跨在**代码跨度两侧（`**`no shutdown` 忘写**`），不能为了 2 把粗体弄丢。
 */
describe('行内代码 `code`', () => {
  beforeEach(async () => {
    await warmKatex()
    clearMathCache()
  })

  // 内容侧来件里的原句（src/content/computer/.../01-Python开发环境与基础语法.js:112 附近）
  const TICKET_TEXT =
    '**print 输出：**`print(内容)` 用于输出，多个内容用逗号分隔，如 `print("总分", 95)` 输出 `总分 95`。'

  it('基本：反引号内容渲染为 <code>，输出不残留孤立反引号', () => {
    const html = renderMath(TICKET_TEXT)
    expect(html).toContain('<strong>print 输出：</strong>')
    expect(html).toContain('<code class="katex-inline-code">print(内容)</code>')
    expect(html).toContain('<code class="katex-inline-code">print("总分", 95)</code>')
    expect(html).toContain('<code class="katex-inline-code">总分 95</code>')
    expect(html).not.toContain('`')
    // 项目 CSP 禁运行时内联样式：代码标签只能挂 class
    expect(html).not.toContain('<code style=')
  })

  it('同一段里多个代码跨度各自成标签', () => {
    const html = renderMath('先 `a = 1` 再 `b = 2`，最后 `c = a + b`')
    expect(html.match(/<code class="katex-inline-code">/g)).toHaveLength(3)
    expect(html).toContain('<code class="katex-inline-code">a = 1</code>')
    expect(html).toContain('<code class="katex-inline-code">b = 2</code>')
    expect(html).toContain('<code class="katex-inline-code">c = a + b</code>')
    expect(html).not.toContain('`')
  })

  it('代码内的 ** 与 == 保持字面量，不被转成 <strong> / <mark>', () => {
    const html = renderMath('幂运算 `2 ** 3`，相等判断 `a == b`')
    expect(html).toContain('<code class="katex-inline-code">2 ** 3</code>')
    expect(html).toContain('<code class="katex-inline-code">a == b</code>')
    expect(html).not.toContain('<strong>')
    expect(html).not.toContain('<mark')
  })

  it('代码内的 < > & 保持已转义，不产生裸标签', () => {
    const html = renderMath('标签 `<div>` 与 `<a & b>`')
    expect(html).toContain('<code class="katex-inline-code">&lt;div&gt;</code>')
    expect(html).toContain('<code class="katex-inline-code">&lt;a &amp; b&gt;</code>')
    expect(html).not.toContain('<div>')
    expect(html).not.toContain('<a &')
  })

  it('加粗标记跨在代码跨度两侧时仍生效（内容里的 `**`no shutdown` 忘写**`）', () => {
    const html = renderMath('**`no shutdown` 忘写**')
    expect(html).toBe('<strong><code class="katex-inline-code">no shutdown</code> 忘写</strong>')
  })

  it('高亮标记同样可以跨代码跨度（`==`ip routing`==`）', () => {
    const html = renderMath('==`ip routing` 忘了开==')
    expect(html).toContain('<mark class="katex-hl"><code class="katex-inline-code">ip routing</code> 忘了开</mark>')
  })

  it('代码内容不跨行（换行即止），两行各自成标签', () => {
    const html = renderMath('第一行 `a`\n第二行 `b`')
    expect(html).toContain('<code class="katex-inline-code">a</code><br>第二行 ')
    expect(html).toContain('<code class="katex-inline-code">b</code>')
    expect(html).not.toContain('`')
  })

  it('未配对的反引号按字面量保留，不生成半个 <code>', () => {
    const html = renderMath('C 语言里的 `指针 用法')
    expect(html).not.toContain('<code')
    expect(html).toContain('`指针')
  })

  it('三反引号不会被切成空 <code></code>（围栏由 codeFence.js 单独切分）', () => {
    // 即便围栏没被切分、整段降级进 processSegment，捕获组要求「非反引号 + 非换行」也匹配不上
    const html = renderMath('示例：\n```python\nprint("总分", 95)\n```')
    expect(html).not.toContain('<code')
    expect(html).not.toContain('katex-inline-code')
    expect(html).toContain('```python')
  })

  it('行内代码与围栏混排同段：正文段出 <code>，围栏段保持字面三反引号', () => {
    const html = renderMath('保存为 `01.py` 后按 F5：\n```python\nprint("总分", 95)\n```')
    expect(html).toContain('<code class="katex-inline-code">01.py</code>')
    expect(html).toContain('```python')
    expect(html).toContain('print("总分", 95)')
    expect(html).not.toContain('<code class="katex-inline-code">python')
  })

  it('引擎未就绪的兜底路径同样出行内代码（冷启动深链也不闪反引号）', () => {
    const html = renderPlainFallback('`print(x)` 输出，**重点**')
    expect(html).toContain('<code class="katex-inline-code">print(x)</code>')
    expect(html).toContain('<strong>重点</strong>')
    expect(html).not.toContain('`')
  })
})