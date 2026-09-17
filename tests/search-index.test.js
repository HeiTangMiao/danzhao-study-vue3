/**
 * 搜索索引生成契约测试（阶段 7.4 两级化）
 *
 * 背景：旧索引把每页正文截断到 800 字符且不告警，实测 139/139 条都恰好停在 800、
 *      中位页面正文 3387 字符 —— 77% 的内容搜不到，且没有任何信号。
 * 职责（三条都是「静默失败」的守卫）：
 *  - meta 只含条目渲染与匹配所需字段（keyword 化的正文不得回流）
 *  - 分片键规则两端一致：每条 meta 都能在对应学科分片里按 bodyKeyOf 找到正文
 *  - 页面尾部的内容真的搜得到（端到端取正文尾部的词回搜本页）
 *  - 超过上限的页面必须被点名（不静默截断）
 */
import { describe, it, expect } from 'vitest'
import { collectIndex, capBody } from '../scripts/build-search-index.mjs'
import { BODY_LIMIT, META_FILE, bodyShardPath, bodyKeyOf } from '@/content/searchIndex'
import { matchSearch, prepareSearchIndex } from '@/utils/search'
import { CONTENT_DIR, collectFiles } from '../scripts/lib/load-content.mjs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const { meta, bodies, truncated, unregistered } = await collectIndex()

/** meta 允许出现的字段（多余字段会让 meta 体积失控地涨回去） */
const META_FIELDS = ['subject', 'unitNum', 'fileIndex', 'unitTitle', 'title', 'subtitle', 'isTest']

describe('索引形状', () => {
  it('meta 覆盖全部内容页，且字段被收敛', () => {
    expect(meta.length).toBe(collectFiles(CONTENT_DIR).length)
    expect(meta.length).toBeGreaterThan(100)
    for (const m of meta) {
      expect(Object.keys(m).filter((k) => !META_FIELDS.includes(k)), `${m.title} 含多余字段`).toEqual([])
      expect(m).not.toHaveProperty('keywords')
      expect(typeof m.title).toBe('string')
      expect(typeof m.unitNum).toBe('string')
      expect(typeof m.fileIndex).toBe('number')
    }
  })

  it('每个学科都有正文分片，且分片内条目数与 meta 一一对应', () => {
    for (const subject of ['math', 'chinese', 'computer']) {
      const inMeta = meta.filter((m) => m.subject === subject)
      const shard = bodies[subject]
      expect(inMeta.length, `${subject} 无 meta 条目`).toBeGreaterThan(0)
      expect(shard, `${subject} 缺正文分片（${bodyShardPath(subject)}）`).toBeTruthy()
      expect(Object.keys(shard).length).toBe(inMeta.length)
      for (const m of inMeta) {
        expect(shard[bodyKeyOf(m)], `${subject}/${bodyKeyOf(m)} 缺正文`).toBeTypeOf('string')
      }
    }
  })

  it('没有未注册文件混进来（有的话构建日志也已点名）', () => {
    expect(unregistered).toEqual([])
  })

  it('没有任何页面被截断（超限必须显式处理，不能静默丢内容）', () => {
    // 若这条失败：要么提高 src/content/searchIndex.js 的 BODY_LIMIT，
    // 要么把该页拆成多页 —— 不要默默接受截断
    expect(
      truncated,
      `以下页面正文超过 ${BODY_LIMIT} 字符：${truncated.map((t) => `${t.rel}(${t.len})`).join(', ')}`
    ).toEqual([])
  })
})

describe('截断必报告（注入小上限验证整条链）', () => {
  it('注入 500 字符上限时：每页都被截断，且逐页点名（不静默）', async () => {
    const small = await collectIndex({ limit: 500 })
    // 今天最短的页面也超过 500，故应「全部」被截断并逐个报告
    expect(small.truncated.length).toBe(small.meta.length)
    expect(small.truncated.every((t) => t.rel.endsWith('.js') && t.len > 500)).toBe(true)
    for (const m of small.meta) {
      expect(small.bodies[m.subject][bodyKeyOf(m)].length, `${m.title} 未按注入上限截断`).toBe(500)
    }
  })
})

describe('capBody - 截断逻辑本身', () => {
  it('未超限原样返回', () => {
    const { text, truncated: cut } = capBody('内'.repeat(BODY_LIMIT))
    expect(cut).toBe(false)
    expect(text.length).toBe(BODY_LIMIT)
  })

  it('超限时截断并报告（构建脚本据此 console.warn 点名文件）', () => {
    const { text, truncated: cut } = capBody('内'.repeat(BODY_LIMIT + 1))
    expect(cut).toBe(true)
    expect(text.length).toBe(BODY_LIMIT)
  })

  it('上限远大于旧索引的 800（否则等于没改）', () => {
    expect(BODY_LIMIT).toBeGreaterThan(800)
  })
})

describe('端到端：页面尾部的内容真的搜得到', () => {
  it('取每页正文尾部的词回搜，本页必在命中里', () => {
    const misses = []
    for (const subject of Object.keys(bodies)) {
      const shard = bodies[subject]
      const inMeta = meta.filter((m) => m.subject === subject)
      const prepared = prepareSearchIndex(inMeta, shard)
      for (const m of inMeta) {
        const body = shard[bodyKeyOf(m)]
        if (body.length < 1000) continue // 太短的页面尾部词无区分度
        const tail = body.slice(-14, -4).trim()
        if (!tail) continue
        const hits = matchSearch(prepared, tail, { limit: 200, bodies: shard })
        if (!hits.some((h) => h.unitNum === m.unitNum && h.fileIndex === m.fileIndex)) {
          misses.push(`${subject}/${bodyKeyOf(m)} 尾部词「${tail}」搜不到`)
        }
      }
    }
    expect(misses).toEqual([])
  })
})

describe('产物体积（构建日志里的 prebuild 落盘）', () => {
  it('生成的 meta 文件远小于旧的单文件索引（旧为 241 KB）', () => {
    // 该断言依赖 public/ 下的产物，故在产物缺失时跳过（CI 上由 prebuild 生成）
    let raw
    try {
      raw = readFileSync(join(process.cwd(), 'public', META_FILE), 'utf-8')
    } catch {
      return
    }
    expect(raw.length).toBeLessThan(30 * 1024)
    expect(JSON.parse(raw).length).toBe(meta.length)
  })
})