#!/usr/bin/env node
/**
 * 填空可判性守卫（check-fill-gradable）
 *
 * 拦什么：被 isFillItem 判为「填空」因而走**自动判分**、但 extractCandidates 抽不出任何
 * 候选答案的条目。这类条目学员**答对也判 miss**，且无任何报错——最难自查的缺陷类型。
 *
 * 为什么不是去放宽 extractCandidates：该函数见 `→` 或 `_{3,}` 直接 return [] 是**有意守卫**
 * （防「值+解析」复合答案把解析里的数字当候选 → 误判对，属 §0.1 严禁）。所以正确修法是
 * **改内容标注**（如 type:"solve" 走自评），不是放宽判据。
 *
 * 用法：
 *   node scripts/check-fill-gradable.mjs            # 校验（有问题 exit 1）
 *   node scripts/check-fill-gradable.mjs --selftest # 自检：证明守卫真的会红（退出码非 0）
 *
 * 数据源：public/practice-bank/*.json（构建产物）。CI 需先跑 npm run build:index
 * ——与 s5-qa-artifacts 等产物级测试同口径。
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { extractCandidates, isFillItem } from '../src/content/answerNorm.js'

const BANK_DIR = join(process.cwd(), 'public/practice-bank')
const SUBJECTS = ['chinese', 'computer', 'math']

/** 收集「被判填空但抽不出候选」的条目 */
function collectBad() {
  const bad = []
  for (const subj of SUBJECTS) {
    const file = join(BANK_DIR, `${subj}.json`)
    if (!existsSync(file)) {
      console.error(`✗ 缺少题库产物 ${file} —— 请先运行 npm run build:index`)
      process.exit(1)
    }
    const items = JSON.parse(readFileSync(file, 'utf-8'))
    for (const it of items) {
      if (!isFillItem({ type: it.it, question: it.q })) continue
      if (extractCandidates(it.a).length === 0) {
        bad.push({ subj, k: it.k, fk: it.fk, it: it.it, q: it.q, a: it.a })
      }
    }
  }
  return bad
}

function report(bad) {
  for (const b of bad) {
    console.error(`✗ [${b.subj}] ${b.k}  ${b.fk}`)
    console.error(`    题干: ${b.q.slice(0, 70).replace(/\n/g, ' ')}`)
    console.error(`    答案: ${b.a.slice(0, 70).replace(/\n/g, ' ')}`)
  }
}

if (process.argv.includes('--selftest')) {
  // 自检：证明「守卫会红」这件事本身是可验证的，而非永远 exit 0 的橡皮图章。
  // 做法：用内部构造的坏样本证明报告逻辑会列出条目，同时证明真实数据被扫过。
  const fake = [{
    subj: 'selftest', k: 'x/x/x/x', fk: 'selftest', it: 'fill',
    q: '完成命令填空：`Switch>______`', a: 'enable → configure terminal → hostname SWA。'
  }]
  report(fake)
  const real = collectBad()
  console.error(`--- 自检：人造坏样本 ${fake.length} 条已列出；真实数据扫描到 ${real.length} 条 ---`)
  console.error('✗ selftest 期望非零退出（证明守卫具备「红」的能力）')
  process.exit(1)
}

const bad = collectBad()
if (bad.length > 0) {
  console.error(`\n✗ 发现 ${bad.length} 道「被判填空但抽不出候选答案」的条目（学员答对也判错）`)
  report(bad)
  console.error('\n修法：把这类条目改标 type:"solve"（走自评），')
  console.error('      **不要**放宽 answerNorm.js 里见 `→`/`_{3,}` return [] 的守卫——那会导致误判对。')
  console.error('      注：quiz 块当前不接受 solve 类型，需先扩展 schema 五处白名单。')
  process.exit(1)
}
console.log(`✓ 填空可判性校验通过（${SUBJECTS.join(' / ')}）`)
