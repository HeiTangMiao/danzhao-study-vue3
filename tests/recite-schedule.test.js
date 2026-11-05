/**
 * recite-schedule —— 每日背诵**调度纯函数**单测（T03 主验收）
 *
 * 覆盖 PRD / 设计 §5 T03 列出的全部构造：
 *  - A4  档位推进：通过第 1/2/3/4/5 档后 nextDate 依次 +1/+1/+2/+3/+8；第 5 档再全对 → 毕业（null）
 *  - A4' 任意档位答错 → stage=0 且 nextDate=today+1，但 learnedAt 不被清
 *  - A5  4 篇到期 → 不推新篇（suppressedNew）；8 篇到期 → due 截断 5、remainingDueCount 3
 *  - A6  断更 3 天后仍只给 1 篇新篇，且 order 不跳
 *  - A7  deriveStats().learned 只增不减（答错归零 stage 也不减）
 *  - P0-7 文件正课全 stage>=1 → 恰好推 1 行该文件复习篇；重复调用幂等
 *  - reconcile 三情形：fp 一致不动 / 改错别字只更 fp / blockIndex 后移按 fp 认领 / 两边都不上→orphaned
 *  - bumpStreak（Q6：无任务日不判负不推进；当日幂等；断更归 1）
 *  - reciteBankClient 双源 SWR 的 5 个场景（mock fetchJson，不读盘产物）
 *
 * ⚠️ 额外两组「镜像对拍」用例：`useReciteSchedule.js` 为了**零 import、裸 Node 可单测**，
 *    镜像了 `getDateStr` 与 `subjectOfPiece`。对拍用例保证两侧永不漂移（文件头有说明）。
 *
 * ⚠️ 本文件**不依赖** `public/recite-bank/chinese.json` 是否已产出（T02 并行）：
 *    客户端用例一律 mock `fetchJson`。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 双源客户端用例需要把「远程基址」与「取数」都换成可控 mock（不发真实网络）
vi.mock('@/utils/fetchJson', () => ({ fetchJson: vi.fn(), DEFAULT_TIMEOUT_MS: 8000 }))
vi.mock('@/utils/assetBase', () => ({ siteRoot: vi.fn(() => './') }))

import {
  CUMULATIVE_DAYS,
  STAGE_DELTA,
  MAX_STAGE,
  DAILY_DUE_LIMIT,
  NEW_SUPPRESS_AT,
  DAILY_NEW_LIMIT,
  MAINTENANCE_DAYS,
  MAINTENANCE_DAILY_LIMIT,
  EMPTY_RECITE_STATE,
  STATE_KEY,
  getDateStr,
  addDays,
  subjectKeyOf,
  applyResult,
  isDue,
  maintenanceDueDateOf,
  isMaintenanceDue,
  buildQueue,
  syncReviewTriggers,
  reconcile,
  deriveStats,
  bumpStreak,
  overdueDays
} from '@/composables/useReciteSchedule'
import { getDateStr as spacedGetDateStr } from '@/composables/useSpacedReview'
import { subjectOfPiece, PIECE_ROLE, PIECE_TRIGGER } from '@/content/reciteBank'
import { fetchJson } from '@/utils/fetchJson'
import { siteRoot } from '@/utils/assetBase'
import {
  loadBundled,
  refreshFromRemote,
  getCachedBank,
  resetReciteBankCache
} from '@/utils/reciteBankClient'

// ───────────────────────────────── fixture ─────────────────────────────────

const TODAY = '2026-10-26'
const FILE_A = 'chinese_07_01-先秦至魏晋名篇'
const FILE_B = 'chinese_07_02-唐诗名篇（上）'

/**
 * 造一篇产物条目（形状同 `sanitizeBank` 规范化后的结果，可直接喂纯函数）
 * @param {number} blockIndex 页内 cloze 流水号
 * @param {object} [opt] 覆盖项
 */
function mkPiece(blockIndex, opt = {}) {
  const fileKey = opt.fileKey || FILE_A
  const role = opt.role || PIECE_ROLE.LESSON
  const piece = {
    key: `chinese|${fileKey}|${blockIndex}`,
    order: opt.order === undefined ? blockIndex : opt.order,
    role,
    unitNum: '07',
    fileIndex: 0,
    blockIndex,
    fileKey,
    fileTitle: '默写专项',
    unitTitle: '默写专项',
    title: opt.title || `篇目-${fileKey}-${blockIndex}`,
    mode: 'input',
    sentenceCount: 1,
    blankCount: 2,
    strictCount: 0,
    fp: opt.fp || `fp-${fileKey}-${blockIndex}`
  }
  if (role === PIECE_ROLE.REVIEW) piece.trigger = opt.trigger || PIECE_TRIGGER.FILE
  return piece
}

/**
 * 造一条 recite_progress 行
 * @param {object} piece 篇目
 * @param {object} [opt] 覆盖项
 */
function mkRow(piece, opt = {}) {
  return {
    key: piece.key,
    subject: 'chinese',
    fileKey: piece.fileKey,
    blockIndex: piece.blockIndex,
    pieceTitle: piece.title,
    fp: piece.fp,
    stage: opt.stage === undefined ? 0 : opt.stage,
    nextDate: opt.nextDate === undefined ? TODAY : opt.nextDate,
    lastCorrect: opt.lastCorrect === undefined ? true : opt.lastCorrect,
    lastAt: opt.lastAt === undefined ? 1759000000000 : opt.lastAt,
    doneCount: opt.doneCount === undefined ? 1 : opt.doneCount,
    learnedAt: opt.learnedAt === undefined ? null : opt.learnedAt,
    createdAt: 1759000000000,
    deleted: opt.deleted === true
  }
}

// ─────────────────────────── 0. 常量与镜像对拍 ───────────────────────────

