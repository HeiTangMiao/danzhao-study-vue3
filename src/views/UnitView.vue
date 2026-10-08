<!--
  UnitView —— 内容页（Schema 驱动渲染，多学科支持）
  职责：
   - 根据路由参数 subject + unitNum + fileIndex 加载对应内容数据
   - 将内容区块数组交给 BlockRenderer 逐块渲染
   - 学习追踪：记录页面访问、答题与测验成绩（无游戏化奖励）
   - 笔记 / 书签 / 番茄钟 / 离开保护
  学习页 v4（system_design §5.6 / §5.7，P4-T4/T5）：
   - 页眉页脚为常驻玻璃功能条（ReaderTopbar 44px / ReaderFooter 52px），取代旧
     page-header + page-nav + 迷你顶栏（空间账：页眉 76→44、页脚 130→52）
   - 进度双端策略（§5.6.3，用户拍板）：移动端（<900px）**不挂载** .reading-progress，
     位置感由页眉 2px 分段刻度承担；桌面端保留（渐变已改纯色 --primary，宽度过渡改 scaleX）
   - 左右滑动翻页（useSwipePaging）：手势层只判意图，翻页仍走路由（goPrev/goNext），
     自动继承作答保护 / markPageVisited / 续学位置整条链路
   - backdrop root 解耦（§5.7.4 硬规则）：两条功能条与 .reader-content 是**兄弟节点**，
     翻页动画只 transform 内容层，玻璃条全程不动 —— 绝不给 fixed 玻璃层加 transform 祖先
  导航互斥（system_design §4.1 / §9.3）：本视图为详情页，AppTabBar 底部 pill 不渲染；
  桌面端 AppTabBar 顶部导航条常驻，ReaderTopbar 挪到其正下方（见 reader.css）。
