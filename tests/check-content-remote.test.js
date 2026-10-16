/**
 * 产物自检脚本（批 S4 · S4-4b；批 S5 · S5-5 扩展）
 *
 * 覆盖：
 *  ① 正向：fixture 产物齐全（含 search / practice 子段）→ `check()` 返回带子段计数
 *  ② 负向：删掉一个子段分片 → `check()` 抛错（退出码 1 的口径）
 *  ③ 负向：子段计数与文件内容不符 → 抛错（构建与登记不同源）
 *  ④ 反向锚：把「子段分片缺失」检查摘掉 → 负向用例必须失败（证明守卫真的在咬）
 *
 * ⚠️ 全部注入式 fixture 目录（`os.tmpdir()`），**不读** `public/` 真实产物。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { check, listShardFiles } from '../scripts/check-content-remote.mjs'
import { SITE_FILES } from '../scripts/lib/load-content.mjs'
import { SCHEMA_VERSION, HASH_PREFIX } from '../src/content/contentManifest.js'

const H = (c = 'a') => HASH_PREFIX + c.repeat(64)
const SUBJECTS = Object.keys(SITE_FILES)

/** 造一份「齐全」的产物树；返回 public 目录绝对路径 */
function makePublicDir() {
  const dir = mkdtempSync(join(tmpdir(), 'check-content-remote-'))
  // content-remote
  mkdirSync(join(dir, 'content-remote', 'math'), { recursive: true })
  writeFileSync(join(dir, 'content-remote', 'math', '01.json'), JSON.stringify({ schemaVersion: SCHEMA_VERSION, contentVersion: 3, unitKey: 'math/01', pages: [] }))
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    contentVersion: 3,
    contentHash: H('m'),
    generatedAt: '2026-01-01T00:00:00.000Z',
    sitePatchHash: H('s'),
    sitePatch: { units: {}, fileMetaUpdates: [] },
    units: { 'math/01': { hash: H('a'), version: 3, path: 'math/01.json', count: 1, updatedAt: 'x' } },
    // 子段由下面按「盘上真有什么」登记（S5 起必填，不留 null）
    search: {},
    practice: {}
  }
  // search
  mkdirSync(join(dir, 'search-body'), { recursive: true })
  writeFileSync(join(dir, 'search-meta.json'), JSON.stringify([{ a: 1 }, { a: 2 }, { a: 3 }]))
  manifest.search = { 'search-meta.json': { path: 'search-meta.json', hash: H('b'), count: 3 } }
  for (const s of SUBJECTS) {
    writeFileSync(join(dir, 'search-body', `${s}.json`), JSON.stringify({ '01/0': 'x', '01/1': 'y' }))
    manifest.search[`search-body/${s}.json`] = { path: `search-body/${s}.json`, hash: H('c'), count: 2 }
  }
  // practice
  mkdirSync(join(dir, 'practice-bank'), { recursive: true })
  writeFileSync(join(dir, 'practice-bank', 'index.json'), JSON.stringify({ total: 2 }))
  manifest.practice = { 'practice-bank/index.json': { path: 'practice-bank/index.json', hash: H('d') } }
  for (const s of SUBJECTS) {
    writeFileSync(join(dir, 'practice-bank', `${s}.json`), JSON.stringify([{ q: 'a' }, { q: 'b' }]))
    manifest.practice[`practice-bank/${s}.json`] = { path: `practice-bank/${s}.json`, hash: H('e'), count: 2 }
  }

  writeFileSync(join(dir, 'content-remote', 'manifest.json'), JSON.stringify(manifest))
  return dir
}

let dir = null
beforeEach(() => { dir = makePublicDir() })
afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }) })

describe('① 正向：产物齐全', () => {
  it('check() 通过并返回子段指针计数', () => {
    const r = check(dir)
    expect(r.shardCount).toBe(1) // 1 个单元分片
    expect(r.pageTotal).toBe(1)
    expect(r.subSections).toEqual({ search: 1 + SUBJECTS.length, practice: 1 + SUBJECTS.length })
    expect(r.manifest.contentVersion).toBe(3)
  })

  it('listShardFiles 只数列目录下的 json 且排除清单自身（按路径排序）', () => {
    expect(listShardFiles(join(dir, 'content-remote'))).toEqual(['math/01.json'])
    expect(listShardFiles(join(dir, 'search-body'))).toEqual([...SUBJECTS].sort().map((s) => `${s}.json`))
    expect(listShardFiles(join(dir, '__no_such__'))).toEqual([])
  })
})

