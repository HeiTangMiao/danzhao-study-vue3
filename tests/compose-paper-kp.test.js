/**
 * kp 粒度组卷权重测试（批 D D-3，P1-14）
 *
 * 核心红线（batch-d-tasks §0.1）：kp 维度的**权重聚合键 = error.fileKey**（= 题目 kp 同源），
 *   **绝不能**用 error.kp —— 那是 A-3 用户自由文本归因标签，与题目 kp 永不匹配，
 *   用错会让权重恒 1、组卷静默退化为均匀抽取（不报错，最难发现）。
 *
 * 覆盖（batch-d-tasks D-3 测试要点 ③–⑦ + ② 的产物形状）：
 *  - ③ weightKeyOf 维度口径 + 既有 unitWeightKeyOf 转调
 *  - ④ 反向锚定「不得用 e.kp」：两种构造证明聚合键是 fileKey
 *  - ⑤ 同单元不同 kp 不串味（kp 维度加权生效）
 *  - ⑥ unit 维度回归（缺省 'unit'，行为与改造前一致）
 *  - ⑦ 综合页零特例（复习测验页独立成 kp，不并入单元）
 */
import { describe, it, expect } from 'vitest'
import {
  composePaper,
  weakWeightsFromErrors,
  weightKeyOf,
  unitWeightKeyOf,
  WEIGHT_DIMENSIONS
} from '@/utils/composePaper'
import { normalizeBankItem } from '@/content/practiceBank'

/** 合成运行时条目（字段名与 normalizeBankItem 产出一致） */
function makeItem(i, over = {}) {
  const kp = over.kp || 'math_01_a'
  return {
    key: over.key || `k${i}`,
    subject: 'math',
    unitNum: '01',
    unitTitle: '测试单元',
    fileIndex: 0,
    fileKey: kp,
    fileTitle: '测试页',
    question: `第 ${i} 题`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    answer: `解析 ${i}`,
    difficulty: 'basic',
    gradable: true,
    source: 'quiz',
    ...over
  }
}

/** 造 n 条同 kp 的 basic 条目（key 唯一） */
function poolOf(kp, n, offset = 0) {
  return Array.from({ length: n }, (_, i) =>
    makeItem(offset + i, { key: `${kp}#${i}`, kp, fileKey: kp })
  )
}

describe('D-3 weightKeyOf 维度口径（③）', () => {
  it('kp 维度 = subject|kp；unit 维度 = subject|unitNum；缺省 = unit', () => {
    const kpItem = { subject: 'math', unitNum: '11', kp: 'math_11_03-椭圆' }
    expect(weightKeyOf(kpItem, WEIGHT_DIMENSIONS.KP)).toBe('math|math_11_03-椭圆')
    expect(weightKeyOf(kpItem, WEIGHT_DIMENSIONS.UNIT)).toBe('math|11')
    // 缺省维度恒 'unit'（向后兼容）
    expect(weightKeyOf(kpItem)).toBe('math|11')
    expect(weightKeyOf(kpItem, 'unit')).toBe(unitWeightKeyOf(kpItem))
  })

  it('② 产物形状：normalizeBankItem 展开 kp；缺 kp 回落 fk', () => {
    // 产物带 kp → 用 kp
    expect(normalizeBankItem({ k: 'x', fk: 'math_01_p', kp: 'math_01_p' }).kp).toBe('math_01_p')
    // 显式不同值 → 用产物值（B 档前向兼容的证明：产物值优先）
    expect(normalizeBankItem({ k: 'x', fk: 'math_01_p', kp: '页内-椭圆' }).kp).toBe('页内-椭圆')
    // 旧产物 / 手写 mock 缺 kp → 回落 fk
    expect(normalizeBankItem({ k: 'x', fk: 'math_01_p' }).kp).toBe('math_01_p')
    // fk 也缺 → 空串（不抛）
    expect(normalizeBankItem({ k: 'x' }).kp).toBe('')
  })
})

