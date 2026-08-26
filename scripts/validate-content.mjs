/**
 * Schema 校验脚本（Node）
 * 职责：
 *  - 校验 content 数据文件符合 content-schema 定义
 *  - 校验 site 配置符合 site-schema 定义
 *  - 确保数据驱动渲染的合法性，防止运行时错误
 * 用法：node scripts/validate-content.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CONTENT_DIR = join(ROOT, 'src', 'content')

/**
 * 校验 content-schema 支持的所有区块类型
 */
const BLOCK_TYPES = ['mindmap', 'objectives', 'knowledge', 'formula', 'table', 'warning', 'tip', 'example', 'quiz', 'diagram', 'divider', 'errorfocus', 'strategy', 'exam']
const DIFFICULTY = ['basic', 'medium', 'advanced', 'sprint']
const QUESTION_TYPES = ['single', 'judge', 'fill', 'solve']

let errorCount = 0
let fileCount = 0

// 递归收集 content 下的 .js 数据文件（排除 site.js 站点配置和 index.js 索引）
function collectFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'site.js' || name === 'index.js') continue // 跳过站点配置和索引
    const p = join(dir, name)
    if (statSync(p).isDirectory()) collectFiles(p, acc)
    else if (name.endsWith('.js')) acc.push(p)
  }
  return acc
}

/**
 * 校验单个区块
 * @returns {string[]} 错误列表
 */
function validateBlock(block, pageId, index) {
  const errors = []
  if (!block || typeof block !== 'object') return [`${pageId} 区块[${index}] 不是对象`]
  if (!block.type) errors.push(`${pageId} 区块[${index}] 缺少 type`)
  else if (!BLOCK_TYPES.includes(block.type)) errors.push(`${pageId} 区块[${index}] 未知类型: ${block.type}`)

  // 按类型校验必填字段
  switch (block.type) {
    case 'knowledge':
      if (!block.paragraphs) errors.push(`${pageId} 知识点区块缺少 paragraphs`)
      break
    case 'formula': {
      if (!block.formulas && !block.lines) errors.push(`${pageId} 公式区块缺少 formulas`)
      else {
        const lines = block.formulas || block.lines
        if (Array.isArray(lines)) {
          lines.forEach((line, li) => {
            // 公式行末尾不允许以反斜杠结尾（KaTeX 顶层解析错误，会以红色源码显示）
            if (typeof line === 'string' && /\\+\s*$/.test(line)) {
              errors.push(`${pageId} 公式区块[${index}] 第${li}行末尾有孤立反斜杠，将导致 KaTeX 渲染失败`)
            }
          })
        }
      }
      break
    }
    case 'table':
      if (!Array.isArray(block.rows)) errors.push(`${pageId} 表格区块缺少 rows`)
      break
    case 'quiz':
      if (!Array.isArray(block.items)) errors.push(`${pageId} 题目区块缺少 items`)
      else {
        block.items.forEach((it, ii) => {
          if (it.difficulty && !DIFFICULTY.includes(it.difficulty)) {
            errors.push(`${pageId} 题目[${ii}] 未知难度: ${it.difficulty}`)
          }
          if (it.type && !QUESTION_TYPES.includes(it.type)) {
            errors.push(`${pageId} 题目[${ii}] 未知题型: ${it.type}`)
          }
          if (it.options && !Array.isArray(it.options)) {
            errors.push(`${pageId} 题目[${ii}] options 应为数组`)
          }
          if (it.correctIndex !== undefined && !it.options) {
            errors.push(`${pageId} 题目[${ii}] 有 correctIndex 但缺少 options`)
          }
          if (it.correctIndex !== undefined && it.options && (it.correctIndex < 0 || it.correctIndex >= it.options.length)) {
            errors.push(`${pageId} 题目[${ii}] correctIndex 越界`)
          }
        })
      }
      break
    case 'example':
      if (!Array.isArray(block.items)) errors.push(`${pageId} 例题区块缺少 items`)
      else {
        block.items.forEach((it, ii) => {
          if (it.difficulty && !DIFFICULTY.includes(it.difficulty)) {
            errors.push(`${pageId} 例题[${ii}] 未知难度: ${it.difficulty}`)
          }
        })
      }
      break
    case 'errorfocus':
      if (!Array.isArray(block.items)) errors.push(`${pageId} 易错专项区块缺少 items`)
      break
    case 'strategy':
      if (!Array.isArray(block.items)) errors.push(`${pageId} 考试技巧区块缺少 items`)
      break
    case 'exam':
      if (!Array.isArray(block.items)) errors.push(`${pageId} 模拟卷区块缺少 items`)
      else {
        block.items.forEach((it, ii) => {
          if (it.difficulty && !DIFFICULTY.includes(it.difficulty)) {
            errors.push(`${pageId} 模拟卷题目[${ii}] 未知难度: ${it.difficulty}`)
          }
          if (it.type && !QUESTION_TYPES.includes(it.type)) {
            errors.push(`${pageId} 模拟卷题目[${ii}] 未知题型: ${it.type}`)
          }
          if (it.correctIndex !== undefined && !it.options) {
            errors.push(`${pageId} 模拟卷题目[${ii}] 有 correctIndex 但缺少 options`)
          }
        })
      }
      break
    case 'mindmap':
      if (!block.mermaid) errors.push(`${pageId} 思维导图区块缺少 mermaid 源码`)
      break
    default:
      break
  }
  return errors
}

