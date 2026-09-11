// @vitest-environment jsdom
/**
 * BlockForm 挂载测试
 * 背景：BlockForm 是递归表单，光靠「能编译」证明不了它能编辑 ——
 *      控件的种类、递归层数、写回父对象的效果，只有真正挂载才能验。
 * 说明：仓库默认 environment 是 node（大量 store 测试依赖 fake-indexeddb 在 node 下工作），
 *      所以这里用文件级 docblock 单独切 jsdom，不动全局配置。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BlockForm from '@/views/editor/BlockForm.vue'
import { blockFields, objectFields, skeletonOf } from '@/views/editor/schemaForm'
import contentSchema from '@/utils/contentSchema'

/** 按类型挂载一个表单，返回 { wrapper, obj } */
function mountBlock(type, obj) {
  const target = obj || skeletonOf(contentSchema, type)
  const wrapper = mount(BlockForm, {
    props: { fields: blockFields(contentSchema, type), obj: target }
  })
  return { wrapper, obj: target }
}

/** 取某字段所在容器 */
const fieldOf = (wrapper, name) => wrapper.find(`[data-field="${name}"]`)
/**
 * 取某字段的「新增一行/一条」按钮
 * 说明：必须按字段名定位 —— 嵌套子表单里也有 .add-item-btn（题目的 options 就是），
 *      按类名 find 会抓到子表单里那个，点到别的字段上去。
 */
const addBtnOf = (wrapper, name) => wrapper.find(`[data-add="${name}"]`)
/** 取某字段的第 i 个删除按钮（行/条目的删除） */
const delBtnOf = (wrapper, name, i = 0) => wrapper.findAll(`[data-del="${name}"]`)[i]

describe('BlockForm 控件渲染', () => {
  it('按字段种类渲染出对应控件', () => {
    // mindmap 有两个字段：title（单行）+ mermaid（多行）
    const { wrapper } = mountBlock('mindmap')
    expect(fieldOf(wrapper, 'title').find('input[type="text"]').exists()).toBe(true)
    expect(fieldOf(wrapper, 'mermaid').find('textarea').exists()).toBe(true)
  })

  it('枚举字段渲染为下拉，选项与 schema 一致', () => {
    const { wrapper } = mountBlock('knowledge')
    const options = fieldOf(wrapper, 'variant').findAll('option').map((o) => o.element.value)
    expect(options).toEqual(contentSchema.definitions.block.allOf
      .find((b) => b.if.properties.type.const === 'knowledge')
      .then.properties.variant.enum)
  })

  it('数字字段渲染为 number 输入框', () => {
    const { wrapper } = mountBlock('exam')
    expect(fieldOf(wrapper, 'duration').find('input[type="number"]').exists()).toBe(true)
  })
})

describe('BlockForm 写回', () => {
  it('输入文本直接写进父对象（v-model 生效）', async () => {
    const { wrapper, obj } = mountBlock('mindmap')
    const input = fieldOf(wrapper, 'title').find('input')
    await input.setValue('新标题')
    expect(obj.title).toBe('新标题')
  })

  it('一维字符串数组可增可删', async () => {
    const { wrapper, obj } = mountBlock('objectives')
    expect(obj.items).toEqual([''])

    await addBtnOf(wrapper, 'items').trigger('click')
    expect(obj.items).toEqual(['', ''])

    await delBtnOf(wrapper, 'items', 0).trigger('click')
    expect(obj.items).toEqual([''])
  })

  it('可选的数组字段在首次添加时才被建出来', async () => {
    // desmos 的 initialExpressions 非必填，骨架里没有这个键
    const { wrapper, obj } = mountBlock('desmos')
    expect(obj.initialExpressions).toBeUndefined()
    await addBtnOf(wrapper, 'initialExpressions').trigger('click')
    expect(obj.initialExpressions).toEqual([''])
  })
})

describe('BlockForm 递归渲染子对象', () => {
  it('题目条目会递归出一层子表单', () => {
    const { wrapper } = mountBlock('quiz')
    // 一条题目 = 一个嵌套子表单（根表单通过文件名自引用自身往下渲染）
    expect(wrapper.findAll('.obj-item .block-form')).toHaveLength(1)
    // 子表单里能看到题目自己的字段
    expect(fieldOf(wrapper, 'question').exists()).toBe(true)
    expect(fieldOf(wrapper, 'answer').exists()).toBe(true)
  })

  it('添加条目按 schema 生成条目骨架，而不是空对象', async () => {
    const { wrapper, obj } = mountBlock('quiz')
    await addBtnOf(wrapper, 'items').trigger('click')
    expect(obj.items).toHaveLength(2)
    expect(obj.items[1]).toEqual({ question: '', answer: '' })
  })

  it('编辑子条目写回的是同一个对象引用', async () => {
    const { wrapper, obj } = mountBlock('example')
    const question = wrapper.find('[data-field="question"] textarea')
    await question.setValue('例题题干')
    expect(obj.items[0].question).toBe('例题题干')
  })
})

describe('correctIndex 用选项下标控件', () => {
  it('下拉选项来自同级的 options，天然不可能越界', async () => {
    const { wrapper } = mountBlock('quiz', {
      type: 'quiz',
      items: [{ question: 'q', answer: 'a', options: ['甲', '乙', '丙'], correctIndex: 1 }]
    })
    const select = wrapper.find('[data-field="correctIndex"] select')
    expect(select.exists()).toBe(true)
    expect(select.findAll('option')).toHaveLength(3)
    // 选项文本带上序号字母，便于对照题目
    expect(select.findAll('option')[0].text()).toContain('甲')
    expect(select.element.value).toBe('1')
  })

  it('还没填选项时下拉禁用，避免写出无意义的索引', () => {
    const { wrapper } = mountBlock('quiz')
    const select = wrapper.find('[data-field="correctIndex"] select')
    expect(select.attributes('disabled')).toBeDefined()
  })
})

describe('表格行跟随表头列数', () => {
  it('新增行的列数与 headers 一致', async () => {
    const { wrapper, obj } = mountBlock('table', {
      type: 'table',
      headers: ['列一', '列二', '列三'],
      rows: [['a', 'b', 'c']]
    })
    await addBtnOf(wrapper, 'rows').trigger('click')
    expect(obj.rows).toHaveLength(2)
    expect(obj.rows[1]).toEqual(['', '', ''])
  })

  it('每列的占位提示取自表头', () => {
    const { wrapper } = mountBlock('table', {
      type: 'table',
      headers: ['符号', '含义'],
      rows: [['', '']]
    })
    const inputs = fieldOf(wrapper, 'rows').findAll('input')
    expect(inputs[0].attributes('placeholder')).toBe('符号')
    expect(inputs[1].attributes('placeholder')).toBe('含义')
  })
})

describe('未知字段描述不炸', () => {
  it('空字段表渲染为空表单', () => {
    const wrapper = mount(BlockForm, { props: { fields: [], obj: {} } })
    expect(wrapper.findAll('.field')).toHaveLength(0)
  })

  it('$ref 不存在时子对象数组渲染为空列表而非报错', () => {
    expect(objectFields(contentSchema, '__不存在__')).toEqual([])
    const wrapper = mount(BlockForm, {
      props: { fields: [{ name: 'items', label: '条目', kind: 'objectList', itemFields: [] }], obj: { items: [] } }
    })
    expect(wrapper.exists()).toBe(true)
  })
})
