/**
 * 批 S4 · 闸门不变量 + 「未引重算」反向锚（S4-1 / 红线 4 / P-S47）
 *
 * 三件事：
 *  A. **闸门未被放宽**：`isNewer` 仍是「严格大于才写」，且 S4-2 的自愈是**闸门之外**的补拉
 *     （行为由 `tests/content-client-pending.test.js` 的 ⑥ 守卫用例端到端钉住；此处补**源码级**锚：
 *      `contentClient.js` 仍 import 并使用 `isNewer`，自愈分支不绕过闸门判定）
 *  B. **未引重算 sha256**（S4-1 决议 = 维持不重算）：
 *     断言 `mergeContent.js` / `contentClient.js` 的**代码**（剥离注释后）不含
 *     `crypto.subtle` / `createHash` / `node:crypto` 引用 —— 注释里出现这些词是合法的（决议留档）。
 *  C. **P-S47**：`isValidManifest` 对 `contentVersion` 的形态要求已收紧为「本身是有限数字」。
 *
 * ⚠️ 剥离注释再断言，避免「决议留档的注释」被误判成「引入了重算」（假红）。
 * 反向锚：用合成源码证明 `hasRecomputeRef` 真的会命中（否则 B 组是恒真断言）。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isNewer } from '@/content/mergeContent'
import { isValidManifest } from '@/utils/contentClient'
import { SCHEMA_VERSION, HASH_PREFIX } from '@/content/contentManifest'

const ROOT = process.cwd()
const read = (rel) => readFileSync(join(ROOT, rel), 'utf-8')

/** 剥离注释（块注释 + 行注释 + HTML 注释）——只留真实代码 */
function stripComments(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1'))
    .join('\n')
}

/** 代码里是否出现「重算 sha256」的引用形态 */
function hasRecomputeRef(code) {
  return /crypto\.subtle|createHash|node:crypto|from\s+['"]crypto['"]|require\(\s*['"]crypto['"]\s*\)/.test(code)
}

const H = (c = 'a') => HASH_PREFIX + c.repeat(64)

describe('A. 闸门语义未被放宽（红线 4）', () => {
  it('isNewer 仍严格大于：等值/更旧不写，仅更新才写', () => {
    expect(isNewer(6, 5)).toBe(true)
    expect(isNewer(5, 5)).toBe(false)
    expect(isNewer(4, 5)).toBe(false)
    expect(isNewer('10', '9')).toBe(true)
    expect(isNewer('9', '10')).toBe(false)
  })

  it('contentClient 仍以 isNewer 作闸门判定（自愈分支不绕过它）', () => {
    const client = stripComments(read('src/utils/contentClient.js'))
    const merge = stripComments(read('src/content/mergeContent.js'))
    // 闸门判定的唯一实现已随 computeRetrySet 迁入 mergeContent（S5-2）；此处锚「两层都对」：
    // ① mergeContent 里仍有唯一的 isNewer 闸门调用；② contentClient 只消费其结果，不自造判据
    expect(merge).toContain('isNewer(manifest?.contentVersion')
    expect(client).toMatch(/import\s*\{[^}]*computeRetrySet[^}]*\}\s*from\s*'@\/content\/mergeContent'/)
    expect(client).toContain('computeRetrySet(manifest, meta)')
    // 反向：contentClient 不得自己再调一次 isNewer 做闸门（那就会出现第二套判据）
    expect(client).not.toContain('isNewer(')
  })

  it('自愈不推进 contentVersion（内容代次没变）', () => {
    const code = stripComments(read('src/utils/contentClient.js'))
    expect(code).toContain("mode === 'newer' ? Number(manifest.contentVersion) : (meta?.contentVersion ?? null)")
  })
})

describe('B. 未引重算 sha256（S4-1 决议 = 维持不重算）', () => {
  it('mergeContent.js 的**代码**（排除注释）不含重算引用', () => {
    const code = stripComments(read('src/content/mergeContent.js'))
    expect(hasRecomputeRef(code), '不得引入 crypto.subtle / createHash / node:crypto').toBe(false)
  })

  it('contentClient.js 的**代码**（排除注释）不含重算引用', () => {
    const code = stripComments(read('src/utils/contentClient.js'))
    expect(hasRecomputeRef(code)).toBe(false)
  })

  it('决策已留档：注释里写明「S4 已复议 · 维持不重算」并指向任务卡 §4', () => {
    const src = read('src/content/mergeContent.js')
    expect(src).toContain('S4 已复议')
    expect(src).toContain('维持「不重算」')
    expect(src).toContain('docs/proposals/batch-s4-tasks.md')
  })

  it('全仓 src/** 没有引入 secure-context 探测桩（未走 A1 方案）', () => {
    // A1（crypto.subtle）需要 isSecureContext 探测 + 降级；维持 B 则不应出现探测代码
    const targets = [
      'src/content/mergeContent.js', 'src/utils/contentClient.js', 'src/content/contentManifest.js',
      'src/utils/fetchJson.js', 'src/content/loadPage.js'
    ]
    for (const rel of targets) {
      expect(stripComments(read(rel)), `${rel} 不应出现 isSecureContext`).not.toContain('isSecureContext')
    }
  })

  it('反向锚：合成源码里的重算引用必被 hasRecomputeRef 命中（防断言恒真）', () => {
    expect(hasRecomputeRef('await crypto.subtle.digest("SHA-256", buf)')).toBe(true)
    expect(hasRecomputeRef("import { createHash } from 'node:crypto'")).toBe(true)
    expect(hasRecomputeRef("const { createHash } = require('crypto')")).toBe(true)
    // 仅出现在注释里的形态：剥离后应命中不到（这正是我们要的「不误判」）
    expect(hasRecomputeRef(stripComments('/* 说明：不重算，故不用 crypto.subtle */\nconst a = 1'))).toBe(false)
  })
})

describe('C. P-S47 · isValidManifest 对 contentVersion 的形态要求已收紧', () => {
  const ok = (v) => ({ schemaVersion: SCHEMA_VERSION, contentVersion: v, units: {} })

  it('只认有限数字：null / 空串 / 布尔 / 数组 / 对象 / NaN / Infinity 一律不消费', () => {
    for (const bad of [null, undefined, '', false, true, [], {}, 'abc', NaN, Infinity, -Infinity, '2']) {
      expect(isValidManifest(ok(bad)), `contentVersion=${String(bad)} 应被拒绝`).toBe(false)
    }
  })

  it('合法数字（含 0）通过；schemaVersion / units 规则不变', () => {
    expect(isValidManifest(ok(0))).toBe(true)
    expect(isValidManifest(ok(2))).toBe(true)
    expect(isValidManifest({ ...ok(2), schemaVersion: SCHEMA_VERSION + 1 })).toBe(false)
    expect(isValidManifest({ ...ok(2), units: [] })).toBe(false)
    expect(isValidManifest({ ...ok(2), units: { 'math/01': { hash: H() } } })).toBe(true)
  })

  it('第二道闸仍在：即便形态层被绕过，isNewer 也不会写（纵深防御未撤）', () => {
    expect(isNewer(null, null)).toBe(false)
    expect(isNewer(0, 0)).toBe(false)
    expect(isNewer(0, 2)).toBe(false)
  })
})
