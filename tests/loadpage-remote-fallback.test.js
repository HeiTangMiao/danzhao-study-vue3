/**
 * loadPage 远程优先 + 内置兜底的端到端测试（批 S2 · 提交③）
 *
 * 钉死四件事：
 *   ① 远程缓存命中 → 用远程 blocks（且**不**加载内置 chunk）
 *   ② 任一步失败（无缓存 / 读缓存抛异常 / 结构不可用）→ **回退内置**，结果与今日一致
 *   ③ 内置内容零回归（27+ 个单元逐单元首页仍可加载，坐标不错位）
 *   ④ B1 边界：导航派生层（`site.js` / `index.js` / fileIndex）**零改动**
 *
 * 做法：**不 mock loader**，而是把真实的 contentClient 跑在 `fake-indexeddb` 上
 * （与生产同一条读路径：进程内 Map → IndexedDB → 逐页校验），只往 content_cache 里
 * 注入 fixture。这样「远程命中」与「回退内置」都是真实链路，不是替身之间的握手。
 *
 * ⚠️ 不读盘产物：`public/content-remote/` 已被 S1 写进 .gitignore，干净工作树没有产物。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { loadPage, importPageModule } from '@/content/loadPage'
import { getSubjectConfig } from '@/content/index'
import { resolvePageMeta } from '@/content/pageMeta'
import { resetContentClient } from '@/utils/contentClient'
import { useStudyDbStore } from '@/stores/studyDb'
import { HASH_PREFIX, OP } from '@/content/contentManifest'

const ROOT = process.cwd()
const read = (rel) => readFileSync(join(ROOT, rel), 'utf-8')
const HASH = (c = 'a') => HASH_PREFIX + c.repeat(64)

/** 造一页远程内容 */
function remotePage(fileIndex, blocks) {
  return {
    subject: 'math', unitNum: '01', fileIndex,
    fileKey: `math_01_第${fileIndex}页`, op: OP.UPSERT,
    blocks: blocks ?? [{ type: 'text', text: `远程-${fileIndex}` }],
    hash: HASH()
  }
}

