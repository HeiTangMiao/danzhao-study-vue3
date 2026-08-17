<!--
  FormulaEditor —— 公式可视化编辑器组件
  职责：
   - 提供常用数学符号快捷输入面板（分数、根号、上下标、希腊字母等）
   - 提供常用公式模板快捷插入（二次公式、三角恒等式等）
   - 实时预览 LaTeX 渲染效果
   - 双向绑定 LaTeX 字符串（v-model）
   - 支持在低代码编辑器中嵌入使用
  说明：不依赖 MathQuill 第三方库，使用纯 LaTeX 文本 + MathJax 预览实现，
       避免引入额外依赖，同时保持与渲染端的一致性。
-->
<template>
  <div class="formula-editor">
    <!-- 模板快捷面板 -->
    <div v-if="showTemplates" class="template-panel">
      <div class="template-group">
        <span class="group-label">常用公式模板</span>
        <button
          v-for="tpl in formulaTemplates"
          :key="tpl.label"
          class="tpl-btn"
          :title="tpl.label"
          @click="insertTemplate(tpl.latex)"
        >{{ tpl.label }}</button>
      </div>
    </div>

    <!-- 符号快捷面板 -->
    <div class="symbol-panel">
      <div v-for="group in symbolGroups" :key="group.label" class="symbol-group">
        <span class="group-label">{{ group.label }}</span>
        <button
          v-for="sym in group.symbols"
          :key="sym.latex"
          class="sym-btn"
          :title="sym.label"
          @click="insertSymbol(sym.latex)"
        >{{ sym.display }}</button>
      </div>
      <!-- 模板切换按钮 -->
      <button class="tpl-toggle" @click="showTemplates = !showTemplates">
        {{ showTemplates ? '收起模板' : '📋 模板' }}
      </button>
    </div>

    <!-- LaTeX 输入区 -->
    <div class="input-area">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        class="latex-input"
        :placeholder="placeholder"
        rows="2"
        @input="onInput"
      ></textarea>
    </div>

    <!-- 实时预览 -->
    <div class="preview-area">
      <span class="preview-label">预览：</span>
      <MathJaxRender v-if="modelValue" :text="'$$' + modelValue + '$$'" />
      <span v-else class="preview-empty">在上方输入 LaTeX 公式…</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MathJaxRender from './MathJaxRender.vue'

const props = defineProps({
  // 双向绑定的 LaTeX 字符串
  modelValue: { type: String, default: '' },
  // 占位提示
  placeholder: { type: String, default: '输入 LaTeX 公式，如 \\frac{a}{b}' }
})

const emit = defineEmits(['update:modelValue'])

// textarea 引用（用于光标位置插入）
const textareaRef = ref(null)

// 模板面板显隐
const showTemplates = ref(false)

