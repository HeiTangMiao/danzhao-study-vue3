// @vitest-environment jsdom
/**
 * 批 S5 · QA 独立对抗验证 —— B 组：**基址派生** + **缓存键隔离** + **CSP 红线** + **DB v7 锚**
 *
 * 独立手段（不复用工程师的断言写法）：
 *   - 基址派生用**表驱动全格比对**，期望值来自 Node 原生 `new URL(x).origin` 的实测结果，
 *     而不是抄实现里的字符串拼接；并额外断言「派生结果里**不再出现** `/api` 与 `/content-remote`」。
 *   - 缓存键隔离用**键空间两两不重复 + 与内容层 unitKey 全量比对**证明，而不是只断言某几个键。
 *   - CSP 红线**重新实现一遍 `walkSrc`**，先证明 3 个新文件**确实在扫描集合里**（防「扫了但没覆盖」），
 *     再去注释后扫 eval / new Function / 动态 import / 第三方域名。
 *
 * 覆盖攻击面：⑤（基址派生剥 /api）⑥（CSP 红线 + 扫描范围覆盖新文件）⑨（缓存键隔离 + 不升版）
 */
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  originOf, contentRootFrom, siteRootFrom, contentRoot, siteRoot
} from '@/utils/assetBase'
import { REMOTE_DIR } from '@/content/contentManifest'
import { SEARCH_META_KEY, searchBodyKey } from '@/utils/searchClient'
import { BANK_INDEX_KEY, bankShardKey } from '@/utils/practiceBankClient'
import { META_FILE } from '@/content/searchIndex'
import { useStudyDbStore } from '@/stores/studyDb'
import { createPinia, setActivePinia } from 'pinia'

const ROOT = join(process.cwd())
const NEW_FILES = [
  'src/utils/assetBase.js',
  'src/utils/assetClient.js',
  'src/utils/searchClient.js'
]

/** 独立重实现的目录遍历（与 tests/csp-guard.test.js 的 walkSrc 同口径，但不 import 它） */
function walkSrc(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walkSrc(p, acc)
    else if (/\.(js|vue|ts)$/.test(name)) acc.push(p)
  }
  return acc
}

