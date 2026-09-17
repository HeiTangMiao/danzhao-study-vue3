// @vitest-environment jsdom
/**
 * 结构型区块（steps / summary）测试（阶段 5 结构扩充 P1）
 * 职责：
 *  - steps：序号由渲染层按顺序生成、标题与说明真的渲染、脏数据不炸
 *  - summary：三段按需出现、默认标题、空段不渲染
 *  - 两者的语义校验与 CI 共用同一份 validateBlock（避免「schema 放行、渲染空白」）
 * 说明：仓库默认 environment 是 node，需要 DOM 的文件用 docblock 单独切 jsdom。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import BlockRenderer from '@/components/BlockRenderer.vue'
import { createBlockValidator } from '@/utils/validateBlock'
import { warmKatex } from '@/composables/useKatex'

// KaTeX 是异步预热的（阶段 7.1）：正常导航路径下路由守卫已提前加载完，
// 这里等价地把引擎预热好，否则公式断言会落在「纯文本兜底」上。
await warmKatex()

const schema = JSON.parse(readFileSync(join(process.cwd(), 'schema', 'content-schema.json'), 'utf-8'))
const validateBlock = createBlockValidator(schema)

describe('steps 步骤条渲染', () => {
  it('序号按顺序自动生成，标题与说明都渲染出来', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'steps',
          title: '解题通法',
          items: [
            { title: '审题', content: '先看清条件与所求' },
            { title: '建模', content: '把文字译成集合语言' },
            { title: '作答' }
          ]
        }
      }
    })
    expect(wrapper.text()).toContain('解题通法')
    expect(wrapper.findAll('.steps .step')).toHaveLength(3)
    expect(wrapper.findAll('.step-num').map((n) => n.text())).toEqual(['1', '2', '3'])
    expect(wrapper.text()).toContain('先看清条件与所求')
    expect(wrapper.text()).toContain('作答')
    // 没有 content 的步骤不渲染说明行
    expect(wrapper.findAll('.step-content')).toHaveLength(2)
  })

  it('items 缺省或混入脏项时不报错，序号仍连续', () => {
    const empty = mount(BlockRenderer, { props: { block: { type: 'steps' } } })
    expect(empty.findAll('.step')).toHaveLength(0)

    const dirty = mount(BlockRenderer, {
      props: { block: { type: 'steps', items: [null, { title: '第二步' }] } }
    })
    expect(dirty.findAll('.step-num').map((n) => n.text())).toEqual(['1', '2'])
  })

  it('步骤里的公式经 MathJaxRender 渲染（KaTeX 节点出现）', () => {
    const wrapper = mount(BlockRenderer, {
      props: { block: { type: 'steps', items: [{ title: '代入', content: '\\(x=1\\)' }] } }
    })
    expect(wrapper.find('.step-content .katex').exists()).toBe(true)
  })
})

describe('summary 速记卡渲染', () => {
  it('默认标题为「一页速记」，三段按顺序渲染', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'summary',
          points: ['集合元素具有确定性'],
          formulas: ['A \\cap B'],
          mustKnow: ['空集是任何集合的子集']
        }
      }
    })
    expect(wrapper.find('.block-title').text()).toBe('一页速记')
    const labels = wrapper.findAll('.summary-label').map((l) => l.text())
    expect(labels).toEqual(['速记要点', '必背公式', '必记结论'])
    expect(wrapper.text()).toContain('集合元素具有确定性')
    expect(wrapper.text()).toContain('空集是任何集合的子集')
    // 公式按块级渲染（mathjax-block）
    expect(wrapper.find('.summary-formula .katex').exists()).toBe(true)
  })

  it('只给 points 时，公式与必记两段不出现（不渲染空标签）', () => {
    const wrapper = mount(BlockRenderer, {
      props: { block: { type: 'summary', points: ['只有要点'] } }
    })
    expect(wrapper.findAll('.summary-label').map((l) => l.text())).toEqual(['速记要点'])
  })

  it('空字符串与脏值被过滤，不产生空行', () => {
    const wrapper = mount(BlockRenderer, {
      props: { block: { type: 'summary', points: ['  ', '有效要点', null] } }
    })
    expect(wrapper.findAll('.summary-item')).toHaveLength(1)
    expect(wrapper.text()).toContain('有效要点')
  })
})

describe('steps / summary 语义校验', () => {
  it('合法的 steps 与 summary 通过', () => {
    expect(validateBlock({ type: 'steps', items: [{ title: '第一步' }, { title: '第二步', content: '说明' }] })).toEqual([])
    expect(validateBlock({ type: 'summary', points: ['要点'] })).toEqual([])
    expect(validateBlock({ type: 'summary', formulas: ['x=1'] })).toEqual([])
    expect(validateBlock({ type: 'summary', mustKnow: ['必记'] })).toEqual([])
  })

  it('steps 缺 items / 空标题 / 空 content 都报错', () => {
    expect(validateBlock({ type: 'steps' })).toContain('步骤区块缺少 items')
    expect(validateBlock({ type: 'steps', items: [] })).toContain('步骤区块缺少 items')
    expect(validateBlock({ type: 'steps', items: [{ title: '  ' }] })).toContain('步骤[0] title 为空')
    expect(validateBlock({ type: 'steps', items: ['不是对象'] })).toContain('步骤[0] 不是对象')
    expect(validateBlock({ type: 'steps', items: [{ title: '甲', content: '' }] }))
      .toContain('步骤[0] content 为空（如需省略请删掉该字段）')
  })

  it('summary 三段全空报错，字段非数组或含空元素也报错', () => {
    expect(validateBlock({ type: 'summary' })).toContain('速记区块 points / formulas / mustKnow 至少一项非空')
    expect(validateBlock({ type: 'summary', points: [] })).toContain('速记区块 points / formulas / mustKnow 至少一项非空')
    expect(validateBlock({ type: 'summary', points: '不是数组' })).toContain('速记区块 points 应为数组')
    expect(validateBlock({ type: 'summary', points: ['要点', ''] })).toContain('速记区块 points 存在空元素')
  })
})