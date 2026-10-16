// @vitest-environment jsdom
/**
 * 批 S5 · QA 独立对抗验证 —— A 组：**读时闸门边界** + **原子写提交点**
 *
 * 与工程师自带测试的区别（防「同源假绿」）：
 *   - 工程师的 `tests/asset-client.test.js` 用「逐个手写的期望值」断言；
 *     本文件改为**独立重推整张真值表**（按 `docs/remote-assets.md` §4.2 的文字口径
 *     重新实现一份期望函数），再把 `isFreshEntry` 的**笛卡尔积**全量比对 ——
 *     手写的期望值可能与实现犯同一个错；独立重推的真值表不会。
 *   - 原子写不只看「meta 没被写」，还看 **memory 回填边界**（失败那片是否污染了
 *     进程内缓存）与 **commitBestEffort 吞异常后数据是否仍然正确**（端到端，走 searchClient）。
 *
 * 覆盖攻击面：①（读时闸门边界，含 minVersion=0 / 条目无版本号）③（原子写提交点）
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  isFreshEntry, readByKey, commitAtomically, commitBestEffort, readLocalMaxVersion
} from '@/utils/assetClient'
import { isNewer } from '@/content/mergeContent'
import { CONTENT_META_KEY } from '@/content/contentManifest'
import { loadSearchMeta, resetSearchClient, SEARCH_META_KEY } from '@/utils/searchClient'
import { useStudyDbStore } from '@/stores/studyDb'

/** 取一个已初始化的真实 studyDb store（走 fake-indexeddb） */
async function realDb() {
  const db = useStudyDbStore()
  await db.init()
  return db
}

// ──────────────────────────────────────────────────────────────
// ① 读时闸门真值表：**独立重推**的期望
//
// 文档依据（`docs/remote-assets.md` §4.2）：
//   「判据写死：entry.version < minVersion 视为未命中」
//   「minVersion == null（本地无记录 / 读失败）→ 不拦，但也不写缓存」
//   「判据是「小于」不是「不等于」：entry.version 高于线上（回滚场景）仍算命中」
// 实现方：`isFreshEntry = !isNewer(minVersion, entry.version)`；
//   `isNewer` = 「r 非有限 → false；m 非有限 → true；否则 r > m」。
// 下面**只按这两段文字**重写，不复制实现代码。
// ──────────────────────────────────────────────────────────────
function expectedFresh(entry, minVersion) {
  if (!entry) return false                                          // 空条目 ≡ 未命中
  if (minVersion === null || minVersion === undefined) return true  // 不知道线上版本 → 不拦
  const r = Number(minVersion)
  if (!Number.isFinite(r)) return true                              // 比较基准无效 → 不拦（保守放行）
  const m = Number(entry.version)
  if (!Number.isFinite(m)) return false                             // 条目无版本号 → 视为落后
  return !(r > m)                                                   // 仅「小于」判陈旧
}

describe('A1 · isFreshEntry 真值表全量交叉验证（独立重推，非手写期望）', () => {
  const entries = [
    ['null', null],
    ['undefined', undefined],
    ["'' 空字符串", ''],
    ['0 数字', 0],
    ['[] 空数组', []],
    ['{} 无 version', {}],
    ['{version: undefined}', { version: undefined }],
    ['{version: null}', { version: null }],
    ['{version: NaN}', { version: NaN }],
    ['{version: 0}', { version: 0 }],
    ['{version: 2}', { version: 2 }],
    ['{version: 3}', { version: 3 }],
    ['{version: 4}', { version: 4 }],
    ["{version: '3'} 字符串", { version: '3' }],
    ["{version: 'abc'}", { version: 'abc' }],
    ["{version: ''}", { version: '' }]
  ]
  const versions = [
    ['null', null],
    ['undefined', undefined],
    ['0', 0],
    ['3', 3],
    ["'3'", '3'],
    ['NaN', NaN],
    ["'abc'", 'abc']
  ]

  it(`笛卡尔积 ${entries.length * versions.length} 格逐格比对（任一格不符即失败）`, () => {
    const bad = []
    for (const [eName, entry] of entries) {
      for (const [vName, mv] of versions) {
        const want = expectedFresh(entry, mv)
        const got = isFreshEntry(entry, mv)
        if (want !== got) bad.push(`entry=${eName}, minVersion=${vName}: 期望 ${want} / 实际 ${got}`)
      }
    }
    expect(bad, '真值表不符项：\n' + bad.join('\n')).toEqual([])
  })

  it('★ 边界：minVersion = 0 不得被当成「不知道版本」（防 !minVersion 写法）', () => {
    expect(isFreshEntry({ version: 0 }, 0)).toBe(true)   // 同代 → 命中
    expect(isFreshEntry({ version: 0 }, 1)).toBe(false)   // 落后 → 未命中
    expect(isFreshEntry({ version: 1 }, 0)).toBe(true)   // 回滚 → 仍命中
  })

  it('★ 边界：无版本号的缓存条目一律判「不新鲜」（防旧内容被新版本号盖章）', () => {
    const bads = [{}, { version: undefined }, { version: null }, { version: NaN }, { version: 'abc' }, { version: '' }]
    for (const b of bads) expect(isFreshEntry(b, 3), JSON.stringify(b)).toBe(false)
  })

  it('★ 边界：回滚场景（缓存版本高于本地已见版本）仍算命中', () => {
    expect(isFreshEntry({ version: 9 }, 3)).toBe(true)
    expect(isFreshEntry({ version: 3 }, 9)).toBe(false)
  })

  it('反向锚：本节断言对「恒真闸门」有鉴别力', () => {
    let diff = 0
    for (const [, entry] of entries) {
      for (const [, mv] of versions) {
        if (expectedFresh(entry, mv) !== true) diff += 1
      }
    }
    expect(diff, '真值表里竟没有一格为 false → 本节断言无鉴别力').toBeGreaterThan(0)
  })
})

