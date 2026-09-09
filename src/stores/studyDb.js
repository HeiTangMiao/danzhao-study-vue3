/**
 * studyDb Store —— IndexedDB 数据层（Pinia 封装）
 * 职责：
 *  - 封装 IndexedDB 的初始化与 7 个对象仓库的 CRUD 操作
 *  - 替代旧版 assets/js/db.js 的 StudyDB 模块
 *  - 为各 composable 与 store 提供统一数据访问层（游戏化已移除）
 *
 * 对象仓库说明：
 *  - study_log：学习日志（每次访问/答题/测验的记录）
 *  - daily_stats：每日统计（文件数、题目数、学习时长）
 *  - page_progress：页面进度（访问状态、答题数、测验分数）
 *  - error_book：错题本（含 SM-2 间隔复习字段）
 *  - notes：每页笔记
 *  - bookmarks：书签收藏
 *  - user_progress：统一学习进度（completed 映射 + 最近学习时间戳）
 *
 * 版本历史：
 *  - v1~v3：曾在 daily_stats/study_log 等仓库记录 xp/checkin/成就等游戏字段
 *  - v4：学习进度统一入库（user_progress）
 *  - v5：移除游戏化 —— 删除 achievements 仓库，清理 daily_stats 中的游戏字段
 */
import { defineStore } from 'pinia'

