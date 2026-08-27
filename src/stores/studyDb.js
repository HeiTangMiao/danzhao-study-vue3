/**
 * studyDb Store —— IndexedDB 数据层（Pinia 封装）
 * 职责：
 *  - 封装 IndexedDB 的初始化与 7 个对象仓库的 CRUD 操作
 *  - 替代旧版 assets/js/db.js 的 StudyDB 模块
 *  - 为 gameEngine store 及各 composable 提供统一数据访问层
 *
 * 对象仓库说明：
 *  - study_log：学习日志（每次访问/答题/测验的记录）
 *  - daily_stats：每日统计（XP、文件数、题目数、打卡、学习时长）
 *  - achievements：成就解锁记录
 *  - page_progress：页面进度（访问状态、答题数、测验分数、XP）
 *  - error_book：错题本（含 SM-2 间隔复习字段）
 *  - notes：每页笔记
 *  - bookmarks：书签收藏
 *
 * 兼容性：数据库结构（库名/版本/仓库/索引）与旧版完全一致，
 *         确保旧版 PWA 已有数据可被新逻辑直接读取。
 */
import { defineStore } from 'pinia'

// IndexedDB 配置（与旧版 db.js 保持一致，确保数据兼容）
const DB_NAME = 'study_game_db'
const DB_VERSION = 4

// 单例数据库连接
let dbInstance = null

/**
 * 初始化 / 打开 IndexedDB 数据库
 * 如果是首次打开或版本升级，会自动创建所需的对象仓库与索引
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    // 已有连接则直接复用
    if (dbInstance) { resolve(dbInstance); return }

    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => { dbInstance = req.result; resolve(dbInstance) }
    req.onblocked = () => console.warn('[StudyDB] 数据库升级被阻塞，请关闭其他标签页后刷新')

    // 数据库创建 / 升级时构建仓库结构
    req.onupgradeneeded = (e) => {
      const d = e.target.result
      const oldVersion = e.oldVersion || 0

      // v1：学习日志、每日统计、成就、页面进度
      if (!d.objectStoreNames.contains('study_log')) {
        const s1 = d.createObjectStore('study_log', { keyPath: 'id', autoIncrement: true })
        s1.createIndex('date', 'date', { unique: false })
        s1.createIndex('subject', 'subject', { unique: false })
        s1.createIndex('fileKey', 'fileKey', { unique: false })
      }
      if (!d.objectStoreNames.contains('daily_stats')) {
        d.createObjectStore('daily_stats', { keyPath: 'date' })
      }
      if (!d.objectStoreNames.contains('achievements')) {
        d.createObjectStore('achievements', { keyPath: 'id' })
      }
      if (!d.objectStoreNames.contains('page_progress')) {
        const s4 = d.createObjectStore('page_progress', { keyPath: 'key' })
        s4.createIndex('subject', 'subject', { unique: false })
      }

      // v2：错题本
      if (oldVersion < 2 && !d.objectStoreNames.contains('error_book')) {
        const s5 = d.createObjectStore('error_book', { keyPath: 'id', autoIncrement: true })
        s5.createIndex('subject', 'subject', { unique: false })
        s5.createIndex('createdAt', 'createdAt', { unique: false })
        s5.createIndex('reviewed', 'reviewed', { unique: false })
      }

      // v3：笔记 + 书签
      if (oldVersion < 3) {
        if (!d.objectStoreNames.contains('notes')) {
          const s6 = d.createObjectStore('notes', { keyPath: 'pageKey' })
          s6.createIndex('subject', 'subject', { unique: false })
          s6.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
        if (!d.objectStoreNames.contains('bookmarks')) {
          const s7 = d.createObjectStore('bookmarks', { keyPath: 'pageKey' })
          s7.createIndex('subject', 'subject', { unique: false })
          s7.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }

      // v4：学习进度统一入库（原 localStorage 双轨数据收敛到 IndexedDB）
      // 仓库结构：{ id: 'main', completed: {...}, lastStudiedAt: number|null }
      if (oldVersion < 4 && !d.objectStoreNames.contains('user_progress')) {
        d.createObjectStore('user_progress', { keyPath: 'id' })
      }
    }
  })
}

/**
 * 获取对象仓库的事务句柄
 * @param {string} storeName - 仓库名
 * @param {string} mode - 事务模式：'readonly'（默认）或 'readwrite'
 * @returns {IDBObjectStore}
 */
function getStore(storeName, mode = 'readonly') {
  return dbInstance.transaction(storeName, mode).objectStore(storeName)
}

// ===== 泛型 CRUD 封装（Promise 化 IndexedDB 请求） =====

/** 按 key 读取单条记录 */
function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const r = getStore(storeName).get(key)
    r.onsuccess = () => resolve(r.result || null)
    r.onerror = () => reject(r.error)
  })
}

