// @vitest-environment jsdom
/**
 * 批 S5 · QA 独立对抗验证 —— C 组：**stale 回退语义** + **加载时机契约**
 *
 * 独立手段（不复用工程师的断言写法）：
 *   - 工程师的加载时机测试把 `@/stores/studyDb` 换成**恒返回 null 的空实现**，
 *     于是「缓存」这条分支在组件层**从未被真正走过**（只有直连远程被验证）。
 *     本文件用**可编排的假 store**（能返回任意 version 的缓存条目）走通
 *     「缓存命中 / 缓存陈旧 / 无缓存」三态在**组件层**的表现。
 *   - 两层终点差异（搜索置 error 态 vs 题库抛错）用**同一组假 store** 分别驱动两个客户端，
 *     直接比对终点，而不是各测各的。
 *
 * 覆盖攻击面：②（stale 回退：两层终点不同）⑧（加载时机：预取只拉 search-meta.json 1 次）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SearchPanel from '@/components/SearchPanel.vue'
import {
  loadSearchMeta, loadSearchBody, resetSearchClient,
  SEARCH_META_KEY, sanitizeMetaList, sanitizeBodyShard
} from '@/utils/searchClient'
import {
  loadSubjectBank, resetPracticeClient, bankShardKey, sanitizeBankShard
} from '@/utils/practiceBankClient'
import { META_FILE, bodyShardPath } from '@/content/searchIndex'
import { CONTENT_META_KEY } from '@/content/contentManifest'

/**
 * 可编排的假 store
 * @param {{localVersion?: number|null, cache?: object, failWrite?: boolean, failRead?: boolean}} o
 */
function fakeDb({ localVersion = 3, cache = {}, failWrite = false, failRead = false } = {}) {
  const calls = { reads: [], writes: [], meta: [] }
  return {
    calls,
    cache,
    getContentMeta: vi.fn(async () => (localVersion == null ? null : { key: CONTENT_META_KEY, contentVersion: localVersion })),
    getContentCache: vi.fn(async (key) => {
      calls.reads.push(key)
      if (failRead) throw new Error('IDB broken')
      return cache[key] || null
    }),
    saveContentCache: vi.fn(async (entry) => {
      calls.writes.push(entry.key)
      if (failWrite) throw new Error('QuotaExceededError')
      cache[entry.key] = entry
    }),
    saveContentMeta: vi.fn(async (r) => { calls.meta.push(r) })
  }
}

/** 把 fetch 换成按后缀路由的替身，返回调用记录数组 */
function stubFetch(routes) {
  const calls = []
  globalThis.fetch = vi.fn(async (url) => {
    calls.push(String(url))
    for (const [suffix, handler] of Object.entries(routes)) {
      if (String(url).endsWith(suffix)) return handler()
    }
    return { ok: false, status: 404, json: async () => ({}) }
  })
  return calls
}

const jsonOk = (obj) => () => ({ ok: true, status: 200, json: async () => obj })
const boom = () => { throw new TypeError('Failed to fetch') }

// ── 用 vi.hoisted 持有「每个用例可换」的假 store：vi.mock 是文件级的 ──
const h = vi.hoisted(() => ({ db: null, throwOnStore: false }))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

vi.mock('@/stores/studyDb', () => ({
  useStudyDbStore: () => {
    if (h.throwOnStore) throw new Error('no active pinia')
    return h.db
  }
}))

const META = [
  { subject: 'math', unitNum: '01', fileIndex: 0, unitTitle: '集合与逻辑', title: '集合的概念', subtitle: '' },
  { subject: 'math', unitNum: '02', fileIndex: 0, unitTitle: '不等式', title: '一元二次不等式', subtitle: '' }
]
const NEW_META = [{ subject: 'math', unitNum: '09', fileIndex: 0, unitTitle: '新单元', title: '新的标题', subtitle: '' }]
const BODIES = { '01/0': '集合元素的确定性互异性无序性', '02/0': '一元二次不等式的解法步骤' }

const BANK_ITEM = (k, q) => ({ k, s: 'math', u: '01', ut: '集合与逻辑', fi: 0, fk: 'math/01-集合与逻辑/01.js', ft: '页', bt: '区块', q, o: ['A', 'B'], ci: 0, a: 'A', d: '易', it: 'single', g: true, sr: 'quiz' })
const BANK_OLD = [BANK_ITEM('01/0/0/0', '过时题')]

