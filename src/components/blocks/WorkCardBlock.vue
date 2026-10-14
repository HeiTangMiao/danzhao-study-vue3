<!--
  WorkCardBlock —— 作品训练卡「三遍法」（批 F · F-2 / Fc5）
  职责：
   - 一张卡三个勾：① 对照做 ② 只看成品还原 ③ 限时独立做
   - 第三勾 → 启动倒计时（复用 useCountdown 的 deadline 校准内核）；到点展示「到点」提示
   - 三勾状态持久化到 page_progress（零 DB 升版：spread 加字段）
  浏览态契约（H3）：**不自动判分、不写错题本、不发 XP** —— 本卡只是自测清单。
  三遍描述：内容侧经 block.passes[{key,text}] 逐遍写；未写的遍回落 CHECK_DEFS 的内置占位 desc。
  「第几遍 · 名字」（label）是固定骨架，不读字段、不由内容侧改。
-->
<template>
  <section class="workcard card">
    <header class="workcard__head">
      <span class="workcard__icon"><AppIcon name="timer" :size="18" /></span>
      <h3 class="workcard__title">{{ block.title || '作品训练卡' }}</h3>
      <span class="workcard__progress" :class="{ 'is-done': doneCount === 3 }">{{ doneCount }}/3</span>
    </header>

    <p v-if="block.intro" class="workcard__intro">{{ block.intro }}</p>

    <ol class="workcard__checks">
      <li v-for="c in checkList" :key="c.key" class="workcard__item">
        <button
          class="workcard__box"
          :class="{ 'is-on': checks[c.key] }"
          type="button"
          :aria-pressed="checks[c.key]"
          :aria-label="c.label"
          @click="toggle(c.key)"
        >
          <AppIcon v-if="checks[c.key]" name="check" :size="14" />
        </button>
        <div class="workcard__text">
          <span class="workcard__label">{{ c.label }}</span>
          <span class="workcard__desc">{{ c.desc }}</span>
        </div>
      </li>
    </ol>

    <!-- 第三勾：限时独立做 —— 倒计时 + 到点提示 -->
    <div v-if="checks.timed" class="workcard__timer">
      <AppIcon name="timer" :size="16" />
      <span v-if="timeLeft > 0" class="workcard__time">{{ fmtTime(timeLeft) }}</span>
      <span v-else class="workcard__time is-timeup" data-testid="wc-timeup">到点</span>
    </div>
    <p v-if="checks.timed && timeLeft <= 0" class="workcard__note" data-testid="wc-done-note">
      时间到 —— 本卡仅作自测，不自动判分、不计入错题本。
    </p>
  </section>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useStudyDbStore } from '@/stores/studyDb'
import { useCountdown } from '@/composables/useCountdown'

const props = defineProps({
  // 区块数据：{ type:'workcard', id?, title?, intro?, duration?, passes?: [{key,text}] }
  block: { type: Object, required: true },
  // 页面上下文：{ subject, unitNum, fileKey, ... } —— fileKey 用于 page_progress 持久化
  context: { type: Object, default: () => ({}) }
})

const db = useStudyDbStore()

/** 第一/二/三遍的固定骨架文案（正文细节等待内容侧，经 block.intro 补充） */
const CHECK_DEFS = [
  { key: 'guided', label: '第一遍 · 对照做', desc: '对着成品一步步做（文案等待内容侧）' },
  { key: 'restore', label: '第二遍 · 只看成品还原', desc: '只看成品，凭记忆复原过程（文案等待内容侧）' },
  { key: 'timed', label: '第三遍 · 限时独立做', desc: '不看参考，限时独立完成（文案等待内容侧）' }
]

/**
 * 内容侧写的三遍步骤（block.passes）→ 按 key 索引
 * 形状不对的条目一律**忽略**（回退内置 desc），不抛错 —— 内容型字段不该让整页崩。
 */
const passMap = computed(() => {
  const map = {}
  const list = props.block?.passes
  if (!Array.isArray(list)) return map
  for (const p of list) {
    if (!p || typeof p !== 'object') continue
    if (typeof p.text !== 'string' || !p.text.trim()) continue
    // 重复 key 取第一条（校验器已禁止重复；这里只是渲染侧兜底，不抛错）
    if (map[p.key] === undefined) map[p.key] = p.text.trim()
  }
  return map
})

