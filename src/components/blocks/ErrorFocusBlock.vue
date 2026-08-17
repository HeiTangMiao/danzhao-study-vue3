<!--
  ErrorFocusBlock —— 易错专项区块
  职责：展示高频易错场景，对比「常见错误」与「正确思路」，强化避坑意识
-->
<template>
  <section class="block errorfocus">
    <h2 class="block-title">🚨 {{ block.title || '易错专项' }}</h2>
    <div v-for="(item, i) in block.items" :key="i" class="ef-card">
      <div class="ef-scenario">
        <span class="ef-badge">场景 {{ i + 1 }}</span>
        <MathJaxRender :text="item.scenario" class="ef-scenario-text" />
      </div>
      <div class="ef-compare">
        <div class="ef-side ef-wrong">
          <div class="ef-side-title">✗ 常见错误</div>
          <MathJaxRender :text="item.commonMistake" />
        </div>
        <div class="ef-arrow">→</div>
        <div class="ef-side ef-right">
          <div class="ef-side-title">✓ 正确思路</div>
          <MathJaxRender :text="item.correctApproach" />
        </div>
      </div>
      <div v-if="item.tip" class="ef-tip">
        <span class="ef-tip-icon">💡</span>
        <MathJaxRender :text="item.tip" />
      </div>
    </div>
  </section>
</template>

<script setup>
import MathJaxRender from '@/components/MathJaxRender.vue'

defineProps({
  // 区块数据：{ type:'errorfocus', title, items:[{scenario,commonMistake,correctApproach,tip}] }
  block: { type: Object, required: true }
})
</script>

<style scoped>
.ef-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacer-16);
  margin-bottom: var(--spacer-16);
  box-shadow: var(--shadow-sm);
}
.ef-scenario { display: flex; align-items: flex-start; gap: var(--spacer-8); margin-bottom: var(--spacer-12); }
.ef-badge {
  flex-shrink: 0; font-size: 0.75rem; font-weight: 700;
  background: rgba(240, 140, 0, 0.15); color: var(--warning);
  padding: 2px 10px; border-radius: var(--radius-full);
}
.ef-scenario-text { flex: 1; font-weight: 600; }

.ef-compare { display: flex; align-items: stretch; gap: var(--spacer-8); margin-bottom: var(--spacer-10); }
.ef-side {
  flex: 1; border-radius: var(--radius-md); padding: var(--spacer-12);
  font-size: 0.9rem;
}
.ef-wrong { background: rgba(224, 49, 49, 0.06); border: 1px solid rgba(224, 49, 49, 0.25); }
.ef-right { background: rgba(47, 158, 68, 0.06); border: 1px solid rgba(47, 158, 68, 0.25); }
.ef-side-title { font-size: 0.78rem; font-weight: 700; margin-bottom: 6px; }
.ef-wrong .ef-side-title { color: var(--danger); }
.ef-right .ef-side-title { color: var(--success); }
.ef-arrow {
  align-self: center; color: var(--text-muted); font-size: 1.2rem; font-weight: 700;
}

.ef-tip {
  display: flex; gap: var(--spacer-8);
  background: rgba(47, 111, 237, 0.08); border: 1px solid var(--primary);
  border-radius: var(--radius-md); padding: var(--spacer-10) var(--spacer-12);
  font-size: 0.9rem;
}
.ef-tip-icon { color: var(--primary); }

@media (max-width: 640px) {
  .ef-compare { flex-direction: column; }
  .ef-arrow { transform: rotate(90deg); align-self: center; }
}
</style>
