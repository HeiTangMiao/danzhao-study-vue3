// @vitest-environment jsdom
/**
 * 限时仿真三档测试（批 D D-1，P0-5）
 *
 * 覆盖（batch-d-tasks D-1 测试要点 ①–⑨）：
 *  - ① TIMED_PRESETS 三档数值（count/durationMin/includeExam/maxPerPage）
 *  - ② 扩池：t150 全科混卷 + includeExam:true + maxPerPage:5，题量 150
 *  - ③ per-page 上限：任一 fileKey 出现次数 ≤ maxPerPage
 *  - ④ 限时不串 draft.count
 *  - ⑤ 到点自动交卷（deadline 校准，fake timers）
 *  - ⑥ 提前交卷（未答完 → 二次确认 → phase=result）
 *  - ⑦ ≤14 天提示（5 天 / 20 天 / 首次）
 *  - ⑧ H3 回归：resultStats 仍分 autoCount/selfCount 两行（未合并）
 *  - ⑨ 结算复用：非限时会话不出 ≤14 天块
 *
 * jsdom 陷阱（本项目已固化）：不用 fileURLToPath(new URL(...))；MathJaxRender / useKatex 走 stub/mock。
 * 题库加载走 vi.mock（返回合成条目，避开 fetch）；studyDb 走 fake-indexeddb。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

// KaTeX 动态 import mock（组件级测试不渲染真实公式）
vi.mock('@/composables/useKatex', () => ({
  warmKatex: () => Promise.resolve(null),
  isKatexReady: () => false,
  renderMath: (t) => String(t ?? ''),
  renderPlainFallback: (t) => String(t ?? ''),
  engineVersion: { value: 0 },
  typesetMath: () => Promise.resolve()
}))

// 题库加载 mock：三学科各 600 条，题目落在有限页码上（便于验证 maxPerPage），部分为 exam
vi.mock('@/utils/practiceBankClient', async () => {
  const build = (subject) =>
    Array.from({ length: 600 }, (_, i) => {
      const unit = String(Math.floor(i / 100)).padStart(2, '0')
      const page = Math.floor((i % 100) / 8)
      const fk = `${subject}_${unit}_p${page}`
      return {
        key: `${unit}/0/${page}/${i}`,
        subject,
        unitNum: unit,
        unitTitle: `${subject}单元`,
        fileIndex: 0,
        fileKey: fk,
        fileTitle: '页',
        blockTitle: '',
        question: `${subject} 题 ${i}`,
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        answer: `解析 ${i}`,
        difficulty: ['basic', 'medium', 'advanced'][i % 3],
        gradable: true,
        source: i % 40 === 0 ? 'exam' : 'quiz',
        kp: fk
      }
    })
  return {
    loadBankIndex: async () => ({ total: 1800, subjects: {}, examPapers: [] }),
    loadSubjectBank: async (subject) => build(subject)
  }
})

// 记录 composePaper 调用参数（验证 startTimed 传了 includeExam/maxPerPage）
const { composeCalls } = vi.hoisted(() => ({ composeCalls: [] }))
vi.mock('@/utils/composePaper', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    composePaper: (items, opt) => {
      composeCalls.push(opt || {})
      return actual.composePaper(items, opt)
    }
  }
})

import { usePracticeStore, TIMED_PRESETS } from '@/stores/practice'
import { composePaper } from '@/utils/composePaper'
import PracticeSession from '@/views/practice/PracticeSession.vue'
import PracticeResult from '@/views/practice/PracticeResult.vue'

const MJ_STUB = { props: ['text', 'block'], template: '<span class="mj-stub">{{ text }}</span>' }

/** 合成运行时条目 */
function makeQ(i, { gradable = true } = {}) {
  return {
    key: `01/0/0/${i}`,
    subject: 'math',
    unitNum: '01',
    unitTitle: '单元',
    fileIndex: 0,
    fileKey: `math_01_p${i}`,
    fileTitle: '页',
    blockTitle: '',
    question: `题干 ${i}`,
    options: gradable ? ['A', 'B', 'C', 'D'] : null,
    correctIndex: gradable ? 0 : undefined,
    answer: `解析 ${i}`,
    difficulty: 'basic',
    gradable,
    source: 'quiz',
    kp: `math_01_p${i}`
  }
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/practice', name: 'practice', component: { template: '<div/>' } },
      { path: '/error-book', name: 'error-book', component: { template: '<div/>' } },
      // PracticeResult 的「回看知识点」router-link 目标（缺了会打印 no-match 警告）
      { path: '/study/:subject/:unitNum/:fileIndex?', name: 'unit', component: { template: '<div/>' } }
    ]
  })
}

