// @vitest-environment jsdom
/**
 * 批 F0 · F0c1 深链 unitNum 归一化 —— **独立复核**（QA）
 *
 * 攻击点（与 tests/route-params.test.js 不同视角：真 `router.push` 冒烟，而非只调 guard 函数）：
 *  A. 纯函数边界之外的输入：'0'/'9'/三位数/'007'、数字入参、幂等性
 *  B. 真导航（从**非 unit 记录**进入）：非规范深链被归一化、规范链接零跳转、fileIndex 不被改写
 *  C. 旧 `/unit/:unitNum` 真导航重定向归一化
 *  D. **同记录参数变更**：unit → unit（同一路由记录、仅 params 变化）时归一化仍须生效。
 *     F0c6 已把归一化从 per-record `beforeEnter`（同记录不重入、存在缺口）**下沉为全局守卫**，
 *     该路径缺口已收口（原 `it.fails` 取证已转为正式断言）。
 *
 * ⚠️ auth 守卫：真导航前须置 `auth.accessToken`（否则 beforeEach 先跳 /login —— **那不是归一化失败**）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { normalizeUnitNum } from '@/utils/routeParams'
import { useAuthStore } from '@/stores/auth'
import router from '@/router/index.js'

beforeEach(() => {
  setActivePinia(createPinia())
  useAuthStore().accessToken = 'qa-token' // 越过全站登录守卫
  // jsdom 未实现 scrollTo；router 的 scrollBehavior 会调用它 → 静音噪音（不影响断言）
  window.scrollTo = () => {}
})

// ───────────────────── A. 纯函数边界（独立样本） ─────────────────────
describe('F0c1 独立复核 · A) normalizeUnitNum 边界', () => {
  const cases = [
    ['5', '05'], ['05', '05'], ['0', '00'], ['9', '09'],
    ['10', '10'], ['12', '12'], ['007', '007'], ['100', '100']
  ]
  for (const [input, want] of cases) {
    it(`'${input}' → '${want}'`, () => expect(normalizeUnitNum(input)).toBe(want))
  }

  it('幂等：归一两次等于归一一次', () => {
    for (const v of ['5', '0', '9', '10', '007']) {
      expect(normalizeUnitNum(normalizeUnitNum(v))).toBe(normalizeUnitNum(v))
    }
  })

  it('数字入参：5 → 05；0 → 00', () => {
    expect(normalizeUnitNum(5)).toBe('05')
    expect(normalizeUnitNum(0)).toBe('00')
  })

  it('空值原样（null/undefined/空串），不抛', () => {
    expect(normalizeUnitNum(null)).toBeNull()
    expect(normalizeUnitNum(undefined)).toBeUndefined()
    expect(normalizeUnitNum('')).toBe('')
  })
})

// ───────────────────── B. 真导航（从非 unit 记录进入） ─────────────────────
describe('F0c1 独立复核 · B) 真导航：外部深链归一化（跨记录进入）', () => {
  it('从 / 进入 /study/computer/5/4 → unitNum=05、fileIndex=4', async () => {
    await router.push('/')
    await router.push('/study/computer/5/4')
    const r = router.currentRoute.value
    expect(r.name).toBe('unit')
    expect(r.params.subject).toBe('computer')
    expect(r.params.unitNum).toBe('05')
    expect(r.params.fileIndex).toBe('4')
    expect(r.redirectedFrom).toBeTruthy()
  })

  it('从 / 再次进入 /study/computer/6/4 → 归一化持续有效（非仅首次）', async () => {
    await router.push('/')
    await router.push('/study/computer/6/4')
    expect(router.currentRoute.value.params.unitNum).toBe('06')
  })

  it('规范链接 /study/computer/05/4 → 零跳转（redirectedFrom 为空）', async () => {
    await router.push('/')
    await router.push('/study/computer/05/4')
    expect(router.currentRoute.value.params.unitNum).toBe('05')
    expect(router.currentRoute.value.redirectedFrom).toBeUndefined()
  })

  it('fileIndex 不被改写（只归一 unitNum）', async () => {
    await router.push('/')
    await router.push('/study/computer/5/04')
    const r = router.currentRoute.value
    expect(r.params.unitNum).toBe('05')
    expect(r.params.fileIndex).toBe('04')
  })
})

// ───────────────────── C. 旧 /unit 真导航 ─────────────────────
describe('F0c1 独立复核 · C) 旧 /unit 重定向（跨记录）', () => {
  it('从 / 进入 /unit/5/4 → /study/math/05/4', async () => {
    await router.push('/')
    await router.push('/unit/5/4')
    const r = router.currentRoute.value
    expect(r.name).toBe('unit')
    expect(r.params.subject).toBe('math')
    expect(r.params.unitNum).toBe('05')
    expect(r.params.fileIndex).toBe('4')
  })

  it('从 unit 页进入旧 /unit/7 → 仍归一（旧路由是独立记录，redirect 必触发）', async () => {
    await router.push('/study/computer/05/4')
    await router.push('/unit/7/2')
    const r = router.currentRoute.value
    expect(r.params.subject).toBe('math')
    expect(r.params.unitNum).toBe('07')
  })
})

// ───────────────────── D. 同记录参数变更（F0c6 全局守卫收口） ─────────────────────
describe('F0c1 独立复核 · D) 同记录参数变更：归一化经全局守卫仍生效（F0c6）', () => {
  it('先确认：unit → unit（规范形）正常渲染', async () => {
    await router.push('/study/computer/05/4')
    await router.push('/study/computer/06/2')
    expect(router.currentRoute.value.params.unitNum).toBe('06')
  })

  it('unit → unit 非规范深链应被归一化（F0c6：全局守卫收口同记录缺口）', async () => {
    await router.push('/study/computer/05/4') // 已在 unit 记录
    await router.push('/study/computer/7/4') // 同记录、非规范 → 期望 07
    expect(router.currentRoute.value.params.unitNum).toBe('07')
  })

  it('同记录非规范换形状：math 10/1 → 9（期望 09）', async () => {
    await router.push('/study/math/10/1') // 已在 unit 记录（两位数单元号）
    await router.push('/study/math/9') // 同记录、非规范 → 期望 09
    const r = router.currentRoute.value
    expect(r.name).toBe('unit')
    expect(r.params.unitNum).toBe('09')
  })

  it('同记录、规范形 → 零跳转（redirectedFrom 为空）', async () => {
    await router.push('/study/computer/05/4')
    await router.push('/study/computer/06/2') // 同记录、规范形，不应触发归一化重定向
    expect(router.currentRoute.value.params.unitNum).toBe('06')
    expect(router.currentRoute.value.redirectedFrom).toBeUndefined()
  })
})
