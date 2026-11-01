<script setup>
/**
 * 全部篇目（回看入口）
 *
 * ★ 为什么需要这一页：`/recite` 首页只有「今日新篇 + 今日待重默」两个队列，
 *   一篇背过之后排期被推到未来（1/2/4/7/15 天），**就从队列里消失了** ——
 *   学员想回头再看一遍时无路可走。这一页按产物顺序列出全部篇目，本身不改任何调度。
 *
 * ★ 为什么点进去带 `?manual=1`（回看模式，不写进度）：
 *   回看是"我想再看一遍"，不是"我今天完成了一次背诵"。若回看也走自评，
 *   就会把 stage 往前推、把下次复习时间推远，等于**用回看偷走了真正的复习**。
 *   进度只由首页队列里的正式自评推进；这里一律只读。
 *
 * ★ 状态徽标的判据全部来自 store 派生（`rowMap` / `today` / `isDue`），
 *   本页不做日期运算、不自行统计（与 ReciteTaskCard 同一纪律）。
 */
import { computed, onMounted } from 'vue'
import { RECITE_HOME_PATH, useReciteStore } from '@/stores/recite'
import { isDue } from '@/composables/useReciteSchedule'

const store = useReciteStore()

onMounted(() => {
  store.init()
})

/** 一篇的状态徽标：今日待复习 > 还需练习 > 已能背诵 > 未开始 */
function badgeOf(row, today) {
  if (!row) return { tag: '未开始', cls: 'ra-tag--new' }
  const stage = Number.isInteger(row.stage) ? row.stage : 0
  if (isDue(row, today)) return { tag: '今日待复习', cls: 'ra-tag--due' }
  if (stage >= 1) return { tag: `已背 ${stage} 次`, cls: 'ra-tag--done' }
  return { tag: '还需练习', cls: 'ra-tag--again' }
}

const list = computed(() => {
  const rowMap = store.rowMap
  const today = store.today
  return store.pieces.map((piece) => {
    const row = rowMap.get(piece.key)
    const chars = Array.isArray(piece.paragraphs) ? piece.paragraphs.join('').length : 0
    return {
      key: piece.key,
      title: piece.title,
      chars,
      ...badgeOf(row, today),
      link: {
        path: `/recite/${piece.unitNum}/${piece.fileIndex}/${piece.blockIndex}`,
        query: { manual: '1' }
      }
    }
  })
})

/** 已背过的篇数（有进度行且 stage >= 1），给头部一个"我背到哪了"的参照 */
const learnedCount = computed(() => {
  const rowMap = store.rowMap
  let n = 0
  for (const p of store.pieces) {
    const row = rowMap.get(p.key)
    if (row && Number.isInteger(row.stage) && row.stage >= 1) n += 1
  }
  return n
})
</script>

<template>
  <div class="ra">
    <header class="ra-head">
      <router-link class="ra-back" :to="RECITE_HOME_PATH">← 背诵首页</router-link>
      <h1 class="ra-head__title">全部篇目</h1>
      <p class="ra-head__sub">
        共 {{ list.length }} 篇<template v-if="learnedCount > 0">，已背 {{ learnedCount }} 篇</template>
        · 点开可回看，不计入进度
      </p>
    </header>

    <div v-if="store.phase === 'loading' && !list.length" class="ra-loading">素材加载中…</div>

    <ul v-else class="ra-list">
      <li v-for="(item, i) in list" :key="item.key">
        <router-link class="ra-item card" :to="item.link">
          <span class="ra-item__idx">{{ i + 1 }}</span>
          <span class="ra-item__body">
            <span class="ra-item__title">{{ item.title }}</span>
            <span class="ra-item__meta">{{ item.chars }} 字</span>
          </span>
          <span class="ra-item__tag" :class="item.cls">{{ item.tag }}</span>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ra {
  padding: 12px 14px 40px;
}

.ra-head {
  margin-bottom: 14px;
}

.ra-back {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  text-decoration: none;
}

.ra-head__title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
}

.ra-head__sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.ra-loading {
  padding: 24px 0;
  text-align: center;
  color: var(--text-secondary, #666);
}

.ra-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ra-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  text-decoration: none;
  color: inherit;
}

.ra-item__idx {
  flex: 0 0 22px;
  font-size: 12px;
  color: var(--text-tertiary, #9a9a9a);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ra-item__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ra-item__title {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ra-item__meta {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.ra-item__tag {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  white-space: nowrap;
}

.ra-tag--new {
  background: var(--chip-bg, #f0f0f0);
  color: var(--text-secondary, #666);
}

.ra-tag--done {
  background: var(--success-bg, #e8f5e9);
  color: var(--success-fg, #2e7d32);
}

.ra-tag--again {
  background: var(--warn-bg, #fff3e0);
  color: var(--warn-fg, #e65100);
}

.ra-tag--due {
  background: var(--accent-bg, #e3f2fd);
  color: var(--accent-fg, #1565c0);
}
</style>