-->
<template>
  <div class="unit-view">
    <!-- 桌面阅读进度条：移动端不挂载（§5.6.3 双端策略），宽度过渡改 scaleX（只动 transform） -->
    <div v-if="!isNarrowViewport" class="reading-progress" aria-hidden="true">
      <div class="reading-progress__bar" :style="{ transform: `scaleX(${readProgress / 100})` }"></div>
    </div>

    <!-- v4 玻璃页眉：返回（唯一可靠返回通道）/ 单元标题 + 页码 / 掌握·收藏·笔记·答题卡入口 / 2px 分段刻度 -->
    <ReaderTopbar
      :unit-title="unit?.title || ''"
      :file-index="fileIndex"
      :total="unit?.files.length || 0"
      :bookmarked="bookmark.isBookmarked.value"
      :notes-open="showNotes"
      :mastered="isPageMastered"
      @back="goHome"
      @toc="onTopbarToc"
      @bookmark="bookmark.toggleBookmark()"
      @notes="showNotes = !showNotes"
      @toggle-master="togglePageMastered"
      @go-index="goFile"
    />

    <!-- 加载中提示 -->
    <div v-if="!page && loading" class="loading-hint">
      <span class="loading-spinner"></span> 正在加载内容…
    </div>

    <!-- 内容加载失败提示 -->
    <div v-if="!page && !loading" class="error-hint card">
      <p>内容加载失败</p>
      <p class="error-detail">学科: {{ subject }} | 单元: {{ route.params.unitNum }} | 文件: {{ route.params.fileIndex || 0 }}</p>
      <router-link to="/" class="back-link">← 返回首页</router-link>
    </div>

    <!-- 笔记浮动面板（桌面 UX 方案二批 4 组件化）：桌面拖拽浮窗 / 移动端底部抽屉；
         数据链路 useNotes 透传零改动，翻页时面板保持打开、内容随 pageKey 自动切换 -->
    <NotesPanel :open="showNotes" :notes="notes" @close="showNotes = false" />

    <!-- 内容主体：逐块渲染。
         ⚠️ 本元素是全页唯一被 transform/opacity 动画的元素（§5.7.4）：
         翻页三态机类 is-leaving/is-entering/is-spring 与跟手 --swipe-dx 都落在这里；
         功能条/番茄钟/弹层都是它的兄弟节点，绝不能挪进它的子树。 -->
    <main
      v-if="page"
      ref="readerContentEl"
      class="page-content reader-content"
      :class="pagingPhase !== 'idle' ? 'is-' + pagingPhase : null"
      :data-paging="pagingPhase !== 'idle' ? '' : null"
    >
      <!-- data-kind = 内容角色（P4-T3），取值来自 blockTypes.js 的 kind 字段；
           无角色（布局原语与功能区块）传 null 让 Vue 省略该属性，CSS 不会误命中 -->
      <div
        v-for="(block, i) in page.blocks"
        :id="'block-' + i"
        :key="i"
        class="block-anchor"
        :data-kind="kindOf(block.type) || null"
      >
        <BlockRenderer
          :block="block"
          :context="pageContext"
        />
      </div>
    </main>

    <!-- v4 玻璃页脚：上一页 / 标记已掌握（主行动，数据落点 §5.7.7）/ 下一页 -->
    <ReaderFooter
      :has-prev="hasPrev"
      :has-next="hasNext"
      :mastered="isPageMastered"
      @prev="pagingGo('prev')"
      @next="pagingGo('next')"
      @toggle-master="togglePageMastered"
    />

    <!-- 固定侧边栏：快捷导航 + 快捷操作（移动端为答题卡抽屉，快捷操作并入抽屉首区块；底栏已由页脚取代） -->
    <ContentSidebar
      v-if="page"
      ref="sidebarRef"
      :unit="unit"
      :toc="toc"
      :file-index="fileIndex"
      :unit-num="route.params.unitNum"
      :site="site"
      :is-done="isDone"
      :is-math="subject === 'math'"
      :done-files="doneFiles"
      :mastered="isPageMastered"
      :bookmarked="bookmark.isBookmarked.value"
      :notes-open="showNotes"
      :hide-bar="true"
      @scroll-to="scrollToBlock"
      @scroll-top="scrollTop"
      @toggle-master="togglePageMastered"
      @toggle-bookmark="bookmark.toggleBookmark()"
      @toggle-notes="showNotes = !showNotes"
      @go-file="goFile"
      @go-unit="goUnit"
      @go-prev="pagingGo('prev')"
      @go-next="pagingGo('next')"
      @toggle-pomodoro="pomodoroOpen = !pomodoroOpen"
    />

    <!-- 番茄钟 = 常驻悬浮球 + 锚定面板（交互模型见 PomodoroPanel 头注）。
         状态自动持久化；计时 interval 在 usePomodoro 内，面板关闭计时照跑 -->
    <PomodoroPanel
      :pomodoro="pomodoro"
      :open="pomodoroOpen"
      @close="pomodoroOpen = false"
      @toggle="pomodoroOpen = !pomodoroOpen"
    />

    <!-- 离开确认弹层（考试作答中导航离开前统一弹确认） -->
    <transition name="fade">
      <div v-if="confirmLeave" class="leave-confirm-overlay" @click.self="handleLeaveConfirm(false)">
        <div class="leave-confirm card">
          <div class="leave-confirm__title">确定离开？</div>
          <p class="leave-confirm__msg">{{ confirmMsg }}</p>
          <div class="leave-confirm__actions">
            <button class="leave-confirm__btn leave-confirm__cancel" @click="handleLeaveConfirm(false)">继续作答</button>
            <button class="leave-confirm__btn leave-confirm__ok" @click="handleLeaveConfirm(true)">离开</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, provide, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { getSubjectConfig } from '@/content/index'
// 别名导入：本组件已有名为 loadPage 的本地函数（负责访问记录/进度刷新等副作用）
import { loadPage as loadContentPage, prefetchPage, clearPrefetch } from '@/content/loadPage'
import { useProgressStore } from '@/stores/progress'
import { useStudyDbStore } from '@/stores/studyDb'
import { useNotes } from '@/composables/useNotes'
import { useBookmarks } from '@/composables/useBookmarks'
import { usePomodoro } from '@/composables/usePomodoro'
import { useSwipePaging } from '@/composables/useSwipePaging'
import BlockRenderer from '@/components/BlockRenderer.vue'
import { iconOf } from '@/components/blocks/registry'
import { kindOf } from '@/components/blocks/blockTypes'
import ContentSidebar from '@/components/ContentSidebar.vue'
import PomodoroPanel from '@/components/PomodoroPanel.vue'
import NotesPanel from '@/components/NotesPanel.vue'
import ReaderTopbar from '@/components/reader/ReaderTopbar.vue'
import ReaderFooter from '@/components/reader/ReaderFooter.vue'
import { useMotionPrefs } from '@/composables/useMotionPrefs'
// v4 功能条与翻页动效样式（token 引 main.css；本文件全局生效一次）
import '@/assets/css/reader.css'

