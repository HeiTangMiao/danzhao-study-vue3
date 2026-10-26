<!--
  ReciteView —— 每日背诵首页（T04；设计 §5 T04「页面要点」/ §4.1 时序图 ①）

  只做一件事：读 store 的 `viewModel` 并渲染，**不自己算任何东西**（§7.5「状态归属」）。
  进度分母来自产物 `counts.lesson`（不硬编码 67）；比率一律 `total > 0 ? x / total : 0`（I10 ②）。

  三态互斥（§7.4）：
   - loading：素材加载中（`await loadBundled()` 是首屏唯一的阻塞点）
   - error  ：加载失败 → **独立态 + 重试按钮**，不白屏、不静默显示空队列
   - ready  ：进度条 / 连续天数 / 今日新篇 / 今日待重默 / 底部常驻大冲关

  ⚠️ 今日待重默分区在**无到期篇时整块不渲染**（不留空白卡）。
  ⚠️ 复习篇列表项必须显示 `fileTitle`（5 篇综合自测的 `title` 完全相同，显示 title 会 5 行一模一样，
     见 §3.4 末尾的坑）。lesson 篇则显示 `title`（篇名才有信息量），`fileTitle` 作为出处副行。
-->
<template>
  <div class="rc">
    <header class="rc-head">
      <h1 class="rc-head__title">每日背诵</h1>
      <p class="rc-head__sub">逐句默写 · 按档位滚动复习</p>
    </header>

    <!-- 加载中（首屏唯一阻塞态） -->
    <div v-if="isLoading" class="rc-loading">素材加载中…</div>

    <!-- 失败：独立态 + 重试（绝不白屏、绝不静默空队列） -->
    <section v-else-if="isError" class="card rc-error">
      <div class="rc-error__icon"><AppIcon name="triangle-alert" :size="26" /></div>
      <h2 class="rc-error__title">背诵素材加载失败</h2>
      <p class="rc-error__msg">{{ loadError || '请检查网络后重试' }}</p>
      <button class="rc-btn rc-btn--primary" :disabled="retrying" @click="retry">
        <AppIcon name="refresh-cw" :size="16" />
        <span>{{ retrying ? '正在重试…' : '重试' }}</span>
      </button>
    </section>

    <template v-else>
      <!-- 进度 + 连续天数 -->
      <section class="card rc-stats">
        <div class="rc-stats__top">
          <span class="rc-stats__label">已背</span>
          <span class="rc-stats__value">
            {{ vm.learned }}<span class="rc-stats__den"> / {{ vm.totalLesson }}</span>
          </span>
        </div>
        <div class="rc-bar" role="progressbar" :aria-valuenow="vm.progressPct" aria-valuemin="0" aria-valuemax="100">
          <div class="rc-bar__fill" :style="{ width: vm.progressPct + '%' }"></div>
        </div>
        <div class="rc-stats__meta">
          <span class="rc-stats__streak">连续 <strong>{{ vm.streak }}</strong> 天</span>
          <span v-if="vm.dueRemaining > 0" class="rc-stats__more">另有 {{ vm.dueRemaining }} 篇排后面</span>
        </div>
      </section>

      <!-- 今日新篇（每日 1 篇；到期 ≥3 篇时被抑制） -->
      <section class="rc-block">
        <h2 class="rc-block__title">今日新篇</h2>
        <router-link v-if="vm.fresh" class="card rc-piece" :to="pieceLink(vm.fresh)">
          <span class="rc-piece__body">
            <span class="rc-piece__title">{{ vm.fresh.title }}</span>
            <span class="rc-piece__src">{{ vm.fresh.fileTitle }}</span>
          </span>
          <span class="rc-piece__tags">
            <span class="rc-tag rc-tag--new">新篇</span>
            <span class="rc-tag">{{ vm.fresh.blankCount }} 空</span>
          </span>
          <span class="rc-piece__go" aria-hidden="true"><AppIcon name="chevron-right" :size="16" /></span>
        </router-link>
        <p v-else class="rc-empty">{{ emptyNewText }}</p>
      </section>

      <!-- 今日待重默：无到期时**整块不渲染**（不留空白卡） -->
      <section v-if="vm.due.length" class="rc-block">
        <h2 class="rc-block__title">
          今日待重默
          <span class="rc-block__count">{{ vm.due.length }}</span>
        </h2>
        <ul class="rc-due">
          <li v-for="item in vm.due" :key="item.piece.key" class="rc-due__item">
            <router-link class="card rc-piece" :to="pieceLink(item.piece)">
              <span class="rc-piece__body">
                <span class="rc-piece__title">{{ primaryLabel(item.piece) }}</span>
                <span class="rc-piece__src">{{ secondaryLabel(item.piece) }}</span>
              </span>
              <span class="rc-piece__tags">
                <span class="rc-tag rc-tag--due">{{ attemptLabel(item.row) }}</span>
              </span>
              <span class="rc-piece__go" aria-hidden="true"><AppIcon name="chevron-right" :size="16" /></span>
            </router-link>
          </li>
        </ul>
      </section>

      <!-- 底部常驻：综合大冲关（模拟考场；`?manual=1` → 不写任何进度，I6） -->
      <div class="rc-challenge">
        <router-link v-if="vm.challenge" class="rc-btn rc-btn--primary rc-btn--block" :to="challengeLink">
          <AppIcon name="siren" :size="16" />
          <span>综合大冲关（{{ vm.challenge.sentenceCount }} 句 · 模拟考场）</span>
        </router-link>
        <p class="rc-challenge__hint">模拟考场不计入进度，随时可退出</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { RECITE_HOME_PATH, RECITE_MANUAL_QUERY, RECITE_PHASE, useReciteStore } from '@/stores/recite'

