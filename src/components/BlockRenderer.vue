<!--
  BlockRenderer —— 内容区块分发器（低代码渲染核心）
  职责：
   - 根据区块的 type 字段动态分发到对应渲染组件
   - 这是"Schema 驱动渲染"的枢纽：内容只描述数据，渲染由组件决定
   - 新增区块类型时，只需在此注册映射即可
-->
<template>
  <component :is="resolver" v-if="resolver" :block="block" :context="context" />
</template>

<script setup>
import { computed } from 'vue'
// 引入全部区块渲染组件
import ObjectivesBlock from './blocks/ObjectivesBlock.vue'
import KnowledgeBlock from './blocks/KnowledgeBlock.vue'
import FormulaCard from './blocks/FormulaCard.vue'
import TableBlock from './blocks/TableBlock.vue'
import WarningBlock from './blocks/WarningBlock.vue'
import TipBlock from './blocks/TipBlock.vue'
import ExampleBlock from './blocks/ExampleBlock.vue'
import QuizBlock from './blocks/QuizBlock.vue'
import MindMapBlock from './blocks/MindMapBlock.vue'
import GeometryBlock from './blocks/GeometryBlock.vue'
import ErrorFocusBlock from './blocks/ErrorFocusBlock.vue'
import StrategyBlock from './blocks/StrategyBlock.vue'
import ExamBlock from './blocks/ExamBlock.vue'
import DesmosBlock from './blocks/DesmosBlock.vue'

const props = defineProps({
  // 单个区块数据（content-schema 的 block）
  block: { type: Object, required: true },
  // 页面上下文（学科/单元/页面标识），供交互区块记录 XP 与错题
  context: { type: Object, default: () => ({}) }
})

// 区块类型 → 组件 映射表（新增类型在此注册）
const BLOCK_MAP = {
  objectives: ObjectivesBlock, // 学习目标
  knowledge: KnowledgeBlock,   // 知识点段落
  formula: FormulaCard,        // 公式卡片
  table: TableBlock,           // 表格
  warning: WarningBlock,       // 警告提示
  tip: TipBlock,               // 提示
  example: ExampleBlock,     // 典型例题
  quiz: QuizBlock,           // 快速检测/练习
  mindmap: MindMapBlock,     // 思维导图
  diagram: GeometryBlock,    // 几何演示（JSXGraph）
  errorfocus: ErrorFocusBlock, // 易错专项
  strategy: StrategyBlock,     // 考试技巧
  exam: ExamBlock,              // 模拟卷
  desmos: DesmosBlock           // Desmos 图形计算器演练场
}

// 解析当前区块对应的组件；未知类型返回 null（安全降级）
const resolver = computed(() => BLOCK_MAP[props.block.type] || null)
</script>