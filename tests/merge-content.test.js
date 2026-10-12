/**
 * 内容合并裁决纯函数测试（批 S2 · 提交①）
 *
 * 职责：钉死三条裁决规则（红线 3）：
 *   ① 页面级：同坐标**远程 > 内置**（pickPage）
 *   ② 哈希：形态不符或摘要不符 → false（verifyHash）
 *   ③ 版本闸门：**严格大于**（等值与更旧一律不写 —— 杜绝回退事故）
 *
 * 风格：纯函数 → 注入式 fixture，不读盘、不 mock fetch、不需要 fake-indexeddb
 * （`public/content-remote/` 已被 S1 写进 .gitignore，干净工作树里没有产物）。
 */
import { describe, it, expect } from 'vitest'
import {
  pickPage, verifyHash, isNewer, isWellFormedHash, isUsablePage
} from '@/content/mergeContent'
import { HASH_PREFIX } from '@/content/contentManifest'

/** 合法形态的哈希（64 位小写十六进制） */
const H1 = HASH_PREFIX + 'a'.repeat(64)
const H2 = HASH_PREFIX + 'b'.repeat(64)

/** 构造一个可渲染的页面源 */
const pageOf = (types) => ({ blocks: types.map((type) => ({ type, text: type })) })

describe('pickPage · 页面级优先级（远程 > 内置）', () => {
  it('远程可用 → 取远程，且只把 blocks 交给 hydratePage', () => {
    const remote = pageOf(['text', 'quiz'])
    const builtin = pageOf(['text'])
    expect(pickPage(builtin, remote)).toEqual({ blocks: remote.blocks })
  })

  it('远程为 null → 回落内置（内置原样返回）', () => {
    const builtin = pageOf(['text'])
    expect(pickPage(builtin, null)).toBe(builtin)
  })

  it('内置未加载（null）+ 远程命中 → 仍取远程，不触发内置 import', () => {
    const remote = pageOf(['text'])
    expect(pickPage(null, remote)).toEqual({ blocks: remote.blocks })
  })

  it('远程结构不可用（blocks 非数组）→ 回落内置', () => {
    const builtin = pageOf(['text'])
    expect(pickPage(builtin, { blocks: 'oops' })).toBe(builtin)
  })

  it('远程某块缺 type → 视为不可用 → 回落内置', () => {
    const builtin = pageOf(['text'])
    expect(pickPage(builtin, { blocks: [{ text: '无 type' }] })).toBe(builtin)
  })

  it('两侧都不可用 → null（由调用方决定降级，不抛）', () => {
    expect(pickPage(null, null)).toBeNull()
    expect(pickPage({ title: '无 blocks' }, { blocks: null })).toBeNull()
  })
})

describe('isUsablePage · 轻量结构校验（P-S17 a）', () => {
  it('blocks 是数组且每项带字符串 type → 可用', () => {
    expect(isUsablePage(pageOf(['text', 'quiz']))).toBe(true)
  })

  it('空 blocks 数组也算可用（页面可以没有区块）', () => {
    expect(isUsablePage({ blocks: [] })).toBe(true)
  })

  it('blocks 非数组 / 源为 null / 块缺 type → 不可用', () => {
    expect(isUsablePage({ blocks: {} })).toBe(false)
    expect(isUsablePage(null)).toBe(false)
    expect(isUsablePage({ blocks: [{ type: 3 }] })).toBe(false)
  })
})

describe('isWellFormedHash · 哈希形态检查', () => {
  it(`带 ${HASH_PREFIX} 前缀 + 64 位十六进制 → 合法`, () => {
    expect(isWellFormedHash(H1)).toBe(true)
  })

  it('缺前缀 / 摘要长度不对 / 非十六进制字符 → 非法', () => {
    expect(isWellFormedHash('a'.repeat(64))).toBe(false)
    expect(isWellFormedHash(HASH_PREFIX + 'a'.repeat(63))).toBe(false)
    expect(isWellFormedHash(HASH_PREFIX + 'z'.repeat(64))).toBe(false)
    expect(isWellFormedHash(null)).toBe(false)
    expect(isWellFormedHash(42)).toBe(false)
  })
})

describe('verifyHash · 逐页哈希比对', () => {
  it('两侧合法且完全相等 → true', () => {
    expect(verifyHash({ hash: H1 }, H1)).toBe(true)
  })

  it('摘要不符 → false', () => {
    expect(verifyHash({ hash: H1 }, H2)).toBe(false)
  })

  it('前缀不符（换算法 / 裸摘要）→ false', () => {
    expect(verifyHash({ hash: 'a'.repeat(64) }, 'a'.repeat(64))).toBe(false)
    expect(verifyHash({ hash: H1 }, H1.slice(HASH_PREFIX.length))).toBe(false)
  })

  it('页面缺 hash / 期望值为空 → false（不抛）', () => {
    expect(verifyHash({ blocks: [] }, H1)).toBe(false)
    expect(verifyHash({ hash: H1 }, null)).toBe(false)
    expect(verifyHash(null, H1)).toBe(false)
  })
})

describe('isNewer · 版本闸门（严格大于）', () => {
  it('远程更新 → true', () => {
    expect(isNewer(3, 2)).toBe(true)
  })

  it('等值 → false（同版本不重写缓存）', () => {
    expect(isNewer(2, 2)).toBe(false)
  })

  it('更旧 → false（旧版一律不写，前进式回滚）', () => {
    expect(isNewer(1, 2)).toBe(false)
  })

  it('本地无记录（null / undefined）→ 任何有限版本号都算新版', () => {
    expect(isNewer(1, null)).toBe(true)
    expect(isNewer(1, undefined)).toBe(true)
  })

  it('本地为 0 → 只有 >0 的版本号算新版', () => {
    expect(isNewer(1, 0)).toBe(true)
    expect(isNewer(0, 0)).toBe(false)
  })

  it('远程版本号不可解析 → false（保守，不写）', () => {
    expect(isNewer('v2', 1)).toBe(false)
    expect(isNewer(null, 1)).toBe(false)
    expect(isNewer(undefined, 1)).toBe(false)
  })

  it('字符串数字与数字可比较（JSON 里可能是字符串）', () => {
    expect(isNewer('3', 2)).toBe(true)
    expect(isNewer('2', 2)).toBe(false)
  })
})
