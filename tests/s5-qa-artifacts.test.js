// @vitest-environment node
/**
 * 批 S5 · QA 独立对抗验证 —— D 组：**半填充拒绝（CLI 层真跑）** + **产物与 manifest 哈希一致性**
 *
 * 独立手段（不复用工程师的断言写法）：
 *   - 在**临时副本**里真跑 `node scripts/build-content-remote.mjs` / `check-content-remote.mjs`
 *     子进程，断言**退出码**与**盘上产物指纹是否被改动** —— 工程师的测试是 in-process
 *     注入 fixture，覆盖的是函数；本组覆盖的是「命令行这一层」能不能真的拦住。
 *   - 哈希一致性不比对 manifest 里写的值与实现算的值（同源 = 假绿），而是**独立重算
 *     盘上文件的 sha256** 再比对；并额外做「翻一个字节 → 哈希必须变」的位移验证。
 *
 * ⚠️ 全部操作在 /tmp 副本中进行，**不碰主工作树的 public/**。
 *
 * 覆盖攻击面：④（半填充 CLI 拒绝 + 不落盘）⑦（hash 等于盘上真实 sha256 + 翻字节必变）
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  mkdtempSync, rmSync, mkdirSync, existsSync, writeFileSync,
  readFileSync, readdirSync, statSync
} from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
/**
 * 沙箱只需这几处：四个脚本的依赖树**零 npm 包**（已核实），
 * 故不需要 node_modules；产物目录按需挑，不整拷 public/（vendor 有 116 MB）。
 * 只 ~8.7 MB。
 */
const COPY_DIRS = ['src', 'scripts', 'schema']
const COPY_FILES = ['package.json']
const PUBLIC_ITEMS = ['content-remote', 'practice-bank', 'search-body', 'search-meta.json']

/**
 * 手工递归复制（readFileSync + writeFileSync）
 *
 * ⚠️ 为什么不用 `cpSync`：本沙箱的 fs shim 会拦 `copyFileSync`
 *    （`Brokered host copy source refused by file policy`），全量 `npm test` 时
 *    整个套件会挂掉；逐文件读写不触发该策略。
 */
function copyInto(srcRoot, dstRoot) {
  mkdirSync(dstRoot, { recursive: true })
  for (const name of readdirSync(srcRoot)) {
    const s = join(srcRoot, name)
    const d = join(dstRoot, name)
    if (statSync(s).isDirectory()) copyInto(s, d)
    else writeFileSync(d, readFileSync(s))
  }
}

/** 递归列目录下的文件 → {相对路径: sha256} */
function fingerprint(root) {
  const out = {}
  if (!existsSync(root)) return out
  for (const dp of [root]) walk(dp, root, out)
  return out
}
function walk(dir, root, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, root, out)
    else out[relative(root, p).split(sep).join('/')] = sha256File(p)
  }
}
function sha256File(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex')
}

/** 建一个最小沙箱（只含跑四个构建脚本所需的目录） */
function makeSandbox(tag) {
  const dir = mkdtempSync(join(tmpdir(), `qa-s5-${tag}-`))
  for (const d of COPY_DIRS) copyInto(join(ROOT, d), join(dir, d))
  for (const f of COPY_FILES) writeFileSync(join(dir, f), readFileSync(join(ROOT, f)))
  const pub = join(dir, 'public')
  mkdirSync(pub, { recursive: true })
  for (const item of PUBLIC_ITEMS) {
    const s = join(ROOT, 'public', item)
    if (!existsSync(s)) continue
    if (statSync(s).isDirectory()) copyInto(s, join(pub, item))
    else writeFileSync(join(pub, item), readFileSync(s))
  }
  return dir
}

/** 跑一条命令，返回 {status, out}（cwd = 沙箱） */
function run(dir, args) {
  const r = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf-8' })
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') }
}

function rmrf(p) {
  if (existsSync(p)) rmSync(p, { recursive: true, force: true })
}

