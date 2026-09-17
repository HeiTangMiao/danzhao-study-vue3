<!--
  EditorView —— 低代码内容编辑器
  职责：
   - 左侧：单元/页面树，选择要编辑的页面
   - 中部：区块编辑器（字段形状由 content-schema 推导，见 schemaForm.js）
   - 右侧：实时预览（与学习页共用 BlockRenderer）
   - 导出：把编辑结果导出为内容文件

  说明：编辑器原先手写字段表，只覆盖 9/14 种类型，errorfocus / strategy / exam 完全不可编辑、
        题目选项也编不了。现在表单由 schema 推导：schema 加字段，表单自动出现。
        校验用的是与 CI 完全相同的实现（src/utils/validateBlock.js），编辑时即可看到错误。
-->
<template>
  <div class="editor">
    <!-- 顶部工具栏 -->
    <header class="editor-toolbar">
      <router-link to="/" class="toolbar-back">← 返回</router-link>
      <h2>✏️ 低代码内容编辑器</h2>
      <!-- 学科选择（由 SUBJECT_META 驱动，新增学科无需改这里） -->
      <select v-model="editorSubject" class="subject-select" @change="onSubjectChange">
        <option v-for="(meta, key) in SUBJECT_META" :key="key" :value="key">
          {{ meta.icon }} {{ meta.name }}
        </option>
      </select>
      <!-- 单元选择 -->
      <select v-model="editorUnitNum" class="unit-select" @change="onUnitChange">
        <option v-for="u in site.units" :key="u.num" :value="u.num">{{ u.num }} · {{ u.title }}</option>
      </select>
      <span v-if="errorTotal" class="toolbar-errors">{{ errorTotal }} 处待修</span>
      <span v-else class="toolbar-ok">校验通过</span>
      <button class="toolbar-export" @click="copySource">{{ copyLabel }}</button>
      <button class="toolbar-export" @click="exportContent">导出文件</button>
      <!-- 写回只在开发期可用（对应 vite 插件的 apply: 'serve'） -->
      <button v-if="isDev" class="toolbar-export" @click="writeBack">{{ writeLabel }}</button>
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
      </aside>

      <!-- 中栏：区块编辑 -->
      <main class="editor-main">
        <div v-for="(block, bi) in editingBlocks" :key="bi" class="block-editor">
          <div class="block-editor__head">
            <select
              :value="block.type"
              class="type-select"
              @change="onTypeChange(bi, $event.target.value)"
            >
              <option v-for="t in BLOCK_TYPES" :key="t" :value="t">{{ labelOf(t) }}</option>
            </select>
            <button class="del-btn" aria-label="删除区块" @click="removeBlock(bi)">✕</button>
          </div>

          <BlockForm :fields="fieldsOfBlock(block)" :obj="block" />

          <!-- 与 CI 同一份校验规则的实时反馈 -->
          <ul v-if="blockErrors[bi] && blockErrors[bi].length" class="block-errors">
            <li v-for="(e, ei) in blockErrors[bi]" :key="ei">{{ e }}</li>
          </ul>
        </div>

        <!-- 新增区块：先选类型，再由 schema 生成最小合法骨架 -->
        <div class="add-block">
          <select v-model="newBlockType" class="type-select">
            <option v-for="t in BLOCK_TYPES" :key="t" :value="t">{{ labelOf(t) }}</option>
          </select>
          <button class="add-block-btn" @click="addBlock">+ 添加区块</button>
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
import { ref, computed, onUnmounted } from 'vue'
import { getSubjectConfig, SUBJECT_META } from '@/content/index'
import { loadPage as loadContentPage } from '@/content/loadPage'
import { serializePage, buildHeader } from '@/content/serializePage'
import { clearMathCache } from '@/composables/useKatex'
import { copyText } from '@/utils/copyText'
import { WRITE_ENDPOINT } from '@/utils/contentWrite'
import BlockRenderer from '@/components/BlockRenderer.vue'
import { BLOCK_TYPES, labelOf } from '@/components/blocks/registry'
import { createBlockValidator } from '@/utils/validateBlock'
import contentSchema from '@/utils/contentSchema'
import { blockFields, skeletonOf } from './schemaForm'
import BlockForm from './BlockForm.vue'

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
// 当前页信息（标题等元信息来自 site.js，内容文件里不再有）
const curFile = computed(() => currentUnit.value.files[curIndex.value])
// 当前页的区块（编辑副本）
const editingBlocks = ref([])

// 新增区块时默认选中的类型
const newBlockType = ref('knowledge')
// 区块类型中文名统一取自渲染注册表，避免编辑器与渲染层各写一份
const fieldsOfBlock = (block) => blockFields(contentSchema, block.type)

// 校验器与 CI（scripts/validate-content.mjs）用的是同一份实现，只是注入了同一份 schema
const validateBlock = createBlockValidator(contentSchema)
const blockErrors = computed(() => editingBlocks.value.map((b) => validateBlock(b)))
const errorTotal = computed(() => blockErrors.value.reduce((n, list) => n + list.length, 0))

// 「复制 .js」按钮的反馈文案：默认 / 成功 / 失败
const COPY_LABELS = { idle: '复制 .js', ok: '已复制', fail: '复制失败' }
const copyState = ref('idle')
const copyLabel = computed(() => COPY_LABELS[copyState.value])

// 「写回文件」按钮：仅开发期存在（对应 vite 插件的 apply: 'serve'）
const isDev = import.meta.env.DEV
const WRITE_LABELS = { idle: '写回文件', ok: '已写回', fail: '写回失败' }
const writeState = ref('idle')
const writeLabel = computed(() => WRITE_LABELS[writeState.value])

