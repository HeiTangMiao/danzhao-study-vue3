<!--
  StepsBlock —— 编号步骤条区块（阶段 5 结构扩充 P1）
  职责：
   - 把 items 渲染成有先后顺序的编号步骤：序号圆点 + 发丝竖线串联
   - 序号由渲染层按顺序生成（内容里不要手写「1. 2. 3.」），改顺序不用改文案
   - 每步支持 **加粗** 与 LaTeX（经 MathJaxRender 渲染）
  视觉（极简留白）：无卡片外框，只用圆点与发丝线建立顺序感
-->
<template>
  <BlockShell :title="block.title" variant="plain">
    <ol class="steps">
      <li v-for="(item, i) in items" :key="i" class="step">
        <span class="step-num" aria-hidden="true">{{ i + 1 }}</span>
        <div class="step-body">
          <div class="step-title">
            <MathJaxRender :text="item.title" />
          </div>
          <div v-if="item.content" class="step-content">
            <MathJaxRender :text="item.content" />
          </div>
        </div>
      </li>
    </ol>
  </BlockShell>
</template>

<script setup>
import { computed } from 'vue'
import BlockShell from './BlockShell.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

const props = defineProps({
  // 区块数据：{ type:'steps', title, items:[{ title, content? }] }
  block: { type: Object, required: true }
})

// items 兜底：缺省时渲染空列表；null 项归一为空对象，避免模板取值报错
const items = computed(() =>
  (Array.isArray(props.block.items) ? props.block.items : []).map((it) =>
    typeof it === 'string' ? { title: it } : it || {}
  )
)
</script>

<style scoped>
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.step {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: var(--space-4);
}

/* 发丝竖线：从本项序号圆点下沿连到下一项圆点上沿（最后一项不画） */
.step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 12.5px;
  top: 26px;
  bottom: calc(-1 * var(--space-5));
  width: 1px;
  background: var(--line);
}

.step-num {
  width: 26px;
  height: 26px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-sm);
  font-weight: 600;
  line-height: 1;
  color: var(--text-muted);
}

.step-body { min-width: 0; padding-top: 3px; }
.step-title { font-weight: 600; }
.step-content {
  margin-top: var(--space-2);
  color: var(--text-muted);
}
</style>