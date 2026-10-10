/**
 * studyPlan Store —— 学习计划三件套状态（批 D D-2，P0-7）
 *
 * 三件套：
 *  ① 周预算表（科目 × 小时，手填；合计 = 32h 校验提示，不阻断）
 *  ② 里程碑倒计时（操作考 / 理论考 / 语数考试；日期为可编辑默认值）
 *  ③ 每日清单（今日复习 + 本周该科任务 + 实际耗时对比预算）
 *
 * ★ 关键行为（P0-7 验收 4）：「漏一天自动顺延、不惩罚、不清零」——
 *   顺延是**计算**出来的（todayList = 未完成 && dueDate <= 今天），不写回数据，
 *   故天然「不惩罚、不清零、无 streak / penalty / missedDays 字段」。
 *
 * 存储：localStorage `study_plan_v1`（§7 P-D1 裁决，零升版、可逆；与 pomodoro_state 同款）。
 * 代价：计划不跨设备同步（已与用户明示）。
 * 必做配套：该键已加入 studyDb.exportAllData 的备份清单，否则导出备份不含计划。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** 周预算目标（P0-7 验收 1：用户周预算 32 小时）。单一来源，禁止视图另写 32 */
export const WEEKLY_BUDGET_HOURS = 32

/** 每日预算目标（周预算 / 7，≈4.6h）——「今日实际耗时 vs 预算」的对比基准（P-D6 只做全局） */
export const DAILY_BUDGET_HOURS = WEEKLY_BUDGET_HOURS / 7

/**
 * 里程碑（P0-7 验收 2）：日期为**可编辑默认值**（需求只给「11/30 / 次年 4 月 / 6、7 月」，
 * 精确日由用户在页面改；默认填当下最合理的锚点）。倒计时 = 目标日 - 今天（天）。
 */
export const MILESTONES = [
  { id: 'op', label: '技能操作考', date: '2026-11-30' },
  { id: 'theory', label: '理论考', date: '2027-04-15' },
  { id: 'academic', label: '语数考试', date: '2027-06-07' }
]

/** localStorage 键（§7 P-D1）：与 studyDb.exportAllData 备份清单保持一致 */
const STORAGE_KEY = 'study_plan_v1'

/** 本地时区 YYYY-MM-DD（与 studyDb.getDateStr 同口径） */
function getDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 把 YYYY-MM-DD 解析为**本地**当日零点（避免 UTC 解析导致的跨时区偏移） */
function parseLocalDate(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ''))
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/**
 * 距目标日的天数（相对今天的本地零点，向上取整）。
 * 已过日期返回负值（供「已过」样式）；日期非法返回 null。
 * @param {string} dateStr YYYY-MM-DD
 * @returns {number|null}
 */
export function daysUntil(dateStr) {
  const target = parseLocalDate(dateStr)
  if (!target) return null
  const now = new Date()
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((target.getTime() - todayMid.getTime()) / 86400000)
}

