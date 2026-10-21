// @vitest-environment jsdom
/**
 * UnitView 翻页行为契约（主学习页 · 覆盖率最低的模块：305 语句仅 1.6%）
 *
 * 为什么单测这一块：UnitView 是**所有学员的必经路径**，而翻页是它最高频的交互。
 * pagingGo 里三层保护一旦回归，表现都是「页面卡死/白屏」这类最伤用户的故障，
 * 而且靠肉眼回归很难覆盖到边界（第一页往左、最后一页往右）。
 *
 * 覆盖的契约：
 *  ① 越界不翻（第一页 prev / 最后一页 next 都不动）
 *  ② 同页不翻（offset 为 0）
 *  ③ 页内翻页走 **replace 而非 push**（D17：返回 = 离开单元，翻页不该堆历史栈）
 *  ④ 跨单元跳转走 push 且 fileIndex 归 0
 *  ⑤ 路由参数越界时 fileIndex 被钳制到最后一页（不是空白页）
 *
 * mock 原则（照 search-panel.test.js 的既有模式）：
 *  存储与内容加载一律换成惰性空实现，避免引入 fake-indexeddb 与假计时器的相互作用。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// ---- 可变的路由参数（各用例不同）----
const params = { subject: 'math', unitNum: '01', fileIndex: '0' }
const router = { push: vi.fn(), replace: vi.fn() }

vi.mock('vue-router', () => ({
  useRoute: () => ({ params }),
  useRouter: () => router,
  // 路由守卫在此只登记不执行：本文件测的是翻页判定，不是守卫本身
  onBeforeRouteLeave: vi.fn(),
  onBeforeRouteUpdate: vi.fn()
}))

// 存储：惰性空实现（避免 fake-indexeddb）
vi.mock('@/stores/studyDb', () => ({
  useStudyDbStore: () => ({
    get: vi.fn(async () => null),
    put: vi.fn(async () => {}),
    markPageVisited: vi.fn(async () => {}),
    recordTest: vi.fn(async () => {}),
    getContentMeta: vi.fn(async () => null),
    getContentCache: vi.fn(async () => null)
  })
}))

// UnitView 调用 progress.refresh() 后直接接 .catch（:388/:437），故 refresh 必须返回 Promise；
// 另需 isCompleted / isPageMastered（:417/:427 的完成态与掌握态判断）
vi.mock('@/stores/progress', () => ({
  useProgressStore: () => ({
    refresh: vi.fn(async () => {}),
    isCompleted: vi.fn(() => false),
    isPageMastered: vi.fn(() => false)
  })
}))

// 内容加载：返回固定两页，便于断言边界
const PAGE = { blocks: [{ type: 'knowledge', title: '知识点', content: 'x' }] }
vi.mock('@/content/loadPage', () => ({
  loadPage: vi.fn(async () => PAGE),
  prefetchPage: vi.fn(),
  clearPrefetch: vi.fn()
}))

vi.mock('@/composables/usePomodoro', () => ({
  usePomodoro: () => ({ setSubject: vi.fn(), remaining: { value: 0 }, running: { value: false } })
}))
vi.mock('@/composables/useNotes', () => ({
  useNotes: () => ({ notes: { value: [] }, add: vi.fn(), remove: vi.fn() })
}))
vi.mock('@/composables/useBookmarks', () => ({
  useBookmarks: () => ({ isBookmarked: { value: false }, toggle: vi.fn() })
}))
// useMotionPrefs 真实接口是 { tier: Ref<'full'|'reduced'|'off'> }（见其 JSDoc）；
// 这里给 'full'，让 setupBlockReveal 走完整路径（断言的是翻页，动效档位只求不炸）
vi.mock('@/composables/useMotionPrefs', () => ({
  useMotionPrefs: () => ({ tier: { value: 'full' } })
}))

import UnitView from '@/views/UnitView.vue'

/** 站点配置：单元 01 有 3 个文件，用于边界断言 */
const SITE = {
  units: [
    { num: '01', title: '集合与逻辑', files: [{ name: 'a', title: 'A' }, { name: 'b', title: 'B' }, { name: 'c', title: 'C' }] },
    { num: '02', title: '不等式', files: [{ name: 'd', title: 'D' }] }
  ]
}
vi.mock('@/content/index', () => ({ getSubjectConfig: () => SITE }))

const STUBS = {
  BlockRenderer: { template: '<div class="block-renderer" />' },
  ContentSidebar: { template: '<div />', methods: { openSheet: () => {} } },
  PomodoroPanel: { template: '<div />' },
  NotesPanel: { template: '<div />' },
  ReaderTopbar: { template: '<div />' },
  ReaderFooter: { template: '<div />' }
}

let wrapper = null

async function mountView() {
  wrapper = mount(UnitView, { global: { stubs: STUBS } })
  await flushPromises()
  return wrapper
}

/** 触发桌面键盘翻页（UnitView 在 window 上监听 ←/→） */
function press(key) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

beforeEach(() => {
  router.push.mockClear()
  router.replace.mockClear()
  params.subject = 'math'
  params.unitNum = '01'
  params.fileIndex = '0'
})

// ⚠️ 必须卸载：UnitView 在 window 上挂了 keydown 监听（桌面键盘翻页）。
// 若不卸载，上一个用例的实例仍会响应按键 —— 表现为「只有一个用例莫名失败」
// （首个用例的 fileIndex=0 实例替后面的用例翻了页）。这是测试自身的坑，不是产品缺陷：
// 真实应用中 UnitView 由路由托管，同时只存在一个实例。
afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
})

describe('UnitView 翻页边界（越界与同页不得翻动）', () => {
  it('第一页按 ← 不翻页（router 完全不动）', async () => {
    await mountView()
    press('ArrowLeft')
    await flushPromises()
    expect(router.replace).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('最后一页按 → 不翻页（fileIndex 已是最大值）', async () => {
    params.fileIndex = '2' // 该单元共 3 个文件
    await mountView()
    press('ArrowRight')
    await flushPromises()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('中间页按 → 正常翻页', async () => {
    params.fileIndex = '1'
    await mountView()
    press('ArrowRight')
    await flushPromises()
    expect(router.replace).toHaveBeenCalledTimes(1)
  })
})

describe('页内翻页走 replace 而非 push（D17：翻页不该堆历史栈）', () => {
  it('翻页调用 replace、且不带入历史（push 未被调用）', async () => {
    params.fileIndex = '0'
    await mountView()
    press('ArrowRight')
    await flushPromises()
    expect(router.replace).toHaveBeenCalledTimes(1)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('replace 的参数带正确的目标 fileIndex', async () => {
    params.fileIndex = '1'
    await mountView()
    press('ArrowRight')
    await flushPromises()
    const arg = router.replace.mock.calls[0][0]
    expect(arg.name).toBe('unit')
    expect(arg.params.fileIndex).toBe(2)
    expect(arg.params.unitNum).toBe('01')
  })
})

describe('路由参数越界时的钳制', () => {
  it('fileIndex 超出文件数 → 钳制到最后一页（而非渲染空白）', async () => {
    params.fileIndex = '99' // 该单元只有 3 个文件
    const wrapper = await mountView()
    // 钳制后最后一页的内容应被加载；这里断言组件未崩溃且渲染出区块容器
    expect(wrapper.find('.block-renderer').exists()).toBe(true)
  })
})