// IndexedDB 配置（库名保持兼容；版本号 v5 移除游戏字段）
const DB_NAME = 'study_game_db'
const DB_VERSION = 5

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

      // v5：移除游戏化 —— 删除成就仓库，清理每日统计中的游戏字段
      if (oldVersion < 5) {
        if (d.objectStoreNames.contains('achievements')) {
          d.deleteObjectStore('achievements')
        }
        // 清理由旧版本遗留的 xp/checkin/subjects 字段，仅保留学习统计
        const store = d.transaction('daily_stats', 'readwrite').objectStore('daily_stats')
        if (store) {
          store.openCursor().onsuccess = (ev) => {
            const cursor = ev.target.result
            if (cursor) {
              const rec = cursor.value
              if (rec && (rec.xp !== undefined || rec.checkin !== undefined || rec.subjects !== undefined)) {
                cursor.update({
                  date: rec.date,
                  filesVisited: rec.filesVisited || 0,
                  questionsAnswered: rec.questionsAnswered || 0,
                  studyMinutes: rec.studyMinutes || 0
                })
              }
              cursor.continue()
            }
          }
        }
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

/** 写入 / 更新记录（按 keyPath 覆盖）。正常业务写入 = 本地变更，自动盖上 updatedAt 供同步比较 */
function dbPut(storeName, data) {
  const stamped = { ...data, updatedAt: new Date().toISOString() }
  return new Promise((resolve, reject) => {
    const r = getStore(storeName, 'readwrite').put(stamped)
    r.onsuccess = () => resolve()
    r.onerror = () => reject(r.error)
  })
}

/** 新增记录（autoIncrement key 由 DB 分配） */
function dbAdd(storeName, data) {
  const stamped = { ...data, updatedAt: new Date().toISOString() }
  return new Promise((resolve, reject) => {
    const r = getStore(storeName, 'readwrite').add(stamped)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

/** 同步引擎专用：按服务器时间戳落库（不覆盖 updatedAt，避免把远端时间改成本地） */
function putSynced(storeName, data) {
  return new Promise((resolve, reject) => {
    const r = getStore(storeName, 'readwrite').put(data)
    r.onsuccess = () => resolve()
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

/** 获取日期字符串 YYYY-MM-DD（本地时区，用于每日统计/学习日志） */
function getDateStr(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const useStudyDbStore = defineStore('studyDb', {
  actions: {
    // ===== 初始化 =====

    /** 初始化数据库连接（幂等，多次调用安全） */
    async init() {
      await openDB()
    },

    /**
     * 同步引擎专用：按服务器时间戳落库（保留 updatedAt）
     * @param {string} storeName - 仓库名
     * @param {Object} data - 来自服务器的完整业务记录
     */
    async applySynced(storeName, data) {
      await this.init()
      return putSynced(storeName, data)
    },

    /** 同步引擎专用：按 key 删除本地记录（墓碑应用） */
    async removeSynced(storeName, key) {
      await this.init()
      return dbDelete(storeName, key)
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
      return r || { date, filesVisited: 0, questionsAnswered: 0, studyMinutes: 0 }
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

    // ===== 学习工具记录（原 gameEngine，已去除游戏化） =====

    /**
     * 更新今日学习统计（不含游戏化字段）
     * @param {{ filesVisited?: number, questionsAnswered?: number, studyMinutes?: number }} delta
     */
    async updateDailyStat(delta = {}) {
      await this.init()
      const date = getDateStr()
      const stat = await this.getDailyStat(date)
      stat.filesVisited = (stat.filesVisited || 0) + (delta.filesVisited || 0)
      stat.questionsAnswered = (stat.questionsAnswered || 0) + (delta.questionsAnswered || 0)
      stat.studyMinutes = (stat.studyMinutes || 0) + (delta.studyMinutes || 0)
      await this.saveDailyStat(stat)
    },

    /**
     * 记录页面访问（首次访问）：落 page_progress + 今日统计 + 学习日志
     * @returns {Promise<{ alreadyVisited: boolean }>}
     */
    async markPageVisited({ subject, unitNum, unitTitle, fileKey, fileTitle, isTest = false }) {
      await this.init()
      const existing = await this.getPageProgress(fileKey)
      if (existing && existing.visited) return { alreadyVisited: true }
      await this.savePageProgress({
        key: fileKey, subject, unitNum, unitTitle, fileTitle,
        visited: true, visitTime: Date.now(),
        questionsAnswered: 0, questionsTotal: 0, testScore: null
      })
      await this.addStudyLog({
        date: getDateStr(), timestamp: Date.now(), subject, unitNum, fileKey,
        action: isTest ? 'test_complete' : 'page_visit'
      })
      await this.updateDailyStat({ filesVisited: isTest ? 0 : 1 })
      return { alreadyVisited: false }
    },

    /**
     * 记录测验成绩（写入 page_progress：${subject}_unit_${unitNum}_test）
     * @returns {Promise<{ percent: number, testPoints: string }>}
     */
    async recordTest(subject, unitNum, earnedPoints, totalPoints) {
      await this.init()
      const percent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
      const fileKey = `${subject}_unit_${unitNum}_test`
      const existing = await this.getPageProgress(fileKey)
      const testPoints = `${earnedPoints}/${totalPoints}`
      await this.savePageProgress({
        ...(existing || {}),
        key: fileKey, subject, unitNum, visited: true,
        testScore: percent, testPoints
      })
      await this.addStudyLog({
        date: getDateStr(), timestamp: Date.now(), subject, unitNum, fileKey,
        action: 'complete_test', testScore: percent
      })
      return { percent, testPoints }
    },

    /**
     * 记录错题到错题本（SM-2 初始字段），同页面同题干去重
     * @returns {Promise<{ id, success, duplicated? }>}
     */
    async recordError(subject, unitNum, question, correctAnswer, userAnswer, explanation, extra) {
      await this.init()
      const fileKey = (extra && extra.fileKey) || ''
      const allErrors = await this.getAllErrors()
      const dup = allErrors.find(
        (e) => e.subject === subject && e.question === question &&
          (fileKey ? e.fileKey === fileKey : e.unitNum === unitNum)
      )
      if (dup) return { id: dup.id, success: true, duplicated: true }
      const error = {
        subject, unitNum, question, correctAnswer, userAnswer,
        explanation: explanation || '',
        createdAt: Date.now(), createdAtDate: getDateStr(),
        reviewed: false, reviewCount: 0,
        easeFactor: 2.5, interval: 0, repetitions: 0,
        nextReviewDate: getDateStr(), lastReviewedAt: null
      }
      if (extra && typeof extra === 'object') Object.assign(error, extra)
      const id = await this.addError(error)
      return { id, success: true }
    },

    /**
     * 学习概况（无游戏化）：各学科已学/答题 + 今日统计 + 错题数
     * 各学科 total（页面总数）由视图用 getSubjectConfig 结合计算
     */
    async getLearningOverview() {
      await this.init()
      const [allProgress, allStats, allErrors] = await Promise.all([
        this.getAllPageProgress(), this.getAllDailyStats(), this.getAllErrors()
      ])
      const subjects = {
        math: { visited: 0, questions: 0 },
        chinese: { visited: 0, questions: 0 },
        computer: { visited: 0, questions: 0 }
      }
      let totalVisited = 0
      let totalQuestions = 0
      for (const p of allProgress) {
        if (!subjects[p.subject]) continue
        if (p.visited) { subjects[p.subject].visited++; totalVisited++ }
        const q = p.questionsAnswered || 0
        subjects[p.subject].questions += q
        totalQuestions += q
      }
      const todayStr = getDateStr()
      const statMap = new Map(allStats.map((s) => [s.date, s]))
      const todayStat = statMap.get(todayStr) || { filesVisited: 0, questionsAnswered: 0, studyMinutes: 0 }
      return { subjects, totalVisited, totalQuestions, todayStat, errorsCount: allErrors.length, allErrors }
    },

    // ===== 数据导出 / 导入 =====

    /**
     * 导出全部数据（IndexedDB + localStorage）
     * 用于数据备份或迁移
     */
    async exportAllData() {
      await this.init()
      const [studyLogs, dailyStats, pageProgress, errors, notes, bookmarks, progress] = await Promise.all([
        this.getAllStudyLogs(),
        this.getAllDailyStats(),
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
      const stores = ['study_log', 'daily_stats', 'page_progress', 'error_book', 'notes', 'bookmarks', 'user_progress']

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