# CSP 通用护栏方案（含测试骨架）

> 设计：高见远（架构师）　提出人：software-engineer
> 定位：**防复发**。B1′（initCode → 真实模块）已消除本次的失败点；本护栏防的是「将来再抄错模式」。
> 状态：方案 + 可落地骨架。落地任务 = `docs/system_design.md` §10 的 **P1-T5**。
> **2026-10-07 更新**：对齐演练场下线决策（D10，`system_design.md` D10/§13）与 QA 守卫测试入库（`6427673`）后的现状——清理了对已删除文件（`functionExpr.js` / `functionPlot.js` / `tests/function-expr.test.js`）的引用；重写了与 QA 守卫的**分工边界**（§2.1）；L4 首轮预期改为「落实 D10 后 0 违规」（§4）；§4.1 的 A/B/C 三选一已被 D10 取代。

---

## 0. 一句话方案

把「dev 能跑、prod 被 CSP 拦」这个失败类，拆成 **5 层可断言的机器不变量**，落在 **1 个测试文件（约 150 行）+ 1 个测试 helper** 里。零新依赖（只用 `node:fs` / `vitest` + 一个自写的小 CSP 解析器）。

**最核心的一条（L2）不是"检查有没有 eval"，而是「dev 相对 prod 多出来的每一项 CSP 授权，都必须显式登记理由」** —— 因为这类 bug 的**根因**从来不是 eval，而是 `devCsp` 可以静默地比 `csp` 宽容。

---

## 1. 失败类根因链（为什么单点修复不够）

| # | 根因 | 说明 |
|---|---|---|
| 1 | **CSP 是 app 级全局单值** | `app.security` 下只有 `csp` / `devCsp`，没有按窗口、按资源路径分设的机制（engineer 已查证 `config.schema.json` 的 `WindowConfig` 55 字段无 `csp`）。所以「某段代码需要什么」与「CSP 允许什么」之间**没有任何静态关联** |
| 2 | **devCsp 天然是 prod 的超集** | dev 需要 `ws://localhost:5173`、代理主机、Vite HMR 的内联脚本 —— 这些都是正当的。但**一旦有人往里多加一项，dev 就再也不会暴露 prod 的阻塞** |
| 3 | **违规是静默的** | CSP 拦截只产生一条 console 违规，没有 report 端点（Tauri 无 `Reporting-Endpoints` 通道），且组件层的 catch 常把异常吞掉 → 故障表现成「内容写错了」 |

**已发生的实例（3 次）**：① `GeometryBlock` 的 `new Function`（dev 有 `unsafe-eval`、prod 没有）；② `GeoGebraPlayground.vue:65` 的官方 CDN 回退（`www.geogebra.org` 既不在 prod `script-src` 也不在 `connect-src`）—— **实例 ② 已由 D10 拍板终结**（演练场整体下线：移除 DesmosBlock / GeoGebraPlayground 组件与全部入口、`git rm -r public/vendor/geogebra`、保留 `scripts/fetch-geogebra.mjs` 供将来重拉；**截至 2026-10-07 尚未实施**，组件与 4 处引用仍在）；③ 任何将来再抄这两种模式的代码。

---

## 2. 五层护栏

| 层 | 断言 | 能拦住的实例 |
|---|---|---|
| **L1** 生产 CSP 不得放宽 | `csp` 非空；`script-src` 不含 `'unsafe-eval'`/`'unsafe-inline'`/`'unsafe-hashes'`/`blob:`/`data:`/`filesystem:`/`*`；`object-src 'none'`、`base-uri`、`frame-ancestors` 保持；未开 `dangerousDisableAssetCspModification` | 有人为了"修好"而回加 `unsafe-eval`（把用户决策固化成测试） |
| **L2** dev/prod 能力差必须登记 ⭐ | ① prod 不得授予 dev 没有的能力（防安全倒挂）② dev 多出的能力逐条落在白名单里，否则 fail ③ `script-src` 在 **dev 与 prod 都不得**含 `'unsafe-eval'`/`blob:`/`data:` | **实例 ①**（本次缺陷）、以及任何"dev 悄悄多开权限" |
| **L3** 全仓无「字符串转代码」 | `src/**/*.{js,vue,ts}` 去注释后匹配 `new Function(` / 裸 `eval(` / `toJSFunction` / 字符串版 `setTimeout/setInterval`，命中数必须等于白名单（目标为空） | 下一个组件再抄 `new Function` |
| **L4** 源码引用的外部主机必须被 prod CSP 覆盖 | 扫 `src/` 里的 `https?://host`，每个 host 必须命中 prod CSP 的某个指令主机，或在显式白名单里 | **实例 ②**（GeoGebra CDN 回退） |
| **L5** 运行时模拟（helper 复用） | `withCspLocked(fn)`：把全局 `Function`/`eval` 置为抛 `EvalError` 后执行 `fn` | 兜底证明关键路径不依赖 eval（供画板/内容类测试按需复用，见 §3.2 —— 定位为**可选增强**，非本护栏验收项） |

