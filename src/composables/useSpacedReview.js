/**
 * useSpacedReview —— 间隔复习 composable（SM-2 算法）
 * 职责：
 *  - 获取今日待复习错题队列
 *  - 提交复习评分并更新 SM-2 参数
 *  - 获取复习统计信息
 *  - 删除已掌握的错题
 *
 * 替代旧版 assets/js/spaced-review.js 的 SpacedReview 模块
 * 依赖：studyDb store、gameEngine store（复习正确时奖励 XP）
 */
import { ref } from 'vue'
import { useStudyDbStore } from '@/stores/studyDb'
import { useGameEngineStore } from '@/stores/gameEngine'

// SM-2 评分等级
export const GRADES = {
  AGAIN: 0,  // 忘了，重新复习
  HARD: 3,   // 困难，勉强想起
  GOOD: 4,   // 良好，正常回忆
  EASY: 5    // 简单，立刻想起
}

/** 获取日期字符串 YYYY-MM-DD */
function getDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 日期字符串加天数 */
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return getDateStr(d)
}

/**
 * SM-2 算法核心：根据评分计算下次复习参数
 * @param {Object} error - 错题记录（含 repetitions, easeFactor, interval）
 * @param {number} grade - 评分 (0=again, 3=hard, 4=good, 5=easy)
 * @returns {{ interval, repetitions, easeFactor, nextReviewDate }}
 */
export function calculateSM2(error, grade) {
  let repetitions = error.repetitions || 0
  let easeFactor = error.easeFactor || 2.5
  let interval = error.interval || 0

  if (grade < 3) {
    // 回忆失败：重置
    repetitions = 0
    interval = 1
  } else {
    // 回忆成功
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easeFactor)
    repetitions++
  }

  // 更新难度因子（SM-2 公式）
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  if (easeFactor < 1.3) easeFactor = 1.3

  return {
    interval,
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100,
    nextReviewDate: addDays(getDateStr(), interval)
  }
}

export function useSpacedReview() {
  const db = useStudyDbStore()
  const game = useGameEngineStore()

  // 响应式状态
  const dueReviews = ref([])       // 待复习错题队列
  const reviewStats = ref(null)    // 复习统计
  const sessionStats = ref({ reviewed: 0, correct: 0, wrong: 0 }) // 本次会话统计

  /**
   * 获取今日待复习的错题
   * @param {string} subject - 科目筛选（'math', 'chinese', 或 null 表示全部）
   */
  async function loadDueReviews(subject = null) {
    try {
      await db.init()
      const errors = await db.getAllErrors()
      const today = getDateStr()
      dueReviews.value = errors
        .filter((e) => {
          if (subject && e.subject !== subject) return false
          if (e.reviewed === false && !e.lastReviewedAt) return true // 从未复习
          return e.nextReviewDate <= today
        })
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    } catch (e) {
      console.warn('[SpacedReview] 加载待复习失败:', e)
      dueReviews.value = []
    }
  }

  /**
   * 获取错题统计信息
   * @returns {Promise<Object>} { total, dueToday, reviewed, mastered, newCards, bySubject }
   */
  async function loadReviewStats() {
    try {
      await db.init()
      const errors = await db.getAllErrors()
      const today = getDateStr()
      const stats = {
        total: errors.length, dueToday: 0, reviewed: 0, mastered: 0, newCards: 0,
        bySubject: { math: 0, chinese: 0, computer: 0 }
      }

      errors.forEach((e) => {
        if (e.subject === 'math') stats.bySubject.math++
        else if (e.subject === 'chinese') stats.bySubject.chinese++
        else if (e.subject === 'computer') stats.bySubject.computer++

        if (e.reviewed === false && !e.lastReviewedAt) {
          stats.newCards++
          stats.dueToday++
        } else if (e.nextReviewDate <= today) {
          stats.dueToday++
        } else {
          stats.reviewed++
          // 掌握标准：连续答对 3 次以上且间隔 >= 7 天
          if (e.repetitions >= 3 && e.interval >= 7) stats.mastered++
        }
      })

      reviewStats.value = stats
      return stats
    } catch (e) {
      console.warn('[SpacedReview] 加载统计失败:', e)
      return { total: 0, dueToday: 0, reviewed: 0, mastered: 0, newCards: 0, bySubject: { math: 0, chinese: 0, computer: 0 } }
    }
  }

  /**
   * 提交复习评分
   * @param {Object} error - 错题记录
   * @param {number} grade - 评分 (0-5)
   * @returns {Promise<Object>} 更新后的 SM-2 参数
   */
  async function reviewCard(error, grade) {
    const updated = calculateSM2(error, grade)
    error.interval = updated.interval
    error.repetitions = updated.repetitions
    error.easeFactor = updated.easeFactor
    error.nextReviewDate = updated.nextReviewDate
    error.lastReviewedAt = Date.now()
    error.reviewed = true
    error.reviewCount = (error.reviewCount || 0) + 1

    await db.updateError(error)

    // 更新会话统计
    sessionStats.value.reviewed++
    if (grade >= 3) {
      sessionStats.value.correct++
      // 正确复习奖励 XP
      try {
        await game.trackAnswer(error.subject, error.unitNum, 'review_' + error.id)
      } catch (e) {
        console.warn('[SpacedReview] 记录复习 XP 失败:', e)
      }
    } else {
      sessionStats.value.wrong++
    }

    return updated
  }

  /** 删除已掌握的错题 */
  async function removeMastered() {
    try {
      await db.init()
      const errors = await db.getAllErrors()
      const toDelete = errors.filter((e) => e.repetitions >= 3 && e.interval >= 7)
      await Promise.all(toDelete.map((e) => db.deleteError(e.id)))
      return toDelete.length
    } catch (e) {
      console.warn('[SpacedReview] 删除已掌握失败:', e)
      return 0
    }
  }

  /** 重置会话统计 */
  function resetSession() {
    sessionStats.value = { reviewed: 0, correct: 0, wrong: 0 }
  }

  return {
    // 状态
    dueReviews, reviewStats, sessionStats,
    // 操作
    loadDueReviews, loadReviewStats, reviewCard, removeMastered, resetSession,
    // 工具
    calculateSM2, getDateStr
  }
}