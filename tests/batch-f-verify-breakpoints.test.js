// @vitest-environment node
/**
 * 批 F · Fc3「1150 断点统一化」—— **独立复扫**（QA）
 *
 * 不依赖工程师测试、不复用其正则；自写递归扫描 src/**，覆盖：
 *  1. 反例锚：`min-width: 1151px` / `max-width: 1150px` 在 src/** 各 **0** 处（旧口径彻底清零）
 *  2. 全站断点族：凡 `@media` 命中 1149/1150 的，必须恰为 `max-width: 1149px` 或 `min-width: 1150px`
 *  3. JS/CSS 同口径：NotesPanel MOBILE_MQ 值与同文件 CSS 移动边界**同一值**（1150 处 JS 判移动/CSS 判桌面即撕裂）
 *  4. 带 `and` 的两处不漏改：ContentSidebar landscape、UnitView max-1456
 *  5. 与既有规范处（App.vue / AppTabBar）口径一致（移动 max-1149 / 桌面 min-1150）
 *  6. 独立数字复核：全站 1150 断点 = 18 处 CSS + 1 处 JS
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}
const files = walk(SRC).filter((f) => /\.(vue|css|scss|js|ts)$/.test(f))

/** 收集「断点行」：@media 行 或 JS matchMedia 字符串 —— 命中 (min|max)-width: 1149/1150/1151 */
const HITS = []
for (const f of files) {
  const rel = relative(ROOT, f)
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const isMedia = /@media/.test(line)
      const isJsMq = !isMedia && /(min-|max-)width:\s*114[89]px|(min-|max-)width:\s*115[01]px/.test(line) && /matchMedia|MOBILE_MQ|MQ\s*=|const\s+\w*MQ/.test(line)
      if (!isMedia && !isJsMq) return
      if (/(min|max)-width:\s*115[01]px|(min|max)-width:\s*1149px/.test(line)) {
        HITS.push({ rel, line: i + 1, text: line.trim(), kind: isMedia ? 'css' : 'js' })
      }
    })
}

describe('Fc3 独立复扫 · 反例锚', () => {
  it('`min-width: 1151px` 全站 0 处', () => {
    const bad = HITS.filter((h) => /min-width:\s*1151px/.test(h.text))
    expect(bad, JSON.stringify(bad)).toEqual([])
  })
  it('`max-width: 1150px` 全站 0 处', () => {
    const bad = HITS.filter((h) => /max-width:\s*1150px/.test(h.text))
    expect(bad, JSON.stringify(bad)).toEqual([])
  })
  it('全站 1150 族断点不含 1149/1150 之外的错值（如 min-1149 / max-1151）', () => {
    const bad = HITS.filter(
      (h) => /min-width:\s*1149px/.test(h.text) || /max-width:\s*1151px/.test(h.text)
    )
    expect(bad, JSON.stringify(bad)).toEqual([])
  })
})

describe('Fc3 独立复扫 · 断点族形状', () => {
  it('每条命中恰为 max-width:1149px 或 min-width:1150px（含 and 链）', () => {
    for (const h of HITS) {
      const ok = /max-width:\s*1149px/.test(h.text) || /min-width:\s*1150px/.test(h.text)
      expect(ok, `${h.rel}:${h.line} → ${h.text}`).toBe(true)
    }
  })

  it('带 `and` 的两处不漏改：ContentSidebar landscape + UnitView max-1456', () => {
    const csLand = HITS.find((h) => h.rel.endsWith('ContentSidebar.vue') && /orientation:\s*landscape/.test(h.text))
    expect(csLand, '未找到 ContentSidebar landscape 断点').toBeTruthy()
    expect(csLand.text).toContain('max-width: 1149px')

    const uv1456 = HITS.find((h) => h.rel.endsWith('UnitView.vue') && /1456/.test(h.text))
    expect(uv1456, '未找到 UnitView max-1456 断点').toBeTruthy()
    expect(uv1456.text).toContain('min-width: 1150px')
    expect(uv1456.text).toContain('max-width: 1456px')
  })

  it('与既有规范处口径一致：App.vue / AppTabBar 均 max-1149 + min-1150', () => {
    for (const f of ['src/App.vue', 'src/components/AppTabBar.vue']) {
      const t = readFileSync(join(ROOT, f), 'utf8')
      expect(t, `${f} 缺 max-width: 1149px`).toContain('max-width: 1149px')
      expect(t, `${f} 缺 min-width: 1150px`).toContain('min-width: 1150px')
    }
  })
})

describe('Fc3 独立复扫 · JS/CSS 同口径（NotesPanel）', () => {
  const np = readFileSync(join(ROOT, 'src/components/NotesPanel.vue'), 'utf8')

  it('MOBILE_MQ 值 = (max-width: 1149px)', () => {
    const m = np.match(/MOBILE_MQ\s*=\s*['"`]\(max-width:\s*(\d+)px\)['"`]/)
    expect(m, '未解析到 MOBILE_MQ').toBeTruthy()
    expect(m[1]).toBe('1149')
  })

  it('同文件 CSS 移动边界与 JS MOBILE_MQ 同值；桌面边界为 1150', () => {
    const vals = np.match(/MOBILE_MQ\s*=\s*['"`]\(max-width:\s*(\d+)px\)['"`]/)
    const js = Number(vals[1])
    // 同文件 CSS 的 max-width 必须含 js 值，且不含 js 值 +1 的 max（撕裂特征）
    const cssMax = [...np.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)].map((m) => Number(m[1]))
    expect(cssMax).toContain(js)
    expect(cssMax).not.toContain(js + 1) // 若 CSS 出现 1150 的 max，则 1150 处 JS 判移动、CSS 判桌面 → 撕裂
    // 桌面 min 边界 = js + 1
    const cssMin = [...np.matchAll(/@media\s*\(min-width:\s*(\d+)px\)/g)].map((m) => Number(m[1]))
    expect(cssMin).toContain(js + 1)
  })
})

describe('Fc3 独立复扫 · 数字分解', () => {
  it('全站 1150 断点 = 18 处 @media(CSS) + 1 处 JS(MOBILE_MQ)', () => {
    const css = HITS.filter((h) => h.kind === 'css')
    const js = HITS.filter((h) => h.kind === 'js')
    expect(css.length, JSON.stringify(css.map((c) => `${c.rel}:${c.line}`))).toBe(18)
    expect(js.length, JSON.stringify(js.map((c) => `${c.rel}:${c.line}`))).toBe(1)
    expect(js[0].rel).toContain('NotesPanel.vue')
  })
})