export const useStudyPlanStore = defineStore('studyPlan', () => {
  // ===== ① 周预算（科目 × 小时，手填）=====
  const budget = ref({ math: 10, chinese: 8, computer: 14, other: 0 })
  const budgetTotal = computed(() =>
    Object.values(budget.value).reduce((s, h) => s + (Number(h) || 0), 0)
  )
  // 合计 != 32 → false：页面给温和提示，**不阻断**保存与使用（验收 1）
  const budgetValid = computed(() => budgetTotal.value === WEEKLY_BUDGET_HOURS)

  // ===== ② 里程碑（date 可编辑）=====
  const milestones = ref(MILESTONES.map((m) => ({ ...m })))
  const countdowns = computed(() =>
    milestones.value.map((m) => ({ ...m, days: daysUntil(m.date) })) // days<0 = 已过
  )

  // ===== ③ 每日清单：[{ id, subject, title, dueDate(YYYY-MM-DD), done, doneAt }] =====
  const tasks = ref([])
  const today = ref(getDateStr())

  /**
   * 今日清单（P0-7 验收 4「漏一天自动顺延」的唯一实现点）：
   * = 未完成 且 dueDate <= 今天 的任务（含往期顺延下来的）。
   * 顺延是**计算**出来的，不写回数据 → 天然「不惩罚、不清零、无 streak 字段」。
   */
  const todayList = computed(() =>
    tasks.value
      .filter((t) => !t.done && (t.dueDate || '') <= today.value)
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
  )

  /** 是否顺延（用于「顺延」角标）：未完成且截止日早于今天 */
  const overdue = (t) => !!t && !t.done && (t.dueDate || '') < today.value

  /** 从 localStorage 读取（损坏 / 结构缺失 → 回落默认，不抛） */
  function load() {
    today.value = getDateStr() // 刷新「今天」（跨天后再进页面时顺延口径正确）
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return
      if (parsed.budget && typeof parsed.budget === 'object') {
        budget.value = { ...budget.value, ...parsed.budget }
      }
      if (Array.isArray(parsed.milestones)) {
        // 以默认里程碑的 id/label/顺序为准，仅套用存储里改过的日期（防旧结构漂移）
        milestones.value = MILESTONES.map((base) => {
          const saved = parsed.milestones.find((x) => x && x.id === base.id)
          return { ...base, date: saved && saved.date ? saved.date : base.date }
        })
      }
      if (Array.isArray(parsed.tasks)) {
        tasks.value = parsed.tasks.filter((t) => t && typeof t === 'object' && t.id && t.title)
      }
    } catch (e) {
      // 损坏 JSON：回落默认，不影响页面（对齐「不阻塞」原则）
      console.warn('[studyPlan] 读取失败，已回落默认值:', e)
    }
  }

  /** 写 localStorage（仅在用户交互后触发，防每次计算写盘） */
  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ budget: budget.value, milestones: milestones.value, tasks: tasks.value })
      )
    } catch (e) {
      console.warn('[studyPlan] 保存失败:', e)
    }
  }

  /** 设置某科目的周预算小时数（负数 / 非数 → 归 0） */
  function setBudget(subject, hours) {
    const n = Number(hours)
    budget.value = { ...budget.value, [subject]: Number.isFinite(n) && n >= 0 ? n : 0 }
    save()
  }

  /**
   * 新增每日任务
   * @param {{subject?: string, title: string, dueDate?: string}} opt dueDate 缺省 = 今天
   * @returns {object|null} 新任务（title 为空时不创建）
   */
  function addTask({ subject = '', title = '', dueDate = '' } = {}) {
    const t = String(title || '').trim()
    if (!t) return null
    const task = {
      id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      subject,
      title: t,
      dueDate: dueDate || getDateStr(),
      done: false,
      doneAt: null
    }
    tasks.value = [...tasks.value, task]
    save()
    return task
  }

  /** 勾选 / 取消勾选任务（保留在 tasks 中，不删除 → 不清零） */
  function toggleTask(id) {
    tasks.value = tasks.value.map((t) => {
      if (t.id !== id) return t
      const done = !t.done
      return { ...t, done, doneAt: done ? Date.now() : null }
    })
    save()
  }

  /** 删除任务（用户显式移除；非自动清零） */
  function removeTask(id) {
    tasks.value = tasks.value.filter((t) => t.id !== id)
    save()
  }

  /** 修改里程碑日期（仅接受 YYYY-MM-DD） */
  function setMilestoneDate(id, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return
    milestones.value = milestones.value.map((m) => (m.id === id ? { ...m, date } : m))
    save()
  }

  return {
    budget,
    budgetTotal,
    budgetValid,
    milestones,
    countdowns,
    tasks,
    today,
    todayList,
    overdue,
    load,
    save,
    setBudget,
    addTask,
    toggleTask,
    removeTask,
    setMilestoneDate
  }
})
