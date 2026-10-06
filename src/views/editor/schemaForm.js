/**
 * 由 content-schema 推导编辑器表单（纯函数，schema 由调用方注入）
 *
 * 背景：编辑器原先手写 TEXT_FIELDS 字段表，只覆盖 9/14 种区块类型，
 *      35 处 errorfocus / strategy / exam 内容在编辑器里完全不可见，
 *      题目的 options / correctIndex 更是编不了。手写表必然滞后于 schema。
 *
 * 做法：把 schema.definitions.block 的基类字段 + 对应 allOf 分支的字段合成一份字段描述，
 *      编辑器按描述递归渲染控件。schema 新增字段时表单自动出现，无需改这里的代码。
 *
 * ⚠️ 为什么 schema 用参数注入而不是 import：
 *    Node 侧（scripts/validate-content.mjs）用 fs 读 JSON，浏览器侧走 Vite 的 JSON 导入，
 *    两端的加载方式天生不同。把「怎么拿到 schema」留在调用方，
 *    本模块就保持零 import 的纯函数，两端与测试都能直接用。
 */

/**
 * 需要多行文本域的字段
 * 说明：schema 只声明 type: string，无法区分「一行短标题」与「整段解析」，
 *      所以按字段名给一份人工判断。未列入的一律渲染为单行输入框。
 */
const LONG_FIELDS = new Set([
  'text',
  'question',
  'solution',
  'answer',
  'content',
  'scenario',
  'commonMistake',
  'correctApproach',
  'tip',
  'mermaid',
  // 术语卡的释义与例句通常是一整句，单行输入框不够用
  'meaning',
  'example',
  // 代码块必须多行
  'code'
])

/**
 * 字段中文名
 * 说明：schema 里多数字段带 description（如 question → "题干"），优先用它；
 *      这份表只补 schema 未写 description 的字段。两边都没有时退回字段原名。
 */
const FIELD_LABEL = {
  title: '标题',
  text: '内容',
  paragraphs: '段落',
  formulas: '公式行',
  lines: '公式行',
  headers: '表头',
  rows: '表格行',
  items: '条目',
  mermaid: 'Mermaid 源码',
  boardId: '画板 ID',
  caption: '图注',
  duration: '考试时长（分钟）',
  totalScore: '满分',
  passingScore: '及格分',
  initialExpressions: '初始表达式',
  variant: '变体',
  kind: '知识点子类型',
  cols: '列数',
  gap: '列间距',
  collapsed: '默认折叠',
  type: '题型',
  options: '选项',
  correctIndex: '正确选项',
  difficulty: '难度',
  question: '题干',
  answer: '答案与解析',
  solution: '解答过程',
  score: '分值',
  scenario: '易错场景',
  commonMistake: '常见错误',
  correctApproach: '正确思路',
  tip: '避坑提示'
}

/** 区块对象上由「类型下拉框」单独管理、不作为表单字段渲染的键 */
const NON_FIELD_KEYS = new Set(['type'])

/**
 * 判断一个字段该用哪种控件
 * @returns {'string'|'textarea'|'number'|'index'|'enum'|'stringList'|'stringMatrix'|'objectList'}
 */
function kindOf(name, prop) {
  // correctIndex 是选项数组的下标。渲染为「按同级 options 长度生成的下拉」而不是裸数字输入框，
  // 用户根本选不出越界值 —— 这条越界规则在 Node 校验器里是硬错误，不该等 CI 才发现。
  if (name === 'correctIndex') return 'index'
  if (Array.isArray(prop.enum)) return 'enum'
  if (prop.type === 'number') return 'number'
  if (prop.type === 'array') {
    const items = prop.items || {}
    if (items.$ref) return 'objectList'
    // 容器型区块（columns / group）：数组的数组，内层是区块引用
    // （如 columns.items: [[block, ...], ...]）。编辑器只读展示子区块清单，
    // 深度编辑留待阶段 6（编辑器写回与序列化统一）。
    if (items.type === 'array' && items.items?.$ref) return 'nestedObjectList'
    if (items.type === 'array') return 'stringMatrix'
    return 'stringList'
  }
  return LONG_FIELDS.has(name) ? 'textarea' : 'string'
}

