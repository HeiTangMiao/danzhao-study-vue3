<!--
  GuideView —— 志愿填报（流程说明 + 官方入口），独立顶层页 /guide（批 F · F-1 / Fc6）
  - 归属：P-F03=(b) 独立顶层页；无 meta.tab → 与 /plan、/dashboard 同款（进二级页隐藏底部 pill）。
  - 渲染：**复用** BlockRenderer 渲染页面数据里的既有区块，不新写渲染器；
          官方入口行是视图级元素（既有区块类型无法表达「点击外链」的交互语义）。
  - 外链：URL 来自页面数据文件，经 openExternal 交系统浏览器打开（不硬编码 URL）。
  - 文案：骨架占位，正式流程文案等待内容侧（roadmap §3 :308）。
-->
<template>
  <div class="guide">
    <nav class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="crumb-sep">/</span>
      <span>志愿填报</span>
    </nav>

    <header class="guide-header">
      <h1 class="guide-title">志愿填报</h1>
      <p class="guide-sub">流程说明 · 办理步骤 · 材料清单 · 官方入口</p>
    </header>

    <!-- 官方入口行：点击交系统浏览器打开官方入口（URL 取自页面数据文件） -->
    <section class="card guide-entry">
      <button class="guide-entry__btn" type="button" @click="openEntry">
        <AppIcon name="arrow-up" :size="18" />
        <span>{{ entry.label }}</span>
      </button>
      <p class="guide-entry__note">{{ entry.note }}</p>
    </section>

    <!-- 骨架区块：复用 BlockRenderer（单区块分发 + 容器递归） -->
    <BlockRenderer v-for="(b, i) in blocks" :key="i" :block="b" />
  </div>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'
import BlockRenderer from '@/components/BlockRenderer.vue'
import { openExternal } from '@/utils/openExternal'
// 页面数据：纯数据 ESM（零 import），独立顶层页，不经 site.js 注册
import guidePage from '@/content/guide/01-志愿填报'

// 区块与官方入口均来自数据文件（数据驱动渲染；本视图不硬编码业务内容）
const blocks = guidePage.blocks
const entry = guidePage.entry

/** 打开官方入口：经统一外链工具（Tauri → 系统浏览器 / 其余 → window.open） */
function openEntry() {
  openExternal(entry.url)
}
</script>

<style scoped>
.guide { display: flex; flex-direction: column; gap: var(--spacer-16); }
.breadcrumb { font-size: 0.85rem; color: var(--text-muted); }
.crumb-sep { margin: 0 6px; }
.guide-header { margin: 0; }
.guide-title { font-size: var(--fs-2xl); margin: 0; font-weight: var(--fw-semibold); }
.guide-sub { margin-top: var(--space-2); color: var(--text-muted); font-size: var(--fs-md); }

.card { padding: var(--spacer-16); border-radius: var(--radius, 12px); background: var(--surface); border: 1px solid var(--border); }

/* 官方入口行 */
.guide-entry { display: flex; flex-direction: column; gap: var(--space-3); }
.guide-entry__btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  min-height: 48px; padding: 0 var(--spacer-20);
  background: var(--primary); color: #fff;
  border: none; border-radius: var(--radius-full);
  font-weight: var(--fw-semibold); font-size: var(--fs-base);
  cursor: pointer;
}
.guide-entry__btn:active { transform: scale(0.98); }
.guide-entry__note { margin: 0; color: var(--text-muted); font-size: var(--fs-sm); line-height: var(--lh-snug); }
</style>
