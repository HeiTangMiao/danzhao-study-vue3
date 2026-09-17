// @vitest-environment jsdom
/**
 * 结构型区块（code / cloze）测试（阶段 5 结构扩充 P3）
 * 职责：
 *  - code：等宽渲染、语言角标、复制按钮（成功与失败两条反馈路径）
 *  - cloze：{{答案}} 解析成空位、点击揭晓、多个空位互不影响
 *  - 两者的语义校验与 CI 共用同一份 validateBlock
 * 说明：仓库默认 environment 是 node，需要 DOM 的文件用 docblock 单独切 jsdom。
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { flushPromises, mount } from '@vue/test-utils'
import BlockRenderer from '@/components/BlockRenderer.vue'
import { createBlockValidator } from '@/utils/validateBlock'

const schema = JSON.parse(readFileSync(join(process.cwd(), 'schema', 'content-schema.json'), 'utf-8'))
const validateBlock = createBlockValidator(schema)

/** 覆盖 navigator.clipboard（jsdom 默认没有），传 undefined 表示模拟「不可用」 */
function stubClipboard(impl) {
  Object.defineProperty(navigator, 'clipboard', { value: impl, configurable: true })
}

describe('code 代码块渲染', () => {
  it('等宽显示代码，语言角标与复制按钮都在', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'code',
          title: 'RIPv2 配置命令',
          lang: 'cmd',
          code: 'RA(config)# router rip\nRA(config-router)# version 2'
        }
      }
    })
    expect(wrapper.text()).toContain('RIPv2 配置命令')
    expect(wrapper.find('.code-lang').text()).toBe('cmd')
    expect(wrapper.find('.code-pre code').text()).toContain('RA(config)# router rip')
    expect(wrapper.find('.code-copy').exists()).toBe(true)
  })

  it('不写 lang 时不渲染角标', () => {
    const wrapper = mount(BlockRenderer, {
      props: { block: { type: 'code', code: 'print(1)' } }
    })
    expect(wrapper.find('.code-lang').exists()).toBe(false)
  })

  it('复制成功：调用剪贴板并给出「已复制」反馈', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard({ writeText })
    const wrapper = mount(BlockRenderer, {
      props: { block: { type: 'code', code: 'print("hi")' } }
    })
    expect(wrapper.find('.code-copy').text()).toBe('复制')
    await wrapper.find('.code-copy').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('print("hi")')
    expect(wrapper.find('.code-copy').text()).toBe('已复制')
    wrapper.unmount()
  })

  it('剪贴板不可用（无 API 且无 execCommand）时给出「复制失败」而不是静默', async () => {
    stubClipboard(undefined)
    const wrapper = mount(BlockRenderer, {
      props: { block: { type: 'code', code: 'print(1)' } }
    })
    await wrapper.find('.code-copy').trigger('click')
    await flushPromises()
    expect(wrapper.find('.code-copy').text()).toBe('复制失败')
    wrapper.unmount()
  })
})

describe('cloze 挖空默写渲染', () => {
  it('普通文字直接显示，答案默认隐藏，点击后揭晓', async () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'cloze',
          title: '名句默写',
          items: [{ text: '海内存知己，{{天涯若比邻}}。（王勃）' }]
        }
      }
    })
    expect(wrapper.text()).toContain('海内存知己')
    expect(wrapper.text()).toContain('（王勃）')
    // 未点击前答案不出现在 DOM 里
    expect(wrapper.text()).not.toContain('天涯若比邻')
    const blank = wrapper.find('.cloze-blank')
    expect(blank.classes()).not.toContain('is-revealed')

    await blank.trigger('click')
    expect(wrapper.find('.cloze-blank').text()).toBe('天涯若比邻')
    expect(wrapper.find('.cloze-blank').classes()).toContain('is-revealed')

    // 再点一次收起
    await wrapper.find('.cloze-blank').trigger('click')
    expect(wrapper.text()).not.toContain('天涯若比邻')
  })

  it('同一句里的多个空位互不影响，各点各的', async () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: { type: 'cloze', items: [{ text: '{{会当凌绝顶}}，{{一览众山小}}。' }] }
      }
    })
    const blanks = wrapper.findAll('.cloze-blank')
    expect(blanks).toHaveLength(2)
    await blanks[1].trigger('click')
    const after = wrapper.findAll('.cloze-blank')
    expect(after[0].text()).toBe('')
    expect(after[1].text()).toBe('一览众山小')
  })

  it('items 缺省或混入脏项时不报错', () => {
    const empty = mount(BlockRenderer, { props: { block: { type: 'cloze' } } })
    expect(empty.findAll('.cloze-item')).toHaveLength(0)

    const dirty = mount(BlockRenderer, {
      props: { block: { type: 'cloze', items: [null, { text: '{{答案}}' }] } }
    })
    expect(dirty.findAll('.cloze-item')).toHaveLength(1)
  })
})

describe('code / cloze 语义校验', () => {
  it('合法的 code 与 cloze 通过', () => {
    expect(validateBlock({ type: 'code', lang: 'python', code: 'print(1)' })).toEqual([])
    expect(validateBlock({ type: 'code', code: 'print(1)' })).toEqual([])
    expect(validateBlock({ type: 'cloze', items: [{ text: '海内存知己，{{天涯若比邻}}。' }] })).toEqual([])
  })

  it('code 为空 / 内容里夹带围栏 / lang 给空串都报错', () => {
    expect(validateBlock({ type: 'code' })).toContain('代码区块 code 为空')
    expect(validateBlock({ type: 'code', code: '```\nprint(1)\n```' }).join('\n'))
      .toContain('代码区块 code 里不要再写 ``` 围栏')
    expect(validateBlock({ type: 'code', code: 'print(1)', lang: '' }).join('\n'))
      .toContain('代码区块 lang 为空（如需省略请删掉该字段）')
  })

  it('cloze 缺 items / 空 text / 标记不配对 / 没有标记 / 空挖空都报错', () => {
    expect(validateBlock({ type: 'cloze' })).toContain('挖空区块缺少 items')
    expect(validateBlock({ type: 'cloze', items: [{ text: '  ' }] }).join('\n')).toContain('挖空[0] text 为空')
    expect(validateBlock({ type: 'cloze', items: [{ text: '海内存知己，{{天涯若比邻。' }] }).join('\n'))
      .toContain('挖空[0] {{ }} 标记不配对')
    expect(validateBlock({ type: 'cloze', items: [{ text: '没有空位的一句话。' }] }).join('\n'))
      .toContain('挖空[0] 没有 {{答案}} 标记')
    expect(validateBlock({ type: 'cloze', items: [{ text: '海内存知己，{{}}。' }] }).join('\n'))
      .toContain('挖空[0] 存在空挖空 {{}}')
  })
})