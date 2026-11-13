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
 * 必做配套：该键已加入 studyDb.exportAllData 的备份清单，否则导出备份不含计划。
 *
 * ⚠️ 受控例外（examdate_sync）：三条里程碑自本期起**提升为账号级同步数据**，
 *    经 sync/engine.js 的旁路实体 `exam_milestone` 逐条同步（3 个独立 item_key）。
 *    `budget` / `tasks` 仍是设备本地、不进云同步；`DB_VERSION` 保持 8，不迁 IndexedDB。
 *    这是历史载体（学习计划三件套自 v4 起留在 localStorage）造成的一次性例外，
 *    不扩大到其它 localStorage 键。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** 周预算目标（P0-7 验收 1：用户周预算 32 小时）。单一来源，禁止视图另写 32 */
export const WEEKLY_BUDGET_HOURS = 32

/** 每日预算目标（周预算 / 7，≈4.6h）——「今日实际耗时 vs 预算」的对比基准（P-D6 只做全局） */
export const DAILY_BUDGET_HOURS = WEEKLY_BUDGET_HOURS / 7

/**
 * 同步实体名（旁路实体，不进 `ENTITIES` 7 项）。
 * `src/sync/engine.js` 导出同值常量，两处由测试断言相等，避免漂移。
 */
export const MILESTONE_ENTITY = 'exam_milestone'

/**
 * 旧存档里「学员手填过日期但没有时间戳」的兜底时间。
 * `sync-core.shouldAccept` 是严格 `>`，故用最早合法时间：服务端无该行时接受为新增，
 * 已有更新行时正确丢弃。也是 `applySyncedMilestoneRows()` 收到缺时间戳行时的兜底。
 */
export const LEGACY_MIGRATED_AT = '1970-01-01T00:00:00.000Z'

/** 同步状态取值白名单（P1-2 弱提示；未登录 / 正常态均不展示小字） */
const SYNC_STATUSES = ['local', 'synced', 'pending', 'offline']

/**
 * 里程碑（P0-7 验收 2）：`date` 默认为 `''` = 未设置，由学员按当年官方通知自行填写。
 * 不预设年份、也不预设月日 —— 相应年度的考试安排尚未由官方发布，任何推定锚点都不作为默认值。
 * `daysUntil('')` 返回 null，视图据此显示「待设置」。倒计时 = 目标日 - 今天（天）。
 *
 * `updatedAt`：LWW 裁决唯一依据（客户端本地时钟，ISO 8601 UTC）。
 * `''` = 从未被用户 / 同步写入过 → 不推送同步行（保 `tests/sync-engine.test.js` ⑤ `pushed:1`）。
 */
export const MILESTONES = [
  { id: 'op', label: '技能操作考', date: '', updatedAt: '' },
  { id: 'theory', label: '理论考', date: '', updatedAt: '' },
  { id: 'academic', label: '语数考试', date: '', updatedAt: '' }
]

/**
 * 旧推定默认值（官方未发布，仅用于旧存档迁移匹配）：老版本把这三个字面量写进了
 * `study_plan_v1`，命中即视为「未设置」并回落 `''`。
 * ⚠️ 禁止把它们重新用作 MILESTONES 默认值 —— 它们不是考试日期，只是迁移匹配键。
 * 存档里没有 isUserSet 标记，无法区分「学员恰好手填了同一天」与「沿用旧默认值」；
 * 按来件方案只做字面量精确匹配，因此只命中这三个值，用户改过的其他日期一律保留。
 */
export const LEGACY_DEFAULT_DATES = Object.freeze([
  '2026-11-30',
  '2027-04-15',
  '2027-06-07'
])

/** localStorage 键（§7 P-D1）：与 studyDb.exportAllData 备份清单保持一致 */
const STORAGE_KEY = 'study_plan_v1'

/**
 * 周预算默认值的**单一来源**（`budget` 初值与 `load()` 的无条件重置共用）。
 * 不另写一份字面量：切账号重置若与初值漂移，会出现「重置后合计不是 32」的静默偏差。
 */
const DEFAULT_BUDGET = Object.freeze({ math: 10, chinese: 8, computer: 14, other: 0 })

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

