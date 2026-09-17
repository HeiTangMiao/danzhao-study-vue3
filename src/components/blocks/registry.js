/**
 * 区块渲染注册表 —— 类型与渲染组件的绑定
 * 职责：
 *  - 把 blockTypes.js 的类型清单与具体渲染组件绑定起来，供 BlockRenderer 分发使用
 *  - 类型的中文名 / 目录图标来自 blockTypes.js，此处不重复定义
 * 约定：
 *  - 新增区块类型 = schema 加字段分支 + blockTypes.js 加一行 + 本文件加一行 + 新建组件
 *  - 绑定是否完整由 tests/block-registry.test.js 守护
 */
import { BLOCK_TYPES, BLOCK_TYPES_META, labelOf, iconOf } from './blockTypes'
import { asyncBlock } from './asyncBlock'
import ObjectivesBlock from './ObjectivesBlock.vue'
import KnowledgeBlock from './KnowledgeBlock.vue'
import FormulaCard from './FormulaCard.vue'
import TableBlock from './TableBlock.vue'
import WarningBlock from './WarningBlock.vue'
import TipBlock from './TipBlock.vue'
import ExampleBlock from './ExampleBlock.vue'
import QuizBlock from './QuizBlock.vue'
import MindMapBlock from './MindMapBlock.vue'
import ErrorFocusBlock from './ErrorFocusBlock.vue'
import StrategyBlock from './StrategyBlock.vue'
import ExamBlock from './ExamBlock.vue'
import DesmosBlock from './DesmosBlock.vue'
import ColumnsBlock from './ColumnsBlock.vue'
import GroupBlock from './GroupBlock.vue'
import StepsBlock from './StepsBlock.vue'
import SummaryBlock from './SummaryBlock.vue'

/**
 * 类型 → 渲染组件
 * 说明：低频 / 体积大的区块用 asyncBlock 包装，避免挤进内容页主 chunk
 */
const BLOCK_COMPONENTS = {
  mindmap: MindMapBlock,
  objectives: ObjectivesBlock,
  knowledge: KnowledgeBlock,
  formula: FormulaCard,
  table: TableBlock,
  warning: WarningBlock,
  tip: TipBlock,
  example: ExampleBlock,
  quiz: QuizBlock,
  // 几何演示（JSXGraph 约 1MB）按需加载
  diagram: asyncBlock(() => import('./GeometryBlock.vue')),
  errorfocus: ErrorFocusBlock,
  strategy: StrategyBlock,
  exam: ExamBlock,
  desmos: DesmosBlock,
  // 容器型区块：由 BlockRenderer 内部自引用递归（registry 绑定仅为完整性，
  // BlockRenderer 在模板里用 v-if 分支处理，不会走到这里的 component）
  columns: ColumnsBlock,
  group: GroupBlock,
  // 结构型区块（阶段 5）
  steps: StepsBlock,
  summary: SummaryBlock
}

/** 类型 → { component, label, icon }：渲染层视角的完整注册表 */
export const BLOCK_REGISTRY = Object.fromEntries(
  BLOCK_TYPES.map((type) => [
    type,
    { component: BLOCK_COMPONENTS[type] || null, ...BLOCK_TYPES_META[type] }
  ])
)

/**
 * 取区块类型对应的渲染组件；未知类型或未绑定组件时返回 null
 * （由调用方决定如何降级，BlockRenderer 会渲染「未知区块类型」提示）
 * @param {string} type 区块类型
 */
export function componentOf(type) {
  return BLOCK_COMPONENTS[type] || null
}

export { BLOCK_TYPES, labelOf, iconOf }
