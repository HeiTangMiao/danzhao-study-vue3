/**
 * recite Store —— 每日背诵的**状态编排层**（T04；设计 §4.2 `ReciteStore` / §4.1 时序图）
 *
 * 职责边界（§7.5「状态归属」，越界即错位）：
 *  - 本文件是**唯一**同时调 DB（`studyDb`）与调度纯函数（`useReciteSchedule`）的层；
 *  - 本文件**不实现任何公式**：档位推进、到期判据、队列构造、复习触发、指纹协调、
 *    连续天数全部来自 `useReciteSchedule`（H7）；本文件只做「读 → 算 → 写 → 派生视图状态」；
 *  - 判分只在 `clozeJudge.gradeCloze` 一处（I5），本文件连 `allCorrect` 都不重算，
 *    它只信 `ClozeBlock` 上抛的布尔（I10 ①）。
 *
 * 首屏纪律（team-lead 硬约束 / §1 异议 7）：
 *  `init()` 的 **await 链只有两段**：`loadBundled()`（必成功才渲染）+ 读库；
 *  `refreshFromRemote()` **绝不进首屏 await 链** —— 它超时上限是 2500ms，
 *  但远程不可达时的底层 fetch 仍可能挂到默认 8000ms，等它等于白屏 8 秒。
 *  故远程刷新一律 `.then` 后台应用，且**只在 `phase === 'idle'`（首页静置态）**才换 bank
 *  （I9：学员正在作答时队列不许变，替换推迟到下次回首页 —— 见 `endAnswering()`）。
 *
 * 双源引入的新失效模式由视图层的 identity 守卫兜（§1 异议 9 / I8），
 * 但 store 侧必须提供守卫要用的原料：`getPiece()` 只按**产物坐标**命中，
 * 命中不了的坐标一律返回 `null`（视图据此走 stale 分支，**不写库**）。
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useStudyDbStore } from './studyDb'
import { DEFAULT_SUBJECT, loadBundled, refreshFromRemote, resetReciteBankCache } from '@/utils/reciteBankClient'
import { subjectOfPiece } from '@/content/reciteBank'
import { normalizeUnitNum } from '@/utils/routeParams'
import {
  EMPTY_RECITE_STATE,
  applyResult,
  buildQueue,
  bumpStreak,
  deriveStats,
  getDateStr,
  reconcile,
  syncReviewTriggers
} from '@/composables/useReciteSchedule'

/**
 * store 生命周期阶段。
 *  - `loading`：首屏加载中（只有 `loadBundled` + 读库，见文件头「首屏纪律」）；
 *  - `idle`   ：**已就绪且无人在作答** —— 双源刷新的唯一应用窗口（I9）；
 *  - `answering`：单篇作答中（`RecitePieceView` 挂载期间），远程新版一律推迟应用；
 *  - `error`  ：包内副本/读库失败 → 页面显示「重试」，**绝不静默返回空队列**（§7.4）。
 */
export const RECITE_PHASE = Object.freeze({
  LOADING: 'loading',
  IDLE: 'idle',
  ANSWERING: 'answering',
  ERROR: 'error'
})

/** 背诵首页路径（视图与守卫共用，避免各处手拼字符串） */
export const RECITE_HOME_PATH = '/recite'

/** 大冲关「模拟考场」手动入口的查询串标记（T04：该分支不写任何 `recite_progress` 行） */
export const RECITE_MANUAL_QUERY = 'manual'

/**
 * 构造 `ClozeBlock` 的 `context`（§5.7 断言 4：键集合必须**严格等于**这 5 个）。
 *
 * 为什么单独抽成函数而不在视图里内联一个对象字面量：
 *  `ClozeBlock.enqueueWrongSentences` 在**缺 `fileKey`** 时会静默不入错题本（既有守卫，
 *  语义正确但不能被「漏字段」触发）。把「背诵页的 context 长什么样」收敛成一个纯函数，
 *  测试就能把它钉成「键集合不多不少」，而不是等哪天有人给背诵页传 context 时漏一个字段、
 *  错题本从此静默少收、且没有任何报错。
 *
 * ⚠️ 键**恰好** 5 个：多传字段不会让 `ClozeBlock` 报错，但会让「两个入口同一个 context 形状」
 *    这条一致性失去可断言性；少传则是真缺陷。
 *
 * @param {object} piece `sanitizeBank` 规范化后的篇目（`RecitePiece`）
 * @returns {{subject: string, unitNum: string, fileKey: string, fileTitle: string, unitTitle: string}}
 */