describe('调度常量（设计 §3.5 唯一真相源）', () => {
  it('STAGE_DELTA 由 CUMULATIVE_DAYS 派生 = [1,1,2,3,8]，不是手写第二份', () => {
    expect(CUMULATIVE_DAYS).toEqual([1, 2, 4, 7, 15])
    expect(STAGE_DELTA).toEqual([1, 1, 2, 3, 8])
    // 派生关系（H7）：diff([0, ...CUMULATIVE]) 必须与导出的 STAGE_DELTA 恒等
    const derived = [0, ...CUMULATIVE_DAYS].slice(1).map((v, i) => v - [0, ...CUMULATIVE_DAYS][i])
    expect(STAGE_DELTA).toEqual(derived)
  })

  it('单日上限 / 抑制阈值 / 新篇数 / 最高档位与设计一致', () => {
    expect(MAX_STAGE).toBe(5)
    expect(DAILY_DUE_LIMIT).toBe(5)
    expect(NEW_SUPPRESS_AT).toBe(3)
    expect(DAILY_NEW_LIMIT).toBe(1)
    expect(STATE_KEY).toBe('main')
    expect(EMPTY_RECITE_STATE).toEqual({
      key: 'main',
      streak: 0,
      maxStreak: 0,
      lastActiveDate: '',
      examDate: '',
      sessionPieceKey: '',
      sessionDate: '',
      sessionStartedAt: 0
    })
  })
})

