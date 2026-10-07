// @vitest-environment jsdom
/**
 * P3 动效能力分级 + View Transitions 降级 测试（M1：补两个新模块的零覆盖）
 *
 * 为什么要锁这些契约：
 *  1. prefers-reduced-motion 是**可访问性硬约束**，不是性能优化 —— 一旦被硬件档位
 *     覆盖，系统层「我要少动」的诉求就失效了，属于静默违规（用户不会报错，只会难受）。
 *  2. 档位边界（≥6核&&≥4G=full / ≥4核=reduced / 其余=off）是纯函数，边界一改，
 *     全站动效表现随之改变，必须有回归。
 *  3. 探测不到 deviceMemory（Safari/Firefox 没有这个 API）时不得降档 ——
 *     「探测不到」不等于「设备差」，否则 iPhone 会被误判成低端机。
 *  4. 隐藏态只挂在 full / reduced 两档；off 档元素天然可见。这条是 UnitView
 *     白屏风险的兜底契约：任何一档下内容都必须最终可见。
 *
 * 环境说明：jsdom 不实现 window.matchMedia，故所有用例都显式覆盖全局，
 * 断言的是「被测代码在各种环境下的判定口径」，不依赖宿主默认实现。
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { effectScope } from 'vue'
import { MOTION_TIERS, computeMotionTier } from '@/composables/useMotionPrefs'
import {
  supportsViewTransitions,
  prefersReducedMotion,
  withRouteTransition
} from '@/utils/viewTransition'

/** 系统「减弱动效」的标准 query，与 useMotionPrefs / viewTransition 中保持一致 */
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * 造一个够用的 MediaQueryList：被测代码只用到 matches 与 addEventListener。
 * @param {string} query media query 字符串
 * @param {boolean} matches 是否命中
 * @returns {object} MediaQueryList 替身
 */
function makeMql(query, matches) {
  return {
    media: query,
    matches,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }
}

/**
 * 在一段回调内临时改写全局环境，退出时**按原描述符**还原。
 * 不用 vi.stubGlobal：这里要还原的是「window 这个全局本身」，而 jsdom 环境里
 * globalThis.window 是访问器属性，只有按描述符还原才能保证后续用例环境不被污染。
 *
 * @param {Record<string, unknown>} patch 要覆盖的全局（值传 undefined 即模拟「不存在」）
 * @param {() => T} fn 在临时环境里执行的用例体
 * @returns {T} fn 的返回值
 * @template T
 */
function withGlobals(patch, fn) {
  const saved = new Map()
  for (const key of Object.keys(patch)) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, {
      value: patch[key],
      configurable: true,
      writable: true
    })
  }
  try {
    return fn()
  } finally {
    for (const [key, desc] of saved) {
      if (desc) Object.defineProperty(globalThis, key, desc)
      else delete globalThis[key]
    }
  }
}

/**
 * 一次性覆盖动效判定用到的三个全局：window.matchMedia / navigator / document。
 * 缺省环境 = 「无减弱要求 + 4 核 4G + 支持 VT」的普通中端机。
 *
 * @param {{ reduce?: boolean, cores?: number, mem?: number, doc?: object }} env
 *        mem 传 undefined 模拟 Safari/Firefox 无 deviceMemory；doc 覆盖 document
 * @returns {(fn: () => T) => T} 执行器
 * @template T
 */
function givenEnv({ reduce = false, cores = 4, mem = 4, doc } = {}) {
  return (fn) =>
    withGlobals(
      {
        window: {
          matchMedia: (query) => makeMql(query, query === REDUCE_QUERY && reduce)
        },
        navigator: { hardwareConcurrency: cores, deviceMemory: mem },
        ...(doc ? { document: doc } : {})
      },
      fn
    )
}

describe('computeMotionTier 档位判定', () => {
  it('系统要求减弱动效 → 无条件 off（硬件再好也不得覆盖这条硬约束）', () => {
    // 16 核 / 16G 的顶配机器，只要用户勾选了「减弱动效」，就必须是 off
    givenEnv({ reduce: true, cores: 16, mem: 16 })(() => {
      expect(computeMotionTier()).toBe(MOTION_TIERS.OFF)
    })
  })

  it('cores≥6 且 mem≥4 → full', () => {
    givenEnv({ cores: 8, mem: 8 })(() => {
      expect(computeMotionTier()).toBe(MOTION_TIERS.FULL)
    })
  })

  it('其余 cores≥4 → reduced', () => {
    givenEnv({ cores: 4, mem: 4 })(() => {
      expect(computeMotionTier()).toBe(MOTION_TIERS.REDUCED)
    })
  })

  it('cores<4 → off（内存再大也救不了核数）', () => {
    givenEnv({ cores: 2, mem: 8 })(() => {
      expect(computeMotionTier()).toBe(MOTION_TIERS.OFF)
    })
  })

  it('deviceMemory 探测不到 → 缺省按 4GB，不因此错误降档', () => {
    // Safari/Firefox 没有 navigator.deviceMemory：8 核机器仍应判 full
    givenEnv({ cores: 8, mem: undefined })(() => {
      expect(computeMotionTier()).toBe(MOTION_TIERS.FULL)
    })
  })

  it('window 不存在（SSR / Node 环境）→ full，且不抛错', () => {
    withGlobals({ window: undefined }, () => {
      expect(() => computeMotionTier()).not.toThrow()
      expect(computeMotionTier()).toBe(MOTION_TIERS.FULL)
    })
  })

  it('window 存在但没有 matchMedia → full（与无 window 同一档降级口径）', () => {
    withGlobals({ window: {} }, () => {
      expect(computeMotionTier()).toBe(MOTION_TIERS.FULL)
    })
  })
})

