/**
 * 远程资产的共享编排原语（批 S5 · S5-2，内容 / 搜索 / 题库三层共用）
 *
 * 职责只有三件，且都**不自己造判据**（H7 / R-9）：
 *   1. `gateAndTargets` —— 闸门三模式，唯一实现是 `mergeContent.computeRetrySet`；
 *   2. `readByKey` —— 读路径（进程内二级缓存 → IndexedDB）+ **读时闸门**（P-S53 / R-3）；
 *   3. `commitAtomically` —— body 先落、meta 后交（S4-2 已钉死的原子写模式）。
 *
 * ⚠️ 为什么搜索 / 题库也要走同一套：2026-10-15 事故的根因是「版本闸门 + 发布纪律」，
 *    若搜索 / 题库另写一套降级语义，就会重现批 S5 卡 §0⑥ 指出的「三者语义不一」。
 *
 * ⚠️ 与内容层的**关键差异**（卡 §0 更正 4）：搜索 / 题库**没有内置兜底层**
 *    （内容层有 `src/content/**` 的懒加载 chunk 兜底，页数以该目录为准）。
 *    所以这里的降级终点是「缓存」或「保持旧值」，
 *    不是「回退内置」——调用方必须自己决定「没有缓存时怎么办」（搜索置 error 态 / 题库抛错）。
 */
import { CONTENT_META_KEY } from '@/content/contentManifest'
import { computeRetrySet, isNewer } from '@/content/mergeContent'
import { useStudyDbStore } from '@/stores/studyDb'

/**
 * 取 DB 访问器：**失败返回 null，绝不抛**（搜索 / 题库读路径的降级起点）
 *
 * 为什么必须可降级：存储对搜索 / 题库而言只是**加速器**（缓存命中省一次往返），
 * 不是数据源。而 `useStudyDbStore()` 在 Pinia 未激活（如纯组件单测、某些 SSR / 预渲染
 * 上下文）时会抛，IDB 本身在隐私模式 / 配额耗尽 / 部分 webview 下也不可用 ——
 * 若让这些情况连带打掉整条读路径，等于把「功能可用性」挂在「可选优化」上，
 * 与红线 2（读路径不因存储失败而失败）直接冲突。故统一在此处收口成 null。
 *
 * null 的下游语义（三处一致）：**缓存 miss / 版本未知 / 不写缓存** → 读路径退化为「直连远程」。
 *
 * @returns {object|null} DB 访问器；不可用时 null
 */
export function safeDb() {
  try {
    return useStudyDbStore()
  } catch {
    return null
  }
}

/**
 * 闸门三模式（唯一实现 = `computeRetrySet`；此处不重写第二套比较）
 * @param {object} remote 远程清单
 * @param {object|null} local 本地 content_meta 记录
 * @returns {{mode: 'newer'|'heal'|'skip', targets: Array}}
 */
export function gateAndTargets(remote, local) {
  return computeRetrySet(remote, local)
}

/**
 * 读时闸门：缓存条目是否「够新」
 *
 * P-S53 / R-3 的正解 —— 判据写死：`entry.version < minVersion` 视为**未命中**。
 * 少了这一条，「有缓存就用」会把旧题 / 旧索引静默卖给用户（与 2026-10-15 同型的「看不出错」）。
 *
 * @param {object|null} entry 缓存条目
 * @param {number|null} minVersion 当前已见版本（清单 contentVersion）
 * @returns {boolean}
 */
export function isFreshEntry(entry, minVersion) {
  if (!entry) return false
  if (minVersion == null) return true // 不知道线上版本 → 不拦（离线场景）
  // isNewer(远程, 本地) 语义是「远程更新」；此处反过来问「本地是否落后」
  return !isNewer(minVersion, entry.version)
}

/**
 * 读缓存条目：进程内二级缓存 → IndexedDB → 读时闸门
 *
 * @param {object|null} store 具备 `getContentCache(key)` 的 DB 访问器（测试可注入假 store）；
 *                            **null（存储不可用）按「无缓存」处理**
 * @param {string} key 缓存键（内容层 unitKey / `search:meta` / `practice:{subject}` …）
 * @param {{memory?: Map|null, minVersion?: number|null}} [options]
 * @returns {Promise<{entry: object|null, source: 'memory'|'idb'|'miss'|'stale'|'error'}>}
 *          source 用于调用方决定「要不要联网」与「失败时怎么降级」；**本函数不抛**（红线 2）。
 *          `stale` 一律不带 entry（entry 恒 null）：调用方会再做一次 `minVersion: null` 的裸读
 *          拿回旧值 —— 这条契约让「够新才直接用、陈旧只作兜底」只有一条路。
 */