/**
 * 渲染用的三遍列表：**只**覆盖 desc，label（第几遍 · 名字）保持内置骨架
 * —— 第几遍的名字是固定结构，不是内容，不交给内容侧改。
 */
const checkList = computed(() =>
  CHECK_DEFS.map((c) => ({ ...c, desc: passMap.value[c.key] ?? c.desc }))
)

const DEFAULT_DURATION = 900 // 秒（15 分钟）—— 未配置 duration 时的兜底

const duration = computed(() => {
  const d = Number(props.block.duration)
  return Number.isFinite(d) && d > 0 ? d : DEFAULT_DURATION
})

/** 同一页可有多张卡：以 block.id / title 区分子键；缺省 'default' */
const wcId = computed(() => String(props.block.id ?? props.block.title ?? 'default'))
const fileKey = computed(() => props.context?.fileKey || '')

const checks = reactive({ guided: false, restore: false, timed: false })
const { timeLeft, start, reset } = useCountdown(duration.value)

const doneCount = computed(() => CHECK_DEFS.filter((c) => checks[c.key]).length)

/** 格式化 mm:ss */
function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 勾选/取消某一遍；第三遍切换时启停倒计时 */
function toggle(key) {
  checks[key] = !checks[key]
  if (key === 'timed') {
    if (checks.timed) start(duration.value)
    else reset(duration.value)
  }
  persist()
}

/** 持久化到 page_progress（零 DB 升版：展开原行 + 增 workcards 字段，不经第二套序列化） */
async function persist() {
  const key = fileKey.value
  if (!key) return
  try {
    const existing = await db.getPageProgress(key)
    // 仅当该页已建进度行时回写（与 markPageMastered 同款：避免与 markPageVisited 抢建行）
    if (!existing) return
    const workcards = { ...(existing.workcards || {}), [wcId.value]: { ...checks } }
    await db.savePageProgress({ ...existing, workcards })
  } catch (e) {
    console.warn('[workcard] 进度保存失败:', e)
  }
}

onMounted(async () => {
  const key = fileKey.value
  if (!key) return
  try {
    const existing = await db.getPageProgress(key)
    const saved = existing?.workcards?.[wcId.value]
    if (!saved) return
    checks.guided = !!saved.guided
    checks.restore = !!saved.restore
    checks.timed = !!saved.timed
    if (checks.timed) start(duration.value)
  } catch (e) {
    console.warn('[workcard] 进度读取失败:', e)
  }
})
</script>

<style scoped>
.workcard { display: flex; flex-direction: column; gap: var(--space-3); }
.workcard__head { display: flex; align-items: center; gap: var(--space-2); }
.workcard__icon { display: inline-flex; color: var(--primary); }
.workcard__title { flex: 1; font-size: var(--fs-lg); font-weight: var(--fw-semibold); margin: 0; }
.workcard__progress { font-size: var(--fs-md); color: var(--text-muted); font-variant-numeric: tabular-nums; }
.workcard__progress.is-done { color: var(--success); }
.workcard__intro { margin: 0; color: var(--text-muted); font-size: var(--fs-md); line-height: var(--lh-snug); }

.workcard__checks { list-style: none; display: flex; flex-direction: column; gap: var(--space-2); margin: 0; padding: 0; }
.workcard__item { display: flex; align-items: flex-start; gap: var(--space-3); }
.workcard__box {
  position: relative;
  flex: 0 0 auto; width: 28px; height: 28px; border-radius: 50%;
  border: 1.5px solid var(--border); background: var(--surface); color: transparent;
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
}
/* 触控目标 ≥44px：视觉 28px 圆点 + 向外撑开的命中区（依赖祖先无 overflow:hidden） */
.workcard__box::after {
  content: ''; position: absolute; top: 50%; left: 50%;
  width: 44px; height: 44px; transform: translate(-50%, -50%);
}
.workcard__box.is-on { background: var(--success); border-color: var(--success); color: #fff; }
.workcard__text { display: flex; flex-direction: column; gap: 2px; padding-top: 2px; }
.workcard__label { font-size: var(--fs-base); font-weight: var(--fw-medium); }
.workcard__desc { font-size: var(--fs-sm); color: var(--text-muted); }

.workcard__timer {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
  background: var(--surface-muted); color: var(--text); font-variant-numeric: tabular-nums;
}
.workcard__time.is-timeup { color: var(--warning); font-weight: var(--fw-semibold); }
.workcard__note { margin: 0; color: var(--text-muted); font-size: var(--fs-sm); }
</style>
