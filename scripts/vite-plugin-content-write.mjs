/**
 * 内容写回插件（阶段 6）—— 开发期把编辑器内容写回 src/content/
 *
 * 为什么必须安全约束：这个中间件能往仓库里写文件，一旦路径可控就是任意文件写入。
 * 因此白名单是**双重**的：
 *  1. subject 必须是 site.js 登记的学科；folder / name 不得含路径分隔符或 `..`
 *  2. 拼出的相对路径必须命中 site.js 注册表（buildMetaIndex 的 key 集合）——
 *     即只能覆盖「已注册的页面文件」，不能新建文件、不能改 site.js 本身
 * 另外：
 *  - `apply: 'serve'` —— 只在 dev server 生效，build 产物里根本不会出现本插件
 *  - 写回前先跑与 CI 同一份语义校验，有错直接 422，不落盘
 *  - 写回使用 serializePage 统一风格，并保留该文件原有的文件头注释
 *
 * 端点：POST /__content-write  { subject, folder, name, blocks }
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { CONTENT_DIR, ROOT, SITE_FILES, buildMetaIndex } from './lib/load-content.mjs'
import { serializePage, extractHeader } from '../src/content/serializePage.js'
import { createBlockValidator } from '../src/utils/validateBlock.js'
import { WRITE_ENDPOINT } from '../src/utils/contentWrite.js'

export { WRITE_ENDPOINT }
/** 请求体上限：内容页远小于它，超出直接拒绝 */
const MAX_BODY = 2 * 1024 * 1024

const SCHEMA = JSON.parse(readFileSync(join(ROOT, 'schema', 'content-schema.json'), 'utf-8'))
const validateBlock = createBlockValidator(SCHEMA)

/**
 * 解析并校验目标路径（纯函数，便于测试）
 * @param {Map<string, object>} registry buildMetaIndex() 的结果（key 形如 `math/01-xxx/01-yyy.js`）
 * @param {{subject?:string, folder?:string, name?:string}} target 请求里的目标信息
 * @returns {string|null} 允许写入的绝对路径；不允许时返回 null
 */
export function resolvePagePath(registry, target) {
  const { subject, folder, name } = target || {}
  if (!SITE_FILES[subject]) return null
  for (const part of [folder, name]) {
    if (typeof part !== 'string' || part === '') return null
    // 路径分隔符 / 上跳 / 盘符 / 通配都拒绝（合法目录名里不会出现这些字符）
    if (/[\\/]|\.\.|:|\*|\?|"/.test(part)) return null
  }
  if (!registry.has(`${subject}/${folder}/${name}.js`)) return null
  return join(CONTENT_DIR, subject, folder, `${name}.js`)
}

/** 读取 JSON 请求体（带上限，避免内存被撑爆） */
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}'))
      } catch (e) {
        reject(new Error(`请求体不是合法 JSON：${e.message}`))
      }
    })
    req.on('error', reject)
  })
}

/** 统一响应 */
function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

/**
 * Vite 插件工厂
 * @returns {import('vite').Plugin}
 */
export function contentWritePlugin() {
  let registryPromise = null
  const registryOf = () => (registryPromise ||= buildMetaIndex())

  return {
    name: 'content-write',
    // 只在 dev server 注册；生产构建不会包含本插件
    apply: 'serve',
    configureServer(server) {
      if (process.env.NODE_ENV === 'production') return
      server.middlewares.use(WRITE_ENDPOINT, async (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { error: '只接受 POST' })
        try {
          const body = await readJson(req)
          const registry = await registryOf()
          const file = resolvePagePath(registry, body)
          if (!file || !existsSync(file)) {
            return send(res, 403, { error: '该页面不在 site.js 注册表中，拒绝写入' })
          }
          if (!Array.isArray(body.blocks)) {
            return send(res, 400, { error: 'blocks 必须是数组' })
          }

          // 与 CI 同一份语义校验：有错不落盘，把错误原样回给编辑器
          const errors = []
          body.blocks.forEach((b, i) => {
            for (const e of validateBlock(b)) errors.push(`区块[${i}] ${e}`)
          })
          if (errors.length) return send(res, 422, { error: '校验未通过，已拒绝写入', errors })

          const next = serializePage(body.blocks, { header: extractHeader(readFileSync(file, 'utf-8')) })
          writeFileSync(file, next, 'utf-8')
          return send(res, 200, {
            ok: true,
            file: file.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, ''),
            lines: next.split('\n').length
          })
        } catch (e) {
          return send(res, 500, { error: e.message })
        }
      })
    }
  }
}

export default contentWritePlugin