export function buildReciteContext(piece) {
  const src = piece && typeof piece === 'object' ? piece : {}
  // 学科一律走 `subjectOfPiece`（`pieceKeyOf` 的逆运算，§7.2 明令禁止 `split('|')[0]` 手拆键）
  const subject = subjectOfPiece(src) || DEFAULT_SUBJECT
  return {
    subject,
    unitNum: typeof src.unitNum === 'string' ? src.unitNum : '',
    fileKey: typeof src.fileKey === 'string' ? src.fileKey : '',
    fileTitle: typeof src.fileTitle === 'string' ? src.fileTitle : '',
    unitTitle: typeof src.unitTitle === 'string' ? src.unitTitle : ''
  }
}

/**
 * 把非负整数字符串/数字转成数字；非法一律 `null`（不钳制、不四舍五入）。
 * 为什么不用 `Number(v)` 直接判：`Number('')` 是 0，会把「缺参数」静默当成第 0 篇。
 * @param {unknown} v 原值
 * @returns {number|null} 合法非负整数或 null
 */
function toIndex(v) {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null
  return n
}

/**
 * 在行数组里按 `key` 覆盖/追加一行（返回**新数组**，不改入参 —— 保证 computed 能感知变化）。
 * @param {Array<object>} rows 现有行数组
 * @param {object} row 要写入的行
 * @returns {Array<object>} 新数组
 */
function upsertRow(rows, row) {
  const list = Array.isArray(rows) ? rows : []
  let hit = false
  const next = list.map((r) => {
    if (r && r.key === row.key) {
      hit = true
      return row
    }
    return r
  })
  if (!hit) next.push(row)
  return next
}

