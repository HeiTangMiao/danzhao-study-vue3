/**
 * useReciteSchedule —— 每日背诵的**调度纯函数库**（零副作用 / **零 import**）
 *
 * 职责（设计 §1.1 运行时纯函数层）：
 *  - 判分结果 → 新档位 / 下次日期（`applyResult`）
 *  - `bank + rows + today` → 今日队列（`buildQueue`）
 *  - 复习篇的条件触发（`syncReviewTriggers`）
 *  - 内容指纹自动迁移（`reconcile`）
 *  - 进度统计（`deriveStats`）与连续天数（`bumpStreak`）
 *  - 逾期天数（`overdueDays`，首页待重默卡的「逾期 N 天」唯一来源）
 *
 * ⚠️ **本文件禁止 import 任何东西**（含 `@/` 别名、Vue、Pinia、IndexedDB）。
 *    理由不是洁癖，而是**可测性**：本文件承载 A4/A4'/A5/A6/A7 全部验收，
 *    这些场景必须能这样跑（team-lead 指定的验收方式）：
 *        node --input-type=module -e "import('./src/composables/useReciteSchedule.js').then(...)"
 *    一旦引入 `@/` 别名或 Vue 依赖链，裸 Node 会立刻 ERR_MODULE_NOT_FOUND
 *    （实测：`import('@/stores')` → `Cannot find package '@/stores'`），
 *    纯函数单测就只能靠 vitest + alias，等于把「可独立验证」降级成「必须整套环境」。
 *
 * ⚠️ 由「零 import」派生出的**两处镜像**（这是唯一代价，都有测试钉死，不许再扩散）：
 *    1. `getDateStr` / `addDays`：逐字复制自 `src/composables/useSpacedReview.js:57-66`
 *       （该文件已 `export getDateStr`，但它在模块顶层 import 了 `vue` 与 `@/stores/studyDb`，
 *       静态 import 会连带把整条依赖链拖进裸 Node）。
 *    2. `subjectKeyOf`：等价于 `src/content/reciteBank.js` 的 `subjectOfPiece`
 *       （同一 `indexOf('|')` 语义；**不是**设计 §7.2 明令禁止的 `key.split('|')[0]` 手拆）。
 *    两处都由 `tests/recite-schedule.test.js` 的「镜像对拍」用例与真身逐一比对 ——
 *    一旦任一侧漂移，对拍立刻变红。**除这两处外，本文件不得再复制任何外部逻辑。**
 */

// ─────────────────────────── 调度常量（唯一真相源，设计 §3.5） ───────────────────────────

/**
 * 累计档位：第 1/2/4/7/15 天（内容侧指定，**不可在此处"优化"**）。
 * @type {number[]}
 */
export const CUMULATIVE_DAYS = [1, 2, 4, 7, 15]

/**
 * 相邻档位增量 = diff([0, ...CUMULATIVE_DAYS]) → `[1, 1, 2, 3, 8]`。
 * **必须由 `CUMULATIVE_DAYS` 派生，禁止手写两份**（设计 §3.5 / 本仓 H7 一贯要求）。
 * @type {number[]}
 */
export const STAGE_DELTA = CUMULATIVE_DAYS.map((v, i) => (i === 0 ? v : v - CUMULATIVE_DAYS[i - 1]))

/** 最高档位：`stage` 达 `MAX_STAGE` 后再答对即毕业（`nextDate = null`，永不进队列） */
export const MAX_STAGE = 5

/** P0-5：单日重默上限 */
export const DAILY_DUE_LIMIT = 5

/** P0-5：到期 ≥ 此数则不推新篇（先补重默，别叠加负担） */
export const NEW_SUPPRESS_AT = 3

/** 每日新篇数（P2-2 明确不做可配置，留常量便于 P1 使用） */
export const DAILY_NEW_LIMIT = 1

/** `recite_state` 全表唯一行的主键（设计 §3.3） */
export const STATE_KEY = 'main'

/**
 * review 篇的角色字面量 —— 镜像 `reciteBank.PIECE_ROLE.REVIEW`（零 import 约束，见文件头）。
 * 由 `tests/recite-schedule.test.js` 对拍 `PIECE_ROLE.REVIEW` 防漂移。
 */
