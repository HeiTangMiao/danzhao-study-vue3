// @vitest-environment jsdom
/**
 * 「产物 ↔ 内容同源」验收（原 A3 判分 parity；2026-10-30 方案变更后**改造**，不是删除）
 *
 * ★ 为什么不直接删：原文件（91 例）验的是「课程页 cloze 判分 ≡ 背诵路径判分」。
 *   新方案不判分，被比对的对象确实没了 —— 但它真正咬住的不变量是「**产物与内容页同源**」：
 *   构建期从第 N 个区块抽出来的正文，必须就是学员在第 N 篇里读到的正文。
 *   这条不变量在「不判分」的方案下**更重要**（读错字不会被判分抓出来，没有任何二次防线），
 *   所以把它改造成**逐字比对**这条更强、也更贴新契约的等式：
 *
 *       产物 64 篇的 `paragraphs` ≡ 内容页 knowledge 区块的 `paragraphs`（逐字、逐段、按序）
 *       产物 64 篇的 `fp`        ≡ `fingerprintOf(内容页 knowledge 区块)`
 *       内容页 knowledge 块集合  ↔ 产物篇目集合 一一对应（不漏 / 不重 / 不错序）
 *
 *   删掉它等于把「抽取漏字 / 串行 / 错序」这一类**不报错的用户可见缺陷**变成无人看守；
 *   本改造保留同等守卫强度，并补上原先没有的：正文文本比对、书写覆盖完整性、
 *   identity 锚点（title）的单射性、以及「本页确实不再有任何 cloze 判分链路」。
 *
 * ★ 为什么仍单独成一个文件（不合并进既有 cloze 测试）：
 *   ① 它读真实产物 + 真实内容页（Node 读盘 + jsdom 挂载），依赖面与那四个 cloze 组件测试完全不同；
 *   ② 它是「本功能验收」的证据，而那四个是「组件行为零回归」的证据 —— 混在一起红了分不清是谁的问题。
 *
 * 三条实现约束（不遵守会假绿/假红）：
 *  1. 首行 `// @vitest-environment jsdom`（仍有组件挂载用例）；
 *  2. `vi.mock('@/stores/studyDb')` 成 **no-op 桩** —— 否则逐篇自评会写 64 次 IndexedDB；
 *  3. `describe.each` **一篇一个 `it`** —— 单篇失败要能定位到篇名，超时也按篇计算。
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

// 产物加载器：只读磁盘产物（经 harness），store 用例需要可控 bank → 一律走槽位
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

// ⚠️ ClozeBlock 只作为**负断言**的被测对象保留：新方案下背诵单篇页**不得**渲染它 /
// 不得引入任何判分链路（见文末「判分零代码」一组）。这是本轮新替换进来的守卫。
import ClozeBlock from '@/components/blocks/ClozeBlock.vue'
import AppTabBar from '@/components/AppTabBar.vue'
import ReciteView from '@/views/ReciteView.vue'
import RecitePieceView from '@/views/RecitePieceView.vue'
import { sanitizeBank } from '@/content/reciteBank'
import { buildReciteContext } from '@/stores/recite'
import { useAuthStore } from '@/stores/auth'
import appRouter from '@/router/index.js'
import {
  blockOf,
  buildFileIndex,
  loadPieces,
  rawParagraphs,
  fingerprintOf
} from './helpers/reciteParity.mjs'

/** 产物篇目（`loadPieces` 内部已断言 = `BASELINE.pieces` 篇 + 经 `sanitizeBank` 清洗） */
const pieces = loadPieces()

/** 产物 fileKey → 内容文件索引（beforeAll 里建一次，全部用例共享） */
let fileIndex = null

beforeAll(async () => {
  fileIndex = await buildFileIndex()
})