export const useReciteStore = defineStore('recite', () => {
  const db = useStudyDbStore()

  // ===== 状态 =====
  /** @type {import('vue').Ref<object|null>} 当前生效的产物（`sanitizeBank` 产出） */
  const bank = ref(null)
  /** @type {import('vue').Ref<Array<object>>} `recite_progress` 行数组（含软删墓碑） */
  const rows = ref([])
  /** @type {import('vue').Ref<object>} `recite_state`（单行，缺行时为 `EMPTY_RECITE_STATE`） */
  const state = ref({ ...EMPTY_RECITE_STATE })
  /** 生命周期阶段（见 `RECITE_PHASE`） */
  const phase = ref(RECITE_PHASE.LOADING)
  /** 加载失败文案（页面原样展示；空串 = 无错误） */
  const loadError = ref('')
  /** 今天（`YYYY-MM-DD` 本地时区）。I4：从参数注入，不与 `new Date()` 隐式耦合 */
  const today = ref(getDateStr())
  /** 已加载过一轮（`init()` 幂等判据） */
  const loaded = ref(false)
  /** 大冲关手动入口（I6：`true` 时 `submitResult` 不写任何行） */
  const manualOnly = ref(false)
  /** 作答期间到达的远程新版（推迟到 `endAnswering()` 再应用，I9） */
  const pendingBank = ref(null)

  /** 进行中的 `init()`（并发调用共享同一个 Promise，避免重复读盘/重复读库） */
  let inFlight = null

  // ===== 派生 =====
  /** 产物篇目数组（未加载时为空数组 —— 队列/统计天然为空，不抛错） */
  const pieces = computed(() => (bank.value && Array.isArray(bank.value.pieces) ? bank.value.pieces : []))

  /** `key → 行` 索引（纯函数收数组，视图/store 内部查单行用 Map） */
  const rowMap = computed(() => {
    const map = new Map()
    for (const row of rows.value) {
      if (row && typeof row.key === 'string') map.set(row.key, row)
    }
    return map
  })

  /** `key → 篇` 索引（`submitResult` 按主键回查篇目） */
  const pieceByKey = computed(() => {
    const map = new Map()
    for (const piece of pieces.value) {
      if (piece && typeof piece.key === 'string') map.set(piece.key, piece)
    }
    return map
  })

  /** 今日队列（纯函数 `buildQueue`；只读 `pieces + rows + today`，I4） */
  const queue = computed(() => buildQueue({ pieces: pieces.value, rows: rows.value, today: today.value }))

  /** 进度统计（纯函数 `deriveStats`；`learned` 只增不减，I2/A7） */
  const stats = computed(() =>
    deriveStats({ pieces: pieces.value, rows: rows.value, state: state.value, today: today.value })
  )

  /**
   * 「已背 X / Y」的分母：**取产物 `counts.lesson`**，不硬编码 67（team-lead 硬约束 4）。
   * 兜底到 `deriveStats().totalLesson` 只为「产物被清洗掉一部分条目」时仍显示一个自洽的数
   * （`counts` 本身就是 `deriveCounts` 的派生值，两者正常情况下恒等）。
   */
  const totalLesson = computed(() => {
    const counts = bank.value && bank.value.counts ? bank.value.counts : null
    const n = counts ? Number(counts.lesson) : NaN
    if (Number.isFinite(n) && n >= 0) return n
    return stats.value.totalLesson
  })

  /**
   * 大冲关篇（`role: 'review'` 且 `trigger: 'all'`；底部常驻入口指向它）。
   * 退路：没有 `trigger==='all'` 的篇时取**最后一个** review 篇 ——
   * 产物由构建期烘焙，运行时不按 title 猜（§1.4）。
   */
  const challengePiece = computed(() => {
    const reviewPieces = pieces.value.filter((p) => p.role === 'review')
    const all = reviewPieces.find((p) => p.trigger === 'all')
    return all || reviewPieces[reviewPieces.length - 1] || null
  })

  /**
   * 视图状态（`ReciteView` **只读本对象**，不自己算任何东西 —— §7.5）。
   *
   * 口径说明：
   *  - `learned / totalLesson`：「已背 X / 67」唯一来源（`learnedAt != null` 的 lesson 篇数，A7）；
   *  - `progressPct`：I10 ② —— 一律 `total > 0 ? learned / total : 0`，**禁止裸除法**
   *    （裸除法在 `total === 0` 时出 `NaN`，CSS 里静默失效、测试抓不到）；
   *  - `dueCount`：今日**可作**的重默篇数（已被 `DAILY_DUE_LIMIT` 截断）；
   *    `dueRemaining`：因单日上限被挤到后面的篇数（视图可提示「另有 N 篇」）；
   *  - `fresh`：今日新篇（最多 1 篇；`suppressedNew` 时恒为 `null`）。
   */
  const viewModel = computed(() => {
    const q = queue.value
    const st = stats.value
    const total = totalLesson.value
    return {
      phase: phase.value,
      learned: st.learned,
      totalLesson: total,
      ratio: total > 0 ? st.learned / total : 0,
      progressPct: total > 0 ? Math.round((st.learned / total) * 100) : 0,
      streak: st.streak,
      fresh: q.fresh.length ? q.fresh[0] : null,
      freshCount: q.fresh.length,
      due: q.due,
      dueCount: q.due.length,
      dueTotal: q.dueCount,
      dueRemaining: q.remainingDueCount,
      suppressedNew: q.suppressedNew,
      hasTask: q.due.length > 0 || q.fresh.length > 0,
      challenge: challengePiece.value
    }
  })

  // ===== 动作 =====

  /**
   * 把一条远程/包内产物应用到内存（只换 bank；队列与统计是 computed，自动重算）。
   * @param {object} nextBank 已清洗的产物
   */
  function applyBank(nextBank) {
    if (!nextBank || !Array.isArray(nextBank.pieces)) return
    bank.value = nextBank
  }

  /**
   * 远程刷新落地（**在 `.then` 里**，绝不 await —— 见文件头「首屏纪律」）。
   * @param {object|null} nextBank `refreshFromRemote()` 的返回值（`null` = 远程不可达/不更新）
   */
  function onRemoteBank(nextBank) {
    if (!nextBank) return
    if (phase.value !== RECITE_PHASE.IDLE) {
      // I9：学员正在作答（或页面不静置）→ 不换；留到 `endAnswering()` 再应用
      pendingBank.value = nextBank
      return
    }
    pendingBank.value = null
    applyBank(nextBank)
  }

  /**
   * 把「今天」刷成**真实今天** —— 全 store 唯一的「刷新时间」实现（跨零点修复，team-lead 裁定）。
   *
   * 为什么必须修（不是「显示小瑕疵」）：
   *  - `bumpStreak` 的幂等判据是 `lastActiveDate === today`。陈旧 `today` 会把「凌晨那次作答」
   *    误判成**昨天那天的第二笔**而直接吞掉（`lastActiveDate` 停在旧日），
   *    次日正常作答时便被判为断更、`streak` 重置为 1 —— 断签是首页头号数字，不可接受；
   *  - `applyResult` 按旧日算 `nextDate`：整篇排期早一天，刚背完的篇**立刻又回到待重默**；
   *    `learnedAt` 也会记成旧的那天（`learnedAt` 只写不撤，计数不受影响但日期偏一天）。
   *
   * 调用点**只有三处**，且都必须走本函数（禁止各处手写一次取时间）：
   *  ① `doInit()` —— 初次加载落地产物后；
   *  ② `init()` 命中「已加载」的**提前 return 分支** —— 隔夜重进首页时纠正快照；
   *  ③ `submitResult()` 入口（`manual` 早退之后）—— 作答是「今天确实做了事」的唯一事实来源。
   * 并发加载期间（`inFlight` 已存在）不刷新：那时多刷一次没有意义（T03 复核点 ②）。
   *
   * ⚠️ I4：本文件取时间的字面调用只有 2 处 —— `today` 的 `ref` 初值（构造兜底）与本函数。
   *    队列/统计/调度全部只读 `today.value`，任何地方再取一次时间都是第二个时间源。
   */
  function syncToday() {
    today.value = getDateStr()
  }

  /**
   * 真正执行一轮加载（`init()` 的唯一实现）。
   * @param {{force?: boolean}} opts `force` = 清内存缓存后重读
   * @returns {Promise<void>}
   */
  async function doInit({ force = false } = {}) {
    phase.value = RECITE_PHASE.LOADING
    loadError.value = ''
    if (force) resetReciteBankCache()

    // ① 包内副本：**必成功才渲染**（失败转 error 态，绝不静默给空队列 —— §7.4）
    let bundled
    try {
      bundled = await loadBundled()
    } catch (err) {
      console.error('[recite] 包内篇目产物加载失败:', err)
      loadError.value = '背诵素材加载失败，请检查网络后重试'
      phase.value = RECITE_PHASE.ERROR
      loaded.value = false
      return
    }
    applyBank(bundled)
    syncToday()

    // ② 读库 + 指纹协调（`reconcile` 纯函数；只写「需要迁移的行」，不碰其它行）
    try {
      const stored = await db.getReciteProgressAll()
      const result = reconcile({ pieces: pieces.value, rows: stored })
      for (const row of result.migrated) await db.saveReciteProgress(row)
      for (const item of result.orphaned) {
        // §7.4：两边都对不上 → 点名 + **保留原行不删**
        console.warn(`[recite] 进度行无对应篇目（保留原行）：${item.key} ${item.pieceTitle}`)
      }
      rows.value = result.rows
      state.value = await db.getReciteState()
    } catch (err) {
      console.error('[recite] 背诵进度读取失败:', err)
      loadError.value = '背诵进度读取失败，请重试'
      phase.value = RECITE_PHASE.ERROR
      loaded.value = false
      return
    }

    loaded.value = true
    phase.value = RECITE_PHASE.IDLE

    // ③ 后台刷新远程：**不 await**（`refreshFromRemote` 内部已吞掉全部异常，这里只兜底防御）
    refreshFromRemote()
      .then(onRemoteBank)
      .catch((err) => console.warn('[recite] 远程刷新异常（已忽略）:', err))
  }

  /**
   * 初始化（幂等）：首屏由 `ReciteView`/`RecitePieceView` 调用。
   * 并发调用共享同一个 Promise；已加载过则直接 resolve（`force` 除外）。
   *
   * ⚠️ 「已加载」分支虽然跳过读盘/读库，**仍必须刷新 `today`**：内存产物可复用，
   *    但「今天」不能复用 —— 隔夜重进首页时它停在昨天，队列会少一天、
   *    且后续作答的记账基准全是旧的（见 `syncToday` 注释）。
   *    刷新放在 `inFlight` 判据**之后**：并发加载期间多刷一次没有意义（T03 复核点 ②）。
   * @param {{force?: boolean}} [opts]
   * @returns {Promise<void>}
   */
  function init(opts = {}) {
    if (inFlight) return inFlight
    syncToday()
    const force = opts && opts.force === true
    if (loaded.value && phase.value !== RECITE_PHASE.ERROR && !force) return Promise.resolve()
    inFlight = doInit({ force }).finally(() => {
      inFlight = null
    })
    return inFlight
  }

  /**
   * 强制重载（失败态的「重试」按钮）：清内存缓存 → 重读包内副本 → 重读库。
   * @returns {Promise<void>}
   */
  function reload() {
    loaded.value = false
    pendingBank.value = null
    return init({ force: true })
  }

  /** 进入单篇作答（I9：作答期间不接受 bank 热替换） */
  function beginAnswering() {
    if (phase.value === RECITE_PHASE.IDLE) phase.value = RECITE_PHASE.ANSWERING
  }

  /** 离开单篇作答：回到 idle 态，并把作答期间到达的远程新版落地（I9 的「推迟到下次进首页」） */
  function endAnswering() {
    if (phase.value === RECITE_PHASE.ANSWERING) phase.value = RECITE_PHASE.IDLE
    if (pendingBank.value && phase.value === RECITE_PHASE.IDLE) {
      const next = pendingBank.value
      pendingBank.value = null
      applyBank(next)
    }
  }

  /**
   * 设置「今天」（I4 的注入点）。
   *
   * ⚠️ **仅用于测试构造「陈旧 `today`」现场**：先 `setToday('2020-01-01')` 装作页面是那天打开的，
   *    再断言 `init()` / `submitResult()` 会把它纠正回真实日期。**生产路径不需要它** ——
   *    `doInit()` / `init()` 的已加载分支 / `submitResult()` 都会调 `syncToday()` 覆盖成本地今天。
   *    任何视图都不许调用本函数（在 `.vue` 里指定"今天"= 第二个时间源，正是 I4 禁止的）。
   * @param {string} day `YYYY-MM-DD`
   */
  function setToday(day) {
    if (typeof day === 'string' && day !== '') today.value = day
  }

  /** 设置大冲关手动模式标记（I6；视图按 `?manual=1` 调用） */
  function setManualOnly(flag) {
    manualOnly.value = flag === true
  }

  /**
   * 按**产物坐标**命中一篇（`unitNum + fileIndex + blockIndex`）。
   *
   * ⚠️ 只按坐标命中、不做任何模糊匹配：命中不了的坐标必须返回 `null`，
   *    由视图走 identity 守卫的 stale 分支（**不渲染、不写库**，I8）。
   *    `unitNum` 走 `normalizeUnitNum` 归一 —— 深链写 `7` 与站内写 `07` 必须等价，
   *    而补零规则**只有一份**（`@/utils/routeParams`），不在此手写 `padStart`。
   *
   * @param {string} unitNum 单元号（`'07'` / `'7'` 皆可）
   * @param {number|string} fileIndex 页下标
   * @param {number|string} blockIndex 页内 cloze 流水号
   * @returns {object|null} 篇目，未命中 → `null`
   */
  function getPiece(unitNum, fileIndex, blockIndex) {
    const unit = normalizeUnitNum(unitNum)
    const fi = toIndex(fileIndex)
    const bi = toIndex(blockIndex)
    if (typeof unit !== 'string' || unit === '' || fi === null || bi === null) return null
    return (
      pieces.value.find((p) => p.unitNum === unit && p.fileIndex === fi && p.blockIndex === bi) || null
    )
  }

  /**
   * 提交一次作答：**唯一写 `recite_progress` / `recite_state` 的入口**（§7.5）。
   *
   * 顺序（§4.1 时序图）：`applyResult` → 落库 → `syncReviewTriggers` → 落库 → `bumpStreak` → 落库。
   *  - I6：`manual === true`（大冲关模拟考场）→ **一行都不写**，直接返回；
   *  - I10 ①：判「是否全对」只信入参 `allCorrect` 布尔，**永不** `correct === total` 反推
   *    （`total === 0` 时 `0 === 0` 会把空篇判成全对）；
   *  - §7.4：主进度写失败 → `console.error` + **抛出**（页面提示「进度没保存成功，请重试」），
   *    不静默；复习触发/连续天数写失败只记日志，不阻断已成立的主进度。
   *
   * ⚠️ 跨零点（team-lead 裁定必修）：入口先 `syncToday()`，再把值**一次性**取进局部 `day`，
   *    下面三处消费（`applyResult` / `syncReviewTriggers` / `bumpStreak`）**必须共用这个 `day`** ——
   *    混用 `today.value` 会让三处拿到不同基准（改到一半最容易出的错正是这处漏一个）。
   *    `syncToday()` 放在 `manual` 早退**之后**：手动路径与修复前逐字一致（不写行、也不动 `today`）。
   *
   * @param {{pieceKey: string, allCorrect?: boolean, manual?: boolean}} params
   * @returns {Promise<{ok: boolean, manual: boolean, row?: object, reviewRows?: Array<object>}>}
   * @throws {Error} 未知篇目 / 主进度落库失败
   */
  async function submitResult({ pieceKey, allCorrect = false, manual = false } = {}) {
    // I6：手动入口不写任何 `recite_progress` 行（P0-9）
    if (manual === true || manualOnly.value === true) {
      return { ok: true, manual: true }
    }
    // 跨零点：作答前先把「今天」拉回真实今天（三处消费共用同一个 day）
    syncToday()
    const day = today.value
    const piece = pieceByKey.value.get(pieceKey)
    if (!piece) throw new Error(`[recite] 未知篇目：${pieceKey}`)

    const prevRow = rowMap.value.get(pieceKey) || null
    const nextRow = applyResult({
      prevRow,
      piece,
      allCorrect: allCorrect === true,
      today: day
    })

    try {
      await db.saveReciteProgress(nextRow)
    } catch (err) {
      console.error('[recite] 背诵进度保存失败:', err)
      // 带上 `cause` 保留原始异常（`preserve-caught-error`）；页面对用户只显示这句短文案
      throw new Error('进度没保存成功，请重试', { cause: err })
    }
    let mergedRows = upsertRow(rows.value, nextRow)

    // 复习篇条件触发（P0-7）：幂等，只返回「本次新满足」的行
    let reviewRows = []
    try {
      reviewRows = syncReviewTriggers({ pieces: pieces.value, rows: mergedRows, today: day })
      for (const row of reviewRows) await db.saveReciteProgress(row)
      if (reviewRows.length) mergedRows = mergedRows.concat(reviewRows)
    } catch (err) {
      // 触发失败不阻断已成立的主进度（主进度已落库）；仅留痕
      console.error('[recite] 复习篇触发失败:', err)
    }
    rows.value = mergedRows

    // 连续天数（Q6 临时规则；无任务日不判负不推进）
    try {
      const nextState = bumpStreak({ state: state.value, today: day, hasTaskToday: true })
      await db.saveReciteState(nextState)
      state.value = nextState
    } catch (err) {
      console.error('[recite] 连续天数保存失败:', err)
    }

    return { ok: true, manual: false, row: nextRow, reviewRows }
  }

  return {
    // 状态
    bank,
    rows,
    state,
    phase,
    loadError,
    today,
    manualOnly,
    // 派生
    pieces,
    rowMap,
    pieceByKey,
    queue,
    stats,
    totalLesson,
    challengePiece,
    viewModel,
    // 动作
    init,
    reload,
    beginAnswering,
    endAnswering,
    setToday,
    setManualOnly,
    getPiece,
    submitResult
  }
})
