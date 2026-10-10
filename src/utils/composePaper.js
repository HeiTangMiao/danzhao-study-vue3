/**
 * 自动组卷纯函数集（P6，prd-mobile §5.6）
 *
 * 设计约束（每一条都有对应的验收/测试）：
 *  - 带种子确定性随机（mulberry32，自实现、禁 eval）→ 同一 seed 重放结果完全一致
 *  - 难度分布 基础 50% / 中等 35% / 较难 15%（最大余数法精确到题，偏差 0 ≤ ±2）
 *  - 单元加权：weakAreas Top5 的错题数越多，该单元被抽取概率越高
 *  - 会话内去重：同一 fileKey + question 在一组内不重复
 *  - 真题卷隔离：默认排除 source === 'exam'，显式 includeExam 才纳入
 *
 * 纯函数、零 Vue 依赖：tests/compose-paper.test.js 直测，浏览器与测试共用。
 */
import { paperKeyOf } from '@/content/practiceBank'

/** 难度分布基准（prd-mobile §5.6 组卷策略表） */
export const DIFFICULTY_RATIO = { basic: 0.5, medium: 0.35, advanced: 0.15 }

/** 组卷参与的难度桶。sprint 归入 advanced：分布表只有三档，冲刺题属最难一档 */
const BUCKETS = ['basic', 'medium', 'advanced']

/**
 * mulberry32 —— 带种子的确定性 PRNG（32 位，自实现，不引入依赖、不用 eval）
 * @param {number} seed 任意整数
 * @returns {() => number} [0, 1) 均匀分布
 */
