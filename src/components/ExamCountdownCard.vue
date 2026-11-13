<!--
  ExamCountdownCard —— P1-1 背诵侧「考试倒计时」只读展示位（examdate_sync）

  职责：消费 `studyPlan.nextMilestone`（唯一真相源）只显示**最近一个未来里程碑**的倒计时，
  点名是哪一条（避免被误读成单一 examDate），点击跳 /plan。只读、无写入口、不新增 Tab。

  三态：
   - 存在未来日期（含当天「还有 0 天」）→ 主文案 + 官方口径小字 + 「去设置 ›」
   - 三条全未设置 → 说明文案，不显示任何数字
   - 三条全已过 → 「本年度考试日期已过」，不显示负数倒计时

  「今天」判据在 store 的 `nextMilestone` 里用本地时区 YYYY-MM-DD 字符串比较，
  本组件不做任何日期运算（与 ReciteTaskCard 同一纪律），也不读 localStorage。
  文案统一「以浙江省教育考试院当年发布为准」，无结果承诺、无示例数字、无占位假数据。
-->
<script setup>
/**
 * 只读展示位。不调用 `load()` / `save()` / `setMilestoneDate()`：
 * 里程碑内存态由 PlanView.onMounted 的 `load()` 与同步引擎的远端应用共同维护，
 * 本组件只消费 computed，避免引入第二个写入口或把 budget/tasks 连带重置。
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStudyPlanStore } from '@/stores/studyPlan'

const store = useStudyPlanStore()
const router = useRouter()

/** 是否有任何一条填过合法日期（用于区分「全未设置」与「全已过」两种空态） */
const hasAnyDate = computed(() =>
  store.milestones.some((m) => /^\d{4}-\d{2}-\d{2}$/.test(String(m.date || '')))
)

/** 最近一个未来里程碑（≥ 今天的最小日期），无则 null */
const next = computed(() => store.nextMilestone)

/** 展示态：future / unset / past */
const state = computed(() => {
  if (next.value !== null) return 'future'
  return hasAnyDate.value ? 'past' : 'unset'
})

/** 只读跳转：交给真实路由；未注入 router 的环境静默降级，不抛给 UI */
function goPlan() {
  if (router) router.push('/plan')
}
</script>

<template>
  <button type="button" class="exam-countdown card" @click="goPlan">
    <template v-if="state === 'future'">
      <span class="exam-countdown__main">距「{{ next.label }}」还有 {{ next.days }} 天</span>
      <span class="exam-countdown__sub">最近一场 · 以浙江省教育考试院当年发布为准</span>
      <span class="exam-countdown__go">去设置 ›</span>
    </template>
    <template v-else-if="state === 'unset'">
      <span class="exam-countdown__main">考试日期待设置 · 以浙江省教育考试院当年发布为准</span>
      <span class="exam-countdown__go">去设置 ›</span>
    </template>
    <template v-else>
      <span class="exam-countdown__main">本年度考试日期已过 · 如需更新请前往学习计划</span>
      <span class="exam-countdown__go">去设置 ›</span>
    </template>
  </button>
</template>

<style scoped>
/* 复用 ReciteTaskCard 的行高 / 内边距 / 描边，不新增视觉语言；
   橙色只用 4px 左边框（首页橙色门禁：实心 ≤ 1 处，那个名额属于「继续学习」）。 */
.exam-countdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-8);
  width: 100%;
  min-height: 44px;
  padding: var(--spacer-14) var(--spacer-16);
  margin-bottom: var(--spacer-20);
  text-align: left;
  font-family: inherit;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-left: 4px solid var(--primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s;
}
.exam-countdown:hover { background: var(--surface-muted); }
.exam-countdown__main { font-size: 0.92rem; font-weight: 600; line-height: 1.35; }
.exam-countdown__sub { font-size: 0.78rem; color: var(--text-muted); }
.exam-countdown__go { align-self: flex-end; font-size: 0.78rem; color: var(--primary); }
</style>
