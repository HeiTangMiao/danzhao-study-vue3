/**
 * usePomodoro —— 番茄钟学习计时器 composable
 * 职责：
 *  - 25 分钟专注 + 5 分钟休息，每 4 个番茄后长休息 15 分钟
 *  - 状态持久化到 localStorage（防止刷新丢失）
 *  - 完成专注后记录学习时长到 daily_stats（P1-12：**按科目归集**到 studyMinutesBySubject，
 *    与全局 studyMinutes 同一次写入；番茄数用真实计数 pomodoroCount，不再 studyMinutes/25 反推）
 *  - 提供音效 / 通知 / 产出登记（study_log action='pomodoro_output'）
 *
 * 替代旧版 assets/js/pomodoro.js
 * 依赖：studyDb store
 */
import { ref, computed, onUnmounted } from 'vue'
import { useStudyDbStore } from '@/stores/studyDb'

// 计时配置（秒）
const FOCUS_DURATION = 25 * 60      // 专注 25 分钟
const BREAK_DURATION = 5 * 60       // 短休息 5 分钟
const LONG_BREAK_DURATION = 15 * 60 // 长休息 15 分钟
const STORAGE_KEY = 'pomodoro_state'

/**
 * 科目取值域（P1-12）—— 单一来源，**禁止视图内联**。
 * 与 studyPlan.budget 键、studyDb 的 studyMinutesBySubject 键对齐；'other' 收纳未归科时间。
 */
export const SUBJECTS = ['math', 'chinese', 'computer', 'other']

// 全局复用的音频上下文（避免每次提示音都新建 AudioContext）
let audioCtx = null

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

/**
 * 番茄钟计时器 composable
 * @param {string} [initialSubject='other'] 启动时的默认科目（UnitView 传当前页 subject）
 */
