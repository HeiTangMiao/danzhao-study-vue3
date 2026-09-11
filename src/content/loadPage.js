/**
 * 内容页唯一加载入口（浏览器侧）
 * 职责：把「按 site.js 解析元信息 → 动态导入页面文件 → 注入元信息」收敛成一个函数，
 *      供 UnitView 与 EditorView 共用，避免两处各写一遍导入逻辑而慢慢漂移。
 * 说明：Node 侧的对应实现见 scripts/lib/load-content.mjs —— 两侧共用
 *      src/content/pageMeta.js 里的同一条推导规则。
 */
import { getSubjectConfig } from './index'
import { resolvePageMeta, hydratePage } from './pageMeta'

/**
 * 按学科目录动态导入内容页模块
 *
 * ⚠️ 模板字符串前缀 `@/content/` 必须保持字面量。
 *    Vite 靠静态分析这个前缀生成 import.meta.glob，139 个内容文件才能各自成为
 *    独立懒加载 chunk（本仓库最有价值的资产之一）。
 *    一旦改成变量拼接（如 import(base + '/' + name)），全部页面会被打进同一个
 *    巨型 chunk，首屏与分包策略同时退化。不要改。
 */
export function importPageModule(subject, folder, name) {
  return import(`@/content/${subject}/${folder}/${name}.js`)
}

/**
 * 加载指定学科的某一页，返回已注入 site.js 元信息的页面对象
 * @param {string} subject 'math' | 'chinese' | 'computer'
 * @param {string} unitNum 单元编号，如 "01"
 * @param {number} fileIndex site.js 中 files[] 的下标
 * @returns {Promise<object|null>} 越界或导入失败时返回 null（不抛异常，由调用方决定降级）
 */
export async function loadPage(subject, unitNum, fileIndex) {
  const meta = resolvePageMeta(getSubjectConfig(subject), unitNum, fileIndex)
  if (!meta) return null
  const mod = await importPageModule(subject, meta.folder, meta.name)
  return hydratePage(mod.default, meta)
}

export { resolvePageMeta, hydratePage }
