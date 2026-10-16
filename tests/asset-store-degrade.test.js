// @vitest-environment jsdom
/**
 * 存储不可用时读路径的降级（批 S5 收尾 · 必修 2 的回归锚）
 *
 * 背景：`tests/search-question-badge.test.js` 曾红 —— SearchPanel 的数据源改走
 * `searchClient` 后，读路径上多了一次 `useStudyDbStore()`；该用例只 mock 了 vue-router，
 * 组件树里没有 active Pinia，于是「取 store」这一步直接把整条搜索链路打掉。
 *
 * 修法**刻意不在测试侧补 store mock**（那只是把实现缺陷藏进 fixture，换个调用点还会再红一次），
 * 而是让实现层可降级：`safeDb()` 取不到 store 返回 null，读路径退化为「直连远程」——
 * 缓存是加速器，不是数据源，存储用不了不该让功能失效。
 *
 * 故本文件**不建 Pinia**，用真实的「取不到 store」场景做证：
 *  A. assetClient 三个原语对「db 为 null / 写入抛错」的处理
 *  B. 搜索：无 Pinia + fetch 正常 → 结果照常出现（组件级回归）
 *  C. 题库：无 Pinia + fetch 正常 → 题照常取到（单元级回归）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SearchPanel from '@/components/SearchPanel.vue'
import { META_FILE, bodyShardPath } from '@/content/searchIndex'
import { practiceShardPath } from '@/content/practiceBank'
import {
  safeDb, readByKey, commitAtomically, commitBestEffort
} from '@/utils/assetClient'
import { loadSearchMeta, loadSearchBody, resetSearchClient } from '@/utils/searchClient'
import { loadSubjectBank, loadBankIndex, resetPracticeClient } from '@/utils/practiceBankClient'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const META = [
  { subject: 'math', unitNum: '01', fileIndex: 0, unitTitle: '集合与逻辑', title: '集合的概念', subtitle: '三特性' },
  { subject: 'math', unitNum: '02', fileIndex: 0, unitTitle: '不等式', title: '一元二次不等式', subtitle: '' }
]
const BODIES = { '01/0': '集合元素的确定性互异性无序性', '02/0': '解法步骤 十字相乘' }
const ITEM = {
  k: '01/0/0/0', s: 'math', u: '01', ut: '集合与逻辑', fi: 0, fk: 'math_01_集合的概念',
  kp: 'math_01_集合的概念', ft: '集合的概念', bt: '快速检测',
  q: '下列各组对象中，能构成集合的是（ ）', o: ['①②③', '①②④'], ci: 0, a: '**A。**',
  d: 'basic', it: 'single', g: true, dv: false, sr: 'quiz'
}
const INDEX = { generatedAt: '2026-01-01T00:00:00.000Z', total: 1, gradableTotal: 1, subjects: { math: { count: 1 } } }

const ORIGINAL_FETCH = globalThis.fetch

function mockFetch(routes) {
  globalThis.fetch = vi.fn(async (url) => {
    const key = String(url)
    for (const [suffix, handler] of Object.entries(routes)) {
      if (key.endsWith(suffix)) return handler()
    }
    return { ok: false, status: 404, json: async () => ({}) }
  })
}
const jsonOk = (obj) => () => ({ ok: true, status: 200, json: async () => obj })

beforeEach(() => {
  resetSearchClient()
  resetPracticeClient()
})
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('A. assetClient：存储不可用 ≠ 读路径失败', () => {
  it('safeDb：取不到 store（无 active Pinia）→ 返回 null 而不抛', () => {
    expect(() => safeDb()).not.toThrow()
    expect(safeDb()).toBeNull()
  })

  it('readByKey(null, …) → 判为 miss（≡ 无缓存），不是错误', async () => {
    const r = await readByKey(null, 'search:meta', { minVersion: 3 })
    expect(r).toEqual({ entry: null, source: 'miss' })
  })

  it('commitAtomically(null, …) → 空操作，不写也不抛', async () => {
    const r = await commitAtomically(null, [{ key: 'search:meta', version: 3, payload: [] }], null)
    expect(r).toMatchObject({ written: 0, skipped: true })
  })

  it('commitBestEffort：写入抛错（配额 / 事务中断）→ 吞掉并返回 failed，不向上抛', async () => {
    const db = { saveContentCache: vi.fn(async () => { throw new Error('QuotaExceededError') }) }
    const r = await commitBestEffort(db, [{ key: 'search:meta', version: 3, payload: [1] }], null)
    expect(r).toMatchObject({ written: 0, failed: true })
  })
})

describe('B. 搜索：无 Pinia + fetch 正常 → 仍能搜到结果（组件级回归）', () => {
  it('store 抛错 + fetch 正常 → 结果照常出现，不进 error 态', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)
    mockFetch({ [META_FILE]: jsonOk(META), [bodyShardPath('math')]: jsonOk(BODIES) })
    localStorage.setItem('current_subject', 'math')

    const wrapper = mount(SearchPanel)
    await wrapper.find('input').trigger('focus')
    await flushPromises()
    await wrapper.find('input').setValue('一元二次')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()

    expect(wrapper.text()).toContain('一元二次不等式')
    expect(wrapper.text()).not.toContain('搜索索引加载失败')
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('单元级：loadSearchMeta / loadSearchBody 在无存储时也返回数据', async () => {
    mockFetch({ [META_FILE]: jsonOk(META), [bodyShardPath('math')]: jsonOk(BODIES) })
    await expect(loadSearchMeta()).resolves.toEqual(META)
    await expect(loadSearchBody('math')).resolves.toEqual(BODIES)
  })
})

describe('C. 题库：无 Pinia + fetch 正常 → 仍能取到题（单元级回归）', () => {
  it('loadSubjectBank / loadBankIndex 在无存储时也返回数据', async () => {
    mockFetch({ [practiceShardPath('math')]: jsonOk([ITEM]), 'practice-bank/index.json': jsonOk(INDEX) })
    const list = await loadSubjectBank('math')
    expect(list).toHaveLength(1)
    expect(list[0].question).toBe(ITEM.q)
    await expect(loadBankIndex()).resolves.toMatchObject({ total: 1 })
  })
})