/** 取字段显示名：人工映射 → schema description → 字段原名 */
function labelOfField(name, prop) {
  if (FIELD_LABEL[name]) return FIELD_LABEL[name]
  const desc = typeof prop.description === 'string' ? prop.description : ''
  // schema 的 description 常写成「知识点子类型：概念/要点/易错」，只取冒号前的名字
  return desc ? desc.split('：')[0] : name
}

/** 从 $ref（如 #/definitions/quizItem）取出定义名 */
function refNameOf(ref) {
  return typeof ref === 'string' ? ref.split('/').pop() : ''
}

/**
 * 由一组 properties + required 生成字段描述
 * @param {object} schema 完整 content-schema
 * @param {object} properties 字段定义
 * @param {string[]} required 必填字段名
 * @param {boolean} isSubObject 是否为子对象（子对象不排除 type）
 */
function describeFields(schema, properties, required, isSubObject) {
  const req = new Set(required || [])
  return Object.entries(properties || {})
    .filter(([name]) => isSubObject || !NON_FIELD_KEYS.has(name))
    .map(([name, prop]) => {
      const kind = kindOf(name, prop)
      const field = {
        name,
        label: labelOfField(name, prop),
        kind,
        required: req.has(name)
      }
      if (kind === 'enum') field.options = prop.enum
      if (kind === 'objectList') {
        field.itemRef = refNameOf(prop.items.$ref)
        field.itemFields = objectFields(schema, field.itemRef)
      }
      return field
    })
}

/**
 * 取某个区块类型的全部可编辑字段
 * 说明：基类字段（所有类型共有，如 title）+ 该类型 allOf 分支的字段。
 *      按 schema 里 title 在前、类型专属字段在后的顺序，符合「先写标题再写内容」的习惯。
 */
export function blockFields(schema, type) {
  const base = schema?.definitions?.block || {}
  const branch = (base.allOf || []).find(
    (b) => b?.if?.properties?.type?.const === type
  )
  const props = { ...(base.properties || {}), ...(branch?.then?.properties || {}) }
  const required = branch?.then?.required || []
  return describeFields(schema, props, required, false)
}

/** 取某个 $ref 子对象（quizItem / exampleItem 等）的字段 */
export function objectFields(schema, refName) {
  const def = schema?.definitions?.[refName]
  if (!def) return []
  return describeFields(schema, def.properties, def.required, true)
}

/** 按字段种类给一个空值 */
function emptyValueOf(field) {
  switch (field.kind) {
    case 'number':
      return 0
    case 'enum':
      return field.options[0]
    case 'stringList':
      return ['']
    case 'stringMatrix':
      return [['']]
    case 'objectList':
      return [emptyObject(field.itemFields)]
    default:
      return ''
  }
}

/** 按字段描述生成一个只含必填项的空对象 */
function emptyObject(fields) {
  const obj = {}
  for (const f of fields) {
    if (f.required) obj[f.name] = emptyValueOf(f)
  }
  return obj
}

/**
 * 生成某个区块类型的最小合法骨架
 *
 * 说明：只填 required 字段，值为该类型的空值（空串 / 空数组 / 0 / 枚举首项）。
 *      「结构合法」由此保证；「内容非空」是作者的下一步工作，
 *      编辑器会用共用的 validateBlock 实时把空缺标出来（见 src/utils/validateBlock.js）。
 *
 * @returns {object} 形如 { type: 'quiz', items: [{ question: '', answer: '' }] }
 */
export function skeletonOf(schema, type) {
  const obj = { type }
  for (const f of blockFields(schema, type)) {
    if (f.required) obj[f.name] = emptyValueOf(f)
  }
  return obj
}

/** 生成一个新的子对象条目（用于「+ 添加条目」） */
export function newItemOf(field) {
  return emptyObject(field.itemFields || [])
}
