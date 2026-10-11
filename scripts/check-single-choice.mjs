#!/usr/bin/env node
/**
 * 单选题 / 判断题「判分口径」自检（内容侧交付给功能侧，建议与 check:dup 并列挂 CI）
 *
 * 背景：
 *   客观题的判分结果由两个字段共同决定，二者一旦不一致，学员按揭示的答案作答会被判错，
 *   这是最难自查、体验最差的缺陷：
 *     ① 判分口径 `correctIndex`（判分按它算对错）
 *     ② 展示口径 `answer` 开头（学员看到的"答案是 B"）
 *
 *   validate:content 的语义校验只覆盖前者的一半：
 *     ✅ correctIndex 越界 / options 非数组 / 有 correctIndex 却缺 options / 题干·答案为空
 *     ❌ correctIndex 完全缺失（有选项却不判分，静默降级）
 *     ❌ 展示口径与判分口径不一致（见上）
 *     ❌ 选项空串 / 同题选项重复 / 选项数异常
 *   故本脚本补齐后半段：既可做「一次性全库体检」，也可常态化守门。
 *
 * 口径（两类，并列输出，不挑单一最严）：
 *   A 类（硬缺陷，计入退出码）—— 会导致判分错误或静默不可判分
 *   B 类（疑似，仅报告）      —— 内容风格/渲染口径问题，需人工判断
 *
 * ⚠️ 全库共三种答案书写格式并存（均能解析；前两种为惯例，第三种是异类）：
 *     `**C**。……`（410 道）／`答案：C。……`（503 道）／`**C。**……`（18 道，仅整卷模拟（四））
 *   只认 `**C**` 会让另两类（521 道）的口径检查全部漏检 —— 本脚本三种都解析。
 *   第三种与前两种风格不一致，若不统一，任何按前缀解析答案字母的 UI 都会漏掉这 18 道。
 *
 * 用法：
 *   node scripts/check-single-choice.mjs            # 全量检查
 *   node scripts/check-single-choice.mjs --quiet    # 只打印汇总
 *   node scripts/check-single-choice.mjs --b-only   # 只看疑似
 *   node scripts/check-single-choice.mjs --selftest # 自检：注入人造坏样本，验证每条 A 类规则都会触发
 *
 * 退出码：A 类有命中 → 1；否则 0
 *
 * 依赖：需先跑 `npm run build:practice` 生成题库产物
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SUBJECTS = ['math', 'chinese', 'computer']
const BANK_DIR = join(process.cwd(), 'public', 'practice-bank')

/** 选项洗净：去空白与全角空格，仅用于"两个选项是否相同"的比对 */
const norm = (s) => String(s ?? '').replace(/[\s\u3000]+/g, '')

/**
 * 剥掉选项自带的字母前缀（`A. ` / `B、` / `C．` / `D)`）。
 * ⚠️ 全库多数选项文本自带前缀（math 200 / chinese 178 / computer 420 道），
 * 不剥前缀去比对，`A. 甲` 与 `C. 甲` 会被判成"不同选项" → 「同题选项内容重复」整类漏检（已踩过）。
 */
const stripPrefix = (s) => String(s ?? '').replace(/^\s*[A-Ha-h]\s*[.、．)）:：]\s*/, '')

/**
 * 选项比对专用归一化：剥前缀 + **压缩**空白（不是删除）。
 * ⚠️ 不能沿用 norm()（删除全部空白）：`C. 3 4` 会被压成 `34`，与 `B. 34` 撞车 →
 * 「同题选项重复」误报（已踩过）。选项文本里的空格可能是有意义的。
 */
const normOpt = (s) => stripPrefix(s).replace(/\s+/g, ' ').trim()

const letterOf = (i) => String.fromCharCode(65 + i)

/**
 * 抽「展示口径」的答案标识。
 * 兼容两类写法，顺序无所谓（都用 match 而非锚定开头，答案前可能有 `答案：`）：
 *   字母型：`**C**。…` / `答案：C。…` / `答案 C …`
 *   结论型：`**正确。**…` / `**错误。**…`
 * @returns {{kind:'letter'|'verdict'|null, value:string|null}}
 */
