<!--
  ErrorBookView —— 错题本（独立页面）
  职责：
   - 从 IndexedDB 读取全部错题记录
   - 按学科 / 复习状态筛选，展示错题统计
   - 支持「已掌握 / 仍需复习」标记（更新 SM-2 间隔复习字段）
   - 支持删除单条错题
   - 提供跳回来源页面的入口
-->
<template>
  <div class="error-book">
    <!-- 面包屑 -->
    <nav class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="crumb-sep">/</span>
      <span>错题本</span>
    </nav>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">加载中…</div>

    <template v-else>
      <!-- 去复习入口：错题本降为二级入口，实际复习行动在 /review（P0-6） -->
      <router-link to="/review" class="review-entry card" :class="{ 'has-due': dueCount > 0 }">
        <span class="review-entry__icon"><AppIcon name="refresh-cw" :size="18" /></span>
        <span class="review-entry__text">去复习（{{ dueCount }}）</span>
        <span class="review-entry__go">→</span>
      </router-link>

      <!-- 统计概览 -->
      <section class="card stats-card">
        <div class="stat-item">
          <span class="stat-num">{{ errors.length }}</span>
          <span class="stat-label">全部错题</span>
        </div>
        <div class="stat-item">
          <span class="stat-num stat-warn">{{ unreviewedCount }}</span>
          <span class="stat-label">待复习</span>
        </div>
        <div class="stat-item">
          <span class="stat-num stat-ok">{{ masteredCount }}</span>
          <span class="stat-label">已掌握</span>
        </div>
        <div class="stat-item">
          <span class="stat-num stat-primary">{{ masteredRate }}%</span>
          <span class="stat-label">掌握率</span>
        </div>
      </section>

      <!-- 筛选工具栏 -->
      <section class="card filter-card">
        <div class="filter-group">
          <span class="filter-label">学科：</span>
          <button
            v-for="f in subjectFilters"
            :key="f.key"
            class="filter-btn"
            :class="{ active: subjectFilter === f.key }"
            @click="subjectFilter = f.key"
          >{{ f.label }}</button>
        </div>
        <div class="filter-group">
          <span class="filter-label">状态：</span>
          <button
            v-for="f in statusFilters"
            :key="f.key"
            class="filter-btn"
            :class="{ active: statusFilter === f.key }"
            @click="statusFilter = f.key"
          >{{ f.label }}</button>
        </div>
        <div class="filter-group">
          <span class="filter-label">类型：</span>
          <button
            v-for="f in kindFilters"
            :key="f.key"
            class="filter-btn"
            :class="{ active: kindFilter === f.key }"
            @click="kindFilter = f.key"
          >{{ f.label }}</button>
        </div>
        <div class="filter-group">
          <span class="filter-label">归因：</span>
          <button
            class="filter-btn"
            :class="{ active: reasonFilter === 'all' }"
            @click="reasonFilter = 'all'"
          >全部</button>
          <button
            v-for="r in REASONS"
            :key="r"
            class="filter-btn"
            :class="{ active: reasonFilter === r }"
            @click="reasonFilter = r"
          >{{ r }}</button>
          <button
            class="filter-btn"
            :class="{ active: reasonFilter === 'none' }"
            @click="reasonFilter = 'none'"
          >未归因</button>
        </div>
        <button class="add-stuck-btn" @click="composerOpen = true"><AppIcon name="square-pen" :size="15" /> + 卡点</button>
        <button v-if="filtered.length > 0" class="clear-btn" @click="clearAll"><AppIcon name="trash-2" :size="15" /> 清空全部</button>
      </section>

      <!-- 卡点录入（同一组件，与 /review 顶部共用） -->
      <StuckCardComposer :open="composerOpen" @saved="onStuckSaved" @close="composerOpen = false" />

      <!-- 归因分布（H3：归因是用户自评数据，与自动判分分别统计、不合并） -->
      <section v-if="errors.length" class="card dist-card">
        <span class="dist-title">归因分布</span>
        <div class="dist-list">
          <span v-for="d in distribution" :key="d.reason" class="dist-item" :class="{ 'dist-item--none': d.reason === 'none' }">
            <span class="dist-label">{{ d.label }}</span>
            <span class="dist-num">{{ d.count }}</span>
          </span>
        </div>
      </section>

      <!-- 空状态 -->
      <section v-if="filtered.length === 0" class="card empty-card">
        <p class="empty-title">{{ errors.length === 0 ? '还没有错题记录' : '当前筛选下没有错题' }}</p>
        <p class="empty-desc">
          {{ errors.length === 0 ? '做题答错后会自动收录到错题本，方便集中复习巩固。' : '试试切换筛选条件。' }}
        </p>
        <router-link to="/" class="empty-link">← 去学习</router-link>
      </section>

      <!-- 错题列表 -->
      <section v-else class="error-list">
        <article
          v-for="(err, i) in filtered"
          :key="err.id"
          class="card error-item"
          :class="{ mastered: isMastered(err) }"
        >
          <div class="error-head">
            <span class="error-index">{{ i + 1 }}</span>
            <span class="subject-tag" :class="'tag-' + err.subject">
              <AppIcon :name="subjectIconName(err.subject)" :size="13" />
              {{ (SUBJECT_META[err.subject] && SUBJECT_META[err.subject].name) || err.subject }}
            </span>
            <span v-if="err.difficulty" class="difficulty-tag" :class="diffClass(err.difficulty)">
              {{ diffLabel(err.difficulty) }}
            </span>
            <span v-if="err.reason" class="reason-tag">{{ err.reason }}</span>
            <!-- 来源角标（B-4）：'cloze' = 默写专项错句入队（练习/考试入队无此字段） -->
            <span v-if="err.source === 'cloze'" class="cloze-tag">默写</span>
            <!-- 卡点角标（P1-10）：kind='stuck' = 操作类卡点（错题行无此字段） -->
            <span v-if="err.kind === CARD_KINDS.STUCK" class="stuck-tag">卡点</span>
            <span v-if="err.wrongCount > 1" class="wrongcount-tag">错 {{ err.wrongCount }} 次</span>
            <span v-if="err.unitTitle" class="source-tag">{{ err.unitTitle }}</span>
            <span class="error-date">{{ fmtDate(err.createdAt) }}</span>
          </div>

          <!-- 题干 -->
          <div class="error-question">
            <MathJaxRender :text="err.question" />
          </div>

          <!-- 作答与正确答案 -->
          <div class="error-answers">
            <div v-if="err.userAnswer" class="answer-line answer-user">
              <span class="answer-label">我的作答：</span>
              <span class="answer-text"><MathJaxRender :text="err.userAnswer" /></span>
            </div>
            <div class="answer-line answer-correct">
              <span class="answer-label">正确答案：</span>
              <span class="answer-text"><MathJaxRender :text="err.correctAnswer" /></span>
            </div>
            <div v-if="err.explanation" class="answer-line answer-expl">
              <span class="answer-label">解析：</span>
              <span class="answer-text"><MathJaxRender :text="err.explanation" /></span>
            </div>
          </div>

          <!-- 操作区 -->
          <div class="error-actions">
            <button
              v-if="!isMastered(err)"
              class="act-btn act-master"
              @click="markMastered(err)"
            ><AppIcon name="check" :size="14" /> 已掌握</button>
            <button
              v-else
              class="act-btn act-relearn"
              @click="markRelearn(err)"
            ><AppIcon name="rotate-ccw" :size="14" /> 仍需复习</button>
            <!-- 卡点的 fileKey 是虚拟键 'stuck:<module>'，会被 sourceRoute() 按 '_' 切成坏路由 → 必须挡 -->
            <router-link
              v-if="err.fileKey && err.kind !== CARD_KINDS.STUCK"
              :to="sourceRoute(err)"
              class="act-btn act-source"
            ><AppIcon name="book-open" :size="14" /> 查看原题</router-link>
            <button class="act-btn act-del" @click="removeError(err)"><AppIcon name="trash-2" :size="14" /> 删除</button>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import { diffLabel, diffClass } from '@/utils/blockMeta'
