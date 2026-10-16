/**
 * 产物清单不变量自检（批 S4 · S4-4b）
 *
 * 测 `assertManifestInvariants`（纯函数）与 `check-content-remote.mjs` 的分片清点：
 *  - 五组不变量各一条**正向**（fixture 合法 → 通过）
 *  - 五组各配**反向锚（变异）**：把 fixture 改坏 → 断言**必须抛**（先证明守卫会咬）
 *  - 分片清点：`listShardFiles` 必须排除清单自身、且能递归数到各学科分片
 *
 * ⚠️ 全部注入式 fixture：不读 `public/content-remote/`（已 gitignore，干净树无产物）。
 */
import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertManifestInvariants, buildSubSections } from '../scripts/build-content-remote.mjs'
import { listShardFiles } from '../scripts/check-content-remote.mjs'
import { SITE_FILES } from '../scripts/lib/load-content.mjs'
import { subSectionErrors } from '../src/content/contentManifest.js'
import { SCHEMA_VERSION, CONTENT_VERSION, HASH_PREFIX, REMOTE_DIR, MANIFEST_PATH } from '../src/content/contentManifest.js'

const H = (c = 'a') => HASH_PREFIX + c.repeat(64)

/**
 * 合法子段指针表（键即 path、哈希带前缀）
 *
 * ⚠️ 每次都返回**新对象**：fixture 若共享引用，某个用例改坏它会污染后续用例
 *    （这类「用例间串味」正是变异测试里最难查的假绿来源）。
 */
function subTables() {
  return {
    search: { 'search-meta.json': { path: 'search-meta.json', hash: H('a'), count: 3 } },
    practice: { 'practice-bank/index.json': { path: 'practice-bank/index.json', hash: H('b') } }
  }
}

/** 合法清单 fixture（严格照 collectSnapshot 的产出形状；S5 起子段必填） */
function fixture(over = {}, unitOver = {}) {
  const cv = CONTENT_VERSION
  const subs = subTables()
  return {
    schemaVersion: SCHEMA_VERSION,
    contentVersion: cv,
    contentHash: H('m'),
    generatedAt: '2026-01-01T00:00:00.000Z',
    sitePatchHash: H('s'),
    sitePatch: { units: {}, fileMetaUpdates: [] },
    units: {
      'math/01': {
        hash: H('a'), version: cv, path: 'math/01.json', count: 3,
        updatedAt: '2026-01-01T00:00:00.000Z', ...unitOver
      }
    },
    ...subs,
    ...over
  }
}

/** 断言「改坏后必抛」，并返回错误明细便于进一步核对 */
function expectThrow(m, options) {
  let thrown = null
  try {
    assertManifestInvariants(m, options)
  } catch (e) {
    thrown = e
  }
  expect(thrown, '该变异必须被守卫拦下').toBeTruthy()
  expect(Array.isArray(thrown.errors)).toBe(true)
  expect(thrown.errors.length).toBeGreaterThan(0)
  return thrown.errors
}

describe('正向：合法清单通过', () => {
  it('fixture（1 单元 / 分片数 1 / 子段已填指针 / sitePatch 空）→ 返回 true', () => {
    expect(assertManifestInvariants(fixture(), { shardCount: 1 })).toBe(true)
    expect(assertManifestInvariants(fixture(), { shardCount: 1 })).toBe(true)
  })

  it('不传 shardCount 时跳过「键数 = 分片数」这一条（其余照检）', () => {
    expect(assertManifestInvariants(fixture())).toBe(true)
  })

  it('contentVersion 高于源码常量（合法，发布期可人工调高）→ 通过', () => {
    const m = fixture({ contentVersion: CONTENT_VERSION + 5 })
    m.units['math/01'].version = CONTENT_VERSION + 5
    expect(assertManifestInvariants(m, { shardCount: 1 })).toBe(true)
  })
})