describe('D-1 TIMED_PRESETS 三档（①）', () => {
  it('三档数值正确，仅 150 档 includeExam，maxPerPage 提案 3/4/5', () => {
    expect(TIMED_PRESETS.map((p) => [p.count, p.durationMin])).toEqual([
      [25, 10],
      [50, 20],
      [150, 60]
    ])
    expect(TIMED_PRESETS.map((p) => p.maxPerPage)).toEqual([3, 4, 5])
    expect(TIMED_PRESETS.filter((p) => p.includeExam).map((p) => p.id)).toEqual(['t150'])
    // id 唯一且 label 含题量与分钟数（视图直接用 label，不内联数值）
    expect(new Set(TIMED_PRESETS.map((p) => p.id)).size).toBe(3)
    for (const p of TIMED_PRESETS) {
      expect(p.label).toContain(String(p.count))
      expect(p.label).toContain(String(p.durationMin))
    }
  })
})

describe('D-1 startTimed（②④）', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    localStorage.clear()
    composeCalls.length = 0
  })

  it('② t150 全科混卷 + includeExam/maxPerPage 传参正确 + 题量 150', async () => {
    await store.startTimed('t150')
    expect(store.phase).toBe('session')
    expect(store.session.timed).toBe(true)
    expect(store.session.durationSec).toBe(3600)
    expect(store.session.questions).toHaveLength(150)
    // 全科混卷：subject='all' 且结果覆盖多学科
    expect(store.session.subject).toBe('all')
    expect(new Set(store.session.questions.map((q) => q.subject)).size).toBeGreaterThanOrEqual(2)
    // 组卷参数按档位传参（单一来源 TIMED_PRESETS）
    const last = composeCalls.at(-1)
    expect(last.includeExam).toBe(true)
    expect(last.maxPerPage).toBe(5)
    expect(last.count).toBe(150)
    expect(last.weightDimension).toBe('kp')
    // deadline = 会话开始 + durationSec（毫秒戳），用于校准倒计时
    expect(store.session.deadline).toBeGreaterThan(Date.now())
    expect(store.session.deadline - store.session.startedAt).toBeGreaterThan(3590 * 1000)
  })

  it('② 25 档：includeExam 默认 false、题量 25', async () => {
    await store.startTimed('t25')
    expect(store.session.questions).toHaveLength(25)
    const last = composeCalls.at(-1)
    expect(last.includeExam).toBe(false)
    expect(last.maxPerPage).toBe(3)
    expect(store.session.durationSec).toBe(600)
  })

  it('④ 限时档位不串 draft.count：改 draft.count 不影响 startTimed 题量', async () => {
    store.draft.count = 5
    await store.startTimed('t25')
    expect(store.session.questions).toHaveLength(25) // 取档位，不取 draft.count
  })

  it('未知档位抛错', async () => {
    await expect(store.startTimed('t999')).rejects.toThrow(/未知限时档位/)
  })
})

describe('D-1 per-page 抽取上限（③）', () => {
  // 30 页 × 每页 10 条 = 300 条（同一 fileKey 下 10 条）
  const pool = Array.from({ length: 300 }, (_, i) => ({
    ...makeQ(i),
    key: `k${i}`,
    fileKey: `math_01_page${Math.floor(i / 10)}`
  }))

  it('maxPerPage 生效：每页最多留 5 条（poolSize 收窄到 30×5=150），结果每页 ≤5', () => {
    const { questions, poolSize } = composePaper(pool, {
      count: 150,
      includeExam: true,
      maxPerPage: 5,
      seed: 1
    })
    expect(poolSize).toBe(150) // 上限确定性收窄候选池
    expect(questions).toHaveLength(150)
    const byFk = {}
    for (const q of questions) byFk[q.fileKey] = (byFk[q.fileKey] || 0) + 1
    expect(Math.max(...Object.values(byFk))).toBeLessThanOrEqual(5)
  })

  it('缺省 maxPerPage（null）不改既有行为：候选池不收窄', () => {
    const { poolSize } = composePaper(pool, { count: 150, includeExam: true, seed: 1 })
    expect(poolSize).toBe(300)
  })
})

describe('D-1 结算 H3 回归（⑧）', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePracticeStore()
  })

  it('限时会话结束后 resultStats 仍两行（自动判 / 自评），不合并', async () => {
    store.startSession({
      mode: 'timed',
      title: '限时仿真',
      subject: 'all',
      unitNums: [],
      questions: [makeQ(0), makeQ(1, { gradable: false })],
      timed: true,
      durationSec: 600,
      simPrevAt: null
    })
    store.pickOption(0) // 自动判答对
    await store.assess('known')
    store.next()
    store.revealAnswer()
    await store.assess('unknown') // 自评不会
    store.next() // 最后一题 → 结算
    expect(store.phase).toBe('result')
    const st = store.resultStats
    expect(st.autoCount).toBe(1)
    expect(st.selfCount).toBe(1)
    expect(st.autoCount + st.selfCount).toBe(st.answered)
    expect(st.total).toBe(2)
  })
})

