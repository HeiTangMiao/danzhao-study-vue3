// @vitest-environment node
/**
 * 批 F · Round 2 · 攻点[2] —— CSP 元检查提取器对抗（3ce7f01 → 1282813）
 *
 * 独立做法：**从被验对象 tests/batch-e-verify-csp.test.js 运行时抽取它实际用的正则**，
 * 而不是凭记忆复写；再用六形态输入核「放行/抓红」矩阵 + 真实文件不得假红。
 *
 * 期望矩阵（team-lead 派单口径）：
 *   双引号 / 模板字面量 / 裸标识符：旧放行 → 新抓红
 *   单引号 URL / 拼接：新旧均抓红
 *   正常：两者都放行
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const metaSrc = readFileSync(join(ROOT, 'tests/batch-e-verify-csp.test.js'), 'utf8')
const guardSrc = readFileSync(join(ROOT, 'tests/csp-guard.test.js'), 'utf8')

/** 从 metaSrc 中 marker 之后的第一个正则字面量构建 RegExp */
function regexAfter(marker) {
  const idx = metaSrc.indexOf(marker)
  expect(idx, `未见 marker: ${marker}`).toBeGreaterThan(-1)
  const rest = metaSrc.slice(idx + marker.length)
  const m = rest.match(/^\/(?:\\.|\[[^\]]*\]|[^/\\\n])+\/[gimsuy]*/)
  expect(m, `marker ${marker} 后无正则字面量`).toBeTruthy()
  const lit = m[0]
  const end = lit.lastIndexOf('/')
  return new RegExp(lit.slice(1, end), lit.slice(end + 1))
}

/**
 * 抽取残留守卫链 hostM[1].replace(R1,'' ).replace(R2,'') 里的全部正则字面量。
 * 注意：第二次 .replace 是链式（不带 hostM[1] 前缀），故不能靠 marker 计数。
 */
function regexesOnResidueLine() {
  const idx = metaSrc.indexOf('hostM[1].replace(')
  expect(idx, '未见残留守卫 hostM[1].replace(').toBeGreaterThan(-1)
  const lineEnd = metaSrc.indexOf('\n', idx)
  const rest = metaSrc.slice(idx, lineEnd)
  const lits = [...rest.matchAll(/\/(?:\\.|\[[^\]]*\]|[^/\\\n])+\/[gimsuy]*/g)].map((m) => m[0])
  return lits.map((lit) => {
    const end = lit.lastIndexOf('/')
    return new RegExp(lit.slice(1, end), lit.slice(end + 1))
  })
}

// 抽取被验对象的核心元件
const HOST_EXT = regexAfter('const hosts = [...hostM[1].matchAll(')
const RESIDUE = regexesOnResidueLine()
const RESIDUE_R1 = RESIDUE[0]
const RESIDUE_R2 = RESIDUE[1]

// 旧提取器（3ce7f01 原版，仅单引号；无残留守卫）—— 用于证明「旧静默放行」
const OLD_EXT = /'([^']+)'/g

const oldHosts = (b) => [...b.matchAll(new RegExp(OLD_EXT))].map((m) => m[1]).sort()
const newHosts = (b) => [...b.matchAll(new RegExp(HOST_EXT))].map((m) => m[1]).sort()
const passOld = (b) => JSON.stringify(oldHosts(b)) === JSON.stringify(['www.zjzs.net'])
const passNew = (b) =>
  JSON.stringify(newHosts(b)) === JSON.stringify(['www.zjzs.net']) &&
  b.replace(RESIDUE_R1, '').replace(RESIDUE_R2, '') === ''

describe('R2 · 攻点[2] · 抽取到的元件即被验对象所使用者', () => {
  it('HOST 提取器 = 三引号形态 chars class', () => {
    expect(HOST_EXT.source).toBe(`['"\`]([^'"\`]+)['"\`]`)
    expect(HOST_EXT.flags).toContain('g')
  })
  it('残留守卫含两条 replace（剥引号条目 + 剥空白逗号）', () => {
    expect(RESIDUE_R1.source).toContain(`['"\`]`)
    expect(RESIDUE_R2.source).toBe('[\\s,]')
  })
})

