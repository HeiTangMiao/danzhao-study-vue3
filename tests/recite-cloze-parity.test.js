// @vitest-environment jsdom
/**
 * A3 主验收 —— 挖空默写「判分路径一致性」（设计 §5.7，T04 验收本体）
 *
 * 一句话：**73 篇 × 3 组确定性变体 × 逐空**，判分路径 A（组件 DOM）≡ 判分路径 B（共享纯函数），
 * 外加 strict 红线专项、`context` 形状专项、identity 守卫、路由与 4 Tab 五组断言。
 *
 * 为什么不塞进既有四个 cloze 测试（`cloze-input` / `cloze-strict` / `cloze-variants` / `cloze-enqueue`）：
 *  ① 那四个文件是「**组件行为零回归**」的证据（T01 要求零用例改动）。把 73 篇全库遍历塞进去，
 *     会让「回归证据」与「新功能验收」混在一个文件里 —— 一旦红了分不清是谁的问题；
 *  ② 它们的 fixture 是**手写小块**、不碰文件系统；A3 必须读真实产物 + 真实内容页，
 *     依赖面完全不同（Node 读盘 + jsdom 挂载）；
 *  ③ 混在一起会把那四个文件从毫秒级拖到秒级，日常回归变慢。
 *
 * 三条实现约束（不遵守会假绿/假红，§5.7 末表）：
 *  1. 首行 `// @vitest-environment jsdom`（组件挂载要 DOM）；
 *  2. `vi.mock('@/stores/studyDb')` 成 **no-op 桩** —— 否则 73 篇 × 提交会写 73 次 IndexedDB。
 *     A3 验的是**判分**，不是落库（落库由 `tests/cloze-enqueue.test.js` 单独负责）；
 *  3. `describe.each` **一篇一个 `it`** —— 单篇失败要能定位到篇名，超时也按篇计算。
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

// ─────────────────────────── 桩：数据层（no-op） ───────────────────────────
// `vi.hoisted` 是为了让 mock 工厂能引用同一份桩对象（工厂会在 import 之前被提升执行）。
const H = vi.hoisted(() => {
  const stub = {
    recordError: vi.fn(async () => {}),
    recordAnswered: vi.fn(async () => {}),
    getReciteProgressAll: vi.fn(async () => []),
    getReciteProgress: vi.fn(async () => null),
    saveReciteProgress: vi.fn(async () => {}),
    deleteReciteProgressSoft: vi.fn(async () => false),
    getReciteState: vi.fn(async () => ({ key: 'main', streak: 0, maxStreak: 0, lastActiveDate: '' })),
    saveReciteState: vi.fn(async () => {})
  }
  // 产物与内容页：identity 守卫用例通过这两个槽位注入「错配」现场
  return { stub, bank: null, page: null }
})

vi.mock('@/stores/studyDb', () => ({ useStudyDbStore: () => H.stub }))

// 产物加载器：A3 只读磁盘产物（经 harness），store 用例需要可控 bank → 一律走槽位
vi.mock('@/utils/reciteBankClient', () => ({
  DEFAULT_SUBJECT: 'chinese',
  BUNDLED_TIMEOUT_MS: 3000,
  REMOTE_TIMEOUT_MS: 2500,
  loadBundled: async () => H.bank,
  refreshFromRemote: async () => null,
  resetReciteBankCache: () => {},
  getCachedBank: () => H.bank
}))

// 内容页：真实 `loadPage` 会走 index.js 的动态 import 全链，用例里只需一个可控页面
vi.mock('@/content/loadPage', () => ({
  loadPage: async () => H.page,
  prefetchPage: async () => false,
  clearPrefetch: () => {},
  importPageModule: async () => ({ default: { blocks: [] } }),
  resolvePageMeta: () => null,
  hydratePage: () => null
}))

import ClozeBlock from '@/components/blocks/ClozeBlock.vue'
import AppTabBar from '@/components/AppTabBar.vue'
import ReciteView from '@/views/ReciteView.vue'
import RecitePieceView from '@/views/RecitePieceView.vue'
import { buildClozeItems, flattenBlanks, gradeCloze } from '@/content/clozeJudge'
import { sanitizeBank } from '@/content/reciteBank'
import { buildReciteContext } from '@/stores/recite'
import { useAuthStore } from '@/stores/auth'
import appRouter from '@/router/index.js'
import {
  blockOf,
  buildFileIndex,
  domGrade,
  loadPieces,
  variantsOf
} from './helpers/reciteParity.mjs'

/** 产物篇目（`loadPieces` 内部已断言 73 篇 + 经 `sanitizeBank` 清洗） */
const pieces = loadPieces()

