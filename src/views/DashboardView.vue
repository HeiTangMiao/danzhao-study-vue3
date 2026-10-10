<!--
  DashboardView —— 学习仪表盘（纯学习进度页）
  职责：
   - 展示核心学习数据（已接触页面 / 答题总数 / 错题 / 今日待复习）
   - 展示今日学习统计（访问页面 / 答题 / 学习时长）
   - 展示各学科进度双轨（已接触 vs 已掌握，基于内容配置计算总页面数）
   - 学情分析与复习建议（基于错题本聚合薄弱知识点）
  游戏化元素（等级/XP/连击/热力图/成就）已彻底移除。
  数据来自 studyDb.getLearningOverview()。
-->
<template>
  <div class="dashboard">
    <!-- 面包屑 -->
    <nav class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="crumb-sep">/</span>
      <span>学习仪表盘</span>
    </nav>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">加载中…</div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="error-hint card">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="load"><AppIcon name="refresh-cw" :size="16" /> 重试</button>
    </div>

    <template v-else-if="overview">
      <!-- 核心数据卡片 -->
      <section class="stat-grid">
        <div class="card stat-card">
          <div class="stat-icon"><AppIcon name="book-open" :size="22" /></div>
          <div class="stat-val">{{ overview.totalVisited }}</div>
          <div class="stat-label">已接触页面</div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon"><AppIcon name="pencil" :size="22" /></div>
          <div class="stat-val">{{ overview.totalQuestions }}</div>
          <div class="stat-label">答题总数</div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon"><AppIcon name="siren" :size="22" /></div>
          <div class="stat-val">{{ overview.errorsCount }}</div>
          <div class="stat-label">错题收录</div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon"><AppIcon name="rotate-ccw" :size="22" /></div>
          <div class="stat-val">{{ todayDue }}</div>
          <div class="stat-label">今日待复习</div>
        </div>
      </section>

      <!-- 今日学习 -->
      <section class="card today-card">
        <h2>今日学习</h2>
        <div class="today-grid">
          <div class="today-item">
            <span class="today-val">{{ overview.todayStat.filesVisited || 0 }}</span>
            <span class="today-label">访问页面</span>
          </div>
          <div class="today-item">
            <span class="today-val">{{ overview.todayStat.questionsAnswered || 0 }}</span>
            <span class="today-label">答题数</span>
          </div>
          <div class="today-item">
            <span class="today-val">{{ overview.todayStat.studyMinutes || 0 }}</span>
            <span class="today-label">学习时长（分钟）</span>
          </div>
        </div>
      </section>

      <!-- 学科进度双轨（P1-11）：已接触（访问即接触，主轨）vs 已掌握（页面级手动标注，次轨）。
           两「掌握」有意分离（§0.2）：本页次轨 = page_progress.masteredAt（页面级）；
           复习侧 isMastered()（error_book SM-2）是另一概念，勿在此读取。 -->
      <section class="card subject-progress-card">
        <h2>学科进度</h2>
        <div class="subject-progress-list">
          <div v-for="(meta, key) in SUBJECT_META" :key="key" class="subject-progress-item">
            <div class="subject-progress-head">
              <span class="subject-progress-icon"><AppIcon :name="meta.icon" :size="18" /></span>
              <span class="subject-progress-name">{{ meta.name }}</span>
              <span class="subject-progress-pct">{{ contactedPct(key) }}%</span>
            </div>
            <!-- 主轨：已接触（progress.completed 语义：内容页 visited；测验页 visited && testScore!=null） -->
            <div class="spb-row">
              <span class="spb-label">已接触</span>
              <div class="subject-progress-bar">
                <div class="subject-progress-fill" :style="{ width: contactedPct(key) + '%' }"></div>
              </div>
              <span class="spb-num">{{ progress.subjectTotalCompleted(key) }}/{{ subjectTotals[key] }}</span>
            </div>
            <!-- 次轨：已掌握（页面级手动标注 masteredAt，与复习侧 SM-2 是两个概念） -->
            <div class="spb-row">
              <span class="spb-label">已掌握</span>
              <div class="subject-progress-bar spb-bar--mastered">
                <div class="subject-progress-fill spb-fill--mastered" :style="{ width: masteredPct(key) + '%' }"></div>
              </div>
              <span class="spb-num">{{ progress.masteredCount(key) }}/{{ subjectTotals[key] }}</span>
            </div>
            <div class="subject-progress-stats">
              <span>答题 {{ overview.subjects[key].questions }} 题</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 学情分析与复习建议（基于错题本聚合的薄弱点洞察） -->
      <section v-if="weakAreas.length > 0" class="card insight-card">
        <h2>学情分析与复习建议</h2>
        <div v-if="todayDue > 0" class="insight-due">
          <AppIcon name="bell" :size="16" />
          今日有 <strong>{{ todayDue }}</strong> 道错题到期待复习
          <router-link to="/review" class="insight-link">去复习 →</router-link>
        </div>
        <div v-else class="insight-due insight-clear"><AppIcon name="check" :size="16" /> 今日没有到期错题，可以学习新内容</div>
        <p v-if="weakest" class="insight-tip">
          薄弱点集中在
          <strong>{{ weakest.name }} · {{ weakest.unitTitle }}</strong
          >（{{ weakest.count }} 道错题），建议优先回看该单元并重做错题。
        </p>
        <div class="insight-list">
          <div v-for="(w, i) in weakAreas" :key="i" class="insight-item">
            <span class="insight-rank">{{ i + 1 }}</span>
            <span class="insight-icon"><AppIcon :name="w.icon" :size="16" /></span>
            <span class="insight-name">{{ w.name }} · {{ w.unitTitle }}</span>
            <span class="insight-count" :class="{ 'count-warn': i === 0 }">{{ w.count }} 题</span>
          </div>
        </div>
      </section>
      <!-- 自评校准率（P1-9「用复习再测正确率反推」）——仅作相对排序，不构成成绩预测 -->
      <section v-if="calibration.some((r) => r.n > 0)" class="card calib-card">
        <h2>自评校准率</h2>
        <p class="calib-note">
          用复习再测的召回率反推自评的可靠性 —— 仅作两档之间的<b>相对比较</b>，不代表得分预测。
        </p>
        <div class="calib-list">
          <div v-for="row in calibration" :key="row.tier" class="calib-item">
            <span class="calib-name">{{ row.label }}</span>
            <span class="calib-rate">{{ row.rate === null ? '暂无可比数据' : row.rate + '%' }}</span>
            <span class="calib-sub">已复测 {{ row.reviewed }}/{{ row.n }} 题</span>
          </div>
        </div>
        <p v-if="calibHint" class="calib-hint">{{ calibHint }}</p>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStudyDbStore } from '@/stores/studyDb'
