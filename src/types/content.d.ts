/**
 * 内容 Schema 类型定义
 * 对应 schema/content-schema.json，供 IDE 智能提示与类型检查使用
 * 项目当前使用 .js 文件，通过 .d.ts 声明文件获得类型支持
 */

/** 区块类型枚举 */
export type BlockType =
  | 'mindmap'    // 思维导图
  | 'objectives' // 学习目标
  | 'knowledge'  // 知识点
  | 'formula'    // 公式
  | 'table'      // 表格
  | 'warning'    // 警告
  | 'tip'        // 提示
  | 'example'    // 例题
  | 'quiz'       // 练习题
  | 'diagram'    // 可视化图
  | 'divider'    // 分割线

/** 难度等级 */
export type Difficulty = 'basic' | 'medium' | 'advanced'

/** 通用区块基础接口 */
export interface BaseBlock {
  type: BlockType
  title?: string
}

/** 思维导图区块 */
export interface MindMapBlock extends BaseBlock {
  type: 'mindmap'
  mermaid: string      // Mermaid 语法代码
}

/** 学习目标区块 */
export interface ObjectivesBlock extends BaseBlock {
  type: 'objectives'
  items: string[]      // 目标列表
}

/** 知识点区块 */
export interface KnowledgeBlock extends BaseBlock {
  type: 'knowledge'
  paragraphs: string[] // 段落列表
}

/** 公式区块 */
export interface FormulaBlock extends BaseBlock {
  type: 'formula'
  formulas: string[]   // LaTeX 公式列表
}

/** 表格区块 */
export interface TableBlock extends BaseBlock {
  type: 'table'
  headers: string[]     // 表头
  rows: string[][]      // 行数据
}

/** 警告 / 提示区块 */
export interface TextBlock extends BaseBlock {
  type: 'warning' | 'tip'
  text: string
}

/** 例题条目 */
export interface ExampleItem {
  title?: string
  question: string      // 题干
  solution?: string     // 解答过程
  answer?: string       // 最终答案
}

/** 例题区块 */
export interface ExampleBlock extends BaseBlock {
  type: 'example'
  items: ExampleItem[]
}

/** 测验题目条目 */
export interface QuizItem {
  difficulty?: Difficulty
  question: string      // 题目内容
  answer: string        // 答案与解析
}

/** 练习题区块 */
export interface QuizBlock extends BaseBlock {
  type: 'quiz'
  items: QuizItem[]
}

/** 可视化图区块 */
export interface DiagramBlock extends BaseBlock {
  type: 'diagram'
  boardId: string       // JSXGraph 画板 ID
  initCode: string      // JSXGraph 初始化代码
  caption?: string      // 图注
}

/** 分割线区块 */
export interface DividerBlock extends BaseBlock {
  type: 'divider'
}

/** 区块联合类型 */
export type Block =
  | MindMapBlock
  | ObjectivesBlock
  | KnowledgeBlock
  | FormulaBlock
  | TableBlock
  | TextBlock
  | ExampleBlock
  | QuizBlock
  | DiagramBlock
  | DividerBlock

/** 内容页面 */
export interface ContentPage {
  id: string            // 页面唯一标识，如 'math-01-01'
  unitNum: string       // 所属单元编号
  subject: 'math' | 'chinese'
  title: string         // 页面标题
  subtitle: string      // 页面副标题
  icon?: string         // 页面图标（emoji）
  blocks: Block[]       // 区块列表
}

/** 默认导出类型 */
declare const contentPage: ContentPage
export default contentPage