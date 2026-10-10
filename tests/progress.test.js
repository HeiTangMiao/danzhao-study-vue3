// @vitest-environment jsdom
/**
 * progress store —— 双轨快照（已接触 / 已掌握）测试 + DashboardView 文案锚（批 E · E-2）
 *
 * 通过 mock studyDb 验证：
 *  - refresh / init 依据 page_progress 构建双轨快照
 *  - 「已接触」语义（completed）：内容页 opened(visited) 即算；测验页需已交卷（testScore 非空）
 *  - 「已掌握」语义（mastered）：页面级手动标注 masteredAt（≠ 复习侧 error_book SM-2，两者有意分离）
 *  - init 幂等：仅首次读取
 *  - DashboardView 渲染双轨、且不再出现「已学页面」（防回退）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { useProgressStore } from '@/stores/progress'
import { SUBJECTS } from '@/content/index'
import DashboardView from '@/views/DashboardView.vue'

// 内存版 studyDb mock：进度快照只读 getAllPageProgress / init；Dashboard 另读 getLearningOverview
const mockDB = {
  init: vi.fn(async () => {}),
  getAllPageProgress: vi.fn(async () => []),
  getAllErrors: vi.fn(async () => []),
  getLearningOverview: vi.fn(async () => makeOverview())
}

vi.mock('@/stores/studyDb', () => ({
  useStudyDbStore: () => mockDB
}))

/** 一份最小可用的学习概况（DashboardView 消费）；默认空数据 */
function makeOverview(overrides = {}) {
  return {
    subjects: {
      math: { visited: 0, questions: 0 },
      chinese: { visited: 0, questions: 0 },
      computer: { visited: 0, questions: 0 }
    },
    totalVisited: 0,
    totalQuestions: 0,
    errorsCount: 0,
    allErrors: [],
    todayStat: { filesVisited: 0, questionsAnswered: 0, studyMinutes: 0 },
    ...overrides
  }
}

function makePinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

beforeEach(() => {
  makePinia()
  mockDB.init.mockImplementation(async () => {})
  mockDB.getAllPageProgress.mockImplementation(async () => [])
  mockDB.getAllErrors.mockImplementation(async () => [])
  mockDB.getLearningOverview.mockImplementation(async () => makeOverview())
  vi.clearAllMocks()
})

// 数学冲刺单元（unit '12'）的页面 key：0=考试技巧（内容页）、1/2=真题模拟卷（测验页）
const K = {
  content: 'math_12_01-考试技巧',
  testNoScore: 'math_12_02-真题模拟卷一',
  testDone: 'math_12_03-真题模拟卷二'
}

/** 从站点配置取前 n 个「非测验」数学页面 key（key 规则与 buildSnapshot 一致） */
function mathContentKeys(n) {
  const out = []
  for (const u of SUBJECTS.math.units) {
    for (const f of u.files) {
      if (f.isTest) continue
      out.push(`math_${u.num}_${f.name}`)
      if (out.length >= n) return out
    }
  }
  return out
}

