<!--
  ReaderFooter —— 学习页 v4 玻璃页脚（52px，常驻，system_design §5.7.0 / §5.7.7）
  结构：[上一页] [标记已掌握（主行动）] [下一页]
  契约：
   - 主行动 = 全学习页唯一实心橙（橙色门禁）；已掌握态切换为描边样式（数据落点 §5.7.7：
     page_progress.masteredAt 毫秒时间戳，与「已完成」「复习掌握」三语义互不派生）
   - 底部 padding 让开系统手势区（Android home/quick-switch 应用不可申索，§5.7.5）
   - 玻璃走 --glass-* token，不加投影（与底部系统视觉打架）
-->
<template>
  <footer class="reader-footer">
    <button class="rf-nav" :disabled="!hasPrev" title="上一页" aria-label="上一页" @click="emit('prev')">
      <AppIcon v-if="iconsReady" name="chevron-left" :size="18" />
      <span>上页</span>
    </button>

    <button class="rf-master" :class="{ on: mastered }" @click="emit('toggle-master')">
      <AppIcon v-if="iconsReady" :name="mastered ? 'check' : 'target'" :size="16" />
      {{ mastered ? '已掌握' : '标记已掌握' }}
    </button>

    <button class="rf-nav" :disabled="!hasNext" title="下一页" aria-label="下一页" @click="emit('next')">
      <AppIcon v-if="iconsReady" name="chevron-right" :size="18" />
      <span>下页</span>
    </button>
  </footer>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  hasPrev: { type: Boolean, default: false },
  hasNext: { type: Boolean, default: false },
  // 页面手动已掌握（progress.isPageMastered 派生，§5.7.7 语义③）
  mastered: { type: Boolean, default: false }
})

const emit = defineEmits(['prev', 'next', 'toggle-master'])

// 首帧规避：玻璃 + 内联 SVG 不同帧首绘（§5.1 #322045）
const iconsReady = ref(false)
onMounted(async () => {
  await nextTick()
  iconsReady.value = true
})
</script>
