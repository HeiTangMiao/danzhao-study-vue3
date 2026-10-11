// @vitest-environment node
/**
 * 批 F0 · F0c2 双脚本接 CI —— **独立复核**（QA）
 *
 * 攻击点（不依赖任何既有断言，直接读产物文件做位置/语义核对）：
 *  1. `package.json` 存在 check:dup 与 check:single 两 script；
 *     check:single 必含 `--selftest &&` 自检链（防止自检被绕过）。
 *  2. `.github/workflows/ci.yml` 中「题库实质重复检测」「单选题判分口径检测」两步
 *     必须严格位于「生产构建」之后、「上传构建产物」之前——否则读不到 build:index
 *     产出的 public/practice-bank/*.json，判定为空跑。
 *  3. 两步均为 `run:` 直接执行 script（未加 `|| true` / `continue-on-error` 之类软失败）。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

let pkg
let ci
let ciLines

beforeAll(() => {
  pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
  ci = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf8')
  ciLines = ci.split('\n')
})

/** 返回某个 name: 步骤在 ciLines 中的起始行号（0 基），找不到返回 -1 */
function stepLine(label) {
  return ciLines.findIndex((l) => l.trim() === `- name: ${label}`)
}

describe('F0c2 独立复核 · package.json 脚本', () => {
  it('check:dup 存在且指向 check-duplicates.mjs', () => {
    expect(pkg.scripts['check:dup']).toBeTruthy()
    expect(pkg.scripts['check:dup']).toContain('check-duplicates.mjs')
  })

  it('check:single 存在且含 `--selftest &&` 自检链', () => {
    const s = pkg.scripts['check:single']
    expect(s).toBeTruthy()
    expect(s).toContain('check-single-choice.mjs')
    expect(s).toContain('--selftest &&')
    // 自检在前、正式检测在后
    expect(s.indexOf('--selftest')).toBeLessThan(s.indexOf('--selftest &&') + 1)
    const afterChain = s.split('&&')[1] || ''
    expect(afterChain).toContain('check-single-choice.mjs')
    expect(afterChain).not.toContain('--selftest')
  })
})

describe('F0c2 独立复核 · ci.yml 步骤位置', () => {
  it('两步均存在', () => {
    expect(ci).toContain('题库实质重复检测')
    expect(ci).toContain('单选题判分口径检测')
    expect(ci).toContain('npm run check:dup')
    expect(ci).toContain('npm run check:single')
  })

  it('「生产构建」< check:dup < check:single < 「上传构建产物」', () => {
    const build = stepLine('生产构建')
    const dup = stepLine('题库实质重复检测')
    const single = stepLine('单选题判分口径检测')
    const upload = stepLine('上传构建产物')
    expect(build, '未找到「生产构建」步骤').toBeGreaterThanOrEqual(0)
    expect(dup, '未找到「题库实质重复检测」步骤').toBeGreaterThanOrEqual(0)
    expect(single, '未找到「单选题判分口径检测」步骤').toBeGreaterThanOrEqual(0)
    expect(upload, '未找到「上传构建产物」步骤').toBeGreaterThanOrEqual(0)
    expect(build).toBeLessThan(dup)
    expect(dup).toBeLessThan(single)
    expect(single).toBeLessThan(upload)
  })

  it('两步非软失败：无 `|| true` / continue-on-error', () => {
    for (const label of ['题库实质重复检测', '单选题判分口径检测']) {
      const start = stepLine(label)
      // 抓取该步骤到下一个步骤之间的文本块
      const block = []
      for (let i = start; i < ciLines.length; i++) {
        if (i > start && /^\s*- name:/.test(ciLines[i])) break
        block.push(ciLines[i])
      }
      const text = block.join('\n')
      expect(text, `${label} 含 || true 软失败`).not.toMatch(/\|\|\s*true/)
      expect(text, `${label} 含 continue-on-error`).not.toMatch(/continue-on-error/)
      expect(text, `${label} 未直接 run 对应 script`).toMatch(/run: npm run check:/)
    }
  })

  it('两步在 quality job 内（同一 job 复用 build 产物）', () => {
    // quality job 从第 10 行附近开始；确认两步的 name 行位于 tauri-check job 之前
    const tauri = ciLines.findIndex((l) => l.trim() === 'tauri-check:')
    const dup = stepLine('题库实质重复检测')
    const single = stepLine('单选题判分口径检测')
    expect(tauri).toBeGreaterThan(0)
    expect(dup).toBeLessThan(tauri)
    expect(single).toBeLessThan(tauri)
  })
})
