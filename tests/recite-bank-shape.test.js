/**
 * `reciteBank.sanitizeBank` 的三条归一化契约（每日背诵 T01 复核裁定）
 *
 * 背景：T01 交付时 `sanitizeBank` 有 6 处行为是我自己的实现决定、规格里没写。
 * team-lead 逐条复核后 5 条采纳、1 条推翻并反转优先级。本文件把**会产生行为差异**的
 * 那三条钉死，防止后人"顺手"改回去：
 *
 *  - ① `counts` **一律由篇目派生**，产物声明的值运行时**不读**（本轮唯一改码项，优先级被反转）
 *  - ② `pieces` 由本函数按 `order` **升序排好**（升格为运行时保证，T03 不再自己排）
 *  - ③ lesson 篇携带的 `trigger` 被**剥除**（运行时不留无人读取的垃圾字段；该错由 T02 构建期断言抓）
 *
 * 为什么这三条值得单独立测：它们都是「静默生效」的行为 —— 错了不报错、不抛异常，
 * 只会在首页显示错的分母、错的队列顺序，或让下一个人误以为 lesson 也认 `trigger`。
 *
 * ⚠️ 本文件**不加** `@vitest-environment jsdom`：`reciteBank.js` 零 import、纯数据形状，
 *    必须能在裸 Node 下被 `scripts/build-recite-bank.mjs`（T02）直接 import。
 */
import { describe, it, expect } from 'vitest'
import {
  sanitizeBank,
  deriveCounts,
  normalizePiece,
  BANK_SCHEMA_VERSION,
  RECITE_BANK_PATH
} from '@/content/reciteBank'

/** 产物根的最小合法外壳（schemaVersion / contentVersion 是「不可用即 null」的两道关） */
function bankOf(pieces, extra) {
  return {
    schemaVersion: BANK_SCHEMA_VERSION,
    contentVersion: 4,
    generatedAt: '2026-10-26T00:00:00.000Z',
    subject: 'chinese',
    ...(extra || {}),
    pieces
  }
}

/** 造一条可用篇目（key / fileKey / title 三者齐全才不会被 sanitizeBank 丢弃） */
function pieceOf(order, role) {
  const isReview = role === 'review'
  return {
    key: `chinese|chinese_07_case_${order}|0`,
    order,
    role: role || 'lesson',
    unitNum: '07',
    fileIndex: order,
    blockIndex: 0,
    fileKey: `chinese_07_case_${order}`,
    fileTitle: `用例页 ${order}`,
    unitTitle: '默写专项',
    title: `用例篇 ${order}`,
    mode: 'input',
    sentenceCount: 2,
    blankCount: isReview ? 8 : 2,
    strictCount: 0,
    fp: '0abc123'
  }
}

describe('① counts 一律派生：产物声明的值运行时被忽略', () => {
  it('声明 lesson:999 / all:999 / review:0（全错），仍以篇目派生为准 67 / 6 / 73', () => {
    // 形状对齐真实产物：67 lesson + 6 review = 73
    const pieces = []
    for (let i = 0; i < 67; i += 1) pieces.push(pieceOf(i, 'lesson'))
    for (let i = 0; i < 6; i += 1) pieces.push(pieceOf(67 + i, 'review'))

    const bank = sanitizeBank(
      bankOf(pieces, { counts: { all: 999, lesson: 999, review: 0 } }) // 声明值故意全错
    )

    expect(bank).not.toBeNull()
    expect(bank.pieces).toHaveLength(73)
    // 声明值被彻底忽略：分母必须是真实派生值，否则首页会显示「已背 3 / 999」
    expect(bank.counts).toEqual({ all: 73, lesson: 67, review: 6 })
    // 与 deriveCounts 逐键相等（唯一真相源就是它）
    expect(bank.counts).toEqual(deriveCounts(bank.pieces))
  })

  it('完全没有声明 counts 时同样是派生值（声明值不是必需品）', () => {
    const bank = sanitizeBank(bankOf([pieceOf(0, 'lesson'), pieceOf(1, 'review')]))
    expect(bank.counts).toEqual({ all: 2, lesson: 1, review: 1 })
  })

  it('声明值正确也不"顺手"采信 —— 走的是同一条派生路径，与声明无关', () => {
    const pieces = [pieceOf(0, 'lesson'), pieceOf(1, 'lesson'), pieceOf(2, 'review')]
    const declaredRight = sanitizeBank(
      bankOf(pieces, { counts: { all: 3, lesson: 2, review: 1 } })
    )
    const declaredWrong = sanitizeBank(
      bankOf(pieces, { counts: { all: 1, lesson: 1, review: 1 } })
    )
    expect(declaredRight.counts).toEqual(declaredWrong.counts)
    expect(declaredRight.counts).toEqual({ all: 3, lesson: 2, review: 1 })
  })
})

