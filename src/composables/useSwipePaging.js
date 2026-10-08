/**
 * useSwipePaging —— 学习页左右滑动翻页（P4-T5，system_design §5.7.1~§5.7.5）
 *
 * 分层（§1.5 低耦合）：
 *  - 纯判定函数（本文件导出，tests/use-swipe-paging.test.js 直测）：
 *      resolveAxis / shouldPageSwipe / dragVisualOffset / isEdgeStart / swipeDirOf / swipeThreshold
 *  - 手势层（本 composable）：Pointer Events 采集 + 方向锁 + 排除名单 + rAF 合并写 CSS 变量。
 *    只负责「判定意图」，换数据/换路由由 UnitView 的 onIntent 回调承担（翻页仍走路由，
 *    自动继承作答保护 / markPageVisited / 续学位置整条链路）。
 *  - 动效呈现（reader.css）：三态机 phase → .is-leaving/.is-entering/.is-spring 类，
 *    CSS 单方面决定怎么动；JS 只在动画结束后把 phase 拨回 idle（计时读 CSS token，单一真相源）。
 *
 * 为什么不引手势库（§5.7.1 Q1 结论）：runtime deps 仅 7 个，为 80-120 行判定逻辑引入
 * 生态不划算，且 use-gesture 在触摸设备上同样要处理 pointer cancel —— 坑一样多。
 *
 * 方向锁四步（§5.7.1，顺序错误会吞掉内部按钮点按）：
 *  1. pointerdown：通过排除名单后仅记录起点，不捕获
 *  2. pointermove：位移超过 SLOP 后一次性判定轴向
 *  3. 判定水平后才 setPointerCapture + 触发方向预取
 *  4. pointerup 判阈值 → 翻页；pointercancel → 一律回弹
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

/* ===== 阈值常量（导出供测试；§5.7.1 阈值表，P5-T3 真机可调）===== */

/** 方向锁判定阈值：位移未超过 8px 不判方向（触控抖动区） */
export const SWIPE_SLOP = 8
/** 轴向判定比例：|dx| > |dy| × 1.2 才算水平 */
export const SWIPE_AXIS_RATIO = 1.2
/** 距离阈值上限（实际取 min(72px, 18vw)，见 swipeThreshold） */
export const SWIPE_DISTANCE_MAX = 72
/** 快速短划的最小位移 */
export const SWIPE_FAST_DISTANCE = 24
/** 快速短划的速度阈值 px/ms */
export const SWIPE_VELOCITY = 0.35
/** 手势时长上限：超过视为慢速拖动，不翻页 */
export const SWIPE_MAX_DURATION = 500
/** 跟手位移上限（用户定值 22px） */
export const SWIPE_SHIFT = 22
/** 边界阻尼系数（首/末页橡皮筋） */
export const SWIPE_DAMPING = 0.35
/** 边缘保留区宽度（§5.7.2：x<24 交系统返回，x>W-24 预留不响应） */
export const SWIPE_EDGE = 24
/** 页眉/页脚高度带（起手落在其中不注册手势，让位按钮） */
export const SWIPE_TOPBAR_BAND = 44
export const SWIPE_FOOTER_BAND = 52

/* ===== 纯判定函数 ===== */

/**
 * 轴向一次性判定（超过 SLOP 后调用一次，此后不再改变判定）
 * @returns {'h'|'v'} h=水平（继续手势）；v=纵向（本次手势作废，交还浏览器滚动）
 */
export function resolveAxis(dx, dy) {
  return Math.abs(dx) > Math.abs(dy) * SWIPE_AXIS_RATIO ? 'h' : 'v'
}

/**
 * 起手点是否落在左右边缘保留区（§5.7.2 判定规则表）
 * x<24：交系统返回；x>W-24：预留区本期不响应 —— 两者应用都不注册手势
 */
export function isEdgeStart(x, viewportWidth, edge = SWIPE_EDGE) {
  return x < edge || x > viewportWidth - edge
}

/**
 * 翻页成功判定（§5.7.1 阈值表）：
 *  - 慢速长划：|dx| ≥ threshold
 *  - 快速短划：|vx| ≥ 0.35px/ms 且 |dx| ≥ 24px
 *  - 时长 > 500ms 一律不翻页（慢速拖动）
 * @param {object} p
 * @param {number} p.dx 松手时总位移（带方向）
 * @param {number} p.vx 松手瞬时速度 px/ms（带方向）
 * @param {number} p.dt 按压时长 ms
 * @param {number} p.threshold 距离阈值（min(72, 18vw)）
 */
export function shouldPageSwipe({ dx, vx, dt, threshold }) {
  if (dt > SWIPE_MAX_DURATION) return false
  const adx = Math.abs(dx)
  if (adx >= threshold) return true
  return Math.abs(vx) >= SWIPE_VELOCITY && adx >= SWIPE_FAST_DISTANCE
}

