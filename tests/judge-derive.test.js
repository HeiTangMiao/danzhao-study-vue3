/**
 * judgeDerive 纯函数单测（P0-1）
 * 覆盖：
 *  - 主判据（答案加粗「正确。/错误。」）+ 题型判据（type==='judge' 或题干「判断：」开头）
 *  - 更正 1：无 type、题干前缀命中的判断题同样派生
 *  - 例外：命中形态但答案非加粗前缀 → null（不派生）
 *  - answer 缺省回退 solution（两端同口径）
 *  - 幂等与健壮性（null/非对象）
 */
import { describe, it, expect } from 'vitest'
import {
  JUDGE_ANSWER_RE,
  JUDGE_QUESTION_RE,
  isJudgeItem,
  deriveJudge,
  scanJudgeExceptions,
  judgeAnswerOf
} from '@/content/judgeDerive'

describe('judgeDerive 判据与派生', () => {
  it('type=judge + 加粗「正确。」→ correctIndex 0', () => {
    const r = deriveJudge({ type: 'judge', question: 'x', answer: '**正确。**解析' })
    expect(r).toEqual({ options: ['正确', '错误'], correctIndex: 0, derived: true })
  })

  it('type=judge + 加粗「错误。」→ correctIndex 1', () => {
    const r = deriveJudge({ type: 'judge', question: 'x', answer: '**错误。**解析' })
    expect(r).toEqual({ options: ['正确', '错误'], correctIndex: 1, derived: true })
  })

  it('无 type、题干以「判断：」开头 + 加粗答案 → 同样派生（覆盖更正 1）', () => {
    const r = deriveJudge({ question: '判断：1+1=2', answer: '**正确。**对' })
    expect(r && r.correctIndex).toBe(0)
    expect(isJudgeItem({ question: '判断：x' })).toBe(true)
  })

  it('英文冒号「判断:」也可命中，且允许前导空白', () => {
    expect(isJudgeItem({ question: '判断: x' })).toBe(true)
    expect(isJudgeItem({ question: '   判断：x' })).toBe(true)
    expect(isJudgeItem({ question: '真的是判断吗' })).toBe(false)
  })

  it('非判断题（无 type 无前缀）不派生，即使答案像判断答案', () => {
    expect(deriveJudge({ question: '1+1=?', answer: '**正确。**' })).toBeNull()
  })

  it('命中形态但答案非加粗前缀 → 返回 null（不派生）', () => {
    expect(deriveJudge({ type: 'judge', question: 'x', answer: '正确。无加粗' })).toBeNull()
    expect(deriveJudge({ type: 'judge', question: 'x', answer: '**对**。变体标记' })).toBeNull()
  })

  it('answer 缺省回退 solution（两端同口径）', () => {
    const r = deriveJudge({ type: 'judge', question: 'x', solution: '**错误。**' })
    expect(r && r.correctIndex).toBe(1)
    expect(judgeAnswerOf({ solution: 's' })).toBe('s')
    expect(judgeAnswerOf({ answer: 'a', solution: 's' })).toBe('a')
    expect(judgeAnswerOf(null)).toBe('')
  })

  it('幂等：同一输入多次派生结果完全一致', () => {
    const item = { type: 'judge', question: 'x', answer: '**正确。**' }
    expect(deriveJudge(item)).toEqual(deriveJudge(item))
  })

  it('健壮性：null / 非对象不抛', () => {
    expect(isJudgeItem(null)).toBe(false)
    expect(isJudgeItem(undefined)).toBe(false)
    expect(deriveJudge(undefined)).toBeNull()
    expect(scanJudgeExceptions(null)).toEqual([])
  })

  it('正则常量可复用且语义正确', () => {
    expect(JUDGE_ANSWER_RE.test('**错误。**x')).toBe(true)
    expect(JUDGE_ANSWER_RE.test('**正确。**')).toBe(true)
    expect(JUDGE_QUESTION_RE.test('  判断：x')).toBe(true)
  })
})

describe('scanJudgeExceptions 例外扫描', () => {
  it('no-bold-prefix / variant-marker / empty-answer 三类各归其位', () => {
    const out = scanJudgeExceptions([
      { type: 'judge', question: 'a', answer: '正确。', k: 'K1', s: 'chinese' },
      { type: 'judge', question: 'b', answer: '**对**。', k: 'K2', s: 'computer' },
      { type: 'judge', question: 'c', answer: '', k: 'K3', s: 'math' }
    ])
    expect(out).toHaveLength(3)
    expect(out[0]).toMatchObject({ k: 'K1', s: 'chinese', reason: 'no-bold-prefix' })
    expect(out[1]).toMatchObject({ k: 'K2', s: 'computer', reason: 'variant-marker' })
    expect(out[2]).toMatchObject({ k: 'K3', s: 'math', reason: 'empty-answer' })
    expect(out[0].answerHead.length).toBeLessThanOrEqual(16)
  })

  it('已派生的判断题不计入例外', () => {
    expect(scanJudgeExceptions([{ type: 'judge', question: 'a', answer: '**正确。**' }])).toEqual([])
  })

  it('非判断题一律不计入例外', () => {
    expect(scanJudgeExceptions([{ question: '普通题', answer: '普通答案' }])).toEqual([])
  })
})