describe('R2 · 攻点[2] · 六形态 放行/抓红 矩阵', () => {
  const V = {
    正常: `  'www.zjzs.net'`,
    双引号新增: `  'www.zjzs.net',\n  "evil.com",`,
    模板字面量新增: "  'www.zjzs.net',\n  `evil2.com`,",
    裸标识符新增: `  'www.zjzs.net',\n  evil3.com,`,
    单引号URL新增: `  'www.zjzs.net',\n  'https://evil4.com',`,
    拼接写法: `  'www.zjzs' + '.net',`
  }

  it('正常：新旧均放行', () => {
    expect(passOld(V.正常)).toBe(true)
    expect(passNew(V.正常)).toBe(true)
  })

  for (const name of ['双引号新增', '模板字面量新增', '裸标识符新增']) {
    it(`${name}：旧放行（静默绕过）→ 新抓红`, () => {
      expect(passOld(V[name]), '旧的应放行（证明漏洞）').toBe(true)
      expect(passNew(V[name]), '新的应抓红').toBe(false)
    })
  }

  for (const name of ['单引号URL新增', '拼接写法']) {
    it(`${name}：新旧均抓红`, () => {
      expect(passOld(V[name])).toBe(false)
      expect(passNew(V[name])).toBe(false)
    })
  }
})

describe('R2 · 攻点[2] · 真实 csp-guard 不得假红 + 事实核对', () => {
  const body = /const HOST_ALLOWLIST\s*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(guardSrc)[1]

  it('真实 HOST_ALLOWLIST 体经新判定 → 放行（不假红）', () => {
    expect(passNew(body)).toBe(true)
  })
  it('真实 HOST_ALLOWLIST 恰为 {www.zjzs.net}', () => {
    expect(newHosts(body)).toEqual(['www.zjzs.net'])
  })
  it('EVAL_ALLOWLIST 仍为空', () => {
    const evalBody = /const EVAL_ALLOWLIST\s*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(guardSrc)[1]
    expect(evalBody.replace(/\/\/.*$/gm, '').trim()).toBe('')
  })
  it('理由注释与事实相符（openExternal / 不加载 / 不改生产 CSP）', () => {
    const declIdx = guardSrc.indexOf('const HOST_ALLOWLIST')
    // 理由注释位于声明**之前**的 JSDoc 块，故向两侧各取一段核查。
    const block = guardSrc.slice(Math.max(0, declIdx - 500), declIdx + 200)
    expect(block).toMatch(/openExternal/)
    expect(block).toMatch(/不加载|webview/)
    expect(block).toMatch(/不改生产 CSP|与 CSP 无关/)
  })
})

describe('R2 · 攻点[2] · 生产 CSP 未被放宽', () => {
  it('tauri.conf.json CSP 不含 zjzs / 无协议源通配', () => {
    const conf = JSON.parse(readFileSync(join(ROOT, 'src-tauri/tauri.conf.json'), 'utf8'))
    const csp = JSON.stringify(conf?.app?.security?.csp ?? conf?.tauri?.security?.csp ?? '')
    expect(csp).not.toMatch(/zjzs/i)
    expect(csp).not.toMatch(/\*\s*;|\*/) // 无 * 通配
  })
})

/**
 * 懒加载计数锚点（历史：10 → 11 → 13）
 *
 * 这个数字的实质作用不是「记数量」，而是**强制任何新增路由被人显式确认一次**：
 * 生产 CSP 是 `script-src 'self'`，路由懒加载必须全是字面量字符串（构建期可静态分包），
 * 而 `src/router/index.js` 是唯一可能引入「运行时拼接 import()」形态的入口 ——
 * 新路由出现的那一刻，正是最该有人确认「它不是 `import(name)`」的时刻。
 *
 * 13 = 上一批的 11 + T04 背诵功能新增的两条（`/recite`、`/recite/:unitNum/:fileIndex/:blockIndex`）。
 * 本块与 `tests/csp-guard.test.js` 的「附加锚」是一条锚的两端：这里**回读** csp-guard 源码做交叉校验，
 * 故两处的数字与正则必须同步改 —— 只改一边会变成「新文件 vs 旧正则」，红法还会伪装成对方没改。
 */
describe('R2 · 攻点[2] · L6 懒加载计数锚点 10→11→13', () => {
  it('router 的 @/views/*.vue 懒加载实数 == 13，且 csp-guard 断言 13', () => {
    const routerSrc = readFileSync(join(ROOT, 'src/router/index.js'), 'utf8')
    const args = [...routerSrc.matchAll(/import\(\s*(['"`])([^'"`]+)\1\s*\)/g)].map((m) => m[2])
    const viewLazy = args.filter((a) => /^@\/views\/.+\.vue$/.test(a))
    expect(viewLazy.length).toBe(13)
    // 13 条路由各自指向不同视图（若两条路由复用同一视图，这里会先红 —— 显式更好过静默复用）
    expect(new Set(viewLazy).size).toBe(13)
    expect(guardSrc).toMatch(/13 处路由懒加载/)
    expect(guardSrc).toMatch(/toHaveLength\(13\)/)
  })
})