/** 产物 fileKey → 内容文件索引（beforeAll 里建一次，73 个用例共享） */
let fileIndex = null

beforeAll(async () => {
  fileIndex = await buildFileIndex()
})

beforeEach(() => {
  // 只清调用记录，保留实现（桩函数必须继续返回默认值）
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

// ═══════════════════════════ A3 主体：73 篇 × 3 变体 × 逐空 ═══════════════════════════
describe.each(pieces.map((p) => [`${p.order}. ${p.title}`, p]))(
  'A3 判分路径一致性 · %s',
  (label, piece) => {
    it(`路径A(DOM) ≡ 路径B(gradeCloze)：${label}`, async () => {
      const { block } = await blockOf(piece, fileIndex)
      const items = buildClozeItems(block)
      const blanks = flattenBlanks(items)

      // 构建期计数与运行时解析必须同源（blankCount 由 buildClozeItems/flattenBlanks 算出）
      expect(blanks.length, '产物 blankCount 与运行时解析的空位数不一致').toBe(piece.blankCount)
      // strictCount 同理：它决定 strict 红线句有没有被"优化"掉
      const strictSentences = items.filter((it) => it.strict === true).length
      expect(strictSentences, '产物 strictCount 与运行时解析不一致').toBe(piece.strictCount)

      for (const variant of variantsOf(block)) {
        const pathB = gradeCloze(items, variant.values)
        const pathA = await domGrade(block, variant.values)

        // ① DOM 输入框数 == 纯函数展开的空位数（渲染与判分看同一份空位表）
        expect(pathA.inputCount, `[${variant.name}] DOM 输入框数与空位数不一致`).toBe(pathB.total)
        // ② 逐空逐一相等（A3 的实质）
        expect(pathA.results, `[${variant.name}] 逐空判定 A(DOM) ≢ B(gradeCloze)`).toEqual(pathB.results)
        // ③ 变体预期（all / fullWidth 全对；wrongOne 恰好第 1 空错）
        expect(pathB.results, `[${variant.name}] 变体预期不成立`).toEqual(variant.expect)
      }
    })
  }
)

/**
 * 定位关雎里「辗转反侧」那一空。
 * ⚠️ 不能取「第一个 strict 空」：`strict` 是**句级**标记，`寤寐思服` 与 `辗转反侧`
 *    同属第 2 句，两个空都带 strict。按主答案文本定位才不歧义。
 * @param {Array<{gi: number, main: string, strict: boolean}>} blanks 平铺空位表
 * @returns {{gi: number, main: string, strict: boolean}} 「辗转反侧」空位
 */
function findFanCeBlank(blanks) {
  const hit = blanks.find((b) => String(b.main).indexOf('反侧') >= 0)
  if (!hit) throw new Error('关雎里找不到「辗转反侧」那一空（内容侧改动？）')
  return hit
}

// ═══════════════════════════ strict 红线专项（全库仅此 1 句） ═══════════════════════════
describe('strict 红线专项：关雎「辗转反侧」', () => {
  /** 关雎：产物中唯一含 strict 句的篇（strictCount === 1） */
  const guanJu = pieces.filter((p) => p.title.indexOf('关雎') >= 0)
  const strictPieces = pieces.filter((p) => p.strictCount > 0)

  it('产物里含 strict 句的篇恰好 1 篇（内容侧改了就必须重新核验本用例）', () => {
    expect(strictPieces).toHaveLength(1)
    expect(guanJu).toHaveLength(1)
    expect(strictPieces[0].key).toBe(guanJu[0].key)
  })

  it('写「辗转返侧」→ 判错；写「辗转反侧」→ 判对（纯函数路径）', async () => {
    const { block } = await blockOf(guanJu[0], fileIndex)
    const items = buildClozeItems(block)
    const blanks = flattenBlanks(items)
    const target = findFanCeBlank(blanks)
    expect(target.strict, '「辗转反侧」所在句必须带 strict 标记').toBe(true)

    // 其余空填主答案，只针对「反侧」空做二分
    const base = blanks.map((b) => b.main)
    const wrong = base.slice()
    wrong[target.gi] = '辗转返侧'
    const right = base.slice()
    right[target.gi] = '辗转反侧'

    const wrongResult = gradeCloze(items, wrong)
    const rightResult = gradeCloze(items, right)
    expect(wrongResult.results[target.gi], '「辗转返侧」必须判错（strict 句禁通假映射）').toBe(false)
    expect(wrongResult.allCorrect).toBe(false)
    expect(rightResult.results[target.gi], '「辗转反侧」必须判对').toBe(true)
    expect(rightResult.allCorrect).toBe(true)
  })

  it('DOM 也标 is-wrong（防有人把 variantMap 改成全局生效）', async () => {
    const { block } = await blockOf(guanJu[0], fileIndex)
    const items = buildClozeItems(block)
    const blanks = flattenBlanks(items)
    const target = findFanCeBlank(blanks)
    const values = blanks.map((b) => b.main)
    values[target.gi] = '辗转返侧'
    const dom = await domGrade(block, values)
    expect(dom.results[target.gi], 'DOM 未把「辗转返侧」标成 is-wrong').toBe(false)
    // 其余空全对（strict 只关本句的通假映射，不牵连别的句子）
    blanks.forEach((b, i) => {
      if (b.gi === target.gi) return
      expect(dom.results[i], `第 ${b.gi} 空不该被判错`).toBe(true)
    })
  })
})

// ═══════════════════════════ context 形状专项（两个入口不会漂移） ═══════════════════════════
describe('context 形状：键集合严格等于 ClozeBlock 实际消费的 5 个', () => {
  it('buildReciteContext(piece) 不多不少（缺 fileKey 会让错题本静默不入队）', () => {
    const piece = pieces[0]
    const context = buildReciteContext(piece)
    expect(Object.keys(context).sort()).toEqual(['fileKey', 'fileTitle', 'subject', 'unitNum', 'unitTitle'])
    expect(context.subject).toBe('chinese') // 学科经 subjectOfPiece，不手工 split('|')[0]
    expect(context.fileKey).toBe(piece.fileKey)
    expect(context.unitNum).toBe(piece.unitNum)
    expect(context.fileTitle).toBe(piece.fileTitle)
    expect(context.unitTitle).toBe(piece.unitTitle)
  })

  it('非法入参不抛错，产出仍是 5 键空形状（视图不会因缺字段崩）', () => {
    for (const bad of [null, undefined, {}, 'x']) {
      const context = buildReciteContext(bad)
      expect(Object.keys(context).sort()).toEqual(['fileKey', 'fileTitle', 'subject', 'unitNum', 'unitTitle'])
      expect(context.fileKey).toBe('')
    }
  })
})

// ═══════════════════════════ identity 守卫（I8，双源错配） ═══════════════════════════
describe('identity 守卫：产物 title 与内容块 title 不一致', () => {
  const PIECE_TITLE = '产物里的篇名'
  const BLOCK_TITLE = '内容页里的篇名（不同版）'
  const FILE_KEY = 'chinese_07_99-双源错配样例'

  /** 造一份「只有 1 篇」的产物（经 sanitizeBank，保证形状与运行时一致） */
  function makeBank(title) {
    return sanitizeBank({
      schemaVersion: 1,
      contentVersion: 4,
      generatedAt: '2026-01-01T00:00:00.000Z',
      subject: 'chinese',
      counts: { all: 1, lesson: 1, review: 0 },
      pieces: [
        {
          key: `chinese|${FILE_KEY}|0`,
          order: 0,
          role: 'lesson',
          unitNum: '07',
          fileIndex: 0,
          blockIndex: 0,
          fileKey: FILE_KEY,
          fileTitle: '默写专项 · 双源错配样例',
          unitTitle: '默写专项',
          title,
          mode: 'input',
          sentenceCount: 1,
          blankCount: 1,
          strictCount: 0,
          fp: 'fp0001'
        }
      ]
    })
  }

  /** 造一个内容页（1 个 cloze 块，title 可控） */
  function makePage(title) {
    return {
      blocks: [{ type: 'cloze', title, mode: 'input', items: [{ text: '甲{{乙}}' }] }]
    }
  }

  /**
   * 挂载单篇页：**经 `<router-view />` 宿主**而不是直接挂组件。
   * 为什么必须这样：`onBeforeRouteLeave()` 只有在「被 `<router-view>` 渲染的子组件」里
   * 才能注册到路由记录上（直接挂载会拿到 `No active route record` 警告、守卫静默失效）——
   * 那样离开保护的第二层就等于没测。
   */
  async function mountPiece(path) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/recite', name: 'recite', component: { template: '<div class="stub-home" />' } },
        {
          path: '/recite/:unitNum/:fileIndex/:blockIndex',
          name: 'recite-piece',
          component: RecitePieceView
        }
      ]
    })
    await router.push(path)
    await router.isReady()
    const Host = { template: '<router-view />' }
    const wrapper = mount(Host, { global: { plugins: [router, createPinia()] } })
    return { wrapper, router }
  }

  /** 轮询等待条件成立（异步装载，避免固定 sleep） */
  async function waitFor(check, timeout = 5000) {
    const t0 = Date.now()
    for (;;) {
      const v = await check()
      if (v) return v
      if (Date.now() - t0 > timeout) return v
      await flushPromises()
      await new Promise((r) => setTimeout(r, 10))
    }
  }

  it('title 不一致 → 不渲染 ClozeBlock、不写任何 recite_progress、提示「内容已更新」', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(BLOCK_TITLE)

    const { wrapper } = await mountPiece('/recite/07/0/0')
    const notice = await waitFor(() => (wrapper.find('.rp-notice').exists() ? wrapper : null))

    expect(notice, '未进入 stale 提示态').toBeTruthy()
    expect(wrapper.text()).toContain('内容已更新')
    // ① 不渲染 ClozeBlock（因此不可能 emit submitted）
    expect(wrapper.findComponent(ClozeBlock).exists()).toBe(false)
    expect(wrapper.find('.cloze-input').exists()).toBe(false)
    // ② 不写任何 recite_progress（spy 断言；含 store 触发的那次 reload）
    await flushPromises()
    expect(H.stub.saveReciteProgress).not.toHaveBeenCalled()
    expect(H.stub.saveReciteState).not.toHaveBeenCalled()
    // ③ 有返回按钮
    expect(wrapper.text()).toContain('刷新并返回')
    wrapper.unmount()
  })

  it('块不存在（闭包流水号越界）→ 同样中止且不写库', async () => {
    H.bank = makeBank(PIECE_TITLE)
    // 内容页只剩 1 个 cloze 块，但产物坐标指向 0 —— 用空 blocks 制造"块不存在"
    H.page = { blocks: [] }

    const { wrapper } = await mountPiece('/recite/07/0/0')
    await waitFor(() => (wrapper.find('.rp-notice').exists() ? wrapper : null))
    expect(wrapper.text()).toContain('内容已更新')
    expect(wrapper.findComponent(ClozeBlock).exists()).toBe(false)
    await flushPromises()
    expect(H.stub.saveReciteProgress).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('title 一致 → 正常渲染 ClozeBlock 并写入进度（守卫不是"一律拦死"）', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper } = await mountPiece('/recite/07/0/0')
    const ready = await waitFor(() => (wrapper.find('.cloze-input').exists() ? wrapper : null))
    expect(ready, 'title 一致时未能进入作答态').toBeTruthy()

    const input = wrapper.find('.cloze-input')
    await input.setValue('乙')
    await wrapper.find('.cloze-btn--primary').trigger('click')
    await flushPromises()

    expect(H.stub.saveReciteProgress).toHaveBeenCalledTimes(1)
    const saved = H.stub.saveReciteProgress.mock.calls[0][0]
    expect(saved.key).toBe(`chinese|${FILE_KEY}|0`)
    expect(saved.stage).toBe(1)
    expect(saved.learnedAt).toBeTruthy()
    wrapper.unmount()
  })

  it('大冲关 manual=1 → 判分但**一行都不写**（I6/P0-9）', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper } = await mountPiece('/recite/07/0/0?manual=1')
    const ready = await waitFor(() => (wrapper.find('.cloze-input').exists() ? wrapper : null))
    expect(ready).toBeTruthy()
    expect(wrapper.text()).toContain('模拟考场')

    await wrapper.find('.cloze-input').setValue('乙')
    await wrapper.find('.cloze-btn--primary').trigger('click')
    await flushPromises()

    expect(H.stub.saveReciteProgress).not.toHaveBeenCalled()
    expect(H.stub.saveReciteState).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('模拟完成，不计入进度')
    wrapper.unmount()
  })

  it('离开保护第一层：有未提交输入时点返回 → 二次确认，确认后才回首页', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper, router } = await mountPiece('/recite/07/0/0')
    await waitFor(() => (wrapper.find('.cloze-input').exists() ? wrapper : null))
    await wrapper.find('.cloze-input').setValue('乙')

    // 点返回 → 弹二次确认，**不导航**
    await wrapper.find('.rp-back').trigger('click')
    expect(wrapper.find('.rp-confirm').exists()).toBe(true)
    expect(router.currentRoute.value.name).toBe('recite-piece')

    // 「继续默写」→ 弹窗关闭，仍在本题
    await wrapper.find('.rp-confirm__actions .rp-btn--ghost').trigger('click')
    expect(wrapper.find('.rp-confirm').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('recite-piece')

    // 再点返回 → 「离开」→ 回首页
    await wrapper.find('.rp-back').trigger('click')
    await wrapper.find('.rp-confirm__actions .rp-btn--danger').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('recite')
    wrapper.unmount()
  })

  it('离开保护第二层：直接 router.push 也被守卫取消（未提交输入时不允许静默离开）', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper, router } = await mountPiece('/recite/07/0/0')
    await waitFor(() => (wrapper.find('.cloze-input').exists() ? wrapper : null))
    await wrapper.find('.cloze-input').setValue('乙')

    await router.push('/recite')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('recite-piece')
    expect(wrapper.find('.rp-confirm').exists()).toBe(true)
    wrapper.unmount()
  })

  it('无输入时点返回不弹确认（不打扰）', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper, router } = await mountPiece('/recite/07/0/0')
    await waitFor(() => (wrapper.find('.cloze-input').exists() ? wrapper : null))
    await wrapper.find('.rp-back').trigger('click')
    await flushPromises()
    expect(wrapper.find('.rp-confirm').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('recite')
    wrapper.unmount()
  })
})

