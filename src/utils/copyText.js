/**
 * 复制文本到剪贴板（零依赖，浏览器侧共用）
 *
 * 背景：内容页的代码块与编辑器的「复制 .js」都要复制，而 Tauri WebView 等
 *      非安全上下文里 `navigator.clipboard` 可能不可用 —— 各写一份必然分叉，
 *      与内容序列化同理：这类小能力也只能有一份实现。
 *
 * 策略：优先 Clipboard API；不可用或抛错时退回 textarea + document.execCommand。
 *
 * @param {string} text 待复制文本
 * @returns {Promise<boolean>} 是否复制成功（调用方据此给出反馈）
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 落到下面的兜底路径
  }
  return fallbackCopy(text)
}

/** 兜底：临时 textarea + execCommand（老 WebView / 非安全上下文） */
function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export default { copyText }