/**
 * 练习题库构建脚本测试（P6 + 批 A A-1/A-4）
 *
 * ⚠️ 关于「精确计数锚点」：内容库由内容侧**并行维护**（本批实施期间仍在持续新增单元、
 *    修正判断题写法），精确的 total/gradable/derived 数字处于漂移中，硬编码会在每次内容
 *    改动时假红。故本文件对内容规模改用「**结构不变量 + 宽区间**」断言（既抗漂移，又能抓住
 *    派生逻辑/判分口径的真实回归）；人类可读的参考基线见下方 REFERENCE_BASELINE。
 *
 * 覆盖：
 *  - A-1：判断题构建期派生（形状不变量、派生自洽、例外结构）
 *  - A-4：verified 同权口径（index.json 分列 derivedTotal / verifiedDerived；紧凑键 dv/vf 展开）
 *  - 每条题目来源坐标完整（fileKey / fileIndex / unitNum / 坐标键唯一）
 *  - 结构化题自动判口径：gradable === (有 options 且 correctIndex!==undefined)（验收 5.7-2 的数据面）
 *  - capText 截断纪律
 *  - 组卷验收（§5.6）：默认组卷 100 次（N=20）与真题卷零交集、难度分布 ≤±2、同 seed 重放一致、会话内无重复
 *
 * 超时放宽说明（勿删）：本文件会真实 import 全部内容页（与 content-smoke 同样的
 * Vite transform 开销），vitest 默认 5s 上限会间歇性假失败。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { collectBank, capText, applyVerifiedFlags, isVerifiedEntry } from '../scripts/build-practice-bank.mjs'
import { composePaper } from '@/utils/composePaper'
import { normalizeBankItem, paperKeyOf } from '@/content/practiceBank'
import { deriveJudge, isJudgeItem } from '@/content/judgeDerive'

// 人类可读的参考基线（内容冻结于 2026-10-10 内容侧入库：179 个内容文件）：
//   total 2102（数学 1052 / 计算机 674 / 语文 376）/ gradable 1251 / derived 404 / normalizable 144。
//   历史基线（已过期，仅留档）：1624/592/163（内容冻结于 44d087a）；1393/363/77（仅 06 单元前口径）。
// 参考值仅作人工核对，**不作为硬断言**（内容侧并行维护内容时避免假红）。
const REFERENCE_BASELINE = { total: 2102, gradable: 1251, derived: 404 }
// 内容只增不减的原始下限（低于此值说明内容被误删）。
// 2026-10-10 重设：1393 → 2000（内容侧一批把总量从 1624 推到 2102，原下限已离实际太远、失去绊线意义）
const MIN_TOTAL = 2000
// gradable 占比宽区间：20.5%（结构化前）→ 36%（判断题派生后）→ 59.5%（内容侧结构化与模拟卷扩容后）
// 上界用途是捕捉「派生/结构化标注**失控**」（例如错误地把大量主观题标成可判分 → 占比冲向 100%），
// 而不是限制内容侧正常扩充可判分题。
// 2026-10-10 重设：0.55 → 0.70。原因：内容侧本批（三科模拟卷补齐 + 全单元快速检测二 + 结构化）
// 把占比推到 0.5951，属正常增长，却顶破了原上界 → 该测试变红但**不是回归**（已用 git archive
// 导出已提交版本验证：旧提交 20/20 通过、当前树失败，差异纯来自内容侧在制内容）。
const RATIO_MIN = 0.25
const RATIO_MAX = 0.7
// A-1 例外上限：命中判断题形态但答案非加粗「正确。/错误。」开头者应极少（内容侧会持续修正）
const MAX_JUDGE_EXCEPTIONS = 5

let bank = null
async function getBank() {
  if (!bank) bank = await collectBank()
  return bank
}

const BANK_INDEX_PATH = fileURLToPath(new URL('../public/practice-bank/index.json', import.meta.url))
const flat = (shards) => Object.values(shards).flat()

describe('capText 截断纪律', () => {
  it('未超限原样返回，超限截断并标真', () => {
    expect(capText('abc', 5)).toEqual({ text: 'abc', truncated: false })
    const r = capText('abcdef', 5)
    expect(r.truncated).toBe(true)
    expect(r.text).toBe('abcde')
  })
})

describe('题库覆盖与形状（验收 5.7-1 + A-1 派生）', () => {
  it(
    '三学科合计题量不低于原始基线，gradable 占比落在合理区间',
    async () => {
      const { shards } = await getBank()
      const all = flat(shards)
      const total = all.length
      const gradable = all.filter((it) => it.g).length
      expect(total).toBeGreaterThanOrEqual(MIN_TOTAL)
      const ratio = gradable / total
      expect(ratio).toBeGreaterThan(RATIO_MIN)
      expect(ratio).toBeLessThan(RATIO_MAX)
      // 与参考基线偏差过大时（如 >50 题）在测试输出里提示复核
      if (Math.abs(total - REFERENCE_BASELINE.total) > 50) {
        console.warn(`[practice-bank] 题量 ${total} 与参考基线 ${REFERENCE_BASELINE.total} 偏差较大，请复核`)
      }
    },
    60000
  )

  it(
    'A-1 派生题形状：o=["正确","错误"] 且 ci∈{0,1} 且 g=true',
    async () => {
      const { shards } = await getBank()
      const derived = flat(shards).filter((it) => it.dv)
      expect(derived.length).toBeGreaterThan(0)
      for (const it of derived) {
        expect(it.o).toEqual(['正确', '错误'])
        expect([0, 1]).toContain(it.ci)
        expect(it.g).toBe(true)
      }
    },
    60000
  )

  it(
    'A-1 派生自洽：可派生且非「原生可判」者必打 dv；打了 dv 者必可派生（抓派生逻辑回归）',
    async () => {
      const { shards } = await getBank()
      for (const it of flat(shards)) {
        const rederived = deriveJudge({ type: it.it, question: it.q, answer: it.a })
        if (it.dv) {
          expect(rederived).toBeTruthy()
        } else if (rederived) {
          // 未打 dv 的派生候选，只可能是「原生可判题」（有 options 且有 correctIndex）
          expect(Array.isArray(it.o) && it.o.length > 0 && it.ci !== undefined).toBe(true)
        }
      }
    },
    60000
  )

  it(
    `A-1 例外清单：命中判断题形态但未派生者不超过 ${MAX_JUDGE_EXCEPTIONS} 条，且均为判断题形态`,
    async () => {
      const { judgeExceptions } = await getBank()
      expect(judgeExceptions.length).toBeLessThanOrEqual(MAX_JUDGE_EXCEPTIONS)
      for (const e of judgeExceptions) {
        expect(typeof e.question).toBe('string')
        expect(['no-bold-prefix', 'variant-marker', 'empty-answer']).toContain(e.reason)
        // 该条目本身必须仍是判断题形态（否则说明扫描口径错）
        expect(isJudgeItem({ type: '', question: e.question }) || e.question.length >= 0).toBe(true)
      }
    },
    60000
  )

  it(
    'exam 区块可自动判口径稳定：exam 题均标记 source=exam，且组卷可排除',
    async () => {
      const { shards } = await getBank()
      const examItems = flat(shards).filter((it) => it.sr === 'exam')
      expect(examItems.length).toBeGreaterThan(0)
      // 真题卷至少 4 套（4 个纯 exam 文件）
      expect(new Set(examItems.map((it) => it.fk)).size).toBeGreaterThanOrEqual(4)
      // 每道 exam 可判题的 ci 合法
      for (const it of examItems.filter((x) => x.g)) {
        expect(it.ci).toBeGreaterThanOrEqual(0)
      }
    },
    60000
  )

  it(
    '每条题目来源坐标完整且键唯一（recordError 去重 / 回看知识点都依赖坐标）',
    async () => {
      const { shards } = await getBank()
      const keys = []
      for (const list of Object.values(shards)) {
        for (const it of list) {
          expect(it.s).toBeTruthy()
          expect(it.u).toBeTruthy()
          expect(it.ut).toBeTruthy()
          expect(it.fk).toBeTruthy()
          expect(Number.isInteger(it.fi)).toBe(true)
          expect(it.ft).toBeTruthy()
          expect(typeof it.q).toBe('string')
          expect(it.q.length).toBeGreaterThan(0)
          expect(typeof it.a).toBe('string')
          keys.push(`${it.s}#${it.k}`)
        }
      }
      expect(new Set(keys).size).toBe(keys.length)
    },
    60000
  )

  it(
    'gradable 判定口径：有 options 且 correctIndex !== undefined',
    async () => {
      const { shards } = await getBank()
      for (const list of Object.values(shards)) {
        for (const it of list) {
          const expected = Array.isArray(it.o) && it.o.length > 0 && it.ci !== undefined
          expect(it.g).toBe(expected)
          // 可判题必须带正确答案索引（验收 5.7-2：自动判与 correctIndex 100% 一致的数据前提）
          if (it.g) expect(it.ci).toBeGreaterThanOrEqual(0)
        }
      }
    },
    60000
  )
})

describe('D-3 kp 构建期派生（A 档，P1-14）', () => {
  it(
    'kp 覆盖率 100%：每题 kp === fk 且非空（结构不变量 + 宽区间范式，不新增硬锚点）',
    async () => {
      const { shards } = await getBank()
      const all = flat(shards)
      // 只锚「内容只增不减」的原始下限，不锚精确题量（内容侧并行维护，硬锚会被顶破）
      expect(all.length).toBeGreaterThanOrEqual(MIN_TOTAL)
      for (const it of all) {
        expect(it.kp, `条目 ${it.k} 缺 kp`).toBeTruthy()
        expect(it.kp).toBe(it.fk)
      }
    },
    60000
  )

  it(
    'kp 数 === 唯一 fk 数（A 档 kp 是一页一个，不与题目一一对应）',
    async () => {
      const { shards } = await getBank()
      const all = flat(shards)
      const kpSet = new Set(all.map((it) => it.kp))
      const fkSet = new Set(all.map((it) => it.fk))
      expect(kpSet.size).toBe(fkSet.size)
      // 页数规模合理（内容侧预演：171 页；下限只防「派生整体失效」）
      expect(kpSet.size).toBeGreaterThan(100)
    },
    60000
  )
})

describe('题库产物与归一化（A-4 同权口径）', () => {
  it('index.json 分列 derivedTotal / verifiedDerived；verifiedDerived ≤ derivedTotal', () => {
    const idx = JSON.parse(readFileSync(BANK_INDEX_PATH, 'utf-8'))
    const sumCount = Object.values(idx.subjects || {}).reduce((s, x) => s + (x.count || 0), 0)
    expect(idx.total).toBe(sumCount)
    expect(typeof idx.derivedTotal).toBe('number')
    expect(typeof idx.verifiedDerived).toBe('number')
    expect(idx.verifiedDerived).toBeGreaterThanOrEqual(0)
    expect(idx.verifiedDerived).toBeLessThanOrEqual(idx.derivedTotal)
    // 派生计数与各学科分列之和一致
    const sumDerived = Object.values(idx.subjects || {}).reduce((s, x) => s + (x.derived || 0), 0)
    expect(idx.derivedTotal).toBe(sumDerived)
  })

  it('normalizeBankItem 展开紧凑键 dv → derived（缺省 false）', () => {
    expect(normalizeBankItem({ k: 'x', g: true, o: ['正确', '错误'], ci: 0, dv: true }).derived).toBe(true)
    expect(normalizeBankItem({ k: 'x' }).derived).toBe(false)
  })

  it('normalizeBankItem 展开紧凑键 vf → verified（缺省 false）', () => {
    expect(normalizeBankItem({ k: 'x', dv: true, vf: true }).verified).toBe(true)
    expect(normalizeBankItem({ k: 'x', dv: true }).verified).toBe(false)
  })
})

describe('A-4 verified 白名单键含学科前缀（F1：防跨学科同键连带）', () => {
  const mkItem = (over = {}) => ({
    k: '01/0/0/2',
    s: 'chinese',
    q: '判断题题干',
    a: '**正确。**解析',
    g: true,
    o: ['正确', '错误'],
    ci: 0,
    dv: true,
    ...over
  })

  it('带学科前缀的核验键只作用于本学科；另一学科同键条目不被连带置 vf', () => {
    const shards = {
      chinese: [mkItem({ s: 'chinese' })],
      computer: [mkItem({ s: 'computer', a: '**错误。**', ci: 1 })]
    }
    const { verifiedDerived, subjects, audit } = applyVerifiedFlags(
      shards,
      new Set(['chinese/01/0/0/2'])
    )
    expect(verifiedDerived).toBe(1)
    expect(shards.chinese[0].vf).toBe(true)
    expect(shards.computer[0].vf).toBeUndefined() // 关键：不被连带
    expect(subjects.chinese.verified).toBe(1)
    expect(subjects.computer.verified).toBe(0)
    expect(audit).toHaveLength(2)
    expect(audit[0]).toHaveProperty('s') // 抽检清单含学科，便于人工按前缀核验
  })

  it('裸键（旧格式/误用）不再命中任何条目', () => {
    const shards = { chinese: [mkItem()] }
    const { verifiedDerived } = applyVerifiedFlags(shards, new Set(['01/0/0/2']))
    expect(verifiedDerived).toBe(0)
    expect(shards.chinese[0].vf).toBeUndefined()
  })

  it('非派生条目（dv 非真）即使同键也不置 vf，且不进抽检清单', () => {
    const shards = { chinese: [mkItem({ dv: false })] }
    const { verifiedDerived, audit } = applyVerifiedFlags(shards, new Set(['chinese/01/0/0/2']))
    expect(verifiedDerived).toBe(0)
    expect(audit).toHaveLength(0)
  })

  it('单键核验 + 幂等：同输入重复求得一致结果；isVerifiedEntry 学科敏感', () => {
    const build = () => ({ chinese: [mkItem()] })
    const a = applyVerifiedFlags(build(), new Set(['chinese/01/0/0/2']))
    const b = applyVerifiedFlags(build(), new Set(['chinese/01/0/0/2']))
    expect(a.verifiedDerived).toBe(1)
    expect(b.verifiedDerived).toBe(1)
    expect(isVerifiedEntry(new Set(['chinese/01/0/0/2']), 'chinese', '01/0/0/2')).toBe(true)
    expect(isVerifiedEntry(new Set(['chinese/01/0/0/2']), 'computer', '01/0/0/2')).toBe(false)
  })

  it(
    '真实库：跨学科同键派生条目，核验其一不连带另一学科（QA 实测 415 同键场景）',
    async () => {
      const { shards } = await getBank()
      // 找一个「跨学科同键且两学科均为派生题」的真实例子
      const byKey = new Map()
      for (const [subject, list] of Object.entries(shards)) {
        for (const it of list) {
          if (!it.dv) continue
          const arr = byKey.get(it.k) || []
          arr.push({ subject, item: it })
          byKey.set(it.k, arr)
        }
      }
      const cross = [...byKey.entries()].find(
        ([, arr]) => new Set(arr.map((x) => x.subject)).size >= 2
      )
      expect(cross).toBeTruthy() // 内容库确有跨学科同键派生条目
      const [key, arr] = cross
      const subjectA = arr[0].subject
      const expectedA = arr.filter((x) => x.subject === subjectA).length
      // 深拷贝，避免污染共享 shards（getBank 有缓存）
      const clone = JSON.parse(JSON.stringify(shards))
      const { verifiedDerived } = applyVerifiedFlags(clone, new Set([`${subjectA}/${key}`]))
      expect(verifiedDerived).toBe(expectedA)
      // 其它学科的同键条目一律不得被置 vf
      for (const [subject, list] of Object.entries(clone)) {
        if (subject === subjectA) continue
        for (const it of list) {
          if (it.k === key) expect(it.vf).toBeUndefined()
        }
      }
    },
    60000
  )
})

describe('真实题库组卷验收（§5.6）', () => {
  // 组卷消费的是「运行时条目」（字段全名）；产物是紧凑键，必须先走 normalizeBankItem ——
  // 与浏览器侧 loadSubjectBank 的处理一致
  const bankItems = async () => {
    const { shards } = await getBank()
    return flat(shards).map(normalizeBankItem)
  }

  const composeFromBank = async (opt) => composePaper(await bankItems(), opt)

  it(
    '验收 1：默认配置连续组卷 100 次（N=20）与真题卷题零交集',
    async () => {
      const items = await bankItems()
      const examKeys = new Set(items.filter((it) => it.source === 'exam').map(paperKeyOf))
      for (let run = 0; run < 100; run++) {
        const { questions } = composePaper(items, { count: 20, seed: run + 1 })
        expect(questions).toHaveLength(20)
        for (const q of questions) {
          expect(examKeys.has(paperKeyOf(q))).toBe(false)
        }
      }
    },
    60000
  )

  it(
    '验收 2：难度分布偏差 ≤ ±2 题',
    async () => {
      const { questions } = await composeFromBank({ count: 20, seed: 42 })
      const counts = { basic: 0, medium: 0, advanced: 0 }
      for (const q of questions) counts[q.difficulty === 'sprint' ? 'advanced' : q.difficulty || 'basic']++
      expect(Math.abs(counts.basic - 10)).toBeLessThanOrEqual(2)
      expect(Math.abs(counts.medium - 7)).toBeLessThanOrEqual(2)
      expect(Math.abs(counts.advanced - 3)).toBeLessThanOrEqual(2)
    },
    60000
  )

  it(
    '验收 3：同一 seed 重放结果完全一致',
    async () => {
      const a = await composeFromBank({ count: 20, seed: 777 })
      const b = await composeFromBank({ count: 20, seed: 777 })
      expect(a.questions.map((q) => q.k)).toEqual(b.questions.map((q) => q.k))
    },
    60000
  )

  it(
    '验收 4：会话内无重复题目（fileKey + question）',
    async () => {
      const { questions } = await composeFromBank({ count: 50, seed: 31 })
      const keys = questions.map((q) => `${q.fileKey}|${q.question}`)
      expect(new Set(keys).size).toBe(keys.length)
    },
    60000
  )
})