describe('progress store - 双轨快照推导（已接触 / 已掌握）', () => {
  it('内容页打开即「已接触」；测验页需交卷才「已接触」', async () => {
    mockDB.getAllPageProgress.mockResolvedValue([
      { key: K.content, visited: true, visitTime: 10, testScore: null },
      { key: K.testNoScore, visited: true, visitTime: 20, testScore: null },
      { key: K.testDone, visited: true, visitTime: 30, testScore: 66 }
    ])
    const store = useProgressStore()
    await store.refresh()

    expect(store.isCompleted('math', '12', 0)).toBe(true) // 内容页
    expect(store.isCompleted('math', '12', 1)).toBe(false) // 测验未交卷
    expect(store.isCompleted('math', '12', 2)).toBe(true) // 测验已交卷
    expect(store.completedCount('math', '12')).toBe(2)
    expect(store.lastStudiedAt).toBe(30)
  })

  it('未访问的页面不计「已接触」', async () => {
    mockDB.getAllPageProgress.mockResolvedValue([])
    const store = useProgressStore()
    await store.refresh()
    expect(store.completedCount('math', '12')).toBe(0)
    expect(store.isCompleted('math', '12', 0)).toBe(false)
  })

  it('① 双轨计数：已接触（subjectTotalCompleted）与已掌握（masteredCount）互不派生', async () => {
    const keys = mathContentKeys(5)
    expect(keys.length, '数学内容页需 ≥5 以便构造双轨样本').toBeGreaterThanOrEqual(5)
    mockDB.getAllPageProgress.mockResolvedValue([
      // 3 页仅访问（已接触但未掌握）
      { key: keys[0], visited: true, visitTime: 1, testScore: null, masteredAt: null },
      { key: keys[1], visited: true, visitTime: 2, testScore: null, masteredAt: null },
      { key: keys[2], visited: true, visitTime: 3, testScore: null, masteredAt: null },
      // 2 页访问且手动标注「已掌握」
      { key: keys[3], visited: true, visitTime: 4, testScore: null, masteredAt: 123 },
      { key: keys[4], visited: true, visitTime: 5, testScore: null, masteredAt: 456 }
    ])
    const store = useProgressStore()
    await store.refresh()

    expect(store.subjectTotalCompleted('math')).toBe(5) // 已接触 = 5
    expect(store.masteredCount('math')).toBe(2) // 已掌握 = 2
    // 其余学科无数据 → 0（不串学科）
    expect(store.masteredCount('chinese')).toBe(0)
    expect(store.subjectTotalCompleted('computer')).toBe(0)
  })

  it('② 测验页以 testScore 为主口径：未交卷不计「已接触」，已交卷计入', async () => {
    const testKeys = SUBJECTS.math.units
      .find((u) => u.num === '12')
      .files.map((f) => `math_12_${f.name}`)
    expect(testKeys.length).toBeGreaterThanOrEqual(3)
    mockDB.getAllPageProgress.mockResolvedValue([
      { key: testKeys[1], visited: true, testScore: null }, // 未交卷
      { key: testKeys[2], visited: true, testScore: 80 } // 已交卷
    ])
    const store = useProgressStore()
    await store.refresh()
    expect(store.isCompleted('math', '12', 1)).toBe(false)
    expect(store.isCompleted('math', '12', 2)).toBe(true)
    expect(store.subjectTotalCompleted('math')).toBe(1)
  })

  it('③ 两概念不串：错题本里「已牢固掌握（SM-2）」的卡不影响页面级 masteredCount', async () => {
    const keys = mathContentKeys(2)
    // 错题本 10 条全是「已掌握」卡（复习侧口径）—— 但 progress 只读 page_progress，不读 error_book
    mockDB.getAllErrors.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        id: `e${i}`,
        subject: 'math',
        question: `q${i}`,
        reviewed: true,
        legacyMastered: true,
        repetitions: 5,
        interval: 30
      }))
    )
    // page_progress：2 页已接触、均**未**手动标注 masteredAt
    mockDB.getAllPageProgress.mockResolvedValue([
      { key: keys[0], visited: true, masteredAt: null },
      { key: keys[1], visited: true, masteredAt: null }
    ])
    const store = useProgressStore()
    await store.refresh()
    expect(store.subjectTotalCompleted('math')).toBe(2)
    // 页面级「已掌握」= 0：复习侧的 10 条已掌握卡与之无关（两个概念有意分离）
    expect(store.masteredCount('math')).toBe(0)
  })

  it('init 幂等：重复调用不重复读取 page_progress', async () => {
    const store = useProgressStore()
    await store.init()
    await store.init()
    expect(mockDB.getAllPageProgress).toHaveBeenCalledTimes(1)
  })

  it('subjectTotalCompleted 跨单元汇总', async () => {
    mockDB.getAllPageProgress.mockResolvedValue([
      { key: K.content, visited: true, visitTime: 1, testScore: null }
    ])
    const store = useProgressStore()
    await store.refresh()
    expect(store.subjectTotalCompleted('math')).toBe(1)
  })
})

describe('E-2 · DashboardView 双轨渲染与文案锚', () => {
  it('④ 渲染「已接触 / 已掌握」双轨，且不再出现「已学页面」（防回退）', async () => {
    mockDB.getAllPageProgress.mockResolvedValue([])
    mockDB.getLearningOverview.mockResolvedValue(makeOverview())
    const wrapper = mount(DashboardView, {
      global: { stubs: { RouterLink: true } }
    })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('已接触')
    expect(text).toContain('已掌握')
    expect(text).not.toContain('已学页面')
    // 双轨计数「X/Y」形态存在（分母来自内容配置）
    expect(text).toMatch(/\d+\/\d+/)
    wrapper.unmount()
  })
})