describe('viewTransition 三层降级', () => {
  it('supportsViewTransitions：document.startViewTransition 不是函数时为 false', () => {
    givenEnv({ doc: {} })(() => {
      expect(supportsViewTransitions()).toBe(false)
    })
  })

  it('supportsViewTransitions：存在且为函数时为 true', () => {
    givenEnv({ doc: { startViewTransition: () => ({}) } })(() => {
      expect(supportsViewTransitions()).toBe(true)
    })
  })

  it('prefersReducedMotion：matchMedia 命中 reduce 为 true，否则 false', () => {
    givenEnv({ reduce: true })(() => {
      expect(prefersReducedMotion()).toBe(true)
    })
    givenEnv({ reduce: false })(() => {
      expect(prefersReducedMotion()).toBe(false)
    })
  })

  it('prefersReducedMotion：没有 matchMedia 时为 false（不崩、不误判成减弱）', () => {
    withGlobals({ window: {} }, () => {
      expect(prefersReducedMotion()).toBe(false)
    })
  })

  it('withRouteTransition：不支持 VT → 直调 update，不做任何包装', () => {
    const update = vi.fn()
    givenEnv({ reduce: false, doc: {} })(() => {
      withRouteTransition(update)
    })
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('withRouteTransition：即使支持 VT，系统要求减弱动效时也必须直调（硬约束优先级更高）', () => {
    const startViewTransition = vi.fn(() => ({ finished: Promise.resolve() }))
    const update = vi.fn()
    givenEnv({ reduce: true, doc: { startViewTransition } })(() => {
      withRouteTransition(update)
    })
    expect(update).toHaveBeenCalledTimes(1)
    expect(startViewTransition).not.toHaveBeenCalled()
  })

  it('withRouteTransition：支持且无减弱要求 → 用 startViewTransition 包裹，且只调一次', () => {
    const startViewTransition = vi.fn(() => ({ finished: Promise.resolve() }))
    const update = vi.fn()
    givenEnv({ reduce: false, doc: { startViewTransition } })(() => {
      withRouteTransition(update)
    })
    expect(startViewTransition).toHaveBeenCalledTimes(1)
    // 必须把 update 原样交给浏览器：包进去之后再自己调一次会导致导航执行两遍
    expect(startViewTransition.mock.calls[0][0]).toBe(update)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('useMotionPrefs 落档', () => {
  /**
   * 单例性质：档位只在首次调用时算一次。为了在同一文件里跑多个环境，
   * 每条用例都用 resetModules + 动态 import 拿一份**全新的模块实例**，
   * 否则第二条用例会读到第一条留下的档位，测出来的是假绿。
   *
   * @param {Record<string, unknown>} patch 临时全局环境
   * @returns {Promise<string|null>} <html data-motion-tier> 的实际取值
   */
  async function mountFresh(patch) {
    vi.resetModules()
    const mod = await import('@/composables/useMotionPrefs')
    return withGlobals(patch, () => {
      const scope = effectScope()
      scope.run(() => mod.useMotionPrefs())
      const attr = document.documentElement.getAttribute('data-motion-tier')
      scope.stop()
      return attr
    })
  }

  it('把当前档位写到 <html data-motion-tier>，CSS 据此分流降级', async () => {
    const attr = await mountFresh({
      window: { matchMedia: (query) => makeMql(query, query === REDUCE_QUERY && false) },
      navigator: { hardwareConcurrency: 4, deviceMemory: 4 }
    })
    expect(attr).toBe(MOTION_TIERS.REDUCED)
  })

  it('宿主没有 matchMedia 时不抛错，档位按兜底口径落为 full', async () => {
    // 老 WebView / jsdom：computeMotionTier 走了兜底，注册监听这一步必须同步放过
    const attr = await mountFresh({ window: {} })
    expect(attr).toBe(MOTION_TIERS.FULL)
  })
})

describe('区块进入动效的 CSS 兜底契约', () => {
  /** 读取 main.css 中「区块进入动效」整段（该段位于文件末尾） */
  function revealSection() {
    // 用 cwd 定位：jsdom 环境下全局 URL 是 jsdom 的实现，交给 Node 的 fileURLToPath 会抛错
    const file = join(process.cwd(), 'src', 'assets', 'css', 'main.css')
    const css = readFileSync(file, 'utf8')
    const start = css.indexOf('区块进入动效')
    expect(start).toBeGreaterThan(-1)
    return css.slice(start)
  }

  it('隐藏态只挂在 full / reduced 两档；off 档不带任何隐藏规则', () => {
    const section = revealSection()
    const hiddenFull = /\[data-motion-tier='full'\]\s+\.block-anchor\s*\{[^}]*opacity:\s*0/s
    const hiddenReduced = /\[data-motion-tier='reduced'\]\s+\.block-anchor\s*\{[^}]*opacity:\s*0/s
    expect(hiddenFull.test(section)).toBe(true)
    expect(hiddenReduced.test(section)).toBe(true)
    // off 档若也写隐藏规则，而 JS 观察器又不启动 → 区块永久不可见（白屏）
    expect(section).not.toContain("[data-motion-tier='off']")
  })

  it('两档都存在把 .is-revealed 恢复为可见的规则（确保内容最终一定可见）', () => {
    const section = revealSection()
    for (const tierName of ['full', 'reduced']) {
      const revealed = new RegExp(
        `\\[data-motion-tier='${tierName}'\\]\\s+\\.block-anchor\\.is-revealed[^}]*opacity:\\s*1`,
        's'
      )
      expect(revealed.test(section)).toBe(true)
    }
  })
})