/** 往 content_cache 里塞一个单元分片（并登记逐页哈希） */
async function seedCache(unitKey, pages, pageHashes) {
  const db = useStudyDbStore()
  await db.init()
  await db.saveContentCache({
    key: unitKey, version: 1, hash: HASH('u'), pageHashes, pages
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  resetContentClient() // 清进程内二级缓存 → 强制走 IndexedDB 读路径
  const db = useStudyDbStore()
  await db.init()
  await db.clearContentCache()
})

/** 内置兜底的期望值：直接 import 内置模块（不经过 loadPage） */
async function builtinBlocksOf(subject, unitNum, fileIndex) {
  const meta = resolvePageMeta(getSubjectConfig(subject), unitNum, fileIndex)
  const mod = await importPageModule(subject, meta.folder, meta.name)
  return mod.default.blocks
}

describe('loadPage · 远程缓存命中优先', () => {
  it('命中 → 用远程 blocks，元信息仍来自内置 site.js', async () => {
    const p = remotePage(0)
    await seedCache('math/01', [p], { '01/0': p.hash })

    const page = await loadPage('math', '01', 0)
    expect(page.blocks).toEqual(p.blocks)
    // 元信息（导航坐标 / 标题）仍由内置 site.js 推导 —— 远程层只搬 blocks
    expect(page.subject).toBe('math')
    expect(page.unitNum).toBe('01')
    expect(page.fileIndex).toBe(0)
    expect(page.id).toBe('math-01-01')
    expect(typeof page.title).toBe('string')
    expect(page.title.length).toBeGreaterThan(0)
  })

  it('坐标 fidelity：缓存里放的是 fileIndex=1 → 只有 01/1 命中，01/0 仍走内置', async () => {
    const p1 = remotePage(1)
    await seedCache('math/01', [p1], { '01/1': p1.hash })

    expect((await loadPage('math', '01', 1)).blocks).toEqual(p1.blocks)
    expect((await loadPage('math', '01', 0)).blocks).toEqual(await builtinBlocksOf('math', '01', 0))
  })
})

describe('loadPage · 任一步失败 → 回退内置', () => {
  it('无缓存（首次启动 / 离线）→ 用内置 blocks，结果与今日一致', async () => {
    const page = await loadPage('math', '01', 0)
    expect(page.blocks).toEqual(await builtinBlocksOf('math', '01', 0))
    expect(page.blocks.length).toBeGreaterThan(0)
  })

  it('读缓存抛异常（IndexedDB 不可用）→ 静默回退内置，不把异常抛给调用方', async () => {
    const db = useStudyDbStore()
    db.getContentCache = async () => { throw new Error('IDB 爆炸') }
    const page = await loadPage('math', '01', 0)
    expect(page.blocks).toEqual(await builtinBlocksOf('math', '01', 0))
  })

  it('远程结构不可用（blocks 非数组）→ 回退内置，绝不产出空页', async () => {
    const broken = { ...remotePage(0), blocks: 'oops' }
    await seedCache('math/01', [broken], { '01/0': broken.hash })
    const page = await loadPage('math', '01', 0)
    expect(page.blocks).toEqual(await builtinBlocksOf('math', '01', 0))
    expect(page.blocks.length).toBeGreaterThan(0)
  })

  it('哈希不符（缓存被写坏）→ 丢弃该页 → 回退内置', async () => {
    const p = remotePage(0)
    await seedCache('math/01', [p], { '01/0': HASH('b') }) // 登记的与页内 hash 不一致
    const page = await loadPage('math', '01', 0)
    expect(page.blocks).toEqual(await builtinBlocksOf('math', '01', 0))
  })

  it('坐标越界 → null（与既有语义一致，不因远程层改变）', async () => {
    expect(await loadPage('math', '99', 0)).toBeNull()
    expect(await loadPage('math', '01', 9999)).toBeNull()
  })
})

describe('loadPage · 内置内容零回归', () => {
  it('每个单元的首页都能加载出非空 blocks，且坐标不错位（远程层空缓存时）', async () => {
    const failures = []
    let count = 0
    for (const subject of ['math', 'chinese', 'computer']) {
      for (const unit of getSubjectConfig(subject).units) {
        const page = await loadPage(subject, unit.num, 0)
        count += 1
        if (!page || !Array.isArray(page.blocks) || page.blocks.length === 0) {
          failures.push(`${subject}/${unit.num} 空页`)
          continue
        }
        if (page.unitNum !== unit.num || page.id !== `${subject}-${unit.num}-01`) {
          failures.push(`${subject}/${unit.num} 坐标错位`)
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(27)
    expect(failures).toEqual([])
  }, 60000)
})

describe('B1 边界 · 导航派生层零改动', () => {
  it('loadPage 仍用内置 getSubjectConfig + resolvePageMeta 取坐标（未改导航来源）', () => {
    expect(read('src/content/loadPage.js'))
      .toContain('resolvePageMeta(getSubjectConfig(subject), unitNum, fileIndex)')
  })

  it('importPageModule 的 @/content/ 字面量前缀原样保留（H1 / 打包资产）', () => {
    expect(read('src/content/loadPage.js'))
      .toContain('import(`@/content/${subject}/${folder}/${name}.js`)')
  })

  it('S2 新增层不 import 导航派生模块（site.js / index.js）', () => {
    for (const rel of [
      'src/utils/contentClient.js', 'src/utils/fetchJson.js',
      'src/content/mergeContent.js', 'src/stores/content.js'
    ]) {
      const src = read(rel)
      expect(src, `${rel} 不应 import site.js`).not.toMatch(/from\s+['"][^'"]*\bsite(\.js)?['"]/)
      expect(src, `${rel} 不应 import 学科索引 index.js`).not.toMatch(/from\s+['"][^'"]*\/index(\.js)?['"]/)
    }
  })

  it('contentClient 对非 UPSERT 的 op 静默忽略（P-S19 a，B1 不产出 append）', () => {
    expect(read('src/utils/contentClient.js')).toContain('p.op !== OP.UPSERT')
  })

  it('自批 S2 基线以来 site.js / index.js 从未被改动（fileIndex 零位移）', () => {
    // 54300fa = 批 S2 派工基线。fileIndex 是 URL 与历史进度的身份，位移 = 全站进度错位。
    const BASELINE = '54300fa'
    const changed = execSync(`git diff --name-only ${BASELINE} HEAD`, { encoding: 'utf-8' })
      .split('\n').filter(Boolean)
    expect(changed).not.toContain('src/content/site.js')
    expect(changed).not.toContain('src/content/index.js')
    expect(changed).not.toContain('src/content/chinese/site.js')
    expect(changed).not.toContain('src/content/computer/site.js')
  })
})

describe('App.vue · 启动后台静默刷新（P-S11 a）', () => {
  it('根组件挂载即触发一次后台刷新（fire-and-forget，不 await）', () => {
    const src = read('src/App.vue')
    expect(src).toContain("import { startBackgroundRefresh } from '@/utils/contentClient'")
    expect(src).toMatch(/onMounted\(\(\)\s*=>\s*\{[^}]*startBackgroundRefresh\(\)/)
  })
})
