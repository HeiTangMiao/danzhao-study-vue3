// @vitest-environment node
/**
 * assetClient 共享编排原语（批 S5 · S5-2）
 *
 * 覆盖：
 *  A. `gateAndTargets` 三模式（newer 取 changed / heal 用 pending 自带坐标 / skip 一片不拉）
 *  B. `readByKey` 读路径：memory → idb → 读时闸门（P-S53：`entry.version < minVersion` 视为未命中）
 *  C. `commitAtomically` 原子写：body 先落、meta 后交；**第 2 片抛错 → meta 不被写**
 *  D. `loadManifest` / `readLocalMaxVersion`：失败一律返回 null（不抛，红线 2）
 *  E. `siteRoot` 派生（S5-6 前置）：相对 `./`；绝对取 origin 且**不带** `/api`、`/content-remote`
 *
 * ⚠️ 全部注入式 fixture + 假 store，不读盘产物、不发真实网络。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  gateAndTargets, readByKey, commitAtomically, readLocalMaxVersion, isFreshEntry
} from '@/utils/assetClient'
import { contentRootFrom, siteRootFrom, siteRoot, contentRoot } from '@/utils/assetBase'
import { MANIFEST_FILE, CONTENT_META_KEY, SCHEMA_VERSION } from '@/content/contentManifest'
import { useStudyDbStore } from '@/stores/studyDb'

const H = (c = 'a') => 'sha256:' + c.repeat(64)

/** 假 store：按表返回缓存条目 */
function fakeStore(table = {}) {
  return { getContentCache: vi.fn(async (key) => table[key] || null) }
}

