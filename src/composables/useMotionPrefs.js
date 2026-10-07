/**
 * 动效能力分级（P3-T3，system_design §5.3 三层降级）
 *
 * 三档语义：
 *  - 'full'    高档：全量动效（fade + rise、指示器滑动、按压反馈等）
 *  - 'reduced' 中档：精简动效（只保留 opacity 溶解，去掉位移类 transform）
 *  - 'off'     低档：全关（含系统「减弱动效」这一硬约束，优先级最高）
 *
 * 判定依据与优先级：
 *  1. prefers-reduced-motion: reduce —— 无条件 'off'。这是可访问性硬约束，
 *     不是性能优化：用户在系统层面表达了「我要少动」，任何能力判断都不得覆盖它。
 *  2. navigator.hardwareConcurrency + navigator.deviceMemory —— 粗粒度设备能力。
 *     deviceMemory 在 Safari/Firefox 不存在 → 缺省按 4GB（探测不到不等于设备差，
 *     不因 API 缺失而错误降档；真机实测后的校准留给 P5-T3）。
 *
 * 为什么是模块级单例：档位是「设备属性」而非组件状态，全站必须共享同一判定，
 * 否则不同组件各自 new 一份 matchMedia 监听既浪费也 可能各算各的档。
 *
 * 消费方式：本模块把档位写到 <html data-motion-tier="...">，CSS 侧用属性选择器
 * 分流（见 main.css 的「区块进入动效」段）——JS 只判档，样式怎么降级由 CSS 单方面
 * 决定，两层各管一头。
 */
import { ref, watchEffect } from 'vue'

/** 档位常量（导出供测试与文档引用，避免魔法字符串散落） */
export const MOTION_TIERS = { FULL: 'full', REDUCED: 'reduced', OFF: 'off' }

// 单例状态：useMotionPrefs() 首次调用时初始化一次
const tier = ref(MOTION_TIERS.FULL)
let started = false

/** 按当前设备环境计算档位（独立函数，便于测试直测） */
export function computeMotionTier() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return MOTION_TIERS.FULL
  }
  // 硬约束：系统「减弱动效」= 全关，不看硬件
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return MOTION_TIERS.OFF
  }
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4
  if (cores >= 6 && mem >= 4) return MOTION_TIERS.FULL
  if (cores >= 4) return MOTION_TIERS.REDUCED
  return MOTION_TIERS.OFF
}

/**
 * 动效档位（全站单例）
 * @returns {{ tier: import('vue').Ref<'full'|'reduced'|'off'> }}
 */
export function useMotionPrefs() {
  if (!started && typeof window !== 'undefined') {
    started = true
    tier.value = computeMotionTier()
    // 系统偏好可被用户随时切换（设置里开/关「减弱动效」）→ 监听变化实时生效，不要求刷新。
    // 守卫必须与 computeMotionTier 的口径一致：那里已经容忍「没有 matchMedia」，
    // 这里若直接调用就会在紧随其后抛错，让兜底形同虚设。
    if (typeof window.matchMedia === 'function') {
      window
        .matchMedia('(prefers-reduced-motion: reduce)')
        .addEventListener('change', () => { tier.value = computeMotionTier() })
    }
    // 档位落到 <html> 属性：CSS 属性选择器据此分流（JS 判档 / CSS 降级，两层解耦）
    watchEffect(() => {
      document.documentElement.setAttribute('data-motion-tier', tier.value)
    })
  }
  return { tier }
}
