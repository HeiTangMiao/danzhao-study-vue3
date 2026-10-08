/**
 * 练习题库构建脚本（P6）
 * 作者：software-engineer-2（Alex）
 * 目的：遍历 src/content 全部内容页，收集 quiz / exam 区块的题目并附加来源坐标，
 *      产出 public/practice-bank/{subject}.json 学科分片 + index.json 汇总索引，
 *      供练习 Tab（L1 首页 / L2 组卷 / L3 做题会话）离线消费。
 *
 * 纪律：
 *  - 文件遍历与元信息一律来自 scripts/lib/load-content.mjs（与 search-index /
 *    validate-content 共用同一实现，避免二次漂移，见 prd-mobile §5.5）
 *  - 分片路径 / 条目键 / 字段上限来自 src/content/practiceBank.js（两端共用）
 *  - 任何截断必须 console.warn 点名，不允许静默失败
 *  - 只读内容、只写 public/practice-bank/，不碰 src/content/ 数据页
 *
 * 用法：node scripts/build-practice-bank.mjs（或 npm run build:practice）
 */
import { writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT, CONTENT_DIR, collectFiles, buildMetaIndex, importFresh, relPathOf } from './lib/load-content.mjs'
import { pageFileKeyOf } from '../src/content/pageMeta.js'
import {
  BANK_DIR,
  BANK_INDEX_FILE,
  QUESTION_LIMIT,
  ANSWER_LIMIT,
  practiceShardPath,
  practiceKeyOf
} from '../src/content/practiceBank.js'

const PUBLIC_DIR = join(ROOT, 'public')
const OUT_DIR = join(PUBLIC_DIR, BANK_DIR)

/**
 * 文本按上限裁剪
 * @param {string} text 原文
 * @param {number} limit 上限
 * @returns {{text: string, truncated: boolean}} 截断时标真，调用方负责把键写进构建日志
 */
export function capText(text, limit) {
  const s = typeof text === 'string' ? text : ''
  if (s.length <= limit) return { text: s, truncated: false }
  return { text: s.slice(0, limit), truncated: true }
}

/**
 * 递归遍历区块树，收集「带题干的条目」所在的叶子区块。
 * 下钻规则（与 content-smoke / validate 的区块树口径对齐）：
 *  - group → items；columns → items（数组的数组）
 *  - layout → children（复习测验页大量 quiz 嵌在 layout.rail 里，漏掉会少采 19 题）
 * visit 只会收到「可能是叶子区块」的对象；容器条目里的字符串等非对象自动跳过
 * @param {Array} blocks 区块数组
 * @param {(block: object) => void} visit 命中区块时的回调
 */
export function walkBlocks(blocks, visit) {
  for (const block of blocks || []) {
    if (!block || typeof block !== 'object') continue
    visit(block)
    if (block.type === 'columns') {
      for (const col of block.items || []) walkBlocks(col, visit)
    } else if (Array.isArray(block.items)) {
      walkBlocks(block.items, visit)
    }
    if (Array.isArray(block.children)) walkBlocks(block.children, visit)
  }
}

/**
 * 从单个叶子区块抽取题目条目（quiz/exam 区块整块，example 区块抽例题条目）
 * 说明：例题（type:'example'，条目含 question + answer）在 PRD §5.1 的 1393 题口径内
 *      （附录 B 的计数 = 全部 question: 出现次数），且题干+答案天然适配自评链路，
 *      因此与 quiz/exam 一并入库，source 标记为 'quiz'。
 * @returns {Array<{item: object, source: string, itemType: string}>}
 */
export function extractQuestions(block) {
  if (block.type === 'quiz' || block.type === 'exam') {
    const source = block.type === 'exam' ? 'exam' : 'quiz'
    return (block.items || []).map((item) => ({ item, source, itemType: item.type || '' }))
  }
  if (block.type === 'example') {
    return (block.items || [])
      .filter((it) => it && typeof it.question === 'string' && it.question)
      .map((it) => ({ item: it, source: 'quiz', itemType: 'example' }))
  }
  return []
}

/**
 * 采集题库数据（不落盘，便于测试直接断言形状与覆盖数）
 * @returns {Promise<{shards: Record<string, Array>, truncated: Array<{rel: string, key: string}>, unregistered: string[]}>}
 */
