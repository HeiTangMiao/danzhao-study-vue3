// @vitest-environment jsdom
/**
 * 题库客户端远程化（批 S5 · S5-4）
 *
 * 覆盖（逐条对应任务卡 S5-4 测试要求）：
 *  ① 索引 / 分片缓存命中 → 零 fetch
 *  ② `normalizeBankItem` 对远程条目与内置产物条目产出**一致**（同一 fixture 两路断言）
 *  ③ 单题缺 `q` / 缺 `k` / 缺 `fk` → 该题被丢弃，其余题照常
 *  ④ 条目缺 `kp` → `item.kp` 回落 `fk`（非空）
 *  ⑤ 形状坏 / 全被丢弃 → 抛错（好过静默空库）
 *  ⑥ 读时闸门：缓存 version 落后 → 重新拉
 *
 * ⚠️ fake-indexeddb + mock fetch，不读盘产物。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import {
  loadBankIndex, loadSubjectBank, sanitizeBankItem, sanitizeBankShard,
  BANK_INDEX_KEY, bankShardKey, resetPracticeClient
} from '@/utils/practiceBankClient'
import { normalizeBankItem, practiceKeyOf, BANK_ITEM_KEYS } from '@/content/practiceBank'
import { useStudyDbStore } from '@/stores/studyDb'
import { CONTENT_META_KEY } from '@/content/contentManifest'

/** 紧凑键条目（与 build-practice-bank.mjs 产物同构） */
const item = (over = {}) => ({
  k: '01/0/0/0', s: 'math', u: '01', ut: '集合与逻辑', fi: 0, fk: 'math_01_集合的概念',
  kp: 'math_01_集合的概念', ft: '集合的概念', bt: '快速检测',
  q: '下列各组对象中，能构成集合的是（ ）', o: ['①②③', '①②④'], ci: 0, a: '**A。**',
  d: 'basic', it: 'single', g: true, dv: false, sr: 'quiz', ...over
})

const INDEX = { generatedAt: '2026-01-01T00:00:00.000Z', total: 2, gradableTotal: 2, subjects: { math: { count: 2 } } }

const ORIGINAL_FETCH = globalThis.fetch

function mockFetch(routes) {
  globalThis.fetch = vi.fn(async (url) => {
    const key = String(url)
    for (const [suffix, handler] of Object.entries(routes)) {
      if (key.endsWith(suffix)) return handler()
    }
    return { ok: false, status: 404, json: async () => ({}) }
  })
}
const jsonOk = (obj) => () => ({ ok: true, status: 200, json: async () => obj })
const boom = () => { throw new TypeError('Failed to fetch') }
const fetchCount = () => globalThis.fetch.mock.calls.length

beforeEach(async () => {
  setActivePinia(createPinia())
  // ⚠️ practiceBankClient 的进程内二级缓存是模块级 Map，同文件跨用例持久 → 显式清
  resetPracticeClient()
  const db = useStudyDbStore()
  await db.init()
  await db.clearContentCache()
  await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: null, contentHash: null, units: {}, pendingUnits: [] })
})
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

describe('① 缓存命中 → 零 fetch', () => {
  it('索引与分片都命中 → 一次网络都不发', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    await db.saveContentCache({ key: BANK_INDEX_KEY, version: 3, payload: INDEX })
    await db.saveContentCache({ key: bankShardKey('math'), version: 3, payload: [item()] })
    mockFetch({})

    expect(await loadBankIndex()).toEqual(INDEX)
    expect(await loadSubjectBank('math')).toHaveLength(1)
    expect(fetchCount()).toBe(0)
  })
})

describe('② 缓存未命中 → 拉远程 → 写缓存 → 二次命中', () => {
  it('首次拉取落缓存（带本地已见版本），二次零 fetch', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    mockFetch({ 'practice-bank/index.json': jsonOk(INDEX), 'practice-bank/math.json': jsonOk([item()]) })

    expect(await loadBankIndex()).toEqual(INDEX)
    const items = await loadSubjectBank('math')
    expect(items).toHaveLength(1)
    expect(fetchCount()).toBe(2)

    expect(await db.getContentCache(BANK_INDEX_KEY)).toMatchObject({ key: 'practice:index', version: 3 })
    expect(await db.getContentCache(bankShardKey('math'))).toMatchObject({ key: 'practice:math', version: 3 })

    await loadBankIndex()
    await loadSubjectBank('math')
    expect(fetchCount()).toBe(2) // 二次全命中缓存
  })
})

describe('③ normalizeBankItem 两路一致（H7：形状兜底真相源）', () => {
  it('同一 fixture 经 normalizeBankItem 与经 loadSubjectBank 产出一致', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    mockFetch({ 'practice-bank/math.json': jsonOk([item()]) })
    const viaClient = await loadSubjectBank('math')
    const direct = [normalizeBankItem(item())]
    expect(viaClient).toEqual(direct)
  })

  it('BANK_ITEM_KEYS 覆盖的紧凑键全部展开为全名字段', () => {
    const it = normalizeBankItem(item())
    for (const full of Object.values(BANK_ITEM_KEYS)) {
      expect(it, `缺字段 ${full}`).toHaveProperty(full)
    }
    expect(it.gradable).toBe(true)
    expect(it.source).toBe('quiz')
    expect(it.options).toEqual(['①②③', '①②④'])
  })
})

