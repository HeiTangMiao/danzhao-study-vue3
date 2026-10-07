/**
 * 区块语义校验（纯函数，schema 由调用方注入 —— 浏览器与 Node 共用同一份规则）
 *
 * 背景：区块的合法性有一半是 JSON-Schema 表达不了的语义规则 ——
 *      correctIndex 越界、公式行末尾孤立反斜杠、数组元素不得为空。
 *      这批规则必须两端一致：Node 侧是 CI 关卡（scripts/validate-content.mjs），
 *      浏览器侧是编辑器的实时提示。各写一份必然漂移，就像此前 6 份类型清单那样。
 *
 * 从 schema 派生的部分（类型白名单 / 难度枚举 / 题型枚举）不再手写，
 * 避免「schema 加了类型但校验器不认识」。
 *
 * ⚠️ schema 用参数注入而非 import：Node 侧用 fs 读 JSON、浏览器侧走 Vite 的 JSON 导入，
 *    两端加载方式天生不同。把「怎么拿到 schema」留在调用方，本模块保持零 import。
 */

/**
 * 布局原语的最大嵌套深度。
 * 深度语义：顶层 layout 为 0，其子 layout 为 1，依此类推；达到该值即拒绝再嵌套。
 * 导出常量便于测试与文档引用，避免「上限」在两处各写一个数字。
 */
export const MAX_LAYOUT_DEPTH = 8

/**
 * 创建校验器
 * @param {object} schema content-schema 对象
 * @param {object} [options] 可选注入项
 * @param {Set<string>|null} [options.knownBoardIds] 合法的画板标识集合（src/geometry/boards/ 下的模块名）。
 *          不传则跳过「boardId 能解析到模块」这条校验（保持向后兼容，且本模块不能自己读目录）。
 * @returns {(block:object) => string[]} 返回的数组是**相对该区块**的错误描述，
 *          不含「哪个文件 / 第几个区块」的前缀，由调用方补。
 *          例：Node 侧拼成 `math/01-xxx.js 区块[3] 题目[0] 未知难度: foo`，
 *          编辑器侧则把同一份描述直接列在该区块下方。
 */
