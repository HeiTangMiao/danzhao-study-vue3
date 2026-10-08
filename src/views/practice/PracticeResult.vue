<!--
  PracticeResult —— L4 结算页（prd-mobile §5.3 L4）
  规则：
   - 正确率分两行（自动判 X 题正确 Y / 自评 A 题会 B），禁止合并为一个百分比（§5.2 D3）
   - 「本次新入错题 N 道」是最有价值的数字，可一键直达复习 Tab
   - 四动作：重做错题 / 看解析 / 回看知识点（跳回来源页）/ 再来一组
-->
<template>
  <div class="presult">
    <div class="card presult-hero">
      <h1>{{ store.session?.title || '练习' }} · 完成</h1>
      <div class="presult-lines">
        <p class="presult-line"><span class="line-tag line-tag--auto">自动判</span>{{ st.autoCount }} 题，正确 {{ st.autoCorrect }}</p>
        <p class="presult-line"><span class="line-tag line-tag--self">自评</span>{{ st.selfCount }} 题，会 {{ st.selfKnown }}</p>
      </div>
      <p class="presult-meta">共 {{ st.total }} 题 · 用时 {{ fmtTime(st.durationSec) }}</p>
    </div>

    <!-- 新入错题：一键直达复习 Tab（接上「错题收录后无提示」的断点） -->
    <button v-if="st.newErrors > 0" class="card presult-errors" @click="goReview">
      <AppIcon name="siren" :size="18" />
      <span class="presult-errors__text">本次新入错题 {{ st.newErrors }} 道 —— 去复习</span>
      <AppIcon name="chevron-right" :size="15" />
    </button>

    <!-- 单题耗时（P0-3）：耗时最长 Top 3 + 平均；超时题数 > 0 时出「一键归因超时」 -->
    <section v-if="attempts.length" class="card presult-time">
      <h2 class="presult-time__title">单题耗时</h2>
      <p class="presult-time__meta">
        平均 {{ fmtSec(avgMs) }} · 超时 {{ timeouts }} 题（≥ {{ timeoutSec }} 秒）
      </p>
      <ol class="presult-time__list">
        <li v-for="(a, i) in slowest" :key="a.id || i" class="presult-time__item">
          <span class="pt-rank">{{ i + 1 }}</span>
          <span class="pt-q">{{ summaryOf(a) }}</span>
          <span class="pt-sec" :class="{ 'pt-sec--timeout': a.timedOut }">
            <AppIcon v-if="a.timedOut" name="timer" :size="13" />{{ fmtSec(a.elapsedMs) }}
          </span>
        </li>
      </ol>
      <button v-if="timeouts > 0" class="presult-time__attr" :disabled="attributing" @click="attributeTimeouts">
        <AppIcon name="timer" :size="15" /> 一键归因超时（{{ timeouts }} 题）
      </button>
      <p v-if="attributed > 0" class="presult-time__done">已标注 {{ attributed }} 题为「超时蒙猜」</p>
    </section>

    <div class="presult-actions">
      <button class="pact" :disabled="!hasWrong" @click="store.redoErrors()">
        <AppIcon name="rotate-ccw" :size="16" /> 重做错题
      </button>
      <button class="pact" @click="showReview = !showReview">
        <AppIcon name="file-text" :size="16" /> {{ showReview ? '收起解析' : '看解析' }}
      </button>
      <router-link v-if="store.reviewTargetRoute" class="pact" :to="store.reviewTargetRoute">
        <AppIcon name="book-open" :size="16" /> 回看知识点
      </router-link>
      <button class="pact" @click="again">
        <AppIcon name="target" :size="16" /> 再来一组
      </button>
    </div>

    <!-- 逐题解析（可回溯，§5.2 心流保护第 2 条） -->
    <section v-if="showReview" class="card presult-review">
      <h2>逐题解析</h2>
      <div
        v-for="(item, i) in store.session.questions"
        :key="item.key"
        class="review-item"
        :class="reviewClass(i)"
      >
        <div class="review-head">
          <span class="review-mark"><AppIcon :name="isCorrect(i) ? 'check' : 'x'" :size="14" :stroke-width="2.5" /></span>
          <span class="review-q"><MathJaxRender :text="item.question" /></span>
        </div>
        <div class="review-user">
          <span class="review-label">你的作答：</span>{{ userAnswer(i) }}
        </div>
        <div class="review-answer">
          <span class="review-label">参考答案：</span>
          <MathJaxRender :text="item.answer" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import MathJaxRender from '@/components/MathJaxRender.vue'
