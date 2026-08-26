<!--
  HomeView —— 首页（多学科学习导航）
  职责：
   - 展示学科选择卡片（数学 / 语文 / 计算机）+ 对各学科的单元进度
   - 顶部提供工具快捷入口（仪表盘 / 错题本 / 模拟冲刺 / 编辑器）
   - 提供 GeoGebra 图形计算器入口（懒加载，点击展开后才加载脚本）
   - 记忆用户选择的学科（localStorage）
   - 页脚：版权信息 + 工具链接导航
-->
<template>
  <div class="home">
    <header class="home-hero">
      <h1>📚 单招学习之路</h1>
      <p class="home-subtitle">多学科备考平台 | 知识体系 + 游戏化学习 + 低代码内容管理</p>
    </header>

    <!-- 继续学习卡片：上次学习位置一键直达 + 连续打卡（移动学习 App 标配） -->
    <section v-if="lastStudy || quickStats" class="continue-card card">
      <div class="continue-card__stats">
        <span class="continue-streak" :class="{ hot: quickStats && quickStats.streak > 0 }">
          🔥 连续学习 <strong>{{ quickStats ? quickStats.streak : 0 }}</strong> 天
        </span>
        <span v-if="quickStats" class="continue-level">
          Lv.{{ quickStats.levelInfo.level.lv }} · {{ quickStats.levelInfo.level.title }}
        </span>
      </div>
      <button v-if="lastStudy" class="continue-card__main" @click="continueStudy">
        <span class="continue-icon">{{ subjectIcon(lastStudy.subject) }}</span>
        <span class="continue-text">
          <span class="continue-label">继续学习</span>
          <span class="continue-title">{{ lastStudy.unitTitle }} · {{ lastStudy.fileTitle }}</span>
        </span>
        <span class="continue-go">▶</span>
      </button>
    </section>

    <!-- 学科选择卡片 -->
    <section class="subject-tabs">
      <button
        v-for="s in subjectList"
        :key="s.key"
        class="subject-tab"
        :class="{ active: currentSubject === s.key }"
        :style="currentSubject === s.key ? { borderColor: s.color, background: s.color + '11' } : {}"
        @click="selectSubject(s.key)"
      >
        <span class="subject-tab__icon">{{ s.icon || subjectIcon(s.key) }}</span>
        <span class="subject-tab__label">{{ s.title.replace('浙江单招单考', '').replace('学习之路', '') }}</span>
      </button>
    </section>

    <!-- 当前学科标题 -->
    <div class="subject-header">
      <h2 class="subject-title">{{ currentConfig.title }}</h2>
      <p class="subject-subtitle">{{ currentConfig.subtitle }}</p>
    </div>

    <!-- 工具快捷入口 -->
    <section class="tool-grid" aria-label="工具入口">
      <router-link to="/dashboard" class="tool-card" style="border-top-color: var(--primary)">
        <span class="tool-icon">📊</span>
        <div class="tool-text">
          <span class="tool-name">学习仪表盘</span>
          <span class="tool-desc">学习进度与数据</span>
        </div>
      </router-link>
      <router-link to="/error-book" class="tool-card" style="border-top-color: var(--warning)">
        <span class="tool-icon">📕</span>
        <div class="tool-text">
          <span class="tool-name">错题本</span>
          <span class="tool-desc">回顾与复习错题</span>
        </div>
      </router-link>
      <router-link :to="mockRoute" class="tool-card" style="border-top-color: #a855f7">
        <span class="tool-icon">🚀</span>
        <div class="tool-text">
          <span class="tool-name">模拟冲刺</span>
          <span class="tool-desc">全真模拟限时实战</span>
        </div>
      </router-link>
      <router-link to="/editor" class="tool-card" style="border-top-color: var(--accent)">
        <span class="tool-icon">✏️</span>
        <div class="tool-text">
          <span class="tool-name">内容编辑器</span>
          <span class="tool-desc">低代码内容管理</span>
        </div>
      </router-link>
    </section>

    <!-- GeoGebra 图形计算器（懒加载折叠卡片） -->
    <section class="desmos-card card">
      <button class="desmos-card__head" :aria-expanded="desmosOpen" @click="desmosOpen = !desmosOpen">
        <div class="desmos-card__title">
          <span class="desmos-icon">🧮</span>
          <div class="desmos-card__text">
            <span class="desmos-name">GeoGebra 图形计算器</span>
            <span class="desmos-desc">函数图像即绘即览 · 点击展开</span>
          </div>
        </div>
        <span class="desmos-toggle" :class="{ open: desmosOpen }">▾</span>
      </button>
      <!-- 展开时才挂载组件，实现懒加载 -->
      <div v-if="desmosOpen" class="desmos-card__body">
        <GeoGebraPlayground />
      </div>
    </section>

    <!-- 按阶段分组展示单元 -->
    <section
      v-for="phase in groupedUnits"
      :key="phase.phase"
      class="phase-group"
    >
      <h3 class="phase-title" :style="{ color: phase.color }">
        <span class="phase-icon">{{ phase.icon }}</span>
        {{ phase.name }}
      </h3>
      <div class="unit-list">
        <article
          v-for="unit in phase.units"
          :key="unit.num"
          class="unit-card card"
          @click="goUnit(unit)"
        >
          <div class="unit-card__head">
            <span class="unit-icon" :style="{ background: unit.color + '22' }">{{ unit.icon }}</span>
            <div class="unit-card__info">
              <h2 class="unit-title">{{ unit.num }} · {{ unit.title }}</h2>
              <span class="unit-card__files">{{ unit.files.length }} 个知识点</span>
            </div>
          </div>
          <!-- 进度条 -->
          <div class="unit-progress">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progressPct(unit) + '%', background: unit.color }"></div>
            </div>
            <span class="progress-text">{{ progressCount(unit) }}/{{ unit.files.length }}</span>
          </div>
        </article>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="home-footer">
      <div class="footer-info">
        <div class="footer-name">📚 单招学习之路</div>
        <div class="footer-desc">多学科备考平台 · 知识体系 + 游戏化学习 + 低代码内容管理</div>
        <div class="footer-copy">© 2026 Crafted with ❤️ by <span class="footer-author">黑糖＆菜菜</span></div>
      </div>
      <nav class="footer-nav" aria-label="页脚导航">
        <router-link to="/dashboard">学习仪表盘</router-link>
        <router-link to="/error-book">错题本</router-link>
        <router-link :to="mockRoute">模拟冲刺</router-link>
        <router-link to="/editor">内容编辑器</router-link>
        <router-link to="/">返回首页</router-link>
      </nav>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProgressStore } from '@/stores/progress'
