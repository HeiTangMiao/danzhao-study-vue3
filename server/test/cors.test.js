/**
 * CORS 口径测试（对应 project-assessment-2026-10-17.md 改进项「CORS 空表放行」）
 *
 * 背景：原逻辑 `allowedOrigins.length === 0 → 放行任意来源`。而 index.js 的
 * ALLOWED_ORIGINS 由 `process.env.ALLOWED_ORIGIN` split + filter(Boolean) 得到——
 * 线上若把该环境变量配成空串，结果正是空数组，于是一次配置失误就让服务
 * **静默对所有来源开放**（无任何报错）。
 *
 * 修法：区分「未显式配置」（null，本地/测试便利，放行）与「显式配成空」
 * （[]，拒绝一切跨域）。
 *
 * 运行：node --test server/test/cors.test.js
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'

const ORIGIN = 'https://evil.example.com'

/** 发一个带 Origin 的 GET，返回响应头里的 access-control-allow-origin */
async function probe(app, origin = ORIGIN) {
  const res = await app.inject({
    method: 'GET',
    url: '/api/health',
    headers: origin ? { origin } : {}
  })
  return res.headers['access-control-allow-origin']
}

let appUnconfigured
let appEmptyList
let appWhitelist

before(async () => {
  appUnconfigured = await createApp({ jwtSecret: 't' })                    // 未显式传 → null
  appEmptyList = await createApp({ jwtSecret: 't', allowedOrigins: [] })   // 显式空表
  appWhitelist = await createApp({
    jwtSecret: 't',
    allowedOrigins: ['https://ok.example.com']
  })
})

after(async () => {
  await Promise.all([appUnconfigured.close(), appEmptyList.close(), appWhitelist.close()])
})

test('未显式配置白名单（null）→ 放行任意来源（本地/测试便利）', async () => {
  assert.equal(await probe(appUnconfigured), ORIGIN)
})

test('★ 显式空数组 → 拒绝一切跨域（防线上配错 ALLOWED_ORIGIN 而静默开放）', async () => {
  assert.equal(await probe(appEmptyList), undefined)
})

test('白名单命中 → 放行', async () => {
  assert.equal(await probe(appWhitelist, 'https://ok.example.com'), 'https://ok.example.com')
})

test('白名单未命中 → 拒绝', async () => {
  assert.equal(await probe(appWhitelist, ORIGIN), undefined)
})

test('无 Origin（同源/服务端请求）→ 一律放行，即使白名单未命中', async () => {
  // 不带 origin 头时 @fastify/cors 不回写 CORS 头，故断言「没有拒绝」：
  // 表现是请求本身成功（status 200），而不是被 CORS 拦掉。
  const res = await appWhitelist.inject({ method: 'GET', url: '/api/health' })
  assert.equal(res.statusCode, 200)
})
