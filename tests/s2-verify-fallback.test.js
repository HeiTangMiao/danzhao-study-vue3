// @vitest-environment jsdom
/**
 * 批 S2 · 独立证伪 · 攻点⑤ 回退链（红线 2 · 永不变砖）
 *
 * 五种远程失败场景，每种都必须：① 回落内置 ② **绝不产出空 blocks 的页面**
 * （空页比用内置更糟 —— 用户看到的是「内容丢了」，而内置至少能渲染）。
 *
 * 反向对照（防止断言空转）：先放一条「远程可用」的正对照，证明远程优先确实生效 ——
 * 否则「全都回落内置」可能只是因为远程路径根本没接上（假绿）。
 *
 * ⚠️ 环境纪律：不读 `public/content-remote/`（已 gitignore）→ 直接向 IDB 注入 content_cache。
 *    IDB 用 fake-indexeddb；每例前 resetContentClient() 清空进程内二级缓存，确保走真实读路径。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { loadPage, importPageModule } from '@/content/loadPage'
import { getSubjectConfig } from '@/content/index'
import { resolvePageMeta } from '@/content/pageMeta'
import { resetContentClient } from '@/utils/contentClient'
import { useStudyDbStore } from '@/stores/studyDb'
import { OP, HASH_PREFIX } from '@/content/contentManifest'

/** 合法形态哈希（固定 64 位） */
const H = (tag = 'a') => HASH_PREFIX + tag.repeat(64).slice(0, 64)

const SUBJECT = 'math'
const UNIT = '01'
const FILE_INDEX = 0

let BUILTIN_BLOCKS = null

/** 内置页的 blocks（对照基准，取真实模块） */
async function builtinBlocks() {
  if (BUILTIN_BLOCKS) return BUILTIN_BLOCKS
  const meta = resolvePageMeta(getSubjectConfig(SUBJECT), UNIT, FILE_INDEX)
  const mod = await importPageModule(SUBJECT, meta.folder, meta.name)
  BUILTIN_BLOCKS = mod.default.blocks
  return BUILTIN_BLOCKS
}

/** 向 content_cache 注入一个单元（可注入各种畸形页） */
async function injectCache(pageOverrides = {}, { pageHash = H('a'), registered = H('a') } = {}) {
  const db = useStudyDbStore()
  const unitKey = `${SUBJECT}/${UNIT}`
  const page = {
    subject: SUBJECT,
    unitNum: UNIT,
    fileIndex: FILE_INDEX,
    fileKey: `${SUBJECT}_${UNIT}_p${FILE_INDEX}`,
    op: OP.UPSERT,
    blocks: [{ type: 'text', text: '远程正文' }],
    hash: pageHash,
    ...pageOverrides
  }
  await db.saveContentCache({
    key: unitKey,
    version: 1,
    hash: H('u'),
    pageHashes: { [`${UNIT}/${FILE_INDEX}`]: registered },
    pages: [page],
    manifestUpdatedAt: '2026-01-01T00:00:00.000Z'
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  resetContentClient()
  // ⚠️ fake-indexeddb 在**同一文件内跨用例持久** → 必须显式清表。
  //    否则「① 无缓存」场景实际读到上一条用例注入的缓存 → 该例退化为假绿/假红。
  await useStudyDbStore().clearContentCache()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('S2 · 攻点⑤ 回退链（永不变砖）', () => {
  it('正对照：远程可用时**优先**用远程（证明远程路径真的接上了，非假绿）', async () => {
    await injectCache()
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p).toBeTruthy()
    expect(p.blocks).toEqual([{ type: 'text', text: '远程正文' }])
  })

  it('① 远程不可用（无缓存）→ 回落内置', async () => {
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p.blocks).toEqual(await builtinBlocks())
  })

  it('② 哈希不符 → 丢弃该页 → 回落内置', async () => {
    // 登记的是 H('b')，实际页哈希是 H('a') → verifyHash 失败
    await injectCache({}, { pageHash: H('a'), registered: H('b') })
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p.blocks).toEqual(await builtinBlocks())
  })

  it('③ blocks 非数组 → 结构不可用 → 回落内置', async () => {
    await injectCache({ blocks: 'not-an-array' })
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p.blocks).toEqual(await builtinBlocks())
  })

  it('④ 块缺 type → 结构不可用 → 回落内置', async () => {
    await injectCache({ blocks: [{ text: '没有 type 的块' }] })
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p.blocks).toEqual(await builtinBlocks())
  })

  it('⑤ IDB 抛异常 → 静默吞掉 → 回落内置（不冒泡、不崩）', async () => {
    const db = useStudyDbStore()
    vi.spyOn(db, 'getContentCache').mockRejectedValue(new Error('idb boom'))
    await expect(loadPage(SUBJECT, UNIT, FILE_INDEX)).resolves.toBeTruthy()
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p.blocks).toEqual(await builtinBlocks())
  })

  it('★ 红线：以上五种场景下页面 blocks 均**非空**（绝不产出空页）', async () => {
    const builtin = await builtinBlocks()
    expect(builtin.length).toBeGreaterThan(0) // 内置基准本身非空，断言才有意义

    // ① 无缓存
    resetContentClient()
    expect((await loadPage(SUBJECT, UNIT, FILE_INDEX)).blocks.length).toBeGreaterThan(0)

    // ② 哈希不符
    setActivePinia(createPinia())
    resetContentClient()
    await injectCache({}, { pageHash: H('a'), registered: H('b') })
    expect((await loadPage(SUBJECT, UNIT, FILE_INDEX)).blocks.length).toBeGreaterThan(0)

    // ③ blocks 非数组
    setActivePinia(createPinia())
    resetContentClient()
    await injectCache({ blocks: 'x' })
    expect((await loadPage(SUBJECT, UNIT, FILE_INDEX)).blocks.length).toBeGreaterThan(0)

    // ④ 块缺 type
    setActivePinia(createPinia())
    resetContentClient()
    await injectCache({ blocks: [{ text: 'no type' }] })
    expect((await loadPage(SUBJECT, UNIT, FILE_INDEX)).blocks.length).toBeGreaterThan(0)

    // ⑤ IDB 抛异常
    setActivePinia(createPinia())
    resetContentClient()
    vi.spyOn(useStudyDbStore(), 'getContentCache').mockRejectedValue(new Error('boom'))
    expect((await loadPage(SUBJECT, UNIT, FILE_INDEX)).blocks.length).toBeGreaterThan(0)
  })

  it('★ 内置页即使含畸形块也**原样透传**（攻点④ 的行为侧复核，不依赖 vi.mock）', async () => {
    // 与 loadpage-builtin-passthrough 同结论，但走**真实内置模块**：
    // 只要内置页能加载，其 blocks 必原样返回，不因某块缺 type 而被整体清空。
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    const builtin = await builtinBlocks()
    expect(p.blocks.length).toBe(builtin.length) // 长度一致 = 没有被闸门裁掉任何块
    expect(p.blocks).toEqual(builtin)
  })
})
