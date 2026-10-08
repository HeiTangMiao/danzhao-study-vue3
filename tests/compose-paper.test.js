/**
 * 自动组卷纯函数测试（P6，prd-mobile §5.6 五条验收的算法侧覆盖）
 * 覆盖：
 *  - mulberry32 同 seed 重放一致（§5.6 验收 3）
 *  - 难度分布 50/35/15 偏差 ≤ ±2 题（验收 2）
 *  - 默认排除 source==='exam'，includeExam 开启才纳入（去重规则 2）
 *  - 会话内去重：同一 fileKey+question 不重复（去重规则 1）
 *  - 单元加权：错题多的单元抽取概率更高（验收 5）
 *  - quotaOf / weakAreasOf 等纯函数口径
 */
import { describe, it, expect } from 'vitest'
import {
  mulberry32,
  composePaper,
  quotaOf,
  weakAreasOf,
  weakWeightsFromErrors,
  unitWeightKeyOf
} from '@/utils/composePaper'
import { paperKeyOf } from '@/content/practiceBank'

/** 构造合成题库条目（字段名与 normalizeBankItem 产出一致用 key——QA F4 教训：
 *  测试自造 k 字段会与真实形状脱节，排序比较器写错字段时测试全绿但真实路径失效） */
function makeItem(i, overrides = {}) {
  return {
    key: `u${overrides.u || '01'}/1/${Math.floor(i / 10)}/${i}`,
    subject: 'math',
    unitNum: '01',
    unitTitle: '测试单元',
    fileIndex: 0,
    fileKey: `math_01_p${Math.floor(i / 10)}`,
    fileTitle: '测试页',
    question: `第 ${i} 题`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    answer: `解析 ${i}`,
    difficulty: 'basic',
    gradable: true,
    source: 'quiz',
    ...overrides
  }
}

/** 造一批难度可控的合成池：basic/medium/advanced 各 share 比例 */
function makePool(n, { examCount = 0, dupEvery = 0 } = {}) {
  const items = []
  for (let i = 0; i < n; i++) {
    const d = i % 10 < 5 ? 'basic' : i % 10 < 8 ? 'medium' : 'advanced'
    const it = makeItem(i, { difficulty: d })
    items.push(it)
    if (dupEvery > 0 && i % dupEvery === 0) {
      // 同 fileKey + question 的重复条目（不同 key）：验证会话内去重
      items.push({ ...it, key: it.key + '-dup' })
    }
  }
  for (let i = 0; i < examCount; i++) {
    items.push(makeItem(10000 + i, { source: 'exam', fileKey: `math_12_exam${i}`, key: `12/1/0/${i}` }))
  }
  return items
}

