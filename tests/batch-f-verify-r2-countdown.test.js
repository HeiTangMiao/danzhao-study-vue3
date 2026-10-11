// @vitest-environment jsdom
/**
 * 批 F · Round 2 · 攻点[3] —— useCountdown 跳时校准（Fc5）
 *
 *  deadline 口径：剩余 = ceil((deadline − now)/1000)。
 *  1. 墙钟跳 +30s 但只放行一个 tick → 09:29（=569s）而非 09:59（累减 600−1=599）
 *  2. 到点钳 0，不为负；到点自动 stop
 *  3. unmount 清 interval（running→false + clearInterval 被调）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useCountdown } from '@/composables/useCountdown'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('R2 · 攻点[3] · deadline 校准', () => {
  it('跳时 +30s 只放行一个 tick → 569（09:29），非 599（累减）', () => {
    const t0 = Date.now()
    const cd = useCountdown(600)
    cd.start()
    expect(cd.timeLeft.value).toBe(600)
    vi.setSystemTime(t0 + 30000) // 墙钟跳 +30s（不触发定时器）
    vi.advanceTimersByTime(1000) // 仅放行一个 tick（时钟再 +1s → t0+31000）
    expect(cd.timeLeft.value).toBe(569) // ceil((600000−31000)/1000)
    expect(cd.timeLeft.value).not.toBe(599) // 累减口径会得 599
    expect(cd.running.value).toBe(true)
    cd.stop()
  })

  it('到点钳 0（非负）且自动 stop', () => {
    const t0 = Date.now()
    const cd = useCountdown(2)
    cd.start()
    vi.setSystemTime(t0 + 5000) // 跳 +5s > 2s
    vi.advanceTimersByTime(1000)
    expect(cd.timeLeft.value).toBe(0)
    expect(cd.timeLeft.value >= 0).toBe(true)
    expect(cd.running.value).toBe(false)
  })

  it('reset 后回到指定秒数且停表', () => {
    const cd = useCountdown(100)
    cd.start()
    expect(cd.running.value).toBe(true)
    cd.reset(50)
    expect(cd.timeLeft.value).toBe(50)
    expect(cd.running.value).toBe(false)
  })

  it('unmount 清 interval（running→false + clearInterval 被调）', () => {
    const spyClear = vi.spyOn(globalThis, 'clearInterval')
    let api
    const Comp = defineComponent({
      setup() {
        api = useCountdown(100)
        api.start()
        return () => h('div')
      }
    })
    const w = mount(Comp)
    expect(api.running.value).toBe(true)
    w.unmount()
    expect(api.running.value).toBe(false)
    expect(spyClear).toHaveBeenCalled()
  })
})
