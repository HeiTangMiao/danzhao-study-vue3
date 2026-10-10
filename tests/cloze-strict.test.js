// @vitest-environment jsdom
/**
 * cloze 句级 strict 开关测试（批 D D-0，P0-8 判分红线）
 *
 * 背景：全局通假表 CLOZE_VARIANTS 把「反→返」当等价组，会让红线句「辗转反侧」里
 *      用户写的「返」被折成「反」而误判对。strict 是**句级**开关：true → 该句禁用
 *      全局通假映射，只按正解 + 本句 alts 比对。
 *
 * 覆盖（batch-d-tasks D-0 测试要点 ①–⑦）：
 *  - ① strict 生效：strict 句输入通假变体判错（红线修复）
 *  - ② 回归锚（无 strict = 既有行为）：同句输入通假变体仍判对（防后人整体关掉通假表）
 *  - ③ strict 仍认 alts：strict 只关通假表，内容侧显式等价写法仍生效
 *  - ④ schema 白名单：clozeItem.strict.type === 'boolean'
 *  - ⑤ validator 语义：非布尔 strict 报 human-readable 错；strict:true 零报错
 *  - ⑥ 既有键回归：CLOZE_VARIANTS['反'] === '返'（红线不得靠删键解决）
 *  - ⑦ reveal 模式不受影响：strict 字段被忽略，点击揭晓行为不变
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import ClozeBlock from '@/components/blocks/ClozeBlock.vue'
import { createBlockValidator } from '@/utils/validateBlock'
import { CLOZE_VARIANTS } from '@/content/clozeVariants'

const schema = JSON.parse(readFileSync(join(process.cwd(), 'schema', 'content-schema.json'), 'utf-8'))
const validateBlock = createBlockValidator(schema)

function mountCloze(block, context) {
  return mount(ClozeBlock, { props: { block, context: context || {} } })
}

// 「辗转反侧」红线句：正解「反」，全局表会把它与「返」认作等价
const RED_LINE = '辗转{{反}}侧，寤寐思服。'

describe('D-0 句级 strict 判分支', () => {
  it('① strict 生效：strict 句输入通假变体「返」→ 判错（红线修复）', async () => {
    const wrapper = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [{ text: RED_LINE, strict: true }]
    })
    await wrapper.find('.cloze-input').setValue('返')
    await wrapper.find('.cloze-btn--primary').trigger('click')
    expect(wrapper.find('.cloze-input').classes()).toContain('is-wrong')
    expect(wrapper.text()).toContain('0/1 空正确')
  })

  it('② 回归锚（无 strict = 既有行为）：同句输入「返」仍判对（不得整体关掉通假表）', async () => {
    const wrapper = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [{ text: RED_LINE }]
    })
    await wrapper.find('.cloze-input').setValue('返')
    await wrapper.find('.cloze-btn--primary').trigger('click')
    expect(wrapper.find('.cloze-input').classes()).toContain('is-correct')
  })

  it('③ strict 仍认 alts：strict 句输入内容侧声明的等价写法判对，通假变体仍判错', async () => {
    // 「覆」= 内容侧显式声明的等价写法（走 alts）；「返」= 全局通假变体（strict 句应禁）
    const correct = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [{ text: RED_LINE, strict: true, alts: ['覆'] }]
    })
    await correct.find('.cloze-input').setValue('覆')
    await correct.find('.cloze-btn--primary').trigger('click')
    expect(correct.find('.cloze-input').classes()).toContain('is-correct')

    const wrong = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [{ text: RED_LINE, strict: true, alts: ['覆'] }]
    })
    await wrong.find('.cloze-input').setValue('返')
    await wrong.find('.cloze-btn--primary').trigger('click')
    expect(wrong.find('.cloze-input').classes()).toContain('is-wrong')
  })

  it('strict 是句级而非块级：同块仅一句 strict，其余句照常应用通假映射', async () => {
    // 第一句 strict（禁通假）→「返」判错；第二句正常（应用通假）→「悦」对「说」判对
    const wrapper = mountCloze({
      type: 'cloze',
      mode: 'input',
      items: [
        { text: RED_LINE, strict: true }, // 正解「反」，禁通假
        { text: '不亦{{说}}乎。' } // 正解「说」，应用通假：悦↔说
      ]
    })
    const inputs = wrapper.findAll('.cloze-input')
    await inputs[0].setValue('返') // strict 句：通假变体应判错
    await inputs[1].setValue('悦') // 非 strict 句：通假变体应判对
    await wrapper.find('.cloze-btn--primary').trigger('click')

    const after = wrapper.findAll('.cloze-input')
    expect(after[0].classes()).toContain('is-wrong')
    expect(after[1].classes()).toContain('is-correct')
  })

  it('⑦ reveal 模式（mode 缺省）忽略 strict：空位仍可点击揭晓', async () => {
    const wrapper = mountCloze({
      type: 'cloze',
      title: '名句默写',
      items: [{ text: RED_LINE, strict: true }]
    })
    expect(wrapper.findAll('.cloze-input')).toHaveLength(0)
    // strict:true 不得让 reveal 模式变成输入模式；答案默认隐藏
    expect(wrapper.text()).not.toContain('反侧')
    const blank = wrapper.find('.cloze-blank')
    await blank.trigger('click')
    expect(wrapper.find('.cloze-blank').text()).toBe('反')
  })
})

describe('D-0 schema / 语义校验', () => {
  it('④ schema 白名单：definitions.clozeItem.properties.strict.type === "boolean"', () => {
    expect(schema.definitions.clozeItem.properties.strict.type).toBe('boolean')
  })

  it('⑤ validator 语义：非布尔 strict 报错（防字符串 "true" 误传），布尔零报错', () => {
    const bad = validateBlock({ type: 'cloze', items: [{ text: '{{甲}}', strict: 'yes' }] })
    expect(bad.join('\n')).toContain('strict 应为布尔')
    // 数字 truthy 同样拦下
    expect(
      validateBlock({ type: 'cloze', items: [{ text: '{{甲}}', strict: 1 }] }).join('\n')
    ).toContain('strict 应为布尔')
    // 合法布尔（true / false）+ 缺省都零报错
    expect(validateBlock({ type: 'cloze', items: [{ text: '{{甲}}', strict: true }] })).toEqual([])
    expect(validateBlock({ type: 'cloze', items: [{ text: '{{甲}}', strict: false }] })).toEqual([])
    expect(validateBlock({ type: 'cloze', items: [{ text: '{{甲}}' }] })).toEqual([])
  })

  it('⑥ 既有键回归：全局通假表「反→返」仍在（红线不得靠删键解决）', () => {
    expect(CLOZE_VARIANTS['反']).toBe('返')
    expect(CLOZE_VARIANTS['说']).toBe('悦')
    expect(CLOZE_VARIANTS['惠']).toBe('慧')
  })
})
