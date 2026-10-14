// @vitest-environment jsdom
/**
 * pendingUnits 同版本自愈（批 S4 · S4-2）
 *
 * 背景（2026-10-15 事故）：单片拉失败后，S2 的口径是「同版本内不重试」——
 * 版本闸门在单元哈希比对**之前**返回 not-newer，导致已缓存客户端**永久拉不到新内容且不报错**。
 * S4-2 把失败片记进 `content_meta.pendingUnits`，随「每会话一次的后台刷新」在闸门**之外**补拉。
 *
 * 覆盖（逐条对应任务卡 §3 S4-2）：
 *  ① 失败片记入 pendingUnits，且 `units` 仍保留**旧哈希**
 *  ② **核心**：同版本再刷新（这次可达）→ 成功补拉、pending 清空、页面内容切到新版本
 *  ③ 同版本再刷新仍失败 → pending 保留、`attempts` 递增
 *  ④ 版本前进 → 走正常增量路径，旧 pending 被本轮结果**取代**（不并存、不重复拉）
 *  ⑤ 上限：`attempts` 达 5 → 从 pending 移除 + **一次性** warn 点名
 *  ⑥ 守卫：**无** pending 且同版本 → 仍 `not-newer` 且**零分片请求**（闸门未被放宽）
 *
 * ⚠️ 不读盘产物（`public/content-remote/` 已 gitignore）：一律 mock fetch + 注入式 fixture。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  refreshIfNewer, getRemotePage, resetContentClient, CONTENT_META_KEY, PENDING_MAX_ATTEMPTS
} from '@/utils/contentClient'
import { useStudyDbStore } from '@/stores/studyDb'
import { SCHEMA_VERSION, OP, HASH_PREFIX } from '@/content/contentManifest'

const BASE = 'https://example.test/content-remote'
const H = (tag = 'a') => HASH_PREFIX + tag.repeat(64).slice(0, 64)
const ORIGINAL_FETCH = globalThis.fetch

function shard(unitNum, version, hashChar, text) {
  return {
    unitKey: `math/${unitNum}`,
    contentVersion: version,
    pages: [{
      subject: 'math', unitNum, fileIndex: 0, fileKey: `math_${unitNum}_p0`,
      op: OP.UPSERT, blocks: [{ type: 'text', text }], hash: H(hashChar)
    }]
  }
}

function manifest(version, unitSpec) {
  const units = {}
  for (const [unitNum, hashChar] of Object.entries(unitSpec)) {
    units[`math/${unitNum}`] = {
      hash: H(hashChar), version, path: `math/${unitNum}.json`, count: 1,
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION, contentVersion: version, contentHash: H('m'),
    generatedAt: '2026-01-01T00:00:00.000Z', units
  }
}

/** URL 后缀路由的 fetch 替身（handler 可抛错以模拟网络失败） */
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
const boom = () => { throw new Error('network down') }

/** 各 URL 被请求的次数 */
const callsFor = (suffix) => globalThis.fetch.mock.calls.filter((c) => String(c[0]).endsWith(suffix)).length

beforeEach(async () => {
  setActivePinia(createPinia())
  resetContentClient()
  // ⚠️ fake-indexeddb 在**同一文件内跨用例是持久的**（已有实证）→ 必须显式清表，
  //    否则「本轮待拉集」会被上一条用例注入的 units/pending 污染（断言失真且不报错）。
  const db = useStudyDbStore()
  await db.init()
  await db.clearContentCache()
  // content_meta 无 clear 访问器 → 用空记录覆盖（contentVersion=null 等价于「本地无记录」）
  await db.saveContentMeta({
    key: CONTENT_META_KEY, contentVersion: null, contentHash: null, units: {}, pendingUnits: []
  })
})
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

/** 造出「v1 全成功 → v2 时 math/02 失败」的现场，返回第二轮结果 */
async function seedV2WithFailure() {
  mockFetch({
    '/manifest.json': jsonOk(manifest(1, { '01': 'a', '02': 'b' })),
    '/math/01.json': jsonOk(shard('01', 1, 'a', 'v1-01')),
    '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02'))
  })
  await refreshIfNewer({ base: BASE })

  mockFetch({
    '/manifest.json': jsonOk(manifest(2, { '01': 'a2', '02': 'b2' })),
    '/math/01.json': jsonOk(shard('01', 2, 'a2', 'v2-01')),
    '/math/02.json': boom
  })
  resetContentClient()
  const r2 = await refreshIfNewer({ base: BASE })
  return r2
}

