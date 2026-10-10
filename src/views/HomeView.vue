<!--
  HomeView —— 首页（多学科学习导航）
  职责：
   - 展示学科选择卡片（数学 / 语文 / 计算机）+ 对各学科的单元进度
   - 顶部提供工具快捷入口（仪表盘 / 错题本 / 模拟冲刺）
   - 记忆用户选择的学科（localStorage）
   - 「继续学习」位置读 progress store（唯一事实源，具备换设备能力）
  R3 去 Web 味（system_design §2 / P1-T3）：已移除页脚 nav + 版权行（署名块仅保留在「我的」页）。
  P2 图标契约：学科图标统一走 SUBJECT_META（Lucide 名）+ AppIcon 声明式渲染；
  单元/阶段数据里的 icon 字段（src/content/*/site.js，内容域）**不再被 UI 消费** ——
  内容域的 emoji 原样保留，但界面渲染层一律用 AppIcon，这样 UI 侧可做到零 emoji 而不必碰内容数据。
-->
<template>
  <div class="home">
    <!-- hero：玻璃拟态 + 柔光渐变（system_design §5.1）。
         首帧陷阱规避：hero 图标延后一帧挂载（WebKit bug #322045 ——
         大面积玻璃 + 内联 SVG 同帧首绘会触发整帧重绘卡顿），玻璃容器本身先绘。 -->
    <header class="home-hero glass glass--soft">
      <AppIcon v-if="heroIconMounted" name="book-open" :size="30" :stroke-width="1.8" class="home-hero__icon" />
      <h1>单招学习之路</h1>
      <p class="home-subtitle">多学科备考平台 | 知识体系 + 高效练习 + 全真模拟</p>
    </header>

    <!-- 今日任务提醒：待复习错题 + 快捷入口。
         P0-6 验收 1「先复习、后学新」的唯一落地动作 = 本区块置顶于「继续学习」之前。 -->
    <section v-if="dueCount !== null" class="today-task card" :class="{ 'has-due': dueCount > 0 }">
      <router-link v-if="dueCount > 0" to="/review" class="today-task__due">
        <span class="due-icon"><AppIcon name="bell" :size="20" /></span>
        <span class="due-text">
          <span class="due-title">今日待复习 <strong>{{ dueCount }}</strong> 道错题</span>
          <span class="due-sub">按遗忘曲线安排复习，点击开始复习</span>
        </span>
        <span class="due-go">→</span>
      </router-link>
      <div v-else class="today-task__clear">
        <span class="due-icon"><AppIcon name="check" :size="20" /></span>
        <span class="due-text">
          <span class="due-title">今日无待复习错题</span>
          <span class="due-sub">可以安心学习新内容</span>
        </span>
      </div>
    </section>

    <!-- 继续学习卡片：上次学习位置一键直达 -->
    <section v-if="lastStudy" class="continue-card card">
      <button class="continue-card__main" @click="continueStudy">
        <span class="continue-icon"><AppIcon :name="subjectIconName(lastStudy.subject)" :size="22" /></span>
        <span class="continue-text">
          <span class="continue-label">继续学习</span>
          <span class="continue-title">{{ lastStudy.unitTitle }} · {{ lastStudy.fileTitle }}</span>
        </span>
        <span class="continue-go">▶</span>
      </button>
    </section>

    <!-- 全文搜索 -->
    <section class="home-search">
      <SearchPanel />
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
        <span class="subject-tab__icon"><AppIcon :name="subjectIconName(s.key)" :size="26" /></span>
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
        <span class="tool-icon"><AppIcon name="layout-dashboard" :size="20" /></span>
        <div class="tool-text">
          <span class="tool-name">学习仪表盘</span>
          <span class="tool-desc">学习进度与数据</span>
        </div>
      </router-link>
      <router-link to="/error-book" class="tool-card" style="border-top-color: var(--warning)">
        <span class="tool-icon"><AppIcon name="book-marked" :size="20" /></span>
        <div class="tool-text">
          <span class="tool-name">错题本</span>
          <span class="tool-desc">回顾与复习错题</span>
        </div>
      </router-link>
      <router-link to="/plan" class="tool-card" style="border-top-color: #8da06f">
        <span class="tool-icon"><AppIcon name="clipboard-list" :size="20" /></span>
        <div class="tool-text">
          <span class="tool-name">学习计划</span>
          <span class="tool-desc">预算 · 倒计时 · 清单</span>
        </div>
      </router-link>
      <router-link v-if="sprintUnit" :to="mockRoute" class="tool-card" style="border-top-color: #a855f7">
        <span class="tool-icon"><AppIcon name="crosshair" :size="20" /></span>
        <div class="tool-text">
          <span class="tool-name">模拟冲刺</span>
          <span class="tool-desc">全真模拟限时实战</span>
        </div>
      </router-link>
    </section>

    <!-- 按阶段分组展示单元（阶段图标不再渲染：内容域 emoji 不进 UI，见文件头说明） -->
    <section
      v-for="phase in groupedUnits"
      :key="phase.phase"
      class="phase-group"
    >
      <h3 class="phase-title" :style="{ color: phase.color }">{{ phase.name }}</h3>
      <div class="unit-list">
        <article
          v-for="unit in phase.units"
          :key="unit.num"
          class="unit-card card"
          @click="goUnit(unit)"
        >
          <div class="unit-card__head">
            <span class="unit-icon" :style="{ background: unit.color + '22', color: unit.color }">
              <AppIcon :name="subjectIconName(currentSubject)" :size="22" />
            </span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useProgressStore } from '@/stores/progress'
import { useStudyDbStore } from '@/stores/studyDb'
import { countDue } from '@/composables/useSpacedReview'
import { SUBJECT_LIST, SUBJECT_META, getSubjectConfig } from '@/content/index'
import SearchPanel from '@/components/SearchPanel.vue'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const progress = useProgressStore()
const db = useStudyDbStore()

// 学科列表
const subjectList = SUBJECT_LIST

// 当前选中的学科（从 localStorage 读取，默认 math）
const currentSubject = ref(localStorage.getItem('current_subject') || 'math')

// 最近学习位置：唯一事实源 = progress store（由 page_progress.visitTime 推导，
// 具备 IndexedDB + 同步链的换设备能力）。原实现读 localStorage.last_study，
// 与 store 派生值构成双存储，已在架构审计 §2-2 收敛 —— 现只读 store。
const lastStudy = computed(() => progress.lastStudied)

// hero 图标延后一帧挂载：玻璃容器先绘，下一帧再绘内联 SVG，
// 规避 WebKit「玻璃 + 大量内联 SVG 同帧首绘」的首帧卡顿（#322045）
const heroIconMounted = ref(false)
onMounted(async () => {
  await nextTick()
  heroIconMounted.value = true
})

// 今日待复习错题数（SM-2 到期）：判据唯一真相源 countDue（与 Dashboard / 复习页同一口径，H7）
const dueCount = ref(null)
onMounted(async () => {
  try {
    // 刷新完成快照（访问/交卷后回首页能立即看到最新进度）
    await progress.refresh()
    await db.init()
    const errors = await db.getAllErrors()
    dueCount.value = countDue(errors)
  } catch { dueCount.value = 0 }
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

// 按阶段分组单元（阶段 icon 字段不再透出：UI 渲染层零 emoji）
const groupedUnits = computed(() => {
  const config = currentConfig.value
  if (!config || !config.units) return []
  const phases = config.phases || {}
  const groups = {}
  for (const unit of config.units) {
    const p = unit.phase
    if (!groups[p]) {
      const phaseInfo = phases[p] || { name: `阶段 ${p}`, color: '#666' }
      groups[p] = { phase: p, name: phaseInfo.name, color: phaseInfo.color, units: [] }
    }
    groups[p].units.push(unit)
  }
  return Object.values(groups).sort((a, b) => a.phase - b.phase)
})

// 学科图标名（唯一取值来源 = SUBJECT_META；未学科目兜底 book-open，
// 只影响异常数据的兜底渲染，正常路径不会走到）
function subjectIconName(key) {
  return SUBJECT_META[key]?.icon || 'book-open'
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
// 冲刺单元（当前学科存在冲刺单元才展示「模拟冲刺」入口，避免无效跳转回首页）
const sprintUnit = computed(() => {
  const config = currentConfig.value
  if (!config || !config.units) return null
  return config.units.find((u) => u.sprint) || null
})
const mockRoute = computed(() => sprintUnit.value
  ? { name: 'unit', params: { subject: currentSubject.value, unitNum: sprintUnit.value.num, fileIndex: 0 } }
  : null)
</script>

<style scoped>
/* hero：玻璃工具类 + 柔光渐变（§5.1）。
 * 渐变只做玻璃底下的「光斑」，用极低不透明度的暖色 radial 光晕（禁纯黑纯灰）；
 * 玻璃层与无 transform 的直系祖先相邻，满足玻璃三铁律（backdrop root 不被破坏）。 */
