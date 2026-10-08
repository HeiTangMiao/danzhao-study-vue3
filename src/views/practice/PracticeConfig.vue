<!--
  PracticeConfig —— L2 组卷配置（prd-mobile §5.3 L2 / §5.6）
  流程：学科 → 单元（可多选，不选 = 全科）→ 题量 → 难度（可选）→ 含真题卷题目（默认关闭）→ 开始
  差异化：unit/weak 模式题量 5/10/20（默认 10）；custom（自定义组卷）10/30/50（默认 20）。
  文案红线：自定义组卷的结果禁止自称「真题」。
-->
<template>
  <div class="pcfg">
    <header class="pcfg-header">
      <button class="pcfg-back" @click="store.quitSession()"><AppIcon name="chevron-left" :size="16" /> 返回</button>
      <h1>{{ modeLabel }}</h1>
      <p class="pcfg-sub">选择范围与题量，开始练习</p>
    </header>

    <section class="card cfg-section">
      <h2>学科</h2>
      <div class="chip-row">
        <button
          v-for="(meta, key) in SUBJECT_META"
          :key="key"
          class="chip"
          :class="{ 'chip--on': draft.subject === key }"
          @click="pickSubject(key)"
        >
          <AppIcon :name="meta.icon" :size="14" /> {{ meta.name }}
        </button>
      </div>
    </section>

    <section class="card cfg-section">
      <h2>单元<span class="cfg-hint">不选 = 全科</span></h2>
      <div class="chip-row">
        <button
          v-for="u in units"
          :key="u.num"
          class="chip"
          :class="{ 'chip--on': draft.unitNums.includes(u.num) }"
          @click="toggleUnit(u.num)"
        >
          {{ u.num }} {{ u.title }}
        </button>
      </div>
    </section>

    <section class="card cfg-section">
      <h2>题量</h2>
      <div class="chip-row">
        <button
          v-for="n in countOptions"
          :key="n"
          class="chip"
          :class="{ 'chip--on': draft.count === n }"
          @click="draft.count = n"
        >
          {{ n }} 题
        </button>
      </div>
    </section>

    <section class="card cfg-section">
      <h2>难度<span class="cfg-hint">可选</span></h2>
      <div class="chip-row">
        <button class="chip" :class="{ 'chip--on': !draft.difficulty }" @click="draft.difficulty = ''">不限</button>
        <button
          v-for="d in DIFFICULTY_LIST"
          :key="d.value"
          class="chip"
          :class="{ 'chip--on': draft.difficulty === d.value }"
          @click="draft.difficulty = d.value"
        >
          {{ d.label }}
        </button>
      </div>
    </section>

    <section class="card cfg-section cfg-row">
      <div class="cfg-switch-text">
        <h2>含真题卷题目</h2>
        <p class="cfg-hint-p">默认关闭；开启后自定义组卷可能抽到真题卷原题</p>
      </div>
      <button
        class="switch"
        :class="{ 'switch--on': draft.includeExam }"
        role="switch"
        :aria-checked="draft.includeExam"
        aria-label="含真题卷题目"
        @click="draft.includeExam = !draft.includeExam"
      >
        <span class="switch-knob"></span>
      </button>
    </section>

    <p v-if="error" class="cfg-error" role="alert">{{ error }}</p>

    <button class="cfg-start" :disabled="starting" @click="start">
      {{ starting ? '组卷中…' : `开始练习（${draft.count} 题）` }}
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { usePracticeStore } from '@/stores/practice'
import { SUBJECT_META, getSubjectConfig } from '@/content/index'
import { diffLabel } from '@/utils/blockMeta'

const store = usePracticeStore()
const draft = computed(() => store.draft)

const starting = ref(false)
const error = ref('')

// 难度选项取自 item.difficulty 枚举（content-schema）：basic/medium/advanced/sprint
const DIFFICULTY_LIST = [
  { value: 'basic', label: diffLabel('basic') },
  { value: 'medium', label: diffLabel('medium') },
  { value: 'advanced', label: diffLabel('advanced') }
]

