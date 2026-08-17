/**
 * gameEngine Store —— 学习游戏化引擎（Pinia）
 * 职责：
 *  - 经验值（XP）累积与等级计算
 *  - 每日打卡与连击统计
 *  - 成就解锁检测
 *  - 学习行为追踪（访问页面、答题、测验、错题）
 *  - 仪表盘数据聚合
 *
 * 替代旧版 assets/js/game-engine.js 的 GameEngine 模块
 * 依赖：studyDb store（IndexedDB 数据层）
 *
 * 等级体系沿用旧版设计（学徒→书童→秀才→举人→贡士→进士→探花→榜眼→状元）
 */
import { defineStore } from 'pinia'
import { useStudyDbStore } from './studyDb'
import { getSubjectConfig } from '@/content/index'

// XP 奖励常量
const XP = {
  READ_PAGE: 10,           // 阅读一个知识点页面
  ANSWER_QUESTION: 5,      // 答对一道题
  COMPLETE_TEST: 50,       // 完成一次测验
  HIGH_SCORE_BONUS: 30,    // 测验高分（≥90%）奖励
  PERFECT_SCORE_BONUS: 20, // 满分额外奖励
  DAILY_STREAK_BASE: 10    // 连击基础 XP
}

// 等级表：30 级，6 个阶段
const LEVELS = [
  { lv: 1, title: '学徒', xp: 0 },    { lv: 2, title: '学徒', xp: 50 },
  { lv: 3, title: '学徒', xp: 120 },   { lv: 4, title: '书童', xp: 200 },
  { lv: 5, title: '书童', xp: 300 },   { lv: 6, title: '书童', xp: 420 },
  { lv: 7, title: '秀才', xp: 560 },   { lv: 8, title: '秀才', xp: 720 },
  { lv: 9, title: '秀才', xp: 900 },   { lv: 10, title: '秀才', xp: 1100 },
  { lv: 11, title: '举人', xp: 1320 }, { lv: 12, title: '举人', xp: 1560 },
  { lv: 13, title: '举人', xp: 1820 }, { lv: 14, title: '举人', xp: 2100 },
  { lv: 15, title: '贡士', xp: 2400 }, { lv: 16, title: '贡士', xp: 2720 },
  { lv: 17, title: '贡士', xp: 3060 }, { lv: 18, title: '贡士', xp: 3420 },
  { lv: 19, title: '进士', xp: 3800 }, { lv: 20, title: '进士', xp: 4200 },
  { lv: 21, title: '进士', xp: 4620 }, { lv: 22, title: '进士', xp: 5060 },
  { lv: 23, title: '探花', xp: 5520 }, { lv: 24, title: '探花', xp: 6000 },
  { lv: 25, title: '榜眼', xp: 6500 }, { lv: 26, title: '榜眼', xp: 7020 },
  { lv: 27, title: '榜眼', xp: 7560 }, { lv: 28, title: '榜眼', xp: 8120 },
  { lv: 29, title: '状元', xp: 8700 }, { lv: 30, title: '状元', xp: 9300 }
]

// 成就定义表
const ACHIEVEMENTS = [
  { id: 'first_step', name: '初入书海', desc: '完成第一次学习', icon: '📖' },
  { id: 'streak_7', name: '一周不辍', desc: '连续学习7天', icon: '🔥' },
  { id: 'streak_30', name: '月度坚持', desc: '连续学习30天', icon: '⚡' },
  { id: 'streak_100', name: '百日筑基', desc: '连续学习100天', icon: '🏆' },
  { id: 'math_unit_1', name: '集合达人', desc: '完成数学第1单元', icon: '📐' },
  { id: 'chinese_unit_1', name: '文字达人', desc: '完成语文第1单元', icon: '✍️' },
  { id: 'all_math', name: '数学通关', desc: '完成数学全部单元', icon: '🎓' },
  { id: 'all_chinese', name: '语文通关', desc: '完成语文全部单元', icon: '🎓' },
  { id: 'dual_study', name: '双修先锋', desc: '同日学习数学和语文', icon: '⚔️' },
  { id: 'perfect_test', name: '满分测验', desc: '复习测验正确率100%', icon: '💯' },
  { id: 'fast_learner', name: '速度之星', desc: '10分钟内完成一个知识点', icon: '⭐' },
  { id: 'level_10', name: '小有所成', desc: '达到10级', icon: '🎖️' },
  { id: 'level_20', name: '学有所成', desc: '达到20级', icon: '🏅' },
  { id: 'level_30', name: '学海状元', desc: '达到30级（满级）', icon: '👑' }
]

