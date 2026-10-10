/**
 * progressStore —— 学习进度 Store（多学科隔离，由 page_progress 推导）
 * 职责：
 *  - 提供「按学科 → 单元 → 页面是否已接触」的内存快照（completed）
 *  - 唯一数据源 = studyDb 的 page_progress（每页事实记录）
 *  - 「已接触」语义（访问即接触，P1-11 文案口径）：内容页打开（visited）即算；
 *    测验 / 模拟卷页需交卷（testScore 非空）—— 测验页以 testScore 为主口径
 *  - 「已掌握」是**另一个概念**（页面级手动标注 masteredAt，见 masteredCount），与「已接触」有意分离
 *  - 本 Store 只读缓存：写入侧是 markPageVisited / recordTest，进度变化后调用 refresh() 重建快照
 *    （旧版手动勾选完成 / user_progress.completed 已完成迁移，不再使用）
 */
import { defineStore } from 'pinia'
import { useStudyDbStore } from './studyDb'
import { SUBJECTS } from '@/content/index'

/**
 * 从 page_progress 记录推导完成快照
 * @param {Array<object>} rows - 全部 page_progress 记录
 * @returns {{ completed: object, mastered: object, lastStudiedAt: number|null, lastStudied: object|null }}
 */
function buildSnapshot(rows) {
  const byKey = new Map()
  for (const r of rows) {
    if (r && r.key) byKey.set(r.key, r)
  }
  const completed = {}
  // 「已掌握」快照（v4 页脚主行动，system_design §5.7.7）：
  // 判定 = row.masteredAt != null；与 completed 互不派生（①自动完成 ≠ ③手动掌握）
  const mastered = {}
  let lastStudiedAt = 0
  // 最近学习位置：取 page_progress 中 visitTime 最大的页面坐标。
  // 与 lastStudiedAt 同源推导，作为首页「继续学习」的唯一事实源
  //（原实现另存一份 localStorage.last_study，属双存储；见架构审计 §2-2）。
  let lastStudied = null
  for (const subject of Object.keys(SUBJECTS)) {
    const config = SUBJECTS[subject]
    for (const unit of config.units || []) {
      const files = unit.files || []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const key = `${subject}_${unit.num}_${file.name}`
        const row = byKey.get(key)
        // 完成判定：访问过，且（非测验页 或 测验页已交卷得分）
        const done = !!(row && row.visited && (!file.isTest || row.testScore != null))
        if (done) {
          if (!completed[subject]) completed[subject] = {}
          if (!completed[subject][unit.num]) completed[subject][unit.num] = {}
          completed[subject][unit.num][i] = true
        }
        if (row && row.masteredAt != null) {
          if (!mastered[subject]) mastered[subject] = {}
          if (!mastered[subject][unit.num]) mastered[subject][unit.num] = {}
          mastered[subject][unit.num][i] = true
        }
        if (row && row.visitTime && row.visitTime > lastStudiedAt) {
          lastStudiedAt = row.visitTime
          lastStudied = {
            subject,
            unitNum: unit.num,
            fileIndex: i,
            unitTitle: unit.title,
            fileTitle: file.title,
            time: row.visitTime
          }
        }
      }
    }
  }
  return { completed, mastered, lastStudiedAt: lastStudiedAt || null, lastStudied }
}