beforeEach(() => {
  // 只清调用记录，保留实现（桩函数必须继续返回默认值）
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

// ═══════════════ ① 主体：64 篇 × 逐字同源（原「路径A ≡ 路径B」的位置与新形态） ═══════════════
describe.each(pieces.map((p) => [`${p.order}. ${p.title}`, p]))(
  '产物正文同源 · %s',
  (label, piece) => {
    it(`产物正文 ≡ 内容页 knowledge 区块（逐字 + fp 同源）：${label}`, async () => {
      const { block } = await blockOf(piece, fileIndex)

      // ① identity 锚点：运行时 identity 守卫只用 `title` 判「是不是这一篇」，必须精确相等
      expect(block.title, `产物 ${piece.key} 的 title 与内容页不一致`).toBe(piece.title)

      // ② 正文逐字一致 —— 漏一个字 / 多一个字 / 顺手 trim / 段落串行 or 错序，全在这里被抓出来
      expect(
        piece.paragraphs,
        `产物 ${piece.key} 的正文与内容页 knowledge 区块不一致（构建期抽取被改写了？）`
      ).toEqual(rawParagraphs(block))

      // ③ 正文可用性：每段必须是非空字符串（与构建侧同一口径，见 Scripts 的 "无正文的篇数" 断言）
      expect(piece.paragraphs.length, `产物 ${piece.key} 没有正文段落`).toBeGreaterThan(0)
      for (const para of piece.paragraphs) {
        expect(typeof para, `产物 ${piece.key} 的正文段不是字符串`).toBe('string')
        expect(para.trim(), `产物 ${piece.key} 存在空白正文段`).not.toBe('')
        // ④ 不挖空：`{{ }}` 出现在朗读正文里，只可能是构建期又抽回了 cloze 数据源
        expect(para.indexOf('{{'), `产物 ${piece.key} 的正文里出现了 cloze 挖空标记 {{`).toBe(-1)
        expect(para.indexOf('}}'), `产物 ${piece.key} 的正文里出现了 cloze 挖空标记 }}`).toBe(-1)
      }

      // ⑤ 内容指纹必须能用构建脚本那一支函数现算出来 —— 运行时自动迁移（reconcile）的唯一判据
      expect(
        piece.fp,
        `产物 ${piece.key} 的 fp 与内容页现场的 fingerprintOf(block) 不一致`
      ).toBe(fingerprintOf(block))
    })
  }
)

// ═══════════════ ② 覆盖完整性：内容 knowledge 块 ↔ 产物篇目 一一对应 ═══════════════
describe('覆盖完整性（不漏 / 不重 / 不错序）', () => {
  it('产物引用的每个内容文件里：knowledge 块数 == 落在该文件的篇数，且每个 blockIndex 恰好被用一次', async () => {
    const byFile = new Map()
    for (const p of pieces) {
      if (!byFile.has(p.fileKey)) byFile.set(p.fileKey, [])
      byFile.get(p.fileKey).push(p)
    }
    expect(byFile.size, '产物没有引用任何内容文件').toBeGreaterThan(0)

    let covered = 0
    for (const [fileKey, list] of byFile) {
      // 用该文件下的第一篇做一次定位，顺带拿到该页的全部 knowledge 块
      const { knowledgeBlocks } = await blockOf(list[0], fileIndex)

      // ① 不多收：该页 knowledge 块数必须等于落到该页的产物篇数（多一块 = 漏抽一篇且无人发现）
      expect(
        knowledgeBlocks.length,
        `${fileKey}：内容页 knowledge 块数(${knowledgeBlocks.length}) ≠ 产物篇数(${list.length}) —— 漏抽 / 多收`
      ).toBe(list.length)

      // ② 不漏 + 不错序：每个 blockIndex 恰好对应一篇（漏抽一篇会让某个下标缺席）
      const used = new Map()
      for (const p of list) {
        expect(
          knowledgeBlocks[p.blockIndex],
          `${p.key}：产物坐标指向的 knowledge 块不存在（${fileKey} 共 ${knowledgeBlocks.length} 块）`
        ).toBeTruthy()
        used.set(p.blockIndex, (used.get(p.blockIndex) || 0) + 1)
      }
      expect(used.size, `${fileKey}：blockIndex 出现重复（同一块被收两次）`).toBe(list.length)
      // ③ 顺序连续（构建期给 extraction 排的流水号必须铺满 0..n-1）
      const sorted = [...used.keys()].sort((a, b) => a - b)
      expect(sorted, `${fileKey}：blockIndex 不连续`).toEqual(sorted.map((_, i) => i))
      covered += list.length
    }
    // ④ 总账：上面逐文件对完，仍然是全部篇目
    expect(covered).toBe(pieces.length)
  })

  it('identity 锚点不能退化：64 篇 title 非空且互不相同（运行时守卫靠 title 比对）', () => {
    const titles = pieces.map((p) => p.title)
    for (const t of titles) {
      expect(typeof t).toBe('string')
      expect(t.trim(), '存在空 title —— identity 守卫会把它当成"任何一篇都对不上"').not.toBe('')
    }
    // 出现重名 ⇒ 标题相同的两篇互换坐标时 identity 守卫失去鉴别力（静默把进度记到别的篇上）
    expect(new Set(titles).size, `存在重复 title（共 ${titles.length} 篇）`).toBe(titles.length)
  })
})

// ═══════════════ context 形状专项（两个入口不会漂移） ═══════════════
describe('context 形状：键集合严格等于 RecitePieceView 实际消费的 5 个', () => {
  it('buildReciteContext(piece) 不多不少（缺 fileKey 会让内容页定位失效）', () => {
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

// ═══════════════ identity 守卫（I8，双源错配） ═══════════════
describe('identity 守卫：产物 title 与内容块 title 不一致', () => {
  const PIECE_TITLE = '产物里的篇名'
  const BLOCK_TITLE = '内容页里的篇名（不同版）'
  const FILE_KEY = 'chinese_08_99-双源错配样例'
  /** 与真实内容同一形态的正文（含内联注音）；stale / ready 两侧都用它，保证只有 title 这一个变量 */
  const PASSAGE = ['关关雎鸠（guān guān jū jiū），在河之洲（zài hé zhī zhōu）。']

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
          unitNum: '08',
          fileIndex: 0,
          blockIndex: 0,
          fileKey: FILE_KEY,
          fileTitle: '背诵专项 · 双源错配样例',
          unitTitle: '背诵专项',
          title,
          paragraphs: PASSAGE,
          fp: 'fp0001'
        }
      ]
    })
  }

  /** 造一个内容页（1 个 knowledge 块，title 可控） */
  function makePage(title) {
    return {
      blocks: [{ type: 'knowledge', title, paragraphs: PASSAGE }]
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

  /**
   * 点自评按钮：按钮**文案**是本页唯一的对外契约（自评模式下本页已没有输入框）。
   * @param {object} wrapper 挂载结果
   * @param {string} text 按钮文案
   */
  async function clickText(wrapper, text) {
    const hit = wrapper.findAll('button').find((b) => b.text() === text)
    expect(hit, `找不到按钮「${text}」（自评契约变了？）`).toBeTruthy()
    await hit.trigger('click')
    await flushPromises()
  }

  it('title 不一致 → 不渲染正文、不写任何 recite_progress、提示「内容已更新」', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(BLOCK_TITLE)

    const { wrapper } = await mountPiece('/recite/08/0/0')
    const notice = await waitFor(() => (wrapper.find('.rp-notice').exists() ? wrapper : null))

    expect(notice, '未进入 stale 提示态').toBeTruthy()
    expect(wrapper.text()).toContain('内容已更新')
    // ① 不渲染正文（因此不可能自评）；cloze 判分链路同样不许出现
    expect(wrapper.find('.rp-passage').exists()).toBe(false)
    expect(wrapper.find('.rp-selfcheck').exists()).toBe(false)
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

  it('内容页只剩 cloze 块（knowledge 流水号为 0）→ 同样中止且不写库（运行时只数 knowledge）', async () => {
    H.bank = makeBank(PIECE_TITLE)
    // title 一致，但块型是 cloze —— 若运行时把 `type === 'cloze'` 当计数口径，这里就会放行进入正文态
    H.page = { blocks: [{ type: 'cloze', title: PIECE_TITLE, items: [{ text: '甲{{乙}}' }] }] }

    const { wrapper } = await mountPiece('/recite/08/0/0')
    await waitFor(() => (wrapper.find('.rp-notice').exists() ? wrapper : null))
    expect(wrapper.text()).toContain('内容已更新')
    expect(wrapper.find('.rp-passage').exists()).toBe(false)
    await flushPromises()
    expect(H.stub.saveReciteProgress).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('块不存在（knowledge 流水号越界）→ 同样中止且不写库', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = { blocks: [] }

    const { wrapper } = await mountPiece('/recite/08/0/0')
    await waitFor(() => (wrapper.find('.rp-notice').exists() ? wrapper : null))
    expect(wrapper.text()).toContain('内容已更新')
    expect(wrapper.find('.rp-passage').exists()).toBe(false)
    await flushPromises()
    expect(H.stub.saveReciteProgress).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('title 一致 → 渲染整篇正文；自评「已能背诵」前不写库，自评后写一行（stage 1）', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper } = await mountPiece('/recite/08/0/0')
    const ready = await waitFor(() => (wrapper.find('.rp-passage').exists() ? wrapper : null))
    expect(ready, 'title 一致时未能进入朗读态').toBeTruthy()

    // 整篇原文（含内联注音）原样展示 —— 新方案的"答案"就是这个全文
    expect(wrapper.text()).toContain('关关雎鸠（guān guān jū jiū）')
    expect(wrapper.find('.rp-selfcheck').exists()).toBe(true)
    expect(H.stub.saveReciteProgress).not.toHaveBeenCalled()

    await clickText(wrapper, '已能背诵')

    expect(H.stub.saveReciteProgress).toHaveBeenCalledTimes(1)
    const saved = H.stub.saveReciteProgress.mock.calls[0][0]
    expect(saved.key).toBe(`chinese|${FILE_KEY}|0`)
    expect(saved.stage).toBe(1)
    expect(saved.lastCorrect).toBe(true)
    expect(saved.learnedAt).toBeTruthy()
    wrapper.unmount()
  })

  it('自评「还需练习」→ 也写一行，但 stage 归 0 / lastCorrect=false（二元自评到调度的映射）', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper } = await mountPiece('/recite/08/0/0')
    await waitFor(() => (wrapper.find('.rp-passage').exists() ? wrapper : null))

    await clickText(wrapper, '还需练习')

    expect(H.stub.saveReciteProgress).toHaveBeenCalledTimes(1)
    const saved = H.stub.saveReciteProgress.mock.calls[0][0]
    expect(saved.key).toBe(`chinese|${FILE_KEY}|0`)
    expect(saved.lastCorrect).toBe(false)
    expect(saved.stage).toBe(0)
    expect(saved.learnedAt).toBeFalsy() // 没背下来不算"已背"（A7：learned 只增不减的入口在这里被收紧）
    wrapper.unmount()
  })

  it('大冲关 manual=1 → 自评后仍**一行都不写**（I6/P0-9）', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper } = await mountPiece('/recite/08/0/0?manual=1')
    const ready = await waitFor(() => (wrapper.find('.rp-passage').exists() ? wrapper : null))
    expect(ready).toBeTruthy()
    expect(wrapper.text()).toContain('模拟考场')

    await clickText(wrapper, '已能背诵')

    expect(H.stub.saveReciteProgress).not.toHaveBeenCalled()
    expect(H.stub.saveReciteState).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('模拟完成，不计入进度')
    wrapper.unmount()
  })

  it('离开保护第一层：未自评时点返回 → 二次确认，确认后才回首页', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper, router } = await mountPiece('/recite/08/0/0')
    await waitFor(() => (wrapper.find('.rp-passage').exists() ? wrapper : null))

    // 点返回 → 弹二次确认，**不导航**
    await wrapper.find('.rp-back').trigger('click')
    expect(wrapper.find('.rp-confirm').exists()).toBe(true)
    expect(router.currentRoute.value.name).toBe('recite-piece')

    // 「继续背诵」→ 弹窗关闭，仍在本篇
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

  it('离开保护第二层：直接 router.push 也被守卫取消（未自评时不允许静默离开）', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper, router } = await mountPiece('/recite/08/0/0')
    await waitFor(() => (wrapper.find('.rp-passage').exists() ? wrapper : null))

    await router.push('/recite')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('recite-piece')
    expect(wrapper.find('.rp-confirm').exists()).toBe(true)
    wrapper.unmount()
  })

  it('已自评（不会再丢东西）→ 点返回不弹确认，直接回首页', async () => {
    H.bank = makeBank(PIECE_TITLE)
    H.page = makePage(PIECE_TITLE)

    const { wrapper, router } = await mountPiece('/recite/08/0/0')
    await waitFor(() => (wrapper.find('.rp-passage').exists() ? wrapper : null))
    await clickText(wrapper, '已能背诵')

    await wrapper.find('.rp-back').trigger('click')
    await flushPromises()
    expect(wrapper.find('.rp-confirm').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('recite')
    wrapper.unmount()
  })
})