const ROLE_REVIEW = 'review'

/** review 篇的整轮触发字面量 —— 镜像 `reciteBank.PIECE_TRIGGER.ALL`（同上，对拍钉死） */
const TRIGGER_ALL = 'all'

/**
 * `recite_state` 的零值结构（每次 `bumpStreak` 都以它为底，防止调用方共享引用互相污染）。
 * 冻结：任何模块都不该就地改它。
 */
export const EMPTY_RECITE_STATE = Object.freeze({
  key: STATE_KEY,
  streak: 0,
  maxStreak: 0,
  lastActiveDate: ''
})

// ─────────────────────── 日期工具（镜像 #1，见文件头；对拍用例钉死） ───────────────────────

/**
 * 获取日期字符串 `YYYY-MM-DD`（**本地时区**）。
 * ⚠️ 禁止改用 `toISOString().slice(0,10)`：那是 UTC，东八区早上 8 点前会错一天（设计 §7.2）。
 * @param {Date} [d] 日期对象，默认当前时间
 * @returns {string} `YYYY-MM-DD`
 */
export function getDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 日期字符串加天数（可为负）。
 * @param {string} dateStr `YYYY-MM-DD`
 * @param {number} days 天数（负数为往前）
 * @returns {string} `YYYY-MM-DD`
 */
export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + Number(days || 0))
  return getDateStr(d)
}

/**
 * 把可选的 `today` 参数规整成合法日期串（未注入时取本地今天）。
 * I4：`today` 必须可从参数注入，否则 A5/A6 无法构造验收。
 * @param {unknown} today
 * @returns {string} `YYYY-MM-DD`
 */
function normalizeDay(today) {
  return typeof today === 'string' && today !== '' ? today : getDateStr()
}

// ───────────────────────────── 通用小工具（无依赖） ─────────────────────────────

/**
 * 非负整数规整：非法值回落 `fallback`（不四舍五入 —— 坐标/档位错一位都是静默错账）。
 * @param {unknown} v 原值
 * @param {number} fallback 默认值
 * @returns {number}
 */
function toInt(v, fallback) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback
  return n
}

/**
 * 上限值规整（`opts.dueLimit` 之类的注入项）：非负数才认，其余回落默认。
 * @param {unknown} v 原值
 * @param {number} fallback 默认值
 * @returns {number}
 */
function toLimit(v, fallback) {
  const n = toInt(v, fallback)
  return n >= 0 ? n : fallback
}

/**
 * 从篇主键取学科（镜像 #2，语义等价 `reciteBank.subjectOfPiece`）。
 * @param {{key?: string}|null|undefined} piece 篇目
 * @returns {string} 解析不出时为空串
 */
export function subjectKeyOf(piece) {
  const key = piece && typeof piece.key === 'string' ? piece.key : ''
  const i = key.indexOf('|')
  return i > 0 ? key.slice(0, i) : ''
}

/**
 * 篇是否为「复习篇」（`role === 'review'`；未知/缺省一律按 lesson 处理）
 * @param {object|null|undefined} piece 篇目
 * @returns {boolean}
 */
function isReviewPiece(piece) {
  return !!piece && piece.role === ROLE_REVIEW
}

/**
 * 行是否仍然生效（存在且未被软删）
 * @param {object|null|undefined} row `recite_progress` 行
 * @returns {boolean}
 */
function isLiveRow(row) {
  return !!row && typeof row === 'object' && row.deleted !== true
}

/**
 * 行数组 → `Map<key, row>`（重复 key 后者覆盖；非对象条目忽略）。
 * 行**数组**是 DB 访问器的自然产出（`getReciteProgressAll()`），故纯函数统一收数组。
 * @param {Array<object>} rows `recite_progress` 行数组
 * @returns {Map<string, object>}
 */
function rowsToMap(rows) {
  const map = new Map()
  const list = Array.isArray(rows) ? rows : []
  for (const row of list) {
    if (!row || typeof row !== 'object') continue
    const key = typeof row.key === 'string' ? row.key : ''
    if (!key) continue
    map.set(key, row)
  }
  return map
}