import { useProgressStore } from '@/stores/progress'
import { SELF_TIERS } from '@/stores/practice'
import { SUBJECT_META, getSubjectConfig } from '@/content/index'
import { countDue } from '@/composables/useSpacedReview'
import { selfCalibrationOf } from '@/utils/practiceMetrics'
import AppIcon from '@/components/AppIcon.vue'

const db = useStudyDbStore()
// 学科进度的聚合真相源（已接触 / 已掌握）—— 视图只渲染，不内联重算（H7）
const progress = useProgressStore()

// 仪表盘数据
const overview = ref(null)
const loading = ref(true)
// 加载失败提示
const error = ref('')

// 「已接触」百分比（completed 快照 / 学科总页数）；测验页以 testScore 为主口径（由 store 聚合）
function contactedPct(key) {
  const total = subjectTotals.value[key]
  if (!total) return 0
  return Math.round((progress.subjectTotalCompleted(key) / total) * 100)
}

// 「已掌握」百分比（页面级 masteredAt 快照 / 学科总页数）
function masteredPct(key) {
  const total = subjectTotals.value[key]
  if (!total) return 0
  return Math.round((progress.masteredCount(key) / total) * 100)
}

// 各学科页面总数（由内容配置计算）
const subjectTotals = computed(() => {
  const totals = {}
  for (const key of Object.keys(SUBJECT_META)) {
    const cfg = getSubjectConfig(key)
    totals[key] = cfg && cfg.units ? cfg.units.reduce((s, u) => s + u.files.length, 0) : 0
  }
  return totals
})

// ===== 学情分析：薄弱知识点 + 复习建议（基于错题本聚合） =====

// 今日到期待复习数 —— 判据唯一真相源 countDue（与首页 / 复习页同一口径，H7）
const todayDue = computed(() => countDue(overview.value?.allErrors || []))

