<!--
  ColumnsBlock —— 多栏容器区块（阶段 4 版式层）
  职责：
   - 把 items（每列一个区块数组）渲染成并列多栏
   - 桌面端按 cols 分列；窄屏自动降单列
   - 本组件**不 import BlockRenderer** —— 子区块由 BlockRenderer.vue
     内部自引用递归渲染后经插槽注入，避免循环依赖（见交接文档阶段 4 约束）
-->
<template>
  <section class="block block-shell shell--plain block-columns">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="columns-grid" :class="[`cols-${cols}`, `gap-${gap}`]">
      <div v-for="(col, ci) in columns" :key="ci" class="columns-grid__col">
        <slot name="col" :col="col" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 区块数据：{ type:'columns', title, cols?, gap?, items:[[block,...],...] }
  block: { type: Object, required: true }
})

// 桌面端列数（默认 2）；窄屏由 CSS 自动降单列
const cols = computed(() => {
  const n = Number(props.block.cols)
  return n === 3 ? 3 : 2
})

// 列间距（默认 normal）
const gap = computed(() => (props.block.gap === 'tight' ? 'tight' : 'normal'))

// items 兜底：缺省时按列数补空列，避免渲染空白
const columns = computed(() => {
  const raw = Array.isArray(props.block.items) ? props.block.items : []
  return Array.from({ length: cols.value }, (_, i) => raw[i] || [])
})
</script>

<style scoped>
.columns-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacer-24);
}
.columns-grid.gap-tight {
  gap: var(--spacer-16);
}
.columns-grid__col {
  min-width: 0; /* 防止公式/表格把列撑破 */
  display: flex;
  flex-direction: column;
  gap: var(--spacer-24);
}
.columns-grid.gap-tight .columns-grid__col {
  gap: var(--spacer-16);
}

/* 桌面端 ≥ 1024px 才分列；1024~375 之间降为单列，
 * 避免窄屏下公式/表格被挤坏 */
@media (min-width: 1024px) {
  .columns-grid.cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .columns-grid.cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
