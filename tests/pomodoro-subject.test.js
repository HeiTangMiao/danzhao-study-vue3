// @vitest-environment jsdom
/**
 * 批 E · E-3 番茄钟绑定任务 + 分科耗时归集 测试（P1-12）
 *
 * 覆盖（batch-e-tasks §E-3 测试要点）：
 *  - ① 分科归集：studyMinutes 与 studyMinutesBySubject **同一次写入**；ΣbySubject == studyMinutes
 *  - ② 真实番茄数：focus 完成 → pomodoroCount +1；skip → 不变；不从 studyMinutes/25 反推
 *  - ③ 产出登记：recordOutput 写 study_log(action='pomodoro_output')；空 note 等同跳过
 *  - ④ 默认科目：usePomodoro('math') → activeSubject 初值 'math'；非法值忽略
 *  - ⑤ PlanView 分科对比：读 studyMinutesBySubject 逐科展示；不再出现「待 P1-12」
 *  - ⑥ 兼容：旧 daily_stats 行（无新字段）读取不抛、按 0 兜底
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useStudyDbStore } from '@/stores/studyDb'
import { usePomodoro } from '@/composables/usePomodoro'
import PlanView from '@/views/PlanView.vue'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function zeroStat(date) {
  return {
    date,
    filesVisited: 0,
    questionsAnswered: 0,
    studyMinutes: 0,
    studyMinutesBySubject: { math: 0, chinese: 0, computer: 0, other: 0 },
    pomodoroCount: 0
  }
}

/** ΣbySubject（所有科目求和）—— must-hit #4 的核心锚点 */
function sumBySubject(stat) {
  return Object.values(stat.studyMinutesBySubject || {}).reduce((a, b) => a + (Number(b) || 0), 0)
}

/**
 * 排空真实宏任务：fake-indexeddb 依赖 setImmediate/queueMicrotask（不冻结），
 * 只冻结 setInterval/clearInterval/Date，故 DB 写入完成需 await 若干真实宏任务。
 */
async function drain() {
  for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 0))
}

describe('E-3 分科归集 + 真实番茄数（usePomodoro）', () => {
  let db
  let today

  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    localStorage.clear()
    today = todayStr()
    // 干净当日行（fake-indexeddb 是模块级全局，数据跨用例残留）
    await db.saveDailyStat(zeroStat(today))
  })

  it('① 分科归集：全局与分科同次写入，ΣbySubject == studyMinutes', async () => {
    const pomo = usePomodoro('math')
    await pomo.recordStudyMinutes(25, 'math')
    let stat = await db.getDailyStat(today)
    expect(stat.studyMinutes).toBe(25)
    expect(stat.studyMinutesBySubject.math).toBe(25)
    expect(sumBySubject(stat)).toBe(stat.studyMinutes) // 同一函数、同一次写入

    await pomo.recordStudyMinutes(25, 'chinese')
    stat = await db.getDailyStat(today)
    expect(stat.studyMinutes).toBe(50)
    expect(stat.studyMinutesBySubject.math).toBe(25)
    expect(stat.studyMinutesBySubject.chinese).toBe(25)
    expect(sumBySubject(stat)).toBe(stat.studyMinutes) // 恒等不破
  })

  it('② 真实番茄数：bump 后 loadTodaySessions 读回真实值，且不从 studyMinutes/25 反推', async () => {
    const pomo = usePomodoro('math')
    await pomo.bumpPomodoroCount()
    await pomo.loadTodaySessions()
    expect(pomo.sessionsCompleted.value).toBe(1)

    // 反推锚点：studyMinutes=999（如手动/其它来源），真实番茄数仍为 1（≠ Math.floor(999/25)=39）
    const stat = await db.getDailyStat(today)
    stat.studyMinutes = 999
    stat.pomodoroCount = 1
    await db.saveDailyStat(stat)
    await pomo.loadTodaySessions()
    expect(pomo.sessionsCompleted.value).toBe(1) // 不再是 39
  })

  it('③ 产出登记：recordOutput 写 study_log；空 note 不写', async () => {
    const pomo = usePomodoro('math')
    await pomo.recordOutput('做了 3 道数列题，卡在求通项')
    const logs = (await db.getAllStudyLogs()).filter((l) => l.action === 'pomodoro_output')
    expect(logs).toHaveLength(1)
    expect(logs[0].note).toBe('做了 3 道数列题，卡在求通项')
    expect(logs[0].subject).toBe('math')

    await pomo.recordOutput('   ') // 等同跳过
    expect((await db.getAllStudyLogs()).filter((l) => l.action === 'pomodoro_output')).toHaveLength(1)
  })

  it('④ 默认科目：初值来自入参；非法值忽略', async () => {
    const pomo = usePomodoro('math')
    expect(pomo.activeSubject.value).toBe('math')
    pomo.setSubject('computer')
    expect(pomo.activeSubject.value).toBe('computer')
    pomo.setSubject('bogus')
    expect(pomo.activeSubject.value).toBe('computer') // 非法忽略
    const def = usePomodoro()
    expect(def.activeSubject.value).toBe('other') // 缺省 other
  })
})

