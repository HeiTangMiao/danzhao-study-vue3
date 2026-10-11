// @vitest-environment jsdom
/**
 * 作品训练卡（workcard）测试 —— 批 F · F-2 / Fc5
 *
 * 覆盖：
 *  A. H5 五处接线：schema 枚举 + allOf 分支 / content.d.ts BlockType·Block 联合 / blockTypes.js / registry
 *  B. 三遍勾选：默认标题、三勾渲染、进度 0/3→3/3、取消回退
 *  C. 第三勾启动倒计时（fake timers）：秒数递减、到点展示「到点」提示（deadline 校准，非累减）
 *  D. 持久化：page_progress 缺行时不抢建；有行时 spread 写 workcards 子键并回读；挂载回读
 *  E. 浏览态契约：不判分、不写错题本、不发 XP（源码级断言）；useCountdown 为 deadline 口径
 *
 * 说明：默认 environment 是 node，本文件用 docblock 切 jsdom；
 *      IndexedDB 走 fake-indexeddb（与 studyDbV7 同款），倒计时用 vitest fake timers。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import WorkCardBlock from '@/components/blocks/WorkCardBlock.vue'
import { useStudyDbStore } from '@/stores/studyDb'
import { useCountdown } from '@/composables/useCountdown'
import { createBlockValidator } from '@/utils/validateBlock'
import { BLOCK_TYPES_META } from '@/components/blocks/blockTypes'

const ROOT = process.cwd()
const schema = JSON.parse(readFileSync(join(ROOT, 'schema', 'content-schema.json'), 'utf-8'))
const validateBlock = createBlockValidator(schema)

/** 只关心勾选与倒计时逻辑，图标集 stub 掉 */
const STUBS = { AppIcon: true }

/** 真实事件循环推进（fake-indexeddb 用宏任务调度，microtask 冲不干净） */
async function flush(times = 25) {
  for (let i = 0; i < times; i++) await new Promise((r) => setTimeout(r, 0))
}