describe('镜像对拍（零 import 的代价，用测试钉死）', () => {
  it('getDateStr 与 useSpacedReview 导出的同款实现逐日一致（本地时区，不用 UTC）', () => {
    const samples = [
      new Date(2026, 0, 1),
      new Date(2026, 9, 26),
      new Date(2026, 9, 26, 23, 59, 59),
      new Date(2026, 11, 31),
      new Date(2024, 1, 29) // 闰日
    ]
    for (const d of samples) {
      expect(getDateStr(d)).toBe(spacedGetDateStr(d))
    }
    expect(getDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('addDays 跨月 / 跨年 / 负数正确（es2019 安全，不依赖 Date 之外的库）', () => {
    expect(addDays('2026-10-26', 1)).toBe('2026-10-27')
    expect(addDays('2026-10-26', 8)).toBe('2026-11-03')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
  })

  it('subjectKeyOf 与 reciteBank.subjectOfPiece 逐例一致（禁手拆键的等价实现）', () => {
    const samples = [
      mkPiece(0),
      mkPiece(3, { fileKey: FILE_B }),
      { key: 'chinese|a|0' },
      { key: '' },
      { key: '|x|0' },
      null
    ]
    for (const p of samples) {
      expect(subjectKeyOf(p)).toBe(subjectOfPiece(p))
    }
    expect(subjectKeyOf(mkPiece(0))).toBe('chinese')
  })

  it('role / trigger 字面量与 reciteBank 常量一致（review 篇不进新篇池，all 触发认全库）', () => {
    expect(PIECE_ROLE.REVIEW).toBe('review')
    expect(PIECE_TRIGGER.ALL).toBe('all')
    const lesson = mkPiece(0)
    const review = mkPiece(1, { role: PIECE_ROLE.REVIEW, trigger: PIECE_TRIGGER.ALL })
    const q = buildQueue({ pieces: [lesson, review], rows: [], today: TODAY, opts: { newLimit: 5 } })
    expect(q.fresh.map((p) => p.key)).toEqual([lesson.key])
    // 'all' 触发：全库 lesson 都 stage>=1 才推
    const rows = [mkRow(lesson, { stage: 1, nextDate: '2026-11-01' })]
    const created = syncReviewTriggers({ pieces: [lesson, review], rows, today: TODAY })
    expect(created.map((r) => r.key)).toEqual([review.key])
  })
})

// ──────────────────────────────── A4 ────────────────────────────────

describe('A4 · 档位推进与毕业', () => {
  it('通过第 1/2/3/4/5 档后 nextDate 依次 +1/+1/+2/+3/+8；第 5 档再全对 → nextDate=null', () => {
    const piece = mkPiece(0)
    const timeline = []
    let row = null
    for (let i = 0; i < MAX_STAGE; i++) {
      row = applyResult({ prevRow: row, piece, allCorrect: true, today: TODAY })
      timeline.push({ stage: row.stage, nextDate: row.nextDate })
    }
    expect(timeline).toEqual([
      { stage: 1, nextDate: '2026-10-27' }, // +1
      { stage: 2, nextDate: '2026-10-27' }, // +1
      { stage: 3, nextDate: '2026-10-28' }, // +2
      { stage: 4, nextDate: '2026-10-29' }, // +3
      { stage: 5, nextDate: '2026-11-03' } // +8  → 第 15 天那次复习（CUMULATIVE_DAYS 的最末档）
    ])

    // 已到最高档、且第 15 天那次复习再次全对 → 毕业（永不进队列）
    const graduated = applyResult({ prevRow: row, piece, allCorrect: true, today: '2026-11-03' })
    expect(graduated.stage).toBe(MAX_STAGE)
    expect(graduated.nextDate).toBeNull()
    expect(isDue(graduated, '2027-12-31')).toBe(false) // 毕业行永不到期
  })

  it('每次全对 doneCount+1、lastAt 前进、fp 沿用旧行（指纹写权归 reconcile）', () => {
    const piece = mkPiece(2)
    const prev = mkRow(piece, { stage: 1, nextDate: TODAY, doneCount: 4 })
    const next = applyResult({ prevRow: prev, piece, allCorrect: true, today: TODAY })
    expect(next.doneCount).toBe(5)
    expect(next.lastCorrect).toBe(true)
    expect(next.lastAt).toBeGreaterThan(0)
    expect(next.fp).toBe(prev.fp)
    expect(next.createdAt).toBe(prev.createdAt) // 创建时间不被重置
    expect(next.deleted).toBe(false)
    expect(next.subject).toBe('chinese')
  })
})

// ──────────────────────────────── A4' ────────────────────────────────

describe("A4' · 答错打回（stage 归零，learnedAt 只增不撤）", () => {
  it('任意档位答错 → stage=0 且 nextDate=today+1，learnedAt 原样', () => {
    const piece = mkPiece(1)
    for (const stage of [0, 1, 2, 3, 4, 5]) {
      const prevRow = mkRow(piece, {
        stage,
        nextDate: TODAY,
        learnedAt: '2026-10-01',
        doneCount: 7
      })
      const next = applyResult({ prevRow, piece, allCorrect: false, today: TODAY })
      expect(next.stage).toBe(0)
      expect(next.nextDate).toBe('2026-10-27')
      expect(next.learnedAt).toBe('2026-10-01')
      expect(next.doneCount).toBe(8)
      expect(next.lastCorrect).toBe(false)
    }
  })

  it('从未背对过的篇答错 → learnedAt 保持 null（不写假成就）', () => {
    const piece = mkPiece(1)
    const next = applyResult({ prevRow: null, piece, allCorrect: false, today: TODAY })
    expect(next.stage).toBe(0)
    expect(next.learnedAt).toBeNull()
    expect(next.nextDate).toBe('2026-10-27')
    expect(next.doneCount).toBe(1)
    expect(next.key).toBe(piece.key)
  })

  it('答错后再全对 → learnedAt 首次写入当天，之后再答错也不撤销', () => {
    const piece = mkPiece(4)
    const first = applyResult({ prevRow: null, piece, allCorrect: true, today: '2026-10-20' })
    expect(first.learnedAt).toBe('2026-10-20')
    const wrong = applyResult({ prevRow: first, piece, allCorrect: false, today: TODAY })
    expect(wrong.learnedAt).toBe('2026-10-20')
    expect(wrong.stage).toBe(0)
  })
})

// ──────────────────────────────── A5 ────────────────────────────────

describe('A5 · 到期抑制新篇 + 单日重默上限', () => {
  it('4 篇到期 → fresh 为空且 suppressedNew=true', () => {
    const pieces = []
    for (let i = 0; i < 10; i++) pieces.push(mkPiece(i))
    const rows = [0, 1, 2, 3].map((i) => mkRow(pieces[i], { stage: 1, nextDate: '2026-10-20' }))

    const q = buildQueue({ pieces, rows, today: TODAY })
    expect(q.dueCount).toBe(4)
    expect(q.due).toHaveLength(4)
    expect(q.fresh).toEqual([])
    expect(q.suppressedNew).toBe(true)
    expect(q.remainingDueCount).toBe(0)
  })

  it('8 篇到期 → due 截断到 5、remainingDueCount=3、仍不推新篇', () => {
    const pieces = []
    for (let i = 0; i < 12; i++) pieces.push(mkPiece(i))
    const rows = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
      mkRow(pieces[i], { stage: 1, nextDate: '2026-10-20' })
    )

    const q = buildQueue({ pieces, rows, today: TODAY })
    expect(q.dueCount).toBe(8)
    expect(q.due).toHaveLength(DAILY_DUE_LIMIT)
    expect(q.due).toHaveLength(5)
    expect(q.remainingDueCount).toBe(3)
    expect(q.suppressedNew).toBe(true)
    expect(q.fresh).toEqual([])
  })

  it('到期 2 篇（< 阈值）→ 正常给 1 篇新篇；逾期最久的排在 due 最前', () => {
    const pieces = []
    for (let i = 0; i < 5; i++) pieces.push(mkPiece(i))
    const rows = [
      mkRow(pieces[0], { stage: 1, nextDate: '2026-10-24' }),
      mkRow(pieces[1], { stage: 2, nextDate: '2026-10-18' })
    ]
    const q = buildQueue({ pieces, rows, today: TODAY })
    expect(q.dueCount).toBe(2)
    expect(q.suppressedNew).toBe(false)
    expect(q.due.map((d) => d.row.key)).toEqual([pieces[1].key, pieces[0].key])
    expect(q.fresh).toHaveLength(1)
    expect(q.fresh[0].key).toBe(pieces[2].key) // 前两篇已有行 → 新篇从第 3 篇起
    expect(q.due[0].piece.key).toBe(pieces[1].key) // due 项同时带 piece 与 row
  })

  it('复习篇有行也计入到期（重默不分正课/复习），但无行时绝不进新篇池', () => {
    const lesson = mkPiece(0)
    const review = mkPiece(1, { role: PIECE_ROLE.REVIEW })
    const rows = [mkRow(review, { stage: 1, nextDate: '2026-10-20' })]
    const q = buildQueue({ pieces: [lesson, review], rows, today: TODAY })
    expect(q.dueCount).toBe(1)
    expect(q.due[0].piece.key).toBe(review.key)
    expect(q.fresh.map((p) => p.key)).toEqual([lesson.key])
  })

  it('isDue：缺排期视为到期、毕业（null）永不到期、软删行不到期、未来排期不到期', () => {
    const piece = mkPiece(0)
    const base = mkRow(piece)
    // 缺排期（字段缺失 / 空串）= 遗留或半写行 → 一律视为到期
    expect(isDue({ ...base, nextDate: undefined }, TODAY)).toBe(true)
    expect(isDue({ ...base, nextDate: '' }, TODAY)).toBe(true)
    expect(isDue(mkRow(piece, { nextDate: null, stage: MAX_STAGE }), TODAY)).toBe(false)
    expect(isDue(mkRow(piece, { nextDate: '2026-10-27' }), TODAY)).toBe(false)
    expect(isDue(mkRow(piece, { nextDate: TODAY }), TODAY)).toBe(true) // 当天即到期
    expect(isDue(mkRow(piece, { nextDate: '2026-10-01', deleted: true }), TODAY)).toBe(false)
    expect(isDue(null, TODAY)).toBe(false)
  })
})

// ──────────────────────────────── A6 ────────────────────────────────

describe('A6 · 断更 3 天后仍只给 1 篇新篇、order 不跳', () => {
  it('4 篇有行（各自未到期）、第 5 篇无行 → 今日恰好 1 篇新篇且 order=4（不跳到后面的）', () => {
    const pieces = []
    for (let i = 0; i < 6; i++) pieces.push(mkPiece(i))
    // 3 天前「该给第 5 篇」，但学员 3 天没打开 —— 已背的 4 篇排期被顺延到明天之后
    const rows = [0, 1, 2, 3].map((i) =>
      mkRow(pieces[i], { stage: 1, nextDate: '2026-10-30', learnedAt: '2026-10-22' })
    )

    const q = buildQueue({ pieces, rows, today: TODAY })
    expect(q.due).toEqual([])
    expect(q.suppressedNew).toBe(false)
    expect(q.fresh).toHaveLength(1)
    expect(q.fresh[0].order).toBe(4) // 第 5 篇，连续、不跳
    expect(q.newCount).toBe(2) // 还剩 2 篇无行的（第 5、6 篇），今天只发 1 篇
  })
})

// ──────────────────────────────── A7 ────────────────────────────────

describe('A7 · 「已背」只增不减（learnedAt 与 stage 解耦）', () => {
  it('learned = learnedAt 非空的 lesson 篇数；答错把 stage 归零后 learned 不减少', () => {
    const pieces = [mkPiece(0), mkPiece(1), mkPiece(2)]
    const review = mkPiece(3, { role: PIECE_ROLE.REVIEW })
    let rows = [
      mkRow(pieces[0], { stage: 2, nextDate: '2026-11-01', learnedAt: '2026-10-20' }),
      mkRow(pieces[1], { stage: 1, nextDate: '2026-10-30', learnedAt: '2026-10-21' }),
      // 复习篇即使背过也不计入「已背 X / 67」的分子（分母只有 lesson 篇）
      mkRow(review, { stage: 1, nextDate: '2026-10-30', learnedAt: '2026-10-22' })
    ]
    const all = [...pieces, review]

    const before = deriveStats({ pieces: all, rows, state: null, today: TODAY })
    expect(before.learned).toBe(2)
    expect(before.totalLesson).toBe(3)
    expect(before.streak).toBe(0)
    expect(before.dueCount).toBe(0)

    // 第 2 篇答错 → stage 归 0，但 learnedAt 不动
    const reverted = applyResult({ prevRow: rows[1], piece: pieces[1], allCorrect: false, today: TODAY })
    expect(reverted.stage).toBe(0)
    rows = [rows[0], reverted, rows[2]]

    const after = deriveStats({ pieces: all, rows, state: { streak: 7 }, today: TODAY })
    expect(after.learned).toBe(2) // ★ 进度条不倒退
    expect(after.streak).toBe(7)
    expect(after.dueCount).toBe(0) // 被打回的那篇排期是 today+1 → 今日未到期
  })

  it('软删行不计入 learned / dueCount', () => {
    const piece = mkPiece(0)
    const rows = [mkRow(piece, { stage: 3, nextDate: '2026-10-01', learnedAt: '2026-09-01', deleted: true })]
    const stats = deriveStats({ pieces: [piece], rows, today: TODAY })
    expect(stats.learned).toBe(0)
    expect(stats.dueCount).toBe(0)
  })
})

// ──────────────────────────────── P0-7 ────────────────────────────────

describe('P0-7 · 复习篇条件触发（文件级 / 整轮）', () => {
  it('文件 01 的 lesson 全 stage>=1 → 恰好返回 1 行该文件复习篇（nextDate=today+1）；重复调用返回空', () => {
    const lessonsA = [mkPiece(0), mkPiece(1), mkPiece(2)]
    const reviewA = mkPiece(3, { role: PIECE_ROLE.REVIEW, trigger: PIECE_TRIGGER.FILE })
    const lessonB = mkPiece(0, { fileKey: FILE_B, order: 10 })
    const reviewB = mkPiece(1, { fileKey: FILE_B, order: 11, role: PIECE_ROLE.REVIEW })
    const pieces = [...lessonsA, reviewA, lessonB, reviewB]
    const rows = lessonsA.map((p) => mkRow(p, { stage: 1, nextDate: '2026-11-01', learnedAt: '2026-10-20' }))

    const created = syncReviewTriggers({ pieces, rows, today: TODAY })
    expect(created).toHaveLength(1)
    expect(created[0].key).toBe(reviewA.key)
    expect(created[0].nextDate).toBe('2026-10-27') // today+1
    expect(created[0].stage).toBe(0)
    expect(created[0].learnedAt).toBeNull()
    expect(created[0].subject).toBe('chinese')
    expect(created[0].fileKey).toBe(FILE_A)
    expect(created[0].fp).toBe(reviewA.fp)
    expect(created[0].deleted).toBe(false)

    // 幂等：把新行写回后再算一次 → 空
    expect(syncReviewTriggers({ pieces, rows: [...rows, created[0]], today: TODAY })).toEqual([])
  })

  it('文件内还有一篇 lesson 未背（无行）→ 不触发该文件复习篇', () => {
    const lessons = [mkPiece(0), mkPiece(1)]
    const review = mkPiece(2, { role: PIECE_ROLE.REVIEW })
    const rows = [mkRow(lessons[0], { stage: 1, nextDate: '2026-11-01' })] // 第 2 篇没有行
    expect(syncReviewTriggers({ pieces: [...lessons, review], rows, today: TODAY })).toEqual([])
  })

  it('trigger=all（综合大冲关）→ 只认「全库 lesson 全通过」', () => {
    const a = mkPiece(0)
    const b = mkPiece(0, { fileKey: FILE_B, order: 5 })
    const reviewAll = mkPiece(1, { fileKey: FILE_B, order: 6, role: PIECE_ROLE.REVIEW, trigger: PIECE_TRIGGER.ALL })
    const pieces = [a, b, reviewAll]

    const partial = [mkRow(a, { stage: 1, nextDate: '2026-11-01' })]
    expect(syncReviewTriggers({ pieces, rows: partial, today: TODAY })).toEqual([])

    const full = [mkRow(a, { stage: 1, nextDate: '2026-11-01' }), mkRow(b, { stage: 2, nextDate: '2026-11-01' })]
    const created = syncReviewTriggers({ pieces, rows: full, today: TODAY })
    expect(created.map((r) => r.key)).toEqual([reviewAll.key])
  })
})

// ──────────────────────────────── reconcile ────────────────────────────────

describe('reconcile · 内容指纹自动迁移（设计 §3.2 三情形）', () => {
  it('fp 一致 → 完全不动（migrated / orphaned 皆空）', () => {
    const piece = mkPiece(0)
    const row = mkRow(piece, { stage: 3, learnedAt: '2026-10-01' })
    const r = reconcile({ pieces: [piece], rows: [row] })
    expect(r.migrated).toEqual([])
    expect(r.orphaned).toEqual([])
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]).toEqual(row)
  })

  it('改一个错别字（fp 变、key 不变）→ 只更新 fp，stage / learnedAt / doneCount 原样', () => {
    const oldPiece = mkPiece(0, { fp: 'fp-old' })
    const row = mkRow(oldPiece, { stage: 4, learnedAt: '2026-10-01', doneCount: 9, nextDate: '2026-10-29' })
    const newPiece = mkPiece(0, { fp: 'fp-new' }) // 同 key、内容微调（title/text 改字）

    const r = reconcile({ pieces: [newPiece], rows: [row] })
    expect(r.orphaned).toEqual([])
    expect(r.migrated).toHaveLength(1)
    const updated = r.migrated[0]
    expect(updated.key).toBe(row.key)
    expect(updated.fp).toBe('fp-new')
    expect(updated.stage).toBe(4)
    expect(updated.learnedAt).toBe('2026-10-01')
    expect(updated.doneCount).toBe(9)
    expect(updated.nextDate).toBe('2026-10-29')
    expect(r.rows).toHaveLength(1) // 没有墓碑（没搬家）
  })

  it('blockIndex 整体后移一位 → 按 fp 成功认领到新 key，旧行留墓碑', () => {
    const oldPiece = mkPiece(0, { fp: 'fp-a' })
    const row = mkRow(oldPiece, {
      stage: 3,
      learnedAt: '2026-10-10',
      doneCount: 5,
      nextDate: '2026-11-02'
    })
    // 内容侧在文件最前面插入了一篇 → 原第 0 篇变第 1 篇（key 变、fp 不变）
    const inserted = mkPiece(0, { fp: 'fp-brand-new', title: '新插入的篇' })
    const shifted = mkPiece(1, { fp: 'fp-a', title: oldPiece.title })

    const r = reconcile({ pieces: [inserted, shifted], rows: [row] })
    expect(r.orphaned).toEqual([])
    expect(r.migrated).toHaveLength(2) // 1 个墓碑 + 1 个搬迁后的行

    const tomb = r.migrated.find((x) => x.deleted === true)
    const moved = r.migrated.find((x) => x.deleted !== true)
    expect(tomb.key).toBe(row.key) // 旧 key 留墓碑（不物理删）
    expect(moved.key).toBe(shifted.key) // ★ 按 fp 认领到新 key
    expect(moved.stage).toBe(3)
    expect(moved.learnedAt).toBe('2026-10-10')
    expect(moved.doneCount).toBe(5)
    expect(moved.nextDate).toBe('2026-11-02')
    expect(moved.fp).toBe('fp-a')
    expect(moved.blockIndex).toBe(1)
  })

  it('两边都对不上（篇已删、fp 也无人认领）→ orphaned 点名且保留原行不删', () => {
    const gonePiece = mkPiece(7, { fileKey: 'chinese_07_99-已删除的文件', fp: 'fp-gone' })
    const row = mkRow(gonePiece, { stage: 2, learnedAt: '2026-09-09' })
    const unrelated = mkPiece(0, { fp: 'fp-other' })

    const r = reconcile({ pieces: [unrelated], rows: [row] })
    expect(r.migrated).toEqual([])
    expect(r.orphaned).toHaveLength(1)
    expect(r.orphaned[0].key).toBe(row.key)
    expect(r.orphaned[0].pieceTitle).toBe(row.pieceTitle)
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]).toEqual(row) // 原行原样保留（§7.4：不许删数据）
  })

  it('已被别的活行占住的 key 不会被抢（两个旧行争同一个新 key → 先到先得，另一个留 orphan 由调用方处理）', () => {
    const p0 = mkPiece(0, { fp: 'fp-0' })
    const p1 = mkPiece(1, { fp: 'fp-1' })
    const row0 = mkRow(p0, { stage: 1 })
    const row1 = mkRow(p1, { stage: 2 })
    // 只把第 1 篇的 fp 改掉，且第 0 篇仍在原位 → 两条行各自稳定，不会互相认领
    const pieces = [mkPiece(0, { fp: 'fp-0' }), mkPiece(1, { fp: 'fp-1-changed' })]
    const r = reconcile({ pieces, rows: [row0, row1] })
    expect(r.migrated).toHaveLength(1)
    expect(r.migrated[0].key).toBe(row1.key)
    expect(r.migrated[0].fp).toBe('fp-1-changed')
    expect(r.migrated[0].stage).toBe(2)
    expect(r.orphaned).toEqual([])
    expect(r.rows).toHaveLength(2)
  })
})

