<!--
  PomodoroPanel —— 番茄钟面板（桌面 UX 方案二批 3：从 UnitView 内联卡片组件化）
  职责：
   - 承载番茄钟卡片 UI（模式标签 / 大时钟 / 进度条 / 今日番茄 / 开始-暂停-重置-跳过）
   - 头部行：[模式标题 + 进行中] [📌 固定开关] [× 关闭]
  两种形态（由 pinned prop 决定，UnitView 持有 pinned 状态并持久化）：
   - pinned=false：居中轻浮层（fixed 居中，无遮罩，× 收起）——默认态，右下角 FAB 不渲染
   - pinned=true ：锚定 FAB 上方的右下角卡片（点 FAB 开合，现有交互回归）
  props:
   - pomodoro  usePomodoro() 返回对象整体透传（refs 嵌在对象内，模板按 .value 取）；
               计时 interval 在 composable 内，与面板显隐解耦——面板关闭计时照跑
   - open      显隐
   - pinned    固定态
  emits:
   - close       关闭面板
   - toggle-pin  切换固定态（状态与持久化在 UnitView）
-->
<template>
  <transition name="pomo-fade">
    <div
      v-if="open"
      class="pomodoro-card card"
      :class="pinned ? 'pomodoro-card--pinned' : 'pomodoro-card--float'"
      @click.stop
    >
      <div class="pomodoro-card__head">
        <span class="pomodoro-mode" :class="'mode-' + pomodoro.mode.value"><AppIcon name="timer" :size="14" /> {{ pomodoro.modeLabel.value }}</span>
        <span v-if="pomodoro.running.value" class="pomodoro-running">进行中</span>
        <span class="pomodoro-card__tools">
          <!-- 固定开关：固定 → 面板锚到 FAB 上方（FAB 出现）；取消 → 回居中浮层（FAB 消失） -->
          <button
            class="pomodoro-tool"
            :class="{ 'pomodoro-tool--on': pinned }"
            :title="pinned ? '取消固定（回到居中浮层）' : '固定到右下角（显示悬浮球）'"
            :aria-label="pinned ? '取消固定' : '固定'"
            @click="emit('toggle-pin')"
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
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  pomodoro: { type: Object, required: true },
  open: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'toggle-pin'])
</script>

<style scoped>
/* 卡片本体样式自 UnitView 原样迁移（class 名不变，token 引 main.css） */
.pomodoro-card {
  width: 250px;
  padding: 14px 16px;
  box-shadow: var(--shadow-pop);
}
/* 非固定态：居中轻浮层（无遮罩，点外部不关闭以免误触，用 × 收起）。
 * z-index 140：低于离开确认 300，高于侧栏 90/95（桌面 UX 方案二批 3） */
.pomodoro-card--float {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 140;
}
/* 固定态：锚定右下角 FAB（56px + 上下 12px 间距）上方 */
.pomodoro-card--pinned {
  position: fixed;
  right: 24px;
  bottom: 92px;
  z-index: 140;
}
.pomodoro-card__head { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
.pomodoro-mode { font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
.pomodoro-mode.mode-focus { color: var(--danger); }
.pomodoro-mode.mode-break, .pomodoro-mode.mode-long_break { color: var(--success); }
.pomodoro-running { color: var(--warning); font-size: 0.75rem; }
.pomodoro-card__tools { margin-left: auto; display: inline-flex; align-items: center; gap: 2px; }
/* 头部工具小钮：固定态给 primary（与收藏星标的主色语义一致） */
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

/* 移动端：固定态卡片仍锚在 FAB 上方（FAB 落系统手势区上方，见 UnitView） */
@media (max-width: 1150px) {
  .pomodoro-card--pinned {
    right: 16px;
    bottom: calc(var(--sab) + var(--sys-gesture-bottom, 24px) + 12px + 56px + 12px);
  }
  /* 触控目标 ≥44px */
  .pomodoro-btn { min-height: 44px; }
  .pomodoro-tool { width: 32px; height: 32px; }
}

/* 显隐过渡：只动 opacity（玻璃/浮层过渡纪律，§5.7.4 规则 2 同源） */
.pomo-fade-enter-active, .pomo-fade-leave-active { transition: opacity var(--dur-3) var(--ease-standard); }
.pomo-fade-enter-from, .pomo-fade-leave-to { opacity: 0; }
</style>
