/**
 * 区块类型清单（纯数据，零依赖）
 * 职责：
 *  - 「有哪些区块类型、中文名与目录图标是什么」的唯一真相源
 *  - 供 registry（绑定渲染组件）、UnitView（本页目录）
 *    以及测试脚本读取
 * 刻意不 import 任何组件：这样测试与工具链读取类型清单时不会连带加载整个渲染层
 * 约定：
 *  - type 取值必须与 schema/content-schema.json 中 block.type.enum 完全一致，
 *    由 tests/block-registry.test.js 守护 —— 任一处漏改 CI 立即失败
 */

/**
 * 类型 → { label 中文名, icon 目录图标 }
 * icon 为空字符串表示「该类型不进入本页目录」
 */
export const BLOCK_TYPES_META = {
  mindmap: { label: '思维导图', icon: '🧠' },
  objectives: { label: '学习目标', icon: '🎯' },
  knowledge: { label: '知识点', icon: '📖' },
  formula: { label: '公式', icon: '🧮' },
  table: { label: '表格', icon: '📊' },
  warning: { label: '警告', icon: '⚠️' },
  tip: { label: '提示', icon: '💡' },
  example: { label: '例题', icon: '📝' },
  quiz: { label: '题目', icon: '✏️' },
  diagram: { label: '几何演示', icon: '📐' },
  errorfocus: { label: '易错专项', icon: '🚨' },
  strategy: { label: '考试技巧', icon: '🎯' },
  exam: { label: '模拟卷', icon: '📝' },
  // 容器型区块：不进入本页目录（目录只收有具体内容的区块）
  columns: { label: '多栏', icon: '' },
  group: { label: '分组', icon: '' },
  // 布局原语（P0）：与容器同属「排布」而非「内容」，同样不进本页目录
  layout: { label: '布局', icon: '' },
  // 结构型区块（阶段 5）：步骤条 / 速记卡 / 对比 / 术语卡 / 代码 / 挖空都是正文型内容，进本页目录
  steps: { label: '步骤条', icon: '🔢' },
  summary: { label: '一页速记', icon: '📌' },
  compare: { label: '对比', icon: '⚖' },
  vocab: { label: '术语卡', icon: '📕' },
  code: { label: '代码', icon: '💻' },
  cloze: { label: '挖空默写', icon: '🖊' }
}

/** 全部区块类型（顺序与 BLOCK_TYPES_META 一致） */
export const BLOCK_TYPES = Object.keys(BLOCK_TYPES_META)

/**
 * 取区块类型的中文名；未知类型原样返回 type
 * @param {string} type 区块类型
 */
export function labelOf(type) {
  return BLOCK_TYPES_META[type]?.label || type
}

/**
 * 取区块类型的目录图标；未知类型或未配置图标时返回空字符串
 * @param {string} type 区块类型
 */
export function iconOf(type) {
  return BLOCK_TYPES_META[type]?.icon || ''
}
