/**
 * contentClient 客户端 loader 测试（批 S2 · 提交②）
 *
 * 钉死：基址派生（P-S16 强制修正）/ 版本闸门（等值·更旧不写）/ 增量拉取 /
 *      单片失败静默跳过 / 哈希不符丢弃该页 / 原子写后读命中。
 *
 * ⚠️ 环境纪律（批 F「干净树 6 跳过」同款陷阱）：`public/content-remote/` 已被 S1 写进
 *    .gitignore → 干净工作树没有产物，故本文件**一律 mock fetch + 注入 fixture**，不读盘。
 *    IndexedDB 用既有 devDependency `fake-indexeddb`。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  refreshIfNewer, getRemotePage, contentRoot, contentRootFrom, isValidManifest,
  buildShardEntry, resetContentClient, startBackgroundRefresh,
  MANIFEST_FILE, CONTENT_META_KEY
} from '@/utils/contentClient'
import { useStudyDbStore } from '@/stores/studyDb'
import { useContentStore } from '@/stores/content'
import { SCHEMA_VERSION, OP, HASH_PREFIX } from '@/content/contentManifest'

const BASE = './content-remote'
const ORIGINAL_FETCH = globalThis.fetch

/** 合法形态哈希（64 位十六进制） */
const HASH = (c = 'a') => HASH_PREFIX + c.repeat(64)

/** 造一页远程内容 */
function page(fileIndex, hashChar = 'a', op = OP.UPSERT, blocks = undefined) {
  return {
    subject: 'math',
    unitNum: '01',
    fileIndex,
    fileKey: `math_01_第${fileIndex}页`,
    op,
    blocks: blocks ?? [{ type: 'text', text: `远程-${fileIndex}` }],
    hash: HASH(hashChar)
  }
}

/** 造一份清单；unitHashes: { unitKey: hashChar } */
function manifestOf(version, unitHashes = { 'math/01': 'a' }) {
  const units = {}
  for (const [k, c] of Object.entries(unitHashes)) {
    units[k] = {
      hash: HASH(c), updatedAt: '2026-01-01T00:00:00.000Z',
      path: `${k}.json`, count: 1, version
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    contentVersion: version,
    contentHash: HASH('c'),
    generatedAt: '2026-01-01T00:00:00.000Z',
    units
  }
}

/** 造一个分片 */
function shardOf(unitKey, version, pages) {
  return { schemaVersion: SCHEMA_VERSION, contentVersion: version, unitKey, pages }
}

const okJson = (data) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })
const notFound = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })

/**
 * 装 fetch 替身：routes 以「相对 content-root 的路径」为键
 * @param {Record<string, () => Promise<object>>} routes
 */
function mockFetch(routes) {
  globalThis.fetch = vi.fn((url) => {
    const rel = String(url).replace(/^.*content-remote\//, '')
    const handler = routes[rel]
    return handler ? handler() : notFound()
  })
}

/** 把 content_meta 复位到「本地已见版本 = seenVersion（null 表示从未拉到）」 */
async function resetMeta(seenVersion = null, units = {}) {
  const db = useStudyDbStore()
  await db.init()
  await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: seenVersion, units })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  resetContentClient()
  const db = useStudyDbStore()
  await db.init()
  await db.clearContentCache()
  await resetMeta(null, {})
})

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

describe('contentRoot · 基址派生（P-S16 强制修正）', () => {
  it('相对模式（dev / Web 生产）→ ./content-remote（与既有静态产物同款纪律）', () => {
    expect(contentRoot()).toBe('./content-remote')
    expect(contentRootFrom('/api', false)).toBe('./content-remote')
  })

  it('绝对模式 → 取 **origin**，剥离 /api 路径段（否则会稳定 404）', () => {
    expect(contentRootFrom('https://520305.top/api', true))
      .toBe('https://520305.top/content-remote')
  })

  it('绝对模式即使 API_BASE 不带 /api 也只取 origin', () => {
    expect(contentRootFrom('https://520305.top', true)).toBe('https://520305.top/content-remote')
    expect(contentRootFrom('https://520305.top/api/v2', true)).toBe('https://520305.top/content-remote')
  })

  it('保留端口（自托管场景）', () => {
    expect(contentRootFrom('http://127.0.0.1:3000/api', true))
      .toBe('http://127.0.0.1:3000/content-remote')
  })
})

describe('isValidManifest · 清单形态校验', () => {
  it('合法清单 → true', () => {
    expect(isValidManifest(manifestOf(2))).toBe(true)
  })

  it('协议版本不符 → false（宁可继续用内置，也不按错误协议解析）', () => {
    expect(isValidManifest({ ...manifestOf(2), schemaVersion: 99 })).toBe(false)
  })

  it('units 缺失 / contentVersion 非数字 → false', () => {
    expect(isValidManifest({ ...manifestOf(2), units: null })).toBe(false)
    expect(isValidManifest({ ...manifestOf(2), contentVersion: 'v2' })).toBe(false)
    expect(isValidManifest(null)).toBe(false)
  })
})

