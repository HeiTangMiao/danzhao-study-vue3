<!--
  UnitView —— 内容页（Schema 驱动渲染，多学科支持）
  职责：
   - 根据路由参数 subject + unitNum + fileIndex 加载对应内容数据
   - 将内容区块数组交给 BlockRenderer 逐块渲染
   - 提供上一页/下一页导航与完成标记
   - 游戏化追踪：页面访问奖励 XP、答题奖励 XP
   - 笔记功能：每页可记录学习笔记
   - 书签功能：收藏当前页面
-->
<template>
  <div class="unit-view">
    <!-- 阅读进度条 -->
    <div class="reading-progress">
      <div class="reading-progress__bar" :style="{ width: readProgress + '%' }"></div>
    </div>

    <!-- 移动端迷你顶栏：滚动离开页面头部后出现（返回首页 + 标题 + 阅读进度） -->
    <transition name="topbar">
      <div v-if="showTopbar && page" class="mobile-topbar">
        <button class="topbar-back" title="返回首页" @click="router.push('/')">←</button>
        <span class="topbar-title">{{ fileMeta?.title }}</span>
        <span class="topbar-progress">{{ readProgress }}%</span>
      </div>
    </transition>

    <!-- 面包屑导航 -->
    <nav class="breadcrumb">
      <router-link to="/">🏠 首页</router-link>
      <span class="crumb-sep">/</span>
      <span>{{ site.breadcrumbHome }}</span>
      <span class="crumb-sep">/</span>
      <span>{{ unit?.title }}</span>
    </nav>

    <!-- 页面头部 -->
    <header v-if="page" class="page-header">
      <div class="page-header__row">
        <div>
          <h1>{{ page.title }}</h1>
          <p class="page-subtitle">{{ page.subtitle }}</p>
        </div>
        <!-- 工具按钮：目录 + 书签 + 笔记 -->
        <div class="page-tools">
          <button v-if="toc.length > 0" class="tool-btn" :class="{ active: showToc }" title="目录" @click="showToc = !showToc">☰</button>
          <button class="tool-btn" :class="{ active: bookmark.isBookmarked.value }" title="收藏" @click="bookmark.toggleBookmark()">
            {{ bookmark.isBookmarked.value ? '★' : '☆' }}
          </button>
          <button class="tool-btn" title="笔记" @click="showNotes = !showNotes">📝</button>
        </div>
      </div>
      <button class="done-btn" :class="{ done: isDone }" @click="toggleDone">
        {{ isDone ? '✅ 已完成' : '○ 标记完成' }}
      </button>
      <!-- XP 获得提示 -->
      <transition name="fade">
        <span v-if="xpPopup" class="xp-popup">+{{ xpPopup }} XP</span>
      </transition>
    </header>

    <!-- 目录导航（折叠式） -->
    <section v-if="showToc && page && toc.length > 0" class="toc-panel card">
      <div class="toc-head">📑 本页目录</div>
      <ul class="toc-list">
        <li v-for="(item, i) in toc" :key="i">
          <button class="toc-item" @click="scrollToBlock(item.index)">
            <span class="toc-icon">{{ item.icon }}</span>
            <span class="toc-text">{{ item.title }}</span>
          </button>
        </li>
      </ul>
    </section>

    <!-- 加载中提示 -->
    <div v-if="!page && loading" class="loading-hint">
      <span class="loading-spinner"></span> 正在加载内容…
    </div>

    <!-- 内容加载失败提示 -->
    <div v-if="!page && !loading" class="error-hint card">
      <p>⚠️ 内容加载失败</p>
      <p class="error-detail">学科: {{ subject }} | 单元: {{ route.params.unitNum }} | 文件: {{ route.params.fileIndex || 0 }}</p>
      <router-link to="/" class="back-link">← 返回首页</router-link>
    </div>

    <!-- 笔记面板（折叠式） -->
    <section v-if="showNotes && page" class="notes-section card">
      <div class="notes-head">
        <span>📝 我的笔记</span>
        <span class="notes-status" :class="'notes-' + notes.statusType.value">{{ notes.status.value }}</span>
      </div>
      <textarea
        v-model="notes.content.value"
        class="notes-textarea"
        placeholder="在此记录学习笔记…（自动保存）"
        @input="notes.scheduleAutosave()"
      ></textarea>
      <div class="notes-foot">
        <span>{{ notes.wordCount.value }} 字</span>
        <button class="notes-save" @click="notes.manualSave()">💾 保存</button>
      </div>
    </section>

    <!-- 内容主体：逐块渲染 -->
    <main v-if="page" class="page-content">
      <div
        v-for="(block, i) in page.blocks"
        :id="'block-' + i"
        :key="i"
        class="block-anchor"
      >
        <BlockRenderer
          :block="block"
          :context="pageContext"
        />
      </div>
    </main>

    <!-- 页面切换导航 -->
    <nav v-if="unit" class="page-nav">
      <button class="nav-btn" :disabled="!hasPrev" @click="goPrev">← 上一页</button>
      <span class="nav-index">{{ fileIndex + 1 }} / {{ unit.files.length }}</span>
      <button class="nav-btn" :disabled="!hasNext" @click="goNext">下一页 →</button>
    </nav>

    <!-- 固定侧边栏：快捷导航 + 快捷操作（移动端为底部栏 + 答题卡抽屉） -->
    <ContentSidebar
      v-if="page"
      :unit="unit"
      :toc="toc"
      :file-index="fileIndex"
      :unit-num="route.params.unitNum"
      :site="site"
      :is-done="isDone"
      :is-math="subject === 'math'"
      :done-files="doneFiles"
      @scroll-to="scrollToBlock"
      @scroll-top="scrollTop"
      @toggle-done="toggleDone"
      @toggle-bookmark="bookmark.toggleBookmark()"
      @toggle-notes="showNotes = !showNotes"
      @toggle-toc="showToc = !showToc"
      @open-geogebra="showDesmos = true"
      @go-file="goFile"
      @go-unit="goUnit"
      @go-prev="goPrev"
      @go-next="goNext"
    />

    <!-- Desmos 演练场浮层 -->
    <transition name="fade">
      <div v-if="showDesmos" class="desmos-overlay" @click.self="showDesmos = false">
        <div class="desmos-overlay__panel">
          <div class="desmos-overlay__head">
            <span>🧮 GeoGebra 图形计算器演练场</span>
            <button class="desmos-overlay__close" title="关闭" @click="showDesmos = false">✕</button>
          </div>
          <GeoGebraPlayground />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, provide, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSubjectConfig } from '@/content/index'