.home-hero {
  position: relative;
  padding: var(--spacer-24) var(--spacer-16);
  margin-bottom: var(--spacer-24);
  text-align: center;
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--border);
  overflow: hidden;
}
/* 柔光渐变：两个 radial 光斑叠在玻璃底色上（伪元素不产生新的 backdrop root，
 * 因为它本身就在玻璃元素内部 —— backdrop-filter 采样的仍是元素背后的内容） */
.home-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(60% 80% at 18% 12%, rgba(201, 100, 66, 0.14), transparent 70%),
    radial-gradient(50% 70% at 85% 90%, rgba(141, 160, 111, 0.12), transparent 70%);
}
.home-hero__icon { color: var(--primary); margin-bottom: var(--spacer-8); }
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
/* 主 CTA：全页唯一橙色实心填充（橙色门禁：实心 ≤ 1 处） */
.continue-card__main {
  display: flex; align-items: center; gap: var(--spacer-12);
  width: 100%; min-height: 56px;
  background: var(--primary); color: #fff;
  border: none; border-radius: var(--radius-md);
  padding: var(--spacer-12) var(--spacer-16);
  transition: transform var(--dur-1) var(--ease-standard);
}
.continue-card__main:active { transform: scale(0.98); }
.continue-icon { display: inline-flex; }
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