const route = useRoute()
const router = useRouter()
const progress = useProgressStore()
const db = useStudyDbStore()

// 番茄钟：常驻悬浮球 + 锚定面板（交互模型见 PomodoroPanel 头注）。
// pomodoroOpen 由本组件持有，侧栏入口与点球共用同一状态源；
// 球位置与「固定位置」锁均在 PomodoroPanel 内部持久化，本组件不再关心 pinned
const pomodoro = usePomodoro()
const pomodoroOpen = ref(false)

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

// 加载状态
const loading = ref(false)

// 生成页面唯一标识（学科_单元号_文件名）
const pageKey = computed(() => {
  if (!unit.value || !fileMeta.value) return ''
  return `${subject.value}_${unit.value.num}_${fileMeta.value.name}`
})

// 页面上下文（供交互区块记录错题等）
const pageContext = computed(() => ({
  subject: subject.value,
  unitNum: unit.value?.num || '',
  fileKey: pageKey.value,
  fileTitle: fileMeta.value?.title || '',
  unitTitle: unit.value?.title || ''
}))

// ===== 目录导航（TOC）与阅读进度 =====

// 生成目录：仅收录「有标题 且 该类型配置了图标」的区块
// 图标来自 blocks/registry.js，未知类型图标为空字符串，自然被过滤掉
const toc = computed(() => {
  if (!page.value || !Array.isArray(page.value.blocks)) return []
  return page.value.blocks
    .map((b, i) => ({ index: i, type: b.type, title: b.title, icon: iconOf(b.type) }))
    .filter((b) => b.title && b.icon)
})

// 滚动到指定区块
function scrollToBlock(index) {
  const el = document.getElementById('block-' + index)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 阅读进度（0-100）
const readProgress = ref(0)

// 进度双端策略（§5.6.3）：移动端 <900px 不挂载 .reading-progress，进度计算一并跳过（白算也是算）
const isNarrowViewport = ref(false)
let narrowMq = null
function onNarrowChange(e) {
  isNarrowViewport.value = e.matches
  updateReadProgress()
}

// 计算滚动阅读进度
function updateReadProgress() {
  if (isNarrowViewport.value) { readProgress.value = 0; return }
  const doc = document.documentElement
  const total = doc.scrollHeight - window.innerHeight
  if (total <= 0) { readProgress.value = 0; return }
  const scrolled = window.scrollY
  readProgress.value = Math.min(100, Math.round((scrolled / total) * 100))
}

// 监听滚动更新进度条（rAF 合并，避免每帧触发 Vue 渲染）
let scrollRaf = 0
function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    updateReadProgress()
  })
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  // 桌面键盘翻页（桌面 UX 方案 commit 1）：页脚隐藏后补上的第三条翻页通道之一
  window.addEventListener('keydown', onKeydown)
  if (typeof window.matchMedia === 'function') {
    narrowMq = window.matchMedia('(max-width: 899px)')
    isNarrowViewport.value = narrowMq.matches
    narrowMq.addEventListener('change', onNarrowChange)
  }
  updateReadProgress()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeydown)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  narrowMq?.removeEventListener('change', onNarrowChange)
  // 进入动效的观察器随组件销毁，防止持有已卸载 DOM 的引用
  if (revealObserver) {
    revealObserver.disconnect()
    revealObserver = null
  }
  cancelIdlePrefetch()
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

// ===== 区块进入动效（P3-T3）=====
// 动效档位（模块级单例，同时驱动 <html data-motion-tier>，CSS 据此分流降级）
const motion = useMotionPrefs()

let revealObserver = null