import { useProgressStore } from '@/stores/progress'
import { useGameEngineStore } from '@/stores/gameEngine'
import { useNotes } from '@/composables/useNotes'
import { useBookmarks } from '@/composables/useBookmarks'
import BlockRenderer from '@/components/BlockRenderer.vue'
import ContentSidebar from '@/components/ContentSidebar.vue'
import GeoGebraPlayground from '@/components/GeoGebraPlayground.vue'

const route = useRoute()
const router = useRouter()
const progress = useProgressStore()
const game = useGameEngineStore()

// 当前学科（从路由参数获取，默认 math）
const subject = computed(() => route.params.subject || 'math')

// 当前学科配置（动态获取）
const site = computed(() => getSubjectConfig(subject.value))

// 当前单元（根据路由 unitNum 在当前学科配置中匹配）
const unit = computed(() => site.value.units.find((u) => u.num === route.params.unitNum))

// 当前页索引（从路由或默认 0）
const fileIndex = computed(() => {
  const n = Number(route.params.fileIndex)
  return unit.value && !Number.isNaN(n) ? Math.min(n, unit.value.files.length - 1) : 0
})

// 当前页面元信息
const fileMeta = computed(() => unit.value?.files[fileIndex.value])

// 笔记面板显隐
const showNotes = ref(false)

// Desmos 演练场浮层显隐
const showDesmos = ref(false)

// 加载状态
const loading = ref(false)

// XP 获得浮动提示
const xpPopup = ref(null)
let xpPopupTimer = null

/** 显示 XP 获得提示（2 秒后消失） */
function showXPPopup(xp) {
  if (!xp) return
  xpPopup.value = xp
  if (xpPopupTimer) clearTimeout(xpPopupTimer)
  xpPopupTimer = setTimeout(() => { xpPopup.value = null }, 2000)
}

// 生成页面唯一标识（学科_单元号_文件名）
const pageKey = computed(() => {
  if (!unit.value || !fileMeta.value) return ''
  return `${subject.value}_${unit.value.num}_${fileMeta.value.name}`
})