/**
 * 旧存档里程碑日期迁移：命中三个旧推定默认值 → 视为「未设置」（`''`）。
 * 只按字面量精确匹配，不清除用户改过的任何日期；非字符串 / 空值同样回落 `''`。
 * @param {unknown} savedDate `study_plan_v1` 里的 milestone.date
 * @returns {string} 迁移后的日期
 */
function migrateMilestoneDate(savedDate) {
  const date = typeof savedDate === 'string' ? savedDate : ''
  return LEGACY_DEFAULT_DATES.includes(date) ? '' : date
}

/** 远端同步行的 `date` 形状：`''`（清空 / 未设置）或 YYYY-MM-DD */
function isValidMilestoneDate(value) {
  return value === '' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

/**
 * 单调不减的业务时间戳（客户端本地时钟，ISO 8601 UTC）。
 * `shouldAccept` 是严格 `>`：同毫秒连改若不加 1ms，第二次会被服务端丢弃，
 * 违背「最后一次写入生效」。`prevUpdatedAt` 缺失 / 非法时按 0 处理。
 * @param {string} prevUpdatedAt 该里程碑上一次的时间戳
 * @returns {string} ISO 8601 UTC 字符串
 */
function nextMonotonicTimestamp(prevUpdatedAt) {
  const parsed = typeof prevUpdatedAt === 'string' ? Date.parse(prevUpdatedAt) : NaN
  const prevMs = Number.isFinite(parsed) ? parsed : 0
  return new Date(Math.max(Date.now(), prevMs + 1)).toISOString()
}

export const useStudyPlanStore = defineStore('studyPlan', () => {
  // ===== ① 周预算（科目 × 小时，手填）=====
  const budget = ref({ ...DEFAULT_BUDGET })
  const budgetTotal = computed(() =>
    Object.values(budget.value).reduce((s, h) => s + (Number(h) || 0), 0)
  )
  // 合计 != 32 → false：页面给温和提示，**不阻断**保存与使用（验收 1）
  const budgetValid = computed(() => budgetTotal.value === WEEKLY_BUDGET_HOURS)

  // ===== ② 里程碑（date 可编辑 + updatedAt 同步时间戳）=====
  const milestones = ref(MILESTONES.map((m) => ({ ...m })))
  const countdowns = computed(() =>
    milestones.value.map((m) => ({ ...m, days: daysUntil(m.date) })) // days<0 = 已过
  )

  /** 同步状态（P1-2）：'local' | 'synced' | 'pending' | 'offline' */
  const syncStatus = ref('local')

  /**
   * 最近一个未来里程碑：只取 **≥ 今天** 的最小日期。
   * 「今天」用本地时区 `YYYY-MM-DD` 字符串比较（与 `daysUntil()` 的本地零点、recite 调度同口径），
   * 禁用 `toISOString().slice(0,10)`（东八区早上 8 点前会错一天）。
   * 当天算「还有 0 天」；全已过 / 全未设置返回 null（视图走空态，不显示负数）。
   */
  const nextMilestone = computed(() => {
    const todayStr = getDateStr()
    let best = null
    for (const m of milestones.value) {
      const date = String(m.date || '')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      if (date < todayStr) continue
      if (best === null || date < best.date) best = { ...m, date }
    }
    if (best === null) return null
    return { id: best.id, label: best.label, date: best.date, days: daysUntil(best.date) }
  })

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

  /**
   * 从 localStorage 读取：**先无条件重置到默认，再套用存档**（全程不写盘）。
   *
   * 为什么必须先重置（换账号隔离 P0 + 半残存档自愈）：
   *   本 store 是 Pinia **setup store 单例**，SPA 内切账号 / 路由重挂都不重建实例，
   *   视图读内存不读盘。若沿用「增量 merge」，空存档、半残存档（缺 milestones/tasks
   *   字段）、损坏 JSON 都会把上一账号的 budget / milestones / tasks 留在内存里显示，
   *   且下一次 `save()` 会把整包旧数据写回（残留复活）。
   *   故契约是「默认态 = 起点，parsed 只是覆盖层」：任何异常路径都自然停在默认态。
   *
   * ⚠️ 全程不写盘：旧推定默认值的迁移结果仍由之后的任意一次 `save()` 自愈写回
   *    （`migrateMilestoneDate` 的语义不变）。
   * ⚠️ ★ 必须透传 `updatedAt`：现有 `MILESTONES.map` 只返回 `{...base, date}`，
   *    若漏带 `updatedAt`，每次刷新后时间戳归零 → 同步行推不出去 → 跨设备静默失效且零报错。
   * ⚠️ 何时需要补显式 `resetInMemory()` action（当前**不必**：全仓唯一写消费者是
   *    `PlanView.vue`，其 `onMounted` 每次挂载都调本函数，所有可观测/写盘路径都过这里）：
   *    将来若新增「不经过 load() 就消费本 store」的入口（新的非 PlanView 视图、
   *    路由守卫展示计划数据、或切账号不卸载 PlanView 的形态），本函数就不再是唯一闸门，
   *    届时必须加 action 并在换账号处同步调用（setup store 无 `$reset()` 可用）。
   */
  function load() {
    today.value = getDateStr() // 刷新「今天」（跨天后再进页面时顺延口径正确）
    // ① 无条件重置到默认（单一来源：DEFAULT_BUDGET / MILESTONES）
    budget.value = { ...DEFAULT_BUDGET }
    milestones.value = MILESTONES.map((m) => ({ ...m }))
    tasks.value = []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return
      // ② 再套用存档（只覆盖 parsed 里实际存在的字段）
      if (parsed.budget && typeof parsed.budget === 'object') {
        budget.value = { ...budget.value, ...parsed.budget }
      }
      if (Array.isArray(parsed.milestones)) {
        // 以默认里程碑的 id/label/顺序为准，仅套用存储里改过的 date / updatedAt（防旧结构漂移）。
        // 旧推定默认值（官方未发布）会被老存档原样读回 → 经迁移一律视为「未设置」。
        // 之后的任意一次 save() 会把迁移结果写回，旧值自然消失（自愈，无需单独清库）。
        milestones.value = MILESTONES.map((base) => {
          const saved = parsed.milestones.find((x) => x && x.id === base.id)
          if (!saved) return { ...base }
          const date = migrateMilestoneDate(saved.date)
          let updatedAt = typeof saved.updatedAt === 'string' ? saved.updatedAt : ''
          // 旧存档手填过日期但无时间戳 → 补最早合法时间，保证这条能作为新增推送
          if (!updatedAt && date !== '') updatedAt = LEGACY_MIGRATED_AT
          return { ...base, date, updatedAt }
        })
      }
      if (Array.isArray(parsed.tasks)) {
        tasks.value = parsed.tasks.filter((t) => t && typeof t === 'object' && t.id && t.title)
      }
    } catch (e) {
      // 损坏 JSON / 存储不可用：内存已停在默认态，不抛（对齐「不阻塞」原则）
      console.warn('[studyPlan] 读取失败，已回落默认值:', e)
    }
  }

  /** 写 localStorage（仅在用户交互后触发，防每次计算写盘）；整包写含 updatedAt */
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

  /**
   * 修改里程碑日期（**唯一写入口**，由 PlanView 的三条 `<input type="date">` 调用）。
   *
   * 契约（本轮授权放开「清空」）：
   *  - `YYYY-MM-DD` → 设为该日期（格式校验口径与原实现一致，只校验形状、不校验真实月日）；
   *  - **空值 `''` / `null` / `undefined` → 清回「未设置」（`''`）**：
   *    `<input type="date">` 清空时 `value` 即为 `''`，学员可撤销误填；
   *    `daysUntil('')` 返回 null，视图回到「待设置 · 以当年官方通知为准」空态；
   *  - 其它非法值（非字符串 / 格式不符）→ **拒绝**：保持原值不变、不写盘、不改状态。
   *
   * 清空写回的是空串 `''`，不是 `LEGACY_DEFAULT_DATES` 里的旧推定默认值；
   * `load()` 的 `migrateMilestoneDate('')` 不命中任何迁移键，故 reload 后仍是
   * 「未设置」，旧默认值不会复活（`save()` 的自愈写回同样只写 `''`）。
   * 只改 `id` 命中的那一条，其余里程碑原样不动；盖**单调不减** `updatedAt`，
   * 并把同步状态置 `pending`（联网后由引擎推这一条 `date:''` 的正常行，不用墓碑）。
   *
   * @param {string} id 里程碑 id（'op' | 'theory' | 'academic'）
   * @param {string|null|undefined} date YYYY-MM-DD，或空值表示清空
   * @returns {void}
   */
  function setMilestoneDate(id, date) {
    const isEmpty = date === '' || date === null || date === undefined
    const isValid = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    if (!isEmpty && !isValid) return
    const nextDate = isEmpty ? '' : date
    const current = milestones.value.find((m) => m.id === id)
    if (!current) return
    const updatedAt = nextMonotonicTimestamp(current.updatedAt)
    milestones.value = milestones.value.map((m) =>
      m.id === id ? { ...m, date: nextDate, updatedAt } : m
    )
    save()
    setSyncStatus('pending')
  }

  /**
   * 采集里程碑同步行（旁路实体，供 `engine.collectChanges()` 追加）。
   *
   * 三条 = 三个独立 `item_key`（`op` / `theory` / `academic`）→ 服务端主键
   * `(user_id, entity, item_key)` 天然互不覆盖（P0-3）。
   * ⚠️ 只推 `updatedAt !== ''` 的行：全新 store 三条都是 `''` → 0 行，
   *    这是 `tests/sync-engine.test.js` ⑤ `pushed:1` 不放宽通过的前提。
   * @returns {Array<{entity: string, key: string, payload: object, updatedAt: string, deleted: boolean}>}
   */
  function getMilestoneSyncRows() {
    return milestones.value
      .filter((m) => typeof m.updatedAt === 'string' && m.updatedAt !== '')
      .map((m) => ({
        entity: MILESTONE_ENTITY,
        key: m.id,
        payload: { id: m.id, label: m.label, date: m.date, updatedAt: m.updatedAt },
        updatedAt: m.updatedAt,
        deleted: false
      }))
  }

  /**
   * 应用远端里程碑行（**按 id 逐项覆盖，绝不整包替换** —— P0-3 客户端侧保证）。
   *
   * 白名单：只采信 `date` + 行顶层 `updatedAt`；`payload.id` / `payload.label` 一律
   * 以本地 `MILESTONES` 为准（防远端脏数据改 id / label）。
   * 防御：`key` 未命中三条 → 跳过；`date` 形状非法 → 跳过该行、保持原值；
   * `deleted:true`（旧客户端 / 脏数据）→ 按「把该条清成 `''`」处理，绝不删行。
   * 有变更才 `save()` 一次；任何异常路径都不得清空整包。
   *
   * @param {Array<object>} rows 远端行（`entity === 'exam_milestone'`）
   * @returns {void}
   */
  function applySyncedMilestoneRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return
    let changed = false
    const next = milestones.value.slice()
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const idx = next.findIndex((m) => m.id === row.key)
      if (idx < 0) continue

      // deleted:true 视为清空；否则只采信形状合法的 payload.date
      let date
      if (row.deleted === true) {
        date = ''
      } else {
        const payload = row.payload && typeof row.payload === 'object' ? row.payload : null
        if (!payload || !isValidMilestoneDate(payload.date)) continue
        date = payload.date
      }
      const updatedAt =
        typeof row.updatedAt === 'string' && row.updatedAt !== ''
          ? row.updatedAt
          : LEGACY_MIGRATED_AT
      next[idx] = { ...next[idx], date, updatedAt }
      changed = true
    }
    if (!changed) return
    milestones.value = next
    save()
  }

  /**
   * 回写同步状态（由 `engine.runSync()` 调用；UI 只在 pending/offline 且已登录时显示弱提示）。
   * @param {string} s 'local' | 'synced' | 'pending' | 'offline'
   * @returns {void}
   */
  function setSyncStatus(s) {
    if (SYNC_STATUSES.indexOf(s) >= 0) syncStatus.value = s
  }

  return {
    budget,
    budgetTotal,
    budgetValid,
    milestones,
    countdowns,
    nextMilestone,
    syncStatus,
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
    setMilestoneDate,
    getMilestoneSyncRows,
    applySyncedMilestoneRows,
    setSyncStatus
  }
})
