<!--
  根组件 —— 应用整体布局外壳
  职责：包含顶部导航（品牌 + 主题切换）与内容区。
  说明：使用 <router-view> 渲染当前路由对应的页面组件。
-->
<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header__brand">📚 单招学习打卡</div>
      <!-- 顶部主题切换开关 -->
      <button class="app-header__theme" @click="toggleTheme" aria-label="切换主题">
        {{ isDark ? '🌙' : '☀️' }}
      </button>
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
 */
import { useTheme } from './composables/useTheme'

const { isDark, toggleTheme } = useTheme()
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
  padding: var(--spacer-16) var(--spacer-24);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.app-header__brand {
  font-weight: 600;
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
  padding: var(--spacer-24);
}
</style>