// @vitest-environment jsdom
/**
 * 批 F · Round 2 · 攻点[5] /guide 独立性 + 攻点[6] 依赖面
 *
 *  1. /guide 顶层非学科路由（name guide，无 meta.tab，不在 /study 下）
 *  2. NON_PAGE_DIRS 含 guide；collectFiles 不把 guide 当内容页（→ 不误入搜索索引 / 题库）
 *  3. guide 内容为纯数据 ESM（零 import）
 *  4. 入口可达：HomeView 有 to="/guide"
 *  5. guide 区块合 schema（block 级复算）
 *  6. 站点配置 = 3（SITE_FILES）→ 校验输出「+3」之来源
 *  7. 依赖面：package.json / lock 仅新增两个官方 @tauri-apps/* 包
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import router from '@/router/index.js'
import { collectFiles, NON_PAGE_DIRS, CONTENT_DIR, SITE_FILES } from '../scripts/lib/load-content.mjs'
import schemaJson from '../schema/content-schema.json'
import { createBlockValidator } from '@/utils/validateBlock'
import guidePage from '@/content/guide/01-志愿填报'

const ROOT = process.cwd()
const GUIDE_FILE = join(ROOT, 'src/content/guide/01-志愿填报.js')

describe('R2 · 攻点[5] · /guide 独立性', () => {
  it('/guide 顶层非学科路由（name guide，无 meta.tab）', () => {
    const r = router.getRoutes().find((x) => x.name === 'guide')
    expect(r, '未找到 name=guide 路由').toBeTruthy()
    expect(r.path).toBe('/guide')
    expect(r.path.startsWith('/study')).toBe(false)
    expect(r.meta?.tab).toBeUndefined()
  })

  it('NON_PAGE_DIRS 含 guide；collectFiles 不含任何 guide 文件', () => {
    expect(NON_PAGE_DIRS.has('guide')).toBe(true)
    const files = collectFiles(CONTENT_DIR)
    expect(files.length).toBeGreaterThan(100)
    const guideLike = files.filter((f) => /[\\/]content[\\/]guide[\\/]/.test(f))
    expect(guideLike, `collectFiles 误收 guide：${guideLike}`).toEqual([])
  })

  it('guide 内容为纯数据 ESM（零 import）', () => {
    const text = readFileSync(GUIDE_FILE, 'utf8')
    expect(text).not.toMatch(/^\s*import\b/m)
  })

  it('入口可达：HomeView 有 to="/guide"', () => {
    const hv = readFileSync(join(ROOT, 'src/views/HomeView.vue'), 'utf8')
    expect(hv).toMatch(/to="\/guide"/)
  })

  it('guide 骨架区块合 schema（block 级复算）', () => {
    const v = createBlockValidator(schemaJson)
    const errors = []
    guidePage.blocks.forEach((b, i) => v(b).forEach((e) => errors.push(`[${i}] ${e}`)))
    expect(errors).toEqual([])
  })

  it('官方入口是唯一外链', () => {
    const text = readFileSync(GUIDE_FILE, 'utf8')
    const urls = [...text.matchAll(/https?:\/\/[^\s'"]+/g)].map((m) => m[0])
    expect(new Set(urls)).toEqual(new Set(['https://www.zjzs.net']))
    expect(guidePage.entry.url).toBe('https://www.zjzs.net')
  })

  it('站点配置数 = 3（校验输出「+3」来源）', () => {
    expect(Object.keys(SITE_FILES).sort()).toEqual(['chinese', 'computer', 'math'])
  })
})

describe('R2 · 攻点[6] · 依赖面', () => {
  it('package.json 运行期仅新增 @tauri-apps/plugin-shell（官方 scope）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
    const runtimeTauri = Object.keys(pkg.dependencies).filter((k) => k.startsWith('@tauri-apps/'))
    expect(runtimeTauri).toEqual(['@tauri-apps/plugin-shell'])
    // ⚠️ 范围必须与 Rust 侧同线（见下方「版本同线」用例），不写死 ^ 或 ~：
    //    两侧同 major/minor 是硬约束，具体用哪种范围只是达成手段。
    expect(pkg.dependencies['@tauri-apps/plugin-shell']).toMatch(/^[~^]2\./)
  })

  it('Fc6 提交对 lock 的新增 @tauri-apps/* 顶层包恰为 2（api + plugin-shell）', () => {
    // 攻点本意 = 「引入面」：本次改动只应牵入 2 个官方包，不得夹带其它。
    // 结论只能由 **lock 的 diff** 得出（全量 lock 里另有 12 个预存的 @tauri-apps/cli* 平台包，与本笔无关）。
    let diff
    try {
      diff = execFileSync('git', ['show', '89d2e60', '--', 'package-lock.json'], {
        cwd: ROOT,
        encoding: 'utf8'
      })
    } catch {
      diff = ''
    }
    // 浅克隆等无法取到该提交时跳过（不误报）
    if (!diff) return
    const added = diff
      .split('\n')
      .filter((l) => l.startsWith('+') && /node_modules\/@tauri-apps\//.test(l))
      .map((l) => (l.match(/node_modules\/@tauri-apps\/[^"]+/) || [''])[0])
    expect([...new Set(added)].sort()).toEqual([
      'node_modules/@tauri-apps/api',
      'node_modules/@tauri-apps/plugin-shell'
    ])
  })

  // ★ 版本同线（2026-10-17 由 Release 构建失败反推补充的守卫）
  // 事故：npm 侧 ^2.5.0 而 Rust 侧锁 2.3.5 → `tauri build` / `tauri android build`
  // 直接被 CLI 的版本一致性检查拒建（四个 job 秒败，日志只有一行 mismatch）。
  // 原先这里写死 '2.5.0'，既拦不住错配也会随升级误报 —— 改为守**真正的不变量**。
  it('plugin-shell：npm 与 Rust 同 major/minor（否则 CLI 直接拒建）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
    const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'))
    const cargo = readFileSync(join(ROOT, 'src-tauri/Cargo.toml'), 'utf8')
    const cargoLock = readFileSync(join(ROOT, 'src-tauri/Cargo.lock'), 'utf8')

    const npmRange = pkg.dependencies['@tauri-apps/plugin-shell']
    const npmResolved = lock.packages['node_modules/@tauri-apps/plugin-shell'].version
    const cargoReq = (cargo.match(/tauri-plugin-shell\s*=\s*"([^"]+)"/) || [])[1]
    const cargoLocked = (cargoLock.match(/name = "tauri-plugin-shell"\nversion = "([^"]+)"/) || [])[1]

    expect(npmRange, 'npm 侧范围缺失').toBeTruthy()
    expect(npmResolved, 'lock 未解析出 plugin-shell').toBeTruthy()
    expect(cargoReq, 'Cargo.toml 缺 tauri-plugin-shell').toBeTruthy()
    expect(cargoLocked, 'Cargo.lock 未锁定 tauri-plugin-shell').toBeTruthy()

    const minor = (v) => v.split('.').slice(0, 2).join('.')
    expect(
      minor(npmResolved),
      `npm(${npmResolved}) 与 Rust(${cargoLocked}) 不同线 → tauri CLI 会拒绝构建`
    ).toBe(minor(cargoLocked))
    // 反向锚：把 Rust 侧改到不同 minor，本判据必须否（证明它不是恒真）
    expect(minor('2.3.5')).not.toBe(minor('2.5.0'))
  })
})
