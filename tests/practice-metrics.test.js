/**
 * practiceMetrics 纯函数单测（P0-3 / P0-4）
 * 覆盖：耗时最长 Top N、超时计数边界、平均耗时、归因分布（H3 二分）、REASONS 常量同源
 */
import { describe, it, expect } from 'vitest'
import {
  TIMEOUT_MS,
  REASONS,
  topSlowest,
  timeoutCount,
  avgElapsedMs,
  reasonDistribution
} from '@/utils/practiceMetrics'

describe('practiceMetrics 耗时统计', () => {
  it('topSlowest：按 elapsedMs 降序取前 N，且不改动入参', () => {
    const list = [{ elapsedMs: 100 }, { elapsedMs: 300 }, { elapsedMs: 200 }, { elapsedMs: 50 }]
    const snapshot = JSON.parse(JSON.stringify(list))
    const r = topSlowest(list, 2)
    expect(r.map((x) => x.elapsedMs)).toEqual([300, 200])
    expect(list).toEqual(snapshot)
  })

  it('topSlowest：并列稳定（保持原相对顺序）', () => {
    const list = [
      { id: 'a', elapsedMs: 100 },
      { id: 'b', elapsedMs: 100 },
      { id: 'c', elapsedMs: 100 }
    ]
    expect(topSlowest(list, 3).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('timeoutCount：边界 elapsedMs === 45000 计为超时，44999 不计', () => {
    expect(TIMEOUT_MS).toBe(45000)
    expect(timeoutCount([{ elapsedMs: TIMEOUT_MS }, { elapsedMs: 44999 }])).toBe(1)
    expect(timeoutCount([{ elapsedMs: TIMEOUT_MS + 1 }])).toBe(1)
  })

  it('avgElapsedMs：空数组返回 0（不 NaN）；正常四舍五入', () => {
    expect(avgElapsedMs([])).toBe(0)
    expect(avgElapsedMs([{ elapsedMs: 10 }, { elapsedMs: 21 }])).toBe(16)
  })

  it('健壮性：非数组 / 缺字段入参不抛', () => {
    expect(topSlowest(null)).toEqual([])
    expect(topSlowest(undefined, 2)).toEqual([])
    expect(timeoutCount(undefined)).toBe(0)
    expect(avgElapsedMs(null)).toBe(0)
    expect(avgElapsedMs([{}, { elapsedMs: 20 }])).toBe(10)
  })
})

describe('practiceMetrics 归因分布与常量', () => {
  it('REASONS 六项齐全、无重复，且含超时蒙猜', () => {
    expect(REASONS).toHaveLength(6)
    expect(new Set(REASONS).size).toBe(6)
    expect(REASONS).toContain('超时蒙猜')
  })

  it('reasonDistribution：六选一 + 未归因，固定顺序，长度 7', () => {
    const dist = reasonDistribution([
      { reason: '计算失误' },
      { reason: '计算失误' },
      { reason: undefined },
      { reason: '超时蒙猜' },
      { reason: '非法值（不计入任何已知档）' }
    ])
    expect(dist).toHaveLength(7)
    expect(dist[dist.length - 1].reason).toBe('none')
    const map = Object.fromEntries(dist.map((d) => [d.reason, d.count]))
    expect(map['计算失误']).toBe(2)
    expect(map['超时蒙猜']).toBe(1)
    expect(map.none).toBe(2)
  })

  it('reasonDistribution 健壮性：非数组返回全 0', () => {
    const dist = reasonDistribution(null)
    expect(dist).toHaveLength(7)
    expect(dist.every((d) => d.count === 0)).toBe(true)
  })
})
