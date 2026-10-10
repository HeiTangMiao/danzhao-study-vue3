/**
 * 练习/考试作答度量纯函数集（P0-3 / P0-4，D-1 复用）
 *
 * ★ 单一真相源（H7）：超时阈值 TIMEOUT_MS 与三个统计口径只此一份 ——
 *   练习结算页、考试链路、「一键归因超时」与 D-1 复习器都从这里取，
 *   **不得**在别处内联 45000 或另写一套排序/计数。
 *
 * 纯函数、零 Vue 依赖：tests/practice-metrics.test.js 直测，浏览器与测试共用。
 */

/**
 * 单题超时阈值（毫秒）——评审 §3 P0-3：45 秒，可配置常量；D-1 复用同一常量。
 * 内容侧阈值若调整，只改这里一处。
 */
export const TIMEOUT_MS = 45000

/**
 * 归因六选一（P0-4）——错题「错在哪」的自评枚举。
 * 与自动判分结果**分别统计、不合并**（H3 二分）。
 * 两端（练习 / 考试归因层）与错题本筛选项**共用这一份**，防漂移。
 */
export const REASONS = ['概念不清', '记错公式', '计算失误', '审题偏差', '步骤缺失', '超时蒙猜']

/**
 * 耗时最长的前 n 题（按 elapsedMs 降序；并列时保持原顺序，Array.sort 稳定）
 * @param {Array<{elapsedMs?: number}>} attempts 单题作答记录
 * @param {number} [n=3] 取前几
 * @returns {Array} 新数组（不改动入参）
 */
export function topSlowest(attempts, n = 3) {
  const list = Array.isArray(attempts) ? attempts : []
  return [...list]
    .sort((a, b) => (Number(b?.elapsedMs) || 0) - (Number(a?.elapsedMs) || 0))
    .slice(0, Math.max(0, n))
}

/**
 * 超时题数：elapsedMs >= TIMEOUT_MS 计为超时（边界含等于，评审 §3 P0-3）
 * @param {Array<{elapsedMs?: number}>} attempts
 * @returns {number}
 */
export function timeoutCount(attempts) {
  const list = Array.isArray(attempts) ? attempts : []
  return list.filter((a) => (Number(a?.elapsedMs) || 0) >= TIMEOUT_MS).length
}

/**
 * 平均单题耗时（毫秒，四舍五入；空数组返回 0 而非 NaN —— M3 里程碑口径）
 * @param {Array<{elapsedMs?: number}>} attempts
 * @returns {number}
 */
export function avgElapsedMs(attempts) {
  const list = Array.isArray(attempts) ? attempts : []
  if (!list.length) return 0
  const sum = list.reduce((s, a) => s + (Number(a?.elapsedMs) || 0), 0)
  return Math.round(sum / list.length)
}

/**
 * 归因分布（P0-4）：六选一 + 未归因，固定顺序输出。
 * H3 二分：这里只统计「错题行的用户自评归因」，与自动判分结果口径分开、不合并。
 * @param {Array<{reason?: string}>} errors 错题行
 * @returns {Array<{reason: string, label: string, count: number}>} 长度固定为 REASONS.length + 1
 */
export function reasonDistribution(errors) {
  const list = Array.isArray(errors) ? errors : []
  const counts = new Map(REASONS.map((r) => [r, 0]))
  let none = 0
  for (const e of list) {
    const r = e && e.reason
    if (r && counts.has(r)) counts.set(r, counts.get(r) + 1)
    else none++
  }
  return [
    ...REASONS.map((r) => ({ reason: r, label: r, count: counts.get(r) })),
    { reason: 'none', label: '未归因', count: none }
  ]
}

/**
 * 自评校准率（P1-9）—— 用复习再测的召回率反推两档自评的相对可靠性。
 *
 * 口径：在**带 selfTier 的错题行**中，
 *   复测召回率 = 该档 `repetitions>=1` 的行数 / 该档 `reviewCount>0` 的行数。
 * ⚠️ 只做**相对排序**：'seen'（看答案才会）的召回率应高于 'unknown'（不会）；
 *   不出绝对分数、不构成成绩预测（项目「不承诺结果」口径）。
 * ⚠️ 局限：`repetitions` 是**当前快照**（会被后续 fail 归零），非历史轨迹。
 * @param {Array<{selfTier?: string, reviewCount?: number, repetitions?: number}>} errors 错题行
 * @param {string[]} [tiers] 档位顺序（默认 seen → unknown；调用方可传 SELF_TIERS 保持单一来源）
 * @returns {Array<{tier: string, n: number, reviewed: number, rate: number|null}>}
 *   rate=null 表示该档没有可复测的行（不参与相对比较）
 */
export function selfCalibrationOf(errors, tiers = ['seen', 'unknown']) {
  const rows = (Array.isArray(errors) ? errors : []).filter((e) => e && e.selfTier)
  return (tiers || []).map((tier) => {
    const g = rows.filter((e) => e.selfTier === tier)
    const reviewed = g.filter((e) => (Number(e.reviewCount) || 0) > 0)
    const recalled = reviewed.filter((e) => (Number(e.repetitions) || 0) >= 1)
    return {
      tier,
      n: g.length,
      reviewed: reviewed.length,
      rate: reviewed.length ? Math.round((recalled.length / reviewed.length) * 100) : null
    }
  })
}