// ═══════════════════════════ 背诵首页（store 集成冒烟） ═══════════════════════════
describe('ReciteView 首页：视图只读 viewModel（分母取产物 counts.lesson）', () => {
  const FILE_KEY = 'chinese_07_98-首页样例'

  /**
   * 造一份「3 lesson + 1 review(trigger:all)」的产物。
   * `counts` 里 lesson=3 —— 视图分母必须**取它**，不许硬编码 67。
   */
  function makeHomeBank() {
    const lesson = (order, title) => ({
      key: `chinese|${FILE_KEY}|${order}`,
      order,
      role: 'lesson',
      unitNum: '07',
      fileIndex: 0,
      blockIndex: order,
      fileKey: FILE_KEY,
      fileTitle: '默写专项 · 首页样例',
      unitTitle: '默写专项',
      title,
      mode: 'input',
      sentenceCount: 2,
      blankCount: 2,
      strictCount: 0,
      fp: `fp${order}`
    })
    return sanitizeBank({
      schemaVersion: 1,
      contentVersion: 4,
      generatedAt: '2026-01-01T00:00:00.000Z',
      subject: 'chinese',
      counts: { all: 4, lesson: 3, review: 1 },
      pieces: [
        lesson(0, '已背篇'),
        lesson(1, '今日新篇'),
        lesson(2, '后天才学'),
        {
          key: `chinese|${FILE_KEY}|9`,
          order: 9,
          role: 'review',
          trigger: 'all',
          unitNum: '07',
          fileIndex: 0,
          blockIndex: 9,
          fileKey: FILE_KEY,
          fileTitle: '默写专项 · 首页样例',
          unitTitle: '默写专项',
          title: '综合大冲关（12 句全篇目混合，模拟考场）',
          mode: 'input',
          sentenceCount: 12,
          blankCount: 13,
          strictCount: 0,
          fp: 'fp9'
        }
      ]
    })
  }

  /** 造一行「已背、且近期不到期」的进度 */
  function learnedRow() {
    return {
      key: `chinese|${FILE_KEY}|0`,
      subject: 'chinese',
      fileKey: FILE_KEY,
      blockIndex: 0,
      pieceTitle: '已背篇',
      fp: 'fp0',
      stage: 1,
      nextDate: '2999-01-01',
      lastCorrect: true,
      lastAt: 1,
      doneCount: 1,
      learnedAt: '2026-01-01',
      createdAt: 1,
      deleted: false
    }
  }

  async function mountHome() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/recite', name: 'recite', component: ReciteView },
        {
          path: '/recite/:unitNum/:fileIndex/:blockIndex',
          name: 'recite-piece',
          component: { template: '<div class="stub-piece" />' }
        }
      ]
    })
    await router.push('/recite')
    await router.isReady()
    const Host = { template: '<router-view />' }
    const wrapper = mount(Host, { global: { plugins: [router, createPinia()] } })
    return { wrapper, router }
  }

  /** 轮询等待条件成立 */
  async function waitFor(check, timeout = 5000) {
    const t0 = Date.now()
    for (;;) {
      const v = await check()
      if (v) return v
      if (Date.now() - t0 > timeout) return v
      await flushPromises()
      await new Promise((r) => setTimeout(r, 10))
    }
  }

  it('进度分母 = counts.lesson（3）、比率走 total>0 守卫、无到期时重默分区整块不渲染', async () => {
    H.bank = makeHomeBank()
    const original = H.stub.getReciteProgressAll.getMockImplementation()
    H.stub.getReciteProgressAll.mockResolvedValue([learnedRow()])
    try {
      const { wrapper } = await mountHome()
      await waitFor(() => (wrapper.find('.rc-stats').exists() ? wrapper : null))

      // 分母来自产物 counts.lesson，不是字面量
      expect(wrapper.find('.rc-stats__den').text()).toContain('3')
      expect(wrapper.find('.rc-stats__value').text()).toContain('1')
      // 1/3 → 33%（I10 ②：total>0 守卫下的取整）
      expect(wrapper.find('.rc-bar__fill').attributes('style')).toContain('33%')
      // 今日新篇 = 第一篇"没有行"的 lesson 篇
      expect(wrapper.find('.rc-piece__title').text()).toBe('今日新篇')
      // 无到期 → 待重默分区整块不渲染（不留空白卡）
      expect(wrapper.find('.rc-due').exists()).toBe(false)
      // 底部常驻大冲关，句数取产物（不硬编码 12）
      expect(wrapper.text()).toContain('综合大冲关（12 句 · 模拟考场）')
      wrapper.unmount()
    } finally {
      H.stub.getReciteProgressAll.mockImplementation(original)
    }
  })

  it('有到期篇 → 重默分区渲染，且 lesson 篇显示篇名 + 出处', async () => {
    H.bank = makeHomeBank()
    const original = H.stub.getReciteProgressAll.getMockImplementation()
    const dueRow = learnedRow()
    dueRow.key = `chinese|${FILE_KEY}|2`
    dueRow.blockIndex = 2
    dueRow.pieceTitle = '后天该默'
    dueRow.fp = 'fp2'
    dueRow.nextDate = '2020-01-01' // 早已到期
    dueRow.stage = 1
    H.stub.getReciteProgressAll.mockResolvedValue([learnedRow(), dueRow])
    try {
      const { wrapper } = await mountHome()
      await waitFor(() => (wrapper.find('.rc-due').exists() ? wrapper : null))

      const due = wrapper.findAll('.rc-due .rc-piece')
      expect(due).toHaveLength(1)
      expect(due[0].text()).toContain('后天才学')
      expect(due[0].text()).toContain('第 2 次')
      wrapper.unmount()
    } finally {
      H.stub.getReciteProgressAll.mockImplementation(original)
    }
  })
})

