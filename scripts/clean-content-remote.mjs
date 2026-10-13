/**
 * 清理远程内容快照生成物（批 S2 · 边界裁决的配套脚本）
 *
 * 为什么需要它：
 *   `public/content-remote/` 是**构建期生成物**（.gitignore 已排除，P-S01 a），
 *   由 `build:content-remote`（挂在 **Web 链**的 `prebuild` 上）产出。
 *   而 Vite 构建时是**整体拷贝 `public/`**（`publicDir` 取默认值，`vite.config.js` 未自定义）
 *   → 若本机先跑过 Web 构建，磁盘上就残留一份 content-remote；
 *   此时再打桌面 / APK 包，这份残留会被拷进 bundle，多带约 **1740 KB**。
 *
 * 为什么它是「死文件」：Tauri 模式 `IS_ABSOLUTE_API` 为真，`contentRootFrom()` 取
 *   `new URL(API_BASE).origin` → loader 从**服务器**拉 `https://520305.top/content-remote/...`，
 *   **永不读 dist 里那份**。故清掉只省体积、不影响任何正确性；
 *   也正因「不影响正确性」，它**静默** —— 打包的人看不出来。
 *   靠人记住「打包前先删」，就是 §5.4 `CONTENT_VERSION` 那一类陷阱（依赖人记住 = 迟早漏）。
 *
 * 用法：npm run clean:content-remote
 *      （已挂在 `tauri:build` 前置 —— 人不需要记得）
 */
import { existsSync, rmSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from './lib/load-content.mjs'
import { REMOTE_DIR } from '../src/content/contentManifest.js'

/** 生成物所在目录的绝对路径（`public/content-remote`） */
export function targetDir() {
  return resolve(ROOT, 'public', REMOTE_DIR)
}

/**
 * 路径守卫：确认目标**恰好**是 `<repoRoot>/public/<REMOTE_DIR>`
 *
 * 三层断言，任一不成立即抛错（且**不删除任何东西**）：
 *   ① 必须以 `<sep>public<sep><REMOTE_DIR>` 结尾（防目标被改写成 public 本身 / 别的目录）
 *   ② 必须位于仓库根之下（防越出仓库）
 *   ③ 不得等于 public 目录或仓库根本身（防递归删除兜不住）
 *
 * @param {string} absTarget 待删除目录的绝对路径（应已 resolve）
 * @returns {string} 校验通过的绝对路径
 * @throws {Error} 断言失败时抛出，调用方据此中止
 */
export function assertSafeTarget(absTarget) {
  const rootDir = resolve(ROOT)
  const publicDir = resolve(ROOT, 'public')
  const expected = resolve(publicDir, REMOTE_DIR)

  if (expected !== absTarget) {
    throw new Error(`路径守卫失败：目标应为 ${expected}，实际为 ${absTarget}`)
  }
  if (!absTarget.startsWith(rootDir + sep)) {
    throw new Error(`路径守卫失败：目标 ${absTarget} 不在仓库根 ${rootDir} 之内`)
  }
  if (absTarget === publicDir || absTarget === rootDir) {
    throw new Error(`路径守卫失败：绝不允许删除 ${absTarget}`)
  }
  return absTarget
}

/**
 * 执行清理（先过守卫，再删；目录不存在 → 静默成功）
 *
 * 依赖注入只为可测：测试传假的 exists/remove，不在测试里真删磁盘。
 *
 * @param {{exists?: (p: string) => boolean, remove?: (p: string, o?: object) => void}} [io]
 * @returns {{removed: boolean, target: string}}
 * @throws {Error} 守卫失败时抛出，**且未执行任何删除**
 */
export function clean(io = {}) {
  const exists = io.exists || existsSync
  const remove = io.remove || rmSync
  const target = assertSafeTarget(targetDir())
  if (!exists(target)) return { removed: false, target }
  remove(target, { recursive: true, force: true })
  return { removed: true, target }
}

// 直接执行时才清理；被测试 import 时只暴露函数（照 build-content-remote.mjs:235 的纪律）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { removed, target } = clean()
    // 日志前缀也由 REMOTE_DIR 派生 —— 保证脚本里**零**目录名硬编码（见文件头守卫说明）
    console.log(`[clean:${REMOTE_DIR}] ${removed ? '已删除' : '不存在（跳过）'}：${target}`)
  } catch (e) {
    console.error(`[clean:${REMOTE_DIR}] ` + e.message)
    process.exit(1)
  }
}
