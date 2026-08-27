/**
 * 同步冲突裁决纯函数（与数据库解耦，便于单元测试）
 */

/** 归一化为合法 Date（非法输入退回最早时间，避免崩溃） */
export function toDate(v) {
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? new Date('1970-01-01T00:00:00.000Z') : d
}

/**
 * LWW（最后写入胜出）裁决：判断客户端推送是否应覆盖服务器现有记录
 * @param {string|null|undefined} existingUpdatedAt - 服务端已有记录的 updated_at（无则视为新增）
 * @param {*} incomingUpdatedAt - 客户端本次推送的 updatedAt
 * @returns {boolean} true=接受推送（覆盖/新增），false=丢弃（服务端已更新或相等）
 */
export function shouldAccept(existingUpdatedAt, incomingUpdatedAt) {
  if (existingUpdatedAt == null) return true
  return toDate(incomingUpdatedAt).getTime() > toDate(existingUpdatedAt).getTime()
}