/**
 * 为当前页的区块建立进入视口观察。
 * - 只在 full / reduced 两档启动；off 档元素天然可见（CSS 隐藏态只在两档存在），观察器直接不建。
 * - IntersectionObserver **一次触发**：命中即加 .is-revealed 并停止观察该元素 ——
 *   反复触发会让已读内容在回滚时反复淡入，干扰阅读。
 * - 翻页（page 变化）时重建：旧页的观察随 disconnect 整体作废，新页重新观察。
 */
function setupBlockReveal() {
  if (revealObserver) {
    revealObserver.disconnect()
    revealObserver = null
  }
  if (motion.tier.value === 'off') return
  const els = document.querySelectorAll('.page-content .block-anchor')
  if (!els.length) return
  // 降级：极老 WebView 能跑 ES Module 却没有 IntersectionObserver。
  // 此时 <html data-motion-tier> 已是 full/reduced，CSS 隐藏态**已经生效**——
  // 单纯 return 会让区块永远停在 opacity:0（白屏）。所以这里必须就地放行全部区块：
  // 宁可没有任何动效，也不能让用户看不见内容。
  if (typeof IntersectionObserver !== 'function') {
    els.forEach((el) => el.classList.add('is-revealed'))
    return
  }
  revealObserver = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-revealed')
        obs.unobserve(entry.target) // 一次触发
      }
    },
    // rootMargin 底部收 10%：让「刚露出头的」区块先别 reveal，露出约一成才入场，
    // 避免用户看到「半截区块在淡入」的割裂感
    { rootMargin: '0px 0px -10% 0px' }
  )
  els.forEach((el) => revealObserver.observe(el))
}

/** 记录页面访问 + 刷新完成快照（提交新页内容后调用） */
async function recordVisit() {
  await db.markPageVisited({
    subject: subject.value,
    unitNum: unit.value?.num || '',
    unitTitle: unit.value?.title || '',
    fileKey: pageKey.value,
    fileTitle: fileMeta.value?.title || '',
    isTest: fileMeta.value?.isTest || false
  })
  // 「最近学习」位置不另存 localStorage —— progress 由 page_progress 推导（架构审计 §2-2）
  progress.refresh().catch((e) => console.error('[UnitView] 刷新进度失败:', e))
}

/** 只取数据不落副作用（翻页转场闸门用：数据就绪时机由三态机决定） */
async function fetchPageData() {
  if (!unit.value || !fileMeta.value) return null
  // 元信息由 site.js 推导并注入（见 src/content/loadPage.js）；越界返回 null 交由模板降级
  return loadContentPage(subject.value, unit.value.num, fileIndex.value)
}

/** 首载/跨单元：直接加载并记录访问（无翻页转场） */
async function loadPage() {
  if (!unit.value || !fileMeta.value) return
  loading.value = true
  // 注意：不在此清空 page —— 保留旧内容直到新内容就绪，避免整块闪空
  try {
    page.value = await fetchPageData()
    if (page.value) await recordVisit()
  } catch (e) {
    console.error('[UnitView] 内容加载失败:', e)
    page.value = null
  } finally {
    loading.value = false
  }
}

loadPage()

// 完成状态（按学科隔离）
const isDone = computed(() => progress.isCompleted(subject.value, unit.value?.num, fileIndex.value))

// 单元内各页面完成状态（供移动端答题卡网格；完成语义见 stores/progress.js）
const doneFiles = computed(() => {
  if (!unit.value) return []
  return unit.value.files.map((_, i) => progress.isCompleted(subject.value, unit.value.num, i))
})

// ===== v4 页脚主行动「标记已掌握」（§5.7.7 语义③）=====
const isPageMastered = computed(() =>
  progress.isPageMastered(subject.value, unit.value?.num, fileIndex.value)
)

async function togglePageMastered() {
  if (!unit.value || !pageKey.value) return
  const payload = { subject: subject.value, unitNum: unit.value.num, fileKey: pageKey.value }
  // 已掌握 → 取消（masteredAt 置 null + unmaster_page 日志）；反之标记（时间戳 + master_page 日志）
  const r = isPageMastered.value
    ? await db.unmarkPageMastered(payload)
    : await db.markPageMastered(payload)
  if (r && r.ok) progress.refresh().catch((e) => console.error('[UnitView] 刷新掌握态失败:', e))
}