export const useProgressStore = defineStore('progress', {
  state: () => ({
    // 完成快照：按学科 → 单元号 → 文件索引
    completed: {},
    // 已掌握快照（v4 页脚主行动，§5.7.7）：同结构，判定 = page_progress.masteredAt != null
    mastered: {},
    // 最近学习时间戳（取 page_progress 最新 visitTime）
    lastStudiedAt: null,
    // 最近学习位置坐标（与 lastStudiedAt 同源；供首页「继续学习」直达，具备跨设备能力）
    lastStudied: null,
    // 是否已完成一次快照（幂等保护）
    _loaded: false
  }),
  getters: {
    /**
     * 获取某学科某单元「已接触」的页面数（completed 快照计数）
     * @param {string} subject - 学科 key
     * @param {string} unitNum - 单元编号
     * @returns {number} 已接触页面数
     */
    completedCount: (state) => (subject, unitNum) => {
      const subj = state.completed[subject]
      if (!subj) return 0
      const u = subj[unitNum]
      return u ? Object.keys(u).filter((k) => u[k]).length : 0
    },
    /**
     * 判断某学科某页面是否「已接触」（completed 快照；「访问即接触」语义）
     * @param {string} subject - 学科 key
     * @param {string} unitNum - 单元编号
     * @param {number} fileIndex - 文件索引
     * @returns {boolean}
     */
    isCompleted: (state) => (subject, unitNum, fileIndex) => {
      const subj = state.completed[subject]
      if (!subj) return false
      return !!(subj[unitNum] && subj[unitNum][fileIndex])
    },
    /**
     * 判断某学科某页面是否「已掌握」（v4 页脚主行动，§5.7.7 语义③：
     * 用户手动标记，存储 masteredAt 时间戳；与 isCompleted ①互不派生）
     * @param {string} subject - 学科 key
     * @param {string} unitNum - 单元编号
     * @param {number} fileIndex - 文件索引
     * @returns {boolean}
     */
    isPageMastered: (state) => (subject, unitNum, fileIndex) => {
      const subj = state.mastered[subject]
      if (!subj) return false
      return !!(subj[unitNum] && subj[unitNum][fileIndex])
    },
    /**
     * 获取某学科所有「已接触」页面总数（completed 快照计数）
     * 语义 = 「访问即接触」：内容页 visited；测验页 visited && testScore!=null。
     * ⚠️ 与复习侧 isMastered()（error_book SM-2）**不是**同一概念，勿混（§0.2/P1-11）。
     * @param {string} subject - 学科 key
     * @returns {number}
     */
    subjectTotalCompleted: (state) => (subject) => {
      const subj = state.completed[subject]
      if (!subj) return 0
      let count = 0
      for (const unitNum in subj) {
        const unit = subj[unitNum]
        for (const k in unit) {
          if (unit[k]) count++
        }
      }
      return count
    },
    /**
     * 获取某学科「已掌握」页面数（页面级 masteredAt，v4 页脚主行动）。
     * ⚠️ 与复习侧 isMastered()（error_book SM-2：reps>=3 && interval>=7 OR legacyMastered）
     *   是**两个不同表、不同粒度、不同信号**的「掌握」，本批**有意保持分离**、不合并
     *   （§0.2）：本 getter 数的是**页面**（progress.mastered 快照），不是**卡片**。
     * @param {string} subject - 学科 key
     * @returns {number}
     */
    masteredCount: (state) => (subject) => {
      const subj = state.mastered[subject]
      if (!subj) return 0
      let count = 0
      for (const unitNum in subj) {
        const unit = subj[unitNum]
        for (const k in unit) {
          if (unit[k]) count++
        }
      }
      return count
    }
  },
  actions: {
    /**
     * 重建完成快照（数据源：page_progress）。
     * 访问新页 / 交卷后调用，令首页进度与答题卡完成态即时更新。
     */
    async refresh() {
      const db = useStudyDbStore()
      await db.init()
      const rows = await db.getAllPageProgress()
      const s = buildSnapshot(rows)
      this.completed = s.completed
      this.mastered = s.mastered
      this.lastStudiedAt = s.lastStudiedAt
      this.lastStudied = s.lastStudied
      this._loaded = true
    },

    /**
     * 应用启动时的幂等初始化（等价 refresh，防重复扫描）
     * 容错：IndexedDB 读取失败不阻断启动，仅记录警告，待下次访问/交卷时重试刷新。
     */
    async init() {
      if (this._loaded) return
      try {
        await this.refresh()
      } catch (e) {
        console.warn('[Progress] 加载进度失败，启动期间忽略:', e)
      }
    }
  }
})