import { useGameEngineStore } from '@/stores/gameEngine'
import { SUBJECT_LIST, getSubjectConfig } from '@/content/index'
import GeoGebraPlayground from '@/components/GeoGebraPlayground.vue'

const router = useRouter()
const progress = useProgressStore()
const game = useGameEngineStore()

// 学科列表
const subjectList = SUBJECT_LIST

// 当前选中的学科（从 localStorage 读取，默认 math）
const currentSubject = ref(localStorage.getItem('current_subject') || 'math')

// 最近学习位置（UnitView 每次加载内容页时写入）
const lastStudy = ref(null)
try {
  lastStudy.value = JSON.parse(localStorage.getItem('last_study') || 'null')
} catch { lastStudy.value = null }

// 快速统计：等级 + 连续打卡天数（带 30 秒缓存）
const quickStats = ref(null)
onMounted(async () => {
  try { quickStats.value = await game.getQuickStats() } catch { /* 数据库不可用时静默 */ }
})

// 一键回到上次学习页面
function continueStudy() {
  const s = lastStudy.value
  if (!s) return
  currentSubject.value = s.subject
  localStorage.setItem('current_subject', s.subject)
  router.push({ name: 'unit', params: { subject: s.subject, unitNum: s.unitNum, fileIndex: s.fileIndex } })
}

// 当前学科配置
const currentConfig = computed(() => getSubjectConfig(currentSubject.value))

// GeoGebra 折叠卡片是否展开（默认收起，展开后才加载脚本）
const desmosOpen = ref(false)

