/**
 * 内容快照 / 清单的形状定义测试（批 S1）
 *
 * 职责：钉死 `src/content/contentManifest.js` 的路径 / 键 / 常量 —— 这些值一旦漂移，
 *      发布脚本写出的分片与未来 S2 浏览器 loader 要 fetch 的路径就会对不上，
 *      属于「静默失败」类缺陷（fetch 404 / 算不出同一个 hash），必须在单测层拦下。
 *
 * 风格照 searchIndex.js / practiceBank.js 的形状定义测试：只断言**契约**，不碰内容。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  SCHEMA_VERSION, CONTENT_VERSION, OPTIONAL_SECTIONS, SHARD_WARN_BYTES,
  REMOTE_DIR, MANIFEST_PATH, shardPath, unitKeyOf, pageKeyOf, OP, HASH_PREFIX
} from '@/content/contentManifest'

const SRC = readFileSync(join(process.cwd(), 'src', 'content', 'contentManifest.js'), 'utf-8')

describe('contentManifest · 版本与常量', () => {
  it('SCHEMA_VERSION 与 CONTENT_VERSION 存在且为正整数', () => {
    expect(Number.isInteger(SCHEMA_VERSION)).toBe(true)
    expect(SCHEMA_VERSION).toBeGreaterThan(0)
    expect(Number.isInteger(CONTENT_VERSION)).toBe(true)
    expect(CONTENT_VERSION).toBeGreaterThan(0)
  })

  it('OPTIONAL_SECTIONS 为 S5+ 预留的 search / practice（当下不产出）', () => {
    expect(OPTIONAL_SECTIONS).toEqual(['search', 'practice'])
  })

  it('SHARD_WARN_BYTES 为正整数阈值（字节）', () => {
    expect(Number.isInteger(SHARD_WARN_BYTES)).toBe(true)
    expect(SHARD_WARN_BYTES).toBeGreaterThan(0)
  })

  it('hash 统一带 sha256: 前缀', () => {
    expect(HASH_PREFIX).toBe('sha256:')
  })
})

describe('contentManifest · 路径契约', () => {
  it('REMOTE_DIR 与 MANIFEST_PATH 一致（清单在远程根目录下一层）', () => {
    expect(REMOTE_DIR).toBe('content-remote')
    expect(MANIFEST_PATH).toBe('content-remote/manifest.json')
    expect(MANIFEST_PATH.startsWith(`${REMOTE_DIR}/`)).toBe(true)
  })

  it('shardPath 产出 public/ 下的分片相对路径（一单元一片，P-S03 a）', () => {
    expect(shardPath('math', '01')).toBe('content-remote/math/01.json')
    expect(shardPath('chinese', '07')).toBe('content-remote/chinese/07.json')
  })

  it('shardPath 不带 public/ 前缀（调用方负责拼 PUBLIC_DIR）', () => {
    expect(shardPath('math', '01')).not.toMatch(/^public\//)
  })
})

describe('contentManifest · 键函数（与 searchIndex / practiceBank 同款风格）', () => {
  it('unitKeyOf = 学科/单元号（全局唯一）', () => {
    expect(unitKeyOf({ subject: 'math', unitNum: '01' })).toBe('math/01')
    expect(unitKeyOf({ subject: 'computer', unitNum: '05' })).toBe('computer/05')
  })

  it('pageKeyOf = 单元号/页下标（单元内唯一；与 bodyKeyOf / practiceKeyOf 同款）', () => {
    expect(pageKeyOf({ unitNum: '01', fileIndex: 0 })).toBe('01/0')
    expect(pageKeyOf({ unitNum: '07', fileIndex: 3 })).toBe('07/3')
  })

  it('pageKeyOf 与 unitKeyOf 语义分离：页键不含学科前缀', () => {
    // 页键位于单元分片内部，学科已由分片路径表达；加前缀会让 S2 拼键时重复
    expect(pageKeyOf({ unitNum: '01', fileIndex: 0 })).not.toContain('math')
  })
})

describe('contentManifest · op 常量（协议取值白名单）', () => {
  it('OP 含 upsert（B1 实际产出）与 append（B2 预留）', () => {
    expect(OP.UPSERT).toBe('upsert')
    expect(OP.APPEND).toBe('append')
  })

  it('op 取值不含空串 / 未定义（客户端分支不得走空）', () => {
    for (const v of Object.values(OP)) {
      expect(typeof v).toBe('string')
      expect(v.length).toBeGreaterThan(0)
    }
  })
})

describe('contentManifest · 零 import 硬约束（§5）', () => {
  /** 去注释后判定：注释里出现 import 字样属说明，不是依赖 */
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

  it('源码（去注释后）不含任何 import / require —— 否则会把浏览器侧代码拖进 Node 构建进程', () => {
    const src = strip(SRC)
    expect(src).not.toMatch(/\bimport\b/)
    expect(src).not.toMatch(/\brequire\s*\(/)
  })

  it('只靠 export 暴露契约（纯 ESM 数据模块）', () => {
    const src = strip(SRC)
    expect(src).toMatch(/export const SCHEMA_VERSION/)
    expect(src).toMatch(/export function shardPath/)
    expect(src).toMatch(/export function unitKeyOf/)
    expect(src).toMatch(/export function pageKeyOf/)
  })
})
