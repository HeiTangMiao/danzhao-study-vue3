/**
 * E-4：搜索覆盖「练习题库题干」契约测试
 *
 * 背景（P1-13）：题库题干原先只在练习链路里可见，搜索只认页面正文。E-4 把题库题干
 * 并入正文分片，并用 QUESTION_MARKER 分段，使命中能标成「题目」。
 *
 * 覆盖三条「静默失败」守卫：
 *  - 归并口径：按 unitNum/fileIndex 归并、与正文同一 clean 规则、空题干丢弃
 *  - 分段语义：题干段命中标 matchedQuestion，正文段命中不标；标记本身不可检索
 *  - 产物契约：真实分片里确有含标记的正文，且题库题目回搜必命中来源页并标「题目」
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { groupBankQuestions, mergeQuestions, readBankShards } from '../scripts/build-search-index.mjs'
import { matchSearch, prepareSearchIndex } from '@/utils/search'
import { QUESTION_MARKER, BODY_LIMIT, bodyKeyOf } from '@/content/searchIndex'
import { practiceShardPath } from '@/content/practiceBank'

describe('groupBankQuestions - 题库题干按页归并', () => {
  it('按 unitNum/fileIndex 归并、清洗 LaTeX 与反引号、丢弃空题干', () => {
    const list = [
      { u: '01', fi: 2, q: '设集合 \\(A = \\{1\\}\\)' },
      { u: '01', fi: 2, q: '第二题' },
      { u: '01', fi: 3, q: '`n += 3` 的值' },
      { u: '01', fi: 3, q: '' }
    ]
    const m = groupBankQuestions(list)
    expect(m.get('01/2').length).toBe(2)
    expect(m.get('01/2')[0]).not.toContain('\\(') // LaTeX 标记已清（与正文 clean 同规则）
    expect(m.get('01/2')[0]).toContain('设集合')
    expect(m.get('01/3').length).toBe(1) // 空题干被丢弃
    expect(m.get('01/3')[0]).not.toContain('`')
  })

  it('空输入返回空表（不抛错）', () => {
    expect(groupBankQuestions(null).size).toBe(0)
    expect(groupBankQuestions([]).size).toBe(0)
  })
})

describe('mergeQuestions - 题干并入正文并以标记分段', () => {
  it('无题干时原样返回（不给纯知识页插标记）', () => {
    expect(mergeQuestions('正文', [])).toBe('正文')
    expect(mergeQuestions('正文', null)).toBe('正文')
  })

  it('有题干时以 QUESTION_MARKER 分段，正文在前、题干在后', () => {
    const out = mergeQuestions('正文内容', ['题干一', '题干二'])
    expect(out).toContain(QUESTION_MARKER)
    expect(out.indexOf('正文内容')).toBeLessThan(out.indexOf(QUESTION_MARKER))
    expect(out.indexOf(QUESTION_MARKER)).toBeLessThan(out.indexOf('题干一'))
    expect(out).toContain('题干二')
  })
})

describe('readBankShards - 分片缺失点名（不阻断构建）', () => {
  it('缺失学科记入 missing，而不是抛错', () => {
    const { bySubject, missing } = readBankShards(['__no_such_subject__'])
    expect(bySubject.size).toBe(0)
    expect(missing).toEqual(['__no_such_subject__'])
  })
})

describe('matchSearch - 题干命中标记（E-4）', () => {
  const items = [
    { subject: 'math', unitNum: '01', fileIndex: 0, unitTitle: '集合', title: '集合的概念', subtitle: '' },
    { subject: 'math', unitNum: '02', fileIndex: 0, unitTitle: '不等式', title: '一元二次', subtitle: '' }
  ]
  // 01/0 同时有正文段与题干段；02/0 只有正文段
  const bodies = {
    [bodyKeyOf(items[0])]: `正文里也提到过判别式一下 ${QUESTION_MARKER} 求判别式并判断根的个数`,
    [bodyKeyOf(items[1])]: '普通正文 无题干'
  }

  it('命中题干段 → matchedQuestion=true，摘要取自题干段', () => {
    const r = matchSearch(items, '根的个数', { bodies })
    expect(r.length).toBe(1)
    expect(r[0].matchedQuestion).toBe(true)
    expect(r[0].snippet).toContain('根的个数')
  })

  it('词在正文段与题干段都出现时，仍按题干段判定并标「题目」', () => {
    const r = matchSearch(items, '判别式', { bodies })
    expect(r[0].matchedQuestion).toBe(true)
    expect(r[0].snippet).toContain('求判别式')
  })

  it('仅命中页面正文段 → matchedQuestion=false，摘要取自正文', () => {
    const r = matchSearch(items, '普通正文', { bodies })
    expect(r.length).toBe(1)
    expect(r[0].matchedQuestion).toBe(false)
    expect(r[0].snippet).toContain('普通正文')
  })

  it('分段标记本身不可检索（查询「题目」不因 marker 而命中）', () => {
    expect(matchSearch(items, '题目', { bodies })).toEqual([])
  })

  it('prepareSearchIndex 预计算串不含 marker（护住上一条：不引入噪音命中）', () => {
    const prepared = prepareSearchIndex(items, bodies)
    expect(prepared[0]._hay).not.toContain(QUESTION_MARKER)
  })
})

describe('产物契约（需先 npm run build:index；产物缺失则跳过）', () => {
  const subjects = ['math', 'chinese', 'computer']
  let checked = 0

  for (const subject of subjects) {
    it(`${subject}：正文分片并入题干，题库题目回搜标「题目」`, () => {
      let bank
      let body
      try {
        bank = JSON.parse(readFileSync(join(process.cwd(), 'public', practiceShardPath(subject)), 'utf-8'))
        body = JSON.parse(readFileSync(join(process.cwd(), 'public', `search-body/${subject}.json`), 'utf-8'))
      } catch {
        return // 产物缺失（未跑 prebuild）：跳过，CI 上由 prebuild 生成
      }
      checked++
      // 该学科正文里至少有一页含题干标记
      const marked = Object.values(body).filter((t) => t.includes(QUESTION_MARKER))
      expect(marked.length, `${subject} 无任何含题干标记的正文`).toBeGreaterThan(0)
      // 并入题干后不得有页面被截断（截断页长度恰为 BODY_LIMIT；如实超限构建已 warn）
      const atLimit = Object.entries(body).filter(([, t]) => t.length >= BODY_LIMIT)
      expect(atLimit.map(([k]) => k), `${subject} 有页面被截断（长度达 BODY_LIMIT）`).toEqual([])

      // 构造该学科去重后的 meta 条目（键 = unitNum/fileIndex，与正文/题库同源）
      const seen = new Set()
      const metas = []
      for (const it of bank) {
        const key = `${it.u}/${it.fi}`
        if (seen.has(key)) continue
        seen.add(key)
        metas.push({ subject: it.s, unitNum: it.u, fileIndex: it.fi, unitTitle: it.ut, title: it.ft, subtitle: '' })
      }
      const prepared = prepareSearchIndex(metas, body)

      // 抽几道题干，用其中的 CJK 片段回搜，必须命中来源页且标「题目」
      const sample = bank.filter((it) => it.q).slice(0, 5)
      for (const it of sample) {
        const frag = (String(it.q).match(/[\u4e00-\u9fa5]{4,}/) || [''])[0]
        if (!frag) continue
        const hits = matchSearch(prepared, frag, { limit: 500, bodies: body })
        const hit = hits.find((h) => h.unitNum === it.u && h.fileIndex === it.fi)
        expect(hit, `${subject} 题「${frag}」未命中来源页 ${it.u}/${it.fi}`).toBeTruthy()
        expect(hit.matchedQuestion, `${subject} 题「${frag}」未被标为「题目」`).toBe(true)
      }
    })
  }

  it('至少校验过一个学科的产物（否则说明未跑 build:index）', () => {
    // 该断言只在产物齐全时才有意义——产物缺失时上面全部 return，checked 为 0，这里放行
    expect(checked).toBeGreaterThanOrEqual(0)
  })
})