// 把 subject + unitNum 解析成单元标题（配置缺失时兜底）
function getUnitTitle(subject, unitNum) {
  try {
    const cfg = getSubjectConfig(subject)
    const u = cfg.units.find((x) => x.num === unitNum)
    return u ? u.title : `单元 ${unitNum}`
  } catch (e) {
    return `单元 ${unitNum}`
  }
}

// 薄弱知识点：按「学科+单元」归集错题数，降序取前 5
const weakAreas = computed(() => {
  const errs = overview.value?.allErrors || []
  const map = new Map()
  for (const e of errs) {
    const k = `${e.subject}|${e.unitNum}`
    if (!map.has(k)) map.set(k, { subject: e.subject, unitNum: e.unitNum, count: 0 })
    map.get(k).count++
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((w) => ({
      ...w,
      unitTitle: getUnitTitle(w.subject, w.unitNum),
      name: SUBJECT_META[w.subject]?.name || w.subject,
      icon: SUBJECT_META[w.subject]?.icon || 'book-open'
    }))
})

// 最高频薄弱点（供建议文案）
const weakest = computed(() => weakAreas.value[0] || null)

// ===== 自评校准率（P1-9）=====
/**
 * 相对排序口径见 utils/practiceMetrics.js 的 selfCalibrationOf（单一真相源，H7）：
 *   复测召回率 = 该档 repetitions>=1 的行数 / 该档 reviewCount>0 的行数。
 * ⚠️ 本面板**不出绝对分数、不写「你预计能得 X 分」**（项目「不构成成绩承诺」口径）。
 */
const TIER_LABELS = { [SELF_TIERS.SEEN]: '看答案才会', [SELF_TIERS.UNKNOWN]: '不会' }
const calibration = computed(() =>
  selfCalibrationOf(overview.value?.allErrors, [SELF_TIERS.SEEN, SELF_TIERS.UNKNOWN]).map((r) => ({
    ...r,
    label: TIER_LABELS[r.tier] || r.tier
  }))
)

// 相对提示（两端都有数据才给）：只描述强弱，不下结论
const calibHint = computed(() => {
  const seen = calibration.value.find((r) => r.tier === SELF_TIERS.SEEN)
  const unknown = calibration.value.find((r) => r.tier === SELF_TIERS.UNKNOWN)
  if (!seen || !unknown || seen.rate === null || unknown.rate === null) return ''
  if (seen.rate > unknown.rate) {
    return '「看答案才会」的复测召回率高于「不会」—— 你的「中间态」与「不会」区分得开。'
  }
  return '「看答案才会」与「不会」的复测召回率接近 —— 自评的中间态暂时没有明显区分度。'
})

// 加载仪表盘数据
async function load() {
  loading.value = true
  error.value = ''
  try {
    // 双轨进度读 progress 快照：先刷新，保证「已接触 / 已掌握」是最新事实（与首页/内容页同源）
    await progress.refresh().catch((e) => console.warn('[Dashboard] 刷新进度快照失败:', e))
    overview.value = await db.getLearningOverview()
  } catch (e) {
    console.error('[Dashboard] 加载失败:', e)
    error.value = '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: var(--spacer-16); }
.breadcrumb { color: var(--text-muted); font-size: 0.85rem; }
.crumb-sep { margin: 0 var(--spacer-8); }
.loading { text-align: center; padding: var(--spacer-48); color: var(--text-muted); }

/* 加载失败 */
.error-hint { text-align: center; padding: var(--spacer-24); }
.error-hint p { margin-bottom: var(--spacer-12); color: var(--text-muted); }
.retry-btn {
  min-height: 44px; padding: 0 var(--spacer-20);
  background: var(--primary); color: #fff;
  border-radius: var(--radius-full);
  font-weight: 600; font-size: 0.9rem;
  display: inline-flex; align-items: center; justify-content: center;
}

/* 统计卡片网格 */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacer-12); }
.stat-card { text-align: center; }
/* AppIcon 通过 currentColor 继承文字色，这里只负责竖排与间距 */
.stat-icon { display: flex; justify-content: center; color: var(--primary); margin-bottom: var(--spacer-4); }
.stat-val { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
.stat-label { font-size: 0.8rem; color: var(--text-muted); }

/* 今日统计 */
.today-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacer-12); margin-top: var(--spacer-12); }
.today-item { text-align: center; }
.today-val { display: block; font-size: 1.3rem; font-weight: 600; }
.today-label { font-size: 0.8rem; color: var(--text-muted); }

