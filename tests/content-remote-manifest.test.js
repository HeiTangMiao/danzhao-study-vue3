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
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertManifestInvariants } from '../scripts/build-content-remote.mjs'
import { listShardFiles } from '../scripts/check-content-remote.mjs'
import {
  SCHEMA_VERSION, CONTENT_VERSION, OPTIONAL_SECTIONS, HASH_PREFIX, REMOTE_DIR, MANIFEST_PATH
} from '../src/content/contentManifest.js'

const H = (c = 'a') => HASH_PREFIX + c.repeat(64)

/** 合法清单 fixture（严格照 collectSnapshot 的产出形状） */
function fixture(over = {}, unitOver = {}) {
  const cv = CONTENT_VERSION
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
    search: null,
    practice: null,
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
  it('fixture（1 单元 / 分片数 1 / 预留键 null / sitePatch 空）→ 返回 true', () => {
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

describe('不变量⑤ · S5+ 预留键', () => {
  it('删掉预留键 → 抛', () => {
    const m = fixture()
    delete m.search
    expect(expectThrow(m, { shardCount: 1 }).join('|')).toMatch(/缺少预留键 search/)
  })

  it('预留键被填了非 null → 抛（S4 不消费 search/practice）', () => {
    expect(expectThrow(fixture({ search: { hits: [] } }), { shardCount: 1 }).join('|'))
      .toMatch(/manifest\.search 应为 null/)
    for (const key of OPTIONAL_SECTIONS) {
      const m = fixture({ [key]: 1 })
      expect(expectThrow(m, { shardCount: 1 }).join('|')).toMatch(new RegExp(`manifest\\.${key} 应为 null`))
    }
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

describe('分片清点 listShardFiles', () => {
  it('递归数到各学科分片，且**排除**清单自身', () => {
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
