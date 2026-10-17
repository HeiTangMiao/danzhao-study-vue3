// @vitest-environment node
/**
 * 批 S4 · 独立证伪 · 攻点① 同版本自愈闸门完整性（`contentClient.js: computeRetrySet/doRefresh`）
 *
 * 本批最高风险面：自愈在**闸门之外**补拉分片。独立攻击点：
 *  A. 本地 v2 + 远程 v1（更旧）+ pending 非空 → 会不会把**更旧**内容写进来？
 *     （设计声称 buildShardEntry 的 version 比对挡住 —— 去证伪它；两条路：分片 version 等于/不等于 captured）
 *  B. 同版本 + pending + 分片可达但**结构坏** → 是否算失败 attempts++（且**不写坏数据**）
 *  C. `pendingUnits` 与 `units` 是否**同一次 put**（提交点语义）
 *  D. attempts 达上限 → 移除 + **一次性** warn（不得每次刷新刷屏）
 *  E. 兼容路径：无 `version` 字段的旧 pending 记录 → 回落是否正确
 *
 * ⚠️ 不读 `public/content-remote/`（gitignore）；fake-indexeddb 同文件跨用例持久 → beforeEach 清表。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  refreshIfNewer, getRemotePage, resetContentClient, computeRetrySet,
  CONTENT_META_KEY, PENDING_MAX_ATTEMPTS
} from '@/utils/contentClient'
import { useStudyDbStore } from '@/stores/studyDb'
import { OP, HASH_PREFIX, SCHEMA_VERSION } from '@/content/contentManifest'

const BASE = 'https://example.test/content-remote'
const H = (tag = 'a') => HASH_PREFIX + tag.repeat(64).slice(0, 64)
const ORIGINAL_FETCH = globalThis.fetch

function pageOf(unitNum, text, hashTag, fileIndex = 0) {
  return {
    subject: 'math', unitNum, fileIndex, fileKey: `math_${unitNum}_p${fileIndex}`,
    op: OP.UPSERT, blocks: [{ type: 'text', text }], hash: H(hashTag)
  }
}
function shardOf(unitNum, version, text, hashTag, pagesOverride) {
  return {
    unitKey: `math/${unitNum}`, contentVersion: version,
    pages: pagesOverride ?? [pageOf(unitNum, text, hashTag)]
  }
}
function manifestOf(version, spec) {
  const units = {}
  for (const [unitNum, tag] of Object.entries(spec)) {
    units[`math/${unitNum}`] = { hash: H(tag), version, path: `math/${unitNum}.json`, count: 1, updatedAt: 'x' }
  }
  return { schemaVersion: SCHEMA_VERSION, contentVersion: version, contentHash: H('m'), generatedAt: 'x', units }
}
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

/** 预置 meta（含 pendingUnits）与一条已缓存的旧内容，模拟「本地已到 v2、某片待自愈」 */
async function seed({ contentVersion, unitsSpec, pendingUnits, cachePages }) {
  const db = useStudyDbStore()
  await db.init()
  await db.saveContentMeta({
    key: CONTENT_META_KEY,
    contentVersion,
    contentHash: H('m'),
    units: unitsSpec,
    pendingUnits
  })
  for (const [unitKey, pages] of Object.entries(cachePages || {})) {
    await db.saveContentCache({
      key: unitKey, version: contentVersion, hash: H('old'),
      pageHashes: {}, pages, manifestUpdatedAt: 'x'
    })
  }
}

beforeEach(async () => {
  setActivePinia(createPinia())
  resetContentClient()
  const db = useStudyDbStore()
  await db.init()
  await db.clearContentCache()
  await db.saveContentMeta({
    key: CONTENT_META_KEY, contentVersion: null, contentHash: null, units: {}, pendingUnits: []
  })
})
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