function answerMark(answer) {
  const a = String(answer ?? '')
  // 结论型必须**锚定开头**：`**正确。**…` / `答案：**错误。**…`。
  // 若改成全文搜索，`**A**。甲正确。` 这类正常单选答案会被误判为结论型 → 假阳性（已踩过）。
  const v = a.match(/^\s*(?:答案\s*[:：]\s*)?(?:\*\*\s*)?(正确|错误)\s*[。.]/)
  if (v) return { kind: 'verdict', value: v[1] }
  const m =
    a.match(/\*\*\s*([A-Ha-h])\s*\*\*/) || // **C**
    a.match(/\*\*\s*([A-Ha-h])\s*[。.]\s*\*\*/) || // **C。**（句号在加粗内，见下）
    a.match(/答案\s*[:：]?\s*\*\*\s*([A-Ha-h])\s*\*\*/) || // 答案：**C**
    a.match(/^\s*答案\s*[:：]?\s*([A-Ha-h])\b/) || // 答案：C
    a.match(/^\s*([A-Ha-h])\s*[。.、：:]/) // C。……
  return { kind: m ? 'letter' : null, value: m ? m[1].toUpperCase() : null }
}

/**
 * 单题体检（纯函数，便于自检注入人造样本）
 * @param {object} it 题库条目（含 it 题型 / o 选项 / ci 正确索引 / a 答案 / k 键 / fk 文件键）
 * @returns {{hard:Array, soft:Array}} 两项均为 `[编码, 描述, 补充]` 三元组数组
 */
export function inspectItem(it) {
  const hard = []
  const soft = []
  const o = it.o
  const ci = it.ci
  const type = it.it
  const hasOpts = Array.isArray(o) && o.length > 0

  // ---------- 单选题：判分链主体 ----------
  if (type === 'single') {
    if (!hasOpts) {
      hard.push(['A1', `单选题缺 options（或为空数组）—— 该题静默不可判分`, ''])
    } else {
      if (typeof ci !== 'number' || !Number.isInteger(ci)) {
        hard.push(['A2', 'correctIndex 缺失或非整数 —— 该题静默不可判分', ''])
      } else if (ci < 0 || ci >= o.length) {
        hard.push(['A3', `correctIndex 越界（${ci}，选项数 ${o.length}）`, ''])
      }

      const empties = o.map((x, i) => (norm(x) === '' ? letterOf(i) : null)).filter(Boolean)
      if (empties.length) hard.push(['A4', `选项为空串：${empties.join('/')}`, ''])

      const seen = new Map()
      const dups = []
      o.forEach((x, i) => {
        const k = normOpt(x)
        if (!k) return
        if (seen.has(k)) dups.push(`${letterOf(seen.get(k))}=${letterOf(i)}`)
        else seen.set(k, i)
      })
      if (dups.length) hard.push(['A5', `同题选项内容重复（剥字母前缀后）：${dups.join('、')}`, ''])

      // 展示口径 vs 判分口径：最危险的一类
      const mark = answerMark(it.a)
      if (mark.kind === 'verdict') {
        hard.push(['A6', `答案写成判断题结论「${mark.value}」，与单选题结构不符`, ''])
      } else if (mark.kind !== 'letter') {
        soft.push(['B1', 'answer 里识别不到答案字母（无法与 correctIndex 交叉核对）', ''])
      } else {
        const idx = mark.value.charCodeAt(0) - 65
        if (typeof ci === 'number' && Number.isInteger(ci) && ci >= 0 && ci < o.length && idx !== ci) {
          hard.push([
            'A7',
            `答案字母 ${mark.value} ≠ correctIndex 指向的 ${letterOf(ci)} —— 揭示答案与判分口径矛盾`,
            `correctIndex=${ci}→${letterOf(ci)}（正解文本：${String(o[ci]).slice(0, 26)}）`
          ])
        }
        if (idx >= o.length) {
          hard.push(['A8', `答案字母 ${mark.value} 超出选项范围（选项数 ${o.length}）`, ''])
        }
      }

      // ---- B 类（单选题）----
      if (o.length !== 4) soft.push(['B2', `选项数 ${o.length}（全库惯例 4 项）`, ''])
      const lens = o.map((x) => norm(x).length).filter((n) => n > 0)
      if (lens.length > 1) {
        const mx = Math.max(...lens)
        const mn = Math.min(...lens)
        if (mn > 0 && mx / mn >= 5) soft.push(['B3', `选项长度极不均衡（最长 ${mx} / 最短 ${mn}）`, ''])
      }
      if (o.some((x) => /以上(都|均)?(对|正确|是)|以上(都|均)?(不对|错)|以上都不是/.test(String(x)))) {
        soft.push(['B4', '含「以上都对/都不对」类选项（干扰项设计，请确认是否预期）', ''])
      }
    }
  }

  // ---------- 判断题：同源的口径矛盾（与单选 A7 同类） ----------
  if (type === 'judge') {
    if (!hasOpts) {
      hard.push(['A9', '判断题缺 options（正确/错误两项）', ''])
    } else if (typeof ci !== 'number' || !Number.isInteger(ci) || ci < 0 || ci >= o.length) {
      hard.push(['A10', `判断题 correctIndex 缺失或越界（${ci}，选项数 ${o.length}）`, ''])
    } else {
      const mark = answerMark(it.a)
      if (mark.kind !== 'verdict') {
        soft.push(['B5', '判断题 answer 未以「正确/错误」结论开头（派生与判分同源，请确认）', ''])
      } else {
        const want = ci === 0 ? '正确' : '错误'
        if (mark.value !== want) {
          hard.push([
            'A11',
            `判断题 answer 结论「${mark.value}」≠ correctIndex 指向的「${want}」—— 揭示答案与判分口径矛盾`,
            `correctIndex=${ci}→${o[ci]}`
          ])
        }
      }
    }
  }

  // ---------- 例题带选项：不参与判分，仅提示 ----------
  if (type === 'example' && hasOpts) {
    soft.push(['B6', `例题带 ${o.length} 个选项与 correctIndex（不参与判分，确认渲染意向）`, ''])
  }

  // ---------- 题型未声明却带选项 ----------
  // 注意：题库的 options/correctIndex 可能是**构建期派生**的（源数据只写「判断：…」+`**错误。**`）。
  // 这类条目 g/dv 为真 —— 判分链其实认得，只是源数据 schema 不统一，故只作疑似，不算硬缺陷。
  if (type !== 'single' && type !== 'judge' && type !== 'example' && hasOpts) {
    if (it.g || it.dv) {
      soft.push(['B7', `题型未声明（="${type}"）但已派生判分结构（g/dv 为真）—— 不影响判分，源数据可统一`, ''])
    } else {
      hard.push(['A12', `题型未声明为 single/judge，却带 ${o.length} 个选项且未派生判分结构 —— 判分链不识别`, ''])
    }
  }

  return { hard, soft }
}