/* 学科进度（双轨：已接触 / 已掌握） */
.subject-progress-list { display: flex; flex-direction: column; gap: var(--spacer-16); margin-top: var(--spacer-12); }
.subject-progress-item { display: flex; flex-direction: column; gap: var(--spacer-6); }
.subject-progress-head { display: flex; align-items: center; gap: var(--spacer-8); }
.subject-progress-icon { display: inline-flex; color: var(--text-muted); }
.subject-progress-name { font-weight: 600; flex: 1; }
.subject-progress-pct { font-weight: 700; color: var(--primary); }
/* 双轨行：标签 + 轨道 + 计数 */
.spb-row { display: flex; align-items: center; gap: var(--spacer-8); }
.spb-label { flex: 0 0 auto; width: 3.2em; font-size: 0.75rem; color: var(--text-muted); }
.spb-num { flex: 0 0 auto; font-size: 0.75rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.subject-progress-bar { flex: 1; height: 8px; background: var(--surface-muted); border-radius: var(--radius-full); overflow: hidden; }
.subject-progress-fill { height: 100%; background: var(--primary); border-radius: var(--radius-full); transition: width 0.5s ease; }
/* 次轨（已掌握）细一档 + 弱化配色，与主轨（已接触）区分层级 */
.spb-bar--mastered { height: 6px; }
.spb-fill--mastered { background: var(--success); }
.subject-progress-stats { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); }

/* 学情分析与复习建议 */
.insight-card h2 { margin-bottom: var(--spacer-12); }
.insight-due {
  display: flex; align-items: center; gap: var(--spacer-8); flex-wrap: wrap;
  padding: var(--spacer-10) var(--spacer-12);
  background: var(--surface-muted);
  border-radius: var(--radius-md);
  font-size: 0.9rem; margin-bottom: var(--spacer-10);
}
.insight-due strong { color: var(--warning); }
.insight-clear { background: rgba(var(--success-rgb), 0.1); }
.insight-link {
  margin-left: auto; color: var(--primary); font-weight: 600;
  padding: 4px 12px; border: 1px solid var(--primary); border-radius: var(--radius-full);
}
.insight-tip {
  font-size: 0.88rem; color: var(--text-muted);
  padding: var(--spacer-6) 0 var(--spacer-10);
  line-height: 1.6;
}
.insight-tip strong { color: var(--text); }
.insight-list { display: flex; flex-direction: column; gap: var(--spacer-6); }
.insight-item {
  display: flex; align-items: center; gap: var(--spacer-10);
  padding: var(--spacer-8) var(--spacer-10);
  background: var(--surface-muted);
  border-radius: var(--radius-md);
}
.insight-rank {
  flex: 0 0 auto; width: 22px; height: 22px; border-radius: var(--radius-full);
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--primary-soft); color: var(--primary);
  font-size: 0.78rem; font-weight: 700;
}
.insight-icon { display: inline-flex; color: var(--text-muted); }
.insight-name { flex: 1; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.insight-count {
  flex: 0 0 auto; font-size: 0.78rem; color: var(--text-muted);
  padding: 1px 10px; border-radius: var(--radius-full); background: var(--surface);
}
.count-warn { color: var(--danger); font-weight: 700; }

/* 自评校准率（P1-9）：只做相对排序，视觉上克制、不显成绩感 */
.calib-card h2 { margin-bottom: var(--spacer-6); }
.calib-note { font-size: 0.82rem; color: var(--text-muted); line-height: 1.6; margin-bottom: var(--spacer-10); }
.calib-list { display: flex; flex-direction: column; gap: var(--spacer-8); }
.calib-item {
  display: flex; align-items: baseline; gap: var(--spacer-8);
  padding: var(--spacer-8) var(--spacer-10);
  background: var(--surface-muted); border-radius: var(--radius-md);
}
.calib-name { flex: 1; font-size: 0.88rem; }
.calib-rate { font-size: 1rem; font-weight: 700; color: var(--primary); font-variant-numeric: tabular-nums; }
.calib-sub { font-size: 0.78rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.calib-hint { margin-top: var(--spacer-10); font-size: 0.84rem; color: var(--text-muted); line-height: 1.6; }

@media (max-width: 600px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .today-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>