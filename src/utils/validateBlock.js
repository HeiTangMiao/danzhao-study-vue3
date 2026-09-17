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
 * 创建校验器
 * @param {object} schema content-schema 对象
 * @returns {(block:object) => string[]} 返回的数组是**相对该区块**的错误描述，
 *          不含「哪个文件 / 第几个区块」的前缀，由调用方补。
 *          例：Node 侧拼成 `math/01-xxx.js 区块[3] 题目[0] 未知难度: foo`，
 *          编辑器侧则把同一份描述直接列在该区块下方。
 */
export function createBlockValidator(schema) {
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

  /** 校验单个区块，返回相对该区块的错误描述列表 */
  return function validateBlock(block) {
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
        if (isEmpty(block.initCode)) errors.push('图形区块缺少 initCode')
        break
      case 'desmos':
        if (block.initialExpressions !== undefined) {
          if (!Array.isArray(block.initialExpressions) || block.initialExpressions.length === 0) {
            errors.push('Desmos 区块 initialExpressions 需为非空字符串数组')
          } else if (block.initialExpressions.some((e) => isEmpty(e))) {
            errors.push('Desmos 区块 initialExpressions 存在空元素')
          }
        }
        break
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
      default:
        break
    }
    return errors
  }
}