/** 自检：每条 A 类规则各注入一个人造坏样本，规则不触发即视为脚本失效 */
function selftest() {
  const base = {
    it: 'single',
    o: ['A. 甲', 'B. 乙', 'C. 丙', 'D. 丁'],
    ci: 0,
    a: '**A**。甲正确。',
    k: '00/0/0/0',
    fk: 'demo'
  }
  const cases = [
    ['A1', { ...base, o: [] }],
    ['A2', { ...base, ci: undefined }],
    ['A3', { ...base, ci: 9 }],
    ['A4', { ...base, o: ['A. 甲', '', 'C. 丙', 'D. 丁'] }],
    ['A5', { ...base, o: ['A. 甲', 'B. 乙', 'C. 甲', 'D. 丁'] }],
    ['A6', { ...base, a: '**正确。**是的。' }],
    ['A7', { ...base, ci: 2 }],
    ['A8', { ...base, a: '**F**。超范围。' }],
    ['A9', { ...base, it: 'judge', o: [] }],
    ['A10', { ...base, it: 'judge', o: ['正确', '错误'], ci: 5 }],
    ['A11', { ...base, it: 'judge', o: ['正确', '错误'], ci: 1, a: '**正确。**' }],
    ['A12', { ...base, it: '', g: false, dv: false, o: ['正确', '错误'], ci: 1 }]
  ]
  let bad = 0
  for (const [code, sample] of cases) {
    const hit = inspectItem(sample).hard.some((h) => h[0] === code)
    if (!hit) bad++
    console.log(`  ${hit ? '✓' : '✗'} ${code} ${hit ? '会触发' : '未触发（脚本失效！）'}`)
  }
  // 反向：干净样本不得误报（护住假阳性）
  const clean = inspectItem(base).hard.length
  console.log(`  ${clean === 0 ? '✓' : '✗'} 干净样本 A 类误报 ${clean} 处`)
  if (clean !== 0) bad++
  // 三种答案格式都要能解析（护住"只认 **X** 导致 521 道漏检"这个坑）
  const formats = [
    ['答案：A。甲正确。', '`答案：A。`'],
    ['**A。**甲正确。', '`**A。**`'],
    ['**A**。甲正确。', '`**A**。`']
  ]
  for (const [a, label] of formats) {
    const r = inspectItem({ ...base, a }).hard
    const ok = r.length === 0
    console.log(`  ${ok ? '✓' : '✗'} 兼容 ${label} 写法（漏检回归守卫）`)
    if (!ok) bad++
  }
  // 格式识别必须能与 correctIndex 交叉：错字母必须报 A7
  for (const [a, label] of formats) {
    const r = inspectItem({ ...base, a: a.replace('A', 'C'), ci: 0 }).hard.some((h) => h[0] === 'A7')
    console.log(`  ${r ? '✓' : '✗'} ${label} 错字母能报 A7（交叉核对生效）`)
    if (!r) bad++
  }
  // 选项里的空格有意义：`3 4` 与 `34` 不得判为重复（护住 A5 假阳性）
  const spaced = inspectItem({ ...base, o: ['A. 7', 'B. 34', 'C. 3 4', 'D. 报错'] }).hard
  const spacedOk = spaced.length === 0
  console.log(`  ${spacedOk ? '✓' : '✗'} 选项空格有义（\`3 4\`≠\`34\`）不误报重复`)
  if (!spacedOk) bad++
  // 已派生判分结构的条目（g/dv 为真）不得算硬缺陷（护住对"构建期派生"这一事实的误伤）
  const derivedOk = inspectItem({ ...base, it: '', g: true, dv: true, o: ['正确', '错误'], ci: 1 }).hard.length === 0
  console.log(`  ${derivedOk ? '✓' : '✗'} 已派生结构（g/dv 真）不计硬缺陷`)
  if (!derivedOk) bad++
  console.log(bad === 0 ? '\n自检通过：A 类 12 条规则全部会触发，无假阳性。' : `\n自检失败：${bad} 项。`)
  process.exit(bad === 0 ? 0 : 1)
}

