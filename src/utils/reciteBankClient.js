/**
 * 每日背诵 · 篇目产物（recite-bank）的运行时加载器 —— **双源 SWR**
 *
 * 设计依据：`docs/design-recitation.md` §1 异议 7 / §5 T03 / §7.4。
 *
 * 两源：
 *  ① **包内副本**（`fetchJson('./', RECITE_BANK_PATH)`）—— 与安装包一起发布，
 *     本地协议 / HTTP 缓存通常 < 50 ms → **先渲染**，离线与弱网都秒开；
 *  ② **远程副本**（`fetchJson(siteRoot(), RECITE_BANK_PATH)`）—— 内容在线更新后
 *     装好的 App 也能看到；超时 2500 ms（不是 `DEFAULT_TIMEOUT_MS` 的 8000，
 *     首屏不能为一次后台刷新白屏 8 秒）。
 *
 * 版本裁决：**`contentVersion` 取较大者**，比较一律走 `mergeContent.isNewer`
 * （`remote > local` 才替换；相等/更旧一律丢弃 —— 前进式回滚，旧版绝不覆盖新版）。
 * `contentVersion` 是 `CONTENT_VERSION` 的**投影**，全仓只有一个版本权威（P-S51）。
 *
 * 失败语义（这是本文件最容易被改错的地方）：
 *  - `loadBundled()` 失败 → **抛错**。它是主渲染路径，失败必须让 store 转 `status:'error'`
 *    （静默返回空队列 = 学员以为"今天没任务"）。
 *  - `refreshFromRemote()` **任何异常一律吞掉**，返回 `null` + 一行 `console.warn`。
 *    远程不可达是**常态**，不是错误态；绝不许冒泡到首屏。
 *
 * ⚠️ **`RECITE_BANK_PATH` 只从 `@/content/reciteBank` import，本文件不得再定义一份**
 *    （设计 §7.2：产物路径常量全仓唯一定义在 `reciteBank.js`）。
 *    设计 §5 T03 曾写作"`reciteBankClient.js` 里 `RECITE_BANK_PATH = ...`"，
 *    与 §7.2 冲突；以 §7.2 为准（双份常量 = 两个真相源，本仓为此栽过）。
 *
 * ⚠️ 缓存**只用进程内 `Map`**：刻意不用 `content_cache` / `readByKey` / `readLocalMaxVersion`
 *    （那套依赖 `content_meta` 的读时闸门，是给 search / practice **分片**用的；
 *    给一个随包发布、每次进首页都读的小 JSON 再套一层 IDB 闸门是纯负债）。
 *
 * ⚠️ CSP：只用 `fetch` + `JSON.parse`（经 `fetchJson`）；禁止动态 `import()`
 *    （`tests/csp-guard.test.js` L6 扫），禁止出现裸主机字符串（L4 扫）。
 */
import { RECITE_BANK_PATH, sanitizeBank } from '@/content/reciteBank'
import { fetchJson } from '@/utils/fetchJson'
import { siteRoot } from '@/utils/assetBase'
import { isNewer } from '@/content/mergeContent'

/** 包内副本超时：本地协议通常 <50 ms，3 s 足够兜住慢设备冷启动 */
export const BUNDLED_TIMEOUT_MS = 3000

/** 远程刷新超时（不等 `DEFAULT_TIMEOUT_MS` 的 8000：首屏是 idle 态后台刷新，不能长期挂着） */
export const REMOTE_TIMEOUT_MS = 2500

/** 一期只有语文一科（与构建产物 `chinese.json` 对应） */
export const DEFAULT_SUBJECT = 'chinese'

/** 进程内二级缓存：`subject → ReciteBank`（生产只需一次读盘/一次网络） */
const memory = new Map()

/**
 * 清空进程内缓存（供测试隔离；生产无需调用）。
 */
export function resetReciteBankCache() {
  memory.clear()
}

/**
 * 取当前内存里的产物（未加载过 → `null`）。
 * 供 store / 视图读取"当前生效的那一版"（例如 SWR 热替换后重新渲染）。
 * @param {string} [subject] 学科 key
 * @returns {object|null} ReciteBank
 */
export function getCachedBank(subject = DEFAULT_SUBJECT) {
  return memory.get(subject) || null
}

/**
 * 载入**包内副本**（主渲染路径，失败抛错）。
 *
 * 命中内存缓存则直接返回 —— 首屏重复进入不重复读盘。
 *
 * @param {string} [subject] 学科 key
 * @returns {Promise<object>} 清洗后的 ReciteBank
 * @throws {Error} 网络失败 / 超时 / 非 2xx / 非法 JSON / 形状不可用
 */
export async function loadBundled(subject = DEFAULT_SUBJECT) {
  const cached = memory.get(subject)
  if (cached) return cached

  const raw = await fetchJson('./', RECITE_BANK_PATH, { timeout: BUNDLED_TIMEOUT_MS })
  const bank = sanitizeBank(raw)
  if (!bank) {
    // 形状不可用（schemaVersion 不符 / contentVersion 不是数字 / pieces 不是数组）→ 视为该源不可用。
    // 这是主渲染路径，必须抛错让 store 转 error 态（§7.4）。
    throw new Error(`[recite] 包内篇目产物不可用：${RECITE_BANK_PATH}`)
  }
  memory.set(subject, bank)
  return bank
}

/**
 * 从**远程**刷新产物（SWR 的 revalidate 半程）。
 *
 * 返回：
 *  - 新版 ReciteBank（已写入内存，调用方应重算队列/统计）；
 *  - `null`（远程不可达 / 形状不可用 / 版本不更新 / dev·Web 两源同址）—— **不是错误**。
 *
 * @param {string} [subject] 学科 key
 * @returns {Promise<object|null>} 新的 ReciteBank 或 `null`
 */
export async function refreshFromRemote(subject = DEFAULT_SUBJECT) {
  try {
    // ⚠️ 必须放在最前面：dev / Web 下 `siteRoot()` 就是 `'./'`，与包内副本**同址**。
    //    不跳过就会在每次进首页时多发一次完全重复的请求（设计 §1 异议 7 末尾的约束）。
    if (siteRoot() === './') return null

    const cached = memory.get(subject) || null
    const localVersion = cached ? cached.contentVersion : null
    const raw = await fetchJson(siteRoot(), RECITE_BANK_PATH, { timeout: REMOTE_TIMEOUT_MS })
    const bank = sanitizeBank(raw)
    if (!bank) {
      console.warn(`[recite] 远程篇目产物形状不可用，沿用包内副本：${RECITE_BANK_PATH}`)
      return null
    }
    // 版本闸门：相等/更旧一律不写（旧版绝不覆盖新版）；本函数是唯一比较点，禁内联 a > b
    if (!isNewer(bank.contentVersion, localVersion)) return null

    memory.set(subject, bank)
    console.info(`[recite] bank source=remote v=${bank.contentVersion}`)
    return bank
  } catch (err) {
    // 远程不可达是常态：吞掉，保留包内副本，只留一行 warn（§7.4 明确不许降级成 error 态）
    console.warn('[recite] 远程篇目刷新失败，沿用包内副本：', err)
    return null
  }
}
