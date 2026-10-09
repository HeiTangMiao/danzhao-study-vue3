<!--
  ClozeBlock —— 挖空默写区块（阶段 5 结构扩充 P3；批 B P0-8 增输入模式）
  职责：
   - reveal 模式（缺省，存量兼容）：把 {{答案}} 渲染成可点击空位，点一下揭晓答案
   - input 模式（block.mode === 'input'，B-3）：空位渲染输入框 → 提交逐空比对
     （answerNorm + clozeVariants）→ 逐空标对错；「全部重默」「只看错的那句」
   - 含错空的句子走 recordError 入错题本（B-4，error_book，SM-2 经 loadDueReviews 自动生效）
  说明：内容里写 {{...}}，不要写 ______；空位数量、位置都由标记决定，改文案不用改样式
  视觉（极简留白）：无卡片，正文沿用 68ch 行长；空位用虚线下划线，揭晓后转主色
-->
<template>
  <BlockShell :title="block.title" variant="plain">
    <div class="cloze-list" :class="{ 'cloze-list--input': isInput }" :data-no-swipe="isInput ? '' : null">
      <p
        v-for="(item, i) in items"
        :key="i"
        class="cloze-item"
        :class="{ 'is-frozen': isInput && sentenceFrozen(i) }"
      >
        <template v-for="(seg, si) in item.segments" :key="si">
          <span v-if="!seg.blank">
            <MathJaxRender :text="seg.text" />
          </span>
          <!-- reveal 模式（缺省）：点击揭晓，与改造前完全一致 -->
          <button
            v-else-if="!isInput"
            type="button"
            class="cloze-blank"
            :class="{ 'is-revealed': isRevealed(i, si) }"
            :aria-label="isRevealed(i, si) ? '收起答案' : '揭晓答案'"
            @click="toggle(i, si)"
          >
            <MathJaxRender v-if="isRevealed(i, si)" :text="seg.answer" />
          </button>
          <!-- input 模式（B-3）：空位输入框；提交后按句冻结（全对的句子不可再改） -->
          <input
            v-else
            :ref="(el) => setInputRef(blankIndexOf(i, si), el)"
            v-model="values[blankIndexOf(i, si)]"
            type="text"
            class="cloze-input"
            :class="blankClass(i, si)"
            :disabled="sentenceFrozen(i)"
            :aria-label="`第 ${blankIndexOf(i, si) + 1} 空`"
            :placeholder="`第${blankIndexOf(i, si) + 1}空`"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            autocomplete="off"
            enterkeyhint="next"
            @focus="onFocus"
            @keyup.enter="onEnter(blankIndexOf(i, si))"
          />
        </template>
      </p>
    </div>

    <!-- input 模式操作条（B-3）：提交 / 全部重默 / 只看错的那句 + 逐空得分 -->
    <div v-if="isInput && blanks.length" class="cloze-actions" data-no-swipe>
      <button class="cloze-btn cloze-btn--primary" @click="submitDictation">提交</button>
      <button class="cloze-btn" @click="retryAll">全部重默</button>
      <button class="cloze-btn" :disabled="!hasWrong" @click="retryWrongSentences">只看错的那句</button>
      <span v-if="submitted" class="cloze-score">{{ correctCount }}/{{ blanks.length }} 空正确</span>
    </div>
  </BlockShell>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import BlockShell from './BlockShell.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import { answerMatches } from '@/content/answerNorm'
import { CLOZE_VARIANTS } from '@/content/clozeVariants'
import { useStudyDbStore } from '@/stores/studyDb'

const props = defineProps({
  // 区块数据：{ type:'cloze', title, mode?: 'reveal'|'input', items:[{ text, alts? }] }
  block: { type: Object, required: true },
  // 页面上下文（BlockRenderer 透传）：{ subject, unitNum, fileKey, fileTitle, unitTitle }
  context: { type: Object, default: () => ({}) }
})

/** 交互模式：缺省（字段缺失）= 'reveal'，存量内容渲染路径完全不变 */
const isInput = computed(() => props.block.mode === 'input')

/**
 * 把一段文本切成「普通文字」与「空位」两种片段
 * 未闭合的 {{ 原样保留为文字（校验器会拦下，渲染层只负责不炸）
 */
function parseCloze(text) {
  const segs = []
  const re = /\{\{([\s\S]*?)\}\}/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index) })
    segs.push({ blank: true, answer: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ text: text.slice(last) })
  return segs
}

const items = computed(() =>
  (Array.isArray(props.block.items) ? props.block.items : [])
    .filter((it) => it && typeof it === 'object')
    .map((it) => ({
      text: String(it.text ?? ''),
      segments: parseCloze(String(it.text ?? '')),
      // 该句空位的其他可接受答案（与主答案并列判对；通假/异体字走 clozeVariants，勿写这里）
      alts: Array.isArray(it.alts) ? it.alts.filter((a) => typeof a === 'string' && a) : []
    }))
)