describe('D-1 会话倒计时 / 交卷（⑤⑥）', () => {
  let store
  let pinia
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = usePracticeStore()
  })

  function startTimedSession(deadlineOffsetMs) {
    store.startSession({
      mode: 'timed',
      title: '限时仿真',
      subject: 'math',
      unitNums: ['01'],
      questions: [makeQ(0), makeQ(1), makeQ(2)],
      timed: true,
      durationSec: 600,
      simPrevAt: null
    })
    store.session.deadline = Date.now() + deadlineOffsetMs
  }

  async function mountSession() {
    const router = makeRouter()
    router.push('/practice')
    await router.isReady()
    const wrapper = mount(PracticeSession, {
      global: {
        plugins: [pinia, router],
        stubs: { MathJaxRender: MJ_STUB, ReasonChips: true }
      }
    })
    return wrapper
  }

  it('⑤ 到点自动交卷：deadline 已过 → 推进计时器 → phase=result', async () => {
    vi.useFakeTimers()
    try {
      startTimedSession(-1000) // deadline 已在过去
      const wrapper = await mountSession()
      expect(store.phase).toBe('session')
      vi.advanceTimersByTime(1000)
      expect(store.phase).toBe('result')
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('⑥ 提前交卷：未答完 → 二次确认 → phase=result（未答按未答计入）', async () => {
    startTimedSession(600000)
    const wrapper = await mountSession()
    expect(wrapper.find('.ps-btn--submit').exists()).toBe(true)
    await wrapper.find('.ps-btn--submit').trigger('click')
    // 有未答题 → 出二次确认，不直接交卷
    expect(wrapper.find('.ps-confirm__ok').exists()).toBe(true)
    expect(store.phase).toBe('session')
    await wrapper.find('.ps-confirm__ok').trigger('click')
    expect(store.phase).toBe('result')
    expect(store.resultStats.answered).toBe(0) // 未答不计入已作答
    wrapper.unmount()
  })
})

describe('D-1 结算「≤14 天」提示（⑦⑨）', () => {
  let store
  let pinia
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    store = usePracticeStore()
  })

  async function mountResult() {
    const router = makeRouter()
    router.push('/practice')
    await router.isReady()
    return mount(PracticeResult, {
      global: { plugins: [pinia, router], stubs: { MathJaxRender: MJ_STUB } }
    })
  }

  it('⑦ 距上次 5 天 → 温和提示「距上次仿真 5 天」「建议间隔 ≥ 14 天」', async () => {
    store.startSession({
      mode: 'timed', title: '限时仿真', subject: 'all', unitNums: [],
      questions: [makeQ(0)], timed: true, durationSec: 600,
      simPrevAt: Date.now() - 5 * 86400000
    })
    store.finishSession()
    const wrapper = await mountResult()
    expect(wrapper.find('.presult-sim').exists()).toBe(true)
    const txt = wrapper.text()
    expect(txt).toContain('距上次仿真 5 天')
    expect(txt).toContain('建议间隔 ≥ 14 天')
    wrapper.unmount()
  })

  it('⑦ 距上次 20 天 → 提示「可以再进行仿真」', async () => {
    store.startSession({
      mode: 'timed', title: '限时仿真', subject: 'all', unitNums: [],
      questions: [makeQ(0)], timed: true, durationSec: 600,
      simPrevAt: Date.now() - 20 * 86400000
    })
    store.finishSession()
    const wrapper = await mountResult()
    expect(wrapper.text()).toContain('可以再进行仿真')
    wrapper.unmount()
  })

  it('⑦ 首次仿真（无 simPrevAt）→ 首次提示', async () => {
    store.startSession({
      mode: 'timed', title: '限时仿真', subject: 'all', unitNums: [],
      questions: [makeQ(0)], timed: true, durationSec: 600, simPrevAt: null
    })
    store.finishSession()
    const wrapper = await mountResult()
    expect(wrapper.text()).toContain('首次限时仿真')
    wrapper.unmount()
  })

  it('⑨ 非限时会话：不出 ≤14 天块（结算复用既有面板，不额外提示）', async () => {
    store.startSession({
      mode: 'unit', title: '单元练习', subject: 'math', unitNums: ['01'],
      questions: [makeQ(0)], compose: null
    })
    store.finishSession()
    const wrapper = await mountResult()
    expect(wrapper.find('.presult-sim').exists()).toBe(false)
    wrapper.unmount()
  })

  it('⑨ 限时会话走 store.startTimed 时会写入 sim_last_at（P-D5）', async () => {
    await store.startTimed('t25')
    expect(localStorage.getItem('sim_last_at')).toBeTruthy()
    expect(Number.isFinite(Number(localStorage.getItem('sim_last_at')))).toBe(true)
  })
})
