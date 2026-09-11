/**
 * 页面元信息推导与注入测试
 * 背景：内容页的元信息（id / unitNum / subject / title / subtitle）曾在每个内容文件里
 *      手写一份，又在 site.js 里各写一份，实测 19/139 页已经漂移。阶段 1A 起
 *      site.js 是唯一真相源，元信息由 resolvePageMeta 推导并在加载时注入。
 * 职责：
 *  - 钉死「注入后的页面对象只认 site.js」——页面文件里的旧五元组不得泄漏到渲染层
 *  - 钉死越界 fileIndex 返回 null（fileIndex 直接决定 URL 与历史进度语义，不能被钳制）
 *  - 用真实站点配置验证三个学科的推导结果
 */
import { describe, it, expect } from 'vitest'
import { resolvePageMeta, hydratePage } from '@/content/pageMeta'
import { SUBJECTS, getSubjectConfig } from '@/content/index'

/** 最小可用的站点配置样本 */
const SITE = {
  subject: 'math',
  units: [
    {
      num: '01',
      title: '集合与逻辑',
      folder: '01-集合与逻辑',
      files: [
        { name: '01-集合的概念与表示', title: '集合的概念与表示', subtitle: '理解集合三要素' },
        { name: '07-复习测验', title: '集合与逻辑 · 复习测验', subtitle: '本单元知识综合检测', isTest: true }
      ]
    }
  ]
}

describe('resolvePageMeta 推导规则', () => {
  it('由 site.js 条目推导出元信息', () => {
    const meta = resolvePageMeta(SITE, '01', 0)
    expect(meta).toMatchObject({
      id: 'math-01-01',
      unitNum: '01',
      subject: 'math',
      title: '集合的概念与表示',
      subtitle: '理解集合三要素',
      isTest: false,
      // 运行时派生字段
      unitTitle: '集合与逻辑',
      folder: '01-集合与逻辑',
      name: '01-集合的概念与表示',
      fileIndex: 0
    })
  })

  it('id 的序号从 fileIndex 推导（下标 1 → 02）', () => {
    expect(resolvePageMeta(SITE, '01', 1).id).toBe('math-01-02')
  })

  it('isTest 缺省为 false，显式标记才为 true', () => {
    expect(resolvePageMeta(SITE, '01', 0).isTest).toBe(false)
    expect(resolvePageMeta(SITE, '01', 1).isTest).toBe(true)
  })

  it('subtitle 缺省为空字符串而非 undefined', () => {
    const site = { subject: 'math', units: [{ num: '01', title: 'u', folder: 'f', files: [{ name: 'n', title: 't' }] }] }
    expect(resolvePageMeta(site, '01', 0).subtitle).toBe('')
  })

  it('越界的 fileIndex 返回 null，不钳制到首尾页', () => {
    // 负数、超界、非整数、非数字一律视为无效
    expect(resolvePageMeta(SITE, '01', -1)).toBeNull()
    expect(resolvePageMeta(SITE, '01', 2)).toBeNull()
    expect(resolvePageMeta(SITE, '01', 1.5)).toBeNull()
    expect(resolvePageMeta(SITE, '01', NaN)).toBeNull()
    expect(resolvePageMeta(SITE, '01', undefined)).toBeNull()
  })

  it('单元不存在或站点结构非法时返回 null', () => {
    expect(resolvePageMeta(SITE, '99', 0)).toBeNull()
    expect(resolvePageMeta(null, '01', 0)).toBeNull()
    expect(resolvePageMeta({}, '01', 0)).toBeNull()
  })
})

describe('hydratePage 注入优先级', () => {
  it('页面文件带旧五元组与不带时，产出完全相同的页面对象', () => {
    const meta = resolvePageMeta(SITE, '01', 0)
    const 旧格式 = {
      id: 'math-01-01',
      unitNum: '01',
      subject: 'math',
      title: '旧标题',
      subtitle: '旧副标题——已漂移',
      blocks: [{ type: 'knowledge', title: 'k', paragraphs: 'p' }]
    }
    const 新格式 = { blocks: [{ type: 'knowledge', title: 'k', paragraphs: 'p' }] }
    expect(hydratePage(旧格式, meta)).toEqual(hydratePage(新格式, meta))
  })

  it('site.js 永远胜出：页面文件里的 title/subtitle 不生效', () => {
    const page = hydratePage({ title: '旧标题', subtitle: '旧副标题' }, resolvePageMeta(SITE, '01', 1))
    expect(page.title).toBe('集合与逻辑 · 复习测验')
    expect(page.subtitle).toBe('本单元知识综合检测')
  })

  it('blocks 缺失或非数组时降级为空数组（渲染层不必再判空）', () => {
    const meta = resolvePageMeta(SITE, '01', 0)
    expect(hydratePage(undefined, meta).blocks).toEqual([])
    expect(hydratePage({}, meta).blocks).toEqual([])
    expect(hydratePage({ blocks: null }, meta).blocks).toEqual([])
    expect(hydratePage({ blocks: 'x' }, meta).blocks).toEqual([])
  })
})

describe('真实站点配置可推导', () => {
  it.each(Object.keys(SUBJECTS))('%s 学科的每个注册页都能推导出元信息', (subject) => {
    const site = getSubjectConfig(subject)
    const bad = []
    for (const unit of site.units) {
      unit.files.forEach((f, i) => {
        const meta = resolvePageMeta(site, unit.num, i)
        if (!meta || meta.name !== f.name) bad.push(`${unit.num}/${f.name}`)
      })
    }
    expect(bad).toEqual([])
  })

  it('推导出的 id 全局唯一（id 是页面级唯一键）', () => {
    const ids = new Set()
    const dup = []
    for (const subject of Object.keys(SUBJECTS)) {
      const site = getSubjectConfig(subject)
      for (const unit of site.units) {
        unit.files.forEach((_, i) => {
          const id = resolvePageMeta(site, unit.num, i).id
          if (ids.has(id)) dup.push(id)
          ids.add(id)
        })
      }
    }
    expect(dup).toEqual([])
  })
})