// 校验所有内容文件
for (const file of collectFiles(CONTENT_DIR)) {
  fileCount++
  const mod = await import(pathToFileURL(file).href + '?t=' + Date.now())
  const page = mod.default
  if (!page || !page.blocks) {
    console.error(`✗ ${file}: 缺少 blocks`)
    errorCount++
    continue
  }
  // 校验 id 唯一性基础
  if (!page.id) {
    console.error(`✗ ${file}: 缺少 id`)
    errorCount++
  }
  // 校验每个区块
  page.blocks.forEach((b, i) => {
    const errors = validateBlock(b, page.id || file, i)
    errors.forEach((e) => { console.error(`✗ ${e}`); errorCount++ })
  })
}

// 校验站点配置（数学 + 语文 + 计算机）
const siteConfigs = [
  { name: '数学', path: join(ROOT, 'src', 'content', 'site.js') },
  { name: '语文', path: join(ROOT, 'src', 'content', 'chinese', 'site.js') },
  { name: '计算机', path: join(ROOT, 'src', 'content', 'computer', 'site.js') }
]

let siteCount = 0
for (const { name, path: sitePath } of siteConfigs) {
  try {
    const siteMod = await import(pathToFileURL(sitePath).href + '?t=' + Date.now())
    const site = siteMod.SITE_CONFIG || siteMod.CHINESE_CONFIG || siteMod.default
    if (!site || !site.units || !Array.isArray(site.units)) {
      console.error(`✗ ${name} site.js: 缺少 units`)
      errorCount++
    } else {
      siteCount++
      site.units.forEach((u) => {
        if (!u.num || !u.title || !u.folder) {
          console.error(`✗ ${name} 单元 ${u.num}: 缺少 num/title/folder`)
          errorCount++
        }
      })
    }
  } catch (e) {
    console.error(`✗ ${name} site.js 加载失败: ${e.message}`)
    errorCount++
  }
}

// 汇总输出
console.log(`\n校验完成：共检查 ${fileCount} 个内容文件 + ${siteCount} 个站点配置`)
if (errorCount === 0) {
  console.log('✅ 全部通过！数据合法，可安全渲染。')
  process.exit(0)
} else {
  console.error(`❌ 发现 ${errorCount} 个错误，请修复后重试。`)
  process.exit(1)
}