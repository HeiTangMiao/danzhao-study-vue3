/**
 * 异步区块包装工厂
 * 职责：
 *  - 低频 / 体积大的区块（图形画板、模拟卷）按需加载，避免挤进内容页主 chunk
 *  - 统一 loading / error 占位，避免每个异步区块各写一遍 defineAsyncComponent 配置
 * 说明：占位样式类 .block-async-loading / .block-async-error 定义在 BlockRenderer.vue
 *      的全局 style 中（非 scoped），此处只负责渲染结构
 */
import { defineAsyncComponent, h } from 'vue'

/**
 * 包装一个异步区块组件
 * @param {() => Promise<unknown>} loader 组件动态加载函数
 * @returns 异步组件
 */
export function asyncBlock(loader) {
  return defineAsyncComponent({
    loader,
    loadingComponent: {
      render: () =>
        h('div', { class: 'block-async-loading' }, [
          h('span', { class: 'block-spinner' }),
          h('span', ' 正在加载图形…')
        ])
    },
    errorComponent: {
      render: () => h('div', { class: 'block-async-error' }, '⚠️ 区块加载失败，请刷新重试')
    },
    // 150ms 内加载完成则不显示占位，避免快速切换时闪烁
    delay: 150,
    timeout: 15000
  })
}
