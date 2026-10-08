<!--
  NotesPanel —— 学习笔记浮动面板（桌面 UX 方案二批 4：从 UnitView 内联 section 组件化）
  职责：
   - 笔记编辑 UI（标题 + 保存状态 / textarea / 字数 + 保存钮）
   - 桌面（≥1151）：fixed 浮动卡 + 头部把手 Pointer Events 拖拽，位置持久化 localStorage['notes_panel_pos']
   - 移动（≤1150）：底部抽屉形态（复用 sb-sheet 视觉语言），不做自由拖拽
  数据与保存链路零改动：notes prop 是 useNotes 返回对象整体透传
  （content/status/statusType/wordCount/scheduleAutosave/manualSave；1.5s 防抖自动保存、
  pageKey 切换自动重载都在 composable 内）——翻页时面板保持打开、内容自动切到新页。
  拖拽要点（CSP 安全）：
   - 只有头部把手挂 pointerdown（textarea 绝不参与拖拽，不破坏文本选择/光标操作）；
   - setPointerCapture 保证移出把手仍跟手；落位走 transform: translate（合成层友好）；
   - pointerup 时 clampPos 收口进视口（至少留 40px 可见）+ 持久化；窗口 resize 重 clamp。
  props:
   - open   显隐（与顶栏/侧栏笔记按钮共享同一状态源）
   - notes  useNotes 返回对象
  emits:
   - close
-->
<template>
  <transition name="np">
    <section
      v-if="open"
      ref="panelEl"
      class="notes-panel card"
      :class="{ dragging }"
      :style="panelStyle"
      role="dialog"
      aria-label="学习笔记"
    >
      <!-- 头部 = 唯一拖拽把手；pointercancel 兜底（指针在窗外释放时 pointerup 不派发） -->
      <div
        class="notes-head"
        @pointerdown="onHandleDown"
        @pointermove="onHandleMove"
        @pointerup="onHandleUp"
        @pointercancel="onHandleUp"
      >
        <span class="notes-head__title"><AppIcon name="square-pen" :size="16" /> 我的笔记</span>
        <span class="notes-status" :class="'notes-' + state.statusType.value">{{ state.status.value }}</span>
        <button class="notes-close" title="关闭笔记" aria-label="关闭笔记" @click="emit('close')"><AppIcon name="x" :size="16" /></button>
      </div>
      <textarea
        v-model="state.content.value"
        class="notes-textarea"
        placeholder="在此记录学习笔记…（自动保存）"
        @input="state.scheduleAutosave()"
      ></textarea>
      <div class="notes-foot">
        <span>{{ state.wordCount.value }} 字</span>
        <button class="notes-save" @click="state.manualSave()">保存</button>
      </div>
    </section>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { clampPos } from '@/utils/panelPos'

const POS_KEY = 'notes_panel_pos'
// 移动端断点：与 ContentSidebar/reader.css 的 1150 分界一致
const MOBILE_MQ = '(max-width: 1150px)'

const props = defineProps({
  open: { type: Boolean, default: false },
  notes: { type: Object, required: true }
})

const emit = defineEmits(['close'])

// notes 是 useNotes 的响应式状态容器（refs 集合）整体透传，父组件与面板共用同一状态源；
// 经 computed 别名访问并在模板写入 content 是该容器设计内的编辑入口，
// 不属于对 prop 绑定本身的改写（vue/no-mutating-props 亦因此不适用）
const state = computed(() => props.notes)

const panelEl = ref(null)
const dragging = ref(false)
// 拖拽位移（落位走 transform，不给玻璃/卡片添 backdrop root 问题——本面板是实底 card）
const dragDx = ref(0)
const dragDy = ref(0)
// 持久化位置（视口绝对坐标，左上角）；null = 未拖过，用 CSS 默认位（top:120 + 右避让侧栏）
const pos = ref(null)

// 初始化：读取记忆位置（容错解析异常）
try {
  const raw = localStorage.getItem(POS_KEY)
  const saved = raw ? JSON.parse(raw) : null
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) pos.value = { x: saved.x, y: saved.y }
} catch { pos.value = null }

/** 仅在拖过（有偏移）时才落 inline transform——不遮蔽移动端抽屉进出场类的 translateY */
const panelStyle = computed(() =>
  dragDx.value || dragDy.value ? { transform: `translate(${dragDx.value}px, ${dragDy.value}px)` } : null
)

/**
 * 未位移的默认落点。用 offsetLeft/offsetTop（fixed 元素相对视口）而非
 * getBoundingClientRect——后者含 transform，进场过渡（translateY(8px)）进行中
 * 量测会把 -8px 系统性偏差算进记忆位置（QA F3）
 */
function baseRect() {
  const el = panelEl.value
  if (!el) return null
  return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
}

/** 把记忆位置换算成 transform 偏移并重新 clamp（开面板 / 窗口 resize 时调用） */
function applyPos() {
  // 移动端抽屉形态不做自由定位：记忆位置是桌面拖出来的（QA F2），照搬会把抽屉
  // translate 出屏幕——清零偏移落回 CSS 抽屉位
  if (typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_MQ).matches) {
    dragDx.value = 0
    dragDy.value = 0
    return
  }
  const base = baseRect()
  if (!base) return
  if (!pos.value) { dragDx.value = 0; dragDy.value = 0; return }
  const clamped = clampPos(pos.value.x, pos.value.y, window.innerWidth, window.innerHeight, base.w, base.h)
  pos.value = clamped
  dragDx.value = clamped.x - base.x
  dragDy.value = clamped.y - base.y
}

