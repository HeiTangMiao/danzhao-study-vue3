/**
 * Schema 校验脚本（Node）
 * 职责：
 *  - 校验 content 数据文件符合 content-schema 定义
 *  - 校验 site 配置符合 site-schema 定义
 *  - 确保数据驱动渲染的合法性，防止运行时错误
 * 用法：node scripts/validate-content.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  ROOT, CONTENT_DIR, SITE_FILES, BOARD_DIR, collectFiles, collectBoardIds, loadSite, importFresh, relPathOf
} from './lib/load-content.mjs'
import { PAGE_META_KEYS } from '../src/content/pageMeta.js'
import { createBlockValidator } from '../src/utils/validateBlock.js'

/**
 * 区块的语义校验与编辑器共用同一份实现（src/utils/validateBlock.js）
 * 说明：correctIndex 越界、公式行末尾孤立反斜杠这类规则 JSON-Schema 表达不了，必须手写；
 *      手写就必须只有一份 —— Node 侧是 CI 关卡，浏览器侧是编辑器实时提示。
 *      类型白名单 / 难度 / 题型仍从 schema 派生，只是派生的位置挪进了 createBlockValidator。
 *      schema 用 fs 读而非 import：本脚本跑在裸 Node 下，不走 Vite 的 JSON 导入。
 */
const SCHEMA = JSON.parse(readFileSync(join(ROOT, 'schema', 'content-schema.json'), 'utf-8'))

// diagram 区块的画板代码已迁到 src/geometry/boards/<boardId>.js，
// 校验规则从「initCode 非空」变成「boardId 能在该目录解析到模块」。
const knownBoardIds = new Set(collectBoardIds())
const validateBlock = createBlockValidator(SCHEMA, { knownBoardIds })

let errorCount = 0
let fileCount = 0

// 画板目录缺失 / 为空属于工程配置错误，单独报一条，避免 20 个 diagram 逐个报错把输出淹没
if (knownBoardIds.size === 0) {
  console.error(`✗ 未找到任何画板模块：${BOARD_DIR}`)
  errorCount++
}

// 校验站点配置（数学 + 语文 + 计算机），先于内容文件校验以建立注册关系
// 站点文件路径统一来自 scripts/lib/load-content.mjs，与搜索索引脚本共用一份
const SUBJECT_NAMES = { math: '数学', chinese: '语文', computer: '计算机' }
const siteConfigs = Object.entries(SITE_FILES).map(([key, sitePath]) => ({
  key,
  name: SUBJECT_NAMES[key] || key,
  path: sitePath
}))

let siteCount = 0
/**
 * 已注册的内容文件绝对路径集合（用于反向检查"孤儿"文件）
 *
 * 注意：阶段 1C 起，这张表同时承担了原先「page.subject 必须与所在目录一致」的职责。
 * 注册路径由 site.js 的学科 key 拼出（CONTENT_DIR/<subject>/<folder>/<name>.js），
 * 所以文件放错学科目录时，它不会出现在此表里 → 直接报孤儿文件。
 * 学科一致性由结构保证，不必再逐页比对 subject 字段。
 */
const registeredFiles = new Set()

for (const { name, key } of siteConfigs) {
  try {
    const site = await loadSite(key)
    if (!site || !site.units || !Array.isArray(site.units)) {
      console.error(`✗ ${name} site.js: 缺少 units`)
      errorCount++
      continue
    }
    siteCount++
    if (site.subject && site.subject !== key) {
      console.error(`✗ ${name} site.js: subject 应为 "${key}"，实际为 "${site.subject}"`)
      errorCount++
    }
    site.units.forEach((u) => {
      if (!u.num || !u.title || !u.folder) {
        console.error(`✗ ${name} 单元 ${u.num}: 缺少 num/title/folder`)
        errorCount++
      }
      // 注册的页面文件必须真实存在于磁盘
      ;(u.files || []).forEach((f) => {
        const expected = join(CONTENT_DIR, key, u.folder, f.name + '.js')
        registeredFiles.add(expected)
        if (!existsSync(expected)) {
          console.error(`✗ ${name} ${u.title} 注册的页面 ${f.name} 不存在: ${expected}`)
          errorCount++
        }
      })
    })
  } catch (e) {
    console.error(`✗ ${name} site.js 加载失败: ${e.message}`)
    errorCount++
  }
}

// 校验所有内容文件
for (const file of collectFiles(CONTENT_DIR)) {
  fileCount++
  const rel = relPathOf(file)
  const mod = await importFresh(file)
  const page = mod.default
  if (!page || !Array.isArray(page.blocks)) {
    console.error(`✗ ${rel}: 缺少 blocks 数组`)
    errorCount++
    continue
  }

  // ==== 元信息不得回写内容文件（阶段 1B 起）====
  // 这批判信息曾在 139 个文件里各手写一份，与 site.js 实测漂移 19 页。
  // 阶段 1A 已让 site.js 在渲染层胜出，此处把「再写回去」钉死在 CI。
  const residue = PAGE_META_KEYS.filter((k) => page[k] !== undefined)
  if (residue.length) {
    console.error(
      `✗ ${rel}: 内容文件不得包含元信息字段 [${residue.join(', ')}]\n` +
      '    元信息唯一真相源是 site.js（推导规则见 src/content/pageMeta.js）。\n' +
      '    修复：node scripts/migrate-content-meta.mjs --write'
    )
    errorCount += residue.length
  }

  // 校验每个区块（validateBlock 返回的相对描述，在此补上文件与区块位置）
  page.blocks.forEach((b, i) => {
    const errors = validateBlock(b)
    errors.forEach((e) => { console.error(`✗ ${rel} 区块[${i}] ${e}`); errorCount++ })
  })
}

// 反向检查：磁盘上存在但未在任何 site.js 注册的内容文件（孤儿文件）
for (const file of collectFiles(CONTENT_DIR)) {
  if (!registeredFiles.has(file)) {
    console.error(`✗ 未注册的内容文件（孤儿）：${file}`)
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