/**
 * 构造一条新的 `recite_progress` 行（调度字段取零值）。
 * @param {{piece: object, nextDate: string, now: number}} spec
 * @returns {object} `recite_progress` 行
 */
function makeRow({ piece, nextDate, now }) {
  return {
    key: piece.key,
    subject: subjectKeyOf(piece),
    fileKey: typeof piece.fileKey === 'string' ? piece.fileKey : '',
    blockIndex: toInt(piece.blockIndex, 0),
    pieceTitle: typeof piece.title === 'string' ? piece.title : '',
    // 内容指纹随行存档：reconcile 据此判断「是否一字未动」（不是主键的一部分）
    fp: typeof piece.fp === 'string' ? piece.fp : '',
    // ── 调度（会被答错打回）──
    stage: 0,
    nextDate,
    lastCorrect: false,
    lastAt: null,
    doneCount: 0,
    // ── 成就（只增不减，永不打回）──
    learnedAt: null,
    createdAt: now,
    deleted: false
  }
}

// ─────────────────────────────── 1. 判分结果 → 新档位 ───────────────────────────────

/**
 * 由一次作答结果推进（或打回）一篇的调度状态。
 *
 * 档位规则（设计 §3.1 + A4/A4'）：
 *  - 全对：`stage = min(stage + 1, MAX_STAGE)`；
 *  - 有错：`stage = 0`，且 `nextDate = today + 1`（明天重默）；
 *  - `nextDate = today + STAGE_DELTA[stage - 1]`，故通过第 1/2/3/4/5 档后依次 +1/+1/+2/+3/+8 天；
 *  - 已经处在 `MAX_STAGE` 的篇再答对 → **毕业**：`nextDate = null`（永不进队列）。
 *
 * ⚠️ A4 的两句（"+1/+1/+2/+3/+8" 与 "stage=5 时 nextDate 为 null"）**只有一种自洽读法**：
 *    「第五档（+8 → 第 15 天）仍然进队列；在第 15 天那次复习再次全对时才毕业（null）」。
 *    若把 stage=5 直接判为 null，`CUMULATIVE_DAYS` 的 15 就永远用不上，[1,2,4,7,15] 退化成 [1,2,4,7]。
 *    本实现按自洽读法落地（stage 5 + 全对 → null；stage 4 + 全对 → +8）。
 *
 * ⚠️ I10：判「是否全对」**只看 `allCorrect` 布尔**，永不 `correct === total` 反推
 *    （`total === 0` 时 `0 === 0` 会把空篇判成全对）。
 *
 * ⚠️ I2：`learnedAt` **只写不撤** —— 已非 null 永不覆盖、永不清零
 *    （否则答错一次就会让「已背 X / 67」倒退，设计 §1 异议 5）。
 *
 * @param {{
 *   prevRow?: object|null, piece: object, allCorrect: boolean, today?: string
 * }} params
 *   prevRow：库里的现有行（首次作答传 `null`）；piece：`sanitizeBank` 规范化后的篇目
 * @returns {object} 新的 `recite_progress` 行（**纯函数产物，调用方负责落库**）
 */
