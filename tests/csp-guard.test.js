/**
 * CSP 通用护栏（P1-T5）—— 锁定「dev 能跑、prod 被 CSP 拦」这一类失败
 *
 * 根因：CSP 是 app 级全局单值（app.security.csp / devCsp），代码需要什么与 CSP 允许什么
 *      之间没有静态关联；而 devCsp 天然是 prod 的超集，于是 dev 永远不会暴露 prod 的阻塞。
 * 因此本护栏的核心不是「找 eval」，而是：
 *      L1 生产 CSP 不得被放宽
 *      L2 dev 相对 prod 多出的每一项授权都必须显式登记理由（⭐ 核心）
 *      L3 全仓不得出现「字符串转代码」
 *      L4 源码引用的外部主机必须被生产 CSP 覆盖（扫描根排除三学科页面内容目录）
 *      L6 无「运行时拼接」import()（H1 口径，字面量 / 静态前缀模板 glob 豁免）
 * 另有 L5（tests/helpers/csp-lock.js）：运行时把 Function/eval 置为抛 EvalError，按需复用。
 *
 * 与 QA 守卫的分工（docs/csp-guard-plan.md §2.1）：本文件是**仓库 + 配置级**粗扫
 *      （L1-L4 + L6）；tests/jsxgraph-eval-guard.test.js 是 **jsxgraph 单库级**语义精查
 *      （R0-R3）。两者互补、不重叠，勿互相改写。
 *
 * 纪律：所有对源码的扫描都先 stripComments()。理由：src/geometry/boards/*.js 的文件头
 *      用散文说明了「原先是 initCode 字符串 + new Function」的历史 —— 那是文档不是用法；
 *      loadPage.js 的注释里也有「不要写成 import(base + name)」这类反例说明。
 *
 * @author software-engineer
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { withCspLocked } from './helpers/csp-lock'

const ROOT = process.cwd()
const CONF = JSON.parse(readFileSync(join(ROOT, 'src-tauri/tauri.conf.json'), 'utf-8'))
const PROD = CONF.app.security.csp
const DEV = CONF.app.security.devCsp

// ────────────────────────── 工具 ──────────────────────────

/** 解析 CSP 字符串 → { 'script-src': ["'self'", ...], ... }（指令名转小写） */
function parseCsp(policy) {
  const out = {}
  for (const part of String(policy || '').split(';')) {
    const t = part.trim()
    if (!t) continue
    const [name, ...tokens] = t.split(/\s+/)
    out[name.toLowerCase()] = tokens
  }
  return out
}

const PROD_D = parseCsp(PROD)
const DEV_D = parseCsp(DEV)

const isKeyword = (t) => t.startsWith("'")
const isScheme = (t) => /^[a-z][a-z0-9+.-]*:$/i.test(t)
const isHost = (t) => !isKeyword(t) && !isScheme(t)

/** 递归收集 src 下的源码文件（不含 css —— 样式里的 URL 与脚本执行无关） */
function walkSrc(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walkSrc(p, acc)
    else if (/\.(js|vue|ts)$/.test(name)) acc.push(p)
  }
  return acc
}
const SRC_FILES = walkSrc(join(ROOT, 'src'))

