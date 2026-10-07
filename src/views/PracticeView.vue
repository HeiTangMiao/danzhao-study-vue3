<!--
  PracticeView —— 练习 Tab 落点（占位）
  职责（P1）：保证一级导航「练习」Tab 可达；真正的聚合层（模式选择 / 组卷 / 做题会话 / 结算）
             由 P6 实施（见 docs/system_design.md §10 P6、docs/prd-mobile.md §5）。
  说明：此处仅提供占位骨架，避免路由 404 与空屏；不含任何业务逻辑。
-->
<template>
  <div class="practice">
    <header class="practice-header">
      <h1>练习</h1>
      <p class="practice-sub">单元练习 · 薄弱专项 · 模拟冲刺</p>
    </header>

    <section class="card practice-empty">
      <p class="practice-empty__title">练习聚合层正在建设中</p>
      <p class="practice-empty__desc">届时可在此选择做题模式、组卷并进入做题会话与结算。</p>
    </section>
  </div>
</template>

<script setup>
// 占位页：无逻辑。P6 引入练习会话 store 与题源索引后替换本组件。
</script>

<style scoped>
.practice {
  display: flex;
  flex-direction: column;
  gap: var(--gap-block);
}
.practice-header h1 {
  font-size: var(--fs-2xl);
  margin: 0;
}
.practice-sub {
  margin-top: var(--space-2);
  color: var(--text-muted);
  font-size: var(--fs-md);
}
.practice-empty {
  text-align: center;
  padding: var(--space-7) var(--space-5);
}
.practice-empty__title {
  font-weight: 600;
  font-size: var(--fs-lg);
}
.practice-empty__desc {
  margin-top: var(--space-2);
  color: var(--text-muted);
  font-size: var(--fs-md);
}
</style>
