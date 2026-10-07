<!--
  LayoutRenderer —— 布局原语分发器（P0 布局层）
  职责：
   - 按区块的 as 字段把 children 交给对应原语组件（grid / stack / split / hero / bleed / rail）
   - children 的**递归渲染**不在这里做
  说明：本组件**不 import BlockRenderer** —— 子区块由 BlockRenderer.vue 自引用递归渲染后
       经默认插槽注入（与 ColumnsBlock / GroupBlock 同一约定），避免循环依赖：
       若此处 import BlockRenderer，会与 BlockRenderer → LayoutRenderer 形成环，
       模块求值顺序会让 registry 的 resolver 拿到 undefined。
-->
<template>
  <component :is="layoutComponent" v-if="layoutComponent" :block="block">
    <slot />
  </component>
  <!-- 未知 as：显式提示，与 BlockRenderer 的未知 type 提示保持同一种降级策略 -->
  <div v-else class="block-unknown">未知布局原语：{{ block.as || '(缺少 as)' }}</div>
</template>

<script setup>
import { computed } from 'vue'
// 布局样式随分发器一起进入产物；放这里而非 main.css，是因为布局原语是「可独立上线」的
// P0 单元 —— 引入/移除本层不应触碰全局样式入口（main.css 归 P1 所有）。
import '@/assets/css/layouts.css'
import GridLayout from './layouts/GridLayout.vue'
import StackLayout from './layouts/StackLayout.vue'
import SplitLayout from './layouts/SplitLayout.vue'
import HeroLayout from './layouts/HeroLayout.vue'
import BleedLayout from './layouts/BleedLayout.vue'
import RailLayout from './layouts/RailLayout.vue'

const props = defineProps({
  // 布局区块数据：{ type:'layout', as, props?, title?, children:[区块|layout,...] }
  block: { type: Object, required: true }
})

/** as → 原语组件；取值域与 schema 的 definitions.layoutKind 一致 */
const LAYOUT_COMPONENTS = {
  grid: GridLayout,
  stack: StackLayout,
  split: SplitLayout,
  hero: HeroLayout,
  bleed: BleedLayout,
  rail: RailLayout
}

const layoutComponent = computed(() => LAYOUT_COMPONENTS[props.block.as] || null)
</script>
