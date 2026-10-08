<!--
  PomodoroPanel —— 番茄钟（悬浮球 + 锚定面板，用户拍板的正确交互模型）
  职责：
   - 常驻悬浮球（.pomodoro-ball）：页面打开即显示，可拖拽移动到任意位置（桌面鼠标 + 移动端触屏）
   - 点击球在「球旁边」展开面板；拖动球不改变面板开合（点击/拖拽按位移阈值区分）
   - 「📌 固定」= 锁定球位置（锁定后拖不动），与显隐无关：球始终显示、点击始终能开合面板
   - 面板承载番茄钟卡片 UI（模式标签 / 大时钟 / 进度条 / 今日番茄 / 开始-暂停-重置-跳过）

  为什么「固定」是位置锁而不是显隐开关：
    用户预期它是一个「可以移动的悬浮球」，固定按钮解决的是「球被误拖」，
    而不是「球要不要出现」——球是常驻入口，显隐开关没有意义。故 pinned 语义
    从「显示悬浮球」改为「锁定球位置」，localStorage['pomodoro_pin'] 随之复用为
    位置锁（旧值 '1' 在新语义下即「位置锁定」，无需迁移代码）。

  props:
   - pomodoro  usePomodoro() 返回对象整体透传（refs 嵌在对象内，模板按 .value 取）；
               计时 interval 在 composable 内，与面板开合解耦——面板关闭计时照跑
   - open      面板显隐（由 UnitView 持有，侧栏入口与点球共用同一状态源）
  emits:
   - close     关闭面板（× 按钮）
   - toggle    点球时请求开合面板（UnitView 翻转 open）
-->
<template>
  <!-- 常驻悬浮球：可拖拽移动 + 点击开合面板。
       data-no-swipe：移动端防翻页手势冲突（与 MindMapBlock 同口径，防御性）；
       pointerdown.stop：球上指针不冒泡干扰页面滚动/翻页手势。 -->
  <button
    ref="ballEl"
    class="pomodoro-ball"
    :class="{ 'pomodoro-ball--locked': locked, 'pomodoro-ball--dragging': dragging, 'pomodoro-ball--open': open }"
    :style="ballStyle"
    data-no-swipe
    :aria-label="open ? '收起番茄钟' : '打开番茄钟'"
    :title="locked ? '番茄钟（位置已固定）' : (open ? '收起番茄钟' : '打开番茄钟 · 可拖动')"
    @pointerdown.stop="onBallDown"
    @pointermove="onBallMove"
    @pointerup="onBallUp"
    @pointercancel="onBallUp"
  ><AppIcon name="timer" :size="20" /></button>

  <!-- 锚定球位置展开的面板（不再居中浮层） -->
  <transition name="pomo-fade">
    <div
      v-if="open"
      ref="panelEl"
      class="pomodoro-card card"
      :style="panelStyle"
      @click.stop
    >
      <div class="pomodoro-card__head">
        <span class="pomodoro-mode" :class="'mode-' + pomodoro.mode.value"><AppIcon name="timer" :size="14" /> {{ pomodoro.modeLabel.value }}</span>
        <span v-if="pomodoro.running.value" class="pomodoro-running">进行中</span>
        <span class="pomodoro-card__tools">
          <!-- 固定开关：锁定/解锁悬浮球位置（锁定后球拖不动；不影响球显示与面板开合） -->
          <button
            class="pomodoro-tool"
            :class="{ 'pomodoro-tool--on': locked }"
            :title="locked ? '取消固定位置' : '固定位置'"
            :aria-label="locked ? '取消固定位置' : '固定位置'"
            @click="toggleLock"
          ><AppIcon name="pin" :size="15" /></button>
          <button class="pomodoro-tool" title="关闭" aria-label="关闭番茄钟" @click="emit('close')"><AppIcon name="x" :size="16" /></button>
        </span>
      </div>
      <div class="pomodoro-time">{{ pomodoro.display.value }}</div>
      <div class="pomodoro-progress">
        <div class="pomodoro-progress__bar" :style="{ width: pomodoro.progress.value * 100 + '%' }"></div>
      </div>
      <div class="pomodoro-today">今日已完成 {{ pomodoro.sessionsCompleted.value }} 个番茄</div>
      <div class="pomodoro-actions">
        <button class="pomodoro-btn pomodoro-btn--primary" @click="pomodoro.running.value ? pomodoro.pause() : pomodoro.start()">
          {{ pomodoro.running.value ? '⏸ 暂停' : '▶ 开始' }}
        </button>
        <button class="pomodoro-btn" @click="pomodoro.reset()">↺ 重置</button>
        <button class="pomodoro-btn" @click="pomodoro.skip()">⏭ 跳过</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import {
  clampBallPos,
  isDrag,
  anchorPanel,
  PANEL_EST_HEIGHT
} from '@/utils/pomodoroBall'

const BALL_POS_KEY = 'pomodoro_ball_pos'
const PIN_KEY = 'pomodoro_pin'

