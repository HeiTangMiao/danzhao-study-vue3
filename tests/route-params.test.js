// @vitest-environment jsdom
/**
 * 深链单元号归一化测试（批 F0 · F0-2）
 *
 * 背景：外部深链 `#/study/computer/5/4` 与站内规范链接 `#/study/computer/05/4` 应等价。
 *      site.js 的单元号是零填充字符串，UnitView / ContentSidebar 均按字符串相等匹配 →
 *      未归一化的 `5` 匹配不到 `"05"`，渲染空白页。修复落在路由层（单一落点，H7）。
 *
 * 覆盖（§2 F0-2 测试要点 ①–④）：
 *  - ① 纯函数 normalizeUnitNum 边界：'5'→'05' / '05'→'05' / '10'→'10'（不加长）/ '12'→'12' / 空值原样
 *  - ② 路由层归一化：unit 路由的 beforeEnter 对非规范形返回 replace 重定向、unitNum 规范
 *  - ③ 规范链接不回归：规范形 beforeEnter 返回 undefined（不触发额外重定向）
 *  - ④ fileIndex 不受影响：归一化只动 unitNum，fileIndex 原样透传
 */
import { describe, it, expect } from 'vitest'
import { normalizeUnitNum } from '@/utils/routeParams'
import router from '@/router/index.js'

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

/** 取 unit 路由登记的 beforeEnter 归一化守卫（vue-router 内部归一为数组） */
function unitGuard() {
  const rec = router.getRoutes().find((r) => r.name === 'unit')
  const guards = Array.isArray(rec.beforeEnter) ? rec.beforeEnter : [rec.beforeEnter]
  return guards.find((g) => typeof g === 'function')
}

describe('② 路由层归一化（unit.beforeEnter）', () => {
  it('非规范形 unitNum 触发 replace 重定向，且归一为规范形', () => {
    const guard = unitGuard()
    expect(typeof guard).toBe('function')
    const res = guard({
      params: { subject: 'computer', unitNum: '5', fileIndex: '4' },
      fullPath: '/study/computer/5/4'
    })
    expect(res).toBeTruthy()
    expect(res.replace).toBe(true)
    expect(res.params.unitNum).toBe('05')
    // subject / fileIndex 不被动
    expect(res.params.subject).toBe('computer')
    expect(res.params.fileIndex).toBe('4')
  })

  it('③ 规范形 unitNum → 返回 undefined（不重定向，站内导航零影响）', () => {
    const guard = unitGuard()
    const res = guard({
      params: { subject: 'computer', unitNum: '05', fileIndex: '4' },
      fullPath: '/study/computer/05/4'
    })
    expect(res).toBeUndefined()
  })

  it('④ fileIndex 不受归一化影响（只归一 unitNum）', () => {
    const guard = unitGuard()
    const res = guard({
      params: { subject: 'computer', unitNum: '5', fileIndex: '04' },
      fullPath: '/study/computer/5/04'
    })
    expect(res.params.fileIndex).toBe('04')
  })
})

describe('④ 旧 /unit 重定向同样归一化（双保险）', () => {
  it('redirect 函数把 unitNum 归一为规范形并落到 math', () => {
    const rec = router.getRoutes().find((r) => r.path === '/unit/:unitNum/:fileIndex?')
    expect(rec).toBeTruthy()
    expect(typeof rec.redirect).toBe('function')
    const res = rec.redirect({ params: { unitNum: '5', fileIndex: '4' } })
    expect(res.name).toBe('unit')
    expect(res.params.subject).toBe('math')
    expect(res.params.unitNum).toBe('05')
    expect(res.params.fileIndex).toBe('4')
  })
})