// 页面上下文（供交互区块记录 XP 与错题）
const pageContext = computed(() => ({
  subject: subject.value,
  unitNum: unit.value?.num || '',
  fileKey: pageKey.value,
  fileTitle: fileMeta.value?.title || '',
  unitTitle: unit.value?.title || ''
}))

// ===== 目录导航（TOC）与阅读进度 =====

// 目录图标映射（按区块类型）
const TOC_ICON = {
  mindmap: '🧠', objectives: '🎯', knowledge: '📖', formula: '🧮',
  table: '📊', warning: '⚠️', tip: '💡', example: '📝',
  quiz: '✏️', diagram: '📐', errorfocus: '🚨', strategy: '🎯', exam: '📝'
}

// 生成目录：仅收录有标题的区块
const toc = computed(() => {
  if (!page.value || !Array.isArray(page.value.blocks)) return []
  return page.value.blocks
    .map((b, i) => ({ index: i, type: b.type, title: b.title }))
    .filter((b) => b.title && TOC_ICON[b.type])
})

// 目录面板显隐
const showToc = ref(false)

// 滚动到指定区块
function scrollToBlock(index) {
  const el = document.getElementById('block-' + index)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 阅读进度（0-100）
const readProgress = ref(0)

// 移动端迷你顶栏：滚动超过一屏后出现（返回 + 标题 + 进度百分比）
const showTopbar = ref(false)

// 计算滚动阅读进度
function updateReadProgress() {
  const doc = document.documentElement
  const total = doc.scrollHeight - window.innerHeight
  if (total <= 0) { readProgress.value = 0; showTopbar.value = false; return }
  const scrolled = window.scrollY
  readProgress.value = Math.min(100, Math.round((scrolled / total) * 100))
  showTopbar.value = scrolled > 200
}

// 监听滚动更新进度条
onMounted(() => {
  window.addEventListener('scroll', updateReadProgress, { passive: true })
  updateReadProgress()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateReadProgress)
})

// 笔记 composable（按页面 key 隔离，key 随导航响应式变化）
const notes = useNotes(pageKey, subject, computed(() => ({
  title: fileMeta.value?.title,
  unitTitle: unit.value?.title
})))

// 书签 composable（key 随导航响应式变化）
const bookmark = useBookmarks(pageKey, subject, computed(() => ({
  title: fileMeta.value?.title,
  unitTitle: unit.value?.title,
  unitNum: unit.value?.num
})))

// 动态加载内容数据（Vite 支持动态 import）
const page = ref(null)

/** 加载页面内容并追踪访问（奖励 XP） */
async function loadPage() {
  if (!unit.value || !fileMeta.value) return
  loading.value = true
  page.value = null
  try {
    // 根据学科动态导入对应内容文件
    const m = await import(`@/content/${subject.value}/${unit.value.folder}/${fileMeta.value.name}.js`)
    page.value = m.default
    // 游戏化追踪：记录页面访问
    const result = await game.trackVisit(
      subject.value,
      unit.value.num,
      unit.value.title,
      pageKey.value,
      fileMeta.value.title,
      fileMeta.value.isTest || false
    )
    if (result.xpGained > 0) showXPPopup(result.xpGained)
    // 记录最近学习位置（首页「继续学习」直达）
    saveLastStudy()
  } catch (e) {
    console.error('[UnitView] 内容加载失败:', e)
    page.value = null
  } finally {
    loading.value = false
  }
}

// 写入最近学习位置（localStorage，轻量同步读取）
function saveLastStudy() {
  if (!unit.value || !fileMeta.value) return
  try {
    localStorage.setItem('last_study', JSON.stringify({
      subject: subject.value,
      unitNum: unit.value.num,
      fileIndex: fileIndex.value,
      unitTitle: unit.value.title,
      fileTitle: fileMeta.value.title,
      time: Date.now()
    }))
  } catch (e) { /* 存储不可用时静默忽略 */ }
}

loadPage()

// 完成状态（按学科隔离）
const isDone = computed(() => progress.isCompleted(subject.value, unit.value?.num, fileIndex.value))

// 单元内各页面完成状态（供移动端答题卡网格）
const doneFiles = computed(() => {
  if (!unit.value) return []
  return unit.value.files.map((_, i) => progress.isCompleted(subject.value, unit.value.num, i))
})

