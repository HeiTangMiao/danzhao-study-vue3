<!--
  ErrorFocusBlock —— 易错专项区块
  职责：展示高频易错场景，对比「常见错误」与「正确思路」，强化避坑意识
-->
<template>
  <section class="block errorfocus">
    <h2 class="block-title"><AppIcon name="siren" :size="18" /> {{ block.title || '易错专项' }}</h2>
    <div v-for="(item, i) in block.items" :key="i" class="block-card ef-card">
      <div class="ef-scenario">
        <span class="ef-badge">场景 {{ i + 1 }}</span>
        <MathJaxRender :text="item.scenario" class="ef-scenario-text" />
      </div>
      <div class="ef-compare">
        <div class="ef-side ef-wrong">
          <div class="ef-side-title"><AppIcon name="x" :size="14" /> 常见错误</div>
          <MathJaxRender :text="item.commonMistake" />
        </div>
        <div class="ef-arrow">→</div>
        <div class="ef-side ef-right">
          <div class="ef-side-title"><AppIcon name="check" :size="14" /> 正确思路</div>
          <MathJaxRender :text="item.correctApproach" />
        </div>
      </div>
      <div v-if="item.tip" class="ef-tip">
        <span class="ef-tip-icon"><AppIcon name="lightbulb" :size="16" /></span>
        <MathJaxRender :text="item.tip" />
      </div>
    </div>
  </section>
</template>

<script setup>
import MathJaxRender from '@/components/MathJaxRender.vue'
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  // 区块数据：{ type:'errorfocus', title, items:[{scenario,commonMistake,correctApproach,tip}] }
  block: { type: Object, required: true }
})
</script>

<style scoped>
/* 外框来自 .block-card；无阴影（区块不再有阴影）。
 * 块间距交给 .block-anchor，卡与卡之间用相邻选择器 */
.ef-card + .ef-card { margin-top: var(--spacer-16); }
.ef-scenario { display: flex; align-items: flex-start; gap: var(--spacer-8); margin-bottom: var(--spacer-12); }
.ef-badge {
  flex-shrink: 0; font-size: var(--fs-xs); font-weight: 700;
  background: rgba(var(--warning-rgb), 0.15); color: var(--warning);
  padding: 2px 10px; border-radius: var(--radius-full);
}
.ef-scenario-text { flex: 1; font-weight: 600; }

.ef-compare { display: flex; align-items: stretch; gap: var(--spacer-8); margin-bottom: var(--spacer-10); }
.ef-side {
  flex: 1; border-radius: var(--radius-md); padding: var(--spacer-12);
  font-size: var(--fs-base);
}
.ef-wrong { background: rgba(var(--danger-rgb), 0.06); border: 1px solid rgba(var(--danger-rgb), 0.25); }
.ef-right { background: rgba(var(--success-rgb), 0.06); border: 1px solid rgba(var(--success-rgb), 0.25); }
.ef-side-title { font-size: 0.78rem; font-weight: 700; margin-bottom: 6px; }
.ef-wrong .ef-side-title { color: var(--danger); }
.ef-right .ef-side-title { color: var(--success); }
.ef-arrow {
  align-self: center; color: var(--text-muted); font-size: 1.2rem; font-weight: 700;
}

.ef-tip {
  display: flex; gap: var(--spacer-8);
  background: rgba(var(--primary-rgb), 0.08); border: 1px solid var(--primary);
  border-radius: var(--radius-md); padding: var(--spacer-10) var(--spacer-12);
  font-size: var(--fs-base);
}
.ef-tip-icon { color: var(--primary); }

@media (max-width: 640px) {
  .ef-compare { flex-direction: column; }
  .ef-arrow { transform: rotate(90deg); align-self: center; }
}
</style>