/**
 * 跟手位移：上限 22px（到顶不再增加）；首/末页越界方向 ×0.35 橡皮筋（且不翻页）
 * @param {number} dx 原始位移
 * @param {boolean} atBoundary 本次方向处于单元边界（首页右滑 / 末页左滑）
 */
export function dragVisualOffset(dx, atBoundary) {
  if (!dx) return 0
  const sign = Math.sign(dx)
  const effective = atBoundary ? dx * SWIPE_DAMPING : dx
  return sign * Math.min(Math.abs(effective), SWIPE_SHIFT)
}

/** 位移方向 → 翻页方向：右滑（dx>0）= 上一页；左滑 = 下一页 */
export function swipeDirOf(dx) {
  return dx > 0 ? 'prev' : 'next'
}

/** 距离阈值：min(72px, 18vw)（窄屏按比例放宽，慢速长划也能翻） */
export function swipeThreshold(viewportWidth) {
  return Math.min(SWIPE_DISTANCE_MAX, Math.round(viewportWidth * 0.18))
}

/* ===== 手势层 composable ===== */

/**
 * @param {object} opt
 * @param {import('vue').Ref<HTMLElement|null>} opt.target 内容层元素（.reader-content）
 * @param {() => boolean} [opt.isBlocked] 手势屏蔽谓词（测验作答中 = true）
 * @param {(dir: 'prev'|'next') => boolean} opt.canGo 该方向是否可翻（边界判定）
 * @param {(dir: 'prev'|'next', targetIndex: number) => void} opt.onIntent 判定成功回调（UnitView 接管路由）
 * @param {(dir: 'prev'|'next') => void} [opt.onPrefetch] 方向锁判定为水平的瞬间触发（§5.7.5 建议②）
 */
