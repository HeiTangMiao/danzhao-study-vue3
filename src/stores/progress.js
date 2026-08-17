/**
 * progressStore —— 学习进度 Store（Pinia，多学科隔离）
 * 职责：
 *  - 按学科记录每个单元/页面的学习完成状态
 *  - 持久化到 localStorage（通过 pinia-plugin-persistedstate）
 *  - 替代旧版 app-core.js 中的进度存储逻辑
 *
 * 数据结构：
 *  completed: {
 *    [subject]: {           // 学科 key: 'math' | 'chinese'
 *      [unitNum]: {         // 单元编号: '01', '02', ...
 *        [fileIndex]: true  // 文件索引: 0, 1, 2, ...
 *      }
 *    }
 *  }
 */
import { defineStore } from 'pinia'

export const useProgressStore = defineStore('progress', {
  state: () => ({
    // 进度记录：按学科 → 单元号 → 文件索引
    completed: {},
    // 最近学习时间戳
    lastStudiedAt: null
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
    },
    /**
     * 重置某学科全部进度
     * @param {string} subject - 学科 key
     */
    resetSubject(subject) {
      if (this.completed[subject]) {
        delete this.completed[subject]
      }
    },
    /**
     * 重置全部进度
     */
    resetAll() {
      this.completed = {}
      this.lastStudiedAt = null
    }
  },
  // 持久化到 localStorage（键名与旧版进度键区分）
  persist: { key: 'vue3_progress_v2' }
})
