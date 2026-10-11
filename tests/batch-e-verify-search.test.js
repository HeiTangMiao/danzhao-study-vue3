/**
 * 批 E · E-4 搜索覆盖题库题干 —— **独立复核**（QA）
 *
 * 攻击点：
 *  A. 构建顺序（P-E5）：package.json 的 build:index 必须「先题库产物、后搜索索引」。
 *  B. 覆盖完整性：题库每个题干（清洗后）必须**实际出现在**对应页正文分片的题干段里
 *     （逐条子串核验；用导出函数 groupBankQuestions 复用同一 clean，H7）。
 *  C. 检索行为：题干专属子串能命中来源页并标「题目」；标题级命中不退化；marker 不可检索。
 *  D. 体积闸门：分片合计 ≤ BODY_BUDGET_BYTES；并实测「题干贡献的增量」（KB / %）。
 *  E. 无静默截断：无页面长度达 BODY_LIMIT。
 *
 * 说明：产物（public/search-*、public/practice-bank/*）由 `npm run build:index` 生成；
 *   search-* 是 .gitignore 的未跟踪构建产物，本测试只读不写。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { groupBankQuestions } from '../scripts/build-search-index.mjs'
import { matchSearch, prepareSearchIndex } from '@/utils/search'
import { QUESTION_MARKER, BODY_LIMIT, BODY_BUDGET_BYTES, META_FILE } from '@/content/searchIndex'
import { practiceShardPath } from '@/content/practiceBank'

const ROOT = process.cwd()
const SUBJECTS = ['math', 'chinese', 'computer']
const bodyPath = (s) => join(ROOT, 'public', `search-body/${s}.json`)
const bankPath = (s) => join(ROOT, 'public', practiceShardPath(s))
const artifactsReady = SUBJECTS.every((s) => existsSync(bodyPath(s)) && existsSync(bankPath(s)))

describe('E-4 独立复核 · A) 构建顺序（P-E5）', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))

  it('build:index = build:practice 先于 build:search', () => {
    const idx = pkg.scripts['build:index']
    expect(idx).toBeTruthy()
    const pi = idx.indexOf('build:practice')
    const si = idx.indexOf('build:search')
    expect(pi).toBeGreaterThanOrEqual(0)
    expect(si).toBeGreaterThan(pi) // 题库在前
  })

  it('prebuild / prebuild:tauri 走 build:index（搜索索引不早于题库）', () => {
    expect(pkg.scripts.prebuild).toContain('build:index')
    expect(pkg.scripts['prebuild:tauri']).toContain('build:index')
  })
})

describe.skipIf(!artifactsReady)('E-4 独立复核 · B) 题干覆盖完整性（读产物）', () => {
  for (const subject of SUBJECTS) {
    it(`${subject}：题库每条题干都实际出现在对应页题干段`, () => {
      const bank = JSON.parse(readFileSync(bankPath(subject), 'utf-8'))
      const body = JSON.parse(readFileSync(bodyPath(subject), 'utf-8'))
      const grouped = groupBankQuestions(bank)
      expect(grouped.size).toBeGreaterThan(0)

      let checked = 0
      const missing = []
      for (const [key, qs] of grouped) {
        const b = body[key]
        expect(b, `正文缺键 ${key}`).toBeDefined()
        const idx = b.indexOf(QUESTION_MARKER)
        const seg = idx < 0 ? '' : b.slice(idx + QUESTION_MARKER.length)
        for (const q of qs) {
          checked++
          if (!seg.includes(q)) missing.push(`${key}: ${q.slice(0, 30)}`)
        }
      }
      expect(missing.slice(0, 5), `${missing.length} 条题干未进索引`).toEqual([])
      expect(checked).toBeGreaterThan(0)
    })
  }
})

describe.skipIf(!artifactsReady)('E-4 独立复核 · C) 检索行为（题干命中 / 标题不退化 / marker 噪音）', () => {
  it('题干专属子串命中来源页并标「题目」；marker 本身不命中', () => {
    const subject = 'math'
    const bank = JSON.parse(readFileSync(bankPath(subject), 'utf-8'))
    const body = JSON.parse(readFileSync(bodyPath(subject), 'utf-8'))
    // 去重 meta
    const seen = new Set()
    const metas = []
    for (const it of bank) {
      const k = `${it.u}/${it.fi}`
      if (seen.has(k)) continue
      seen.add(k)
      metas.push({ subject, unitNum: it.u, fileIndex: it.fi, unitTitle: it.ut, title: it.ft, subtitle: '' })
    }
    const prepared = prepareSearchIndex(metas, body)

    // 找一条题干，取其 4+ CJK 片段
    const sample = bank.find((it) => /[\u4e00-\u9fa5]{6,}/.test(String(it.q || '')))
    expect(sample, '无可用题干样本').toBeTruthy()
    const frag = String(sample.q).match(/[\u4e00-\u9fa5]{6,}/)[0]
    const hits = matchSearch(prepared, frag, { limit: 500, bodies: body })
    const hit = hits.find((h) => h.unitNum === sample.u && h.fileIndex === sample.fi)
    expect(hit, `题干片段「${frag}」未命中来源页`).toBeTruthy()
    expect(hit.matchedQuestion).toBe(true)

    // marker 不作为检索噪音
    expect(matchSearch(prepared, QUESTION_MARKER, { bodies: body })).toEqual([])
  })

  it('标题级命中不退化（不依赖 bodies）', () => {
    const meta = JSON.parse(readFileSync(join(ROOT, 'public', META_FILE), 'utf-8'))
    expect(meta.length).toBeGreaterThan(0)
    const prepared = prepareSearchIndex(meta, null) // 仅标题层
    const target = meta.find((m) => m.title && m.title.length >= 2)
    expect(target).toBeTruthy()
    const hits = matchSearch(prepared, target.title.slice(0, 2), { limit: 500 })
    expect(hits.some((h) => h.title === target.title && h.unitNum === target.unitNum)).toBe(true)
  })
})

describe.skipIf(!artifactsReady)('E-4 独立复核 · D/E) 体积闸门与无静默截断', () => {
  it('分片合计 ≤ 预算；题干增量实测（KB / %）；无页面达 BODY_LIMIT', () => {
    let withBytes = 0
    let withoutBytes = 0
    let truncated = []
    let markedPages = 0
    for (const s of SUBJECTS) {
      const p = bodyPath(s)
      withBytes += statSync(p).size
      const body = JSON.parse(readFileSync(p, 'utf-8'))
      const stripped = {}
      for (const [k, v] of Object.entries(body)) {
        if (typeof v === 'string' && v.length >= BODY_LIMIT) truncated.push(`${s}:${k}`)
        const i = typeof v === 'string' ? v.indexOf(QUESTION_MARKER) : -1
        if (i >= 0) { markedPages++; stripped[k] = v.slice(0, i).trim() } else stripped[k] = v
      }
      withoutBytes += Buffer.byteLength(JSON.stringify(stripped), 'utf-8')
    }
    const deltaKB = (withBytes - withoutBytes) / 1024
    const pct = ((withBytes - withoutBytes) / withoutBytes) * 100
    // 供报告取证
    console.log(`[E-4 QA] search-body 合计 ${(withBytes / 1024).toFixed(0)} KB（题干贡献 +${deltaKB.toFixed(0)} KB / +${pct.toFixed(1)}%），含题干页 ${markedPages} 页`)
    expect(withBytes).toBeLessThanOrEqual(BODY_BUDGET_BYTES)
    expect(truncated, `有页面被截断：${truncated.join(', ')}`).toEqual([])
    expect(markedPages).toBeGreaterThan(0)
    expect(deltaKB).toBeGreaterThan(0) // 题干确实并入
    expect(pct).toBeLessThan(30) // 与规划预期 +9% 同量级，留宽区间
  })
})
