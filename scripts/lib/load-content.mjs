/**
 * 内容加载共用库（Node 侧）
 * 职责：收敛 validate-content.mjs 与 build-search-index.mjs 里逐字重复的三段逻辑 ——
 *       递归收集内容文件、带缓存失效的动态 import、由 site.js 建立「文件 → 元信息」索引。
 *
 * ⚠️ 元信息推导规则必须与浏览器侧完全一致，因此这里直接 import
 *    src/content/pageMeta.js（纯 ESM、零依赖），而不是再写一份。
 *    这条规则一旦分叉，校验器就会开始「放过」渲染层会出错的内容。
 */
import { readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolvePageMeta } from '../../src/content/pageMeta.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** 仓库根目录 */
export const ROOT = join(__dirname, '..', '..')
/** 内容根目录 */
export const CONTENT_DIR = join(ROOT, 'src', 'content')

/**
 * 各学科的站点配置路径
 * 说明：数学配置位于 content 根目录（历史原因），语文/计算机在各自子目录
 */
export const SITE_FILES = {
  math: join(CONTENT_DIR, 'site.js'),
  chinese: join(CONTENT_DIR, 'chinese', 'site.js'),
  computer: join(CONTENT_DIR, 'computer', 'site.js')
}

/**
 * 内容目录下「非内容页」的模块文件名 —— 遍历时必须跳过，否则会被误判为孤儿页
 * 说明：内容目录同时是「内容页数据」与「内容系统模块」的家。此清单是这两者的边界，
 *      新增内容系统模块时必须同步登记，否则 validate:content 会报孤儿文件。
 */
export const NON_PAGE_FILES = new Set([
  'site.js', // 站点配置（files[] 数组顺序即 fileIndex，是页面的注册表）
  'index.js', // 多学科索引
  'pageMeta.js', // 页面元信息推导（纯 ESM，两端共用）
  'loadPage.js', // 页面加载入口（浏览器侧）
  'searchIndex.js', // 搜索索引形状定义（纯 ESM，两端共用，见阶段 7.4）
  'practiceBank.js' // 练习题库形状定义（纯 ESM，两端共用，见 P6）
])

/** 统一为正斜杠路径（兼容 Windows 的反斜杠） */
export function normalizePath(p) {
  return p.split(/[\\/]+/).filter(Boolean).join('/')
}

/** 递归收集内容页 .js 文件（跳过 NON_PAGE_FILES 中登记的系统模块） */
export function collectFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (NON_PAGE_FILES.has(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) collectFiles(p, acc)
    else if (name.endsWith('.js')) acc.push(p)
  }
  return acc
}

/** 几何画板模块目录（src/geometry/boards/<boardId>.js） */
export const BOARD_DIR = join(ROOT, 'src', 'geometry', 'boards')

/**
 * 枚举现有画板标识（即 boards 目录下的模块名，去扩展名）
 * 说明：diagram 区块的 boardId 必须命中这里，由 validateBlock 校验、并由
 *       tests/geometry-board.test.js 反向查孤儿。Node 侧只能读目录，
 *       浏览器侧（编辑器）走 import.meta.glob，两边是同一份真相的两种取法。
 * @returns {string[]} boardId 列表（未排序）
 */
export function collectBoardIds() {
  try {
    return readdirSync(BOARD_DIR)
      .filter((name) => name.endsWith('.js'))
      .map((name) => name.slice(0, -'.js'.length))
  } catch {
    // 目录不存在（如首次克隆尚未生成）：返回空，交由上层校验报错而非本库崩溃
    return []
  }
}

/**
 * 动态 import 且绕过 ESM 模块缓存
 * 说明：脚本可能在同一进程内被反复调用（如 watch 模式），不加时间戳会读到旧内容
 * @param {string} file 绝对路径
 */
export function importFresh(file) {
  return import(pathToFileURL(file).href + '?t=' + Date.now())
}

/**
 * 加载学科站点配置
 * @param {string} subject 学科 key
 * @returns {Promise<object|null>} 配置对象；加载失败或无 units 时返回 null
 */
export async function loadSite(subject) {
  const sitePath = SITE_FILES[subject]
  if (!sitePath) return null
  const mod = await importFresh(sitePath)
  // 各学科导出的具名常量不同（SITE_CONFIG / CHINESE_CONFIG），取第一个带 units 的导出
  const site = Object.values(mod).find((v) => v && Array.isArray(v.units)) || null
  return site
}

/**
 * 建立「内容文件相对路径 → 页面元信息」索引
 * 路径形如 `math/01-集合与逻辑/01-集合的概念与表示.js`，与磁盘遍历结果可直接比对
 * @returns {Promise<Map<string, object>>} key 为正斜杠相对路径
 */
export async function buildMetaIndex() {
  const index = new Map()
  for (const subject of Object.keys(SITE_FILES)) {
    const site = await loadSite(subject)
    if (!site) continue
    for (const unit of site.units || []) {
      ;(unit.files || []).forEach((file, fileIndex) => {
        const meta = resolvePageMeta(site, unit.num, fileIndex)
        if (!meta) return
        index.set(normalizePath(`${subject}/${unit.folder}/${file.name}.js`), meta)
      })
    }
  }
  return index
}

/**
 * 取内容文件的相对路径（正斜杠形式）
 * @param {string} file 绝对路径
 */
export function relPathOf(file) {
  return normalizePath(relative(CONTENT_DIR, file))
}
