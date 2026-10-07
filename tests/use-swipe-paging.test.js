/**
 * useSwipePaging 纯函数单测。
 *
 * 覆盖 P4-T5 滑动翻页的核心判定逻辑（不含 DOM / Pointer Events 部分）：
 * - resolveAxis        方向锁轴向判定（|dx| > |dy| × 1.2 才算水平）
 * - isEdgeStart        D19 手势分区（左右 24px 边缘交还系统）
 * - shouldPageSwipe    距离阈值 / 快扫速度双通道判定（dt 上限 500ms）
 * - dragVisualOffset   跟手位移（边界阻尼 + 22px 偏移上限）
 * - swipeDirOf         方向语义（右滑 = prev，左滑 = next）
 * - swipeThreshold     视口自适应阈值（min(72px, 18vw)）
 */
import { describe, it, expect } from 'vitest'
import {
  SWIPE_SLOP,
  SWIPE_AXIS_RATIO,
  SWIPE_DISTANCE_MAX,
  SWIPE_FAST_DISTANCE,
  SWIPE_VELOCITY,
  SWIPE_MAX_DURATION,
  SWIPE_SHIFT,
  SWIPE_DAMPING,
  SWIPE_EDGE,
  resolveAxis,
  isEdgeStart,
  shouldPageSwipe,
  dragVisualOffset,
  swipeDirOf,
  swipeThreshold,
} from '../src/composables/useSwipePaging.js'

describe('resolveAxis 方向锁', () => {
  it('水平位移远大于垂直位移时判定为 h', () => {
    expect(resolveAxis(30, 2)).toBe('h')
    expect(resolveAxis(-30, 2)).toBe('h')
  })

  it('垂直位移占优时判定为 v（交还滚动）', () => {
    expect(resolveAxis(2, 30)).toBe('v')
    expect(resolveAxis(10, 40)).toBe('v')
  })

  it('比例恰好等于 1.2 时不判定为水平（严格大于）', () => {
    // |dx| = 24, |dy| = 20 → 24 > 20 * 1.2 不成立
    expect(resolveAxis(24, 20)).toBe('v')
    // 略超过比例才算水平
    expect(resolveAxis(25, 20)).toBe('h')
  })

  it('对角位移按比例判定，防止斜向误切页', () => {
    // 45 度附近：|dx| == |dy| → v
    expect(resolveAxis(20, 20)).toBe('v')
    // dx 是 dy 的 1.5 倍 → h
    expect(resolveAxis(30, 20)).toBe('h')
  })
})

describe('isEdgeStart D19 手势分区', () => {
  it('左边缘 24px 内交还系统手势', () => {
    expect(isEdgeStart(0, 390)).toBe(true)
    expect(isEdgeStart(23, 390)).toBe(true)
  })

  it('右边缘 24px 内交还系统手势', () => {
    expect(isEdgeStart(390, 390)).toBe(true)
    expect(isEdgeStart(367, 390)).toBe(true)
  })

  it('安全区内部正常起手势', () => {
    expect(isEdgeStart(24, 390)).toBe(false)
    expect(isEdgeStart(200, 390)).toBe(false)
    expect(isEdgeStart(365, 390)).toBe(false)
  })

  it('自定义 edge 宽度生效', () => {
    expect(isEdgeStart(30, 400, 32)).toBe(true)
    expect(isEdgeStart(30, 400, 24)).toBe(false)
  })
})