/**
 * 获取日期字符串（YYYY-MM-DD）
 * 封为独立函数，方便测试时 mock
 */
function getDateStr(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const useGameEngineStore = defineStore('gameEngine', {
  state: () => ({
    // 快速统计缓存（30 秒 TTL，避免每次页面加载全量读取 IndexedDB）
    _quickStatsCache: null,
    _quickStatsTTL: 0
  }),

  getters: {
    /** 暴露等级表与成就表供 UI 使用 */
    LEVELS: () => LEVELS,
    ACHIEVEMENTS: () => ACHIEVEMENTS,
    XP_RULES: () => XP
  },

  actions: {
    /**
     * 根据总 XP 计算当前等级信息
     * @param {number} totalXP - 总经验值
     * @returns {{ level, next, progress, needXP, totalXP }}
     */
    getLevel(totalXP) {
      let current = LEVELS[0]
      let next = null
      for (const lv of LEVELS) {
        if (totalXP >= lv.xp) { current = lv; next = LEVELS[lv.lv] || null }
      }
      const progress = next ? (totalXP - current.xp) / (next.xp - current.xp) : 1
      const needXP = next ? (next.xp - totalXP) : 0
      return { level: current, next, progress, needXP, totalXP }
    },

    /**
     * 计算连续学习天数（连击）
     * 如果今天已打卡则从今天算起，否则从昨天算起
     * @param {Array} allStats - 全部每日统计
     * @returns {number} 连续天数
     */
    getStreak(allStats) {
      let streak = 0
      const today = new Date()
      const statMap = new Map(allStats.map((s) => [s.date, s]))

      const todayStr = getDateStr(today)
      const todayStat = statMap.get(todayStr)
      // 今天未打卡则从昨天开始算
      const startOffset = (todayStat && todayStat.checkin) ? 0 : 1

      for (let i = startOffset; i < 365; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const stat = statMap.get(getDateStr(d))
        if (stat && stat.checkin) streak++
        else break
      }
      return streak
    },

    /**
     * 追踪页面访问（首次访问奖励 XP）
     * @param {string} subject - 学科 'math' | 'chinese'
     * @param {string} unitNum - 单元编号
     * @param {string} unitTitle - 单元标题
     * @param {string} fileKey - 页面唯一标识
     * @param {string} fileTitle - 页面标题
     * @param {boolean} isTest - 是否为测验页
     */
    async trackVisit(subject, unitNum, unitTitle, fileKey, fileTitle, isTest) {
      try {
        const db = useStudyDbStore()
        await db.init()
        const existing = await db.getPageProgress(fileKey)
        if (existing && existing.visited) return { xpGained: 0, alreadyVisited: true }

        const xpGained = isTest ? XP.COMPLETE_TEST : XP.READ_PAGE
        await db.savePageProgress({
          key: fileKey, subject, unitNum, unitTitle, fileTitle,
          visited: true, visitTime: Date.now(),
          questionsAnswered: 0, questionsTotal: 0, testScore: null,
          xpEarned: (existing?.xpEarned || 0) + xpGained
        })

        await db.addStudyLog({
          date: getDateStr(), timestamp: Date.now(), subject, unitNum, fileKey,
          action: isTest ? 'test_complete' : 'page_visit', xp: xpGained
        })

        await this.updateDailyStat(xpGained, subject, isTest ? 0 : 1, 0)
        await this.checkAchievements(subject)
        this._invalidateQuickStatsCache()
        return { xpGained, alreadyVisited: false }
      } catch (e) {
        console.error('[GameEngine] trackVisit error:', e)
        return { xpGained: 0, error: e }
      }
    },

    /**
     * 追踪答题（每答一题奖励 XP）
     * 同时检测 fast_learner 成就（首次访问 10 分钟内答题）
     */
    async trackAnswer(subject, unitNum, fileKey) {
      try {
        const db = useStudyDbStore()
        await db.init()
        let existing = await db.getPageProgress(fileKey)
        if (!existing) {
          existing = { key: fileKey, subject, unitNum, visited: false, questionsAnswered: 0, xpEarned: 0 }
        }

        // 速度之星成就：首次访问 10 分钟内答题
        if (existing.visitTime && (Date.now() - existing.visitTime) <= 600000) {
          const flExisting = await db.getAchievement('fast_learner')
          if (!flExisting) {
            const def = ACHIEVEMENTS.find((a) => a.id === 'fast_learner')
            if (def) await db.saveAchievement({ ...def, unlockedDate: getDateStr() })
          }
        }

        existing.questionsAnswered = (existing.questionsAnswered || 0) + 1
        existing.xpEarned = (existing.xpEarned || 0) + XP.ANSWER_QUESTION
        await db.savePageProgress(existing)

        await db.addStudyLog({
          date: getDateStr(), timestamp: Date.now(), subject, unitNum, fileKey,
          action: 'answer_question', xp: XP.ANSWER_QUESTION
        })

        await this.updateDailyStat(XP.ANSWER_QUESTION, subject, 0, 1)
        this._invalidateQuickStatsCache()
        return { xpGained: XP.ANSWER_QUESTION }
      } catch (e) {
        console.error('[GameEngine] trackAnswer error:', e)
        return { xpGained: 0 }
      }
    },

    /**
     * 记录测验成绩
     * @param {string} subject - 学科
     * @param {string} unitNum - 单元编号
     * @param {number} earnedPoints - 得分
     * @param {number} totalPoints - 满分
     */
    async recordTest(subject, unitNum, earnedPoints, totalPoints) {
      try {
        const db = useStudyDbStore()
        await db.init()
        const percent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
        let xpGained = XP.COMPLETE_TEST
        if (percent >= 90) xpGained += XP.HIGH_SCORE_BONUS
        if (percent === 100) xpGained += XP.PERFECT_SCORE_BONUS

        const fileKey = `${subject}_unit_${unitNum}_test`
        let existing = await db.getPageProgress(fileKey)
        if (!existing) {
          existing = { key: fileKey, subject, unitNum, visited: false, questionsAnswered: 0, xpEarned: 0 }
        }
        existing.visited = true
        existing.testScore = percent
        existing.testPoints = `${earnedPoints}/${totalPoints}`
        existing.xpEarned = (existing.xpEarned || 0) + xpGained
        await db.savePageProgress(existing)

        await db.addStudyLog({
          date: getDateStr(), timestamp: Date.now(), subject, unitNum, fileKey,
          action: 'complete_test', xp: xpGained, testScore: percent
        })

        await this.updateDailyStat(xpGained, subject, 0, 0)

        // 满分成就
        if (percent === 100) {
          const def = ACHIEVEMENTS.find((a) => a.id === 'perfect_test')
          if (def) await db.saveAchievement({ ...def, unlockedDate: getDateStr() })
        }

        this._invalidateQuickStatsCache()
        return { xpGained, percent }
      } catch (e) {
        console.error('[GameEngine] recordTest error:', e)
        return { xpGained: 0 }
      }
    },

    /**
     * 记录错题到错题本（含 SM-2 间隔复习初始字段）
     * @returns {Promise<{id, success}>}
     */
    async recordError(subject, unitNum, question, correctAnswer, userAnswer, explanation, extra) {
      try {
        const db = useStudyDbStore()
        await db.init()
        const error = {
          subject, unitNum, question, correctAnswer, userAnswer,
          explanation: explanation || '',
          createdAt: Date.now(), createdAtDate: getDateStr(),
          reviewed: false, reviewCount: 0,
          // SM-2 算法字段
          easeFactor: 2.5, interval: 0, repetitions: 0,
          nextReviewDate: getDateStr(), lastReviewedAt: null
        }
        // 合并额外字段（fileKey, fileTitle, unitTitle 等）
        if (extra && typeof extra === 'object') Object.assign(error, extra)
        const id = await db.addError(error)
        return { id, success: true }
      } catch (e) {
        console.error('[GameEngine] recordError error:', e)
        return { success: false }
      }
    },

    /**
     * 更新每日统计（内部方法）
     * @param {number} xp - XP 增量
     * @param {string} subject - 学科
     * @param {number} fileInc - 文件访问数增量
     * @param {number} qInc - 答题数增量
     */
    async updateDailyStat(xp, subject, fileInc, qInc) {
      const db = useStudyDbStore()
      const date = getDateStr()
      const stat = await db.getDailyStat(date)
      stat.xp = (stat.xp || 0) + xp
      stat.filesVisited = (stat.filesVisited || 0) + fileInc
      stat.questionsAnswered = (stat.questionsAnswered || 0) + qInc
      if (!stat.checkin) stat.checkin = true
      if (!stat.subjects) stat.subjects = {}
      if (!stat.subjects[subject]) stat.subjects[subject] = { xp: 0, files: 0, questions: 0 }
      stat.subjects[subject].xp += xp
      stat.subjects[subject].files += fileInc
      stat.subjects[subject].questions += qInc
      await db.saveDailyStat(stat)
    },

    /**
     * 成就检测与解锁
     * 根据学习进度、连击、等级等条件自动解锁成就
     */
    async checkAchievements(subject) {
      const db = useStudyDbStore()
      const allProgress = await db.getAllPageProgress()
      const allStats = await db.getAllDailyStats()

      const totalXP = allProgress.reduce((s, p) => s + (p.xpEarned || 0), 0)
      const levelInfo = this.getLevel(totalXP)
      const streak = this.getStreak(allStats)
      const unlocked = []

      // 基础成就
      if (allProgress.length >= 1) unlocked.push('first_step')
      if (streak >= 7) unlocked.push('streak_7')
      if (streak >= 30) unlocked.push('streak_30')
      if (streak >= 100) unlocked.push('streak_100')
      if (levelInfo.level.lv >= 10) unlocked.push('level_10')
      if (levelInfo.level.lv >= 20) unlocked.push('level_20')
      if (levelInfo.level.lv >= 30) unlocked.push('level_30')

      // 双修成就：同日学习数学和语文
      const today = getDateStr()
      const statMap = new Map(allStats.map((s) => [s.date, s]))
      const todayStat = statMap.get(today)
      if (todayStat?.subjects?.math && todayStat?.subjects?.chinese) unlocked.push('dual_study')

      // 单元完成成就
      const achIds = new Set(ACHIEVEMENTS.map((a) => a.id))
      const subjectUnitVisited = {}
      allProgress.forEach((p) => {
        if (!p.visited) return
        if (!subjectUnitVisited[p.subject]) subjectUnitVisited[p.subject] = {}
        subjectUnitVisited[p.subject][p.unitNum] = (subjectUnitVisited[p.subject][p.unitNum] || 0) + 1
      })

      // 单元完成：已访问文件数 >= 单元总文件数
      // 注：此处从学科配置动态获取单元文件数，避免硬编码
      for (const s in subjectUnitVisited) {
        for (const u in subjectUnitVisited[s]) {
          const id = `${s}_unit_${u}`
          if (achIds.has(id)) {
            // 通过学科配置获取该单元文件数
            const expected = this._getUnitFileCount(s, u)
            if (expected && subjectUnitVisited[s][u] >= expected) unlocked.push(id)
          }
        }
        // 学科通关成就：该学科所有单元全部完成
        const allId = `all_${s}`
        if (achIds.has(allId)) {
          const config = getSubjectConfig(s)
          if (config && config.units) {
            const allDone = config.units.every((u) => {
              const expected = u.files.length
              const visited = subjectUnitVisited[s]?.[u.num] || 0
              return visited >= expected
            })
            if (allDone) unlocked.push(allId)
          }
        }
      }

      // 保存新解锁的成就
      for (const id of unlocked) {
        const existing = await db.getAchievement(id)
        if (!existing) {
          const def = ACHIEVEMENTS.find((a) => a.id === id)
          if (def) await db.saveAchievement({ ...def, unlockedDate: getDateStr() })
        }
      }
    },

    /**
     * 从学科配置获取某学科全部文件总数
     * @param {string} subject - 学科 key
     * @returns {number} 该学科全部页面数
     */
    _getSubjectTotalFiles(subject) {
      const config = getSubjectConfig(subject)
      if (!config || !config.units) return 0
      return config.units.reduce((sum, u) => sum + u.files.length, 0)
    },

    /**
     * 从学科配置获取某学科某单元的文件数
     * 内部辅助方法，支持多学科（数学/语文）
     * @param {string} subject - 学科 key: 'math' | 'chinese'
     * @param {string} unitNum - 单元编号
     * @returns {number} 该单元文件总数
     */
    _getUnitFileCount(subject, unitNum) {
      const config = getSubjectConfig(subject)
      if (!config || !config.units) return 0
      const unit = config.units.find((u) => u.num === unitNum)
      return unit ? unit.files.length : 0
    },

    /**
     * 获取仪表盘全量数据
     * 聚合等级、连击、热力图、学科进度、成就等
     */
    async getDashboardData() {
      const db = useStudyDbStore()
      await db.init()
      const [allProgress, allStats, allAchievements, allErrors] = await Promise.all([
        db.getAllPageProgress(), db.getAllDailyStats(),
        db.getAllAchievements(), db.getAllErrors()
      ])

      const totalXP = allProgress.reduce((s, p) => s + (p.xpEarned || 0), 0)
      const levelInfo = this.getLevel(totalXP)
      const streak = this.getStreak(allStats)

      const today = getDateStr()
      const statMap = new Map(allStats.map((s) => [s.date, s]))
      const todayStat = statMap.get(today) || { xp: 0, filesVisited: 0, questionsAnswered: 0, checkin: false }

      // 热力图数据（最近 90 天）
      const heatmap = []
      const heatDate = new Date()
      for (let i = 89; i >= 0; i--) {
        const d = new Date(heatDate)
        d.setDate(d.getDate() - i)
        const ds = getDateStr(d)
        const stat = statMap.get(ds)
        heatmap.push({ date: ds, xp: stat?.xp || 0, checkin: !!stat?.checkin })
      }

      // 学科进度汇总（total 从学科配置动态计算）
      const subjects = {
        math: { total: this._getSubjectTotalFiles('math'), visited: 0, xp: 0, units: {} },
        chinese: { total: this._getSubjectTotalFiles('chinese'), visited: 0, xp: 0, units: {} }
      }
      allProgress.forEach((p) => {
        if (!subjects[p.subject]) return
        subjects[p.subject].visited++
        subjects[p.subject].xp += (p.xpEarned || 0)
        if (!subjects[p.subject].units[p.unitNum]) subjects[p.subject].units[p.unitNum] = { visited: 0, xp: 0 }
        subjects[p.subject].units[p.unitNum].visited++
        subjects[p.subject].units[p.unitNum].xp += (p.xpEarned || 0)
      })

      return {
        totalXP, levelInfo, streak, todayStat, heatmap, subjects,
        achievements: allAchievements, allProgress, allErrors,
        totalVisited: allProgress.filter((p) => p.visited).length,
        totalQuestions: allProgress.reduce((s, p) => s + (p.questionsAnswered || 0), 0)
      }
    },

    /**
     * 轻量级统计（仅 totalXP + levelInfo + streak）
     * 带 30 秒缓存，避免每次页面加载全量读取 IndexedDB
     */
    async getQuickStats() {
      if (this._quickStatsCache && Date.now() - this._quickStatsTTL < 30000) {
        return this._quickStatsCache
      }
      const db = useStudyDbStore()
      await db.init()
      const [allProgress, allStats] = await Promise.all([db.getAllPageProgress(), db.getAllDailyStats()])
      const totalXP = allProgress.reduce((s, p) => s + (p.xpEarned || 0), 0)
      const levelInfo = this.getLevel(totalXP)
      const streak = this.getStreak(allStats)
      this._quickStatsCache = { totalXP, levelInfo, streak }
      this._quickStatsTTL = Date.now()
      return this._quickStatsCache
    },

    /** 使快速统计缓存失效（XP 变化时调用） */
    _invalidateQuickStatsCache() {
      this._quickStatsCache = null
      this._quickStatsTTL = 0
    },

    /** 暴露日期工具函数供外部使用 */
    getDateStr
  }
})