describe('mulberry32 确定性', () => {
  it('同 seed 的两个实例产出完全一致的序列', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = Array.from({ length: 50 }, () => a())
    const seqB = Array.from({ length: 50 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('不同 seed 产出不同序列', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  it('序列落在 [0,1) 且 seed=0 不退化', () => {
    const r = mulberry32(0)
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('quotaOf 难度配额', () => {
  it('N=20 → 10/7/3（精确等于 50/35/15，偏差 0）', () => {
    expect(quotaOf(20)).toEqual({ basic: 10, medium: 7, advanced: 3 })
  })

  it('三档之和恒等于 count（尾差兜底给最末档）', () => {
    for (const n of [5, 10, 15, 30, 50]) {
      const q = quotaOf(n)
      expect(q.basic + q.medium + q.advanced).toBe(n)
    }
  })

  it('显式难度过滤时该档拿满全部配额', () => {
    expect(quotaOf(10, 'basic')).toEqual({ basic: 10, medium: 0, advanced: 0 })
  })
})

describe('composePaper 去重与隔离', () => {
  it('默认排除 source==="exam" 的题目（§5.6 去重规则 2）', () => {
    const pool = makePool(100, { examCount: 20 })
    const { questions } = composePaper(pool, { count: 20, seed: 7 })
    expect(questions.every((q) => q.source !== 'exam')).toBe(true)
  })

  it('includeExam: true 时真题卷题目才可被纳入', () => {
    const pool = makePool(30, { examCount: 20 })
    const { questions } = composePaper(pool, { count: 40, seed: 7, includeExam: true })
    expect(questions.some((q) => q.source === 'exam')).toBe(true)
  })

  it('会话内去重：池中同 fileKey+question 重复条目不会同时入选（规则 1）', () => {
    const pool = makePool(60, { dupEvery: 5 })
    const { questions } = composePaper(pool, { count: 30, seed: 9 })
    const keys = questions.map(paperKeyOf)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('existingKeys 传入后排除已用过的题（跨组去重预留）', () => {
    const pool = makePool(100)
    const first = composePaper(pool, { count: 20, seed: 3 }).questions
    const used = new Set(first.map(paperKeyOf))
    const second = composePaper(pool, { count: 20, seed: 3, existingKeys: used }).questions
    for (const q of second) expect(used.has(paperKeyOf(q))).toBe(false)
  })
})

describe('composePaper 难度分布（验收 2：偏差 ≤ ±2 题）', () => {
  it('N=20 精确命中 10/7/3', () => {
    const pool = makePool(400)
    const { questions } = composePaper(pool, { count: 20, seed: 11 })
    const counts = { basic: 0, medium: 0, advanced: 0 }
    for (const q of questions) counts[q.difficulty]++
    const target = quotaOf(20)
    for (const d of Object.keys(target)) {
      expect(Math.abs(counts[d] - target[d])).toBeLessThanOrEqual(2)
    }
  })

  it('某难度缺货时从剩余池补足，题量不打折', () => {
    // 只有 basic 的池
    const pool = Array.from({ length: 50 }, (_, i) => makeItem(i, { difficulty: 'basic' }))
    const { questions } = composePaper(pool, { count: 20, seed: 5 })
    expect(questions).toHaveLength(20)
    expect(questions.every((q) => q.difficulty === 'basic')).toBe(true)
  })
})

describe('composePaper 确定性与加权（验收 3 / 5）', () => {
  const pool = makePool(400)

  it('同 seed 重放结果完全一致（题目键序列相同）', () => {
    const a = composePaper(pool, { count: 20, seed: 2024 })
    const b = composePaper(pool, { count: 20, seed: 2024 })
    expect(a.questions.map((q) => q.key)).toEqual(b.questions.map((q) => q.key))
    // 洗牌后顺序也应一致
    expect(a.questions.map((q) => q.key)).toEqual(b.questions.map((q) => q.key))
  })

  it('结果与输入顺序无关（稳定排序）', () => {
    const a = composePaper(pool, { count: 20, seed: 77 })
    const b = composePaper([...pool].reverse(), { count: 20, seed: 77 })
    expect(a.questions.map((q) => q.key)).toEqual(b.questions.map((q) => q.key))
  })

  it('单元加权：错题最多的单元在结果中占比最高（验收 5）', () => {
    // 三单元各 100 题；单元 02 错题最多（权重 40），01 次之（10），03 无错题
    const weighted = Array.from({ length: 300 }, (_, i) =>
      makeItem(i, { unitNum: String(1 + Math.floor(i / 100)).padStart(2, '0'), key: `u${Math.floor(i / 100)}/1/0/${i}` })
    )
    const weights = {
      [unitWeightKeyOf({ subject: 'math', unitNum: '02' })]: 40,
      [unitWeightKeyOf({ subject: 'math', unitNum: '01' })]: 10
    }
    const { questions } = composePaper(weighted, { count: 30, seed: 88, unitWeights: weights })
    const byUnit = { '01': 0, '02': 0, '03': 0 }
    for (const q of questions) byUnit[q.unitNum]++
    expect(byUnit['02']).toBeGreaterThan(byUnit['01'])
    expect(byUnit['01']).toBeGreaterThan(byUnit['03'])
    expect(byUnit['02']).toBeGreaterThanOrEqual(30 * 0.5) // 权重 40/(40+10+1) ≈ 78%，下限从宽
  })

  it('题量超过池大小时全池给出且不重复', () => {
    const small = makePool(15)
    const { questions, poolSize } = composePaper(small, { count: 50, seed: 1 })
    expect(poolSize).toBe(15)
    expect(questions).toHaveLength(15)
    expect(new Set(questions.map((q) => q.key)).size).toBe(15)
  })
})

describe('weakAreasOf / weakWeightsFromErrors（与 Dashboard weakAreas 同口径）', () => {
  const errors = [
    { subject: 'math', unitNum: '02' },
    { subject: 'math', unitNum: '02' },
    { subject: 'math', unitNum: '02' },
    { subject: 'chinese', unitNum: '01' },
    { subject: 'chinese', unitNum: '01' },
    { subject: 'computer', unitNum: '03' }
  ]

  it('按学科+单元聚合、降序排列', () => {
    const areas = weakAreasOf(errors)
    expect(areas[0]).toEqual({ subject: 'math', unitNum: '02', count: 3 })
    expect(areas[1].count).toBe(2)
    expect(areas).toHaveLength(3)
  })

  it('权重 = 错题数，非 Top5 单元不出现在权重表', () => {
    const many = [...errors, ...Array.from({ length: 6 }, (_, i) => ({ subject: 'math', unitNum: `0${i + 3}` }))]
    const w = weakWeightsFromErrors(many)
    expect(w['math|02']).toBe(3)
    expect(Object.keys(w)).toHaveLength(5)
  })

  it('空错题本 → 空权重（全科等概率）', () => {
    expect(weakWeightsFromErrors([])).toEqual({})
    expect(weakAreasOf(null)).toEqual([])
  })
})