export function applyResult({ prevRow = null, piece = {}, allCorrect = false, today } = {}) {
  const day = normalizeDay(today)
  const prev = prevRow && typeof prevRow === 'object' ? prevRow : null
  const passed = allCorrect === true
  const prevStage = toInt(prev && prev.stage, 0)
  const stage = passed ? Math.min(prevStage + 1, MAX_STAGE) : 0
  const now = Date.now()

  let nextDate
  if (!passed) {
    // 打回：明天重默（stage=0 时也走这条，A4'）
    nextDate = addDays(day, 1)
  } else if (stage >= MAX_STAGE && prevStage >= MAX_STAGE) {
    // 已在最高档再全对 → 毕业
    nextDate = null
  } else {
    // STAGE_DELTA 长度 = MAX_STAGE，故 stage∈[1,5] 时下标恒合法
    nextDate = addDays(day, STAGE_DELTA[stage - 1])
  }

  return {
    key: piece.key || (prev && prev.key) || '',
    // subject 用镜像 subjectKeyOf（禁止手拆键，见文件头）；旧行已有 subject 时沿用（P1-6 防错学科）
    subject: (prev && prev.subject) || subjectKeyOf(piece),
    fileKey: piece.fileKey || (prev && prev.fileKey) || '',
    blockIndex: toInt(piece.blockIndex, toInt(prev && prev.blockIndex, 0)),
    pieceTitle: piece.title || (prev && prev.pieceTitle) || '',
    // fp 的写权归 reconcile（内容指纹是"内容是否一字未动"的事实，不是作答产生的）。
    // 首次作答（无 prev）才从篇目带入，避免作答覆盖掉待迁移的旧指纹。
    fp: prev && typeof prev.fp === 'string' ? prev.fp : (typeof piece.fp === 'string' ? piece.fp : ''),
    // ── 调度 ──
    stage,
    nextDate,
    lastCorrect: passed,
    lastAt: now,
    doneCount: toInt(prev && prev.doneCount, 0) + 1,
    // ── 成就（只写不撤）──
    learnedAt: (prev && prev.learnedAt) || (passed ? day : null),
    createdAt: toInt(prev && prev.createdAt, now) || now,
    deleted: false
  }
}

// ─────────────────────────────── 2. 到期判据（唯一） ───────────────────────────────

/**
 * 该篇今日是否到期（due 判据**唯一真相源**，与 `useSpacedReview.isDue` 复用同一语义）。
 *  - `nextDate === null` → **已毕业**，永不进队列；
 *  - 缺排期（`undefined` / 空串，遗留或半写行）→ **一律视为到期**
 *    （漏掉一次重默的代价远大于多默一次，与本仓判分侧「宁可从严」同一取向）；
 *  - 其余按 `YYYY-MM-DD` 字符串比较（I3：绝不用时间戳比较，避时区/夏令时错位）。
 * @param {object|null|undefined} row `recite_progress` 行
 * @param {string} [today] `YYYY-MM-DD`（可注入，默认本地今天）
 * @returns {boolean}
 */
export function isDue(row, today) {
  if (!isLiveRow(row)) return false
  const day = normalizeDay(today)
  if (row.nextDate === null) return false
  const nd = typeof row.nextDate === 'string' ? row.nextDate : ''
  if (nd === '') return true
  return nd <= day
}

/** 一天的毫秒数（`overdueDays` 的整数基准；UTC 下恒等于这个值，不受夏令时影响） */
const DAY_MS = 86400000

/** `YYYY-MM-DD` 严格形态（不接受 `2026-1-1` 之类，也不接受带时间的串） */
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * 把 `YYYY-MM-DD` 解析成 **UTC 毫秒**（非法输入 → `NaN`）。
 *
 * 为什么用 `Date.UTC` 而不是 `new Date('…T00:00:00')`（即 `addDays` 的做法）：
 *  - `new Date('2026-03-08T00:00:00')` 是**本地午夜**；在有夏令时的时区里，
 *    「本地午夜到本地午夜」可能是 23 或 25 小时，用 `(b - a) / 86400000` 求天数差
 *    会得到 0.958 / 1.042 这类**非整数**，跨过夏令时切换的多日差还会累积误差；
 *  - `Date.UTC` 下每一天**恒为** 86 400 000 ms，天数差是干净的整数除法
 *    （`Math.round` 只是兜住浮点表示，不承担纠错职责）。
 *  - 两者对同一 `YYYY-MM-DD` 串给出的"日期"完全一致，只是**计量口径**不同：
 *    `addDays` 面向"从某天推 N 天后的本地日期"，`overdueDays` 面向"两个日期之间隔了几天"。
 *
 * ⚠️ 往返校验不可省：`Date.UTC(2026, 1, 31)` 会被静默滚到 3 月 3 日。
 *    不校验就会把「非法日期」算成一个 3 天的逾期 —— 宁可返 `NaN`（调用方回落 0）。
 * @param {unknown} dateStr `YYYY-MM-DD`
 * @returns {number} UTC 毫秒；非法 → `NaN`
 */