### 2.1 与 QA 守卫测试的分工边界（2026-10-07 定稿）

本方案（`tests/csp-guard.test.js` + `tests/helpers/csp-lock.js`，即 P1-T5）与 QA 已入库的 `tests/jsxgraph-eval-guard.test.js`（`6427673`，740 行）**互补、不重复**：

| | **本文档：`csp-guard.test.js`（P1-T5）** | **QA：`jsxgraph-eval-guard.test.js`（`6427673`）** |
|---|---|---|
| 作用域 | **仓库 + 配置级**：比对 `tauri.conf.json` 的 `csp` 与 `devCsp`（L1/L2）、全仓源码扫描（L3/L4） | **jsxgraph 单库级**：静态扫描 `src/geometry/boards/*.js`（20 个画板模块）的**每一个 `create` 调用** |
| 断言性质 | 配置不变量 + 语法级粗扫（`new Function` / `eval` / `toJSFunction` / 字符串定时器，去注释后） | **语义级**精查：R0 类型白名单（默认拒绝）、R1 表达式型元素 parents 禁字符串字面量、R2 text 放行条件表、R3 全目录禁用 `functiongraph`（防 #10 修复回退）；自带扫描器自校验（20 文件全覆盖 + 9 个 fixture 防漏报/误报） |
| 防的失败类 | 「dev 能跑、prod 被拦」的**配置层**失败（含 devCsp 孤儿授权） | 画板代码**重新引入 JessieCode → eval 执行路径**（#10 七板曲线丢失的根因） |
| 与 L3/L5 的关系 | L3 归本文件（见下方理由）；L5 helper 归本文件，供各测试按需复用 | **不引用** `withCspLocked`：QA 守卫是纯静态分析 + fixture，运行时封锁对它无意义 |

**L3/L5 重叠的划分（及理由）**：

- **L3（全仓「字符串转代码」扫描）划给本文件**：它防的是"**任何文件**再抄 `new Function`/`eval`"，作用域必须是全仓；QA 守卫只覆盖 `boards/*.js` 的 `create` 调用（且是语义级深查）。两者是一粗一细、一层一域：QA 的 R1 能抓住"字符串 parent 经 JessieCode 求值"这类**语法粗扫看不见**的路径，L3 能抓住"画板之外任何地方"的 eval——**互为盲区补丁，谁也不删**。QA 测试文件头的规则区（R0-R3 数据表）就是它那一侧的"白名单登记处"，本文件 L3 的 `EVAL_ALLOWLIST` 是这一侧的，两处登记互不代理。
- **L5（`withCspLocked` 运行时封锁）归本文件的 helper**：QA 守卫不需要它（静态分析不执行代码）；本文件原计划把它包进 `tests/geometry-board.test.js:107` 的桩执行——该测试已入库（`76888ee`）且自带桩执行，**此集成降级为可选增强**（见 §3.2），不是 P1-T5 的验收项。
- ⚠️ **一处更正（对齐时发现的口径差）**：原分工设想中「data-kind 值域校验」**不在** QA 守卫测试内（实测 `6427673` 无此断言，文件内的 `kind` 命名是内部分类器变量）。内容角色的 `kind` 值域校验归属 **P4-T3 批次**的 `tests/block-registry.test.js` 扩展（见 `system_design.md` §5.6.2 / P4-T3），勿误挂到本护栏或 QA 守卫名下。

---

## 3. 测试骨架

### 3.1 `tests/csp-guard.test.js`