describe('buildShardEntry · 分片整理（逐页轻量校验）', () => {
  const unit = { hash: HASH('a'), version: 2, path: 'math/01.json', updatedAt: 'T', count: 1 }

  it('正常分片 → 条目 + pageHashes 键为 unitNum/fileIndex', () => {
    const entry = buildShardEntry('math/01', unit, shardOf('math/01', 2, [page(0), page(1)]))
    expect(entry.key).toBe('math/01')
    expect(entry.pages).toHaveLength(2)
    expect(Object.keys(entry.pageHashes)).toEqual(['01/0', '01/1'])
  })

  it('unitKey / contentVersion 对不上 → null', () => {
    expect(buildShardEntry('math/02', unit, shardOf('math/01', 2, [page(0)]))).toBeNull()
    expect(buildShardEntry('math/01', unit, shardOf('math/01', 3, [page(0)]))).toBeNull()
  })

  it('非 UPSERT（append 等未知 op）→ 静默忽略该页（P-S19 a）', () => {
    const entry = buildShardEntry('math/01', unit, shardOf('math/01', 2, [
      page(0, 'a', OP.APPEND)
    ]))
    expect(entry).toBeNull()
  })

  it('结构不过 / 哈希形态非法 → 丢弃该页，不影响同分片其它页', () => {
    const entry = buildShardEntry('math/01', unit, shardOf('math/01', 2, [
      page(0),
      { ...page(1), blocks: 'oops' },
      { ...page(2), hash: 'nonsense' }
    ]))
    expect(entry.pages).toHaveLength(1)
    expect(entry.pages[0].fileIndex).toBe(0)
  })
})

describe('refreshIfNewer · 版本闸门 + 增量 + 原子写', () => {
  it('首次（本地无记录）→ 拉清单 + 分片，写缓存并命中', async () => {
    mockFetch({
      [MANIFEST_FILE]: () => okJson(manifestOf(2)),
      'math/01.json': () => okJson(shardOf('math/01', 2, [page(0), page(1)]))
    })
    const res = await refreshIfNewer({ base: BASE })
    expect(res.updated).toBe(true)
    expect(res.version).toBe(2)

    resetContentClient() // 清掉进程内缓存，强制走 IndexedDB
    const p0 = await getRemotePage('math', '01', 0)
    expect(p0.blocks[0].text).toBe('远程-0')
    expect(await getRemotePage('math', '01', 1)).not.toBeNull()
    expect(await getRemotePage('math', '01', 9)).toBeNull() // 越界 → null
  })

  it('原子写：body 先落、meta 后写（提交点），且 meta 只登记写成功的片', async () => {
    mockFetch({
      [MANIFEST_FILE]: () => okJson(manifestOf(2, { 'math/01': 'a', 'math/02': 'b' })),
      'math/01.json': () => okJson(shardOf('math/01', 2, [page(0)])),
      'math/02.json': () => Promise.reject(new TypeError('Failed to fetch'))
    })
    const res = await refreshIfNewer({ base: BASE })
    expect(res.units).toEqual(['math/01']) // 失败片不计入

    const db = useStudyDbStore()
    const meta = await db.getContentMeta(CONTENT_META_KEY)
    expect(meta.contentVersion).toBe(2)
    // 失败片保留清单里的新哈希？不 —— 只有写成功的片才更新，失败片下次会再拉
    expect(meta.units['math/01'].hash).toBe(HASH('a'))
    expect(meta.units['math/02']).toBeUndefined()
    expect(await db.getContentCache('math/02')).toBeNull()
  })

  it('等值版本 → 不写（reason=not-newer，缓存原样）', async () => {
    const db = useStudyDbStore()
    await db.saveContentCache({ key: 'math/01', version: 2, hash: HASH('a'), pageHashes: {}, pages: [] })
    await resetMeta(2, { 'math/01': { hash: HASH('a'), version: 2 } })
    mockFetch({ [MANIFEST_FILE]: () => okJson(manifestOf(2)) })

    const res = await refreshIfNewer({ base: BASE })
    expect(res.updated).toBe(false)
    expect(res.reason).toBe('not-newer')
    // 关键：清单被拉了，但**分片一次都没拉**（等值不重写 = 零写放大）
    const urls = globalThis.fetch.mock.calls.map((c) => c[0])
    expect(urls).toEqual(['./content-remote/manifest.json'])
    expect((await db.getContentCache('math/01')).pages).toEqual([])
  })

  it('更旧版本 → 一律不写（前进式回滚，杜绝回退事故）', async () => {
    const db = useStudyDbStore()
    await db.saveContentCache({ key: 'math/01', version: 5, hash: HASH('z'), pageHashes: {}, pages: [page(0)] })
    await resetMeta(5, { 'math/01': { hash: HASH('z'), version: 5 } })
    mockFetch({
      [MANIFEST_FILE]: () => okJson(manifestOf(3)),
      'math/01.json': () => okJson(shardOf('math/01', 3, [page(9)]))
    })

    const res = await refreshIfNewer({ base: BASE })
    expect(res.updated).toBe(false)
    expect(res.reason).toBe('not-newer')
    expect((await db.getContentMeta(CONTENT_META_KEY)).contentVersion).toBe(5)
    expect((await db.getContentCache('math/01')).version).toBe(5)
  })

  it('增量：哈希未变的单元**不重新拉取**', async () => {
    await resetMeta(2, { 'math/01': { hash: HASH('a'), version: 2 } })
    mockFetch({
      [MANIFEST_FILE]: () => okJson(manifestOf(3, { 'math/01': 'a', 'math/02': 'b' })),
      'math/02.json': () => okJson(shardOf('math/02', 3, [page(0)]))
    })
    const res = await refreshIfNewer({ base: BASE })
    expect(res.units).toEqual(['math/02'])
    const urls = globalThis.fetch.mock.calls.map((c) => c[0])
    expect(urls).not.toContain('./content-remote/math/01.json')
  })

  it('离线 / 网络失败 → 静默跳过（resolved，不抛）', async () => {
    mockFetch({ [MANIFEST_FILE]: () => Promise.reject(new TypeError('Failed to fetch')) })
    await expect(refreshIfNewer({ base: BASE })).resolves.toMatchObject({ updated: false, reason: 'error' })
  })

  it('清单解析失败（非法 JSON）→ 静默跳过', async () => {
    mockFetch({
      [MANIFEST_FILE]: () => Promise.resolve({
        ok: true, status: 200, json: () => Promise.reject(new SyntaxError('bad json'))
      })
    })
    const res = await refreshIfNewer({ base: BASE })
    expect(res).toMatchObject({ updated: false, reason: 'error' })
  })

  it('协议版本不认识的清单 → 不消费', async () => {
    mockFetch({ [MANIFEST_FILE]: () => okJson({ ...manifestOf(2), schemaVersion: 99 }) })
    const res = await refreshIfNewer({ base: BASE })
    expect(res.reason).toBe('invalid-manifest')
  })

  it('写入后通知 content store（P-S13 a）', async () => {
    mockFetch({
      [MANIFEST_FILE]: () => okJson(manifestOf(4)),
      'math/01.json': () => okJson(shardOf('math/01', 4, [page(0)]))
    })
    await refreshIfNewer({ base: BASE })
    const store = useContentStore()
    expect(store.contentVersion).toBe(4)
    expect(store.updatedUnits).toEqual(['math/01'])
    expect(store.hasUpdate).toBe(true)
  })
})

