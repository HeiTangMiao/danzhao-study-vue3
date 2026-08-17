/**
 * useKatex 公式渲染测试
 * 重点锁定：末尾孤立反斜杠的清理行为（历史内容数据遗留问题）
 * 该问题曾导致 Android/桌面端公式以红色源码显示
 */
import { describe, it, expect } from 'vitest'
import { renderMath } from '@/composables/useKatex'

describe('renderMath 公式渲染', () => {
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
})