function utcDayMs(dateStr) {
  if (typeof dateStr !== 'string') return NaN
  const m = DAY_PATTERN.exec(dateStr)
  if (!m) return NaN
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const ms = Date.UTC(year, month - 1, day)
  const d = new Date(ms)
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return NaN
  }
  return ms
}

/**
 * 该篇**逾期天数**（首页待重默卡上的「逾期 N 天」来源）。
 *
 * 语义（非负整数，绝不返回负数/小数）：
 *  - `nextDate` 早在今天之前 → 相隔的天数（`2026-10-20` 对 `2026-10-26` → **6**）；
 *  - `nextDate` 就是今天 → **0**（今天到期 ≠ 逾期）；
 *  - `nextDate` 在未来 / `nextDate === null`（已毕业）/ 缺排期 / 软删行 / 任何非法日期
 *    → **0**（调用方可以无条件渲染「逾期 {{n}} 天」而不必先判空）。
 *
 * 为什么与 `isDue` 分成两个函数：`isDue` 回答"要不要今天做"，`overdueDays` 回答"拖了几天"。
 * 合成一个就会在调用点各写一次 `(a - b) / 86400000`，本仓最忌讳的正是判据散写（H7）。
 * @param {object|null|undefined} row `recite_progress` 行
 * @param {string} [today] `YYYY-MM-DD`（可注入，默认本地今天）
 * @returns {number} 逾期天数（非负整数）
 */
export function overdueDays(row, today) {
  if (!isLiveRow(row)) return 0
  if (row.nextDate === null) return 0 // 已毕业，永不逾期
  const nd = typeof row.nextDate === 'string' ? row.nextDate : ''
  if (nd === '') return 0 // 缺排期：算不出天数（是否该做由 isDue 决定）
  const dueAt = utcDayMs(nd)
  const nowAt = utcDayMs(normalizeDay(today))
  if (Number.isNaN(dueAt) || Number.isNaN(nowAt)) return 0
  const diff = Math.round((nowAt - dueAt) / DAY_MS)
  return diff > 0 ? diff : 0
}

// ─────────────────────────────── 3. 今日队列 ───────────────────────────────

/**
 * 构造今日队列（只读 `pieces + rows + today`，不读任何其它时间源 —— I4）。
 *
 * 规则：
 *  - **重默（due）**：有生效行且 `isDue` 的篇（lesson / review 都算），
 *    按「排期最早（逾期最久）→ `order` 升序」排序，截断到 `DAILY_DUE_LIMIT`（默认 5）；
 *  - **新篇（fresh）**：`role !== 'review'` 且**没有生效行**的篇，按 `order` 升序，
 *    只取 `DAILY_NEW_LIMIT`（默认 1）篇 —— 断更多日也**不补发**、`order` 不跳（A6）；
 *  - **抑制**：到期篇数 ≥ `NEW_SUPPRESS_AT`（默认 3）→ `fresh` 强制为空、`suppressedNew = true`（A5）。
 *
 * @param {{
 *   pieces?: Array<object>, rows?: Array<object>, today?: string,
 *   opts?: {dueLimit?: number, newLimit?: number, suppressAt?: number}
 * }} params
 * @returns {{
 *   due: Array<{piece: object, row: object}>,
 *   fresh: Array<object>,
 *   suppressedNew: boolean,
 *   remainingDueCount: number,
 *   dueCount: number,
 *   newCount: number
 * }} 队列。`due` 项是 `{piece, row}`（视图既要渲染篇目，也要读 `stage`），
 *    `fresh` 项是篇目本身（尚无行）；`remainingDueCount` = 因上限被挤到明天的篇数。
 */
