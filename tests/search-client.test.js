// @vitest-environment jsdom
/**
 * 搜索客户端远程化（批 S5 · S5-3）
 *
 * 覆盖（逐条对应任务卡 S5-3 测试要求）：
 *  ① 缓存命中 → **零 fetch**
 *  ② 缓存未命中 → fetch 成功 → 写缓存 → 二次调用命中缓存（仍零 fetch）
 *  ③ 远程失败 + 有缓存 → 返回缓存（**新契约**；旧行为是 error 态）
 *  ④ 读时闸门：缓存 version 落后于本地已见版本 → 视为未命中（R-3 不静默陈旧）
 *  ⑤ 坏条丢弃：meta / body 各自粒度，坏条不影响同片其它条目
 *  ⑥ QUESTION_MARKER 被抹掉 → splitBody 退化为「无题干段」且**不抛**
 *
 * ⚠️ fake-indexeddb + mock fetch，不读盘产物。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import {
  loadSearchMeta, loadSearchBody, sanitizeMetaList, sanitizeBodyShard,
  SEARCH_META_KEY, searchBodyKey, resetSearchClient
} from '@/utils/searchClient'
import { matchSearch, prepareSearchIndex } from '@/utils/search'
import { QUESTION_MARKER } from '@/content/searchIndex'
import { useStudyDbStore } from '@/stores/studyDb'
import { CONTENT_META_KEY } from '@/content/contentManifest'

const META = [
  { subject: 'math', unitNum: '01', fileIndex: 0, unitTitle: '集合与逻辑', title: '集合的概念', subtitle: '三特性' },
  { subject: 'math', unitNum: '02', fileIndex: 0, unitTitle: '不等式', title: '一元二次不等式', subtitle: '' }
]
const BODIES = { '01/0': '集合元素的确定性互异性无序性', '02/0': '一元二次不等式的解法步骤' }

const ORIGINAL_FETCH = globalThis.fetch

/** 按 URL 后缀路由的 fetch 替身 */
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
const boom = () => { throw new TypeError('Failed to fetch') }
const fetchCount = () => globalThis.fetch.mock.calls.length

beforeEach(async () => {
  setActivePinia(createPinia())
  // ⚠️ searchClient 的进程内二级缓存是模块级 Map，同文件跨用例持久 → 必须显式清
  resetSearchClient()
  const db = useStudyDbStore()
  await db.init()
  await db.clearContentCache()
  await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: null, contentHash: null, units: {}, pendingUnits: [] })
})
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

describe('① 缓存命中 → 零 fetch', () => {
  it('content_cache 已有该键且版本够新 → 一次网络都不发', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    await db.saveContentCache({ key: SEARCH_META_KEY, version: 3, payload: META })
    mockFetch({})
    expect(await loadSearchMeta()).toEqual(META)
    expect(fetchCount()).toBe(0)
  })
})

describe('② 缓存未命中 → 拉远程 → 写缓存 → 二次命中', () => {
  it('首次拉取并落缓存（带本地已见版本），二次调用零 fetch', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    mockFetch({ 'search-meta.json': jsonOk(META), 'search-body/math.json': jsonOk(BODIES) })

    expect(await loadSearchMeta()).toEqual(META)
    expect(fetchCount()).toBe(1)

    const row = await db.getContentCache(SEARCH_META_KEY)
    expect(row.version).toBe(3) // 版本号来自本地已见版本（读时闸门的判据）

    expect(await loadSearchMeta()).toEqual(META)
    expect(fetchCount()).toBe(1) // 二次命中缓存，零新增请求
  })

  it('不知道本地代次（content_meta 空）→ 仍能拉，但**不写缓存**（无版本号无法过闸门）', async () => {
    const db = useStudyDbStore()
    mockFetch({ 'search-meta.json': jsonOk(META) })
    expect(await loadSearchMeta()).toEqual(META)
    expect(await db.getContentCache(SEARCH_META_KEY)).toBeNull()
    expect(fetchCount()).toBe(1)
  })
})

describe('③ 远程失败 + 有缓存 → 返回缓存（新契约）', () => {
  it('缓存够新时远程失败根本不影响（缓存优先）', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    await db.saveContentCache({ key: SEARCH_META_KEY, version: 3, payload: META })
    mockFetch({ 'search-meta.json': boom })
    expect(await loadSearchMeta()).toEqual(META)
    expect(fetchCount()).toBe(0)
  })

  it('缓存陈旧 + 远程失败 → 退回陈旧缓存（旧的好过没有）', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 4, units: {} })
    await db.saveContentCache({ key: SEARCH_META_KEY, version: 2, payload: META })
    mockFetch({ 'search-meta.json': boom })
    expect(await loadSearchMeta()).toEqual(META)
    expect(fetchCount()).toBe(1) // 确实尝试过远程
  })

  it('既无缓存、远程又失败 → 抛错（由 SearchPanel 置 error 态）', async () => {
    mockFetch({ 'search-meta.json': boom })
    await expect(loadSearchMeta()).rejects.toThrow(TypeError)
  })
})

