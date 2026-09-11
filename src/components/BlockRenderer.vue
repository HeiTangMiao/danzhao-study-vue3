<!--
  BlockRenderer —— 内容区块分发器（低代码渲染核心）
  职责：
   - 根据区块的 type 字段动态分发到对应渲染组件
   - 这是"Schema 驱动渲染"的枢纽：内容只描述数据，渲染由组件决定
   - 类型 → 组件的映射集中在 blocks/registry.js，此处不再维护类型清单
-->
<template>
  <component :is="resolver" v-if="resolver" :block="block" :context="context" />
  <!-- 未知类型：显式提示，避免内容写错 type 时静默渲染成一片空白 -->
  <div v-else class="block-unknown">
    未知区块类型：{{ block.type || '(缺少 type)' }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { componentOf } from './blocks/registry'

const props = defineProps({
  // 单个区块数据（content-schema 的 block）
  block: { type: Object, required: true },
  // 页面上下文（学科/单元/页面标识），供测验/练习等交互区块记录成绩与错题
  context: { type: Object, default: () => ({}) }
})

// 解析当前区块对应的组件；未知类型返回 null（走显式降级分支）
const resolver = computed(() => componentOf(props.block.type))
</script>

<style>
/* 异步区块占位（重量级区块懒加载期间 / 失败时） */
.block-async-loading {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 32px; color: var(--text-muted); font-size: 0.9rem;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); margin-bottom: var(--spacer-12);
}
.block-async-error {
  padding: 24px; text-align: center; color: var(--danger);
  font-size: 0.9rem; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); margin-bottom: var(--spacer-12);
}
/* 未知区块类型提示：开发期暴露内容错误，同时不影响读者阅读其他区块 */
.block-unknown {
  padding: 16px 20px; color: var(--danger); font-size: 0.9rem;
  background: var(--surface); border: 1px dashed var(--danger);
  border-radius: var(--radius-md); margin-bottom: var(--spacer-12);
}
</style>