export async function readByKey(store, key, { memory = null, minVersion = null } = {}) {
  /** 进程内那份（可能已陈旧）：读不到 IDB 时它仍是唯一的旧值来源（R-S5-A） */
  const memHit = memory && memory.has(key) ? memory.get(key) : null
  // 手里的旧值能不能当兜底：只要有条目，陈旧与否都交给调用方的第二次裸读去判断
  const staleOr = (fallback) => ({ entry: null, source: memHit ? 'stale' : fallback })

  if (memHit && isFreshEntry(memHit, minVersion)) return { entry: memHit, source: 'memory' }
  // 存储不可用（`safeDb()` 返回 null）≡ 没有缓存：读路径照常走远程，不判为错误
  // ⚠️ 但 IDB 拿不到 ≠ 手里的旧值该扔：仍报 stale，让调用方有得兜底（R-S5-A）
  if (!store) return staleOr('miss')
  let entry
  try {
    entry = await store.getContentCache(key)
  } catch {
    return staleOr('error')
  }
  if (!entry) return staleOr('miss')
  if (memory) memory.set(key, entry)
  if (!isFreshEntry(entry, minVersion)) return { entry: null, source: 'stale' }
  return { entry, source: 'idb' }
}

/**
 * 原子写：**body 先落，meta 后交**（提交点）
 *
 * 任一 body 写入抛错 → 直接向上抛，且 **meta 不会被写**（提交点未到）：
 * 中途断电 / 异常不会让闸门误以为已更新（S4-2 已钉死，测试有反向锚）。
 *
 * ⚠️ db 为 null（存储不可用）时是**空操作**而不是抛错：只有写路径（`doRefresh`）需要
 *    「写不进去就报错」，读路径的缓存写不该阻断（见 `commitBestEffort`）。
 *
 * @param {object|null} db 具备 `saveContentCache` / `saveContentMeta` 的 DB 访问器；null = 空操作
 * @param {Array<object>} cacheEntries 待写缓存条目（每项须带 `key`）
 * @param {object|null} metaPatch content_meta 记录（提交点；传 null 则只落 body）
 * @param {{memory?: Map|null}} [options] 进程内二级缓存（写成功后才回填）
 * @returns {Promise<{written: number, skipped?: boolean}>}
 */
export async function commitAtomically(db, cacheEntries, metaPatch, { memory = null } = {}) {
  if (!db) return { written: 0, skipped: true }
  for (const entry of cacheEntries) {
    await db.saveContentCache(entry)
    if (memory) memory.set(entry.key, entry)
  }
  if (metaPatch) await db.saveContentMeta(metaPatch)
  return { written: cacheEntries.length }
}

/**
 * 读路径用的缓存写：**失败就放弃缓存，绝不向上抛**
 *
 * 为什么读路径不能直接用 `commitAtomically`：远程已经取回可用数据了，此时 quota 超了 /
 * 事务被打断等**存储侧**故障若往外抛，调用方会把它当成「远程失败」，于是明明有数据
 * 却置 error 态 —— 这正是红线 2 要防的「存储故障伪装成内容故障」。缓存没写成只是
 * 下次多拉一次，不影响本次正确性。
 *
 * @param {object|null} db 同 `commitAtomically`
 * @param {Array<object>} cacheEntries 待写缓存条目
 * @param {object|null} metaPatch content_meta 记录
 * @param {{memory?: Map|null}} [options]
 * @returns {Promise<{written: number, failed?: boolean, skipped?: boolean}>}
 */
export async function commitBestEffort(db, cacheEntries, metaPatch, options = {}) {
  try {
    return await commitAtomically(db, cacheEntries, metaPatch, options)
  } catch {
    return { written: 0, failed: true }
  }
}

/**
 * 本地已见版本（`content_meta.contentVersion`）—— 读时闸门的上限
 *
 * 为什么读**本地**而不是每次拉线上清单：内容层的后台刷新（`startBackgroundRefresh`）
 * 已经在每次启动时把这个值更新到线上代次；读路径再拉一次 manifest 会让「缓存命中」
 * 也要付一次网络往返，违背离线优先与「预取只取 meta」的加载时机契约。
 * 内容层刷新被阻断时两者一同变旧，语义一致（P-S51：一个版本权威）。
 *
 * @param {object} db 具备 `getContentMeta(key)` 的 DB 访问器
 * @returns {Promise<number|null>} 无记录 / 读失败 → null
 */
export async function readLocalMaxVersion(db) {
  try {
    const meta = await db.getContentMeta(CONTENT_META_KEY)
    const raw = meta?.contentVersion
    // null / undefined = 「本地无记录」，必须返回 null 而不是 0 ——
    // 否则 `0 != null` 会让调用方以为「知道代次是 0」而把无版本号的产物写进缓存
    const v = Number(raw)
    return raw != null && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}