import { usePracticeStore } from '@/stores/practice'
import { paperKeyOf } from '@/content/practiceBank'
import { topSlowest, timeoutCount, avgElapsedMs, TIMEOUT_MS } from '@/utils/practiceMetrics'

const store = usePracticeStore()
const router = useRouter()

const st = computed(() => store.resultStats || { total: 0, autoCount: 0, autoCorrect: 0, selfCount: 0, selfKnown: 0, newErrors: 0, durationSec: 0 })

const showReview = ref(false)

// ===== 单题耗时（P0-3）=====
const attempts = computed(() => store.session?.attempts || [])
const slowest = computed(() => topSlowest(attempts.value, 3))
const timeouts = computed(() => timeoutCount(attempts.value))
const avgMs = computed(() => avgElapsedMs(attempts.value))
const timeoutSec = Math.round(TIMEOUT_MS / 1000)

const attributing = ref(false)
const attributed = ref(0)
/** 一键归因超时（A-3.4）：把本次超时题标为「超时蒙猜」并同步错题本 */
async function attributeTimeouts() {
  if (attributing.value) return
  attributing.value = true
  try {
    attributed.value = await store.attributeTimeouts()
  } catch (e) {
    console.error('[practice] 一键归因超时失败:', e)
  } finally {
    attributing.value = false
  }
}