describe('shouldPageSwipe 翻页判定', () => {
  const threshold = SWIPE_DISTANCE_MAX // 72px，桌面宽视口下的典型值

  it('位移达到阈值即翻页（不受速度影响）', () => {
    expect(shouldPageSwipe({ dx: threshold, vx: 0, dt: 400, threshold })).toBe(true)
    expect(shouldPageSwipe({ dx: -threshold, vx: 0, dt: 400, threshold })).toBe(true)
  })

  it('位移不足但速度够快 + 达到快扫最短距离，也翻页', () => {
    expect(
      shouldPageSwipe({
        dx: SWIPE_FAST_DISTANCE,
        vx: SWIPE_VELOCITY,
        dt: 120,
        threshold,
      }),
    ).toBe(true)
  })

  it('快扫距离不足时不翻页（防止误触）', () => {
    expect(
      shouldPageSwipe({ dx: SWIPE_FAST_DISTANCE - 1, vx: 2, dt: 120, threshold }),
    ).toBe(false)
  })

  it('速度不足且距离不足时不翻页', () => {
    expect(
      shouldPageSwipe({
        dx: SWIPE_FAST_DISTANCE,
        vx: SWIPE_VELOCITY - 0.01,
        dt: 120,
        threshold,
      }),
    ).toBe(false)
  })

  it('超时（dt > 500ms）后即使距离够也不翻页', () => {
    expect(shouldPageSwipe({ dx: 200, vx: 0, dt: SWIPE_MAX_DURATION + 1, threshold })).toBe(
      false,
    )
  })

  it('dt 恰好等于上限时仍允许判定', () => {
    expect(shouldPageSwipe({ dx: threshold, vx: 0, dt: SWIPE_MAX_DURATION, threshold })).toBe(
      true,
    )
  })

  it('窄视口小阈值下同样成立', () => {
    // 390px 手机 → min(72, round(390*0.18)=70) = 70
    expect(shouldPageSwipe({ dx: 70, vx: 0, dt: 300, threshold: 70 })).toBe(true)
    expect(shouldPageSwipe({ dx: 69, vx: 0, dt: 300, threshold: 70 })).toBe(false)
  })
})

describe('dragVisualOffset 跟手位移', () => {
  it('正常拖拽时位移不超过 22px 上限', () => {
    expect(dragVisualOffset(100, false)).toBe(SWIPE_SHIFT)
    expect(dragVisualOffset(-100, false)).toBe(-SWIPE_SHIFT)
    expect(dragVisualOffset(10, false)).toBe(10)
    expect(dragVisualOffset(-10, false)).toBe(-10)
  })

  it('边界处施加阻尼（0.35 倍）后同样封顶', () => {
    // 已在第一页右滑：dx * SWIPE_DAMPING = 100 * 0.35 = 35 → 仍被 22 封顶
    expect(dragVisualOffset(100, true)).toBe(SWIPE_SHIFT)
    // 小位移时阻尼可感知
    expect(dragVisualOffset(20, true)).toBeCloseTo(20 * SWIPE_DAMPING, 5)
    expect(dragVisualOffset(-40, true)).toBeCloseTo(-40 * SWIPE_DAMPING, 5)
  })

  it('dx 为 0 时返回 0', () => {
    expect(dragVisualOffset(0, false)).toBe(0)
    expect(dragVisualOffset(0, true)).toBe(0)
  })
})

describe('swipeDirOf 方向语义', () => {
  it('右滑（dx > 0）为 prev，左滑为 next', () => {
    expect(swipeDirOf(30)).toBe('prev')
    expect(swipeDirOf(-30)).toBe('next')
  })
})

describe('swipeThreshold 视口自适应阈值', () => {
  it('窄视口按 18vw 计算', () => {
    expect(swipeThreshold(390)).toBe(70) // round(390 * 0.18)
    expect(swipeThreshold(320)).toBe(58)
  })

  it('宽视口封顶 72px', () => {
    expect(swipeThreshold(1024)).toBe(SWIPE_DISTANCE_MAX)
    expect(swipeThreshold(1920)).toBe(SWIPE_DISTANCE_MAX)
  })

  it('阈值恒为正整数', () => {
    for (const w of [280, 375, 414, 768, 1280]) {
      expect(Number.isInteger(swipeThreshold(w))).toBe(true)
      expect(swipeThreshold(w)).toBeGreaterThan(0)
    }
  })
})

describe('常量契约（供样式与组件对齐）', () => {
  it('关键阈值与设计稿一致', () => {
    expect(SWIPE_SLOP).toBe(8)
    expect(SWIPE_AXIS_RATIO).toBe(1.2)
    expect(SWIPE_DISTANCE_MAX).toBe(72)
    expect(SWIPE_FAST_DISTANCE).toBe(24)
    expect(SWIPE_VELOCITY).toBe(0.35)
    expect(SWIPE_MAX_DURATION).toBe(500)
    expect(SWIPE_SHIFT).toBe(22)
    expect(SWIPE_DAMPING).toBe(0.35)
    expect(SWIPE_EDGE).toBe(24)
  })
})
