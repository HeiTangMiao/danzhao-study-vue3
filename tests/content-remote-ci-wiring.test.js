/**
 * CI 接线静态断言（批 S4 · S4-4a/4b）
 *
 * 为什么需要它：2026-10-15 事故的头号机制是「CI 自动部署**不发**远程内容」——
 * `deploy` job 的 rsync 清单里从来没有 `dist/content-remote/`。这类缺陷**不会让任何测试变红**
 * （本地构建照样产出），只有真正 push 一次才会在线上表现为「远程更新静默失效」。
 * 故这里把「CI 必须发布什么、以什么顺序发布」变成**可断言的文本事实**。
 *
 * ⚠️ CI 无法本地执行 → 本文件读 `ci.yml` 文本断言（解析 YAML 需要额外依赖，H1 禁止新增）；
 *    真正的「能跑起来」由本地 `ruby -ryaml` 解析 + `rsync --dry-run` 空跑另行验证（见交付说明）。
 *
 * 反向锚：删掉对应 rsync 行/具名步骤 → 断言必须失败（先证明守卫会咬）。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const CI_PATH = join(ROOT, '.github', 'workflows', 'ci.yml')
const CI = readFileSync(CI_PATH, 'utf-8')

/** 全部必需要素（真实文件里必须全有） */
const NEEDLES = {
  namedStep: '- name: 内容快照自检',
  checkScript: 'npm run check:content-remote',
  shardSync: 'rsync -avz --exclude manifest.json -e "ssh $SSH_ARGS" ./dist/content-remote/',
  manifestSync: 'rsync -avz -e "ssh $SSH_ARGS" ./dist/content-remote/manifest.json',
  bankSync: 'rsync -avz -e "ssh $SSH_ARGS" ./dist/practice-bank/',
  deployVerify: '/var/www/danzhao-study/content-remote/manifest.json'
}

/** 文本里缺哪些要素（抽成函数，便于反向锚用变异文本验证「它真的会报缺」） */
function missingIn(text) {
  return Object.entries(NEEDLES).filter(([, needle]) => !text.includes(needle)).map(([k]) => k)
}

describe('S4-4b · quality job 显式挂接产物自检', () => {
  it('存在**具名**步骤「内容快照自检」并跑 check:content-remote', () => {
    expect(CI).toContain(NEEDLES.namedStep)
    expect(CI).toContain(NEEDLES.checkScript)
  })

  it('该步骤位于「生产构建」之后（产物就绪才自检）', () => {
    const build = CI.indexOf('- name: 生产构建')
    const check = CI.indexOf(NEEDLES.namedStep)
    expect(build).toBeGreaterThan(-1)
    expect(check).toBeGreaterThan(build)
  })

  it('package.json 里 check:content-remote 指向自检脚本', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
    expect(pkg.scripts['check:content-remote']).toBe('node scripts/check-content-remote.mjs')
    expect(pkg.scripts['build:content-remote']).toBe('node scripts/build-content-remote.mjs')
  })
})

describe('S4-4a · deploy job 发布闭环（事故头号缺口）', () => {
  it('rsync 含 content-remote 分片 / manifest 单独传 / practice-bank', () => {
    expect(missingIn(CI)).toEqual([])
  })

  it('顺序纪律：**先分片、后 manifest**（保证线上 manifest 指向的分片已就位）', () => {
    const shard = CI.indexOf(NEEDLES.shardSync)
    const manifest = CI.indexOf(NEEDLES.manifestSync)
    expect(shard).toBeGreaterThan(-1)
    expect(manifest).toBeGreaterThan(shard)
  })

  it('content-remote / practice-bank **不**带 --delete（避免删掉旧客户端正在请求的分片）', () => {
    const lines = CI.split('\n').filter((l) => l.includes('dist/content-remote/') || l.includes('dist/practice-bank/'))
    expect(lines.length).toBeGreaterThanOrEqual(3)
    for (const l of lines) {
      expect(l, `这两条不应带 --delete：${l.trim()}`).not.toContain('--delete')
    }
  })

  it('部署后验证会探线上 manifest（缺了就失败，不静默跳过）', () => {
    expect(CI).toContain(NEEDLES.deployVerify)
    // 必须是「失败即退出」而不是只打印
    expect(CI).toMatch(/exit 1/)
  })
})

describe('反向锚（变异）· 守卫真的会咬', () => {
  it('删掉三条关键 rsync 行 → missingIn 必须报缺（证明上面的断言不是恒真）', () => {
    let mutated = CI
    for (const key of ['shardSync', 'manifestSync', 'bankSync']) {
      mutated = mutated.split(NEEDLES[key]).join('')
    }
    const missing = missingIn(mutated)
    expect(missing).toEqual(expect.arrayContaining(['shardSync', 'manifestSync', 'bankSync']))
  })

  it('删掉具名自检步骤 → missingIn 必须报缺 namedStep', () => {
    const mutated = CI.split(NEEDLES.namedStep).join('')
    expect(missingIn(mutated)).toContain('namedStep')
  })

  it('顺序纪律的反向锚：分片行必须先于 manifest 行', () => {
    /** 顺序判据（抽成函数才能在变异文本上证明它真的会否） */
    const isShardFirst = (t) => {
      const s = t.indexOf(NEEDLES.shardSync)
      const m = t.indexOf(NEEDLES.manifestSync)
      return s > -1 && m > -1 && s < m
    }
    expect(isShardFirst([NEEDLES.shardSync, NEEDLES.manifestSync].join('\n'))).toBe(true) // 正序 → 通过
    expect(isShardFirst(CI)).toBe(true) // 真实文件满足
    expect(isShardFirst([NEEDLES.manifestSync, NEEDLES.shardSync].join('\n'))).toBe(false) // 反序 → 必失败
  })
})