export function usePomodoro(initialSubject = 'other') {
  const db = useStudyDbStore()

  // 响应式状态
  const running = ref(false)
  const mode = ref('focus')           // 'focus' | 'break' | 'long_break'
  const timeLeft = ref(FOCUS_DURATION)
  const sessionsCompleted = ref(0)    // 今日已完成番茄数
  const cycleCount = ref(0)           // 当前周期番茄数（0-3）
  // 当前科目（P1-12）：启动时选定；默认由 UnitView 传入当前页 subject
  const activeSubject = ref(SUBJECTS.includes(initialSubject) ? initialSubject : 'other')
  // 最近一次「真实完成」的专注时间戳（rewarded 才置位）—— 供面板弹「本次产出」登记（skip 不弹）
  const lastFocusDoneAt = ref(0)

  /** 切换当前科目（视图段控/下拉用；非法值忽略） */
  function setSubject(subject) {
    if (SUBJECTS.includes(subject)) activeSubject.value = subject
  }

  let intervalId = null
  // 当前阶段开始的时间戳（秒/毫秒），用于时间戳基准校准计时
  let startedAtTs = 0

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
          startedAtTs = saved.startedAt
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

  /** 每秒触发：按时间戳校准剩余时间，到零则完成当前阶段 */
  function tick() {
    const remaining = totalDuration.value - Math.floor((Date.now() - startedAtTs) / 1000)
    timeLeft.value = Math.max(0, remaining)
    if (timeLeft.value <= 0) {
      completePhase()
    }
    // 不在此持久化：剩余时间由 startedAt 时间戳恢复，避免每秒 JSON 序列化写入 localStorage
  }

  /** 播放完成音效（Web Audio API 正弦波，复用单例 AudioContext） */
  async function playBeep() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      if (audioCtx.state === 'suspended') await audioCtx.resume()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.frequency.value = 800
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.5)
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
   * 记录学习时长到 daily_stats（P1-12 分科归集）
   * 全局 studyMinutes 与分科 studyMinutesBySubject 由 updateDailyStat **同一次写入**完成，
   * 保证 ΣstudyMinutesBySubject == studyMinutes（番茄来源部分）恒成立（禁止两处分别算）。
   * @param {number} minutes - 学习分钟数
   * @param {string} [subject] - 科目（默认当前 activeSubject）
   */
  async function recordStudyMinutes(minutes, subject = activeSubject.value) {
    try {
      await db.init()
      await db.updateDailyStat({
        studyMinutes: minutes,
        // 分科与全局同一 delta 原子写入（唯一保证点）
        studyMinutesBySubject: { [subject]: minutes }
      })
    } catch (e) {
      console.warn('[Pomodoro] 记录学习时长失败:', e)
    }
  }

  /** 真实番茄数 +1（P1-12）：focus **真实完成**时调用；skip 不调用 → 不用 studyMinutes/25 反推 */
  async function bumpPomodoroCount() {
    try {
      await db.init()
      await db.updateDailyStat({ pomodoroCount: 1 })
    } catch (e) {
      console.warn('[Pomodoro] 记录番茄数失败:', e)
    }
  }

  /**
   * 登记「本次产出」（P1-12）：复用 study_log 时间线（零新表），action='pomodoro_output'。
   * note 存「做了什么 / 卡在哪」一行文本；空 note 不写（等同跳过）。
   */
  async function recordOutput(note) {
    const text = String(note || '').trim()
    if (!text) return
    try {
      await db.init()
      await db.addStudyLog({
        date: getDateStr(),
        timestamp: Date.now(),
        subject: activeSubject.value,
        action: 'pomodoro_output',
        note: text
      })
    } catch (e) {
      console.warn('[Pomodoro] 登记产出失败:', e)
    }
  }

  /** 完成当前阶段（专注→休息 或 休息→专注）
   *  @param {boolean} rewarded - 是否按真实完成计（跳过时不记录学习时长）
   */
  async function completePhase(rewarded = true) {
    stopInterval()
    startedAtTs = 0
    running.value = false
    if (rewarded) await playBeep()

    if (mode.value === 'focus') {
      // 专注完成
      cycleCount.value++
      if (rewarded) {
        // 分科归集学习时长（全局 + 分科同一次写入）+ 真实番茄数 +1（skip 不计）
        await recordStudyMinutes(FOCUS_DURATION / 60)
        await bumpPomodoroCount()
        // 以 daily_stats 为单一数据源刷新今日番茄数
        await loadTodaySessions()
        // 置位：面板据此弹「本次产出」登记（true 完成才弹，skip 不弹）
        lastFocusDoneAt.value = Date.now()
        notify('番茄钟完成！', '专注了25分钟，休息一下吧')
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
      notify('休息结束', '继续学习吧！')
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
    startedAtTs = Date.now()
    startInterval()
    saveState()
  }

  /** 暂停计时 */
  function pause() {
    if (!running.value) return
    running.value = false
    stopInterval()
    // 暂停前用时间戳校准剩余秒数，保证持久化的是准确值
    timeLeft.value = Math.max(0, totalDuration.value - Math.floor((Date.now() - startedAtTs) / 1000))
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

  /** 跳过当前阶段（不记录学习时长，直接进入下一阶段） */
  function skip() {
    if (running.value || timeLeft.value < totalDuration.value) {
      timeLeft.value = 0
      completePhase(false)
    }
  }

  /** 加载今日已完成番茄数（P1-12：真实计数，不再 studyMinutes/25 反推） */
  async function loadTodaySessions() {
    try {
      await db.init()
      const stat = await db.getDailyStat(getDateStr())
      sessionsCompleted.value = stat.pomodoroCount || 0
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
    activeSubject, lastFocusDoneAt,
    // 计算属性
    display, progress, modeLabel, totalDuration,
    // 操作
    start, pause, reset, skip,
    setSubject, recordStudyMinutes, bumpPomodoroCount, loadTodaySessions, recordOutput
  }
}