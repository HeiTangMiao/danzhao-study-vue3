/**
 * recite-db-v8 —— 每日背诵数据层验收（DB v7 → v8 真迁移 / 换账号清理 / 导出导入）
 *
 * 设计依据：`docs/design-recitation.md` §5 T03 验收 4 条 + §3.1 / §3.3 / §1 异议 8。
 *
 * 覆盖：
 *  ① **从 v7 现状库升到 v8**：两个新仓库建出来（含 fileKey / nextDate 索引），
 *     且 7 个旧仓库的数据**一条不丢**（真造一个 v7 库再打开，不靠"看起来对"）；
 *  ② 连续两次 `init()` 幂等（第二次不重建、不丢数据）；
 *  ③ `clearAllSyncedData()` 后 `getReciteProgressAll()` 为 []、`getReciteState()` 归零
 *     （★ 上线准入项：这两张表不同步，但换账号必须清，否则 B 会看到 A 的进度）；
 *  ④ `exportAllData()` 含两个新键（`recite_state` 是 `[row]` 数组形式），
 *     `importAllData(导出结果)` 能完整还原。
 *
 * ⚠️ ① 必须排在本文件**第一个**执行：`studyDb` 的 `dbInstance` 是模块级单例，
 *    一旦以 v8 打开过，就再也不会触发 `onupgradeneeded`（第二次 open 不升版）。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStudyDbStore } from '@/stores/studyDb'

const DB_NAME = 'study_game_db'

/** v7 时代的 7 个同步仓库（= `SYNC_STORE_NAMES`）+ 3 张预留/本地表 */
const V7_STORES = [
  ['study_log', 'id'],
  ['daily_stats', 'date'],
  ['page_progress', 'key'],
  ['error_book', 'id'],
  ['notes', 'pageKey'],
  ['bookmarks', 'pageKey'],
  ['user_progress', 'id'],
  ['question_attempt', 'id'],
  ['content_cache', 'key'],
  ['content_meta', 'key']
]

/** 7 个旧仓库各放一行「现状数据」，升级后必须仍在 */
const V7_ROWS = {
  study_log: [{ id: 'log-v7-1', date: '2026-10-01', subject: 'math', fileKey: 'math_01_a', type: 'visit' }],
  daily_stats: [{ date: '2026-10-01', filesVisited: 2, questionsAnswered: 10, studyMinutes: 30 }],
  page_progress: [{ key: 'math_01_a', subject: 'math', visited: true, questionsAnswered: 4 }],
  error_book: [{ id: 'err-v7-1', subject: 'math', question: 'q1', createdAt: 1759000000000 }],
  notes: [{ pageKey: 'math_01_a', content: 'v7 笔记' }],
  bookmarks: [{ pageKey: 'math_01_a', createdAt: 1759000000000 }],
  question_attempt: [{ id: 'att-v7-1', createdAt: 1759000000000, fileKey: 'math_01_a', subject: 'math' }]
}

/** 删库（每个文件只在这里做一次） */
function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve() // 无其它连接时不会走到这里
  })
}

/**
 * 以指定版本打开（只用于「造假 v7 库」与「事后检查索引」）。
 * @param {number} [version] 省略 = 用现有版本打开（不触发升级）
 * @returns {Promise<IDBDatabase>}
 */