export async function collectBank() {
  // 1) 依站点配置建立「文件相对路径 → 元信息」索引（保证只采已注册页面）
  const metaByRel = await buildMetaIndex()

  const shards = {}
  const truncated = []
  const unregistered = []

  for (const file of collectFiles(CONTENT_DIR)) {
    const rel = relPathOf(file)
    const info = metaByRel.get(rel)
    // 未注册进 site.js 的磁盘文件：validate:content 会拦下，这里兜底只记告警
    if (!info) {
      unregistered.push(rel)
      continue
    }
    let page
    try {
      page = (await importFresh(file)).default
    } catch (e) {
      console.warn(`[practice-bank] ⚠️ 页面加载失败，已跳过：${rel}（${e.message}）`)
      continue
    }
    if (!page) continue

    // fileKey 由 pageMeta 唯一真相源生成（与 UnitView 的 pageKey 同一条规则）
    const fileKey = pageFileKeyOf(info)
    let quizBlockSeq = 0 // 页内 quiz/exam 区块流水号（含容器内子区块），保证键唯一

    walkBlocks(page.blocks, (block) => {
      const questions = extractQuestions(block)
      if (!questions.length) return
      const blockIndex = quizBlockSeq++
      const list = (shards[info.subject] ||= [])

      questions.forEach(({ item, source, itemType }, itemIndex) => {
        const qCap = capText(item.question, QUESTION_LIMIT)
        // 例题可能只有 solution 没有 answer：回退取 solution，保证解析字段可用
        const rawAnswer = typeof item.answer === 'string' && item.answer ? item.answer : item.solution
        const aCap = capText(rawAnswer, ANSWER_LIMIT)
        // 判分口径（prd-mobile §5.1）：有 options 且有 correctIndex → 可机器判分
        const gradable =
          Array.isArray(item.options) && item.options.length > 0 && item.correctIndex !== undefined
        const entry = {
          k: practiceKeyOf(info, blockIndex, itemIndex),
          s: info.subject,
          u: info.unitNum,
          ut: info.unitTitle,
          fi: info.fileIndex,
          fk: fileKey,
          ft: info.title,
          bt: block.title || '',
          q: qCap.text,
          a: aCap.text,
          d: item.difficulty || '',
          it: itemType,
          g: gradable,
          sr: source
        }
        if (gradable) {
          entry.o = item.options
          entry.ci = item.correctIndex
        }
        if (qCap.truncated || aCap.truncated) {
          truncated.push({ rel, key: entry.k })
        }
        list.push(entry)
      })
    })
  }

  return { shards, truncated, unregistered }
}

/**
 * 由 exam 题目聚合「真题卷清单」（L1 模拟冲刺入口）：
 * 同一 fileKey 的 exam 题归为一套卷，坐标直接可跳 /study/:subject/:unitNum/:fileIndex
 * @param {Record<string, Array>} shards
 */
function collectExamPapers(shards) {
  const byFile = new Map()
  for (const list of Object.values(shards)) {
    for (const it of list) {
      if (it.sr !== 'exam') continue
      if (!byFile.has(it.fk)) {
        byFile.set(it.fk, {
          subject: it.s,
          unitNum: it.u,
          fileIndex: it.fi,
          fileKey: it.fk,
          title: it.ft,
          count: 0
        })
      }
      byFile.get(it.fk).count++
    }
  }
  return [...byFile.values()].sort((a, b) => (a.fileKey < b.fileKey ? -1 : 1))
}

async function build() {
  const { shards, truncated, unregistered } = await collectBank()

  // 2) 汇总索引（小，L1 常驻）：学科题量 + gradable 占比 + 真题卷清单
  const subjects = {}
  let total = 0
  let gradableTotal = 0
  for (const [subject, list] of Object.entries(shards)) {
    const gradable = list.filter((it) => it.g).length
    subjects[subject] = { count: list.length, gradable }
    total += list.length
    gradableTotal += gradable
  }
  const index = {
    generatedAt: new Date().toISOString(),
    total,
    gradableTotal,
    subjects,
    examPapers: collectExamPapers(shards)
  }

  // 3) 输出：先清目录再写，避免学科下线后旧分片残留
  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(PUBLIC_DIR, BANK_INDEX_FILE), JSON.stringify(index), 'utf-8')
  for (const [subject, list] of Object.entries(shards)) {
    writeFileSync(join(PUBLIC_DIR, practiceShardPath(subject)), JSON.stringify(list), 'utf-8')
  }

  // 4) 超限必报告：截断与未注册文件必须点名
  if (truncated.length) {
    console.warn(
      `[practice-bank] ⚠️ 以下题目文本超过上限（题干 ${QUESTION_LIMIT} / 答案 ${ANSWER_LIMIT} 字符）已截断：\n  ` +
        truncated.map((t) => `${t.rel}（${t.key}）`).join('\n  ')
    )
  }
  if (unregistered.length) {
    console.warn(`[practice-bank] ⚠️ 以下文件未注册进 site.js，已跳过：\n  ` + unregistered.join('\n  '))
  }

  const sizes = Object.keys(shards)
    .map((subject) => {
      const bytes = statSync(join(PUBLIC_DIR, practiceShardPath(subject))).size
      return `${subject}（${shards[subject].length} 题 / ${(bytes / 1024).toFixed(1)} KB）`
    })
    .join('、')
  console.log(
    `[practice-bank] 已生成 ${BANK_INDEX_FILE}（共 ${total} 题，gradable ${gradableTotal}）+ ${sizes}`
  )
}

// 直接执行时构建；被测试 import 时只暴露 collectBank / capText（避免一 import 就写 public/）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    console.error('[practice-bank] 生成失败:', e)
    process.exit(1)
  })
}
