/**
 * progress store —— 完成快照（由 page_progress 推导）测试
 * 通过 mock studyDb 验证：
 *  - refresh / init 依据 page_progress 构建完成快照
 *  - 完成语义：内容页打开（visited）即完成；测验页需已交卷（testScore 非空）
 *  - init 幂等：仅首次读取
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProgressStore } from '@/stores/progress'

// 内存版 studyDb mock：进度快照只读 getAllPageProgress / init
const mockDB = {
  init: vi.fn(async () => {}),
  getAllPageProgress: vi.fn(async () => [])
}

vi.mock('@/stores/studyDb', () => ({
  useStudyDbStore: () => mockDB
}))

function makePinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

beforeEach(() => {
  makePinia()
  mockDB.init.mockImplementation(async () => {})
  mockDB.getAllPageProgress.mockImplementation(async () => [])
  vi.clearAllMocks()
})

// 数学冲刺单元（unit '12'）的页面 key：0=考试技巧（内容页）、1/2=真题模拟卷（测验页）
const K = {
  content: 'math_12_01-考试技巧',
  testNoScore: 'math_12_02-真题模拟卷一',
  testDone: 'math_12_03-真题模拟卷二'
}

describe('progress store - 完成快照推导', () => {
  it('内容页打开即完成；测验页需交卷才完成', async () => {
    mockDB.getAllPageProgress.mockResolvedValue([
      { key: K.content, visited: true, visitTime: 10, testScore: null },
      { key: K.testNoScore, visited: true, visitTime: 20, testScore: null },
      { key: K.testDone, visited: true, visitTime: 30, testScore: 66 }
    ])
    const store = useProgressStore()
    await store.refresh()

    expect(store.isCompleted('math', '12', 0)).toBe(true)   // 内容页
    expect(store.isCompleted('math', '12', 1)).toBe(false)  // 测验未交卷
    expect(store.isCompleted('math', '12', 2)).toBe(true)   // 测验已交卷
    expect(store.completedCount('math', '12')).toBe(2)
    expect(store.lastStudiedAt).toBe(30)
  })

  it('未访问的页面不计完成', async () => {
    mockDB.getAllPageProgress.mockResolvedValue([])
    const store = useProgressStore()
    await store.refresh()
    expect(store.completedCount('math', '12')).toBe(0)
    expect(store.isCompleted('math', '12', 0)).toBe(false)
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
