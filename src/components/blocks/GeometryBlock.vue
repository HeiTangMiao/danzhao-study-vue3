<!--
  GeometryBlock —— 几何演示区块（diagram）
  职责：
   - 接收 content-schema 的 diagram 区块（boardId + initCode）
   - 将 initCode 字符串编译为 JSXGraph 初始化回调，交给 JsxGraphBoard 渲染
   - 显示图注（caption）
  说明：initCode 为受信任的本地内容，使用 Function 构造器编译为 (board, colors, JXG) => void。
-->
<template>
  <section class="block diagram">
    <h3 v-if="block.title" class="block-title">{{ block.title }}</h3>
    <div class="diagram-box">
      <JsxGraphBoard :setup="setupFn" :boundingbox="boundingbox" :height="height" />
      <p v-if="block.caption" class="diagram-caption">{{ block.caption }}</p>
      <p v-if="!setupFn" class="diagram-error">⚠️ 图形初始化代码无效，无法渲染。</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import JsxGraphBoard from '@/components/JsxGraphBoard.vue'

const props = defineProps({
  // 区块数据：{ type:'diagram', boardId, caption, initCode, boundingbox?, height? }
  block: { type: Object, required: true }
})

// 将 initCode 字符串编译为 (board, colors, JXG) => void 的 setup 回调
const setupFn = computed(() => {
  const code = props.block.initCode
  if (!code) return null
  try {
    // 内容为受信任的本地数据
    // eslint-disable-next-line no-new-func
    return new Function('board', 'colors', 'JXG', code)
  } catch (e) {
    console.error('[GeometryBlock] initCode 编译失败:', e)
    return null
  }
})

// 画板边界框（可选，默认 [-6, 4, 6, -4]）
const boundingbox = computed(() => props.block.boundingbox || [-6, 4, 6, -4])
// 画板高度（可选，默认 320）
const height = computed(() => props.block.height || 320)
</script>

<style scoped>
.diagram-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacer-12);
  margin-bottom: var(--spacer-12);
}
.diagram-caption {
  margin-top: var(--spacer-8);
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.diagram-error {
  margin-top: var(--spacer-8);
  text-align: center;
  color: var(--danger);
  font-size: 0.85rem;
}
</style>