describe('A2 · readLocalMaxVersion 边界（版本权威的取值口径）', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const db = await realDb()
    await db.clearContentCache()
  })

  it('contentVersion = 0 → 返回 0 而不是 null（0 是合法代次）', async () => {
    const db = await realDb()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 0, units: {} })
    expect(await readLocalMaxVersion(db)).toBe(0)
  })

  it('字符串数字 → 规整成数字；非数字 / 缺失 → null', async () => {
    const db = await realDb()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: '7', units: {} })
    expect(await readLocalMaxVersion(db)).toBe(7)

    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 'abc', units: {} })
    expect(await readLocalMaxVersion(db)).toBeNull()

    await db.saveContentMeta({ key: CONTENT_META_KEY, units: {} })
    expect(await readLocalMaxVersion(db)).toBeNull()
  })

  it('db 为 null（存储不可用）→ 返回 null 且**不抛**', async () => {
    await expect(readLocalMaxVersion(null)).resolves.toBeNull()
  })
})

describe('A3 · commitAtomically 原子写（body 先落 / meta 后交）', () => {
  it('★ 第 2 片写入抛错 → meta 不被写、异常向上抛、memory 只回填成功的那片', async () => {
    const calls = { cache: [], meta: [] }
    const db = {
      saveContentCache: vi.fn(async (e) => {
        if (e.key === 'b') throw new Error('disk full')
        calls.cache.push(e.key)
      }),
      saveContentMeta: vi.fn(async (r) => { calls.meta.push(r) })
    }
    const memory = new Map()
    const entries = [{ key: 'a', version: 3, payload: 1 }, { key: 'b', version: 3, payload: 2 }]

    await expect(
      commitAtomically(db, entries, { key: CONTENT_META_KEY, contentVersion: 3 }, { memory })
    ).rejects.toThrow('disk full')

    expect(calls.meta, '提交点未到 → meta 一滴都不该写').toEqual([])
    expect(calls.cache, '失败点之前的片按序落了（允许，幂等重拉即可）').toEqual(['a'])
    expect([...memory.keys()], '失败那片绝不能进进程内缓存').toEqual(['a'])
  })

  it('metaPatch 为 null → 只落 body，一次 meta 都不写（读路径缓存写）', async () => {
    const meta = []
    const db = {
      saveContentCache: vi.fn(async () => {}),
      saveContentMeta: vi.fn(async (r) => { meta.push(r) })
    }
    const res = await commitAtomically(db, [{ key: 'search:meta', version: 3, payload: [] }], null)
    expect(res.written).toBe(1)
    expect(meta).toEqual([])
  })

  it('db 为 null → 空操作（返回 skipped），不抛也不写', async () => {
    const res = await commitAtomically(null, [{ key: 'x' }], { key: CONTENT_META_KEY })
    expect(res).toMatchObject({ written: 0, skipped: true })
  })

  it('全部成功 → meta 在**最后**被写（提交点顺序）', async () => {
    const seq = []
    const db = {
      saveContentCache: vi.fn(async (e) => { seq.push('cache:' + e.key) }),
      saveContentMeta: vi.fn(async () => { seq.push('meta') })
    }
    await commitAtomically(db, [{ key: 'a' }, { key: 'b' }], { key: CONTENT_META_KEY })
    expect(seq).toEqual(['cache:a', 'cache:b', 'meta'])
  })

  it('反向锚：把 meta 提到循环前（坏实现）→ 上面的「第 2 片抛错」断言会失效', async () => {
    // 证明「meta 后交」这条断言真的在咬：坏实现下 meta 已被写入。
    const calls = { cache: [], meta: [] }
    const db = {
      saveContentCache: vi.fn(async (e) => {
        if (e.key === 'b') throw new Error('disk full')
        calls.cache.push(e.key)
      }),
      saveContentMeta: vi.fn(async (r) => { calls.meta.push(r) })
    }
    const badImpl = async (db, entries, metaPatch) => {
      if (metaPatch) await db.saveContentMeta(metaPatch)
      for (const e of entries) await db.saveContentCache(e)
      return { written: entries.length }
    }
    await badImpl(db, [{ key: 'a' }, { key: 'b' }], { key: CONTENT_META_KEY }).catch(() => {})
    expect(calls.meta.length, '坏实现竟然也没写 meta → 上节断言无鉴别力').toBe(1)
  })
})