// ===== reveal 模式：已揭晓的空位，键为「第几项-第几段」 =====
const revealed = ref(new Set())
const keyOf = (i, si) => `${i}-${si}`
const isRevealed = (i, si) => revealed.value.has(keyOf(i, si))

function toggle(i, si) {
  const k = keyOf(i, si)
  if (revealed.value.has(k)) revealed.value.delete(k)
  else revealed.value.add(k)
}

// ===== input 模式（B-3）：空位平铺（跨句连续编号） =====
/** 全局空位表：gi 全局序号；main 主答案；alts 该句可接受别名 */
const blanks = computed(() => {
  const list = []
  items.value.forEach((it, i) => {
    it.segments.forEach((seg, si) => {
      if (seg.blank) list.push({ gi: list.length, i, si, main: seg.answer, alts: it.alts })
    })
  })
  return list
})

const blankIndexMap = computed(() => {
  const m = new Map()
  blanks.value.forEach((b) => m.set(`${b.i}-${b.si}`, b.gi))
  return m
})
const blankIndexOf = (i, si) => {
  const v = blankIndexMap.value.get(`${i}-${si}`)
  return v === undefined ? -1 : v
}

// values：每空输入；results：每空判定（null=未提交 / true / false）；submitted：是否已提交过
const values = ref([])
const results = ref([])
const submitted = ref(false)

// 空位集合变化（内容变化/首次装载）时重置状态
watch(
  blanks,
  () => {
    values.value = blanks.value.map(() => '')
    results.value = blanks.value.map(() => null)
    submitted.value = false
  },
  { immediate: true }
)

/** 单空比对：主答案命中或任一 alts 命中即算对（判分唯一入口 answerMatches，H7） */
function blankMatches(typed, blank) {
  const t = typeof typed === 'string' ? typed : ''
  if (!t.trim()) return false
  const opts = { variantMap: CLOZE_VARIANTS }
  if (answerMatches(t, blank.main, opts).matched) return true
  return blank.alts.some((a) => answerMatches(t, a, opts).matched)
}

/** 某句是否含错空（句粒度：整句是语文默写的学习单位） */
function sentenceHasWrong(i) {
  return blanks.value.some((b) => b.i === i && results.value[b.gi] === false)
}

/** 某句是否全对（全对句在提交后冻结展示） */
function sentAllCorrect(i) {
  const mine = blanks.value.filter((b) => b.i === i)
  return mine.length > 0 && mine.every((b) => results.value[b.gi] === true)
}

/** 冻结：已提交且该句全对（避免误触丢状态） */
function sentenceFrozen(i) {
  return submitted.value && sentAllCorrect(i)
}

const hasWrong = computed(() => blanks.value.some((b) => results.value[b.gi] === false))
const correctCount = computed(() => results.value.filter((r) => r === true).length)

/** 空位状态样式（input 模式）：绿=对，红=错 */
function blankClass(i, si) {
  const gi = blankIndexOf(i, si)
  const r = results.value[gi]
  if (r === true) return 'is-correct'
  if (r === false) return 'is-wrong'
  return ''
}

