// @vitest-environment jsdom
/**
 * cloze 默写错句入队测试（批 B B-4）
 * 覆盖（batch-b-tasks B-4 测试要点 ①–⑥）：
 *  - ① 含错空的句子 → error_book 新增行，含 source:'cloze' 与 SM-2 初始字段
 *  - ② 重默再错 → duplicated，行数不变、wrongCount 自增
 *  - ③ 全对提交 → error_book 无新增
 *  - ④ 复习队列可见性：loadDueReviews 结果包含该行（SM-2 打通锚定）
 *  - ⑤ recordAnswered 计数：当日 daily_stats.questionsAnswered 增加
 *  - ⑥ context 无 fileKey → 不入队、无异常
 *
 * 隔离策略（fake-indexeddb 跨用例残留 + 入库经多个宏任务）：
 *  - 每个用例用**唯一 fileKey + 唯一题干标记**，断言只统计本用例的行
 *  - 入库完成用**轮询等待**判定，不依赖固定 sleep
 *  - beforeEach 先「排空」在途写入再清库，避免上一用例的迟到写入污染
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ClozeBlock from '@/components/blocks/ClozeBlock.vue'
import { useStudyDbStore } from '@/stores/studyDb'
import { useSpacedReview } from '@/composables/useSpacedReview'

/** 本日日期串（与 studyDb.getDateStr 同口径，本地时区） */
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 轮询等待：谓词成立即返回其值，超时返回最后一次结果 */
async function waitUntil(check, timeout = 5000) {
  const t0 = Date.now()
  for (;;) {
    const v = await check()
    if (v) return v
    if (Date.now() - t0 > timeout) return v
    await new Promise((r) => setTimeout(r, 20))
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let seq = 0
/** 每个用例独占 fileKey，断言时只统计本用例的行 */
function ctxFor() {
  seq += 1
  return {
    subject: 'chinese',
    unitNum: '07',
    fileKey: `chinese_07_e2e_${seq}`,
    fileTitle: '默写专项',
    unitTitle: '默写专项'
  }
}

/** 三句默写（题干带唯一标记 marker，便于按用例过滤错题行） */
function threeSentences(marker) {
  return [
    { text: `{{不亦说乎}}，不亦乐乎。${marker}` },
    { text: `{{学而不思则罔}}，思而不学则殆。${marker}` },
    { text: `{{三人行必有我师焉}}。${marker}` }
  ]
}

function mountDictation(items, context) {
  return mount(ClozeBlock, {
    props: { block: { type: 'cloze', mode: 'input', title: '默写', items }, context }
  })
}

describe('cloze 默写错句入队（B-4）', () => {
  let db

  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await sleep(120) // 排空上一用例可能仍在途的写入
    await db.clearAllErrors()
  })

  /** 本用例标记对应的错题行 */
  async function mine(marker) {
    const all = await db.getAllErrors()
    return all.filter((e) => String(e.question).includes(marker))
  }

  it('① 2 句含错空 → error_book 增 2 行，含 source:cloze 与 SM-2 初始字段', async () => {
    const ctx = ctxFor()
    const marker = `M1_${ctx.fileKey}`
    const wrapper = mountDictation(threeSentences(marker), ctx)
    const inputs = wrapper.findAll('.cloze-input')
    await inputs[0].setValue('不亦悦乎') // 对（通假：说/悦）
    await inputs[1].setValue('学而时习之') // 错
    await inputs[2].setValue('') // 错（未作答）
    await wrapper.find('.cloze-btn--primary').trigger('click')

    const errors = await waitUntil(async () => {
      const es = await mine(marker)
      return es.length === 2 ? es : null
    })
    expect(errors).toHaveLength(2)
    for (const e of errors) {
      expect(e.source).toBe('cloze')
      expect(e.subject).toBe('chinese')
      expect(e.fileKey).toBe(ctx.fileKey)
      expect(e.reviewed).toBe(false)
      expect(e.easeFactor).toBe(2.5)
      expect(e.wrongCount).toBe(1)
      expect(e.nextReviewDate).toBe(todayStr())
      expect(e.explanation).toBe('默写专项')
    }
    // 题面为原句（含 {{}} 标记），userAnswer 为实际输入
    const first = errors.find((e) => e.question.includes('学而不思则罔'))
    expect(first).toBeTruthy()
    expect(first.userAnswer).toBe('学而时习之')
    const unanswered = errors.find((e) => e.question.includes('三人行必有我师焉'))
    expect(unanswered.userAnswer).toBe('默写未作答')
    wrapper.unmount()
  })

  it('② 重默再错 → duplicated：行数不变、wrongCount 自增', async () => {
    const ctx = ctxFor()
    const marker = `M2_${ctx.fileKey}`
    const wrapper = mountDictation(threeSentences(marker), ctx)
    const submitWrongOnce = async () => {
      const inputs = wrapper.findAll('.cloze-input')
      for (const el of inputs) await el.setValue('全错')
      await wrapper.find('.cloze-btn--primary').trigger('click')
    }
    await submitWrongOnce()
    const afterFirst = await waitUntil(async () => {
      const es = await mine(marker)
      return es.length === 3 && es.every((e) => e.wrongCount === 1) ? es : null
    })
    expect(afterFirst).toHaveLength(3)

    await submitWrongOnce() // 全部重默后再次全错
    const afterSecond = await waitUntil(async () => {
      const es = await mine(marker)
      return es.length === 3 && es.every((e) => e.wrongCount === 2) ? es : null
    })
    expect(afterSecond).toHaveLength(3) // 不产生重复行
    wrapper.unmount()
  })

  it('③ 全对提交 → error_book 无新增', async () => {
    const ctx = ctxFor()
    const marker = `M3_${ctx.fileKey}`
    const wrapper = mountDictation(threeSentences(marker), ctx)
    const inputs = wrapper.findAll('.cloze-input')
    await inputs[0].setValue('不亦说乎')
    await inputs[1].setValue('学而不思则罔')
    await inputs[2].setValue('三人行必有我师焉')
    await wrapper.find('.cloze-btn--primary').trigger('click')

    // 等到逐空判定与「无错句即不入队」流程走完：判全对即提交处理完成的可观测信号
    await waitUntil(() => wrapper.findAll('.cloze-input.is-correct').length === 3)
    await sleep(200)
    expect(await mine(marker)).toHaveLength(0)
    wrapper.unmount()
  })

  it('④ 复习队列可见性：入队后 loadDueReviews 包含该行（SM-2 零接线打通）', async () => {
    const ctx = ctxFor()
    const marker = `M4_${ctx.fileKey}`
    const wrapper = mountDictation(threeSentences(marker), ctx)
    const inputs = wrapper.findAll('.cloze-input')
    await inputs[0].setValue('错')
    await wrapper.find('.cloze-btn--primary').trigger('click')
    // 三句均含错空（第 1 句填错，第 2/3 句未填也算错）→ 等三行全部落库
    await waitUntil(async () => ((await mine(marker)).length === 3 ? true : null))

    const review = useSpacedReview()
    await review.loadDueReviews()
    const due = review.dueReviews.value
    expect(due.length).toBeGreaterThanOrEqual(1)
    expect(due.some((e) => e.source === 'cloze')).toBe(true)
    wrapper.unmount()
  })

  it('⑤ recordAnswered：提交一次记一次答题数（空位数 = 3）', async () => {
    const ctx = ctxFor()
    const marker = `M5_${ctx.fileKey}`
    const before = (await db.getDailyStat(todayStr())).questionsAnswered || 0
    const wrapper = mountDictation(threeSentences(marker), ctx)
    const inputs = wrapper.findAll('.cloze-input')
    for (const el of inputs) await el.setValue('错')
    await wrapper.find('.cloze-btn--primary').trigger('click')

    const stat = await waitUntil(async () => {
      const s = await db.getDailyStat(todayStr())
      return (s.questionsAnswered || 0) >= before + 3 ? s : null
    })
    expect(stat.questionsAnswered - before).toBeGreaterThanOrEqual(3)
    wrapper.unmount()
  })

  it('⑥ context 无 fileKey → 不入队、无异常', async () => {
    const marker = 'M6_NOFILEKEY'
    // 不给 fileKey（宁缺勿错：去重会退化为单元粒度）
    const wrapper = mountDictation(threeSentences(marker), { subject: 'chinese', unitNum: '07' })
    const inputs = wrapper.findAll('.cloze-input')
    for (const el of inputs) await el.setValue('全错')
    await wrapper.find('.cloze-btn--primary').trigger('click')

    // 结果展示不受影响（照常判错）；给入队流程留出时间后仍无本用例错题
    expect(wrapper.findAll('.cloze-input.is-wrong')).toHaveLength(3)
    await sleep(250)
    expect(await mine(marker)).toHaveLength(0)
    wrapper.unmount()
  })
})