describe('S4 · 攻点①A · 本地 v2 + 远程 v1（更旧）+ pending → 绝不写更旧内容', () => {
  it('★ 分片 version ≠ captured（远程退到 v1）→ buildShardEntry 挡下 → 不写、记 attempts++', async () => {
    const db = useStudyDbStore()
    await seed({
      contentVersion: 2,
      unitsSpec: { 'math/02': { hash: H('b'), version: 2, path: 'math/02.json', count: 1, updatedAt: 'x' } },
      pendingUnits: [{ unitKey: 'math/02', path: 'math/02.json', hash: H('b2'), version: 2, attempts: 0 }],
      cachePages: { 'math/02': [pageOf('02', 'v2-local', 'b')] }
    })
    // 远程清单更旧（v1），且分片也是 v1 内容
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(1, { '02': 'b1' })),
      '/math/02.json': jsonOk(shardOf('02', 1, 'v1-WRONG-SHOULD-NOT-WRITE', 'b1'))
    })
    const r = await refreshIfNewer({ base: BASE })
    // 未写入：units 不动、无 updated
    expect(r.units).toEqual([])
    expect(r.updated).toBe(false)
    resetContentClient()
    const got = await getRemotePage('math', '02', 0)
    expect(got.blocks[0].text, '更旧内容被写进来了！').toBe('v2-local') // 仍是本地内容，未被 v1 覆盖
    const meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.pendingUnits[0].attempts).toBe(1) // 算一次失败
    expect(meta.contentVersion).toBe(2) // 版本不前进
  })

  it('★ 分片 version == captured（同代）→ 允许自愈写入', async () => {
    const db = useStudyDbStore()
    await seed({
      contentVersion: 2,
      unitsSpec: { 'math/02': { hash: H('b'), version: 2, path: 'math/02.json', count: 1, updatedAt: 'x' } },
      pendingUnits: [{ unitKey: 'math/02', path: 'math/02.json', hash: H('b2'), version: 2, attempts: 0 }],
      cachePages: { 'math/02': [pageOf('02', 'v2-local', 'b')] }
    })
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(2, { '02': 'b2' })),
      '/math/02.json': jsonOk(shardOf('02', 2, 'v2-healed', 'b2'))
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.reason).toBe('healed')
    expect(r.units).toEqual(['math/02'])
    expect(r.version).toBe(2) // 内容代次不变
    resetContentClient()
    expect((await getRemotePage('math', '02', 0)).blocks[0].text).toBe('v2-healed')
    expect((await db.getContentMeta(CONTENT_META_KEY)).pendingUnits).toEqual([])
  })
})

describe('S4 · 攻点①B · 分片可达但结构坏 → 算失败、attempts++、不写坏数据', () => {
  it('blocks 缺 type → buildShardEntry=null → 不写 + attempts++', async () => {
    const db = useStudyDbStore()
    await seed({
      contentVersion: 2,
      unitsSpec: { 'math/02': { hash: H('b'), version: 2, path: 'math/02.json', count: 1, updatedAt: 'x' } },
      pendingUnits: [{ unitKey: 'math/02', path: 'math/02.json', hash: H('b2'), version: 2, attempts: 0 }],
      cachePages: { 'math/02': [pageOf('02', 'v2-local', 'b')] }
    })
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(2, { '02': 'b2' })),
      '/math/02.json': jsonOk(shardOf('02', 2, '坏', 'b2', [{ text: '缺 type 的块' }]))
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.units).toEqual([])
    const meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.pendingUnits[0].attempts).toBe(1)
    // 坏数据未被写入缓存
    resetContentClient()
    expect((await getRemotePage('math', '02', 0)).blocks[0].text).toBe('v2-local')
  })
})

