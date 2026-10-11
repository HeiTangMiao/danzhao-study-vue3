// @vitest-environment jsdom
/**
 * 批 E · E-3 番茄绑任务 + 分科耗时 —— **独立复核**（QA）
 *
 * 攻击点：
 *  A. Σ studyMinutesBySubject == studyMinutes 的**同源不变量**：多科目 + 交错误操作下恒成立；
 *     并**主动证伪**：缺失配对 bySubject 的 studyMinutes 写入会破坏等式 → 证明该等式
 *     只在调用方配对时成立，进而核对生产侧唯一写入点（recordStudyMinutes）确实配对。
 *  B. 解耦：番茄数只由 bumpPomodoroCount 递增；recordStudyMinutes / recordAnswered 不改番茄数。
 *  C. 真实计数：两次 focus 完成 = 2；skip 不计；loadTodaySessions 不反推。
 *  D. 旧行/部分字段兜底不崩。
 *  E. PlanView 分科展示到位、「待 P1-12」已清。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useStudyDbStore } from '@/stores/studyDb'
import { usePomodoro, SUBJECTS } from '@/composables/usePomodoro'
import PlanView from '@/views/PlanView.vue'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const sumSub = (s) => Object.values(s.studyMinutesBySubject || {}).reduce((a, b) => a + (Number(b) || 0), 0)

/** 排空真实宏任务（fake-indexeddb 依赖 setImmediate/microtask，不能全冻结） */
async function drain(n = 30) {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0))
}

describe('E-3 独立复核 · A) 分科同源不变量', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    localStorage.clear()
    await db.saveDailyStat({
      date: today(), filesVisited: 0, questionsAnswered: 0, studyMinutes: 0,
      studyMinutesBySubject: { math: 0, chinese: 0, computer: 0, other: 0 }, pomodoroCount: 0
    })
  })

  it('多科目 + 交错误操作后仍恒等', async () => {
    const pomo = usePomodoro('math')
    await pomo.recordStudyMinutes(25, 'math')
    await db.recordAnswered(3)
    await db.updateDailyStat({ pomodoroCount: 1 })
    await pomo.recordStudyMinutes(25, 'computer')
    await db.updateDailyStat({ filesVisited: 2 })
    await pomo.recordStudyMinutes(15, 'other')
    const stat = await db.getDailyStat(today())
    expect(stat.studyMinutes).toBe(65)
    expect(stat.studyMinutesBySubject).toMatchObject({ math: 25, chinese: 0, computer: 25, other: 15 })
    expect(sumSub(stat)).toBe(stat.studyMinutes) // 同源恒等
  })

  it('证伪尝试：缺配对的 studyMinutes 写入会破坏等式（等式依赖调用方配对）', async () => {
    // 非受控写法（生产**无**此调用）：只加全局、不给分科 → 等式破坏
    await db.updateDailyStat({ studyMinutes: 40 })
    const broken = await db.getDailyStat(today())
    expect(broken.studyMinutes).toBe(40)
    expect(sumSub(broken)).toBe(0)
    expect(sumSub(broken)).not.toBe(broken.studyMinutes) // 证明边际
  })
})

describe('E-3 独立复核 · B/C) 番茄数真实计数与解耦', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    localStorage.clear()
    await db.saveDailyStat({
      date: today(), filesVisited: 0, questionsAnswered: 0, studyMinutes: 0,
      studyMinutesBySubject: { math: 0, chinese: 0, computer: 0, other: 0 }, pomodoroCount: 0
    })
  })

  it('记录学习时长/答题数**不**改番茄数；只有 bumpPomodoroCount 递增', async () => {
    const pomo = usePomodoro('math')
    await pomo.recordStudyMinutes(50, 'math')
    await db.recordAnswered(10)
    let stat = await db.getDailyStat(today())
    expect(stat.pomodoroCount).toBe(0) // 时长/答题不反推番茄数
    await pomo.bumpPomodoroCount()
    await pomo.bumpPomodoroCount()
    stat = await db.getDailyStat(today())
    expect(stat.pomodoroCount).toBe(2)
    await pomo.loadTodaySessions()
    expect(pomo.sessionsCompleted.value).toBe(2)
  })

  it('反推证伪：studyMinutes 很大但 pomodoroCount 为真实值', async () => {
    const pomo = usePomodoro('math')
    await pomo.bumpPomodoroCount()
    const s = await db.getDailyStat(today())
    s.studyMinutes = 500 // 手动/其它来源堆高
    await db.saveDailyStat(s)
    await pomo.loadTodaySessions()
    expect(pomo.sessionsCompleted.value).toBe(1)
    expect(pomo.sessionsCompleted.value).not.toBe(Math.floor(500 / 25))
  })
})

