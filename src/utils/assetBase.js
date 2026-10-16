/**
 * 远程资产的基址派生（批 S5 · S5-2/S5-6，**三层客户端共用的唯一一处**）
 *
 * 为什么单独成文件：内容 / 搜索 / 题库三层都要算基址。若各写一处，
 * S2 那次「`/api` 前缀陷阱」（Tauri 注入的是 `https://520305.top/api`，静态目录不在它下面）
 * 就会在每个新客户端里各踩一次。故把派生收敛到此处，`contentClient` 只做 re-export 兼容。
 *
 * 两个基址：
 *  - **内容根**（`contentRoot`）→ `…/content-remote`（清单 + 单元分片在这）
 *  - **站点根**（`siteRoot`）→ 内容根去掉末尾的 `/content-remote`（搜索 / 题库产物在这：
 *    `search-meta.json` / `search-body/*` / `practice-bank/*`，与 content-remote 同在 public/）
 *
 * ⚠️ **站点根一律指向「站点」，不指向「安装包内的 bundle 副本」—— 这是取舍，不是遗漏**（S5-6 确认）：
 *  - **Web / 开发（相对模式）**：`siteRoot()` = `./`，请求的正是 `public/` 里那份产物
 *    （构建时被拷到站点根）→ 「远程产物」与「bundle 副本」是**同一批文件**，无差异。
 *  - **Tauri（绝对模式）**：`siteRoot()` = 站点 origin（如 `https://520305.top`），
 *    请求的是**线上**那份产物；安装包里自带的同名副本**不参与**搜索 / 题库链路。
 *    代价：Tauri 端搜索 / 题库 = 走远程 + IDB 缓存，**首次打开且无缓存时离线不可用**
 *    （内容层不同——它有 `src/content/**` 的懒加载 chunk 作内置兜底，离线永远可读）。
 *    换来的好处：产物只需维护一份（线上），不必把约 1.7 MB 的搜索/题库产物
 *    再打进安装包、也不必为「包内版本 vs 线上版本」另立一套版本判据（P-S51：一个版本权威）。
 *  - 若将来判定「Tauri 离线首开必须能搜」优先于上述好处，最小改法是在
 *    `searchClient` / `practiceBankClient` 的 `loadAsset()` 兜底分支里追加一次
 *    **相对路径**重试（`fetchJson('./', path)` 落在 app 自身 origin = 包内副本），
 *    约 6 行、不动基址派生；但该改法会让「包内旧副本」与读时闸门并存，需另行评估。
 */
import { API_BASE, IS_ABSOLUTE_API } from '@/sync/apiBase'
import { REMOTE_DIR } from '@/content/contentManifest'

/**
 * 取站点根（origin）—— 剥离 `/api` 之类的路径前缀，只保留协议 + 域名 + 端口
 * @param {string} apiBase API 基址
 * @returns {string} origin，形如 `https://520305.top`
 */
export function originOf(apiBase) {
  try {
    return new URL(apiBase).origin
  } catch {
    // 兜底（IS_ABSOLUTE_API 已保证 http(s)，理论上走不到）：去掉最后一段路径
    return String(apiBase).replace(/\/[^/]*$/, '')
  }
}

/**
 * 内容根派生（P-S16，含 team-lead 的**强制修正**）——绝对模式必须取 origin
 * @param {string} apiBase API 基址（可能带 `/api` 之类的路径前缀）
 * @param {boolean} isAbsolute 是否为绝对地址模式（Tauri）
 * @returns {string} 内容根地址
 */
export function contentRootFrom(apiBase, isAbsolute) {
  if (!isAbsolute) return `./${REMOTE_DIR}`
  return `${originOf(apiBase)}/${REMOTE_DIR}`
}

/** 当前环境的内容根 */
export function contentRoot() {
  return contentRootFrom(API_BASE, IS_ABSOLUTE_API)
}

/**
 * 站点根派生（S5-6）：搜索 / 题库产物在站点根下，故从内容根**剥掉** `/content-remote`
 * 而不是重新拼一次 —— 与 P-S16「从 API_BASE 剥 /api」同款思路：**派生，不硬拼**。
 * @param {string} apiBase API 基址
 * @param {boolean} isAbsolute 是否为绝对地址模式
 * @returns {string} 站点根（不带尾斜杠）
 */
export function siteRootFrom(apiBase, isAbsolute) {
  const root = contentRootFrom(apiBase, isAbsolute)
  if (!root.endsWith(`/${REMOTE_DIR}`)) return root
  const stripped = root.slice(0, -(`/${REMOTE_DIR}`.length))
  // 相对模式下剥完是 '.' —— 归一成 './'，与既有静态产物的相对路径纪律一致（fetchJson 也能拼对）
  return stripped === '' || stripped === '.' ? './' : stripped
}

/** 当前环境的站点根 */
export function siteRoot() {
  return siteRootFrom(API_BASE, IS_ABSOLUTE_API)
}
