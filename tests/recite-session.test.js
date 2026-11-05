// @vitest-environment jsdom
/**
 * recite 会话态（T2）回归 —— 8 字段行 / 五态恢复 / 三条防重复自评硬断言
 *
 * 覆盖（team-lead T2 派工 §五）：
 *  ① beginSession 写全 8 字段（会话三字段正确、其余字段不丢）
 *  ② submitResult 后 examDate 仍在、3 个会话字段原样保留（不消费锚点）
 *  ③ clearSession 只清 3 字段，不抹 examDate / streak 等
 *  ④ restoreSession 五态：none / expired / stale / resumable / committed
 *     另补 committed 的「补写丢失 streak」分支（用会话当天，不用 today）
 *  ⑤ 两条硬断言：
 *     - 「会话确已落盘」：真实挂载单篇页后 sessionPieceKey === found.key 且 sessionStartedAt > 0
 *       （二参漏传会静默失效；另有静态源码守卫钉死 Date.now() 第二参）
 *     - 「submitResult 不消费会话锚点」：锚点原样保留、row.lastAt >= anchor，
 *       随后 restoreSession() 返回 committed 且不写第二份 recite_progress
 *  ⑥ manual=1 回看不建会话（不写库）
 *
 * 环境：jsdom（localStorage / document）+ fake-indexeddb（真 studyDb）。
 * 产物与内容页用可控桩，DB 与 store 全走真实现 —— 本用例要断「真的落库」。
 */
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

const H = vi.hoisted(() => ({ bank: null, page: null }))

vi.mock('@/utils/reciteBankClient', () => ({
  DEFAULT_SUBJECT: 'chinese',
  BUNDLED_TIMEOUT_MS: 3000,
  REMOTE_TIMEOUT_MS: 2500,
  loadBundled: async () => H.bank,
  refreshFromRemote: async () => null,
  resetReciteBankCache: () => {},
  getCachedBank: () => H.bank
}))

vi.mock('@/content/loadPage', () => ({
  loadPage: async () => H.page,
  prefetchPage: async () => false,
  clearPrefetch: () => {},
  resolvePageMeta: () => null,
  hydratePage: (raw, meta) => ({ ...meta, blocks: Array.isArray(raw?.blocks) ? raw.blocks : [] })
}))

import { useStudyDbStore } from '@/stores/studyDb'
import { useReciteStore } from '@/stores/recite'
import { addDays, getDateStr } from '@/composables/useReciteSchedule'
import RecitePieceView from '@/views/RecitePieceView.vue'

const FILE_KEY = 'chinese_08_01-先秦至唐诗词'
const PIECE_KEY = `chinese|${FILE_KEY}|0`
const PIECE_TITLE = '《诗经》 · 关雎'

function makePiece() {
  return {
    key: PIECE_KEY,
    subject: 'chinese',
    unitNum: '08',
    fileIndex: 0,
    blockIndex: 0,
    title: PIECE_TITLE,
    fileKey: FILE_KEY,
    fileTitle: '背诵专项 · 先秦至唐诗词',
    unitTitle: '背诵专项',
    paragraphs: ['关关雎鸠（guān guān jū jiū），在河之洲（zài hé zhī zhōu）。'],
    role: 'lesson',
    order: 1,
    fp: 'fp-session-1',
    blankCount: 0,
    strictCount: 0
  }
}

function makeBank() {
  return {
    version: 1,
    contentVersion: 7,
    generatedAt: '2026-01-01T00:00:00.000Z',
    counts: { all: 1, lesson: 1, review: 0 },
    pieces: [makePiece()]
  }
}

function makePage() {
  return { blocks: [{ type: 'knowledge', title: PIECE_TITLE, paragraphs: makePiece().paragraphs }] }
}

/** 直接造一条 recite_progress 行（形状照 tests/recite-db-v8.test.js 的 reciteRow） */
function reciteRow(over = {}) {
  return {
    key: PIECE_KEY,
    subject: 'chinese',
    fileKey: FILE_KEY,
    blockIndex: 0,
    pieceTitle: PIECE_TITLE,
    fp: 'fp-session-1',
    stage: 1,
    nextDate: addDays(getDateStr(), 1),
    lastCorrect: true,
    lastAt: Date.now(),
    doneCount: 1,
    learnedAt: getDateStr(),
    createdAt: Date.now(),
    deleted: false,
    ...over
  }
}

/** 8 字段零值行（缺字段由 saveReciteState 严格回落，这里写全以显式表达契约） */
function emptyState(over = {}) {
  return {
    key: 'main',
    streak: 0,
    maxStreak: 0,
    lastActiveDate: '',
    examDate: '',
    sessionPieceKey: '',
    sessionDate: '',
    sessionStartedAt: 0,
    ...over
  }
}

