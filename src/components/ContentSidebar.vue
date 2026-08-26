<!--
  ContentSidebar —— 内容页固定侧边栏（快捷导航 + 快捷操作）
  职责：
   - 快捷操作区（吸顶）：返回顶部 / 标记完成 / 书签 / 笔记 / 目录 / Desmos/展开收起
   - 快捷导航区（可滚动）：本页区块章节 / 同单元其他页面 / 前后单元切换
  props:
   - unit        当前单元配置（含 files 列表）
   - toc         本页目录（[{index,type,title}]）
   - fileIndex    当前页索引（同单元内）
   - subject     当前学科号
   - unitNum     当前单元号
   - site        学科配置（用于单元间导航）
   - isDone      是否已完成
   - isMath      是否数学学科（控制 Desmos 入口显隐）
  emits:
   - scroll-to   跳转到区块 ({index})
   - toggle-done 标记完成
   - toggle-bookmark 书签
   - toggle-notes 笔记
   - toggle-toc  目录面板
   - open-desmos 打开 Desmos 演练场
-->
<template>
  <aside class="content-sidebar" :class="{ collapsed, 'math': isMath }">
    <!-- 展开/收起开关（常驻右下/右上浮动） -->
    <button class="sidebar-toggle" :class="{ active: !collapsed }" :title="collapsed ? '展开侧边栏' : '收起侧边栏'" @click="collapsed = !collapsed">
      {{ collapsed ? '◀' : '▶' }}
    </button>

    <div v-if="!collapsed" class="sidebar-inner" @scroll="updateScroll">
      <!-- ===== 快捷操作区（吸顶） ===== -->
      <div class="sb-quick">
        <div class="sb-title">⚡ 快捷操作</div>
        <div class="sb-actions">
          <button class="sb-act" title="返回顶部" @click="emit('scroll-top')">⬆ <span>顶部</span></button>
          <button class="sb-act" :class="{ on: isDone }" title="标记完成" @click="emit('toggle-done')">
            {{ isDone ? '✅' : '○' }} <span>完成</span>
          </button>
          <button class="sb-act" title="本页目录" @click="emit('toggle-toc')">☰ <span>目录</span></button>
          <button class="sb-act" title="收藏本页" @click="emit('toggle-bookmark')">★ <span>收藏</span></button>
          <button class="sb-act" title="笔记" @click="emit('toggle-notes')">📝 <span>笔记</span></button>
          <button v-if="isMath" class="sb-act sb-desmos" title="Desmos 图形计算器演练场" @click="emit('open-desmos')">
            🧮 <span>Desmos</span>
          </button>
        </div>
      </div>

      <!-- ===== 快捷导航区：本页章节 ===== -->
      <nav v-if="toc.length" class="sb-nav">
        <div class="sb-title">📑 本页章节</div>
        <ul>
          <li v-for="(item, i) in toc" :key="i">
            <button class="sb-item" @click="emit('scroll-to', item.index)">
              <span class="sb-icon">{{ item.icon }}</span>
              <span class="sb-text">{{ item.title }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- ===== 快捷导航区：同单元页面 ===== -->
      <nav v-if="unit" class="sb-nav">
        <div class="sb-title">📚 本单元内容</div>
        <ul>
          <li v-for="(f, i) in unit.files" :key="i">
            <button class="sb-item" :class="{ active: i === fileIndex }" @click="emit('go-file', i)">
              <span class="sb-index">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="sb-text">{{ f.title }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- ===== 快捷导航区：单元切换 ===== -->
      <nav v-if="site" class="sb-nav">
        <div class="sb-title">🔄 单元导航</div>
        <div class="sb-unit-goto">
          <button class="sb-unit-btn" :disabled="!prevUnit" :title="prevUnit ? '上一单元：' + prevUnit.title : '已是第一单元'" @click="emit('go-unit', prevUnit)">
            ← {{ prevUnit ? prevUnit.title.slice(0, 4) : '—' }}
          </button>
          <button class="sb-unit-btn" :disabled="!nextUnit" :title="nextUnit ? '下一单元：' + nextUnit.title : '已是最后一单元'" @click="emit('go-unit', nextUnit)">
            {{ nextUnit ? nextUnit.title.slice(0, 4) : '—' }} →
          </button>
        </div>
      </nav>
    </div>

    <!-- 收起态：迷你图标徽标 -->
    <div v-else class="sidebar-mini">
      <button class="mini-item" title="顶部" @click="emit('scroll-top')">⬆</button>
      <button class="mini-item" :class="{ on: isDone }" title="完成" @click="emit('toggle-done')">{{ isDone ? '✅' : '○' }}</button>
      <button class="mini-item" title="目录" @click="emit('toggle-toc')">☰</button>
      <button class="mini-item" title="收藏" @click="emit('toggle-bookmark')">★</button>
      <button class="mini-item" title="笔记" @click="emit('toggle-notes')">📝</button>
      <button v-if="isMath" class="mini-item" title="Desmos 演练场" @click="emit('open-desmos')">🧮</button>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  unit: { type: Object, default: null },
  toc: { type: Array, default: () => [] },
  fileIndex: { type: Number, default: 0 },
  subject: { type: String, default: 'math' },
  unitNum: { type: String, default: '' },
  site: { type: Object, default: null },
  isDone: { type: Boolean, default: false },
  isMath: { type: Boolean, default: false }
})