import { useStudyDbStore } from '@/stores/studyDb'
import { getSubjectConfig, SUBJECT_META } from '@/content/index'
import { GRADES, gradeCard, isMastered, countDue, CARD_KINDS } from '@/composables/useSpacedReview'
import { REASONS, reasonDistribution } from '@/utils/practiceMetrics'
import AppIcon from '@/components/AppIcon.vue'
import StuckCardComposer from '@/components/StuckCardComposer.vue'

const db = useStudyDbStore()

// 学科图标名（数据层唯一取值来源 = SUBJECT_META；未学科目兜底空串渲染为空 svg）
function subjectIconName(subject) {
  return SUBJECT_META[subject]?.icon || ''
}

// 全部错题
const errors = ref([])
const loading = ref(true)

// 筛选状态
const subjectFilter = ref('all')
const statusFilter = ref('all')
const reasonFilter = ref('all')
// 卡片种类筛选（P1-10：全部 / 错题 / 卡点）
const kindFilter = ref('all')
// 卡点录入（P1-10）
const composerOpen = ref(false)

const subjectFilters = [
  { key: 'all', label: '全部' },
  ...Object.entries(SUBJECT_META).map(([key, meta]) => ({ key, label: meta.name }))
]
const statusFilters = [
  { key: 'all', label: '全部' },
  { key: 'unreviewed', label: '待复习' },
  { key: 'reviewed', label: '已掌握' }
]
// 卡片种类筛选（P1-10）：判据用 CARD_KINDS 常量，禁止内联 'stuck'
const kindFilters = [
  { key: 'all', label: '全部' },
  { key: CARD_KINDS.ERROR, label: '错题' },
  { key: CARD_KINDS.STUCK, label: '卡点' }
]

