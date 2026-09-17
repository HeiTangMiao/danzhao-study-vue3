<!--
  VocabBlock —— 术语卡区块（阶段 5 结构扩充 P2）
  职责：
   - 一条术语一张卡：术语（+ 读音）/ 释义 / 例句（可选）/ 备注（可选）
   - 语文的字词、文言实词，计算机的专业名词都可复用
  视觉（极简留白）：per-item 卡沿用 .block-card 类族（md 圆角），
  组件只写排版差异（术语大字 + 拼音小字 + 「例 / 注」小标签），不自造外框
-->
<template>
  <BlockShell :title="block.title" variant="plain">
    <div class="vocab-list">
      <div v-for="(item, i) in items" :key="i" class="vocab-card block-card block-card--md">
        <div class="vocab-head">
          <span class="vocab-term">
            <MathJaxRender :text="item.term" />
          </span>
          <span v-if="item.pinyin" class="vocab-pinyin">
            <MathJaxRender :text="item.pinyin" />
          </span>
        </div>
        <div class="vocab-meaning">
          <MathJaxRender :text="item.meaning" />
        </div>
        <div v-if="item.example" class="vocab-line">
          <span class="vocab-tag">例</span>
          <span class="vocab-text">
            <MathJaxRender :text="item.example" />
          </span>
        </div>
        <div v-if="item.note" class="vocab-line">
          <span class="vocab-tag">注</span>
          <span class="vocab-text">
            <MathJaxRender :text="item.note" />
          </span>
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
  // 区块数据：{ type:'vocab', title, items:[{ term, pinyin?, meaning, example?, note? }] }
  block: { type: Object, required: true }
})

// items 兜底：缺省或混入脏项时只渲染用得上的条目
const items = computed(() =>
  (Array.isArray(props.block.items) ? props.block.items : []).filter(
    (it) => it && typeof it === 'object'
  )
)
</script>

<style scoped>
.vocab-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* 外框（底/描边/圆角/内边距）由 .block-card--md 提供，这里只写排版 */
.vocab-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.vocab-term {
  font-size: var(--fs-lg);
  font-weight: 600;
}
.vocab-pinyin {
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.vocab-meaning { margin-top: var(--space-2); }

.vocab-line {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  font-size: var(--fs-base);
  color: var(--text-muted);
}
.vocab-tag {
  flex: none;
  font-size: var(--fs-xs);
  line-height: var(--lh-snug);
  color: var(--text-muted);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-1);
}
.vocab-text { min-width: 0; }
</style>