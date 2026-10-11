// @vitest-environment jsdom
/**
 * 批 F · Fc2「抽屉滚动锁归属感知」—— **独立复核**（QA）
 *
 * 不复用工程师用例；按**真实操作顺序**与**反向锚**攻击归属逻辑：
 *  1. 真序：先开 NotesPanel（持锁）→ 再开/关 ContentSidebar 抽屉 → NotesPanel 的锁不被清
 *  2. 自己持锁关闭即清
 *  3. 卸载只清自己的（自己持→清；他人持→不清）
 *  4. 反向锚：自己**从未加锁**时关闭/卸载不得改写 body 锁（防 lockOwned 误置 true 造成「清空气」）
 *  5. 与 UnitView 键盘翻页守卫（overflow==='hidden' 时 return）联动不破
 *
 * ⚠️ jsdom 未实现 matchMedia：NotesPanel 的锁以 matchMedia(MOBILE_MQ).matches 为前提，
 *    故本测试显式 stub 为「移动端命中」，以走通真实加锁路径（不 stub 则 NotesPanel 永不加锁 → 假绿）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ContentSidebar from '@/components/ContentSidebar.vue'
import NotesPanel from '@/components/NotesPanel.vue'

const UNIT = { num: '01', title: '测试单元', files: [{ title: 'p1' }, { title: 'p2' }] }
const SITE = { units: [UNIT] }

function mountSidebar() {
  return mount(ContentSidebar, {
    props: { unit: UNIT, site: SITE, unitNum: '01', fileIndex: 0, toc: [] },
    global: { stubs: { AppIcon: true } }
  })
}

function notesStub() {
  return {
    content: ref(''),
    status: ref('已保存'),
    statusType: ref('saved'),
    wordCount: ref(0),
    scheduleAutosave: () => {},
    manualSave: () => {}
  }
}

beforeEach(() => {
  document.body.style.overflow = ''
  // stub 为「移动端命中」——与 MOBILE_MQ '(max-width: 1149px)' 一致
  window.matchMedia = vi.fn((q) => ({
    matches: /max-width:\s*1149px/.test(q),
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false }
  }))
  localStorage.clear()
})
afterEach(() => {
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

describe('Fc2 独立复核 · 归属感知', () => {
  it('① 真序：先开 NotesPanel（持锁）→ 开/关 ContentSidebar → NotesPanel 锁不被清', async () => {
    const np = mount(NotesPanel, { props: { open: false, notes: notesStub() }, global: { stubs: { AppIcon: true } } })
    await np.setProps({ open: true })
    await np.vm.$nextTick()
    expect(document.body.style.overflow, 'NotesPanel 打开应持锁').toBe('hidden')

    const cs = mountSidebar()
    cs.vm.openSheet()
    await cs.vm.$nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    cs.vm.openSheet() // 关
    await cs.vm.$nextTick()
    expect(document.body.style.overflow, '关闭侧栏不得误清 NotesPanel 的锁').toBe('hidden')

    cs.unmount()
    expect(document.body.style.overflow, '卸载侧栏也不得误清他人锁').toBe('hidden')

    await np.setProps({ open: false })
    await np.vm.$nextTick()
    expect(document.body.style.overflow, 'NotesPanel 关闭才释放').toBe('')
    np.unmount()
  })

  it('② 自己持锁 → 关 → 清空', async () => {
    const cs = mountSidebar()
    cs.vm.openSheet()
    await cs.vm.$nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    cs.vm.openSheet()
    await cs.vm.$nextTick()
    expect(document.body.style.overflow).toBe('')
    cs.unmount()
  })

  it('③ 卸载：自己持锁 → 清空', async () => {
    const cs = mountSidebar()
    cs.vm.openSheet()
    await cs.vm.$nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    cs.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('③ 卸载：他人持锁 → 不清空', async () => {
    document.body.style.overflow = 'hidden' // 他人（NotesPanel）持锁
    const cs = mountSidebar()
    cs.vm.openSheet()
    await cs.vm.$nextTick()
    cs.unmount()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('④ 反向锚：从未开抽屉 → 关闭/卸载**不得改写** body（不清空气）', async () => {
    document.body.style.overflow = 'visible' // 哨兵（既非 '' 也非 'hidden'）
    const cs = mountSidebar()
    cs.vm.closeSheets() // sheetOpen 本为 false，无变化 → 不应触发写
    await cs.vm.$nextTick()
    expect(document.body.style.overflow).toBe('visible')
    cs.unmount()
    expect(document.body.style.overflow, '从未加锁却改写了 body = lockOwned 误置 bug').toBe('visible')
  })

  it('④ 反向锚：他人持锁下开→关（自己从未真正持锁）卸载不改写', async () => {
    document.body.style.overflow = 'hidden'
    const cs = mountSidebar()
    cs.vm.openSheet() // 他人已持锁 → 自己 lockOwned 应为 false
    await cs.vm.$nextTick()
    document.body.style.overflow = 'hidden' // 保持
    cs.vm.openSheet() // 关
    await cs.vm.$nextTick()
    cs.unmount()
    expect(document.body.style.overflow).toBe('hidden')
  })
})

describe('Fc2 独立复核 · 与键盘翻页守卫联动', () => {
  it('⑤ UnitView.onKeydown 仍以 overflow==="hidden" 为守卫，且在翻页调用之前 return', () => {
    const t = readFileSync(join(process.cwd(), 'src/views/UnitView.vue'), 'utf8')
    const fn = t.indexOf('function onKeydown')
    expect(fn, '未找到 onKeydown').toBeGreaterThan(-1)
    const guard = t.indexOf("document.body.style.overflow === 'hidden'", fn)
    const paging = t.indexOf('pagingGo(', fn)
    expect(guard, '溢出守卫缺失 → Fc2 锁语义变化会破坏键盘翻页').toBeGreaterThan(fn)
    expect(paging).toBeGreaterThan(guard)
  })
})
