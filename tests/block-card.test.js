/**
 * .block-card 框架族契约测试
 *
 * 背景：改造前 9 个区块组件各自手写卡片外框共 14 处，实测聚成 8 个家族。
 *      阶段 3 第一步把它们收敛到 blocks.css 的 .block-card 一族，组件只留差异。
 *      阶段 3 第二步视觉改版（极简留白）后，大部分区块已改为纯留白 / 发丝线，
 *      仍需要卡片容器（surface 底 + 描边）的只剩少量 per-item 卡：
 *      strategy（技巧项）、errorfocus（易错项）、exam-toolbar（sticky 工具栏）
 *      以及 objectives / diagram。
 *
 * 职责（两条，缺一不可）：
 *  1. 保真：每个框架位置**合并后的声明**，必须与本文件记录的原值逐条相等。
 *  2. 去重：记录的原值必须真的由 .block-card 族提供，而不是仍留在组件里。
 *
 * 为什么可以纯字符串比对：这些值全是 CSS 变量引用或字面量，不依赖浏览器解析。
 * 测试跑在 node 环境（仓库默认），不引入 jsdom。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..')
const BLOCKS_CSS = readFileSync(join(ROOT, 'src/assets/css/blocks.css'), 'utf-8')

/**
 * 解析样式表中所有「单个类名选择器」的规则 → { 类名: { 属性: 值 } }
 * 只处理不嵌套的简单规则（本项目就是这么写的），不引入 CSS 解析器依赖。
 * 会合并同名规则（后写的覆盖先写的），与浏览器一致。
 */
function parseClassRules(css) {
  const rules = {}
  const re = /^\.([\w-]+)\s*\{([^}]*)\}/gm
  let m
  while ((m = re.exec(css))) {
    const decls = rules[m[1]] || (rules[m[1]] = {})
    for (const line of m[2].split(';')) {
      const idx = line.indexOf(':')
      if (idx === -1) continue
      decls[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
  }
  return rules
}

const CLASS_RULES = parseClassRules(BLOCKS_CSS)

/** 按 blocks.css 中的书写顺序合并多个类的声明（修饰符在后，后者覆盖前者） */
function mergeFor(classes, order) {
  const merged = {}
  for (const cls of order) {
    if (!classes.includes(cls)) continue
    Object.assign(merged, CLASS_RULES[cls] || {})
  }
  return merged
}

const ORDER = [
  'block-card',
  'block-card--md',
  'block-card--shadow-xs',
  'block-card--rail-accent'
]

/**
 * 构成「卡片外框观感」的属性白名单
 * 只比对这几个 —— 组件 scoped 里还有排版类声明（transition / display / text-align），
 * 那些不属于外框，变了也不算外框回归。
 */
const FRAME_PROPS = [
  'background',
  'border',
  'border-color',
  'border-left',
  'border-radius',
  'box-shadow',
  'padding',
  'margin-bottom'
]

/**
 * 阶段 3 第二步改版后的框架位置快照。
 * 大部分区块已不用卡片；这份表是「仍用 .block-card 的少数位置」的新基准。
 */
const FRAMES = [
  {
    // 少数与基础框架零差异的实例；刻意不带阴影
    file: 'ObjectivesBlock.vue',
    selector: '.objectives-box',
    classes: ['block-card'],
    expected: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      'border-radius': 'var(--radius-lg)',
      padding: 'var(--spacer-16)'
    }
  },
  {
    file: 'StrategyBlock.vue',
    selector: '.strategy-card',
    classes: ['block-card', 'block-card--md', 'block-card--rail-accent'],
    expected: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      'border-left': '4px solid var(--accent)',
      'border-radius': 'var(--radius-md)',
      padding: 'var(--spacer-14) var(--spacer-16)'
    }
  },
  {
    // 易错项卡：改版后不再带阴影（区块不再有阴影），只剩基础框架
    file: 'ErrorFocusBlock.vue',
    selector: '.ef-card',
    classes: ['block-card'],
    expected: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      'border-radius': 'var(--radius-lg)',
      padding: 'var(--spacer-16)'
    }
  },
  {
    file: 'GeometryBlock.vue',
    selector: '.diagram-box',
    classes: ['block-card', 'block-card--md'],
    expected: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      'border-radius': 'var(--radius-md)',
      padding: 'var(--spacer-12)'
    }
  },
  {
    // sticky 工具栏：唯一保留阴影的位置，用极浅的 --shadow-xs
    file: 'ExamBlock.vue',
    selector: '.exam-toolbar',
    classes: ['block-card', 'block-card--md', 'block-card--shadow-xs'],
    expected: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      'border-radius': 'var(--radius-md)',
      padding: 'var(--spacer-10) var(--spacer-16)',
      'box-shadow': 'var(--shadow-xs)',
      'margin-bottom': 'var(--spacer-16)'
    }
  }
]

