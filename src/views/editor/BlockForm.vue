<!--
  BlockForm —— schema 驱动的通用表单
  职责：按 schemaForm.js 给出的字段描述递归渲染控件。
  说明：
   - obj 用 defineModel 声明。表单天然是「子组件编辑父组件持有的值」，直接改 prop 对象
     是 Vue 明确反对的反模式（eslint vue/no-mutating-props 会拦），defineModel 是这件事的官方 API。
   - `objectList` 分支按文件名自引用本组件渲染子对象（题目、例题、易错项），
     所以嵌套层数不写死；schema 若再加一层子对象，这里无需改动。
   - 本组件只认「字段描述」，不认任何具体区块类型 —— 新增类型只需 schema 加分支。
-->
<template>
  <div class="block-form" :class="{ 'is-nested': depth > 0 }">
    <div v-for="f in fields" :key="f.name" class="field" :data-field="f.name">
      <label :for="uid(f.name)">
        {{ f.label }}
        <span v-if="f.required" class="req" title="必填">*</span>
      </label>

      <!-- 单行文本 -->
      <input
        v-if="f.kind === 'string'"
        :id="uid(f.name)"
        v-model="obj[f.name]"
        type="text"
      />

      <!-- 多行文本（题干、解析、Mermaid 源码等） -->
      <textarea
        v-else-if="f.kind === 'textarea'"
        :id="uid(f.name)"
        v-model="obj[f.name]"
        rows="4"
      />

      <!-- 数字（分值、考试时长等） -->
      <input
        v-else-if="f.kind === 'number'"
        :id="uid(f.name)"
        v-model.number="obj[f.name]"
        type="number"
      />

      <!-- 选项下标：候选值来自同级的 options，天然不可能越界 -->
      <select
        v-else-if="f.kind === 'index'"
        :id="uid(f.name)"
        v-model.number="obj[f.name]"
        :disabled="!hasOptions"
      >
        <option v-if="!hasOptions" :value="undefined">（请先填写选项）</option>
        <option v-for="(_, oi) in obj.options" :key="oi" :value="oi">
          {{ String.fromCharCode(65 + oi) }}. {{ obj.options[oi] }}
        </option>
      </select>

      <!-- 枚举（难度、题型、知识点子类型） -->
      <select v-else-if="f.kind === 'enum'" :id="uid(f.name)" v-model="obj[f.name]">
        <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
      </select>

      <!-- 字符串数组（段落、公式行、目标条目） -->
      <div v-else-if="f.kind === 'stringList'" class="list">
        <div v-for="(_, i) in obj[f.name] || []" :key="i" class="row">
          <textarea v-model="obj[f.name][i]" rows="2" />
          <button class="del-btn" :data-del="f.name" aria-label="删除这一行" @click="obj[f.name].splice(i, 1)">✕</button>
        </div>
        <button class="add-item-btn" :data-add="f.name" @click="ensureArray(f.name).push('')">+ 添加一行</button>
      </div>

      <!-- 二维字符串数组（表格 rows；列数跟随同级的 headers） -->
      <div v-else-if="f.kind === 'stringMatrix'" class="list">
        <div v-for="(row, ri) in obj[f.name] || []" :key="ri" class="row">
          <div class="matrix-row">
            <input
              v-for="(_, ci) in row"
              :key="ci"
              v-model="obj[f.name][ri][ci]"
              :placeholder="columnHint(ci)"
            />
          </div>
          <button class="del-btn" :data-del="f.name" aria-label="删除这一行" @click="obj[f.name].splice(ri, 1)">✕</button>
        </div>
        <button class="add-item-btn" :data-add="f.name" @click="addRow(f.name)">+ 添加一行</button>
      </div>

      <!-- 子对象数组（题目 / 例题 / 易错项 / 技巧项）—— 自引用递归 -->
      <div v-else-if="f.kind === 'objectList'" class="list">
        <div v-for="(item, i) in obj[f.name] || []" :key="i" class="obj-item">
          <div class="obj-item__head">
            <span class="obj-item__name">{{ f.label }} {{ i + 1 }}</span>
            <button class="del-btn" :data-del="f.name" aria-label="删除该条目" @click="obj[f.name].splice(i, 1)">✕</button>
          </div>
          <BlockForm :fields="f.itemFields" :obj="item" :depth="depth + 1" />
        </div>
        <button class="add-item-btn" :data-add="f.name" @click="ensureArray(f.name).push(newItemOf(f))">
          + 添加{{ f.label }}
        </button>
      </div>

      <!-- 容器型区块的子区块清单（columns.items / group 结构）—— 只读展示，
           深度编辑留待阶段 6（编辑器写回与序列化统一） -->
      <div v-else-if="f.kind === 'nestedObjectList'" class="nested-readonly">
        <p v-if="!(obj[f.name] || []).length" class="nested-readonly__empty">（暂无子区块）</p>
        <ul v-else class="nested-readonly__list">
          <li v-for="(col, ci) in obj[f.name] || []" :key="ci" class="nested-readonly__col">
            <span class="nested-readonly__col-name">列 {{ ci + 1 }}</span>
            <span class="nested-readonly__col-count">{{ (col || []).length }} 个区块</span>
          </li>
        </ul>
        <p class="nested-readonly__hint">容器子区块请在内容文件中编辑，或在预览区确认效果。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue'
