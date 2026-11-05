/**
 * 存储持久化 / 配额诊断（T3 独立模块，零依赖）
 *
 * 目的：在首屏**尽力**向浏览器申请持久化存储（persist()），并顺手记录一次配额诊断值，
 * 供开发者在真机（尤其 Tauri Android WebView）上排查「为什么进度会丢」。
 *
 * 五条纪律（改动前请先读完）：
 *  1. **逐项 typeof 探测**：`navigator.storage` / `persist` / `estimate` / `persisted`
 *     都先判存在与类型，再调用 —— 自定义 scheme 的老 WebView 可能只实现其中一部分。
 *  2. **`isSecureContext` 只记录、不当门槛**：Tauri Android 自定义 scheme 下它可能为 false，
 *     但 Storage API 仍可用；用它做早退会让真机白白失去持久化，且现场没有任何报错。
 *  3. **每个 await 单独 try/catch**：persist() 失败不能挡住 estimate() 的诊断，
 *     反之亦然；异常一律吞进 `report.error` 并在末尾**只发一次** `console.warn`。
 *     `persist()` 返回 `false` 是 MDN 明述的 best-effort **正常结果**（例如浏览器按启发式拒绝），
 *     不是异常：不提示用户、不重试、不轮询，只如实记进 `granted`。
 *  4. **诊断值不落库**：`estimate()` 是易失读数，写进 `recite_state` 会再逼一次行形状变更、
 *     还会让同步清单多一个字段，收益为零。本模块不 import 任何 store / DB / 同步清单。
 *  5. **绝不 unhandled rejection**：本函数自身不抛；调用方可以放心 `.catch()` 都不写。
 *     成功时一次 `console.info`，失败时一次 `console.warn`，都是开发者日志而非用户提示。
 *
 * ⚠️ 本模块刻意**零 import**：它是纯浏览器 API 的薄封装，任何依赖链都会把 Vue / DOM /
 *    IndexedDB 拖进「首屏最早执行」的这一层，也更容易撞上 CSP 的静态扫描口径。
 *
 * @author engineer (Alex)
 */

/**
 * report 的唯一构造器（也是 `lastReport` 的初值）。
 * 字段形状由 T3 契约定死，禁止顺手加字段 —— 调用方与单测都按这个键集合比对。
 * @returns {{secureContext: boolean, hasStorageManager: boolean, hasPersist: boolean,
 *   hasEstimate: boolean, granted: boolean|null, persisted: boolean|null,
 *   usage: number|null, quota: number|null, error: string}}
 */
function createReport() {
  return {
    secureContext: false,
    hasStorageManager: false,
    hasPersist: false,
    hasEstimate: false,
    granted: null,
    persisted: null,
    usage: null,
    quota: null,
    error: ''
  }
}

/**
 * 最近一次 `ensureStoragePersistence()` 的完整报告（内存快照，不落库）。
 * 初值 = 全空报告：调用方在 ensure 之前读到的也是一份合法形状的 report。
 */
let lastReport = createReport()

/**
 * 安全取 StorageManager：无 `navigator` / 无 `storage` / `storage` 不是对象 → 一律 null。
 * 用 typeof 而不是 `if (navigator.storage)`：某些宿主访问这个属性本身就会抛。
 * @returns {object|null} StorageManager 或 null
 */
function storageManager() {
  const nav = typeof navigator === 'undefined' ? null : navigator
  if (!nav || typeof nav !== 'object') return null
  const manager = nav.storage
  return manager && typeof manager === 'object' ? manager : null
}

/**
 * 把异常收敛成一行文本（`err.message` 不可信时也不能让 catch 自己再抛）。
 * @param {unknown} err catch 到的任意值
 * @returns {string} 可打印的错误描述
 */
function describeError(err) {
  try {
    if (err && typeof err.message === 'string' && err.message) return err.message
    return String(err)
  } catch {
    return 'unknown error'
  }
}

