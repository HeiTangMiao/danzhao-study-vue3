/**
 * 路由配置
 * 说明：使用 hash 模式（createWebHashHistory），兼容 Tauri 本地文件协议，
 *       避免 history 模式在本地资源下刷新 404 的问题。
 * 多学科支持：/study/:subject/:unitNum/:fileIndex?
 */
import { createRouter, createWebHashHistory } from 'vue-router'

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
    component: () => import('@/views/HomeView.vue')
  },
  {
    // 内容页：按学科 + 单元号 + 页面索引渲染
    path: '/study/:subject/:unitNum/:fileIndex?',
    name: 'unit',
    component: () => import('@/views/UnitView.vue')
  },
  {
    // 兼容旧路由：/unit/:unitNum/:fileIndex? → 重定向到数学
    path: '/unit/:unitNum/:fileIndex?',
    redirect: (to) => ({ name: 'unit', params: { subject: 'math', unitNum: to.params.unitNum, fileIndex: to.params.fileIndex } })
  },
  {
    // 低代码编辑器
    path: '/editor',
    name: 'editor',
    component: () => import('@/views/editor/EditorView.vue')
  },
  {
    // 学习仪表盘
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue')
  },
  {
    // 错题本
    path: '/error-book',
    name: 'error-book',
    component: () => import('@/views/ErrorBookView.vue')
  },
  {
    // 个人主页
    path: '/profile',
    name: 'profile',
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
  routes
})

/**
 * 全站强制登录守卫
 *  - /login 未登录放行，已登录跳回首页
 *  - 其余路由未登录一律跳 /login 并带 redirect 回跳
 *  - meta.admin 路由要求 role=admin，否则回首页
 */
import { useAuthStore } from '@/stores/auth'

router.beforeEach((to) => {
  const auth = useAuthStore()

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