/** 毫秒 → 「X分YY秒 / YY秒」 */
function fmtSec(ms) {
  const s = Math.round((Number(ms) || 0) / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}分${String(r).padStart(2, '0')}秒` : `${r}秒`
}

/** 由 questionKey（fileKey|question）反查题干摘要 */
function summaryOf(a) {
  const s = store.session
  if (!s) return ''
  const q = s.questions.find((x) => paperKeyOf(x) === a.questionKey)
  const text = q ? q.question : ''
  return text.length > 40 ? text.slice(0, 40) + '…' : text
}

/** 本次是否有错题（重做错题按钮禁用口径） */
const hasWrong = computed(() => {
  const s = store.session
  if (!s) return false
  return s.questions.some((q, i) => {
    const r = s.records[i]
    return r.assess === 'unknown' || (r.picked !== null && r.picked !== q.correctIndex)
  })
})

function isCorrect(i) {
  const s = store.session
  const q = s.questions[i]
  const r = s.records[i]
  if (r.picked !== null) return r.picked === q.correctIndex
  return r.assess === 'known'
}

function reviewClass(i) {
  return isCorrect(i) ? 'review-ok' : 'review-no'
}

function userAnswer(i) {
  const s = store.session
  const q = s.questions[i]
  const r = s.records[i]
  if (r.picked !== null) {
    return `选项 ${'ABCDEFGH'[r.picked]}（${r.picked === q.correctIndex ? '答对' : '答错'}）`
  }
  return r.assess === 'known' ? '自评：我会了' : '自评：我还不会'
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function goReview() {
  router.push('/error-book')
}

async function again() {
  try {
    await store.againSameConfig()
  } catch (e) {
    console.error('[practice] 再来一组失败:', e)
  }
}
</script>

<style scoped>
.presult { display: flex; flex-direction: column; gap: var(--gap-block-tight); }

.presult-hero { padding: var(--space-5); text-align: center; }
.presult-hero h1 { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--space-4); }
.presult-lines { display: flex; flex-direction: column; gap: var(--space-2); align-items: center; }
.presult-line { font-size: var(--fs-lg); line-height: var(--lh-snug); }
.line-tag {
  display: inline-block; min-width: 52px; margin-right: var(--space-2);
  padding: 1px 10px; border-radius: var(--radius-full); font-size: var(--fs-xs);
}
.line-tag--auto { background: var(--primary-soft); color: var(--primary); }
.line-tag--self { background: var(--surface-muted); color: var(--text-muted); }
.presult-meta { margin-top: var(--space-3); color: var(--text-muted); font-size: var(--fs-md); }

.presult-errors {
  display: flex; align-items: center; gap: var(--space-2);
  min-height: 48px; padding: var(--space-3) var(--space-4);
  color: var(--danger); font-weight: var(--fw-semibold); font-size: var(--fs-base);
  background: rgba(var(--danger-rgb), 0.06); border: 1px solid var(--danger);
}
.presult-errors__text { flex: 1; text-align: left; }

.presult-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); }
.pact {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 48px; border-radius: var(--radius-md);
  border: 1px solid var(--border); background: var(--surface);
  font-size: var(--fs-base); color: var(--text);
}
.pact:active { transform: scale(0.98); }
.pact:disabled { opacity: 0.45; }

.presult-review { padding: var(--space-4); }
.presult-review h2 { font-size: var(--fs-lg); font-weight: var(--fw-semibold); margin-bottom: var(--space-3); }
.review-item {
  border: 1px solid var(--border); border-left-width: 4px;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4); margin-bottom: var(--space-3);
}
.review-ok { border-left-color: var(--success); }
.review-no { border-left-color: var(--danger); }
.review-head { display: flex; gap: var(--space-2); margin-bottom: var(--space-2); }
.review-mark { flex: 0 0 auto; font-weight: var(--fw-bold); }
.review-ok .review-mark { color: var(--success); }
.review-no .review-mark { color: var(--danger); }
.review-q { flex: 1; }
.review-user, .review-answer {
  font-size: var(--fs-base); border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3); margin-top: var(--space-2);
}
.review-user { background: rgba(var(--warning-rgb), 0.08); border: 1px dashed var(--warning); }
.review-no .review-user { border-color: var(--danger); background: rgba(var(--danger-rgb), 0.06); }
.review-answer { background: var(--surface-muted); }
.review-label { font-weight: var(--fw-semibold); color: var(--text-muted); }

/* 单题耗时（P0-3） */
.presult-time { padding: var(--space-4); }
.presult-time__title { font-size: var(--fs-lg); font-weight: var(--fw-semibold); margin-bottom: var(--space-2); }
.presult-time__meta { color: var(--text-muted); font-size: var(--fs-md); margin-bottom: var(--space-3); }
.presult-time__list { list-style: none; display: flex; flex-direction: column; gap: var(--space-2); }
.presult-time__item { display: flex; align-items: center; gap: var(--space-2); font-size: var(--fs-base); }
.pt-rank {
  flex: 0 0 auto; width: 20px; height: 20px; border-radius: 50%;
  background: var(--surface-muted); color: var(--text-muted);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--fs-xs); font-weight: var(--fw-semibold);
}
.pt-q { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pt-sec {
  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 3px;
  color: var(--text-muted); font-variant-numeric: tabular-nums;
}
.pt-sec--timeout { color: var(--danger); font-weight: var(--fw-semibold); }
.presult-time__attr {
  margin-top: var(--space-3); width: 100%; min-height: 44px;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border-radius: var(--radius-full); border: 1px solid var(--danger);
  background: rgba(var(--danger-rgb), 0.06); color: var(--danger); font-weight: var(--fw-semibold);
}
.presult-time__attr:disabled { opacity: 0.5; }
.presult-time__done { margin-top: var(--space-2); color: var(--success); font-size: var(--fs-md); }

@media (max-width: 600px) {
  .presult-actions { grid-template-columns: repeat(2, 1fr); }
}
</style>