// ===== 考试作答保护 =====
// ExamBlock 注入此状态；作答中导航离开前统一确认，防误触丢失作答
const examState = reactive({ active: false })
provide('examState', examState)

// 应用内确认弹层（替代 window.confirm，规避部分 Android WebView 不支持 confirm 导致无法离开的隐患）
const confirmLeave = ref(false)
const confirmMsg = ref('')
let resolveLeave = null
function requestLeaveConfirm() {
  confirmMsg.value = '测验尚未交卷，离开将丢失作答记录。确定离开吗？'
  confirmLeave.value = true
  return new Promise((resolve) => { resolveLeave = resolve })
}
function handleLeaveConfirm(ok) {
  confirmLeave.value = false
  if (resolveLeave) { resolveLeave(ok); resolveLeave = null }
}

// 统一离开保护：页内翻页（onBeforeRouteUpdate）+ 跨路由离开（onBeforeRouteLeave）都走同一确认。
// leaveConfirmed：手势/按钮翻页路径已当面确认过一次，路由守卫放行本次——
// 否则 confirm 弹层会弹两次（调用方一次 + 守卫一次）
let leaveConfirmed = false
async function guardLeave() {
  if (!examState.active) return true
  if (leaveConfirmed) { leaveConfirmed = false; return true }
  return requestLeaveConfirm()
}
onBeforeRouteLeave(guardLeave)
onBeforeRouteUpdate(guardLeave)

// ===== 翻页（v4：滑动/按钮共用一条转场路径；D17 页内 replace 不入历史栈，§5.7.2）=====
const hasPrev = computed(() => fileIndex.value > 0)
const hasNext = computed(() => unit.value && fileIndex.value < unit.value.files.length - 1)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 内容层元素（全页唯一被 transform/opacity 的元素）
const readerContentEl = ref(null)
// ContentSidebar 模板引用（底栏隐藏后经 expose 打开答题卡抽屉）
const sidebarRef = ref(null)

/** 一次进行中的页内翻页导航（watch 路由后消费；非空 = 本次导航走转场闸门） */
let pendingPageNav = null

/**
 * 翻页统一入口：滑动 / 页脚按钮 / 侧栏按钮都走这里。
 * 顺序刻意为「先确认、后起动画」——确认弹层出现时页面还没有任何视觉变化，
 * 用户取消则页面保持原状（§5.7.3：被作答保护拦截 = 不进入 leaving）。
 * @param {'prev'|'next'} dir 翻页方向
 * @param {number} [offset] 页偏移（默认 ±1；答题卡跳页传目标差值）
 */
async function pagingGo(dir, offset = dir === 'next' ? 1 : -1) {
  if (!unit.value) return
  const target = fileIndex.value + offset
  if (target < 0 || target >= unit.value.files.length || target === fileIndex.value) return
  const ok = await guardLeave()
  if (!ok) return
  swipe.beginLeaving(dir)
  leaveConfirmed = true
  pendingPageNav = { dir, target }
  // D17：页内翻页 replace 不入历史栈——返回 = 离开单元；跨单元进入仍 push（goUnit）
  router.replace({ name: 'unit', params: { subject: subject.value, unitNum: unit.value.num, fileIndex: target } })
  // 看门狗：路由未被消费（参数异常等）→ 回弹，绝不卡死在 leaving 白屏态
  window.setTimeout(() => {
    if (pendingPageNav && swipe.phase.value === 'leaving') {
      pendingPageNav = null
      swipe.springBack(0)
    }
  }, 450)
}

/**
 * 桌面键盘翻页（桌面 UX 方案 commit 1）：←/→ 走 pagingGo 统一转场路径。
 * 守卫采用白名单式逐条 return 放行书写，缺省才触发翻页：
 * ① 测验作答中（与滑动翻页 isBlocked 同源的 examState）
 * ② 表单元素聚焦（←/→ 在输入框内是移动光标，不能被翻页劫持）
 * ③ 离开确认弹层开着（confirmLeave 就在本组件内，可直接读）
 * ④ 答题卡抽屉开着——面板状态在 ContentSidebar 内部未 expose，
 *    但其 watch 在面板打开时会锁 body 滚动（overflow:hidden），以该副作用作守卫
 * ⑤ 翻页转场进行中（三态机单飞，避免连按堆积导航）
 * 带修饰键的 ←/→ 是浏览器/系统快捷键（如 ⌘+← 回历史），一并不劫持。
 */
