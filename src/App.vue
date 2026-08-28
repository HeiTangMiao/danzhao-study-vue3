<!--
  根组件 —— 应用整体布局外壳
  职责：包含顶部导航（品牌 + 主题切换）与内容区。
  说明：使用 <router-view> 渲染当前路由对应的页面组件。
-->
<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header__brand">📚 单招学习打卡</div>
      <div class="app-header__right">
        <!-- 已登录：同步 + 个人主页 + 管理入口 + 退出 -->
        <template v-if="auth.isLoggedIn">
          <button class="app-header__sync" :disabled="syncing" @click="doSync">
            {{ syncMsg || '⤓ 同步' }}
          </button>
          <router-link to="/profile" class="app-header__link">👤 {{ auth.user?.username }}</router-link>
          <router-link v-if="auth.isAdmin" to="/admin" class="app-header__link">🛠 管理</router-link>
          <button class="app-header__logout" @click="logout">退出</button>
        </template>
        <!-- 未登录：登录入口 -->
        <router-link v-else to="/login" class="app-header__login">登录</router-link>
        <!-- 顶部主题切换开关 -->
        <button class="app-header__theme" aria-label="切换主题" @click="toggleTheme">
          {{ isDark ? '🌙' : '☀️' }}
        </button>
      </div>
    </header>
    <main class="app-main">
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from './composables/useTheme'
import { useProgressStore } from '@/stores/progress'
import { useAuthStore } from '@/stores/auth'
import { useSyncEngine } from '@/sync/engine'

const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const auth = useAuthStore()
const { runSync } = useSyncEngine()

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
  const r = await runSync()
  syncMsg.value = r.ok ? `已同步 ↑${r.pushed} ↓${r.pulled}` : '同步失败'
  setTimeout(() => { syncMsg.value = '' }, 3000)
  syncing.value = false
}

let syncTimer = null
onMounted(() => {
  if (auth.isLoggedIn) {
    doSync()
    syncTimer = setInterval(() => {
      if (auth.isLoggedIn) runSync()
    }, 5 * 60 * 1000)
  }
})
onBeforeUnmount(() => { if (syncTimer) clearInterval(syncTimer) })

function logout() {
  auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--spacer-12) + var(--sat)) var(--spacer-16);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.app-header__brand {
  font-weight: 600;
}
.app-header__right {
  display: flex;
  align-items: center;
  gap: var(--spacer-8);
}
.app-header__login,
.app-header__sync,
.app-header__link,
.app-header__logout {
  min-height: 36px;
  padding: 0 var(--spacer-10);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--surface-muted);
  color: var(--text);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.app-header__sync:disabled {
  opacity: 0.6;
}
.app-header__theme {
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  width: 36px;
  height: 36px;
  cursor: pointer;
}
.app-main {
  flex: 1;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: var(--spacer-24) var(--spacer-24) calc(var(--spacer-24) + var(--sab));
}

/* 移动端紧凑布局 */
@media (max-width: 600px) {
  .app-header { padding-left: var(--spacer-16); padding-right: var(--spacer-16); }
  .app-main { padding: var(--spacer-16) var(--spacer-16) calc(var(--spacer-16) + var(--sab)); }
  .app-header__login,
  .app-header__sync,
  .app-header__link,
  .app-header__logout {
    min-height: 40px;
    font-size: 0.8rem;
    padding: 0 var(--spacer-8);
  }
}
</style>