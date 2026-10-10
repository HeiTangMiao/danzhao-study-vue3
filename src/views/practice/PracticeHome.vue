<!--
  PracticeHome —— L1 练习首页（prd-mobile §5.3 L1）
  职责：
   - 未完成会话卡：继续上次练习（有则显示，无则不占位）
   - 三模式入口：单元练习（最常用）/ 薄弱专项（复用 Dashboard weakAreas 口径）/ 模拟冲刺
   - 模拟冲刺：4 套真题卷（跳既有 ExamBlock 页面）+「自定义组卷」二级入口
   - 底部统计：本周练习 X 题 / 新入错题 Y 道（只显示真实数据，无数据不放占位卡）
-->
<template>
  <div class="phome">
    <header class="phome-header">
      <h1>练习</h1>
      <p class="phome-sub">单元练习 · 薄弱专项 · 模拟冲刺</p>
    </header>

    <!-- 未完成会话卡 -->
    <div v-if="store.session" class="card resume-card">
      <button class="resume-main" @click="store.resumeSession()">
        <AppIcon name="pencil" :size="16" />
        <span class="resume-text">
          继续上次练习 · {{ store.session.title }} · {{ store.answeredCount }}/{{ store.session.questions.length }}
        </span>
      </button>
      <button class="resume-discard" @click="store.discardSession()">放弃</button>
    </div>

    <!-- 四入口 -->
    <section class="entry-grid">
      <button class="card entry" @click="store.openConfig({ mode: 'unit' })">
        <span class="entry-icon"><AppIcon name="book-open" :size="22" /></span>
        <span class="entry-name">单元练习</span>
        <span class="entry-desc">选单元，学完即练</span>
      </button>
      <button class="card entry" @click="weakOpen = !weakOpen">
        <span class="entry-icon"><AppIcon name="target" :size="22" /></span>
        <span class="entry-name">薄弱专项</span>
        <span class="entry-desc">错题多的优先</span>
      </button>
      <button class="card entry" @click="examOpen = !examOpen">
        <span class="entry-icon"><AppIcon name="timer" :size="22" /></span>
        <span class="entry-name">模拟冲刺</span>
        <span class="entry-desc">真题卷 · 自定义</span>
      </button>
      <button class="card entry" @click="timedOpen = !timedOpen">
        <span class="entry-icon"><AppIcon name="crosshair" :size="22" /></span>
        <span class="entry-name">限时仿真</span>
        <span class="entry-desc">三档 · 倒计时</span>
      </button>
    </section>

    <!-- 薄弱专项展开：weakAreas Top5（口径与 Dashboard 一致，零新聚合逻辑） -->
    <section v-if="weakOpen" class="card sub-panel">
      <h2>薄弱单元 Top5</h2>
      <p v-if="!store.weakAreas.length" class="sub-empty">
        还没有错题记录——先做一组练习，系统会自动找出你的薄弱单元。
      </p>
      <button
        v-for="w in store.weakAreas"
        :key="`${w.subject}|${w.unitNum}`"
        class="weak-item"
        @click="store.openConfig({ mode: 'weak', subject: w.subject, unitNums: [w.unitNum] })"
      >
        <span class="weak-name">{{ subjectName(w.subject) }} · {{ unitTitle(w.subject, w.unitNum) }}</span>
        <span class="weak-count">{{ w.count }} 道错题</span>
      </button>
    </section>

    <!-- 模拟冲刺展开：真题卷列表 + 自定义组卷二级入口 -->
    <section v-if="examOpen" class="card sub-panel">
      <h2>真题模拟卷</h2>
      <p v-if="!papers.length" class="sub-empty">真题卷索引加载中，请稍候。</p>
      <router-link
        v-for="p in papers"
        :key="p.fileKey"
        class="paper-item"
        :to="`/study/${p.subject}/${p.unitNum}/${p.fileIndex}`"
      >
        <span class="paper-name">{{ subjectName(p.subject) }} · {{ p.title }}</span>
        <span class="paper-count">{{ p.count }} 题 · 计时</span>
      </router-link>
      <button class="paper-custom" @click="store.openConfig({ mode: 'custom' })">
        <AppIcon name="compass" :size="15" />
        自定义组卷 —— 从全部知识点随机抽题（非真题）
      </button>
    </section>

    <!-- 限时仿真展开：三档预设（TIMED_PRESETS 单一来源，不在此内联 25/50/150） -->
    <section v-if="timedOpen" class="card sub-panel">
      <h2>限时仿真</h2>
      <p class="sub-empty">倒计时到点自动交卷，也可中途交卷；建议两次仿真间隔 ≥ 14 天。</p>
      <button
        v-for="p in timedPresets"
        :key="p.id"
        class="paper-item"
        :disabled="timedStarting"
        @click="startTimed(p.id)"
      >
        <span class="paper-name">{{ p.label }}</span>
        <span class="paper-count">{{ p.includeExam ? '含真题卷' : '非真题' }}</span>
      </button>
      <p v-if="timedError" class="sub-error">{{ timedError }}</p>
    </section>

    <!-- 底部统计：只显示真实数据，无数据不占位（§6 AI 味清单第 9 条） -->
    <section v-if="weekCount > 0 || weekErrors > 0" class="card week-stats">
      <div class="week-item">
        <span class="week-val">{{ weekCount }}</span>
        <span class="week-label">本周练习（题）</span>
      </div>
      <div class="week-item">
        <span class="week-val" :class="{ 'week-warn': weekErrors > 0 }">{{ weekErrors }}</span>
        <span class="week-label">本周新入错题</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { usePracticeStore, TIMED_PRESETS } from '@/stores/practice'