const emit = defineEmits([
  'scroll-to', 'scroll-top', 'toggle-done',
  'toggle-bookmark', 'toggle-notes', 'toggle-toc',
  'open-desmos', 'go-file', 'go-unit'
])

// 收起/展开状态（持久化）
const collapsed = ref(localStorage.getItem('sidebar_collapsed') === '1')
watch(collapsed, (v) => localStorage.setItem('sidebar_collapsed', v ? '1' : '0'))

// 前后单元
const unitIdx = computed(() => {
  if (!props.site) return -1
  return props.site.units.findIndex((u) => u.num === props.unitNum)
})
const prevUnit = computed(() => unitIdx.value > 0 ? props.site.units[unitIdx.value - 1] : null)
const nextUnit = computed(() => unitIdx.value >= 0 && unitIdx.value < props.site.units.length - 1 ? props.site.units[unitIdx.value + 1] : null)
</script>

<style scoped>
.content-sidebar {
  position: fixed;
  top: 64px;
  right: 12px;
  bottom: 12px;
  z-index: 90;
  width: 236px;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, width 0.25s ease;
}
.content-sidebar.collapsed {
  width: 0;
}
.sidebar-toggle {
  position: absolute;
  top: 12px;
  left: -34px;
  width: 26px;
  height: 34px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-right: none;
  border-radius: 10px 0 0 10px;
  box-shadow: var(--shadow-sm);
  color: var(--text-muted);
  font-size: 0.8rem;
  display: flex; align-items: center; justify-content: center;
  z-index: 95;
}
.sidebar-toggle:hover { color: var(--primary); }
.sidebar-inner {
  flex: 1;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 12px;
  scrollbar-width: thin;
}
.sb-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  margin: 10px 4px 6px;
  letter-spacing: 0.3px;
}
.sb-quick:first-child .sb-title { margin-top: 0; }
.sb-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.sb-act {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 7px 4px;
  font-size: 0.78rem;
  color: var(--text);
  transition: all 0.15s;
}
.sb-act:hover { border-color: var(--primary); color: var(--primary); }
.sb-act.on { background: rgba(47, 158, 68, 0.12); border-color: var(--success); color: var(--success); }
.sb-desmos { background: rgba(226, 128, 52, 0.14); border-color: var(--accent); color: var(--accent); }

.sb-nav { border-top: 1px dashed var(--border); }
.sb-nav ul { list-style: none; }
.sb-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  text-align: left;
  color: var(--text);
  transition: background 0.15s;
}
.sb-item:hover { background: var(--primary-soft); color: var(--primary); }
.sb-item.active { background: var(--primary-soft); color: var(--primary); font-weight: 600; }
.sb-icon { flex: 0 0 auto; }
.sb-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sb-index {
  flex: 0 0 auto;
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--surface-muted);
  border-radius: 6px;
  padding: 0 5px;
}
.sb-unit-goto { display: flex; gap: 6px; }
.sb-unit-btn {
  flex: 1;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 7px 4px;
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.sb-unit-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.sb-unit-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* 收起态迷你图标 */
.sidebar-mini {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 8px 4px;
  width: 44px;
}
.mini-item {
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 1rem;
}
.mini-item:hover { border-color: var(--primary); }
.mini-item.on { color: var(--success); }

/* 响应式：窄屏隐藏（通过视图层决定是否渲染） */
@media (max-width: 1150px) {
  .content-sidebar { display: none; }
}
</style>