// 统计（判据唯一真相源 isMastered，H7）——
// 存量数字零变化：迁移把 reviewed===true 固化为 legacyMastered 后，isMastered 仍为 true
const masteredCount = computed(() => errors.value.filter(isMastered).length)
const unreviewedCount = computed(() => errors.value.filter((e) => !isMastered(e)).length)
const masteredRate = computed(() => {
  if (!errors.value.length) return 0
  return Math.round((masteredCount.value / errors.value.length) * 100)
})
// 今日待复习（与 /review 队列同一判据）—— 顶部「去复习（N）」入口用
const dueCount = computed(() => countDue(errors.value))

// 归因分布（六选一 + 未归因；H3：与自动判分口径分开，纯函数单一真相源）
const distribution = computed(() => reasonDistribution(errors.value))

// 筛选后的错题（按时间倒序）
const filtered = computed(() => {
  let list = errors.value
  if (subjectFilter.value !== 'all') {
    list = list.filter((e) => e.subject === subjectFilter.value)
  }
  // key 保持 'unreviewed'/'reviewed' 不动（防 statusFilter 默认值漂移），只换判据为 isMastered
  if (statusFilter.value === 'unreviewed') list = list.filter((e) => !isMastered(e))
  if (statusFilter.value === 'reviewed') list = list.filter(isMastered)
  if (kindFilter.value === CARD_KINDS.STUCK) list = list.filter((e) => e.kind === CARD_KINDS.STUCK)
  else if (kindFilter.value === CARD_KINDS.ERROR) list = list.filter((e) => e.kind !== CARD_KINDS.STUCK)
  if (reasonFilter.value === 'none') list = list.filter((e) => !e.reason)
  else if (reasonFilter.value !== 'all') list = list.filter((e) => e.reason === reasonFilter.value)
  return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
})

// 日期格式化
function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 跳回来源页面（根据 fileKey 反推路由参数）
function sourceRoute(err) {
  // fileKey 形如 math_01_01-集合的概念与表示
  const parts = (err.fileKey || '').split('_')
  const subject = parts[0] || 'math'
  const unitNum = parts[1] || ''
  // 通过学科配置反查文件索引
  let fileIndex = 0
  try {
    const config = getSubjectConfig(subject)
    const unit = config.units.find((u) => u.num === unitNum)
    if (unit) {
      const idx = unit.files.findIndex((f) => err.fileKey === `${subject}_${unitNum}_${f.name}`)
      if (idx >= 0) fileIndex = idx
    }
  } catch (e) { /* 忽略 */ }
  return { name: 'unit', params: { subject, unitNum, fileIndex } }
}

// 标记为已掌握（统一评分入口 gradeCard，仅换入口不改行为）
async function markMastered(err) {
  try {
    // gradeCard 是唯一 SM-2 写库入口（**不写 reviewed**）；「已掌握」按钮的语义是用户手动标注，
    // 故在此基础上显式补写 reviewed:true —— 行为与改造前一致，只是评分路径统一了
    const { next } = await gradeCard(db, err, GRADES.GOOD)
    const updated = { ...next, reviewed: true }
    await db.updateError(updated)
    const idx = errors.value.findIndex((e) => e.id === err.id)
    if (idx >= 0) errors.value[idx] = updated
  } catch (e) {
    console.error('[ErrorBook] 标记已掌握失败:', e)
  }
}

