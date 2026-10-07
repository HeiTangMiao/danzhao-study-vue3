<!--
  ObjectivesBlock —— 学习目标区块
  职责：展示页面学习目标列表，支持 LaTeX 公式
-->
<template>
  <section class="block objectives">
    <h3 class="block-title"><AppIcon name="target" :size="18" /> {{ block.title || '学习目标' }}</h3>
    <div class="block-card objectives-box">
      <p v-for="(item, i) in block.items" :key="i" class="objective-item">
        <span class="objective-dot">•</span>
        <MathJaxRender :text="item" />
      </p>
    </div>
  </section>
</template>

<script setup>
import MathJaxRender from '@/components/MathJaxRender.vue'
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  // 区块数据：{ type:'objectives', title, items:[string] }
  block: { type: Object, required: true }
})
</script>

<style scoped>
/* .objectives-box 自身已无规则：外框由 .block-card 完整提供，
 * 本块是少数「与基础框架零差异」的实例。类名保留，作为可定位的钩子。
 * 注意它刻意不带 --shadow —— 不要顺手补齐。 */
.objective-item {
  display: flex;
  gap: var(--spacer-8);
  margin-bottom: var(--spacer-8);
}
.objective-item:last-child { margin-bottom: 0; }
.objective-dot { color: var(--primary); font-weight: 700; }
</style>