// 标记完成
function toggleDone() {
  progress.toggleComplete(subject.value, unit.value?.num, fileIndex.value)
}

// ===== 考试作答保护 =====
// ExamBlock 注入此状态；作答中导航离开前统一弹确认，防误触丢失作答
const examState = reactive({ active: false })
provide('examState', examState)

function confirmLeaveExam() {
  if (!examState.active) return true
  return window.confirm('测验尚未交卷，离开将丢失作答记录。确定离开吗？')
}

// 翻页导航
const hasPrev = computed(() => fileIndex.value > 0)
const hasNext = computed(() => unit.value && fileIndex.value < unit.value.files.length - 1)

function goPrev() {
  if (!confirmLeaveExam()) return
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: unit.value.num, fileIndex: fileIndex.value - 1 } })
}
function goNext() {
  if (!confirmLeaveExam()) return
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: unit.value.num, fileIndex: fileIndex.value + 1 } })
}

// 滚动到顶部
function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 跳转到同单元指定页
function goFile(i) {
  if (i === fileIndex.value) return
  if (!confirmLeaveExam()) return
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: unit.value.num, fileIndex: i } })
}

// 跳转到指定单元（默认第一页）
function goUnit(u) {
  if (!u) return
  if (!confirmLeaveExam()) return
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: u.num, fileIndex: 0 } })
}

// 监听路由变化重新加载内容（切换页面或学科时触发）
watch(
  () => [route.params.subject, route.params.unitNum, route.params.fileIndex],
  () => {
    // 切换页面时重置会话连击
    game.resetSessionStreak()
    loadPage()
  }
)
</script>

<style scoped>
/* 阅读进度条 */
.reading-progress {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 3px; background: transparent;
}
.reading-progress__bar {
  height: 100%; background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 0 3px 3px 0;
  transition: width 0.1s linear;
}

/* 目录导航 */
.toc-panel { margin-bottom: var(--spacer-16); }
.toc-head { font-weight: 700; margin-bottom: var(--spacer-8); }
.toc-list { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
.toc-item {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-full); padding: 4px 12px;
  font-size: 0.82rem; transition: all 0.15s ease;
}
.toc-item:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }
.toc-icon { font-size: 0.85rem; }

.breadcrumb { margin-bottom: var(--spacer-16); color: var(--text-muted); font-size: 0.85rem; }
.crumb-sep { margin: 0 var(--spacer-8); }
.page-header { margin-bottom: var(--spacer-24); position: relative; }
.page-header__row { display: flex; justify-content: space-between; align-items: flex-start; }
.page-header h1 { font-size: 1.6rem; }
.page-subtitle { color: var(--text-muted); margin-top: var(--spacer-8); }
.page-tools { display: flex; gap: var(--spacer-8); }
.tool-btn {
  width: 36px; height: 36px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-full); cursor: pointer;
  font-size: 1.1rem; display: flex; align-items: center; justify-content: center;
}
.tool-btn.active { color: var(--warning); border-color: var(--warning); }
.done-btn {
  margin-top: var(--spacer-12);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  padding: 6px 16px;
}
.done-btn.done { background: rgba(47, 158, 68, 0.12); border-color: var(--success); color: var(--success); }

/* XP 浮动提示 */
.xp-popup {
  position: absolute; top: 0; right: 0;
  background: var(--primary); color: #fff;
  padding: 4px 14px; border-radius: var(--radius-full);
  font-weight: 600; font-size: 0.9rem;
  animation: xpFloat 2s ease;
}
@keyframes xpFloat {
  0% { opacity: 0; transform: translateY(10px); }
  20% { opacity: 1; transform: translateY(0); }
  80% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-10px); }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }

