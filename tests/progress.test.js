/**
 * progress store —— 学习进度数据层测试
 * 通过 mock studyDb（IndexedDB 封装）验证：
 *  - init 幂等与 IndexedDB 数据加载
 *  - 旧 localStorage 数据迁移（含完成后清理旧键）
 *  - 增删改操作会触发 IndexedDB 持久化
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProgressStore } from '@/stores/progress'

// 内存版 studyDb mock：模拟 getProgress / saveProgress / init
const mockDB = {
  init: vi.fn(async () => {}),
  getProgress: vi.fn(async () => null),
  saveProgress: vi.fn(async () => {})
}

vi.mock('@/stores/studyDb', () => ({
  useStudyDbStore: () => mockDB
}))

// localStorage mock
const lsMap = new Map()
const localStorageMock = {
  getItem: vi.fn((k) => (lsMap.has(k) ? lsMap.get(k) : null)),
  setItem: vi.fn((k, v) => { lsMap.set(k, String(v)) }),
  removeItem: vi.fn((k) => { lsMap.delete(k) })
}
vi.stubGlobal('localStorage', localStorageMock)

function makePinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

beforeEach(() => {
  makePinia()
  lsMap.clear()
  // 恢复各 mock 默认行为（clearAllMocks 会清掉实现，这里手动复位）
  mockDB.init.mockImplementation(async () => {})
  mockDB.getProgress.mockImplementation(async () => null)
  mockDB.saveProgress.mockImplementation(async () => {})
  vi.clearAllMocks()
})

describe('progress store - 数据层', () => {
  it('init 从 IndexedDB 加载已完成进度', async () => {
    mockDB.getProgress.mockResolvedValue({
      id: 'main',
      completed: { math: { '01': { 0: true, 1: true } } },
      lastStudiedAt: 123
    })
    const store = useProgressStore()
    await store.init()
    expect(store.completedCount('math', '01')).toBe(2)
    expect(store.lastStudiedAt).toBe(123)
  })

  it('init 幂等：重复调用不重复读库', async () => {
    const store = useProgressStore()
    await store.init()
    await store.init()
    expect(mockDB.getProgress).toHaveBeenCalledTimes(1)
  })

  it('IndexedDB 无数据时从旧 localStorage 迁移并清理旧键', async () => {
    lsMap.set('vue3_progress_v2', JSON.stringify({
      completed: { chinese: { '02': { 3: true } } },
      lastStudiedAt: 456
    }))
    const store = useProgressStore()
    await store.init()
    expect(store.isCompleted('chinese', '02', 3)).toBe(true)
    // 迁移后写入 IndexedDB 且删除旧键
    expect(mockDB.saveProgress).toHaveBeenCalled()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('vue3_progress_v2')
  })

  it('toggleComplete 切换状态并持久化', async () => {
    const store = useProgressStore()
    await store.init()
    store.toggleComplete('math', '01', 2)
    expect(store.isCompleted('math', '01', 2)).toBe(true)
    store.toggleComplete('math', '01', 2)
    expect(store.isCompleted('math', '01', 2)).toBe(false)
    expect(mockDB.saveProgress).toHaveBeenCalled()
  })

  it('resetAll 清空进度并持久化', async () => {
    const store = useProgressStore()
    await store.init()
    store.toggleComplete('math', '01', 0)
    store.resetAll()
    expect(store.subjectTotalCompleted('math')).toBe(0)
    expect(mockDB.saveProgress).toHaveBeenCalled()
  })
})