/**
 * 内容合并裁决（批 S2 · 纯函数层，零副作用 / 零 IO，便于单测钉死）
 *
 * 职责：把「远程 vs 内置」的优先级裁决、哈希比对、版本闸门三件小事收在一处，
 *      供 src/utils/contentClient.js（拉取层）与 src/content/loadPage.js（入口层）共用。
 *
 * ⚠️ 为什么单独成文件（H7 单一真相源）：
 *    「谁赢」的裁决只有一处实现，contentClient 与 loadPage 都不能各自写一遍 if，
 *    否则「远程优先级」会在两条路径上慢慢漂移（一方改了另一方没改 = 静默走错源）。
 *
 * ⚠️ 为什么全是纯函数：本文件不 fetch、不碰 IndexedDB、不 import Vue —— 测试可以
 *    直接注入 fixture 断言，不需要 fake-indexeddb 或 mock fetch。
 *
 * ⚠️ 哈希校验的能力边界（批 S2 复核已确认，team-lead 采纳）：
 *    客户端**不重算** sha256，只比对「写入分片时随页登记的哈希」（见 verifyHash）。
 *    因此它能检出：缓存被写坏 / 半写 / 被旧版本覆盖；
 *    但**检不出**：服务端发布了错误内容、而该内容与它自带的 hash 自洽。
 *    后者由**发布期**把关（`scripts/validate-content.mjs` 与
 *    `build-content-remote.mjs` 共用同一份 `createBlockValidator`，校验不过不落盘）。
 *    威胁模型是我们自己的域名 + HTTPS + 非对抗场景：客户端哈希的用途是「防脏数据」，
 *    不是「防篡改」；真正的完整性闸门是**单元级**的
 *    （`content_cache.units[k].hash !== manifest.units[k].hash` → 重拉），那道不依赖重算。
 *    不重算的理由：重算需把 `canonicalJSON` 搬进浏览器包（H7 禁止复制），且
 *    `crypto.subtle` 在 Tauri 的 `tauri://localhost` 下是否算 secure context 无法自证 ——
 *    一旦不可用会**静默退化成永不校验**，比现在这条确定可用的比对更糟。
 *
 * ⚠️ **S4 已复议（2026-10-15 真实事故之后）：维持「不重算」，本注释即决议留档。**
 *    - 事故根因是**版本闸门 + 发布纪律**（漏 bump / 同号覆盖 / CI 不发远程内容），
 *      与哈希校验**无因果**：重算一条都治不到。
 *    - 重算的**唯一**增量是「服务端发布了错误内容但与其自带 hash 自洽」，而
 *      `build-content-remote.mjs` 里 `hash` 与 `blocks` 是**同源计算**的 → 无篡改时不可能失配；
 *      该场景的职责在**发布期校验**（同上注释）。
 *    - 两个备选方案各有硬伤：`crypto.subtle`（不可用即静默退化）；仓内纯 JS sha256
 *      （多一份哈希实现 = 多一个「实现有 bug → 全页误判 → 全站回退内置」的失效模式）。
 *    - **翻案触发条件**（满足其一再议，届时只走纯 JS 方案并带 fail-safe 守卫）：
 *      出现真实「服务端自洽但错误」事故 / 发布链使用者不再可信 / 域名与证书信任被打破。
 *      详见 `docs/proposals/batch-s4-tasks.md` §4（A/B 对比与推荐）。
 *    - 反向锚：`tests/s4-verify-gate.test.js` 断言本文件与 `contentClient.js` 的**代码**
 *      （排除注释）不含 `crypto.subtle` / `createHash` 引用 —— 防「偷偷加重算」。
 *
 * 上游形状定义一律来自 src/content/contentManifest.js（S1 落盘），本文件**不复制**其常量。
 */
import { HASH_PREFIX, SCHEMA_VERSION } from './contentManifest'

/** `sha256:` 后的摘要形态：64 位小写十六进制 */
const HEX64 = /^[0-9a-f]{64}$/

