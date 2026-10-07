// @vitest-environment jsdom
/**
 * 区块同步 / 异步取舍的契约测试（阶段 7.3）
 *
 * 背景：异步化能省主 chunk，但不是免费的 —— 低频大块才值得，高频小块异步化只会
 *      在首屏加一次往返与占位闪烁，带交互状态的（quiz / example）还会丢状态。
 *
 * 职责（两个方向都要守，否则「不要贪」这条纪律会慢慢被磨掉）：
 *  - 异步组（exam / diagram）确实是异步组件，源码里不得再静态 import 它们
 *  - 同步组（knowledge / quiz / example …）挂载瞬间就能渲染出内容，不得被顺手异步化
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineAsyncComponent } from 'vue'
import BlockRenderer from '@/components/BlockRenderer.vue'
import { componentOf } from '@/components/blocks/registry'
import { warmKatex } from '@/composables/useKatex'

await warmKatex()

const ROOT = process.cwd()
const REGISTRY_SRC = readFileSync(join(ROOT, 'src', 'components', 'blocks', 'registry.js'), 'utf-8')

/** 异步组：低频大块，各自独立 chunk */
const ASYNC_TYPES = ['exam', 'diagram']
/** 同步白名单：覆盖页数多，或带交互状态（异步重挂载会丢状态） */
const SYNC_TYPES = ['knowledge', 'objectives', 'formula', 'table', 'tip', 'warning', 'quiz', 'example', 'mindmap']

describe('registry 的异步取舍', () => {
  it('异步组都用 asyncBlock 包装，且没有静态 import', () => {
    for (const type of ASYNC_TYPES) {
      expect(REGISTRY_SRC, `${type} 应通过 asyncBlock 动态加载`).toMatch(
        new RegExp(`${type}: asyncBlock\\(\\(\\) => import\\('\\./`)
      )
    }
    for (const name of ['ExamBlock', 'GeometryBlock']) {
      expect(REGISTRY_SRC, `${name} 不得再静态 import`).not.toMatch(new RegExp(`^import ${name} from`, 'm'))
    }
  })

  it('异步组确实被包成了异步组件，同步组不是', () => {
    // 对照组：defineAsyncComponent 的产物带 __asyncLoader（Vue 用来挂 loader 的字段）
    expect('__asyncLoader' in defineAsyncComponent(() => Promise.resolve({}))).toBe(true)

    for (const type of ASYNC_TYPES) {
      const comp = componentOf(type)
      expect(comp, `${type} 未绑定组件`).toBeTruthy()
      expect('__asyncLoader' in comp, `${type} 应是异步组件`).toBe(true)
    }
    for (const type of SYNC_TYPES) {
      const comp = componentOf(type)
      expect(comp, `${type} 未绑定组件`).toBeTruthy()
      expect('__asyncLoader' in comp, `${type} 不应被异步化`).toBe(false)
    }
  })

  it('每个类型都有绑定（异步组也不例外）', () => {
    for (const type of [...ASYNC_TYPES, ...SYNC_TYPES]) {
      expect(componentOf(type), `${type} 未绑定组件`).toBeTruthy()
    }
  })
})

describe('渲染行为：异步 vs 同步', () => {
  const pinia = createPinia()

  it('exam 是异步的：挂载瞬间还看不到内容，加载完成后渲染出来', async () => {
    const wrapper = mount(BlockRenderer, {
      props: { block: { type: 'exam', title: '模拟卷测试', items: [{ question: 'q', answer: 'a' }] } },
      global: { plugins: [pinia] }
    })
    // 同步时刻：异步 chunk 还没到
    expect(wrapper.text()).not.toContain('开始考试')
    // 等它加载完（150ms 的占位延迟不影响内容渲染，只影响占位是否出现）
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('开始考试')
    }, { timeout: 5000 })
    expect(wrapper.text()).toContain('模拟卷测试')
    wrapper.unmount()
  })

  it('knowledge / quiz 是同步的：挂载瞬间内容就在，不需要等', () => {
    const knowledge = mount(BlockRenderer, {
      props: { block: { type: 'knowledge', title: '知识点', paragraphs: ['正文'] } },
      global: { plugins: [pinia] }
    })
    expect(knowledge.text()).toContain('正文')
    knowledge.unmount()

    const quiz = mount(BlockRenderer, {
      props: { block: { type: 'quiz', items: [{ question: '题干', answer: '答案' }] } },
      global: { plugins: [pinia] }
    })
    expect(quiz.text()).toContain('题干')
    quiz.unmount()
  })
})

describe('mermaid 的 CLS：图例 / 工具栏提前占位（阶段 7.3）', () => {
  const pageSrc = readFileSync(join(ROOT, 'src', 'components', 'blocks', 'MindMapBlock.vue'), 'utf-8')

  it('图例与工具栏不再用 v-if="ready" 控制（否则渲染完成会把下方内容顶下去）', () => {
    // 它们是插在**固定高度**视口上方的两行：v-if 到 ready 才插入 = 必然位移
    expect(pageSrc).not.toMatch(/v-if="state === 'ready'" class="mm-(legend|toolbar)"/)
    expect(pageSrc).toMatch(/class="mm-legend" :class="\{ 'mm-pending'/)
    expect(pageSrc).toMatch(/class="mm-toolbar" :class="\{ 'mm-pending'/)
    // 占位样式必须真的隐藏内容（不是留白也不显示）
    expect(pageSrc).toMatch(/\.mm-pending \{ visibility: hidden; \}/)
  })

  it('视口仍是固定高度（占位→SVG 不改变页面总高度，无需 min-height）', () => {
    // 计划里「给 .mindmap-viewport 加 min-height: 320px」经实测不必要：它本来就是固定 460px
    const viewportRule = pageSrc.match(/\.mindmap-viewport \{[^}]*\}/)?.[0] || ''
    expect(viewportRule).toMatch(/height: 460px/)
  })
})