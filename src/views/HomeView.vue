<!--
  HomeView —— 首页（多学科学习导航）
  职责：
   - 展示学科选择卡片（数学 / 语文）
   - 根据所选学科渲染单元列表与进度
   - 记忆用户选择的学科（localStorage）
   - 提供仪表盘与编辑器入口
-->
<template>
  <div class="home">
    <header class="home-hero">
      <h1>📚 单招学习之路</h1>
      <p class="home-subtitle">多学科备考平台 | 知识体系 + 游戏化学习 + 低代码内容管理</p>
    </header>

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

    <!-- 工具入口 -->
    <footer class="home-actions">
      <router-link to="/dashboard" class="btn-dashboard">📊 学习仪表盘</router-link>
      <router-link to="/error-book" class="btn-errorbook">📕 错题本</router-link>
      <router-link :to="mockRoute" class="btn-mock">🚀 模拟冲刺</router-link>
      <router-link to="/editor" class="btn-editor">✏️ 内容编辑器</router-link>
    </footer>

    <!-- 作者署名 -->
    <div class="author-credit">
      <span class="author-label"> Crafted with ❤️ by </span>
      <span class="author-name">黑糖＆菜菜</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProgressStore } from '@/stores/progress'
import { SUBJECT_LIST, getSubjectConfig } from '@/content/index'

const router = useRouter()
const progress = useProgressStore()

// 学科列表
const subjectList = SUBJECT_LIST

// 当前选中的学科（从 localStorage 读取，默认 math）
const currentSubject = ref(localStorage.getItem('current_subject') || 'math')

// 当前学科配置
const currentConfig = computed(() => getSubjectConfig(currentSubject.value))

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

.home-actions { margin-top: var(--spacer-24); text-align: center; display: flex; gap: var(--spacer-12); justify-content: center; }
.btn-dashboard {
  display: inline-block;
  background: var(--primary);
  color: #fff;
  border-radius: var(--radius-full);
  padding: 8px 20px;
}
.btn-editor {
  display: inline-block;
  background: var(--surface);
  border: 1px solid var(--primary);
  color: var(--primary);
  border-radius: var(--radius-full);
  padding: 8px 20px;
}
.btn-editor:hover { background: var(--primary); color: #fff; }
.btn-errorbook {
  display: inline-block;
  background: var(--surface);
  border: 1px solid var(--warning);
  color: var(--warning);
  border-radius: var(--radius-full);
  padding: 8px 20px;
}
.btn-errorbook:hover { background: var(--warning); color: #fff; }
.btn-mock {
  display: inline-block;
  background: linear-gradient(135deg, #a855f7, #f43f5e);
  color: #fff;
  border-radius: var(--radius-full);
  padding: 8px 20px;
  box-shadow: var(--shadow-sm);
}
.btn-mock:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

/* 作者署名 */
.author-credit {
  margin-top: var(--spacer-32);
  text-align: center;
  padding: var(--spacer-12);
  font-size: 0.8rem;
  color: var(--text-muted);
}
.author-name {
  font-weight: 700;
  background: linear-gradient(135deg, #f43f5e, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
