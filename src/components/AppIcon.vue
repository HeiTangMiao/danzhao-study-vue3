<!--
  AppIcon —— 统一的 SVG 图标渲染组件（Lucide 风格线性图标）
  职责：
   - 以**声明式** <svg> 渲染本地 Lucide 几何数据（见 ./icons/lucide-paths.js）
   - 通过 currentColor 继承文字颜色，随激活/禁用态自动变色
  props:
   - name        Lucide 官方图标名（未知名渲染为空 <svg> 并在开发环境告警，不抛错）
   - size        边长（px），数字或字符串，默认 20
   - strokeWidth 线宽，默认 2（与 Lucide 默认一致；UI 里常用 1.8 更轻盈）
  ⚠️ 为什么不用 v-html / innerHTML 注入 SVG 字符串：
     本项目 CSP 为 script-src 'self'，且全站离线；「字符串 → DOM」是不洁模式，
     将来启用 Trusted Types 会直接失效。此处所有形状均由模板静态声明，
     编译期即确定标签树，无任何运行时字符串注入 —— CSP 与 Trusted Types 双安全。
-->
<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-for="(s, i) in shapes" :key="i">
      <path v-if="s.t === 'path'" :d="s.d" />
      <circle v-else-if="s.t === 'circle'" :cx="s.cx" :cy="s.cy" :r="s.r" />
      <line v-else-if="s.t === 'line'" :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2" />
      <rect
        v-else-if="s.t === 'rect'"
        :x="s.x"
        :y="s.y"
        :width="s.width"
        :height="s.height"
        :rx="s.rx"
        :ry="s.ry"
      />
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { ICON_SHAPES } from './icons/lucide-paths.js'

const props = defineProps({
  // Lucide 官方图标名；见 icons/lucide-paths.js 的 ICON_SHAPES 键
  name: { type: String, required: true },
  // 边长（px）。数字直接作为属性值；也可传 CSS 尺寸字符串
  size: { type: [Number, String], default: 20 },
  // 线宽；与 Lucide 默认 2 一致
  strokeWidth: { type: [Number, String], default: 2 }
})

/**
 * 归一化形状：字符串 → { t:'path', d }，对象原样使用。
 * 未知图标名返回空数组（渲染为空 <svg>），并在开发环境提示，避免静默丢失图标。
 */
const shapes = computed(() => {
  const raw = ICON_SHAPES[props.name]
  if (!raw || raw.length === 0) {
    if (import.meta.env.DEV) console.warn(`[AppIcon] 未知图标名：${props.name}`)
    return []
  }
  return raw.map((s) => (typeof s === 'string' ? { t: 'path', d: s } : s))
})
</script>

<style scoped>
.app-icon {
  flex: 0 0 auto;
  /* 与相邻文字基线对齐（图标多为行内道具） */
  vertical-align: -0.125em;
}
</style>
