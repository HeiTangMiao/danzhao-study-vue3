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

// 读取用户手动指定的主题；未指定时返回 null（表示跟随系统）
function getSavedTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  return saved === 'light' || saved === 'dark' ? saved : null
}

// 读取初始主题：优先用户手动指定，其次跟随系统偏好
function getInitialTheme() {
  const saved = getSavedTheme()
  if (saved) return saved
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

// 当前主题状态（响应式）
const isDark = ref(getInitialTheme() === 'dark')

// 同步浏览器外壳 / Android 状态栏颜色
function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', isDark.value ? '#16181f' : '#2f6fed')
}

// 将主题写入 <html> 属性，触发 CSS 变量全局切换
// persist=false 时只改 DOM 不写 localStorage（用于跟随系统的场景，避免把系统默认固化为用户偏好）
function applyTheme(persist = true) {
  const root = document.documentElement
  root.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  if (persist) localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light')
  syncThemeColor()
}

// 应用初始主题（不持久化，index.html 内联脚本已在首帧前设置 data-theme 防闪烁）
applyTheme(false)

// 跟随系统主题实时变化（仅当用户未手动指定偏好时生效）
const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
if (mql && typeof mql.addEventListener === 'function') {
  mql.addEventListener('change', (e) => {
    if (getSavedTheme()) return // 用户手动指定过，不跟随系统
    isDark.value = e.matches
    applyTheme(false)
  })
}

/**
 * 切换主题
 * @returns {boolean} 切换后的暗色状态
 */
function toggleTheme() {
  isDark.value = !isDark.value
  applyTheme(true)
  return isDark.value
}

export function useTheme() {
  return { isDark, toggleTheme }
}