```js
/**
 * CSP 通用护栏 —— 锁定「dev 能跑、prod 被 CSP 拦」这一类失败
 *
 * 根因：CSP 是 app 级全局单值（app.security.csp / devCsp），代码需要什么与 CSP 允许什么
 *      之间没有静态关联；而 devCsp 天然是 prod 的超集，于是 dev 永远不会暴露 prod 的阻塞。
 * 因此本护栏的核心不是"找 eval"，而是：
 *      ① 生产 CSP 不得被放宽
 *      ② dev 相对 prod 多出的每一项授权都必须显式登记理由
 *      ③ 全仓不得出现「字符串转代码」
 *      ④ 源码引用的外部主机必须被生产 CSP 覆盖
 *
 * 注意：所有对源码的扫描都先 stripComments()。理由：src/geometry/boards/*.js 的文件头
 *      用散文说明了「原先是 initCode 字符串 + new Function」的历史，那是文档不是用法。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const CONF = JSON.parse(readFileSync(join(ROOT, 'src-tauri/tauri.conf.json'), 'utf-8'))
const PROD = CONF.app.security.csp
const DEV = CONF.app.security.devCsp

// ────────────────────────── 工具 ──────────────────────────

/** 解析 CSP 字符串 → { 'script-src': ["'self'", ...], ... } */
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

// ────────────────────── L1 生产 CSP 不得放宽 ──────────────────────

describe('L1 · 生产 CSP 不得被放宽', () => {
  it('csp 是非空字符串（置 null / 空串 = Tauri 不注入 = 等于全放开）', () => {
    expect(typeof PROD).toBe('string')
    expect(PROD.trim()).not.toBe('')
  })

  it("script-src 不含任何「把字符串当代码执行」的授权", () => {
    const forbidden = [
      "'unsafe-eval'",
      "'unsafe-inline'",
      "'unsafe-hashes'",
      'blob:',
      'data:',
      'filesystem:',
      '*'
    ]
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

/** 允许出现但不在 CSP 里的主机（仅限确实不用于加载资源的情形） */
const HOST_ALLOWLIST = new Set([])

describe('L4 · 源码引用的外部主机必须被生产 CSP 覆盖', () => {
  it('无未授权主机（可抓到「回退官方 CDN」这类写法）', () => {
    const hosts = new Set()
    const schemes = new Set()
    for (const tokens of Object.values(PROD_D)) {
      for (const t of tokens) {
        if (isHost(t)) hosts.add(t.replace(/^https?:\/\//, '').replace(/:\d+$/, ''))
        if (isScheme(t)) schemes.add(t)
      }
    }
    // prod 未以协议源放行任何 http(s)，因此逐个主机比对
    const openHttp = schemes.has('https:') || schemes.has('http:')

    const found = []
    for (const file of SRC_FILES) {
      const src = stripComments(readFileSync(file, 'utf-8'))
      for (const m of src.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) {
        const host = m[1]
        if (openHttp || hosts.has(host) || HOST_ALLOWLIST.has(host)) continue
        found.push(`${relative(ROOT, file)} → ${host}`)
      }
    }
    expect([...new Set(found)], '这些主机不在生产 CSP 内，运行期会被静默拦截').toEqual([])
  })
})
```

### 3.2 `tests/helpers/csp-lock.js`（L5，供各测试复用）

```js
/**
 * 在「CSP 已封锁字符串转代码」的模拟环境下执行 fn。
 * 用途：证明关键路径靠解释器/真实模块工作，而非 eval。
 */
export function withCspLocked(fn) {
  const realFunction = globalThis.Function
  const realEval = globalThis.eval
  globalThis.Function = function () {
    throw new EvalError("Refused to evaluate a string as JavaScript ('unsafe-eval' not allowed)")
  }
  globalThis.eval = function () {
    throw new EvalError("Refused to evaluate a string as JavaScript ('unsafe-eval' not allowed)")
  }
  try {
    return fn()
  } finally {
    globalThis.Function = realFunction
    globalThis.eval = realEval
  }
}
```

**集成方式（可选增强，非 P1-T5 验收项）**：`tests/geometry-board.test.js`（`76888ee`，110 行）**已经有**了一条等价的桩执行测试（`stubBoard` / `stubElement` / `colors`，逐一跑 20 个模块的 `default` 并断言不抛）。若想把「画板不依赖 eval」从**推断**升级为**在 CSP 封锁下实测**，一行改动即可（把桩执行包进 helper）：

```js
import { withCspLocked } from './helpers/csp-lock'

// 原：expect(() => mod.default(stubBoard, colors, null), `画板 ${id} 执行 setup 时抛错`).not.toThrow()
withCspLocked(() => {
  expect(() => mod.default(stubBoard, colors, null), `画板 ${id} 执行 setup 时抛错`).not.toThrow()
})
```

