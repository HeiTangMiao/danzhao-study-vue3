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
 *  - 判断题派生来自 src/content/judgeDerive.js（零 import 纯函数，页面内 QuizBlock 复用同一函数）
 *  - 任何截断必须 console.warn 点名，不允许静默失败
 *  - 只读内容、只写 public/practice-bank/，不碰 src/content/ 数据页
 *
 * 用法：node scripts/build-practice-bank.mjs（或 npm run build:practice）
 */
import { writeFileSync, mkdirSync, rmSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT, CONTENT_DIR, collectFiles, buildMetaIndex, importFresh, relPathOf } from './lib/load-content.mjs'
import { pageFileKeyOf } from '../src/content/pageMeta.js'
import { deriveJudge, isJudgeItem, scanJudgeExceptions } from '../src/content/judgeDerive.js'
import { isFillItem, extractCandidates } from '../src/content/answerNorm.js'
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

/** 派生抽检清单文件名（A-4，构建产出、供人工核验） */
const AUDIT_FILE = '_derived-audit.json'

/** 人工核验白名单（A-4，人工维护后入库，构建时消费） */
const VERIFIED_FILE = join(ROOT, 'scripts', 'derived-verified.json')

/**
 * 读取人工核验白名单（A-4）：支持 `{ keys: [...] }` 或裸数组
 * 键格式为 **`${subject}/${key}`**（如 `chinese/01/0/0/2`）—— 因题库键 `k` 仅**学科内唯一**
 * （全库存在大量跨学科同键），若按裸 `k` 匹配会跨学科连带置位（F1 缺陷）。
 * 文件缺失/损坏按空集处理，不阻断构建（构建脚本对人工输入的鲁棒性）
 * @returns {Set<string>} 元素形如 `chinese/01/0/0/2`
 */
export function loadVerifiedKeys() {
  try {
    const obj = JSON.parse(readFileSync(VERIFIED_FILE, 'utf-8'))
    const keys = Array.isArray(obj) ? obj : obj && Array.isArray(obj.keys) ? obj.keys : []
    return new Set(keys.map((k) => String(k)))
  } catch {
    return new Set()
  }
}

/**
 * 判断某派生条目是否在人工核验白名单内（F1 修复）：
 * 白名单键 = `${subject}/${key}`，**带学科前缀**，避免裸键跨学科连带。
 * @param {Set<string>} verifiedKeys 白名单集合（元素形如 'chinese/01/0/0/2'）
 * @param {string} subject 学科 key
 * @param {string} key 题库键（学科内唯一）
 * @returns {boolean}
 */
export function isVerifiedEntry(verifiedKeys, subject, key) {
  return !!verifiedKeys && verifiedKeys.has(`${subject}/${key}`)
}

/**
 * 合并人工核验结果并汇总计数（纯函数，便于单测；build() 直接消费）。
 * 副作用：对 `shards` 中命中白名单的派生条目（it.dv===true）置 `it.vf = true`。
 * @param {Record<string, Array>} shards 分片（学科 → 条目数组）
 * @param {Set<string>} verifiedKeys 人工核验白名单（键 `${subject}/${key}`）
 * @returns {{subjects: object, total: number, gradableTotal: number, derivedTotal: number, verifiedDerived: number, audit: Array}}
 */
export function applyVerifiedFlags(shards, verifiedKeys) {
  const subjects = {}
  const audit = [] // 派生抽检清单（A-4，供人工核验）
  let total = 0
  let gradableTotal = 0
  let derivedTotal = 0
  let verifiedDerived = 0
  let normTotal = 0 // fill 题可规整标注计数（B-2，统计口径）
  for (const [subject, list] of Object.entries(shards)) {
    let gradable = 0
    let derived = 0
    let verified = 0
    let normalizable = 0
    for (const it of list) {
      if (it.g) gradable++
      if (it.nz) normalizable++
      if (it.dv) {
        derived++
        // vf 只对派生题有意义；人工题缺省不写，避免污染既有 gradable 口径
        if (isVerifiedEntry(verifiedKeys, it.s, it.k)) it.vf = true
        if (it.vf) verified++
        audit.push({
          k: it.k,
          s: it.s,
          q: it.q,
          verdict: it.ci === 0 ? '正确' : '错误',
          aHead: it.a.slice(0, 24)
        })
      }
    }
    subjects[subject] = { count: list.length, gradable, derived, verified, normalizable }
    total += list.length
    gradableTotal += gradable
    derivedTotal += derived
    verifiedDerived += verified
    normTotal += normalizable
  }
  return { subjects, total, gradableTotal, derivedTotal, verifiedDerived, normTotal, audit }
}

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
 * @returns {Promise<{shards: Record<string, Array>, truncated: Array<{rel: string, key: string}>, unregistered: string[], judgeExceptions: Array}>}
 *   judgeExceptions：命中判断题形态判据但答案不以加粗「正确。/错误。」开头的条目（A-1 例外清单，非阻塞）
 */
