<!--
  EditorView —— 低代码内容编辑器 MVP
  职责：
   - 左侧：单元/页面树，选择要编辑的页面
   - 中部：区块编辑器（按 type 编辑各区块字段）
   - 右侧：实时预览（Schema 驱动渲染）
   - 导出：将编辑后的内容导出为 JS/JSON 数据文件
  说明：这是 P2 阶段的最小可用版本，展示"内容与渲染解耦"的核心流程。
-->
<template>
  <div class="editor">
    <!-- 顶部工具栏 -->
    <header class="editor-toolbar">
      <router-link to="/" class="toolbar-back">← 返回</router-link>
      <h2>✏️ 低代码内容编辑器</h2>
      <!-- 学科选择 -->
      <select v-model="editorSubject" class="subject-select" @change="onSubjectChange">
        <option value="math">📐 数学</option>
        <option value="chinese">✍️ 语文</option>
      </select>
      <!-- 单元选择 -->
      <select v-model="editorUnitNum" class="unit-select" @change="onUnitChange">
        <option v-for="u in site.units" :key="u.num" :value="u.num">{{ u.num }} · {{ u.title }}</option>
      </select>
      <button class="toolbar-export" @click="exportContent">导出</button>
    </header>

    <div class="editor-body">
      <!-- 左栏：页面列表 -->
      <aside class="editor-side">
        <div class="side-title">页面</div>
        <ul class="page-tree">
          <li
            v-for="(f, i) in currentUnit.files"
            :key="f.name"
            class="tree-item"
            :class="{ active: i === curIndex }"
            @click="selectPage(i)"
          >
            {{ f.title }}
          </li>
        </ul>
        <button class="add-block-btn" @click="addBlock">+ 添加区块</button>
      </aside>

      <!-- 中栏：区块编辑 -->
      <main class="editor-main">
        <div v-for="(block, bi) in editingBlocks" :key="bi" class="block-editor">
          <div class="block-editor__head">
            <select v-model="block.type" class="type-select">
              <option v-for="t in blockTypes" :key="t" :value="t">{{ blockTypeLabel(t) }}</option>
            </select>
            <button class="del-btn" @click="removeBlock(bi)">✕</button>
          </div>
          <!-- 文本字段编辑（按类型动态渲染） -->
          <div v-for="field in textFields(block.type)" :key="field" class="field">
            <label>{{ fieldLabel(field) }}</label>
            <textarea v-model="block[field]" rows="3" placeholder="在此输入内容..."></textarea>
          </div>
          <!-- 公式区块的多行公式编辑 -->
          <div v-if="block.type === 'formula' && block.formulas" class="field">
            <label>公式列表</label>
            <div v-for="(f, fi) in block.formulas" :key="fi" class="formula-item">
              <FormulaEditor :modelValue="f" @update:modelValue="v => block.formulas[fi] = v" />
              <button class="del-btn" @click="block.formulas.splice(fi, 1)">✕</button>
            </div>
            <button class="add-item-btn" @click="block.formulas.push('')">+ 添加公式</button>
          </div>
          <!-- 列表字段编辑：items / paragraphs / lines -->
          <div v-if="block.items" class="field">
            <label>条目列表</label>
            <div v-for="(item, ii) in block.items" :key="ii" class="list-item">
              <input :value="item.question || item.title" placeholder="内容" @input="e => setItem(block, ii, e.target.value)" />
              <button class="del-btn" @click="removeItem(block, ii)">✕</button>
            </div>
            <button class="add-item-btn" @click="addItem(block)">+ 添加条目</button>
          </div>
        </div>
      </main>

      <!-- 右栏：实时预览 -->
      <aside class="editor-preview">
        <div class="side-title">实时预览</div>
        <div class="preview-area">
          <h2>{{ curFile.title }}</h2>
          <BlockRenderer v-for="(block, i) in editingBlocks" :key="i" :block="block" />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getSubjectConfig } from '@/content/index'
import BlockRenderer from '@/components/BlockRenderer.vue'
import FormulaEditor from '@/components/FormulaEditor.vue'

// 当前编辑学科（默认数学）
const editorSubject = ref('math')
// 当前编辑单元号（默认第一单元）
const editorUnitNum = ref('01')

// 当前学科配置（随学科切换动态变化）
const site = computed(() => getSubjectConfig(editorSubject.value))

// 当前编辑单元
const currentUnit = computed(() => {
  return site.value.units.find((u) => u.num === editorUnitNum.value) || site.value.units[0]
})
// 当前页索引
const curIndex = ref(0)
// 当前页信息
const curFile = computed(() => currentUnit.value.files[curIndex.value])
// 当前页的区块（编辑副本）
const editingBlocks = ref([])

// 支持的区块类型
const blockTypes = ['knowledge', 'formula', 'table', 'example', 'quiz', 'tip', 'warning', 'mindmap', 'objectives']

// 区块类型中文名
const TYPE_LABEL = {
  knowledge: '知识点', formula: '公式', table: '表格', example: '例题',
  quiz: '题目', tip: '提示', warning: '警告', mindmap: '思维导图', objectives: '学习目标'
}
function blockTypeLabel(t) { return TYPE_LABEL[t] || t }