/**
 * 按真实级联算出一处框架的最终外框声明
 * 顺序：共用类（低特异度）→ 组件 scoped（高特异度，胜出）。
 * 只取 FRAME_PROPS 里的属性；没被任何一方声明的属性不出现在结果里。
 */
function effectiveFrameOf(frame) {
  const merged = mergeFor(frame.classes, ORDER)
  const scoped = scopedDeclsOf(frame.file, frame.selector) || {}
  const out = {}
  for (const prop of FRAME_PROPS) {
    const value = scoped[prop] !== undefined ? scoped[prop] : merged[prop]
    if (value !== undefined) out[prop] = value
  }
  return out
}

/** 读组件源码（缓存） */
const sourceCache = {}
function sourceOf(file) {
  if (!sourceCache[file]) {
    sourceCache[file] = readFileSync(join(ROOT, 'src/components/blocks', file), 'utf-8')
  }
  return sourceCache[file]
}

/** 取组件模板里某元素上的 class 列表（返回全部匹配项的 class 数组） */
function classListsOf(file) {
  const tpl = sourceOf(file).match(/<template>([\s\S]*?)<\/template>/)?.[1] || ''
  const out = []
  const re = /class="([^"]*)"/g
  let m
  while ((m = re.exec(tpl))) out.push(m[1].split(/\s+/).filter(Boolean))
  return out
}