// 标记为仍需复习（重置 SM-2）
async function markRelearn(err) {
  const updated = {
    ...err,
    reviewed: false,
    // 必须清 legacyMastered：迁移固化后若不清，isMastered 仍返回 true，按钮会变哑键（最易漏的一处）
    legacyMastered: false,
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReviewDate: fmtDate(Date.now()),
    lastReviewedAt: Date.now()
  }
  await db.updateError(updated)
  const idx = errors.value.findIndex((e) => e.id === err.id)
  if (idx >= 0) errors.value[idx] = updated
}

// 删除单条（软删：写墓碑，跨设备删除同步）
async function removeError(err) {
  if (!window.confirm('确定删除这道错题吗？')) return
  await db.deleteErrorSoft(err.id)
  errors.value = errors.value.filter((e) => e.id !== err.id)
}

// 清空全部（软删：逐条写墓碑，保证删除能同步到其他设备）
async function clearAll() {
  if (!window.confirm(`确定清空全部 ${errors.value.length} 条错题吗？此操作不可恢复。`)) return
  await db.clearAllErrorsSoft()
  errors.value = []
}

// 卡点保存后重取列表（新卡点入本，「待复习」计数随之更新）
async function onStuckSaved() {
  composerOpen.value = false
  try {
    errors.value = await db.getAllErrors()
  } catch (e) {
    console.error('[ErrorBook] 刷新失败:', e)
  }
}