/* 加载提示 */
.loading-hint { text-align: center; padding: var(--spacer-40); color: var(--text-muted); }
.loading-spinner {
  display: inline-block; width: 20px; height: 20px;
  border: 2px solid var(--border); border-top-color: var(--primary);
  border-radius: 50%; animation: spin 0.8s linear infinite;
  vertical-align: middle; margin-right: var(--spacer-8);
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 错误提示 */
.error-hint { text-align: center; padding: var(--spacer-24); }
.error-hint p { margin: var(--spacer-8) 0; }
.error-detail { color: var(--text-muted); font-size: 0.85rem; }
.back-link { display: inline-block; margin-top: var(--spacer-12); color: var(--primary); }

/* 笔记面板 */
.notes-section { padding: var(--spacer-16); margin-bottom: var(--spacer-16); }
.notes-head { display: flex; justify-content: space-between; margin-bottom: var(--spacer-8); font-weight: 600; }
.notes-status { font-weight: 400; font-size: 0.8rem; }
.notes-saved { color: var(--success); }
.notes-saving { color: var(--warning); }
.notes-error { color: var(--danger); }
.notes-textarea {
  width: 100%; min-height: 100px;
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--spacer-12);
  color: var(--text); font-family: inherit; font-size: 0.9rem;
  resize: vertical;
}
.notes-foot { display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacer-8); font-size: 0.8rem; color: var(--text-muted); }
.notes-save { background: var(--primary-soft); color: var(--primary); border: none; border-radius: var(--radius-full); padding: 4px 12px; cursor: pointer; }

.page-content { display: flex; flex-direction: column; gap: var(--spacer-8); }
.block-anchor { scroll-margin-top: 12px; }

/* 侧边栏可见时，为内容区右侧预留空间，避免被固定侧边栏遮挡 */
@media (min-width: 1151px) and (max-width: 1456px) {
  .unit-view { padding-right: 250px; }
}
/* 移动端迷你顶栏（桌面端隐藏） */
.mobile-topbar { display: none; }
.topbar-enter-active, .topbar-leave-active { transition: transform 0.25s ease, opacity 0.25s ease; }
.topbar-enter-from, .topbar-leave-to { transform: translateY(-100%); opacity: 0; }

/* 移动端：底部操作栏为内容预留空间；头部去重（工具/完成按钮收入底部栏与更多面板） */
@media (max-width: 1150px) {
  .unit-view { padding-bottom: calc(78px + env(safe-area-inset-bottom, 0px)); }
  .page-tools { display: none; }
  .done-btn { display: none; }

  /* 迷你顶栏：返回首页 + 页面标题 + 阅读进度百分比 */
  .mobile-topbar {
    display: flex; align-items: center; gap: 10px;
    position: fixed; top: 0; left: 0; right: 0; z-index: 99;
    padding: calc(6px + var(--sat)) 12px 6px;
    background: var(--surface);
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
  }
  .topbar-back {
    flex: 0 0 auto;
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    background: var(--surface-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: 1.05rem;
    color: var(--text);
  }
  .topbar-title {
    flex: 1; min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-weight: 700; font-size: 0.95rem;
  }
  .topbar-progress {
    flex: 0 0 auto;
    min-width: 44px; text-align: right;
    font-size: 0.8rem; color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
}
.page-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacer-24);
}
.nav-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  padding: 8px 20px;
}
.nav-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.nav-index { color: var(--text-muted); font-size: 0.85rem; }

/* Desmos 演练场浮层 */
.desmos-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  padding: var(--spacer-24);
}
.desmos-overlay__panel {
  width: min(920px, 100%);
  max-height: 92vh;
  display: flex; flex-direction: column;
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.desmos-overlay__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
  font-weight: 700;
}
.desmos-overlay__close {
  width: 30px; height: 30px;
  border-radius: var(--radius-full);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.9rem;
  display: flex; align-items: center; justify-content: center;
}
.desmos-overlay__close:hover { color: var(--danger); border-color: var(--danger); }

/* 浮层内 GeoGebra 演练场样式透传 */
.desmos-overlay__panel :deep(.ggb-playground) { margin-bottom: 0; border: none; border-radius: 0; }
.desmos-overlay__panel :deep(.ggb-body) { min-height: min(62vh, 640px); }
.desmos-overlay__panel :deep(.ggb-container) { min-height: min(62vh, 640px); }

/* 移动端适配 */
@media (max-width: 600px) {
  .page-header h1 { font-size: 1.35rem; }
  .tool-btn { width: 40px; height: 40px; }
  .done-btn { width: 100%; }
  .nav-btn { flex: 1; }
  .desmos-overlay {
    padding: var(--spacer-8);
    align-items: flex-end;
  }
  .desmos-overlay__panel {
    width: 100%;
    max-height: 96vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .desmos-overlay__panel :deep(.ggb-body) { min-height: min(70vh, 560px); }
  .desmos-overlay__panel :deep(.ggb-container) { min-height: min(70vh, 560px); }
}
</style>
