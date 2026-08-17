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
      <router-link to="/">📚 首页</router-link>
      <span class="crumb-sep">/</span>
      <span>错题本</span>
    </nav>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">加载中…</div>

    <template v-else>
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
          <span class="stat-num stat-ok">{{ reviewedCount }}</span>
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
        <button v-if="filtered.length > 0" class="clear-btn" @click="clearAll">🗑 清空全部</button>
      </section>

      <!-- 空状态 -->
      <section v-if="filtered.length === 0" class="card empty-card">
        <div class="empty-icon">📭</div>
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
          :class="{ mastered: err.reviewed }"
        >
          <div class="error-head">
            <span class="error-index">{{ i + 1 }}</span>
            <span class="subject-tag" :class="err.subject === 'math' ? 'tag-math' : 'tag-chinese'">
              {{ err.subject === 'math' ? '📐 数学' : '✍️ 语文' }}
            </span>
            <span v-if="err.difficulty" class="difficulty-tag" :class="diffClass(err.difficulty)">
              {{ diffLabel(err.difficulty) }}
            </span>
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
              v-if="!err.reviewed"
              class="act-btn act-master"
              @click="markMastered(err)"
            >✅ 已掌握</button>
            <button
              v-else
              class="act-btn act-relearn"
              @click="markRelearn(err)"
            >🔄 仍需复习</button>
            <router-link
              v-if="err.fileKey"
              :to="sourceRoute(err)"
              class="act-btn act-source"
            >📖 查看原题</router-link>
            <button class="act-btn act-del" @click="removeError(err)">🗑 删除</button>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import { useStudyDbStore } from '@/stores/studyDb'
import { getSubjectConfig } from '@/content/index'

const db = useStudyDbStore()

// 全部错题
const errors = ref([])
const loading = ref(true)

// 筛选状态
const subjectFilter = ref('all')
const statusFilter = ref('all')

const subjectFilters = [
  { key: 'all', label: '全部' },
  { key: 'math', label: '数学' },
  { key: 'chinese', label: '语文' }
]
const statusFilters = [
  { key: 'all', label: '全部' },
  { key: 'unreviewed', label: '待复习' },
  { key: 'reviewed', label: '已掌握' }
]

// 难度映射
const DIFF_LABEL = { basic: '基础', medium: '中等', advanced: '提高', sprint: '冲刺' }
const DIFF_CLASS = { basic: 'difficulty-basic', medium: 'difficulty-medium', advanced: 'difficulty-advanced', sprint: 'difficulty-sprint' }
function diffLabel(d) { return DIFF_LABEL[d] || '基础' }
function diffClass(d) { return DIFF_CLASS[d] || 'difficulty-basic' }

// 统计
const unreviewedCount = computed(() => errors.value.filter((e) => !e.reviewed).length)
const reviewedCount = computed(() => errors.value.filter((e) => e.reviewed).length)
const masteredRate = computed(() => {
  if (!errors.value.length) return 0
  return Math.round((reviewedCount.value / errors.value.length) * 100)
})

// 筛选后的错题（按时间倒序）
const filtered = computed(() => {
  let list = errors.value
  if (subjectFilter.value !== 'all') {
    list = list.filter((e) => e.subject === subjectFilter.value)
  }
  if (statusFilter.value === 'unreviewed') list = list.filter((e) => !e.reviewed)
  if (statusFilter.value === 'reviewed') list = list.filter((e) => e.reviewed)
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

// SM-2 复习更新（标记为已掌握）
function sm2Review(err) {
  const now = new Date()
  const reps = (err.repetitions || 0) + 1
  let interval
  if (reps === 1) interval = 1
  else if (reps === 2) interval = 6
  else interval = Math.round((err.interval || 0) * (err.easeFactor || 2.5))
  const next = new Date(now)
  next.setDate(next.getDate() + interval)
  return {
    reviewed: true,
    reviewCount: (err.reviewCount || 0) + 1,
    repetitions: reps,
    interval,
    nextReviewDate: fmtDate(next.getTime()),
    lastReviewedAt: Date.now()
  }
}

// 标记为已掌握
async function markMastered(err) {
  const updated = { ...err, ...sm2Review(err) }
  await db.updateError(updated)
  const idx = errors.value.findIndex((e) => e.id === err.id)
  if (idx >= 0) errors.value[idx] = updated
}

// 标记为仍需复习（重置 SM-2）
async function markRelearn(err) {
  const updated = {
    ...err,
    reviewed: false,
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

// 删除单条
async function removeError(err) {
  if (!window.confirm('确定删除这道错题吗？')) return
  await db.deleteError(err.id)
  errors.value = errors.value.filter((e) => e.id !== err.id)
}

// 清空全部
async function clearAll() {
  if (!window.confirm(`确定清空全部 ${errors.value.length} 条错题吗？此操作不可恢复。`)) return
  await db.clearAllErrors()
  errors.value = []
}

// 加载错题
onMounted(async () => {
  try {
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

/* 空状态 */
.empty-card { text-align: center; padding: var(--spacer-40); }
.empty-icon { font-size: 3rem; margin-bottom: var(--spacer-12); }
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
.subject-tag { font-size: 0.75rem; padding: 2px 10px; border-radius: var(--radius-full); font-weight: 600; }
.tag-math { background: rgba(79, 70, 229, 0.12); color: #4f46e5; }
.tag-chinese { background: rgba(220, 38, 38, 0.12); color: #dc2626; }
.difficulty-tag { font-size: 0.72rem; padding: 1px 10px; border-radius: var(--radius-full); }
.difficulty-basic { background: rgba(47, 158, 68, 0.15); color: var(--success); }
.difficulty-medium { background: rgba(240, 140, 0, 0.15); color: var(--warning); }
.difficulty-advanced { background: rgba(224, 49, 49, 0.12); color: var(--danger); }
.difficulty-sprint { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.source-tag { font-size: 0.72rem; padding: 1px 10px; border-radius: var(--radius-full); background: var(--surface-muted); color: var(--text-muted); }
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
  display: inline-flex; align-items: center;
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
}
</style>