beforeEach(() => {
  setActivePinia(createPinia())
  resetSearchClient()
  resetPracticeClient()
  h.db = fakeDb({ localVersion: 3, cache: {} })
  h.throwOnStore = false
  localStorage.setItem('current_subject', 'math')
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C1 · stale 回退：**搜索层**终点 = 缓存 / error 态', () => {
  it('缓存够新 + 远程挂了 → 返回缓存，且**一次网络都不发**', async () => {
    h.db = fakeDb({ localVersion: 3, cache: { [SEARCH_META_KEY]: { key: SEARCH_META_KEY, version: 3, payload: META } } })
    const calls = stubFetch({ 'search-meta.json': boom })
    await expect(loadSearchMeta()).resolves.toEqual(META)
    expect(calls).toEqual([])
  })

  it('★ 缓存陈旧 + 远程挂了 → 退回陈旧缓存（旧的 > 没有）', async () => {
    h.db = fakeDb({
      localVersion: 5,
      cache: { [SEARCH_META_KEY]: { key: SEARCH_META_KEY, version: 3, payload: META } }
    })
    const calls = stubFetch({ 'search-meta.json': boom })
    await expect(loadSearchMeta()).resolves.toEqual(META)
    expect(calls.length, '陈旧时必须真的去试一次远程').toBe(1)
  })

  it('★ 缓存陈旧 + 远程可达 → 用新的，并把新版本写进缓存', async () => {
    h.db = fakeDb({
      localVersion: 5,
      cache: { [SEARCH_META_KEY]: { key: SEARCH_META_KEY, version: 3, payload: META } }
    })
    stubFetch({ 'search-meta.json': jsonOk(NEW_META) })
    await expect(loadSearchMeta()).resolves.toEqual(NEW_META)
    expect(h.db.calls.writes).toContain(SEARCH_META_KEY)
    expect(h.db.cache[SEARCH_META_KEY].version).toBe(5)
  })

  it('★ 无缓存 + 远程挂了 → **抛错**（由 SearchPanel 置 error 态，不静默）', async () => {
    h.db = fakeDb({ localVersion: 3, cache: {} })
    stubFetch({ 'search-meta.json': boom })
    await expect(loadSearchMeta()).rejects.toThrow('Failed to fetch')
  })

  it('★ 组件层：无缓存 + 远程挂了 → metaState = error，且渲染出错误态', async () => {
    h.db = fakeDb({ localVersion: 3, cache: {} })
    stubFetch({ 'search-meta.json': boom })
    const wrapper = mount(SearchPanel)
    const input = wrapper.find('input')
    await input.trigger('focus') // open = true
    await input.setValue('集合') // 200ms 后 focused = true → 错误态才可见
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(wrapper.text()).toContain('搜索索引加载失败')
    wrapper.unmount()
  })
})

