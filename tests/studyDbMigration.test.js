/**
 * studyDb v5 → v6 迁移测试
 * 验证：旧库（error_book / study_log 为自增主键）升级后
 *  - 历史行原数字 id 保留、内容不丢
 *  - 新 store 关闭自增（后续新增走业务 UUID）
 */
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStudyDbStore } from '@/stores/studyDb'

const DB = 'study_game_db'

/** 构造一个真实的 v5 数据库（自增 error_book / study_log，无 achievements） */
function buildV5() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 5)
    req.onerror = () => reject(req.error)
    req.onupgradeneeded = () => {
      const d = req.result
      const log = d.createObjectStore('study_log', { keyPath: 'id', autoIncrement: true })
      log.createIndex('date', 'date', { unique: false })
      log.createIndex('subject', 'subject', { unique: false })
      log.createIndex('fileKey', 'fileKey', { unique: false })
      d.createObjectStore('daily_stats', { keyPath: 'date' })
      const pp = d.createObjectStore('page_progress', { keyPath: 'key' })
      pp.createIndex('subject', 'subject', { unique: false })
      const eb = d.createObjectStore('error_book', { keyPath: 'id', autoIncrement: true })
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

/** 事务完成辅助 */
function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

async function seedV5() {
  const db = await buildV5()
  const tx = db.transaction(['study_log', 'error_book', 'page_progress'], 'readwrite')
  tx.objectStore('study_log').add({
    date: '2026-05-01',
    timestamp: 111,
    subject: 'math',
    unitNum: '01',
    fileKey: 'legacy-log',
    action: 'page_visit'
  })
  tx.objectStore('error_book').add({
    subject: 'math',
    unitNum: '01',
    question: 'legacy-error-q',
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
  // 真实页面行 + 旧版 recordTest 遗留的合成测验行（应在 v6 升级时被清除）
  tx.objectStore('page_progress').add({
    key: 'math_12_01-考试技巧', subject: 'math', unitNum: '12',
    visited: true, visitTime: 1, questionsAnswered: 0, questionsTotal: 0, testScore: null
  })
  tx.objectStore('page_progress').add({
    key: 'math_unit_12_test', subject: 'math', unitNum: '12',
    visited: true, visitTime: 2, questionsAnswered: 0, questionsTotal: 0, testScore: 60
  })
  await txDone(tx)
  db.close()
}

describe('studyDb v5→v6 迁移', () => {
  it('旧自增行保留原 id 与内容，新 store 关闭自增', async () => {
    await seedV5()
    setActivePinia(createPinia())
    const store = useStudyDbStore()
    await store.init() // 触发 v5 → v6 升级

    const logs = await store.getAllStudyLogs()
    const legacyLog = logs.find((l) => l.fileKey === 'legacy-log')
    expect(legacyLog).toBeTruthy()
    expect(legacyLog.id).toBe(1) // 历史自增 id 原样保留
    expect(legacyLog.subject).toBe('math')

    const errors = await store.getAllErrors()
    const legacyErr = errors.find((e) => e.question === 'legacy-error-q')
    expect(legacyErr).toBeTruthy()
    expect(legacyErr.id).toBe(1)

    // 真实页面行保留；旧版 recordTest 合成测验行（math_unit_12_test）应在 v6 升级时被清理
    const pages = await store.getAllPageProgress()
    expect(pages.some((p) => p.key === 'math_12_01-考试技巧')).toBe(true)
    expect(pages.some((p) => p.key === 'math_unit_12_test')).toBe(false)

    // 迁移后新增记录应走 UUID（若仍是自增，add() 会忽略业务 id 分配数字）
    const r = await store.recordError('math', '01', 'post-mig-q', 'X', 'Y', '')
    expect(typeof r.id).toBe('string')
    expect(r.id).toMatch(/-/)
    await store.deleteError(r.id) // 物理清理
  })
})