describe('D-3 反向锚定：kp 维度权重按 error.fileKey 聚合，绝不用 e.kp（④）', () => {
  it('e.kp 相同但 fileKey 不同 → 两条独立权重键（不按 kp 合并）', () => {
    const w = weakWeightsFromErrors(
      [
        { subject: 'math', fileKey: 'math_11_a', kp: '一元二次' },
        { subject: 'math', fileKey: 'math_11_b', kp: '一元二次' }
      ],
      5,
      WEIGHT_DIMENSIONS.KP
    )
    // 若误用 e.kp 聚合，会只剩一条 'math|一元二次'（=2）→ 权重键与题目 kp 永不匹配
    expect(Object.keys(w).sort()).toEqual(['math|math_11_a', 'math|math_11_b'])
    expect(w['math|math_11_a']).toBe(1)
    expect(w['math|math_11_b']).toBe(1)
    expect(w['math|一元二次']).toBeUndefined()
  })

  it('e.kp 不同但 fileKey 相同 → 权重键相同（合并计数 +2）', () => {
    const w = weakWeightsFromErrors(
      [
        { subject: 'math', fileKey: 'math_11_a', kp: '甲' },
        { subject: 'math', fileKey: 'math_11_a', kp: '乙' }
      ],
      5,
      WEIGHT_DIMENSIONS.KP
    )
    expect(Object.keys(w)).toEqual(['math|math_11_a'])
    expect(w['math|math_11_a']).toBe(2)
    expect(w['math|甲']).toBeUndefined()
    expect(w['math|乙']).toBeUndefined()
  })

  it('unit 维度仍按 unitNum 聚合（未被 kp 改动波及）', () => {
    const errors = [
      { subject: 'math', unitNum: '11', fileKey: 'math_11_a' },
      { subject: 'math', unitNum: '11', fileKey: 'math_11_b' }
    ]
    expect(weakWeightsFromErrors(errors, 5, WEIGHT_DIMENSIONS.UNIT)).toEqual({ 'math|11': 2 })
    // 缺省 = unit（既有调用零变动）
    expect(weakWeightsFromErrors(errors)).toEqual({ 'math|11': 2 })
  })
})

describe('D-3 组卷加权（⑤⑥⑦）', () => {
  it('⑤ 同单元不同 kp 不串味：仅其一有错题 → 该 kp 抽取占比更高', () => {
    // 同一 unitNum '01' 下两个 fileKey（= 两个 kp），错题只落在 ..._a
    const errors = [
      ...Array.from({ length: 6 }, () => ({ subject: 'math', unitNum: '01', fileKey: 'math_01_a', kp: '一元二次' })),
      { subject: 'math', unitNum: '01', fileKey: 'math_01_b', kp: '甲' }
    ]
    const weights = weakWeightsFromErrors(errors, 5, WEIGHT_DIMENSIONS.KP)
    expect(weights['math|math_01_a']).toBe(6)
    expect(weights['math|math_01_b']).toBe(1)

    const pool = [...poolOf('math_01_a', 20, 0), ...poolOf('math_01_b', 20, 100)]
    const { questions } = composePaper(pool, {
      count: 20,
      seed: 88,
      weightDimension: WEIGHT_DIMENSIONS.KP,
      unitWeights: weights
    })
    const a = questions.filter((q) => q.kp === 'math_01_a').length
    const b = questions.filter((q) => q.kp === 'math_01_b').length
    expect(a).toBeGreaterThan(b)
  })

  it('⑤b 权重维度与权重表口径须一致：kp 权重误用于 unit 维度 → 退化为均匀（陷阱的可观测形态）', () => {
    const kpWeights = { 'math|math_01_a': 6 } // kp 维度键
    const pool = [...poolOf('math_01_a', 20, 0), ...poolOf('math_01_b', 20, 100)]
    // 缺省 unit 维度 → 分组键是 'math|01'，与 kp 键永不匹配 → 权重恒 1（均匀）
    const { questions } = composePaper(pool, { count: 20, seed: 88, unitWeights: kpWeights })
    const a = questions.filter((q) => q.kp === 'math_01_a').length
    expect(a).toBeLessThanOrEqual(15) // 均匀下不会像 kp 维度那样被拉到 ~18
  })

  it('⑥ unit 维度回归：缺省维度下行为与改造前一致（同 seed 重放稳定）', () => {
    const pool = [...poolOf('math_01_a', 20, 0), ...poolOf('math_01_b', 20, 100)]
    const weights = { 'math|01': 40 }
    const a = composePaper(pool, { count: 20, seed: 7, unitWeights: weights })
    const b = composePaper(pool, { count: 20, seed: 7, unitWeights: weights })
    expect(a.questions.map((q) => q.key)).toEqual(b.questions.map((q) => q.key))
  })

  it('⑦ 综合页零特例：复习测验页在 kp 维度独立成键（不并入 math_11 单元）', () => {
    const errors = [
      { subject: 'math', unitNum: '11', fileKey: 'math_11_复习测验', kp: '复习测验' },
      { subject: 'math', unitNum: '11', fileKey: 'math_11_03-椭圆', kp: '椭圆' }
    ]
    const kpW = weakWeightsFromErrors(errors, 5, WEIGHT_DIMENSIONS.KP)
    expect(kpW['math|math_11_复习测验']).toBe(1)
    expect(kpW['math|math_11_03-椭圆']).toBe(1)
    // kp 维度不产生单元键 'math|11'（= 综合页不会被并入单元）
    expect(kpW['math|11']).toBeUndefined()

    // 对照：unit 维度下二者才合并到 math|11（说明零特例确实是 kp 维度带来的）
    const unitW = weakWeightsFromErrors(errors, 5, WEIGHT_DIMENSIONS.UNIT)
    expect(unitW['math|11']).toBe(2)
  })
})
