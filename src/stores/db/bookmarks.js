/**
 * 书签域（bookmarks）数据访问 —— 自 studyDb.js 拆出（2026-10-18，第二刀）
 *
 * 与 notes 域同构：软删墓碑过滤口径、物理删仅限同步清理，均由调用方传入的 db 辅助对象承担。
 * 拆出纪律见 ./notes.js 文件头。
 */

/** 获取某页书签（软删墓碑视为未收藏） */
export async function getBookmark(db, pageKey) {
  const rec = await db.get('bookmarks', pageKey)
  return rec && !rec.deleted ? rec : null
}

/** 保存书签（覆盖先前墓碑） */
export async function saveBookmark(db, bookmark) {
  return db.put('bookmarks', { ...bookmark, deleted: false })
}

/** 软删书签：置 deleted 墓碑，跨设备传播删除（取消收藏即触发） */
export async function deleteBookmarkSoft(db, pageKey) {
  const rec = await db.get('bookmarks', pageKey)
  if (rec && !rec.deleted) await db.put('bookmarks', { ...rec, deleted: true })
}

/** 物理删除书签（仅供同步清理使用；UI 删除用 deleteBookmarkSoft） */
export async function deleteBookmark(db, pageKey) {
  return db.del('bookmarks', pageKey)
}

/** 获取全部书签（软删墓碑已过滤） */
export async function getAllBookmarks(db) {
  return (await db.getAll('bookmarks')).filter((b) => !b.deleted)
}

/** 获取全部书签（含软删墓碑；仅供同步推送使用） */
export async function getAllBookmarksRaw(db) {
  return db.getAll('bookmarks')
}
