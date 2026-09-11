// @vitest-environment jsdom
/**
 * 容器型区块（columns / group）递归渲染测试（阶段 4 版式层）
 * 职责：
 *  - BlockRenderer 对 columns 渲染出列结构，且子区块（knowledge / quiz 等）真的渲染出来
 *  - BlockRenderer 对 group 渲染出分组结构，子区块也渲染出来
 *  - 嵌套容器（容器套容器）能递归渲染，不产生循环依赖问题
 * 说明：仓库默认 environment 是 node，这里用文件级 docblock 单独切 jsdom（与 block-form 一致）。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BlockRenderer from '@/components/BlockRenderer.vue'

describe('columns 容器递归渲染', () => {
  it('渲染出两列，且子区块真的出现', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'columns',
          cols: 2,
          items: [
            [{ type: 'knowledge', title: '左列知识点', paragraphs: ['左列内容'] }],
            [{ type: 'formula', title: '右列公式', formulas: ['x = 1'] }]
          ]
        }
      }
    })
    const cols = wrapper.findAll('.columns-grid__col')
    expect(cols).toHaveLength(2)
    // 子区块标题渲染出来了
    expect(wrapper.text()).toContain('左列知识点')
    expect(wrapper.text()).toContain('右列公式')
    expect(wrapper.text()).toContain('左列内容')
  })

  it('列数缺省时兜底为两列，缺列补空列不报错', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'columns',
          items: [[{ type: 'knowledge', title: '仅左列', paragraphs: ['x'] }]]
        }
      }
    })
    expect(wrapper.findAll('.columns-grid__col')).toHaveLength(2)
    expect(wrapper.text()).toContain('仅左列')
  })
})

describe('group 容器递归渲染', () => {
  it('band 变体渲染分组带，子区块出现', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'group',
          variant: 'band',
          title: '核心概念',
          items: [
            { type: 'knowledge', title: '概念一', paragraphs: ['内容一'] },
            { type: 'warning', text: '注意这里' }
          ]
        }
      }
    })
    expect(wrapper.text()).toContain('核心概念')
    expect(wrapper.text()).toContain('概念一')
    expect(wrapper.text()).toContain('内容一')
    expect(wrapper.text()).toContain('注意这里')
  })

  it('collapse 变体默认展开，点击可折叠', async () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'group',
          variant: 'collapse',
          title: '可折叠组',
          collapsed: true,
          items: [{ type: 'knowledge', title: '子知识点', paragraphs: ['折叠内容'] }]
        }
      }
    })
    // 初始折叠：v-show 置 display:none（jsdom 下 isVisible 不可靠，直接查 style）
    expect(wrapper.find('.group-body').element.style.display).toBe('none')
    // 点击标题展开
    await wrapper.find('.group-head--toggle').trigger('click')
    expect(wrapper.find('.group-body').element.style.display).toBe('')
    expect(wrapper.text()).toContain('子知识点')
  })
})

describe('嵌套容器递归渲染', () => {
  it('group 内嵌 columns、columns 内嵌 group 都能递归渲染', () => {
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'group',
          variant: 'band',
          title: '外层组',
          items: [
            {
              type: 'columns',
              cols: 2,
              items: [
                [{ type: 'knowledge', title: '左子', paragraphs: ['左'] }],
                [{ type: 'group', variant: 'band', title: '内层组', items: [{ type: 'tip', text: '内层提示' }] }]
              ]
            }
          ]
        }
      }
    })
    expect(wrapper.text()).toContain('外层组')
    expect(wrapper.text()).toContain('左子')
    expect(wrapper.text()).toContain('内层组')
    expect(wrapper.text()).toContain('内层提示')
  })
})
