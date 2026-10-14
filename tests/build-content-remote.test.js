/**
 * 内容快照发布脚本测试（批 S1）
 *
 * 只测 `collectSnapshot()` —— **纯函数、不落盘**（构建侧写作在 build() 里，被 argv 守卫挡住），
 * 因此本文件不会往 public/ 写任何东西（照 build-search-index.mjs 的 collectIndex() 模式）。
 *
 * 覆盖：① pages 结构 + op ② hash 稳定 / 敏感 ③ contentHash 不受 generatedAt 影响
 *       ④ sitePatch 空结构 + hash 稳定 ⑤ 校验失败 → 不产出 ⑥ 超限只告警不截断
 *       ⑦ OPTIONAL_SECTIONS 键位为 null
 *
 * 注入手段：用 vi.hoisted 的开关 + vi.mock 覆写 `importFresh` —— 保留真实遍历 / 元信息 /
 * 校验链路，只在需要时让内容「变坏 / 变一字节」，避免为测试引入第二条内容读取路径。
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { createHash } from 'node:crypto'

// 模式开关：'none' 原样 / 'bad' 非法内容 / 'mutated' 改一字节（vi.hoisted 保证工厂可用）
vi.mock('../scripts/lib/load-content.mjs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    importFresh: async (file) => {
      // 坏内容：warning 缺 text → validateBlock 必报「text 为空」
      if (ctl.mode === 'bad') return { default: { blocks: [{ type: 'warning' }] } }
      const mod = await actual.importFresh(file)
      if (ctl.mode === 'mutated') {
        const blocks = mod.default?.blocks
        // 改一字节：给首块加一个不参与语义的键 → hash 必变，但校验仍通过、页数不变
        if (Array.isArray(blocks) && blocks[0]) {
          return { default: { blocks: [{ ...blocks[0], __mut: 'X' }, ...blocks.slice(1)] } }
        }
      }
      return mod
    }
  }
})

const ctl = vi.hoisted(() => ({ mode: 'none' }))

const { collectSnapshot, canonicalJSON, hashOf, assertManifestInvariants } = await import(
  '../scripts/build-content-remote.mjs'
)
const { OPTIONAL_SECTIONS, OP, SHARD_WARN_BYTES, REMOTE_DIR, MANIFEST_PATH, CONTENT_VERSION } = await import(
  '../src/content/contentManifest.js'
)

const T1 = '2026-01-01T00:00:00.000Z'
const T2 = '2026-06-30T12:34:56.000Z'

let snapA = null
let snapB = null

beforeAll(async () => {
  snapA = await collectSnapshot({ generatedAt: T1 })
  snapB = await collectSnapshot({ generatedAt: T2 })
}, 120000)

afterEach(() => {
  ctl.mode = 'none'
  vi.restoreAllMocks()
})

/** 全部页（跨分片展平） */
const allPages = (snap) => snap.shards.flatMap((s) => s.json.pages)