const props = defineProps({
  pomodoro: { type: Object, required: true },
  open: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'toggle'])

const ballEl = ref(null)
const panelEl = ref(null)

// 球位置（视口绝对坐标，左上角）。null = 尚未量测/未拖过，先由 CSS 默认位兜底显示。
const pos = ref(null)
// 视口尺寸（响应式）：窗口 resize 时重算球收口与面板锚定
const vp = ref({ w: typeof window !== 'undefined' ? window.innerWidth : 1024, h: typeof window !== 'undefined' ? window.innerHeight : 768 })
// 面板尺寸（量到真实高度后覆盖兜底估算，供锚定收口用）
const panelSize = ref({ w: 250, h: PANEL_EST_HEIGHT })

// 位置锁（「固定」语义）：'1' = 锁定球位置（拖不动）。旧值 '1' 在新语义下即锁定，无需迁移。
const locked = ref(false)
try { locked.value = localStorage.getItem(PIN_KEY) === '1' } catch { locked.value = false }

const dragging = ref(false)
// 拖拽起点快照：{ px, py, baseX, baseY } 与「是否已越过阈值」标记
let dragStart = null
let dragMoved = false

/** 有记忆/量测位置时用 inline 定位覆盖 CSS 默认位（right/bottom 同时置 auto 防冲突） */
const ballStyle = computed(() => pos.value
  ? { left: pos.value.x + 'px', top: pos.value.y + 'px', right: 'auto', bottom: 'auto' }
  : null)

/** 面板落点：锚定球一侧就近展开，并整体收口进视口（anchorPanel 保证完整可见） */
const panelStyle = computed(() => {
  if (!props.open || !pos.value) return null
  const a = anchorPanel(pos.value.x, pos.value.y, vp.value.w, vp.value.h, panelSize.value.w, panelSize.value.h)
  return { left: a.x + 'px', top: a.y + 'px', right: 'auto', bottom: 'auto' }
})

/** 量测面板真实高度（锚定收口需要；内容高度稳定，开面板时量一次即可） */
function measurePanel() {
  const el = panelEl.value
  if (el && el.offsetWidth) panelSize.value = { w: el.offsetWidth, h: el.offsetHeight }
}

/**
 * 初始化球位置：
 *  - 有持久化位置 → 收口后采用；
 *  - 无（首次 / 清过缓存）→ 量测 CSS 默认位的左上角作为当前工作坐标（不写盘，默认位由 CSS 定义）。
 * pin=1 而位置不存在时自然落到默认位且保持锁定状态（满足「默认位 + 锁定」要求）。
 */
function initBallPos() {
  const el = ballEl.value
  if (!el) return
  let saved = null
  try {
    const raw = localStorage.getItem(BALL_POS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) saved = { x: parsed.x, y: parsed.y }
  } catch { saved = null }

  const rect = el.getBoundingClientRect()
  const base = { x: rect.left, y: rect.top }
  const target = saved || base
  pos.value = clampBallPos(target.x, target.y, vp.value.w, vp.value.h)
}

/** 拖拽结束持久化（仅未锁定时调用） */
function persistPos() {
  if (!pos.value) return
  try { localStorage.setItem(BALL_POS_KEY, JSON.stringify(pos.value)) } catch { /* 忽略写入异常 */ }
}

function onBallDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  // 记录起点用于「点击/拖拽」判定；锁定态也记录（锁定只是不允许移动，仍要能点开面板）
  dragStart = { px: e.clientX, py: e.clientY, baseX: pos.value ? pos.value.x : 0, baseY: pos.value ? pos.value.y : 0 }
  dragMoved = false
  // capture 保证移出球体仍能收到 move/up（锁定态捕获亦无害：move 分支不移动）
  try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* 捕获失败不阻断交互 */ }
}

function onBallMove(e) {
  if (!dragStart) return
  // 兜底：鼠标键已松开但 pointerup 未派发（窗外释放）→ 按抬起收口
  if (e.pointerType === 'mouse' && e.buttons === 0) { onBallUp(e); return }
  // 锁定态：位置锁语义 = 不跟手（但点击判定照走）
  if (locked.value) return
  const dx = e.clientX - dragStart.px
  const dy = e.clientY - dragStart.py
  if (!isDrag(dx, dy)) return // 未达阈值不移动，保留「点击」的可能
  dragMoved = true
  dragging.value = true
  pos.value = clampBallPos(dragStart.baseX + dx, dragStart.baseY + dy, vp.value.w, vp.value.h)
}

function onBallUp(e) {
  if (!dragStart) return
  const dx = e.clientX - dragStart.px
  const dy = e.clientY - dragStart.py
  // 拖动判定以过程标记为准，回退到抬起时的位移做兜底（快速拖动可能无 move 帧）
  const moved = dragMoved || isDrag(dx, dy)
  dragStart = null
  dragging.value = false
  if (moved) {
    // 拖拽：锁定态忽略（锁定位不动），未锁定则收口持久化
    if (!locked.value) persistPos()
    return
  }
  // 未超阈值 = 点击：请求开合面板
  emit('toggle')
}