describe('① 失败片记入 pendingUnits（units 仍保留旧哈希）', () => {
  it('v2 时 math/02 失败 → pendingUnits 有它、units[math/02] 仍是 v1 旧哈希', async () => {
    const r2 = await seedV2WithFailure()
    expect(r2.units).toEqual(['math/01'])
    expect(r2.reason).toBe('ok')

    const meta = await useStudyDbStore().getContentMeta(CONTENT_META_KEY)
    expect(meta.contentVersion).toBe(2)
    expect(meta.units['math/01'].hash).toBe(H('a2'))
    expect(meta.units['math/02'].hash).toBe(H('b')) // 旧哈希（S2 已钉死口径）
    expect(meta.units['math/02'].hash).not.toBe(H('b2'))

    expect(Array.isArray(meta.pendingUnits)).toBe(true)
    expect(meta.pendingUnits.map((p) => p.unitKey)).toEqual(['math/02'])
    const p = meta.pendingUnits[0]
    // 自带坐标（同版本重试**不依赖**远程 manifest 可达）
    expect(p.path).toBe('math/02.json')
    expect(p.hash).toBe(H('b2'))
    expect(p.version).toBe(2)
    expect(p.attempts).toBe(1)
  })
})

describe('② 核心：同版本自愈（闸门之外补拉）', () => {
  it('同版本再刷新且这次可达 → 成功补拉、pending 清空、页面切到 v2 内容', async () => {
    await seedV2WithFailure()

    // 同一份 v2 清单；这次 math/02 可达
    resetContentClient()
    mockFetch({
      '/manifest.json': jsonOk(manifest(2, { '01': 'a2', '02': 'b2' })),
      '/math/02.json': jsonOk(shard('02', 2, 'b2', 'v2-02')),
      '/math/01.json': jsonOk(shard('01', 2, 'a2', 'v2-01'))
    })
    const r3 = await refreshIfNewer({ base: BASE })

    expect(r3.reason).toBe('healed')
    expect(r3.units).toEqual(['math/02'])
    expect(r3.version).toBe(2) // 内容代次没变 → 版本号**不前进**
    expect(r3.updated).toBe(true)

    const meta = await useStudyDbStore().getContentMeta(CONTENT_META_KEY)
    expect(meta.pendingUnits).toEqual([])
    expect(meta.contentVersion).toBe(2)
    expect(meta.units['math/02'].hash).toBe(H('b2')) // 补拉成功后才前进

    // 端到端：页面读到 v2 内容
    resetContentClient()
    const page = await getRemotePage('math', '02', 0)
    expect(page.blocks).toEqual([{ type: 'text', text: 'v2-02' }])
  })

  it('自愈只拉 pending 里的片（不整轮重拉 changedKeys）', async () => {
    await seedV2WithFailure()
    resetContentClient()
    mockFetch({
      '/manifest.json': jsonOk(manifest(2, { '01': 'a2', '02': 'b2' })),
      '/math/02.json': jsonOk(shard('02', 2, 'b2', 'v2-02')),
      '/math/01.json': jsonOk(shard('01', 2, 'a2', 'v2-01'))
    })
    await refreshIfNewer({ base: BASE })
    expect(callsFor('/math/02.json')).toBe(1)
    expect(callsFor('/math/01.json')).toBe(0) // 已是最新，不该被自愈顺带重拉
  })
})

describe('③ 自愈仍失败 → pending 保留且 attempts 递增', () => {
  it('第二次仍失败 → attempts=2，pendingUnits 仍在', async () => {
    await seedV2WithFailure()
    resetContentClient()
    mockFetch({
      '/manifest.json': jsonOk(manifest(2, { '01': 'a2', '02': 'b2' })),
      '/math/02.json': boom
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.updated).toBe(false)
    expect(r.reason).toBe('healed')
    expect(r.version).toBe(2)

    const meta = await useStudyDbStore().getContentMeta(CONTENT_META_KEY)
    expect(meta.pendingUnits.map((p) => p.attempts)).toEqual([2])
    expect(meta.units['math/02'].hash).toBe(H('b')) // 仍未前进
  })
})

describe('④ 版本前进 → 旧 pending 被本轮结果取代（不并存、不重复拉）', () => {
  it('v3 清单里 math/02 仍是 b2 → 走 changedKeys 路径拉到它，pending 清空', async () => {
    await seedV2WithFailure()

    resetContentClient()
    mockFetch({
      '/manifest.json': jsonOk(manifest(3, { '01': 'a2', '02': 'b2' })),
      '/math/02.json': jsonOk(shard('02', 3, 'b2', 'v3-02'))
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.reason).toBe('ok')
    expect(r.version).toBe(3)
    expect(r.units).toEqual(['math/02'])
    // 只有一轮请求：不得出现「pending 与 changedKeys 各拉一次」的重复
    expect(callsFor('/math/02.json')).toBe(1)

    const meta = await useStudyDbStore().getContentMeta(CONTENT_META_KEY)
    expect(meta.pendingUnits).toEqual([])
    expect(meta.units['math/02'].hash).toBe(H('b2'))
  })
})

describe('⑤ 上限：达 PENDING_MAX_ATTEMPTS → 移除 + 一次性 warn', () => {
  it('attempts 从 4 起再失败一次 → pending 清空并点名 warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const db = useStudyDbStore()
    await db.init()
    // 直接造一个「已失败 4 次」的 meta（模拟连续多天启动都拉不到）
    await db.saveContentMeta({
      key: CONTENT_META_KEY,
      contentVersion: 2,
      contentHash: H('m'),
      units: { 'math/01': { hash: H('a2'), version: 2, path: 'math/01.json', count: 1 } },
      pendingUnits: [{ unitKey: 'math/02', path: 'math/02.json', hash: H('b2'), version: 2, attempts: 4 }]
    })

    mockFetch({
      '/manifest.json': jsonOk(manifest(2, { '01': 'a2', '02': 'b2' })),
      '/math/02.json': boom
    })
    resetContentClient()
    await refreshIfNewer({ base: BASE })

    const meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.pendingUnits).toEqual([]) // 放弃重试，不留永久陈旧项
    expect(warn).toHaveBeenCalledTimes(1)
    const msg = String(warn.mock.calls[0][0])
    expect(msg).toContain('math/02')
    expect(msg).toContain(String(PENDING_MAX_ATTEMPTS))
  })

  it('上限是常量 5（口径单一，禁止各处硬编）', () => {
    expect(PENDING_MAX_ATTEMPTS).toBe(5)
  })
})

