<!--
  SummaryBlock —— 「一页速记」区块（阶段 5 结构扩充 P1）
  职责：
   - 一页内容的考前回看卡：速记要点 / 必背公式 / 必记结论，三段按需出现
   - 字段全部可选，但三段不能同时为空（由 validateBlock 的语义校验兜住）
  视觉（极简留白）：整块一张 .block-card 卡片，内部只用小字标签 + 留白分段，
  不引入新的外框；不抢正文的层级，靠位置（页尾）与密度取胜
-->
<template>
  <BlockShell :title="block.title || '一页速记'" variant="plain">
    <div class="summary-card block-card">
      <div v-if="points.length" class="summary-section">
        <span class="summary-label">速记要点</span>
        <ul class="summary-list">
          <li v-for="(p, i) in points" :key="i" class="summary-item">
            <MathJaxRender :text="p" />
          </li>
        </ul>
      </div>

      <div v-if="formulas.length" class="summary-section">
        <span class="summary-label">必背公式</span>
        <div v-for="(f, i) in formulas" :key="i" class="summary-formula">
          <MathJaxRender :text="f" block />
        </div>
      </div>

      <div v-if="mustKnow.length" class="summary-section">
        <span class="summary-label">必记结论</span>
        <ul class="summary-list summary-list--must">
          <li v-for="(m, i) in mustKnow" :key="i" class="summary-item">
            <MathJaxRender :text="m" />
          </li>
        </ul>
      </div>
    </div>
  </BlockShell>
</template>

<script setup>
import { computed } from 'vue'
import BlockShell from './BlockShell.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

const props = defineProps({
  // 区块数据：{ type:'summary', title?, points?, formulas?, mustKnow? }
  block: { type: Object, required: true }
})

/** 取数组字段；非数组一律按空处理（内容写错时降级为不渲染该段，而不是报错） */
const listOf = (v) => (Array.isArray(v) ? v.filter((x) => x !== undefined && x !== null && String(x).trim() !== '') : [])

const points = computed(() => listOf(props.block.points))
const formulas = computed(() => listOf(props.block.formulas))
const mustKnow = computed(() => listOf(props.block.mustKnow))
</script>

<style scoped>
.summary-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.summary-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* 小字标签 + 字距，与 formula-label 同一套语言 */
.summary-label {
  font-size: var(--fs-sm);
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.summary-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.summary-item {
  position: relative;
  padding-left: var(--space-4);
}
.summary-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.72em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--line-strong);
}

/* 必记结论：圆点换成主色，是卡内唯一的视觉强调 */
.summary-list--must .summary-item::before {
  background: var(--primary);
}

.summary-formula { min-width: 0; }
</style>