export async function collectBank() {
  // 1) 依站点配置建立「文件相对路径 → 元信息」索引（保证只采已注册页面）
  const metaByRel = await buildMetaIndex()

  const shards = {}
  const truncated = []
  const unregistered = []
  // 判断题候选（含 k/s，供 scanJudgeExceptions 定位例外）——不在此处判例外，交纯函数统一处理
  const judgeCandidates = []

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
        let gradable =
          Array.isArray(item.options) && item.options.length > 0 && item.correctIndex !== undefined
        // A-1：判断题构建期派生（唯一真相源 deriveJudge，页面内 QuizBlock 复用同一函数）
        const derived = deriveJudge(item)
        const entry = {
          k: practiceKeyOf(info, blockIndex, itemIndex),
          s: info.subject,
          u: info.unitNum,
          ut: info.unitTitle,
          fi: info.fileIndex,
          fk: fileKey,
          // D-3（A 档，P1-14）：kp := fileKey，构建期派生（零 schema、零内容改动）。
          // 显式加键而非运行时从 fk 派生 —— 为 B 档（页内考点）前向兼容：届时只改这一行写入，
          // 产物形状 / normalizeBankItem / composePaper 的 kp 维度都不用动。
          kp: fileKey,
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
        } else if (derived) {
          // 派生：补选项 + 正确答案索引，并打 dv 标记（vf 在 build() 合并白名单时打）
          entry.o = derived.options
          entry.ci = derived.correctIndex
          entry.dv = true
          gradable = true
        }
        entry.g = gradable
        // B-2：fill 题构建期只标「可规整性」布尔 nz（期望值抽取非空），不预生成规整结果
        // —— 期望值抽取是启发式，算法升级不应要求重建产物；标注仅供组卷统计 / M1 测算
        if (isFillItem(item)) {
          entry.nz = extractCandidates(aCap.text).length > 0
        }
        // 判断题候选：形态判据命中即登记（例外判定交 scanJudgeExceptions，末尾统一 warn）
        if (isJudgeItem(item)) {
          judgeCandidates.push({
            type: item.type,
            question: item.question,
            answer: item.answer,
            solution: item.solution,
            k: entry.k,
            s: info.subject
          })
        }
        if (qCap.truncated || aCap.truncated) {
          truncated.push({ rel, key: entry.k })
        }
        list.push(entry)
      })
    })
  }

  return { shards, truncated, unregistered, judgeExceptions: scanJudgeExceptions(judgeCandidates) }
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
  const { shards, truncated, unregistered, judgeExceptions } = await collectBank()
  // A-4：人工核验白名单（键 `${subject}/${key}`；仅对 dv:true 的条目打 vf；F1 修复防跨学科连带）
  const verifiedKeys = loadVerifiedKeys()

  // 2) 汇总索引（小，L1 常驻）：学科题量 + gradable/derived/verified/normalizable 计数 + 真题卷清单
  const { subjects, total, gradableTotal, derivedTotal, verifiedDerived, normTotal, audit } =
    applyVerifiedFlags(shards, verifiedKeys)
  const index = {
    generatedAt: new Date().toISOString(),
    total,
    gradableTotal,
    derivedTotal,
    verifiedDerived,
    normTotal,
    subjects,
    examPapers: collectExamPapers(shards)
  }

  // 3) 输出：先清目录再写，避免学科下线后旧分片残留
  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(PUBLIC_DIR, BANK_INDEX_FILE), JSON.stringify(index), 'utf-8')
  writeFileSync(join(OUT_DIR, AUDIT_FILE), JSON.stringify(audit), 'utf-8')
  for (const [subject, list] of Object.entries(shards)) {
    writeFileSync(join(PUBLIC_DIR, practiceShardPath(subject)), JSON.stringify(list), 'utf-8')
  }

  // 4) 超限必报告：截断、未注册文件、判断题例外必须点名
  if (truncated.length) {
    console.warn(
      `[practice-bank] ⚠️ 以下题目文本超过上限（题干 ${QUESTION_LIMIT} / 答案 ${ANSWER_LIMIT} 字符）已截断：\n  ` +
        truncated.map((t) => `${t.rel}（${t.key}）`).join('\n  ')
    )
  }
  if (unregistered.length) {
    console.warn(`[practice-bank] ⚠️ 以下文件未注册进 site.js，已跳过：\n  ` + unregistered.join('\n  '))
  }
  // A-1 例外清单：命中判断题形态判据但答案不以加粗「正确。/错误。」开头（不派生、不阻塞，请内容侧核对）
  if (judgeExceptions.length) {
    console.warn(
      `[practice-bank] ⚠️ 以下判断题形态命中但答案非加粗「正确。/错误。」开头，未派生（请内容侧核对）：\n  ` +
        judgeExceptions
          .map((e) => `${e.s}/${e.k} reason=${e.reason} aHead=「${e.answerHead}」`)
          .join('\n  ')
    )
  }

  const sizes = Object.keys(shards)
    .map((subject) => {
      const bytes = statSync(join(PUBLIC_DIR, practiceShardPath(subject))).size
      return `${subject}（${shards[subject].length} 题 / ${(bytes / 1024).toFixed(1)} KB）`
    })
    .join('、')
  console.log(
    `[practice-bank] 已生成 ${BANK_INDEX_FILE}（共 ${total} 题，gradable ${gradableTotal}，` +
      `derived ${derivedTotal}，verified ${verifiedDerived}，normalizable ${normTotal}）+ ${sizes}`
  )
}

// 直接执行时构建；被测试 import 时只暴露 collectBank / capText（避免一 import 就写 public/）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    console.error('[practice-bank] 生成失败:', e)
    process.exit(1)
  })
}
