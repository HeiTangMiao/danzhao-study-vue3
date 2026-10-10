/**
 * useSpacedReview —— 间隔复习 composable（SM-2 算法）
 * 职责：
 *  - 获取今日待复习错题队列（due 判据唯一真相源）
 *  - 提交复习评分并更新 SM-2 参数（唯一写库入口 gradeCard）
 *  - 获取复习统计信息
 *  - 删除已掌握的错题
 *
 * 替代旧版 assets/js/spaced-review.js 的 SpacedReview 模块
 * 依赖：studyDb store
 *
 * ===== 两条不变式（后人改代码前务必先读，别照旧实现的写作改回去）=====
 * 1. due 判据只此一份 isDue()：全库（Dashboard / HomeView / 复习页 / 统计）共用。
 *    旧实现在四处各写各的（`!e.reviewed` 当「待复习」），会让复习过的卡永不再进队列、
 *    SM-2 复现机制静默失效 —— 这正是「SM-2 是伪参数」的根因之一。禁止再散写判据。
 * 2. 「已复习过」与「已掌握」是两种语义，别再合并：
 *    - 已复习过 = hasReviewed()（lastReviewedAt 非空）；
 *    - 已掌握   = isMastered()（SM-2 真掌握 OR 存量手动标注）；
 *    - `reviewed` 字段已退役为「只读历史」，新代码只读不写（见 gradeCard / 字段注释）。
 */
import { ref } from 'vue'
import { useStudyDbStore } from '@/stores/studyDb'

// SM-2 评分等级
export const GRADES = {
  AGAIN: 0,  // 忘了，重新复习
  HARD: 3,   // 困难，勉强想起
  GOOD: 4,   // 良好，正常回忆
  EASY: 5    // 简单，立刻想起
}

/**
 * 四档元信息（UI 文案与 grade 值的唯一来源，防按钮与 GRADES 漂移）。
 * GradeButtons 与单测都从这里取，禁止在视图里另写「忘了=0」这类映射。
 */
export const GRADE_META = [
  { grade: 0, key: 'AGAIN', label: '忘了', tone: 'danger' },
  { grade: 3, key: 'HARD', label: '困难', tone: 'warning' },
  { grade: 4, key: 'GOOD', label: '良好', tone: 'success' },
  { grade: 5, key: 'EASY', label: '简单', tone: 'primary' }
]

/**
 * 单次复习上限（P0-6 验收 2：20–30，取中位 25）。
 * 单一真相源 —— 视图 / store 一律引用本常量，禁止另写 20 / 30 字面量。
 */
export const REVIEW_SESSION_LIMIT = 25

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

// ===== 判据唯一真相源（纯函数、零外部依赖，构建脚本 / 测试 / 视图共用，H7）=====

/**
 * 「已掌握」唯一判据 —— 与 removeMastered() 同口径。
 * 两条来源并存：
 *  ① 真掌握：SM-2 口径 repetitions>=3 且 interval>=7；
 *  ② 存量手动标注：legacyMastered（迁移固化）或 reviewed（旧口径下 reviewed===true
 *     只可能由「已掌握」按钮产生 —— reviewCard 实测全库零调用，故它就是用户的手动标注）。
 * 两者并存期间都认，保证「迁移没跑完也不会显示错」。
 * @param {Object} e error_book 行
 * @returns {boolean}
 */
export function isMastered(e) {
  if (!e) return false
  if ((e.repetitions || 0) >= 3 && (e.interval || 0) >= 7) return true
  return e.legacyMastered === true || e.reviewed === true
}

/**
 * 「已复习过」判据 —— 与「已掌握」彻底分开（本批语义拆分核心）。
 * @param {Object} e error_book 行
 * @returns {boolean}
 */
export function hasReviewed(e) {
  return !!(e && e.lastReviewedAt)
}

/**
 * 该错题行今日是否到期 —— due 判据唯一真相源（H7）。
 * 注意：**不用 `!e.reviewed` 当待复习判据**（那会让复习过的卡永不再现）；
 * 只有 isMastered（真掌握 / 存量手动标注）才出列。
 * @param {Object} e error_book 行
 * @param {string} [today] YYYY-MM-DD
 * @returns {boolean}
 */
export function isDue(e, today = getDateStr()) {
  if (!e) return false
  if (isMastered(e)) return false          // 已掌握出列（与 removeMastered 同一口径）
  const nd = e.nextReviewDate || ''
  // 缺排期（遗留行）一律视为到期：漏掉一张卡的代价是遗忘曲线中断，
  // 远大于「多复习一张」的代价 —— 与判分侧「误判对不可接受」同一种从严取向。
  if (!nd) return true
  return nd <= today
}

