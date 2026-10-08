/**
 * 错题归因单测（P0-4）
 * 覆盖：
 *  - extra 透传 reason/kp/wrongCount（零迁移）；未传则字段 undefined（非空串）
 *  - 重复入本 wrongCount 自增（唯一自增点）
 *  - attributeError 只写非空字段
 *  - H3 二分：归因分布与自动判分口径分开（reasonDistribution 纯函数）
 *  - grade=4 留痕静态断言（ErrorBookView 用 GRADES.GOOD，无裸 `, 4)`）
 */
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStudyDbStore } from '@/stores/studyDb'
import { REASONS, reasonDistribution } from '@/utils/practiceMetrics'

const errorBookVue = readFileSync(
  fileURLToPath(new URL('../src/views/ErrorBookView.vue', import.meta.url)),
  'utf-8'
)

describe('错题归因（P0-4）', () => {
  let store
  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useStudyDbStore()
    await store.init()
  })

  it('① extra 透传 reason/kp；未传则 undefined（非空串）；新行 wrongCount=1', async () => {
    const r = await store.recordError('math', '01', 'q-attr-1', 'A', 'B', '解析', {
      fileKey: 'fk-attr',
      reason: '计算失误',
      kp: '一元二次'
    })
    const rec = (await store.getAllErrorsRaw()).find((e) => e.id === r.id)
    expect(rec.reason).toBe('计算失误')
    expect(rec.kp).toBe('一元二次')
    expect(rec.wrongCount).toBe(1)

    const r2 = await store.recordError('math', '01', 'q-attr-2', 'A', 'B', 'x', { fileKey: 'fk-attr' })
    const rec2 = (await store.getAllErrorsRaw()).find((e) => e.id === r2.id)
    expect(rec2.reason).toBeUndefined()
    expect(rec2.kp).toBeUndefined()
  })

  it('② 同 subject+question+fileKey 二次入本 → duplicated 且 wrongCount 1→2→3', async () => {
    const a = await store.recordError('chinese', '02', 'q-dup', 'C', 'D', 'x', { fileKey: 'fk-dup' })
    expect(a.duplicated).toBeUndefined()
    expect(a.success).toBe(true)

    const b = await store.recordError('chinese', '02', 'q-dup', 'C', 'D', 'x', { fileKey: 'fk-dup' })
    expect(b.duplicated).toBe(true)
    expect(b.id).toBe(a.id)
    expect((await store.getAllErrorsRaw()).find((e) => e.id === a.id).wrongCount).toBe(2)

    const c = await store.recordError('chinese', '02', 'q-dup', 'C', 'D', 'x', { fileKey: 'fk-dup' })
    expect(c.duplicated).toBe(true)
    expect((await store.getAllErrorsRaw()).find((e) => e.id === a.id).wrongCount).toBe(3)
  })

  it('attributeError 只写非空字段（空串不覆盖已有值）', async () => {
    const r = await store.recordError('computer', '03', 'q-attr-3', '1', '2', 'x', { fileKey: 'fk-attr3' })
    await store.attributeError(r.id, { reason: '超时蒙猜' })
    let rec = (await store.getAllErrorsRaw()).find((e) => e.id === r.id)
    expect(rec.reason).toBe('超时蒙猜')
    expect(rec.kp).toBeUndefined()

    await store.attributeError(r.id, { reason: '', kp: '' })
    rec = (await store.getAllErrorsRaw()).find((e) => e.id === r.id)
    expect(rec.reason).toBe('超时蒙猜') // 空串不覆盖
    expect(rec.kp).toBeUndefined()

    // 未命中 id 返回 false
    expect(await store.attributeError('not-exist-id', { reason: '审题偏差' })).toBe(false)
  })

  it('③ REASONS 六项，且 ErrorBookView 筛选项与其同源（防漂移静态断言）', () => {
    expect(REASONS).toHaveLength(6)
    expect(errorBookVue).toContain("from '@/utils/practiceMetrics'")
    expect(errorBookVue).toContain('v-for="r in REASONS"')
  })

  it('④ H3 二分：归因分布只统计错题的用户自评归因，与自动判分不合并', () => {
    const dist = reasonDistribution([
      { reason: '计算失误' },
      { reason: '计算失误' },
      { reason: undefined }, // 未归因（自动判错也在此档，不混入六选一）
      { reason: '超时蒙猜' }
    ])
    const map = Object.fromEntries(dist.map((d) => [d.reason, d.count]))
    expect(map['计算失误']).toBe(2)
    expect(map['超时蒙猜']).toBe(1)
    expect(map.none).toBe(1)
  })

  it('⑤ grade 留痕：ErrorBookView 不再出现裸 `, 4)` 调用，改用 GRADES.GOOD', () => {
    expect(/calculateSM2\([^,]+,\s*4\s*\)/.test(errorBookVue)).toBe(false)
    expect(errorBookVue).toContain('GRADES.GOOD')
  })
})