describe('① 分片与页结构', () => {
  it('每个分片含 schemaVersion/contentVersion/unitKey/pages', () => {
    expect(snapA.shards.length).toBeGreaterThan(0)
    for (const s of snapA.shards) {
      expect(Object.keys(s.json)).toEqual(['schemaVersion', 'contentVersion', 'unitKey', 'pages'])
      expect(s.json.unitKey).toMatch(/^(math|chinese|computer)\//)
      expect(Array.isArray(s.json.pages)).toBe(true)
      expect(s.json.pages.length).toBeGreaterThan(0)
    }
  })

  it('每页含坐标六件套 + blocks，且 op 恒为 upsert（B1）', () => {
    const pages = allPages(snapA)
    expect(pages.length).toBe(183) // 内容页总数（与 collectFiles 一致）；+1 = computer 04 单元新增「09-作品训练卡（三遍法）」
    for (const p of pages) {
      expect(Object.keys(p)).toEqual(['subject', 'unitNum', 'fileIndex', 'fileKey', 'op', 'blocks', 'hash'])
      expect(p.op).toBe(OP.UPSERT)
      expect(typeof p.unitNum).toBe('string') // 字符串，如 "01"
      expect(typeof p.fileIndex).toBe('number') // 数字，坐标身份
      // fileKey 由 pageMeta.pageFileKeyOf(meta) 派生：学科_单元号_页名
      expect(p.fileKey.startsWith(`${p.subject}_${p.unitNum}_`)).toBe(true)
      expect(Array.isArray(p.blocks)).toBe(true)
      expect(p.hash).toMatch(/^sha256:[0-9a-f]{64}$/)
    }
  })

  it('blocks 与内置同构且原样搬运（不截断、不精简）', () => {
    // 用一份真实页做抽样：blocks 内区块必须都带 type，且至少有内容字段
    const p = allPages(snapA)[0]
    expect(p.blocks.length).toBeGreaterThan(0)
    for (const b of p.blocks) {
      expect(typeof b.type).toBe('string')
      expect(Object.keys(b).length).toBeGreaterThan(1)
    }
  })

  it('manifest.units 的 path 是相对 content-remote/ 的路径（不带前缀）', () => {
    for (const [uk, u] of Object.entries(snapA.manifest.units)) {
      expect(u.path).toBe(`${uk}.json`)
      expect(u.path.startsWith(REMOTE_DIR)).toBe(false)
      expect(u.path.startsWith('public/')).toBe(false)
      expect(u.count).toBeGreaterThan(0)
      expect(u.version).toBe(snapA.manifest.contentVersion)
      expect(u.hash).toMatch(/^sha256:[0-9a-f]{64}$/)
    }
  })
})

describe('② hash 稳定与敏感', () => {
  it('同内容两次采集 → 每页 hash 与 contentHash 完全相等', () => {
    const a = allPages(snapA)
    const b = allPages(snapB)
    expect(a.length).toBe(b.length)
    for (let i = 0; i < a.length; i++) {
      expect(a[i].fileKey).toBe(b[i].fileKey)
      expect(a[i].hash).toBe(b[i].hash)
    }
    expect(snapA.manifest.contentHash).toBe(snapB.manifest.contentHash)
  })

  it('内容改一字节 → pageHash 与 contentHash 均变号', async () => {
    ctl.mode = 'mutated'
    const mut = await collectSnapshot({ generatedAt: T1 })
    ctl.mode = 'none'
    expect(mut.manifest.contentHash).not.toBe(snapA.manifest.contentHash)
    // 页数不变（只改内容，不改坐标）
    expect(allPages(mut).length).toBe(allPages(snapA).length)
  }, 60000)

  it('pageHash 只由坐标 + blocks 决定（不含 hash 自身、不含 generatedAt）', () => {
    const p = allPages(snapA)[0]
    const { hash, ...rest } = p // rest = 坐标 + blocks
    // ① 由「坐标 + blocks」重建 → 与原 hash 相等：证明不含 generatedAt / updatedAt 等时间字段
    expect(hashOf(rest)).toBe(hash)
    // ② 把 hash 自身塞回去再算 → 变号：证明口径是「不含自身」
    expect(hashOf({ ...rest, hash })).not.toBe(hash)
    // ③ 塞一个 generatedAt 不影响：该字段本就不在参与集合里
    expect(hashOf({ ...rest, generatedAt: T2 })).not.toBe(hash)
  })
})

describe('③ contentHash 不受 generatedAt 影响', () => {
  it('注入两个不同 generatedAt → contentHash 相等，但 manifest.generatedAt 不同', () => {
    expect(snapA.manifest.generatedAt).toBe(T1)
    expect(snapB.manifest.generatedAt).toBe(T2)
    expect(snapA.manifest.contentHash).toBe(snapB.manifest.contentHash)
  })

  it('contentHash 按 fileKey 升序 join —— 不受分片分组/顺序影响', () => {
    const pages = allPages(snapA)
    const byFileKey = (list) => list.slice().sort((x, y) => (x.fileKey < y.fileKey ? -1 : x.fileKey > y.fileKey ? 1 : 0))
    const h = (list) => 'sha256:' + createHash('sha256')
      .update(list.map((p) => `${p.fileKey}:${p.hash}`).join('\n'), 'utf-8').digest('hex')
    const sorted = byFileKey(pages)
    // ① 脚本算出的 contentHash 等于「按 fileKey 升序」这一规范序的结果 → 排序确实生效
    expect(h(sorted)).toBe(snapA.manifest.contentHash)
    // ② 打乱（模拟分片分组/顺序不同）后**再归一**仍是同一个值 → 结果只依赖规范序，不依赖到达顺序
    const shuffledThenSorted = byFileKey(pages.slice().sort(() => 0.5 - Math.random()))
    expect(h(shuffledThenSorted)).toBe(snapA.manifest.contentHash)
    // ③ 反证：不排序会得到另一个值 → 排序不是巧合，而是 contentHash 稳定的必要步骤
    expect(h(sorted.slice().reverse())).not.toBe(snapA.manifest.contentHash)
  })
})

describe('④ sitePatch（B1 空结构）', () => {
  it('sitePatch 恰为 { units:{}, fileMetaUpdates:[] }', () => {
    expect(snapA.manifest.sitePatch).toEqual({ units: {}, fileMetaUpdates: [] })
    expect(Object.keys(snapA.manifest.sitePatch)).toEqual(['units', 'fileMetaUpdates'])
  })

  it('sitePatchHash 稳定（两次采集相等）', () => {
    expect(snapA.manifest.sitePatchHash).toBe(snapB.manifest.sitePatchHash)
    expect(snapA.manifest.sitePatchHash).toMatch(/^sha256:[0-9a-f]{64}$/)
  })
})

describe('⑤ 校验失败 → 不产出任何分片', () => {
  it('内容含非法区块 → 抛错并带 errors 明细，且无任何分片产出', async () => {
    ctl.mode = 'bad'
    let thrown = null
    let result = null
    try {
      result = await collectSnapshot({ generatedAt: T1 })
    } catch (e) {
      thrown = e
    }
    ctl.mode = 'none'
    expect(result).toBeNull()
    expect(thrown).toBeTruthy()
    expect(Array.isArray(thrown.errors)).toBe(true)
    expect(thrown.errors.length).toBeGreaterThan(0)
    expect(thrown.errors.some((e) => e.includes('text 为空'))).toBe(true)
  }, 60000)
})

describe('⑥ 超限只告警、不截断', () => {
  it('注入极小 warnBytes → console.warn 点名分片，但内容原样保留', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const small = await collectSnapshot({ generatedAt: T1, warnBytes: 1 })
    expect(warn).toHaveBeenCalled()
    expect(warn.mock.calls.some((c) => String(c[0]).includes('content-remote'))).toBe(true)
    // 不截断：页数与块数都与基线一致
    expect(allPages(small).length).toBe(allPages(snapA).length)
    expect(small.manifest.contentHash).toBe(snapA.manifest.contentHash)
  }, 60000)

  it('默认阈值 SHARD_WARN_BYTES 为正整数（供构建期使用）', () => {
    expect(Number.isInteger(SHARD_WARN_BYTES)).toBe(true)
    expect(SHARD_WARN_BYTES).toBeGreaterThan(0)
  })
})

