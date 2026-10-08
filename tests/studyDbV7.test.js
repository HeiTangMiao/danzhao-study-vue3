/**
 * studyDb v6 → v7 迁移测试
 * 验证：
 *  - 升级后新增 question_attempt，并预留 S2 的 content_cache / content_meta 两表
 *  - 既有 6 表数据零丢失（沿用旧行 id）
 *  - addAttempts 单事务批写：UUID 主键 + updatedAt；fileKey 索引可用
 *  - setAttemptReason 回写归因
 *
 * 说明：studyDb 的 dbInstance 是文件级单例，故「造 v6 库」的用例必须在本文件最先执行。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStudyDbStore } from '@/stores/studyDb'

const DB = 'study_game_db'

/** 构造一个真实的 v6 数据库（无 question_attempt / content_cache / content_meta） */
function buildV6() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 6)
    req.onerror = () => reject(req.error)
    req.onupgradeneeded = () => {
      const d = req.result
      const log = d.createObjectStore('study_log', { keyPath: 'id' })
      log.createIndex('date', 'date', { unique: false })
      log.createIndex('subject', 'subject', { unique: false })
      log.createIndex('fileKey', 'fileKey', { unique: false })
      d.createObjectStore('daily_stats', { keyPath: 'date' })
      const pp = d.createObjectStore('page_progress', { keyPath: 'key' })
      pp.createIndex('subject', 'subject', { unique: false })
      const eb = d.createObjectStore('error_book', { keyPath: 'id' })
      eb.createIndex('subject', 'subject', { unique: false })
      eb.createIndex('createdAt', 'createdAt', { unique: false })
      eb.createIndex('reviewed', 'reviewed', { unique: false })
      const nt = d.createObjectStore('notes', { keyPath: 'pageKey' })
      nt.createIndex('subject', 'subject', { unique: false })
      nt.createIndex('updatedAt', 'updatedAt', { unique: false })
      const bm = d.createObjectStore('bookmarks', { keyPath: 'pageKey' })
      bm.createIndex('subject', 'subject', { unique: false })
      bm.createIndex('createdAt', 'createdAt', { unique: false })
      d.createObjectStore('user_progress', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
  })
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

async function seedV6() {
  const db = await buildV6()
  const tx = db.transaction(['study_log', 'error_book', 'page_progress'], 'readwrite')
  tx.objectStore('study_log').put({
    id: 'legacy-log-uuid',
    date: '2026-05-01',
    timestamp: 111,
    subject: 'math',
    unitNum: '01',
    fileKey: 'legacy-log',
    action: 'page_visit'
  })
  tx.objectStore('error_book').put({
    id: 'legacy-err-uuid',
    subject: 'math',
    unitNum: '01',
    question: 'legacy-q',
    correctAnswer: 'A',
    userAnswer: 'B',
    explanation: '',
    createdAt: 123,
    createdAtDate: '2026-05-01',
    reviewed: false,
    reviewCount: 0,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: '2026-05-01',
    lastReviewedAt: null
  })
  tx.objectStore('page_progress').put({
    key: 'math_01_01',
    subject: 'math',
    unitNum: '01',
    visited: true,
    visitTime: 1,
    questionsAnswered: 0,
    questionsTotal: 0,
    testScore: null
  })
  await txDone(tx)
  db.close()
}

/** 直接读取底层库当前的对象仓库名集合 */
function rawStoreNames() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB)
    req.onsuccess = () => {
      const names = [...req.result.objectStoreNames]
      req.result.close()
      resolve(names)
    }
    req.onerror = () => reject(req.error)
  })
}

describe('studyDb v6→v7 迁移', () => {
  it('建 question_attempt + 预留 content_cache/content_meta，既有数据零丢失', async () => {
    await seedV6()
    setActivePinia(createPinia())
    const store = useStudyDbStore()
    await store.init() // 触发 v6 → v7 升级

    const names = await rawStoreNames()
    expect(names).toContain('question_attempt')
    expect(names).toContain('content_cache')
    expect(names).toContain('content_meta')

    // 既有数据零丢失（沿用旧行 id）
    const logs = await store.getAllStudyLogs()
    expect(logs.find((l) => l.id === 'legacy-log-uuid')?.subject).toBe('math')
    const errors = await store.getAllErrors()
    expect(errors.find((e) => e.id === 'legacy-err-uuid')?.question).toBe('legacy-q')
    const pages = await store.getAllPageProgress()
    expect(pages.some((p) => p.key === 'math_01_01')).toBe(true)

    // 新表初始为空
    expect(await store.getAllAttempts()).toEqual([])
  })

  it('addAttempts 单事务批写：UUID 主键 + updatedAt + fileKey 索引可用', async () => {
    setActivePinia(createPinia())
    const store = useStudyDbStore()
    await store.init()
    const before = (await store.getAllAttempts()).length

    const written = await store.addAttempts([
      { subject: 'math', fileKey: 'fk-x', questionKey: 'fk-x|q1', source: 'practice', elapsedMs: 1234, timedOut: false },
      { subject: 'math', fileKey: 'fk-x', questionKey: 'fk-x|q2', source: 'practice', elapsedMs: 60000, timedOut: true }
    ])
    expect(written).toHaveLength(2)
    for (const w of written) {
      expect(typeof w.id).toBe('string')
      expect(w.id).toMatch(/-/) // UUID 特征
      expect(typeof w.updatedAt).toBe('string')
    }

    const all = await store.getAllAttempts()
    expect(all.length).toBe(before + 2)
    const byFile = await store.getAttemptsByFileKey('fk-x')
    expect(byFile.length).toBeGreaterThanOrEqual(2)
  })

  it('setAttemptReason 回写归因；addAttempt 单条亦走 UUID', async () => {
    setActivePinia(createPinia())
    const store = useStudyDbStore()
    await store.init()

    const single = await store.addAttempt({
      subject: 'chinese',
      fileKey: 'fk-r',
      questionKey: 'fk-r|q',
      source: 'exam',
      elapsedMs: 50000,
      timedOut: true
    })
    expect(typeof single).toBe('string') // dbAdd 返回主键

    const [row] = await store.addAttempts([
      { subject: 'chinese', fileKey: 'fk-r', questionKey: 'fk-r|q', source: 'exam', elapsedMs: 50000, timedOut: true }
    ])
    await store.setAttemptReason(row.id, '超时蒙猜')
    const rec = (await store.getAllAttempts()).find((a) => a.id === row.id)
    expect(rec.reason).toBe('超时蒙猜')

    // 未命中 id 返回 false
    expect(await store.setAttemptReason('not-exist', '超时蒙猜')).toBe(false)
  })
})