/** 去注释（块注释 + 行注释），避免把文档里的示例误判成真实用法 */
function stripComments(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

describe('B1 · 基址派生：站点根必须剥掉 /api（P-S16 / S5-6 的 /api 前缀陷阱）', () => {
  // 期望值来源：Node 原生 `new URL(x).origin` 实测（见下方 `originOf` 与原生的一致性断言）
  const ABSOLUTE_CASES = [
    ['https://520305.top/api', 'https://520305.top'],
    ['https://520305.top/api/', 'https://520305.top'],
    ['https://520305.top', 'https://520305.top'],
    ['http://localhost:5173/api', 'http://localhost:5173'],
    ['https://a.b.c:8443/x/y', 'https://a.b.c:8443']
  ]

  it('originOf 与 Node 原生 new URL().origin 逐格一致', () => {
    for (const [input] of ABSOLUTE_CASES) {
      expect(originOf(input)).toBe(new URL(input).origin)
    }
  })

  it('★ 站点根 = origin，既不残留 /api，也不残留 /content-remote', () => {
    for (const [input, want] of ABSOLUTE_CASES) {
      const got = siteRootFrom(input, true)
      expect(got, `siteRootFrom(${input}, true)`).toBe(want)
      expect(got.includes('/api'), `站点根残留 /api：${got}`).toBe(false)
      expect(got.includes(`/${REMOTE_DIR}`), `站点根残留 /content-remote：${got}`).toBe(false)
    }
  })

  it('★ 内容根 = origin + /content-remote（不能拼出 /api/content-remote）', () => {
    for (const [input, want] of ABSOLUTE_CASES) {
      const got = contentRootFrom(input, true)
      expect(got, `contentRootFrom(${input}, true)`).toBe(`${want}/${REMOTE_DIR}`)
      expect(got.includes('/api/'), `内容根出现 /api/：${got}`).toBe(false)
    }
  })

  it('★ Tauri 真实形态：API_BASE = https://520305.top/api → 搜索产物 URL 不落在 /api 下', () => {
    const url = `${siteRootFrom('https://520305.top/api', true)}/${META_FILE}`
    expect(url).toBe('https://520305.top/search-meta.json')
    expect(url.includes('/api/')).toBe(false)
  })

  it('相对模式：内容根 ./content-remote，站点根归一为 ./', () => {
    for (const base of ['./api', '', '.', '/api']) {
      expect(contentRootFrom(base, false)).toBe(`./${REMOTE_DIR}`)
      expect(siteRootFrom(base, false), `siteRootFrom(${base}, false)`).toBe('./')
    }
  })

  it('★ 非法绝对基址：走兜底且不抛（originOf 的 catch 分支可覆盖）', () => {
    for (const bad of ['not a url', 'http://', 'https://[bad']) {
      expect(() => originOf(bad)).not.toThrow()
      expect(() => siteRootFrom(bad, true)).not.toThrow()
      expect(typeof siteRootFrom(bad, true)).toBe('string')
    }
  })

  it('当前测试环境（无 VITE_API_BASE）走相对模式', () => {
    expect(contentRoot()).toBe(`./${REMOTE_DIR}`)
    expect(siteRoot()).toBe('./')
  })
})

describe('B2 · 缓存键隔离（P-S52 / R-10：4 键互不串号 + 不撞内容层 unitKey）', () => {
  const SUBJECTS = ['math', 'chinese', 'computer']

  it('★ 四条链的键两两不同（全量比对，不是抽样）', () => {
    const keys = [
      SEARCH_META_KEY,
      ...SUBJECTS.map((s) => searchBodyKey(s)),
      BANK_INDEX_KEY,
      ...SUBJECTS.map((s) => bankShardKey(s))
    ]
    expect(new Set(keys).size, `键有重复：${keys.join(', ')}`).toBe(keys.length)
  })

  it('★ 搜索 / 题库键与内容层 unitKey 形态（math/01）不撞', () => {
    const contentKeys = SUBJECTS.map((s) => `${s}/01`)
    const assetKeys = [
      SEARCH_META_KEY,
      BANK_INDEX_KEY,
      ...SUBJECTS.map((s) => searchBodyKey(s)),
      ...SUBJECTS.map((s) => bankShardKey(s))
    ]
    for (const a of assetKeys) {
      expect(contentKeys.includes(a), `资源键与内容层 unitKey 撞车：${a}`).toBe(false)
    }
    // 反向也确认一遍：内容层键不会落到资源键空间
    for (const c of contentKeys) {
      expect(assetKeys.includes(c), `内容层键落到资源键空间：${c}`).toBe(false)
    }
  })

  it('键前缀隔离：搜索恒以 search: 开头、题库恒以 practice: 开头', () => {
    expect(SEARCH_META_KEY.startsWith('search:')).toBe(true)
    expect(BANK_INDEX_KEY.startsWith('practice:')).toBe(true)
    for (const s of SUBJECTS) {
      expect(searchBodyKey(s).startsWith('search:')).toBe(true)
      expect(bankShardKey(s).startsWith('practice:')).toBe(true)
    }
  })

  it('★ 同一学科下的搜索键与题库键不同（search:math ≠ practice:math）', () => {
    for (const s of SUBJECTS) {
      expect(searchBodyKey(s)).not.toBe(bankShardKey(s))
    }
  })
})

describe('B3 · DB 仍为 v7、不新增 object store（S5-2 契约 3 / R-10）', () => {
  it('★ studyDb.js 未进入本批改动面（git diff 应为空）', () => {
    // 关键结论一律用脚本复核；此处直接断言「文件里 DB_VERSION 仍写死为 7」
    const src = readFileSync(join(ROOT, 'src/stores/studyDb.js'), 'utf-8')
    expect(/const\s+DB_VERSION\s*=\s*7\b/.test(src)).toBe(true)
    expect(/const\s+DB_VERSION\s*=\s*8\b/.test(src)).toBe(false)
  })

  it('★ 不新增 object store：两表仍在 v7 分支里创建且 keyPath 为 key', () => {
    const src = stripComments(readFileSync(join(ROOT, 'src/stores/studyDb.js'), 'utf-8'))
    expect(src).toMatch(/createObjectStore\('content_cache',\s*\{\s*keyPath:\s*'key'\s*\}\)/)
    expect(src).toMatch(/createObjectStore\('content_meta',\s*\{\s*keyPath:\s*'key'\s*\}\)/)
    // 不得出现 search_cache / bank_cache 之类的新表
    expect(/createObjectStore\('(search|bank|asset|practice)_cache'/.test(src)).toBe(false)
  })

  it('★ 搜索 / 题库缓存真的复用既有两表（不引入第三张表）', async () => {
    setActivePinia(createPinia())
    const db = useStudyDbStore()
    await db.init()
    await db.clearContentCache()
    await db.saveContentCache({ key: SEARCH_META_KEY, version: 3, payload: [{ a: 1 }] })
    await db.saveContentCache({ key: bankShardKey('math'), version: 3, payload: [{ b: 2 }] })
    expect(await db.getContentCache(SEARCH_META_KEY)).toMatchObject({ version: 3 })
    expect(await db.getContentCache(bankShardKey('math'))).toMatchObject({ version: 3 })
  })
})

describe('B4 · CSP 红线：3 个新文件必须在扫描范围内且自身干净', () => {
  const SRC_FILES = walkSrc(join(ROOT, 'src'))
  const rel = (f) => relative(ROOT, f).split('\\').join('/')

  it('★ csp-guard 的扫描集合是**动态遍历**而非硬编码清单 → 新文件自动入列', () => {
    const guard = stripComments(readFileSync(join(ROOT, 'tests/csp-guard.test.js'), 'utf-8'))
    // 存在 walkSrc(join(ROOT, 'src')) 这类「从目录根开始递归」的调用，而不是逐文件罗列
    expect(guard).toMatch(/walkSrc\(\s*join\(ROOT,\s*'src'\)\s*\)/)
    // 关键：扫描文件集合里不该出现对 3 个新文件的硬编码路径（否则新文件靠手工登记，易漏）
    for (const f of NEW_FILES) {
      expect(guard.includes(`'${f}'`), `csp-guard 硬编码了新文件 ${f} —— 说明不是自动覆盖`).toBe(false)
    }
  })

  it('★ 3 个新文件确实落在扫描集合里', () => {
    const set = new Set(SRC_FILES.map(rel))
    for (const f of NEW_FILES) expect(set.has(f), `${f} 不在扫描集合里`).toBe(true)
  })

  it('★ 新文件去注释后无 eval / new Function / 运行时动态 import()', () => {
    for (const f of NEW_FILES) {
      const code = stripComments(readFileSync(join(ROOT, f), 'utf-8'))
      expect(/\beval\s*\(/.test(code), `${f} 出现 eval(`).toBe(false)
      expect(/\bnew\s+Function\b/.test(code), `${f} 出现 new Function`).toBe(false)
      // 动态 import：形如 import( 且括号内不是纯字面量模板（此处一律不允许，新文件只取静态 JSON）
      const dynamicImports = [...code.matchAll(/\bimport\s*\(\s*([^)]*)\)/g)].map((m) => m[1].trim())
      expect(dynamicImports, `${f} 出现动态 import()`).toEqual([])
    }
  })

  it('★ 新文件只有静态 import（无 require / 无 import.meta.glob）', () => {
    for (const f of NEW_FILES) {
      const code = stripComments(readFileSync(join(ROOT, f), 'utf-8'))
      expect(/\brequire\s*\(/.test(code), `${f} 出现 require(`).toBe(false)
      expect(/import\.meta\.glob/.test(code), `${f} 出现 import.meta.glob`).toBe(false)
    }
  })

  it('★ 新文件不引入任何第三方主机（去注释后无 http(s):// 域名）', () => {
    for (const f of NEW_FILES) {
      const code = stripComments(readFileSync(join(ROOT, f), 'utf-8'))
      const hosts = [...code.matchAll(/https?:\/\/([A-Za-z0-9._:-]+)/g)].map((m) => m[1])
      expect(hosts, `${f} 引入了第三方主机：${hosts.join(', ')}`).toEqual([])
    }
  })

  it('★ 新文件的 URL 一律由 assetBase 派生，不手写 API_BASE 拼接', () => {
    for (const f of NEW_FILES) {
      const code = stripComments(readFileSync(join(ROOT, f), 'utf-8'))
      // 客户端侧不得出现 API_BASE 的拼接（基址派生已收敛到 assetBase.js）
      if (!f.endsWith('assetBase.js')) {
        expect(/API_BASE\s*\+/.test(code), `${f} 出现 API_BASE 字符串拼接`).toBe(false)
      }
    }
  })
})