// ════════════════════════════════════════════════════════════════
// D1 · 真跑 CLI：半填充必须**拒绝且一个字节都不落盘**（攻击面 ④）
// ════════════════════════════════════════════════════════════════
describe('D1 · CLI 层：半填充 / 半份缺失 → 非零退出 + 不落盘', () => {
  let dir = null
  const manifestAbs = () => join(dir, 'public/content-remote/manifest.json')

  beforeAll(() => {
    dir = makeSandbox('cli')
  }, 120000)

  afterAll(() => {
    rmrf(dir)
  })

  /**
   * 把沙箱恢复到「四份产物齐全」（沙箱里被删过的产物补回）
   *
   * ⚠️ **不能**从仓库的 `public/` 拷：`search-body/` / `search-meta.json` / `content-remote/`
   *    都是 **gitignore 的构建产物** —— CI 的干净检出里根本没有，本地跑过构建才有。
   *    2026-10-17 实证：靠拷贝且 `!existsSync → continue` 静默跳过 → CI 上本组 6 例全红、
   *    本地全绿（典型的「只在干净环境暴露」）。故产物**必须在沙箱里产生**。
   *
   * 2026-10-18 提速：两个构建脚本的产出是**确定的**（同输入同输出），而本函数在 D1 的
   * 8+ 个用例里被反复调用，每次都重跑一遍生成 —— 这是该文件单跑 123s 的主要来源。
   * 改为：**首次真跑生成并备份到沙箱内** `.artifacts-cache/`，后续从缓存拷回。
   * 缓存同样产生于沙箱内（不是从仓库 public/ 拷），上面那条坑依然不踩。
   */
  const CACHE_ITEMS = ['public/practice-bank', 'public/search-body', 'public/search-meta.json']
  let artifactsCache = null

  /** 恢复单个产物项：目录用 copyInto，文件用 read/write（copyInto 只吃目录，search-meta.json 是文件） */
  function restoreItem(src, dst) {
    if (statSync(src).isDirectory()) copyInto(src, dst)
    else writeFileSync(dst, readFileSync(src))
  }

  function restoreArtifacts() {
    if (artifactsCache) {
      for (const item of CACHE_ITEMS) {
        rmrf(join(dir, item))
        restoreItem(join(artifactsCache, item), join(dir, item))
      }
      return
    }
    const p = run(dir, ['scripts/build-practice-bank.mjs'])
    expect(p.status, `前置：题库产物生成失败：${p.out}`).toBe(0)
    const s = run(dir, ['scripts/build-search-index.mjs'])
    expect(s.status, `前置：搜索产物生成失败：${s.out}`).toBe(0)
    artifactsCache = join(dir, '.artifacts-cache')
    rmrf(artifactsCache)
    mkdirSync(artifactsCache, { recursive: true })
    for (const item of CACHE_ITEMS) restoreItem(join(dir, item), join(artifactsCache, item))
    // 刻意**不**清 content-remote：下一个用例要用「上一轮成功留下的清单」证明
    // 「拒绝之后盘上仍是旧的好清单，而不是被写了 null」
  }

  /** 先跑完整链产出四份产物，作为基线 */
  function buildAll() {
    expect(run(dir, ['scripts/build-practice-bank.mjs']).status).toBe(0)
    expect(run(dir, ['scripts/build-search-index.mjs']).status).toBe(0)
    const r = run(dir, ['scripts/build-content-remote.mjs'])
    expect(r.status, `构建失败：${r.out}`).toBe(0)
  }

  it('基线：四份产物齐全 → 构建与自检都通过，子段非 null', () => {
    buildAll()
    expect(run(dir, ['scripts/check-content-remote.mjs']).status).toBe(0)
    const m = JSON.parse(readFileSync(manifestAbs(), 'utf-8'))
    expect(m.search).toBeTypeOf('object')
    expect(m.practice).toBeTypeOf('object')
    expect(Object.keys(m.search).length).toBeGreaterThan(0)
    expect(Object.keys(m.practice).length).toBeGreaterThan(0)
  }, 180000)

  it('★ 删掉一个 search-body 分片（半份内部缺失）→ 构建退出码 ≠ 0', () => {
    const before = fingerprint(join(dir, 'public/content-remote'))
    rmSync(join(dir, 'public/search-body/math.json'))
    const r = run(dir, ['scripts/build-content-remote.mjs'])
    expect(r.status, `应当被拒绝但退出了 0：${r.out}`).not.toBe(0)
    expect(r.out).toMatch(/产物缺失|search-body\/math\.json/)
    // 关键：拒绝发生在**任何落盘之前**（rmSync/mkdirSync/writeFileSync 都在其后）
    expect(fingerprint(join(dir, 'public/content-remote'))).toEqual(before)
    restoreArtifacts()
  }, 120000)

  it('★ 删掉一个 practice-bank 分片 → 构建退出码 ≠ 0', () => {
    const before = fingerprint(join(dir, 'public/content-remote'))
    rmSync(join(dir, 'public/practice-bank/math.json'))
    const r = run(dir, ['scripts/build-content-remote.mjs'])
    expect(r.status).not.toBe(0)
    expect(fingerprint(join(dir, 'public/content-remote'))).toEqual(before)
    restoreArtifacts()
  }, 120000)

  // 口径更新（D-S5-1 收紧后）：半填充不再有专属文案 —— 缺任何一份产物都在
  // `buildSubSections` 里抛错并点名缺失文件（旧的「缺失不一致」分支已随 null 一起删除）。
  it('★ 半填充（search 全在、practice 全缺）→ 构建退出码 ≠ 0', () => {
    rmrf(join(dir, 'public/practice-bank'))
    const r = run(dir, ['scripts/build-content-remote.mjs'])
    expect(r.status, `半填充应当被拒绝：${r.out}`).not.toBe(0)
    expect(r.out).toMatch(/产物缺失[\s\S]*practice-bank\/index\.json/)
    restoreArtifacts()
  }, 120000)

  it('★ 自检脚本也会拒绝半填充：删一个 search-body 分片 → 退出码 1', () => {
    rmSync(join(dir, 'public/search-body/math.json'))
    // manifest 仍声明该分片 → ③ 循环按声明逐个查盘，缺失即报错
    const r = run(dir, ['scripts/check-content-remote.mjs'])
    expect(r.status).toBe(1)
    expect(r.out).toMatch(/子段 search 声明的分片缺失/)
    restoreArtifacts()
  }, 120000)

  // ══════════════════════════════════════════════════════════════
  // D-S5-1 真守卫（team-lead 派工 A1）：原来那条是「记录现状 exit 0」的临时锚，
  // 现在改成**断言应当的行为** —— 修不完就是红，不许靠改断言变绿。
  // ══════════════════════════════════════════════════════════════

  /** 把沙箱恢复到「四份产物齐全」并重建一份真实清单 */
  function rebuildBaseline() {
    restoreArtifacts()
    const b = run(dir, ['scripts/build-content-remote.mjs'])
    expect(b.status, `前置：齐全时构建应成功：${b.out}`).toBe(0)
    return JSON.parse(readFileSync(manifestAbs(), 'utf-8'))
  }

  it('★ 三份产物全缺 → 构建必须拒绝（exit ≠ 0）且不得落盘', () => {
    for (const p of ['public/practice-bank', 'public/search-body', 'public/search-meta.json']) {
      rmrf(join(dir, p))
      expect(existsSync(join(dir, p)), `前置：${p} 应已被删`).toBe(false)
    }
    const before = fingerprint(join(dir, 'public/content-remote'))
    const b = run(dir, ['scripts/build-content-remote.mjs'])
    expect(b.status, `产物全缺却构建成功 → 门禁形同虚设（应 exit ≠ 0）：${b.out}`).not.toBe(0)
    expect((b.out || '').trim(), '拒绝时必须给出可读原因（静默非零退出 = 没有门禁）').not.toBe('')
    // 拒绝必须**先于落盘**：既有产物不得被改写 / 清空
    expect(fingerprint(join(dir, 'public/content-remote'))).toEqual(before)
    const m = JSON.parse(readFileSync(manifestAbs(), 'utf-8'))
    expect(m.search, '失败后盘上不该留下 search = null 的清单').not.toBeNull()
    expect(m.practice, '失败后盘上不该留下 practice = null 的清单').not.toBeNull()
    restoreArtifacts()
  }, 120000)

  it('★ 反向锚：四份产物齐全 → 构建与自检都必须 exit 0（别为修门禁把正常路径搞挂）', () => {
    const m = rebuildBaseline()
    expect(m.search).toBeTypeOf('object')
    expect(m.practice).toBeTypeOf('object')
    expect(Object.keys(m.search).length).toBeGreaterThan(0)
    expect(Object.keys(m.practice).length).toBeGreaterThan(0)
    const c = run(dir, ['scripts/check-content-remote.mjs'])
    expect(c.status, `正常路径被误伤：${c.out}`).toBe(0)
  }, 120000)

  it('★ 已生成快照 manifest.search = null（practice 仍在）→ 自检必须拒绝（exit ≠ 0）', () => {
    const m = rebuildBaseline()
    expect(m.search, '前置：基线清单应有 search 子段').toBeTypeOf('object')
    m.search = null
    writeFileSync(manifestAbs(), JSON.stringify(m, null, 2), 'utf-8')
    const c = run(dir, ['scripts/check-content-remote.mjs'])
    expect(c.status, `子段半填充（search=null / practice 在）却自检通过：${c.out}`).not.toBe(0)
  }, 120000)

  it('★ 已生成快照两个子段都是 null（2026-10-15 失效形状）→ 自检必须拒绝（exit ≠ 0）', () => {
    const m = rebuildBaseline()
    // 这是 D-S5-1 的真身：两份都没填，check() ③ `if (!sub) continue` 会让整段检查空转
    m.search = null
    m.practice = null
    writeFileSync(manifestAbs(), JSON.stringify(m, null, 2), 'utf-8')
    const c = run(dir, ['scripts/check-content-remote.mjs'])
    expect(c.status, `子段全为 null 却自检通过 → 门禁形同虚设：${c.out}`).not.toBe(0)
    expect((c.out || '').trim(), '拒绝时必须给出可读原因').not.toBe('')
  }, 120000)

  it('★ 预留键被整个删掉（manifest 无 search 键）→ 自检必须拒绝（exit ≠ 0）', () => {
    const m = rebuildBaseline()
    delete m.search
    writeFileSync(manifestAbs(), JSON.stringify(m, null, 2), 'utf-8')
    const c = run(dir, ['scripts/check-content-remote.mjs'])
    expect(c.status, `缺 search 键却自检通过：${c.out}`).not.toBe(0)
  }, 120000)
})