function mountCard(block, context = {}) {
  return mount(WorkCardBlock, { props: { block, context }, global: { stubs: STUBS } })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

// ============================================================================
// A. H5 五处接线
// ============================================================================
describe('A. workcard 五处接线一致性', () => {
  it('schema block.type.enum 含 workcard，且有 allOf 字段分支', () => {
    expect(schema.definitions.block.properties.type.enum).toContain('workcard')
    const branch = schema.definitions.block.allOf.find(
      (b) => b.if?.properties?.type?.const === 'workcard'
    )
    expect(branch).toBeTruthy()
    expect(Object.keys(branch.then.properties)).toEqual(['intro', 'duration'])
  })

  it('content.d.ts 的 BlockType 与 Block 联合均含 workcard', () => {
    const dts = readFileSync(join(ROOT, 'src', 'types', 'content.d.ts'), 'utf-8')
    const blockTypeUnion = dts.split('export type BlockType =')[1].split('export type')[0]
    expect(blockTypeUnion).toMatch(/'workcard'/)
    const blockUnion = dts.split('export type Block =')[1].split('export interface')[0]
    expect(blockUnion).toMatch(/WorkCardBlock/)
  })

  it('blockTypes.js 登记了中文名 / 图标 / 内容角色', () => {
    expect(BLOCK_TYPES_META.workcard).toEqual({
      label: '作品训练卡', icon: 'timer', kind: 'practice'
    })
  })

  it('registry 把 workcard 绑定到渲染组件', async () => {
    const { componentOf } = await import('@/components/blocks/registry')
    expect(componentOf('workcard')).toBeTruthy()
  }, 30000)

  it('workcard 无必填字段（除 type）—— 校验器放行空卡', () => {
    expect(validateBlock({ type: 'workcard' })).toEqual([])
    expect(validateBlock({ type: 'workcard', title: '作品卡', intro: '三遍法', duration: 900 })).toEqual([])
  })
})

// ============================================================================
// B. 三遍勾选
// ============================================================================
describe('B. 三遍勾选（浏览态自测清单）', () => {
  it('默认标题为「作品训练卡」，渲染三勾与 initial 进度 0/3', () => {
    const w = mountCard({ type: 'workcard' })
    expect(w.find('.workcard__title').text()).toBe('作品训练卡')
    expect(w.findAll('.workcard__box')).toHaveLength(3)
    expect(w.find('.workcard__progress').text()).toBe('0/3')
    w.unmount()
  })

  it('自定义标题与 intro 均渲染', () => {
    const w = mountCard({ type: 'workcard', title: 'PS 图层卡', intro: '限时 15 分钟完成三遍' })
    expect(w.find('.workcard__title').text()).toBe('PS 图层卡')
    expect(w.find('.workcard__intro').text()).toBe('限时 15 分钟完成三遍')
    w.unmount()
  })

  it('依次勾选 → 进度递增到 3/3 并标记达成；再取消 → 回退', async () => {
    const w = mountCard({ type: 'workcard' })
    const boxes = () => w.findAll('.workcard__box')
    await boxes()[0].trigger('click')
    expect(w.find('.workcard__progress').text()).toBe('1/3')
    await boxes()[1].trigger('click')
    await boxes()[2].trigger('click')
    expect(w.find('.workcard__progress').text()).toBe('3/3')
    expect(w.find('.workcard__progress').classes()).toContain('is-done')
    await boxes()[0].trigger('click') // 取消第一遍
    expect(w.find('.workcard__progress').text()).toBe('2/3')
    w.unmount()
  })

  it('勾选状态经 aria-pressed 暴露（可访问性）', async () => {
    const w = mountCard({ type: 'workcard' })
    const box = w.findAll('.workcard__box')[0]
    expect(box.attributes('aria-pressed')).toBe('false')
    await box.trigger('click')
    expect(w.findAll('.workcard__box')[0].attributes('aria-pressed')).toBe('true')
    w.unmount()
  })
})

// ============================================================================
// C. 第三勾启动倒计时（fake timers / deadline 校准）
// ============================================================================
describe('C. 第三遍「限时独立做」倒计时', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('勾选第三遍 → 倒计时启动并显示限时；到点 → 展示「到点」提示', async () => {
    const w = mountCard({ type: 'workcard', duration: 5 })
    expect(w.find('[data-testid="wc-timeup"]').exists()).toBe(false)

    await w.findAll('.workcard__box')[2].trigger('click')
    await w.vm.$nextTick()
    expect(w.find('.workcard__time').text()).toBe('00:05')

    vi.advanceTimersByTime(2000)
    await w.vm.$nextTick()
    expect(w.find('.workcard__time').text()).toBe('00:03')

    vi.advanceTimersByTime(3000) // 到点
    await w.vm.$nextTick()
    expect(w.find('[data-testid="wc-timeup"]').exists()).toBe(true)
    expect(w.find('[data-testid="wc-timeup"]').text()).toBe('到点')
    expect(w.find('[data-testid="wc-done-note"]').exists()).toBe(true)
    w.unmount()
  })

  it('到点口径为 deadline 差值：中途「后台」跳时不漂移（一次跨越多秒仍精确）', async () => {
    const w = mountCard({ type: 'workcard', duration: 10 })
    await w.findAll('.workcard__box')[2].trigger('click')
    await w.vm.$nextTick()
    // 模拟标签页被节流：一次跳 6 秒（若为 timeLeft-- 累减，只会减 1 秒 → 偏大）
    vi.advanceTimersByTime(6000)
    await w.vm.$nextTick()
    expect(w.find('.workcard__time').text()).toBe('00:04')
    w.unmount()
  })

  it('取消第三遍 → 倒计时停止、计时区隐藏', async () => {
    const w = mountCard({ type: 'workcard', duration: 5 })
    await w.findAll('.workcard__box')[2].trigger('click')
    await w.vm.$nextTick()
    expect(w.find('.workcard__timer').exists()).toBe(true)
    await w.findAll('.workcard__box')[2].trigger('click') // 取消
    await w.vm.$nextTick()
    expect(w.find('.workcard__timer').exists()).toBe(false)
    w.unmount()
  })

  it('useCountdown 内核：deadline 校准（跳时不漂移）+ 幂等 stop', async () => {
    const { timeLeft, running, start, stop } = useCountdown(0)
    start(5)
    expect(timeLeft.value).toBe(5)
    expect(running.value).toBe(true)
    vi.advanceTimersByTime(2000)
    expect(timeLeft.value).toBe(3)
    stop()
    expect(running.value).toBe(false)
    vi.advanceTimersByTime(5000) // 停止后不再变化
    expect(timeLeft.value).toBe(3)
  })
})

