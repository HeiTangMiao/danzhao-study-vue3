/**
 * progressStore —— 学习进度 Store（Pinia，多学科隔离）
 * 职责：
 *  - 按学科记录每个单元/页面的学习完成状态
 *  - 持久化到 IndexedDB（数据层统一，替代原 localStorage 双轨）
 *  - 首次运行时自动迁移旧版 localStorage 进度数据（键 vue3_progress_v2）
 *
 * 对外 API（getters / actions）与旧版完全一致，调用方无需改动。
 *
 * 数据结构：
 *  completed: {
 *    [subject]: {           // 学科 key: 'math' | 'chinese' | 'computer'
 *      [unitNum]: {         // 单元编号: '01', '02', ...
 *        [fileIndex]: true  // 文件索引: 0, 1, 2, ...
 *      }
 *    }
 *  }
 */
import { defineStore } from 'pinia'
import { useStudyDbStore } from './studyDb'

// 旧版 localStorage 持久化键（作为一次性迁移源）
const LS_LEGACY_KEY = 'vue3_progress_v2'

export const useProgressStore = defineStore('progress', {
  state: () => ({
    // 进度记录：按学科 → 单元号 → 文件索引
    completed: {},
    // 最近学习时间戳
    lastStudiedAt: null,
    // 是否已完成 IndexedDB 加载（幂等保护，避免重复 init）
    _loaded: false
  }),
  getters: {
    /**
     * 获取某学科某单元已完成的页面数
     * @param {string} subject - 学科 key
     * @param {string} unitNum - 单元编号
     * @returns {number} 已完成页面数
     */
    completedCount: (state) => (subject, unitNum) => {
      const subj = state.completed[subject]
      if (!subj) return 0
      const u = subj[unitNum]
      return u ? Object.keys(u).filter((k) => u[k]).length : 0
    },
    /**
     * 判断某学科某页面是否已完成
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
     * 获取某学科所有已完成页面总数
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
    }
  },
  actions: {
    /**
     * 初始化 / 加载进度（应用启动时调用一次）。
     * 优先从 IndexedDB 读取；若不存在则迁移旧 localStorage 数据。
     */
    async init() {
      if (this._loaded) return
      this._loaded = true
      try {
        const db = useStudyDbStore()
        await db.init()
        const stored = await db.getProgress()
        if (stored && stored.completed && Object.keys(stored.completed).length > 0) {
          this.completed = stored.completed
          this.lastStudiedAt = stored.lastStudiedAt || null
          return
        }
        // IndexedDB 无数据 → 尝试迁移旧 localStorage 进度
        await this._migrateFromLocalStorage()
      } catch (e) {
        console.warn('[Progress] init 失败:', e)
      }
    },

    /** 一次性迁移：读取旧 localStorage 进度并写入 IndexedDB */
    async _migrateFromLocalStorage() {
      let legacy = null
      try {
        const raw = localStorage.getItem(LS_LEGACY_KEY)
        if (raw) legacy = JSON.parse(raw)
      } catch (e) { /* 解析失败则忽略，视为无迁移源 */ }
      if (!legacy || !legacy.completed) return
      this.completed = legacy.completed || {}
      this.lastStudiedAt = legacy.lastStudiedAt || null
      await this._persist()
      try { localStorage.removeItem(LS_LEGACY_KEY) } catch (e) { /* 忽略 */ }
    },

    /** 将当前进度写入 IndexedDB */
    async _persist() {
      try {
        const db = useStudyDbStore()
        await db.saveProgress({ id: 'main', completed: this.completed, lastStudiedAt: this.lastStudiedAt })
      } catch (e) {
        console.warn('[Progress] 保存失败:', e)
      }
    },

    /**
     * 标记某学科某页面完成/未完成
     * @param {string} subject - 学科 key
     * @param {string} unitNum - 单元编号
     * @param {number} fileIndex - 文件索引
     */
    toggleComplete(subject, unitNum, fileIndex) {
      if (!this.completed[subject]) this.completed[subject] = {}
      if (!this.completed[subject][unitNum]) this.completed[subject][unitNum] = {}
      this.completed[subject][unitNum][fileIndex] = !this.completed[subject][unitNum][fileIndex]
      this.lastStudiedAt = Date.now()
      this._persist()
    },
    /**
     * 批量设置某学科某单元的完成状态
     * @param {string} subject - 学科 key
     * @param {string} unitNum - 单元编号
     * @param {number[]} indices - 文件索引数组
     * @param {boolean} done - 完成或取消
     */
    setBatchComplete(subject, unitNum, indices, done) {
      if (!this.completed[subject]) this.completed[subject] = {}
      if (!this.completed[subject][unitNum]) this.completed[subject][unitNum] = {}
      for (const i of indices) {
        this.completed[subject][unitNum][i] = done
      }
      this.lastStudiedAt = Date.now()
      this._persist()
    },
    /**
     * 重置某学科全部进度
     * @param {string} subject - 学科 key
     */
    resetSubject(subject) {
      if (this.completed[subject]) {
        delete this.completed[subject]
      }
      this._persist()
    },
    /**
     * 重置全部进度
     */
    resetAll() {
      this.completed = {}
      this.lastStudiedAt = null
      this._persist()
    }
  }
})