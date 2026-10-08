/**
 * pomodoroBall 单测（番茄钟悬浮球交互重构）
 * 覆盖三组纯函数：
 *  - clampBallPos：球位置边界收口（常规 / 四角越界 / 极小视口不倒挂）
 *  - isDrag：点击 vs 拖拽阈值判定（含斜向位移）
 *  - anchorPanel：面板锚定球一侧的落点与收口
 */
import { describe, it, expect } from 'vitest'
import {
  clampBallPos,
  isDrag,
  anchorPanel,
  DRAG_THRESHOLD,
  BALL_SIZE,
  BALL_MARGIN,
  PANEL_GAP
} from '@/utils/pomodoroBall'

describe('clampBallPos', () => {
  it('视口内的位置原样返回', () => {
    expect(clampBallPos(200, 150, 1440, 900)).toEqual({ x: 200, y: 150 })
  })

  it('左上越界：收口到 margin 单点（球完整可见）', () => {
    const r = clampBallPos(-999, -999, 1440, 900)
    expect(r.x).toBe(BALL_MARGIN)
    expect(r.y).toBe(BALL_MARGIN)
  })

  it('右下越界：收口到「视口 - 球 - margin」', () => {
    const r = clampBallPos(9999, 9999, 1440, 900)
    expect(r.x).toBe(1440 - BALL_SIZE - BALL_MARGIN)
    expect(r.y).toBe(900 - BALL_SIZE - BALL_MARGIN)
  })

  it('极小视口（装不下球）：区间收成 margin 单点，不产生 min/max 倒挂', () => {
    const r = clampBallPos(100, 100, 20, 20)
    expect(r.x).toBe(BALL_MARGIN)
    expect(r.y).toBe(BALL_MARGIN)
  })
})

describe('isDrag', () => {
  it('位移小于阈值判定为点击', () => {
    expect(isDrag(DRAG_THRESHOLD - 1, 0)).toBe(false)
  })

  it('位移达到阈值判定为拖拽', () => {
    expect(isDrag(DRAG_THRESHOLD, 0)).toBe(true)
  })

  it('斜向位移按欧氏距离判定（dx=dy=4 → 距离约 5.66 ≥ 阈值）', () => {
    expect(isDrag(4, 4)).toBe(true)
  })

  it('默认阈值为 5px', () => {
    expect(DRAG_THRESHOLD).toBe(5)
  })
})

describe('anchorPanel', () => {
  // 面板尺寸取 250×210，球 56，视口 1440×900
  const PW = 250
  const PH = 210

  it('球在右半屏：面板向球左侧展开', () => {
    // 球左上角 x=1300 → 球心 1328 > 720 → 左侧
    const r = anchorPanel(1300, 400, 1440, 900, PW, PH)
    expect(r.side).toBe('left')
    expect(r.x).toBe(1300 - PANEL_GAP - PW)
    expect(r.y).toBe(400)
  })

  it('球在左半屏：面板向球右侧展开', () => {
    // 球左上角 x=100 → 球心 128 < 720 → 右侧
    const r = anchorPanel(100, 400, 1440, 900, PW, PH)
    expect(r.side).toBe('right')
    expect(r.x).toBe(100 + BALL_SIZE + PANEL_GAP)
    expect(r.y).toBe(400)
  })

  it('球贴右下角：面板整体收口进视口，不越界', () => {
    // 球在右下 → 向左侧展开，x 不会越界；y 贴底时面板上移
    const r = anchorPanel(1380, 840, 1440, 900, PW, PH)
    expect(r.x).toBeGreaterThanOrEqual(BALL_MARGIN)
    expect(r.x + PW).toBeLessThanOrEqual(1440 - BALL_MARGIN)
    expect(r.y + PH).toBeLessThanOrEqual(900 - BALL_MARGIN)
  })

  it('垂直方向与球顶对齐，超出下边界时收口', () => {
    const r = anchorPanel(1300, 800, 1440, 900, PW, PH)
    expect(r.y).toBe(Math.min(800, 900 - PH - BALL_MARGIN))
  })
})
