// @vitest-environment jsdom
/**
 * 批 F0 · Round 2 定向复核（收口 R-1）—— **独立对抗**（QA）
 *
 * 证明对象：F0c6 把 unitNum 归一化从 per-record `beforeEnter` 下沉为**全局守卫**后，
 *  R-1（同记录 unit→unit 不重入）是否真正收口，且无新引入的副作用/循环。
 *
 * 与 engineer 用例（batch-f0-verify-route.test.js / route-params.test.js）**换形状**：
 *  1. 对抗性同记录样本：'0' / '9' / 三位数 / 带 query / 带 hash —— 断言 params 规范形 + URL 同步改写
 *  2. 无重定向循环：并发/连续非规范 push 的收敛（带超时保护）；规范形零跳转（redirectedFrom 空）
 *  3. 非 unit 路由零影响：/review、/error-book、/practice、/dashboard 等 to.name!=='unit'
 *     不介入（redirectedFrom 空；连 query 里叫 unitNum 的值也不得被改写）
 *  4. 代码注释声明的「未登录 /login?redirect= 携带规范形」是否属实（不登录取证，如实报告）
 *
 * ⚠️ auth 守卫：真导航前须置 auth.accessToken（否则先跳 /login —— 那不是归一化失败）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import router from '@/router/index.js'

const TIMEOUT = 3000

/** 带超时保护的真导航 —— 若守卫成环，push 不收敛 → 超时抛错（明确证据） */
function pushWithTimeout(to) {
  return Promise.race([
    router.push(to).catch((e) => e),
    new Promise((_, rej) => setTimeout(() => rej(new Error('导航未收敛（疑似重定向成环）')), TIMEOUT))
  ])
}

beforeEach(() => {
  setActivePinia(createPinia())
  useAuthStore().accessToken = 'qa-token'
  window.scrollTo = () => {}
})

// ───────────────────── 1. 对抗性同记录样本 ─────────────────────
describe('R2 · 1) 对抗性同记录样本（换形状）', () => {
  const cases = [
    // [起始（已处 unit 记录）, 同记录非规范 push, 期望 unitNum, 期望 fullPath]
    ['/study/math/10/1', '/study/math/0', '00', '/study/math/00'],
    ['/study/math/10/1', '/study/math/9', '09', '/study/math/09'],
    ['/study/computer/05/4', '/study/computer/007', '007', '/study/computer/007'],
    ['/study/computer/05/4', '/study/computer/5/4?tab=a', '05', '/study/computer/05/4?tab=a']
  ]
  for (const [start, to, wantNum, wantPath] of cases) {
    it(`${start} → ${to} ⇒ unitNum=${wantNum}，URL 同步改写`, async () => {
      await pushWithTimeout(start)
      await pushWithTimeout(to)
      const r = router.currentRoute.value
      expect(r.name).toBe('unit')
      expect(r.params.unitNum).toBe(wantNum)
      expect(r.fullPath).toBe(wantPath)
    })
  }

  it('带 hash 的非规范深链：unitNum 规范 + hash 保留', async () => {
    await pushWithTimeout('/study/computer/05/4')
    await pushWithTimeout({ name: 'unit', params: { subject: 'math', unitNum: '7', fileIndex: '3' }, hash: '#sec' })
    const r = router.currentRoute.value
    expect(r.params.unitNum).toBe('07')
    expect(r.hash).toBe('#sec')
  })

  it("三位数 '007' 视为已是规范（不补零也不截断）→ 零跳转", async () => {
    await pushWithTimeout('/study/computer/05/4')
    await pushWithTimeout('/study/computer/007')
    expect(router.currentRoute.value.params.unitNum).toBe('007')
    expect(router.currentRoute.value.redirectedFrom).toBeUndefined()
  })
})

