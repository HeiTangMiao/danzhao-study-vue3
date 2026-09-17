<!--
  ClozeBlock —— 挖空默写区块（阶段 5 结构扩充 P3）
  职责：
   - 把 {{答案}} 标记渲染成可点击的空位：默认只显示一条虚线，点一下揭晓答案
   - 适合古诗文默写、公式填写、命令补全等「先自测再核对」的场景
  说明：内容里写 {{...}}，不要写 ______；空位数量、位置都由标记决定，改文案不用改样式
  视觉（极简留白）：无卡片，正文沿用 68ch 行长；空位用虚线下划线，揭晓后转主色
-->
<template>
  <BlockShell :title="block.title" variant="plain">
    <div class="cloze-list">
      <p v-for="(item, i) in items" :key="i" class="cloze-item">
        <template v-for="(seg, si) in item.segments" :key="si">
          <span v-if="!seg.blank">
            <MathJaxRender :text="seg.text" />
          </span>
          <button
            v-else
            type="button"
            class="cloze-blank"
            :class="{ 'is-revealed': isRevealed(i, si) }"
            :aria-label="isRevealed(i, si) ? '收起答案' : '揭晓答案'"
            @click="toggle(i, si)"
          >
            <MathJaxRender v-if="isRevealed(i, si)" :text="seg.answer" />
          </button>
        </template>
      </p>
    </div>
  </BlockShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import BlockShell from './BlockShell.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'

const props = defineProps({
  // 区块数据：{ type:'cloze', title, items:[{ text: '含 {{答案}} 的句子' }] }
  block: { type: Object, required: true }
})

/**
 * 把一段文本切成「普通文字」与「空位」两种片段
 * 未闭合的 {{ 原样保留为文字（校验器会拦下，渲染层只负责不炸）
 */
function parseCloze(text) {
  const segs = []
  const re = /\{\{([\s\S]*?)\}\}/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index) })
    segs.push({ blank: true, answer: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ text: text.slice(last) })
  return segs
}

const items = computed(() =>
  (Array.isArray(props.block.items) ? props.block.items : [])
    .filter((it) => it && typeof it === 'object')
    .map((it) => ({ segments: parseCloze(String(it.text ?? '')) }))
)

// 已揭晓的空位，键为「第几项-第几段」；ref 包裹 Set 即可保持响应式
const revealed = ref(new Set())
const keyOf = (i, si) => `${i}-${si}`
const isRevealed = (i, si) => revealed.value.has(keyOf(i, si))

function toggle(i, si) {
  const k = keyOf(i, si)
  if (revealed.value.has(k)) revealed.value.delete(k)
  else revealed.value.add(k)
}
</script>

<style scoped>
.cloze-list { max-width: 68ch; }
.cloze-item { margin-bottom: var(--spacer-12); }
.cloze-item:last-child { margin-bottom: 0; }

.cloze-blank {
  display: inline-block;
  font: inherit;
  color: var(--primary);
  background: none;
  border: none;
  border-bottom: 1px dashed var(--line-strong);
  border-radius: 0;
  padding: 0 var(--space-1);
  margin: 0 var(--space-1);
  cursor: pointer;
  vertical-align: baseline;
}
/* 未揭晓时给一个可见的空位宽度；揭晓后宽度交给答案本身 */
.cloze-blank:not(.is-revealed) { min-width: 4em; }
.cloze-blank:hover { border-bottom-color: var(--primary); }
.cloze-blank.is-revealed { border-bottom-style: solid; border-bottom-color: var(--primary); }
</style>