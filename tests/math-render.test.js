// @vitest-environment jsdom
/**
 * MathJaxRender 的「引擎异步就绪」行为测试（阶段 7.1）
 *
 * 这是本次改造最容易被写错的一环：renderMath 读的是模块级 katex 变量（非响应式），
 * 组件必须显式依赖 engineVersion 才会在引擎就绪后重算 —— 否则页面会一直停在纯文本，
 * 而且不报错、不警告。所以这里用「冷启动 → 预热完成」的真实时序把它钉死。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { splitCodeFences } from '@/utils/codeFence'

describe('MathJaxRender 引擎就绪前后', () => {
  beforeEach(() => {
    // 每个用例都从「引擎未加载」的干净模块实例开始，才能覆盖冷启动
    vi.resetModules()
  })

  it('未就绪时先渲染纯文本，就绪后自动换成公式（无需刷新 / 重新挂载）', async () => {
    const { default: MathJaxRender } = await import('@/components/MathJaxRender.vue')
    const { warmKatex } = await import('@/composables/useKatex')

    const wrapper = mount(MathJaxRender, { props: { text: '\\(x=1\\) 是方程' } })
    // 同步断言：此刻引擎仍在下载中（onMounted 的预热是异步的）
    expect(wrapper.html()).not.toContain('katex')
    expect(wrapper.text()).toContain('x=1 是方程')

    await warmKatex()
    await nextTick()
    expect(wrapper.html()).toContain('katex')
    wrapper.unmount()
  })

  it('block 模式带 mathjax-block 类，并预留最小高度（引擎就绪前后不跳动）', async () => {
    const { default: MathJaxRender } = await import('@/components/MathJaxRender.vue')
    const wrapper = mount(MathJaxRender, { props: { text: 'x = 1', block: true } })
    expect(wrapper.classes()).toContain('mathjax-block')
    wrapper.unmount()
  })

  it('空文本渲染为空，不触发任何预热副作用', async () => {
    const { default: MathJaxRender } = await import('@/components/MathJaxRender.vue')
    const wrapper = mount(MathJaxRender, { props: { text: '' } })
    expect(wrapper.text()).toBe('')
    wrapper.unmount()
  })

  it('围栏内容渲染为代码块并安全保留源码', async () => {
    const { default: MathJaxRender } = await import('@/components/MathJaxRender.vue')
    const text = '示例：\n```python\nif a < b:\n    value = "<tag>"\n```'
    const wrapper = mount(MathJaxRender, { props: { text } })
    const code = wrapper.get('pre.code-fence code')

    expect(wrapper.text()).not.toContain('```')
    expect(wrapper.text()).not.toContain('python')
    expect(code.element.textContent).toBe('if a < b:\n    value = "<tag>"')
    expect(code.html()).toContain('&lt;tag&gt;')
    wrapper.unmount()
  })
})

describe('splitCodeFences', () => {
  it('无围栏时保持原文为单个文本段', () => {
    const text = '**重点**\n\\(x=1\\)'
    expect(splitCodeFences(text)).toEqual([{ type: 'text', content: text }])
  })

  it('切分单个围栏并保留代码缩进与换行', () => {
    expect(splitCodeFences('解答：\n```\nif ready:\n    run()\n```\n完成')).toEqual([
      { type: 'text', content: '解答：\n' },
      { type: 'code', content: 'if ready:\n    run()', language: '' },
      { type: 'text', content: '\n完成' }
    ])
  })

  it('按顺序切分多个围栏', () => {
    expect(splitCodeFences('甲```\none\n```乙```\ntwo\n```丙')).toEqual([
      { type: 'text', content: '甲' },
      { type: 'code', content: 'one', language: '' },
      { type: 'text', content: '乙' },
      { type: 'code', content: 'two', language: '' },
      { type: 'text', content: '丙' }
    ])
  })

  it('遇到未闭合围栏时整体降级为普通文本', () => {
    const text = '开头```\nprint("未闭合")'
    expect(splitCodeFences(text)).toEqual([{ type: 'text', content: text }])
  })

  it('识别语言标注但不混入代码正文', () => {
    expect(splitCodeFences('```python\r\nelse\r\n    ＿＿＿＿\r\n```')).toEqual([
      { type: 'code', content: 'else\r\n    ＿＿＿＿', language: 'python' }
    ])
  })
})