describe('C2 · stale 回退：**题库层**终点 = 抛错（与搜索层不对称，是刻意设计）', () => {
  it('★ 题库：缓存陈旧 + 远程挂了 → 也退回陈旧缓存（S5 新契约，旧行为是一失败就抛）', async () => {
    h.db = fakeDb({
      localVersion: 5,
      cache: { [bankShardKey('math')]: { key: bankShardKey('math'), version: 3, payload: BANK_OLD } }
    })
    stubFetch({ 'practice-bank/math.json': boom })
    await expect(loadSubjectBank('math')).resolves.toEqual(BANK_OLD)
  })

  it('★ 题库：无缓存 + 远程挂了 → **抛错**（空题库会让人以为是自己选错条件）', async () => {
    h.db = fakeDb({ localVersion: 3, cache: {} })
    stubFetch({ 'practice-bank/math.json': boom })
    await expect(loadSubjectBank('math')).rejects.toThrow('Failed to fetch')
  })

  it('★ 题库：产物形状坏（不是数组）→ 抛「形状不合法」而不是返回空库', async () => {
    h.db = fakeDb({ localVersion: 3, cache: {} })
    stubFetch({ 'practice-bank/math.json': jsonOk({ nope: 1 }) })
    await expect(loadSubjectBank('math')).rejects.toThrow(/形状不合法/)
  })

  it('★ 对照：搜索层遇到同样坏形状 → **不抛**，退化为空（该学科只剩标题级检索）', async () => {
    h.db = fakeDb({ localVersion: 3, cache: {} })
    stubFetch({ 'search-body/math.json': jsonOk({ nope: 1 }) })
    await expect(loadSearchBody('math')).resolves.toEqual({})
  })

  it('★ 题库：分片非空但**所有条目都坏** → 也必须抛「形状不合法」，不得静默返回空库', async () => {
    // 这一条专门盯住「全被丢弃」的分支（S5-4 契约 3）：
    // 若只保留 Array.isArray 那道闸而丢掉 kept.length 判定，这里会静默返回 []，
    // 上层会当成「该范围真的没题」，用户以为是自己筛选条件选错了。
    const allBad = [
      { ...BANK_ITEM('01/0/0/0', '缺题干'), q: '' },
      { ...BANK_ITEM('01/0/0/1', '缺坐标'), k: '' }
    ]
    h.db = fakeDb({ localVersion: 3, cache: {} })
    stubFetch({ 'practice-bank/math.json': jsonOk(allBad) })
    await expect(loadSubjectBank('math')).rejects.toThrow(/形状不合法/)
  })

  it('★ 两层终点确实不同：同「无缓存 + 远程失败」输入，两个客户端一个抛、一个抛（但语义不同）—— 断言题库抛、搜索抛，且搜索可被面板兜住', async () => {
    h.db = fakeDb({ localVersion: 3, cache: {} })
    stubFetch({ 'practice-bank/math.json': boom, 'search-meta.json': boom })
    await expect(loadSubjectBank('math')).rejects.toThrow()
    await expect(loadSearchMeta()).rejects.toThrow()
    // 区别在**调用方**：题库 practice store 把错抛给视图；搜索面板 catch 后置 error 态。
    // 这里断言面板确实 catch 住了（不产生 unhandled rejection）。
    const wrapper = mount(SearchPanel)
    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('集合')
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(wrapper.text()).toContain('搜索索引加载失败')
    wrapper.unmount()
  })
})

describe('C3 · 加载时机契约（组件层，重走工程师未覆盖的「有缓存」分支）', () => {
  it('★ 挂载瞬间零请求', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    const calls = stubFetch({})
    const wrapper = mount(SearchPanel)
    expect(calls).toEqual([])
    wrapper.unmount()
  })

  it('★ 预取只拉 search-meta.json，恰好 1 次，且不含正文分片', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    const calls = stubFetch({ 'search-meta.json': jsonOk(META), 'search-body/math.json': jsonOk(BODIES) })
    const wrapper = mount(SearchPanel)
    await vi.advanceTimersByTimeAsync(1500)
    await flushPromises()
    expect(calls.length, `预取请求数应为 1，实际：${calls.join(' | ')}`).toBe(1)
    expect(calls[0]).toBe(`./${META_FILE}`)
    expect(calls.some((u) => u.includes('search-body'))).toBe(false)
    wrapper.unmount()
  })

  it('★ 查询词 1 字 → 不拉正文；≥2 字 → 只拉**当前学科**分片', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    const calls = stubFetch({ 'search-meta.json': jsonOk(META), 'search-body/math.json': jsonOk(BODIES) })
    const wrapper = mount(SearchPanel)
    await vi.advanceTimersByTimeAsync(1500)
    await flushPromises()
    const afterPrefetch = calls.length

    const input = wrapper.find('input')
    await input.setValue('集')
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(calls.length, '1 个字不该触发正文拉取').toBe(afterPrefetch)

    await input.setValue('集合')
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(calls.length).toBe(afterPrefetch + 1)
    expect(calls[calls.length - 1]).toBe(`./${bodyShardPath('math')}`)
    wrapper.unmount()
  })

  it('★ 切到别的学科 → 只拉新学科分片（不重拉旧学科）', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    const calls = stubFetch({
      'search-meta.json': jsonOk(META),
      'search-body/math.json': jsonOk(BODIES),
      'search-body/chinese.json': jsonOk({ '01/0': '语文正文' })
    })
    const wrapper = mount(SearchPanel)
    await vi.advanceTimersByTimeAsync(1500)
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('集合')
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(calls.filter((u) => u.includes('search-body/math'))).toHaveLength(1)

    localStorage.setItem('current_subject', 'chinese')
    await input.setValue('语文')
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(calls.filter((u) => u.includes('search-body/chinese'))).toHaveLength(1)
    expect(calls.filter((u) => u.includes('search-body/math')), '旧学科分片不该被重拉').toHaveLength(1)
    wrapper.unmount()
  })

  it('★ 有缓存时预取**零网络**，但 UI 仍就绪（缓存命中不等于白屏）', async () => {
    h.db = fakeDb({ localVersion: 3, cache: { [SEARCH_META_KEY]: { key: SEARCH_META_KEY, version: 3, payload: META } } })
    vi.stubGlobal('requestIdleCallback', undefined)
    const calls = stubFetch({ 'search-meta.json': jsonOk(NEW_META), 'search-body/math.json': jsonOk(BODIES) })
    const wrapper = mount(SearchPanel)
    await vi.advanceTimersByTimeAsync(1500)
    await flushPromises()
    expect(calls, '缓存命中时不该发请求').toEqual([])

    // 输入触发 debounced → focused=true，正文分片按当前学科拉取
    await wrapper.find('input').trigger('focus') // open = true，结果区才会渲染
    await wrapper.find('input').setValue('集合')
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    // meta 来自缓存（META），不是远程 NEW_META → 应命中「集合的概念」而非「新的标题」
    expect(wrapper.text()).toContain('集合的概念')
    expect(wrapper.text(), '远程那份不该被用到（缓存优先）').not.toContain('新的标题')
    wrapper.unmount()
  })
})

