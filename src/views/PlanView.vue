<!--
  PlanView —— 学习计划三件套（批 D D-2，P0-7）
  ① 周预算表 ② 里程碑倒计时 ③ 每日清单（今日 + 顺延）
  关键行为：漏一天自动顺延、不惩罚、不清零（顺延在 store 里由 computed 算出，不写回数据）。
  入口：HomeView 工具卡「学习计划」→ /plan（二级页，无 meta.tab，隐藏底部 pill）。
-->
<template>
  <div class="plan">
    <header class="plan-header">
      <h1>学习计划</h1>
      <p class="plan-sub">周预算 · 里程碑倒计时 · 每日清单（漏一天自动顺延，不惩罚）</p>
    </header>

    <!-- ⑧ 今日实际耗时 vs 每日预算目标（P-D6：本批只做全局；分科等待 P1-12） -->
    <section class="card plan-today">
      <div class="plan-today__row">
        <span class="plan-today__val">{{ todayHours }}</span>
        <span class="plan-today__unit">h</span>
      </div>
      <div class="plan-today__meta">
        <span>今日已学 / 目标约 {{ dailyTargetH }} h</span>
        <span class="plan-today__hint">分科耗时待 P1-12</span>
      </div>
    </section>

    <!-- ② 里程碑倒计时 -->
    <section class="card plan-block">
      <h2 class="plan-block__title">里程碑倒计时</h2>
      <div class="plan-milestones">
        <div v-for="m in store.countdowns" :key="m.id" class="plan-ms" :class="{ 'is-past': m.days !== null && m.days < 0 }">
          <input
            class="plan-ms__date"
            type="date"
            :value="m.date"
            aria-label="里程碑日期"
            @change="store.setMilestoneDate(m.id, $event.target.value)"
          />
          <span class="plan-ms__label">{{ m.label }}</span>
          <span class="plan-ms__days">
            <template v-if="m.days === null">—</template>
            <template v-else-if="m.days < 0">已过 {{ -m.days }} 天</template>
            <template v-else>还有 {{ m.days }} 天</template>
          </span>
        </div>
      </div>
    </section>

    <!-- ① 周预算表 -->
    <section class="card plan-block">
      <h2 class="plan-block__title">
        周预算
        <span class="plan-block__total" :class="{ 'is-warn': !store.budgetValid }">
          合计 {{ store.budgetTotal }} / {{ WEEKLY_BUDGET_HOURS }} h
        </span>
      </h2>
      <div class="plan-budget">
        <label v-for="s in budgetSubjects" :key="s.key" class="plan-budget__row">
          <span class="plan-budget__name">{{ s.name }}</span>
          <input
            class="plan-budget__input"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            :value="store.budget[s.key]"
            :aria-label="`${s.name} 周预算小时`"
            @change="store.setBudget(s.key, $event.target.value)"
          />
          <span class="plan-budget__unit">小时 / 周</span>
        </label>
      </div>
      <!-- 校验提示：不阻断保存与使用（验收 1） -->
      <p v-if="!store.budgetValid" class="plan-budget__note">
        当前合计 {{ store.budgetTotal }} h，与目标 {{ WEEKLY_BUDGET_HOURS }} h 不符 —— 可继续使用。
      </p>
    </section>

    <!-- ③ 每日清单 -->
    <section class="card plan-block">
      <h2 class="plan-block__title">今日清单</h2>

      <div class="plan-add">
        <select v-model="newSubject" class="plan-add__subject" aria-label="科目">
          <option v-for="s in budgetSubjects" :key="s.key" :value="s.key">{{ s.name }}</option>
        </select>
        <input
          v-model="newTitle"
          class="plan-add__title"
          type="text"
          placeholder="今天要做什么？"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          autocomplete="off"
          @keyup.enter="addTask"
        />
        <input v-model="newDue" class="plan-add__due" type="date" aria-label="截止日" />
        <button class="plan-add__btn" :disabled="!newTitle.trim()" @click="addTask">添加</button>
      </div>

      <p v-if="!store.todayList.length" class="plan-empty">今天没有待办 —— 在下面添加，或去练习页来一组。</p>
      <ul v-else class="plan-list">
        <li v-for="t in store.todayList" :key="t.id" class="plan-item">
          <button class="plan-item__check" :aria-label="'完成任务'" @click="store.toggleTask(t.id)">
            <AppIcon name="check" :size="14" />
          </button>
          <span class="plan-item__title" :class="{ 'is-overdue': store.overdue(t) }">
            {{ t.title }}
          </span>
          <span v-if="store.overdue(t)" class="plan-item__badge">顺延自 {{ t.dueDate }}</span>
          <span v-else class="plan-item__date">{{ t.dueDate }}</span>
          <button class="plan-item__del" aria-label="删除任务" @click="store.removeTask(t.id)">
            <AppIcon name="trash-2" :size="14" />
          </button>
        </li>
      </ul>

      <!-- 已完成（保留在数据里，可取消勾选 —— 不清零） -->
      <details v-if="doneTasks.length" class="plan-done">
        <summary>已完成 {{ doneTasks.length }} 项</summary>
        <ul class="plan-list plan-list--done">
          <li v-for="t in doneTasks" :key="t.id" class="plan-item">
            <button class="plan-item__check is-on" aria-label="取消完成" @click="store.toggleTask(t.id)">
              <AppIcon name="check" :size="14" />
            </button>
            <span class="plan-item__title is-done">{{ t.title }}</span>
            <button class="plan-item__del" aria-label="删除任务" @click="store.removeTask(t.id)">
              <AppIcon name="trash-2" :size="14" />
            </button>
          </li>
        </ul>
      </details>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useStudyPlanStore, WEEKLY_BUDGET_HOURS, DAILY_BUDGET_HOURS } from '@/stores/studyPlan'
