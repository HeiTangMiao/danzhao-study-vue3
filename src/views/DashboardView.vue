<!--
  DashboardView —— 学习仪表盘
  职责：
   - 展示等级、总 XP、连击天数等游戏化数据
   - 展示学习热力图（最近 90 天）
   - 展示成就解锁情况
   - 展示今日学习统计
  说明：数据来自 gameEngine store 的 getDashboardData()
-->
<template>
  <div class="dashboard">
    <!-- 面包屑 -->
    <nav class="breadcrumb">
      <router-link to="/">📚 首页</router-link>
      <span class="crumb-sep">/</span>
      <span>学习仪表盘</span>
    </nav>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">加载中…</div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="error-hint card">
      <p>⚠️ {{ error }}</p>
      <button class="retry-btn" @click="load">🔄 重试</button>
    </div>

    <template v-else-if="data">
      <!-- 等级与 XP 概览 -->
      <section class="card level-card">
        <div class="level-badge">
          <span class="lv-num">{{ data.levelInfo.level.lv }}</span>
          <span class="lv-title">{{ data.levelInfo.level.title }}</span>
        </div>
        <div class="level-info">
          <div class="xp-total">总经验值 {{ data.totalXP }} XP</div>
          <div class="xp-bar">
            <div class="xp-fill" :style="{ width: (data.levelInfo.progress * 100) + '%' }"></div>
          </div>
          <div v-if="data.levelInfo.next" class="xp-hint">
            距 {{ data.levelInfo.next.title }} Lv.{{ data.levelInfo.next.lv }} 还需 {{ data.levelInfo.needXP }} XP
          </div>
          <div v-else class="xp-hint">已达满级！🎓</div>
        </div>
      </section>

      <!-- 核心数据卡片 -->
      <section class="stat-grid">
        <div class="card stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-val">{{ data.streak }}</div>
          <div class="stat-label">连续学习天数</div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon">📖</div>
          <div class="stat-val">{{ data.totalVisited }}</div>
          <div class="stat-label">已学页面</div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon">✏️</div>
          <div class="stat-val">{{ data.totalQuestions }}</div>
          <div class="stat-label">答题总数</div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-val">{{ data.achievements.length }}</div>
          <div class="stat-label">已解锁成就</div>
        </div>
      </section>

      <!-- 今日统计 -->
      <section class="card today-card">
        <h2>📅 今日学习</h2>
        <div class="today-grid">
          <div class="today-item">
            <span class="today-val">{{ data.todayStat.xp || 0 }}</span>
            <span class="today-label">今日 XP</span>
          </div>
          <div class="today-item">
            <span class="today-val">{{ data.todayStat.filesVisited || 0 }}</span>
            <span class="today-label">访问页面</span>
          </div>
          <div class="today-item">
            <span class="today-val">{{ data.todayStat.questionsAnswered || 0 }}</span>
            <span class="today-label">答题数</span>
          </div>
          <div class="today-item">
            <span class="today-val">{{ data.todayStat.checkin ? '✅' : '○' }}</span>
            <span class="today-label">今日打卡</span>
          </div>
        </div>
      </section>

      <!-- 学科进度概览 -->
      <section class="card subject-progress-card">
        <h2>📚 学科进度</h2>
        <div class="subject-progress-list">
          <div v-for="(subj, key) in data.subjects" :key="key" class="subject-progress-item">
            <div class="subject-progress-head">
              <span class="subject-progress-icon">{{ (SUBJECT_META[key] && SUBJECT_META[key].icon) || '📘' }}</span>
              <span class="subject-progress-name">{{ (SUBJECT_META[key] && SUBJECT_META[key].name) || key }}</span>
              <span class="subject-progress-pct">{{ subjPct(subj) }}%</span>
            </div>
            <div class="subject-progress-bar">
              <div class="subject-progress-fill" :style="{ width: subjPct(subj) + '%' }"></div>
            </div>
            <div class="subject-progress-stats">
              <span>{{ subj.visited }}/{{ subj.total }} 页面</span>
              <span>{{ subj.xp }} XP</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 学习热力图（最近 90 天） -->
      <section class="card heatmap-card">
        <h2>📊 学习热力图（90 天）</h2>
        <div class="heatmap-grid">
          <div
            v-for="(day, i) in data.heatmap"
            :key="i"
            class="heat-cell"
            :class="[heatLevel(day.xp), { selected: activeHeat === i }]"
            :title="`${day.date}：${day.xp} XP${day.checkin ? ' ✓' : ''}`"
            @click="activeHeat = activeHeat === i ? null : i"
          ></div>
        </div>
        <!-- 点击格子查看详情（触屏替代 hover 提示） -->
        <p v-if="activeHeat !== null && data.heatmap[activeHeat]" class="heat-tip">
          <span class="heat-tip__date">📅 {{ data.heatmap[activeHeat].date }}</span>
          <strong>{{ data.heatmap[activeHeat].xp }} XP</strong>
          <span :class="data.heatmap[activeHeat].checkin ? 'heat-tip__on' : 'heat-tip__off'">
            {{ data.heatmap[activeHeat].checkin ? '已打卡 ✓' : '未学习' }}
          </span>
        </p>
        <div class="heatmap-legend">
          <span>少</span>
          <span class="heat-cell heat-0"></span>
          <span class="heat-cell heat-1"></span>
          <span class="heat-cell heat-2"></span>
          <span class="heat-cell heat-3"></span>
          <span class="heat-cell heat-4"></span>
          <span>多</span>
        </div>
      </section>

      <!-- 学情分析与复习建议（基于错题本聚合的薄弱点洞察） -->
      <section v-if="weakAreas.length > 0" class="card insight-card">
        <h2>📋 学情分析与复习建议</h2>
        <div v-if="todayDue > 0" class="insight-due">
          🔔 今日有 <strong>{{ todayDue }}</strong> 道错题到期待复习
          <router-link to="/error-book" class="insight-link">去复习 →</router-link>
        </div>
        <div v-else class="insight-due insight-clear">✅ 今日没有到期错题，可以学习新内容</div>
        <p v-if="weakest" class="insight-tip">
          薄弱点集中在
          <strong>{{ weakest.icon }} {{ weakest.name }} · {{ weakest.unitTitle }}</strong
          >（{{ weakest.count }} 道错题），建议优先回看该单元并重做错题。
        </p>
        <div class="insight-list">
          <div v-for="(w, i) in weakAreas" :key="i" class="insight-item">
            <span class="insight-rank">{{ i + 1 }}</span>
            <span class="insight-icon">{{ w.icon }}</span>
            <span class="insight-name">{{ w.name }} · {{ w.unitTitle }}</span>
            <span class="insight-count" :class="{ 'count-warn': i === 0 }">{{ w.count }} 题</span>
          </div>
        </div>
      </section>

      <!-- 成就墙 -->
      <section class="card achievements-card">
        <h2>🏆 成就墙（{{ data.achievements.length }}/{{ game.ACHIEVEMENTS.length }}）</h2>
        <div class="ach-grid">
          <div
            v-for="ach in game.ACHIEVEMENTS"
            :key="ach.id"
            class="ach-item"
            :class="{ unlocked: isUnlocked(ach.id) }"
          >
            <span class="ach-icon">{{ ach.icon }}</span>
            <span class="ach-name">{{ ach.name }}</span>
            <span class="ach-desc">{{ ach.desc }}</span>
          </div>
        </div>
      </section>

      <!-- 作者署名 -->
      <div class="dashboard-credit">
        Crafted with ❤️ by <strong>黑糖＆菜菜</strong>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGameEngineStore } from '@/stores/gameEngine'