describe('④ 读时闸门（P-S53 / R-3：不静默陈旧）', () => {
  it('缓存 version < 本地已见版本 → 视为未命中，重新拉远程', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 4, units: {} })
    await db.saveContentCache({ key: SEARCH_META_KEY, version: 2, payload: [{ ...META[0], title: '旧标题' }] })
    mockFetch({ 'search-meta.json': jsonOk(META) })

    const got = await loadSearchMeta()
    expect(got).toEqual(META) // 拿到新的，不是旧的
    expect(fetchCount()).toBe(1)
    expect((await db.getContentCache(SEARCH_META_KEY)).version).toBe(4)
  })
})

describe('⑤ 坏条丢弃（粒度 = 各自条目键）', () => {
  it('meta：缺坐标 / 缺标题的条目被丢，好条目照常', () => {
    const cleaned = sanitizeMetaList([
      META[0],
      { subject: 'math', unitNum: '03', fileIndex: 0 }, // 缺 title
      { subject: 'math', title: '无坐标' }, // 缺 unitNum/fileIndex
      null,
      'x',
      META[1]
    ])
    expect(cleaned).toEqual([META[0], META[1]])
  })

  it('body：键形态不对 / 值非字符串 / 空串 → 只丢该页', () => {
    const cleaned = sanitizeBodyShard({
      '01/0': BODIES['01/0'],
      '02/0': null, // 值坏
      'xx': '键形态不对',
      '03/abc': '下标非数字',
      '': '空键',
      '04/1': '   ' // 空串
    })
    expect(Object.keys(cleaned)).toEqual(['01/0'])
  })

  it('非对象 / 数组 → 返回空（不抛，该学科退化为标题级检索）', () => {
    expect(sanitizeBodyShard(null)).toEqual({})
    expect(sanitizeBodyShard([])).toEqual({})
    expect(sanitizeBodyShard('x')).toEqual({})
  })
})

describe('⑥ QUESTION_MARKER 分段不被破坏', () => {
  it('marker 被抹掉的坏分片 → splitBody 退化为「无题干段」且不抛', () => {
    const bodies = { '01/0': '集合元素的确定性互异性无序性' } // 无 marker
    const hits = matchSearch(prepareSearchIndex(META, bodies), '互异性', { bodies })
    expect(hits).toHaveLength(1)
    expect(hits[0].matchedQuestion).toBe(false) // 不标「题目」，但不崩
  })

  it('带 marker 的正文 → 题干段命中仍标「题目」', () => {
    const bodies = { '01/0': `页面正文 ${QUESTION_MARKER} 题干：互异性是集合的三特性之一` }
    const hits = matchSearch(prepareSearchIndex(META, bodies), '互异性', { bodies })
    expect(hits[0].matchedQuestion).toBe(true)
  })

  it('远程 body 分片按学科按需拉（不为远程化改成启动全量）', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    mockFetch({ 'search-body/math.json': jsonOk(BODIES) })
    expect(await loadSearchBody('math')).toEqual(BODIES)
    const urls = globalThis.fetch.mock.calls.map((c) => String(c[0]))
    expect(urls).toEqual(['./search-body/math.json']) // 只拉当前学科
    expect(await db.getContentCache(searchBodyKey('math'))).toMatchObject({ key: 'search:math', version: 3 })
  })
})

describe('缓存键前缀隔离（P-S52 / R-10）', () => {
  it('键形如 search:meta / search:{subject}，与内容层 unitKey 不撞', () => {
    expect(SEARCH_META_KEY).toBe('search:meta')
    expect(searchBodyKey('math')).toBe('search:math')
    expect(SEARCH_META_KEY.startsWith('search:')).toBe(true)
  })
})

describe('基址派生（S5-6：Tauri 绝对模式取 origin，不拼 API_BASE）', () => {
  it('客户端从 assetBase 导入 siteRoot，且不自己拼 API_BASE', () => {
    const src = readFileSync(join(process.cwd(), 'src/utils/searchClient.js'), 'utf-8')
    expect(src).toContain("from '@/utils/assetBase'")
    expect(src).not.toMatch(/API_BASE\s*\+/)
  })

  it('相对模式（dev / Web）请求 URL 为 ./search-meta.json（同源，CSP connect-src self 覆盖）', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    mockFetch({ 'search-meta.json': jsonOk(META) })
    await loadSearchMeta()
    expect(globalThis.fetch.mock.calls[0][0]).toBe('./search-meta.json')
  })
})