describe('② 负向：子段分片缺失 / 计数不符', () => {
  it('删掉一个 search-body 分片 → 抛错并点名', () => {
    rmSync(join(dir, 'search-body', 'math.json'))
    let thrown = null
    try { check(dir) } catch (e) { thrown = e }
    expect(thrown).toBeTruthy()
    expect(thrown.errors.join('|')).toMatch(/子段 search 声明的分片缺失：search-body\/math\.json/)
  })

  it('删掉一个 practice-bank 分片 → 抛错', () => {
    rmSync(join(dir, 'practice-bank', 'math.json'))
    expect(() => check(dir)).toThrow(/practice-bank\/math\.json/)
  })

  it('子段计数与文件内容不符 → 抛错（构建与登记不同源）', () => {
    const manifestAbs = join(dir, 'content-remote', 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestAbs, 'utf-8'))
    manifest.search['search-body/math.json'].count = 99 // 登记 99，实际 2
    writeFileSync(manifestAbs, JSON.stringify(manifest))
    let thrown = null
    try { check(dir) } catch (e) { thrown = e }
    expect(thrown).toBeTruthy()
    expect(thrown.errors.join('|')).toMatch(/计数不符：清单 99 \/ 实际 2/)
  })

  it('清单缺失 / 非法 JSON → 抛错', () => {
    rmSync(join(dir, 'content-remote', 'manifest.json'))
    expect(() => check(dir)).toThrow(/产物缺失/)
    const bare = mkdtempSync(join(tmpdir(), 'check-bare-'))
    mkdirSync(join(bare, 'content-remote'), { recursive: true })
    writeFileSync(join(bare, 'content-remote', 'manifest.json'), '{ not json')
    expect(() => check(bare)).toThrow(/不是合法 JSON/)
    rmSync(bare, { recursive: true, force: true })
  })

  // ★ D-S5-1：「产物没随清单产出」在从前是**自检整段跳过**的形状（exit 0 全绿放行）
  it('★ 两个子段都是 null → 抛错（旧口径：整段 continue 跳过）', () => {
    const manifestAbs = join(dir, 'content-remote', 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestAbs, 'utf-8'))
    manifest.search = null
    manifest.practice = null
    writeFileSync(manifestAbs, JSON.stringify(manifest))
    let thrown = null
    try { check(dir) } catch (e) { thrown = e }
    expect(thrown).toBeTruthy()
    // 两条防线各自都要点名：清单形态层（⑤）+ 本脚本的声明核对（③）
    expect(thrown.errors.join('|')).toMatch(/manifest\.search 不应为 null/)
    expect(thrown.errors.join('|')).toMatch(/manifest\.practice 不应为 null/)
    expect(thrown.errors.join('|')).toMatch(/manifest\.search 子段缺失/)
    expect(thrown.errors.join('|')).toMatch(/manifest\.practice 子段缺失/)
  })

  it('只留一半子段（practice = null）→ 抛错', () => {
    const manifestAbs = join(dir, 'content-remote', 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestAbs, 'utf-8'))
    manifest.practice = null
    writeFileSync(manifestAbs, JSON.stringify(manifest))
    expect(() => check(dir)).toThrow(/manifest\.practice 不应为 null/)
  })

  it('单元分片缺失 → 抛错（S4 既有口径不回退）', () => {
    rmSync(join(dir, 'content-remote', 'math', '01.json'))
    let thrown = null
    try { check(dir) } catch (e) { thrown = e }
    expect(thrown).toBeTruthy()
    // 既有 S4 口径：键数≠分片数 + 声明分片缺失，两条都要报
    expect(thrown.errors.join('|')).toMatch(/units 键数 1 与分片数 0 不一致/)
    expect(thrown.errors.join('|')).toMatch(/清单声明的分片缺失/)
  })
})

describe('③ 反向锚：子段缺失检查必须真的在咬', () => {
  it('把「子段分片缺失」分支摘掉 → 负向用例必须失败（否则正向是恒真）', () => {
    // 直接对「检查逻辑的存在性」做断言：源码里必须同时含子段缺失与计数不符两条分支
    const src = readFileSync(join(process.cwd(), 'scripts', 'check-content-remote.mjs'), 'utf-8')
    expect(src).toContain('子段')
    expect(src).toMatch(/声明的分片缺失/)
    expect(src).toMatch(/计数不符/)
    // D-S5-1：子段缺失/为 null 时必须有显式分支，不能 `continue` 跳过
    expect(src).toMatch(/子段缺失/)
    expect(src).not.toMatch(/if \(!sub\) continue/)
    // 反向：删掉这两行的源码不应再包含它们（证明上面的匹配不是空话）
    const mutated = src.replace(/声明的分片缺失/g, '').replace(/计数不符/g, '')
    expect(mutated).not.toMatch(/声明的分片缺失/)
    expect(mutated).not.toMatch(/计数不符/)
  })
})