describe('getRemotePage · 读缓存（离线优先）', () => {
  it('无缓存 → null（由 loadPage 回落内置）', async () => {
    expect(await getRemotePage('math', '01', 0)).toBeNull()
  })

  it('命中 → 返回远程页；哈希不符 → 丢弃该页（只影响这一页）', async () => {
    const db = useStudyDbStore()
    await db.saveContentCache({
      key: 'math/01',
      version: 2,
      hash: HASH('a'),
      pageHashes: { '01/0': HASH('a'), '01/1': HASH('WRONG-NOT-HEX') },
      pages: [page(0, 'a'), page(1, 'a')]
    })
    expect(await getRemotePage('math', '01', 0)).not.toBeNull()
    // pageHashes['01/1'] 形态非法 → verifyHash 判 false → 该页丢弃
    expect(await getRemotePage('math', '01', 1)).toBeNull()
  })

  it('缓存里的页哈希被写坏 → 该页丢弃（回退内置）', async () => {
    const db = useStudyDbStore()
    await db.saveContentCache({
      key: 'math/01',
      version: 2,
      hash: HASH('a'),
      pageHashes: { '01/0': HASH('a') },
      pages: [{ ...page(0), hash: HASH('b') }] // 与登记的哈希不符
    })
    expect(await getRemotePage('math', '01', 0)).toBeNull()
  })

  it('结构不可用（blocks 非数组）→ null', async () => {
    const db = useStudyDbStore()
    await db.saveContentCache({
      key: 'math/01', version: 2, hash: HASH('a'),
      pageHashes: {}, pages: [{ ...page(0), blocks: null }]
    })
    expect(await getRemotePage('math', '01', 0)).toBeNull()
  })
})

describe('startBackgroundRefresh · 后台静默（P-S11 a / P-S14 a）', () => {
  it('一次会话只触发一次，且不抛', async () => {
    mockFetch({ [MANIFEST_FILE]: () => notFound() })
    expect(startBackgroundRefresh({ base: BASE })).toBe(true)
    expect(startBackgroundRefresh({ base: BASE })).toBe(false)
    await new Promise((r) => setTimeout(r, 10))
  })
})