// ===== 移动端抽屉的 body 滚动锁（与键盘翻页守卫的 overflow 检查联动） =====
// 只清理自己加的锁：侧栏抽屉可能同时锁 body，互不误释放
let lockOwned = false
function syncBodyLock(open) {
  const mobile = typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_MQ).matches
  if (mobile && open && document.body.style.overflow !== 'hidden') {
    document.body.style.overflow = 'hidden'
    lockOwned = true
  } else if ((!open || !mobile) && lockOwned) {
    // 关闭、或断点穿梭回桌面（浮窗形态不锁滚动）→ 释放自己加的锁
    document.body.style.overflow = ''
    lockOwned = false
  }
}

watch(() => props.open, (v) => {
  syncBodyLock(v)
  if (v) {
    // 等面板挂载量到默认落点后，再把记忆位置换算成偏移
    nextTick(applyPos)
  }
})

function onResize() {
  if (props.open) {
    applyPos()
    // 断点穿梭（桌面开面板 → 缩到移动端）时补抽屉滚动锁 / 反向时释放
    syncBodyLock(true)
  }
}
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  syncBodyLock(false)
})

// ===== 桌面拖拽（Pointer Events 统一鼠标/触摸；声明式绑定，无运行时注入） =====
let dragStart = null // { px, py, dx, dy, base }

function onHandleDown(e) {
  // 移动端抽屉不做自由拖拽（把手无「移动面板」语义，避免与下滑关闭手势打架）
  if (typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_MQ).matches) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  // 头部内的关闭钮不触发拖拽：pointer capture 会把后续事件重定向，吞掉按钮的 click
  if (e.target.closest('button')) return
  const base = baseRect()
  if (!base) return
  dragStart = { px: e.clientX, py: e.clientY, dx: dragDx.value, dy: dragDy.value, base }
  dragging.value = true
  e.currentTarget.setPointerCapture(e.pointerId)
}

function onHandleMove(e) {
  if (!dragging.value || !dragStart) return
  // 兜底：鼠标键已松开但 pointerup 未派发（释放发生在窗外/ capture 丢失）→ 按抬起收口，
  // 否则面板会持续跟随无按键的 hover 移动
  if (e.pointerType === 'mouse' && e.buttons === 0) { onHandleUp(); return }
  dragDx.value = dragStart.dx + (e.clientX - dragStart.px)
  dragDy.value = dragStart.dy + (e.clientY - dragStart.py)
}

function onHandleUp() {
  if (!dragging.value || !dragStart) return
  const { base } = dragStart
  dragStart = null
  dragging.value = false
  // 收口：clamp 进视口（至少留 40px 可见）+ 持久化
  const clamped = clampPos(base.x + dragDx.value, base.y + dragDy.value, window.innerWidth, window.innerHeight, base.w, base.h)
  pos.value = clamped
  dragDx.value = clamped.x - base.x
  dragDy.value = clamped.y - base.y
  try { localStorage.setItem(POS_KEY, JSON.stringify(clamped)) } catch { /* 忽略写入异常 */ }
}
</script>

<style scoped>
/* 桌面浮动卡：默认位置 top:120（顶栏 108 之下）、右避让侧栏（--sb-rail-w + 间距）；
 * 拖拽后位置由 inline transform 接管并持久化 */
.notes-panel {
  position: fixed;
  top: 120px;
  right: calc(var(--sb-rail-w, 236px) + 36px);
  z-index: 140; /* 低于离开确认 300，高于侧栏 90/95 */
  width: min(340px, calc(100vw - 48px));
  box-shadow: var(--shadow-pop);
}
.notes-panel.dragging { transition: none; user-select: none; }

/* 头部 = 拖拽把手 */
.notes-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--spacer-8);
  font-weight: 600;
  cursor: grab;
  touch-action: none; /* 把手上的触摸位移归拖拽，不触发滚动 */
}
.notes-panel.dragging .notes-head { cursor: grabbing; }
.notes-head__title { flex: 1; min-width: 0; display: inline-flex; align-items: center; gap: 4px; }
.notes-status { flex: 0 0 auto; font-weight: 400; font-size: 0.8rem; }
.notes-saved { color: var(--success); }
.notes-saving { color: var(--warning); }
.notes-error { color: var(--danger); }
.notes-close {
  flex: 0 0 auto;
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s;
}
.notes-close:hover { color: var(--text); }
.notes-textarea {
  width: 100%; min-height: 100px;
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--spacer-12);
  color: var(--text); font-family: inherit; font-size: 0.9rem;
  resize: vertical;
}
.notes-foot { display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacer-8); font-size: 0.8rem; color: var(--text-muted); }
.notes-save { background: var(--primary-soft); color: var(--primary); border: none; border-radius: var(--radius-full); padding: 4px 12px; cursor: pointer; }

/* 移动端（≤1150）：底部抽屉形态（复用 sb-sheet 视觉语言：圆角顶 + 贴底 + 安全区让位），
 * 不做自由拖拽 */
@media (max-width: 1150px) {
  .notes-panel {
    left: 0; right: 0; bottom: 0; top: auto;
    width: auto;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding-bottom: calc(var(--spacer-16) + env(safe-area-inset-bottom, 0px));
  }
  .notes-head { cursor: default; touch-action: auto; }
  .notes-textarea { min-height: 140px; }
}

/* 显隐过渡：桌面轻微上浮淡入 / 移动端抽屉滑入滑出（inline transform 为 null 时类才生效） */
.np-enter-active, .np-leave-active { transition: opacity var(--dur-3) var(--ease-standard), transform var(--dur-3) var(--ease-standard); }
.np-enter-from, .np-leave-to { opacity: 0; }
@media (min-width: 1151px) {
  .np-enter-from, .np-leave-to { transform: translateY(8px); }
}
@media (max-width: 1150px) {
  .np-enter-from, .np-leave-to { transform: translateY(100%); }
}
</style>