export function mulberry32(seed) {
  let a = Number(seed) >>> 0
  if (a === 0) a = 0x9e3779b9 // seed=0 会让前几步恒等，挪一下保证序列质量
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 加权维度（D-3，P1-14）：unit 单元级（既有）/ kp 考点级。
 * 单一来源 —— 视图与 store 不得内联 'unit' / 'kp' 字符串比较（H7）。
 */
export const WEIGHT_DIMENSIONS = { UNIT: 'unit', KP: 'kp' }

/**
 * 权重键（维度决定分组键）。kp 维度用 item.kp（构建期 = fileKey）。
 * ⚠️ 用 item.kp（题目标签）而非用户归因 error.kp —— 二者不同源，见 weakWeightsFromErrors。
 * @param {{subject:string, unitNum?:string, kp?:string}} item
 * @param {'unit'|'kp'} [dimension=WEIGHT_DIMENSIONS.UNIT]
 * @returns {string}
 */
export function weightKeyOf(item, dimension = WEIGHT_DIMENSIONS.UNIT) {
  if (dimension === WEIGHT_DIMENSIONS.KP) return `${item.subject}|${item.kp}`
  return `${item.subject}|${item.unitNum}`
}

/** 单元权重键：与 Dashboard weakAreas 的「学科|单元」聚合口径一致（转调 weightKeyOf，引用不破） */
export function unitWeightKeyOf(item) {
  return weightKeyOf(item, WEIGHT_DIMENSIONS.UNIT)
}

/**
 * 由错题本聚合权重（Top5，按错题数加权；非 Top5 权重缺省 1）
 *
 * ⚠️ 本批最大陷阱（batch-d-tasks §0.1）：kp 维度的聚合键 = **error.fileKey**
 *   （= 题目 kp 同源），**不是** error.kp —— error.kp 是 A-3 用户自由文本归因标签
 *   （如「一元二次」），与题目 kp（fileKey，如 'math_11_03-椭圆'）永不匹配，
 *   用错这一列会让权重恒 1、组卷静默退化为均匀抽取（不报错，最难发现）。
 * @param {Array<{subject:string, unitNum?:string, fileKey?:string}>} errors 错题记录
 * @param {number} [topN=5]
 * @param {'unit'|'kp'} [dimension=WEIGHT_DIMENSIONS.UNIT]
 * @returns {Record<string, number>} 形如 { 'math|02': 7 } 或 { 'math|math_11_03-椭圆': 7 }
 */
export function weakWeightsFromErrors(errors, topN = 5, dimension = WEIGHT_DIMENSIONS.UNIT) {
  const keyOf =
    dimension === WEIGHT_DIMENSIONS.KP
      ? (e) => `${e.subject}|${e.fileKey}` // kp 维度：按 error 的 fileKey 聚合（= 题目 kp 同源）
      : (e) => `${e.subject}|${e.unitNum}`
  const counts = new Map()
  for (const e of errors || []) {
    if (!e || !e.subject) continue
    const key = keyOf(e)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const weights = {}
  for (const [key, count] of counts) weights[key] = count
  // 只保留 Top5：其余分组回落到基准权重 1（弱项权重 ≥2，天然高于基准）
  return Object.fromEntries(
    Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
  )
}

/**
 * 薄弱专项清单（与 DashboardView weakAreas 同口径：按学科+单元聚合、降序 Top5）
 * @returns {Array<{subject: string, unitNum: string, count: number}>}
 */
export function weakAreasOf(errors, topN = 5) {
  const counts = new Map()
  for (const e of errors || []) {
    if (!e || !e.subject) continue
    const key = `${e.subject}|${e.unitNum}`
    if (!counts.has(key)) counts.set(key, { subject: e.subject, unitNum: e.unitNum, count: 0 })
    counts.get(key).count++
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, topN)
}

/**
 * 难度配额：最大余数思想——先 round 前两档，尾差全给最末档，保证三档之和恒等于 count
 * @param {number} count 总题量
 * @param {string} difficulty 显式难度过滤时该档拿满全部配额
 * @returns {Record<string, number>}
 */
export function quotaOf(count, difficulty = '') {
  const targets = { basic: 0, medium: 0, advanced: 0 }
  if (difficulty && BUCKETS.includes(difficulty)) {
    targets[difficulty] = count
    return targets
  }
  const basic = Math.round(count * DIFFICULTY_RATIO.basic)
  const medium = Math.round(count * DIFFICULTY_RATIO.medium)
  targets.basic = basic
  targets.medium = medium
  targets.advanced = count - basic - medium // 尾差兜底（恒 ≥0：50%+35% < 100%）
  return targets
}

/**
 * 加权无放回抽取：从 bucket 内按权重抽 1 题（抽中即移除）
 * 权重缺省 1，weakAreas 分组 = 错题数（≥1）。Map/数组的遍历顺序确定，配合种子可重放。
 * @param {Array} bucket 候选（会被 splice 原地修改）
 * @param {Record<string, number>} weights 权重表（键由 weightKeyOf 生成）
 * @param {() => number} rng 随机源
 * @param {'unit'|'kp'} [dimension=WEIGHT_DIMENSIONS.UNIT] 权重维度（决定分组键）
 */
function weightedPick(bucket, weights, rng, dimension = WEIGHT_DIMENSIONS.UNIT) {
  let total = 0
  const weightList = new Array(bucket.length)
  for (let i = 0; i < bucket.length; i++) {
    const w = Math.max(1, Number(weights[weightKeyOf(bucket[i], dimension)]) || 1)
    weightList[i] = w
    total += w
  }
  let r = rng() * total
  for (let i = 0; i < bucket.length; i++) {
    r -= weightList[i]
    if (r < 0 || i === bucket.length - 1) return bucket.splice(i, 1)[0]
  }
  return bucket.pop()
}

/** Fisher-Yates 洗牌（用注入的 rng，保证可重放） */
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 自动组卷
 * @param {Array} items 题库条目（调用方已按学科/单元范围筛好）
 * @param {object} [opt]
 * @param {number} [opt.count=20] 题量（默认 20，可选 10/30/50）
 * @param {number|string} [opt.seed=1] 随机种子（同 seed 重放结果一致）
 * @param {string} [opt.difficulty=''] 显式难度过滤（basic/medium/advanced）
 * @param {boolean} [opt.includeExam=false] 是否纳入真题卷题目（默认关闭）
 * @param {Record<string, number>} [opt.unitWeights={}] 单元权重（weakWeightsFromErrors 产物）
 * @param {'unit'|'kp'} [opt.weightDimension='unit'] 加权维度（D-3：缺省恒 'unit' 保持既有行为）
 * @param {Set<string>|string[]} [opt.existingKeys=null] 会话内已用键（paperKeyOf），命中即排除
 * @returns {{questions: Array, poolSize: number}} questions 已洗牌；poolSize 为有效池大小
 */
export function composePaper(items, opt = {}) {
  const {
    count = 20,
    seed = 1,
    difficulty = '',
    includeExam = false,
    unitWeights = {},
    existingKeys = null,
    weightDimension = WEIGHT_DIMENSIONS.UNIT
  } = opt
  const rng = mulberry32(seed)

  // 1) 池过滤：真题卷隔离（默认排除）→ 显式难度
  let pool = items.filter((it) => includeExam || it.source !== 'exam')
  if (difficulty) pool = pool.filter((it) => (it.difficulty || 'basic') === difficulty)

  // 2) 去重（规则 1）：会话内同一 fileKey+question 不重复出现。
  //    覆盖两层：调用方传入的 existingKeys（跨组扩展）+ 池内自带的重复条目。
  //    刻意拷贝一份：seen 会被填充，绝不能写穿到调用方的集合（副作用会污染重放校验）
  const seen = new Set(
    existingKeys instanceof Set ? existingKeys : (existingKeys ?? [])
  )
  pool = pool.filter((it) => {
    const k = paperKeyOf(it)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  // 3) 稳定排序：结果与输入顺序无关，同 seed 重放才严格一致。
  //    ⚠️ 字段是 key（practiceBank normalizeBankItem 展开的运行时名），不是紧凑键 k——
  //    写错字段比较器恒 undefined → 排序静默失效（QA F4 实证：同 seed 乱序喂入结果漂移）
  pool = pool.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))

  // 池不足：全给（仍洗牌保持出题顺序随机感）
  if (pool.length <= count) {
    return { questions: shuffle(pool.slice(), rng), poolSize: pool.length }
  }

  // 4) 难度分桶（未知难度回落 basic，与 blockMeta 的 FALLBACK 口径一致）
  const buckets = { basic: [], medium: [], advanced: [] }
  for (const it of pool) {
    const d = it.difficulty || 'basic'
    buckets[d === 'advanced' || d === 'medium' ? d : d === 'sprint' ? 'advanced' : 'basic'].push(it)
  }

  // 5) 按配额加权抽取；某难度缺货时从剩余池补足（保持加权）
  const targets = quotaOf(count, difficulty)
  const picked = []
  for (const d of BUCKETS) {
    for (let i = 0; i < targets[d] && buckets[d].length; i++) {
      picked.push(weightedPick(buckets[d], unitWeights, rng, weightDimension))
    }
  }
  const pickedSet = new Set(picked)
  const rest = pool.filter((it) => !pickedSet.has(it))
  while (picked.length < count && rest.length) {
    picked.push(weightedPick(rest, unitWeights, rng, weightDimension))
  }

  return { questions: shuffle(picked, rng), poolSize: pool.length }
}