**不要新写一个测试文件去重复已有的桩逻辑。** 注：原方案第 1 步（把 `tests/function-expr.test.js` 的内联封锁改为调用本 helper）已随该文件删除而失效，无需执行。

---

## 4. 首轮运行的预期结果 —— 这才是护栏有效的证据

我按当前仓库状态推演了一遍，**L2 会命中一处真实问题**（这正是它该做的事，不是护栏写错了）；L4 的一处命中随 D10 落实而归零：

| 层 | 首轮结果 | 对应真实问题 | 处置 |
|---|---|---|---|
| L1 | ✅ 全绿 | prod CSP 仍是 `script-src 'self'`，未被放宽 | 无需动作 |
| L2 | ❌ **2 条 fail** | **`devCsp` 仍含 `'unsafe-eval'`，但已经没有任何代码需要它了** —— B1′ 落地后 `src/` 的真实 eval 站点归零（`new Function` 只剩 `boards/*.js` 文件头散文里的历史说明，去注释后为 0）。这是一项**孤儿授权** | 从 `devCsp` 移除 `'unsafe-eval'`（保留 `'unsafe-inline'`，那是 Vite HMR 的正当需要）。**移除后必须在 `npm run tauri:dev` 下实测一次 20 张图** —— 见下方注意 |
| L3 | ✅ 全绿 | `src/` 已无「字符串转代码」（去注释后） | 无需动作 |
| L4 | ⚠️ 当前 **1 条 fail** → **落实 D10 后 ✅ 0 违规** | `src/components/blocks/DesmosBlock.vue` 等 → `www.geogebra.org`（不在 prod CSP 内）。**D10 已拍板整体退役演练场**（移除 DesmosBlock / GeoGebraPlayground 与全部入口、`git rm -r public/vendor/geogebra`）——退役后源码不再引用该主机，L4 首轮即为 **0 违规**；§4.1 的 A/B/C 三选一**已被 D10 取代，勿再走决策流程** | 落实 D10（顺序建议见 §5） |
| L5 | ✅ 全绿 | 画板模块是真实函数，不依赖 eval | 无需动作 |

> **⚠️ 移除 `devCsp` 的 `'unsafe-eval'` 的注意点**：这一项当初就是**为了让 GeometryBlock 在 dev 下能跑**才加的 —— 也就是说它从前一直在**掩盖** dev/prod 的差异。现在它已无用武之地，移除是安全的；但移除后若 dev 下出现异常，说明还有别的东西在依赖 eval，那反而是**有价值的发现**，不要退回加回它。建议移除后跑一次 `npm run tauri:dev` 实测 20 张图再合并。

**这条 L2 结果本身就是说服力的证明**：它精准指出了「devCsp 里有一项 prod 没有、且代码已经不需要的授权」—— 换成本次缺陷发生之前的状态，就是它把 `'unsafe-eval'` 揪出来。**如果这个护栏早就在，这个缺陷在 `git commit` 时就会被拦下，而不是等到打包出 `.app`。**

---

### 4.1 ⚠️ L4 的处置是一项**决策**，不是一次删除 —— ✅ 决策已做出：D10（本节保留作决策记录）

> **2026-10-07 更新：本节的三选一已被 D10 终结。** 用户已拍板**演练场整体下线**（`system_design.md` D10）：移除 `DesmosBlock` / `GeoGebraPlayground` 组件与全部入口、registry/schema/blockTypes 注册、`03-二次函数.js` 的 desmos 区块实例，随后 `git rm -r public/vendor/geogebra`（48MB；**保留** `scripts/fetch-geogebra.mjs` 与 `npm run geogebra` 供将来重拉）——即走的是 **C（整体退役）的变体**，但保留重拉脚本。**下文 A/B/C 分析保留为决策过程记录，不再需要任何人拍板。** ⚠️ 截至 2026-10-07 D10 **尚未实施**（组件与 4 处引用仍在仓库内），L4 首轮仍会命中 1 处。

原文假设 `GeoGebraPlayground.vue` 是死代码 —— **该假设已失效**。当前工作树实测引用点：

| 引用点 | 内容 |
|---|---|
| `HomeView.vue:185` | `defineAsyncComponent(() => import('@/components/GeoGebraPlayground.vue'))` |
| `UnitView.vue:219` | 同上 |
| `DesmosBlock.vue:16` | 静态 import，服务 `type:'desmos'` 区块（内容 1 处：`03-二次函数.js:72`） |

