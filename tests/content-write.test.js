/**
 * 内容写回与导出链路测试（阶段 6）
 *
 * 职责：
 *  - 钉死写回路径的双重白名单：学科登记 + site.js 注册表命中，且拒绝任何路径穿越
 *  - 钉死插件只在 dev server 生效（apply: 'serve'）
 *  - 钉死「导出不再产生引号键风格」：编辑器走 serializePage，不得再 JSON.stringify
 * 说明：写回端点的完整链路（含 middleware 落盘）需要真实 dev server + 登录态，
 *      这里覆盖的是安全约束与风格契约这两块纯逻辑 —— 也是真正会出事的部分。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { contentWritePlugin, resolvePagePath, WRITE_ENDPOINT } from '../scripts/vite-plugin-content-write.mjs'
import { CONTENT_DIR, ROOT, buildMetaIndex } from '../scripts/lib/load-content.mjs'
import { serializePage, buildHeader } from '../src/content/serializePage.js'

const registry = await buildMetaIndex()
/** 从真实注册表里取一个页面作为「合法样本」，避免测试里硬编码会漂移的路径 */
const [sampleKey] = registry.keys()
const [sampleSubject, sampleFolder, sampleName] = sampleKey.replace(/\.js$/, '').split('/')

const editorSrc = readFileSync(join(ROOT, 'src', 'views', 'editor', 'EditorView.vue'), 'utf-8')
const viteConfig = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8')

describe('写回路径白名单', () => {
  it('注册表里的页面可以被解析到 src/content 下的绝对路径', () => {
    const file = resolvePagePath(registry, {
      subject: sampleSubject,
      folder: sampleFolder,
      name: sampleName
    })
    expect(file).toBe(join(CONTENT_DIR, sampleSubject, sampleFolder, `${sampleName}.js`))
    expect(existsSync(file)).toBe(true)
  })

  it('未登记的学科一律拒绝', () => {
    expect(resolvePagePath(registry, { subject: 'english', folder: sampleFolder, name: sampleName })).toBeNull()
    expect(resolvePagePath(registry, { subject: '__proto__', folder: sampleFolder, name: sampleName })).toBeNull()
    expect(resolvePagePath(registry, undefined)).toBeNull()
  })

  it('未注册的页面（含 site.js 自己）一律拒绝', () => {
    expect(resolvePagePath(registry, { subject: sampleSubject, folder: sampleFolder, name: '__不存在__' })).toBeNull()
    expect(resolvePagePath(registry, { subject: 'math', folder: '', name: 'site' })).toBeNull()
    // site.js / index.js 等系统模块不在注册表里
    expect(resolvePagePath(registry, { subject: 'math', folder: '.', name: 'site' })).toBeNull()
  })

  it('路径穿越与非法字符一律拒绝', () => {
    const attacks = [
      { folder: '../../..', name: 'x' },
      { folder: '..\\..', name: 'x' },
      { folder: sampleFolder, name: '../../site' },
      { folder: `../${sampleFolder}`, name: sampleName },
      { folder: 'C:\\Windows', name: sampleName },
      { folder: sampleFolder, name: 'x/y' },
      { folder: sampleFolder, name: 'x\\y' },
      { folder: sampleFolder, name: 'x*y' },
      { folder: sampleFolder, name: 'x:y' }
    ]
    for (const bad of attacks) {
      expect(
        resolvePagePath(registry, { subject: sampleSubject, ...bad }),
        `应拒绝：${JSON.stringify(bad)}`
      ).toBeNull()
    }
  })

  it('folder / name 不是字符串时拒绝', () => {
    expect(resolvePagePath(registry, { subject: sampleSubject, folder: null, name: sampleName })).toBeNull()
    expect(resolvePagePath(registry, { subject: sampleSubject, folder: sampleFolder, name: 123 })).toBeNull()
  })
})

describe('插件只作用于开发服务器', () => {
  it('apply 为 serve，且挂了 configureServer', () => {
    const plugin = contentWritePlugin()
    expect(plugin.name).toBe('content-write')
    expect(plugin.apply).toBe('serve')
    expect(typeof plugin.configureServer).toBe('function')
  })

  it('vite.config.js 已注册该插件', () => {
    expect(viteConfig).toContain("from './scripts/vite-plugin-content-write.mjs'")
    expect(viteConfig).toContain('contentWritePlugin()')
  })

  it('端点是单一真相源（编辑器与插件共用同一个常量）', () => {
    expect(WRITE_ENDPOINT).toBe('/__content-write')
    expect(editorSrc).toContain("from '@/utils/contentWrite'")
    expect(editorSrc).toContain('WRITE_ENDPOINT')
    // 写回按钮只在开发期渲染
    expect(editorSrc).toContain('v-if="isDev"')
  })
})

describe('编辑器导出改用统一风格', () => {
  it('导出走 serializePage + buildHeader，不再用 JSON.stringify 拼文件', () => {
    expect(editorSrc).toContain('serializePage(editingBlocks.value')
    expect(editorSrc).toContain('buildHeader(')
    expect(editorSrc).not.toMatch(/export default \$\{JSON\.stringify/)
  })

  it('导出物只有 blocks，不带任何元信息字段', () => {
    const out = serializePage([{ type: 'tip', text: 'x' }], { header: buildHeader({ title: '某页' }) })
    // 顶层键只有 blocks；元信息（id / unitNum / subject / subtitle）不得出现
    expect(out).toMatch(/^\/\*\*[\s\S]*\*\/\nexport default \{\n {2}blocks: \[/)
    for (const key of ['id', 'unitNum', 'subject', 'subtitle']) {
      expect(out, `导出物不应出现 ${key}`).not.toMatch(new RegExp(`^\\s*${key}:`, 'm'))
    }
    // 写回请求体里确实带了定位信息（否则服务端无从判断目标页）
    for (const key of ['subject:', 'folder:', 'name:', 'blocks:']) {
      expect(editorSrc, `写回请求体缺 ${key}`).toContain(key)
    }
  })
})