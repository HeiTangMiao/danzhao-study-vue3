/**
 * 内容快照 / 清单的形状定义（纯 ESM，零 import —— 构建脚本与未来浏览器 loader 两端共用）
 *
 * 背景（批 S1，见 docs/proposals/batch-s1-tasks.md）：
 *   双轨内容方案要把「内置内容」之外的**远程快照**也变成可拉取的静态资产 ——
 *   public/content-remote/ 下放一份 manifest.json（清单）+ 每单元一个分片 JSON。
 *   S1 只做**纯构建期**产出，零运行时影响（不接 loadPage / 不接 IndexedDB / 不接 CSP）。
 *
 * ⚠️ 本文件刻意不 import 任何模块：scripts/build-content-remote.mjs 会直接 import 它，
 *    一旦引入依赖链就会把浏览器侧代码拖进 Node 构建进程（与 searchIndex.js:9-11 同款纪律）；
 *    未来 S2 的浏览器 loader 也要 import 它，故必须零依赖。
 *
 * ⚠️ 三方（发布脚本 / 未来 S2 loader / 测试）必须对下面几件事看法一致：
 *    分片路径、单元键、清单文件名、op 取值、体积告警阈值。一旦分叉，客户端就会
 *    fetch 一个不存在的分片，或对拿到的分片算不出同一个 hash —— 所以只在这里定义一次。
 */

/**
 * 清单 / 分片的自述版本号（协议形状版本）
 *
 * 与 contentVersion 的区别：本号描述「协议长什么样」（结构破坏性变更才 +1）；
 * contentVersion 描述「内容发布了几版」（单调递增）。两者互不派生。
 */
export const SCHEMA_VERSION = 1

/**
 * 内容版本号（单调递增整数，人工 / CI 发布时手动 +1）
 *
 * 为什么不是内容指纹：前进式回滚需要一个**可比较大小**的号 —— 指纹只能表达
 * 「内容是否相同」，无法表达「发了一版新的、但内容恰好相同」。故取单调号（P-S02 a），
 * 另在 manifest 里附 contentHash（全页指纹，不含时间戳）供去重与审计。
 *
 * ⚠️ **发布纪律（2026-10-15 实证）**：只要 `src/content/**` 有改动并要发布远程快照，
 *    就必须 +1 再构建。漏 bump 的后果不是「拉得慢」而是**永远拉不到**：
 *    客户端 `isNewer(remoteVer, maxSeen)` 在版本闸门处直接返回 false（contentClient.js:176），
 *    单元级哈希比对在闸门**之后**，够不着 —— 已缓存旧版的客户端永久停在旧内容，
 *    且不报错、不崩溃（「永不变砖」掩盖问题的一面）。
 *    **完整流程（发布 / 回滚）以 docs/content-release-runbook.md 为唯一 SOP**：
 *    改内容 → CONTENT_VERSION +1 → 重建 → 产物自检 → 备份 → 部署（先分片后清单）→ 部署后验证。
 *    回滚同样走该流程（发一版**号更大**的旧内容，**严禁**降号或同号覆盖）。
 */
export const CONTENT_VERSION = 3

/**
 * 预留但**当前不产出**的清单子段（S5+ 才填充）
 *
 * 为什么现在就写键位：协议「一次到位」—— 留键位零成本，避免 S5+ 改协议导致
 * 老客户端不认识新字段。S1/B1 阶段这两个键恒为 null（P-S07 a）。
 */
export const OPTIONAL_SECTIONS = ['search', 'practice']

/**
 * 单个分片的体积告警阈值（字节）—— 超限时发布脚本 console.warn **点名**
 *
 * 只告警、不截断：远程快照必须与内置内容**同构**（正文原样搬运），截断会让客户端
 * 拿到的页面缺尾部区块，属于静默数据丢失。阈值的用途是拦「内容爆炸式增长」，
 * 不是硬带宽上限。
 * 512KB 对当前最大分片留约数倍余量（分片按单元**按需拉取**，一次只下一片）。
 */
export const SHARD_WARN_BYTES = 512 * 1024

/** 远程内容根目录（public/ 下的相对路径前缀） */
export const REMOTE_DIR = 'content-remote'

/** 清单文件名（public/ 下的相对路径） */
export const MANIFEST_PATH = 'content-remote/manifest.json'

/**
 * 单元分片的路径（public/ 下的相对路径）
 *
 * ⚠️ 口径钉死：manifest.units[k].path 存的是**相对 content-remote/ 的路径**
 * （如 "math/01.json"，不带 public/、不带 content-remote/ 前缀），
 * 客户端 fetch 时拼 `基址 + '/content-remote/' + path`。
 *
 * @param {string} subject 学科 key（math / chinese / computer）
 * @param {string} unitNum 单元编号（字符串，如 "01"）
 * @returns {string} 分片在 public/ 下的相对路径
 */
export function shardPath(subject, unitNum) {
  return `${REMOTE_DIR}/${subject}/${unitNum}.json`
}

/**
 * 单元键（manifest.units 的键，全局唯一）
 *
 * 学科 + 单元号即单元身份：单元号在学科内唯一，故加学科前缀即可全局唯一。
 * @param {{subject: string, unitNum: string}} meta 页面元信息
 * @returns {string} 形如 `math/01`
 */
export function unitKeyOf(meta) {
  return `${meta.subject}/${meta.unitNum}`
}

/**
 * 页内坐标键（单元内唯一）
 *
 * ⚠️ 与 fileKey 是两回事，别混用：
 *   - 本键 = 导航坐标（unitNum/fileIndex），与 src/content/searchIndex.js 的
 *     bodyKeyOf / practiceBank.js 的 practiceKeyOf **同款风格**，用于「定位页面」；
 *   - fileKey = 业务去重键，由 pageMeta.js 的 pageFileKeyOf(meta) 派生
 *     （形如 `math_01_集合的概念与表示`），用于错题去重 / 进度累计 / contentHash 排序。
 * 本文件零 import，故**不**重新实现 pageFileKeyOf —— 需要 fileKey 时直接 import pageMeta。
 *
 * @param {{unitNum: string, fileIndex: number}} meta 页面元信息
 * @returns {string} 形如 `01/0`
 */
export function pageKeyOf(meta) {
  return `${meta.unitNum}/${meta.fileIndex}`
}

/**
 * 分片内页面的操作语义（协议取值白名单）
 *
 * - upsert：**更新既有坐标**的 blocks（B1 唯一实际产出的值）
 * - append：远程**新增**单元/页面 —— 仅协议预留（属 B2），S1/B1 不产出
 *
 * 为什么不直接用字符串字面量：客户端要分支处理，取值写错不会报错只会走错分支；
 * 常量让「新增一种 op」变成一处可见改动（与 PAGE_META_KEYS 同款纪律）。
 */
export const OP = {
  UPSERT: 'upsert',
  APPEND: 'append'
}

/**
 * hash 前缀（统一带前缀，便于未来换算法时区分）
 * 产物形如 `sha256:<hex64>`
 */
export const HASH_PREFIX = 'sha256:'