/** 去注释（块注释 + 行注释），避免把文档里的示例误判成真实用法 */
function stripComments(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

/**
 * 三学科「页面内容目录」判定（P-E1 裁决）。
 * rel 形如 'src/content/math/01-集合与逻辑/01-集合的概念与表示.js'。
 * 为什么排除：这些是**教学数据**（schema 驱动的页面数据），其中出现的 URL 是示例文本，
 *   App 运行期从加载；把它们当「源码引用的外部主机」扫是误报。
 *   注意只排除三学科子目录，src/content/*.js 真代码（loadPage.js / practiceBank.js 等）仍在范围内。
 */
function isContentPageFile(rel) {
  return /^src[\\/]content[\\/](math|chinese|computer)[\\/]/.test(rel)
}

/** L4 扫描根：全部 src 源码，排除三学科页面内容目录（教学数据） */
const L4_FILES = SRC_FILES.filter((f) => !isContentPageFile(relative(ROOT, f)))

// ────────────────────── L1 生产 CSP 不得放宽 ──────────────────────

describe('L1 · 生产 CSP 不得被放宽', () => {
  it('csp 是非空字符串（置 null / 空串 = Tauri 不注入 = 等于全放开）', () => {
    expect(typeof PROD).toBe('string')
    expect(PROD.trim()).not.toBe('')
  })

  it('script-src 不含任何「把字符串当代码执行」的授权', () => {
    const forbidden = ["'unsafe-eval'", "'unsafe-inline'", "'unsafe-hashes'", 'blob:', 'data:', 'filesystem:', '*']
    for (const bad of forbidden) {
      expect(PROD_D['script-src'] || [], `script-src 不得含 ${bad}`).not.toContain(bad)
    }
  })

  it('加固指令保持', () => {
    expect(PROD_D['object-src']).toEqual(["'none'"])
    expect(PROD_D['base-uri']).toEqual(["'self'"])
    expect(PROD_D['frame-ancestors']).toEqual(["'none'"])
  })

  it('未关闭 Tauri 的编译期内联脚本 hash 注入（关掉会让 dist/index.html 的主题脚本被拦）', () => {
    expect(CONF.app.security.dangerousDisableAssetCspModification).toBeFalsy()
  })
})

// ─────────────── L2 dev/prod 能力差必须显式登记（核心） ───────────────

/**
 * dev 相对 prod 多出来的授权，**必须逐条在此登记理由**。
 * 未登记者即为「dev 好、prod 炸」的隐患 —— 这正是本次缺陷的成因。
 * 只允许登记**网络侧**的正当差异；「代码执行类」授权永远不许登在这里（见下一条用例）。
 */
const DEV_ONLY_ALLOWED = new Map([
  ['connect-src ws://localhost:5173', 'Vite HMR websocket'],
  ['connect-src http://localhost:5173', 'dev server 自身'],
  ['connect-src http://127.0.0.1:3000', '本地后端 API 代理（生产由 nginx 反代）'],
  ["script-src 'unsafe-inline'", 'Vite HMR 注入内联脚本（生产内联脚本由 Tauri 编译期注入 hash 放行）']
])

describe('L2 · dev 与 prod 的能力差必须显式登记', () => {
  it('prod 不得授予 dev 没有的能力（prod 比 dev 宽 = 安全倒挂）', () => {
    const inverted = []
    for (const [dir, tokens] of Object.entries(PROD_D)) {
      const dev = new Set(DEV_D[dir] || [])
      for (const t of tokens) if (!dev.has(t)) inverted.push(`${dir} ${t}`)
    }
    expect(inverted).toEqual([])
  })

  it('dev 多出的能力逐条登记，未登记者即为「dev 好 prod 炸」隐患', () => {
    const unexplained = []
    for (const [dir, tokens] of Object.entries(DEV_D)) {
      const prod = new Set(PROD_D[dir] || [])
      for (const t of tokens) {
        if (prod.has(t)) continue
        const key = `${dir} ${t}`
        if (!DEV_ONLY_ALLOWED.has(key)) unexplained.push(key)
      }
    }
    expect(
      unexplained,
      '以下能力只在 devCsp 出现且未登记理由：它们会让 dev 正常而 prod 被拦，请补登记或从 devCsp 移除'
    ).toEqual([])
  })

  it("dev 与 prod 的 script-src 都不得含 'unsafe-eval' / blob: / data:", () => {
    for (const bad of ["'unsafe-eval'", 'blob:', 'data:']) {
      expect(DEV_D['script-src'] || [], `devCsp.script-src 不应含 ${bad}`).not.toContain(bad)
    }
  })
})

// ─────────────── L3 全仓不得出现「字符串转代码」 ───────────────

/**
 * 白名单目标为**空**。任何新增都意味着该功能在生产 CSP 下不可用，
 * 必须同时说明为什么 prod 能过 —— 否则就是重演本次缺陷。
 */
const EVAL_ALLOWLIST = new Set([])

const EVAL_PATTERNS = [
  { name: 'new Function()', re: /\bnew\s+Function\s*\(/ },
  { name: 'eval()', re: /(?<![.\w$])eval\s*\(/ },
  { name: 'toJSFunction', re: /\btoJSFunction\b/ },
  { name: 'setTimeout/setInterval 字符串形式', re: /\bset(?:Timeout|Interval)\s*\(\s*['"`]/ }
]

describe('L3 · 全仓不得出现「字符串转代码」', () => {
  it('命中数与白名单一致（当前白名单为空 → 期望 0 命中）', () => {
    const hits = []
    for (const file of SRC_FILES) {
      const src = stripComments(readFileSync(file, 'utf-8'))
      for (const { name, re } of EVAL_PATTERNS) {
        if (re.test(src)) hits.push(`${relative(ROOT, file)} → ${name}`)
      }
    }
    const unexplained = hits.filter((h) => !EVAL_ALLOWLIST.has(h.split(' → ')[0]))
    expect(unexplained, '生产 CSP 无 unsafe-eval，这些用法会抛 EvalError').toEqual([])
  })
})

// ────────── L4 源码引用的外部主机必须被生产 CSP 覆盖 ──────────

/** 允许出现但不在 CSP 里的主机（仅限确实不用于加载资源的情形；非空须说明理由） */
const HOST_ALLOWLIST = new Set([])

/** prod CSP 已覆盖的主机集合（去协议前缀与端口） */
function prodCoveredHosts() {
  const hosts = new Set()
  for (const tokens of Object.values(PROD_D)) {
    for (const t of tokens) if (isHost(t)) hosts.add(t.replace(/^https?:\/\//, '').replace(/:\d+$/, ''))
  }
  return hosts
}
/** prod CSP 是否以「协议源」（https: / http:）一次性放行全部该协议主机 */
function prodOpensHttp() {
  for (const tokens of Object.values(PROD_D)) {
    for (const t of tokens) if (t === 'https:' || t === 'http:') return true
  }
  return false
}

/**
 * 从一段源码文本里抽出「未被 prod CSP 覆盖、也不在白名单」的外部主机。
 * 抽成纯函数是为了让**反向锚**能喂入合成源码（证明排除的只是数据目录，不是整类主机）。
 * @param {string} src 源码文本
 * @returns {string[]} 违规主机名（去重前）
 */
function unauthorizedHostsInSource(src) {
  const hosts = prodCoveredHosts()
  const openHttp = prodOpensHttp()
  const found = []
  for (const m of stripComments(src).matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) {
    const host = m[1]
    if (openHttp || hosts.has(host) || HOST_ALLOWLIST.has(host)) continue
    found.push(host)
  }
  return found
}

describe('L4 · 源码引用的外部主机必须被生产 CSP 覆盖', () => {
  it('无未授权主机（可抓到「回退官方 CDN」这类写法）', () => {
    const found = []
    for (const file of L4_FILES) {
      for (const host of unauthorizedHostsInSource(readFileSync(file, 'utf-8'))) {
        found.push(`${relative(ROOT, file)} → ${host}`)
      }
    }
    expect([...new Set(found)], '这些主机不在生产 CSP 内，运行期会被静默拦截').toEqual([])
  })

  it('反向锚：代码文件里出现未授权主机必须被 L4 命中（防边界收窄成盲区）', () => {
    const evil = ['const url = "https://evil.example/api"', 'fetch("http://bad.example/x")'].join('\n')
    expect(unauthorizedHostsInSource(evil)).toEqual(['evil.example', 'bad.example'])
  })

  it('边界只收窄到「内容数据目录」：三学科页面文件被判为数据文件、真代码不受影响', () => {
    expect(isContentPageFile('src/content/math/01-集合与逻辑/01-集合的概念与表示.js')).toBe(true)
    expect(isContentPageFile('src/content/chinese/01-语言文字运用/01-字音.js')).toBe(true)
    expect(isContentPageFile('src/content/computer/03-计算机网络技术/08-网页设计基础.js')).toBe(true)
    // src/content/*.js 真代码不在排除之列（loadPage.js / practiceBank.js / searchIndex.js）
    expect(isContentPageFile('src/content/loadPage.js')).toBe(false)
    expect(isContentPageFile('src/content/practiceBank.js')).toBe(false)
    expect(isContentPageFile('src/stores/practice.js')).toBe(false)
  })
})

// ─────────── L6 无「运行时拼接」import()（H1 口径，新增层） ───────────

const IMPORT_SCAN_FILES = SRC_FILES // 与 L3 同一份（含 .vue）

/**
 * 判定一个 import() 实参文本是否为「构建期可静态分析」——真值为豁免，假值为违规。
 * 三档（H1 口径，见 docs/proposals/batch-e-tasks.md §0 更正 7）：
 *   ① 字符串字面量 import('@/views/X.vue')                          → 豁免
 *   ② 模板字面量且**静态前缀含 '/'** import(`@/content/${a}/${b}.js`) → 豁免（Vite 静态 glob）
 *   ③ 裸变量 / `+` 拼接 import(x)                                    → 违规
 * @param {string} arg import( 与配对 ) 之间的原文
 * @returns {boolean}
 */
function isStaticImportArg(arg) {
  const a = String(arg).trim()
  // ① 整段就是一个字符串字面量（拼接 'a' + b 因不满足整段匹配而落入下方 → 违规）
  if (/^'(?:[^'\\]|\\.)*'$/.test(a) || /^"(?:[^"\\]|\\.)*"$/.test(a)) return true
  if (a.startsWith('`')) {
    // ② 取 ` 之后到首个 ${（无插值则到收尾 `）之间的静态前缀，含 '/' 即 Vite 静态 glob
    const body = a.slice(1)
    const dollar = body.indexOf('${')
    const prefix = dollar >= 0 ? body.slice(0, dollar) : body.slice(0, body.indexOf('`'))
    return prefix.includes('/')
  }
  return false // ③ 裸变量 / 拼接 → 违规
}

/** 抽出源码里每个动态 import() 的「第一个实参」原文（先 stripComments，跳过 import.meta） */
function extractImportArgs(src) {
  const code = stripComments(src)
  const args = []
  const re = /\bimport\s*\(/g
  let m
  while ((m = re.exec(code)) !== null) {
    const open = m.index + m[0].length - 1 // '(' 的下标
    let depth = 0
    let j = open
    for (; j < code.length; j++) {
      if (code[j] === '(') depth++
      else if (code[j] === ')') {
        depth--
        if (depth === 0) break
      }
    }
    const inner = code.slice(open + 1, j)
    // 只取第一个顶层实参（import() 只有一个实参；切到首个不含嵌套逗号处）
    let d = 0
    let cut = inner.length
    for (let k = 0; k < inner.length; k++) {
      const ch = inner[k]
      if (ch === '(' || ch === '[' || ch === '{') d++
      else if (ch === ')' || ch === ']' || ch === '}') d--
      else if (ch === ',' && d === 0) {
        cut = k
        break
      }
    }
    args.push(inner.slice(0, cut))
  }
  return args
}

describe('L6 · 无「运行时拼接」import()（H1）', () => {
  it('全仓 import() 实参都构建期可静态分析（字面量 / 静态前缀模板 glob）', () => {
    const violations = []
    for (const file of IMPORT_SCAN_FILES) {
      for (const arg of extractImportArgs(readFileSync(file, 'utf-8'))) {
        if (!isStaticImportArg(arg)) violations.push(`${relative(ROOT, file)} → import(${arg.trim()})`)
      }
    }
    expect(violations, '运行时拼接 import() 违反 H1（生产 CSP 无 unsafe-eval，且无法构建期分包）').toEqual([])
  })

  it('附加锚：router 的 10 处路由懒加载必须全是字面量（防后人改成变量拼接）', () => {
    const routerSrc = readFileSync(join(ROOT, 'src/router/index.js'), 'utf-8')
    const args = extractImportArgs(routerSrc)
    const viewLazy = args.filter((a) => /^['"]@\/views\/.+\.vue['"]$/.test(a.trim()))
    expect(viewLazy, 'router 应为 10 处 @/views/*.vue 懒加载').toHaveLength(10)
    // 其余（如 main.js 预热 useKatex 的动态 import）同样必须静态可分析
    for (const a of args) {
      expect(isStaticImportArg(a), `import(${a.trim()}) 必须静态可分析`).toBe(true)
    }
  })

  it('三档判定：字面量 / 静态前缀模板 glob 豁免，裸变量与拼接违规', () => {
    expect(isStaticImportArg("'@/views/X.vue'")).toBe(true)
    expect(isStaticImportArg('`@/content/${subject}/${folder}/${name}.js`')).toBe(true)
    expect(isStaticImportArg('"katex"')).toBe(true)
    expect(isStaticImportArg('n')).toBe(false)
    expect(isStaticImportArg("'@/' + name")).toBe(false)
    expect(isStaticImportArg('`${dir}/x.js`')).toBe(false) // 前缀为空、不以 '/' 起
  })

  it('反向锚：注入 import(变量) 必须被拦下（不得放宽成「任何 import() 都行」）', () => {
    const injected = "const n = 'x'\nconst mod = await import(n)\n"
    const args = extractImportArgs(injected)
    expect(args).toHaveLength(1)
    expect(isStaticImportArg(args[0])).toBe(false)
  })
})

// ─────────────── L5 helper：withCspLocked 的 finally 复原 ───────────────

describe('L5 · withCspLocked 运行时封锁与复原', () => {
  it('封锁期间 Function/eval 抛 EvalError，结束后 finally 复原', () => {
    const realFunction = globalThis.Function
    const realEval = globalThis.eval
    let lockedThrew = false
    let evalThrew = false
    try {
      withCspLocked(() => {
        try {
          new Function('return 1')
        } catch (e) {
          lockedThrew = e instanceof EvalError
        }
        try {
          eval('1 + 1')
        } catch (e) {
          evalThrew = e instanceof EvalError
        }
      })
    } finally {
      // 无论用例断言如何，确保复原（helper 自身也负责，这里双保险）
      expect(lockedThrew).toBe(true)
      expect(evalThrew).toBe(true)
      expect(globalThis.Function).toBe(realFunction)
      expect(globalThis.eval).toBe(realEval)
    }
  })

  it('fn 抛异常时全局仍被复原（finally 保证）', () => {
    const realFunction = globalThis.Function
    const realEval = globalThis.eval
    expect(() =>
      withCspLocked(() => {
        throw new Error('boom')
      })
    ).toThrow('boom')
    expect(globalThis.Function).toBe(realFunction)
    expect(globalThis.eval).toBe(realEval)
  })
})
