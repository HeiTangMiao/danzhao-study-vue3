// @vitest-environment jsdom
/**
 * T3 · `src/utils/storageQuota.js` 单测：5 种 navigator 形态 + 契约性负断言
 *
 * 为什么用 `vi.stubGlobal` 而不是改 `navigator.storage` 的属性描述符：
 *   jsdom 的 `navigator` 在不同宿主里可能是只读 getter，逐属性 defineProperty 会时灵时不灵。
 *   整只 stub 掉才能稳定造出「`storage` 不存在」「只有 persist 没有 estimate」这类真机形态。
 *
 * 这个文件守的不是「log 长什么样」，而是四条会静默伤人的契约：
 *  ① `isSecureContext` 只记录、不当门槛（Tauri Android 自定义 scheme 下它可能为 false）；
 *  ② `persist()` 返回 false 是正常结果 —— 不抛、不 warn、不重试、不轮询；
 *  ③ 每个 await 单独 try/catch —— 一处失败不挡住其它诊断，且绝不产生 unhandled rejection；
 *  ④ `getLastStorageReport()` 是副本 —— 下游改它不能污染内部快照。
 *
 * 另附一条源码级静态断言：模块里不许出现定时器（一旦有人给 persist(false) 加"稍后重试"就会红）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  storageCapabilities,
  ensureStoragePersistence,
  getLastStorageReport
} from '@/utils/storageQuota'

/** 造一种 navigator 形态；`secureContext` 与 storage 能力互相独立，故意不绑定 */
function stubNavigator(storage, secureContext = true) {
  const nav = storage === undefined ? {} : { storage }
  vi.stubGlobal('navigator', nav)
  // window.isSecureContext 在 jsdom 里随宿主而异，显式钉成用例要的值
  vi.stubGlobal('isSecureContext', secureContext)
}

/** 造一套「全能力齐备」的 StorageManager 桩，供各形态按需删字段 */
function fullManager(overrides = {}) {
  return {
    persist: vi.fn(async () => true),
    persisted: vi.fn(async () => true),
    estimate: vi.fn(async () => ({ usage: 1024, quota: 4096 })),
    ...overrides
  }
}

/** report 的完整键集合（防"顺手加字段"或漏字段） */
const REPORT_KEYS = [
  'secureContext',
  'hasStorageManager',
  'hasPersist',
  'hasEstimate',
  'granted',
  'persisted',
  'usage',
  'quota',
  'error'
]

let infoSpy = null
let warnSpy = null