export function buildQueue({ pieces = [], rows = [], today, opts = {} } = {}) {
  const day = normalizeDay(today)
  const dueLimit = toLimit(opts && opts.dueLimit, DAILY_DUE_LIMIT)
  const newLimit = toLimit(opts && opts.newLimit, DAILY_NEW_LIMIT)
  const suppressAt = toLimit(opts && opts.suppressAt, NEW_SUPPRESS_AT)
  const list = Array.isArray(pieces) ? pieces : []
  const rowMap = rowsToMap(rows)

  const dueAll = []
  const freshAll = []
  for (const piece of list) {
    if (!piece || typeof piece !== 'object' || !piece.key) continue
    const row = rowMap.get(piece.key)
    if (isLiveRow(row)) {
      if (isDue(row, day)) dueAll.push({ piece, row })
      continue
    }
    // 复习篇不进「每日新篇」池（它们由 syncReviewTriggers 条件推入）
    if (!isReviewPiece(piece)) freshAll.push(piece)
  }

  dueAll.sort((a, b) => {
    const na = typeof a.row.nextDate === 'string' ? a.row.nextDate : ''
    const nb = typeof b.row.nextDate === 'string' ? b.row.nextDate : ''
    if (na !== nb) return na < nb ? -1 : 1
    return toInt(a.piece.order, 0) - toInt(b.piece.order, 0)
  })
  freshAll.sort((a, b) => toInt(a.order, 0) - toInt(b.order, 0))

  const suppressedNew = dueAll.length >= suppressAt
  const due = dueAll.slice(0, dueLimit)
  const fresh = suppressedNew ? [] : freshAll.slice(0, newLimit)

  return {
    due,
    fresh,
    suppressedNew,
    remainingDueCount: Math.max(0, dueAll.length - due.length),
    dueCount: dueAll.length,
    newCount: freshAll.length
  }
}

// ─────────────────────────── 4. 复习篇（文件 / 整轮）触发 ───────────────────────────

/**
 * 计算「本次新满足触发条件」的复习篇并返回**待新增的行**（幂等：重复调用返回空）。
 *
 * 触发规则（设计 §1.4 + 产物 `trigger` 字段，运行时不按 title 猜）：
 *  - `trigger: 'file'`：其所属 `fileKey` 的**全部 lesson 篇**都 `stage >= 1` → 次日进队列；
 *  - `trigger: 'all'`（综合大冲关）：**全库**所有 lesson 篇都 `stage >= 1` → 次日进队列。
 *
 * 幂等实现：只要该 review 篇**已有行**（哪怕已软删）就跳过 —— 触发只发生一次，
 * 不做「删了再触发」的复活逻辑（P1-3「重开一轮」届时另设计）。
 *
 * @param {{pieces?: Array<object>, rows?: Array<object>, today?: string}} params
 * @returns {Array<object>} 待新增的 `recite_progress` 行（`nextDate = today + 1`）
 */
export function syncReviewTriggers({ pieces = [], rows = [], today } = {}) {
  const day = normalizeDay(today)
  const list = Array.isArray(pieces) ? pieces : []
  const rowMap = rowsToMap(rows)

  // 按 fileKey 统计 lesson 篇的「总篇数 / 已达 stage>=1 篇数」—— 一次遍历算完，避免 O(n²)
  const byFile = new Map()
  let lessonTotal = 0
  let lessonPassed = 0
  for (const piece of list) {
    if (!piece || typeof piece !== 'object' || !piece.key) continue
    if (isReviewPiece(piece)) continue
    const fileKey = typeof piece.fileKey === 'string' ? piece.fileKey : ''
    const group = byFile.get(fileKey) || { total: 0, passed: 0 }
    group.total += 1
    lessonTotal += 1
    const row = rowMap.get(piece.key)
    if (isLiveRow(row) && toInt(row.stage, 0) >= 1) {
      group.passed += 1
      lessonPassed += 1
    }
    byFile.set(fileKey, group)
  }
  const allPassed = lessonTotal > 0 && lessonPassed === lessonTotal

  const now = Date.now()
  const created = []
  for (const piece of list) {
    if (!isReviewPiece(piece) || !piece.key) continue
    if (rowMap.has(piece.key)) continue // 已有行（含墓碑）→ 触发已消费过
    let triggered
    if (piece.trigger === TRIGGER_ALL) {
      triggered = allPassed
    } else {
      const fileKey = typeof piece.fileKey === 'string' ? piece.fileKey : ''
      const group = byFile.get(fileKey)
      triggered = !!group && group.total > 0 && group.passed === group.total
    }
    if (!triggered) continue
    created.push(makeRow({ piece, nextDate: addDays(day, 1), now }))
  }
  return created
}

