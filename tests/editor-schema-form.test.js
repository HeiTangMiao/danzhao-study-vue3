/**
 * 编辑器表单推导测试
 * 背景：编辑器原先手写 TEXT_FIELDS 字段表，只覆盖 9/14 种区块类型，
 *      35 处 errorfocus / strategy / exam 内容完全不可编辑，题目的 options / correctIndex
 *      也编不了。改成 schema 驱动后，"表单是否覆盖了全部类型与字段" 必须被钉死，
 *      否则又会在新增区块类型时静默漏掉。
 * 职责：
 *  - 钉死每个 schema 类型都推导得出字段，且必填字段与 schema 一致
 *  - 钉死最小合法骨架「结构完整」（必填键都在），内容是否填是作者的下一步
 *  - 钉死 correctIndex 走选项下拉而非裸数字（越界是 CI 硬错误）
 *  - 钉死校验器确实拦得住 correctIndex 越界、公式行孤立反斜杠这类语义问题
 */
import { describe, it, expect } from 'vitest'
import { blockFields, objectFields, skeletonOf, newItemOf } from '@/views/editor/schemaForm'
import { createBlockValidator } from '@/utils/validateBlock'
import contentSchema from '@/utils/contentSchema'

const TYPES = contentSchema.definitions.block.properties.type.enum
const validateBlock = createBlockValidator(contentSchema)

/** 取 schema 中某类型的 then.required */
function requiredOf(type) {
  const branch = contentSchema.definitions.block.allOf.find(
    (b) => b.if.properties.type.const === type
  )
  return branch?.then?.required || []
}

describe('blockFields 覆盖度', () => {
  it('schema 里的每个类型都能推导出字段', () => {
    const empty = TYPES.filter((t) => blockFields(contentSchema, t).length === 0)
    expect(empty).toEqual([])
  })

  it('每个类型都带公共的 title 字段，且不含由下拉框单独管理的 type', () => {
    for (const t of TYPES) {
      const names = blockFields(contentSchema, t).map((f) => f.name)
      expect(names, `${t} 缺 title`).toContain('title')
      expect(names, `${t} 不应把 type 当表单字段`).not.toContain('type')
    }
  })

  it('必填标记与 schema 的 required 完全一致', () => {
    for (const t of TYPES) {
      const marked = blockFields(contentSchema, t).filter((f) => f.required).map((f) => f.name).sort()
      expect(marked, `${t} 的必填标记与 schema 不符`).toEqual([...requiredOf(t)].sort())
    }
  })

  it('此前不可编辑的 exam / strategy / errorfocus 现在都有字段', () => {
    // exam 的时长与分值此前根本不出现在编辑器里
    const exam = blockFields(contentSchema, 'exam').map((f) => f.name)
    expect(exam).toEqual(expect.arrayContaining(['duration', 'totalScore', 'passingScore', 'items']))
    expect(blockFields(contentSchema, 'strategy').map((f) => f.name)).toContain('items')
    expect(blockFields(contentSchema, 'errorfocus').map((f) => f.name)).toContain('items')
  })

  it('字段控件按 schema 的形状推导', () => {
    const kind = (type, name) => blockFields(contentSchema, type).find((f) => f.name === name)?.kind
    expect(kind('mindmap', 'mermaid')).toBe('textarea') // 多行 Mermaid 源码
    expect(kind('table', 'rows')).toBe('stringMatrix') // 二维字符串
    expect(kind('objectives', 'items')).toBe('stringList') // 一维字符串
    expect(kind('quiz', 'items')).toBe('objectList') // 子对象数组
    expect(kind('exam', 'duration')).toBe('number')
    expect(kind('knowledge', 'kind')).toBe('enum')
  })
})

describe('objectFields 子对象推导', () => {
  it('题目的 options / correctIndex 现在可编辑', () => {
    const names = objectFields(contentSchema, 'quizItem').map((f) => f.name)
    expect(names).toContain('options')
    expect(names).toContain('correctIndex')
  })

  it('correctIndex 走选项下标控件，不是裸数字输入', () => {
    const f = objectFields(contentSchema, 'quizItem').find((x) => x.name === 'correctIndex')
    expect(f.kind).toBe('index')
  })

  it('子对象的必填与 schema 一致（quizItem 需 question + answer）', () => {
    const marked = objectFields(contentSchema, 'quizItem').filter((f) => f.required).map((f) => f.name).sort()
    expect(marked).toEqual(['answer', 'question'])
  })

  it('未知 $ref 返回空表而非抛错', () => {
    expect(objectFields(contentSchema, '__不存在__')).toEqual([])
  })
})

describe('skeletonOf 最小合法骨架', () => {
  it('每个类型的骨架都带 type，且必填键齐全', () => {
    for (const t of TYPES) {
      const s = skeletonOf(contentSchema, t)
      expect(s.type, `${t} 骨架缺 type`).toBe(t)
      for (const key of requiredOf(t)) {
        expect(Object.prototype.hasOwnProperty.call(s, key), `${t} 骨架缺必填键 ${key}`).toBe(true)
      }
    }
  })

  it('子对象条目按各自 schema 生成，不是空对象', () => {
    const quiz = skeletonOf(contentSchema, 'quiz')
    expect(quiz.items).toHaveLength(1)
    expect(quiz.items[0]).toEqual({ question: '', answer: '' })

    const exam = skeletonOf(contentSchema, 'exam')
    expect(exam.items[0]).toEqual({ question: '', answer: '' })
  })

  it('枚举取首项、数组与数字给对应空值', () => {
    expect(skeletonOf(contentSchema, 'knowledge').paragraphs).toEqual([''])
    expect(skeletonOf(contentSchema, 'table').rows).toEqual([['']])
    expect(skeletonOf(contentSchema, 'objectives').items).toEqual([''])
  })

  it('新增条目复用同一套推导，不是空对象', () => {
    const quizItems = blockFields(contentSchema, 'quiz').find((f) => f.name === 'items')
    expect(newItemOf(quizItems)).toEqual({ question: '', answer: '' })
  })
})

describe('校验器与 CI 共用同一份规则', () => {
  it('correctIndex 越界会被拦下', () => {
    const errors = validateBlock({
      type: 'quiz',
      items: [{ question: 'q', answer: 'a', options: ['A', 'B'], correctIndex: 5 }]
    })
    expect(errors.join('\n')).toContain('correctIndex 越界')
  })

  it('公式行末尾孤立反斜杠会被拦下（KaTeX 会渲染成红色源码）', () => {
    const errors = validateBlock({ type: 'formula', formulas: ['x = 1 \\'] })
    expect(errors.join('\n')).toContain('孤立反斜杠')
  })

  it('类型白名单从 schema 派生，未知类型被拦下', () => {
    expect(validateBlock({ type: '__不存在__' }).join('\n')).toContain('未知类型')
  })

  it('错误描述是相对区块的，不带文件前缀（由调用方补）', () => {
    // Node 侧拼成 `xxx.js 区块[2] 缺少 type`，编辑器侧直接列在区块下方
    expect(validateBlock({})).toEqual(['缺少 type'])
  })
})
