/**
 * 构建期搜索索引生成脚本
 * 职责：
 *  - 遍历 src/content 全部内容页，抽取站点配置元信息 + 页面内文本，生成两级索引：
 *      public/search-meta.json              标题级索引（小，面板常驻）
 *      public/search-body/{学科}.json       正文分片（大，仅按需加载当前学科）
 *  - 供前端 SearchPanel 离线全文检索（跨数学/语文/计算机三学科）
 * 用法：node scripts/build-search-index.mjs（作为 build 的预构建步骤执行）
 *
 * 说明：文件遍历与「路径 → 元信息」索引均来自 scripts/lib/load-content.mjs，
 *      与 scripts/validate-content.mjs 共用同一份实现，避免两处各写一遍后慢慢漂移。
 *      索引形状（正文上限 / 分片路径 / 正文键）来自 src/content/searchIndex.js，两端共用。
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT, CONTENT_DIR, collectFiles, buildMetaIndex, importFresh, relPathOf } from './lib/load-content.mjs'
import { BODY_LIMIT, META_FILE, bodyShardPath, bodyKeyOf } from '../src/content/searchIndex.js'

const PUBLIC_DIR = join(ROOT, 'public')
const META_OUT = join(PUBLIC_DIR, META_FILE)
const BODY_DIR = join(PUBLIC_DIR, 'search-body')

/**
 * 从任意区块/对象中递归抽取所有字符串，拼成可检索文本
 * 过滤掉常见结构字符，保留中文/数字/字母，便于中文子串匹配
 */
function extractText(value, seen = new Set()) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  if (seen.has(value)) return ''
  seen.add(value)
  const parts = []
  if (Array.isArray(value)) {
    for (const v of value) {
      const s = extractText(v, seen)
      if (s) parts.push(s)
    }
  } else {
    // 只取叶子文本字段与标题类，忽略坐标/颜色等非文本
    for (const k of Object.keys(value)) {
      if (['color', 'x', 'y', 'width', 'height', 'strokeWidth', 'fontSize'].includes(k)) continue
      const s = extractText(value[k], seen)
      if (s) parts.push(s)
    }
  }
  return parts.join(' ')
}

/** 清洗文本：去 LaTeX 标记与空白，保留检索词 */
function clean(t) {
  return (t || '')
    .replace(/\\([(){}[\]|])/g, '$1')
    .replace(/[`*#$~_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 正文按上限裁剪
 * @param {string} text 清洗后的正文
 * @param {number} limit 上限（默认 BODY_LIMIT；测试注入小值以验证「截断必报告」这条链）
 * @returns {{text: string, truncated: boolean}} 超限时截断并标真（调用方负责把文件名写进构建日志）
 */
export function capBody(text, limit = BODY_LIMIT) {
  if (text.length <= limit) return { text, truncated: false }
  return { text: text.slice(0, limit), truncated: true }
}

/** meta 条目只保留检索与渲染结果条目所需的字段（id / folder / name 等运行时字段不进索引） */
function toMetaEntry(m) {
  const entry = {
    subject: m.subject,
    unitNum: m.unitNum,
    fileIndex: m.fileIndex,
    unitTitle: m.unitTitle,
    title: m.title,
    subtitle: m.subtitle || ''
  }
  if (m.isTest) entry.isTest = true
  return entry
}

/**
 * 采集索引数据（不落盘，便于测试直接断言形状）
 * @param {{limit?: number}} options 正文上限（默认 BODY_LIMIT）
 * @returns {Promise<{meta: Array, bodies: Record<string, Record<string, string>>, truncated: Array<{rel: string, len: number}>, unregistered: string[]}>}
 */
export async function collectIndex({ limit = BODY_LIMIT } = {}) {
  // 1) 依站点配置建立「文件相对路径 → 元信息」索引（保证有序且覆盖全部注册页面）
  const metaByRel = await buildMetaIndex()

  // 2) 遍历磁盘采样页面文件，import 正文并回填文本
  const meta = []
  const bodies = {}
  const truncated = []
  const unregistered = []
  for (const file of collectFiles(CONTENT_DIR)) {
    const rel = relPathOf(file)
    const info = metaByRel.get(rel)
    // 未注册进 site.js 的磁盘文件：validate:content 会拦下，这里兜底只记一条告警，不产出正文键
    if (!info) {
      unregistered.push(rel)
      continue
    }
    let page = null
    try {
      const mod = await importFresh(file)
      page = mod.default
    } catch (e) { /* 单页加载失败不影响其余 */ }

    const full = page && Array.isArray(page.blocks) ? clean(extractText(page.blocks)) : ''
    const { text, truncated: cut } = capBody(full, limit)
    if (cut) truncated.push({ rel, len: full.length })
    meta.push(toMetaEntry(info))
    if (!bodies[info.subject]) bodies[info.subject] = {}
    bodies[info.subject][bodyKeyOf(info)] = text
  }
  return { meta, bodies, truncated, unregistered }
}

async function build() {
  const { meta, bodies, truncated, unregistered } = await collectIndex()

  // 3) 输出：先清掉整个分片目录，避免学科下线后旧分片残留在产物里
  mkdirSync(PUBLIC_DIR, { recursive: true })
  rmSync(BODY_DIR, { recursive: true, force: true })
  mkdirSync(BODY_DIR, { recursive: true })
  writeFileSync(META_OUT, JSON.stringify(meta), 'utf-8')
  for (const [subject, shard] of Object.entries(bodies)) {
    writeFileSync(join(PUBLIC_DIR, bodyShardPath(subject)), JSON.stringify(shard), 'utf-8')
  }

  // 4) 把静默失败变成构建日志：仍被截断的页面必须点名，不能只留一个数字
  if (truncated.length) {
    console.warn(
      `[search-index] ⚠️ 以下页面正文超过 ${BODY_LIMIT} 字符已被截断，超出部分搜不到：\n  ` +
        truncated.map((t) => `${t.rel}（${t.len} 字符）`).join('\n  ')
    )
  }
  if (unregistered.length) {
    console.warn(`[search-index] ⚠️ 以下文件未注册进 site.js，已跳过：\n  ` + unregistered.join('\n  '))
  }
  const shards = Object.entries(bodies)
    .map(([subject, shard]) => `${bodyShardPath(subject)}（${Object.keys(shard).length} 条）`)
    .join('、')
  console.log(`[search-index] 已生成 public/${META_FILE}（${meta.length} 条）+ ${shards}`)
}

// 直接执行时构建；被测试 import 时只暴露 collectIndex（避免测试一 import 就往 public/ 里写）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    console.error('[search-index] 生成失败:', e)
    process.exit(1)
  })
}