// ──────────────────────── 5. 内容指纹协调（自动迁移） ────────────────────────

/**
 * 加载产物后做一次「行 ↔ 篇」的指纹协调（设计 §3.2，纯函数）。
 *
 * 三种情形：
 *  ① **同一篇内容被微调**（`fp` 变、`key` 不变）→ 只更新 `fp`，`stage`/`nextDate`/`learnedAt` 原样；
 *  ② **内容搬家**（中间插入一篇 / 文件改名）→ 按 `fp` 认领到新 `key`，整行搬走（旧行留墓碑）；
 *  ③ **两边都对不上** → **保留原行不动**，记进 `orphaned` 由调用方 `console.warn` 点名（不删数据）。
 *
 * 判定顺序（与设计一致）：先看 ② 再看 ①。
 * 理由：`key` 上「住着的」可能已经是别的篇（位移后），此时按 `key` 认 ① 会把 A 的进度记到 B 上；
 * 只有当旧 `fp` 无人认领时，才说明确实是同一篇改了字（①）。
 *
 * @param {{pieces?: Array<object>, rows?: Array<object>}} params
 * @returns {{rows: Array<object>, migrated: Array<object>, orphaned: Array<{key: string, pieceTitle: string}>}}
 *   `rows`：协调后的完整行集（含未改动行、含被迁移旧行的墓碑）；
 *   `migrated`：**需要写库**的行（更新了 `fp` 的行 + 迁移的新行 + 迁移产生的墓碑）；
 *   `orphaned`：两边都对不上的行（保留在 `rows` 里，不删）。
 */
export function reconcile({ pieces = [], rows = [] } = {}) {
  const list = Array.isArray(pieces) ? pieces : []
  const src = Array.isArray(rows)
    ? rows.filter((r) => r && typeof r === 'object' && typeof r.key === 'string' && r.key !== '')
    : []

  const pieceByKey = new Map()
  const piecesByFp = new Map()
  for (const piece of list) {
    if (!piece || typeof piece !== 'object' || !piece.key) continue
    pieceByKey.set(piece.key, piece)
    const fp = typeof piece.fp === 'string' ? piece.fp : ''
    if (!fp) continue
    const bucket = piecesByFp.get(fp) || []
    bucket.push(piece)
    piecesByFp.set(fp, bucket)
  }

  // 已被占用（生效）的 key：搬迁时不许抢别人还活着的坑位
  const liveKeys = new Set()
  for (const row of src) if (isLiveRow(row)) liveKeys.add(row.key)

  const out = []
  const migrated = []
  const orphaned = []
  const claimed = new Set() // 本次已被认领的新 key（防两个旧行争抢同一篇，先到先得）

  for (const row of src) {
    if (!isLiveRow(row)) {
      out.push(row) // 墓碑原样保留（软删是数据，不是噪音）
      continue
    }
    const piece = pieceByKey.get(row.key)
    const rowFp = typeof row.fp === 'string' ? row.fp : ''

    // 指纹一致 → 什么都不做（99% 的行走这条）
    if (piece && rowFp !== '' && piece.fp === rowFp) {
      out.push(row)
      continue
    }

    // 情形 ②：按 fp 认领（内容搬家）
    let target = null
    if (rowFp !== '') {
      const bucket = piecesByFp.get(rowFp) || []
      for (const q of bucket) {
        if (!q || q.key === row.key) continue
        if (liveKeys.has(q.key) || claimed.has(q.key)) continue
        target = q
        break
      }
    }
    if (target) {
      claimed.add(target.key)
      out.push({ ...row, deleted: true }) // 旧 key 留墓碑（不删数据，可排障）
      const moved = {
        ...row,
        key: target.key,
        subject: subjectKeyOf(target) || row.subject,
        fileKey: typeof target.fileKey === 'string' ? target.fileKey : row.fileKey,
        blockIndex: toInt(target.blockIndex, row.blockIndex),
        pieceTitle: typeof target.title === 'string' ? target.title : row.pieceTitle,
        fp: typeof target.fp === 'string' ? target.fp : rowFp
      }
      out.push(moved)
      migrated.push({ ...row, deleted: true }, moved)
      continue
    }

    // 情形 ①：同一篇内容被微调 → 只更新指纹，绝不碰调度
    if (piece) {
      const updated = {
        ...row,
        fp: typeof piece.fp === 'string' ? piece.fp : row.fp,
        pieceTitle: typeof piece.title === 'string' ? piece.title : row.pieceTitle
      }
      out.push(updated)
      migrated.push(updated)
      continue
    }

    // 情形 ③：篇已不在产物里、fp 也无人认领 → 保留原行 + 点名（设计 §7.4：不许删）
    out.push(row)
    orphaned.push({ key: row.key, pieceTitle: typeof row.pieceTitle === 'string' ? row.pieceTitle : '' })
  }

  return { rows: out, migrated, orphaned }
}