// 各类型可编辑的文本字段
const TEXT_FIELDS = {
  knowledge: ['title', 'paragraphs'],
  formula: ['title'],
  table: ['title', 'headers', 'rows'],
  example: ['title'],
  quiz: ['title'],
  tip: ['title', 'text'],
  warning: ['text'],
  mindmap: ['title', 'mermaid'],
  objectives: ['title']
}
function textFields(type) { return TEXT_FIELDS[type] || ['title'] }

// 字段中文名
const FIELD_LABEL = { title: '标题', text: '内容', paragraphs: '段落', lines: '公式行', headers: '表头', rows: '表格行' }
function fieldLabel(f) { return FIELD_LABEL[f] || f }

// 学科切换处理
function onSubjectChange() {
  // 切换学科时重置单元号为第一个
  const config = getSubjectConfig(editorSubject.value)
  editorUnitNum.value = config.units[0]?.num || '01'
  curIndex.value = 0
  selectPage(0)
}

// 单元切换处理
function onUnitChange() {
  curIndex.value = 0
  selectPage(0)
}

// 选择页面
async function selectPage(i) {
  curIndex.value = i
  // 加载该页内容作为编辑基础（按学科动态导入）
  try {
    const m = await import(`@/content/${editorSubject.value}/${currentUnit.value.folder}/${curFile.value.name}.js`)
    editingBlocks.value = JSON.parse(JSON.stringify(m.default.blocks || []))
  } catch {
    editingBlocks.value = []
  }
}

// 添加区块
function addBlock() {
  editingBlocks.value.push({ type: 'knowledge', title: '新知识点', paragraphs: '' })
}

// 删除区块
function removeBlock(i) { editingBlocks.value.splice(i, 1) }

// 添加列表条目
function addItem(block) {
  if (!block.items) block.items = []
  block.items.push({ difficulty: 'basic', question: '', answer: '' })
}
function removeItem(block, ii) { block.items.splice(ii, 1) }

// 编辑列表条目内容（同时写入 question 或题目标题字段）
function setItem(block, ii, value) {
  const item = block.items[ii]
  if (Object.prototype.hasOwnProperty.call(item, 'question')) item.question = value
  else if (Object.prototype.hasOwnProperty.call(item, 'title')) item.title = value
}

// 导出内容（生成 JS 文件代码）
function exportContent() {
  const page = {
    id: `${editorSubject.value}-${currentUnit.value.num}-${String(curIndex.value + 1).padStart(2, '0')}`,
    unitNum: currentUnit.value.num,
    subject: editorSubject.value,
    title: curFile.value.title,
    subtitle: curFile.value.subtitle,
    blocks: editingBlocks.value
  }
  // 生成 JS 模块代码
  const code = `export default ${JSON.stringify(page, null, 2)}`
  // 触发浏览器下载
  const blob = new Blob([code], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${curFile.value.name}.js`
  a.click()
  URL.revokeObjectURL(url)
}

// 初始加载第一个页面
selectPage(0)
</script>

<style scoped>
.editor { display: flex; flex-direction: column; height: calc(100vh - 60px); }
.editor-toolbar {
  display: flex; align-items: center; gap: var(--spacer-16);
  padding: var(--spacer-12) var(--spacer-16);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.toolbar-back { color: var(--primary); }
.subject-select, .unit-select {
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 4px 8px;
  color: var(--text); font-size: 0.85rem;
}
.toolbar-export {
  margin-left: auto;
  background: var(--primary); color: #fff;
  border-radius: var(--radius-full);
  padding: 6px 18px;
}
.editor-body { display: flex; flex: 1; overflow: hidden; }
.editor-side {
  width: 200px; border-right: 1px solid var(--border);
  padding: var(--spacer-12); overflow-y: auto;
  background: var(--surface);
}
.side-title { font-weight: 600; margin-bottom: var(--spacer-8); }
.page-tree { list-style: none; }
.tree-item {
  padding: 8px 10px; border-radius: var(--radius-md);
  cursor: pointer; font-size: 0.9rem;
}
.tree-item:hover { background: var(--surface-muted); }
.tree-item.active { background: var(--primary-soft); color: var(--primary); }
.add-block-btn {
  margin-top: var(--spacer-12); width: 100%;
  background: var(--primary-soft); color: var(--primary);
  border: 1px dashed var(--primary); border-radius: var(--radius-md);
  padding: 8px;
}
.editor-main {
  flex: 1; padding: var(--spacer-16); overflow-y: auto;
  display: flex; flex-direction: column; gap: var(--spacer-16);
}
.block-editor {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--spacer-12);
}
.block-editor__head { display: flex; align-items: center; gap: var(--spacer-8); margin-bottom: var(--spacer-8); }
.type-select {
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 4px 8px;
  color: var(--text);
}
.del-btn { margin-left: auto; color: var(--danger); }
.field { margin-bottom: var(--spacer-8); }
.field label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }
.field textarea, .list-item input {
  width: 100%; background: var(--surface-muted);
  border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: 8px; color: var(--text); font-family: inherit;
}
.list-item { display: flex; gap: var(--spacer-8); margin-bottom: var(--spacer-8); }
.add-item-btn { color: var(--primary); font-size: 0.85rem; }
.formula-item { display: flex; gap: var(--spacer-8); margin-bottom: var(--spacer-8); align-items: flex-start; }
.formula-item .del-btn { margin-top: 4px; flex-shrink: 0; }
.editor-preview {
  width: 320px; border-left: 1px solid var(--border);
  padding: var(--spacer-12); overflow-y: auto;
  background: var(--bg);
}
.preview-area { font-size: 0.9rem; }
</style>