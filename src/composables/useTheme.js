/**
 * useTheme —— 明暗主题切换 composable
 * 职责：
 *  - 读取/写入主题偏好（持久化到 localStorage）
 *  - 同步 `<html data-theme>` 属性，驱动 CSS 变量切换
 *  - 跟随系统偏好（prefers-color-scheme）作为默认值
 */
import { ref } from 'vue'

// localStorage 键名，与旧版保持一致以复用已保存的主题
const THEME_KEY = 'math_theme'

// 读取初始主题：优先取本地存储，其次跟随系统偏好
function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

// 当前主题状态（响应式）
const isDark = ref(getInitialTheme() === 'dark')

// 将主题写入 <html> 属性，触发 CSS 变量全局切换
function applyTheme() {
  const root = document.documentElement
  root.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light')
}

// 应用初始主题
applyTheme()

/**
 * 切换主题
 * @returns {boolean} 切换后的暗色状态
 */
function toggleTheme() {
  isDark.value = !isDark.value
  applyTheme()
  return isDark.value
}

export function useTheme() {
  return { isDark, toggleTheme }
}