// ============================================================================
// D. 持久化（page_progress 零升版）
// ============================================================================
describe('D. 持久化到 page_progress（spread 加字段，零 DB 升版）', () => {
  it('该页尚无进度行时不抢建（persist 早退，不污染 page_progress）', async () => {
    const store = useStudyDbStore()
    await store.init()
    const KEY = 'computer_99_noworkcard'
    expect(await store.getPageProgress(KEY)).toBeNull()

    const w = mountCard({ type: 'workcard', title: '卡X' }, { fileKey: KEY })
    await w.findAll('.workcard__box')[0].trigger('click')
    await flush()

    expect(await store.getPageProgress(KEY)).toBeNull()
    w.unmount()
  })

  it('已有进度行时 spread 写入 workcards 子键，且原字段保留（经 store 回读）', async () => {
    const store = useStudyDbStore()
    await store.init()
    const KEY = 'computer_98_workcard'
    await store.savePageProgress({
      key: KEY, subject: 'computer', unitNum: '98',
      visited: true, questionsAnswered: 3, questionsTotal: 0, testScore: null
    })

    const w = mountCard({ type: 'workcard', title: '卡A', duration: 900 }, { fileKey: KEY })
    await w.findAll('.workcard__box')[0].trigger('click') // 第一遍
    await w.findAll('.workcard__box')[1].trigger('click') // 第二遍
    await flush()

    const row = await store.getPageProgress(KEY)
    expect(row.workcards['卡A']).toEqual({ guided: true, restore: true, timed: false })
    // 零升版：原字段原样保留（spread 展开）
    expect(row.visited).toBe(true)
    expect(row.questionsAnswered).toBe(3)
    expect(row.subject).toBe('computer')
    w.unmount()
  })

  it('挂载时回读已存勾选状态（页面重进不丢）', async () => {
    const store = useStudyDbStore()
    await store.init()
    const KEY = 'computer_97_workcard'
    await store.savePageProgress({
      key: KEY, subject: 'computer', unitNum: '97',
      visited: true, questionsAnswered: 0, questionsTotal: 0, testScore: null,
      workcards: { 卡B: { guided: true, restore: false, timed: false } }
    })

    const w = mountCard({ type: 'workcard', title: '卡B' }, { fileKey: KEY })
    await flush()
    await w.vm.$nextTick()

    expect(w.find('.workcard__progress').text()).toBe('1/3')
    expect(w.findAll('.workcard__box')[0].classes()).toContain('is-on')
    expect(w.findAll('.workcard__box')[1].classes()).not.toContain('is-on')
    w.unmount()
  })

  it('无 fileKey（如缺上下文）时不触库、不抛错', async () => {
    const w = mountCard({ type: 'workcard' }, {})
    await w.findAll('.workcard__box')[0].trigger('click')
    await flush()
    expect(w.find('.workcard__progress').text()).toBe('1/3')
    w.unmount()
  })
})

// ============================================================================
// E. 浏览态契约（源码级，与 H3 同款纪律）
// ============================================================================
describe('E. 浏览态契约与计时口径（源码级钉死）', () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/^[ \t]*\/\/.*$/gm, '')

  it('WorkCardBlock 不判分 / 不写错题本 / 不记账（浏览态）', () => {
    const src = strip(readFileSync(join(ROOT, 'src', 'components', 'blocks', 'WorkCardBlock.vue'), 'utf-8'))
    expect(src).not.toMatch(/recordError|recordAnswered|recordTest|updateDailyStat|error_book/)
  })

  it('WorkCardBlock 不改动 ExamBlock / PracticeSession（本批只登记，不迁移）', () => {
    const src = readFileSync(join(ROOT, 'src', 'components', 'blocks', 'WorkCardBlock.vue'), 'utf-8')
    expect(src).not.toMatch(/ExamBlock|PracticeSession/)
  })

  it('useCountdown 用 deadline 校准，禁止 timeLeft-- 累减', () => {
    const src = strip(readFileSync(join(ROOT, 'src', 'composables', 'useCountdown.js'), 'utf-8'))
    expect(src).toMatch(/deadline\s*=\s*Date\.now\(\)/)
    expect(src).toMatch(/Math\.ceil\(\(deadline - Date\.now\(\)\)/)
    expect(src).not.toMatch(/timeLeft--|timeLeft\s*--|timeLeft -=/)
  })

  it('WorkCardBlock 只 import useCountdown / studyDb / AppIcon（依赖最小面）', () => {
    const src = readFileSync(join(ROOT, 'src', 'components', 'blocks', 'WorkCardBlock.vue'), 'utf-8')
    const imports = [...src.matchAll(/import\s+.*?from\s+'([^']+)'/g)].map((m) => m[1])
    expect(imports.sort()).toEqual(
      ['@/components/AppIcon.vue', '@/composables/useCountdown', '@/stores/studyDb', 'vue'].sort()
    )
  })
})