// ──────────────────────────────── bumpStreak ────────────────────────────────

describe('bumpStreak（Q6：无任务日不判负不推进）', () => {
  it('首次完成 → streak=1、lastActiveDate=today、maxStreak=1', () => {
    const s = bumpStreak({ state: null, today: TODAY, hasTaskToday: true })
    expect(s).toEqual({
      key: 'main',
      streak: 1,
      maxStreak: 1,
      lastActiveDate: TODAY,
      examDate: '',
      sessionPieceKey: '',
      sessionDate: '',
      sessionStartedAt: 0
    })
  })

  it('整行保真：bumpStreak 不抹 examDate / session* 四个新字段', () => {
    const base = {
      key: 'main',
      streak: 2,
      maxStreak: 4,
      lastActiveDate: '2026-10-25',
      examDate: '2026-12-01',
      sessionPieceKey: 'chinese|f|0',
      sessionDate: TODAY,
      sessionStartedAt: 1730000000000
    }
    const s = bumpStreak({ state: base, today: TODAY, hasTaskToday: true })
    expect(s).toEqual({
      ...base,
      key: 'main',
      streak: 3,
      maxStreak: 4,
      lastActiveDate: TODAY
    })
  })

  it('昨天有记录 → streak+1；同日重复调用幂等', () => {
    const base = { key: 'main', streak: 7, maxStreak: 12, lastActiveDate: '2026-10-25' }
    const s = bumpStreak({ state: base, today: TODAY, hasTaskToday: true })
    expect(s.streak).toBe(8)
    expect(s.lastActiveDate).toBe(TODAY)
    expect(s.maxStreak).toBe(12)
    const again = bumpStreak({ state: s, today: TODAY, hasTaskToday: true })
    expect(again.streak).toBe(8) // 幂等，不重复 +1
  })

  it('断更 3 天 → 归 1，maxStreak 保留历史最大', () => {
    const base = { key: 'main', streak: 9, maxStreak: 12, lastActiveDate: '2026-10-23' }
    const s = bumpStreak({ state: base, today: TODAY, hasTaskToday: true })
    expect(s.streak).toBe(1)
    expect(s.maxStreak).toBe(12)
  })

  it('无任务日（hasTaskToday=false）→ streak 与 lastActiveDate 都不变', () => {
    const base = { key: 'main', streak: 5, maxStreak: 6, lastActiveDate: '2026-10-20' }
    const s = bumpStreak({ state: base, today: TODAY, hasTaskToday: false })
    expect(s.streak).toBe(5)
    expect(s.lastActiveDate).toBe('2026-10-20')
    expect(s.maxStreak).toBe(6)
    expect(s.key).toBe('main')
  })

  it('streak 刷新历史最大时同步抬高 maxStreak', () => {
    const base = { key: 'main', streak: 12, maxStreak: 12, lastActiveDate: '2026-10-25' }
    const s = bumpStreak({ state: base, today: TODAY, hasTaskToday: true })
    expect(s.streak).toBe(13)
    expect(s.maxStreak).toBe(13)
  })
})

