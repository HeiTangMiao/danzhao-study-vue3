/**
 * useSpacedReview —— SM-2 算法单元测试
 * 覆盖 calculateSM2 纯函数的全部分支：
 *  - 回忆失败（grade < 3）重置逻辑
 *  - 回忆成功（grade >= 3）间隔递增逻辑
 *  - easeFactor 更新公式与下限
 *  - nextReviewDate 计算
 */
import { describe, it, expect } from 'vitest'
import { calculateSM2, GRADES } from '@/composables/useSpacedReview'

/** 构造一条初始错题记录 */
function makeError(overrides = {}) {
  return {
    repetitions: 0,
    easeFactor: 2.5,
    interval: 0,
    ...overrides
  }
}

describe('calculateSM2 - 首次复习', () => {
  it('首次 GOOD(4)：interval=1，repetitions=1', () => {
    const r = calculateSM2(makeError(), GRADES.GOOD)
    expect(r.interval).toBe(1)
    expect(r.repetitions).toBe(1)
  })

  it('首次 EASY(5)：interval=1，easeFactor 增加 0.1', () => {
    const r = calculateSM2(makeError(), GRADES.EASY)
    expect(r.interval).toBe(1)
    expect(r.repetitions).toBe(1)
    expect(r.easeFactor).toBe(2.6)
  })

  it('首次 AGAIN(0)：interval=1，repetitions=0（重置）', () => {
    const r = calculateSM2(makeError(), GRADES.AGAIN)
    expect(r.interval).toBe(1)
    expect(r.repetitions).toBe(0)
  })
})

describe('calculateSM2 - 间隔递增', () => {
  it('第二次 GOOD(4)：interval=6', () => {
    const r = calculateSM2(makeError({ repetitions: 1, interval: 1 }), GRADES.GOOD)
    expect(r.interval).toBe(6)
    expect(r.repetitions).toBe(2)
  })

  it('第三次 GOOD(4)：interval = round(6 * easeFactor)', () => {
    const r = calculateSM2(
      makeError({ repetitions: 2, interval: 6, easeFactor: 2.5 }),
      GRADES.GOOD
    )
    expect(r.interval).toBe(15) // round(6 * 2.5) = 15
    expect(r.repetitions).toBe(3)
  })

  it('连续复习间隔单调递增', () => {
    let e = makeError()
    let prev = 0
    for (let i = 0; i < 6; i++) {
      const r = calculateSM2(e, GRADES.GOOD)
      expect(r.interval).toBeGreaterThan(prev)
      prev = r.interval
      e = { ...e, ...r }
    }
  })
})

describe('calculateSM2 - 回忆失败重置', () => {
  it('已复习多轮后 AGAIN(0)：repetitions 归零，interval 重置为 1', () => {
    const r = calculateSM2(
      makeError({ repetitions: 5, interval: 30, easeFactor: 2.4 }),
      GRADES.AGAIN
    )
    expect(r.repetitions).toBe(0)
    expect(r.interval).toBe(1)
  })

  it('HARD(3) 视为成功：repetitions 递增', () => {
    const r = calculateSM2(makeError(), GRADES.HARD)
    expect(r.repetitions).toBe(1)
    expect(r.interval).toBe(1)
  })
})

describe('calculateSM2 - easeFactor 公式', () => {
  it('GOOD(4)：easeFactor 不变（+0）', () => {
    const r = calculateSM2(makeError({ easeFactor: 2.5 }), GRADES.GOOD)
    expect(r.easeFactor).toBe(2.5)
  })

  it('HARD(3)：easeFactor 减少 0.14', () => {
    const r = calculateSM2(makeError({ easeFactor: 2.5 }), GRADES.HARD)
    expect(r.easeFactor).toBe(2.36)
  })

  it('EASY(5)：easeFactor 增加 0.1', () => {
    const r = calculateSM2(makeError({ easeFactor: 2.5 }), GRADES.EASY)
    expect(r.easeFactor).toBe(2.6)
  })

  it('easeFactor 下限为 1.3', () => {
    const r = calculateSM2(makeError({ easeFactor: 1.3 }), GRADES.AGAIN)
    expect(r.easeFactor).toBeGreaterThanOrEqual(1.3)
  })
})

describe('calculateSM2 - nextReviewDate', () => {
  it('返回合法的 YYYY-MM-DD 日期字符串', () => {
    const r = calculateSM2(makeError(), GRADES.GOOD)
    expect(r.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('interval=6 时日期比今天晚 6 天', () => {
    const r = calculateSM2(makeError({ repetitions: 1, interval: 1 }), GRADES.GOOD)
    const today = new Date()
    const expected = new Date(today)
    expected.setDate(expected.getDate() + 6)
    const y = expected.getFullYear()
    const m = String(expected.getMonth() + 1).padStart(2, '0')
    const d = String(expected.getDate()).padStart(2, '0')
    expect(r.nextReviewDate).toBe(`${y}-${m}-${d}`)
  })
})
