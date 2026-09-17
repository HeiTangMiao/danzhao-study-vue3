// @vitest-environment jsdom
/**
 * SearchPanel 两级索引加载时机测试（阶段 7.4）
 *
 * 背景：旧面板在 onMounted 就 fetch 整份 241 KB 索引，首页首屏白付一次网络；
 *      现在拆成「meta 按需 + 正文按学科分片按需」，所以**加载时机**本身就是契约：
 *  - 挂载瞬间零请求；预取只发生在 requestIdleCallback（或 1.5s 兜底）
 *  - 预取与 focus 只取 meta，正文分片必须等到查询词 ≥ 2 字
 *  - 正文分片按「当前学科」取，且命中内容真的来自正文（含 800 字符之后的尾部）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SearchPanel from '@/components/SearchPanel.vue'
import { META_FILE, bodyShardPath } from '@/content/searchIndex'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const META = [
  { subject: 'math', unitNum: '01', fileIndex: 0, unitTitle: '集合与逻辑', title: '集合的概念', subtitle: '三特性' },
  { subject: 'math', unitNum: '02', fileIndex: 0, unitTitle: '不等式', title: '一元二次不等式', subtitle: '' }
]
const TAIL = '互异性是集合最容易被忽略的考点'
// 正文前 900 字符不含检索词，把「互异性」挤到旧索引 800 字符截断线之外
const BODIES = { '01/0': '铺垫内容'.repeat(225) + TAIL, '02/0': '解法步骤 十字相乘' }

let calls = []
function stubFetch() {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      calls.push(String(url))
      if (String(url).includes(META_FILE)) return { ok: true, json: async () => META }
      if (String(url).includes(bodyShardPath('math'))) return { ok: true, json: async () => BODIES }
      return { ok: false, status: 404, json: async () => ({}) }
    })
  )
}

const hasMeta = () => calls.some((u) => u.includes(META_FILE))
const hasBody = () => calls.some((u) => u.includes('search-body'))

beforeEach(() => {
  vi.useFakeTimers()
  stubFetch()
  localStorage.setItem('current_subject', 'math')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('加载时机：挂载不加载', () => {
  it('无 requestIdleCallback 时挂载瞬间零请求，1.5s 兜底只预取 meta', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    const wrapper = mount(SearchPanel)
    expect(calls).toEqual([])

    await vi.advanceTimersByTimeAsync(1500)
    expect(hasMeta()).toBe(true)
    expect(hasBody(), '预取不得包含正文分片').toBe(false)
    expect(calls.length).toBe(1)
    wrapper.unmount()
  })

  it('有 requestIdleCallback 时走空闲回调，而不是 setTimeout 兜底', async () => {
    let idle = null
    vi.stubGlobal('requestIdleCallback', (fn) => {
      idle = fn
      return 1
    })
    vi.stubGlobal('cancelIdleCallback', () => {})
    const wrapper = mount(SearchPanel)

    await vi.advanceTimersByTimeAsync(5000)
    expect(calls, '空闲回调未触发就不该有兜底请求').toEqual([])

    idle()
    await flushPromises()
    expect(hasMeta()).toBe(true)
    wrapper.unmount()
  })

  it('focus 立即取 meta（不必等空闲）', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    const wrapper = mount(SearchPanel)
    await wrapper.find('input').trigger('focus')
    await flushPromises()
    expect(hasMeta()).toBe(true)
    expect(hasBody()).toBe(false)
    wrapper.unmount()
  })
})

describe('正文分片：按查询词长度与当前学科取', () => {
  async function mountReady() {
    vi.stubGlobal('requestIdleCallback', undefined)
    const wrapper = mount(SearchPanel)
    await wrapper.find('input').trigger('focus')
    await flushPromises()
    return wrapper
  }

  it('1 个字只按标题匹配，不拉正文分片', async () => {
    const wrapper = await mountReady()
    await wrapper.find('input').setValue('互')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(hasBody()).toBe(false)
    wrapper.unmount()
  })

  it('2 个字才按当前学科取正文分片', async () => {
    const wrapper = await mountReady()
    await wrapper.find('input').setValue('互异')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(calls.some((u) => u.includes(bodyShardPath('math')))).toBe(true)
    wrapper.unmount()
  })

  it('切换学科后按新学科取分片（当前学科取自 current_subject）', async () => {
    const wrapper = await mountReady()
    localStorage.setItem('current_subject', 'chinese')
    await wrapper.find('input').setValue('文言')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(calls.some((u) => u.includes(bodyShardPath('chinese')))).toBe(true)
    wrapper.unmount()
  })
})

describe('结果来自正文', () => {
  it('命中 800 字符之后的尾部内容，且 snippet 取自正文', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    const wrapper = mount(SearchPanel)
    await wrapper.find('input').trigger('focus')
    await flushPromises()
    await wrapper.find('input').setValue('互异性')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()

    expect(wrapper.text()).toContain('集合的概念')
    expect(wrapper.text()).toContain(TAIL)
    wrapper.unmount()
  })

  it('meta 加载失败时给出重试入口', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
    const wrapper = mount(SearchPanel)
    await wrapper.find('input').trigger('focus')
    await flushPromises()
    // 浮层要等防抖后的查询词才展开
    await wrapper.find('input').setValue('互异')
    await vi.advanceTimersByTimeAsync(250)
    expect(wrapper.text()).toContain('搜索索引加载失败')

    await wrapper.find('.search-retry').trigger('click')
    await flushPromises()
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})