// ─────────────────────────────── 6. 进度统计 ───────────────────────────────

/**
 * 进度与队列统计。
 *
 * ⚠️ A7 / I2：「已背 X」**只能**取自 `learnedAt != null`，与 `stage` 彻底解耦 ——
 *    答错把 `stage` 打回 0 时 `learnedAt` 不动，故本函数返回的 `learned` **只增不减**。
 *
 * @param {{pieces?: Array<object>, rows?: Array<object>, state?: object|null, today?: string}} params
 * @returns {{learned: number, totalLesson: number, dueCount: number, streak: number}}
 *   `learned`：`learnedAt != null` 的 **lesson** 篇数（复习篇不计入分母/分子，与「已背 X / 67」口径一致）
 */
export function deriveStats({ pieces = [], rows = [], state = null, today } = {}) {
  const day = normalizeDay(today)
  const list = Array.isArray(pieces) ? pieces : []
  const rowMap = rowsToMap(rows)

  let learned = 0
  let totalLesson = 0
  let dueCount = 0
  for (const piece of list) {
    if (!piece || typeof piece !== 'object' || !piece.key) continue
    const isLesson = !isReviewPiece(piece)
    if (isLesson) totalLesson += 1
    const row = rowMap.get(piece.key)
    if (!isLiveRow(row)) continue
    if (isLesson && row.learnedAt) learned += 1
    if (isDue(row, day)) dueCount += 1
  }
  const src = state && typeof state === 'object' ? state : EMPTY_RECITE_STATE
  return {
    learned,
    totalLesson,
    dueCount,
    streak: toInt(src.streak, 0)
  }
}

// ─────────────────────────────── 7. 连续天数 ───────────────────────────────

/**
 * 推进「连续背诵天数」（Q6 的临时规则，team-lead 已拍板）。
 *
 * 规则：
 *  - `hasTaskToday === false`（**无任务日**）→ 不判负也不推进（`lastActiveDate` 不变）；
 *    「stage 全满 = 今天没任务」不该惩罚"背得好"的学员；
 *  - 当日已计过（`lastActiveDate === today`）→ 幂等返回，streak 不重复 +1；
 *  - 昨天有记录 → `streak + 1`；否则（断更 / 首次）→ `streak = 1`，`maxStreak` 取历史最大。
 *
 * ⚠️ 「当天有任务但没完成 → streak 归 0」不在这里：那要求「日期翻转时」判定，
 *    本函数只在**完成后**被调用（一次判定一个时刻的推进）。
 *
 * @param {{state?: object|null, today?: string, hasTaskToday?: boolean}} params
 * @returns {object} 新的 `recite_state` 行
 */
export function bumpStreak({ state = null, today, hasTaskToday = true } = {}) {
  const day = normalizeDay(today)
  const prev = { ...EMPTY_RECITE_STATE, ...(state && typeof state === 'object' ? state : {}), key: STATE_KEY }

  if (hasTaskToday === false) return prev // 无任务日：不判负、不推进
  if (prev.lastActiveDate === day) return prev // 当天已计过 → 幂等

  const streak = prev.lastActiveDate === addDays(day, -1) ? toInt(prev.streak, 0) + 1 : 1
  return {
    key: STATE_KEY,
    streak,
    maxStreak: Math.max(toInt(prev.maxStreak, 0), streak),
    lastActiveDate: day
  }
}
