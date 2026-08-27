/**
 * 构建期搜索索引生成脚本
 * 职责：
 *  - 遍历 src/content 全部内容页，抽取站点配置元信息 + 页面内文本，生成 public/search-index.json
 *  - 供前端 SearchPanel 离线全文检索（跨数学/语文/计算机三学科）
 * 用法：node scripts/build-search-index.mjs（作为 build 的预构建步骤执行）
 */
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CONTENT = join(ROOT, 'src', 'content')
const OUT = join(ROOT, 'public', 'search-index.json')

// 各学科的站点配置路径（数学配置位于根 site.js）
const SITE_FILES = {
  math: join(ROOT, 'src', 'content', 'site.js'),
  chinese: join(ROOT, 'src', 'content', 'chinese', 'site.js'),
  computer: join(ROOT, 'src', 'content', 'computer', 'site.js')
}

const sep = '/'
// 兼容路径分隔符（Windows）
const norm = (p) => p.split(/[\\/]+/).filter(Boolean).join(sep)

/** 递归收集内容 .js 文件（跳过 site.js / index.js） */
function collect(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'site.js' || name === 'index.js') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) collect(p, acc)
    else if (name.endsWith('.js')) acc.push(p)
  }
  return acc
}

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
    .replace(/[_\*\#\`\$\~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function build() {
  // 1) 依站点配置建立 文件路径 → 元信息索引（保证有序且覆盖全部注册页面）
  const metaByRel = new Map()
  for (const [subject, sitePath] of Object.entries(SITE_FILES)) {
    const m = await import(pathToFileURL(sitePath).href + '?t=' + Date.now())
    const site = m.SITE_CONFIG || m.CHINESE_CONFIG || m.default
    if (!site || !site.units) continue
    for (const u of site.units) {
      ;(u.files || []).forEach((f, fileIndex) => {
        const rel = norm(`${subject}/${u.folder}/${f.name}.js`)
        metaByRel.set(rel, {
          subject, unitNum: u.num, fileIndex,
          unitTitle: u.title, title: f.title, subtitle: f.subtitle || '',
          isTest: !!f.isTest
        })
      })
    }
  }

  // 2) 遍历磁盘采样页面文件，import 正文并回填文本
  const index = []
  for (const file of collect(CONTENT)) {
    const rel = norm(relative(CONTENT, file))
    const meta = metaByRel.get(rel)
    let page = null
    try {
      const mod = await import(pathToFileURL(file).href + '?t=' + Date.now())
      page = mod.default
    } catch (e) { /* 单页加载失败不影响其余 */ }

    const entry = meta || {
      subject: rel.split(sep)[0],
      unitNum: '', fileIndex: 0,
      unitTitle: '', title: '', subtitle: '',
      isTest: false
    }
    if (page && Array.isArray(page.blocks)) {
      entry.keywords = clean(extractText(page.blocks)).slice(0, 800)
    } else {
      entry.keywords = ''
    }
    index.push(entry)
  }

  // 3) 输出
  mkdirSync(join(ROOT, 'public'), { recursive: true })
  writeFileSync(OUT, JSON.stringify(index), 'utf-8')
  console.log(`[search-index] 已生成 ${index.length} 条索引 -> public/search-index.json`)
}

build().catch((e) => {
  console.error('[search-index] 生成失败:', e)
  process.exit(1)
})