const store = useReciteStore()
const retrying = ref(false)

/** 视图状态来源**只有一个**（T05 的卡片也必须读同一个 getter，否则两个入口计数会不一致） */
const vm = computed(() => store.viewModel)

const isLoading = computed(() => store.phase === RECITE_PHASE.LOADING)
const isError = computed(() => store.phase === RECITE_PHASE.ERROR)
const loadError = computed(() => store.loadError)

/**
 * 「今日无新篇」的两种成因文案（区分开，否则学员会以为功能坏了）：
 *  - 到期太多被抑制 → 明确说清「先补重默」；
 *  - 所有 lesson 篇都背过一轮 → 说「新篇都背完了」。
 */
const emptyNewText = computed(() => {
  if (vm.value.suppressedNew) return '今日到期重默较多，先补重默，不再加新篇'
  return '今日无新篇'
})

/**
 * 单篇作答页地址（坐标来自产物条目 —— 与运行时 `loadPage + cloze 流水号` 同一条规则）。
 * @param {object} piece 篇目
 * @returns {string} hash 路由路径
 */
function pieceLink(piece) {
  if (!piece) return RECITE_HOME_PATH
  return `${RECITE_HOME_PATH}/${piece.unitNum}/${piece.fileIndex}/${piece.blockIndex}`
}

/** 大冲关入口：带 `?manual=1` → `submitResult(..., manual: true)` → 不写行（I6/P0-9） */
const challengeLink = computed(() => {
  const piece = vm.value.challenge
  if (!piece) return RECITE_HOME_PATH
  return `${pieceLink(piece)}?${RECITE_MANUAL_QUERY}=1`
})

/**
 * 复习篇必须显示 `fileTitle`（§3.4 的坑：5 篇综合自测的 title 完全相同）。
 * lesson 篇显示 `title`（篇名才是信息），`fileTitle` 沉到副行做出处。
 * @param {object} piece 篇目
 * @returns {string} 主行文案
 */
function primaryLabel(piece) {
  if (!piece) return ''
  return piece.role === 'review' ? piece.fileTitle || piece.title : piece.title
}

/**
 * 副行文案（与 `primaryLabel` 互补：主行用过的字段不再重复）。
 * @param {object} piece 篇目
 * @returns {string} 副行文案
 */
function secondaryLabel(piece) {
  if (!piece) return ''
  const blanks = `${piece.blankCount} 空`
  if (piece.role === 'review') {
    return `${piece.unitTitle || piece.fileTitle} · ${blanks}`
  }
  return `${piece.fileTitle} · ${blanks}`
}

/**
 * 状态角标（T04 只要求「第 N 次」语义；不做任何日期算术 —— §7.5 禁止在 `.vue` 里算日子）。
 * `stage` = 已连续全对的档位数，所以「第 N 次」= `stage + 1`。
 * @param {object} row `recite_progress` 行
 * @returns {string}
 */
function attemptLabel(row) {
  const stage = row && Number.isInteger(row.stage) ? row.stage : 0
  return stage >= 1 ? `第 ${stage + 1} 次` : '重默'
}

/** 失败态重试：走 `store.reload()`（清内存缓存 → 重读包内副本 → 重读库） */
async function retry() {
  retrying.value = true
  try {
    await store.reload()
  } catch (e) {
    console.error('[ReciteView] 重试失败:', e)
  } finally {
    retrying.value = false
  }
}

onMounted(() => {
  // 幂等：并发/重复进入不会重复读盘（store 内部共享同一个 inFlight Promise）
  store.init().catch((e) => console.error('[ReciteView] 初始化失败:', e))
})
</script>