import { SUBJECT_META, getSubjectConfig } from '@/content/index'

const game = useGameEngineStore()

// 仪表盘数据
const data = ref(null)
const loading = ref(true)
// 加载失败提示
const error = ref('')

// 已解锁成就 ID 集合
const unlockedIds = ref(new Set())

// 热力图选中格子（触屏点击查看当日详情，替代 hover title）
const activeHeat = ref(null)

// 判断某成就是否已解锁
function isUnlocked(id) {
  return unlockedIds.value.has(id)
}

// 热力图等级（根据 XP 分 5 级）
function heatLevel(xp) {
  if (xp === 0) return 'heat-0'
  if (xp < 20) return 'heat-1'
  if (xp < 50) return 'heat-2'
  if (xp < 100) return 'heat-3'
  return 'heat-4'
}

// 学科完成百分比
function subjPct(subj) {
  if (!subj.total || subj.total === 0) return 0
  return Math.round((subj.visited / subj.total) * 100)
}

// ===== 学情分析：薄弱知识点 + 复习建议（基于错题本聚合） =====

// 今日到期待复习数（SM-2：未掌握且到期）
const todayDue = computed(() => {
  const errs = data.value?.allErrors || []
  const d = new Date()
  const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return errs.filter((e) => !e.reviewed && e.nextReviewDate <= ds).length
})

// 把 (subject, unitNum) 解析成单元标题（配置缺失时兜底）
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
  const errs = data.value?.allErrors || []
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
      icon: SUBJECT_META[w.subject]?.icon || '📘'
    }))
})

// 最高频薄弱点（供建议文案）
const weakest = computed(() => weakAreas.value[0] || null)

// 加载仪表盘数据
async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await game.getDashboardData()
    unlockedIds.value = new Set(data.value.achievements.map((a) => a.id))
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