// 常用公式模板
const formulaTemplates = [
  { label: '二次公式', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { label: '判别式', latex: '\\Delta = b^2 - 4ac' },
  { label: '韦达定理', latex: 'x_1 + x_2 = -\\frac{b}{a}, \\quad x_1 x_2 = \\frac{c}{a}' },
  { label: '基本不等式', latex: 'a + b \\geq 2\\sqrt{ab} \\quad (a > 0, b > 0)' },
  { label: 'sin²+cos²', latex: '\\sin^2\\alpha + \\cos^2\\alpha = 1' },
  { label: '二倍角', latex: '\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha' },
  { label: '余弦定理', latex: 'a^2 = b^2 + c^2 - 2bc\\cos A' },
  { label: '正弦定理', latex: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R' },
  { label: '等差通项', latex: 'a_n = a_1 + (n-1)d' },
  { label: '等差求和', latex: 'S_n = \\frac{n(a_1 + a_n)}{2}' },
  { label: '等比通项', latex: 'a_n = a_1 \\cdot q^{n-1}' },
  { label: '等比求和', latex: 'S_n = \\frac{a_1(1 - q^n)}{1 - q} \\quad (q \\neq 1)' },
  { label: '对数换底', latex: '\\log_a b = \\frac{\\log_c b}{\\log_c a}' },
  { label: '排列数', latex: 'A_n^m = \\frac{n!}{(n-m)!}' },
  { label: '组合数', latex: 'C_n^m = \\frac{n!}{m!(n-m)!}' },
  { label: '二项式', latex: '(a+b)^n = \\sum_{k=0}^{n} C_n^k a^{n-k} b^k' }
]

// 符号快捷面板分组
const symbolGroups = [
  {
    label: '运算',
    symbols: [
      { display: '±', latex: '\\pm', label: '加减' },
      { display: '×', latex: '\\times', label: '乘' },
      { display: '÷', latex: '\\div', label: '除' },
      { display: '·', latex: '\\cdot', label: '点乘' },
      { display: '≠', latex: '\\neq', label: '不等于' },
      { display: '≤', latex: '\\leq', label: '小于等于' },
      { display: '≥', latex: '\\geq', label: '大于等于' },
      { display: '≈', latex: '\\approx', label: '约等于' }
    ]
  },
  {
    label: '结构',
    symbols: [
      { display: 'a/b', latex: '\\frac{}{}', label: '分数' },
      { display: '√', latex: '\\sqrt{}', label: '平方根' },
      { display: 'x²', latex: '^{}', label: '上标' },
      { display: 'x₂', latex: '_{}', label: '下标' },
      { display: '∑', latex: '\\sum_{}^{}', label: '求和' },
      { display: '∏', latex: '\\prod_{}^{}', label: '连乘' },
      { display: '∫', latex: '\\int_{}^{}', label: '积分' },
      { display: 'lim', latex: '\\lim_{\\to}', label: '极限' }
    ]
  },
  {
    label: '集合',
    symbols: [
      { display: '∈', latex: '\\in', label: '属于' },
      { display: '∉', latex: '\\notin', label: '不属于' },
      { display: '⊆', latex: '\\subseteq', label: '子集' },
      { display: '⊂', latex: '\\subset', label: '真子集' },
      { display: '∪', latex: '\\cup', label: '并集' },
      { display: '∩', latex: '\\cap', label: '交集' },
      { display: '∅', latex: '\\emptyset', label: '空集' },
      { display: 'ℝ', latex: '\\mathbb{R}', label: '实数集' },
      { display: 'ℕ', latex: '\\mathbb{N}', label: '自然数集' },
      { display: 'ℤ', latex: '\\mathbb{Z}', label: '整数集' }
    ]
  },
  {
    label: '希腊',
    symbols: [
      { display: 'α', latex: '\\alpha', label: 'alpha' },
      { display: 'β', latex: '\\beta', label: 'beta' },
      { display: 'γ', latex: '\\gamma', label: 'gamma' },
      { display: 'θ', latex: '\\theta', label: 'theta' },
      { display: 'π', latex: '\\pi', label: 'pi' },
      { display: 'φ', latex: '\\phi', label: 'phi' },
      { display: 'Δ', latex: '\\Delta', label: 'Delta' },
      { display: 'λ', latex: '\\lambda', label: 'lambda' }
    ]
  },
  {
    label: '三角',
    symbols: [
      { display: 'sin', latex: '\\sin', label: '正弦' },
      { display: 'cos', latex: '\\cos', label: '余弦' },
      { display: 'tan', latex: '\\tan', label: '正切' },
      { display: 'cot', latex: '\\cot', label: '余切' },
      { display: '°', latex: '^{\\circ}', label: '度' },
      { display: 'log', latex: '\\log_{}', label: '对数' },
      { display: 'ln', latex: '\\ln', label: '自然对数' }
    ]
  },
  {
    label: '箭头',
    symbols: [
      { display: '→', latex: '\\to', label: '右箭头' },
      { display: '⇒', latex: '\\Rightarrow', label: '推出' },
      { display: '⇔', latex: '\\Leftrightarrow', label: '等价' },
      { display: '↔', latex: '\\leftrightarrow', label: '双向' },
      { display: '↑', latex: '\\uparrow', label: '上箭头' },
      { display: '↓', latex: '\\downarrow', label: '下箭头' }
    ]
  }
]

/**
 * 在光标位置插入符号
 * 支持选中文本包裹（如分数包裹选中的表达式）
 */
function insertSymbol(latex) {
  const ta = textareaRef.value
  if (!ta) {
    // 降级：直接追加到末尾
    emit('update:modelValue', props.modelValue + latex)
    return
  }

  const start = ta.selectionStart
  const end = ta.selectionEnd
  const before = props.modelValue.slice(0, start)
  const selected = props.modelValue.slice(start, end)
  const after = props.modelValue.slice(end)

  // 如果有选中文本且符号含空花括号，将选中文本填入第一个 {} 内
  let insertText = latex
  if (selected && latex.includes('{}')) {
    insertText = latex.replace('{}', `{${selected}}`)
  }

  const newValue = before + insertText + after
  emit('update:modelValue', newValue)

  // 恢复光标位置（插入后放到插入文本末尾）
  requestAnimationFrame(() => {
    ta.focus()
    const pos = start + insertText.length
    ta.setSelectionRange(pos, pos)
  })
}

/**
 * 插入公式模板（替换当前内容或追加到光标位置）
 */
function insertTemplate(latex) {
  const ta = textareaRef.value
  if (!ta) {
    emit('update:modelValue', props.modelValue ? props.modelValue + ' \\\\ ' + latex : latex)
    return
  }

  const start = ta.selectionStart
  const end = ta.selectionEnd
  const before = props.modelValue.slice(0, start)
  const after = props.modelValue.slice(end)

  // 如果当前为空或光标在开头，直接替换；否则用换行分隔
  const sep = before && !before.endsWith('\n') ? ' \\\\ ' : ''
  const newValue = before + sep + latex + after
  emit('update:modelValue', newValue)

  requestAnimationFrame(() => {
    ta.focus()
    const pos = (before + sep + latex).length
    ta.setSelectionRange(pos, pos)
  })
}

/** 输入事件处理 */
function onInput(e) {
  emit('update:modelValue', e.target.value)
}
</script>

<style scoped>
.formula-editor {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  overflow: hidden;
}

/* 符号面板 */
.symbol-panel {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacer-8);
  padding: var(--spacer-8);
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}

/* 模板面板 */
.template-panel {
  padding: var(--spacer-8);
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
.template-group { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.tpl-btn {
  background: var(--primary-soft); color: var(--primary);
  border: 1px solid var(--primary); border-radius: var(--radius-sm);
  padding: 3px 8px; font-size: 0.78rem; cursor: pointer;
  transition: all 0.15s;
}
.tpl-btn:hover { background: var(--primary); color: #fff; }
.tpl-toggle {
  margin-left: auto;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 2px 8px;
  font-size: 0.75rem; cursor: pointer; color: var(--text-muted);
}
.tpl-toggle:hover { border-color: var(--primary); color: var(--primary); }
.symbol-group { display: flex; align-items: center; gap: 2px; }
.group-label {
  font-size: 0.7rem; color: var(--text-muted);
  margin-right: 2px; white-space: nowrap;
}
.sym-btn {
  min-width: 28px; height: 28px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer; font-size: 0.85rem;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.sym-btn:hover { background: var(--primary-soft); border-color: var(--primary); }

/* 输入区 */
.input-area { padding: var(--spacer-8); }
.latex-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--spacer-8);
  color: var(--text);
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  resize: vertical;
}
.latex-input:focus { outline: none; border-color: var(--primary); }

/* 预览区 */
.preview-area {
  display: flex; align-items: center; gap: var(--spacer-8);
  padding: var(--spacer-8) var(--spacer-12);
  border-top: 1px solid var(--border);
  background: var(--surface-muted);
  min-height: 40px;
}
.preview-label { font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; }
.preview-empty { font-size: 0.8rem; color: var(--text-muted); font-style: italic; }
</style>