<!--
  GradeButtons —— 四档评分按钮（复习页自评区，P0-6 验收 4）
  职责：渲染 GRADE_META 四档（忘了/困难/良好/简单），每档下方展示「N 天后再见」预览。
  契约：纯展示 + 回传；**间隔预览只调 calculateSM2 求值、零副作用**（绝不写库）——
       四个按钮显示不同间隔，是「四档真实驱动 SM-2」最直观的可视化证据（QA 一眼可验）。
       新卡（repetitions===0）四档预估间隔必然相同（经典 SM-2 如此）→ 不逐档渲染徽标，
       改一行统一说明。判据**直接用 repetitions===0**，不再比较四档间隔：外部导入的破坏行
       （如 reps:2, interval:1, ef:1.3）四档间隔也可能恰好相同，按间隔比较会让「首次复习」文案说谎。
  移动端：横向四等分、触控目标 ≥44px（沿用批 B 共享知识 5 的按钮约定）。
  props: { error: Object, disabled?: boolean }
  emits: 'pick'(grade: number)
-->
<template>
  <div class="grade-group" data-no-swipe>
    <div class="grade-buttons">
      <button
        v-for="(m, i) in meta"
        :key="m.key"
        class="grade-btn"
        :class="'grade-btn--' + m.tone"
        :disabled="disabled"
        @click="$emit('pick', m.grade)"
      >
        <span class="grade-label">{{ m.label }}</span>
        <span v-if="!uniform" class="grade-preview">{{ preview(i) }}</span>
      </button>
    </div>
    <!-- 新卡（repetitions===0）时四档预估间隔必然相同（经典 SM-2 如此），逐个显示相同的「明天再见」
         是噪音 → 收成一行诚实说明，避免误导 -->
    <p v-if="uniform" class="grade-note">首次复习四档间隔相同，先按记忆情况自评，下一次起间隔会拉开</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
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

/** 四档预估间隔（仅纯函数求值，不落库；供 preview 取用，避免逐按钮重算） */
const intervals = computed(() =>
  meta.map((m) => (props.error ? calculateSM2(props.error, m.grade).interval : null))
)
/**
 * 是否「新卡」：直接判 repetitions===0（新卡四档间隔必然相同 → 不逐档渲染徽标）。
 * 不再用「四档间隔比较」推断新卡：外部导入的破坏行（reps>0 但四档间隔恰好相同）会让判定说谎。
 */
const uniform = computed(() => {
  if (!props.error) return false
  return (props.error.repetitions || 0) === 0
})

/** 间隔预览文案：interval<=1 → 明天；否则 N 天后再见。取自已求值的 intervals，不落库。 */
function preview(i) {
  const interval = intervals.value[i]
  if (interval == null) return ''
  return interval <= 1 ? '明天再见' : `${interval} 天后再见`
}
</script>

<style scoped>
.grade-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
}
.grade-buttons {
  display: flex;
  gap: var(--space-2);
  width: 100%;
}
.grade-note {
  font-size: var(--fs-2xs);
  color: var(--text-muted);
  text-align: center;
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