describe('S4 · 攻点①C · units 与 pendingUnits 同一次 put（提交点语义）', () => {
  it('一次刷新里 saveContentMeta 只调 1 次，且同时携带 units 与 pendingUnits', async () => {
    const db = useStudyDbStore()
    await seed({
      contentVersion: 2,
      unitsSpec: {},
      pendingUnits: [],
      cachePages: {}
    })
    const spyMeta = vi.spyOn(db, 'saveContentMeta')
    const order = []
    vi.spyOn(db, 'saveContentCache').mockImplementation(async () => { order.push('cache') })
    spyMeta.mockImplementation(async () => { order.push('meta') })

    // v3：一片成功、一片失败 → 既写 body 又写 pending，且只 1 次 meta put
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(3, { '01': 'a3', '02': 'b3' })),
      '/math/01.json': jsonOk(shardOf('01', 3, 'ok', 'a3')),
      '/math/02.json': () => { throw new Error('down') }
    })
    await refreshIfNewer({ base: BASE })
    expect(spyMeta, '提交点必须只 put 一次（原子）').toHaveBeenCalledTimes(1)
    const rec = spyMeta.mock.calls[0][0]
    expect(rec).toHaveProperty('units')
    expect(rec).toHaveProperty('pendingUnits')
    expect(rec.units['math/01']).toBeTruthy() // 成功片前进
    expect(rec.pendingUnits.map((p) => p.unitKey)).toEqual(['math/02']) // 失败片进 pending
    // 所有 body 写（saveContentCache）都在唯一那次 meta put 之前
    const lastCache = order.lastIndexOf('cache')
    const metaIdx = order.indexOf('meta')
    expect(lastCache).toBeLessThan(metaIdx)
  })
})

describe('S4 · 攻点①D · attempts 达上限 → 移除 + 一次性 warn（不刷屏）', () => {
  it('第 5 次失败 → 移除并 warn 一次；再刷新不再 warn', async () => {
    const db = useStudyDbStore()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await seed({
      contentVersion: 2,
      unitsSpec: { 'math/02': { hash: H('b'), version: 2, path: 'math/02.json', count: 1, updatedAt: 'x' } },
      pendingUnits: [{ unitKey: 'math/02', path: 'math/02.json', hash: H('b2'), version: 2, attempts: PENDING_MAX_ATTEMPTS - 1 }],
      cachePages: {}
    })
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(2, { '02': 'b2' })),
      '/math/02.json': () => { throw new Error('down') }
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.reason).toBe('healed') // 进了 heal 分支（失败）
    const meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.pendingUnits, '达上限应移出 pending').toEqual([])
    expect(warn, '应 warn 一次（点名）').toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('math/02')

    // 再刷一次：pending 已空 → skip，无新 warn
    resetContentClient()
    mockFetch({ '/manifest.json': jsonOk(manifestOf(2, { '02': 'b2' })) })
    const r2 = await refreshIfNewer({ base: BASE })
    expect(r2.reason).toBe('not-newer')
    expect(warn, '不得每次刷新刷屏').toHaveBeenCalledTimes(1)
  })

  it('连续失败按次累加（非一次性给上限）', async () => {
    const db = useStudyDbStore()
    await seed({
      contentVersion: 2, unitsSpec: {},
      pendingUnits: [{ unitKey: 'math/02', path: 'math/02.json', hash: H('b2'), version: 2, attempts: 0 }],
      cachePages: {}
    })
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(2, { '02': 'b2' })),
      '/math/02.json': () => { throw new Error('down') }
    })
    await refreshIfNewer({ base: BASE })
    let meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.pendingUnits[0].attempts).toBe(1)
    resetContentClient()
    await refreshIfNewer({ base: BASE })
    meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.pendingUnits[0].attempts).toBe(2)
  })
})

describe('S4 · 附加 · 无 pending 时同版本**零分片请求**（闸门未放宽，端到端）', () => {
  it('★ 本地 v2 + 远程同版本 v2 + 无 pending → 只拉 manifest、0 分片请求', async () => {
    // 这是「自愈没有放宽闸门」的反面守门：无 pending 时，即便某片哈希与本地一致/不一致，
    // 同版本都不得触发任何分片拉取（沿用 S2 的 not-newer 行为）。
    const db = useStudyDbStore()
    await seed({
      contentVersion: 2,
      unitsSpec: { 'math/02': { hash: H('b2'), version: 2, path: 'math/02.json', count: 1, updatedAt: 'x' } },
      pendingUnits: [],
      cachePages: {}
    })
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(2, { '02': 'b2' })),
      '/math/02.json': jsonOk(shardOf('02', 2, 'SHOULD-NOT-FETCH', 'b2'))
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.reason).toBe('not-newer')
    expect(r.updated).toBe(false)
    const urls = globalThis.fetch.mock.calls.map((c) => String(c[0]))
    expect(urls, '无 pending 时不得拉任何分片').toEqual([`${BASE}/manifest.json`])
    expect((await db.getContentMeta(CONTENT_META_KEY)).pendingUnits).toEqual([])
  })
})

