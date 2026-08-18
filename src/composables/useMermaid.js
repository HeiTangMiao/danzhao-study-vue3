/**
 * useMermaid —— Mermaid 图渲染 composable（v11 兼容）
 * 职责：
 *  - 通过 npm 包动态导入 Mermaid v11（Vite 自动代码分割）
 *  - 提供 renderMermaidTo() 将源码渲染到指定 DOM 容器
 *  - 暗色主题下自动切换 mermaid 主题（dark）
 *  - 兼容 Mermaid v11 API（parse + render 两步渲染）
 *  - 方案 B2：语义着色——对思维导图自动注入 classDef 分类配色
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
      const mod = await import('mermaid')
      mermaid = mod.default || mod
      loaded = true
      const isDark = document.documentElement.dataset.theme === 'dark'
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        // strict + 关闭 HTML 标签注入，杜绝标签 XSS（不信任任何外部 Mermaid 源码）
        securityLevel: 'strict',
        flowchart: { useMaxWidth: true, htmlLabels: false, curve: 'basis' }
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
 * 方案 B2 · 语义着色
 * 为思维导图源自动追加 classDef 与节点分组，实现「概念/判定/易错/方法」分类配色。
 * 不依赖内容侧手写 classDef；仅通过节点文本关键词启发式分类，全部使用纯 fill/stroke（无 HTML，符合 strict）。
 * @param {string} source 原始 mermaid 源码
 * @returns {string} 注入 classDef 与 class 绑定后的源码
 */
export function decorateMindmap(source) {
  if (!source || typeof source !== 'string') return source
  // 仅处理 flowchart 图（graph LR / graph TD）
  if (!/^\s*(graph|flowchart)\s/i.test(source)) return source

  // 分类规则：按关键词命中顺序判定，写入 className
  const rules = [
    { cls: 'mmConc', words: [] }, // 兜底：常规概念
    { cls: 'mmJudge', words: ['判定', '判断', '判别', '识别', '检验'] },
    { cls: 'mmErr', words: ['易错', '易混', '注意', '警示', '常见错误', '陷阱', '误区', '勿'] },
    { cls: 'mmMethod', words: ['方法', '步骤', '技巧', '套路', '模型', '通式', '策略', '化简', '换算'] },
    { cls: 'mmKey', words: ['结论', '性质', '定理', '核心', '关键', '本质', '定义', '一般形式'] }
  ]

  // 1) 全景解析：匹配所有 `nodeId["label"]`（含边行内联定义，如 `ROOT --> A["正弦函数"]`）
  //    兼容源码两种形态：`N0["标签"]` 与 `N0[\"标签\"]`（转义后的引号）
  const assign = new Map() // nodeId -> 中文 label
  const nodeDefRe = /([A-Za-z0-9_]+)\s*\[(?:\\")?([\s\S]*?)(?:\\"|")\]\]?/g

  for (const raw of source.split('\n')) {
    let m
    nodeDefRe.lastIndex = 0
    while ((m = nodeDefRe.exec(raw)) !== null) {
      const id = m[1]
      // 仅当该 token 是节点定义（前导为 `-->`、空格或行首、`graph` 声明之外的合法位置）
      if (id === 'graph' || id === 'flowchart' || id === 'LR' || id === 'TD') continue
      const label = (m[2] || '').replace(/\\"/g, '"').replace(/^\s*|$/g, '').trim()
      assign.set(id, label)
    }
  }

  // 2) 决定每个节点的语义分类；仅覆盖能被解析到的节点
  const classOf = new Map()
  for (const [id, label] of assign) {
    let cls = 'mmConc'
    for (const r of rules) {
      if (r.cls === 'mmConc') continue
      if (r.words.some((w) => label.includes(w))) { cls = r.cls; break }
    }
    classOf.set(id, cls)
  }

  // 3) 原样保留所有行，末尾统一追加 classDef + class 绑定
  const defs = [
    'classDef mmConc fill:#EEF4F2,stroke:#9CC3B8,color:#2B4A43',
    'classDef mmJudge fill:#EBF3FE,stroke:#A7C6F4,color:#2B4A75',
    'classDef mmErr fill:#FDEFEB,stroke:#F0B4A8,color:#7A3428',
    'classDef mmMethod fill:#F4F6EC,stroke:#C6D38F,color:#4C5A24',
    'classDef mmKey fill:#FBF3E4,stroke:#E3BC7E,color:#6B4A16'
  ]
  const binds = []
  for (const [id, cls] of classOf) binds.push(`class ${id} ${cls}`)

  return source.replace(/\s*$/, '') + '\n' + defs.join('\n') + '\n' + binds.join('\n') + '\n'
}

/**
 * 将 Mermaid 源码渲染到容器（v11 API 兼容）
 * @param {HTMLElement} container 目标容器
 * @param {string} source mermaid 源码
 * @param {object} [opts] 选项 { decorate:boolean } 是否启用语义着色（仅思维导图默认开启）
 */
export async function renderMermaidTo(container, source, opts = {}) {
  const m = await loadMermaid()
  if (!m || !container) return

  // 语义着色预处理（默认开启，只对 flowchart 生效，失败则回退原样）
  let finalSource = source
  if (opts.decorate === false) {
    // 跳过着色
  } else {
    try {
      const decorated = decorateMindmap(source)
      if (decorated) finalSource = decorated
    } catch (e) {
      console.warn('[useMermaid] 着色预处理失败，使用原样:', e)
    }
  }

  try {
    const id = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    const cleanSource = finalSource.trim()

    if (m.parse) {
      try { await m.parse(cleanSource) } catch (parseErr) {
        console.warn('[useMermaid] parse 警告:', parseErr.message || parseErr)
      }
    }

    const result = await m.render(id, cleanSource)
    const svg = result.svg || result
    container.innerHTML = svg
    if (typeof result.bindFunctions === 'function') result.bindFunctions(container)
  } catch (e) {
    console.error('[useMermaid] 渲染失败:', e)
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
      securityLevel: 'strict',
      flowchart: { useMaxWidth: true, htmlLabels: false, curve: 'basis' }
    })
  } catch (e) {
    console.error('[useMermaid] 主题切换失败:', e)
  }
}

export default { loadMermaid, renderMermaidTo, updateMermaidTheme, decorateMindmap }