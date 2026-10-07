// @vitest-environment jsdom
/**
 * 布局原语（P0）校验与渲染守卫
 *
 * 背景：P0 把 columns / group 泛化成一族「布局原语」（type:'layout' + as + props + children），
 *      允许 layout 嵌套。自由度换来两类风险必须被钉死：
 *      ① 内容写错参数（未知 as / 未知 props 键 / 取值越界）—— 要像其他区块一样被校验器拦下；
 *      ② 超深嵌套 —— 校验与渲染都是递归，异常内容可以借此构造出栈溢出式的开销。
 * 职责：
 *  - 钉死 as 白名单、props 白名单（含取值域）、children 必填、递归错误路径前缀
 *  - 钉死嵌套深度上限（边界两侧各一条：刚好合法 / 超一层即拒）
 *  - 钉死渲染分发：type:'layout' 经 LayoutRenderer 渲染，children 由 BlockRenderer 递归注入
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
// 直接读 schema JSON：原先的 @/utils/contentSchema 只是浏览器侧加载入口，
// 已随低代码编辑器一并删除（它的唯一消费者就是编辑器）。测试本就跑在 Node 下，直读即可。
import schemaJson from '../schema/content-schema.json'
import { createBlockValidator, MAX_LAYOUT_DEPTH } from '@/utils/validateBlock'
import { componentOf } from '@/components/blocks/registry'
import { warmKatex } from '@/composables/useKatex'
import BlockRenderer from '@/components/BlockRenderer.vue'

await warmKatex()

const validateBlock = createBlockValidator(schemaJson)

/**
 * 造一条指定层数的 layout 链，末端放一个合法 knowledge。
 * @param {number} depth layout 的层数（1 表示只有顶层一个 layout）
 */
function nestLayouts(depth) {
  let node = { type: 'knowledge', paragraphs: ['底'] }
  for (let i = 0; i < depth; i++) {
    node = { type: 'layout', as: 'stack', children: [node] }
  }
  return node
}

describe('layout 校验：结构与白名单', () => {
  it('合法的布局区块通过校验', () => {
    const errors = validateBlock({
      type: 'layout',
      as: 'grid',
      props: { cols: 3, gap: 'tight' },
      children: [{ type: 'knowledge', paragraphs: ['正文'] }]
    })
    expect(errors).toEqual([])
  })

  it('缺少 as 被拦下', () => {
    expect(validateBlock({ type: 'layout', children: [] }).join('\n')).toContain('缺少 as')
  })

  it('未知 as 被拦下', () => {
    expect(validateBlock({ type: 'layout', as: 'masonry', children: [] }).join('\n'))
      .toContain('未知布局原语 as: masonry')
  })

  it('缺少 children 被拦下', () => {
    expect(validateBlock({ type: 'layout', as: 'stack' }).join('\n')).toContain('缺少 children')
  })

  it('未知 props 键被拦下（白名单从 schema 派生，不手写）', () => {
    // stack 只允许 gap；cols 是 grid 的参数，写到这里属于串台
    expect(validateBlock({ type: 'layout', as: 'stack', props: { cols: 3 }, children: [] }).join('\n'))
      .toContain('布局原语 stack 不支持参数 cols')
  })

  it('props 取值越界被拦下', () => {
    expect(validateBlock({ type: 'layout', as: 'grid', props: { cols: 5 }, children: [] }).join('\n'))
      .toContain('布局原语 grid 参数 cols 取值非法: 5')
  })

  it('props 不是对象被拦下', () => {
    expect(validateBlock({ type: 'layout', as: 'grid', props: 'wide', children: [] }).join('\n'))
      .toContain('props 应为对象')
  })

  it('未给 props 时不报错（props 整体可选）', () => {
    expect(validateBlock({ type: 'layout', as: 'hero', children: [] })).toEqual([])
  })

  it('递归进入子区块，错误带子区块路径前缀', () => {
    const errors = validateBlock({
      type: 'layout',
      as: 'stack',
      children: [{ type: 'layout', as: 'grid' }]
    })
    expect(errors.join('\n')).toContain('子区块[0] 布局区块缺少 children')
  })
})

describe('layout 校验：嵌套深度上限', () => {
  it(`嵌套 ${MAX_LAYOUT_DEPTH} 层（上限内）不报深度错误`, () => {
    const errors = validateBlock(nestLayouts(MAX_LAYOUT_DEPTH))
    expect(errors.join('\n')).not.toContain('超过上限')
  })

  it(`嵌套 ${MAX_LAYOUT_DEPTH + 1} 层触发深度错误，且只报一次`, () => {
    const errors = validateBlock(nestLayouts(MAX_LAYOUT_DEPTH + 1))
    expect(errors.filter((e) => e.includes('超过上限'))).toHaveLength(1)
  })
})

describe('layout 渲染分发', () => {
  it('registry 把 layout 绑定到渲染组件', () => {
    expect(componentOf('layout')).toBeTruthy()
  })

  it('BlockRenderer 渲染 layout 原语并递归渲染 children', () => {
    const pinia = createPinia()
    const wrapper = mount(BlockRenderer, {
      props: {
        block: {
          type: 'layout',
          as: 'grid',
          props: { cols: 2 },
          children: [
            { type: 'knowledge', title: '子区块甲', paragraphs: ['甲正文'] },
            { type: 'tip', text: '乙提示' }
          ]
        }
      },
      global: { plugins: [pinia] }
    })
    expect(wrapper.find('.layout--grid').exists()).toBe(true)
    expect(wrapper.text()).toContain('甲正文')
    expect(wrapper.text()).toContain('乙提示')
    wrapper.unmount()
  })

  it('未知 as 走显式降级提示，而不是静默空白', () => {
    const wrapper = mount(BlockRenderer, {
      props: { block: { type: 'layout', as: '__不存在__', children: [] } },
      global: { plugins: [createPinia()] }
    })
    expect(wrapper.text()).toContain('未知布局原语')
    wrapper.unmount()
  })
})

describe('layout 渲染分发：schema 原语清单 ↔ 组件白名单', () => {
  // 真相源是 schema：新增第 7 个原语时本用例自动覆盖，不需要手改测试。
  // 存在的理由：若有人往 schema 加了原语却忘了在 LayoutRenderer.LAYOUT_COMPONENTS 注册组件，
  //          运行时会静默降级成「未知布局原语」，其它测试全绿 —— 这条在 CI 就把它拦下。
  const layoutKinds = schemaJson.definitions.layoutKind.enum

  it('原语清单非空（防止 schema 被改空导致下面的循环空跑）', () => {
    expect(layoutKinds.length).toBeGreaterThan(0)
  })

  it('schema 里每个原语都能渲染出对应的 .layout--<as>（缺组件即失败）', () => {
    for (const as of layoutKinds) {
      const block = {
        type: 'layout',
        as,
        children: [{ type: 'knowledge', paragraphs: ['子区块'] }]
      }
      // 先确认它是合法内容：新增原语若漏配 layoutProps 白名单，这里就报错
      expect(validateBlock(block), `原语 ${as} 应通过校验`).toEqual([])

      const wrapper = mount(BlockRenderer, {
        props: { block },
        global: { plugins: [createPinia()] }
      })
      // 组件缺失时 LayoutRenderer 会降级成「未知布局原语」占位，这里必然找不到类名
      expect(wrapper.find(`.layout--${as}`).exists(), `原语 ${as} 未渲染出 .layout--${as}`).toBe(true)
      wrapper.unmount()
    }
  })
})