import { useStudyDbStore } from '@/stores/studyDb'
import { SUBJECT_META, getSubjectConfig } from '@/content/index'

const store = usePracticeStore()
const db = useStudyDbStore()

const weakOpen = ref(false)
const examOpen = ref(false)
const timedOpen = ref(false)

// 限时仿真三档（单一来源 TIMED_PRESETS；视图不内联数值）
const timedPresets = TIMED_PRESETS
const timedStarting = ref(false)
const timedError = ref('')

/** 开始某档限时仿真（全科混卷口径由 store.startTimed 决定） */
async function startTimed(presetId) {
  if (timedStarting.value) return
  timedStarting.value = true
  timedError.value = ''
  try {
    await store.startTimed(presetId)
  } catch (e) {
    console.error('[practice] 限时仿真组卷失败:', e)
    timedError.value = e.message || '组卷失败，请重试'
  } finally {
    timedStarting.value = false
  }
}

// 真题卷清单（来自题库索引的 examPapers，坐标可直接跳既有 ExamBlock 页面）
const papers = computed(() => store.bankIndex?.examPapers || [])

// ===== 本周统计（近 7 天，只报真实数据）=====
const weekCount = ref(0)
const weekErrors = ref(0)

function subjectName(subject) {
  return SUBJECT_META[subject]?.name || subject
}

function unitTitle(subject, unitNum) {
  try {
    const u = getSubjectConfig(subject).units.find((x) => x.num === unitNum)
    return u ? u.title : `单元 ${unitNum}`
  } catch (e) {
    return `单元 ${unitNum}`
  }
}

async function loadWeekStats() {
  try {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    const [stats, errors] = await Promise.all([db.getAllDailyStats(), db.getAllErrors()])
    weekCount.value = stats.reduce((sum, s) => sum + (s.questionsAnswered || 0), 0)
    // daily_stats 是全历史累计，需按日期过滤近 7 天
    const weekStart = new Date(since)
    const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
    weekCount.value = stats
      .filter((s) => s.date >= weekKey)
      .reduce((sum, s) => sum + (s.questionsAnswered || 0), 0)
    weekErrors.value = errors.filter((e) => (e.createdAt || 0) >= since).length
  } catch (e) {
    console.warn('[practice] 本周统计加载失败:', e)
  }
}

onMounted(() => {
  loadWeekStats()
})
</script>

<style scoped>
.phome { display: flex; flex-direction: column; gap: var(--gap-block-tight); }
.phome-header h1 { font-size: var(--fs-2xl); margin: 0; font-weight: var(--fw-semibold); }
.phome-sub { margin-top: var(--space-2); color: var(--text-muted); font-size: var(--fs-md); }

/* 未完成会话卡：主按钮 + 放弃 */
.resume-card { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); }
.resume-main {
  flex: 1; display: flex; align-items: center; gap: var(--space-2);
  min-height: 44px; color: var(--primary); font-weight: var(--fw-semibold);
  text-align: left; font-size: var(--fs-base);
}
.resume-text { flex: 1; }
.resume-discard {
  flex: 0 0 auto; min-height: 32px; padding: 0 var(--space-3);
  border: 1px solid var(--border); border-radius: var(--radius-full);
  color: var(--text-muted); font-size: var(--fs-sm); background: var(--surface-muted);
}

/* 四入口：2×2 网格（移动端拇指区更稳） */
.entry-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); }
.entry { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-1); padding: var(--space-4); text-align: left; }
.entry-icon { color: var(--primary); margin-bottom: var(--space-1); }
.entry-name { font-weight: var(--fw-semibold); font-size: var(--fs-base); }
.entry-desc { font-size: var(--fs-xs); color: var(--text-muted); line-height: var(--lh-snug); }
.entry:active { transform: scale(0.98); }

/* 子面板（薄弱 / 模拟冲刺 / 限时仿真展开） */
.sub-panel h2 { font-size: var(--fs-lg); font-weight: var(--fw-semibold); margin-bottom: var(--space-3); }
.sub-empty { color: var(--text-muted); font-size: var(--fs-md); line-height: var(--lh-snug); margin-bottom: var(--space-2); }
.sub-error { margin-top: var(--space-2); color: var(--danger); font-size: var(--fs-md); }
.weak-item, .paper-item {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
  width: 100%; padding: var(--space-3); border-radius: var(--radius-md);
  background: var(--surface-muted); margin-bottom: var(--space-2); text-align: left;
}
.paper-item:disabled { opacity: 0.5; }
.weak-name, .paper-name { font-size: var(--fs-base); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.weak-count, .paper-count { flex: 0 0 auto; font-size: var(--fs-xs); color: var(--text-muted); }
.paper-custom {
  display: flex; align-items: center; gap: var(--space-2);
  width: 100%; min-height: 44px; padding: var(--space-3);
  margin-top: var(--space-2); border-radius: var(--radius-md);
  border: 1px dashed var(--primary); color: var(--primary);
  font-size: var(--fs-base); font-weight: var(--fw-medium); text-align: left;
}

/* 本周统计 */
.week-stats { display: flex; gap: var(--space-6); padding: var(--space-4); }
.week-item { display: flex; flex-direction: column; }
.week-val { font-size: var(--fs-3xl); font-weight: var(--fw-semibold); color: var(--primary); line-height: 1.2; }
.week-warn { color: var(--danger); }
.week-label { font-size: var(--fs-xs); color: var(--text-muted); }

@media (max-width: 600px) {
  .entry { padding: var(--space-3); }
  .entry-name { font-size: var(--fs-md); }
}
</style>