describe('② pieces 由 sanitizeBank 按 order 升序排好（运行时保证，下游不再自己排）', () => {
  it('乱序输入（倒序 + 中途插入）→ 输出 order 严格递增 0..5', () => {
    const shuffled = [
      pieceOf(5, 'lesson'),
      pieceOf(2, 'lesson'),
      pieceOf(0, 'lesson'),
      pieceOf(4, 'review'),
      pieceOf(1, 'lesson'),
      pieceOf(3, 'lesson')
    ]
    const bank = sanitizeBank(bankOf(shuffled))
    expect(bank.pieces.map((p) => p.order)).toEqual([0, 1, 2, 3, 4, 5])
    // 内容没有被打乱：order 与 title 仍然配对
    expect(bank.pieces.map((p) => p.title)).toEqual([
      '用例篇 0',
      '用例篇 1',
      '用例篇 2',
      '用例篇 3',
      '用例篇 4',
      '用例篇 5'
    ])
  })

  it('同等 order 保持产物原序（稳定排序，不靠运气）', () => {
    const sameOrder = [pieceOf(0, 'lesson'), pieceOf(0, 'lesson'), pieceOf(0, 'review')]
    sameOrder[0].title = '首'
    sameOrder[1].title = '次'
    sameOrder[2].title = '末'
    const bank = sanitizeBank(bankOf(sameOrder))
    expect(bank.pieces.map((p) => p.title)).toEqual(['首', '次', '末'])
  })
})

describe('③ lesson 篇的 trigger 被剥除，review 篇保留', () => {
  it('lesson 篇携带 trigger:"all" → 归一化后不含该字段', () => {
    const lessonWithTrigger = pieceOf(0, 'lesson')
    lessonWithTrigger.trigger = 'all' // 构建期笔误的典型形态
    const bank = sanitizeBank(bankOf([lessonWithTrigger]))
    expect(bank.pieces).toHaveLength(1)
    // 运行时对象里不留无人读取的垃圾字段（否则下一个人会以为 lesson 也认 trigger）
    expect('trigger' in bank.pieces[0]).toBe(false)
    // 剥除不影响其它字段
    expect(bank.pieces[0].role).toBe('lesson')
    expect(bank.pieces[0].title).toBe('用例篇 0')
  })

  it('review 篇的 trigger 保留："all" 原样、"file" 原样、缺失默认 file', () => {
    const all = pieceOf(0, 'review')
    all.trigger = 'all'
    const file = pieceOf(1, 'review')
    file.trigger = 'file'
    const missing = pieceOf(2, 'review') // 没有 trigger 字段

    const bank = sanitizeBank(bankOf([all, file, missing]))
    expect(bank.pieces.map((p) => p.trigger)).toEqual(['all', 'file', 'file'])
  })

  it('normalizePiece 单测：lesson 剥除 / review 补默认，与 sanitizeBank 同口径', () => {
    const lesson = normalizePiece({ ...pieceOf(0, 'lesson'), trigger: 'all' })
    expect('trigger' in lesson).toBe(false)
    expect(normalizePiece(pieceOf(9, 'review')).trigger).toBe('file')
    expect(normalizePiece({ ...pieceOf(9, 'review'), trigger: '乱写' }).trigger).toBe('file')
  })
})

describe('形状常量（顺带锚定，防止后人改路径造成双份真相）', () => {
  it('RECITE_BANK_PATH 是唯一路径常量，且由目录名 + 文件名组成', () => {
    expect(RECITE_BANK_PATH).toBe('recite-bank/chinese.json')
  })

  it('schemaVersion 不匹配 / contentVersion 非有限数字 / pieces 非数组 → 整份退货（null）', () => {
    const ok = bankOf([pieceOf(0, 'lesson')])
    expect(sanitizeBank({ ...ok, schemaVersion: BANK_SCHEMA_VERSION + 1 })).toBeNull()
    expect(sanitizeBank({ ...ok, schemaVersion: 0 })).toBeNull()
    expect(sanitizeBank({ ...ok, contentVersion: undefined })).toBeNull()
    // contentVersion 不做字符串强转：'4' 判为不可用（版本比较键必须是真数字）
    expect(sanitizeBank({ ...ok, contentVersion: '4' })).toBeNull()
    expect(sanitizeBank({ ...ok, pieces: {} })).toBeNull()
    expect(sanitizeBank(ok)).not.toBeNull()
  })
})
