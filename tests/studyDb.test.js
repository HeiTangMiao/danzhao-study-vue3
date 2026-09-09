/**
 * studyDb v6 —— 键策略与墓碑测试
 * 覆盖：
 *  - error_book / study_log 新增记录走业务 UUID（不再依赖自增数字键）
 *  - 软删（墓碑）：UI 读取过滤 deleted、原始读取保留墓碑
 *  - 笔记/书签软删同理，且重新保存可覆盖墓碑
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStudyDbStore } from '@/stores/studyDb'

describe('studyDb v6 键与墓碑', () => {
  let store
  const created = { errors: [], notes: [], bookmarks: [] }

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useStudyDbStore()
    await store.init()
  })

  afterEach(async () => {
    // 物理清理本用例创建的数据（deleteNote/deleteBookmark/deleteError 仍为物理删除，供清理用）
    for (const id of created.errors) await store.deleteError(id).catch(() => {})
    for (const pk of created.notes) await store.deleteNote(pk).catch(() => {})
    for (const pk of created.bookmarks) await store.deleteBookmark(pk).catch(() => {})
  })

  it('新增错题主键为 UUID（含连字符，非自增数字）', async () => {
    const r = await store.recordError('math', '01', 'q-uuid-1', 'A', 'B', '解析')
    created.errors.push(r.id)
    expect(typeof r.id).toBe('string')
    expect(r.id).toMatch(/-/) // UUID 特征，自增数字不可能含连字符
    const rec = (await store.getAllErrorsRaw()).find((e) => e.id === r.id)
    expect(rec).toBeTruthy()
    expect(rec.question).toBe('q-uuid-1')
  })

  it('新增学习日志主键为 UUID', async () => {
    await store.addStudyLog({
      date: '2026-01-01',
      timestamp: 987654,
      subject: 'math',
      unitNum: '01',
      fileKey: 'f-log-uuid',
      action: 'page_visit'
    })
    const logs = await store.getAllStudyLogs()
    const lg = logs.find((l) => l.fileKey === 'f-log-uuid')
    expect(lg).toBeTruthy()
    expect(typeof lg.id).toBe('string')
    expect(lg.id).toMatch(/-/)
  })

  it('软删错题：UI 读取过滤、原始读取保留墓碑', async () => {
    const keep = await store.recordError('chinese', '02', 'q-keep', 'C', 'D', 'x')
    const gone = await store.recordError('chinese', '02', 'q-gone', 'E', 'F', 'y')
    created.errors.push(keep.id, gone.id)

    await store.deleteErrorSoft(gone.id)
    const ui = await store.getAllErrors()
    expect(ui.find((e) => e.id === keep.id)).toBeTruthy()
    expect(ui.find((e) => e.id === gone.id)).toBeUndefined()

    const raw = await store.getAllErrorsRaw()
    const tomb = raw.find((e) => e.id === gone.id)
    expect(tomb).toBeTruthy()
    expect(tomb.deleted).toBe(true)
  })

  it('软清空错题：所有现存错题均置墓碑', async () => {
    const a = await store.recordError('computer', '03', 'q-clr-a', '1', '2', '')
    const b = await store.recordError('computer', '03', 'q-clr-b', '3', '4', '')
    created.errors.push(a.id, b.id)

    await store.clearAllErrorsSoft()
    expect(await store.getAllErrors()).toHaveLength(0)
    const raw = await store.getAllErrorsRaw()
    const targets = raw.filter((e) => e.id === a.id || e.id === b.id)
    expect(targets).toHaveLength(2)
    expect(targets.every((e) => e.deleted === true)).toBe(true)
  })

  it('笔记软删后重新保存可覆盖墓碑', async () => {
    const pk = 'note-tomb-resave'
    created.notes.push(pk)
    await store.saveNote({ pageKey: pk, content: '第一版', subject: 'math' })
    await store.deleteNoteSoft(pk)
    expect(await store.getNote(pk)).toBeNull()
    expect((await store.getAllNotesRaw()).find((n) => n.pageKey === pk)?.deleted).toBe(true)

    await store.saveNote({ pageKey: pk, content: '第二版', subject: 'math' })
    const n = await store.getNote(pk)
    expect(n && n.content).toBe('第二版')
    expect((await store.getAllNotesRaw()).find((x) => x.pageKey === pk)?.deleted).toBe(false)
  })

  it('书签软删：取消收藏后 UI 视为未收藏、原始读取保留墓碑', async () => {
    const pk = 'bm-tomb'
    created.bookmarks.push(pk)
    await store.saveBookmark({ pageKey: pk, subject: 'math', title: 't' })
    expect(await store.getBookmark(pk)).toBeTruthy()

    await store.deleteBookmarkSoft(pk)
    expect(await store.getBookmark(pk)).toBeNull()
    expect((await store.getAllBookmarks()).find((b) => b.pageKey === pk)).toBeUndefined()
    expect((await store.getAllBookmarksRaw()).find((b) => b.pageKey === pk)?.deleted).toBe(true)
  })

  it('recordTest 写入真实 fileKey 行，不再生成合成测验行', async () => {
    const realKey = 'math_12_02-真题模拟卷一'
    await store.markPageVisited({
      subject: 'math', unitNum: '12', unitTitle: '模拟冲刺',
      fileKey: realKey, fileTitle: '真题模拟卷一', isTest: true
    })
    const r = await store.recordTest({
      subject: 'math', unitNum: '12', unitTitle: '模拟冲刺',
      fileKey: realKey, fileTitle: '真题模拟卷一',
      earnedPoints: 90, totalPoints: 150
    })
    expect(r.percent).toBe(60)
    const rows = await store.getAllPageProgress()
    const real = rows.find((p) => p.key === realKey)
    expect(real && real.testScore).toBe(60)
    // 不得再出现旧版合成测验行（如 math_unit_12_test）
    expect(rows.some((p) => /^[a-z]+_unit_12_test$/.test(p.key))).toBe(false)
  })

  it('recordAnswered 累加当日统计与本页答题数', async () => {
    const key = 'math_12_02-真题模拟卷一'
    await store.markPageVisited({
      subject: 'math', unitNum: '12', unitTitle: '模拟冲刺',
      fileKey: key, fileTitle: '真题模拟卷一', isTest: true
    })
    await store.recordAnswered(5, { fileKey: key })
    await store.recordAnswered(3, { fileKey: key })
    const row = (await store.getAllPageProgress()).find((p) => p.key === key)
    expect(row.questionsAnswered).toBe(8)
    const stats = await store.getAllDailyStats()
    expect(stats.some((s) => (s.questionsAnswered || 0) >= 8)).toBe(true)
  })
})
