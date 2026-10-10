<!--
  StuckCard —— 卡点卡（P1-10，默写形态）
  契约（需求原文「只显示操作名、隐藏路径」）：
   - 正面（revealed=false）：只显示 模块角标 + 操作名 + 提示，**路径绝不出现在 DOM**（含 title/aria-label/data-*）；
   - 背面（revealed=true）：显式路径/快捷键 + 备注。
  默写形态只在复习页生效（错题本列表是查阅场景，不隐藏路径）。
  props: { card: Object, revealed: boolean }
  emits: 'flip'
-->
<template>
  <div class="stuck-card" @click="!revealed && $emit('flip')">
    <div class="stuck-card__meta">
      <span class="stuck-card__module">{{ card.module }}</span>
      <span class="stuck-card__badge">卡点</span>
    </div>

    <div class="stuck-card__front">
      <div class="stuck-card__action">{{ card.question }}</div>
      <p class="stuck-card__hint">想一下：菜单路径 / 快捷键是什么？</p>
    </div>

    <!-- 背面：翻面后才进 DOM（检索练习纪律与错题卡同款） -->
    <transition name="sc-fade">
      <div v-if="revealed" class="stuck-card__back">
        <div class="stuck-card__label"><AppIcon name="lightbulb" :size="15" /> 路径 / 快捷键</div>
        <div class="stuck-card__answer">{{ card.correctAnswer }}</div>
        <p v-if="card.explanation" class="stuck-card__note">{{ card.explanation }}</p>
      </div>
    </transition>
  </div>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  // 卡点行（error_book 行，kind='stuck'）
  card: { type: Object, required: true },
  // 是否翻面
  revealed: { type: Boolean, default: false }
})

defineEmits(['flip'])
</script>

<style scoped>
.stuck-card { display: flex; flex-direction: column; gap: var(--space-3); }
.stuck-card__meta { display: flex; align-items: center; gap: var(--space-2); }
.stuck-card__module { font-size: 0.78rem; font-weight: 600; color: var(--primary); }
.stuck-card__badge {
  font-size: var(--fs-2xs); padding: 1px 8px; border-radius: var(--radius-full);
  background: rgba(var(--warning-rgb), 0.15); color: var(--warning);
}
.stuck-card__action { font-size: 1.3rem; font-weight: 700; line-height: var(--lh-snug); }
.stuck-card__hint { color: var(--text-muted); font-size: var(--fs-sm); margin-top: var(--space-2); }
.stuck-card__back {
  margin-top: var(--space-4);
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--space-4);
  display: flex; flex-direction: column; gap: var(--space-2);
}
.stuck-card__label { display: flex; align-items: center; gap: 4px; font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--text-muted); }
.stuck-card__answer { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 1.05rem; color: var(--success); word-break: break-word; }
.stuck-card__note { color: var(--text-muted); font-size: var(--fs-sm); }
.sc-fade-enter-active, .sc-fade-leave-active { transition: opacity var(--dur-3) var(--ease-out); }
.sc-fade-enter-from, .sc-fade-leave-to { opacity: 0; }
</style>
