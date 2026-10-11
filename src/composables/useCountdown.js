/**
 * 倒计时 composable —— deadline 校准口径（批 F · F-2 / Fc5）
 *
 * 为什么用 deadline 而不是 `timeLeft--` 累减：
 *   setInterval 在后台标签页会被浏览器节流（低至 1 次/分钟）、主线程繁忙时还会丢帧 ——
 *   累减会「越走越慢」，剩余时间偏大且无法自愈。改为每秒用「目标时刻 − 当前时刻」求差，
 *   切回前台后自动校正、不漂移（与 ExamBlock 的交卷倒计时同款口径，见其 startExam）。
 *
 * 用法：`const { timeLeft, running, start, stop, reset } = useCountdown(sec)`。
 * 仅新建块（workcard）使用；不改动 ExamBlock / PracticeSession（那属下一批迁移，本批只登记）。
 *
 * @param {number} [totalSec=0] 默认总秒数
 * @returns {{ timeLeft: import('vue').Ref<number>, running: import('vue').Ref<boolean>,
 *            start: (sec?: number) => void, stop: () => void, reset: (sec?: number) => void }}
 */
import { ref, onBeforeUnmount, getCurrentInstance } from 'vue'

export function useCountdown(totalSec = 0) {
  const initial = Math.max(0, Math.floor(Number(totalSec) || 0))
  const timeLeft = ref(initial)
  const running = ref(false)

  let timer = null
  let deadline = 0

  /** 以「目标时刻 − 当前时刻」求剩余秒数（ceil：不足 1 秒也显示 1，到 0 才归零） */
  const remaining = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000))

  function tick() {
    timeLeft.value = remaining()
    if (timeLeft.value <= 0) stop()
  }

  /** 启动倒计时：deadline = now + sec*1000（sec 省略则用构造时的 totalSec） */
  function start(sec) {
    const seconds = Number(sec ?? totalSec) || 0
    if (seconds <= 0) {
      timeLeft.value = 0
      return
    }
    deadline = Date.now() + seconds * 1000
    timeLeft.value = seconds
    running.value = true
    if (timer) clearInterval(timer)
    timer = setInterval(tick, 1000)
  }

  /** 停止并清除定时器（幂等） */
  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    running.value = false
  }

  /** 复位到指定秒数（停止计时） */
  function reset(sec) {
    stop()
    const seconds = Number(sec ?? totalSec) || 0
    timeLeft.value = Math.max(0, Math.floor(seconds))
  }

  // 组件卸载时自动清理（非组件上下文调用时不注册，避免 Vue 警告 —— 便于单测直接调用）
  if (getCurrentInstance()) onBeforeUnmount(stop)

  return { timeLeft, running, start, stop, reset }
}