<style scoped>
.rc {
  max-width: 68ch;
  margin: 0 auto;
  /* 底部给常驻大冲关条留位（含安全区） */
  padding: var(--space-5) var(--space-4) calc(104px + var(--sab));
}

.rc-head { margin-bottom: var(--space-4); }
.rc-head__title { margin: 0; font-size: var(--fs-2xl); font-weight: 700; color: var(--text); }
.rc-head__sub { margin: var(--space-1) 0 0; font-size: var(--fs-sm); color: var(--text-muted); }

.rc-loading { padding: var(--space-8) 0; text-align: center; color: var(--text-muted); font-size: var(--fs-base); }

/* ===== 失败态 ===== */
.rc-error { padding: var(--space-5); text-align: center; }
.rc-error__icon { color: var(--danger); }
.rc-error__title { margin: var(--space-2) 0 0; font-size: var(--fs-xl); color: var(--text); }
.rc-error__msg { margin: var(--space-2) 0 var(--space-4); font-size: var(--fs-base); color: var(--text-muted); }

/* ===== 进度 ===== */
.rc-stats { padding: var(--space-4); margin-bottom: var(--space-5); }
.rc-stats__top { display: flex; align-items: baseline; gap: var(--space-2); margin-bottom: var(--space-2); }
.rc-stats__label { font-size: var(--fs-md); color: var(--text-muted); }
.rc-stats__value { font-size: var(--fs-3xl); font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.rc-stats__den { font-size: var(--fs-lg); font-weight: 500; color: var(--text-muted); }

.rc-bar {
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--surface-muted);
  overflow: hidden;
}
.rc-bar__fill {
  height: 100%;
  background: var(--primary);
  border-radius: var(--radius-full);
  transition: width 240ms ease;
}
.rc-stats__meta {
  display: flex; flex-wrap: wrap; gap: var(--space-3);
  margin-top: var(--space-3);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.rc-stats__streak strong { color: var(--primary); font-variant-numeric: tabular-nums; }

/* ===== 分区 ===== */
.rc-block { margin-bottom: var(--space-5); }
.rc-block__title {
  display: flex; align-items: center; gap: var(--space-2);
  margin: 0 0 var(--space-2);
  font-size: var(--fs-lg); font-weight: 600; color: var(--text);
}
.rc-block__count {
  min-width: 20px; padding: 0 6px;
  border-radius: var(--radius-full);
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: var(--fs-xs); font-weight: 600; text-align: center;
  font-variant-numeric: tabular-nums;
}

.rc-due { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--space-2); }

/* 篇目行：整行可点，触控高度 ≥44px（A10 / F2） */
.rc-piece {
  display: flex; align-items: center; gap: var(--space-3);
  min-height: 56px;
  padding: var(--space-3) var(--space-4);
  text-decoration: none;
  color: inherit;
}
.rc-piece__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }
.rc-piece__title {
  font-size: var(--fs-base); font-weight: 600; color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rc-piece__src {
  font-size: var(--fs-sm); color: var(--text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rc-piece__tags { display: flex; align-items: center; gap: var(--space-1); flex: 0 0 auto; }
.rc-piece__go { color: var(--text-muted); flex: 0 0 auto; }

.rc-tag {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: var(--fs-xs); font-weight: 600;
  white-space: nowrap;
}
.rc-tag--new { background: var(--primary); color: #fff; }
.rc-tag--due { background: transparent; border: 1px solid var(--border); color: var(--text-muted); }

.rc-empty {
  margin: 0; padding: var(--space-4);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  font-size: var(--fs-base); color: var(--text-muted); text-align: center;
}

/* ===== 按钮（触控 ≥44px） ===== */
.rc-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  min-height: 48px; padding: 0 var(--space-5);
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: var(--fs-base); font-weight: 600;
  text-decoration: none;
}
.rc-btn--primary { background: var(--primary); border-color: var(--primary); color: #fff; }
.rc-btn--block { width: 100%; }
.rc-btn:disabled { opacity: 0.5; }

/* ===== 底部常驻大冲关（本页无 meta.tab → 移动 pill 不渲染，故贴底即可） ===== */
.rc-challenge {
  position: fixed;
  left: 0; right: 0;
  bottom: 0;
  z-index: 6;
  max-width: 68ch;
  margin: 0 auto;
  padding: var(--space-2) var(--space-4) calc(var(--space-3) + var(--sab));
  background: linear-gradient(to top, var(--bg) 78%, transparent);
}
.rc-challenge__hint {
  margin: var(--space-1) 0 0;
  font-size: var(--fs-xs);
  color: var(--text-muted);
  text-align: center;
}
</style>
