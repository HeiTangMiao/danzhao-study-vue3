<!--
  CodeBlock —— 代码区块（阶段 5 结构扩充 P3）
  职责：
   - 等宽显示代码，并提供「复制」按钮（一键拷走整段命令/程序）
   - 刻意不引 Prism / Shiki：零依赖版即可交付绝大部分价值，
     `lang` 只作为角标显示，不做语法高亮
  视觉（极简留白）：外壳复用 BlockShell 的 shell--formula（浅底色），不自造卡片外框；
  <pre> 横向滚动，绝不换行，避免把缩进和命令拆散
-->
<template>
  <BlockShell :title="block.title" variant="formula">
    <div class="code-block">
      <div class="code-head">
        <span v-if="lang" class="code-lang">{{ lang }}</span>
        <button type="button" class="code-copy" @click="copyCode">{{ copyLabel }}</button>
      </div>
      <pre class="code-pre"><code>{{ code }}</code></pre>
    </div>
  </BlockShell>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import BlockShell from './BlockShell.vue'

const props = defineProps({
  // 区块数据：{ type:'code', title, lang?, code }
  block: { type: Object, required: true }
})

const code = computed(() => String(props.block.code ?? ''))
const lang = computed(() => String(props.block.lang ?? '').trim())

// 复制按钮的三种反馈：默认 / 成功 / 失败
const COPY_LABELS = { idle: '复制', ok: '已复制', fail: '复制失败' }
const copyState = ref('idle')
const copyLabel = computed(() => COPY_LABELS[copyState.value])

let timer = null
function flash(state) {
  copyState.value = state
  clearTimeout(timer)
  timer = setTimeout(() => { copyState.value = 'idle' }, 1500)
}

/**
 * 复制到剪贴板
 * 优先 Clipboard API；非安全上下文 / 老 WebView（Tauri 可能命中）退回 textarea + execCommand
 */
async function copyCode() {
  const text = code.value
  let ok = false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      ok = true
    }
  } catch {
    ok = false
  }
  if (!ok) ok = fallbackCopy(text)
  flash(ok ? 'ok' : 'fail')
}

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

onUnmounted(() => clearTimeout(timer))
</script>

<style scoped>
/* 浅底色与内边距来自 .shell--formula，这里只留代码专属排版 */
.code-block { min-width: 0; }

.code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.code-lang {
  font-size: var(--fs-xs);
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: lowercase;
}
.code-copy {
  font: inherit;
  font-size: var(--fs-xs);
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  padding: 2px var(--space-2);
  cursor: pointer;
}
.code-copy:hover { color: var(--primary); border-color: var(--primary); }

.code-pre {
  margin: 0;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace;
  font-size: var(--fs-sm);
  line-height: var(--lh-snug);
  tab-size: 4;
}
</style>