/* 全文搜索 */
.home-search { margin-bottom: var(--spacer-20); }

/* 今日任务提醒 */
.today-task { padding: 0; overflow: hidden; margin-bottom: var(--spacer-20); }
.today-task__due, .today-task__clear {
  display: flex; align-items: center; gap: var(--spacer-12);
  padding: var(--spacer-14) var(--spacer-16);
  min-height: 60px;
}
.today-task__due {
  color: var(--text);
  transition: background 0.15s;
}
.today-task__due:hover { background: var(--surface-muted); }
.today-task.has-due { border-color: var(--warning); border-left-width: 4px; }
.due-icon { display: inline-flex; color: var(--text-muted); flex: 0 0 auto; }
.today-task.has-due .due-icon { color: var(--warning); }
.due-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.due-title { font-weight: 700; font-size: 0.95rem; }
.due-title strong { color: var(--warning); font-size: 1.1rem; }
.due-sub { font-size: 0.78rem; color: var(--text-muted); }
.due-go { font-size: 1.1rem; color: var(--text-muted); flex: 0 0 auto; }

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
.subject-tab__icon { display: inline-flex; color: var(--primary); }
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
  color: var(--text);
  transition: border-color var(--dur-2) var(--ease-standard);
}
.tool-card:hover { border-color: var(--primary); color: var(--text); }
.tool-icon { display: inline-flex; color: var(--text-muted); }
.tool-text { display: flex; flex-direction: column; line-height: 1.4; }
.tool-name { font-weight: 700; font-size: 0.95rem; }
.tool-desc { font-size: 0.75rem; color: var(--text-muted); }

/* 阶段分组 */
.phase-group { margin-bottom: var(--spacer-24); }
.phase-title { font-size: 1rem; margin-bottom: var(--spacer-12); }

.unit-list { display: flex; flex-direction: column; gap: var(--spacer-12); }
.unit-card { cursor: pointer; }
.unit-card__head { display: flex; align-items: center; gap: var(--spacer-16); }
.unit-icon {
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
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

/* 移动端适配 */
@media (max-width: 600px) {
  .home-hero h1 { font-size: clamp(1.3rem, 6vw, 1.7rem); }
  .tool-grid { grid-template-columns: repeat(2, 1fr); }
  .unit-card { padding: var(--spacer-12); }
  .unit-card__head { gap: var(--spacer-12); }
  .unit-icon { width: 40px; height: 40px; }
  .unit-title { font-size: 1rem; }
}
</style>
