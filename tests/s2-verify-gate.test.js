// @vitest-environment node
/**
 * 批 S2 · 独立证伪 · 攻点① 版本闸门 / 攻点⑦ P-S16 基址派生 / 攻点⑩ 非 UPSERT 静默忽略
 *
 * 均为**纯函数层**攻击（不 fetch、不碰 IDB），用边界矩阵 + 反例去打，不复跑既有用例。
 *
 * ① isNewer 严格大于：等值/更旧一律不写；首次允许；不可解析（NaN）一律不写；
 *    额外打「字典序陷阱」（'9' vs '10'）——若实现退化成字符串比较会立刻现形。
 * ⑦ contentRootFrom：绝对模式必须取 new URL(API_BASE).origin 剥掉 /api（否则落到
 *    nginx 反代给 Fastify 的路由下稳定 404）；相对模式 ./content-remote；端口保留。
 * ⑩ buildShardEntry：非 UPSERT（append）静默忽略 → 该坐标回落内置；全 append → 整片 null。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { isNewer, isUsablePage, isWellFormedHash, pickPage, verifyHash } from '@/content/mergeContent'
import { contentRootFrom, isValidManifest, buildShardEntry } from '@/utils/contentClient'
import { SCHEMA_VERSION, OP, HASH_PREFIX, REMOTE_DIR } from '@/content/contentManifest'

setActivePinia(createPinia())

const H = (c = 'a') => HASH_PREFIX + c.repeat(64)

describe('S2 · 攻点① isNewer 严格大于（红线 3）', () => {
  it('等值 → 不写；更旧 → 不写；更新 → 写', () => {
    expect(isNewer(5, 5)).toBe(false) // 等值
    expect(isNewer(4, 5)).toBe(false) // 更旧
    expect(isNewer(6, 5)).toBe(true) // 更新
  })

  it('本地无记录（null / undefined）→ 首次允许写入', () => {
    expect(isNewer(1, null)).toBe(true)
    expect(isNewer(1, undefined)).toBe(true)
  })

  it('远程版本号不可解析 → 一律不写（保守）', () => {
    for (const bad of ['abc', NaN, Infinity, -Infinity, {}, [], null, undefined]) {
      expect(isNewer(bad, 1), `remote=${String(bad)} 应不写`).toBe(false)
      expect(isNewer(bad, null), `remote=${String(bad)} 无本地记录也应不写`).toBe(false)
    }
  })

  it('字典序陷阱：字符串形态必须按数值比，不能按字典序', () => {
    // 若实现退化成 remoteVer > maxSeen 的字符串比较：'9' > '10' 为真 → 旧版被误判为新版
    expect(isNewer('9', '10')).toBe(false)
    expect(isNewer('10', '9')).toBe(true)
    expect(isNewer('2', '10')).toBe(false)
    expect(isNewer('100', '99')).toBe(true)
  })

  it('本地记录为字符串（IDB 可能存成字符串）仍按数值比', () => {
    expect(isNewer(5, '4')).toBe(true)
    expect(isNewer(5, '6')).toBe(false)
    expect(isNewer('5', '5')).toBe(false)
  })

  it('边界：负版本号 / 小数版本号按数值语义处理', () => {
    expect(isNewer(-1, 0)).toBe(false)
    expect(isNewer(0.5, 0.4)).toBe(true)
  })
})

describe('S2 · 攻点⑦ P-S16 基址派生（强制修正）', () => {
  it('相对模式 → ./content-remote', () => {
    expect(contentRootFrom('https://anything/api', false)).toBe(`./${REMOTE_DIR}`)
    expect(contentRootFrom('', false)).toBe(`./${REMOTE_DIR}`)
  })

  it('绝对模式必须取 origin：剥掉 /api（Tauri 注入的是 https://520305.top/api）', () => {
    expect(contentRootFrom('https://520305.top/api', true)).toBe('https://520305.top/content-remote')
    // 误拼成 API_BASE + '/content-remote' 会落 /api 下返回 404 —— 显式反例钉死
    expect(contentRootFrom('https://520305.top/api', true)).not.toBe('https://520305.top/api/content-remote')
    expect(contentRootFrom('https://520305.top/api', true)).not.toContain('/api/')
  })

  it('端口保留', () => {
    expect(contentRootFrom('http://localhost:3000/api', true)).toBe('http://localhost:3000/content-remote')
    expect(contentRootFrom('https://520305.top:8443/api/v2', true)).toBe('https://520305.top:8443/content-remote')
  })

  it('基址本身无路径 / 带尾斜杠 / 带多级路径', () => {
    expect(contentRootFrom('https://520305.top', true)).toBe('https://520305.top/content-remote')
    expect(contentRootFrom('https://520305.top/', true)).toBe('https://520305.top/content-remote')
    expect(contentRootFrom('https://520305.top/api/', true)).toBe('https://520305.top/content-remote')
    expect(contentRootFrom('https://520305.top/a/b/c', true)).toBe('https://520305.top/content-remote')
  })

  it('非法 URL 走兜底且不抛（不因配置异常把启动打挂）', () => {
    expect(() => contentRootFrom('not-a-url', true)).not.toThrow()
    expect(typeof contentRootFrom('not-a-url', true)).toBe('string')
  })
})

describe('S2 · 攻点⑩ 非 UPSERT 静默忽略（P-S19）', () => {
  const unit = { hash: H('a'), version: 2, path: 'math/01.json', count: 2, updatedAt: 'x' }
  const good = (fileIndex, c = 'a') => ({
    subject: 'math', unitNum: '01', fileIndex, fileKey: `k${fileIndex}`,
    op: OP.UPSERT, blocks: [{ type: 'text', text: 'r' }], hash: H(c)
  })

  it('append 页被静默忽略；同分片 UPSERT 页照常保留', () => {
    const shard = {
      unitKey: 'math/01', contentVersion: 2,
      pages: [
        { ...good(0), op: OP.APPEND },
        good(1)
      ]
    }
    const e = buildShardEntry('math/01', unit, shard)
    expect(e).toBeTruthy()
    expect(e.pages.map((p) => p.fileIndex)).toEqual([1])
    expect(Object.keys(e.pageHashes)).toEqual(['01/1'])
  })

  it('整片全是 append → 返回 null（该片回落内置，不写空片）', () => {
    const shard = {
      unitKey: 'math/01', contentVersion: 2,
      pages: [{ ...good(0), op: OP.APPEND }, { ...good(1), op: 'unknown-op' }]
    }
    expect(buildShardEntry('math/01', unit, shard)).toBeNull()
  })

  it('未知 op 字符串同样忽略（不因新 op 崩）', () => {
    const shard = { unitKey: 'math/01', contentVersion: 2, pages: [good(0), { ...good(1), op: 'delete' }] }
    const e = buildShardEntry('math/01', unit, shard)
    expect(e.pages.map((p) => p.fileIndex)).toEqual([0])
  })

  it('协议/坐标不符 → 整片 null（宁可回落内置）', () => {
    expect(buildShardEntry('math/02', unit, { unitKey: 'math/01', contentVersion: 2, pages: [good(0)] })).toBeNull()
    expect(buildShardEntry('math/01', unit, { unitKey: 'math/01', contentVersion: 3, pages: [good(0)] })).toBeNull()
    expect(buildShardEntry('math/01', unit, { unitKey: 'math/01', contentVersion: 2, pages: 'x' })).toBeNull()
    expect(buildShardEntry('math/01', unit, null)).toBeNull()
  })

  it('页级三重校验：fileIndex 非数值 / 块缺 type / 哈希形态非法 → 逐页丢弃', () => {
    const shard = {
      unitKey: 'math/01', contentVersion: 2,
      pages: [
        { ...good(0), fileIndex: 'abc' }, // 非数值
        { ...good(1), blocks: [{ text: 'no type' }] }, // 缺 type
        { ...good(2), hash: 'sha256:ZZZ' }, // 哈希形态非法
        good(3)
      ]
    }
    const e = buildShardEntry('math/01', unit, shard)
    expect(e.pages.map((p) => p.fileIndex)).toEqual([3])
  })
})

describe('S2 · 形态判定与裁决（①⑤ 的公共底座）', () => {
  it('isWellFormedHash：只认 sha256: + 64 位小写十六进制', () => {
    expect(isWellFormedHash(H('a'))).toBe(true)
    expect(isWellFormedHash(HASH_PREFIX + 'A'.repeat(64))).toBe(false) // 大写
    expect(isWellFormedHash(HASH_PREFIX + 'a'.repeat(63))).toBe(false) // 短一位
    expect(isWellFormedHash(HASH_PREFIX + 'a'.repeat(65))).toBe(false) // 长一位
    expect(isWellFormedHash('a'.repeat(64))).toBe(false) // 缺前缀
    expect(isWellFormedHash(null)).toBe(false)
    expect(isWellFormedHash(123)).toBe(false)
  })

  it('isUsablePage：blocks 非数组 / 块缺 type / 非对象 → 不可用', () => {
    expect(isUsablePage({ blocks: [{ type: 'text' }] })).toBe(true)
    expect(isUsablePage({ blocks: 'x' })).toBe(false)
    expect(isUsablePage({ blocks: [{ text: 'no type' }] })).toBe(false)
    expect(isUsablePage({})).toBe(false)
    expect(isUsablePage(null)).toBe(false)
  })

  it('pickPage 远程优先；远程不可用时回落内置；都不可用 → null', () => {
    const builtin = { blocks: [{ type: 'text', text: 'B' }] }
    const remote = { blocks: [{ type: 'text', text: 'R' }] }
    expect(pickPage(builtin, remote)).toEqual({ blocks: remote.blocks })
    expect(pickPage(builtin, { blocks: 'bad' })).toBe(builtin)
    expect(pickPage(null, remote)).toEqual({ blocks: remote.blocks })
    expect(pickPage(null, null)).toBeNull()
  })

  it('verifyHash：两侧都必须形态合法且完全相等', () => {
    expect(verifyHash({ hash: H('a') }, H('a'))).toBe(true)
    expect(verifyHash({ hash: H('a') }, H('b'))).toBe(false)
    expect(verifyHash({ hash: H('a') }, null)).toBe(false)
    expect(verifyHash({ hash: 'bad' }, H('a'))).toBe(false)
  })
})

describe('S2 · isValidManifest 协议闸门', () => {
  const ok = () => ({ schemaVersion: SCHEMA_VERSION, contentVersion: 3, units: { 'math/01': { hash: H('a') } } })

  it('合法清单通过；空 units 也是合法（只是无可拉分片）', () => {
    expect(isValidManifest(ok())).toBe(true)
    expect(isValidManifest({ schemaVersion: SCHEMA_VERSION, contentVersion: 1, units: {} })).toBe(true)
  })

  it('schemaVersion 不符 → 整份不消费', () => {
    expect(isValidManifest({ ...ok(), schemaVersion: SCHEMA_VERSION + 1 })).toBe(false)
  })

  it('contentVersion 不可解析 → 不消费', () => {
    expect(isValidManifest({ ...ok(), contentVersion: 'abc' })).toBe(false)
  })

  it('⚠️ 口径变更（P-S47 / S4 起）：contentVersion 必须**本身**是有限数字（null/空串/布尔一律不消费）', () => {
    // 旧口径（S2 起）：`Number.isFinite(Number(v))` 会把 null/''/false 强转成 0 而**放过**
    //   → QA 记为 R-2「偏松」，当时以「下游 isNewer 是第二道闸」为由不视为缺陷。
    // 新口径（S4 · P-S47 a）：形态层直接要求 typeof === 'number' 且有限 → 上述一律拒绝。
    //   端到端安全性不变（isNewer 仍是第二道闸，下两行继续钉住），但契约更早收紧。
    for (const bad of [null, '', false, undefined, 'abc', [], {}]) {
      expect(isValidManifest({ ...ok(), contentVersion: bad }), `contentVersion=${String(bad)} 应不消费`).toBe(false)
    }
    expect(isValidManifest({ ...ok(), contentVersion: 0 })).toBe(true) // 0 是合法数字（虽不会被 isNewer 采纳）
    expect(isValidManifest({ ...ok(), contentVersion: NaN })).toBe(false)
    expect(isValidManifest({ ...ok(), contentVersion: Infinity })).toBe(false)
    // 第二道闸仍在（纵深防御未撤）
    expect(isNewer(null, null)).toBe(false) // 首次也不写
    expect(isNewer(null, 5)).toBe(false) // 有本地记录更不写
    expect(isNewer('', null)).toBe(false)
    expect(isNewer(false, null)).toBe(false)
  })

  it('units 非对象 / 是数组 → 不消费', () => {
    expect(isValidManifest({ ...ok(), units: [] })).toBe(false)
    expect(isValidManifest({ ...ok(), units: null })).toBe(false)
  })
})
