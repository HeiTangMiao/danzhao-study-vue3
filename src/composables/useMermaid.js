/**
 * useMermaid —— Mermaid 图渲染 composable（v11 兼容）
 * 职责：
 *  - 通过 npm 包动态导入 Mermaid v11（Vite 自动代码分割）
 *  - 提供 renderMermaidTo() 将源码渲染到指定 DOM 容器
 *  - 暗色主题下自动切换 mermaid 主题（dark）
 *  - 兼容 Mermaid v11 API（parse + render 两步渲染）
 */

let mermaid = null   // Mermaid 实例缓存
let loaded = false
let loadingPromise = null

/**
 * 加载 Mermaid 库（幂等，通过 npm 动态导入）
 * @returns {Promise<object|null>}
 */
export async function loadMermaid() {
  if (loaded) return mermaid
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      // 通过 Vite 动态导入 mermaid npm 包（自动代码分割）
      const mod = await import('mermaid')
      mermaid = mod.default || mod
      loaded = true
      // 根据当前主题初始化
      const isDark = document.documentElement.dataset.theme === 'dark'
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }
      })
      return mermaid
    } catch (e) {
      console.error('[useMermaid] 加载失败:', e)
      return null
    } finally {
      loadingPromise = null
    }
  })()

  return loadingPromise
}

/**
 * 将 Mermaid 源码渲染到容器（v11 API 兼容）
 * @param {HTMLElement} container 目标容器
 * @param {string} source mermaid 源码
 */
export async function renderMermaidTo(container, source) {
  const m = await loadMermaid()
  if (!m || !container) return

  try {
    // v11 API：先 parse 验证语法，再 render 生成 SVG
    // 生成唯一 id（避免重复渲染冲突）
    const id = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)

    // 清理源码（去除前后空白和多余换行）
    const cleanSource = source.trim()

    // 尝试 parse + render（v11 标准 API）
    if (m.parse) {
      try {
        await m.parse(cleanSource)
      } catch (parseErr) {
        // parse 失败时仍尝试 render（某些版本 parse 过于严格）
        console.warn('[useMermaid] parse 警告:', parseErr.message || parseErr)
      }
    }

    // render 生成 SVG
    const result = await m.render(id, cleanSource)
    const svg = result.svg || result

    // 注入 SVG 到容器
    container.innerHTML = svg

    // 如果有 bindFunctions 回调，执行它（绑定交互事件）
    if (typeof result.bindFunctions === 'function') {
      result.bindFunctions(container)
    }
  } catch (e) {
    console.error('[useMermaid] 渲染失败:', e)
    // 渲染失败时降级显示源码（用 <pre> 保持格式），保证内容可见
    container.innerHTML = `<pre style="white-space:pre-wrap;color:var(--text-muted);font-size:0.85rem;padding:12px;background:var(--surface-muted);border-radius:8px;">${escapeHTML(source)}</pre>`
  }
}

/**
 * HTML 转义
 */
function escapeHTML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 主题切换时重新初始化 Mermaid
 * @param {string} theme 'dark' | 'light'
 */
export async function updateMermaidTheme(theme) {
  if (!loaded || !mermaid) return
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }
    })
  } catch (e) {
    console.error('[useMermaid] 主题切换失败:', e)
  }
}

export default { loadMermaid, renderMermaidTo, updateMermaidTheme }