describe('A4 · commitBestEffort：写缓存失败不得污染「本次返回的数据」', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    resetSearchClient()
    const db = await realDb()
    await db.clearContentCache()
  })

  it('存储写入抛错（配额 / 事务中断）→ 吞掉异常并返回 failed，不向上抛', async () => {
    const db = {
      saveContentCache: vi.fn(async () => { throw new Error('QuotaExceededError') }),
      saveContentMeta: vi.fn(async () => {})
    }
    const res = await commitBestEffort(db, [{ key: 'k', version: 3, payload: [1] }], null, { memory: new Map() })
    expect(res).toMatchObject({ written: 0, failed: true })
  })

  it('★ 端到端：缓存写失败时 loadSearchMeta 仍返回**本次远程取回的**正确数据', async () => {
    // 红线 2 的可执行判据：「存储故障 ≠ 内容故障」。
    // 若实现让 commitAtomically 的异常冒到调用方，这里会 reject（= 缺陷）。
    const db = await realDb()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    vi.spyOn(db, 'saveContentCache').mockRejectedValue(new Error('QuotaExceededError'))

    const FRESH = [{ subject: 'math', unitNum: '01', fileIndex: 0, title: '新鲜的', unitTitle: 'u' }]
    const orig = globalThis.fetch
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => FRESH }))
    try {
      await expect(loadSearchMeta()).resolves.toEqual(FRESH)
      // 且不是「假成功」：缓存确实没写进去
      expect(await db.getContentCache(SEARCH_META_KEY)).toBeNull()
    } finally {
      globalThis.fetch = orig
      vi.restoreAllMocks()
    }
  })

  it('正向对照：存储正常时缓存**确实**被写入，二次调用零 fetch', async () => {
    const db = await realDb()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    const FRESH = [{ subject: 'math', unitNum: '01', fileIndex: 0, title: '新鲜的', unitTitle: 'u' }]
    const orig = globalThis.fetch
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => FRESH }))
    try {
      await expect(loadSearchMeta()).resolves.toEqual(FRESH)
      expect(globalThis.fetch.mock.calls.length).toBe(1)
      const row = await db.getContentCache(SEARCH_META_KEY)
      expect(row.version).toBe(3)
      await expect(loadSearchMeta()).resolves.toEqual(FRESH)
      expect(globalThis.fetch.mock.calls.length, '二次应命中缓存').toBe(1)
    } finally {
      globalThis.fetch = orig
    }
  })
})

