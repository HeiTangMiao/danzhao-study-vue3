<!--
  根组件 —— 应用整体布局外壳
  职责：
   - 渲染一级导航 AppTabBar（移动端底部 pill / 桌面端顶部玻璃导航条，双形态）
   - 渲染 <router-view> 内容区
  说明：
   - 原「站点式顶部 header」已收敛：品牌与一级入口进入 AppTabBar；同步 / 用户名 / 管理 / 退出 /
     主题收敛进桌面顶栏的用户区插槽（避免 AppTabBar 耦合 auth/sync/theme 逻辑）。
   - 移动端（<1150px）无顶部 header，导航由底部 pill 承担（全屏 app shell）。
   - 内容区不再有 960px 居中列（去 Web 味，见 system_design §2）。
   - 底栏互斥：AppTabBar 的**移动 pill** 仅在 route.meta.tab 存在时渲染；详情页（UnitView）
     隐藏 pill，由 ContentSidebar 底栏接管 —— 内容区仅在 has-tabbar 时为其让位，避免双重留白。
     桌面顶栏则常驻所有页面（承载用户区入口），详情页也让位（见下方 .app-main 媒体查询）。
-->
<template>
  <div class="app-shell">
    <AppTabBar brand="单招学习打卡">
      <!-- 用户区：仅桌面顶栏渲染（移动端顶栏 display:none） -->
      <template #user>
        <template v-if="auth.isLoggedIn">
          <button class="shell-act" :disabled="syncing" @click="doSync">
            {{ syncMsg || '同步' }}
          </button>
          <router-link to="/profile" class="shell-act">{{ auth.user?.username }}</router-link>
          <router-link v-if="auth.isAdmin" to="/admin" class="shell-act">管理</router-link>
          <button class="shell-act" @click="logout">退出</button>
        </template>
        <router-link v-else to="/login" class="shell-act">登录</router-link>
        <!-- 主题切换：内联 SVG（不引入 emoji），P2 统一图标后并入 AppIcon -->
        <button class="shell-act shell-act--icon" aria-label="切换主题" title="切换主题" @click="toggleTheme">
          <svg v-if="isDark" class="shell-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <svg v-else class="shell-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </button>
      </template>
    </AppTabBar>

    <main class="app-main" :class="{ 'has-tabbar': hasTab }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
/**
 * 根组件逻辑
 * 使用 useTheme composable 管理明暗主题，主题状态持久化到 localStorage。
 * 已登录时启动同步：进入即同步一次 + 每 5 分钟后台增量同步。
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTheme } from './composables/useTheme'
import { useProgressStore } from '@/stores/progress'
import { useAuthStore } from '@/stores/auth'
import { useSyncEngine } from '@/sync/engine'
import AppTabBar from '@/components/AppTabBar.vue'

const router = useRouter()
const route = useRoute()
const { isDark, toggleTheme } = useTheme()
const auth = useAuthStore()
const { runSync } = useSyncEngine()

// 是否一级 Tab 页（route.meta.tab 存在）：仅用于移动端底部 pill 的内容区让位。
// 桌面顶栏常驻所有页面，故其让位不依赖此值。
const hasTab = computed(() => !!route.meta.tab)

// 应用启动时预加载统一进度（IndexedDB + 旧数据迁移）
const progress = useProgressStore()
progress.init()

// 同步状态
const syncing = ref(false)
const syncMsg = ref('')
async function doSync() {
  if (syncing.value) return
  syncing.value = true
  syncMsg.value = '同步中…'
  try {
    const r = await runSync()
    syncMsg.value = r.ok ? `已同步 ↑${r.pushed} ↓${r.pulled}` : '同步失败'
  } catch (e) {
    console.error('[App] 同步失败:', e)
    syncMsg.value = '同步失败'
  } finally {
    // finally 兜底：无论成功/失败都复位按钮状态，避免永久卡在「同步中…」
    syncing.value = false
  }
  setTimeout(() => { syncMsg.value = '' }, 3000)
}

let syncTimer = null
onMounted(() => {
  if (auth.isLoggedIn) {
    doSync()
    syncTimer = setInterval(() => {
      if (auth.isLoggedIn) runSync().catch((e) => console.error('[App] 后台同步失败:', e))
    }, 5 * 60 * 1000)
  }
})
onBeforeUnmount(() => { if (syncTimer) clearInterval(syncTimer) })

function logout() {
  if (!window.confirm('确定要退出登录吗？')) return
  auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* 悬浮 pill 不贴底：用 overflow-x: clip 兜住横向溢出的模糊/投影。
   * 用 clip 而非 hidden —— clip 不建立滚动容器、不影响纵向，也不会像 contain:paint 那样
   * 破坏 fixed 子元素/backdrop root。 */
  overflow-x: clip;
}
.app-main {
  flex: 1;
  width: 100%;
  /* 移动优先：左右留白走 --pad-page（≤600px 时被 token 覆盖为 16px）；不再有 960px 居中列。
   * 上下默认只留常规呼吸 + 安全区（移动端详情页无 pill，由 ContentSidebar 底栏自行让位；
   * 桌面端顶栏让位由下方 ≥1150px 媒体查询叠加）。 */
  padding: calc(var(--space-4) + var(--sat)) var(--pad-page) calc(var(--space-5) + var(--sab));
}
/* 仅移动端一级 Tab 页（有底部 pill 时）为其让位：
 * pill 高度 + 上下留白 + 安全区。详情页无 pill → 不加，避免与 ContentSidebar 底栏双重留白。 */
@media (max-width: 1149px) {
  .app-main.has-tabbar {
    padding-bottom: calc(var(--tabbar-h) + var(--space-3) + var(--sab) + var(--space-2));
  }
}

/* 桌面端：顶部导航条常驻所有页面 → 所有页面都为其让位（≥1150px = --bp-lg） */
@media (min-width: 1150px) {
  .app-main {
    padding-top: calc(var(--tabbar-h) + var(--sat) + var(--space-5));
  }
}

/* 用户区控件（桌面顶栏） */
.shell-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--surface-muted);
  color: var(--text);
  font-size: var(--fs-md);
  cursor: pointer;
  text-decoration: none;
}
.shell-act:disabled {
  opacity: 0.6;
  cursor: default;
}
.shell-act--icon {
  width: 36px;
  padding: 0;
}
.shell-icon {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 横屏：刘海屏左右安全区适配 */
@media (orientation: landscape) {
  .app-main {
    padding-left: calc(var(--pad-page) + var(--sal));
    padding-right: calc(var(--pad-page) + var(--sar));
  }
}
</style>