// 加载错题
onMounted(async () => {
  try {
    // 一次性迁移（幂等）：把存量 reviewed===true 固化为 legacyMastered，保证「已掌握」计数稳定。
    // 迁移属数据面变更，写入行数留痕一行（H6 精神）；失败不阻断页面渲染。
    const migrated = await db.migrateLegacyMastered()
    if (migrated > 0) console.info(`[ErrorBook] 已迁移 ${migrated} 条历史「已掌握」标注`)
    errors.value = await db.getAllErrors()
  } catch (e) {
    console.error('[ErrorBook] 加载失败:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.error-book { display: flex; flex-direction: column; gap: var(--spacer-16); }
.breadcrumb { color: var(--text-muted); font-size: 0.85rem; }
.crumb-sep { margin: 0 var(--spacer-8); }
.loading { text-align: center; padding: var(--spacer-48); color: var(--text-muted); }

/* 去复习入口 */
.review-entry {
  display: flex; align-items: center; gap: var(--spacer-10);
  padding: var(--spacer-12) var(--spacer-16);
  color: var(--text); text-decoration: none;
  border-left-width: 4px; border-left-color: var(--primary);
}
.review-entry.has-due { border-left-color: var(--warning); }
.review-entry__icon { display: inline-flex; color: var(--primary); }
.review-entry.has-due .review-entry__icon { color: var(--warning); }
.review-entry__text { flex: 1; font-weight: 600; }
.review-entry__go { color: var(--text-muted); }

/* 统计卡片 */
.stats-card { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacer-12); }
.stat-item { text-align: center; }
.stat-num { display: block; font-size: 1.6rem; font-weight: 700; color: var(--text); }
.stat-warn { color: var(--warning); }
.stat-ok { color: var(--success); }
.stat-primary { color: var(--primary); }
.stat-label { font-size: 0.8rem; color: var(--text-muted); }

/* 筛选工具栏 */
.filter-card { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacer-12); }
.filter-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.filter-label { font-size: 0.85rem; color: var(--text-muted); }
.filter-btn {
  padding: 4px 14px; border-radius: var(--radius-full);
  border: 1px solid var(--border); background: var(--surface);
  font-size: 0.85rem; cursor: pointer;
}
.filter-btn:hover { border-color: var(--primary); color: var(--primary); }
.filter-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.clear-btn {
  margin-left: auto; padding: 4px 14px; border-radius: var(--radius-full);
  border: 1px solid var(--danger); background: transparent; color: var(--danger);
  font-size: 0.82rem; cursor: pointer;
}
.clear-btn:hover { background: var(--danger); color: #fff; }
.add-stuck-btn {
  padding: 4px 14px; border-radius: var(--radius-full);
  border: 1px solid var(--primary); background: transparent; color: var(--primary);
  font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;
}
.add-stuck-btn:hover { background: var(--primary); color: #fff; }

/* 归因分布（P0-4）：六选一 + 未归因 */
.dist-card { display: flex; flex-direction: column; gap: var(--spacer-8); }
.dist-title { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
.dist-list { display: flex; flex-wrap: wrap; gap: 8px; }
.dist-item {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 12px; border-radius: var(--radius-full);
  background: var(--surface-muted); font-size: 0.8rem;
}
.dist-item--none { color: var(--text-muted); }
.dist-num { font-weight: 700; color: var(--primary); }

/* 空状态 */
.empty-card { text-align: center; padding: var(--spacer-40); }
.empty-title { font-size: 1.1rem; font-weight: 600; margin-bottom: var(--spacer-8); }
.empty-desc { color: var(--text-muted); font-size: 0.85rem; margin-bottom: var(--spacer-16); }
.empty-link { color: var(--primary); }

/* 错题列表 */
.error-list { display: flex; flex-direction: column; gap: var(--spacer-12); }
.error-item { padding: var(--spacer-16); border-left-width: 4px; border-left-color: var(--danger); }
.error-item.mastered { border-left-color: var(--success); opacity: 0.85; }
.error-head { display: flex; align-items: center; gap: var(--spacer-8); flex-wrap: wrap; margin-bottom: var(--spacer-10); }
.error-index {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--primary-soft); color: var(--primary);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
}
.subject-tag { font-size: 0.75rem; padding: 2px 10px; border-radius: var(--radius-full); font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
.tag-math { background: rgba(79, 70, 229, 0.12); color: #4f46e5; }
.tag-chinese { background: rgba(220, 38, 38, 0.12); color: #dc2626; }
.tag-computer { background: rgba(14, 165, 233, 0.12); color: #0ea5e9; }
.tag-undefined { background: var(--surface-muted); color: var(--text-muted); }
/* 暗色模式下提高学科标签对比度（难度标签样式见 src/assets/css/blocks.css） */
:root[data-theme="dark"] .tag-math { color: #8f9dff; }
:root[data-theme="dark"] .tag-chinese { color: #ff8a8a; }
:root[data-theme="dark"] .tag-computer { color: #6fc7f5; }
.source-tag { font-size: 0.72rem; padding: 1px 10px; border-radius: var(--radius-full); background: var(--surface-muted); color: var(--text-muted); }
.reason-tag { font-size: 0.72rem; padding: 1px 10px; border-radius: var(--radius-full); background: var(--primary-soft); color: var(--primary); }
.wrongcount-tag { font-size: 0.72rem; padding: 1px 10px; border-radius: var(--radius-full); background: rgba(var(--danger-rgb), 0.1); color: var(--danger); }
.cloze-tag { font-size: 0.72rem; padding: 1px 10px; border-radius: var(--radius-full); background: rgba(var(--warning-rgb), 0.15); color: var(--warning); }
.stuck-tag { font-size: 0.72rem; padding: 1px 10px; border-radius: var(--radius-full); background: rgba(var(--warning-rgb), 0.15); color: var(--warning); }
.error-date { margin-left: auto; font-size: 0.75rem; color: var(--text-muted); }

.error-question { margin-bottom: var(--spacer-10); }

.error-answers { display: flex; flex-direction: column; gap: var(--spacer-6); margin-bottom: var(--spacer-12); }
.answer-line { font-size: 0.9rem; }
.answer-user { color: var(--danger); }
.answer-correct { color: var(--success); }
.answer-expl { color: var(--text-muted); }
.answer-label { font-weight: 600; }
.answer-text { word-break: break-word; }

.error-actions { display: flex; gap: var(--spacer-8); flex-wrap: wrap; }
.act-btn {
  padding: 5px 14px; border-radius: var(--radius-full);
  border: 1px solid var(--border); background: var(--surface);
  font-size: 0.82rem; cursor: pointer; text-decoration: none; color: var(--text);
  display: inline-flex; align-items: center; gap: 5px;
}
.act-btn:hover { transform: translateY(-1px); }
.act-master { border-color: var(--success); color: var(--success); }
.act-master:hover { background: var(--success); color: #fff; }
.act-relearn { border-color: var(--warning); color: var(--warning); }
.act-relearn:hover { background: var(--warning); color: #fff; }
.act-source { border-color: var(--primary); color: var(--primary); }
.act-source:hover { background: var(--primary); color: #fff; }
.act-del { border-color: var(--danger); color: var(--danger); }
.act-del:hover { background: var(--danger); color: #fff; }

@media (max-width: 600px) {
  .stats-card { grid-template-columns: repeat(2, 1fr); }
  /* 触控目标 ≥44px */
  .filter-btn, .clear-btn, .act-btn, .add-stuck-btn {
    min-height: 44px;
    display: inline-flex; align-items: center; justify-content: center;
  }
}
</style>
