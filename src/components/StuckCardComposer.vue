<!--
  StuckCardComposer —— 卡点录入表单（P1-10）
  职责：录入「模块 + 操作名 + 路径/快捷键（+ 可选备注）」，三者必填非空后调 db.recordStuck。
  契约：受控显隐（open）；保存成功 emit 'saved'（父级据此刷新/提示），取消或关闭 emit 'close'。
   校验：模块 / 操作名 / 路径三者任一为空串 → 不落库、给提示（空串纪律：可选字段给空串等于本想删）。
   路径允许「Ctrl+T」或「编辑 → 自由变换」两种写法，**不做格式校验**（机判不了，靠用户书写）。
  移动端（沿用批 B 共享知识 5）：输入属性全关、font-size≥16px、触控目标≥44px、focus 时 scrollIntoView。
  props: { open: boolean }
  emits: 'saved'(result) | 'close'
-->
<template>
  <div v-if="open" class="stuck-composer card" data-no-swipe>
    <div class="sc-head">
      <span class="sc-title">记一个卡点</span>
      <button class="sc-x" aria-label="关闭" @click="$emit('close')"><AppIcon name="x" :size="16" /></button>
    </div>

    <label class="sc-field">
      <span class="sc-label">模块 / 作品</span>
      <input
        v-model="moduleName"
        class="sc-input"
        type="text"
        placeholder="如：PS 图层面板"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        autocomplete="off"
        enterkeyhint="next"
        @focus="onFocus"
      />
    </label>

    <label class="sc-field">
      <span class="sc-label">操作名（卡片正面）</span>
      <input
        v-model="action"
        class="sc-input"
        type="text"
        placeholder="如：自由变换"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        autocomplete="off"
        enterkeyhint="next"
        @focus="onFocus"
      />
    </label>

    <label class="sc-field">
      <span class="sc-label">路径 / 快捷键（卡片背面）</span>
      <input
        v-model="pathOrKey"
        class="sc-input"
        type="text"
        placeholder="如：Ctrl+T 或 编辑 → 自由变换"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        autocomplete="off"
        enterkeyhint="done"
        @focus="onFocus"
      />
    </label>

    <label class="sc-field">
      <span class="sc-label">备注（可选）</span>
      <input
        v-model="note"
        class="sc-input"
        type="text"
        placeholder="可选"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        autocomplete="off"
        enterkeyhint="done"
        @focus="onFocus"
      />
    </label>

    <p v-if="errorMsg" class="sc-error">{{ errorMsg }}</p>

    <div class="sc-actions">
      <button class="sc-btn sc-btn--cancel" @click="$emit('close')">取消</button>
      <button class="sc-btn sc-btn--save" :disabled="saving" @click="submit">保存</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useStudyDbStore } from '@/stores/studyDb'

defineProps({
  // 是否展开（父级控制）
  open: { type: Boolean, default: false }
})

const emit = defineEmits(['saved', 'close'])

const db = useStudyDbStore()

const moduleName = ref('')
const action = ref('')
const pathOrKey = ref('')
const note = ref('')
const errorMsg = ref('')
const saving = ref(false)

function reset() {
  moduleName.value = ''
  action.value = ''
  pathOrKey.value = ''
  note.value = ''
  errorMsg.value = ''
}

/** focus 时把输入框滚到视口中心（移动端键盘遮挡规避） */
function onFocus(e) {
  if (e && e.target && typeof e.target.scrollIntoView === 'function') {
    e.target.scrollIntoView({ block: 'center' })
  }
}

async function submit() {
  const m = moduleName.value.trim()
  const a = action.value.trim()
  const p = pathOrKey.value.trim()
  // 三者必填非空：任意为空 → 不落库、给提示（不抛错）
  if (!m || !a || !p) {
    errorMsg.value = '模块、操作名、路径/快捷键都不能为空'
    return
  }
  saving.value = true
  errorMsg.value = ''
  try {
    const r = await db.recordStuck(m, a, p, { note: note.value.trim() })
    reset()
    emit('saved', r)
  } catch (e) {
    console.error('[StuckComposer] 保存失败:', e)
    errorMsg.value = '保存失败，请重试'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.stuck-composer { display: flex; flex-direction: column; gap: var(--space-3); }
.sc-head { display: flex; align-items: center; justify-content: space-between; }
.sc-title { font-weight: var(--fw-semibold); font-size: 1.05rem; }
.sc-x {
  width: 32px; height: 32px; border-radius: var(--radius-full);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--text-muted); background: var(--surface-muted);
}
.sc-field { display: flex; flex-direction: column; gap: 4px; }
.sc-label { font-size: var(--fs-sm); color: var(--text-muted); }
.sc-input {
  min-height: 44px; font-size: 16px; font-family: inherit;
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 0 var(--space-3); color: var(--text);
}
.sc-input:focus { outline: none; border-color: var(--primary); }
.sc-error { color: var(--danger); font-size: var(--fs-sm); }
.sc-actions { display: flex; gap: var(--space-3); justify-content: flex-end; }
.sc-btn {
  min-height: 44px; padding: 0 var(--space-5); border-radius: var(--radius-full);
  font-weight: var(--fw-semibold); font-size: var(--fs-base);
  display: inline-flex; align-items: center; justify-content: center;
}
.sc-btn--cancel { background: var(--surface-muted); color: var(--text); border: 1px solid var(--border); }
.sc-btn--save { background: var(--primary); color: #fff; }
.sc-btn--save:disabled { opacity: 0.5; }
</style>