起因：那座 `FunctionPlayground` 重写（#18/#19）**被用户否决、由 team-lead `git stash`**（`stash@{0}`，17 文件），三处引用随之回退。所以现在的准确状态是 **「活代码 + 一个未被批准的替代品」**，不是「死代码待删」—— 直接删除会打断 HomeView / UnitView / DesmosBlock。

> **可复用的教训**：本项目「是否死代码」是**状态相关**结论（一次 `git stash` 即可翻转），**不可当稳定事实复用**。本方案里所有扫描根因此必须 `glob` 自动发现，**不得硬编码当前存在的具体路径**。

**L4 三个可选处置（三选一，需 team-lead 拍板）：**

| 选项 | 做法 | 代价 |
|---|---|---|
| **A 桌面端纯度优先** | 摘掉组件里的官方 CDN 回退（`GeoGebraPlayground.vue:62-65`），只保留本地 vendor | L4 转绿、白名单保持为空；**web 部署失去 CDN 兜底** |
| **B 显式登记** | 把 `www.geogebra.org` 记入 `HOST_ALLOWLIST`，注明「仅供 web 部署；桌面端本地 vendor 已入库、不会走到」 | 白名单非空（违背本文档「白名单为空」的理想，但理由显式可审） |
| **C 整体退役** | 连同 `public/vendor/geogebra/`（48MB/203 文件）+ `fetch-geogebra.mjs` + `package.json` 的 `geogebra` script 一起清掉 | 需先回答「演练场用什么替代」—— 即回到被否决的那条路，**不建议现在做** |

**决定 A 还是 B 的关键事实**：仓库内**没有任何地方定义 web 部署的 CSP**（`grep -ri "Content-Security-Policy"` 全仓 0 命中，也无 nginx conf）。所以那条 CDN 回退的**唯一可能价值只在 web 部署**；在 Tauri 桌面端它永远不可能成功（`www.geogebra.org` 既不在 prod `script-src` 也不在 `connect-src`）。→ 若 web 要保留 CDN 兜底选 **B**，若 web 也统一走本地 vendor 选 **A**。

### 4.2 ⚠️ `dist/` 与已构建的 `.app` 是用【已被回退的那版源码】产出的（2026-10-07 复核：**仍然成立**）

> **2026-10-07 复核**：`dist/` 至今未重建——`dist/index.html` 时间戳为 **10-06 21:18**，`dist/assets` 共 315 个 chunk，实测**仍含 `FunctionPlayground-*.js`×2、不含 `GeoGebraPlayground-*.js`**。本节结论**继续有效**；且 D10 落实后重建时，**`FunctionPlayground-*` 与 `GeoGebraPlayground-*` 两类 chunk 都应消失**（可作为 D10 清理彻底性的产物层判据之一）。

实测 `dist/assets/`：
- 存在 `FunctionPlayground-DgPhAfnI.js` + `FunctionPlayground-DJHvTXez.css` —— 而源码里 `FunctionPlayground.vue` **已不存在**
- **不存在** `GeoGebraPlayground-*.js` chunk（三处引用当时都指向重写版）
- 20 个画板 chunk 各只有一个哈希，**无重复**

⇒ `dist/` 是在**重写已 land** 的状态下产出的。两个后果必须记住：

1. 现有 `dist` **不能作为任何产物层判据**；护栏的集成阶段（§6 那条端到端 hash 断言）**须在 dist 重建后**再跑。
2. **凡是从这个 dist 打包出的 `.app`，里面装的是被用户否决的 jsxgraph 版演练场，而不是 GeoGebra。** 因此「在已装的 app 里打开 `03/2` 看 GeoGebra 出不出来」这个测试**必须先重建 `.app`**，否则用户实际在测被否决的那一版，结论会误导。

---

## 5. 落地顺序建议