describe('A5 · readByKey 与 isFreshEntry 语义一致（交叉验证）', () => {
  it('IDB 里版本落后的条目 → source = stale 且 entry 为 null', async () => {
    const store = { getContentCache: vi.fn(async () => ({ key: 'k', version: 2, payload: 'OLD' })) }
    const r = await readByKey(store, 'k', { minVersion: 3 })
    expect(r.source).toBe('stale')
    expect(r.entry).toBeNull()
  })

  it('IDB 里版本够新的条目 → source = idb，且回填 memory', async () => {
    const store = { getContentCache: vi.fn(async () => ({ key: 'k', version: 3, payload: 'NEW' })) }
    const memory = new Map()
    const r = await readByKey(store, 'k', { memory, minVersion: 3 })
    expect(r.source).toBe('idb')
    expect(memory.get('k').payload).toBe('NEW')
  })

  // R-S5-A 修复后的契约：IDB 拿不到 ≠ 手里的旧值该扔。报 stale 让调用方有得兜底。
  it('★ memory 有陈旧条目而 IDB 为空（被清过）→ stale，且裸读能拿回旧值', async () => {
    const store = { getContentCache: vi.fn(async () => null) }
    const memory = new Map([['k', { key: 'k', version: 2, payload: 'OLD' }]])
    const r = await readByKey(store, 'k', { memory, minVersion: 3 })
    expect(r.source).toBe('stale')
    expect(r.entry).toBeNull()
    // 调用方的第二次裸读（minVersion: null）→ 拿回内存里那份旧值
    const raw = await readByKey(store, 'k', { memory, minVersion: null })
    expect(raw.source).toBe('memory')
    expect(raw.entry.payload).toBe('OLD')
  })

  it('★ IDB 读抛错 → 只要有内存旧值就报 stale（不白丢），否则才是 error', async () => {
    const store = { getContentCache: vi.fn(async () => { throw new Error('IDB broken') }) }
    const memory = new Map([['k', { key: 'k', version: 2, payload: 'OLD' }]])
    const r = await readByKey(store, 'k', { memory, minVersion: 3 })
    expect(r.source).toBe('stale')
    // 没有内存旧值时才是 error（这个分支要让故障可观测，不能拿 stale 掩盖）
    const bare = await readByKey(store, 'k', { minVersion: 3 })
    expect(bare.source).toBe('error')
    expect(bare.entry).toBeNull()
  })

  it('store 为 null → miss，且不抛（红线 2）', async () => {
    await expect(readByKey(null, 'k', { minVersion: 3 })).resolves.toMatchObject({ source: 'miss' })
  })

  it('store 为 null 但内存有旧值 → stale（离线时仍能兜底）', async () => {
    const memory = new Map([['k', { key: 'k', version: 2, payload: 'OLD' }]])
    const r = await readByKey(null, 'k', { memory, minVersion: 3 })
    expect(r.source).toBe('stale')
  })
})

describe('A6 · isNewer 与闸门方向一致性（防「比较反了 / 字典序」）', () => {
  it('isNewer(a,b) = a 严格大于 b；非有限值一律不前进', () => {
    expect(isNewer(4, 3)).toBe(true)
    expect(isNewer(3, 3)).toBe(false)
    expect(isNewer(2, 3)).toBe(false)
    expect(isNewer(3, null)).toBe(true)
    expect(isNewer(NaN, 3)).toBe(false)
  })

  it('★ 数值比较而非字典序："9" 与 "10"', () => {
    expect(isNewer('10', '9')).toBe(true)
    expect(isNewer('9', '10')).toBe(false)
  })

  it('★ 闸门方向全格成立（minVersion 非 null 时）：isFreshEntry ≡ !isNewer(minVersion, entry.version)', () => {
    const samples = [null, undefined, 0, 1, 3, 9, '3', 'abc', NaN]
    for (const mv of samples) {
      if (mv === null || mv === undefined) continue // null 走有意短路，单独断言（见下）
      for (const ev of samples) {
        expect(isFreshEntry({ version: ev }, mv)).toBe(!isNewer(mv, ev))
      }
    }
  })

  it('★ 记录口径差异：minVersion 为 null 时 isFreshEntry 短路放行，**不等价于** !isNewer(null, ev)', () => {
    // 这一格是**有意为之**（docs §4.2：不知道线上版本 → 不拦，离线场景必须能用缓存），
    // 但实现上它与 `!isNewer` 不同源 —— 因为 `Number(null) === 0` 是有限值，
    // `isNewer(null, undefined)` 会走到「m 非有限 → true」分支。
    // 任何后续重构若把 isFreshEntry 简化成 `!isNewer(...)`，离线首开就会从「能用」变成「抛错」。
    expect(isFreshEntry({ version: undefined }, null)).toBe(true)
    expect(!isNewer(null, undefined)).toBe(false) // ← 二者确实不同，故不能互相替换
    expect(isFreshEntry({ version: 3 }, null)).toBe(true)
    expect(isFreshEntry({ version: 0 }, null)).toBe(true)
  })
})
