// @vitest-environment jsdom
/**
 * cloze 输入模式测试（批 B B-3）
 * 覆盖（batch-b-tasks B-3 测试要点 ①–⑦）：
 *  - ① reveal 行为回归（mode 缺省：无 input 元素、点击揭晓与改造前一致）
 *  - ② 主答案 + alts 并集判对
 *  - ③ 提交逐空比对（含全角变体 / 通假变体）
 *  - ④ retryAll / retryWrongSentences 状态机（对句冻结、错句清空）
 *  - ⑤ reveal 兼容（不出现任何 input / 操作条）
 *  - ⑥ validateBlock：alts 空串 / alts 含 {{}} / mode 非法 / mode:'input' 合法
 *  - ⑦ schema 语义关卡：mode:'typo' 被校验器拦下（CI 同一条 createBlockValidator 路径）
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import ClozeBlock from '@/components/blocks/ClozeBlock.vue'
import { createBlockValidator } from '@/utils/validateBlock'

const schema = JSON.parse(readFileSync(join(process.cwd(), 'schema', 'content-schema.json'), 'utf-8'))
const validateBlock = createBlockValidator(schema)

function mountCloze(block, context) {
  return mount(ClozeBlock, { props: { block, context: context || {} } })
}

describe('cloze 输入模式（B-3）', () => {
  it('① ⑤ mode 缺省 = reveal：无 input / 操作条，空位点击揭晓（与改造前一致）', async () => {
    const wrapper = mountCloze({
      type: 'cloze',
      title: '名句默写',
      items: [{ text: '海内存知己，{{天涯若比邻}}。（王勃）' }]
    })
    expect(wrapper.findAll('.cloze-input')).toHaveLength(0)
    expect(wrapper.find('.cloze-actions').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('天涯若比邻')

    const blank = wrapper.find('.cloze-blank')
    expect(blank.exists()).toBe(true)
    await blank.trigger('click')
    expect(wrapper.find('.cloze-blank').text()).toBe('天涯若比邻')
    await wrapper.find('.cloze-blank').trigger('click')
    expect(wrapper.text()).not.toContain('天涯若比邻')
  })

  it('② 输入模式渲染：空位变输入框，操作条三按钮俱在', () => {
    const wrapper = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [{ text: '{{会当凌绝顶}}，{{一览众山小}}。' }]
    })
    expect(wrapper.findAll('.cloze-input')).toHaveLength(2)
    expect(wrapper.findAll('.cloze-blank')).toHaveLength(0)
    expect(wrapper.find('.cloze-btn--primary').text()).toBe('提交')
    expect(wrapper.text()).toContain('全部重默')
    expect(wrapper.text()).toContain('只看错的那句')
  })

  it('① 移动端约定（F2/F3）：input 模式容器挂 data-no-swipe，reveal 模式不挂', () => {
    const input = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [{ text: '{{会当凌绝顶}}，{{一览众山小}}。' }]
    })
    expect(input.find('.cloze-list').attributes('data-no-swipe')).toBeDefined()
    const reveal = mountCloze({
      type: 'cloze',
      title: '名句默写',
      items: [{ text: '海内存知己，{{天涯若比邻}}。' }]
    })
    expect(reveal.find('.cloze-list').attributes('data-no-swipe')).toBeUndefined()
  })

  it('② blankAnswerOf 并集：alts 与主答案同权判对', async () => {
    const wrapper = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [{ text: '《静夜思》：{{床前明月光}}。', alts: ['床前看月光'] }]
    })
    const input = wrapper.find('.cloze-input')
    await input.setValue('床前看月光') // 命中 alts
    await wrapper.find('.cloze-btn--primary').trigger('click')
    expect(wrapper.find('.cloze-input').classes()).toContain('is-correct')
  })

  it('③ 提交逐空比对：3 句 5 空，2 空命中（含全角变体 + 通假变体），其余判错', async () => {
    const wrapper = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [
        { text: '{{不亦说乎}}，不亦乐乎。' }, // 通假：主答案「说」，用户写「悦」应判对
        { text: 'π ≈ {{3.14}}。' }, // 全角变体：用户写「３．１４」应判对
        { text: '{{海内存知己}}，天涯若比邻。' }
      ]
    })
    const inputs = wrapper.findAll('.cloze-input')
    expect(inputs).toHaveLength(3)
    await inputs[0].setValue('不亦悦乎') // 通假变体命中
    await inputs[1].setValue('３．１４') // 全角变体命中
    await inputs[2].setValue('答错了的句子') // 错

    await wrapper.find('.cloze-btn--primary').trigger('click')

    const after = wrapper.findAll('.cloze-input')
    expect(after[0].classes()).toContain('is-correct')
    expect(after[1].classes()).toContain('is-correct')
    expect(after[2].classes()).toContain('is-wrong')
    expect(wrapper.text()).toContain('2/3 空正确')
    // 句粒度：全对句冻结（disabled），含错句可编辑
    expect(after[0].attributes('disabled')).toBeDefined()
    expect(after[2].attributes('disabled')).toBeUndefined()
  })

  it('④ 全部重默：清空全部输入与判定；只看错的那句：清错句、冻结对句', async () => {
    const wrapper = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [
        { text: '{{正确的句子}}。' },
        { text: '{{写错了的句子}}。' },
        { text: '{{也没答对}}。' }
      ]
    })
    let inputs = wrapper.findAll('.cloze-input')
    await inputs[0].setValue('正确的句子')
    await inputs[1].setValue('错的')
    await inputs[2].setValue('错的')
    await wrapper.find('.cloze-btn--primary').trigger('click')

    // —— 只看错的那句：对句冻结保留、错句清空 ——
    await wrapper.findAll('.cloze-btn')[2].trigger('click') // 只看错的那句
    inputs = wrapper.findAll('.cloze-input')
    expect(inputs[0].element.value).toBe('正确的句子') // 对句保留
    expect(inputs[0].classes()).toContain('is-correct')
    expect(inputs[0].attributes('disabled')).toBeDefined()
    expect(inputs[1].element.value).toBe('') // 错句清空
    expect(inputs[1].classes()).not.toContain('is-wrong')
    expect(inputs[1].attributes('disabled')).toBeUndefined()

    // —— 全部重默：全部清空、解冻 ——
    await wrapper.findAll('.cloze-btn')[1].trigger('click') // 全部重默
    inputs = wrapper.findAll('.cloze-input')
    for (const el of inputs) {
      expect(el.element.value).toBe('')
      expect(el.attributes('disabled')).toBeUndefined()
    }
    expect(wrapper.text()).not.toContain('空正确')
  })

  it('③ 空输入判错（不误判对）：未填写的空位提交后为 is-wrong', async () => {
    const wrapper = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [{ text: '{{有答案}}。' }]
    })
    await wrapper.find('.cloze-btn--primary').trigger('click') // 不输入直接提交
    expect(wrapper.find('.cloze-input').classes()).toContain('is-wrong')
  })
})

describe('cloze schema / 语义校验（B-3 ⑥⑦）', () => {
  it('⑥ mode:\'input\' 合法；alts 正常合法', () => {
    expect(
      validateBlock({
        type: 'cloze',
        mode: 'input',
        items: [{ text: '{{天涯若比邻}}。', alts: ['天涯邻比若'] }]
      })
    ).toEqual([])
    // reveal 缺省同样合法（存量兼容）
    expect(validateBlock({ type: 'cloze', items: [{ text: '{{x}}' }] })).toEqual([])
  })

  it('⑥ alts 为空串 / 含 {{}} / 非数组 都报错', () => {
    expect(
      validateBlock({ type: 'cloze', items: [{ text: '{{x}}', alts: [''] }] }).join('\n')
    ).toContain('alts[0] 为空串')
    expect(
      validateBlock({ type: 'cloze', items: [{ text: '{{x}}', alts: ['{{y}}'] }] }).join('\n')
    ).toContain('不能包含 {{ }} 挖空标记')
    expect(
      validateBlock({ type: 'cloze', items: [{ text: '{{x}}', alts: 'not-array' }] }).join('\n')
    ).toContain('alts 应为数组')
  })

  it('⑦ mode 非法值被拦下（CI 关卡路径 = createBlockValidator，与 validate:content 同一份规则）', () => {
    const errs = validateBlock({ type: 'cloze', mode: 'typo', items: [{ text: '{{x}}' }] })
    expect(errs.join('\n')).toContain('mode 仅支持 reveal / input')
  })

  it('schema 定义本身包含白名单（clozeBlock.mode 枚举 + clozeItem.alts 类型）', () => {
    const clozeEntry = schema.definitions.block.allOf.find(
      (e) => e.if?.properties?.type?.const === 'cloze'
    )
    expect(clozeEntry.then.properties.mode.enum).toEqual(['reveal', 'input'])
    expect(schema.definitions.clozeItem.properties.alts.type).toBe('array')
  })
})