// ──────────────────────── overdueDays（首页卡「逾期 N 天」） ────────────────────────

describe('overdueDays · 逾期天数（非负整数，非法输入返 0）', () => {
  it('① 排期在今天之前 → 相隔天数（跨月/跨年按日历算，不受夏令时影响）', () => {
    const piece = mkPiece(0)
    expect(overdueDays(mkRow(piece, { nextDate: '2026-10-20' }), TODAY)).toBe(6)
    expect(overdueDays(mkRow(piece, { nextDate: '2026-10-25' }), TODAY)).toBe(1)
    // 跨月：9-26 → 10-26 = 30 天
    expect(overdueDays(mkRow(piece, { nextDate: '2026-09-26' }), TODAY)).toBe(30)
    // 跨年：2025-10-26 → 2026-10-26 = 365 天（2026 非闰年）
    expect(overdueDays(mkRow(piece, { nextDate: '2025-10-26' }), TODAY)).toBe(365)
    // 闰日参与：2024-02-29 → 2026-10-26
    expect(overdueDays(mkRow(piece, { nextDate: '2024-02-29' }), TODAY)).toBe(970)
  })

  it('② 今天到期 / 未来排期 → 0（今天到期的卡不该显示「逾期 1 天」）', () => {
    const piece = mkPiece(0)
    expect(overdueDays(mkRow(piece, { nextDate: TODAY }), TODAY)).toBe(0)
    expect(overdueDays(mkRow(piece, { nextDate: '2026-10-27' }), TODAY)).toBe(0)
    expect(overdueDays(mkRow(piece, { nextDate: '2027-01-01' }), TODAY)).toBe(0)
  })

  it('③ 毕业（nextDate=null）/ 缺排期 / 软删行 / 非行对象 → 一律 0', () => {
    const piece = mkPiece(0)
    expect(overdueDays(mkRow(piece, { nextDate: null, stage: MAX_STAGE }), TODAY)).toBe(0)
    expect(overdueDays({ ...mkRow(piece), nextDate: undefined }, TODAY)).toBe(0)
    expect(overdueDays({ ...mkRow(piece), nextDate: '' }, TODAY)).toBe(0)
    expect(overdueDays(mkRow(piece, { nextDate: '2026-10-01', deleted: true }), TODAY)).toBe(0)
    expect(overdueDays(null, TODAY)).toBe(0)
    expect(overdueDays(undefined, TODAY)).toBe(0)
  })

  it('④ 非法日期串 → 0（不猜、不静默算成某个天数）', () => {
    const piece = mkPiece(0)
    // Date.UTC(2026, 1, 31) 会静默滚到 3 月 3 日 —— 往返校验必须把它判为非法
    expect(overdueDays(mkRow(piece, { nextDate: '2026-02-31' }), TODAY)).toBe(0)
    expect(overdueDays(mkRow(piece, { nextDate: '2026-1-5' }), TODAY)).toBe(0) // 非零填充
    expect(overdueDays(mkRow(piece, { nextDate: '2026-10-20T00:00:00Z' }), TODAY)).toBe(0) // 带时间
    expect(overdueDays(mkRow(piece, { nextDate: 'not-a-date' }), TODAY)).toBe(0)
    expect(overdueDays(mkRow(piece, { nextDate: 20261020 }), TODAY)).toBe(0) // 非字符串
    // today 非法 → 同样 0（而不是 NaN 冒到 UI）
    expect(overdueDays(mkRow(piece, { nextDate: '2026-10-20' }), '2026-13-01')).toBe(0)
  })

  it('⑤ 返回值恒为非负整数（与 isDue 同源：到期才可能 > 0）', () => {
    const piece = mkPiece(0)
    const cases = [
      mkRow(piece, { nextDate: '2026-10-18' }),
      mkRow(piece, { nextDate: TODAY }),
      mkRow(piece, { nextDate: '2026-12-31' }),
      mkRow(piece, { nextDate: null })
    ]
    for (const row of cases) {
      const n = overdueDays(row, TODAY)
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(0)
      // 只有到期行才可能 > 0；且「逾期 1 天」必须同时 isDue=true
      if (n > 0) expect(isDue(row, TODAY)).toBe(true)
    }
    expect(overdueDays(cases[0], TODAY)).toBe(8)
  })
})