/**
 * 判断一个 hash 字符串是否形态合法（带统一前缀 + 64 位十六进制）
 *
 * 只做形态检查、不做密码学校验：客户端**不重算** sha256（P-S17 a 轻量校验 ——
 * 服务端发布期已用 CI 同款校验器把关，客户端只做「防崩溃 + 防脏数据」最低检查）。
 *
 * @param {unknown} value 待检查值
 * @returns {boolean} 形如 `sha256:<hex64>` 时为 true
 */
export function isWellFormedHash(value) {
  if (typeof value !== 'string') return false
  if (!value.startsWith(HASH_PREFIX)) return false
  return HEX64.test(value.slice(HASH_PREFIX.length))
}

/**
 * 判断一个「页面源」是否可交给 hydratePage 渲染
 *
 * 轻量结构校验（P-S17 a）：blocks 必须是数组，且每块必须带字符串 type ——
 * BlockRenderer 靠 type 查注册表，缺 type 会渲染出空白页（不如回退内置）。
 *
 * @param {unknown} raw 页面源（内置模块的 default，或远程页条目）
 * @returns {boolean}
 */
export function isUsablePage(raw) {
  if (!raw || typeof raw !== 'object') return false
  if (!Array.isArray(raw.blocks)) return false
  return raw.blocks.every((b) => b && typeof b === 'object' && typeof b.type === 'string')
}

/**
 * 页面级优先级裁决：**远程 > 内置**（红线 3）
 *
 * @param {object|null} builtin 内置模块的 default（可能尚未加载，传 null）
 * @param {object|null} remote 远程页条目（可能为空）
 * @returns {object|null} 可直接喂给 hydratePage 的页面源；两者都不可用时返回 null
 *
 * 说明：远程命中时返回 `{ blocks }` 而非整个远程条目 —— hydratePage
 *      （pageMeta.js:77-79）只读 `rawModule?.blocks`，传这个形状即可产出与内置
 *      完全一致的页面对象，BlockRenderer 零改动（H7，勿另写第二套 hydrate）。
 */
export function pickPage(builtin, remote) {
  if (isUsablePage(remote)) return { blocks: remote.blocks }
  if (isUsablePage(builtin)) return builtin
  return null
}

/**
 * 逐页哈希比对：页面的 `hash` 字段是否与期望值一致
 *
 * expected 的来历：写缓存时把分片内每页的 hash 记进 content_meta 的 pageHashes 表
 * （键为 `unitNum/fileIndex`），读缓存时逐页比对 —— 一旦 payload 被写坏/截断，
 * 该页哈希不符即丢弃并回退内置，而**不影响同分片其它页**（红线 2：永不变砖）。
 *
 * @param {object|null} page 页面条目（含 hash 字段）
 * @param {unknown} expected 期望的哈希字符串（形如 `sha256:<hex64>`）
 * @returns {boolean} 两侧都是合法形态且完全相等才为 true
 */
export function verifyHash(page, expected) {
  const actual = page && typeof page === 'object' ? page.hash : null
  if (!isWellFormedHash(actual)) return false
  if (!isWellFormedHash(expected)) return false
  return actual === expected
}

/**
 * 版本闸门：**严格大于**才认为是新版
 *
 * - 更新（remote > maxSeen）→ true → 允许整批替换缓存
 * - 等值（remote == maxSeen）→ **false** → 不写（避免同版本反复重写 IDB）
 * - 更旧（remote < maxSeen）→ **false** → **旧版一律不写**（前进式回滚，杜绝回退事故）
 *
 * @param {number|string|null|undefined} remoteVer 远程清单的 contentVersion
 * @param {number|string|null|undefined} maxSeen 本地已见的最大版本号（无记录传 null/undefined）
 * @returns {boolean} 是否为「更新的一版」
 */
export function isNewer(remoteVer, maxSeen) {
  const r = Number(remoteVer)
  if (!Number.isFinite(r)) return false // 远程版本号不可解析 → 一律不写（保守）
  const m = Number(maxSeen)
  // 本地无记录（null/undefined/NaN）→ 视为首次，任何有限版本号都比「没有」新
  if (!Number.isFinite(m)) return true
  return r > m
}