/** 假 db：可指定第几片写入抛错 */
function fakeDb({ failOnKey = null } = {}) {
  const calls = { cache: [], meta: [] }
  return {
    calls,
    saveContentCache: vi.fn(async (entry) => {
      if (failOnKey && entry.key === failOnKey) throw new Error('disk full')
      calls.cache.push(entry.key)
    }),
    saveContentMeta: vi.fn(async (record) => { calls.meta.push(record) })
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('A. gateAndTargets 三模式（唯一实现 = computeRetrySet）', () => {
  const manifest = (version, unitSpec) => {
    const units = {}
    for (const [k, hash] of Object.entries(unitSpec)) {
      units[`math/${k}`] = { hash: H(hash), version, path: `math/${k}.json`, count: 1 }
    }
    return { schemaVersion: SCHEMA_VERSION, contentVersion: version, units }
  }

  it('newer：版本前进 → 只取「哈希变了」的单元', () => {
    const m = manifest(3, { '01': 'a3', '02': 'b3' })
    const meta = { contentVersion: 2, units: { 'math/01': { hash: H('a3') }, 'math/02': { hash: H('b') } } }
    const { mode, targets } = gateAndTargets(m, meta)
    expect(mode).toBe('newer')
    expect(targets.map((t) => t.unitKey)).toEqual(['math/02'])
    expect(targets[0].attempts).toBe(0)
  })

  it('heal：同版本 + pending 非空 → 用 pending 自带坐标（不读远程 units）', () => {
    const m = manifest(2, { '01': 'a2' })
    const meta = {
      contentVersion: 2,
      units: {},
      pendingUnits: [{ unitKey: 'math/07', path: 'math/07.json', hash: H('z'), version: 2, attempts: 1 }]
    }
    const { mode, targets } = gateAndTargets(m, meta)
    expect(mode).toBe('heal')
    expect(targets).toEqual([
      { unitKey: 'math/07', path: 'math/07.json', hash: H('z'), version: 2, attempts: 1 }
    ])
  })

  it('skip：同版本 + 无 pending → 一片都不拉', () => {
    const { mode, targets } = gateAndTargets(manifest(2, { '01': 'a2' }), { contentVersion: 2, units: {} })
    expect(mode).toBe('skip')
    expect(targets).toEqual([])
  })
})

describe('B. readByKey 读路径 + 读时闸门（P-S53 / R-3）', () => {
  const entry = (version) => ({ key: 'search:meta', version, payload: [1] })

  it('memory 命中且够新 → 零 IDB 读', async () => {
    const store = fakeStore({ 'search:meta': entry(3) })
    const memory = new Map([['search:meta', entry(3)]])
    const r = await readByKey(store, 'search:meta', { memory, minVersion: 3 })
    expect(r.source).toBe('memory')
    expect(store.getContentCache).not.toHaveBeenCalled()
  })

  it('idb 命中且够新 → 回填 memory 并返回条目', async () => {
    const store = fakeStore({ 'search:meta': entry(3) })
    const memory = new Map()
    const r = await readByKey(store, 'search:meta', { memory, minVersion: 3 })
    expect(r.source).toBe('idb')
    expect(memory.get('search:meta')).toBeTruthy()
  })

  it('读时闸门：entry.version < minVersion → 视为未命中（stale）', async () => {
    const store = fakeStore({ 'search:meta': entry(2) })
    const r = await readByKey(store, 'search:meta', { minVersion: 3 })
    expect(r.entry).toBeNull()
    expect(r.source).toBe('stale')
  })

  it('entry.version 高于线上（回滚场景）→ 仍算命中（判据是「小于」而非「不等」）', async () => {
    const store = fakeStore({ 'search:meta': entry(5) })
    const r = await readByKey(store, 'search:meta', { minVersion: 3 })
    expect(r.source).toBe('idb')
  })

  it('minVersion 为 null（不知道线上版本）→ 不拦', async () => {
    const store = fakeStore({ 'search:meta': entry(1) })
    expect((await readByKey(store, 'search:meta', { minVersion: null })).source).toBe('idb')
  })

  it('无缓存 → miss；读失败 → error 且**不抛**', async () => {
    expect((await readByKey(fakeStore({}), 'search:meta', { minVersion: 3 })).source).toBe('miss')
    const boom = { getContentCache: vi.fn(async () => { throw new Error('idb down') }) }
    const r = await readByKey(boom, 'search:meta', { minVersion: 3 })
    expect(r.entry).toBeNull()
    expect(r.source).toBe('error')
  })

  it('isFreshEntry：空条目 / 无版本号 → 不够新（保守）', () => {
    expect(isFreshEntry(null, 3)).toBe(false)
    expect(isFreshEntry({ key: 'x' }, 3)).toBe(false) // 无 version → 视为陈旧，触发一次补拉
  })
})

describe('C. commitAtomically 原子写（body 先落 / meta 后交）', () => {
  it('两片都成功 → meta 最后被写（提交点）', async () => {
    const db = fakeDb()
    const order = []
    db.saveContentCache.mockImplementation(async (e) => { order.push('cache:' + e.key) })
    db.saveContentMeta.mockImplementation(async () => { order.push('meta') })
    const memory = new Map()
    await commitAtomically(db, [{ key: 'a' }, { key: 'b' }], { key: CONTENT_META_KEY }, { memory })
    expect(order).toEqual(['cache:a', 'cache:b', 'meta'])
    expect(memory.size).toBe(2)
  })

  it('★ 第 2 片写入抛错 → **meta 不被写**（提交点未到），且异常向上抛', async () => {
    const db = fakeDb({ failOnKey: 'b' })
    await expect(commitAtomically(db, [{ key: 'a' }, { key: 'b' }], { key: CONTENT_META_KEY }))
      .rejects.toThrow('disk full')
    expect(db.calls.cache).toEqual(['a']) // 第 1 片已落（body 先落，无法回滚）
    expect(db.calls.meta).toEqual([]) // ★ 提交点未到
  })

  it('metaPatch 为 null → 只落 body（纯缓存写入场景）', async () => {
    const db = fakeDb()
    await commitAtomically(db, [{ key: 'a' }], null)
    expect(db.calls.cache).toEqual(['a'])
    expect(db.saveContentMeta).not.toHaveBeenCalled()
  })
})

describe('D. readLocalMaxVersion（失败不抛）', () => {
  it('有记录 → 数字；无记录 / 读失败 → null', async () => {
    const db = useStudyDbStore()
    await db.init()
    expect(await readLocalMaxVersion(db)).toBeNull()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    expect(await readLocalMaxVersion(db)).toBe(3)
    const boom = { getContentMeta: vi.fn(async () => { throw new Error('idb down') }) }
    expect(await readLocalMaxVersion(boom)).toBeNull()
  })
})

describe('E. 基址派生（S5-6 前置：站点根 = 内容根剥掉 /content-remote）', () => {
  it('内容根：相对 ./content-remote；绝对取 origin 剥 /api', () => {
    expect(contentRootFrom('https://520305.top/api', false)).toBe('./content-remote')
    expect(contentRootFrom('https://520305.top/api', true)).toBe('https://520305.top/content-remote')
    expect(contentRootFrom('https://520305.top/api', true)).not.toContain('/api/')
  })

  it('站点根：相对 ./；绝对为 origin 且既不含 /api 也不含 /content-remote', () => {
    expect(siteRootFrom('https://520305.top/api', false)).toBe('./')
    expect(siteRootFrom('https://520305.top/api', true)).toBe('https://520305.top')
    expect(siteRootFrom('https://520305.top/api', true)).not.toContain('/api')
    expect(siteRootFrom('https://520305.top/api', true)).not.toContain('content-remote')
    expect(siteRootFrom('http://127.0.0.1:3000/api', true)).toBe('http://127.0.0.1:3000')
  })

  it('非法 API_BASE 走兜底且不抛', () => {
    expect(() => siteRootFrom('not-a-url', true)).not.toThrow()
    expect(typeof siteRootFrom('not-a-url', true)).toBe('string')
  })

  it('当前环境（测试环境无 VITE_API_BASE）：内容根 ./content-remote、站点根 ./', () => {
    expect(contentRoot()).toBe('./content-remote')
    expect(siteRoot()).toBe('./')
  })

  it('MANIFEST_FILE 由 MANIFEST_PATH 派生（manifest.json）', () => {
    expect(MANIFEST_FILE).toBe('manifest.json')
  })
})
