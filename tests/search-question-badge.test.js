// @vitest-environment jsdom
/**
 * E-4：SearchPanel「题目」小标展示测试
 *
 * 契约：命中题库题干段（matchedQuestion）时，结果条目标一个「题目」小标；
 *      仅命中页面正文时不出现该小标（避免误导用户「这是题」）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SearchPanel from '@/components/SearchPanel.vue'
import { META_FILE, bodyShardPath, QUESTION_MARKER } from '@/content/searchIndex'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const META = [
  { subject: 'math', unitNum: '01', fileIndex: 0, unitTitle: '集合与逻辑', title: '集合的概念', subtitle: '三特性' },
  { subject: 'math', unitNum: '02', fileIndex: 0, unitTitle: '不等式', title: '一元二次不等式', subtitle: '' }
]
// 01/0 含题干段（命中「互异性」）；02/0 只有正文段（命中「十字相乘」）
const BODIES = {
  '01/0': `铺垫内容 ${QUESTION_MARKER} 求集合中元素的互异性考点`,
  '02/0': '解法步骤 十字相乘'
}

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (String(url).includes(META_FILE)) return { ok: true, json: async () => META }
      if (String(url).includes(bodyShardPath('math'))) return { ok: true, json: async () => BODIES }
      return { ok: false, status: 404, json: async () => ({}) }
    })
  )
}

beforeEach(() => {
  vi.stubGlobal('requestIdleCallback', undefined)
  stubFetch()
  localStorage.setItem('current_subject', 'math')
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

async function search(wrapper, kw) {
  await wrapper.find('input').trigger('focus')
  await flushPromises()
  await wrapper.find('input').setValue(kw)
  await vi.advanceTimersByTimeAsync(250)
  await flushPromises()
}

describe('SearchPanel「题目」小标', () => {
  it('命中题干段 → 结果条目标「题目」小标', async () => {
    vi.useFakeTimers()
    const wrapper = mount(SearchPanel)
    await search(wrapper, '互异性')
    const badges = wrapper.findAll('.res-badge')
    expect(badges.length).toBe(1)
    expect(badges[0].text()).toContain('题目')
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('仅命中页面正文段 → 不出现「题目」小标', async () => {
    vi.useFakeTimers()
    const wrapper = mount(SearchPanel)
    await search(wrapper, '十字相乘')
    expect(wrapper.text()).toContain('一元二次不等式') // 确认确实命中
    expect(wrapper.findAll('.res-badge').length).toBe(0)
    wrapper.unmount()
    vi.useRealTimers()
  })
})
