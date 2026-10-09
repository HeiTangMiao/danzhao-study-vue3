/**
 * 练习题库的形状定义（纯 ESM，零 import —— 构建脚本与浏览器两端共用）
 *
 * 背景（P6）：练习 Tab 需要一份「可组卷的题库快照」——从 src/content 全部
 * quiz / exam 区块抽取题目并附加来源坐标，产出到 public/practice-bank/ 下。
 * 与 searchIndex.js 同一纪律：分片路径、条目键、字段上限三方（构建脚本 /
 * 运行时加载器 / 测试）必须看法一致，所以只在这里定义一次。
 *
 * ⚠️ 本文件刻意不 import 任何模块：scripts/build-practice-bank.mjs 会直接
 *    import 它，一旦引入依赖链就会把浏览器侧代码拖进 Node 构建进程。
 *
 * CSP 约束（script-src 'self'）：产物是 JSON，运行时 fetch + JSON.parse，
 * 禁止动态 import() 消费。
 */

/** 题干上限（字符）：超过截断，构建脚本会 console.warn 点名（超限必报告纪律） */
export const QUESTION_LIMIT = 2000

/** 答案 / 解析上限（字符）：同上 */
export const ANSWER_LIMIT = 4000

/** 分片目录名（public/ 下的相对路径前缀） */
export const BANK_DIR = 'practice-bank'

/** 汇总索引文件：小（学科题量 + 真题卷清单），练习首页常驻加载 */
export const BANK_INDEX_FILE = 'practice-bank/index.json'

/**
 * 学科分片路径（public/ 下的相对路径）
 * @param {string} subject 学科 key（math / chinese / computer）
 */
export function practiceShardPath(subject) {
  return `practice-bank/${subject}.json`
}

/**
 * 分片内条目的键：unitNum/fileIndex 定位页面，blockIndex 为该页内
 * quiz/exam 区块的流水号，itemIndex 为区块内题目下标 —— 四段拼出学科内唯一键
 * @param {{unitNum: string, fileIndex: number}} meta 页面元信息
 * @param {number} blockIndex 页内 quiz/exam 区块流水号
 * @param {number} itemIndex 区块内题目下标
 */
export function practiceKeyOf(meta, blockIndex, itemIndex) {
  return `${meta.unitNum}/${meta.fileIndex}/${blockIndex}/${itemIndex}`
}

/**
 * 会话内去重键：同一 fileKey + question 在一组卷内不重复出现（prd-mobile §5.6 规则 1）
 * @param {{fileKey: string, question: string}} item 题库条目
 */
export function paperKeyOf(item) {
  return `${item.fileKey}|${item.question}`
}

/**
 * 产物条目使用紧凑单字母键（1393 题 × LaTeX 文本，键名瘦身直接换加载体积）。
 * 此映射是「紧凑键 → 运行时字段名」的唯一对照表，normalizeBankItem 据此展开。
 */
export const BANK_ITEM_KEYS = {
  k: 'key', // practiceKeyOf 产物，学科内唯一
  s: 'subject',
  u: 'unitNum',
  ut: 'unitTitle',
  fi: 'fileIndex', // 回看知识点路由参数 /study/:subject/:unitNum/:fileIndex
  fk: 'fileKey', // recordError 去重键 + recordAnswered 页面累计（必须传）
  ft: 'fileTitle',
  bt: 'blockTitle',
  q: 'question',
  o: 'options',
  ci: 'correctIndex',
  a: 'answer', // 「答案 + 解析」整段，直接填 recordError 的 explanation
  d: 'difficulty',
  it: 'itemType', // 内容侧题型：single / judge / fill / solution 等
  g: 'gradable', // 有 options 且有 correctIndex → 可机器判分
  dv: 'derived', // 判断题构建期派生而来（A-1，布尔）
  vf: 'verified', // 派生结论已人工核验（A-4；仅对 dv:true 有意义，缺省不写）
  nz: 'normalizable', // fill 题构建期标注：期望值抽取非空（B-2，统计口径；缺省不写）
  sr: 'source' // 'quiz' | 'exam'（自动组卷默认排除 exam，见 prd-mobile §5.6）
}

/**
 * 紧凑条目 → 运行时条目（字段全名 + 类型规整）
 * @param {object} raw 分片 JSON 里的一条
 * @returns {object} 运行时条目
 */
export function normalizeBankItem(raw) {
  const item = {}
  for (const [short, full] of Object.entries(BANK_ITEM_KEYS)) {
    if (raw[short] !== undefined) item[full] = raw[short]
  }
  item.gradable = !!raw.g
  item.source = raw.sr || 'quiz'
  item.difficulty = raw.d || ''
  item.options = Array.isArray(raw.o) ? raw.o : null
  item.correctIndex = typeof raw.ci === 'number' ? raw.ci : undefined
  // 派生/核验/可规整标记：缺省即 false（紧凑键缺失时不污染运行时口径）
  item.derived = raw.dv === true
  item.verified = raw.vf === true
  item.normalizable = raw.nz === true
  return item
}
