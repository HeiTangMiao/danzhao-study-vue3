/**
 * 批 E · E-0 CSP 护栏 —— **独立复核**（QA，不与 tests/csp-guard.test.js 同源实现）
 *
 * 目的：既有 csp-guard.test.js 是「被测护栏」自身；本文件用**另一套独立实现**重算同样的
 * 不变量，作为「跨实现对照」。若护栏实现里有盲区（例如把某类主机误当已覆盖），本文件的
 * 独立实现会与之结论不一致 —— 那就是破绽。
 *
 * 覆盖：
 *  - L1/L2 配置层：prod 未放宽；devCsp **无** 'unsafe-eval'；dev-prod 能力差 == 预期 4 条网络差异
 *  - L3 代码层：独立扫描「字符串转代码」（不 import 护栏的 EVAL_PATTERNS）
 *  - L4 代码层：独立 walkSrc + 主机抽取；排除边界只到三学科页面目录；合成反向锚
 *  - L6 代码层：独立 import() 实参抽取 + 三档判定；真实 loadPage.js 模板 glob 必放行
 *  - 元检查：护栏自身的 EVAL_ALLOWLIST / HOST_ALLOWLIST 必须为空（不许静默放行）
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const CONF = JSON.parse(readFileSync(join(ROOT, 'src-tauri/tauri.conf.json'), 'utf-8'))
const PROD = CONF.app.security.csp
const DEV = CONF.app.security.devCsp

// ---------------- 独立 CSP 解析器（与护栏不同写法：先切分指令再切分 token） ----------------
function directives(policy) {
  const map = {}
  String(policy || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split(/\s+/)
      map[parts[0].toLowerCase()] = parts.slice(1)
    })
  return map
}
const P = directives(PROD)
const D = directives(DEV)

// ---------------- 独立源码遍历 ----------------
function listSrc(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) listSrc(p, out)
    else if (/\.(js|vue|ts)$/.test(name)) out.push(p)
  }
  return out
}
const ALL_SRC = listSrc(join(ROOT, 'src'))
const rel = (p) => relative(ROOT, p).split(sep).join('/')

// 独立去注释：块注释 + 行注释。
// 行注释必须锚定行首（`^[ \t]*//`）——否则会把 `https://` 里的 `//` 也吃掉，
// 导致 L4 主机抽取整段误删（本文件初版即踩此坑：反向锚一度失败）。
function stripComments(s) {
  return String(s)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

// ---------------- L1 / L2 ----------------
describe('E-0 独立复核 · L1/L2 配置层', () => {
  it('prod script-src 不含任何字符串转代码授权；加固指令齐备', () => {
    const ss = P['script-src'] || []
    for (const bad of ["'unsafe-eval'", "'unsafe-inline'", "'unsafe-hashes'", 'blob:', 'data:', 'filesystem:', '*']) {
      expect(ss, `prod script-src 不得含 ${bad}`).not.toContain(bad)
    }
    expect(P['object-src']).toContain("'none'")
    expect(P['base-uri']).toContain("'self'")
    expect(P['frame-ancestors']).toContain("'none'")
  })

  it('E-0 修复锚：devCsp.script-src 不含 unsafe-eval / blob: / data:', () => {
    const ds = D['script-src'] || []
    expect(ds).not.toContain("'unsafe-eval'")
    expect(ds).not.toContain('blob:')
    expect(ds).not.toContain('data:')
  })

  it('dev 相对 prod 多出的能力 == 预期 4 条网络/内联差异（不多不少）', () => {
    const delta = []
    for (const [dir, toks] of Object.entries(D)) {
      const prod = new Set(P[dir] || [])
      for (const t of toks) if (!prod.has(t)) delta.push(`${dir} ${t}`)
    }
    const EXPECTED = [
      "script-src 'unsafe-inline'",
      'connect-src ws://localhost:5173',
      'connect-src http://localhost:5173',
      'connect-src http://127.0.0.1:3000'
    ].sort()
    expect([...delta].sort()).toEqual(EXPECTED)
  })

  it('prod 不得授予 dev 没有的能力（无安全倒挂）', () => {
    const inverted = []
    for (const [dir, toks] of Object.entries(P)) {
      const dev = new Set(D[dir] || [])
      for (const t of toks) if (!dev.has(t)) inverted.push(`${dir} ${t}`)
    }
    expect(inverted).toEqual([])
  })
})

// ---------------- L3 ----------------
describe('E-0 独立复核 · L3 无字符串转代码', () => {
  it('全仓去注释后 0 处 eval/new Function/字符串 setTimeout', () => {
    const patterns = {
      newFunction: /\bnew\s+Function\s*\(/,
      evalCall: /(?<![.\w$])eval\s*\(/,
      toJSFunction: /\btoJSFunction\b/,
      strTimer: /\bset(?:Timeout|Interval)\s*\(\s*['"`]/
    }
    const hits = []
    for (const f of ALL_SRC) {
      const src = stripComments(readFileSync(f, 'utf-8'))
      for (const [name, re] of Object.entries(patterns)) {
        if (re.test(src)) hits.push(`${rel(f)} → ${name}`)
      }
    }
    expect(hits).toEqual([])
  })
})

// ---------------- L4 ----------------
describe('E-0 独立复核 · L4 外部主机被 prod CSP 覆盖', () => {
  const covered = (() => {
    const set = new Set()
    for (const toks of Object.values(P)) {
      for (const t of toks) {
        if (t.startsWith("'") || /^[a-z][a-z0-9+.-]*:$/i.test(t)) continue
        set.add(t.replace(/^https?:\/\//, '').replace(/:\d+$/, ''))
      }
    }
    return set
  })()

  function hostsIn(src) {
    const out = []
    for (const m of stripComments(src).matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) out.push(m[1])
    return out
  }
  const isContentPage = (r) => ['math', 'chinese', 'computer'].some((s) => r.startsWith(`src/content/${s}/`))

  it('排除三学科页面数据目录后，普通代码文件 0 处未覆盖主机', () => {
    const found = []
    for (const f of ALL_SRC) {
      const r = rel(f)
      if (isContentPage(r)) continue
      for (const h of hostsIn(readFileSync(f, 'utf-8'))) {
        if (!covered.has(h)) found.push(`${r} → ${h}`)
      }
    }
    expect([...new Set(found)]).toEqual([])
  })

  it('独立定义的排除边界 === 三学科页面目录（不误伤 src/content/*.js 真代码）', () => {
    const codeFiles = ALL_SRC.map(rel).filter((r) => r.startsWith('src/content/') && !isContentPage(r))
    // 存在真代码文件（loadPage.js 等），且它们仍在扫描范围内
    expect(codeFiles.some((r) => r.endsWith('/loadPage.js'))).toBe(true)
    expect(codeFiles.some((r) => r.endsWith('/searchIndex.js'))).toBe(true)
  })

  it('反向锚：合成源码里的未覆盖主机必被独立实现命中', () => {
    const fake = 'fetch("https://evil.example/x") // https://covered.example ignored-if-literal'
    const found = hostsIn(fake).filter((h) => !covered.has(h))
    expect(found).toContain('evil.example')
  })
})

// ---------------- L6 ----------------
describe('E-0 独立复核 · L6 import() 三档判定', () => {
  function importArgs(src) {
    const code = stripComments(src)
    const out = []
    const re = /\bimport\s*\(/g
    let m
    while ((m = re.exec(code)) !== null) {
      let depth = 0
      let j = m.index + m[0].length - 1
      for (; j < code.length; j++) {
        if (code[j] === '(') depth++
        else if (code[j] === ')') {
          depth--
          if (depth === 0) break
        }
      }
      out.push(code.slice(m.index + m[0].length, j).trim())
    }
    return out
  }
  /** 独立三档判定：整段字面量 / 模板前缀含 '/' / 否则违规 */
  function classify(a) {
    if (/^(['"])(?:\\.|(?!\1).)*\1$/.test(a)) return 'literal'
    if (a.startsWith('`')) {
      const body = a.slice(1)
      const cut = body.search(/[$`]/)
      const prefix = cut < 0 ? body : body.slice(0, cut)
      return prefix.includes('/') ? 'glob' : 'violation'
    }
    return 'violation'
  }

  it('三档：字面量 / 模板glob 放行，裸变量与拼接违规', () => {
    expect(classify("'@/views/Home.vue'")).toBe('literal')
    expect(classify('`@/content/${a}/${b}.js`')).toBe('glob')
    expect(classify('name')).toBe('violation')
    expect(classify("'@/' + name")).toBe('violation')
    expect(classify('`${x}/y.js`')).toBe('violation')
  })

  it('全仓 import() 实参 0 处违规（独立实现）', () => {
    const bad = []
    for (const f of ALL_SRC) {
      for (const a of importArgs(readFileSync(f, 'utf-8'))) {
        if (classify(a) === 'violation') bad.push(`${rel(f)} → import(${a})`)
      }
    }
    expect(bad).toEqual([])
  })

  it('真实 loadPage.js 的模板 glob 必被判为放行（构建期静态分析）', () => {
    const src = readFileSync(join(ROOT, 'src/content/loadPage.js'), 'utf-8')
    const args = importArgs(src)
    const globs = args.filter((a) => a.startsWith('`'))
    expect(globs.length).toBeGreaterThan(0)
    for (const g of globs) expect(classify(g)).toBe('glob')
  })

  it('反向锚：注入 import(变量) 必被判违规', () => {
    const bad = 'const n = "x";\nasync function f(){ return import(n) }\n'
    const args = importArgs(bad)
    expect(args).toHaveLength(1)
    expect(classify(args[0])).toBe('violation')
  })
})

// ---------------- 护栏自身元检查 ----------------
describe('E-0 独立复核 · 护栏白名单必须为空（防静默放行）', () => {
  const guard = readFileSync(join(ROOT, 'tests/csp-guard.test.js'), 'utf-8')

  it('EVAL_ALLOWLIST 与 HOST_ALLOWLIST 均为空集', () => {
    const evalM = /const EVAL_ALLOWLIST\s*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(guard)
    const hostM = /const HOST_ALLOWLIST\s*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(guard)
    expect(evalM, 'EVAL_ALLOWLIST 未找到').toBeTruthy()
    expect(hostM, 'HOST_ALLOWLIST 未找到').toBeTruthy()
    expect(evalM[1].replace(/\/\/.*$/gm, '').trim()).toBe('')
    expect(hostM[1].replace(/\/\/.*$/gm, '').trim()).toBe('')
  })

  it('www.example.com 未被加进任何白名单（P-E1 边界处置）', () => {
    expect(guard).not.toContain('www.example.com')
  })
})