function isEditableTarget(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}
function onKeydown(e) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
  if (examState.active) return
  if (isEditableTarget(document.activeElement)) return
  if (confirmLeave.value) return
  if (document.body.style.overflow === 'hidden') return
  if (swipe.phase.value !== 'idle') return
  pagingGo(e.key === 'ArrowLeft' ? 'prev' : 'next')
}

/**
 * 转场闸门（§5.7.3 并行档）：出场启动后 100ms（--swipe-overlap）且数据就绪（上限 400ms）
 * 才提交新内容并入场；数据超时则先入场、内容落地后再换（预取正常时不可见）。
 */
async function transitionedLoad() {
  loading.value = true
  const dataPromise = fetchPageData()
  let data = null
  let dataDone = false
  dataPromise.then((d) => { data = d; dataDone = true }).catch(() => { dataDone = true })
  await Promise.all([
    swipe.overlapDone(),
    Promise.race([dataPromise.catch(() => null), sleep(400)])
  ])
  if (dataDone) {
    page.value = data
    if (data) await recordVisit()
    loading.value = false
    swipe.beginEntering()
  } else {
    // 数据超 400ms：先入场（旧内容暂留，随后被替换），不长时间白屏（R9 前置）
    swipe.beginEntering()
    dataPromise.then((d) => {
      page.value = d
      if (d) recordVisit().catch(() => {})
      loading.value = false
    }).catch(() => { loading.value = false })
  }
}

// ===== 滑动翻页手势（手势层只判意图；换数据/换路由在上方 pagingGo）=====
const swipe = useSwipePaging({
  target: readerContentEl,
  isBlocked: () => examState.active, // 作答中不启用手势（§5.7.1 排除名单）
  canGo: (dir) => (dir === 'prev' ? hasPrev.value : !!hasNext.value),
  onIntent: (dir) => pagingGo(dir),
  // 方向锁判定为水平的瞬间预取目标页（§5.7.5 建议②）
  onPrefetch: (dir) => {
    const t = fileIndex.value + (dir === 'next' ? 1 : -1)
    if (unit.value && t >= 0 && t < unit.value.files.length) {
      prefetchPage(subject.value, unit.value.num, t)
    }
  }
})
const pagingPhase = swipe.phase

// ===== 空闲预取下一页（§5.7.5 建议①：只预取 1 页，requestIdleCallback 降级 setTimeout）=====
let idleHandle = 0
let idleIsRic = false
function cancelIdlePrefetch() {
  if (!idleHandle) return
  if (idleIsRic && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle)
  else clearTimeout(idleHandle)
  idleHandle = 0
}
function scheduleIdlePrefetch() {
  cancelIdlePrefetch()
  const next = fileIndex.value + 1
  if (!unit.value || next >= unit.value.files.length) return
  const run = () => prefetchPage(subject.value, unit.value.num, next)
  if (typeof window.requestIdleCallback === 'function') {
    idleIsRic = true
    idleHandle = window.requestIdleCallback(run, { timeout: 2000 })
  } else {
    idleIsRic = false
    idleHandle = window.setTimeout(run, 1200)
  }
}

// 首载与翻页共用一条路径：内容就绪且 DOM 渲染后再观察（nextTick 保证 .block-anchor 已存在）
watch(page, () => {
  nextTick(setupBlockReveal)
  scheduleIdlePrefetch()
})

/** 页眉返回：唯一可靠返回通道（R2）。作答保护由 onBeforeRouteLeave 统一拦截 */
function goHome() {
  router.push('/')
}

/** 页眉「答题卡与目录」：移动端打开答题卡抽屉。桌面端目录常驻侧栏（toc-panel 浮层已按用户裁定移除） */
function onTopbarToc() {
  sidebarRef.value?.openSheet()
}

// 滚动到顶部
function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 跳转到同单元指定页（答题卡网格）：同样走转场路径
function goFile(i) {
  if (!unit.value || i === fileIndex.value) return
  pagingGo(i > fileIndex.value ? 'next' : 'prev', i - fileIndex.value)
}