// ═══════════════════════════ 路由可达性 + 4 Tab 不变 ═══════════════════════════
describe('路由：/recite 与 /recite/:unitNum/:fileIndex/:blockIndex', () => {
  beforeEach(() => {
    useAuthStore().accessToken = 'test-token' // 越过全站登录守卫
    window.scrollTo = () => {} // jsdom 未实现 scrollTo（router.scrollBehavior 会调用）
    H.bank = null
    H.page = null
  })

  it('/recite 可达，且**无 meta.tab**（二级页，不进一级导航）', async () => {
    await appRouter.push('/')
    await appRouter.push('/recite')
    const route = appRouter.currentRoute.value
    expect(route.name).toBe('recite')
    expect(route.path).toBe('/recite')
    expect(route.meta.tab).toBeUndefined()
  })

  it('/recite/07/0/0 可达，参数就位，且无 meta.tab', async () => {
    await appRouter.push('/recite/07/0/0')
    const route = appRouter.currentRoute.value
    expect(route.name).toBe('recite-piece')
    expect(route.params.unitNum).toBe('07')
    expect(route.params.fileIndex).toBe('0')
    expect(route.params.blockIndex).toBe('0')
    expect(route.meta.tab).toBeUndefined()
  })

  it('非规范 unitNum 深链被归一化（/recite/7/0/0 → 07，与 /study 同一条补零规则）', async () => {
    await appRouter.push('/')
    await appRouter.push('/recite/7/0/0')
    expect(appRouter.currentRoute.value.params.unitNum).toBe('07')
  })

  it('AppTabBar 仍为 4 项（B4：背诵不新增一级 Tab）', async () => {
    await appRouter.push('/')
    const wrapper = mount(AppTabBar, { global: { plugins: [appRouter] } })
    expect(wrapper.findAll('.app-pill__tab')).toHaveLength(4)
    expect(wrapper.findAll('.app-topbar__tab')).toHaveLength(4)
    wrapper.unmount()
  })
})
