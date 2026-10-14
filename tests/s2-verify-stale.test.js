// @vitest-environment jsdom
/**
 * 批 S2 · 独立证伪 · 攻点②「单片失败不静默陈旧」
 *
 * 这是本批最危险的一类缺陷：若失败片被记成**新哈希**，它会从此**永不重拉**（静默陈旧，
 * 且没有任何告警）。工程师已自曝并修复过这个坑，我的任务是用**另一套 fixture 与断言**
 * 独立复现：确认失败片在 content_meta.units 里**保留旧哈希**。
 *
 * 另外独立核查「下次是否真的会重拉」——不只信注释，实测三种推进方式：
 *   (a) 同版本再刷新：**S4-2 起分两种情况** —— 无待重试片仍不拉（闸门未放宽）；
 *       有 `pendingUnits` 则**同版本自愈**补拉（旧口径是「一律不拉」，已由 S4-2 改写，见文末）
 *   (b) 版本号前进（→ 会重拉，因为旧哈希 ≠ 新哈希）
 *   (c) 进程内重启（memoryCache 清空后仍能从 IDB 读到旧片，不会开天窗）
 *
 * ⚠️ 环境纪律：不读 `public/content-remote/`（已 gitignore，干净树无产物）→ 一律 mock fetch。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  refreshIfNewer, getRemotePage, resetContentClient, CONTENT_META_KEY
} from '@/utils/contentClient'
import { useStudyDbStore } from '@/stores/studyDb'
import { SCHEMA_VERSION, OP, HASH_PREFIX } from '@/content/contentManifest'

const BASE = 'https://example.test/content-remote'
/** 由任意短标签生成**合法形态**哈希（固定 64 位小写十六进制，不同标签必不同） */
const H = (tag = 'a') => HASH_PREFIX + tag.repeat(64).slice(0, 64)
const ORIGINAL_FETCH = globalThis.fetch

/** 分片构造（形状一眼可查，不复用任何既有 fixture） */
function shard(unitNum, version, hashChar, textPrefix) {
  return {
    unitKey: `math/${unitNum}`,
    contentVersion: version,
    pages: [
      {
        subject: 'math',
        unitNum,
        fileIndex: 0,
        fileKey: `math_${unitNum}_p0`,
        op: OP.UPSERT,
        blocks: [{ type: 'text', text: `${textPrefix}` }],
        hash: H(hashChar)
      }
    ]
  }
}

