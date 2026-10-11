// @vitest-environment jsdom
/**
 * Fc2 · ContentSidebar 抽屉滚动锁「归属感知」测试（F-3.2）
 *
 * 背景：抽屉打开时锁 body 滚动（移动端手势隔离）。原实现**无条件**在关闭/卸载时把
 *      `document.body.style.overflow` 清空 —— 若同时另有组件（NotesPanel 抽屉）持锁，
 *      关闭本抽屉会**误释放他人的锁**。修法照搬 NotesPanel 已验证的 `lockOwned` 归属感知：
 *      只清自己加的锁。
 *
 * 覆盖：
 *  - ① 他人持锁（先置 hidden）时，开关本抽屉**不清空**；
 *  - ② 自己加锁 → 关 → 清空（正常路径不回归）；
 *  - ③ 卸载时只清自己加的锁（自己持锁→清；他人持锁→不清）。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ContentSidebar from '@/components/ContentSidebar.vue'

const UNIT = { num: '01', title: '测试单元', files: [{ title: 'p1' }, { title: 'p2' }] }
const SITE = { units: [UNIT] }

function mountSidebar() {
  return mount(ContentSidebar, {
    props: { unit: UNIT, site: SITE, unitNum: '01', fileIndex: 0, toc: [] },
    global: { stubs: { AppIcon: true } }
  })
}

beforeEach(() => {
  document.body.style.overflow = ''
  localStorage.clear()
})
afterEach(() => {
  document.body.style.overflow = ''
})

describe('Fc2 抽屉滚动锁归属感知', () => {
  it('① 他人持锁时：开关本抽屉不清空 overflow（不误释放他人锁）', async () => {
    document.body.style.overflow = 'hidden' // 模拟 NotesPanel 先加锁
    const w = mountSidebar()
    w.vm.openSheet() // 打开本抽屉（toggle → true）
    await w.vm.$nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    w.vm.openSheet() // 关闭本抽屉（toggle → false）
    await w.vm.$nextTick()
    // 关键：本抽屉从未真正「拥有」这把锁 → 关闭时不得清空
    expect(document.body.style.overflow).toBe('hidden')
    w.unmount()
  })

  it('② 自己加锁 → 关 → 清空（正常路径不回归）', async () => {
    const w = mountSidebar()
    w.vm.openSheet()
    await w.vm.$nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    w.vm.openSheet() // 关
    await w.vm.$nextTick()
    expect(document.body.style.overflow).toBe('')
    w.unmount()
  })

  it('③ 卸载时自己持锁 → 清空', async () => {
    const w = mountSidebar()
    w.vm.openSheet()
    await w.vm.$nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    w.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('③ 卸载时他人持锁 → 不清空', async () => {
    document.body.style.overflow = 'hidden' // 他人锁
    const w = mountSidebar()
    w.vm.openSheet()
    await w.vm.$nextTick()
    w.unmount()
    expect(document.body.style.overflow).toBe('hidden')
  })
})
