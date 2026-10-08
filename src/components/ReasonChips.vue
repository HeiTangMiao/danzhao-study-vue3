<!--
  ReasonChips —— 二级归因层（P0-4）
  职责：自评「我还不会」/ 交卷错题后，弹一个 ≤6 chip 的轻量归因层 —— 一点即完成、可跳过，
        另附可选的知识点自由文本（kp）。归因结果由父级回写 error_book（extra 透传，零迁移）。
  契约：受控组件，纯展示 + 回传；不直接访问 DB。reason/kp 由父级持有并回写。
    props: { open, reason?, kp?, question? }
    emits: 'update:reason' | 'update:kp' | 'done'({reason, kp}) | 'skip'
-->
<template>
  <transition name="rc-fade">
    <div v-if="open" class="rc-overlay" @click.self="onSkip">
      <div class="rc-card" role="dialog" aria-modal="true" aria-label="错题归因">
        <div class="rc-head">
          <span class="rc-title">这道题错在哪？</span>
          <button class="rc-x" aria-label="跳过" @click="onSkip">
            <AppIcon name="x" :size="16" />
          </button>
        </div>

        <p v-if="question" class="rc-question"><MathJaxRender :text="question" /></p>

        <div class="rc-chips">
          <button
            v-for="r in reasons"
            :key="r"
            class="rc-chip"
            :class="{ active: localReason === r }"
            @click="pickReason(r)"
          >
            {{ r }}
          </button>
        </div>

        <div class="rc-kp">
          <input
            v-model="localKp"
            class="rc-kp-input"
            type="text"
            maxlength="40"
            placeholder="补充知识点 / 关键词（可选）"
            @input="onKpInput"
          />
        </div>

        <div class="rc-foot">
          <button class="rc-skip" @click="onSkip">跳过</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import { REASONS } from '@/utils/practiceMetrics'

const props = defineProps({
  // 是否展开（父级控制）
  open: { type: Boolean, default: false },
  // 当前选中的归因（受控）
  reason: { type: String, default: '' },
  // 知识点自由文本（受控）
  kp: { type: String, default: '' },
  // 可选上下文：题干（练习/考试可传，便于用户判断）
  question: { type: String, default: '' }
})

const emit = defineEmits(['update:reason', 'update:kp', 'done', 'skip'])

// 六选一常量与错题本筛选同源（H7 单一真相源，防漂移）
const reasons = REASONS
const localReason = ref(props.reason || '')
const localKp = ref(props.kp || '')

// 展开时以父级传入值初始化（每次弹层都是干净状态）
watch(
  () => props.open,
  (v) => {
    if (v) {
      localReason.value = props.reason || ''
      localKp.value = props.kp || ''
    }
  }
)
watch(
  () => props.reason,
  (v) => {
    localReason.value = v || ''
  }
)
watch(
  () => props.kp,
  (v) => {
    localKp.value = v || ''
  }
)

// 一点即完成：选中归因并回传（含已输入的 kp）
function pickReason(r) {
  localReason.value = r
  emit('update:reason', r)
  emit('done', { reason: r, kp: localKp.value.trim() || '' })
}

function onKpInput() {
  emit('update:kp', localKp.value)
}

// 跳过：不写任何字段（不落空串）
function onSkip() {
  emit('skip')
}
</script>

<style scoped>
.rc-overlay {
  position: fixed;
  inset: 0;
  z-index: 320;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5, 20px);
}
.rc-card {
  width: min(420px, 100%);
  background: var(--surface);
  border-radius: var(--radius-md);
  padding: var(--space-4, 16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
.rc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3, 12px);
}
.rc-title {
  font-weight: var(--fw-semibold, 600);
  font-size: 1.05rem;
}
.rc-x {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--surface-muted);
}
.rc-question {
  font-size: var(--fs-base, 0.9rem);
  color: var(--text-muted);
  margin-bottom: var(--space-3, 12px);
  max-height: 6em;
  overflow: auto;
}
.rc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: var(--space-3, 12px);
}
.rc-chip {
  min-height: 40px;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: var(--fs-base, 0.9rem);
  color: var(--text);
}
.rc-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.rc-chip.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.rc-kp-input {
  width: 100%;
  min-height: 40px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface-muted);
  color: var(--text);
  font-size: var(--fs-base, 0.9rem);
}
.rc-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-3, 12px);
}
.rc-skip {
  min-height: 40px;
  padding: 6px 18px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: var(--fs-base, 0.9rem);
}
.rc-skip:hover {
  color: var(--text);
  border-color: var(--text-muted);
}

.rc-fade-enter-active,
.rc-fade-leave-active {
  transition: opacity 0.2s ease;
}
.rc-fade-enter-from,
.rc-fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .rc-chip,
  .rc-skip {
    min-height: 44px;
  }
}
</style>