/** 生成「闪一下再复位」的反馈函数（复制 / 写回各一个），并在卸载时清掉计时器 */
function makeFlash(stateRef) {
  let timer = null
  const flash = (state) => {
    stateRef.value = state
    clearTimeout(timer)
    timer = setTimeout(() => { stateRef.value = 'idle' }, 1500)
  }
  flash.dispose = () => clearTimeout(timer)
  return flash
}
const flashCopy = makeFlash(copyState)
const flashWrite = makeFlash(writeState)
onUnmounted(() => {
  flashCopy.dispose()
  flashWrite.dispose()
  // 编辑器里公式是「逐字符」在变的，每个中间态都是一个新缓存键，退出时清一次（阶段 7.2）
  clearMathCache()
})

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
  // 加载该页内容作为编辑基础（与 UnitView 共用同一条加载链路）
  try {
    const loaded = await loadContentPage(editorSubject.value, currentUnit.value.num, i)
    // 深拷贝：编辑过程不得污染模块级缓存的内容对象
    editingBlocks.value = JSON.parse(JSON.stringify(loaded?.blocks || []))
  } catch {
    editingBlocks.value = []
  }
}

// 添加区块：按所选类型从 schema 生成最小合法骨架，避免新增即非法
function addBlock() {
  editingBlocks.value.push(skeletonOf(contentSchema, newBlockType.value))
}

// 删除区块
function removeBlock(i) { editingBlocks.value.splice(i, 1) }

// 切换区块类型：字段完全不同，按新类型重新生成骨架（保留原有的标题）
function onTypeChange(i, type) {
  const old = editingBlocks.value[i]
  const next = skeletonOf(contentSchema, type)
  if (old && old.title) next.title = old.title
  editingBlocks.value.splice(i, 1, next)
}

// 导出内容
/**
 * 生成内容文件源码
 * 说明：**只导出 blocks** —— 元信息唯一真相源是 site.js，内容文件里出现
 *      id / unitNum / subject / title / subtitle 会被 validate:content 判为硬错误。
 *      风格由 src/content/serializePage.js 统一（与迁移脚本共用同一份定义），
 *      不得再用 JSON.stringify —— 那正是「引号键风格」的来源。
 */
function buildSource() {
  const header = buildHeader({ title: curFile.value?.title, subtitle: curFile.value?.subtitle })
  return serializePage(editingBlocks.value, { header })
}

/** 导出前提示：有校验问题时不阻止，但要让人知道导出物可能过不了 CI */
function confirmWhenInvalid() {
  if (errorTotal.value === 0) return true
  return window.confirm(`当前有 ${errorTotal.value} 处校验问题，导出的内容可能无法通过 CI。仍要继续吗？`)
}

/** 复制 .js：日常比下载更常用（直接粘回内容文件） */
async function copySource() {
  if (!confirmWhenInvalid()) return
  flashCopy((await copyText(buildSource())) ? 'ok' : 'fail')
}

function exportContent() {
  if (!confirmWhenInvalid()) return
  const blob = new Blob([buildSource()], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${curFile.value.name}.js`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 写回文件（**仅开发期**）：POST 给 scripts/vite-plugin-content-write.mjs 挂的中间件
 * 安全约束在插件侧（只允许覆盖 site.js 注册表里的页面，写前先跑校验）；
 * 失败时把服务端的错误明细原样显示出来，避免「点了没反应」。
 */
async function writeBack() {
  if (!confirmWhenInvalid()) return
  try {
    const res = await fetch(WRITE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: editorSubject.value,
        folder: currentUnit.value.folder,
        name: curFile.value.name,
        blocks: editingBlocks.value
      })
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.ok) {
      flashWrite('ok')
      return
    }
    flashWrite('fail')
    const detail = [data.error, ...(data.errors || [])].filter(Boolean).join('\n')
    window.alert(`写回失败：${detail || `HTTP ${res.status}`}`)
  } catch (e) {
    flashWrite('fail')
    window.alert(`写回失败：${e.message}`)
  }
}

// 初始加载第一个页面
selectPage(0)
</script>

<style scoped>
.editor { display: flex; flex-direction: column; height: calc(100dvh - 60px - var(--sat)); }
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
.toolbar-errors { color: var(--danger); font-size: 0.85rem; }
.toolbar-ok { color: var(--success, var(--primary)); font-size: 0.85rem; }
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
.editor-main {
  flex: 1; padding: var(--spacer-16); overflow-y: auto;
  display: flex; flex-direction: column; gap: var(--spacer-16);
}
.block-editor {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--spacer-12);
}
.block-editor__head { display: flex; align-items: center; gap: var(--spacer-8); margin-bottom: var(--spacer-12); }
.type-select {
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 4px 8px;
  color: var(--text);
}
.del-btn { margin-left: auto; color: var(--danger); }
.block-errors {
  margin-top: var(--spacer-8); padding-left: 18px;
  color: var(--danger); font-size: 0.8rem; list-style: disc;
}
.add-block {
  display: flex; gap: var(--spacer-8); align-items: center;
  padding: var(--spacer-12); border: 1px dashed var(--border);
  border-radius: var(--radius-md);
}
.add-block-btn {
  background: var(--primary-soft); color: var(--primary);
  border-radius: var(--radius-md); padding: 6px 14px;
}
.editor-preview {
  width: 320px; border-left: 1px solid var(--border);
  padding: var(--spacer-12); overflow-y: auto;
  background: var(--bg);
}
.preview-area { font-size: 0.9rem; }
</style>