// ═══════════════ 判分零代码（I5 在"不判分"方案下的新含义） ═══════════════
describe('判分零代码：单篇页不得引入 cloze 判分链', () => {
  it('RecitePieceView.vue 源码里不出现 ClozeBlock / gradeCloze / clozeJudge / cloze-input（注释除外）', () => {
    const raw = readFileSync(
      join(process.cwd(), 'src', 'views', 'RecitePieceView.vue'),
      'utf8'
    )
    // 先剥注释：该文件的注释正在解释"为什么不渲染 ClozeBlock"，不剥会把说明文字当成违规代码
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
    expect(src).not.toMatch(/ClozeBlock/)
    expect(src).not.toMatch(/gradeCloze/)
    expect(src).not.toMatch(/clozeJudge/)
    expect(src).not.toMatch(/cloze-input/)
    // 负断言的自我校验：自评（唯一写入点）必须在源码里存在 —— 否则说明读错文件了
    expect(src).toMatch(/onSelfCheck/)
    expect(src).toMatch(/submitResult/)
  })

  it('就绪态 DOM 里没有任何 cloze 输入框（自评是唯一交互，不存在"填了再判"）', async () => {
    H.bank = sanitizeBank({
      schemaVersion: 1,
      contentVersion: 4,
      generatedAt: '2026-01-01T00:00:00.000Z',
      subject: 'chinese',
      counts: { all: 1, lesson: 1, review: 0 },
      pieces: [
        {
          key: 'chinese|chinese_08_97-判分零代码|0',
          order: 0,
          role: 'lesson',
          unitNum: '08',
          fileIndex: 0,
          blockIndex: 0,
          fileKey: 'chinese_08_97-判分零代码',
          fileTitle: '背诵专项 · 判分零代码',
          unitTitle: '背诵专项',
          title: '判分零代码样例',
          paragraphs: ['烟笼寒水月笼沙（yān lǒng hán shuǐ yuè lǒng shā）。'],
          fp: 'fpzc'
        }
      ]
    })
    H.page = {
      blocks: [
        {
          type: 'knowledge',
          title: '判分零代码样例',
          paragraphs: ['烟笼寒水月笼沙（yān lǒng hán shuǐ yuè lǒng shā）。']
        }
      ]
    }

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/recite', name: 'recite', component: { template: '<div class="stub-home" />' } },
        {
          path: '/recite/:unitNum/:fileIndex/:blockIndex',
          name: 'recite-piece',
          component: RecitePieceView
        }
      ]
    })
    await router.push('/recite/08/0/0')
    await router.isReady()
    const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router, createPinia()] } })
    const ready = await (async () => {
      for (let i = 0; i < 100; i += 1) {
        if (wrapper.find('.rp-passage').exists()) return true
        await flushPromises()
        await new Promise((r) => setTimeout(r, 10))
      }
      return false
    })()

    expect(ready, '未能进入朗读态').toBe(true)
    expect(wrapper.findComponent(ClozeBlock).exists()).toBe(false)
    expect(wrapper.find('.cloze-input').exists()).toBe(false)
    expect(wrapper.find('.rp-selfcheck').exists()).toBe(true)
    wrapper.unmount()
  })
})

