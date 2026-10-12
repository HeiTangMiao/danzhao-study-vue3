/**
 * content Store —— 远程内容更新的**通知层**（批 S2 · P-S13 a）
 *
 * 职责边界（刻意极窄）：
 *  - 只承载「远程内容有没有更新 / 更新了哪一版 / 哪几个单元」这三个**状态**；
 *  - **不接管渲染**、**不加载内容**、**不缓存 blocks** —— 拉与存归 contentClient，
 *    页面级裁决归 mergeContent，渲染归既有 hydratePage + BlockRenderer。
 *
 * 为什么用它而不是事件总线（P-S13 a 裁定）：Pinia 是全站既有模式（src/stores/ 已有 6 个），
 * 可追踪、可在 devtools 里看；事件总线在本仓无先例，且「当前页要不要重取」这类消费
 * 需要读状态而非只收通知。
 *
 * ⚠️ 缓解（P-S13 备注）：消费方（UnitView）watch 本 store 后重取当前页时，**只**在
 *    contentVersion 变化时触发，不得进入滑动翻页的 400ms 竞速路径
 *    （UnitView.vue:551 `Promise.race([dataPromise, sleep(400)])`）。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useContentStore = defineStore('content', () => {
  /** 本地已生效的远程内容版本号（0 = 尚未拉到任何远程内容） */
  const contentVersion = ref(0)

  /** 本次启动是否拉到了更新（供 UI 提示；消费方处理完可 clearUpdate()） */
  const hasUpdate = ref(false)

  /** 本次更新涉及的单元键数组（形如 ['math/01']），供 UI 精确提示 */
  const updatedUnits = ref([])

  /**
   * 记录一次更新（由 contentClient 拉到新版并写完缓存后调用）
   * @param {{version: number, units: string[]}} payload 版本号 + 变更单元键列表
   */
  function applyUpdate({ version, units = [] } = {}) {
    if (!Number.isFinite(Number(version))) return
    contentVersion.value = Number(version)
    updatedUnits.value = [...units]
    hasUpdate.value = units.length > 0
  }

  /** 消费方处理完更新提示后调用（只清标记，不动已生效的版本号） */
  function clearUpdate() {
    hasUpdate.value = false
    updatedUnits.value = []
  }

  return { contentVersion, hasUpdate, updatedUnits, applyUpdate, clearUpdate }
})