/**
 * 今日到期数（Dashboard / 首页统计用；与复习页队列同一判据）。
 * @param {Array<Object>} list error_book 行数组
 * @param {string} [today] YYYY-MM-DD
 * @returns {number}
 */
export function countDue(list, today = getDateStr()) {
  const arr = Array.isArray(list) ? list : []
  let n = 0
  for (const e of arr) if (isDue(e, today)) n++
  return n
}

/**
 * 复习页队列：筛选到期 → 排序 → 截断。
 * 排序口径（可解释性要求，用户问「为什么先出这张」时要有答案）：
 * 排期最早（= 逾期最久）的先复习；同排期按入本时间（createdAt）升序。
 * 不改入参（先复制再排序，与 practiceMetrics.topSlowest 同款约定）。
 * @param {Array<Object>} list error_book 行数组
 * @param {{limit?: number, today?: string}} [opts]
 * @returns {Array<Object>} 新数组
 */
export function pickDue(list, opts = {}) {
  const { limit = REVIEW_SESSION_LIMIT, today = getDateStr() } = opts
  const src = Array.isArray(list) ? list : []
  return [...src]
    .filter((e) => isDue(e, today))
    .sort((a, b) => {
      const na = a.nextReviewDate || ''
      const nb = b.nextReviewDate || ''
      if (na !== nb) return na < nb ? -1 : 1
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
    .slice(0, Math.max(0, limit))
}

/**
 * 统一评分入口（本批唯一写库点，H7）。
 *  - 四档评分**真实**传入 calculateSM2（不再是写死常量）；
 *  - 不改入参（防 UI 持有被改写对象导致「看起来没保存」）；
 *  - 不碰 sessionStats（会话统计是 review store 的职责）；
 *  - **不写 reviewed**（该字段退役为只读历史；写 lastReviewedAt 表示「已复习过」）
 *    —— 缺陷根除点：复习时点「忘了」不再被错题本当成「已掌握」。
 * @param {Object} db studyDb store 实例（便于测试直接传入，无需 mock Pinia）
 * @param {Object} error error_book 行
 * @param {number} grade 四档评分
 * @returns {Promise<{ next: Object, sm2: { interval, repetitions, easeFactor, nextReviewDate } }>}
 */
export async function gradeCard(db, error, grade) {
  if (!db || !error) throw new Error('gradeCard: 缺少 db 或 error')
  const sm2 = calculateSM2(error, grade)
  const next = {
    ...error,
    ...sm2,
    lastReviewedAt: Date.now(),
    reviewCount: (error.reviewCount || 0) + 1
    // 刻意不写 reviewed：写了就等于「已掌握」，会复现已修复的缺陷。
  }
  await db.updateError(next)
  return { next, sm2 }
}

export function useSpacedReview() {
  const db = useStudyDbStore()

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
      const scoped = subject ? errors.filter((e) => e.subject === subject) : errors
      dueReviews.value = pickDue(scoped) // 判据与排序全部来自 pickDue（H7）
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

        // newCards 语义保留（从未复习过），但不再影响 dueToday
        if (e.reviewed === false && !e.lastReviewedAt) stats.newCards++

        // dueToday 与复习页队列同一判据，杜绝「统计说 5 张、进去只有 3 张」
        if (isDue(e, today)) {
          stats.dueToday++
        } else {
          stats.reviewed++
          if (isMastered(e)) stats.mastered++ // ← 与 removeMastered() 同口径
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
   * 提交复习评分（旧名保留兼容；新代码请直接用 gradeCard）
   * @deprecated 转调 gradeCard 并额外累加 sessionStats（行为与改造前一致，唯独不再写 reviewed）
   * @param {Object} error - 错题记录
   * @param {number} grade - 评分 (0-5)
   * @returns {Promise<Object>} 更新后的 SM-2 参数
   */
  async function reviewCard(error, grade) {
    const { sm2 } = await gradeCard(db, error, grade)

    // 更新会话统计
    sessionStats.value.reviewed++
    if (grade >= 3) {
      sessionStats.value.correct++
    } else {
      sessionStats.value.wrong++
    }

    return sm2
  }

  /** 删除已掌握的错题（口径 = isMastered，与「已掌握」计数同源） */
  async function removeMastered() {
    try {
      await db.init()
      const errors = await db.getAllErrors()
      const toDelete = errors.filter(isMastered)
      await Promise.all(toDelete.map((e) => db.deleteErrorSoft(e.id)))
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