function manifest(version, unitSpec) {
  const units = {}
  for (const [unitNum, hashChar] of Object.entries(unitSpec)) {
    units[`math/${unitNum}`] = {
      hash: H(hashChar),
      version,
      path: `math/${unitNum}.json`,
      count: 1,
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    contentVersion: version,
    contentHash: H('m'),
    generatedAt: '2026-01-01T00:00:00.000Z',
    units
  }
}

/** 按 URL 后缀路由的 fetch 替身；handler 可抛错以模拟网络失败 */
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

beforeEach(async () => {
  setActivePinia(createPinia())
  resetContentClient()
  // ⚠️ fake-indexeddb 同文件内跨用例持久 → 显式清表，避免上一条用例的 units/pending 污染本轮待拉集
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

describe('S2 · 攻点② 单片失败不静默陈旧', () => {
  it('v1 两片都成功 → 闸门前进到 1，两片哈希都登记', async () => {
    mockFetch({
      '/manifest.json': jsonOk(manifest(1, {'01': 'a', '02': 'b' })),
      '/math/01.json': jsonOk(shard('01', 1, 'a', 'v1-01')),
      '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02'))
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.updated).toBe(true)
    expect(r.version).toBe(1)
    expect([...r.units].sort()).toEqual(['math/01', 'math/02'])

    const db = useStudyDbStore()
    const meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.contentVersion).toBe(1)
    expect(meta.units['math/01'].hash).toBe(H('a'))
    expect(meta.units['math/02'].hash).toBe(H('b'))
  })

  it('★ v2 时 math/02 fetch 失败 → meta 里 math/02 必须**保留旧哈希**（不是新哈希）', async () => {
    // —— 第一轮：v1 全成功 ——
    mockFetch({
      '/manifest.json': jsonOk(manifest(1, {'01': 'a', '02': 'b' })),
      '/math/01.json': jsonOk(shard('01', 1, 'a', 'v1-01')),
      '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02'))
    })
    await refreshIfNewer({ base: BASE })

    // —— 第二轮：v2，math/02 拉取失败 ——
    mockFetch({
      '/manifest.json': jsonOk(manifest(2, {'01': 'a2', '02': 'b2' })),
      '/math/01.json': jsonOk(shard('01', 2, 'a2', 'v2-01')),
      '/math/02.json': () => {
        throw new Error('network down')
      }
    })
    resetContentClient() // 模拟重启：memoryCache 清空，IDB 保留
    const r2 = await refreshIfNewer({ base: BASE })

    // 成功片照常前进
    expect(r2.units).toEqual(['math/01'])
    expect(r2.version).toBe(2)

    const db = useStudyDbStore()
    const meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.contentVersion).toBe(2)
    // ★ 核心断言：失败片**不是**新哈希 b2，而是仍然沿用 v1 的旧哈希 b
    expect(meta.units['math/01'].hash).toBe(H('a2'))
    expect(meta.units['math/02'].hash).toBe(H('b'))
    expect(meta.units['math/02'].hash).not.toBe(H('b2'))
  })

  it('失败片的缓存仍是 v1 内容（陈旧但可用），不会开天窗 / 不会变空', async () => {
    mockFetch({
      '/manifest.json': jsonOk(manifest(1, {'02': 'b' })),
      '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02'))
    })
    await refreshIfNewer({ base: BASE })

    mockFetch({
      '/manifest.json': jsonOk(manifest(2, {'02': 'b2' })),
      '/math/02.json': () => {
        throw new Error('network down')
      }
    })
    resetContentClient()
    await refreshIfNewer({ base: BASE })

    resetContentClient() // 重启后 memoryCache 为空，必须能从 IDB 读回
    const p = await getRemotePage('math', '02', 0)
    expect(p).toBeTruthy()
    expect(p.blocks).toEqual([{ type: 'text', text: 'v1-02' }])
  })

  it('版本前进后失败片会被重拉（不会永久陈旧）', async () => {
    // v1 成功 → v2 失败（保留旧哈希）→ v3 时旧哈希 ≠ 新哈希 → 必被重新拉取
    mockFetch({
      '/manifest.json': jsonOk(manifest(1, {'02': 'b' })),
      '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02'))
    })
    await refreshIfNewer({ base: BASE })

    mockFetch({
      '/manifest.json': jsonOk(manifest(2, {'02': 'b2' })),
      '/math/02.json': () => {
        throw new Error('network down')
      }
    })
    resetContentClient()
    await refreshIfNewer({ base: BASE })

    // v3：math/02 应当被重新拉取（旧哈希 b ≠ b3）
    mockFetch({
      '/manifest.json': jsonOk(manifest(3, {'02': 'b3' })),
      '/math/02.json': jsonOk(shard('02', 3, 'b3', 'v3-02'))
    })
    resetContentClient()
    const r3 = await refreshIfNewer({ base: BASE })
    expect(r3.units).toEqual(['math/02'])
    resetContentClient()
    const p = await getRemotePage('math', '02', 0)
    expect(p.blocks).toEqual([{ type: 'text', text: 'v3-02' }])
  })

  it('⚠️ 口径变更（S4-2 起之一）：**无待重试片**时同版本仍不拉 —— 闸门未被放宽', async () => {
    // 旧口径（S2 → S4-2 前）：同版本再刷新一律 not-newer，「失败片在同版本内不重试」。
    // S4-2 之后该口径**分叉**：只有「有待重试片（pendingUnits 非空）」才自愈。
    // 本条守住**未放宽**那一面：pending 为空 → 清单拉到了也一片不拉（沿用 s2-verify 原始断言）。
    mockFetch({
      '/manifest.json': jsonOk(manifest(1, { '02': 'b' })),
      '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02'))
    })
    await refreshIfNewer({ base: BASE })

    // 同一份 v1 再刷一次：闸门等值、且没有任何待重试片 → 直接 not-newer，一片都不拉
    resetContentClient()
    mockFetch({
      '/manifest.json': jsonOk(manifest(1, { '02': 'b' })),
      '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02')) // 若被调用即证明闸门被放宽了
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.reason).toBe('not-newer')
    expect(r.updated).toBe(false)
    const urls = globalThis.fetch.mock.calls.map((c) => String(c[0]))
    expect(urls).toEqual([`${BASE}/manifest.json`])
  })

  it('⚠️ 口径变更（S4-2 起之二）：**有待重试片**时同版本可自愈（旧行为已废除）', async () => {
    // 2026-10-15 事故：版本闸门滞后（漏 bump）时，失败片在旧口径下**永久陈旧且不报错**。
    // S4-2 把失败片记入 `content_meta.pendingUnits`，随「每会话一次的后台刷新」在闸门**之外**补拉。
    // 本条即旧断言的反面：同一份 v2 再刷新，这次分片可达 → 应当**补拉成功**。
    mockFetch({
      '/manifest.json': jsonOk(manifest(1, { '02': 'b' })),
      '/math/02.json': jsonOk(shard('02', 1, 'b', 'v1-02'))
    })
    await refreshIfNewer({ base: BASE })

    // v2：分片失败 → 记入 pending
    mockFetch({
      '/manifest.json': jsonOk(manifest(2, { '02': 'b2' })),
      '/math/02.json': () => { throw new Error('network down') }
    })
    resetContentClient()
    await refreshIfNewer({ base: BASE })
    const db = useStudyDbStore()
    expect((await db.getContentMeta(CONTENT_META_KEY)).pendingUnits.map((p) => p.unitKey)).toEqual(['math/02'])

    // 同一份 v2 再刷一次：清单等值**但**有 pending → 自愈分支，补拉该片
    resetContentClient()
    mockFetch({
      '/manifest.json': jsonOk(manifest(2, { '02': 'b2' })),
      '/math/02.json': jsonOk(shard('02', 2, 'b2', 'v2-02'))
    })
    const r = await refreshIfNewer({ base: BASE })
    expect(r.reason).toBe('healed')
    expect(r.units).toEqual(['math/02'])
    expect(r.version).toBe(2) // 内容代次没变 → 版本号不前进
    expect((await db.getContentMeta(CONTENT_META_KEY)).pendingUnits).toEqual([])

    resetContentClient()
    expect((await getRemotePage('math', '02', 0)).blocks[0].text).toBe('v2-02')
  })
})
