/**
 * recite-store-today —— 「跨零点 `today` 陈旧」回归（team-lead 裁定必修的 P0，不是我方自选题）
 *
 * 背景（两名工程师独立复现，team-lead 已核 `bumpStreak` 机理后拍板）：`store.today` 是
 * **进入页面那一刻**的快照，进程长挂（Tauri 窗口远大于浏览器标签页）时它会停在旧日。
 * 陈旧 `today` 的实际伤害不是「排期早一天」这种小账，而是：
 *  ① `bumpStreak` 的幂等判据是 `lastActiveDate === today` → 凌晨那次作答被当成
 *     **前一天的第二笔**吞掉，`lastActiveDate` 停在旧日；次日正常作答即被判断更，`streak` 归 1
 *     （实测：D 完成 → D+1 凌晨以陈旧 `today` 作答 → D+2 正常作答，应为 3 实得 1）；
 *  ② `applyResult` 按旧日算 `nextDate` → 刚背完的篇**立刻又回到「今日待重默」**；
 *  ③ `learnedAt` 记成旧的那天（只写不撤，计数不受影响，日期偏一天）。
 *
 * 修复规格（team-lead 三条硬约束）：
 *  - 只改 `src/stores/recite.js`；`getDateStr` 仍是全仓唯一「今天」产出者，不许出现第二处 `new Date`；
 *  - 内部抽一个 `syncToday()`（一处实现），**三处调用**：`doInit()`、`init()` 已加载分支、`submitResult()` 入口；
 *  - `submitResult` 三处消费（`applyResult` / `syncReviewTriggers` / `bumpStreak`）统一吃局部 `day`；
 *  - `submitResult` **签名不变**（不加可选 `today` 入参 —— 这个 bug 的成因就是 `today` 与真实日期脱钩，
 *    在修复提交里再开一条「调用方可传任意日期」的通道方向是反的）。
 *
 * 怎么测（不用 fake timers —— `fake-indexeddb` 的事件派发依赖 `setTimeout`/`setImmediate`，
 * vitest 的 fake timers 会把它俩一起 fake 掉，事务永不完成 → 用例挂死而不是变红）：
 * **不构造陈旧现场，而是「装作它已经旧了」，然后断言被纠正** ——
 * 先 `setToday('2020-01-01')`，再走真实入口，看 `today` / `streak` / `nextDate` 是否被拉回真实今天。
 *
 * 每条断言都在**修复前**跑过一次并确认是红的（`tests` 报告见提交说明）：
 *  - 「作答后 today 是真实今天」→ 旧代码停在 `2020-01-01`；
 *  - 「streak 6 → 7」→ 旧代码走断更分支得 1；
 *  - 「重进页面刷新」→ 旧代码停在 `2020-01-01`；
 *  - 「nextDate 从真实今天起算」→ 旧代码得 `2020-01-02`，且该篇立刻重回 due 队列。
 */
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ─────────────────────────── 桩：产物加载器（不读盘、不打网络） ───────────────────────────
// 只桩 `reciteBankClient`：DB 走**真** `studyDb` + fake-indexeddb（本用例要断「真的落库」），
// 产物用可控 bank（本用例关心的是时间基准，不是产物内容）。
const H = vi.hoisted(() => ({ bank: null, loadBundled: null }))

vi.mock('@/utils/reciteBankClient', () => ({
  DEFAULT_SUBJECT: 'chinese',
  BUNDLED_TIMEOUT_MS: 3000,
  REMOTE_TIMEOUT_MS: 2500,
  loadBundled: (...args) => H.loadBundled(...args),
  refreshFromRemote: async () => null,
  resetReciteBankCache: () => {},
  getCachedBank: () => H.bank
}))

import { useStudyDbStore } from '@/stores/studyDb'
import { RECITE_PHASE, useReciteStore } from '@/stores/recite'
import { addDays, getDateStr } from '@/composables/useReciteSchedule'

const FILE_KEY = 'chinese_07_01-先秦至魏晋名篇'
const KEY_1 = `chinese|${FILE_KEY}|0`
const KEY_2 = `chinese|${FILE_KEY}|1`

/** 造一篇产物条目（`sanitizeBank` 之后的最小形状；本用例只用到 key/title/fp/坐标） */
function makePiece({ key, blockIndex, title, order, fp }) {
  return {
    key,
    subject: 'chinese',
    unitNum: '07',
    fileIndex: 0,
    blockIndex,
    title,
    fileKey: FILE_KEY,
    fileTitle: '关雎、蒹葭',
    unitTitle: '先秦至魏晋名篇',
    role: 'lesson',
    order,
    fp,
    blankCount: 2,
    strictCount: 0
  }
}

/** 造一份两篇的产物（`counts.lesson` 与篇数一致 —— `totalLesson` 取的就是它） */
function makeBank() {
  return {
    version: 1,
    contentVersion: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
    counts: { lesson: 2, review: 0, total: 2 },
    pieces: [
      makePiece({ key: KEY_1, blockIndex: 0, title: '《诗经》 · 关雎', order: 1, fp: 'fp-1' }),
      makePiece({ key: KEY_2, blockIndex: 1, title: '《诗经》 · 蒹葭', order: 2, fp: 'fp-2' })
    ]
  }
}

/** 陈旧现场用的假日期：与真实今天相差数年，任何「今天」都不会撞上它 */
const STALE_DAY = '2020-01-01'

