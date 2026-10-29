/**
 * `reciteBank.sanitizeBank` 的归一化契约（每日背诵 T01 复核裁定；2026-10-30 方案变更后适配 ④）
 *
 * 背景：T01 交付时 `sanitizeBank` 有 6 处行为是我自己的实现决定、规格里没写。
 * team-lead 逐条复核后 5 条采纳、1 条推翻并反转优先级。本文件把**会产生行为差异**的
 * 那几条钉死，防止后人"顺手"改回去：
 *
 *  - ① `counts` **一律由篇目派生**，产物声明的值运行时**不读**（本轮唯一改码项，优先级被反转）
 *  - ② `pieces` 由本函数按 `order` **升序排好**（升格为运行时保证，T03 不再自己排）
 *  - ③ lesson 篇携带的 `trigger` 被**剥除**（运行时不留无人读取的垃圾字段；该错由 T02 构建期断言抓）
 *  - ④ **无正文的篇一律丢弃**（T02 方案变更后 `isUsablePiece` 新增的门槛：缺 `paragraphs` 的篇
 *      渲染出来是空白页且**不报错** —— 必须是硬性丢弃而不是"先收进来再说"）
 *
 * 为什么这几条值得单独立测：它们都是「静默生效」的行为 —— 错了不报错、不抛异常，
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

/**
 * 造一条可用篇目（key / fileKey / title / paragraphs 四者齐全才不会被 sanitizeBank 丢弃）。
 *
 * `paragraphs` 给**两段且字数不同**：任何只数第一段的调用方都会被用例抓出来，
 * 不让「该带几段」变成一个可以含糊的口径。
 */
function pieceOf(order, role) {
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
    paragraphs: [`用例正文 ${order}（yòng lì）`, `用例第二段 ${order}`],
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

describe('④ 无正文的篇一律丢弃（isUsablePiece 在 2026-10-30 方案变更后新增的门槛）', () => {
  it('paragraphs 缺失 / 空数组 → 该篇整条不收（不进队列，也不进分母）', () => {
    const ok = pieceOf(0, 'lesson')
    const bank = sanitizeBank(
      bankOf([
        { ...ok, key: 'chinese|f|0', title: 'A 缺 paragraphs', paragraphs: undefined },
        { ...ok, key: 'chinese|f|1', title: 'B 空数组', paragraphs: [] },
        { ...ok, key: 'chinese|f|3', title: 'D 有正文' }
      ])
    )
    expect(bank.pieces.map((p) => p.key)).toEqual(['chinese|f|3'])
    // 分母同步被排除 —— 首页不许把无正文的篇算进「已背 X / N」
    expect(bank.counts).toEqual({ all: 1, lesson: 1, review: 0 })
  })

  /**
   * ⚠️ 已知缺口 K1（**不是契约，是当前行为**，待源侧修复后本用例必须跟着改）：
   * `paragraphs: ['', '']`（数组非空、但每段都是空串）**仍然会被收**。
   * 根因在 `src/content/reciteBank.js:208` 的 `isUsablePiece`：它只判 `paragraphs.length === 0`，
   * 不判「字符串非空」，于是 `['']` / `['  ']` 能通过，页面渲染出一个真正空白的正文区。
   * 构建期同一口径：`scripts/build-recite-bank.mjs:208` 的 `emptyBodyLines` 也只数
   * `paragraphs.length > 0`，所以「无正文的篇数」那条断言同样点不出这种篇。
   * 本用例把当前行为钉住并点名修什么：源侧一旦收紧 `isUsablePiece`，这里会红 →
   * 改成「一律丢弃」即可（不要删用例）。
   */
  it('K1 缺口：paragraphs 为「全是空串」的数组时当前仍被收（渲染出空白正文，见用例注释）', () => {
    const ok = pieceOf(0, 'lesson')
    const kept = sanitizeBank(
      bankOf([{ ...ok, key: 'chinese|f|2', title: 'C 全空串', paragraphs: ['', ''] }])
    )
    expect(kept.pieces.map((p) => p.key)).toEqual(['chinese|f|2'])
    // 退化形态：`['  ']`（纯空白串）同样被收 —— 缺口同根，见上方 K1 说明
    const blank = sanitizeBank(
      bankOf([{ ...ok, key: 'chinese|f|4', title: 'E 纯空白串', paragraphs: ['  '] }])
    )
    expect(blank.pieces).toHaveLength(1)
  })

  it('退化成 0 篇时 bank 仍然可用（不返回 null），但不虚构内容', () => {
    const bank = sanitizeBank(bankOf([{ ...pieceOf(0, 'lesson'), paragraphs: [] }]))
    expect(bank).not.toBeNull()
    expect(bank.pieces).toEqual([])
    expect(bank.counts).toEqual({ all: 0, lesson: 0, review: 0 })
  })

  it('normalizePiece 的历史容错仍有效：单字符串按一段收，非数组/噪声一律空数组', () => {
    expect(normalizePiece({ ...pieceOf(0, 'lesson'), paragraphs: '整篇一段' }).paragraphs).toEqual([
      '整篇一段'
    ])
    expect(normalizePiece({ ...pieceOf(0, 'lesson'), paragraphs: '' }).paragraphs).toEqual([])
    expect(normalizePiece({ ...pieceOf(0, 'lesson'), paragraphs: 42 }).paragraphs).toEqual([])
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

  it('schemaVersion 与 contentVersion 同口径严格：字符串一律退货，不做 Number() 强转', () => {
    const ok = bankOf([pieceOf(0, 'lesson')])
    // 这条钉的是一个曾经存在的不对称：schemaVersion 走 toIndex（内部 Number(v) 会把 '1' 转成 1
    // 而放行），contentVersion 严格。两个相邻版本字段两种口径 = 后人的陷阱。
    // 字符串版本号本身就是构建期类型 bug，宽松放行等于让它无声通过。
    expect(sanitizeBank({ ...ok, schemaVersion: String(BANK_SCHEMA_VERSION) })).toBeNull()
    expect(sanitizeBank({ ...ok, schemaVersion: `${BANK_SCHEMA_VERSION}.0` })).toBeNull()
    // 真数字且等于常量 → 通过（证明上面两条不是把所有输入都拒了）
    expect(sanitizeBank({ ...ok, schemaVersion: BANK_SCHEMA_VERSION })).not.toBeNull()
  })
})
