// @vitest-environment jsdom
/**
 * 深链单元号归一化测试（批 F0 · F0-2；F0c6 起归一化下沉全局守卫）
 *
 * 背景：外部深链 `#/study/computer/5/4` 与站内规范链接 `#/study/computer/05/4` 应等价。
 *      site.js 的单元号是零填充字符串，UnitView / ContentSidebar 均按字符串相等匹配 →
 *      未归一化的 `5` 匹配不到 `"05"`，渲染空白页。
 *      F0c6 把归一化从 unit 记录的 `beforeEnter`（同记录不重入）**下沉为全局 beforeEach 守卫**，
 *      故此处改用**真导航**验证（guard 函数已不再是可直取的 route record 字段）。
 *
 * 覆盖（§2 F0-2 测试要点 ①–④）：
 *  - ① 纯函数 normalizeUnitNum 边界：'5'→'05' / '05'→'05' / '10'→'10'（不加长）/ '12'→'12' / 空值原样
 *  - ② 路由层归一化（真导航，跨记录）：非规范深链被 replace 规范化
 *  - ③ 规范链接不回归：零跳转（redirectedFrom 为空）
 *  - ④ fileIndex 不受影响：归一化只动 unitNum
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { normalizeUnitNum } from '@/utils/routeParams'
import { useAuthStore } from '@/stores/auth'
import router from '@/router/index.js'

beforeEach(() => {
  setActivePinia(createPinia())
  useAuthStore().accessToken = 'test-token' // 越过全站登录守卫（否则先跳 /login，非归一化问题）
  // jsdom 未实现 scrollTo；router 的 scrollBehavior 会调用它 → 静音噪音
  window.scrollTo = () => {}
})

describe('① normalizeUnitNum 纯函数', () => {
  it("'5' → '05'（补零）", () => {
    expect(normalizeUnitNum('5')).toBe('05')
  })

  it("'05' → '05'（幂等，已规范不变）", () => {
    expect(normalizeUnitNum('05')).toBe('05')
  })

  it("'10' / '12' → 原样（两位不截断不加长）", () => {
    expect(normalizeUnitNum('10')).toBe('10')
    expect(normalizeUnitNum('12')).toBe('12')
  })

  it('数字入参按字符串处理：5 → 05', () => {
    expect(normalizeUnitNum(5)).toBe('05')
  })

  it('空值原样返回、不抛错', () => {
    expect(normalizeUnitNum(null)).toBeNull()
    expect(normalizeUnitNum(undefined)).toBeUndefined()
    expect(normalizeUnitNum('')).toBe('')
  })
})

describe('② 路由层归一化（真导航，跨记录）', () => {
  it('非规范形 unitNum 触发 replace 重定向，且归一为规范形', async () => {
    await router.push('/')
    await router.push('/study/computer/5/4')
    const r = router.currentRoute.value
    expect(r.name).toBe('unit')
    expect(r.params.unitNum).toBe('05')
    expect(r.params.subject).toBe('computer')
    expect(r.params.fileIndex).toBe('4')
    expect(r.redirectedFrom).toBeTruthy()
  })

  it('③ 规范链接 /study/computer/05/4 → 零跳转（不触发额外重定向）', async () => {
    await router.push('/')
    await router.push('/study/computer/05/4')
    expect(router.currentRoute.value.params.unitNum).toBe('05')
    expect(router.currentRoute.value.redirectedFrom).toBeUndefined()
  })

  it('④ fileIndex 不受归一化影响（只归一 unitNum）', async () => {
    await router.push('/')
    await router.push('/study/computer/5/04')
    const r = router.currentRoute.value
    expect(r.params.unitNum).toBe('05')
    expect(r.params.fileIndex).toBe('04')
  })
})

describe('④ 旧 /unit 重定向同样归一化（双保险）', () => {
  it('从非 unit 页进入 /unit/5/4 → math/05/4', async () => {
    await router.push('/')
    await router.push('/unit/5/4')
    const r = router.currentRoute.value
    expect(r.name).toBe('unit')
    expect(r.params.subject).toBe('math')
    expect(r.params.unitNum).toBe('05')
    expect(r.params.fileIndex).toBe('4')
  })
})
