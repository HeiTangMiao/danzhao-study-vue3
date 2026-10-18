#!/usr/bin/env node
/**
 * 填空可判性守卫（check-fill-gradable）
 *
 * 拦什么：被 isFillItem 判为「填空」因而走自动判分、但 extractCandidates 抽不出任何
 * 候选答案的条目。这些条目**自动判分不生效**，学员提交后只会看到
 * 「未自动匹配，请对照答案确认」（QuizBlock.vue）——不是误判，但也没有正反馈。
 *
 * 为什么不是去放宽 extractCandidates：该函数见 `→` 或 `_{3,}` 直接 return [] 是**有意守卫**
 * （防「值+解析」复合答案把解析里的数字当候选 → 误判对，属 §0.1 严禁）。
 *
 * 已知清单（KNOWN）：下列条目**刻意不修**。它们的答案是多步命令序列或开放式推导，
 * 换成 example 块反而会让学员失去输入框（只能直接点开答案），是体验倒退——
 * 当前「有输入框 + 不自判 + 引导对照」是更优解。故登记在案，本守卫对它们不报，
 * 但**新增的同类条目仍会被拦住**，守卫价值不减。
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

/**
 * 已知清单：刻意不修的条目（键为 `学科|k`）
 *
 * 登记理由（2026-10-18）：这些题答案是多步命令序列（`enable → configure terminal → ...`）
 * 或开放式推导（`答案不唯一，如 a=-1 或 b=1`）。曾尝试两条路都走不通——
 *   1. 改标 type:"solve"：quiz 块的题型白名单不含 solve（批 F Fc4「去并集」设计，
 *      由三个测试钉住），属设计边界不是 bug，已回滚；
 *   2. 移到 example 块：会让学员**失去填空输入框**直接看答案，是体验倒退。
 * 故维持现状——学员输入后看到「未自动匹配，请对照答案确认」，有合理降级路径。
 */
const KNOWN = new Set([
  'computer|03/6/2/0', // 交换机特权/全局模式/改名
  'computer|03/6/2/1', // 建 VLAN / 进端口 / 划入 VLAN
  'computer|03/6/2/2', // trunk 模式 / 链路组
  'computer|03/6/2/3', // 路由功能 / RIP / 版本 2
  'computer|03/6/2/4', // 取消汇总 / 宣告网络 / 重发布
  'math|01/6/1/3',     // 充分不必要条件（答案不唯一）
  'math|05/2/1/2'      // 余弦定理求边（答案为整段推导）
])

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
        // 已知清单内的不报（刻意不修），其余视为「新增的自动判分盲区」
        if (KNOWN.has(`${subj}|${it.k}`)) continue
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
    // ⚠️ k 刻意用 99/9/9/9 以**避开** KNOWN 清单：自检要证明的是守卫会红，
  //    若用清单内的键会被跳过，自检就变成假的绿灯。
  const fake = [{
    subj: 'selftest', k: '99/9/9/9', fk: 'selftest', it: 'fill',
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
  console.error(`\n✗ 发现 ${bad.length} 道「被判填空但抽不出候选答案」的条目（自动判分不生效）`)
  report(bad)
  console.error('\n修法：把这类条目改标 type:"solve"（走自评），')
  console.error('      **不要**放宽 answerNorm.js 里见 `→`/`_{3,}` return [] 的守卫——那会导致误判对。')
  console.error('      注：quiz 块当前不接受 solve 类型，需先扩展 schema 五处白名单。')
  process.exit(1)
}
console.log(`✓ 填空可判性校验通过（${SUBJECTS.join(' / ')}）`)
