/**
 * usePomodoro —— 番茄钟学习计时器 composable
 * 职责：
 *  - 25 分钟专注 + 5 分钟休息，每 4 个番茄后长休息 15 分钟
 *  - 状态持久化到 localStorage（防止刷新丢失）
 *  - 完成专注后记录学习时长到 daily_stats 并奖励 XP
 *  - 提供音效与通知能力
 *
 * 替代旧版 assets/js/pomodoro.js
 * 依赖：studyDb store、gameEngine store
 */
import { ref, computed, onUnmounted } from 'vue'
import { useStudyDbStore } from '@/stores/studyDb'
import { useGameEngineStore } from '@/stores/gameEngine'

// 计时配置（秒）
const FOCUS_DURATION = 25 * 60      // 专注 25 分钟
const BREAK_DURATION = 5 * 60       // 短休息 5 分钟
const LONG_BREAK_DURATION = 15 * 60 // 长休息 15 分钟
const STORAGE_KEY = 'pomodoro_state'

/** 格式化秒数为 mm:ss */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

/** 获取日期字符串 YYYY-MM-DD */
function getDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function usePomodoro() {
  const db = useStudyDbStore()
  const game = useGameEngineStore()

  // 响应式状态
  const running = ref(false)
  const mode = ref('focus')           // 'focus' | 'break' | 'long_break'
  const timeLeft = ref(FOCUS_DURATION)
  const sessionsCompleted = ref(0)    // 今日已完成番茄数
  const cycleCount = ref(0)           // 当前周期番茄数（0-3）

  let intervalId = null

  // 当前模式总时长
  const totalDuration = computed(() => {
    if (mode.value === 'focus') return FOCUS_DURATION
    if (mode.value === 'long_break') return LONG_BREAK_DURATION
    return BREAK_DURATION
  })

  // 格式化显示
  const display = computed(() => formatTime(timeLeft.value))

  // 进度百分比（0-1）
  const progress = computed(() => (totalDuration.value - timeLeft.value) / totalDuration.value)

  // 模式中文标签
  const modeLabel = computed(() => {
    const labels = { focus: '专注', break: '休息', long_break: '长休息' }
    return labels[mode.value] || '专注'
  })

  /**
   * 从 localStorage 恢复未完成的计时状态
   * 计算已过去的时间，修正剩余秒数
   */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved.running && saved.startedAt) {
        const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000)
        const total = saved.mode === 'focus' ? FOCUS_DURATION
                    : saved.mode === 'long_break' ? LONG_BREAK_DURATION
                    : BREAK_DURATION
        const remaining = total - elapsed
        if (remaining > 0) {
          running.value = true
          mode.value = saved.mode
          timeLeft.value = remaining
          // 今日番茄数不从此恢复：统一以 daily_stats.studyMinutes 计算（见 loadTodaySessions）
          cycleCount.value = saved.cycleCount || 0
          // 恢复计时
          startInterval()
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (e) { /* 忽略解析异常 */ }
  }

  /** 持久化当前状态到 localStorage */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        running: running.value,
        mode: mode.value,
        timeLeft: timeLeft.value,
        sessionsCompleted: sessionsCompleted.value,
        cycleCount: cycleCount.value,
        startedAt: Date.now() - ((totalDuration.value - timeLeft.value) * 1000)
      }))
    } catch (e) { /* 忽略写入异常 */ }
  }

  /** 清除持久化状态 */
  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY) } catch (e) { /* 忽略 */ }
  }

  /** 启动计时器间隔（每秒 tick） */
  function startInterval() {
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(tick, 1000)
  }

  /** 停止计时器间隔 */
  function stopInterval() {
    if (intervalId) { clearInterval(intervalId); intervalId = null }
  }

  /** 每秒触发：递减剩余时间，到零则完成当前阶段 */
  function tick() {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      completePhase()
    } else {
      saveState()
    }
  }

  /** 播放完成音效（Web Audio API 正弦波） */
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) { /* 忽略音频异常 */ }
  }

  /** 发送浏览器通知 */
  function notify(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    try { new Notification(title, { body }) } catch (e) { /* 忽略 */ }
  }

  /** 请求通知权限 */
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  /**
   * 记录学习时长到 daily_stats
   * @param {number} minutes - 学习分钟数
   */
  async function recordStudyMinutes(minutes) {
    try {
      await db.init()
      const stat = await db.getDailyStat(getDateStr())
      stat.studyMinutes = (stat.studyMinutes || 0) + minutes
      await db.saveDailyStat(stat)
    } catch (e) {
      console.warn('[Pomodoro] 记录学习时长失败:', e)
    }
  }

  /** 完成当前阶段（专注→休息 或 休息→专注）
   *  @param {boolean} rewarded - 是否按真实完成计（跳过时不发放 XP / 不计学习时长）
   */
  async function completePhase(rewarded = true) {
    stopInterval()
    running.value = false
    if (rewarded) playBeep()

    if (mode.value === 'focus') {
      // 专注完成
      cycleCount.value++
      if (rewarded) {
        await recordStudyMinutes(FOCUS_DURATION / 60)
        // 奖励 XP
        await game.updateDailyStat(10, 'general', 0, 0)
        game._invalidateQuickStatsCache()
        // 以 daily_stats 为单一数据源刷新今日番茄数
        await loadTodaySessions()
        notify('番茄钟完成！', '专注了25分钟，休息一下吧 🎉')
      }

      // 切换到休息模式
      if (cycleCount.value >= 4) {
        mode.value = 'long_break'
        timeLeft.value = LONG_BREAK_DURATION
        cycleCount.value = 0
      } else {
        mode.value = 'break'
        timeLeft.value = BREAK_DURATION
      }
    } else {
      // 休息完成
      notify('休息结束', '继续学习吧！💪')
      mode.value = 'focus'
      timeLeft.value = FOCUS_DURATION
    }

    saveState()
    // 自动开始下一阶段
    start()
  }

  /** 开始计时 */
  function start() {
    if (running.value) return
    running.value = true
    if (mode.value === 'focus') requestNotificationPermission()
    startInterval()
    saveState()
  }

  /** 暂停计时 */
  function pause() {
    if (!running.value) return
    running.value = false
    stopInterval()
    saveState()
  }

  /** 重置为专注模式初始状态 */
  function reset() {
    stopInterval()
    running.value = false
    mode.value = 'focus'
    timeLeft.value = FOCUS_DURATION
    clearState()
  }

  /** 跳过当前阶段（不发放 XP、不记录学习时长，直接进入下一阶段） */
  function skip() {
    if (running.value || timeLeft.value < totalDuration.value) {
      timeLeft.value = 0
      completePhase(false)
    }
  }

  /** 加载今日已完成番茄数 */
  async function loadTodaySessions() {
    try {
      await db.init()
      const stat = await db.getDailyStat(getDateStr())
      sessionsCompleted.value = Math.floor((stat.studyMinutes || 0) / 25)
    } catch (e) { sessionsCompleted.value = 0 }
  }

  // 初始化：恢复状态 + 加载今日番茄数
  loadState()
  loadTodaySessions()

  // 组件卸载时清理
  onUnmounted(() => {
    stopInterval()
    if (running.value) saveState()
  })

  return {
    // 状态
    running, mode, timeLeft, sessionsCompleted, cycleCount,
    // 计算属性
    display, progress, modeLabel, totalDuration,
    // 操作
    start, pause, reset, skip
  }
}