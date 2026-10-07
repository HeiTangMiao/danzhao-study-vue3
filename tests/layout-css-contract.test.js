/**
 * split 原语的「排布契约」守卫（源码级，不测视觉）
 *
 * 背景：split 的第 3 个及以后 child 走 **CSS 网格默认行流**（先填满一行再换行），
 *      于是第 3 个落在第二行的起始侧（主侧）、第 4 个落在结束侧。
 *      早前文档写的是「第 3 个起排在结束侧之后」，与实现不符；2026-10-07 实测确认
 *      实现行为是按行顺排、且更贴合主次语义，故**改文档而非改实现**。
 *
 * 为什么只做源码级断言，不测渲染落点：
 *      jsdom 不实现容器查询，也算不出网格落位，DOM 断言给不出「第 3 个元素在哪一列」的结论。
 *      硬写只会得到一串假绿 —— 正是本项目一直在防的「空跑守卫」。
 *      所以这里只钉死两条**可被文本确定性判定**的契约：
 *        C1 实现侧：layouts.css 里 .layout-split 相关规则不得用 nth-child / nth-of-type 改列
 *                   （一旦有人加这类规则，说明排布语义从「行流」被改成了「按序号指派列」，
 *                    与本契约冲突 —— 必须走显式改契约的流程，而不是悄悄改 CSS）
 *        C2 文档侧：组件与作者指南的 split 契约必须保留「按行顺排」表述
 *                   （防文档被改回旧的「结束侧之后」口径而无人发现 —— 这次漂移就是这么发生的）
 *
 * 若确需改变排布语义：先改 C2 处的契约文案，再改实现与本文件的断言，三者一起动。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** 项目根（本文件位于 <root>/tests/ 下） */
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CSS_PATH = ROOT + 'src/assets/css/layouts.css'
const SPLIT_VUE_PATH = ROOT + 'src/components/layouts/SplitLayout.vue'
const GUIDE_PATH = ROOT + 'docs/layout-primitives-guide.md'

/** 去掉 CSS 注释，避免注释里提到 nth-child 造成误报 */
function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * 扫描 CSS，找出所有「选择器链中包含指定关键字」的规则里出现的禁用写法。
 * 用花括号栈跟踪层级，在每条规则闭合时才求值 —— 因此嵌套的 @container / @supports
 * 也能拿到完整的外层选择器链，且同一处命中只会计一次。
 *
 * @param {string} css CSS 源码（应已去注释）
 * @param {string} scopeKeyword 作用域关键字，如 'layout-split'
 * @param {RegExp} bannedRe 禁用写法，如 /nth-(child|of-type)/g
 * @returns {{selector:string, banned:string[]}[]} 命中列表
 */
function findBannedInScope(css, scopeKeyword, bannedRe) {
  const hits = []
  /** 栈中每项是一条尚未闭合的规则：{ selector, body } */
  const stack = []
  let buf = ''
  const globalRe = new RegExp(
    bannedRe.source,
    bannedRe.flags.includes('g') ? bannedRe.flags : bannedRe.flags + 'g'
  )

  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '{') {
      stack.push({ selector: buf.trim(), body: '' })
      buf = ''
      continue
    }
    if (ch === '}') {
      const node = stack.pop()
      if (node) {
        node.body = buf
        // 完整选择器链 = 所有外层规则的选择器 + 本规则选择器
        const chain = [...stack.map((s) => s.selector), node.selector].join(' ').trim()
        // 选择器本身与声明体都要查（改列写法可能出现在任一处）
        const text = `${node.selector} { ${node.body} }`
        const matched = text.match(globalRe)
        if (matched && chain.includes(scopeKeyword)) {
          hits.push({ selector: chain, banned: [...new Set(matched)] })
        }
      }
      buf = ''
      continue
    }
    buf += ch
  }
  return hits
}

describe('守卫自检：扫描器本身有效（防"空跑守卫"）', () => {
  const BANNED = /nth-(child|of-type)/g

  it('能抓出 split 作用域内的 nth-child 改列写法', () => {
    const css = `
      .layout-split { display: grid; }
      @container (min-width: 40rem) {
        .layout-split > *:nth-child(3) { grid-column: 2; }
      }
    `
    const hits = findBannedInScope(stripCssComments(css), 'layout-split', BANNED)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].banned).toContain('nth-child')
  })

  it('不误报：作用域外的 nth-child 与注释里的字样都不算命中', () => {
    // ① 其他原语用 nth-child 与本契约无关；② 注释里提到 nth-child 不应误判
    const css = `
      /* 说明：这里不用 nth-child 改列 */
      .layout-grid > *:nth-child(2) { grid-column: span 2; }
      .layout-split { display: grid; }
    `
    expect(findBannedInScope(stripCssComments(css), 'layout-split', BANNED)).toEqual([])
  })
})

describe('split 排布契约（源码级守卫）', () => {
  it('C1 layouts.css 中 .layout-split 相关规则不得用 nth-child / nth-of-type 改列', () => {
    const css = stripCssComments(readFileSync(CSS_PATH, 'utf8'))
    const hits = findBannedInScope(css, 'layout-split', /nth-(child|of-type)/)

    expect(
      hits,
      `发现改列写法：${hits.map((h) => `${h.selector} → ${h.banned}`).join('; ')}。
       split 的排布由 CSS 网格默认行流决定；用 nth-child 指派列会与本契约冲突，
       如需改变语义请先改契约文案与本守卫。`
    ).toEqual([])
  })

  it('C2 SplitLayout.vue 的契约注释保留「按行顺排」表述', () => {
    const src = readFileSync(SPLIT_VUE_PATH, 'utf8')
    // 只取 <template> 之前的头部注释块，避免断言到模板里的无关文字
    const head = src.slice(0, src.indexOf('<template>'))

    expect(head).toContain('按行顺排')
    // 这里刻意**不**加「不得出现旧口径字样」的反向断言：
    // 校正注本身需要引用旧表述（「早前写的是……」）来说明改动来由，反向断言会误伤这段历史说明。
    // 契约正确性由「按行顺排」存在 + C1 的 CSS 侧断言共同保证。
  })

  it('C2 作者指南中的 split 契约同步保留「按行顺排」表述', () => {
    const guide = readFileSync(GUIDE_PATH, 'utf8')
    const splitIdx = guide.indexOf('split')
    expect(splitIdx).toBeGreaterThanOrEqual(0)

    expect(
      guide,
      '指南与组件必须同口径：组件改契约而指南没跟上，作者就会按过期描述去写内容。'
    ).toContain('按行顺排')
  })
})
