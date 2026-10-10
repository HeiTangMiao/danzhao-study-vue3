/**
 * review-due —— 批 C C-1-1 单测（due 判据唯一真相源 + 掌握语义拆分 + 统一评分入口）
 * 覆盖 batch-c-tasks.md §2 C-1-1 测试要点 ①–⑨：
 *  - ① isDue 新行/明天/昨天
 *  - ② isDue 对已复习过且到期的行必须 true（反向锚定，防把 reviewed 判据改回来）
 *  - ③ isDue 缺排期 → true；已掌握 → false（与 removeMastered 同口径）
 *  - ④ isMastered 四组交叉用例（含「点了忘了」缺陷回归锚点）
 *  - ⑤ hasReviewed 与 isMastered 互不相关
 *  - ⑥ pickDue 排序 / 截断 / 不改入参
 *  - ⑧ GRADE_META 与 GRADES 同源
 *  - ⑨ gradeCard 四档真实写库、不写 reviewed、不改入参
 *
 * 判据函数为纯函数（零外部依赖），可直接直测；gradeCard 需 db → fake-indexeddb + Pinia。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  GRADES,
  GRADE_META,
  REVIEW_SESSION_LIMIT,
  isMastered,
  hasReviewed,
  isDue,
  countDue,
  pickDue,
  gradeCard,
  calculateSM2,
  useSpacedReview
} from '@/composables/useSpacedReview'
import { useStudyDbStore } from '@/stores/studyDb'

const TODAY = '2025-01-15'

describe('① isDue —— 基本到期判据', () => {
  it('新建行（nextReviewDate = 今天）→ true', () => {
    expect(isDue({ nextReviewDate: TODAY }, TODAY)).toBe(true)
  })
  it('明天 → false', () => {
    expect(isDue({ nextReviewDate: '2025-01-16' }, TODAY)).toBe(false)
  })
  it('昨天 → true', () => {
    expect(isDue({ nextReviewDate: '2025-01-14' }, TODAY)).toBe(true)
  })
})

describe('② isDue —— 已复习过、排期到期仍必须入队（反向锚定）', () => {
  it('lastReviewedAt 有值、reviewed 未写、排期到期 → true', () => {
    // 旧实现用 `!e.reviewed` 挡 due，会让复习过的卡永不再现；此用例锚定新口径
    expect(isDue({ nextReviewDate: '2025-01-14', lastReviewedAt: 1700000000000 }, TODAY)).toBe(true)
  })
})

describe('③ isDue —— 从严兜底与已掌握出列', () => {
  it('缺 nextReviewDate → true（漏卡从严）', () => {
    expect(isDue({}, TODAY)).toBe(true)
    expect(isDue({ lastReviewedAt: 123 }, TODAY)).toBe(true)
  })
  it('已掌握（repetitions>=3 且 interval>=7）→ false（与 removeMastered 同口径）', () => {
    expect(isDue({ repetitions: 3, interval: 7, nextReviewDate: '2025-01-01' }, TODAY)).toBe(false)
  })
})

describe('④ isMastered —— 语义拆分四组交叉用例', () => {
  it('{reviewed:true, repetitions:1} → true（存量手动标注，不能掉回待复习）', () => {
    expect(isMastered({ reviewed: true, repetitions: 1 })).toBe(true)
  })
  it('{reviewed:false, repetitions:3, interval:7} → true（SM-2 真掌握）', () => {
    expect(isMastered({ reviewed: false, repetitions: 3, interval: 7 })).toBe(true)
  })
  it('{reviewed:false, lastReviewedAt:now, repetitions:0} → false（点了「忘了」缺陷回归锚点）', () => {
    // 最重要的一条：复习时点「忘了」的卡不得被判成已掌握
    expect(isMastered({ reviewed: false, lastReviewedAt: Date.now(), repetitions: 0 })).toBe(false)
  })
  it('{legacyMastered:true} → true；{legacyMastered:false, reviewed:false, repetitions:0} → false', () => {
    expect(isMastered({ legacyMastered: true })).toBe(true)
    expect(isMastered({ legacyMastered: false, reviewed: false, repetitions: 0 })).toBe(false)
  })
})

describe('⑤ hasReviewed 与 isMastered 互不相关', () => {
  it('已复习过但未掌握', () => {
    const e = { lastReviewedAt: 123 }
    expect(hasReviewed(e)).toBe(true)
    expect(isMastered(e)).toBe(false)
  })
  it('已掌握但无 lastReviewedAt', () => {
    const e = { reviewed: true }
    expect(hasReviewed(e)).toBe(false)
    expect(isMastered(e)).toBe(true)
  })
})

describe('⑥ pickDue —— 排序 / 截断 / 不改入参', () => {
  const mk = (id, nextReviewDate, createdAt) => ({
    id, nextReviewDate, createdAt, repetitions: 0, interval: 0
  })
  const list = [
    mk('a', '2025-01-10', 100),
    mk('b', '2025-01-08', 300),
    mk('c', '2025-01-08', 200),
    mk('d', '2025-01-12', 50),
    mk('e', '2025-01-09', 400),
    mk('f', '2025-01-11', 60),
    mk('g', '2025-01-13', 10),
    mk('h', '2025-01-14', 20),
    mk('i', '2025-01-15', 30),
    mk('j', '2025-01-16', 40)
  ]

  it('排期升序；同排期按 createdAt 升序', () => {
    const out = pickDue(list, { today: '2025-01-20' })
    expect(out.map((e) => e.id)).toEqual(['c', 'b', 'e', 'a', 'f', 'd', 'g', 'h', 'i', 'j'])
  })
  it('未到期的行不入队', () => {
    const out = pickDue(list, { today: '2025-01-09' })
    expect(out.map((e) => e.id)).toEqual(['c', 'b', 'e'])
  })
  it('limit 截断长度', () => {
    const out = pickDue(list, { limit: 3, today: '2025-01-20' })
    expect(out).toHaveLength(3)
    expect(out.map((e) => e.id)).toEqual(['c', 'b', 'e'])
  })
  it('不改入参（复制后排序）', () => {
    const before = JSON.stringify(list)
    pickDue(list, { today: '2025-01-20' })
    expect(JSON.stringify(list)).toBe(before)
  })
})

describe('⑧ GRADE_META 与 GRADES 同源', () => {
  it('每个 meta 项的 grade 与 GRADES[key] 一致', () => {
    expect(GRADE_META.every((m) => GRADES[m.key] === m.grade)).toBe(true)
  })
  it('四档齐备且顺序为 忘了/困难/良好/简单', () => {
    expect(GRADE_META.map((m) => m.label)).toEqual(['忘了', '困难', '良好', '简单'])
  })
  it('REVIEW_SESSION_LIMIT 落在 20–30 区间', () => {
    expect(REVIEW_SESSION_LIMIT).toBeGreaterThanOrEqual(20)
    expect(REVIEW_SESSION_LIMIT).toBeLessThanOrEqual(30)
  })
})

describe('⑨ gradeCard —— 统一写库入口', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  it('评分后 next 前进、reviewCount+1、不写 reviewed、入参不被改动、可读回', async () => {
    const r = await db.recordError('math', '01', 'q⑨', 'A', 'B', 'exp', { fileKey: 'math_01_due9' })
    const err = (await db.getAllErrors()).find((e) => e.id === r.id)
    const snapshot = { ...err }

    const { next, sm2 } = await gradeCard(db, err, GRADES.EASY)

    expect(next.interval).toBe(sm2.interval)
    expect(next.nextReviewDate).toBe(sm2.nextReviewDate)
    // EASY 首次：interval=1 → nextReviewDate 前进到明天
    expect(next.nextReviewDate > err.nextReviewDate).toBe(true)
    expect(next.reviewCount).toBe((err.reviewCount || 0) + 1)
    expect(next.lastReviewedAt).toBeTruthy()
    // 缺陷根除：不写 reviewed（recordError 初始为 false，这里保持 false）
    expect(next.reviewed).toBe(false)
    // 入参未被改动
    expect(err).toEqual(snapshot)

    const back = (await db.getAllErrors()).find((e) => e.id === r.id)
    expect(back.nextReviewDate).toBe(next.nextReviewDate)
    expect(back.reviewCount).toBe(next.reviewCount)
    expect(back.lastReviewedAt).toBe(next.lastReviewedAt)
    expect(back.reviewed).toBe(false)
  })

  it('gradeCard 后 isDue(...) 仍为 false（今日已复习，排期推到明天）', async () => {
    const r = await db.recordError('math', '01', 'q⑨b', 'A', 'B', 'exp', { fileKey: 'math_01_due9b' })
    const err = (await db.getAllErrors()).find((e) => e.id === r.id)
    const { next } = await gradeCard(db, err, GRADES.GOOD)
    const today = new Date()
    const ds = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(isDue(next, ds)).toBe(false)
  })

  it('countDue 与 pickDue 长度一致（同一判据）', async () => {
    await db.recordError('math', '01', 'q⑨c', 'A', 'B', 'exp', { fileKey: 'math_01_due9c' })
    await db.recordError('chinese', '02', 'q⑨d', 'A', 'B', 'exp', { fileKey: 'chinese_02_due9d' })
    const errors = await db.getAllErrors()
    const today = new Date()
    const ds = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(countDue(errors, ds)).toBe(pickDue(errors, { today: ds }).length)
  })

  it('(a) 防退化：reviewCard（@deprecated 旧名）也不得写 reviewed', async () => {
    // 它是当前全库零调用的死代码，但保留着旧写库路径的入口 —— 锚住它，防后人把缺陷从这个口子放回来。
    const r = await db.recordError('math', '01', 'q-rc', 'A', 'B', 'exp', { fileKey: 'math_01_rc' })
    const err = (await db.getAllErrors()).find((e) => e.id === r.id)
    const review = useSpacedReview()
    await review.reviewCard(err, GRADES.GOOD)
    const back = (await db.getAllErrors()).find((e) => e.id === r.id)
    expect(back.reviewed).toBe(false) // 关键：旧名路径同样不写 reviewed
    expect(back.lastReviewedAt).toBeTruthy()
    expect(back.reviewCount).toBe(1)
  })

  it('(b) 防退化：迁移的常态对齐（markMastered 的 reviewed 会被下次迁移固化为 legacyMastered）', async () => {
    // 设计意图：幂等迁移兼作「常态对齐」—— 手动标注(reviewed:true)下一次挂载即被固化为 legacyMastered。
    const r = await db.recordError('math', '01', 'q-mm', 'A', 'B', 'exp', { fileKey: 'math_01_mm' })
    const err = (await db.getAllErrors()).find((e) => e.id === r.id)
    // 模拟 markMastered 的落库效果：reviewed:true（走 gradeCard 单次写库）
    await gradeCard(db, { ...err, reviewed: true }, GRADES.GOOD)
    const row = (await db.getAllErrors()).find((e) => e.id === r.id)
    expect(isMastered(row)).toBe(true)
    expect(row.legacyMastered).toBeUndefined() // 尚未固化

    const before = (await db.getAllErrors()).filter(isMastered).length
    const n = await db.migrateLegacyMastered()
    expect(n).toBe(1)
    const after = (await db.getAllErrors()).filter(isMastered).length
    expect(after).toBe(before) // 计数不变（用户可见数字零变化）
    const row2 = (await db.getAllErrors()).find((e) => e.id === r.id)
    expect(row2.legacyMastered).toBe(true) // 已固化
    expect(isMastered(row2)).toBe(true)
    expect(await db.migrateLegacyMastered()).toBe(0) // 幂等
  })
})

describe('⑫ uniform 前提 —— 新卡四档预估间隔必须相同（R3 防漂移）', () => {
  it('{repetitions:0} 的行，四档 calculateSM2(...).interval 全部相等', () => {
    // GradeButtons 的 uniform 分支会渲染那行「首次复习四档间隔相同」文案。
    // 它成立的前提，就是这里断言的事实：新卡四档预估间隔确实相同。
    // 若将来有人改 calculateSM2，让新卡四档产生不同间隔，那行文案会无声地说谎 —— 本断言即警报器。
    const fresh = { repetitions: 0, interval: 0, easeFactor: 2.5 }
    const set = new Set(GRADE_META.map((m) => calculateSM2(fresh, m.grade).interval))
    expect(set.size).toBe(1)
  })
})

describe('⑬ EF 保留的后果锚点 —— 高难度因子卡恢复复习的间隔序列（R3 防漂移）', () => {
  /** 从 repetitions:0 起连续评 GOOD 三次，返回 interval 序列（模拟一张卡恢复复习的推进） */
  function goodSequence(ef0) {
    let e = { repetitions: 0, interval: 0, easeFactor: ef0 }
    const seq = []
    for (let i = 0; i < 3; i++) {
      const { interval, repetitions, easeFactor } = calculateSM2(e, GRADES.GOOD)
      seq.push(interval)
      e = { ...e, repetitions, interval, easeFactor }
    }
    return seq
  }

  it('easeFactor=3.0 连续 GOOD 三次 → 1 → 6 → 18', () => {
    // 这是「F3 保留 easeFactor、不归零」裁决的后果锚点：EF 要到第 3 次连续答对才起作用
    // （前两个间隔 1/6 是硬编码的，与 EF 无关）。若把 easeFactor 改回归零（2.5），
    // 该序列会塌成 1→6→15，本断言即失败 —— 锚住「难度记忆被保留」这一行为。
    expect(goodSequence(3.0)).toEqual([1, 6, 18])
  })

  it('easeFactor=2.5（默认）连续 GOOD 三次 → 1 → 6 → 15', () => {
    expect(goodSequence(2.5)).toEqual([1, 6, 15])
  })
})