// 跳转到指定单元（默认第一页）：跨单元仍 push（D17：返回要能回 Tab），不做内容换页转场
function goUnit(u) {
  if (!u) return
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: u.num, fileIndex: 0 } })
}

// 监听路由变化重新加载内容：
// - pendingPageNav 非空 = 手势/按钮发起的页内翻页 → 走并行档转场闸门
// - 其余（首载参数修正 / 跨单元 / 跨学科）→ 普通加载；跨单元清预取集（§5.7.5 建议③）
let lastUnitKey = `${route.params.subject}|${route.params.unitNum}`
watch(
  () => [route.params.subject, route.params.unitNum, route.params.fileIndex],
  () => {
    const unitKey = `${route.params.subject}|${route.params.unitNum}`
    const nav = pendingPageNav
    pendingPageNav = null
    if (nav) {
      transitionedLoad()
      return
    }
    if (unitKey !== lastUnitKey) clearPrefetch()
    lastUnitKey = unitKey
    loadPage()
  }
)
</script>

<style scoped>
/* 阅读进度条（仅桌面端挂载，§5.6.3）：渐变改纯色 --primary（7.7 禁橙色渐变）；
 * 宽度过渡改 scaleX（只动 transform，origin left） */
.reading-progress {
  position: fixed;
  top: calc(var(--sat) + var(--reader-topbar-h));
  left: 0; right: 0; z-index: 119;
  height: 3px; background: transparent;
}
@media (min-width: 1150px) {
  /* AppTabBar 顶部导航条（≥1150 常驻）在页眉上方 → 进度条整体再下移一条页眉高 */
  .reading-progress { top: calc(var(--tabbar-h) + var(--sat) + var(--reader-topbar-h)); }
}
.reading-progress__bar {
  height: 100%;
  background: var(--primary);
  border-radius: 0 3px 3px 0;
  transform-origin: left;
  transition: transform 0.1s linear;
}

.fade-enter-active, .fade-leave-active { transition: opacity var(--dur-3) var(--ease-standard); }

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

/* 笔记面板样式已迁入 NotesPanel.vue（桌面 UX 方案二批 4 组件化） */

/* 阶段 3 第二步：区块间距统一为 32px —— gap 归零，靠 .block-anchor 相邻选择器给间距。
 * 各区块自身的 margin-bottom 已一并移除（间距双来源问题，见交接文档第六节第 4 条） */
.page-content { display: flex; flex-direction: column; gap: 0; }
.block-anchor + .block-anchor { margin-top: var(--gap-block, 32px); }
.block-anchor { scroll-margin-top: 16px; }

/* 侧边栏可见时，为内容区右侧预留空间，避免被固定侧边栏遮挡 */
@media (min-width: 1151px) and (max-width: 1456px) {
  .unit-view { padding-right: 250px; }
}

/* 移动端：页脚让位（reader.css 已按 v4 功能条计算），锚点偏移对齐页眉高度 */
@media (max-width: 600px) {
  .block-anchor { scroll-margin-top: calc(var(--reader-topbar-h) + var(--sat) + 8px); }
}

/* 离开确认弹层 */
.leave-confirm-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  padding: var(--spacer-24);
}
.leave-confirm {
  width: min(360px, 100%);
  padding: var(--spacer-24);
  box-shadow: var(--shadow-pop);
}
.leave-confirm__title { font-weight: 700; font-size: 1.05rem; margin-bottom: var(--spacer-12); }
.leave-confirm__msg { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: var(--spacer-20); }
.leave-confirm__actions { display: flex; gap: var(--spacer-12); }
.leave-confirm__btn {
  flex: 1; min-height: 44px;
  border-radius: var(--radius-full);
  font-weight: 600; font-size: 0.9rem;
  display: inline-flex; align-items: center; justify-content: center;
}
.leave-confirm__cancel { background: var(--surface-muted); color: var(--text); border: 1px solid var(--border); }
.leave-confirm__ok { background: var(--danger); color: #fff; }

/* 番茄钟样式（悬浮球 + 面板）已全部迁入 PomodoroPanel.vue（常驻悬浮球交互模型）。
 * 本组件不再持有任何番茄钟相关样式或状态。 */
</style>