// 按阶段分组单元
const groupedUnits = computed(() => {
  const config = currentConfig.value
  if (!config || !config.units) return []
  const phases = config.phases || {}
  const groups = {}
  for (const unit of config.units) {
    const p = unit.phase
    if (!groups[p]) {
      const phaseInfo = phases[p] || { name: `阶段 ${p}`, color: '#666', icon: '📋' }
      groups[p] = { phase: p, name: phaseInfo.name, color: phaseInfo.color, icon: phaseInfo.icon, units: [] }
    }
    groups[p].units.push(unit)
  }
  return Object.values(groups).sort((a, b) => a.phase - b.phase)
})

// 学科图标映射（当配置中没有 icon 字段时使用）
function subjectIcon(key) {
  const icons = { math: '📐', chinese: '✍️', computer: '💻' }
  return icons[key] || '📖'
}

// 切换学科
function selectSubject(key) {
  currentSubject.value = key
  localStorage.setItem('current_subject', key)
}

// 某单元已完成页面数（按学科隔离）
function progressCount(unit) {
  return progress.completedCount(currentSubject.value, unit.num)
}

// 某单元完成百分比
function progressPct(unit) {
  const total = unit.files.length
  if (!total) return 0
  return Math.round((progress.completedCount(currentSubject.value, unit.num) / total) * 100)
}

// 跳转到单元第一个页面
function goUnit(unit) {
  router.push({ name: 'unit', params: { subject: currentSubject.value, unitNum: unit.num, fileIndex: 0 } })
}

// 模拟冲刺入口：跳转到当前学科冲刺单元的第一个页面
const mockRoute = computed(() => {
  const config = currentConfig.value
  if (!config || !config.units) return { name: 'home' }
  const sprint = config.units.find((u) => u.sprint)
  if (sprint) return { name: 'unit', params: { subject: currentSubject.value, unitNum: sprint.num, fileIndex: 0 } }
  return { name: 'home' }
})
</script>

<style scoped>
.home-hero { margin-bottom: var(--spacer-24); text-align: center; }
.home-hero h1 { font-size: 1.7rem; }
.home-subtitle { color: var(--text-muted); margin-top: var(--spacer-8); font-size: 0.9rem; }

/* 继续学习卡片 */
.continue-card {
  padding: var(--spacer-14) var(--spacer-16);
  margin-bottom: var(--spacer-20);
  display: flex;
  flex-direction: column;
  gap: var(--spacer-12);
}
.continue-card__stats {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.85rem; color: var(--text-muted);
}
.continue-streak strong { color: var(--text); font-size: 1.05rem; }
.continue-streak.hot strong { color: var(--warning); }
.continue-level {
  background: var(--primary-soft); color: var(--primary);
  padding: 2px 10px; border-radius: var(--radius-full);
  font-size: 0.78rem; font-weight: 600;
}
.continue-card__main {
  display: flex; align-items: center; gap: var(--spacer-12);
  width: 100%; min-height: 56px;
  background: var(--primary); color: #fff;
  border: none; border-radius: var(--radius-md);
  padding: var(--spacer-12) var(--spacer-16);
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease;
}
.continue-card__main:active { transform: scale(0.98); }
.continue-icon { font-size: 1.5rem; }
.continue-text {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; align-items: flex-start;
  line-height: 1.35; text-align: left;
}
.continue-label { font-size: 0.72rem; opacity: 0.85; }
.continue-title {
  font-weight: 700; font-size: 0.92rem;
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.continue-go { font-size: 1rem; }

/* 学科选择卡片 */
.subject-tabs {
  display: flex; gap: var(--spacer-12); margin-bottom: var(--spacer-20);
}
.subject-tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: var(--spacer-12);
  background: var(--surface); border: 2px solid var(--border);
  border-radius: var(--radius-md); cursor: pointer;
  transition: all 0.2s ease;
}
.subject-tab:hover { border-color: var(--primary); }
.subject-tab.active { border-width: 2px; }
.subject-tab__icon { font-size: 1.8rem; }
.subject-tab__label { font-size: 0.9rem; font-weight: 600; color: var(--text); }