const modeLabel = computed(() =>
  draft.value.mode === 'custom' ? '自定义组卷' : draft.value.mode === 'weak' ? '薄弱专项' : '单元练习'
)

const units = computed(() => {
  try {
    return getSubjectConfig(draft.value.subject).units || []
  } catch (e) {
    return []
  }
})

const countOptions = computed(() =>
  draft.value.mode === 'custom' ? [10, 20, 30, 50] : [5, 10, 20]
)

function pickSubject(key) {
  if (draft.value.subject === key) return
  // 切学科必须清单元多选：单元号属于学科，跨学科残留会产生空范围
  draft.value.subject = key
  draft.value.unitNums = []
}

function toggleUnit(num) {
  const list = draft.value.unitNums
  const i = list.indexOf(num)
  if (i >= 0) list.splice(i, 1)
  else list.push(num)
}

async function start() {
  if (starting.value) return
  starting.value = true
  error.value = ''
  try {
    await store.startFromDraft()
  } catch (e) {
    console.error('[practice] 组卷失败:', e)
    error.value = e.message || '组卷失败，请重试'
  } finally {
    starting.value = false
  }
}
</script>

<style scoped>
.pcfg { display: flex; flex-direction: column; gap: var(--gap-block-tight); }
.pcfg-header h1 { font-size: var(--fs-2xl); margin: 0; font-weight: var(--fw-semibold); }
.pcfg-sub { margin-top: var(--space-2); color: var(--text-muted); font-size: var(--fs-md); }
.pcfg-back {
  display: inline-flex; align-items: center; gap: 2px; min-height: 32px;
  color: var(--text-muted); font-size: var(--fs-md); margin-bottom: var(--space-2);
}
.pcfg-back:hover { color: var(--text); }

.cfg-section { padding: var(--space-4); }
.cfg-section h2 { font-size: var(--fs-base); font-weight: var(--fw-semibold); margin-bottom: var(--space-3); }
.cfg-hint { margin-left: var(--space-2); font-weight: var(--fw-normal); font-size: var(--fs-xs); color: var(--text-muted); }
.cfg-hint-p { margin-top: var(--space-1); font-size: var(--fs-xs); color: var(--text-muted); }

.chip-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.chip {
  display: inline-flex; align-items: center; gap: 4px; min-height: 36px;
  padding: 0 var(--space-3); border-radius: var(--radius-full);
  border: 1px solid var(--border); background: var(--surface-muted);
  font-size: var(--fs-md); color: var(--text);
  transition: background var(--dur-1) var(--ease-standard), border-color var(--dur-1) var(--ease-standard);
}
.chip--on { background: var(--primary-soft); border-color: var(--primary); color: var(--primary); font-weight: var(--fw-medium); }
.chip:active { transform: scale(0.97); }

/* 开关行 */
.cfg-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.cfg-row h2 { margin-bottom: 0; }
.switch {
  flex: 0 0 auto; width: 48px; height: 28px; border-radius: var(--radius-full);
  background: var(--border); position: relative; transition: background var(--dur-2) var(--ease-standard);
}
.switch--on { background: var(--primary); }
.switch-knob {
  position: absolute; top: 3px; left: 3px; width: 22px; height: 22px;
  border-radius: 50%; background: var(--surface);
  transition: transform var(--dur-2) var(--ease-standard);
  box-shadow: var(--shadow-xs);
}
.switch--on .switch-knob { transform: translateX(20px); }

.cfg-error {
  background: rgba(var(--danger-rgb), 0.1); border: 1px solid var(--danger);
  color: var(--danger); border-radius: var(--radius-md);
  padding: var(--space-3); font-size: var(--fs-md);
}

.cfg-start {
  min-height: 48px; border-radius: var(--radius-full);
  background: var(--primary); color: #fff;
  font-size: var(--fs-lg); font-weight: var(--fw-semibold);
  transition: transform var(--dur-1) var(--ease-standard), opacity var(--dur-1) var(--ease-standard);
}
.cfg-start:active { transform: scale(0.98); }
.cfg-start:disabled { opacity: 0.5; }
</style>