import { useStudyDbStore } from '@/stores/studyDb'
import { SUBJECT_META } from '@/content/index'

const store = useStudyPlanStore()
const db = useStudyDbStore()

// 预算科目：三学科 + 其他（其他覆盖未列出的复习/整理时间）
const budgetSubjects = computed(() => [
  ...Object.entries(SUBJECT_META).map(([key, meta]) => ({ key, name: meta.name })),
  { key: 'other', name: '其他' }
])

// 新建任务表单
const newSubject = ref('math')
const newTitle = ref('')
const newDue = ref('')

function addTask() {
  if (!newTitle.value.trim()) return
  store.addTask({ subject: newSubject.value, title: newTitle.value, dueDate: newDue.value })
  newTitle.value = ''
}

/** 已完成任务（保留在 tasks 中，供取消勾选 → 不清零） */
const doneTasks = computed(() => store.tasks.filter((t) => t.done))

// 今日实际总耗时（全局 daily_stats.studyMinutes；分科等待 P1-12）
const todayMinutes = ref(0)
const todayHours = computed(() => (todayMinutes.value / 60).toFixed(1))
const dailyTargetH = DAILY_BUDGET_HOURS.toFixed(1)

onMounted(async () => {
  store.load()
  newDue.value = store.today
  try {
    const stat = await db.getDailyStat(store.today)
    todayMinutes.value = stat?.studyMinutes || 0
  } catch (e) {
    console.warn('[plan] 今日耗时加载失败:', e)
  }
})
</script>

<style scoped>
.plan { display: flex; flex-direction: column; gap: var(--gap-block-tight); }
.plan-header h1 { font-size: var(--fs-2xl); margin: 0; font-weight: var(--fw-semibold); }
.plan-sub { margin-top: var(--space-2); color: var(--text-muted); font-size: var(--fs-md); }

/* 今日耗时 */
.plan-today { display: flex; align-items: baseline; gap: var(--space-3); padding: var(--space-4); }
.plan-today__row { display: flex; align-items: baseline; gap: 2px; }
.plan-today__val { font-size: var(--fs-3xl); font-weight: var(--fw-semibold); color: var(--primary); }
.plan-today__unit { font-size: var(--fs-lg); color: var(--text-muted); }
.plan-today__meta { display: flex; flex-direction: column; gap: 2px; color: var(--text-muted); font-size: var(--fs-md); }
.plan-today__hint { font-size: var(--fs-xs); }

/* 通用区块 */
.plan-block { padding: var(--space-4); }
.plan-block__title {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
  font-size: var(--fs-lg); font-weight: var(--fw-semibold); margin-bottom: var(--space-3);
}
.plan-block__total { font-size: var(--fs-md); font-weight: var(--fw-normal); color: var(--text-muted); }
.plan-block__total.is-warn { color: var(--warning); }