beforeEach(() => {
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('形态① 全能力齐备且 persist() 返回 true', () => {
  it('report 九个字段逐项就位；三个 API 各调一次；成功时仅一次 console.info', async () => {
    const manager = fullManager()
    stubNavigator(manager, true)

    await expect(ensureStoragePersistence()).resolves.toBeDefined()

    const report = getLastStorageReport()
    expect(Object.keys(report).sort()).toEqual([...REPORT_KEYS].sort())
    expect(report).toEqual({
      secureContext: true,
      hasStorageManager: true,
      hasPersist: true,
      hasEstimate: true,
      granted: true,
      persisted: true,
      usage: 1024,
      quota: 4096,
      error: ''
    })
    expect(manager.persist).toHaveBeenCalledTimes(1)
    expect(manager.persisted).toHaveBeenCalledTimes(1)
    expect(manager.estimate).toHaveBeenCalledTimes(1)
    expect(infoSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('同步 storageCapabilities() 返回新对象，异步字段全为 null，且不写 lastReport', async () => {
    stubNavigator(fullManager(), true)

    const caps = storageCapabilities()
    expect(caps).toEqual({
      secureContext: true,
      hasStorageManager: true,
      hasPersist: true,
      hasEstimate: true,
      granted: null,
      persisted: null,
      usage: null,
      quota: null,
      error: ''
    })

    // 改返回值不影响下一次探测（每个调用一份新 report）
    caps.hasPersist = false
    expect(storageCapabilities().hasPersist).toBe(true)

    // 同步探测不改变「最近一次完整报告」：要先跑一次 ensure 才有完整快照
    await ensureStoragePersistence()
    expect(getLastStorageReport().granted).toBe(true)
  })

  it('getLastStorageReport() 是副本：改它不影响内部快照', async () => {
    stubNavigator(fullManager(), true)
    await ensureStoragePersistence()

    const first = getLastStorageReport()
    first.granted = false
    first.usage = -1
    first.error = '被下游改坏了'

    const second = getLastStorageReport()
    expect(second).not.toBe(first)
    expect(second.granted).toBe(true)
    expect(second.usage).toBe(1024)
    expect(second.error).toBe('')
    // ensure 的返回值同样是副本，不是内部对象
    const returned = await ensureStoragePersistence()
    returned.granted = null
    expect(getLastStorageReport().granted).toBe(true)
  })
})

describe('形态② persist() 返回 false（且 isSecureContext=false）', () => {
  it('false 是正常结果：granted===false、error 为空、不 warn、persist 只调一次', async () => {
    const manager = fullManager({ persist: vi.fn(async () => false) })
    // 关键：安全上下文为 false，但 storage API 仍必须被使用（纪律 2：只记录、不当门槛）
    stubNavigator(manager, false)

    await expect(ensureStoragePersistence()).resolves.toBeDefined()

    const report = getLastStorageReport()
    expect(report.secureContext).toBe(false)
    expect(report.hasStorageManager).toBe(true)
    expect(report.hasPersist).toBe(true)
    expect(report.hasEstimate).toBe(true)
    expect(report.granted).toBe(false) // 不是 null：false 是 MDN 所述的正常结果
    expect(report.error).toBe('')
    expect(report.usage).toBe(1024)

    expect(manager.persist).toHaveBeenCalledTimes(1) // 不重试
    expect(manager.estimate).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalledTimes(1)
  })

  it('不轮询：模块源码里没有任何定时器调用（防给 false 加"稍后重试"）', () => {
    const src = readFileSync(join(process.cwd(), 'src', 'utils', 'storageQuota.js'), 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    expect(code).not.toMatch(/\bset(?:Timeout|Interval)\s*\(/)
    // 同时守住 CSP L3：模块不许引入字符串转代码
    expect(code).not.toMatch(/\bnew\s+Function\s*\(/)
    expect(code).not.toMatch(/\btoJSFunction\b/)
    expect(code).not.toMatch(/(?<![.\w$])eval\s*\(/)
  })
})

describe('形态③ estimate() 抛错', () => {
  it('异常吞进 error + 仅一次 console.warn，usage/quota 为 null，其余诊断照常完成', async () => {
    const manager = fullManager({
      estimate: vi.fn(async () => {
        throw new Error('quota boom')
      })
    })
    stubNavigator(manager, true)

    // 不抛、也没有 unhandled rejection（vitest 若捕获到未处理拒绝会直接判失败）
    await expect(ensureStoragePersistence()).resolves.toBeDefined()

    const report = getLastStorageReport()
    expect(report.error).toContain('estimate()')
    expect(report.error).toContain('quota boom')
    expect(report.usage).toBeNull()
    expect(report.quota).toBeNull()
    expect(report.granted).toBe(true)
    expect(report.persisted).toBe(true)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it('每个 await 独立 try/catch：persist() 抛错不挡住 estimate() 与 persisted()', async () => {
    const manager = fullManager({
      persist: vi.fn(async () => {
        throw new Error('persist denied')
      })
    })
    stubNavigator(manager, true)

    await expect(ensureStoragePersistence()).resolves.toBeDefined()

    const report = getLastStorageReport()
    expect(report.error).toContain('persist()')
    expect(report.error).toContain('persist denied')
    expect(report.granted).toBeNull()
    expect(report.persisted).toBe(true)
    expect(report.usage).toBe(1024)
    expect(report.quota).toBe(4096)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})

describe('形态④ navigator.storage 不存在', () => {
  it('能力位全 false、异步字段全 null、error 为空，且 ensure 正常 resolve', async () => {
    stubNavigator(undefined, false)

    await expect(ensureStoragePersistence()).resolves.toBeDefined()

    const report = getLastStorageReport()
    expect(Object.keys(report).sort()).toEqual([...REPORT_KEYS].sort())
    expect(report).toEqual({
      secureContext: false,
      hasStorageManager: false,
      hasPersist: false,
      hasEstimate: false,
      granted: null,
      persisted: null,
      usage: null,
      quota: null,
      error: ''
    })
    // API 全缺失不是异常：不 warn（没有异常可吞），只留一条开发者 info
    expect(warnSpy).not.toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalledTimes(1)
    expect(storageCapabilities().hasStorageManager).toBe(false)
  })
})

describe('形态⑤ 只有 persist，没有 estimate / persisted', () => {
  it('缺哪个能力就跳过哪个：granted 有值，persisted/usage/quota 保持 null', async () => {
    const manager = { persist: vi.fn(async () => true) }
    stubNavigator(manager, true)

    await expect(ensureStoragePersistence()).resolves.toBeDefined()

    const report = getLastStorageReport()
    expect(report.hasStorageManager).toBe(true)
    expect(report.hasPersist).toBe(true)
    expect(report.hasEstimate).toBe(false)
    expect(report.granted).toBe(true)
    expect(report.persisted).toBeNull()
    expect(report.usage).toBeNull()
    expect(report.quota).toBeNull()
    expect(report.error).toBe('')
    expect(manager.persist).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('estimate() 返回 null / 非有限值 → usage/quota 落 null，不报错', async () => {
    const nullEstimate = { ...fullManager(), estimate: vi.fn(async () => null) }
    stubNavigator(nullEstimate, true)
    await ensureStoragePersistence()
    const a = getLastStorageReport()
    expect(a.usage).toBeNull()
    expect(a.quota).toBeNull()
    expect(a.error).toBe('')

    const junk = {
      ...fullManager(),
      estimate: vi.fn(async () => ({ usage: '1024', quota: Number.POSITIVE_INFINITY }))
    }
    stubNavigator(junk, true)
    await ensureStoragePersistence()
    const b = getLastStorageReport()
    expect(b.usage).toBeNull()
    expect(b.quota).toBeNull()
    expect(b.error).toBe('')
    expect(b.granted).toBe(true)
  })

  it('persist() 返回非 boolean → granted 落 null，不把 truthy 噪声当成已授权', async () => {
    stubNavigator({ persist: vi.fn(async () => 1) }, true)
    await ensureStoragePersistence()
    expect(getLastStorageReport().granted).toBeNull()
    expect(getLastStorageReport().error).toBe('')
  })
})