describe('④ 坏条丢弃（粒度 = practiceKeyOf）', () => {
  it('缺 q / 缺 k / 缺 fk → 该题被丢，其余题照常', () => {
    const kept = sanitizeBankShard([
      item({ k: '01/0/0/0' }),
      { ...item({ k: '01/0/0/1' }), q: '' },        // 缺题干
      { ...item({ k: '01/0/1/0' }), k: undefined },  // 缺坐标键
      { ...item({ k: '01/0/1/1' }), fk: undefined }, // 缺来源页
      null,
      'x',
      item({ k: '01/0/2/0' })
    ])
    expect(kept.map((i) => i.key)).toEqual(['01/0/0/0', '01/0/2/0'])
  })

  it('单题缺 q 走完整链路也被丢（客户端路径）', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    mockFetch({ 'practice-bank/math.json': jsonOk([item(), { ...item({ k: '01/0/0/1' }), q: '   ' }]) })
    const items = await loadSubjectBank('math')
    expect(items.map((i) => i.key)).toEqual(['01/0/0/0'])
  })

  it('o / ci 缺失 → options 为 null，但 gradable **不重算**（客户端不引入第三套判分口径）', () => {
    // gradable 是**构建期事实**（紧凑键 g）， normalizeBankItem 只透传；
    // 客户端若按 o/ci 重算，就会与 H3 判分口径漂移（S5-4 契约 2）
    const it = sanitizeBankItem(item({ o: undefined, ci: undefined }))
    expect(it).not.toBeNull()
    expect(it.options).toBeNull()
    expect(it.correctIndex).toBeUndefined()
    expect(it.gradable).toBe(true) // 仍信产物里的 g
    expect(sanitizeBankItem(item({ g: false })).gradable).toBe(false)
  })

  it('形状坏 / 全被丢弃 → null（调用方据此抛错，不静默空库）', () => {
    expect(sanitizeBankShard('x')).toBeNull()
    expect(sanitizeBankShard([{ ...item(), q: '' }, null])).toBeNull()
    expect(sanitizeBankShard([])).toEqual([]) // 真空数组合法
  })

  it('产物形状不合法 → loadSubjectBank 抛错（视图已有兜底）', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    mockFetch({ 'practice-bank/math.json': jsonOk({ not: 'an array' }) })
    await expect(loadSubjectBank('math')).rejects.toThrow(/形状不合法/)
  })
})

describe('⑤ kp 回落链（R-5：不得掉出 100%）', () => {
  it('条目缺 kp → item.kp 回落 fk（非空）', () => {
    const it = sanitizeBankItem(item({ kp: undefined }))
    expect(it.kp).toBe(it.fileKey)
    expect(it.kp).not.toBe('')
  })

  it('旧产物（无 kp / 无 x / 无 dv）经 normalizeBankItem 仍可渲染', () => {
    const legacy = { k: '01/0/0/0', s: 'math', u: '01', fi: 0, fk: 'math_01_x', q: '题', a: '答' }
    const it = sanitizeBankItem(legacy)
    expect(it.kp).toBe('math_01_x')
    expect(it.explanation).toBe('')
    expect(it.derived).toBe(false)
    expect(it.gradable).toBe(false)
  })
})

describe('⑥ 读时闸门与远程失败回退', () => {
  it('缓存 version 落后 → 重新拉远程', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 4, units: {} })
    await db.saveContentCache({ key: bankShardKey('math'), version: 2, payload: [item({ q: '旧题' })] })
    mockFetch({ 'practice-bank/math.json': jsonOk([item({ q: '新题' })]) })
    const items = await loadSubjectBank('math')
    expect(items[0].question).toBe('新题')
    expect(fetchCount()).toBe(1)
  })

  it('远程失败 + 有缓存 → 返回缓存（题库不再一失败就抛）', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    await db.saveContentCache({ key: bankShardKey('math'), version: 3, payload: [item()] })
    mockFetch({ 'practice-bank/math.json': boom })
    expect(await loadSubjectBank('math')).toHaveLength(1)
    expect(fetchCount()).toBe(0) // 缓存够新，根本不联网
  })

  it('无缓存 + 远程失败 → 抛错（视图兜底）', async () => {
    mockFetch({ 'practice-bank/math.json': boom })
    await expect(loadSubjectBank('math')).rejects.toThrow(TypeError)
  })
})

describe('缓存键前缀隔离（P-S52 / R-10）', () => {
  it('键形如 practice:index / practice:{subject}', () => {
    expect(BANK_INDEX_KEY).toBe('practice:index')
    expect(bankShardKey('math')).toBe('practice:math')
  })

  it('practiceKeyOf 仍由形状模块定义（客户端不重写键口径）', () => {
    expect(practiceKeyOf({ unitNum: '01', fileIndex: 0 }, 2, 3)).toBe('01/0/2/3')
  })
})

describe('基址派生（S5-6：Tauri 绝对模式取 origin，不拼 API_BASE）', () => {
  it('客户端从 assetBase 导入 siteRoot，且不自己拼 API_BASE', () => {
    const src = readFileSync(join(process.cwd(), 'src/utils/practiceBankClient.js'), 'utf-8')
    expect(src).toContain("from '@/utils/assetBase'")
    expect(src).not.toMatch(/API_BASE\s*\+/)
  })

  it('相对模式（dev / Web）请求 URL 为 ./practice-bank/index.json', async () => {
    const db = useStudyDbStore()
    await db.saveContentMeta({ key: CONTENT_META_KEY, contentVersion: 3, units: {} })
    mockFetch({ 'practice-bank/index.json': jsonOk(INDEX) })
    await loadBankIndex()
    expect(globalThis.fetch.mock.calls[0][0]).toBe('./practice-bank/index.json')
  })
})
