/**
 * clampPos 单测（桌面 UX 方案二批 4：笔记面板拖拽落位收口）
 * 覆盖：常规 / 四角越界 / 零尺寸视口 / 面板比视口宽
 */
import { describe, it, expect } from 'vitest'
import { clampPos, VIEW_MARGIN } from '@/utils/panelPos'

describe('clampPos', () => {
  it('常规位置在视口内原样返回', () => {
    expect(clampPos(200, 150, 1440, 900, 340, 220)).toEqual({ x: 200, y: 150 })
  })

  it('左上越界：x 不得小于 40 - 面板宽，y 不小于 0', () => {
    const r = clampPos(-999, -999, 1440, 900, 340, 220)
    expect(r.x).toBe(VIEW_MARGIN - 340)
    expect(r.y).toBe(0)
  })

  it('右下越界：x 不得大于视口宽 - 40，y 不得大于视口高 - 40', () => {
    const r = clampPos(9999, 9999, 1440, 900, 340, 220)
    expect(r.x).toBe(1440 - VIEW_MARGIN)
    expect(r.y).toBe(900 - VIEW_MARGIN)
  })

  it('拖到视口正中央边缘时收在 40px 可见余量线上', () => {
    // 面板几乎完全拖出右缘 → 左边缘钉在 vw - 40
    const r = clampPos(1500, 400, 1440, 900, 340, 220)
    expect(r.x).toBe(1440 - VIEW_MARGIN)
  })

  it('零尺寸视口：区间收成单点，不产生 min/max 倒挂', () => {
    const r = clampPos(100, 100, 0, 0, 340, 220)
    expect(r.x).toBe(0 - VIEW_MARGIN)
    expect(r.y).toBe(0)
  })

  it('面板比视口宽：x 仍可收口（左移出界钉在 40-面板宽），y 正常 clamp', () => {
    const r = clampPos(-500, 500, 300, 600, 400, 220)
    expect(r.x).toBe(VIEW_MARGIN - 400)
    expect(r.y).toBe(500)
  })
})
