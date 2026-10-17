/**
 * 笔记域（notes）数据访问 —— 自 studyDb.js 拆出（2026-10-18，god module 拆分第一刀）
 *
 * 拆出纪律（后续 bookmarks / attempts / content_cache 等域照此办理）：
 *  - **对外行为逐字不变**：软删墓碑过滤口径、dbPut 自动盖 updatedAt、物理删仅限同步清理
 *    —— 全部由调用方传入的 db 辅助对象承担，本模块不自己碰 IndexedDB。
 *  - 因此**调用方（store 方法）与既有测试零改动**，拆分纯粹是代码搬家。
 *  - 只依赖 db 辅助对象，不 import store、不引入跨域调用，保证可独立阅读与测试。
 *
 * @param {Object} db 数据访问辅助，需含 get(store,key) / put(store,data) / del(store,key) / getAll(store)
 */

/** 获取某页笔记（软删墓碑视为无笔记） */
export async function getNote(db, pageKey) {
  const rec = await db.get('notes', pageKey)
  return rec && !rec.deleted ? rec : null
}

/** 保存 / 更新笔记（覆盖先前墓碑；对象须含 pageKey） */
export async function saveNote(db, note) {
  return db.put('notes', { ...note, deleted: false })
}

/** 软删笔记：置 deleted 墓碑，跨设备传播删除（清空正文即触发） */
export async function deleteNoteSoft(db, pageKey) {
  const rec = await db.get('notes', pageKey)
  if (rec && !rec.deleted) await db.put('notes', { ...rec, deleted: true })
}

/** 物理删除笔记（仅供同步清理使用；UI 删除用 deleteNoteSoft） */
export async function deleteNote(db, pageKey) {
  return db.del('notes', pageKey)
}

/** 获取全部笔记（软删墓碑已过滤） */
export async function getAllNotes(db) {
  return (await db.getAll('notes')).filter((n) => !n.deleted)
}

/** 获取全部笔记（含软删墓碑；仅供同步推送使用） */
export async function getAllNotesRaw(db) {
  return db.getAll('notes')
}