beforeEach(async () => {
  H.bank = makeBank()
  H.loadBundled = vi.fn(async () => H.bank)
  setActivePinia(createPinia())
  const db = useStudyDbStore()
  await db.init()
  await db.clearAllSyncedData()
})

describe('① 作答入口刷新 today（吞连续天数 / 刚背完又到期）', () => {
  it('submitResult 之后 store.today 是真实今天（修复前：停在注入的陈旧值）', async () => {
    const store = useReciteStore()
    await store.init()
    expect(store.phase).toBe(RECITE_PHASE.IDLE)

    store.setToday(STALE_DAY)
    await store.submitResult({ pieceKey: KEY_1, allCorrect: true })

    expect(store.today).toBe(getDateStr())
    expect(store.today).not.toBe(STALE_DAY)
  })

  it('凌晨那次作答不再被当成"前一天的第二笔"：streak 6 → 7 且真的落库（修复前：断更归 1）', async () => {
    const db = useStudyDbStore()
    const realToday = getDateStr()
    // 造「昨天背过、已连续 6 天」的现场
    await db.saveReciteState({ streak: 6, maxStreak: 9, lastActiveDate: addDays(realToday, -1) })

    const store = useReciteStore()
    await store.init()
    expect(store.state.streak).toBe(6)

    // 装作页面是 2020 年打开的、一夜没刷
    store.setToday(STALE_DAY)
    await store.submitResult({ pieceKey: KEY_1, allCorrect: true })

    // 修复后：day = 真实今天，lastActiveDate = 昨天 → 走 +1 分支
    expect(store.state.streak).toBe(7)
    expect(store.state.lastActiveDate).toBe(realToday)
    expect(store.state.maxStreak).toBe(9) // 历史最大值不被拉低

    // 真的落库（不是只在内存里对）
    const persisted = await db.getReciteState()
    expect(persisted.streak).toBe(7)
    expect(persisted.lastActiveDate).toBe(realToday)
  })

  it('答错时 nextDate 按真实今天起算，且该篇不立刻重回"今日待重默"（修复前：nextDate 为 2020-01-02）', async () => {
    const store = useReciteStore()
    await store.init()

    store.setToday(STALE_DAY)
    const { row } = await store.submitResult({ pieceKey: KEY_1, allCorrect: false })

    expect(row.nextDate).toBe(addDays(getDateStr(), 1))
    expect(row.nextDate).not.toBe(addDays(STALE_DAY, 1))
    // 陈旧 today 会让 nextDate ≤ 今天 → isDue 为真 → 刚背完立刻又出现在待重默（本仓最刺眼的自相矛盾）
    expect(store.queue.due.map((item) => item.piece.key)).toEqual([])
  })
})

describe('② 重进页面刷新 today（init 命中"已加载"的提前 return 分支）', () => {
  it('第二次 init() 不复用产物也会把 today 刷成真实今天（修复前：停在陈旧值）', async () => {
    const store = useReciteStore()
    await store.init()
    expect(H.loadBundled).toHaveBeenCalledTimes(1)

    store.setToday(STALE_DAY)
    await store.init()

    // 先证「确实走了提前 return 分支」（不重读产物），再证「today 仍被刷新」——
    // 否则这条用例可能只是"重新 loadBundled 时顺手刷了"，锁不住幂等分支
    expect(H.loadBundled).toHaveBeenCalledTimes(1)
    expect(store.today).toBe(getDateStr())
    expect(store.today).not.toBe(STALE_DAY)
  })
})

describe('③ 手动模式（I6）与修复前逐字一致', () => {
  it('manual=true：不写 recite_progress、不写 recite_state，且不动 today', async () => {
    const db = useStudyDbStore()
    const store = useReciteStore()
    await store.init()

    store.setToday(STALE_DAY)
    const result = await store.submitResult({ pieceKey: KEY_1, allCorrect: true, manual: true })

    expect(result).toEqual({ ok: true, manual: true })
    expect(await db.getReciteProgressAll()).toEqual([])
    expect((await db.getReciteState()).lastActiveDate).toBe('')
    // `syncToday()` 刻意放在 manual 早退**之后**：手动路径连 ref 都不该被改
    expect(store.today).toBe(STALE_DAY)
  })
})

describe('④ 单时间源守卫（I4：禁止第二个时间源）', () => {
  /**
   * 去掉注释后再数（注释里出现函数名是正常的，不许因此变红）。
   * `(^|[^:])//` 的写法是为了不误伤字符串里的 `https://`。
   * @param {string} source 源文件全文
   * @returns {string} 去掉块注释与行注释后的代码
   */
  function stripComments(source) {
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  }

  it('src/stores/recite.js 里取时间只有 2 处字面调用：ref 初值 + syncToday()', () => {
    const source = stripComments(readFileSync(join(process.cwd(), 'src/stores/recite.js'), 'utf8'))

    // 刷新点必须收敛到 `syncToday()` 一处实现：多一处手写 getDateStr 就是这次 bug 的复发路径
    expect(source.match(/getDateStr\s*\(/g) || []).toHaveLength(2)
    // 第二时间源（I4 明令禁止）
    expect(source.match(/new Date\s*\(/g) || []).toHaveLength(0)
    expect(source.match(/Date\.now\s*\(/g) || []).toHaveLength(0)
  })
})
