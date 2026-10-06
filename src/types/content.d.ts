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
  | 'errorfocus' // 易错专项
  | 'strategy'   // 考试技巧
  | 'exam'       // 模拟卷
  | 'desmos'     // 演练场（GeoGebra 图形计算器）
  | 'columns'    // 多栏容器
  | 'group'      // 分组容器
  | 'steps'      // 编号步骤条
  | 'summary'    // 一页速记
  | 'compare'    // 双栏中性对照
  | 'vocab'      // 术语卡
  | 'code'       // 代码块
  | 'cloze'      // 挖空默写

/** 难度等级 */
export type Difficulty = 'basic' | 'medium' | 'advanced' | 'sprint'

/** 题型 */
export type QuestionType = 'single' | 'judge' | 'fill' | 'solve'

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
  variant?: 'plain' | 'definition' | 'aside' // 变体：默认/定义（左细线）/补充说明（降字号降色）
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
  difficulty?: Difficulty // 难度
}

/** 例题区块 */
export interface ExampleBlock extends BaseBlock {
  type: 'example'
  variant?: 'full' | 'compact' // 变体：完整 / 紧凑
  items: ExampleItem[]
}

/** 测验题目条目 */
export interface QuizItem {
  type?: QuestionType   // 题型：单选/判断/填空
  difficulty?: Difficulty
  question: string      // 题目内容
  options?: string[]    // 选择题选项
  correctIndex?: number // 选择题正确选项索引
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
  boardId: string       // JSXGraph 画板 ID（对应 src/geometry/boards/<boardId>.js 模块）
  caption?: string      // 图注
}

/** 演练场区块（GeoGebra 图形计算器） */
export interface DesmosBlock extends BaseBlock {
  type: 'desmos'
  initialExpressions?: string[] // 初始表达式列表（LaTeX）
}

/** 易错专项条目 */
export interface ErrorFocusItem {
  scenario: string      // 易错场景
  commonMistake: string // 常见错误
  correctApproach: string // 正确思路
  tip?: string          // 避坑提示
}

/** 易错专项区块 */
export interface ErrorFocusBlock extends BaseBlock {
  type: 'errorfocus'
  items: ErrorFocusItem[]
}

/** 考试技巧条目 */
export interface StrategyItem {
  title: string         // 技巧标题
  content: string       // 技巧内容
}

/** 考试技巧区块 */
export interface StrategyBlock extends BaseBlock {
  type: 'strategy'
  items: StrategyItem[]
}

/** 模拟卷题目条目 */
export interface ExamItem {
  type?: 'single' | 'judge' | 'fill' | 'solve'
  difficulty?: Difficulty
  question: string
  options?: string[]
  correctIndex?: number
  answer: string
  score?: number        // 本题分值
}

/** 模拟卷区块 */
export interface ExamBlock extends BaseBlock {
  type: 'exam'
  duration?: number     // 考试时长（分钟）
  totalScore?: number   // 满分
  passingScore?: number // 及格分
  items: ExamItem[]
}

/** 多栏容器区块：items 为「每列一个区块数组」 */
export interface ColumnsBlock extends BaseBlock {
  type: 'columns'
  cols?: 2 | 3           // 桌面端列数；窄屏自动降单列
  gap?: 'normal' | 'tight' // 列间距
  items: Block[][]       // 每列是一个区块数组，长度必须与 cols 一致
}

/** 分组容器区块 */
export interface GroupBlock extends BaseBlock {
  type: 'group'
  variant?: 'band' | 'collapse' // band=分组带；collapse=可折叠分组
  collapsed?: boolean    // collapse 变体初始是否折叠
  items: Block[]         // 组内区块
}

/** 编号步骤条目 */
export interface StepItem {
  title: string         // 步骤标题（一句话说明这一步做什么）
  content?: string      // 步骤说明（可选，支持加粗与 LaTeX）
}

/** 编号步骤条区块（序号由渲染层生成） */
export interface StepsBlock extends BaseBlock {
  type: 'steps'
  items: StepItem[]
}

/** 一页速记区块：三段均为可选，但至少一段非空 */
export interface SummaryBlock extends BaseBlock {
  type: 'summary'
  points?: string[]     // 速记要点
  formulas?: string[]   // 必背公式（LaTeX，块级居中）
  mustKnow?: string[]   // 必记结论
}

/** 对照维度条目 */
export interface CompareAspect {
  label: string         // 对照维度：如「适用场景」
  left: string          // 左侧说法
  right: string         // 右侧说法
}

/** 双栏中性对照区块（左右地位对等，不分对错） */
export interface CompareBlock extends BaseBlock {
  type: 'compare'
  left: string          // 左侧名称
  right: string         // 右侧名称
  aspects: CompareAspect[]
}

/** 术语条目 */
export interface VocabItem {
  term: string          // 术语
  pinyin?: string       // 读音（拼音或英文读法）
  meaning: string       // 释义
  example?: string      // 例句
  note?: string         // 备注（易混点 / 记忆提示）
}

/** 术语卡区块 */
export interface VocabBlock extends BaseBlock {
  type: 'vocab'
  items: VocabItem[]
}

/** 代码块（等宽显示 + 复制按钮，不做语法高亮） */
export interface CodeBlock extends BaseBlock {
  type: 'code'
  lang?: string          // 语言标签（仅角标显示）
  code: string           // 代码文本（不写行号与围栏）
}

/** 挖空条目：用 {{答案}} 标出空位 */
export interface ClozeItem {
  text: string           // 如「海内存知己，{{天涯若比邻}}。」
}

/** 挖空默写区块（点击空位揭晓） */
export interface ClozeBlock extends BaseBlock {
  type: 'cloze'
  items: ClozeItem[]
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
  | ErrorFocusBlock
  | StrategyBlock
  | ExamBlock
  | DesmosBlock
  | ColumnsBlock
  | GroupBlock
  | StepsBlock
  | SummaryBlock
  | CompareBlock
  | VocabBlock
  | CodeBlock
  | ClozeBlock

/** 内容页面 */
export interface ContentPage {
  id: string            // 页面唯一标识，如 'math-01-01'
  unitNum: string       // 所属单元编号
  subject: 'math' | 'chinese' | 'computer'
  title: string         // 页面标题
  subtitle: string      // 页面副标题
  icon?: string         // 页面图标（emoji）
  blocks: Block[]       // 区块列表
}

/** 默认导出类型 */
declare const contentPage: ContentPage
export default contentPage