export function useSwipePaging({ target, isBlocked, canGo, onIntent, onPrefetch }) {
  /** 三态机：idle | leaving | entering | spring（驱动 reader.css 的 .is-* 类） */
  const phase = ref('idle')

  let el = null
  let track = null // { id, startX, startY, t0, lastX, lastT, locked, dir }
  let rafId = 0
  let pendingX = 0
  let phaseTimer = 0
  let overlapResolve = null

  /** beginLeaving() 后、100ms（--swipe-overlap）时 resolve —— 入场闸门之一 */
  const overlapDone = () => (overlapPromise ||= new Promise((r) => (overlapResolve = r)))
  let overlapPromise = null

  /* ---- CSS token 读取（单一真相源在 reader.css，JS 不硬编码时长）---- */
  function durationMs(name, fallback) {
    if (!el) return fallback
    const raw = getComputedStyle(el).getPropertyValue(name).trim()
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  /* ---- 跟手位移类生产（QA F2）---- */
  /* reader.css 的 .is-dragging 只有消费者没有生产者，--swipe-dx 写了也看不见。
   * 这里是唯一生产点：方向锁定后挂上，动画态（leaving/spring/entering）接管前摘除 ——
   * off/reduced 档 CSS 侧 transform:none 天然兼容，JS 无需感知动效档位。 */
  function setDragging(on) {
    if (!el) return
    el.classList.toggle('is-dragging', on)
  }

  function clearPhaseTimer() {
    if (phaseTimer) { clearTimeout(phaseTimer); phaseTimer = 0 }
  }

  /** 快速连划接管：立即终止当前动画回到 idle（排队会让连续翻页发涩，§5.7.3） */
  function forceIdle() {
    clearPhaseTimer()
    setDragging(false)
    if (overlapResolve) { overlapResolve(); overlapResolve = null; overlapPromise = null }
    phase.value = 'idle'
  }

  /** 出场（并行档起点）：设置方向变量 + phase=leaving；入场时机由 UnitView 闸门决定 */
  function beginLeaving(dir) {
    forceIdle()
    if (el) el.style.setProperty('--swipe-dir', dir === 'next' ? '1' : '-1')
    overlapPromise = null
    overlapDone() // 创建 100ms 闸门
    phaseTimer = window.setTimeout(() => {
      if (overlapResolve) { overlapResolve(); overlapResolve = null }
    }, durationMs('--swipe-overlap', 100))
    phase.value = 'leaving'
  }

  /** 入场：数据闸门通过后调用；时长读 --swipe-in，到点回 idle */
  function beginEntering() {
    clearPhaseTimer()
    if (el) el.style.removeProperty('--swipe-dx')
    const inMs = durationMs('--swipe-in', 280)
    phaseTimer = window.setTimeout(() => { phase.value = 'idle' }, inMs + 40)
    phase.value = 'entering'
  }

  /** 回弹：阈值不足 / pointercancel / 导航被拦截；时长读 --swipe-spring */
  function springBack(dx = 0) {
    clearPhaseTimer()
    setDragging(false) // 回弹视觉交 .is-spring 动画（keyframe 同样读 --swipe-dx），拖拽类摘除
    if (el) {
      el.style.setProperty('--swipe-dx', `${dx}px`)
      const springMs = durationMs('--swipe-spring', 160)
      phaseTimer = window.setTimeout(() => {
        el?.style.removeProperty('--swipe-dx')
        phase.value = 'idle'
      }, springMs + 40)
    }
    phase.value = 'spring'
  }

  /* ---- 拖拽视觉：rAF 合并直写 CSS 变量（绕开 Vue 响应式，§5.7.5 已验证模式）---- */
  function flushDrag() {
    rafId = 0
    if (!track || !el) return
    const dx = pendingX - track.startX
    const dir = swipeDirOf(dx)
    const atBoundary = !canGo(dir)
    const visual = dragVisualOffset(dx, atBoundary)
    el.style.setProperty('--swipe-dx', `${visual}px`)
  }

  function onPointerDown(e) {
    // 快速连划：动画未结束的新手势立即接管当前动画（§5.7.3）
    if (phase.value !== 'idle') forceIdle()
    if (!el) return
    // 排除名单（§5.7.1，必须在方向锁之前）：
    if (e.pointerType === 'mouse') return // 桌面保留按钮翻页
    if (isBlocked && isBlocked()) return // 测验作答中
    const t = e.target
    if (t && t.closest && t.closest('[data-no-swipe]')) return // 画板等自处理指针的区块
    // 可横向滚动的祖先（宽表格 / 代码块 / 长公式）：不抢手势
    for (let n = t; n && n !== el; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 4) return
    }
    const x = e.clientX
    const y = e.clientY
    if (isEdgeStart(x, window.innerWidth)) return // 边缘 24px 交系统返回 / 预留区
    // 起手落在页眉/页脚高度带：让位按钮（正常情况事件不会到达内容层，此处为冗余防御）
    if (y < SWIPE_TOPBAR_BAND) return
    if (y > window.innerHeight - SWIPE_FOOTER_BAND) return
    track = { id: e.pointerId, startX: x, startY: y, t0: e.timeStamp, lastX: x, lastT: e.timeStamp, locked: false }
    pendingX = x
  }

  function onPointerMove(e) {
    if (!track || e.pointerId !== track.id) return
    pendingX = e.clientX
    if (!track.locked) {
      const dx = e.clientX - track.startX
      const dy = e.clientY - track.startY
      if (Math.hypot(dx, dy) < SWIPE_SLOP) return // 抖动区不判定
      if (resolveAxis(dx, dy) !== 'h') { track = null; return } // 纵向：作废，交还滚动
      // 方向锁判定为水平 → 此时才捕获（顺序反了会吞内部按钮点按）
      track.locked = true
      setDragging(true) // 跟手位移可见（QA F2：锁定即挂类，--swipe-dx 由 rAF 持续刷新）
      try { el?.setPointerCapture(e.pointerId) } catch { /* 捕获失败不阻断手势 */ }
      if (onPrefetch) onPrefetch(swipeDirOf(dx)) // 锁定瞬间预取（§5.7.5 建议②）
    }
    if (!rafId) rafId = requestAnimationFrame(flushDrag)
  }

  function onPointerUp(e) {
    if (!track || e.pointerId !== track.id) return
    const t = track
    track = null
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
    if (!t.locked) return
    const dx = e.clientX - t.startX
    const dt = e.timeStamp - t.t0
    const dtTail = Math.max(1, e.timeStamp - t.lastT)
    const vx = (e.clientX - t.lastX) / dtTail
    const dir = swipeDirOf(dx)
    const ok = shouldPageSwipe({ dx, vx, dt, threshold: swipeThreshold(window.innerWidth) })
    if (ok && canGo(dir)) {
      if (el) el.style.removeProperty('--swipe-dx')
      onIntent(dir, dir === 'next' ? 1 : -1) // UnitView 接管：beginLeaving + 路由
    } else {
      springBack(dragVisualOffset(dx, !canGo(dir)))
    }
  }

  function onPointerCancel(e) {
    if (!track || e.pointerId !== track.id) return
    const t = track
    track = null
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
    // 浏览器接管手势（滚动开始）→ 一律回弹（§5.7.1 步骤 4）
    if (t.locked) springBack(0)
  }

  function attach(node) {
    el = node
    if (!el) return
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)
  }
  function detach() {
    if (!el) return
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerCancel)
    el = null
  }

  onMounted(() => attach(target.value))
  watch(target, (node) => { detach(); attach(node) })
  onBeforeUnmount(() => {
    detach()
    setDragging(false) // 组件卸载兜底：不留挂着的拖拽类（如作答中途路由跳转）
    clearPhaseTimer()
    if (rafId) cancelAnimationFrame(rafId)
  })

  return { phase, beginLeaving, beginEntering, springBack, forceIdle, overlapDone }
}