describe('不变量① · schemaVersion', () => {
  it('协议版本不符 → 抛（客户端 isValidManifest 会整份不消费）', () => {
    const errs = expectThrow(fixture({ schemaVersion: SCHEMA_VERSION + 1 }), { shardCount: 1 })
    expect(errs.join('|')).toMatch(/schemaVersion/)
  })

  it('缺 schemaVersion → 抛', () => {
    expect(expectThrow(fixture({ schemaVersion: undefined }), { shardCount: 1 }).join('|'))
      .toMatch(/schemaVersion/)
  })
})

describe('不变量② · contentVersion 单调可比较', () => {
  it('null / 字符串 / NaN → 抛（P-S47 同族：形态层也不许放过）', () => {
    for (const bad of [null, 'abc', NaN, undefined]) {
      expect(expectThrow(fixture({ contentVersion: bad }), { shardCount: 1 }).join('|'))
        .toMatch(/contentVersion 应为有限数字/)
    }
  })

  it('低于源码常量 CONTENT_VERSION → 抛（构建期不应倒退）', () => {
    const m = fixture({ contentVersion: CONTENT_VERSION - 1 })
    m.units['math/01'].version = CONTENT_VERSION - 1
    expect(expectThrow(m, { shardCount: 1 }).join('|')).toMatch(/CONTENT_VERSION/)
  })
})

describe('不变量③ · units 与分片', () => {
  it('units 为空对象 → 抛', () => {
    expect(expectThrow(fixture({ units: {} }), { shardCount: 0 }).join('|')).toMatch(/units 为空/)
  })

  it('units 非对象 / 是数组 → 抛', () => {
    expect(expectThrow(fixture({ units: [] }), { shardCount: 1 }).join('|')).toMatch(/units 应为对象/)
    expect(expectThrow(fixture({ units: null }), { shardCount: 1 }).join('|')).toMatch(/units 应为对象/)
  })

  it('units 键数与分片数不一致 → 抛（清单漏登记/多登记分片）', () => {
    expect(expectThrow(fixture(), { shardCount: 2 }).join('|')).toMatch(/与分片数 2 不一致/)
  })

  it('path 带 content-remote/ 或 public/ 前缀 → 抛（客户端会拼出双前缀 404）', () => {
    expect(expectThrow(fixture({}, { path: `${REMOTE_DIR}/math/01.json` }), { shardCount: 1 }).join('|'))
      .toMatch(/应相对/)
    expect(expectThrow(fixture({}, { path: 'public/math/01.json' }), { shardCount: 1 }).join('|'))
      .toMatch(/应相对/)
  })

  it('hash 缺前缀 / 单元版本与清单不一致 / count 非正整数 → 抛', () => {
    expect(expectThrow(fixture({}, { hash: 'a'.repeat(64) }), { shardCount: 1 }).join('|')).toMatch(/hash 应带/)
    expect(expectThrow(fixture({}, { version: 999 }), { shardCount: 1 }).join('|')).toMatch(/version 999 与 contentVersion/)
    expect(expectThrow(fixture({}, { count: 0 }), { shardCount: 1 }).join('|')).toMatch(/count 应为正整数/)
  })
})

describe('不变量④ · sitePatch 恒空（B1）', () => {
  it('sitePatch.units 非空 → 抛（越界产出导航变更）', () => {
    const m = fixture({ sitePatch: { units: { 'math/01': {} }, fileMetaUpdates: [] } })
    expect(expectThrow(m, { shardCount: 1 }).join('|')).toMatch(/sitePatch.units 应为空对象/)
  })

  it('sitePatch.fileMetaUpdates 非空 → 抛', () => {
    const m = fixture({ sitePatch: { units: {}, fileMetaUpdates: [{ a: 1 }] } })
    expect(expectThrow(m, { shardCount: 1 }).join('|')).toMatch(/fileMetaUpdates 应为空数组/)
  })

  it('sitePatch 缺失 / 不是对象 → 抛', () => {
    expect(expectThrow(fixture({ sitePatch: undefined }), { shardCount: 1 }).join('|')).toMatch(/sitePatch 应为对象/)
    expect(expectThrow(fixture({ sitePatch: [] }), { shardCount: 1 }).join('|')).toMatch(/sitePatch 应为对象/)
  })
})

