/**
 * 路由配置
 * 说明：使用 hash 模式（createWebHashHistory），兼容 Tauri 本地文件协议，
 *       避免 history 模式在本地资源下刷新 404 的问题。
 * 多学科支持：/study/:subject/:unitNum/:fileIndex?
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import { nextTick } from 'vue'
import { withRouteTransition } from '@/utils/viewTransition'
import { normalizeUnitNum } from '@/utils/routeParams'

const routes = [
  {
    // 账号登录 / 注册
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue')
  },
  {
    // 首页：学科选择 + 单元列表
    path: '/',
    name: 'home',
    // 一级 Tab「学习」。tabOrder 决定 AppTabBar 的呈现顺序，与 AppTabBar.tabs 保持一致。
    meta: { tab: 'study', tabOrder: 0 },
    component: () => import('@/views/HomeView.vue')
  },
  {
    // 练习：聚合层（P6 实施；P1 先占位，保证一级导航 4 Tab 全部可达）
    path: '/practice',
    name: 'practice',
    meta: { tab: 'practice', tabOrder: 1 },
    component: () => import('@/views/PracticeView.vue')
  },
  {
    // 内容页：按学科 + 单元号 + 页面索引渲染
    // unitNum 归一化不在此处（beforeEnter）——见下方「全局 unitNum 归一化守卫」：
    // beforeEnter 是 per-record 守卫，同一 unit 记录内仅 params 变化时不重入，
    // 故「已在 unit 页 → push 非规范同记录深链」的缺口由全局守卫收口（F0c6）。
    path: '/study/:subject/:unitNum/:fileIndex?',
    name: 'unit',
    component: () => import('@/views/UnitView.vue')
  },
  {
    // 兼容旧路由：/unit/:unitNum/:fileIndex? → 重定向到数学（重定向目标会再经全局归一化
    // 守卫（F0c6）；此处归一化是双保险 + 少一跳；站内旧链接亦可能带非零填充单元号）
    path: '/unit/:unitNum/:fileIndex?',
    redirect: (to) => ({
      name: 'unit',
      params: { subject: 'math', unitNum: normalizeUnitNum(to.params.unitNum), fileIndex: to.params.fileIndex }
    })
  },
  {
    // 复习：单卡会话（P0-6）—— 一级 Tab「复习」直达行动页，错题本降为二级入口
    path: '/review',
    name: 'review',
    meta: { tab: 'review', tabOrder: 2 },
    component: () => import('@/views/ReviewView.vue')
  },
  {
    // 学习仪表盘
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue')
  },
  {
    // 学习计划（D-2 P0-7）：二级入口，无 meta.tab（进二级页隐藏底部 pill，与 /dashboard 同款）
    path: '/plan',
    name: 'plan',
    component: () => import('@/views/PlanView.vue')
  },
  {
    // 志愿填报（批 F F-1）：独立顶层页，非学科页；无 meta.tab（与 /plan、/dashboard 同款隐藏底部 pill）
    path: '/guide',
    name: 'guide',
    component: () => import('@/views/GuideView.vue')
  },
  {
    // 错题本
    path: '/error-book',
    name: 'error-book',
    meta: { tab: 'review', tabOrder: 2 },
    component: () => import('@/views/ErrorBookView.vue')
  },
  {
    // 个人主页
    path: '/profile',
    name: 'profile',
    meta: { tab: 'me', tabOrder: 3 },
    component: () => import('@/views/ProfileView.vue')
  },
  {
    // 管理员界面（仅 role=admin）
    path: '/admin',
    name: 'admin',
    meta: { admin: true },
    component: () => import('@/views/AdminView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 前进/后退：恢复原滚动位置；普通导航：回到顶部，避免新页短时停留在大片空白处
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'auto' }
  }
})

/**
 * 全局 unitNum 归一化守卫（F0c6）
 *
 * 为什么放路由层：外部深链可能不带零填充（`5`），而 site.js 的单元号是 `"05"` 字符串相等
 * 匹配（UnitView / ContentSidebar 均如此）→ 不归一化即匹配失败、空白页。归一化放路由层
 * 一处覆盖全部消费点（单一落点，H7）。
 *
 * 为什么是全局守卫而非 unit 记录的 beforeEnter：`beforeEnter` 是 **per-record** 守卫，
 * 「已在 unit 记录 → 仅 params 变化」时不重入（vue-router 4.x 语义；QA R-1 实测：
 * `/study/computer/05/4` → `/study/computer/7/4` 停在 '7'）。全局 `beforeEach` 每次导航
 * 都执行，同记录参数变更也能收口。
 *
 * 注册顺序收益：本守卫**注册在 auth `beforeEach` 之前**（同类型守卫按注册序执行）→
 * 未登录时 `/login?redirect=` 携带的是**规范形**路径（不会把 `5` 带进回跳地址）。
 *
 * 规范形返回 true（不重定向）—— 站内导航（恒用规范形）与翻页转场零影响。
 */
router.beforeEach((to) => {
  if (to.name !== 'unit') return true
  const norm = normalizeUnitNum(to.params.unitNum)
  if (norm === to.params.unitNum) return true
  return { ...to, params: { ...to.params, unitNum: norm }, replace: true }
})

/**
 * 全站强制登录守卫
 *  - /login 未登录放行，已登录跳回首页
 *  - 其余路由未登录一律跳 /login 并带 redirect 回跳
 *  - meta.admin 路由要求 role=admin，否则回首页
 */
import { useAuthStore } from '@/stores/auth'

/**
 * 路由级转场（P3-T2，View Transitions 渐进增强）
 *
 * 触发条件刻意收窄为「Tab ↔ Tab 的跨记录切换」（to/from 都带 meta.tab 且记录不同）：
 *  - D17：内容翻页是**同一记录内的 replace**（fileIndex 变化），根本不会进这个分支 ——
 *    这保证 380ms 并行档（P4-T5）与路由级转场（≤300ms）两档口径互不越界（§5.3）。
 *  - 登录/登出、进/出详情页：瞬时切换。转场价值在「同级内容换位」，进出详情页
 *    层级变化大，溶解反而模糊层级。
 *
 * 实现要点：next() 必须在 startViewTransition 的 update 回调**内部**调用并 await
 * nextTick —— VT 在 update 回调的 Promise 结算时才拍「新快照」，不等 Vue 补丁落盘
 * 就结算，新旧快照会是同一帧，转场等于没发生。守卫在 next() 被调用前保持 pending，
 * 这是 vue-router 回调式守卫的标准用法。
 */
router.beforeResolve((to, from, next) => {
  const crossTab = to.meta?.tab && from.meta?.tab && to.name !== from.name
  if (!crossTab) {
    next()
    return
  }
  withRouteTransition(async () => {
    next()
    await nextTick()
  })
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // 内容页会渲染公式：在这里点火预热 KaTeX（幂等、不 await），
  // 让 523 KB 引擎与路由 chunk / 内容 chunk **并行**下载（见交接文档阶段 7.1）。
  // 用动态 import 而非静态 import —— 避免把 useKatex 拖进入口 chunk。
  if (to.name === 'unit') import('@/composables/useKatex').then((m) => m.warmKatex())

  if (to.path === '/login') {
    return auth.isLoggedIn ? { path: '/' } : true
  }

  if (!auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.admin && !auth.isAdmin) {
    return { path: '/' }
  }

  return true
})

export default router
