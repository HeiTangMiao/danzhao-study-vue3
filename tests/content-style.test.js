/**
 * 内容文件风格契约测试（阶段 6）
 *
 * 背景：内容文件曾有两套写法 —— 手写风格与 `JSON.stringify(page, null, 2)` 的引号键风格
 *      （实测 62 个文件）。风格定义已收敛到 src/content/serializePage.js，
 *      编辑器导出与迁移脚本共用同一份。
 *
 * 职责：
 *  - 钉死序列化器的输出风格（缩进 / 引号 / 空行 / 单行阈值），改风格必须改这份快照
 *  - 钉死「往返一致」：序列化结果能被解析回同一份数据（只允许格式变化）
 *  - 钉死仓库现状：内容页文件里不得再出现行首引号键
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { serializePage, stripKeyQuotes, extractHeader, buildHeader } from '@/content/serializePage'
import { CONTENT_DIR, collectFiles } from '../scripts/lib/load-content.mjs'

/** 用 Function 构造器解析序列化结果（内容是纯数据，不执行任何副作用） */
function parseSerialized(source) {
  const literal = source.replace(/^export default\s*/, '').replace(/;\s*$/, '')
  return new Function(`return (${literal})`)()
}

const pages = collectFiles(CONTENT_DIR)

describe('serializePage 风格契约', () => {
  it('输出固定手写风格：无引号键、2 空格缩进、顶层块间空行、短数组单行', () => {
    const blocks = [
      {
        type: 'knowledge',
        title: '标题',
        paragraphs: ['第一段', '第二段'],
        variant: 'plain'
      },
      {
        type: 'quiz',
        items: [{ question: '题干', options: ['A', 'B', 'C', 'D'], correctIndex: 1, answer: '答案' }]
      }
    ]
    expect(serializePage(blocks, { header: buildHeader({ title: '示例页' }) })).toBe(`/**
 * 内容页面数据（content-schema 的实例）
 * 页面：示例页
 * 说明：本文件只描述 blocks；页面元信息（标题 / 单元 / 顺序）的唯一真相源是 site.js
 */
export default {
  blocks: [
    {
      type: "knowledge",
      title: "标题",
      paragraphs: ["第一段", "第二段"],
      variant: "plain"
    },

    {
      type: "quiz",
      items: [
        {
          question: "题干",
          options: ["A", "B", "C", "D"],
          correctIndex: 1,
          answer: "答案"
        }
      ]
    }
  ]
}
`)
  })

  it('长数组换行、空数组写 []、嵌套数组（容器型区块）逐层缩进', () => {
    // 足够长，确保加上缩进与 `paragraphs: ` 前缀后超过 100 列，必须换行
    const longText = '这是一段很长的段落内容，'.repeat(8) + '结束。'
    const blocks = [
      {
        type: 'columns',
        cols: 2,
        items: [[{ type: 'knowledge', paragraphs: [longText] }], []]
      }
    ]
    const out = serializePage(blocks)
    expect(out).toContain('      cols: 2,')
    // 嵌套数组逐层缩进：block(4) → items(6) → 列(8) → 子区块(10) → 字段(12)
    expect(out).toContain('      items: [\n        [\n          {\n')
    // 段落数组超宽 → 元素 14 空格、闭合括号 12 空格
    expect(out).toContain(`paragraphs: [\n              ${JSON.stringify(longText)}\n            ]`)
    // 空数组保持 []，且嵌套数组之间不空行（只有顶层块间空行）
    expect(out).toContain('        []\n      ]')
    expect(out).not.toContain(']\n\n      ]')
  })

  it('字符串保持单行 + JSON 转义（\\n 与引号），数字与布尔原样输出', () => {
    const out = serializePage([
      { type: 'tip', text: '第一行\n第二行"带引号"', collapsed: true }
    ])
    expect(out).toContain('text: "第一行\\n第二行\\"带引号\\"",')
    expect(out).toContain('collapsed: true')
  })

  it('往返一致：序列化结果解析回来与原数据深度相等', () => {
    const blocks = [
      { type: 'mindmap', title: '导图', mermaid: 'graph LR\n  A --> B' },
      { type: 'table', headers: ['列一', '列二'], rows: [['a', 'b'], ['c', 'd']] },
      {
        type: 'group',
        variant: 'band',
        items: [{ type: 'warning', text: '注意' }]
      },
      { type: 'code', lang: 'cmd', code: 'RA(config)# router rip\nRA(config-router)# version 2' },
      { type: 'cloze', items: [{ text: '海内存知己，{{天涯若比邻}}。' }] }
    ]
    expect(parseSerialized(serializePage(blocks)).blocks).toEqual(blocks)
  })

  it('空 blocks 也能正常输出', () => {
    expect(parseSerialized(serializePage([])).blocks).toEqual([])
  })
})

describe('文件头与去引号', () => {
  it('extractHeader 取出开头的块注释，没有则返回空串', () => {
    expect(extractHeader('/**\n * 说明\n */\nexport default {}\n')).toBe('/**\n * 说明\n */\n')
    expect(extractHeader('export default {}\n')).toBe('')
  })

  it('buildHeader 无标题时也不生成空行', () => {
    expect(buildHeader()).toContain('内容页面数据（content-schema 的实例）')
    expect(buildHeader({})).not.toContain('页面：')
    expect(buildHeader({ title: '集合', subtitle: '三要素' })).toContain('页面：集合（三要素）')
  })

  it('stripKeyQuotes 只动行首的键，值里的同形文本原样保留', () => {
    const src = [
      '  "blocks": [',
      '    { "type": "x" },',
      '      "text": "{\\"type\\": \\"y\\"}"',
      '    }',
      '  ]'
    ].join('\n')
    const out = stripKeyQuotes(src)
    expect(out).toContain('  blocks: [')
    expect(out).toContain('      text: "{\\"type\\": \\"y\\"}"')
    // 行内出现的键形式（不是行首）不动
    expect(out).toContain('{ "type": "x" },')
  })
})

describe('仓库现状：内容页不得再出现引号键', () => {
  it('扫描得到内容页文件', () => {
    expect(pages.length).toBeGreaterThan(100)
  })

  it('没有任何内容页文件带行首引号键（引号键风格已归一化）', () => {
    const offenders = []
    for (const file of pages) {
      const src = readFileSync(file, 'utf-8')
      if (/^\s*"[A-Za-z_$][\w$]*"\s*:/m.test(src)) {
        offenders.push(file.replace(CONTENT_DIR, '').replace(/\\/g, '/'))
      }
    }
    expect(offenders).toEqual([])
  })

  it('每个内容页都以块注释开头（文件头模板）', () => {
    const missing = []
    for (const file of pages) {
      const src = readFileSync(file, 'utf-8')
      if (!/^\s*\/\*[\s\S]*?\*\//.test(src)) {
        missing.push(file.replace(CONTENT_DIR, '').replace(/\\/g, '/'))
      }
    }
    expect(missing).toEqual([])
  })

  it('内容目录里的非页面模块都登记在 NON_PAGE_FILES（否则会被当成孤儿页）', async () => {
    const mod = await import('../scripts/lib/load-content.mjs')
    expect(mod.NON_PAGE_FILES.has('serializePage.js')).toBe(true)
  })

  it('pageMeta.js 与 serializePage.js 都是零 import 的纯模块（两端共用）', () => {
    for (const name of ['pageMeta.js', 'serializePage.js']) {
      const src = readFileSync(join(CONTENT_DIR, name), 'utf-8')
      expect(src, `${name} 不应有 import`).not.toMatch(/^\s*import\s/m)
    }
  })
})