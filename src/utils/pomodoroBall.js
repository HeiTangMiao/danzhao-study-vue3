/**
 * pomodoroBall —— 番茄钟悬浮球的位置与交互纯函数（零依赖）
 *
 * 为什么把这些几何/判定抽成纯函数：悬浮球的「边界收口」「点击 vs 拖拽判定」
 * 「面板锚定落点」都是无副作用的坐标计算。抽出来后组件只负责事件接线与持久化，
 * 计算正确性可被单测锁定（参照 utils/panelPos.js 的成熟模式）。
 *
 * 交互模型（用户拍板）：
 *  - 悬浮球常驻显示，可被拖拽到页面任意位置；
 *  - 点击球在球旁边展开面板；拖动球不改变面板开合；
 *  - 「固定」= 锁定球位置（拖不动），与显隐无关。
 */

/**
 * 点击/拖拽判定阈值（px）。位移 < 阈值视为点击（开合面板），≥ 阈值视为拖拽（移动球）。
 * 取 5 与 MindMapBlock 的 DRAG_THRESHOLD 同源：略大于手指/鼠标的自然抖动幅度，
 * 既不把一次轻点误判成拖拽，也不把微小拖动误判成点击。
 */
export const DRAG_THRESHOLD = 5

/** 悬浮球直径（px），必须与 .pomodoro-ball 的 width/height 一致 */
export const BALL_SIZE = 56

/** 面板与悬浮球之间的间距（px） */
export const PANEL_GAP = 10

/** 悬浮球离视口四边的安全留白（px），保证球完整可见、不被裁边 */
export const BALL_MARGIN = 8

/** 面板内容高度未量到前的兜底估算（px），仅用于首帧，量到真实高度后即被覆盖 */
export const PANEL_EST_HEIGHT = 210

/**
 * 把悬浮球左上角坐标收口进视口，保证球完整落在可见区（四条边都不越界）。
 * 视口比「球 + 两倍留白」还小（极端窗口/零尺寸视口）时区间收成 margin 单点，
 * 绝不产生 min/max 倒挂。
 *
 * @param {number} x       期望左上角 x
 * @param {number} y       期望左上角 y
 * @param {number} vpW     视口宽
 * @param {number} vpH     视口高
 * @param {number} size    球直径
 * @param {number} margin  四边留白
 * @returns {{ x: number, y: number }} 收口后的左上角坐标
 */
export function clampBallPos(x, y, vpW, vpH, size = BALL_SIZE, margin = BALL_MARGIN) {
  const maxX = Math.max(margin, vpW - size - margin)
  const maxY = Math.max(margin, vpH - size - margin)
  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY)
  }
}

/**
 * 指针位移是否达到拖拽阈值（距离按欧氏距离计，斜向拖动同样成立）。
 *
 * @param {number} dx        相对起点的 x 位移
 * @param {number} dy        相对起点的 y 位移
 * @param {number} threshold 阈值
 * @returns {boolean} true=拖拽；false=点击
 */
export function isDrag(dx, dy, threshold = DRAG_THRESHOLD) {
  return Math.hypot(dx, dy) >= threshold
}

/**
 * 计算面板锚定悬浮球一侧的落点（面板左上角坐标）。
 *
 * 规则：
 *  - 球心落在视口右半 → 面板向球左侧展开；落在左半 → 向球右侧展开（避免面板顶出屏幕）；
 *  - 垂直方向与球顶对齐；
 *  - 最终左上角整体收口进视口（四边留 margin），保证面板完整可见。
 *
 * @param {number} ballX    球左上角 x
 * @param {number} ballY    球左上角 y
 * @param {number} vpW      视口宽
 * @param {number} vpH      视口高
 * @param {number} panelW   面板宽
 * @param {number} panelH   面板高
 * @param {number} ballSize 球直径
 * @param {number} gap      球与面板间距
 * @returns {{ x: number, y: number, side: 'left'|'right' }} 面板左上角坐标与展开方向
 */
export function anchorPanel(ballX, ballY, vpW, vpH, panelW, panelH, ballSize = BALL_SIZE, gap = PANEL_GAP) {
  const ballCenterX = ballX + ballSize / 2
  // 右半屏 → 面板在球左边；否则在右边
  const side = ballCenterX > vpW / 2 ? 'left' : 'right'
  const rawX = side === 'left' ? ballX - gap - panelW : ballX + ballSize + gap
  const rawY = ballY
  const margin = BALL_MARGIN
  const maxX = Math.max(margin, vpW - panelW - margin)
  const maxY = Math.max(margin, vpH - panelH - margin)
  return {
    x: Math.min(Math.max(rawX, margin), maxX),
    y: Math.min(Math.max(rawY, margin), maxY),
    side
  }
}