/** 轮询等待（异步装载 / fake-indexeddb 事务都走宏任务，固定 sleep 不可靠） */
async function waitFor(check, timeout = 5000) {
  const t0 = Date.now()
  for (;;) {
    const v = await check()
    if (v) return v
    if (Date.now() - t0 > timeout) throw new Error('waitFor timeout')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

/** 真实挂载单篇页（内存路由 + 同一 pinia，DB 走 fake-indexeddb） */
async function mountPiece(path = '/recite/08/0/0') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/recite', name: 'recite', component: { template: '<div class="stub-home" />' } },
      {
        path: '/recite/:unitNum/:fileIndex/:blockIndex',
        name: 'recite-piece',
        component: RecitePieceView
      }
    ]
  })
  await router.push(path)
  await router.isReady()
  const Host = { template: '<router-view />' }
  const wrapper = mount(Host, { global: { plugins: [router, pinia] } })
  await waitFor(() => (wrapper.find('.rp-passage').exists() ? wrapper : null))
  return { wrapper, router }
}

let pinia

beforeEach(async () => {
  H.bank = makeBank()
  H.page = makePage()
  pinia = createPinia()
  setActivePinia(pinia)
  const db = useStudyDbStore()
  await db.init()
  await db.clearAllSyncedData()
})

describe('①–③ 8 字段整行保真与清会话口径', () => {
  it('① beginSession 写全 8 字段：会话三字段正确、examDate 不丢', async () => {
    const db = useStudyDbStore()
    await db.saveReciteState(emptyState({ examDate: '2026-12-01' }))
    const store = useReciteStore()
    await store.init()

    const anchor = Date.now()
    await store.beginSession(PIECE_KEY, anchor)

    expect(await db.getReciteState()).toEqual(
      emptyState({
        examDate: '2026-12-01',
        sessionPieceKey: PIECE_KEY,
        sessionDate: getDateStr(),
        sessionStartedAt: anchor
      })
    )
  })

  it('② submitResult 后 examDate 仍在、3 个会话字段原样保留', async () => {
    const db = useStudyDbStore()
    await db.saveReciteState(emptyState({ examDate: '2026-12-01' }))
    const store = useReciteStore()
    await store.init()
    const anchor = Date.now()
    await store.beginSession(PIECE_KEY, anchor)

    await store.submitResult({ pieceKey: PIECE_KEY, allCorrect: true })

    const s = await db.getReciteState()
    expect(s.examDate).toBe('2026-12-01')
    expect(s.sessionPieceKey).toBe(PIECE_KEY)
    expect(s.sessionDate).toBe(getDateStr())
    expect(s.sessionStartedAt).toBe(anchor)
    expect(s.streak).toBe(1)
  })

  it('③ clearSession 只清 3 字段，不抹 examDate / streak / lastActiveDate', async () => {
    const db = useStudyDbStore()
    await db.saveReciteState(emptyState({ examDate: '2026-12-01' }))
    const store = useReciteStore()
    await store.init()
    await store.beginSession(PIECE_KEY, Date.now())
    await store.submitResult({ pieceKey: PIECE_KEY, allCorrect: true })

    await store.clearSession()

    const s = await db.getReciteState()
    expect(s.sessionPieceKey).toBe('')
    expect(s.sessionDate).toBe('')
    expect(s.sessionStartedAt).toBe(0)
    expect(s.examDate).toBe('2026-12-01')
    expect(s.streak).toBe(1)
    expect(s.maxStreak).toBe(1)
    expect(s.lastActiveDate).toBe(getDateStr())
  })
})