describe('C3b · 存储不可用（Pinia 未激活）时组件仍可用 —— 红线 2 的组件级证明', () => {
  it('★ useStudyDbStore 抛错 + fetch 正常 → 搜索结果照常出现，不进 error 态', async () => {
    h.throwOnStore = true
    h.db = null
    stubFetch({ 'search-meta.json': jsonOk(META), 'search-body/math.json': jsonOk(BODIES) })
    const wrapper = mount(SearchPanel)
    await wrapper.find('input').trigger('focus')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()
    await wrapper.find('input').setValue('互异性')
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(wrapper.text()).not.toContain('索引加载失败')
    wrapper.unmount()
  })
})

describe('C4 · 坏条丢弃粒度（搜索 = bodyKeyOf / 题库 = practiceKeyOf）', () => {
  it('搜索正文：坏键 / 非字符串 / 空串只丢该页，好页照常', () => {
    const shard = { '01/0': '好的正文', 'bad-key': 'x', '02/0': 123, '03/0': '   ' }
    expect(sanitizeBodyShard(shard)).toEqual({ '01/0': '好的正文' })
  })

  it('搜索 meta：缺 subject / unitNum / fileIndex / title 的条目被丢', () => {
    const list = [
      { subject: 'math', unitNum: '01', fileIndex: 0, title: '好的' },
      { subject: '', unitNum: '01', fileIndex: 0, title: '缺学科' },
      { subject: 'math', unitNum: '', fileIndex: 0, title: '缺单元' },
      { subject: 'math', unitNum: '02', fileIndex: 'x', title: '坏下标' },
      { subject: 'math', unitNum: '03', fileIndex: 0, title: '' }
    ]
    expect(sanitizeMetaList(list)).toEqual([list[0]])
  })

  it('★ 题库：单题缺 q → 该题被丢，同分片其它题照常（组卷只少一个候选）', () => {
    const list = [BANK_ITEM('01/0/0/0', '好题'), { ...BANK_ITEM('01/0/0/1', '坏题'), q: '' }, BANK_ITEM('01/0/0/2', '另一题')]
    const kept = sanitizeBankShard(list)
    expect(kept.map((i) => i.question)).toEqual(['好题', '另一题'])
  })

  it('★ 题库：缺 kp → 回落 fk，kp 覆盖率不破 100%', () => {
    const raw = { ...BANK_ITEM('01/0/0/0', '题'), kp: undefined }
    const kept = sanitizeBankShard([raw])
    expect(kept[0].kp).toBe(raw.fk)
    expect(kept[0].kp).not.toBe('')
  })
})
