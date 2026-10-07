<!--
  ReaderTopbar —— 学习页 v4 玻璃页眉（44px，常驻，system_design §5.6.1 / §5.7.0）
  结构：[返回] [单元标题 + 页码] [右侧图标插槽] + 底边 2px 分段进度
  契约：
   - 返回按钮是「唯一可靠返回通道」（R2 / §5.7.2），不依赖边缘手势
   - 进度承载按双端策略（§5.6.3）：这里只放「2px 分段刻度 + 页码数字」（单元内第几页），
     页内滚动进度桌面端由 UnitView 的 .reading-progress 承担、移动端不渲染
   - 玻璃走 main.css 的 --glass-* token（单一取值来源），页眉用 .glass--flat 语义不加投影
   - ⚠️ 常驻页眉 = 首帧「玻璃 + 内联 SVG」同帧首绘（§5.1 #322045 陷阱）→ 图标延后一帧挂载
-->
<template>
  <header class="reader-topbar">
    <button class="rt-back" title="返回" aria-label="返回" @click="emit('back')">
      <AppIcon v-if="iconsReady" name="chevron-left" :size="20" />
    </button>

    <div class="rt-title">
      <!-- 标题/页码文本 120ms 淡入淡出（玻璃层上唯一允许的过渡，§5.7.4 规则 2） -->
      <Transition name="rt-fade" mode="out-in">
        <span :key="unitTitle" class="rt-unit">{{ unitTitle }}</span>
      </Transition>
      <Transition name="rt-fade" mode="out-in">
        <span :key="fileIndex" class="rt-page">{{ pageLabel }}</span>
      </Transition>
    </div>

    <div class="rt-actions">
      <!-- 收藏 / 笔记 / 目录（答题卡抽屉）：移动端唯一入口（v4 收敛，桌面由 ContentSidebar 承担） -->
      <button class="rt-act" :class="{ on: bookmarked }" title="收藏本页" aria-label="收藏本页" @click="emit('bookmark')">
        <AppIcon v-if="iconsReady" name="star" :size="18" :stroke-width="1.8" />
      </button>
      <button class="rt-act" :class="{ on: notesOpen }" title="笔记" aria-label="笔记" @click="emit('notes')">
        <AppIcon v-if="iconsReady" name="square-pen" :size="18" />
      </button>
      <button class="rt-act" title="答题卡与目录" aria-label="答题卡与目录" @click="emit('toc')">
        <AppIcon v-if="iconsReady" name="menu" :size="18" />
      </button>
    </div>

    <!-- 2px 分段进度：段数自适应 segs = min(n, 12)（§5.7.0 第 2 条） -->
    <div class="rt-segs" aria-hidden="true">
      <i v-for="s in segCount" :key="s" :class="{ done: s < curSeg, cur: s === curSeg }"></i>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  // 单元标题（页眉中段主文本）
  unitTitle: { type: String, default: '' },
  // 当前页下标（0 基）
  fileIndex: { type: Number, default: 0 },
  // 单元总页数
  total: { type: Number, default: 0 },
  // 页脚/顶栏入口的联动态（高亮当前开启的面板）
  bookmarked: { type: Boolean, default: false },
  notesOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['back', 'bookmark', 'notes', 'toc'])

// 首帧规避：玻璃容器先绘，下一帧再挂内联 SVG（WebKit bug #322045，§5.6.1 v4 失效项的补救）
const iconsReady = ref(false)
onMounted(async () => {
  await nextTick()
  iconsReady.value = true
})

/** 分段数：segs = min(n, 12)；超过 12 页时每段代表 ceil(n/12) 页（§5.7.0 第 2 条） */
const segCount = computed(() => Math.max(1, Math.min(props.total || 0, 12)))
const pagesPerSeg = computed(() => Math.ceil((props.total || 0) / segCount.value))
/** 当前页所在段（1 基）；之前的段=done（primary 40%），当前段=cur（primary），之后=line */
const curSeg = computed(() => {
  if (!props.total) return 0
  return Math.min(segCount.value, Math.floor(props.fileIndex / pagesPerSeg.value) + 1)
})

const pageLabel = computed(() =>
  props.total ? `${props.fileIndex + 1} / ${props.total}` : ''
)
</script>