describe('④ restoreSession 五态 + 补写 streak 分支', () => {
  it('none：无会话 → 不导航、不清、不写进度行', async () => {
    const db = useStudyDbStore()
    await db.saveReciteState(emptyState())
    const store = useReciteStore()

    expect(await store.restoreSession()).toEqual({ status: 'none' })
    expect(await db.getReciteProgressAll()).toEqual([])
    expect((await db.getReciteState()).sessionPieceKey).toBe('')
  })

  it('expired：会话跨日 → 清会话', async () => {
    const db = useStudyDbStore()
    await db.saveReciteState(
      emptyState({
        sessionPieceKey: PIECE_KEY,
        sessionDate: addDays(getDateStr(), -1),
        sessionStartedAt: Date.now()
      })
    )
    const store = useReciteStore()

    expect(await store.restoreSession()).toEqual({ status: 'expired' })
    const s = await db.getReciteState()
    expect(s.sessionPieceKey).toBe('')
    expect(s.sessionDate).toBe('')
    expect(s.sessionStartedAt).toBe(0)
  })

  it('stale：会话篇不在产物里 → 清会话', async () => {
    const db = useStudyDbStore()
    await db.saveReciteState(
      emptyState({
        sessionPieceKey: 'chinese|gone|9',
        sessionDate: getDateStr(),
        sessionStartedAt: Date.now()
      })
    )
    const store = useReciteStore()

    expect(await store.restoreSession()).toEqual({ status: 'stale' })
    expect((await db.getReciteState()).sessionPieceKey).toBe('')
  })

  it('resumable：当日会话但无进度行 → 保留会话、带回篇目', async () => {
    const db = useStudyDbStore()
    const store = useReciteStore()
    await store.init()
    const anchor = Date.now()
    await store.beginSession(PIECE_KEY, anchor)

    const r = await store.restoreSession()
    expect(r.status).toBe('resumable')
    expect(r.piece.key).toBe(PIECE_KEY)
    const s = await db.getReciteState()
    expect(s.sessionPieceKey).toBe(PIECE_KEY)
    expect(s.sessionStartedAt).toBe(anchor)
  })

  it('committed：已提交 → 清会话、不写第二份 recite_progress', async () => {
    const db = useStudyDbStore()
    const store = useReciteStore()
    await store.init()
    const anchor = Date.now()
    await store.beginSession(PIECE_KEY, anchor)
    await store.submitResult({ pieceKey: PIECE_KEY, allCorrect: true })
    const before = await db.getReciteProgressAll()

    const r = await store.restoreSession()
    expect(r.status).toBe('committed')
    expect(r.piece.key).toBe(PIECE_KEY)

    const after = await db.getReciteProgressAll()
    expect(after).toHaveLength(before.length)
    expect(after[0].doneCount).toBe(before[0].doneCount)
    expect(after[0].stage).toBe(before[0].stage)
    expect((await db.getReciteState()).sessionPieceKey).toBe('')
  })

  it('committed 且 streak 写入丢失 → 用会话当天补写，不把 streak 重置成 1', async () => {
    const db = useStudyDbStore()
    const anchor = Date.now() - 1000
    // 进度行已提交（lastAt >= anchor），但 recite_state 的 streak 那次写入丢了
    await db.saveReciteProgress(reciteRow({ lastAt: anchor + 10, stage: 3 }))
    await db.saveReciteState(
      emptyState({
        streak: 4,
        maxStreak: 4,
        lastActiveDate: addDays(getDateStr(), -1),
        sessionPieceKey: PIECE_KEY,
        sessionDate: getDateStr(),
        sessionStartedAt: anchor
      })
    )
    const store = useReciteStore()

    const r = await store.restoreSession()
    expect(r.status).toBe('committed')
    const s = await db.getReciteState()
    expect(s.streak).toBe(5) // 昨天有记录 → +1，而不是从 1 重来
    expect(s.lastActiveDate).toBe(getDateStr())
    expect(s.sessionPieceKey).toBe('')
    expect(await db.getReciteProgressAll()).toHaveLength(1)
  })
})

describe('⑤ 两条硬断言（防旧规格回潮）', () => {
  it('进入单篇后会话确已落盘：sessionPieceKey 命中且 sessionStartedAt > 0', async () => {
    const db = useStudyDbStore()
    const { wrapper } = await mountPiece()

    const persisted = await waitFor(async () => {
      const s = await db.getReciteState()
      return s.sessionStartedAt > 0 ? s : null
    })
    await flushPromises()

    expect(persisted.sessionPieceKey).toBe(PIECE_KEY)
    expect(persisted.sessionStartedAt).toBeGreaterThan(0)
    expect(persisted.sessionDate).toBe(getDateStr())
    wrapper.unmount()
  })

  it('静态源码守卫：视图必须传 Date.now() 第二参，且 manual 分支不建会话', () => {
    const src = readFileSync(join(process.cwd(), 'src/views/RecitePieceView.vue'), 'utf8')
    expect(src).toMatch(/store\.beginSession\(found\.key,\s*Date\.now\(\)\)/)
    expect(src).toMatch(/if \(!isManual\.value\) await store\.beginSession/)
  })

  it('submitResult 不消费会话锚点：锚点原样保留、row.lastAt >= anchor、恢复落 committed 且不重复进档', async () => {
    const db = useStudyDbStore()
    const store = useReciteStore()
    await store.init()
    const anchor = Date.now()
    await store.beginSession(PIECE_KEY, anchor)

    await store.submitResult({ pieceKey: PIECE_KEY, allCorrect: true })

    const s = await db.getReciteState()
    expect(s.sessionStartedAt).toBe(anchor)
    expect(s.sessionPieceKey).toBe(PIECE_KEY)
    const row = (await db.getReciteProgressAll()).find((r) => r.key === PIECE_KEY)
    expect(row).toBeTruthy()
    expect(row.lastAt).toBeGreaterThanOrEqual(anchor)

    const r = await store.restoreSession()
    expect(r.status).toBe('committed')
    const rows = await db.getReciteProgressAll()
    expect(rows).toHaveLength(1)
    expect(rows[0].doneCount).toBe(1)
    expect(rows[0].stage).toBe(1)
    expect((await db.getReciteState()).sessionPieceKey).toBe('')
  })
})

describe('⑥ manual=1 回看不建会话', () => {
  it('模拟考场 / 全部篇目回看：进入单篇不写会话行', async () => {
    const db = useStudyDbStore()
    const { wrapper } = await mountPiece('/recite/08/0/0?manual=1')
    await flushPromises()

    const s = await db.getReciteState()
    expect(s.sessionPieceKey).toBe('')
    expect(s.sessionStartedAt).toBe(0)
    expect(await db.getReciteProgressAll()).toEqual([])
    wrapper.unmount()
  })
})