// ═══════════════ 背诵首页（store 集成冒烟） ═══════════════
describe('ReciteView 首页：视图只读 viewModel（分母取产物 counts.lesson）', () => {
  const FILE_KEY = 'chinese_08_98-首页样例'
  /** 篇目正文（形态与真实内容一致：整篇原文 + 内联注音） */
  const LESSON_PARAGRAPHS = ['蒹葭苍苍（jiān jiā cāng cāng），白露为霜（bái lù wéi shuāng）。']
  const LESSON_CHARS = LESSON_PARAGRAPHS.join('').length

  /**
   * 造一份「3 lesson + 1 review(trigger:all)」的产物。
   * `counts` 里 lesson=3 —— 视图分母必须**取它**，不许硬编码 64。
   */
  function makeHomeBank() {
    const lesson = (order, title) => ({
      key: `chinese|${FILE_KEY}|${order}`,
      order,
      role: 'lesson',
      unitNum: '08',
      fileIndex: 0,
      blockIndex: order,
      fileKey: FILE_KEY,
      fileTitle: '背诵专项 · 首页样例',
      unitTitle: '背诵专项',
      title,
      paragraphs: LESSON_PARAGRAPHS,
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
          unitNum: '08',
          fileIndex: 0,
          blockIndex: 9,
          fileKey: FILE_KEY,
          fileTitle: '背诵专项 · 首页样例',
          unitTitle: '背诵专项',
          title: '综合大冲关（模拟考场）',
          paragraphs: LESSON_PARAGRAPHS,
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
      // 篇幅标签由「N 空」改为「N 字」（不挖空了就没有"空"可报）
      expect(wrapper.find('.rc-piece__tags').text()).toContain(`${LESSON_CHARS} 字`)
      expect(wrapper.text()).not.toContain('空')
      // 无到期 → 待重默分区整块不渲染（不留空白卡）
      expect(wrapper.find('.rc-due').exists()).toBe(false)
      // 底部常驻大冲关（句数取产物的时代已过去，文案不再带句数）
      expect(wrapper.text()).toContain('综合大冲关（模拟考场）')
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

// ═══════════════ 路由可达性 + 4 Tab 不变 ═══════════════
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