export function createBlockValidator(schema, { knownBoardIds = null } = {}) {
  const BLOCK_TYPES = schema.definitions.block.properties.type.enum
  const DIFFICULTY = schema.definitions.exampleItem.properties.difficulty.enum
  // 题型取 quiz 与 exam 的并集（exam 额外支持解答题 solve）
  const QUESTION_TYPES = [
    ...new Set([
      ...schema.definitions.quizItem.properties.type.enum,
      ...schema.definitions.examItem.properties.type.enum
    ])
  ]

  /** 判空：undefined / null / 纯空白 均视为空 */
  const isEmpty = (v) => v === undefined || v === null || String(v).trim() === ''

  /** 是否普通对象（排除 null 与数组）—— 用于 props 这类「应为对象」的字段 */
  const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

  /** 题目类区块（quiz / exam）共用的字段校验 */
  function checkQuestionItems(items, prefix, errors) {
    items.forEach((it, ii) => {
      if (it.difficulty && !DIFFICULTY.includes(it.difficulty)) {
        errors.push(`${prefix}[${ii}] 未知难度: ${it.difficulty}`)
      }
      if (it.type && !QUESTION_TYPES.includes(it.type)) {
        errors.push(`${prefix}[${ii}] 未知题型: ${it.type}`)
      }
      if (it.options && !Array.isArray(it.options)) {
        errors.push(`${prefix}[${ii}] options 应为数组`)
      }
      if (it.correctIndex !== undefined && !it.options) {
        errors.push(`${prefix}[${ii}] 有 correctIndex 但缺少 options`)
      }
      if (it.correctIndex !== undefined && it.options && (it.correctIndex < 0 || it.correctIndex >= it.options.length)) {
        errors.push(`${prefix}[${ii}] correctIndex 越界`)
      }
      // 题目必须给出题干与答案，防止空白占位
      if (isEmpty(it.question)) errors.push(`${prefix}[${ii}] question 为空`)
      if (isEmpty(it.answer)) errors.push(`${prefix}[${ii}] answer 为空`)
    })
  }

  /**
   * 布局原语白名单（P0）：原语种类与「各原语允许的参数及其取值域」都从 schema 派生 ——
   * schema 新增原语或参数时校验器自动认识，避免「schema 加了、校验器不认」的老问题。
   */
  const LAYOUT_KINDS = schema?.definitions?.layoutKind?.enum || []
  const LAYOUT_PROPS = schema?.definitions?.layoutProps?.properties || {}

  /** 校验单个区块，返回相对该区块的错误描述列表 */
  return function validateBlock(block, depth = 0) {
    const errors = []
    if (!block || typeof block !== 'object') return ['不是对象']
    if (!block.type) errors.push('缺少 type')
    else if (!BLOCK_TYPES.includes(block.type)) errors.push(`未知类型: ${block.type}`)

    // 按类型校验必填字段
    switch (block.type) {
      case 'knowledge':
        if (!block.paragraphs) errors.push('知识点区块缺少 paragraphs')
        break
      case 'formula': {
        if (!block.formulas && !block.lines) errors.push('公式区块缺少 formulas')
        else {
          const lines = block.formulas || block.lines
          if (Array.isArray(lines)) {
            lines.forEach((line, li) => {
              // 公式行末尾不允许以反斜杠结尾（KaTeX 顶层解析错误，会以红色源码显示）
              if (typeof line === 'string' && /\\+\s*$/.test(line)) {
                errors.push(`公式区块第${li}行末尾有孤立反斜杠，将导致 KaTeX 渲染失败`)
              }
            })
          }
        }
        break
      }
      case 'table':
        if (!Array.isArray(block.rows)) errors.push('表格区块缺少 rows')
        break
      case 'quiz':
        if (!Array.isArray(block.items)) errors.push('题目区块缺少 items')
        else checkQuestionItems(block.items, '题目', errors)
        break
      case 'example':
        if (!Array.isArray(block.items)) errors.push('例题区块缺少 items')
        else {
          block.items.forEach((it, ii) => {
            if (it.difficulty && !DIFFICULTY.includes(it.difficulty)) {
              errors.push(`例题[${ii}] 未知难度: ${it.difficulty}`)
            }
            // 例题必须有题干，且 solution / answer 至少其一非空（answer 可省略但二者不能皆空）
            if (isEmpty(it.question)) errors.push(`例题[${ii}] question 为空`)
            if (isEmpty(it.solution) && isEmpty(it.answer)) errors.push(`例题[${ii}] solution 与 answer 均为空`)
          })
        }
        break
      case 'errorfocus':
        if (!Array.isArray(block.items)) errors.push('易错专项区块缺少 items')
        break
      case 'strategy':
        if (!Array.isArray(block.items)) errors.push('考试技巧区块缺少 items')
        break
      case 'exam':
        if (!Array.isArray(block.items)) errors.push('模拟卷区块缺少 items')
        else checkQuestionItems(block.items, '模拟卷题目', errors)
        break
      case 'mindmap':
        if (!block.mermaid) errors.push('思维导图区块缺少 mermaid 源码')
        break
      // 文本提示类：必须有实际内容，防止渲染出空白警示/提示框
      case 'warning':
      case 'tip':
        if (isEmpty(block.text)) errors.push(`${block.type} 区块 text 为空`)
        break
      case 'objectives':
        if (!Array.isArray(block.items) || block.items.length === 0) errors.push('目标区块缺少 items')
        else if (block.items.some((t) => isEmpty(t))) errors.push('目标区块存在空 items 元素')
        break
      case 'diagram':
        if (isEmpty(block.boardId)) errors.push('图形区块缺少 boardId')
        else if (knownBoardIds && !knownBoardIds.has(block.boardId)) {
          // 画板代码已从「内容里的 initCode 字符串」迁到 src/geometry/boards/<boardId>.js，
          // 因此「非空」这层保证没了，改为校验 boardId 能解析到真实模块。
          // 「哪些 boardId 合法」由调用方注入：Node 侧读目录、浏览器侧走 import.meta.glob，
          // 本模块保持零 import（与 schema 注入同理）。
          errors.push(`图形区块 boardId "${block.boardId}" 未找到对应画板模块`)
        }
        break
      // 布局原语（P0）：as 白名单 + props 白名单（含取值域）+ children 递归（带深度上限）
      case 'layout': {
        const kind = block.as
        if (isEmpty(kind)) errors.push('布局区块缺少 as（布局原语种类）')
        else if (!LAYOUT_KINDS.includes(kind)) errors.push(`未知布局原语 as: ${kind}`)
        else if (block.props !== undefined) {
          if (!isPlainObject(block.props)) errors.push('布局区块 props 应为对象')
          else {
            const allowed = LAYOUT_PROPS[kind] || {}
            for (const [key, value] of Object.entries(block.props)) {
              const spec = allowed[key]
              if (!spec) {
                errors.push(`布局原语 ${kind} 不支持参数 ${key}`)
                continue
              }
              // 取值域在 schema 中以 enum 表达；未给 enum 的参数不限制取值
              if (Array.isArray(spec.enum) && !spec.enum.includes(value)) {
                errors.push(`布局原语 ${kind} 参数 ${key} 取值非法: ${value}`)
              }
            }
          }
        }
        if (!Array.isArray(block.children)) {
          errors.push('布局区块缺少 children')
        } else if (depth >= MAX_LAYOUT_DEPTH) {
          // 到顶即停：不再向下递归，避免异常内容把校验/渲染开销拖爆
          errors.push(`布局嵌套超过上限 ${MAX_LAYOUT_DEPTH} 层`)
        } else {
          block.children.forEach((child, ci) => {
            for (const e of validateBlock(child, depth + 1)) {
              errors.push(`子区块[${ci}] ${e}`)
            }
          })
        }
        break
      }
      // 容器型区块（阶段 4）：递归校验子区块 —— 子区块的错误带上路径前缀
      case 'columns': {
        const cols = Array.isArray(block.items) ? block.items : []
        cols.forEach((col, ci) => {
          if (!Array.isArray(col)) {
            errors.push(`第${ci + 1}列不是数组`)
            return
          }
          col.forEach((child, bi) => {
            for (const e of validateBlock(child)) {
              errors.push(`第${ci + 1}列 区块[${bi}] ${e}`)
            }
          })
        })
        break
      }
      case 'group': {
        const items = Array.isArray(block.items) ? block.items : []
        items.forEach((child, i) => {
          for (const e of validateBlock(child)) {
            errors.push(`区块[${i}] ${e}`)
          }
        })
        break
      }
      // 结构型区块（阶段 5）
      case 'steps':
        if (!Array.isArray(block.items) || block.items.length === 0) errors.push('步骤区块缺少 items')
        else {
          block.items.forEach((it, ii) => {
            if (!it || typeof it !== 'object') {
              errors.push(`步骤[${ii}] 不是对象`)
              return
            }
            // 序号由渲染层生成，标题必填且不能为空 —— 否则会渲染出没有内容的圆点
            if (isEmpty(it.title)) errors.push(`步骤[${ii}] title 为空`)
            if (it.content !== undefined && isEmpty(it.content)) {
              errors.push(`步骤[${ii}] content 为空（如需省略请删掉该字段）`)
            }
          })
        }
        break
      case 'summary': {
        // 三段均可选，但不能同时为空 —— 否则渲染出一张只有标题的空卡
        const fields = ['points', 'formulas', 'mustKnow']
        const filled = fields.filter((f) => Array.isArray(block[f]) && block[f].length > 0)
        if (filled.length === 0) errors.push('速记区块 points / formulas / mustKnow 至少一项非空')
        for (const f of fields) {
          const v = block[f]
          if (v === undefined) continue
          if (!Array.isArray(v)) errors.push(`速记区块 ${f} 应为数组`)
          else if (v.some((x) => isEmpty(x))) errors.push(`速记区块 ${f} 存在空元素`)
        }
        break
      }
      case 'compare': {
        // 两侧地位对等，两边都必须给名称；维度至少一条，否则整块只剩下两个名字
        if (isEmpty(block.left)) errors.push('对比区块 left 为空')
        if (isEmpty(block.right)) errors.push('对比区块 right 为空')
        if (!Array.isArray(block.aspects) || block.aspects.length === 0) {
          errors.push('对比区块缺少 aspects（对照维度）')
        } else {
          block.aspects.forEach((a, ai) => {
            if (!a || typeof a !== 'object') {
              errors.push(`对比维度[${ai}] 不是对象`)
              return
            }
            for (const f of ['label', 'left', 'right']) {
              if (isEmpty(a[f])) errors.push(`对比维度[${ai}] ${f} 为空`)
            }
          })
        }
        break
      }
      case 'vocab':
        if (!Array.isArray(block.items) || block.items.length === 0) errors.push('术语卡区块缺少 items')
        else {
          block.items.forEach((it, ii) => {
            if (!it || typeof it !== 'object') {
              errors.push(`术语[${ii}] 不是对象`)
              return
            }
            if (isEmpty(it.term)) errors.push(`术语[${ii}] term 为空`)
            if (isEmpty(it.meaning)) errors.push(`术语[${ii}] meaning 为空`)
            // 可选字段给了空串说明本想删掉 —— 直接删字段，别留空行
            for (const f of ['pinyin', 'example', 'note']) {
              if (it[f] !== undefined && isEmpty(it[f])) {
                errors.push(`术语[${ii}] ${f} 为空（如需省略请删掉该字段）`)
              }
            }
          })
        }
        break
      case 'code':
        if (isEmpty(block.code)) errors.push('代码区块 code 为空')
        // 围栏由渲染层提供；内容里再写 ``` 只会原样显示成三反引号
        else if (block.code.includes('```')) errors.push('代码区块 code 里不要再写 ``` 围栏')
        if (block.lang !== undefined && isEmpty(block.lang)) {
          errors.push('代码区块 lang 为空（如需省略请删掉该字段）')
        }
        break
      case 'cloze':
        if (!Array.isArray(block.items) || block.items.length === 0) errors.push('挖空区块缺少 items')
        else {
          block.items.forEach((it, ii) => {
            if (!it || typeof it !== 'object') {
              errors.push(`挖空[${ii}] 不是对象`)
              return
            }
            const text = String(it.text ?? '')
            if (isEmpty(text)) {
              errors.push(`挖空[${ii}] text 为空`)
              return
            }
            // 挖空标记必须成对且至少一处；空挖空等于没挖，一并拦下
            const openings = (text.match(/\{\{/g) || []).length
            const closings = (text.match(/\}\}/g) || []).length
            if (openings !== closings) errors.push(`挖空[${ii}] {{ }} 标记不配对`)
            else if (openings === 0) errors.push(`挖空[${ii}] 没有 {{答案}} 标记`)
            if (/\{\{\s*\}\}/.test(text)) errors.push(`挖空[${ii}] 存在空挖空 {{}}`)
          })
        }
        break
      default:
        break
    }
    return errors
  }
}
