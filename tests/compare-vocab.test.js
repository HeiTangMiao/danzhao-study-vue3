// @vitest-environment jsdom
/**
 * 结构型区块（compare / vocab）测试（阶段 5 结构扩充 P2）
 * 职责：
 *  - compare：两侧名称、每个维度一行、窄屏格内名称、脏数据不炸
 *  - vocab：术语 / 读音 / 释义 / 例 / 注 按需出现
 *  - 两者的语义校验与 CI 共用同一份 validateBlock
 * 说明：仓库默认 environment 是 node，需要 DOM 的文件用 docblock 单独切 jsdom。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import BlockRenderer from '@/components/BlockRenderer.vue'
import { createBlockValidator } from '@/utils/validateBlock'

const schema = JSON.parse(readFileSync(join(process.cwd(), 'schema', 'content-schema.json'), 'utf-8'))
const validateBlock = createBlockValidator(schema)

describe('compare 双栏对照渲染', () => {
  it('两侧名称与每个维度都渲染出来', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'compare',
          title: '表示方法对照',
          left: '列举法',
          right: '描述法',
          aspects: [
            { label: '适用场景', left: '元素个数有限且不多', right: '元素有共同特征时' },
            { label: '优缺点', left: '直观，但元素多时写不完', right: '简洁通用，但不够直观' }
          ]
        }
      }
    })
    expect(wrapper.text()).toContain('表示方法对照')
    // 表头 + 2 个维度行
    expect(wrapper.findAll('.compare-row')).toHaveLength(3)
    expect(wrapper.findAll('.compare-label').map((l) => l.text())).toEqual(['', '适用场景', '优缺点'])
    expect(wrapper.text()).toContain('元素个数有限且不多')
    expect(wrapper.text()).toContain('简洁通用，但不够直观')
  })

  it('每个格子带窄屏用的名称（两侧都能对上号）', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'compare',
          left: '借代',
          right: '借喻',
          aspects: [{ label: '本体', left: '出现', right: '不出现' }]
        }
      }
    })
    const whos = wrapper.findAll('.compare-who').map((w) => w.text())
    expect(whos).toEqual(['借代', '借喻'])
  })

  it('缺少 aspects 或混入脏项时只渲染表头，不报错', () => {
    const empty = mount(BlockRenderer, {
      props: { block: { type: 'compare', left: '栈', right: '队列' } }
    })
    expect(empty.findAll('.compare-row')).toHaveLength(1) // 只剩表头
    expect(empty.text()).toContain('栈')

    const dirty = mount(BlockRenderer, {
      props: { block: { type: 'compare', left: '栈', right: '队列', aspects: [null, '不是对象'] } }
    })
    expect(dirty.findAll('.compare-row')).toHaveLength(1)
  })

  it('两侧说法里的公式经 MathJaxRender 渲染', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'compare',
          left: '数集',
          right: '点集',
          aspects: [{ label: '记号', left: '\\(\\{x \\mid \\cdots\\}\\)', right: '\\(\\{(x,y) \\mid \\cdots\\}\\)' }]
        }
      }
    })
    expect(wrapper.findAll('.compare-cell .katex').length).toBe(2)
  })
})

describe('vocab 术语卡渲染', () => {
  it('术语 / 读音 / 释义 / 例 / 注 都渲染出来', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'vocab',
          title: '文言实词',
          items: [
            {
              term: '爱',
              pinyin: 'ài',
              meaning: '吝惜、舍不得',
              example: '百姓皆以王为爱也',
              note: '与「喜爱」区分，考试常考'
            }
          ]
        }
      }
    })
    expect(wrapper.findAll('.vocab-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('文言实词')
    expect(wrapper.text()).toContain('ài')
    expect(wrapper.text()).toContain('吝惜、舍不得')
    expect(wrapper.text()).toContain('百姓皆以王为爱也')
    expect(wrapper.findAll('.vocab-tag').map((t) => t.text())).toEqual(['例', '注'])
  })

  it('只给 term 与 meaning 时，读音与「例 / 注」行都不出现', () => {
    const wrapper = mount(BlockRenderer, {
      props: { block: { type: 'vocab', items: [{ term: '栈', meaning: '后进先出的线性表' }] } }
    })
    expect(wrapper.find('.vocab-pinyin').exists()).toBe(false)
    expect(wrapper.findAll('.vocab-line')).toHaveLength(0)
    expect(wrapper.text()).toContain('后进先出的线性表')
  })

  it('items 缺省或混入脏项时不报错', () => {
    const empty = mount(BlockRenderer, { props: { block: { type: 'vocab' } } })
    expect(empty.findAll('.vocab-card')).toHaveLength(0)

    const dirty = mount(BlockRenderer, {
      props: { block: { type: 'vocab', items: [null, { term: '队列', meaning: '先进先出' }] } }
    })
    expect(dirty.findAll('.vocab-card')).toHaveLength(1)
  })
})

describe('compare / vocab 语义校验', () => {
  it('合法的 compare 与 vocab 通过', () => {
    expect(validateBlock({
      type: 'compare',
      left: '栈',
      right: '队列',
      aspects: [{ label: '进出顺序', left: '后进先出', right: '先进先出' }]
    })).toEqual([])
    expect(validateBlock({ type: 'vocab', items: [{ term: '借代', meaning: '借相关事物代本体' }] })).toEqual([])
  })

  it('compare 缺名称 / 缺维度 / 维度字段为空都报错', () => {
    expect(validateBlock({ type: 'compare' }).join('\n')).toContain('对比区块 left 为空')
    const errors = validateBlock({
      type: 'compare',
      left: '借代',
      right: '借喻',
      aspects: [{ label: '', left: '出现', right: '不出现' }]
    })
    expect(errors.join('\n')).toContain('对比维度[0] label 为空')
    expect(validateBlock({ type: 'compare', left: '借代', right: '借喻' }).join('\n'))
      .toContain('对比区块缺少 aspects（对照维度）')
    expect(validateBlock({ type: 'compare', left: '借代', right: '借喻', aspects: [] }).join('\n'))
      .toContain('对比区块缺少 aspects（对照维度）')
    expect(validateBlock({ type: 'compare', left: '借代', right: '借喻', aspects: ['脏项'] }).join('\n'))
      .toContain('对比维度[0] 不是对象')
  })

  it('vocab 缺 items / term / meaning 报错，可选字段给空串也报错', () => {
    expect(validateBlock({ type: 'vocab' }).join('\n')).toContain('术语卡区块缺少 items')
    expect(validateBlock({ type: 'vocab', items: [{ term: '  ', meaning: '释义' }] }).join('\n'))
      .toContain('术语[0] term 为空')
    expect(validateBlock({ type: 'vocab', items: [{ term: '借代' }] }).join('\n'))
      .toContain('术语[0] meaning 为空')
    expect(validateBlock({ type: 'vocab', items: [{ term: '借代', meaning: '释义', note: '' }] }).join('\n'))
      .toContain('术语[0] note 为空（如需省略请删掉该字段）')
  })
})