/** 取组件 scoped 样式中某个选择器的声明 */
function scopedDeclsOf(file, selector) {
  const css = sourceOf(file).match(/<style scoped>([\s\S]*?)<\/style>/)?.[1] || ''
  const re = new RegExp(
    `(?:^|\\n)\\s*\\${selector}\\s*\\{([^}]*)\\}`.replace('\\\\', '\\'),
    'm'
  )
  const m = css.match(re)
  if (!m) return null
  const decls = {}
  for (const line of m[1].split(';')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    decls[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return decls
}

describe('.block-card 框架族：保真', () => {
  /**
   * 用 toEqual 全量比对，而不是逐条 toBe
   *
   * 这一点是踩过坑才改的：逐条 toBe 只断言「预期的声明存在且相等」，**多出来的声明它一声不吭**。
   * 而本类重构最真实的失败方式恰恰是多一条 —— 难度标签的共用规则里曾混进一条
   * 原版没有的 white-space: nowrap，逐条断言完全放行，只有全量比对才拦得住。
   */
  it.each(FRAMES)('$file $selector 的最终外框声明与原值完全一致（多一条也会失败）', (frame) => {
    expect(effectiveFrameOf(frame), `${frame.selector} 的声明集合与原值不符`).toEqual(frame.expected)
  })

  it('框架位置用到的每个 .block-card* 类都在 ORDER 里 —— 否则 mergeFor 会静默漏算', () => {
    // 这条封的是 ORDER 硬编码带来的盲区：往 blocks.css 加一个新修饰符、又把它用到
    // 某个框架元素上时，如果没同步登记进 ORDER，级联比对就会看不见它，测试照样全绿。
    const known = new Set(ORDER)
    for (const frame of FRAMES) {
      for (const cls of frame.classes) {
        expect(known.has(cls), `${frame.selector} 用了未登记的类 ${cls}`).toBe(true)
      }
    }
    for (const frame of FRAMES) {
      for (const cls of classListsOf(frame.file)) {
        for (const c of cls.filter((x) => x.startsWith('block-card'))) {
          expect(known.has(c), `${frame.file} 的模板用了未登记的类 ${c}`).toBe(true)
        }
      }
    }
  })
})

describe('.block-card 框架族：确实在用', () => {
  it.each(FRAMES)('$file 的模板里带上了 $classes', (frame) => {
    const lists = classListsOf(frame.file)
    const hit = lists.some((cls) => frame.classes.every((c) => cls.includes(c)))
    expect(hit, `${frame.file} 里没有任何元素同时带 [${frame.classes.join(', ')}]`).toBe(true)
  })

  it('每个框架都挂在真实存在的元素上（不是只写在注释里）', () => {
    for (const frame of FRAMES) {
      const lists = classListsOf(frame.file)
      expect(lists.length, `${frame.file} 模板里没找到 class`).toBeGreaterThan(0)
    }
  })
})

describe('.block-card 框架族：差异留在组件里', () => {
  // 抽取的边界：类提供「大家一样的部分」，组件保留「只有自己不一样的部分」。
  // 下面这些差异如果被误搬进 blocks.css，就会污染其他区块，必须留在原地。
  const DELTAS = [
    { file: 'StrategyBlock.vue', selector: '.strategy-card', props: ['padding'] },
    { file: 'GeometryBlock.vue', selector: '.diagram-box', props: ['padding'] },
    { file: 'ExamBlock.vue', selector: '.exam-toolbar', props: ['padding', 'margin-bottom'] }
  ]

  it.each(DELTAS)('$file $selector 保留了 $props', (delta) => {
    const decls = scopedDeclsOf(delta.file, delta.selector)
    expect(decls, `${delta.file} 里找不到 ${delta.selector} 规则`).not.toBeNull()
    for (const prop of delta.props) {
      expect(decls[prop], `${delta.selector} 丢了差异声明 ${prop}`).toBeTruthy()
    }
  })

  it('blocks.css 里不含任何 margin-bottom —— 块间距由 UnitView 的 .block-anchor 统一负责', () => {
    expect(BLOCKS_CSS).not.toMatch(/margin-bottom/)
  })
})

describe('难度标签共用规则', () => {
  /**
   * 原值快照：改造前四份副本（ExampleBlock / ExamBlock / ErrorBookView 三点相同，
   * QuizBlock 多一条 display）逐字抄录。共用规则必须等于这份的并集，一条不多一条不少。
   */
  const ORIGINAL = {
    'font-size': '0.72rem',
    padding: '1px 10px',
    'border-radius': 'var(--radius-full)',
    // 只有 QuizBlock 原版有；另三处宿主是 flex 容器，flex 子项会被 blockify，合并不产生差异
    display: 'inline-block'
  }

  it('四条声明与原版逐字相同', () => {
    expect(CLASS_RULES['difficulty-tag'] || {}).toEqual(ORIGINAL)
  })

  it('不含 white-space —— 它会把窄屏下的折行行为改掉，属视觉改动', () => {
    // 曾混进来过：四份原版都没有这条，它把标签 min-content 从「一个汉字」抬到整段文案，
    // 窄屏 + 长标题时标签由折两行变成不折行，并把差额转嫁给同行标题。
    const rule = CLASS_RULES['difficulty-tag'] || {}
    expect(rule['white-space']).toBeUndefined()
  })

  it('difficulty-* 四个难度色与原版逐字相同', () => {
    const rules = CLASS_RULES
    expect(rules['difficulty-basic']).toEqual({ background: 'rgba(47, 158, 68, 0.15)', color: 'var(--success)' })
    expect(rules['difficulty-medium']).toEqual({ background: 'rgba(240, 140, 0, 0.15)', color: 'var(--warning)' })
    expect(rules['difficulty-advanced']).toEqual({ background: 'rgba(224, 49, 49, 0.12)', color: 'var(--danger)' })
    expect(rules['difficulty-sprint']).toEqual({ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' })
  })
})

describe('间距与字号阶梯', () => {
  const MAIN_CSS = readFileSync(join(ROOT, 'src/assets/css/main.css'), 'utf-8')

  it('旧间距名是新阶梯的别名，取值逐条不变（重写阶梯本身不产生视觉变化）', () => {
    // 有等价档位的旧名：必须别名到新阶梯
    const ALIASED = {
      '--spacer-4': '--space-1',
      '--spacer-8': '--space-2',
      '--spacer-12': '--space-3',
      '--spacer-16': '--space-4',
      '--spacer-24': '--space-5',
      '--spacer-32': '--space-6',
      '--spacer-48': '--space-7'
    }
    for (const [oldName, newName] of Object.entries(ALIASED)) {
      const re = new RegExp(`${oldName}:\\s*var\\(${newName}\\)`)
      expect(MAIN_CSS, `${oldName} 未别名到 ${newName}`).toMatch(re)
    }
  })

  it('新阶梯是 4px 基数的递增序列', () => {
    const steps = [...MAIN_CSS.matchAll(/--space-(\d):\s*(\d+)px/g)].map((m) => Number(m[2]))
    expect(steps).toEqual([4, 8, 12, 16, 24, 32, 48, 64, 96])
    expect([...steps].sort((a, b) => a - b)).toEqual(steps)
  })

  it('字号阶梯单调递增，且全部用 rem（跟随根字号，不与移动端 body 字号打架）', () => {
    const sizes = [...MAIN_CSS.matchAll(/--fs-[\w-]+:\s*([\d.]+)rem/g)].map((m) => Number(m[1]))
    expect(sizes.length).toBe(9)
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes)
  })

  it('没有任何旧间距名被删掉 —— 14 个组件与各 view 还在用', () => {
    for (const name of [
      '--spacer-4', '--spacer-6', '--spacer-8', '--spacer-10', '--spacer-12',
      '--spacer-14', '--spacer-16', '--spacer-20', '--spacer-24', '--spacer-32',
      '--spacer-40', '--spacer-48'
    ]) {
      expect(MAIN_CSS, `${name} 未定义`).toMatch(new RegExp(`${name}:`))
    }
  })
})