// ===== 焦点管理（移动端软键盘触达 / 桌面键盘流） =====
const inputEls = []
function setInputRef(gi, el) {
  if (gi >= 0) inputEls[gi] = el
}
function focusBlank(gi) {
  nextTick(() => {
    const el = inputEls[gi]
    if (el && typeof el.focus === 'function') {
      el.focus()
      if (el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  })
}
/** 聚焦时把输入框滚到视区中部（防软键盘遮挡） */
function onFocus(e) {
  const el = e && e.target
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
/** Enter：非最后一空 → 跳下一空；最后一空 → 提交（桌面键盘流） */
function onEnter(gi) {
  if (gi < 0) return
  if (gi >= blanks.value.length - 1) {
    submitDictation()
    return
  }
  focusBlank(gi + 1)
}

// ===== 提交判定 + 错句入队（B-3 + B-4） =====
/**
 * 提交：逐空 answerMatches → results；随后对含错空的句子入错题本。
 * 判定在提交时一次完成（不做逐键实时判定——移动端软键盘组合输入/联想会误判）。
 */
async function submitDictation() {
  results.value = blanks.value.map((b) => blankMatches(values.value[b.gi], b))
  submitted.value = true
  await enqueueWrongSentences()
}

/** 全部重默：清空所有输入与判定，焦点回第一空 */
function retryAll() {
  submitted.value = false
  values.value = blanks.value.map(() => '')
  results.value = blanks.value.map(() => null)
  focusBlank(0)
}

/** 只看错的那句：仅清「含错空的句子」的输入与判定；全对句保持冻结展示 */
function retryWrongSentences() {
  const wrongItems = new Set()
  blanks.value.forEach((b) => {
    if (results.value[b.gi] === false) wrongItems.add(b.i)
  })
  if (!wrongItems.size) return
  blanks.value.forEach((b) => {
    if (wrongItems.has(b.i)) {
      values.value[b.gi] = ''
      results.value[b.gi] = null
    }
  })
  submitted.value = true // 全对句仍冻结；错句可重填
  const first = blanks.value.find((b) => wrongItems.has(b.i))
  if (first) focusBlank(first.gi)
}

/**
 * 含错空的句子 → recordError 入错题本（B-4，error_book）：
 * - 句粒度入队，去重键（subject+question+fileKey）与 recordError 对齐；重默再错走去重自增 wrongCount
 * - SM-2 初始字段由 studyDb 写入 → loadDueReviews 自动进复习队列（零接线）
 * - 缺 fileKey 不入队（去重会退化为单元粒度，宁缺勿错）；落库失败不阻断结果展示
 */
async function enqueueWrongSentences() {
  const ctx = props.context || {}
  if (!ctx.fileKey) return
  try {
    const db = useStudyDbStore()
    for (let i = 0; i < items.value.length; i++) {
      if (!sentenceHasWrong(i)) continue
      const mine = blanks.value.filter((b) => b.i === i)
      const correctAnswer = mine.map((b) => b.main).join('；')
      const typedArr = mine.map((b) => String(values.value[b.gi] ?? '').trim())
      const userAnswer = typedArr.some((v) => v) ? typedArr.join('；') : '默写未作答'
      await db.recordError(
        ctx.subject || '',
        ctx.unitNum || '',
        items.value[i].text, // question：原句（含 {{}} 标记原文）
        correctAnswer,
        userAnswer,
        '默写专项',
        {
          fileKey: ctx.fileKey,
          fileTitle: ctx.fileTitle || '',
          unitTitle: ctx.unitTitle || '',
          source: 'cloze' // 来源标记：错题本据此显示「默写」角标
        }
      )
    }
    if (blanks.value.length) {
      await db.recordAnswered(blanks.value.length, { fileKey: ctx.fileKey })
    }
  } catch (e) {
    console.error('[ClozeBlock] 默写错句入队失败:', e)
  }
}
</script>

<style scoped>
.cloze-list { max-width: 68ch; }
.cloze-item { margin-bottom: var(--spacer-12); }
.cloze-item:last-child { margin-bottom: 0; }

.cloze-blank {
  display: inline-block;
  font: inherit;
  color: var(--primary);
  background: none;
  border: none;
  border-bottom: 1px dashed var(--line-strong);
  border-radius: 0;
  padding: 0 var(--space-1);
  margin: 0 var(--space-1);
  cursor: pointer;
  vertical-align: baseline;
}
/* 未揭晓时给一个可见的空位宽度；揭晓后宽度交给答案本身 */
.cloze-blank:not(.is-revealed) { min-width: 4em; }
.cloze-blank:hover { border-bottom-color: var(--primary); }
.cloze-blank.is-revealed { border-bottom-style: solid; border-bottom-color: var(--primary); }

/* ===== input 模式（B-3）：移动端输入约定 =====
   输入属性在模板关闭；字号 16px 防 iOS 聚焦缩放；触控目标加大；容器挂 data-no-swipe */
.cloze-list--input { max-width: 68ch; }
.cloze-input {
  display: inline-block;
  font: inherit;
  font-size: 16px;
  line-height: 1.5;
  min-width: 4em;
  min-height: 44px; /* 触控目标 ≥44px（F2，移动端约定） */
  padding: 2px var(--space-2);
  margin: 0 var(--space-1);
  color: var(--text);
  background: var(--surface-muted);
  border: none;
  border-bottom: 2px solid var(--primary);
  border-radius: 4px 4px 0 0;
  vertical-align: baseline;
}
.cloze-input:focus { outline: none; background: var(--surface); border-bottom-color: var(--primary); }
.cloze-input.is-correct { border-bottom-color: var(--success); background: rgba(var(--success-rgb), 0.1); }
.cloze-input.is-wrong { border-bottom-color: var(--danger); background: rgba(var(--danger-rgb), 0.08); }
.cloze-input:disabled { opacity: 0.85; }
.cloze-item.is-frozen { opacity: 0.9; }

/* 操作条：sticky 兜住长列表，拇指可达 */
.cloze-actions {
  position: sticky; bottom: 0; z-index: 5;
  display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2);
  margin-top: var(--spacer-12);
  padding: var(--space-3) 0 calc(var(--space-2) + var(--sab, 0px));
  background: var(--bg);
}
.cloze-btn {
  min-height: 44px; padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: var(--fs-base); font-weight: 600;
}
.cloze-btn--primary { background: var(--primary); color: #fff; border-color: var(--primary); }
.cloze-btn:disabled { opacity: 0.45; }
.cloze-score { margin-left: auto; font-size: var(--fs-sm); color: var(--text-muted); font-variant-numeric: tabular-nums; }
</style>
