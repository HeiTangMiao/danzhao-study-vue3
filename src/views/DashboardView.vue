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
              <span class="subject-progress-icon">{{ key === 'math' ? '📐' : '✍️' }}</span>
              <span class="subject-progress-name">{{ key === 'math' ? '数学' : '语文' }}</span>
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
            :class="heatLevel(day.xp)"
            :title="`${day.date}：${day.xp} XP${day.checkin ? ' ✓' : ''}`"
          ></div>
        </div>
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
import { ref, onMounted } from 'vue'
import { useGameEngineStore } from '@/stores/gameEngine'

const game = useGameEngineStore()

// 仪表盘数据
const data = ref(null)
const loading = ref(true)

// 已解锁成就 ID 集合
const unlockedIds = ref(new Set())

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

// 加载仪表盘数据
onMounted(async () => {
  try {
    data.value = await game.getDashboardData()
    unlockedIds.value = new Set(data.value.achievements.map((a) => a.id))
  } catch (e) {
    console.error('[Dashboard] 加载失败:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: var(--spacer-16); }
.breadcrumb { color: var(--text-muted); font-size: 0.85rem; }
.crumb-sep { margin: 0 var(--spacer-8); }
.loading { text-align: center; padding: var(--spacer-48); color: var(--text-muted); }

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
.heat-cell { width: 100%; aspect-ratio: 1; border-radius: 3px; }
.heat-0 { background: var(--surface-muted); }
.heat-1 { background: rgba(79, 70, 229, 0.25); }
.heat-2 { background: rgba(79, 70, 229, 0.45); }
.heat-3 { background: rgba(79, 70, 229, 0.7); }
.heat-4 { background: var(--primary); }
.heatmap-legend { display: flex; align-items: center; gap: 4px; margin-top: var(--spacer-8); font-size: 0.75rem; color: var(--text-muted); }
.heatmap-legend .heat-cell { width: 12px; height: 12px; }

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