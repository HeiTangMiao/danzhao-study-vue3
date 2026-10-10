<!--
  GradeButtons —— 四档评分按钮（复习页自评区，P0-6 验收 4）
  职责：渲染 GRADE_META 四档（忘了/困难/良好/简单），每档下方展示「N 天后再见」预览。
  契约：纯展示 + 回传；**间隔预览只调 calculateSM2 求值、零副作用**（绝不写库）——
       四个按钮显示不同间隔，是「四档真实驱动 SM-2」最直观的可视化证据（QA 一眼可验）。
  移动端：横向四等分、触控目标 ≥44px（沿用批 B 共享知识 5 的按钮约定）。
  props: { error: Object, disabled?: boolean }
  emits: 'pick'(grade: number)
-->
<template>
  <div class="grade-buttons" data-no-swipe>
    <button
      v-for="m in meta"
      :key="m.key"
      class="grade-btn"
      :class="'grade-btn--' + m.tone"
      :disabled="disabled"
      @click="$emit('pick', m.grade)"
    >
      <span class="grade-label">{{ m.label }}</span>
      <span class="grade-preview">{{ preview(m.grade) }}</span>
    </button>
  </div>
</template>

<script setup>
import { GRADE_META, calculateSM2 } from '@/composables/useSpacedReview'

const props = defineProps({
  // 当前卡片（error_book 行）；用于计算四档「N 天后再见」预览
  error: { type: Object, default: null },
  // 落库进行中时禁用，防双击双记
  disabled: { type: Boolean, default: false }
})

defineEmits(['pick'])

// 四档常量与 GRADES 同源（H7 单一真相源）
const meta = GRADE_META

/** 间隔预览文案：interval<=1 → 明天；否则 N 天后再见。仅纯函数求值，不落库。 */
function preview(grade) {
  if (!props.error) return ''
  const { interval } = calculateSM2(props.error, grade)
  return interval <= 1 ? '明天再见' : `${interval} 天后再见`
}
</script>

<style scoped>
.grade-buttons {
  display: flex;
  gap: var(--space-2);
  width: 100%;
}
.grade-btn {
  flex: 1;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border);
  background: var(--surface);
  transition: transform var(--dur-1) var(--ease-standard), border-color var(--dur-1) var(--ease-standard);
}
.grade-btn:active:not(:disabled) { transform: scale(0.97); }
.grade-btn:disabled { opacity: 0.45; }
.grade-label { font-size: var(--fs-base); font-weight: var(--fw-semibold); }
.grade-preview { font-size: var(--fs-2xs); color: var(--text-muted); }

/* 档位色（沿用站点语义色；描边 + 文字着色，不抢主 CTA） */
.grade-btn--danger { border-color: var(--danger); }
.grade-btn--danger .grade-label { color: var(--danger); }
.grade-btn--warning { border-color: var(--warning); }
.grade-btn--warning .grade-label { color: var(--warning); }
.grade-btn--success { border-color: var(--success); }
.grade-btn--success .grade-label { color: var(--success); }
.grade-btn--primary { border-color: var(--primary); }
.grade-btn--primary .grade-label { color: var(--primary); }

@media (max-width: 600px) {
  .grade-btn { min-height: 52px; }
}
</style>
