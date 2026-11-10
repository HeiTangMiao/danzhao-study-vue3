// @vitest-environment jsdom
/**
 * 学习计划 study_plan_v1 的换账号清理（A 组功能代码遗留 ①）
 *
 * 背景：clearAllSyncedData() 原先只清 IndexedDB，不清 localStorage；
 * study_plan_v1 存的是具体学员的周预算 / 自填里程碑日期 / 待办，
 * 换账号后会残留给下一个账号（与 recite_progress 的跨用户污染同型）。
 *
 * 覆盖：
 *  ① 清理前有残留 → 换账号后为 null（用户自填日期一并消失）
 *  ② 只清账号数据，不影响其它 localStorage 键（设备偏好）
 *  ③ 直接调 clearAllSyncedData() 同样清（单元口径）
 *  ④ 同账号重登 / 未登录态都不清（既有 auth-account-switch 判据不破坏）
 *  ⑤ 职责分离：exportAllData 的备份清单仍是三项，清理动作没有改写它
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useStudyDbStore } from '@/stores/studyDb'

const PLAN_KEY = 'study_plan_v1'
const PLAN_DUMP = JSON.stringify({
  budget: { math: 10, chinese: 8, computer: 14, other: 0 },
  milestones: [
    { id: 'op', label: '技能操作考', date: '2026-12-01' },
    { id: 'theory', label: '理论考', date: '2027-01-15' },
    { id: 'academic', label: '语数考试', date: '' }
  ],
  tasks: [
    { id: 'sp_1', subject: 'math', title: 'A 的待办', dueDate: '2026-10-09', done: false, doneAt: null }
  ]
})

/** 造出「上一账号残留 + 设备偏好」的现场 */
function seedAccountAResidue() {
  localStorage.setItem(PLAN_KEY, PLAN_DUMP)
  localStorage.setItem('pomodoro_state', JSON.stringify({ left: 1200 }))
  localStorage.setItem('math_theme', 'dark')
  localStorage.setItem('unrelated_device_pref', 'keep-me')
}

describe('换账号清理 · study_plan_v1', () => {
  let auth
  let db

  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    auth = useAuthStore()
    db = useStudyDbStore()
    await db.init()
  })

  it('① 清理前有残留 → 换账号后 study_plan_v1 为 null（用户自填日期一并消失）', async () => {
    seedAccountAResidue()
    await auth.setSession({ user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' })
    expect(localStorage.getItem(PLAN_KEY)).toBe(PLAN_DUMP) // 首次登录不清

    const ret = auth.setSession({ user: { id: 'u2' }, accessToken: 'b', refreshToken: 'r' })
    expect(ret, '换账号应返回清库 Promise').toBeInstanceOf(Promise)
    await ret

    expect(localStorage.getItem(PLAN_KEY)).toBe(null)
    expect(localStorage.getItem('local_data_owner')).toBe('u2')
  })

  it('② 只清账号数据，不影响其它 localStorage 键', async () => {
    seedAccountAResidue()
    await auth.setSession({ user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' })
    await auth.setSession({ user: { id: 'u2' }, accessToken: 'b', refreshToken: 'r' })

    expect(localStorage.getItem('pomodoro_state')).toBe(JSON.stringify({ left: 1200 }))
    expect(localStorage.getItem('math_theme')).toBe('dark')
    expect(localStorage.getItem('unrelated_device_pref')).toBe('keep-me')
    expect(localStorage.getItem(PLAN_KEY)).toBe(null)
  })

  it('③ clearAllSyncedData() 直接调用同样清（单元口径），且设备偏好不动', async () => {
    seedAccountAResidue()
    await db.clearAllSyncedData()

    expect(localStorage.getItem(PLAN_KEY)).toBe(null)
    expect(localStorage.getItem('math_theme')).toBe('dark')
    expect(await db.getReciteProgressAll()).toEqual([])
  })

  it('④ 同账号重登 / 未登录态都不清（既有隔离判据不破坏）', async () => {
    seedAccountAResidue()
    await auth.setSession({ user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' })

    const same = auth.setSession({ user: { id: 'u1' }, accessToken: 'a2', refreshToken: 'r2' })
    expect(same).toBeUndefined()
    expect(localStorage.getItem(PLAN_KEY)).toBe(PLAN_DUMP)

    const guest = auth.setSession({ user: null, accessToken: '', refreshToken: '' })
    expect(guest).toBeUndefined()
    expect(localStorage.getItem(PLAN_KEY)).toBe(PLAN_DUMP)
  })

  it('⑤ 职责分离：exportAllData 的备份清单仍是三项（清理动作没有改写它）', async () => {
    seedAccountAResidue()
    const dump = await db.exportAllData()

    expect(Object.keys(dump.localStorage).sort()).toEqual([
      'math_theme', 'pomodoro_state', 'study_plan_v1'
    ])
    expect(dump.localStorage[PLAN_KEY]).toBe(PLAN_DUMP)
    // 导出（备份）本身不触发清理
    expect(localStorage.getItem(PLAN_KEY)).toBe(PLAN_DUMP)
  })
})