describe('不变量⑤ · search / practice 子段（S5-1 填充；D-S5-1 起 null 不再合法）', () => {
  const SUB = subTables()

  it('删掉预留键 → 抛', () => {
    const m = fixture()
    delete m.search
    expect(expectThrow(m, { shardCount: 1 }).join('|')).toMatch(/缺少预留键 search/)
  })

  // ★ D-S5-1：这是本批最要紧的一条反向锚。从前 null 是合法形态，自检脚本遇 null 整段
  //   `continue` → 「4 份产物缺 3 份」也能让 CI 全绿放行；且运行时零处消费这两个子段，
  //   没有第二道防线。下面的用例把「改回旧口径」钉死。
  it('★ 子段为 null → 抛（旧口径曾让 CI 自检整段跳过）', () => {
    const errs = expectThrow(fixture({ search: null, practice: null }), { shardCount: 1 })
    expect(errs.join('|')).toMatch(/manifest\.search 不应为 null/)
    expect(errs.join('|')).toMatch(/manifest\.practice 不应为 null/)
  })

  it('只填一侧（另一侧 null）→ 抛（null 一侧本身就是缺陷）', () => {
    const errs = expectThrow(fixture({ practice: null }), { shardCount: 1 })
    expect(errs.join('|')).toMatch(/manifest\.practice 不应为 null/)
  })

  it('子段填成合法指针表 → 通过（S5-1 放开，本批核心正向）', () => {
    const m = fixture({ search: SUB.search, practice: SUB.practice })
    expect(assertManifestInvariants(m, { shardCount: 1 })).toBe(true)
  })

  it('子段填成不合法对象（条目缺 hash / path 带前缀 / 键与 path 不一致）→ 逐条抛', () => {
    const bad1 = { 'search-meta.json': { path: 'search-meta.json', count: 1 } } // 缺 hash
    const bad2 = { 'public/search-meta.json': { path: 'public/search-meta.json', hash: H('a') } } // 带前缀
    const bad3 = { 'a.json': { path: 'b.json', hash: H('a') } } // 键与 path 不一致
    for (const bad of [bad1, bad2, bad3]) {
      expect(expectThrow(fixture({ search: bad, practice: SUB.practice }), { shardCount: 1 }).join('|'))
        .toMatch(/search/)
    }
  })

  it('子段填成非对象（字符串 / 数字 / 数组）→ 抛', () => {
    for (const bad of ['x', 1, []]) {
      expect(expectThrow(fixture({ search: bad, practice: SUB.practice }), { shardCount: 1 }).join('|'))
        .toMatch(/应为对象/)
    }
  })

  it('子段为空对象（无指针）→ 抛', () => {
    expect(expectThrow(fixture({ search: {}, practice: SUB.practice }), { shardCount: 1 }).join('|'))
      .toMatch(/search 不应为空/)
  })

  it('count 非正整数 / generatedAt 非 ISO → 抛', () => {
    const bad = { 'search-body/math.json': { path: 'search-body/math.json', hash: H('a'), count: 0 } }
    expect(expectThrow(fixture({ search: bad, practice: SUB.practice }), { shardCount: 1 }).join('|'))
      .toMatch(/count 应为正整数/)
    const bad2 = { 'search-body/math.json': { path: 'search-body/math.json', hash: H('a'), generatedAt: 'yesterday' } }
    expect(expectThrow(fixture({ search: bad2, practice: SUB.practice }), { shardCount: 1 }).join('|'))
      .toMatch(/generatedAt 应为 ISO 8601/)
  })
})

describe('清单整体不是对象 → 抛（不崩）', () => {
  it('null / 数组 / 字符串', () => {
    for (const bad of [null, [], 'x', 42]) {
      let thrown = null
      try { assertManifestInvariants(bad) } catch (e) { thrown = e }
      expect(thrown).toBeTruthy()
      expect(thrown.errors.join('|')).toMatch(/清单不是对象/)
    }
  })
})