describe('⑦ S5+ 预留键位（P-S07 a）', () => {
  it('manifest 顶层含 search / practice 且为 null', () => {
    for (const key of OPTIONAL_SECTIONS) {
      expect(key in snapA.manifest).toBe(true)
      expect(snapA.manifest[key]).toBeNull()
    }
    expect(snapA.manifest.search).toBeNull()
    expect(snapA.manifest.practice).toBeNull()
  })
})

describe('⑧ 产物清单不变量自检（批 S4 · S4-4b）', () => {
  it('真实采集的清单 + 分片数 → 通过（构建期同一口径）', () => {
    expect(assertManifestInvariants(snapA.manifest, { shardCount: snapA.shards.length })).toBe(true)
  })

  it('分片数传错（与 units 键数不符）→ 抛', () => {
    let thrown = null
    try {
      assertManifestInvariants(snapA.manifest, { shardCount: snapA.shards.length + 1 })
    } catch (e) { thrown = e }
    expect(thrown).toBeTruthy()
    expect(thrown.errors.join('|')).toMatch(/与分片数 \d+ 不一致/)
  })

  it('contentVersion 低于源码常量 → 抛（构建期不应倒退）', () => {
    const bad = { ...snapA.manifest, contentVersion: CONTENT_VERSION - 1 }
    let thrown = null
    try { assertManifestInvariants(bad, { shardCount: snapA.shards.length }) } catch (e) { thrown = e }
    expect(thrown).toBeTruthy()
    expect(thrown.errors.join('|')).toMatch(/CONTENT_VERSION/)
  })

  it('sitePatch 被填非空 → 抛（B1 不得产出导航变更）', () => {
    const bad = { ...snapA.manifest, sitePatch: { units: { 'math/01': {} }, fileMetaUpdates: [] } }
    let thrown = null
    try { assertManifestInvariants(bad, { shardCount: snapA.shards.length }) } catch (e) { thrown = e }
    expect(thrown).toBeTruthy()
    expect(thrown.errors.join('|')).toMatch(/sitePatch\.units 应为空对象/)
  })
})

describe('canonicalJSON / hashOf 口径（P-S06 b）', () => {
  it('对象键升序归一（键序不同 → 同一串），数组保序', () => {
    expect(canonicalJSON({ b: 1, a: 2 })).toBe(canonicalJSON({ a: 2, b: 1 }))
    expect(canonicalJSON([1, 2])).not.toBe(canonicalJSON([2, 1]))
  })

  it('undefined 值被剔除', () => {
    expect(canonicalJSON({ a: 1, b: undefined })).toBe('{"a":1}')
  })

  it('hashOf 统一带 sha256: 前缀', () => {
    expect(hashOf({ a: 1 })).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  it('MANIFEST_PATH 常量与采集产物同族（content-remote/manifest.json）', () => {
    expect(MANIFEST_PATH).toBe('content-remote/manifest.json')
  })
})