describe('S4 · 攻点①E · 兼容路径（旧 pending 无 version）/ computeRetrySet 纯函数', () => {
  it('pending 无 version → 回落 meta.contentVersion（分片须同代才放行）', async () => {
    const meta = { contentVersion: 2, units: {}, pendingUnits: [{ unitKey: 'math/02', path: 'math/02.json', hash: H('b2') }] }
    const { mode, targets } = computeRetrySet(manifestOf(1, {}), meta)
    expect(mode).toBe('heal')
    expect(targets[0].version).toBe(2) // 回落本地已见版本
    expect(targets[0].attempts).toBe(0)
  })

  it('computeRetrySet：newer 模式丢弃旧 pending、过滤无 path 单元、attempts 归零', () => {
    const meta = { contentVersion: 1, units: {}, pendingUnits: [{ unitKey: 'math/09', path: 'x', hash: H('z'), version: 1, attempts: 3 }] }
    const { mode, targets } = computeRetrySet(
      manifestOf(2, { '01': 'a', '02': 'b', '03': 'c' }),
      meta
    )
    expect(mode).toBe('newer')
    expect(targets.map((t) => t.unitKey).sort()).toEqual(['math/01', 'math/02', 'math/03'])
    expect(targets.every((t) => t.attempts === 0)).toBe(true)
    expect(targets.some((t) => t.unitKey === 'math/09'), '旧 pending 应被丢弃').toBe(false)
  })

  it('computeRetrySet：跳过无 path 清单项（不进待拉集）', () => {
    const m = manifestOf(2, { '01': 'a' })
    m.units['math/02'] = { hash: H('b'), version: 2, path: '', count: 1, updatedAt: 'x' } // 坏项
    const { mode, targets } = computeRetrySet(m, { contentVersion: 1, units: {}, pendingUnits: [] })
    expect(mode).toBe('newer')
    expect(targets.map((t) => t.unitKey)).toEqual(['math/01'])
  })

  it('computeRetrySet：pending 为空且版本等值 → skip', () => {
    expect(computeRetrySet(manifestOf(1, {}), { contentVersion: 1, units: {}, pendingUnits: [] }).mode).toBe('skip')
  })

  it('★ 不变量：任何一轮刷新后，pending 条目的 version 恒等于 meta.contentVersion', async () => {
    // 该不变量是「heal 不会写更旧内容」的**真正依据**（captured 版本永远是当时写入的 meta 版本）。
    const db = useStudyDbStore()
    await seed({ contentVersion: null, unitsSpec: {}, pendingUnits: [], cachePages: {} })
    const seen = []
    // v1 两片都失败 → pending 两条 且 version=1
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(1, { '01': 'a1', '02': 'b1' })),
      '/math/01.json': () => { throw new Error('down') },
      '/math/02.json': () => { throw new Error('down') }
    })
    await refreshIfNewer({ base: BASE })
    let meta = await db.getContentMeta(CONTENT_META_KEY)
    seen.push(meta.pendingUnits.map((p) => p.version))
    expect(meta.pendingUnits.every((p) => p.version === meta.contentVersion)).toBe(true)

    // v2：01 成功、02 失败 → pending 只剩 02，version=2
    resetContentClient()
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(2, { '01': 'a2', '02': 'b2' })),
      '/math/01.json': jsonOk(shardOf('01', 2, 'ok2', 'a2')),
      '/math/02.json': () => { throw new Error('down') }
    })
    await refreshIfNewer({ base: BASE })
    meta = await db.getContentMeta(CONTENT_META_KEY)
    seen.push(meta.pendingUnits.map((p) => p.version))
    expect(meta.pendingUnits.map((p) => p.unitKey)).toEqual(['math/02'])
    expect(meta.pendingUnits.every((p) => p.version === meta.contentVersion)).toBe(true)
    expect(seen).toEqual([[1, 1], [2]])
  })

  it('★ 不变量端到端（复核工程师证明）：跨版本提升后 pending 不残留旧 version', async () => {
    // 工程师声称：nextPending 每轮从本轮 stillPending **重建**、从不与上一轮合并
    // → 「pending.version < meta.contentVersion」结构性不可达。此处端到端证伪该风险。
    const db = useStudyDbStore()
    // v1：01 成功、02 失败 → pending=[02]@v1, meta=1
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(1, { '01': 'a1', '02': 'b1' })),
      '/math/01.json': jsonOk(shardOf('01', 1, 'v1-01', 'a1')),
      '/math/02.json': () => { throw new Error('down') }
    })
    await refreshIfNewer({ base: BASE })
    let meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.contentVersion).toBe(1)
    expect(meta.pendingUnits.map((p) => p.unitKey)).toEqual(['math/02'])
    expect(meta.pendingUnits.every((p) => p.version === 1)).toBe(true)

    // v2：01 未变（非 target）、02 哈希变 → 02 被**重新捕获**为 version=2（旧 @v1 不残留）
    resetContentClient()
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(2, { '01': 'a1', '02': 'b2' })),
      '/math/01.json': jsonOk(shardOf('01', 1, 'v1-01', 'a1')), // 不该被拉（未变）
      '/math/02.json': () => { throw new Error('down') }
    })
    const urls = []
    const realFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async (u) => { urls.push(String(u)); return realFetch(u) })
    await refreshIfNewer({ base: BASE })
    meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.contentVersion).toBe(2)
    expect(meta.pendingUnits.map((p) => p.unitKey)).toEqual(['math/02'])
    // ★ 不变量：无任何 pending 残留旧 version
    expect(meta.pendingUnits.every((p) => p.version === meta.contentVersion)).toBe(true)
    // 未变的 01 不被重拉
    expect(urls.some((u) => u.endsWith('/math/01.json'))).toBe(false)
  })

  it('⚠️ 对抗（当前不可达）：若 pending.version 被人为造得**低于** meta.contentVersion → heal 会接受更旧同号分片', async () => {
    // 这不是现存缺陷：doRefresh 的提交点保证 pending.version === meta.contentVersion（上一用例已证）。
    // 但它说明 heal 的「不写更旧」依赖该不变量，而 guard 本身**不显式**比较 meta.contentVersion。
    // 登记为「脆弱点」（低）：若未来出现在 pending 存活期间推进 meta 的新路径，需加 `t.version >= meta.contentVersion` 断言。
    const db = useStudyDbStore()
    await seed({
      contentVersion: 5, // meta 已到 5
      unitsSpec: {},
      pendingUnits: [{ unitKey: 'math/02', path: 'math/02.json', hash: H('b'), version: 2, attempts: 0 }], // captured=2（人为造低）
      cachePages: {}
    })
    mockFetch({
      '/manifest.json': jsonOk(manifestOf(5, { '02': 'b5' })),
      '/math/02.json': jsonOk(shardOf('02', 2, 'OLD-v2-content', 'b')) // 更旧同号分片
    })
    const r = await refreshIfNewer({ base: BASE })
    // 记录事实：当前实现会接受它（证明 guard 只比 captured，不比 meta）
    expect(r.reason).toBe('healed')
    resetContentClient()
    expect((await getRemotePage('math', '02', 0)).blocks[0].text).toBe('OLD-v2-content')
    expect((await db.getContentMeta(CONTENT_META_KEY)).contentVersion).toBe(5)
  })

  it('computeRetrySet：heal 过滤畸形 pending 条目（非字符串 unitKey/path）', () => {
    const meta = {
      contentVersion: 2, units: {},
      pendingUnits: [
        { unitKey: 'math/02', path: 'math/02.json', hash: H('b2'), version: 2 },
        { unitKey: 123, path: 'x', hash: H('b'), version: 2 },
        { unitKey: 'math/03' } // 无 path
      ]
    }
    const { mode, targets } = computeRetrySet(manifestOf(1, {}), meta)
    expect(mode).toBe('heal')
    expect(targets.map((t) => t.unitKey)).toEqual(['math/02'])
  })
})
