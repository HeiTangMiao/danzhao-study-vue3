// @vitest-environment jsdom
/**
 * 批 F · Round 2 · 攻点[4] —— WorkCardBlock 三勾（Fc5）
 *
 *  H3 二分：浏览态（未勾）不写库；勾选写 page_progress.workcards 子键。
 *  1. 浏览态挂载（已有进度行）→ 不写库（savePageProgress 未被调）
 *  2. 勾选 → 写 workcards[wcId]，且保留原行其它字段
 *  3. 子键 spread 合并：不动其它 card 的勾选
 *  4. 幂等：勾/取消/再勾，终态一致
 *  5. H3：不写错题本
 *  6. DB 仍 v7
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import WorkCardBlock from '@/components/blocks/WorkCardBlock.vue'
import { useStudyDbStore } from '@/stores/studyDb'

const flush = async (n = 30) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0))
}

let seq = 0
const nextKey = () => `math_01_wc${++seq}`

function mountCard(fileKey, block = { type: 'workcard', title: 'B', intro: '说明' }) {
  return mount(WorkCardBlock, {
    props: { block, context: { fileKey } },
    global: { stubs: { AppIcon: true } }
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('R2 · 攻点[4] · WorkCardBlock 三勾', () => {
  it('浏览态挂载（已有进度行）→ 不写库', async () => {
    const db = useStudyDbStore()
    const key = nextKey()
    await db.markPageVisited({ subject: 'math', unitNum: '01', unitTitle: 'U', fileKey: key, fileTitle: 'F' })
    const spy = vi.spyOn(db, 'savePageProgress')
    const w = mountCard(key)
    await w.vm.$nextTick()
    await flush()
    expect(spy, '浏览态挂载不得写库（H3）').not.toHaveBeenCalled()
    w.unmount()
  })

  it('勾选 → 写 workcards[wcId]，保留原行其它字段', async () => {
    const db = useStudyDbStore()
    const key = nextKey()
    await db.markPageVisited({ subject: 'math', unitNum: '01', unitTitle: 'U', fileKey: key, fileTitle: 'F' })
    const w = mountCard(key)
    await w.vm.$nextTick()
    await flush()
    await w.findAll('.workcard__box')[0].trigger('click')
    await flush()
    const row = await db.getPageProgress(key)
    expect(row.workcards.B.guided).toBe(true)
    expect(row.workcards.B.restore).toBe(false)
    // 原行字段保留
    expect(row.visited).toBe(true)
    expect(row.subject).toBe('math')
    expect(row.fileTitle).toBe('F')
    w.unmount()
  })

  it('子键 spread 合并：不动其它 card', async () => {
    const db = useStudyDbStore()
    const key = nextKey()
    await db.markPageVisited({ subject: 'math', unitNum: '01', unitTitle: 'U', fileKey: key, fileTitle: 'F' })
    const row0 = await db.getPageProgress(key)
    await db.savePageProgress({ ...row0, workcards: { A: { guided: true, restore: false, timed: false } } })
    const w = mountCard(key, { type: 'workcard', title: 'B', intro: 'x' })
    await w.vm.$nextTick()
    await flush()
    await w.findAll('.workcard__box')[1].trigger('click') // B.restore
    await flush()
    const row = await db.getPageProgress(key)
    expect(row.workcards.A).toEqual({ guided: true, restore: false, timed: false }) // A 不动
    expect(row.workcards.B.restore).toBe(true)
    w.unmount()
  })

  it('幂等：勾→取消→再勾，终态一致', async () => {
    const db = useStudyDbStore()
    const key = nextKey()
    await db.markPageVisited({ subject: 'math', unitNum: '01', unitTitle: 'U', fileKey: key, fileTitle: 'F' })
    const w = mountCard(key)
    await w.vm.$nextTick()
    await flush()
    const box = w.findAll('.workcard__box')[0]
    await box.trigger('click')
    await flush()
    await box.trigger('click')
    await flush()
    let row = await db.getPageProgress(key)
    expect(row.workcards.B.guided).toBe(false) // 取消后落库 false
    await box.trigger('click')
    await flush()
    row = await db.getPageProgress(key)
    expect(row.workcards.B.guided).toBe(true)
    w.unmount()
  })

  it('H3：勾选不写错题本', async () => {
    const db = useStudyDbStore()
    const key = nextKey()
    await db.markPageVisited({ subject: 'math', unitNum: '01', unitTitle: 'U', fileKey: key, fileTitle: 'F' })
    const w = mountCard(key)
    await w.vm.$nextTick()
    await flush()
    await w.findAll('.workcard__box')[0].trigger('click')
    await flush()
    const errors = await db.getAllErrors()
    expect(errors.filter((e) => e.fileKey === key)).toEqual([])
    w.unmount()
  })

  it('DB 停 v7（源码 + Fc5 未触 studyDb）', () => {
    const src = readFileSync(join(process.cwd(), 'src/stores/studyDb.js'), 'utf8')
    expect(src).toMatch(/const DB_VERSION = 7\b/)
  })
})

describe('R2 · 攻点[4] · H5 四处接线一致', () => {
  it('schema 枚举 + allOf 分支均含 workcard', () => {
    const schema = JSON.parse(readFileSync(join(process.cwd(), 'schema/content-schema.json'), 'utf8'))
    expect(schema.definitions.block.properties.type.enum).toContain('workcard')
    const branch = schema.definitions.block.allOf.find((b) => b.if?.properties?.type?.const === 'workcard')
    expect(branch, '缺 workcard allOf 分支').toBeTruthy()
    expect(Object.keys(branch.then.properties)).toEqual(expect.arrayContaining(['intro', 'duration']))
  })
  it('blockTypes(workcard, kind practice) + registry + content.d.ts 一致', () => {
    const bt = readFileSync(join(process.cwd(), 'src/components/blocks/blockTypes.js'), 'utf8')
    expect(bt).toMatch(/workcard:\s*\{[^}]*kind:\s*'practice'/)
    const reg = readFileSync(join(process.cwd(), 'src/components/blocks/registry.js'), 'utf8')
    expect(reg).toMatch(/workcard:\s*WorkCardBlock/)
    const dts = readFileSync(join(process.cwd(), 'src/types/content.d.ts'), 'utf8')
    expect(dts).toContain("| 'workcard'")
    expect(dts).toMatch(/interface WorkCardBlock/)
  })
})