/* 里程碑 */
.plan-milestones { display: flex; flex-direction: column; gap: var(--space-2); }
.plan-ms {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3); border-radius: var(--radius-md); background: var(--surface-muted);
}
.plan-ms.is-past { opacity: 0.7; }
.plan-ms__date {
  flex: 0 0 auto; min-height: 44px; padding: 0 var(--space-2); font-size: 16px; font-family: inherit;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  background: var(--surface); color: var(--text);
}
.plan-ms__label { flex: 1; font-size: var(--fs-base); }
.plan-ms__days { flex: 0 0 auto; font-weight: var(--fw-semibold); color: var(--primary); font-variant-numeric: tabular-nums; }
.plan-ms.is-past .plan-ms__days { color: var(--text-muted); }

/* 预算表 */
.plan-budget { display: flex; flex-direction: column; gap: var(--space-2); }
.plan-budget__row { display: flex; align-items: center; gap: var(--space-3); }
.plan-budget__name { flex: 0 0 4em; font-size: var(--fs-base); }
.plan-budget__input {
  width: 5em; min-height: 44px; padding: 0 var(--space-3); font-size: 16px; font-family: inherit;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  background: var(--surface-muted); color: var(--text);
}
.plan-budget__unit { color: var(--text-muted); font-size: var(--fs-sm); }
.plan-budget__note {
  margin-top: var(--space-3); padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md); background: rgba(var(--warning-rgb), 0.1);
  border: 1px solid var(--warning); color: var(--warning); font-size: var(--fs-sm);
}

/* 加任务 */
.plan-add { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); }
.plan-add__subject, .plan-add__due {
  min-height: 44px; padding: 0 var(--space-2); font-size: 16px; font-family: inherit;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  background: var(--surface-muted); color: var(--text);
}
.plan-add__title {
  flex: 1; min-width: 8em; min-height: 44px; padding: 0 var(--space-3); font-size: 16px; font-family: inherit;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  background: var(--surface-muted); color: var(--text);
}
.plan-add__btn {
  flex: 0 0 auto; min-height: 44px; padding: 0 var(--space-4); border-radius: var(--radius-full);
  background: var(--primary); color: #fff; font-weight: var(--fw-semibold);
}
.plan-add__btn:disabled { opacity: 0.45; }

/* 清单 */
.plan-empty { color: var(--text-muted); font-size: var(--fs-md); line-height: var(--lh-snug); }
.plan-list { list-style: none; display: flex; flex-direction: column; gap: var(--space-2); }
.plan-item { display: flex; align-items: center; gap: var(--space-2); }
.plan-item__check {
  position: relative;
  flex: 0 0 auto; width: 28px; height: 28px; border-radius: 50%;
  border: 1.5px solid var(--border); color: transparent; background: var(--surface);
  display: inline-flex; align-items: center; justify-content: center;
}
/* 触控目标 ≥44px（F1）：视觉保持 28px 圆点，用伪元素把命中区撑到 44×44，不改布局 */
.plan-item__check::after {
  content: ''; position: absolute; top: 50%; left: 50%;
  width: 44px; height: 44px; transform: translate(-50%, -50%);
}
.plan-item__check.is-on { background: var(--success); border-color: var(--success); color: #fff; }
.plan-item__title { flex: 1; font-size: var(--fs-base); }
.plan-item__title.is-overdue { color: var(--warning); }
.plan-item__title.is-done { text-decoration: line-through; color: var(--text-muted); }
.plan-item__badge {
  flex: 0 0 auto; font-size: var(--fs-xs); padding: 1px 8px; border-radius: var(--radius-full);
  background: rgba(var(--warning-rgb), 0.12); color: var(--warning);
}
.plan-item__date { flex: 0 0 auto; font-size: var(--fs-xs); color: var(--text-muted); }
.plan-item__del {
  position: relative;
  flex: 0 0 auto; width: 32px; height: 32px; border-radius: var(--radius-full);
  color: var(--text-muted); background: var(--surface-muted);
  display: inline-flex; align-items: center; justify-content: center;
}
/* 触控目标 ≥44px（F1）：同上，视觉 32px 圆点 + 44×44 命中区 */
.plan-item__del::after {
  content: ''; position: absolute; top: 50%; left: 50%;
  width: 44px; height: 44px; transform: translate(-50%, -50%);
}
.plan-done { margin-top: var(--space-3); }
/* 触控目标 ≥44px（F1）：撑高可点区（保留 list-item 的原生展开三角） */
.plan-done summary { color: var(--text-muted); font-size: var(--fs-md); cursor: pointer; min-height: 44px; padding: var(--space-2) 0; }
.plan-list--done { margin-top: var(--space-2); opacity: 0.85; }
</style>
