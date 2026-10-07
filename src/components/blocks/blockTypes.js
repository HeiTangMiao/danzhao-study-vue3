/**
 * 区块类型清单（纯数据，零依赖）
 * 职责：
 *  - 「有哪些区块类型、中文名、目录图标、内容角色是什么」的唯一真相源
 *  - 供 registry（绑定渲染组件）、UnitView（本页目录 / data-kind）
 *    以及测试脚本读取
 * 刻意不 import 任何组件：这样测试与工具链读取类型清单时不会连带加载整个渲染层
 * 约定：
 *  - type 取值必须与 schema/content-schema.json 中 block.type.enum 完全一致，
 *    由 tests/block-registry.test.js 守护 —— 任一处漏改 CI 立即失败
 *  - kind 取值必须是 BLOCK_KINDS 之一，或该 type 出现在 KIND_EXEMPT 里（同样有守卫）
 */

/**
 * 五种内容角色（system_design §5.6.2 已定稿的值域；PRD 侧跟随此命名）
 *
 * 存在的理由：22 个 type 改造前在视觉上几乎无差别，长页里「概念 / 要点 / 例题 /
 * 练习 / 提示」混成一片，读者抓不到节奏。T3 把它们归并为 5 个角色，差异化全部
 * 交给 CSS 的 [data-kind] —— 不新增原语、不改 schema、不动存量内容结构
 * （§5.6.2 的 L1 纯 CSS 路线）。
 *
 * 每个角色的形态差异由四个变量决定，见 blocks.css「内容角色差异化」段。
 */
export const BLOCK_KINDS = ['concept', 'point', 'example', 'practice', 'note']

/**
 * 显式豁免清单：这些 type **刻意不输出 data-kind**（值为豁免理由，便于报错时点名）
 *
 * 为什么豁免而不是给个兜底角色：
 *  - 布局类（columns / group / layout）描述的是「怎么排」而非「是什么内容」，
 *    它们**没有**内容语义角色；
 *  - 功能区块（exam / diagram / code）形态自成一体，硬塞进任一角色都会被
 *    「要点卡片化」之类的规则误样式化。
 *
 * 为什么写成显式清单而不是「没写 kind 就算豁免」：
 *  加新 type 时漏配 kind 是最常见的错误。显式清单让守卫能把「漏配」判成失败
 *  （并要求来这里补一行理由），而不是静默放行 —— 静默放行等于把错误推给读者。
 */
export const KIND_EXEMPT = {
  columns: '布局类：多栏并列，无内容语义角色',
  group: '布局类：松散分组，无内容语义角色',
  layout: '布局类：P0 布局原语，无内容语义角色',
  exam: '功能区块：自带计时/评分形态，不套内容角色样式',
  diagram: '功能区块：图形视口，不套内容角色样式',
  code: '功能区块：代码块，不套内容角色样式'
}

/**
 * 类型 → { label 中文名, icon 目录图标, kind 内容角色 }
 * icon 为空字符串表示「该类型不进入本页目录」
 * icon 取值为 Lucide 官方图标名（P2-T1 起数据层去 emoji 化）：
 * 消费方（UnitView 本页目录等）经 AppIcon 以声明式 <svg> 渲染，
 * 名称必须存在于 icons/lucide-paths.js 的 ICON_SHAPES（由 tests/block-registry.test.js 守护）
 * kind 缺省（不写）表示无内容角色 —— 只有 KIND_EXEMPT 里点名的类型可以这样，
 * 未列出的类型一旦漏配 kind，守卫会直接失败
 */
export const BLOCK_TYPES_META = {
  mindmap: { label: '思维导图', icon: 'network', kind: 'concept' },
  objectives: { label: '学习目标', icon: 'target', kind: 'concept' },
  knowledge: { label: '知识点', icon: 'book-open', kind: 'concept' },
  formula: { label: '公式', icon: 'calculator', kind: 'point' },
  table: { label: '表格', icon: 'table', kind: 'point' },
  warning: { label: '警告', icon: 'triangle-alert', kind: 'note' },
  tip: { label: '提示', icon: 'lightbulb', kind: 'note' },
  example: { label: '例题', icon: 'file-text', kind: 'example' },
  quiz: { label: '题目', icon: 'circle-help', kind: 'practice' },
  // 无内容角色（见 KIND_EXEMPT）：功能区块自成形态，不套角色样式
  diagram: { label: '几何演示', icon: 'compass' },
  errorfocus: { label: '易错专项', icon: 'siren', kind: 'note' },
  strategy: { label: '考试技巧', icon: 'target', kind: 'concept' },
  exam: { label: '模拟卷', icon: 'clipboard-list' },
  // 容器型区块：不进入本页目录（目录只收有具体内容的区块）；无内容角色
  columns: { label: '多栏', icon: '' },
  group: { label: '分组', icon: '' },
  // 布局原语（P0）：与容器同属「排布」而非「内容」，同样不进本页目录、无内容角色
  layout: { label: '布局', icon: '' },
  // 结构型区块（阶段 5）：步骤条 / 速记卡 / 对比 / 术语卡 / 代码 / 挖空都是正文型内容，进本页目录
  steps: { label: '步骤条', icon: 'list-ordered', kind: 'point' },
  summary: { label: '一页速记', icon: 'pin', kind: 'point' },
  compare: { label: '对比', icon: 'scale', kind: 'point' },
  vocab: { label: '术语卡', icon: 'book-marked', kind: 'concept' },
  // 无内容角色（见 KIND_EXEMPT）：代码块自带终端/语言栏形态
  code: { label: '代码', icon: 'code' },
  cloze: { label: '挖空默写', icon: 'square-pen', kind: 'point' }
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

/**
 * 取区块类型的内容角色（data-kind 的取值）；无角色时返回空字符串。
 *
 * 为什么用空字符串而不是 undefined：Vue 对 null/undefined 的属性绑定会
 * **整个省略该属性**，正是这里想要的效果 —— 无角色的区块在 DOM 上不带
 * data-kind，CSS 的 [data-kind=...] 因此不会命中它，天然不会被误样式化。
 *
 * @param {string} type 区块类型
 * @returns {string} BLOCK_KINDS 之一，或 ''
 */
export function kindOf(type) {
  return BLOCK_TYPES_META[type]?.kind || ''
}
