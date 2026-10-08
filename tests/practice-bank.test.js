/**
 * 练习题库构建脚本测试（P6）
 * 覆盖：
 *  - collectBank 对真实内容库的覆盖数与 gradable 占比（验收 5.7-1：1393 题、20.5%±2%）
 *  - 每条题目来源坐标完整（fileKey / fileIndex / unitNum / 坐标键唯一）
 *  - 结构化题自动判口径：gradable === (有 options 且 correctIndex!==undefined)（验收 5.7-2 的数据面）
 *  - capText 截断纪律
 *  - 组卷验收（§5.6）：真实题库上默认组卷 100 次（N=20）与真题卷零交集（验收 1）、
 *    难度分布偏差 ≤±2（验收 2）、同 seed 重放一致（验收 3）、会话内无重复（验收 4）
 *
 * 超时放宽说明（勿删）：本文件会真实 import 全部内容页（与 content-smoke 同样的
 * Vite transform 开销），vitest 默认 5s 上限会间歇性假失败。
 */
import { describe, it, expect } from 'vitest'
import { collectBank, capText } from '../scripts/build-practice-bank.mjs'
import { composePaper } from '@/utils/composePaper'
import { normalizeBankItem, paperKeyOf } from '@/content/practiceBank'

// 当前内容基线（HEAD a79a397）的硬事实（docs/prd-mobile.md §5.1）。
// 内容库变更时这里是有意为之的回归锚点：数字变了说明题库覆盖面变了，必须有人看一眼。
const EXPECT_TOTAL = 1393
const EXPECT_EXAM_TOTAL = 104
const EXPECT_EXAM_GRADABLE = 55

let bank = null
async function getBank() {
  if (!bank) bank = await collectBank()
  return bank
}

describe('capText 截断纪律', () => {
  it('未超限原样返回，超限截断并标真', () => {
    expect(capText('abc', 5)).toEqual({ text: 'abc', truncated: false })
    const r = capText('abcdef', 5)
    expect(r.truncated).toBe(true)
    expect(r.text).toBe('abcde')
  })
})

describe('题库覆盖与形状（验收 5.7-1）', () => {
  it(
    '三学科合计覆盖 1393 题，gradable 占比 20.5%±2%',
    async () => {
      const { shards } = await getBank()
      const lists = Object.values(shards)
      const total = lists.reduce((s, l) => s + l.length, 0)
      const gradable = lists.reduce((s, l) => s + l.filter((it) => it.g).length, 0)
      expect(total).toBe(EXPECT_TOTAL)
      const ratio = gradable / total
      expect(ratio).toBeGreaterThan(0.185)
      expect(ratio).toBeLessThan(0.225)
    },
    60000
  )

  it(
    'exam 区块仅 4 个纯 exam 文件共 104 题，其中 55 题可自动判',
    async () => {
      const { shards } = await getBank()
      const examItems = Object.values(shards)
        .flat()
        .filter((it) => it.sr === 'exam')
      expect(examItems).toHaveLength(EXPECT_EXAM_TOTAL)
      expect(examItems.filter((it) => it.g)).toHaveLength(EXPECT_EXAM_GRADABLE)
      // 真题卷应聚成 4 套（4 个纯 exam 文件）
      expect(new Set(examItems.map((it) => it.fk)).size).toBe(4)
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
          const expected =
            Array.isArray(it.o) && it.o.length > 0 && it.ci !== undefined
          expect(it.g).toBe(expected)
          // 可判题必须带正确答案索引（验收 5.7-2：自动判与 correctIndex 100% 一致的数据前提）
          if (it.g) expect(it.ci).toBeGreaterThanOrEqual(0)
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
    return Object.values(shards).flat().map(normalizeBankItem)
  }

  const composeFromBank = async (opt) => composePaper(await bankItems(), opt)

  it(
    '验收 1：默认配置连续组卷 100 次（N=20）与 104 道真题卷题零交集',
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