describe('E-3 独立复核 · C2) focus 完成 +1、skip 不计（计时链路）', () => {
  let db
  const NOON = new Date('2026-06-15T12:00:00').getTime()
  const DATE = '2026-06-15'
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    localStorage.clear()
    await db.saveDailyStat({
      date: DATE, filesVisited: 0, questionsAnswered: 0, studyMinutes: 0,
      studyMinutesBySubject: { math: 0, chinese: 0, computer: 0, other: 0 }, pomodoroCount: 0
    })
  })
  afterEach(() => vi.useRealTimers())

  it('两次 focus 自然完成 → pomodoroCount=2、studyMinutes=50、math 分科=50', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'], now: NOON })
    const pomo = usePomodoro('math')
    pomo.start()
    await vi.advanceTimersByTimeAsync(25 * 60 * 1000 + 1000)
    await drain()
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1000) // 休息阶段
    await drain()
    await vi.advanceTimersByTimeAsync(25 * 60 * 1000 + 1000) // 第二个 focus
    await drain()
    const stat = await db.getDailyStat(DATE)
    expect(stat.pomodoroCount).toBe(2)
    expect(stat.studyMinutes).toBe(50)
    expect(stat.studyMinutesBySubject.math).toBe(50)
    pomo.reset()
  })

  it('skip → 不计数、不计时长', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'], now: NOON })
    const pomo = usePomodoro('math')
    pomo.start()
    await vi.advanceTimersByTimeAsync(60 * 1000)
    pomo.skip()
    await drain()
    const stat = await db.getDailyStat(DATE)
    expect(stat.pomodoroCount).toBe(0)
    expect(stat.studyMinutes).toBe(0)
    pomo.reset()
  })
})

describe('E-3 独立复核 · D) 旧行/部分字段兜底', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
  })

  it('完全旧行：无新字段 → 补齐零结构、不崩', async () => {
    await db.saveDailyStat({ date: today(), filesVisited: 1, questionsAnswered: 2, studyMinutes: 30 })
    const s = await db.getDailyStat(today())
    expect(s.studyMinutesBySubject).toEqual({ math: 0, chinese: 0, computer: 0, other: 0 })
    expect(s.pomodoroCount).toBe(0)
  })

  it('部分字段：仅有 math 分科 → 与零结构合并', async () => {
    await db.saveDailyStat({ date: today(), filesVisited: 0, questionsAnswered: 0, studyMinutes: 20, studyMinutesBySubject: { math: 20 } })
    const s = await db.getDailyStat(today())
    expect(s.studyMinutesBySubject).toEqual({ math: 20, chinese: 0, computer: 0, other: 0 })
  })

  it('科目取值域单一来源 = 4 项', () => {
    expect(SUBJECTS).toEqual(['math', 'chinese', 'computer', 'other'])
  })
})

describe('E-3 独立复核 · E) PlanView 分科对比', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    localStorage.clear()
    await db.saveDailyStat({
      date: today(), filesVisited: 0, questionsAnswered: 0, studyMinutes: 90,
      studyMinutesBySubject: { math: 60, chinese: 30, computer: 0, other: 0 }, pomodoroCount: 3
    })
  })

  it('逐科展示小时数；「待 P1-12」已清', async () => {
    const wrapper = mount(PlanView, { global: { stubs: { AppIcon: true } } })
    await flushPromises()
    await drain(10)
    await flushPromises()
    const t = wrapper.text()
    expect(t).toContain('数学')
    expect(t).toContain('语文')
    expect(t).toContain('1.0') // 60min
    expect(t).toContain('0.5') // 30min
    expect(t).not.toContain('待 P1-12')
    expect(t).not.toContain('分科耗时待')
    wrapper.unmount()
  })
})
