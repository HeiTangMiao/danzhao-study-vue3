<script setup>
/**
 * ReciteTaskCard —— 「每日背诵」的任务入口卡（两种形态复用同一个计数出口）。
 *
 * ★ 数据只读 `store.viewModel`（I10 / P0-6 验收）：home 与 review 两处入口**必须**读同一个
 *   getter，否则会出现「两个入口的重默篇数不一致」。本组件不遍历 `rows` / `bank` 自行统计，
 *   也不做任何日期运算 —— 逾期天数只经 `overdueDays(row, today)` 这一个出口（设计 §7.5：
 *   在 `.vue` 里出现 `+1` / `addDays` / `new Date()` 就是位置错了）。
 *
 * ★ 无任务时**整卡不渲染**（不出现占位空卡）：
 *   - `home`：`hasTask === false`（既无今日新篇、也无到期重默）；
 *   - `review`：`dueCount === 0`（复习 Tab 只关心「今天还有几篇要重默」，无新篇概念）。
 *
 * ★ 计数一律用 `dueCount`（今日**可作**、已被 `DAILY_DUE_LIMIT` 截断），
 *   **不用** `dueTotal`（全部到期数）—— 用错了会显示「重默 8 篇」但点进去只有 5 篇。
 *
 * ★ 视觉：复用 `card` + `today-task` / `continue-card` 的行高与内边距，不新增视觉语言；
 *   且**不使用**橙色实心填充（首页橙色门禁：实心 ≤ 1 处，那个名额属于「继续学习」）。
 */
import { computed, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useReciteStore } from '@/stores/recite'
import { overdueDays } from '@/composables/useReciteSchedule'

const props = defineProps({
  /** `home` = 学习 Tab 主入口（整卡）；`review` = 复习 Tab 次级入口（单行） */
  variant: { type: String, default: 'home' }
})

const store = useReciteStore()

// 首屏靠这一行把产物拉起来（幂等：已加载则立即 resolve）。直接落 `/` 时 store 还是空的。
onMounted(() => {
  store.init()
})

const vm = computed(() => store.viewModel)

/** 是否有东西可显示（false ⇒ 连根节点都不渲染） */
const visible = computed(() =>
  props.variant === 'review' ? vm.value.dueCount > 0 : vm.value.hasTask
)

/**
 * 主行篇目：优先「今日待重默」的第一条，其次「今日新篇」。
 * ⚠️ 两者形状不同：`due` 的条目是 `{ piece, row }`，`fresh` 直接是 **piece 本身**
 * （见 `buildQueue` 的返回值）。这里统一抹平成同一形状，模板不必区分。
 */
const main = computed(() => {
  const due = vm.value.due
  if (Array.isArray(due) && due.length > 0) {
    const item = due[0]
    const piece = item && item.piece ? item.piece : {}
    const row = item && item.row ? item.row : {}
    const stage = Number.isInteger(row.stage) ? row.stage : 0
    return {
      title: piece.title || '',
      fileTitle: piece.fileTitle || '',
      blankCount: Number.isFinite(piece.blankCount) ? piece.blankCount : 0,
      tag: `第 ${stage + 1} 次重默`,
      // 0 同时覆盖「今天到期 / 排期在未来 / 已毕业 / 算不出来」→ 正好等于「不显示角标」
      overdue: overdueDays(row, store.today)
    }
  }
  const fresh = vm.value.fresh
  if (fresh) {
    return {
      title: fresh.title || '',
      fileTitle: fresh.fileTitle || '',
      blankCount: Number.isFinite(fresh.blankCount) ? fresh.blankCount : 0,
      tag: '新篇',
      overdue: 0
    }
  }
  return null
})

