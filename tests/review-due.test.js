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
  gradeCard
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
})