/** 读取仓库全部记录 */
function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const r = getStore(storeName).getAll()
    r.onsuccess = () => resolve(r.result || [])
    r.onerror = () => reject(r.error)
  })
}

/** 写入 / 更新记录（按 keyPath 覆盖） */
function dbPut(storeName, data) {
  return new Promise((resolve, reject) => {
    const r = getStore(storeName, 'readwrite').put(data)
    r.onsuccess = () => resolve()
    r.onerror = () => reject(r.error)
  })
}

/** 新增记录（autoIncrement key 由 DB 分配） */
function dbAdd(storeName, data) {
  return new Promise((resolve, reject) => {
    const r = getStore(storeName, 'readwrite').add(data)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

/** 按 key 删除记录 */
function dbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const r = getStore(storeName, 'readwrite').delete(key)
    r.onsuccess = () => resolve()
    r.onerror = () => reject(r.error)
  })
}

/** 清空整个仓库 */
function dbClear(storeName) {
  return new Promise((resolve, reject) => {
    const r = getStore(storeName, 'readwrite').clear()
    r.onsuccess = () => resolve()
    r.onerror = () => reject(r.error)
  })
}

export const useStudyDbStore = defineStore('studyDb', {
  actions: {
    // ===== 初始化 =====

    /** 初始化数据库连接（幂等，多次调用安全） */
    async init() {
      await openDB()
    },

    // ===== 学习日志 =====

    /** 新增一条学习日志 */
    async addStudyLog(log) {
      await this.init()
      return dbAdd('study_log', log)
    },

    /** 获取全部学习日志 */
    async getAllStudyLogs() {
      await this.init()
      return dbGetAll('study_log')
    },

    // ===== 每日统计 =====

    /**
     * 获取某日统计（不存在则返回默认结构）
     * @param {string} date - 日期字符串 YYYY-MM-DD
     */
    async getDailyStat(date) {
      await this.init()
      const r = await dbGet('daily_stats', date)
      return r || { date, xp: 0, filesVisited: 0, questionsAnswered: 0, checkin: false, subjects: {} }
    },

    /** 保存 / 更新每日统计 */
    async saveDailyStat(stat) {
      await this.init()
      return dbPut('daily_stats', stat)
    },

    /** 获取全部每日统计 */
    async getAllDailyStats() {
      await this.init()
      return dbGetAll('daily_stats')
    },

    // ===== 页面进度 =====

    /** 获取某页面进度 */
    async getPageProgress(key) {
      await this.init()
      return dbGet('page_progress', key)
    },

    /** 保存 / 更新页面进度 */
    async savePageProgress(progress) {
      await this.init()
      return dbPut('page_progress', progress)
    },

    /** 获取全部页面进度 */
    async getAllPageProgress() {
      await this.init()
      return dbGetAll('page_progress')
    },

    // ===== 成就 =====

    /** 获取某成就 */
    async getAchievement(id) {
      await this.init()
      return dbGet('achievements', id)
    },

    /** 保存 / 更新成就 */
    async saveAchievement(ach) {
      await this.init()
      return dbPut('achievements', ach)
    },

    /** 获取全部已解锁成就 */
    async getAllAchievements() {
      await this.init()
      return dbGetAll('achievements')
    },

    // ===== 错题本 =====

    /** 新增错题 */
    async addError(error) {
      await this.init()
      return dbAdd('error_book', error)
    },

    /** 获取全部错题 */
    async getAllErrors() {
      await this.init()
      return dbGetAll('error_book')
    },

    /** 删除错题 */
    async deleteError(id) {
      await this.init()
      return dbDelete('error_book', id)
    },

    /** 更新错题 */
    async updateError(error) {
      await this.init()
      return dbPut('error_book', error)
    },

    /** 清空全部错题 */
    async clearAllErrors() {
      await this.init()
      return dbClear('error_book')
    },

    // ===== 笔记 =====

    /** 获取某页笔记 */
    async getNote(pageKey) {
      await this.init()
      return dbGet('notes', pageKey)
    },

    /** 保存 / 更新笔记 */
    async saveNote(note) {
      await this.init()
      return dbPut('notes', note)
    },

    /** 删除笔记 */
    async deleteNote(pageKey) {
      await this.init()
      return dbDelete('notes', pageKey)
    },

    /** 获取全部笔记 */
    async getAllNotes() {
      await this.init()
      return dbGetAll('notes')
    },

    // ===== 书签 =====

    /** 获取某页书签 */
    async getBookmark(pageKey) {
      await this.init()
      return dbGet('bookmarks', pageKey)
    },

    /** 保存书签 */
    async saveBookmark(bookmark) {
      await this.init()
      return dbPut('bookmarks', bookmark)
    },

    /** 删除书签 */
    async deleteBookmark(pageKey) {
      await this.init()
      return dbDelete('bookmarks', pageKey)
    },

    /** 获取全部书签 */
    async getAllBookmarks() {
      await this.init()
      return dbGetAll('bookmarks')
    },

    // ===== 学习进度（原 localStorage 双轨收敛至此） =====

    /** 获取统一学习进度（不存在则返回默认结构） */
    async getProgress() {
      await this.init()
      const r = await dbGet('user_progress', 'main')
      return r || { id: 'main', completed: {}, lastStudiedAt: null }
    },

    /** 保存学习进度（completed 结构 + 最近学习时间戳） */
    async saveProgress(progress) {
      await this.init()
      return dbPut('user_progress', progress)
    },

    // ===== 数据导出 / 导入 =====

    /**
     * 导出全部数据（IndexedDB + localStorage）
     * 用于数据备份或迁移
     */
    async exportAllData() {
      await this.init()
      const [studyLogs, dailyStats, achievements, pageProgress, errors, notes, bookmarks, progress] = await Promise.all([
        this.getAllStudyLogs(),
        this.getAllDailyStats(),
        this.getAllAchievements(),
        this.getAllPageProgress(),
        this.getAllErrors(),
        this.getAllNotes(),
        this.getAllBookmarks(),
        this.getProgress()
      ])

      // 收集 localStorage 中与应用相关的数据
      const lsKeys = ['pomodoro_state', 'weekly_challenges', 'study_plan', 'math_theme', 'chinese_theme', 'diagnostic_test_data', 'lastReviewReminder', 'lastChallengeCheck']
      const lsData = {}
      for (const k of lsKeys) {
        try {
          const v = localStorage.getItem(k)
          if (v !== null) lsData[k] = v
        } catch (e) { /* 忽略读取异常 */ }
      }

      return {
        version: DB_VERSION,
        exportedAt: new Date().toISOString(),
        study_log: studyLogs,
        daily_stats: dailyStats,
        achievements,
        page_progress: pageProgress,
        error_book: errors,
        notes,
        bookmarks,
        user_progress: progress,
        localStorage: lsData
      }
    },

    /**
     * 导入全部数据（使用单事务确保原子性）
     * @param {Object} data - exportAllData 的返回值
     */
    async importAllData(data) {
      if (!data || typeof data !== 'object') throw new Error('无效的数据格式')

      // 注意：user_progress 为单条记录对象而非数组，单独处理
      const stores = ['study_log', 'daily_stats', 'achievements', 'page_progress', 'error_book', 'notes', 'bookmarks', 'user_progress']

      // 数据格式校验（数组类仓库要求为数组）
      for (const key of stores) {
        if (key === 'user_progress') continue
        if (data[key] !== undefined && data[key] !== null && !Array.isArray(data[key])) {
          throw new Error('数据格式错误：' + key + ' 应为数组')
        }
      }

      await this.init()

      // 筛选有数据的仓库；user_progress 为单对象单独判断
      const hasProgress = !!(data.user_progress && typeof data.user_progress === 'object')
      const storeNames = stores.filter((name) => {
        if (name === 'user_progress') return hasProgress
        return data[name] && Array.isArray(data[name]) && data[name].length > 0
      })
      if (storeNames.length === 0) return { imported: 0, skipped: stores.length }

      // 单事务原子写入
      return new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction(storeNames, 'readwrite')
        const counts = {}

        transaction.oncomplete = () => {
          // 事务成功后导入 localStorage 数据
          if (data.localStorage && typeof data.localStorage === 'object') {
            try {
              Object.keys(data.localStorage).forEach((k) => {
                try { localStorage.setItem(k, data.localStorage[k]) } catch (e) { /* 忽略 */ }
              })
            } catch (e) { /* 忽略 */ }
          }
          resolve({ imported: counts, skipped: stores.length - storeNames.length })
        }
        transaction.onerror = () => reject(transaction.error || new Error('导入失败'))
        transaction.onabort = () => reject(transaction.error || new Error('导入被中止'))

        storeNames.forEach((storeName) => {
          const s = transaction.objectStore(storeName)
          s.clear()
          counts[storeName] = 0
          if (storeName === 'user_progress') {
            // 单对象仓库：直接写入主记录
            s.put(data.user_progress)
            counts[storeName]++
            return
          }
          data[storeName].forEach((item) => {
            if (!item || typeof item !== 'object') return
            // autoIncrement 仓库移除 id，由 DB 重新分配
            if (storeName === 'study_log' || storeName === 'error_book') delete item.id
            const req = s.put(item)
            req.onsuccess = () => { counts[storeName]++ }
          })
        })
      })
    }
  }
})