/* 等级卡片 */
.level-card { display: flex; align-items: center; gap: var(--spacer-24); }
.level-badge {
  display: flex; flex-direction: column; align-items: center;
  width: 80px; height: 80px;
  background: var(--primary-soft); border-radius: var(--radius-lg);
  justify-content: center;
}
.lv-num { font-size: 1.8rem; font-weight: 700; color: var(--primary); }
.lv-title { font-size: 0.8rem; color: var(--text-muted); }
.level-info { flex: 1; }
.xp-total { font-size: 0.9rem; color: var(--text-muted); margin-bottom: var(--spacer-8); }
.xp-bar { height: 10px; background: var(--surface-muted); border-radius: var(--radius-full); overflow: hidden; }
.xp-fill { height: 100%; background: var(--primary); border-radius: var(--radius-full); transition: width 0.5s ease; }
.xp-hint { font-size: 0.8rem; color: var(--text-muted); margin-top: var(--spacer-8); }

/* 统计卡片网格 */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacer-12); }
.stat-card { text-align: center; }
.stat-icon { font-size: 1.5rem; }
.stat-val { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
.stat-label { font-size: 0.8rem; color: var(--text-muted); }

/* 今日统计 */
.today-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacer-12); margin-top: var(--spacer-12); }
.today-item { text-align: center; }
.today-val { display: block; font-size: 1.3rem; font-weight: 600; }
.today-label { font-size: 0.8rem; color: var(--text-muted); }

/* 学科进度 */
.subject-progress-list { display: flex; flex-direction: column; gap: var(--spacer-16); margin-top: var(--spacer-12); }
.subject-progress-item { display: flex; flex-direction: column; gap: var(--spacer-4); }
.subject-progress-head { display: flex; align-items: center; gap: var(--spacer-8); }
.subject-progress-icon { font-size: 1.2rem; }
.subject-progress-name { font-weight: 600; flex: 1; }
.subject-progress-pct { font-weight: 700; color: var(--primary); }
.subject-progress-bar { height: 8px; background: var(--surface-muted); border-radius: var(--radius-full); overflow: hidden; }
.subject-progress-fill { height: 100%; background: var(--primary); border-radius: var(--radius-full); transition: width 0.5s ease; }
.subject-progress-stats { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); }

/* 热力图 */
.heatmap-grid {
  display: grid; grid-template-columns: repeat(15, 1fr); gap: 3px;
  margin-top: var(--spacer-12);
}
.heat-cell { width: 100%; aspect-ratio: 1; border-radius: 3px; cursor: pointer; }
.heat-cell.selected { outline: 2px solid var(--primary); outline-offset: 1px; }
.heat-0 { background: var(--surface-muted); }
.heat-1 { background: rgba(79, 70, 229, 0.25); }
.heat-2 { background: rgba(79, 70, 229, 0.45); }
.heat-3 { background: rgba(79, 70, 229, 0.7); }
.heat-4 { background: var(--primary); }
/* 暗色模式下热力图改用主题蓝，保证层级区分度 */
:root[data-theme="dark"] .heat-1 { background: rgba(106, 155, 255, 0.25); }
:root[data-theme="dark"] .heat-2 { background: rgba(106, 155, 255, 0.45); }
:root[data-theme="dark"] .heat-3 { background: rgba(106, 155, 255, 0.7); }
/* 触屏点击详情 */
.heat-tip {
  display: flex; align-items: center; gap: var(--spacer-12);
  margin: var(--spacer-10) 0 0;
  font-size: 0.85rem; color: var(--text-muted);
}
.heat-tip strong { color: var(--text); }
.heat-tip__on { color: var(--success); }
.heat-tip__off { color: var(--text-muted); }
.heatmap-legend { display: flex; align-items: center; gap: 4px; margin-top: var(--spacer-8); font-size: 0.75rem; color: var(--text-muted); }
.heatmap-legend .heat-cell { width: 12px; height: 12px; }

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
.insight-clear { background: rgba(47, 158, 68, 0.1); }
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
.insight-icon { font-size: 1.05rem; }
.insight-name { flex: 1; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.insight-count {
  flex: 0 0 auto; font-size: 0.78rem; color: var(--text-muted);
  padding: 1px 10px; border-radius: var(--radius-full); background: var(--surface);
}
.count-warn { color: var(--danger); font-weight: 700; }

/* 成就墙 */
.ach-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--spacer-12); margin-top: var(--spacer-12); }
.ach-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: var(--spacer-12); border-radius: var(--radius-md);
  background: var(--surface-muted); opacity: 0.4; transition: opacity 0.2s;
}
.ach-item.unlocked { opacity: 1; background: var(--primary-soft); }
.ach-icon { font-size: 1.5rem; }
.ach-name { font-size: 0.85rem; font-weight: 600; }
.ach-desc { font-size: 0.75rem; color: var(--text-muted); text-align: center; }

@media (max-width: 600px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .today-grid { grid-template-columns: repeat(2, 1fr); }
  /* 热力图改为 10 列，格子更大便于触屏点选 */
  .heatmap-grid { grid-template-columns: repeat(10, 1fr); gap: 5px; }
}
.dashboard-credit {
  margin-top: var(--spacer-24);
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.dashboard-credit strong {
  background: linear-gradient(135deg, #f43f5e, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>