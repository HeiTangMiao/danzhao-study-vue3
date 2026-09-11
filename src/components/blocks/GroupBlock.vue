<!--
  GroupBlock —— 分组容器区块（阶段 4 版式层）
  职责：
   - band 变体：发丝线分隔的分组带（适合把一组相关区块框在一起）
   - collapse 变体：可折叠分组（点击标题展开/收起）
   - 本组件**不 import BlockRenderer** —— 子区块由 BlockRenderer.vue
     内部自引用递归渲染后经插槽注入，避免循环依赖（见交接文档阶段 4 约束）
-->
<template>
  <section
    class="block block-shell shell--plain block-group"
    :class="[`group--${variant}`, { 'group--collapsed': variant === 'collapse' && collapsed }]"
  >
    <button v-if="variant === 'collapse'" type="button" class="group-head group-head--toggle" @click="collapsed = !collapsed">
      <span class="group-title">{{ block.title || '分组' }}</span>
      <span class="group-caret" aria-hidden="true">{{ collapsed ? '▸' : '▾' }}</span>
    </button>
    <template v-else>
      <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    </template>

    <div v-show="variant !== 'collapse' || !collapsed" class="group-body">
      <slot />
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  // 区块数据：{ type:'group', title, variant?, collapsed?, items:[block,...] }
  block: { type: Object, required: true }
})

// 折叠状态：初始值来自区块配置，随后由点击切换
const collapsed = ref(props.block.collapsed === true)

const variant = computed(() => (props.block.variant === 'collapse' ? 'collapse' : 'band'))
</script>

<style scoped>
.block-group {
  /* band 变体：发丝线顶部分隔，把一组区块框在「同属一段」的分组带里 */
  border-top: 1px solid var(--line);
  padding-top: var(--spacer-16);
}
.group--collapse { border-top: none; padding-top: 0; }

.group-head--toggle {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--spacer-8);
  text-align: left;
  padding: var(--spacer-8) 0;
  cursor: pointer;
  color: var(--text);
}
.group-head--toggle:hover { color: var(--primary); }
.group-title { font-size: var(--fs-xl); font-weight: 600; line-height: var(--lh-tight); }
.group-caret { font-size: 0.8rem; color: var(--text-muted); }

.group-body {
  display: flex; flex-direction: column;
  gap: var(--spacer-24);
  margin-top: var(--spacer-8);
}
</style>