1. **落实 D10（演练场下线，决策已做出，见 §4.1 顶部）**：移除 `DesmosBlock` / `GeoGebraPlayground` 组件与全部入口（`DesmosBlock.vue:16`、`UnitView.vue`、`HomeView.vue`）、registry/schema/blockTypes 注册、`03-二次函数.js` 的 desmos 区块实例；随后 `git rm -r public/vendor/geogebra`（保留 `scripts/fetch-geogebra.mjs`）。完成后 L4 归零、§4.2 的产物判据一并清零
2. **加 `tests/csp-guard.test.js` + `tests/helpers/csp-lock.js`**（= `system_design.md` §10 的 **P1-T5**；L3/L5 与 QA 守卫的分工边界见 §2.1，QA 侧 `6427673` 已入库无需重做）→ 此时会看到 L2 的 2 条 fail（预期）
3. **从 `devCsp` 移除 `'unsafe-eval'`** → L2 转绿；`tauri:dev` 实测 20 张图确认无副作用
4. **删 `scripts/codemod-initcode.mjs`**（其文件头已自带「跑完即可删除」；当前它有段数闸门 `EXPECTED=20`，重复运行会因解析到 0 段而退出 1，不会误写 —— 安全，但留着是噪音；2026-10-07 复核该文件仍在）
5. ~~补 `tests/geometry-board.test.js`~~ **✅ 已完成**（`76888ee`，110 行，含桩执行、孤儿文件反向断言、boardId 唯一性）。与本护栏互补：那条管「引用完整性」，本护栏管「CSP 一致性」，两者无重叠
6. 全部就绪后把 L3 的 `EVAL_ALLOWLIST` 与 L4 的 `HOST_ALLOWLIST` 保持为空，并在文件头写明「非空即代表已有生产不可用路径，须同步说明」

### 当前落地状态一览

| 项 | 状态 |
|---|---|
| B1′ 画板模块化（20 个真实模块） | ✅ 已落地（`src/geometry/boards/`） |
| `GeometryBlock` 去 eval + 异步取模块时序 | ✅ 已落地（`v-if="setupFn"` + `:key`） |
| `validateBlock` / schema / schemaForm 收尾 | ✅ 已落地（`f190b74`；validateBlock 用的是「调用方注入合法 boardId 集合」的设计，比原建议更好） |
| boardId ↔ 模块引用完整性护栏 | ✅ 已落地（`tests/geometry-board.test.js`，`76888ee`） |
| **画板 eval 守卫（QA，jsxgraph 单库级）** | ✅ 已入库（`tests/jsxgraph-eval-guard.test.js`，`6427673`，740 行，R0-R3 + 自校验；分工见 §2.1） |
| **CSP 一致性护栏（本方案，仓库 + 配置级）** | ❌ **未落地 —— 落地任务 = `system_design.md` §10 P1-T5** |
| **`devCsp` 的孤儿 `'unsafe-eval'`** | ❌ **未清理（2026-10-07 复核仍在，L2 会把它揪出来）** |
| GeoGebra 演练场 + 48MB vendor | ⚠️ **D10 已拍板下线、尚未实施**（2026-10-07 复核：组件与 4 处引用仍在；落实后 L4 归零） |

---

## 6. 可选增强（非必须）

| 项 | 价值 | 成本 |
|---|---|---|
| 对 `csp` 与 `devCsp` 断言**指令集合一致**（只允许 token 差异，不允许整条指令只在一边出现） | 防止有人往 devCsp 加 `worker-src` 之类而在 prod 漏配 | +8 行 |
| 断言 `dist/index.html` 的内联脚本都能在 Tauri 注入的 hash 列表里找到 | 端到端验证 hash 注入仍然有效 | 需构建产物，建议放集成阶段 |
| `report-to` / CSP 违规上报 | **不建议**：Tauri 无下发 `Reporting-Endpoints` 响应头的通道，写了也是死配置（方案评审 §5.5 已论证） | — |

---

## 附录：可复现的现状取证

```
# devCsp 仍有孤儿 unsafe-eval（prod 没有）
sed -n '23p' src-tauri/tauri.conf.json

# src/ 去注释后真实 eval 站点为 0（命中项全在文件头散文里）
grep -rn "new Function" src/          # → 20 处均在注释；真实代码 0

# 源码里唯一一个不被 prod CSP 覆盖的外部主机（D10 落实后此 grep 应为 0）
grep -rn "https\?://" src/            # → jsxgraph.css 许可注释(已排除 css) + GeoGebraPlayground.vue:65（2026-10-07 复核仍在，待 D10）

# 内容页已无 initCode；画板模块 20 个
grep -rc "initCode" src/content | grep -v ":0"   # → 空
ls src/geometry/boards/ | wc -l                   # → 20
```

> 本方案为设计与骨架；2026-10-07 由架构师（高见远）完成对齐更新（D10 + QA 守卫分工），**本轮仅更新本文档，未改任何源码/测试/配置**。
