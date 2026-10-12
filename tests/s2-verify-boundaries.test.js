// @vitest-environment node
/**
 * 批 S2 · 独立证伪 · 攻点③ B1 导航零改动 / ⑥ H1 / ⑧ P-S15 不迁移 / ⑨ 缓存不进同步 / B 测试卫生
 *
 * 这几项不适合「跑代码」，适合**把事实钉死**：用 git diff 与源码解析独立复算，
 * 避免日后有人悄悄改动而无人察觉。git 不可用时跳过（不误报）。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = process.cwd()
const BASE = '54300fa'
const HEAD = 'd8723cc'

function gitOut(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  } catch {
    return ''
  }
}

const changed = gitOut(['diff', '--name-only', BASE, HEAD])
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)

/** 去注释后的源码（行注释需锚定行首，否则会吃掉 https:// 里的 //） */
function stripComments(s) {
  return String(s)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

describe('S2 · 攻点③ B1 导航零改动（红线 4）', () => {
  it('git diff 不含任何学科 site.js 与 src/content/index.js', () => {
    if (!changed.length) return // 浅克隆等取不到 diff 时跳过
    const banned = [
      'src/content/site.js',
      'src/content/index.js',
      'src/content/math/site.js',
      'src/content/chinese/site.js',
      'src/content/computer/site.js'
    ]
    const hit = changed.filter((f) => banned.includes(f))
    expect(hit, `导航注册表被改动：${hit}`).toEqual([])
  })

  it('导航坐标仍来自内置 getSubjectConfig + resolvePageMeta（loadPage 未引入远程坐标）', () => {
    const src = readFileSync(join(ROOT, 'src/content/loadPage.js'), 'utf8')
    const code = stripComments(src)
    expect(code).toMatch(/getSubjectConfig\(/)
    expect(code).toMatch(/resolvePageMeta\(/)
    // 不得出现「用远程单元/坐标反推 fileIndex」的写法
    expect(code).not.toMatch(/fileIndex\s*=\s*[^;]*manifest/)
  })

  it('importPageModule 的模板字面量前缀一字未动（Vite glob 依赖它）', () => {
    const src = readFileSync(join(ROOT, 'src/content/loadPage.js'), 'utf8')
    expect(src).toContain('import(`@/content/${subject}/${folder}/${name}.js`)')
  })
})

describe('S2 · 攻点⑧ P-S15 不迁移', () => {
  it('practiceBankClient.js 与 SearchPanel.vue 一字未动', () => {
    if (!changed.length) return
    expect(changed).not.toContain('src/utils/practiceBankClient.js')
    expect(changed).not.toContain('src/components/SearchPanel.vue')
  })
})

describe('S2 · 攻点⑨ 缓存不进同步引擎 / DB 仍 v7', () => {
  it('sync ENTITIES 不含 content_cache / content_meta', () => {
    const eng = readFileSync(join(ROOT, 'src/sync/engine.js'), 'utf8')
    const block = eng.slice(eng.indexOf('const ENTITIES'), eng.indexOf(']', eng.indexOf('const ENTITIES')))
    expect(block).not.toContain("'content_cache'")
    expect(block).not.toContain("'content_meta'")
  })

  it('DB_VERSION 仍为 7；S2 未新增建表', () => {
    const db = readFileSync(join(ROOT, 'src/stores/studyDb.js'), 'utf8')
    expect(db).toMatch(/const DB_VERSION = 7\b/)
    const diff = gitOut(['diff', BASE, HEAD, '--', 'src/stores/studyDb.js'])
    if (diff) {
      const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
      expect(added.filter((l) => l.includes('createObjectStore')), 'S2 不得新建表').toEqual([])
      expect(added.filter((l) => l.includes('DB_VERSION')), 'S2 不得改 DB_VERSION').toEqual([])
    }
  })

  it('访问器注释明确「刻意不进同步」（防后人误加）', () => {
    const db = readFileSync(join(ROOT, 'src/stores/studyDb.js'), 'utf8')
    const seg = db.slice(db.indexOf('内容双轨缓存'), db.indexOf('内容双轨缓存') + 900)
    expect(seg).toMatch(/不进同步|刻意不进/)
  })
})

describe('S2 · 攻点⑥ H1：新增代码零 import() / eval / new Function', () => {
  const NEW_FILES = [
    'src/content/mergeContent.js',
    'src/utils/fetchJson.js',
    'src/utils/contentClient.js',
    'src/stores/content.js'
  ]

  it('S2 新增的四个模块去注释后 0 处 import() / eval / new Function', () => {
    for (const f of NEW_FILES) {
      const code = stripComments(readFileSync(join(ROOT, f), 'utf8'))
      expect(code, `${f} 含 import()`).not.toMatch(/\bimport\s*\(/)
      expect(code, `${f} 含 eval`).not.toMatch(/(?<![\w.$])eval\s*\(/)
      expect(code, `${f} 含 new Function`).not.toMatch(/\bnew\s+Function\s*\(/)
    }
  })

  it('远程只走 fetch + JSON.parse（fetchJson 内无其它取数方式）', () => {
    const src = stripComments(readFileSync(join(ROOT, 'src/utils/fetchJson.js'), 'utf8'))
    expect(src).toMatch(/\bfetch\(/)
    expect(src).toMatch(/\.json\(\)/)
    expect(src).not.toMatch(/XMLHttpRequest/)
  })

  it('远端唯一外链基址来自 contentManifest / apiBase，不硬编码主机', () => {
    const src = stripComments(readFileSync(join(ROOT, 'src/utils/contentClient.js'), 'utf8'))
    // 不应出现写死的 https:// 主机（基址一律由 apiBase 派生）
    expect(src).not.toMatch(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i)
  })
})

describe('S2 · 攻点C P-S17a 哈希能力边界已如实写明（残留缺口，非缺陷）', () => {
  it('mergeContent.js 注释写明「客户端不重算 sha256」+ 检不出什么 + 由谁兜底', () => {
    const s = readFileSync(join(ROOT, 'src/content/mergeContent.js'), 'utf8')
    expect(s, '未写明不重算').toMatch(/不重算/)
    expect(s, '未提 sha256').toMatch(/sha256/)
    expect(s, '未写明检不出服务端自洽的错误内容').toMatch(/检不出|检测不出|无法检出/)
    expect(s, '未写明发布期兜底').toMatch(/发布期|validate-content/)
    // 同时必须说明「能检出」什么，避免注释只写半边
    expect(s).toMatch(/检出|能检出/)
  })
})

describe('S2 · 测试卫生（B）', () => {
  const NEW_TESTS = [
    'tests/merge-content.test.js',
    'tests/fetch-json.test.js',
    'tests/content-client.test.js',
    'tests/loadpage-remote-fallback.test.js',
    'tests/loadpage-builtin-passthrough.test.js'
  ]

  it('新增用例无 .only / 无理由 .skip / todo', () => {
    for (const f of NEW_TESTS) {
      const s = readFileSync(join(ROOT, f), 'utf8')
      expect(s, `${f} 含 .only`).not.toMatch(/\b(it|describe|test)\.only\b/)
      expect(s, `${f} 含 .skip/.todo`).not.toMatch(/\b(it|describe|test)\.(skip|todo)\b/)
    }
  })

  it('不得依赖 public/content-remote 读盘产物（已 gitignore，CI 里不存在）', () => {
    for (const f of NEW_TESTS) {
      const s = readFileSync(join(ROOT, f), 'utf8')
      // 允许出现在注释里（说明性文字），但不得作为实际读盘路径
      const code = stripComments(s)
      expect(code, `${f} 读盘引用了产物`).not.toMatch(/public[\\/]+content-remote/)
      expect(code, `${f} 读盘引用了产物`).not.toMatch(/readFileSync\([^)]*content-remote/)
    }
  })

  it('A 假绿排查：内置页模块替身只出现在 loadpage-builtin-passthrough 一个文件', () => {
    const withPageMock = NEW_TESTS.filter((f) => {
      const s = readFileSync(join(ROOT, f), 'utf8')
      // 只统计**真实代码行**里的 vi.mock（注释里的示例不算）
      return s.split('\n').some((l) => /vi\.mock\(/.test(l) && !/^\s*(\*|\/\/|\/\*)/.test(l) && /@\/content\//.test(l))
    })
    // 只允许单独那一份文件用内置页替身（它正是为隔离而建），且不得污染 remote-fallback
    expect(withPageMock).toEqual(['tests/loadpage-builtin-passthrough.test.js'])
  })
})