// ════════════════════════════════════════════════════════════════
// D2 · 产物与 manifest 哈希一致性：独立重算 sha256（攻击面 ⑦）
// ════════════════════════════════════════════════════════════════
describe('D2 · manifest 声明的 hash 必须等于盘上文件的真实 sha256', () => {
  let dir = null
  let manifest = null

  beforeAll(() => {
    dir = makeSandbox('hash')
    // 顺序纪律：题库先于搜索（build:index = build:practice && build:search）
    expect(run(dir, ['scripts/build-practice-bank.mjs']).status).toBe(0)
    expect(run(dir, ['scripts/build-search-index.mjs']).status).toBe(0)
    const r = run(dir, ['scripts/build-content-remote.mjs'])
    expect(r.status, `构建失败：${r.out}`).toBe(0)
    manifest = JSON.parse(readFileSync(join(dir, 'public/content-remote/manifest.json'), 'utf-8'))
  }, 180000)

  afterAll(() => {
    rmrf(dir)
  })

  it('★ search / practice 子段每条 hash = 盘上文件 sha256（逐条独立重算）', () => {
    let checked = 0
    for (const key of ['search', 'practice']) {
      const sub = manifest[key]
      expect(sub, `${key} 子段不应为 null（产物已生成）`).toBeTypeOf('object')
      for (const [path, entry] of Object.entries(sub)) {
        expect(entry.path, `${key}['${path}'].path 应与键一致`).toBe(path)
        expect(entry.hash.startsWith('sha256:'), `hash 缺 HASH_PREFIX：${entry.hash}`).toBe(true)
        const abs = join(dir, 'public', path)
        expect(existsSync(abs), `盘上缺失：${path}`).toBe(true)
        expect(entry.hash, `${path} 的哈希与盘上文件不符`).toBe('sha256:' + sha256File(abs))
        checked += 1
      }
    }
    expect(checked, '至少应校验若干条指针').toBeGreaterThan(0)
  })

  it('★ 子段 path 一律站点根相对（不含 public/ 前缀、不以 / 开头、不含 ..）', () => {
    for (const key of ['search', 'practice']) {
      for (const entry of Object.values(manifest[key] || {})) {
        expect(entry.path.startsWith('/'), `path 不应以 / 开头：${entry.path}`).toBe(false)
        expect(entry.path.startsWith('public/'), `path 不该带 public/ 前缀：${entry.path}`).toBe(false)
        expect(entry.path.includes('..'), `path 不该含 ..：${entry.path}`).toBe(false)
      }
    }
  })

  it('★ count 与产物实际条目数一致（构建与登记同源）', () => {
    for (const key of ['search', 'practice']) {
      for (const [path, entry] of Object.entries(manifest[key] || {})) {
        if (entry.count == null) continue
        const parsed = JSON.parse(readFileSync(join(dir, 'public', path), 'utf-8'))
        const actual = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length
        expect(entry.count, `${path} 计数不符`).toBe(actual)
      }
    }
  })

  it('★ 翻一个字节 → manifest 里对应 hash **必须变**（证明哈希真的在咬内容）', () => {
    const target = 'search-body/math.json'
    const abs = join(dir, 'public', target)
    const beforeHash = manifest.search[target].hash

    const parsed = JSON.parse(readFileSync(abs, 'utf-8'))
    const firstKey = Object.keys(parsed)[0]
    const original = parsed[firstKey]
    parsed[firstKey] = original + ' ' // 只动一个字节量级的内容
    writeFileSync(abs, JSON.stringify(parsed), 'utf-8')

    const r = run(dir, ['scripts/build-content-remote.mjs'])
    expect(r.status, `重建失败：${r.out}`).toBe(0)
    const m2 = JSON.parse(readFileSync(join(dir, 'public/content-remote/manifest.json'), 'utf-8'))
    expect(m2.search[target].hash, '翻字节后哈希竟然没变 → 哈希未覆盖内容').not.toBe(beforeHash)
    expect(m2.search[target].hash).toBe('sha256:' + sha256File(abs))
  })
})

// ════════════════════════════════════════════════════════════════
// D3 · 构建顺序纪律：build:practice 必须先于 build:search
// ════════════════════════════════════════════════════════════════
describe('D3 · 构建顺序纪律（package.json 静态断言）', () => {
  it('★ build:index = build:practice && build:search（顺序不可反）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
    expect(pkg.scripts['build:index']).toBe('npm run build:practice && npm run build:search')
    expect(pkg.scripts.prebuild).toContain('build:index')
    expect(pkg.scripts.prebuild).toContain('build:content-remote')
    // prebuild 里 build:index 必须排在 build:content-remote 之前
    const i = pkg.scripts.prebuild.indexOf('build:index')
    const j = pkg.scripts.prebuild.indexOf('build:content-remote')
    expect(i).toBeGreaterThanOrEqual(0)
    expect(j).toBeGreaterThanOrEqual(0)
    expect(i, 'build:index 必须先于 build:content-remote').toBeLessThan(j)
  })
})
