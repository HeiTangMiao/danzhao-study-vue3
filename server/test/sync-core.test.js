/**
 * 同步冲突裁决单元测试（node:test）
 * 运行：npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldAccept, toDate, parseSince } from '../src/sync-core.js'

const T1 = '2026-01-01T00:00:00.000Z'
const T2 = '2026-01-02T00:00:00.000Z'

test('toDate：合法字符串可解析', () => {
  assert.equal(toDate(T1).getTime(), new Date(T1).getTime())
})

test('toDate：非法输入退回最早时间（不抛异常）', () => {
  assert.equal(toDate('garbage').getTime(), new Date('1970-01-01T00:00:00.000Z').getTime())
  assert.equal(toDate(undefined).getTime(), new Date('1970-01-01T00:00:00.000Z').getTime())
})

test('无现有记录（新增）→ 接受推送', () => {
  assert.equal(shouldAccept(null, T1), true)
  assert.equal(shouldAccept(undefined, T1), true)
})

test('客户端时间更新 → 接受推送（覆盖）', () => {
  assert.equal(shouldAccept(T1, T2), true)
})

test('客户端时间相同 → 不接受（避免无谓覆盖）', () => {
  assert.equal(shouldAccept(T2, T2), false)
})

test('客户端时间更旧 → 不接受（服务端已更新）', () => {
  assert.equal(shouldAccept(T2, T1), false)
})

test('非法 incoming：视为最早时间，比现有旧 → 拒绝', () => {
  assert.equal(shouldAccept(T2, 'garbage'), false)
})

test('非法 incoming：无现有记录 → 仍接受（作为新增）', () => {
  assert.equal(shouldAccept(null, 'garbage'), true)
})

// ===== parseSince（keyset 游标解析）=====

test('parseSince：空 / null → null（全量拉取）', () => {
  assert.equal(parseSince(null), null)
  assert.equal(parseSince(undefined), null)
  assert.equal(parseSince(''), null)
})

test('parseSince：字符串游标 → legacy 含下界模式', () => {
  const r = parseSince(T1)
  assert.equal(r.legacy, true)
  assert.equal(r.ts.getTime(), new Date(T1).getTime())
})

test('parseSince：对象游标 { ts, key } → keyset 模式', () => {
  const r = parseSince({ ts: T2, key: 'abc' })
  assert.equal(r.legacy, false)
  assert.equal(r.ts.getTime(), new Date(T2).getTime())
  assert.equal(r.key, 'abc')
})

test('parseSince：对象缺 key → key 归一为空串', () => {
  const r = parseSince({ ts: T1 })
  assert.equal(r.key, '')
})

test('parseSince：非法时间归一为最早时间（不抛异常）', () => {
  const r = parseSince({ ts: 'garbage', key: 'x' })
  assert.equal(r.ts.getTime(), new Date('1970-01-01T00:00:00.000Z').getTime())
})
