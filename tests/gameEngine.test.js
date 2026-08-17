/**
 * gameEngine Store —— 纯逻辑单元测试
 * 覆盖不依赖 IndexedDB 的确定性逻辑：
 *  - getLevel：XP → 等级/进度计算
 *  - getStreak：连续学习天数计算
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameEngineStore, calcStreakBonus } from '@/stores/gameEngine'

/** 日期工具：返回 YYYY-MM-DD */
function dateStr(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 构造一条每日统计记录 */
function stat(date, checkin = true) {
  return { date, checkin, xp: 10, filesVisited: 1, questionsAnswered: 0 }
}

describe('getLevel - 等级计算', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('totalXP=0 → 1 级，进度 0', () => {
    const store = useGameEngineStore()
    const r = store.getLevel(0)
    expect(r.level.lv).toBe(1)
    expect(r.level.title).toBe('学徒')
    expect(r.next.lv).toBe(2)
    expect(r.progress).toBe(0)
    expect(r.needXP).toBe(50)
  })

  it('totalXP=50 → 2 级（边界值）', () => {
    const store = useGameEngineStore()
    const r = store.getLevel(50)
    expect(r.level.lv).toBe(2)
  })

  it('totalXP=100 → 仍为 2 级（未达 120）', () => {
    const store = useGameEngineStore()
    const r = store.getLevel(100)
    expect(r.level.lv).toBe(2)
  })

  it('totalXP=9300 → 30 级满级，无下一级', () => {
    const store = useGameEngineStore()
    const r = store.getLevel(9300)
    expect(r.level.lv).toBe(30)
    expect(r.level.title).toBe('状元')
    expect(r.next).toBeNull()
    expect(r.progress).toBe(1)
    expect(r.needXP).toBe(0)
  })

  it('totalXP 超过满级仍返回 30 级', () => {
    const store = useGameEngineStore()
    const r = store.getLevel(99999)
    expect(r.level.lv).toBe(30)
  })

  it('等级进度随 XP 单调递增', () => {
    const store = useGameEngineStore()
    const lv1 = store.getLevel(10).level.lv
    const lv2 = store.getLevel(500).level.lv
    const lv3 = store.getLevel(3000).level.lv
    expect(lv1).toBeLessThan(lv2)
    expect(lv2).toBeLessThan(lv3)
  })
})

describe('getStreak - 连续学习天数', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('无任何记录 → 0', () => {
    const store = useGameEngineStore()
    expect(store.getStreak([])).toBe(0)
  })

  it('今天打卡 + 昨天打卡 → 2', () => {
    const store = useGameEngineStore()
    const stats = [stat(dateStr(0)), stat(dateStr(-1))]
    expect(store.getStreak(stats)).toBe(2)
  })

  it('今天未打卡，昨天打卡 → 1（从昨天起算）', () => {
    const store = useGameEngineStore()
    const stats = [stat(dateStr(-1))]
    expect(store.getStreak(stats)).toBe(1)
  })

  it('今天打卡，昨天未打卡 → 1（中断）', () => {
    const store = useGameEngineStore()
    const stats = [stat(dateStr(0)), stat(dateStr(-2))]
    expect(store.getStreak(stats)).toBe(1)
  })

  it('连续 7 天 → 7', () => {
    const store = useGameEngineStore()
    const stats = []
    for (let i = 0; i < 7; i++) stats.push(stat(dateStr(-i)))
    expect(store.getStreak(stats)).toBe(7)
  })

  it('今天未打卡但过去连续 5 天 → 5', () => {
    const store = useGameEngineStore()
    const stats = []
    for (let i = 1; i <= 5; i++) stats.push(stat(dateStr(-i)))
    expect(store.getStreak(stats)).toBe(5)
  })
})

describe('calcStreakBonus - 连击加成计算', () => {
  it('连击 0-2 → 无加成', () => {
    expect(calcStreakBonus(0)).toBe(0)
    expect(calcStreakBonus(1)).toBe(0)
    expect(calcStreakBonus(2)).toBe(0)
  })

  it('连击 3-5 → +2', () => {
    expect(calcStreakBonus(3)).toBe(2)
    expect(calcStreakBonus(4)).toBe(2)
    expect(calcStreakBonus(5)).toBe(2)
  })

  it('连击 6-8 → +4', () => {
    expect(calcStreakBonus(6)).toBe(4)
    expect(calcStreakBonus(8)).toBe(4)
  })

  it('连击 15 → 封顶 +10', () => {
    expect(calcStreakBonus(15)).toBe(10)
    expect(calcStreakBonus(30)).toBe(10)
  })
})

describe('sessionStreak - 会话连击状态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始连击为 0', () => {
    const store = useGameEngineStore()
    expect(store.sessionStreak).toBe(0)
    expect(store.maxSessionStreak).toBe(0)
  })

  it('连续答对递增连击并记录最大值', () => {
    const store = useGameEngineStore()
    store.sessionStreak = 5
    store.maxSessionStreak = 5
    expect(store.sessionStreak).toBe(5)
    expect(store.maxSessionStreak).toBe(5)
  })

  it('resetSessionStreak 清零连击', () => {
    const store = useGameEngineStore()
    store.sessionStreak = 7
    store.resetSessionStreak()
    expect(store.sessionStreak).toBe(0)
  })
})