/** 固定/取消固定（位置锁） */
function toggleLock() {
  locked.value = !locked.value
  try { localStorage.setItem(PIN_KEY, locked.value ? '1' : '0') } catch { /* 忽略写入异常 */ }
}

function onResize() {
  vp.value = { w: window.innerWidth, h: window.innerHeight }
  // 视口变化把球收回可见区（不持久化：resize 是环境变化，非用户主动落位）
  if (pos.value) pos.value = clampBallPos(pos.value.x, pos.value.y, vp.value.w, vp.value.h)
}

// 开面板后量测真实高（首帧用估算高，量到后重锚，避免面板底部越界）
watch(() => props.open, (v) => { if (v) nextTick(measurePanel) })

onMounted(() => {
  initBallPos()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
/* ===== 悬浮球 ===== */
/* 默认位：右下角（桌面 right/bottom 24；移动端落在系统手势区上方，见下方媒体查询）。
 * 用户拖动后由 inline left/top 接管并持久化到 localStorage['pomodoro_ball_pos']。 */
.pomodoro-ball {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 150; /* 高于面板 140，始终可点击 */
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  border: none;
  cursor: grab;
  box-shadow: var(--shadow-pop);
  display: flex;
  align-items: center;
  justify-content: center;
  /* touch-action:none —— 触屏拖球时不触发页面滚动（移动端拖拽的关键） */
  touch-action: none;
  transition: transform var(--dur-1) var(--ease-standard);
}
.pomodoro-ball:active { transform: scale(0.92); }
.pomodoro-ball--dragging { cursor: grabbing; transition: none; }
/* 锁定态提示：给一层内描边，提示「位置已固定」；仍可点击开合面板 */
.pomodoro-ball--locked { cursor: pointer; box-shadow: 0 0 0 3px var(--primary-soft), var(--shadow-pop); }
/* 面板展开时球略实心化，强化「入口激活」 */
.pomodoro-ball--open { background: var(--primary); }

/* ===== 面板（锚定球，落点由 inline left/top 决定；CSS 默认位仅首帧兜底） ===== */
.pomodoro-card {
  position: fixed;
  right: 24px;
  bottom: 92px;
  z-index: 140; /* 低于悬浮球 150 / 离开确认 300，高于侧栏 90/95 */
  width: 250px;
  padding: 14px 16px;
  box-shadow: var(--shadow-pop);
}
.pomodoro-card__head { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
.pomodoro-mode { font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
.pomodoro-mode.mode-focus { color: var(--danger); }
.pomodoro-mode.mode-break, .pomodoro-mode.mode-long_break { color: var(--success); }
.pomodoro-running { color: var(--warning); font-size: 0.75rem; }
.pomodoro-card__tools { margin-left: auto; display: inline-flex; align-items: center; gap: 2px; }
/* 头部工具小钮：锁定态给 primary（与收藏星标的主色语义一致） */
.pomodoro-tool {
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s;
}
.pomodoro-tool:hover { color: var(--text); }
.pomodoro-tool--on { color: var(--primary); }
.pomodoro-time {
  text-align: center; font-size: 2.3rem; font-weight: 700;
  font-variant-numeric: tabular-nums; margin: 6px 0;
}
.pomodoro-progress { height: 6px; background: var(--surface-muted); border-radius: var(--radius-full); overflow: hidden; }
.pomodoro-progress__bar {
  height: 100%; background: var(--primary);
  border-radius: var(--radius-full); transition: width 1s linear;
}
.pomodoro-today { text-align: center; font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; }
.pomodoro-actions { display: flex; gap: 8px; margin-top: 10px; }
.pomodoro-btn {
  flex: 1; min-height: 40px;
  border: 1px solid var(--border); background: var(--surface-muted);
  color: var(--text); border-radius: var(--radius-full);
  font-size: 0.78rem; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.pomodoro-btn--primary { background: var(--primary); color: #fff; border-color: var(--primary); font-weight: 600; }

/* 移动端：悬浮球落系统手势区上方（沿用旧 FAB 坐标，页脚已全端退场） */
@media (max-width: 1150px) {
  .pomodoro-ball {
    right: 16px;
    bottom: calc(var(--sab) + var(--sys-gesture-bottom, 24px) + 12px);
  }
  /* 触控目标 ≥44px */
  .pomodoro-btn { min-height: 44px; }
  .pomodoro-tool { width: 32px; height: 32px; }
}

/* 显隐过渡：只动 opacity（玻璃/浮层过渡纪律，§5.7.4 规则 2 同源） */
.pomo-fade-enter-active, .pomo-fade-leave-active { transition: opacity var(--dur-3) var(--ease-standard); }
.pomo-fade-enter-from, .pomo-fade-leave-to { opacity: 0; }
</style>