// ───────────────────── 2. 无重定向循环 ─────────────────────
describe('R2 · 2) 收敛性（无重定向循环）', () => {
  it('单次非规范深链：收敛到规范形，且 redirectedFrom 记录一次重定向', async () => {
    await pushWithTimeout('/study/computer/05/4')
    await pushWithTimeout('/study/math/5/1')
    const r = router.currentRoute.value
    expect(r.params.unitNum).toBe('05')
    expect(r.fullPath).toBe('/study/math/05/1')
    expect(r.redirectedFrom).toBeTruthy()
  })

  it('连续两次非规范 push（同记录）均收敛、不挂起', async () => {
    await pushWithTimeout('/study/math/10/1')
    await pushWithTimeout('/study/math/5') // → 05
    expect(router.currentRoute.value.params.unitNum).toBe('05')
    await pushWithTimeout('/study/math/8') // → 08
    const r = router.currentRoute.value
    expect(r.params.unitNum).toBe('08')
    expect(r.fullPath).toBe('/study/math/08')
  })

  it('规范形深链：零跳转（redirectedFrom 为空）', async () => {
    await pushWithTimeout('/study/math/10/1')
    await pushWithTimeout('/study/math/09')
    expect(router.currentRoute.value.params.unitNum).toBe('09')
    expect(router.currentRoute.value.redirectedFrom).toBeUndefined()
  })

  it('观察者证据：非规范导航只多产生「规范形」一跳，无重复路径', async () => {
    const seen = []
    const off = router.beforeEach((to) => {
      if (to.name === 'unit') seen.push(to.params.unitNum)
      return true
    })
    try {
      await pushWithTimeout('/study/math/10/1')
      seen.length = 0 // 清掉进入起点的那次
      await pushWithTimeout('/study/math/5') // 非规范
    } finally {
      off()
    }
    // 归一化守卫（注册在本观察者之前）对同一导航返回重定向后，本次导航以**规范形**重跑；
    // 观察者（后注册）至多看到规范形目标，不应出现重复的同一非规范路径。
    expect(seen.every((n) => n === '05')).toBe(true)
    expect(seen.length).toBeLessThanOrEqual(2) // 有限跳数
  })
})

// ───────────────────── 3. 非 unit 路由零影响 ─────────────────────
describe('R2 · 3) 非 unit 路由零影响（to.name !== "unit"）', () => {
  const routes = ['/review', '/error-book', '/practice', '/dashboard', '/', '/profile', '/plan']
  for (const p of routes) {
    it(`${p} —— 守卫不介入（redirectedFrom 空、无 unitNum 参数改写）`, async () => {
      await pushWithTimeout('/study/math/10/1')
      await pushWithTimeout(p)
      const r = router.currentRoute.value
      expect(r.path).toBe(p)
      expect(r.redirectedFrom).toBeUndefined()
      expect(r.params.unitNum).toBeUndefined()
    })
  }

  it('非 unit 路由的 query 里名为 unitNum 的值**不被改写**（守卫不得越界）', async () => {
    await pushWithTimeout('/study/math/10/1')
    await pushWithTimeout('/dashboard?unitNum=5')
    const r = router.currentRoute.value
    expect(r.name).toBe('dashboard')
    expect(r.query.unitNum).toBe('5') // 原样，未被归一为 '05'
    expect(r.redirectedFrom).toBeUndefined()
  })
})

// ───────────────────── 4. 注释声明：未登录 /login?redirect= 携带规范形 ─────────────────────
describe('R2 · 4) 注释声明核验（未登录回跳地址是否规范形）', () => {
  it('未登录 push /study/math/7 → query.redirect 应为 /study/math/07（与注释一致）', async () => {
    useAuthStore().accessToken = '' // 置为未登录（auth.isLoggedIn 为假）
    await pushWithTimeout('/study/math/7')
    const r = router.currentRoute.value
    expect(r.name).toBe('login')
    // 注释声称：归一化守卫注册在 auth 之前 → redirect 携带**规范形**路径
    expect(r.query.redirect).toBe('/study/math/07')
  })

  it('未登录 push 非规范带 fileIndex → query.redirect 应规范且保留 fileIndex', async () => {
    useAuthStore().accessToken = ''
    await pushWithTimeout('/study/computer/5/4')
    const r = router.currentRoute.value
    expect(r.name).toBe('login')
    expect(r.query.redirect).toBe('/study/computer/05/4')
  })

  it('对照：已登录同链接 → 落在规范形 unit 页（无 /login）', async () => {
    useAuthStore().accessToken = 'qa-token'
    await pushWithTimeout('/study/math/7')
    const r = router.currentRoute.value
    expect(r.name).toBe('unit')
    expect(r.params.unitNum).toBe('07')
  })
})

// ───────────────────── 5. replace 语义（补回 route-params 改写后丢失的白盒断言 res.replace===true） ─────
describe('R2 · 5) replace 语义：非规范归一不新增历史条目', () => {
  it('非规范 push → history 长度不变（replace 中间态不入历史）；规范 push → +1', async () => {
    await pushWithTimeout('/study/computer/05')
    const L0 = window.history.length
    await pushWithTimeout('/study/math/7') // 非规范 → replace 归一
    const L1 = window.history.length
    await pushWithTimeout('/study/math/06') // 规范 → 普通 push
    const L2 = window.history.length
    expect(L1 - L0).toBe(0) // replace：非规范中间态不占历史条目
    expect(L2 - L1).toBe(1) // 规范形普通 push 正常 +1
  })
})