describe('buildSubSections · 由落盘产物构造子段指针（S5-1）', () => {
  /** 造一份最小产物树（学科清单取自站点配置，与实现同源）；返回根目录绝对路径 */
  function makePublicDir({ search = true, practice = true } = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'public-sub-'))
    const subjects = Object.keys(SITE_FILES)
    if (search) {
      mkdirSync(join(dir, 'search-body'))
      writeFileSync(join(dir, 'search-meta.json'), JSON.stringify([{ a: 1 }, { a: 2 }]))
      for (const s of subjects) {
        writeFileSync(join(dir, 'search-body', `${s}.json`), JSON.stringify({ '01/0': 'x' }))
      }
    }
    if (practice) {
      mkdirSync(join(dir, 'practice-bank'))
      writeFileSync(join(dir, 'practice-bank', 'index.json'), JSON.stringify({ total: 2 }))
      for (const s of subjects) {
        writeFileSync(join(dir, 'practice-bank', `${s}.json`), JSON.stringify([{ q: 'a' }]))
      }
    }
    return dir
  }

  it('两份产物都在 → 两子段均为指针表（键即 path、哈希带前缀）', () => {
    const dir = makePublicDir()
    const subjects = Object.keys(SITE_FILES)
    const { search, practice } = buildSubSections(dir)
    expect(Object.keys(search)).toEqual([
      'search-meta.json', ...subjects.map((s) => `search-body/${s}.json`)
    ])
    expect(search['search-meta.json']).toMatchObject({ path: 'search-meta.json', count: 2 })
    expect(search['search-body/math.json']).toMatchObject({ path: 'search-body/math.json', count: 1 })
    expect(search['search-meta.json'].hash.startsWith(HASH_PREFIX)).toBe(true)
    expect(Object.keys(practice)).toEqual([
      'practice-bank/index.json', ...subjects.map((s) => `practice-bank/${s}.json`)
    ])
    // 汇总索引是对象、无「条数」语义 → 不给 count（避免误导）
    expect(practice['practice-bank/index.json'].count).toBeUndefined()
    expect(practice['practice-bank/math.json'].count).toBe(1)
    // 指针表本身必须通过子段不变量校验
    expect(subSectionErrors('search', search)).toEqual([])
    expect(subSectionErrors('practice', practice)).toEqual([])
  })

  // ★ D-S5-1：「产物全缺 → 子段填 null → 构建 exit 0 → 自检整段跳过 → CI 全绿」
  //   这条链现在从源头断掉：产物缺失在**构建期**就抛错，根本轮不到写 null。
  it('★ 两份产物都不在 → 抛错，不再返回 null', () => {
    const dir = makePublicDir({ search: false, practice: false })
    expect(() => buildSubSections(dir)).toThrow(/产物缺失/)
  })

  it('只缺一半（有 search 无 practice）→ 抛错并点名缺失那一半', () => {
    const dir = makePublicDir({ practice: false })
    expect(() => buildSubSections(dir)).toThrow(/产物缺失[\s\S]*practice-bank\/index\.json/)
  })

  it('同一子段内部缺一个分片文件 → 抛错并点名缺失文件', () => {
    const dir = makePublicDir()
    rmSync(join(dir, 'search-body', 'math.json'))
    expect(() => buildSubSections(dir)).toThrow(/search-body\/math\.json/)
  })
})

describe('分片清点 listShardFiles', () => {  it('递归数到各学科分片，且**排除**清单自身', () => {
    const dir = mkdtempSync(join(tmpdir(), 'content-remote-test-'))
    writeFileSync(join(dir, 'manifest.json'), '{}')
    mkdirSync(join(dir, 'math'))
    mkdirSync(join(dir, 'chinese'))
    writeFileSync(join(dir, 'math', '01.json'), '{}')
    writeFileSync(join(dir, 'math', '02.json'), '{}')
    writeFileSync(join(dir, 'chinese', '01.json'), '{}')
    writeFileSync(join(dir, 'math', 'notes.txt'), 'x')

    const files = listShardFiles(dir)
    expect(files).toEqual(['chinese/01.json', 'math/01.json', 'math/02.json'])
    expect(files.some((f) => f.endsWith(MANIFEST_PATH.split('/').pop()))).toBe(false)
  })

  it('目录不存在 → 空数组（不抛）', () => {
    expect(listShardFiles(join(tmpdir(), '__no_such_content_remote__'))).toEqual([])
  })
})