/** 计数行：「今日新篇 N 篇 · 待重默 M 篇」，某一项为 0 时只显示另一项 */
const countText = computed(() => {
  const parts = []
  if (vm.value.freshCount > 0) parts.push(`今日新篇 ${vm.value.freshCount} 篇`)
  if (vm.value.dueCount > 0) parts.push(`待重默 ${vm.value.dueCount} 篇`)
  return parts.join(' · ')
})
</script>

<template>
  <!-- 复习 Tab 次级入口：单行；无到期时整行不渲染 -->
  <router-link v-if="visible && variant === 'review'" to="/recite" class="rtc-review card">
    <span class="rtc-review__icon"><AppIcon name="book-open" :size="16" /></span>
    <span class="rtc-review__text">今日背诵 · 重默 {{ vm.dueCount }} 篇</span>
    <span class="rtc-review__go">→</span>
  </router-link>

  <!-- 学习 Tab 主入口：整卡；无任务时整卡不渲染 -->
  <router-link v-else-if="visible" to="/recite" class="rtc-home card">
    <span class="rtc-home__head">
      <span class="rtc-home__title">今日背诵</span>
      <span v-if="vm.streak > 0" class="rtc-home__streak">连续 {{ vm.streak }} 天</span>
    </span>

    <span v-if="main" class="rtc-home__main">
      <span class="rtc-home__name">{{ main.title }}</span>
      <span v-if="main.fileTitle" class="rtc-home__from">{{ main.fileTitle }}</span>
      <span class="rtc-home__meta">
        <span class="rtc-tag">{{ main.tag }}</span>
        <span class="rtc-home__blanks">{{ main.blankCount }} 空</span>
        <span v-if="main.overdue > 0" class="rtc-tag rtc-tag--overdue">逾期 {{ main.overdue }} 天</span>
      </span>
    </span>

    <span v-if="countText" class="rtc-home__count">{{ countText }}</span>
  </router-link>
</template>

<style scoped>
/* 主卡：行高与内边距对齐 `today-task` / `continue-card`，不新增视觉语言 */
.rtc-home {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-8);
  padding: var(--spacer-14) var(--spacer-16);
  margin-bottom: var(--spacer-20);
  border-left: 4px solid var(--primary);
  transition: background 0.15s;
}
.rtc-home:hover { background: var(--surface-muted); }
.rtc-home__head {
  display: flex; align-items: baseline; justify-content: space-between; gap: var(--spacer-8);
}
.rtc-home__title { font-weight: 700; font-size: 0.95rem; }
.rtc-home__streak { font-size: 0.78rem; color: var(--text-muted); flex: 0 0 auto; }
.rtc-home__main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rtc-home__name { font-size: 0.92rem; font-weight: 600; }
.rtc-home__from { font-size: 0.78rem; color: var(--text-muted); }
.rtc-home__meta { display: flex; align-items: center; gap: var(--spacer-8); flex-wrap: wrap; }
.rtc-home__blanks { font-size: 0.78rem; color: var(--text-muted); }
.rtc-home__count { font-size: 0.78rem; color: var(--text-muted); }
.rtc-tag {
  font-size: 0.72rem;
  padding: 1px var(--spacer-8);
  border-radius: var(--radius-full);
  background: var(--surface-muted);
  color: var(--text-muted);
}
.rtc-tag--overdue { background: transparent; color: var(--warning); border: 1px solid var(--warning); }

/* 次级入口：单行，与复习页 `.rv-tools` 的行高一致 */
.rtc-review {
  display: flex;
  align-items: center;
  gap: var(--spacer-8);
  padding: var(--spacer-12) var(--spacer-16);
  margin-bottom: var(--spacer-12);
  min-height: 44px;
  transition: background 0.15s;
}
.rtc-review:hover { background: var(--surface-muted); }
.rtc-review__icon { display: inline-flex; color: var(--text-muted); flex: 0 0 auto; }
.rtc-review__text { flex: 1; min-width: 0; font-size: 0.86rem; font-weight: 600; }
.rtc-review__go { color: var(--text-muted); flex: 0 0 auto; }
</style>
