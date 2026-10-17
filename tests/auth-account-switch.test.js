// @vitest-environment jsdom
/**
 * 换账号本地数据隔离（对应 project-assessment-2026-10-17.md Top 1）
 *
 * 背景：IndexedDB 是单库无用户维度，登出只清 token 不清数据。若不隔离，
 * A 退出后 B 登录同一设备，A 的错题/笔记/书签/学习记录会立即对 B 可见，
 * 且首次同步会以 B 的 user_id 全量推上服务端（隐私 + 数据完整性缺陷）。
 *
 * 覆盖：
 *  ① A 首次登录 → 记录数据归属，不清任何东西
 *  ② 同账号再次 setSession（登出后重登 / 刷新恢复）→ **数据必须保留**（不能误清）
 *  ③ ★ 换账号 B 登录 → A 的同步仓库数据被清空，归属改为 B
 *  ④ 未登录态 setSession（user 无 id）→ 不清（无归属可比）
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useStudyDbStore } from '@/stores/studyDb'

describe('换账号本地数据隔离', () => {
  let auth
  let db

  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    auth = useAuthStore()
    db = useStudyDbStore()
    await db.init()
  })

  it('① A 首次登录：写入数据并记录归属', async () => {
    await auth.setSession({ user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' })
    await db.saveNote({ pageKey: 'p1', content: 'A 的笔记' })

    expect(await db.getNote('p1')).not.toBeNull()
    expect(localStorage.getItem('local_data_owner')).toBe('u1')
  })

  it('② 同账号再次 setSession（登出后重登）：数据必须保留，不能误清', async () => {
    await auth.setSession({ user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' })
    await db.saveNote({ pageKey: 'p1', content: 'A 的笔记' })
    await db.saveBookmark({ pageKey: 'p1', subject: 'math', title: 't' })

    // 同账号重新登录（模拟登出后再登同一账号 / 刷新恢复）
    const ret = auth.setSession({ user: { id: 'u1' }, accessToken: 'a2', refreshToken: 'r2' })
    expect(ret, '同账号不应触发清库（应返回 undefined）').toBeUndefined()

    expect(await db.getNote('p1')).not.toBeNull()
    expect(await db.getBookmark('p1')).not.toBeNull()
    expect(localStorage.getItem('local_data_owner')).toBe('u1')
  })

  it('③ ★ 换账号 B 登录：A 的同步数据被清空，归属改为 B', async () => {
    await auth.setSession({ user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' })
    await db.saveNote({ pageKey: 'p1', content: 'A 的笔记' })
    await db.saveBookmark({ pageKey: 'p1', subject: 'math', title: 't' })
    await db.addError({ id: 'e1', question: 'A 的错题' })

    // B 登录：应触发清库，返回 Promise
    const ret = auth.setSession({ user: { id: 'u2' }, accessToken: 'b', refreshToken: 'r' })
    expect(ret, '换账号应返回清库 Promise').toBeInstanceOf(Promise)
    await ret

    // A 的数据一个都不该留给 B
    expect(await db.getNote('p1')).toBeNull()
    expect(await db.getBookmark('p1')).toBeNull()
    expect(await db.getAllErrorsRaw()).toHaveLength(0)
    // 归属已转交 B
    expect(localStorage.getItem('local_data_owner')).toBe('u2')
    expect(auth.user.id).toBe('u2')
  })

  it('④ 未登录态（user 无 id）setSession：不清数据', async () => {
    await auth.setSession({ user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' })
    await db.saveNote({ pageKey: 'p1', content: 'A 的笔记' })

    const ret = auth.setSession({ user: null, accessToken: '', refreshToken: '' })
    expect(ret).toBeUndefined()
    expect(await db.getNote('p1')).not.toBeNull()
  })
})