describe('E-3 ② focus 完成计入、skip 不计（计时链路）', () => {
  let db
  // 固定系统时钟到正午：避免 +25min 跨本地午夜导致写入落到次日（getDateStr 用本地日期）
  const FIXED_NOON = new Date('2026-06-15T12:00:00').getTime()
  const FIXED_DATE = '2026-06-15'

  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    localStorage.clear()
    await db.saveDailyStat(zeroStat(FIXED_DATE))
  })
  afterEach(() => vi.useRealTimers())

  it('focus 自然完成 → studyMinutes=25（math 归集）+ pomodoroCount=1', async () => {
    // 只冻结计时器与时钟到正午：保留真实 queueMicrotask/setImmediate，否则 fake-indexeddb 会挂死
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'], now: FIXED_NOON })
    const pomo = usePomodoro('math')
    pomo.start()
    await vi.advanceTimersByTimeAsync(25 * 60 * 1000 + 1000)
    await drain()
    const stat = await db.getDailyStat(FIXED_DATE)
    expect(stat.pomodoroCount).toBe(1)
    expect(stat.studyMinutes).toBe(25)
    expect(stat.studyMinutesBySubject.math).toBe(25)
    pomo.reset()
  })

  it('skip（rewarded=false）→ 不计数、不计时长', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'], now: FIXED_NOON })
    const pomo = usePomodoro('math')
    pomo.start()
    await vi.advanceTimersByTimeAsync(60 * 1000) // 1 分钟
    pomo.skip() // rewarded=false
    await drain()
    const stat = await db.getDailyStat(FIXED_DATE)
    expect(stat.pomodoroCount).toBe(0)
    expect(stat.studyMinutes).toBe(0)
    pomo.reset()
  })
})

describe('E-3 ⑥ 旧行兼容（缺新字段按 0 兜底）', () => {
  let db
  let today
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    today = todayStr()
    // 模拟 P1-12 之前的旧行：无 studyMinutesBySubject / pomodoroCount
    await db.saveDailyStat({ date: today, filesVisited: 1, questionsAnswered: 2, studyMinutes: 30 })
  })

  it('读取不抛，分科与番茄数按 0 兜底', async () => {
    const stat = await db.getDailyStat(today)
    expect(stat.studyMinutes).toBe(30)
    expect(stat.studyMinutesBySubject).toEqual({ math: 0, chinese: 0, computer: 0, other: 0 })
    expect(stat.pomodoroCount).toBe(0)
    // 再累加不破坏全局
    await db.updateDailyStat({ studyMinutes: 10, studyMinutesBySubject: { math: 10 }, pomodoroCount: 1 })
    const after = await db.getDailyStat(today)
    expect(after.studyMinutes).toBe(40)
    expect(after.studyMinutesBySubject.math).toBe(10)
    expect(after.pomodoroCount).toBe(1)
  })
})

describe('E-3 ⑤ PlanView 分科对比', () => {
  let db
  let today
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    localStorage.clear()
    today = todayStr()
    await db.saveDailyStat({
      date: today,
      filesVisited: 0,
      questionsAnswered: 0,
      studyMinutes: 90,
      studyMinutesBySubject: { math: 60, chinese: 30, computer: 0, other: 0 },
      pomodoroCount: 3
    })
  })

  it('逐科展示实际/目标，且不再出现「待 P1-12」', async () => {
    const wrapper = mount(PlanView, { global: { stubs: { AppIcon: true } } })
    await flushPromises()
    await new Promise((r) => setTimeout(r, 20))
    await flushPromises()
    const txt = wrapper.text()
    expect(txt).toContain('数学')
    expect(txt).toContain('1.0 / 目标') // 60min → 1.0h
    expect(txt).toContain('0.5 / 目标') // 30min → 0.5h
    expect(txt).not.toContain('待 P1-12')
    expect(txt).not.toContain('分科耗时待')
    wrapper.unmount()
  })
})