if (process.argv.includes('--selftest')) {
  console.log('单选题/判断题判分口径自检 —— 脚本自检')
  selftest()
}

// ---------------- 全库体检 ----------------
let hardHits = 0
let softHits = 0
let singleCount = 0
let judgeCount = 0
const quiet = process.argv.includes('--quiet')
const bOnly = process.argv.includes('--b-only')

for (const subject of SUBJECTS) {
  const items = JSON.parse(readFileSync(join(BANK_DIR, `${subject}.json`), 'utf8'))
  const rows = []
  for (const it of items) {
    if (it.it !== 'single' && it.it !== 'judge' && !(Array.isArray(it.o) && it.o.length)) continue
    if (it.it === 'single') singleCount++
    if (it.it === 'judge') judgeCount++
    const { hard, soft } = inspectItem(it)
    for (const h of hard) rows.push(['A', h, it])
    for (const s of soft) rows.push(['B', s, it])
  }
  const hard = rows.filter((r) => r[0] === 'A')
  const soft = rows.filter((r) => r[0] === 'B')
  hardHits += hard.length
  softHits += soft.length

  console.log(`\n===== ${subject}: A 类硬缺陷 ${hard.length} | B 类疑似 ${soft.length} =====`)
  if (quiet) continue
  for (const [cls, [code, msg, extra], it] of rows) {
    if (bOnly && cls === 'A') continue
    console.log(`  [${code}] ${msg}`)
    console.log(`      ${it.k}@${it.fk}`)
    console.log(`      ${String(it.q ?? '').replace(/\s+/g, ' ').slice(0, 76)}`)
    if (extra) console.log(`      ${extra}`)
  }
}

console.log(
  `\n汇总：单选题 ${singleCount} 道 + 判断题 ${judgeCount} 道｜A 类硬缺陷 ${hardHits} 处（计入退出码）｜B 类疑似 ${softHits} 处（不卡 CI，需人工确认）`
)
if (hardHits > 0) {
  console.log('结论：存在会导致判分错误 / 静默不可判分的题目，需修复后重跑。')
  process.exit(1)
}
console.log('结论：未发现 A 类硬缺陷。')