describe('⑥ 守卫：无 pending 且同版本 → 闸门未被放宽', () => {
  it('同版本 + 空 pending → not-newer，且**零**分片请求', async () => {
    mockFetch({
      '/manifest.json': jsonOk(manifest(1, { '02': 'b' })),
      '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02'))
    })
    await refreshIfNewer({ base: BASE })

    resetContentClient()
    mockFetch({
      '/manifest.json': jsonOk(manifest(1, { '02': 'b' })),
      '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02'))
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.reason).toBe('not-newer')
    expect(r.updated).toBe(false)
    const urls = globalThis.fetch.mock.calls.map((c) => String(c[0]))
    expect(urls).toEqual([`${BASE}/manifest.json`])
  })

  it('更旧版本 + 空 pending → 同样不写（前进式回滚）', async () => {
    mockFetch({
      '/manifest.json': jsonOk(manifest(5, { '02': 'b5' })),
      '/math/02.json': jsonOk(shard('02', 5, 'b5', 'v5-02'))
    })
    await refreshIfNewer({ base: BASE })

    resetContentClient()
    mockFetch({
      '/manifest.json': jsonOk(manifest(3, { '02': 'b3' })),
      '/math/02.json': jsonOk(shard('02', 3, 'b3', 'v3-02'))
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.reason).toBe('not-newer')
    expect(callsFor('/math/02.json')).toBe(0)

    const meta = await useStudyDbStore().getContentMeta(CONTENT_META_KEY)
    expect(meta.contentVersion).toBe(5)
  })

  it('getRemotePage 在无 pending 时行为与 S2 一致（零回归）', async () => {
    mockFetch({
      '/manifest.json': jsonOk(manifest(1, { '02': 'b' })),
      '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02'))
    })
    await refreshIfNewer({ base: BASE })
    resetContentClient()
    expect((await getRemotePage('math', '02', 0)).blocks[0].text).toBe('v1-02')
    expect(await getRemotePage('math', '02', 9)).toBeNull() // 越界
    expect(await getRemotePage('chinese', '01', 0)).toBeNull() // 无缓存
  })
})

describe('computeRetrySet · 纯函数口径（三模式）', () => {
  it('newer：取哈希变化项；丢弃旧 pending（不并存）', async () => {
    const { computeRetrySet } = await import('@/utils/contentClient')
    const m = manifest(3, { '01': 'a3', '02': 'b3' })
    const meta = {
      contentVersion: 2,
      units: { 'math/01': { hash: H('a3') }, 'math/02': { hash: H('b') } },
      pendingUnits: [{ unitKey: 'math/02', path: 'math/02.json', hash: H('b3'), version: 3, attempts: 2 }]
    }
    const { mode, targets } = computeRetrySet(m, meta)
    expect(mode).toBe('newer')
    expect(targets.map((t) => t.unitKey)).toEqual(['math/02']) // 01 哈希未变 → 不拉
    expect(targets[0].attempts).toBe(0) // 旧 pending 的 attempts 不继承（新一轮）
  })

  it('heal：同版本 + pending 非空 → 用 pending 自带坐标，不读远程 units', async () => {
    const { computeRetrySet } = await import('@/utils/contentClient')
    const m = manifest(2, { '01': 'a2', '02': 'b2' })
    const meta = {
      contentVersion: 2,
      units: {},
      pendingUnits: [{ unitKey: 'math/07', path: 'math/07.json', hash: H('z'), version: 2, attempts: 1 }]
    }
    const { mode, targets } = computeRetrySet(m, meta)
    expect(mode).toBe('heal')
    expect(targets).toEqual([{ unitKey: 'math/07', path: 'math/07.json', hash: H('z'), version: 2, attempts: 1 }])
  })

  it('skip：同版本 + 空 pending → 无目标', async () => {
    const { computeRetrySet } = await import('@/utils/contentClient')
    expect(computeRetrySet(manifest(2, { '01': 'a2' }), { contentVersion: 2, units: {} }).mode).toBe('skip')
    expect(computeRetrySet(manifest(2, { '01': 'a2' }), null).mode).toBe('newer') // 首次 → newer
  })
})