import { newItemOf } from './schemaForm'

defineProps({
  /** schemaForm.blockFields / objectFields 产出的字段描述 */
  fields: { type: Array, required: true },
  /** 嵌套层级，仅用于样式缩进 */
  depth: { type: Number, default: 0 }
})

/**
 * 被编辑的对象
 * 说明：用 defineModel 而非普通 prop —— 表单的核心行为就是「子组件写回父组件持有的值」。
 *      父组件传的是内容对象的深拷贝（见 EditorView.selectPage），不存在污染模块缓存的问题；
 *      子对象数组里的元素是同一个对象引用，所以递归下去也直接生效，无需逐层转发事件。
 */
const obj = defineModel('obj', { type: Object, required: true })

/**
 * 生成 label/控件的关联 id，保证点击文字能聚焦到控件
 * 说明：用 useId() 而不是用 obj 里的字段拼 —— 那样「题型」一改 id 就变，
 *      已渲染的 label 会指向不存在的控件。同级多个递归实例也因此不会撞 id。
 */
const formId = useId()
function uid(name) {
  return `${formId}-${name}`
}

/** 可选字段（如 difficulty）初次编辑时才需要建数组，因此在此按需初始化 */
function ensureArray(name) {
  if (!Array.isArray(obj.value[name])) obj.value[name] = []
  return obj.value[name]
}

/** 表格新增行：列数跟随同级的表头，避免出现列数对不上的行 */
function addRow(name) {
  const cols = Array.isArray(obj.value.headers) && obj.value.headers.length ? obj.value.headers.length : 1
  ensureArray(name).push(Array.from({ length: cols }, () => ''))
}

function columnHint(ci) {
  const h = obj.value.headers
  return Array.isArray(h) && h[ci] ? h[ci] : `第 ${ci + 1} 列`
}

const hasOptions = computed(() => Array.isArray(obj.value.options) && obj.value.options.length > 0)
</script>

<style scoped>
.block-form { display: flex; flex-direction: column; gap: var(--spacer-12); }
.block-form.is-nested {
  border-left: 2px solid var(--border);
  padding-left: var(--spacer-12);
  margin-top: var(--spacer-8);
}
.field label {
  display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;
}
.req { color: var(--danger); }
.field input,
.field textarea,
.field select {
  width: 100%; background: var(--surface-muted);
  border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: 8px; color: var(--text); font-family: inherit; font-size: 0.85rem;
}
.field textarea { resize: vertical; }
.list { display: flex; flex-direction: column; gap: var(--spacer-8); }
.row, .matrix-row { display: flex; gap: var(--spacer-8); align-items: flex-start; }
.row textarea { flex: 1; }
.matrix-row { flex: 1; }
.del-btn { color: var(--danger); flex-shrink: 0; padding: 4px 8px; }
.add-item-btn { color: var(--primary); font-size: 0.85rem; align-self: flex-start; }
.obj-item {
  border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: var(--spacer-8); background: var(--surface);
}
.obj-item__head {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;
}
/* 容器区块子清单（只读） */
.nested-readonly {
  border: 1px dashed var(--border); border-radius: var(--radius-md);
  padding: var(--spacer-8) var(--spacer-12);
  background: var(--surface-muted);
  font-size: 0.8rem; color: var(--text-muted);
}
.nested-readonly__list { list-style: none; }
.nested-readonly__col {
  display: flex; justify-content: space-between; gap: var(--spacer-8);
  padding: 2px 0;
}
.nested-readonly__hint { margin-top: 6px; font-size: 0.75rem; }
</style>