function rawOpen(version) {
  return new Promise((resolve, reject) => {
    const req = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME)
    if (version) {
      // 复刻 v7 的仓库结构（keyPath 与 v7 实现一致；v7 的索引不影响本次验收）
      req.onupgradeneeded = () => {
        const d = req.result
        for (const [name, keyPath] of V7_STORES) {
          if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, { keyPath })
        }
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** 往 v7 库的 7 个同步仓库各写一行 */
function seedV7(connection) {
  return new Promise((resolve, reject) => {
    const names = Object.keys(V7_ROWS)
    const tx = connection.transaction(names, 'readwrite')
    for (const name of names) {
      for (const row of V7_ROWS[name]) tx.objectStore(name).put(row)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/** 读出某仓库全部行（原始连接，绕过 store 访问器） */
function rawGetAll(connection, storeName) {
  return new Promise((resolve, reject) => {
    const r = connection.transaction(storeName, 'readonly').objectStore(storeName).getAll()
    r.onsuccess = () => resolve(r.result || [])
    r.onerror = () => reject(r.error)
  })
}

/** 造一行背诵进度（形状同纯函数 `applyResult` 的产出） */
function reciteRow(key, over = {}) {
  return {
    key,
    subject: 'chinese',
    fileKey: 'chinese_07_01-先秦至魏晋名篇',
    blockIndex: 0,
    pieceTitle: '《诗经》 · 关雎',
    fp: 'fp-1',
    stage: 1,
    nextDate: '2026-10-27',
    lastCorrect: true,
    lastAt: 1759000000000,
    doneCount: 1,
    learnedAt: '2026-10-26',
    createdAt: 1759000000000,
    deleted: false,
    ...over
  }
}

const KEY_A = 'chinese|chinese_07_01-先秦至魏晋名篇|0'
const KEY_B = 'chinese|chinese_07_01-先秦至魏晋名篇|1'

describe('① DB v7 → v8 迁移（真迁移，不是只建表）', () => {
  it('从 v7 现状库升级：建出 recite_progress / recite_state（含索引），7 个旧仓库数据一条不丢', async () => {
    // 1) 造一个「v7 现状库」并写入 7 个仓库的现状数据
    await deleteDatabase()
    const v7 = await rawOpen(7)
    expect(v7.version).toBe(7)
    expect(v7.objectStoreNames.contains('recite_progress')).toBe(false)
    await seedV7(v7)
    // 升级前必须关掉 v7 连接，否则 v8 open 会 onblocked
    v7.close()

    // 2) 用 studyDb 打开（DB_VERSION = 8）→ 触发 onupgradeneeded
    setActivePinia(createPinia())
    const db = useStudyDbStore()
    await db.init()

    // 3) 新连接自检：版本 = 8、两个新仓库 + 索引都在
    const after = await rawOpen()
    expect(after.version).toBe(8)
    expect(after.objectStoreNames.contains('recite_progress')).toBe(true)
    expect(after.objectStoreNames.contains('recite_state')).toBe(true)
    const progressStore = after.transaction('recite_progress', 'readonly').objectStore('recite_progress')
    expect(progressStore.keyPath).toBe('key')
    expect(Array.from(progressStore.indexNames).sort()).toEqual(['fileKey', 'nextDate'])
    const stateStore = after.transaction('recite_state', 'readonly').objectStore('recite_state')
    expect(stateStore.keyPath).toBe('key')
    expect(Array.from(stateStore.indexNames)).toEqual([]) // 无索引

    // 4) ★ 7 个旧仓库数据一条不丢
    for (const name of Object.keys(V7_ROWS)) {
      const rows = await rawGetAll(after, name)
      expect(rows).toHaveLength(V7_ROWS[name].length)
      expect(rows[0]).toMatchObject(V7_ROWS[name][0])
    }
    // 通过访问器再验一次（证明新代码能正常读旧表）
    const logs = await db.getAllStudyLogs()
    expect(logs.map((r) => r.id)).toEqual(['log-v7-1'])
    const errors = await db.getAllErrors()
    expect(errors.map((r) => r.id)).toEqual(['err-v7-1'])
    after.close()

    // 5) 新仓库开箱可用（空表）
    expect(await db.getReciteProgressAll()).toEqual([])
  })
})

describe('② init 幂等 + 新仓库读写', () => {
  let db

  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    await db.clearAllSyncedData()
  })

  it('连续两次 init() 幂等：连接复用、v8、旧数据不被重建冲掉', async () => {
    await db.saveReciteProgress(reciteRow(KEY_A))
    await db.init()
    await db.init()

    const conn = await rawOpen()
    expect(conn.version).toBe(8)
    conn.close()

    const all = await db.getReciteProgressAll()
    expect(all).toHaveLength(1)
    expect(all[0].key).toBe(KEY_A)
  })

  it('saveReciteProgress / getReciteProgress / getReciteProgressAll 正常工作，且自动盖 updatedAt', async () => {
    await db.saveReciteProgress(reciteRow(KEY_A))
    await db.saveReciteProgress(reciteRow(KEY_B, { stage: 3, nextDate: null }))

    const one = await db.getReciteProgress(KEY_A)
    expect(one.stage).toBe(1)
    expect(typeof one.updatedAt).toBe('string') // dbPut 自动盖戳（与既有仓库一致）

    const all = await db.getReciteProgressAll()
    expect(all.map((r) => r.key).sort()).toEqual([KEY_A, KEY_B])

    // 覆盖写（同 key 覆盖，不新增行）
    await db.saveReciteProgress(reciteRow(KEY_A, { stage: 2 }))
    expect((await db.getReciteProgressAll())).toHaveLength(2)
    expect((await db.getReciteProgress(KEY_A)).stage).toBe(2)
  })

  it('deleteReciteProgressSoft 写 deleted 墓碑（不物理删除），不存在时返回 false', async () => {
    await db.saveReciteProgress(reciteRow(KEY_A))
    expect(await db.deleteReciteProgressSoft(KEY_A)).toBe(true)
    const row = await db.getReciteProgress(KEY_A)
    expect(row).not.toBeNull()
    expect(row.deleted).toBe(true)
    expect(row.learnedAt).toBe('2026-10-26') // 墓碑不抹掉成就字段
    expect(await db.deleteReciteProgressSoft('chinese|nope|9')).toBe(false)
  })

  it('saveReciteProgress 缺 key → 抛错（不写半残行）', async () => {
    await expect(db.saveReciteProgress({ stage: 1 })).rejects.toThrow('行缺少 key')
    await expect(db.saveReciteProgress(null)).rejects.toThrow('行缺少 key')
  })

  it('getReciteState 缺行返回零值结构；saveReciteState 恒写 key=main 单行', async () => {
    expect(await db.getReciteState()).toEqual({
      key: 'main',
      streak: 0,
      maxStreak: 0,
      lastActiveDate: '',
      examDate: '',
      sessionPieceKey: '',
      sessionDate: '',
      sessionStartedAt: 0
    })

    await db.saveReciteState({ key: 'ignored', streak: 3, maxStreak: 5, lastActiveDate: '2026-10-26' })
    expect(await db.getReciteState()).toEqual({
      key: 'main',
      streak: 3,
      maxStreak: 5,
      lastActiveDate: '2026-10-26',
      examDate: '',
      sessionPieceKey: '',
      sessionDate: '',
      sessionStartedAt: 0
    })

    // 覆盖而非追加（单行表）
    await db.saveReciteState({ streak: 4, maxStreak: 5, lastActiveDate: '2026-10-27' })
    expect((await db.getReciteState()).streak).toBe(4)
    const rows = await rawOpen().then(async (c) => {
      try {
        return await rawGetAll(c, 'recite_state')
      } finally {
        c.close()
      }
    })
    expect(rows).toHaveLength(1) // 全表只有一行
    expect(rows[0].key).toBe('main')
  })

  it('recite_state 8 字段读写往返保真；非法类型严格回落零值', async () => {
    const full = {
      key: 'main',
      streak: 4,
      maxStreak: 7,
      lastActiveDate: '2026-10-26',
      examDate: '2026-12-01',
      sessionPieceKey: 'chinese|f|0',
      sessionDate: '2026-10-26',
      sessionStartedAt: 1730000000000
    }
    await db.saveReciteState(full)
    expect(await db.getReciteState()).toEqual(full)

    // 非法类型一律严格回落，不做 Number(v) 宽松强转（NaN / '' 不进库）
    await db.saveReciteState({
      examDate: 123,
      sessionPieceKey: null,
      sessionDate: undefined,
      sessionStartedAt: 'not-a-number'
    })
    expect(await db.getReciteState()).toEqual({
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

describe('③ 换账号清理（上线准入项：不同步 ≠ 不用清）', () => {
  let db

  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    await db.clearAllSyncedData()
  })

  it('clearAllSyncedData() 后背诵进度清空、streak 归零，既有同步仓库仍照旧清空', async () => {
    // 造「学员 A」的进度
    await db.saveReciteProgress(reciteRow(KEY_A))
    await db.saveReciteProgress(reciteRow(KEY_B))
    await db.saveReciteState({ streak: 7, maxStreak: 12, lastActiveDate: '2026-10-26' })
    await db.addStudyLog({ type: 'visit', date: '2026-10-26', subject: 'math' })

    expect((await db.getReciteProgressAll())).toHaveLength(2)
    expect((await db.getReciteState()).streak).toBe(7)

    // 换账号
    await db.clearAllSyncedData()

    // ★ 学员 B 登录后看不到 A 的任何背诵进度
    expect(await db.getReciteProgressAll()).toEqual([])
    expect(await db.getReciteState()).toEqual({
      key: 'main',
      streak: 0,
      maxStreak: 0,
      lastActiveDate: '',
      examDate: '',
      sessionPieceKey: '',
      sessionDate: '',
      sessionStartedAt: 0
    })
    // 既有同步仓库的清空行为未被改动（方法名 / 签名 / SYNC_STORE_NAMES 都不动）
    expect(await db.getAllStudyLogs()).toEqual([])
  })
})

describe('④ 导出 / 导入纳入两张新表', () => {
  let db

  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.init()
    await db.clearAllSyncedData()
  })

  it('exportAllData 含 recite_progress / recite_state（均为数组形式），importAllData 能完整还原', async () => {
    await db.saveReciteProgress(reciteRow(KEY_A, { stage: 2, doneCount: 3 }))
    await db.saveReciteProgress(reciteRow(KEY_B, { stage: 0, nextDate: '2026-10-27', learnedAt: null }))
    await db.saveReciteState({ streak: 6, maxStreak: 9, lastActiveDate: '2026-10-26' })

    const dump = await db.exportAllData()
    expect(dump.version).toBe(8)
    expect(Array.isArray(dump.recite_progress)).toBe(true)
    expect(dump.recite_progress).toHaveLength(2)
    // ★ recite_state 是 `[row]` 数组形式，不是 dict（别与 localStorage 那个对象混了）
    expect(Array.isArray(dump.recite_state)).toBe(true)
    expect(dump.recite_state).toHaveLength(1)
    expect(dump.recite_state[0]).toMatchObject({ key: 'main', streak: 6, maxStreak: 9 })

    // 换机 / 清库
    await db.clearAllSyncedData()
    expect(await db.getReciteProgressAll()).toEqual([])
    expect((await db.getReciteState()).streak).toBe(0)

    // 恢复
    const result = await db.importAllData(dump)
    expect(result.imported.recite_progress).toBe(2)
    expect(result.imported.recite_state).toBe(1)

    const rows = await db.getReciteProgressAll()
    expect(rows).toHaveLength(2)
    const a = rows.find((r) => r.key === KEY_A)
    const b = rows.find((r) => r.key === KEY_B)
    expect(a.stage).toBe(2)
    expect(a.doneCount).toBe(3)
    expect(a.learnedAt).toBe('2026-10-26')
    expect(b.learnedAt).toBeNull()
    expect((await db.getReciteState())).toEqual({
      key: 'main',
      streak: 6,
      maxStreak: 9,
      lastActiveDate: '2026-10-26',
      examDate: '',
      sessionPieceKey: '',
      sessionDate: '',
      sessionStartedAt: 0
    })
  })

  it('老备份（不含两个新键）导入不报错，背诵表保持为空', async () => {
    const legacy = {
      version: 7,
      exportedAt: '2026-10-01T00:00:00.000Z',
      study_log: [{ id: 'log-1', date: '2026-10-01', subject: 'math', type: 'visit' }],
      daily_stats: [],
      page_progress: [],
      error_book: [],
      notes: [],
      bookmarks: [],
      question_attempt: [],
      localStorage: {}
    }
    const r = await db.importAllData(legacy)
    expect(r.imported.study_log).toBe(1)
    expect(await db.getReciteProgressAll()).toEqual([])
    expect((await db.getReciteState()).streak).toBe(0)
    expect((await db.getAllStudyLogs()).map((x) => x.id)).toEqual(['log-1'])
  })
})
