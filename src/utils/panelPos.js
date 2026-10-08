/**
 * panelPos —— 浮动面板位置收口（纯函数，零依赖）
 *
 * 桌面 UX 方案二批 4：笔记面板拖拽落位时的边界 clamp。
 * 语义：面板至少保留 VIEW_MARGIN px 在视口内可见（防拖丢），纵向上沿不小于 0。
 * 视口比「两倍余量」还窄（极端窗口/零尺寸视口）时区间收成单点，绝不产生 min/max 倒挂。
 */

/** 面板拖出视口时至少保留的可见像素（四边同值） */
export const VIEW_MARGIN = 40

/**
 * 把面板左上角坐标 (x, y) 收口进视口。
 * 可见性按「面板顶部至少 40px 落在视口内」计，与面板高无关（故 ph 不参与计算，
 * 保留在签名中以维持 (x, y, 视口, 面板) 的语义完整性）。
 * @param {number} x   期望左上角 x
 * @param {number} y   期望左上角 y
 * @param {number} vpW 视口宽
 * @param {number} vpH 视口高
 * @param {number} pw  面板宽
 * @param {number} ph  面板高（不参与计算，见上）
 * @returns {{ x: number, y: number }} 收口后的左上角坐标
 */
export function clampPos(x, y, vpW, vpH, pw, _ph) {
  const minX = VIEW_MARGIN - pw
  const maxX = Math.max(minX, vpW - VIEW_MARGIN)
  const minY = 0
  const maxY = Math.max(minY, vpH - VIEW_MARGIN)
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY)
  }
}
