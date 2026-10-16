/**
 * 内容页唯一加载入口（浏览器侧）
 * 职责：把「按 site.js 解析元信息 → 动态导入页面文件 → 注入元信息」收敛成一个函数，
 *      供 UnitView 使用，避免各处各写一遍导入逻辑而慢慢漂移。
 * 说明：Node 侧的对应实现见 scripts/lib/load-content.mjs —— 两侧共用
 *      src/content/pageMeta.js 里的同一条推导规则。
 */
import { getSubjectConfig } from './index'
import { resolvePageMeta, hydratePage } from './pageMeta'
import { pickPage } from './mergeContent'
import { getRemotePage } from '@/utils/contentClient'

/**
 * 按学科目录动态导入内容页模块
 *
 * ⚠️ 模板字符串前缀 `@/content/` 必须保持字面量。
 *    Vite 靠静态分析这个前缀生成 import.meta.glob，`src/content/**` 下的内容文件
 *    才能各自成为独立懒加载 chunk（本仓库最有价值的资产之一）。
 *    ⚠️ 页数**不写死**：内容侧加页不需要同步改这里（数字必然腐烂，
 *    权威是 `src/content/**` 本身，构建期 `validate:content` 才是把关者）。
 *    一旦改成变量拼接（如 import(base + '/' + name)），全部页面会被打进同一个
 *    巨型 chunk，首屏与分包策略同时退化。不要改。
 */
export function importPageModule(subject, folder, name) {
  return import(`@/content/${subject}/${folder}/${name}.js`)
}

/**
 * 读远程缓存页，**任何异常都吞掉返回 null**（红线 2/6）
 * @param {string} subject 学科 key
 * @param {string} unitNum 单元号
 * @param {number} fileIndex 页下标
 * @returns {Promise<object|null>}
 */
async function safeRemotePage(subject, unitNum, fileIndex) {
  try {
    return await getRemotePage(subject, unitNum, fileIndex)
  } catch {
    return null
  }
}

/**
 * 加载指定学科的某一页，返回已注入 site.js 元信息的页面对象
 *
 * 优先级链（批 S2）：**远程缓存（IndexedDB）> 内置打包（dynamic import）**
 *  - 远程层是**离线优先**的读缓存（`getRemotePage` 不发网络请求），故不会把网络延迟
 *    带进进页关键路径 —— 这是 P-S11(a) 的核心：`UnitView.vue:551` 有一条
 *    `Promise.race([数据, sleep(400)])` 的滑动翻页竞速，一旦在此 await 网络就会劣化转场。
 *  - 远程层任何异常（IDB 不可用 / 页不存在 / 哈希不符）都**静默**回落内置：
 *    永不因为远程而变砖（红线 2）。
 *  - 裁决只走 `mergeContent.pickPage`（H7），本文件不自己写 if。
 *
 * ⚠️ 可用性闸门（`pickPage`）**只作用于远程**，内置兜底路径**原样透传**
 *    （`hydratePage(mod.default, meta)`）：
 *    内置内容页（`src/content/**`）已由构建期 `validate:content` 把关 —— 这正是轨道 A 的意义，运行期再加
 *    一道闸门并不增加安全性，反而给「改前能正常渲染、改后整页空白」开了一道**新失效模式**
 *    （例如某块缺 `type` 时，闸门会把整页判为不可用 → blocks 变空，而原样透传至少能
 *    渲染出其余块）。由 `tests/loadpage-builtin-passthrough.test.js` 钉死。
 *
 * @param {string} subject 'math' | 'chinese' | 'computer'
 * @param {string} unitNum 单元编号，如 "01"
 * @param {number} fileIndex site.js 中 files[] 的下标
 * @returns {Promise<object|null>} 越界或导入失败时返回 null（不抛异常，由调用方决定降级）
 */
export async function loadPage(subject, unitNum, fileIndex) {
  // 导航坐标仍**只**来自内置 site.js（红线 4：B1 不改导航、不改 fileIndex）
  const meta = resolvePageMeta(getSubjectConfig(subject), unitNum, fileIndex)
  if (!meta) return null

  // 红线 6：远程层任何异常都静默跳过 → null → 走内置兜底
  const remote = await safeRemotePage(subject, unitNum, fileIndex)
  // 裁决只走 pickPage（H7）。remote 存在但结构不可用 → pickPage 返回 null → 照样走内置，
  // 绝不产出「空 blocks 的页面」（那比用内置更糟：看起来像内容丢了）
  const picked = remote ? pickPage(null, remote) : null
  if (picked) return hydratePage(picked, meta)

  // 内置兜底：**不**过可用性闸门，原样透传（见上方 JSDoc 的说明）
  const mod = await importPageModule(subject, meta.folder, meta.name)
  return hydratePage(mod.default, meta)
}

/**
 * 预取页面模块（P4-T5 §5.7.5）：只预热 import() 缓存，不做 hydrate。
 *  - 命中模块缓存天然幂等；Set 去重避免同一页反复触发 import
 *  - 只预取一页 —— 把 `src/content/**` 的内容页 chunk 全拉对移动端流量与内存无意义；跨单元由调用方 clearPrefetch()
 */
const prefetched = new Set()

export async function prefetchPage(subject, unitNum, fileIndex) {
  const meta = resolvePageMeta(getSubjectConfig(subject), unitNum, fileIndex)
  if (!meta) return false
  const dedupeKey = `${subject}/${meta.folder}/${meta.name}`
  if (prefetched.has(dedupeKey)) return false
  prefetched.add(dedupeKey)
  try {
    await importPageModule(subject, meta.folder, meta.name)
    return true
  } catch {
    prefetched.delete(dedupeKey) // 失败允许下次重试
    return false
  }
}

/** 清空预取去重集（跨单元导航时调用，§5.7.5 建议③） */
export function clearPrefetch() {
  prefetched.clear()
}

export { resolvePageMeta, hydratePage }
