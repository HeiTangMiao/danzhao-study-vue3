<!--
  CompareBlock —— 双栏中性对照区块（阶段 5 结构扩充 P2）
  职责：
   - 把两个容易混淆的概念按维度并排对照：左名 / 右名 + 每个维度一行
   - **中性对照**：两侧地位对等，不要用红/绿暗示对错 ——
     那是 ErrorFocusBlock（错对）的语义，两者不可互相顶替
  视觉（极简留白）：
   - 无卡片外框，靠中缝发丝线与行间发丝线建立「两栏一张表」的结构
   - ≥768px 三栏（维度 | 左 | 右）；窄屏降为「维度一行 + 左右各自带名」，避免挤坏
-->
<template>
  <BlockShell :title="block.title" variant="plain">
    <div class="compare-grid">
      <div class="compare-row compare-row--head">
        <div class="compare-label" aria-hidden="true" />
        <div class="compare-name">
          <MathJaxRender :text="leftName" />
        </div>
        <div class="compare-name compare-name--right">
          <MathJaxRender :text="rightName" />
        </div>
      </div>

      <div v-for="(a, i) in aspects" :key="i" class="compare-row">
        <div class="compare-label">
          <MathJaxRender :text="a.label" />
        </div>
        <div class="compare-cell">
          <span class="compare-who">
            <MathJaxRender :text="leftName" />
          </span>
          <MathJaxRender :text="a.left" />
        </div>
        <div class="compare-cell compare-cell--right">
          <span class="compare-who">
            <MathJaxRender :text="rightName" />
          </span>
          <MathJaxRender :text="a.right" />
        </div>
      </div>
    </div>
  </BlockShell>
</template>

<script setup>
import { computed } from 'vue'
import BlockShell from './BlockShell.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

const props = defineProps({
  // 区块数据：{ type:'compare', title, left, right, aspects:[{ label, left, right }] }
  block: { type: Object, required: true }
})

const leftName = computed(() => props.block.left || '')
const rightName = computed(() => props.block.right || '')

// 维度兜底：缺省或混入脏项时只渲染能用的部分，不报错
const aspects = computed(() =>
  (Array.isArray(props.block.aspects) ? props.block.aspects : []).filter(
    (a) => a && typeof a === 'object'
  )
)
</script>

<style scoped>
.compare-grid { display: flex; flex-direction: column; }

/* 窄屏：表头整体隐藏（名称由每个格子自带），维度标签独占一行 */
.compare-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-2);
  padding: var(--space-4) 0;
}
.compare-row--head { display: none; }

/* 行间发丝线；表头隐藏时首行不画 */
.compare-row + .compare-row { border-top: 1px solid var(--line); }
.compare-row--head + .compare-row { border-top: none; }

.compare-label {
  font-size: var(--fs-sm);
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.compare-name { font-weight: 600; }
.compare-cell { min-width: 0; }

/* 窄屏下的格内名称（桌面端隐藏） */
.compare-who {
  display: block;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  margin-bottom: var(--space-1);
}

@media (min-width: 768px) {
  .compare-row {
    grid-template-columns: 7rem minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--space-5);
    align-items: start;
  }
  .compare-row--head {
    display: grid;
    padding-top: 0;
  }
  /* 表头与首行之间也画发丝线（表头此时可见） */
  .compare-row--head + .compare-row { border-top: 1px solid var(--line); }

  .compare-who { display: none; }

  /* 中缝发丝线：右侧名称与其下所有右列格子对齐同一条线 */
  .compare-name--right,
  .compare-cell--right {
    border-left: 1px solid var(--line);
    padding-left: var(--space-5);
  }
}
</style>