/* 当前学科标题 */
.subject-header { margin-bottom: var(--spacer-20); }
.subject-title { font-size: 1.3rem; margin: 0; }
.subject-subtitle { color: var(--text-muted); margin-top: var(--spacer-4); font-size: 0.85rem; }

/* 工具快捷入口 */
.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacer-12);
  margin-bottom: var(--spacer-20);
}
.tool-card {
  display: flex; align-items: center; gap: var(--spacer-12);
  padding: var(--spacer-12) var(--spacer-16);
  background: var(--surface);
  border: 1px solid var(--border);
  border-top-width: 3px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  color: var(--text);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.tool-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); color: var(--text); }
.tool-icon { font-size: 1.4rem; }
.tool-text { display: flex; flex-direction: column; line-height: 1.4; }
.tool-name { font-weight: 700; font-size: 0.95rem; }
.tool-desc { font-size: 0.75rem; color: var(--text-muted); }

/* Desmos 折叠卡片 */
.desmos-card { padding: 0; overflow: hidden; margin-bottom: var(--spacer-20); }
.desmos-card__head {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacer-12) var(--spacer-16);
  cursor: pointer;
  transition: background 0.2s ease;
}
.desmos-card__head:hover { background: var(--surface-muted); }
.desmos-card__title { display: flex; align-items: center; gap: var(--spacer-12); }
.desmos-icon { font-size: 1.5rem; }
.desmos-card__text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.4; }
.desmos-name { font-weight: 700; font-size: 1rem; }
.desmos-desc { font-size: 0.75rem; color: var(--text-muted); }
.desmos-toggle {
  font-size: 1.1rem; color: var(--text-muted);
  transition: transform 0.2s ease;
  line-height: 1;
}
.desmos-toggle.open { transform: rotate(180deg); }
.desmos-card__body { border-top: 1px solid var(--border); }

/* 阶段分组 */
.phase-group { margin-bottom: var(--spacer-24); }
.phase-title { font-size: 1rem; margin-bottom: var(--spacer-12); display: flex; align-items: center; gap: var(--spacer-8); }
.phase-icon { font-size: 1.2rem; }

.unit-list { display: flex; flex-direction: column; gap: var(--spacer-12); }
.unit-card { cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.unit-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.unit-card__head { display: flex; align-items: center; gap: var(--spacer-16); }
.unit-icon {
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem;
  border-radius: var(--radius-md);
}
.unit-title { font-size: 1.1rem; margin: 0; }
.unit-card__files { font-size: 0.75rem; color: var(--text-muted); }
.unit-progress { display: flex; align-items: center; gap: var(--spacer-12); margin-top: var(--spacer-12); }
.progress-track {
  flex: 1; height: 8px;
  background: var(--surface-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}
.progress-text { font-size: 0.8rem; color: var(--text-muted); }

/* 页脚 */
.home-footer {
  margin-top: var(--spacer-32);
  padding: var(--spacer-20) 0 var(--spacer-12);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--spacer-16);
}
.footer-info { text-align: center; }
.footer-name { font-weight: 700; font-size: 1rem; }
.footer-desc { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }
.footer-copy { font-size: 0.78rem; color: var(--text-muted); margin-top: 6px; }
.footer-author {
  font-weight: 700;
  background: linear-gradient(135deg, #f43f5e, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.footer-nav {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: var(--spacer-8) var(--spacer-16);
  font-size: 0.82rem;
}
.footer-nav a {
  color: var(--text-muted);
  transition: color 0.15s ease;
}
.footer-nav a:hover { color: var(--primary); }

/* 移动端适配 */
@media (max-width: 600px) {
  .home-hero h1 { font-size: clamp(1.3rem, 6vw, 1.7rem); }
  .tool-grid { grid-template-columns: repeat(2, 1fr); }
  .unit-card { padding: var(--spacer-12); }
  .unit-card__head { gap: var(--spacer-12); }
  .unit-icon { width: 40px; height: 40px; font-size: 1.2rem; }
  .unit-title { font-size: 1rem; }
}
</style>