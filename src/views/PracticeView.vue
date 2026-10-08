<!--
  PracticeView —— 练习 Tab 壳（P6，prd-mobile §5 四层页面结构）
  职责：只做阶段机挂载与路由级离开保护；业务在四个子层组件：
   - PracticeHome    L1 练习首页（继续卡 / 三入口 / 本周统计）
   - PracticeConfig  L2 组卷配置
   - PracticeSession L3 做题会话（单题一屏，核心）
   - PracticeResult  L4 结算页
  阶段真相源在 practice store（phase），离开保护复用 ExamBlock 三层思路中的
  路由守卫 + beforeunload 两层（父级 examState 注入是 UnitView 页内翻页场景，
  本页无翻页，由 store 保留未完成会话代替）。
-->
<template>
  <div class="practice">
    <PracticeHome v-if="store.phase === 'home'" />
    <PracticeConfig v-else-if="store.phase === 'config'" />
    <PracticeSession v-else-if="store.phase === 'session'" />
    <PracticeResult v-else-if="store.phase === 'result'" />
  </div>
</template>

<script setup>
import { watch, onMounted, onBeforeUnmount } from 'vue'
import PracticeHome from '@/views/practice/PracticeHome.vue'
import PracticeConfig from '@/views/practice/PracticeConfig.vue'
import PracticeSession from '@/views/practice/PracticeSession.vue'
import PracticeResult from '@/views/practice/PracticeResult.vue'
import { usePracticeStore } from '@/stores/practice'

const store = usePracticeStore()

// ===== 离开保护（二层，复用 ExamBlock 思路）=====
// 有作答但未答完时：刷新/关闭前提醒 + 由 Session 层的路由守卫拦截切页
function onBeforeUnload(e) {
  const s = store.session
  if (store.phase === 'session' && s && store.answeredCount > 0 && store.answeredCount < s.questions.length) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// 预热题库索引（L1 继续卡 / 模拟冲刺清单需要；失败静默，入口点击时再兜底加载）
onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
  store.ensureIndex().catch((e) => console.warn('[practice] 题库索引预载失败:', e))
  store.refreshWeakAreas().catch((e) => console.warn('[practice] 薄弱点加载失败:', e))
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

// 回到首页时刷新薄弱点/统计（错题数可能因刚完成的会话而变化）
watch(
  () => store.phase,
  (p) => {
    if (p === 'home') store.refreshWeakAreas().catch(() => {})
  }
)
</script>

<style scoped>
.practice {
  display: flex;
  flex-direction: column;
  gap: var(--gap-block-tight);
}
</style>