/**
 * 取一份 report 的浅副本。
 * report 的字段全是原始值（boolean / number / null / string），浅拷贝即完整副本 ——
 * 调用方改副本不会碰到 `lastReport`，避免「诊断快照被下游顺手改掉」这种无从追查的分叉。
 * @param {ReturnType<typeof createReport>} source 源报告
 * @returns {ReturnType<typeof createReport>} 新对象
 */
function snapshot(source) {
  return { ...source }
}

/**
 * **同步**能力探测：只做 typeof 判定，不 await、不调用任何 API、不写 `lastReport`。
 *
 * `secureContext` 取自 `window.isSecureContext`（仅记录，见文件头纪律 2）；
 * `persisted()` 的可用性在 `ensureStoragePersistence()` 里单独 typeof 探测 —— report
 * 契约里没有 `hasPersisted` 键，故用「`persisted === null` 表示不可用/未取到」表达。
 *
 * @returns {ReturnType<typeof createReport>} 一份**新的**能力报告（异步字段均为 null）
 */
export function storageCapabilities() {
  const report = createReport()
  report.secureContext = typeof window !== 'undefined' && window.isSecureContext === true

  const manager = storageManager()
  report.hasStorageManager = manager !== null
  report.hasPersist = manager !== null && typeof manager.persist === 'function'
  report.hasEstimate = manager !== null && typeof manager.estimate === 'function'
  return report
}

/**
 * 申请一次持久化存储 + 记录一次配额诊断。**一次尝试，永不抛**。
 *
 * 顺序：persist() → persisted() → estimate()，三步各自 try/catch，互不阻断；
 * 缺哪个能力就跳过哪个（字段保持 null）。任何异常都进 `report.error`，末尾统一一次 warn。
 *
 * @returns {Promise<ReturnType<typeof createReport>>} 本次报告的副本（不抛、不 unhandled rejection）
 */
export async function ensureStoragePersistence() {
  const report = storageCapabilities()
  const manager = storageManager()
  const problems = []

  // ① persist()：false 是正常结果，不需要任何补救动作
  if (report.hasPersist && manager !== null) {
    try {
      const value = await manager.persist()
      // persist() 契约返回 boolean；非 boolean 一律落成 null，绝不把 truthy 噪声当成"已授权"
      report.granted = typeof value === 'boolean' ? value : null
    } catch (err) {
      problems.push(`persist(): ${describeError(err)}`)
    }
  }

  // ② persisted()（可选能力）：缺函数就跳过，report.persisted 保持 null
  if (manager !== null && typeof manager.persisted === 'function') {
    try {
      const value = await manager.persisted()
      report.persisted = typeof value === 'boolean' ? value : null
    } catch (err) {
      problems.push(`persisted(): ${describeError(err)}`)
    }
  }

  // ③ estimate()：易失诊断值，Number.isFinite 兜底（字符串/NaN/Infinity/null 一律 null）
  if (report.hasEstimate && manager !== null) {
    try {
      const value = await manager.estimate()
      const usage = value == null ? null : value.usage
      const quota = value == null ? null : value.quota
      report.usage = Number.isFinite(usage) ? usage : null
      report.quota = Number.isFinite(quota) ? quota : null
    } catch (err) {
      problems.push(`estimate(): ${describeError(err)}`)
    }
  }

  report.error = problems.join(' | ')
  lastReport = report

  if (problems.length) {
    console.warn('[storageQuota] 存储诊断未完成（已忽略，不影响首屏）:', report.error)
  } else {
    console.info(
      '[storageQuota] 持久化申请完成',
      `granted=${String(report.granted)}`,
      `persisted=${String(report.persisted)}`,
      `usage=${String(report.usage)}`,
      `quota=${String(report.quota)}`
    )
  }

  return snapshot(report)
}

/**
 * 返回最近一次 `ensureStoragePersistence()` 报告的**副本**。
 * @returns {ReturnType<typeof createReport>} 内存快照副本；改它不影响内部状态
 */
export function getLastStorageReport() {
  return snapshot(lastReport)
}
