/**
 * error-book-dedup —— 批 C F3 单测：重复答错时必须把这张卡重新打回复习队列。
 *
 * 背景：isMastered 是 OR 判据（legacyMastered 或 reviewed 任一为真即成立）。
 * recordError 的去重分支若只自增 wrongCount、不动掌握标记，就会留下「哑键」：
 * 用户明明又答错了，错题本也显示为待复习，但它永远不进今日队列 —— 复习闭环被掐断。
 * 本用例锚住去重分支必须：两个掌握字段都清 + SM-2 归零到今日 + wrongCount 自增，
 * 且保留 lastReviewedAt（「已复习过」的历史事实，与「已掌握」无关）。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStudyDbStore } from '@/stores/studyDb'
import { isMastered, isDue, countDue } from '@/composables/useSpacedReview'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('F3 recordError 去重分支 —— 重复答错清除「已掌握」标记并重回队列', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  /** 先入本一张卡，再把它做成「已掌握」：三种口径全占上，确保去重分支必须把它们都清掉 */
  async function seedMastered(fileKey) {
    const r = await db.recordError('math', '01', 'qF3', 'A', 'B', 'exp', { fileKey })
    const err = (await db.getAllErrors()).find((e) => e.id === r.id)
    await db.updateError({
      ...err,
      reviewed: true,
      legacyMastered: true,
      repetitions: 3,
      interval: 7,
      nextReviewDate: '2025-12-31',
      lastReviewedAt: 1700000000000 // 历史事实，去重后应保留
    })
    return r.id
  }

  it('两个掌握字段都清、SM-2 归零到今日、wrongCount 自增、lastReviewedAt 保留、updatedAt 刷新', async () => {
    const id = await seedMastered('math_01_f3')
    const mastered = (await db.getAllErrors()).find((e) => e.id === id)
    expect(isMastered(mastered)).toBe(true)
    expect(isDue(mastered, todayStr())).toBe(false) // 已掌握 → 出列
    const updatedAtBefore = mastered.updatedAt
    await sleep(5)

    // 同一题（同 subject + question + fileKey）再次答错 → 走去重分支
    const dup = await db.recordError('math', '01', 'qF3', 'A', 'C', 'exp', { fileKey: 'math_01_f3' })
    expect(dup.duplicated).toBe(true)

    const row = (await db.getAllErrors()).find((e) => e.id === id)
    // 缺陷根除：两个「已掌握」字段都被清，isMastered 归 false（不再留哑键）
    expect(row.reviewed).toBe(false)
    expect(row.legacyMastered).toBe(false)
    expect(isMastered(row)).toBe(false)
    // SM-2 归零到「今日到期」→ 立刻重回队列
    expect(row.repetitions).toBe(0)
    expect(row.interval).toBe(0)
    expect(row.easeFactor).toBe(2.5)
    expect(row.nextReviewDate).toBe(todayStr())
    expect(isDue(row, todayStr())).toBe(true)
    expect(countDue([row], todayStr())).toBe(1)
    // wrongCount 自增（唯一自增点）
    expect(row.wrongCount).toBe(2)
    // lastReviewedAt 保持不动：那是「已复习过」的历史事实，与「已掌握」无关
    expect(row.lastReviewedAt).toBe(1700000000000)
    // updatedAt 刷新（ISO 字符串，随同步上行）
    expect(row.updatedAt > updatedAtBefore).toBe(true)
  })

  it('已掌握行去重后不再计为已掌握（用户可见的「已掌握」数字随之下降）', async () => {
    await seedMastered('math_01_f3b')
    const before = (await db.getAllErrors()).filter(isMastered).length
    await db.recordError('math', '01', 'qF3', 'A', 'C', 'exp', { fileKey: 'math_01_f3b' })
    const after = (await db.getAllErrors()).filter(isMastered).length
    expect(before).toBe(1)
    expect(after).toBe(0)
  })
})