/**
 * 清单形态校验（协议闸门，纯函数）
 *
 * 协议版本不符 → **整份不消费**（宁可继续用旧数据，也不能按错误协议解析）。
 * ⚠️ 只验「内容层必需的骨架」（schemaVersion / contentVersion / units）；
 *    search / practice 子段**不在此处**拦 —— 子段坏不该让内容页也用不了，
 *    子段口径由 `contentManifest.subSectionErrors` 单独校验（S5-1）。
 *
 * @param {unknown} m 解析后的清单对象
 * @returns {boolean}
 */
export function isValidManifest(m) {
  if (!m || typeof m !== 'object') return false
  if (m.schemaVersion !== SCHEMA_VERSION) return false
  // ⚠️ P-S47（S4）：`contentVersion` 必须**本身就是有限数字**，不再先强转
  if (typeof m.contentVersion !== 'number' || !Number.isFinite(m.contentVersion)) return false
  if (!m.units || typeof m.units !== 'object' || Array.isArray(m.units)) return false
  return true
}

/**
 * 计算本轮「待拉集合」（**纯函数**，S4-2 由 contentClient 迁入本文件 —— 纯函数家族的正确归属）
 *
 * 三种模式（红线 4：闸门语义**不变**，本函数只多了一个分支）：
 *  - `newer`：远程版本**严格大于**本地已见版本 → 以**远程清单**为准，取「哈希变了」的单元；
 *             同时**丢弃**旧 `pendingUnits`（那些单元在本轮 changedKeys 里必然再次入选，
 *             两处并存会导致同一片被拉两次）。
 *  - `heal` ：版本等值/更旧**但** `pendingUnits` 非空 → **同版本自愈**：只用 pending 里
 *             **已捕获**的 `{unitKey, path, hash, version}` 当坐标，**不读远程 manifest.units**
 *             —— 2026-10-15 事故里线上清单可能已不可达/旧内容，依赖它自愈等于没有自愈。
 *  - `skip` ：版本等值/更旧且待重试集为空 → 一片都不拉。
 *
 * @param {object} manifest 远程清单（仅 newer 模式用到它的 units/contentVersion）
 * @param {object|null} meta 本地 content_meta 记录（含 units / contentVersion / pendingUnits）
 * @returns {{mode: 'newer'|'heal'|'skip', targets: Array<{unitKey: string, path: string,
 *   hash: string, version: number, attempts: number}>}}
 */
export function computeRetrySet(manifest, meta) {
  const cachedUnits = (meta && meta.units) || {}
  const pending = Array.isArray(meta?.pendingUnits) ? meta.pendingUnits : []

  if (isNewer(manifest?.contentVersion, meta?.contentVersion ?? null)) {
    const targets = Object.keys(manifest.units || {})
      .filter((k) => !cachedUnits[k] || cachedUnits[k].hash !== manifest.units[k].hash)
      .map((k) => ({
        unitKey: k,
        path: manifest.units[k].path,
        hash: manifest.units[k].hash,
        version: Number(manifest.contentVersion),
        attempts: 0
      }))
      // 无 path 的单元拉不了（清单坏项）→ 直接不进待拉集，也不留 pending
      .filter((t) => typeof t.path === 'string' && t.path !== '')
    return { mode: 'newer', targets }
  }

  if (pending.length > 0) {
    const targets = pending
      .filter((p) => p && typeof p.unitKey === 'string' && typeof p.path === 'string')
      .map((p) => ({
        unitKey: p.unitKey,
        path: p.path,
        hash: p.hash,
        // 兼容早期记录：没存 version 时退回本地已见版本
        version: Number.isFinite(Number(p.version)) ? Number(p.version) : Number(meta?.contentVersion),
        attempts: Number(p.attempts) || 0
      }))
    return { mode: 'heal', targets }
  }

  return { mode: 'skip', targets: [] }
}
