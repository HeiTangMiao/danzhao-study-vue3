/**
 * review Store —— 复习会话状态（P0-6，单卡会话式复习）
 *
 * 职责分层（高内聚低耦合）：
 *  - 编排：进入即取到期队列（pickDue 排序 + REVIEW_SESSION_LIMIT 截断）→ 逐卡翻面/评分 → 结算
 *  - 落库：**唯一写库点** = gradeCard（写 lastReviewedAt/SM-2；绝不写 reviewed）。
 *    本 store 不碰 SM-2 数学、不记答题数（复习不是做题，不污染 daily_stats.questionsAnswered）
 *  - 迁移：startSession 首步调 db.migrateLegacyMastered()（幂等，成本≈0）
 *
 * 会话为内存态：翻面/切卡/退出全是纯内存（已评过的卡逐张已落库，随时可退不丢数据）。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStudyDbStore } from './studyDb'
import { pickDue, gradeCard, REVIEW_SESSION_LIMIT } from '@/composables/useSpacedReview'

export const useReviewStore = defineStore('review', () => {
  const db = useStudyDbStore()

  // ===== 会话状态机 =====
  const queue = ref([])          // 本轮队列（已按 pickDue 排序 + 截断）
  const index = ref(0)           // 当前卡下标
  const phase = ref('idle')      // idle | loading | session | cleared | done
  const flipped = ref(false)     // 当前卡是否翻面（仅内存态，不落库）
  const kindFilter = ref(null)   // null = 全部；'error' | 'stuck'（C-2-1 接线）
  const progress = ref({ total: 0, done: 0, again: 0 })

  const current = computed(() => queue.value[index.value] || null)
  const remaining = computed(() => queue.value.length - index.value)
  const isLast = computed(() => index.value >= queue.value.length - 1)

  /**
   * 开始一轮复习：迁移 → 拉 error_book → pickDue（排序 + 截断）→ 定 phase。
   * 空队列 → phase='cleared'（**不进空态**，由视图渲染「今日已清零」+ 引导新内容）。
   * @param {{limit?: number, kind?: (string|null)}} [opts]
   * @returns {Promise<Array<Object>>} 本轮队列
   */
  async function startSession({ limit = REVIEW_SESSION_LIMIT, kind = null } = {}) {
    phase.value = 'loading'
    kindFilter.value = kind
    try {
      // 一次性迁移（幂等）：把存量 reviewed===true 固化为 legacyMastered，保证「已掌握」计数稳定
      await db.migrateLegacyMastered()
      const errors = await db.getAllErrors()
      const list = pickDue(errors, { limit, kind })
      queue.value = list
      index.value = 0
      flipped.value = false
      progress.value = { total: list.length, done: 0, again: 0 }
      phase.value = list.length ? 'session' : 'cleared'
    } catch (e) {
      console.error('[review] 开始复习失败:', e)
      queue.value = []
      progress.value = { total: 0, done: 0, again: 0 }
      phase.value = 'cleared'
    }
    return queue.value
  }

  /** 翻面（纯内存，不落库） */
  function flip() {
    flipped.value = true
  }

  /**
   * 四档评分：唯一写库点 gradeCard（真实驱动 SM-2）；推进进度。
   * 末张评分后置 phase='done'（结算）。
   * 写库失败不静默跳过：抛给视图提示可重试，且**不推进下标**（避免丢分）。
   * @param {number} g 四档评分
   */
  async function grade(g) {
    const card = current.value
    if (!card) return
    let next
    try {
      ;({ next } = await gradeCard(db, card, g))
    } catch (e) {
      console.error('[review] 评分落库失败，可重试:', e)
      throw e
    }
    // 用返回的 next 刷新本地队列内该卡，保持视图与库一致
    queue.value = queue.value.map((c) => (c.id === next.id ? { ...c, ...next } : c))
    progress.value.done++
    if (g < 3) progress.value.again++
    if (index.value >= queue.value.length - 1) {
      phase.value = 'done'
    } else {
      index.value++
      flipped.value = false
    }
  }

  /** 退出并复位（不写库；已评过的卡逐张已落库，无需补偿） */
  function quit() {
    phase.value = 'idle'
    queue.value = []
    index.value = 0
    flipped.value = false
    progress.value = { total: 0, done: 0, again: 0 }
  }

  return {
    // 状态
    queue, index, phase, flipped, kindFilter, progress,
    // 派生
    current, remaining, isLast,
    // 动作
    startSession, flip, grade, quit
  }
})
