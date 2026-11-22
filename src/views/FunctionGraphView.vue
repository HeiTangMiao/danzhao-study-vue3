<!--
  FunctionGraphView —— 函数图像计算器独立入口（/function-graph）

  职责：极薄包装页。面包屑 + 标题 + <FunctionPlayground />，不承载任何业务逻辑：
   - 不新增写入口：不碰学习计划 / 默写进度 / 错题本 / 任何 localStorage 键；
   - 暗色主题由 FunctionPlayground 自身读 document.documentElement.dataset.theme 联动；
   - 无 meta.tab：与 /guide、/plan、/dashboard 同款二级页（进入即隐藏底部 pill）。

  为什么单独成页而非塞进内容页：FunctionPlayground 依赖 jsxgraph（~1MB）与 expr-eval，
  独立路由 + 懒加载让这些依赖只在用户主动进入时下载，首页零 footprint。
-->
<template>
  <div class="function-graph">
    <nav class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="crumb-sep">/</span>
      <span>函数图像</span>
    </nav>

    <header class="fg-header">
      <h1 class="fg-title">函数图像</h1>
      <p class="fg-sub">输入解析式 · 实时绘制曲线 · 支持隐函数</p>
    </header>

    <FunctionPlayground />
  </div>
</template>

<script setup>
import FunctionPlayground from '@/components/FunctionPlayground.vue'
</script>

<style scoped>
.function-graph { display: flex; flex-direction: column; gap: var(--spacer-16); }
.breadcrumb { font-size: 0.85rem; color: var(--text-muted); }
.crumb-sep { margin: 0 6px; }
.fg-header { margin: 0; }
.fg-title { font-size: var(--fs-2xl); margin: 0; font-weight: var(--fw-semibold); }
.fg-sub { margin-top: var(--space-2); color: var(--text-muted); font-size: var(--fs-md); }
</style>