// ─────────────────────── reciteBankClient · 双源 SWR ───────────────────────

/** 造一份产物 JSON（形状同 public/recite-bank/chinese.json） */
function mkBank({ contentVersion = 4, blockIndex = 0 } = {}) {
  const pieces = [mkPiece(blockIndex, { fp: `fp-v${contentVersion}` })]
  return {
    schemaVersion: 1,
    contentVersion,
    generatedAt: '2026-10-26T08:00:00.000Z',
    subject: 'chinese',
    counts: { all: 1, lesson: 1, review: 0 },
    pieces
  }
}

describe('reciteBankClient 双源 SWR（5 个场景，mock fetchJson）', () => {
  beforeEach(() => {
    resetReciteBankCache()
    fetchJson.mockReset()
    siteRoot.mockReset()
    siteRoot.mockReturnValue('https://remote.invalid')
  })

  it('① bundled 成功、remote 版本更大 → 返回 remote 且内存被替换', async () => {
    fetchJson
      .mockResolvedValueOnce(mkBank({ contentVersion: 4, blockIndex: 0 }))
      .mockResolvedValueOnce(mkBank({ contentVersion: 5, blockIndex: 1 }))

    const bundled = await loadBundled('chinese')
    expect(bundled.contentVersion).toBe(4)
    expect(getCachedBank('chinese').contentVersion).toBe(4)

    const remote = await refreshFromRemote('chinese')
    expect(remote.contentVersion).toBe(5)
    expect(getCachedBank('chinese').contentVersion).toBe(5) // ★ 内存已替换
    // 两个源的基址不同：包内走 './'，远程走 siteRoot()
    expect(fetchJson.mock.calls[0][0]).toBe('./')
    expect(fetchJson.mock.calls[1][0]).toBe('https://remote.invalid')
    // 超时值：包内 3000 / 远程 2500（首屏不阻塞 8 秒）
    expect(fetchJson.mock.calls[0][2]).toEqual({ timeout: 3000 })
    expect(fetchJson.mock.calls[1][2]).toEqual({ timeout: 2500 })
  })

  it('② remote 版本相同或更小 → 保留 bundled（不得替换）', async () => {
    fetchJson
      .mockResolvedValueOnce(mkBank({ contentVersion: 6 }))
      .mockResolvedValueOnce(mkBank({ contentVersion: 6 })) // 相同
      .mockResolvedValueOnce(mkBank({ contentVersion: 5 })) // 更旧

    await loadBundled('chinese')
    expect(await refreshFromRemote('chinese')).toBeNull()
    expect(getCachedBank('chinese').contentVersion).toBe(6)
    expect(await refreshFromRemote('chinese')).toBeNull()
    expect(getCachedBank('chinese').contentVersion).toBe(6) // 旧版绝不覆盖新版
  })

  it('③ remote 抛错 / 超时 → 保留 bundled，且**不抛异常**', async () => {
    fetchJson
      .mockResolvedValueOnce(mkBank({ contentVersion: 4 }))
      .mockRejectedValueOnce(new Error('AbortError: timeout'))

    await loadBundled('chinese')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(refreshFromRemote('chinese')).resolves.toBeNull()
    expect(getCachedBank('chinese').contentVersion).toBe(4)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('④ siteRoot() === "./" → 完全不发起 remote 请求（fetchJson 只被调 1 次）', async () => {
    siteRoot.mockReturnValue('./')
    fetchJson.mockResolvedValueOnce(mkBank({ contentVersion: 4 }))

    await loadBundled('chinese')
    expect(await refreshFromRemote('chinese')).toBeNull()
    expect(fetchJson).toHaveBeenCalledTimes(1) // ★ 只读了包内副本
  })

  it('⑤ bundled 也失败 → 抛错（store 据此转 error 态）', async () => {
    fetchJson.mockRejectedValueOnce(new Error('HTTP 404'))
    await expect(loadBundled('chinese')).rejects.toThrow('HTTP 404')
    expect(getCachedBank('chinese')).toBeNull()
  })

  it('补充：bundled 形状不可用（schemaVersion 不符）→ 抛错；remote 形状不可用 → 只 warn 不抛', async () => {
    fetchJson.mockResolvedValueOnce({ schemaVersion: 99, contentVersion: 4, pieces: [] })
    await expect(loadBundled('chinese')).rejects.toThrow('包内篇目产物不可用')

    // 重试：包内成功（形状修复后）
    fetchJson.mockResolvedValueOnce(mkBank({ contentVersion: 4 }))
    await loadBundled('chinese')
    // 远程这次返回的是坏形状 → 只 warn，内存保持包内副本
    fetchJson.mockResolvedValueOnce({ schemaVersion: 99, contentVersion: 9, pieces: [] })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await refreshFromRemote('chinese')).toBeNull()
    expect(getCachedBank('chinese').contentVersion).toBe(4)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('补充：内存缓存命中后不重复读盘（第二次 loadBundled 不再发请求）', async () => {
    fetchJson.mockResolvedValueOnce(mkBank({ contentVersion: 4 }))
    const a = await loadBundled('chinese')
    const b = await loadBundled('chinese')
    expect(b).toBe(a)
    expect(fetchJson).toHaveBeenCalledTimes(1)
  })
})

// ───────────────────────── C3a · 毕业保持队列（T4） ─────────────────────────

/** 造「本地当天零点」的毫秒时间戳（保持日按本地时区算，不用 UTC / toISOString） */
function localMidnightMs(dayStr) {
  const [y, m, d] = dayStr.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** 造一条历史毕业行（stage=5 / nextDate=null）；lastAt 缺省为早已过保持期的时间 */
function graduatedRow(piece, over = {}) {
  return mkRow(piece, {
    stage: MAX_STAGE,
    nextDate: null,
    lastAt: localMidnightMs('2026-09-01'),
    ...over
  })
}

describe('C3a · 毕业保持期常量（派生值，ladder 本身不动）', () => {
  it('MAINTENANCE_DAYS = 末档累计 × 2 = 30；MAINTENANCE_DAILY_LIMIT = floor(DAILY_DUE_LIMIT/2) = 2', () => {
    expect(MAINTENANCE_DAYS).toBe(30)
    expect(MAINTENANCE_DAILY_LIMIT).toBe(2)
    // 用 [length-1] 而非 .at()：与实现的派生式逐字同源
    expect(MAINTENANCE_DAYS).toBe(CUMULATIVE_DAYS[CUMULATIVE_DAYS.length - 1] * 2)
    expect(MAINTENANCE_DAILY_LIMIT).toBe(Math.max(1, Math.floor(DAILY_DUE_LIMIT / 2)))
    // ladder 常量一个都没动
    expect(CUMULATIVE_DAYS).toEqual([1, 2, 4, 7, 15])
    expect(STAGE_DELTA).toEqual([1, 1, 2, 3, 8])
    expect(MAX_STAGE).toBe(5)
    expect(NEW_SUPPRESS_AT).toBe(3)
    expect(DAILY_DUE_LIMIT).toBe(5)
  })
})

describe('C3a · maintenanceDueDateOf / isMaintenanceDue', () => {
  it('maintenanceDueDateOf：只对生效毕业行产出本地日期，其余返回 null', () => {
    const piece = mkPiece(0)
    expect(maintenanceDueDateOf(graduatedRow(piece))).toBe('2026-10-01')
    expect(maintenanceDueDateOf(graduatedRow(piece, { lastAt: localMidnightMs('2026-10-20') }))).toBe('2026-11-19')
    expect(maintenanceDueDateOf(graduatedRow(piece, { nextDate: TODAY }))).toBeNull()
    expect(maintenanceDueDateOf(graduatedRow(piece, { deleted: true }))).toBeNull()
    expect(maintenanceDueDateOf({ ...graduatedRow(piece), lastAt: undefined })).toBeNull()
    expect(maintenanceDueDateOf(null)).toBeNull()
  })

  it('isMaintenanceDue ① 已过保持期 → true；② 未到保持期 → false', () => {
    const piece = mkPiece(0)
    expect(isMaintenanceDue(graduatedRow(piece), TODAY)).toBe(true)
    expect(isMaintenanceDue(graduatedRow(piece, { lastAt: localMidnightMs('2026-10-20') }), TODAY)).toBe(false)
  })

  it('isMaintenanceDue ③ 未毕业（nextDate 非 null）→ false；④ 软删 → false', () => {
    const piece = mkPiece(0)
    expect(isMaintenanceDue(graduatedRow(piece, { nextDate: '2026-10-20' }), TODAY)).toBe(false)
    expect(isMaintenanceDue(graduatedRow(piece, { nextDate: '' }), TODAY)).toBe(false)
    expect(isMaintenanceDue(graduatedRow(piece, { deleted: true }), TODAY)).toBe(false)
    // 仍归常规 isDue 管，两条判据互不改写
    expect(isDue(graduatedRow(piece, { nextDate: '2026-10-20' }), TODAY)).toBe(true)
  })

  it('isMaintenanceDue 历史毕业行缺 lastAt → 从严 true（宁可多默一次，不可漏默）', () => {
    const legacy = { ...graduatedRow(mkPiece(0)), lastAt: undefined }
    expect(maintenanceDueDateOf(legacy)).toBeNull()
    expect(isMaintenanceDue(legacy, TODAY)).toBe(true)
  })
})

describe('C3a · buildQueue 保持档分池（常规语义不变）', () => {
  it('3 常规到期 + 10 保持到期 → due 3 / maintenance 截 2 / suppressedNew 只由 due 决定', () => {
    const pieces = []
    for (let i = 0; i < 14; i++) pieces.push(mkPiece(i))
    const rows = [
      ...[0, 1, 2].map((i) => mkRow(pieces[i], { stage: 1, nextDate: '2026-10-20' })),
      ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => graduatedRow(pieces[i]))
    ]
    const q = buildQueue({ pieces, rows, today: TODAY })
    expect(q.dueCount).toBe(3)
    expect(q.due).toHaveLength(3)
    expect(q.remainingDueCount).toBe(0)
    expect(q.suppressedNew).toBe(true) // 3 >= NEW_SUPPRESS_AT
    expect(q.fresh).toEqual([])
    expect(q.maintenanceCount).toBe(10)
    expect(q.maintenance).toHaveLength(MAINTENANCE_DAILY_LIMIT)
    expect(q.maintenanceRemaining).toBe(8)
    // 两池严格互斥：常规 due 一条都没被保持档挤掉
    expect(q.due.every((d) => d.row.nextDate !== null)).toBe(true)
    expect(q.maintenance.every((m) => m.row.nextDate === null)).toBe(true)
  })

  it('0 常规 + 10 保持到期 → fresh 照给 1 篇、保持截 2 篇、无饥饿', () => {
    const pieces = []
    for (let i = 0; i < 11; i++) pieces.push(mkPiece(i))
    const rows = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => graduatedRow(pieces[i]))
    const q = buildQueue({ pieces, rows, today: TODAY })
    expect(q.dueCount).toBe(0)
    expect(q.due).toEqual([])
    expect(q.suppressedNew).toBe(false)
    expect(q.fresh).toHaveLength(1)
    expect(q.fresh[0].key).toBe(pieces[10].key)
    expect(q.maintenanceCount).toBe(10)
    expect(q.maintenance).toHaveLength(MAINTENANCE_DAILY_LIMIT)
    expect(q.maintenanceRemaining).toBe(8)
  })

  it('保持档不进复习 Tab：deriveStats.dueCount 仍只数常规到期，DAILY_DUE_LIMIT 只截常规 due', () => {
    const pieces = [mkPiece(0), mkPiece(1)]
    const rows = [
      mkRow(pieces[0], { stage: 1, nextDate: '2026-10-20' }),
      graduatedRow(pieces[1])
    ]
    const stats = deriveStats({ pieces, rows, state: null, today: TODAY })
    expect(stats.dueCount).toBe(1)
    const q = buildQueue({ pieces, rows, today: TODAY, opts: { dueLimit: 5 } })
    expect(q.dueCount).toBe(1)
    expect(q.due).toHaveLength(1)
    expect(q.maintenanceCount).toBe(1)
  })

  it('保持档按「保持日最早 → order」排序，常规 due 排序口径不变', () => {
    const pieces = [mkPiece(0), mkPiece(1), mkPiece(2), mkPiece(3)]
    const rows = [
      graduatedRow(pieces[0], { lastAt: localMidnightMs('2026-09-20') }), // 保持日 2026-10-20
      graduatedRow(pieces[1]), // 保持日 2026-10-01
      graduatedRow(pieces[2]) // 保持日 2026-10-01，order 更大
    ]
    const q = buildQueue({ pieces, rows, today: TODAY })
    expect(q.maintenanceCount).toBe(3)
    expect(q.maintenance.map((m) => m.piece.key)).toEqual([pieces[1].key, pieces[2].key])
    expect(q.maintenanceRemaining).toBe(1)
    expect(q.fresh.map((p) => p.key)).toEqual([pieces[3].key])
  })
})

describe('C3a · 历史毕业行零迁移', () => {
  it('毕业行（stage=5 / nextDate=null）原样通过 reconcile，不产生 migrated / orphaned', () => {
    const piece = mkPiece(0)
    const row = graduatedRow(piece)
    const r = reconcile({ pieces: [piece], rows: [row] })
    expect(r.migrated).toEqual([])
    expect(r.orphaned).toEqual([])
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]).toMatchObject({ key: piece.key, stage: MAX_STAGE, nextDate: null })
  })
})
