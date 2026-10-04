#!/usr/bin/env node
/**
 * 拉取 GeoGebra 离线资源到 public/vendor/geogebra
 *
 * 背景：这一段资源原本直接入库（48MB / 203 个文件），带来三个问题：
 *   1. 仓库体积暴涨，clone 缓慢
 *   2. 每次 `vite build` 都要全量复制进 dist
 *   3. CI 部署时 rsync 反复传输
 * 但它只在「数学学科的 GeoGebra 演练场」这一个场景用得上，全库仅 1 个内容页引用。
 *
 * 因此改为：**资源不入仓库，按需拉取**。
 * 关键点在于 GeoGebraPlayground.vue 已经实现了「本地资源失败 → 回退官方 CDN」的降级链，
 * 所以本地缺失时功能并不会消失，只是失去离线可用性（会自动走在线源）。
 * 需要离线打包时，先跑本脚本再执行 build 即可。
 *
 * 用法：
 *   node scripts/fetch-geogebra.mjs            # 已存在则跳过
 *   node scripts/fetch-geogebra.mjs --force    # 强制重新下载覆盖
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { writeFileSync } from 'node:fs'

const DOWNLOAD_URL = 'https://download.geogebra.org/package/geogebra-math-apps-bundle'
// 解压后必须存在的文件：缺任何一个，演练场都会加载失败
const REQUIRED_FILES = ['deployggb.js', join('web', 'web.nocache.js')]

const here = dirname(fileURLToPath(import.meta.url))
const vendorDir = resolve(here, '..', 'public', 'vendor', 'geogebra')
const force = process.argv.includes('--force')

const isReady = () => REQUIRED_FILES.every((f) => existsSync(join(vendorDir, f)))

if (isReady() && !force) {
  console.log(`✅ GeoGebra 资源已就绪：${vendorDir}`)
  console.log('   如需重新拉取，加 --force 参数。')
  process.exit(0)
}

if (force && existsSync(vendorDir)) {
  console.log('🧹 --force：清理旧资源…')
  rmSync(vendorDir, { recursive: true, force: true })
}

mkdirSync(vendorDir, { recursive: true })

const zipPath = join(tmpdir(), 'geogebra-math-apps-bundle.zip')
console.log(`⬇️  正在下载 ${DOWNLOAD_URL}`)
console.log(`   目标：${zipPath}`)

try {
  const res = await fetch(DOWNLOAD_URL)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(zipPath, buf)
  console.log(`   下载完成：${(buf.length / 1024 / 1024).toFixed(1)} MB`)
} catch (e) {
  console.error(`❌ 下载失败：${e.message}`)
  console.error('   请检查网络，或手动访问上述地址下载后解压到：' + vendorDir)
  console.error('   提示：即使不拉取，演练场也会自动回退到官方在线 CDN，功能不会消失。')
  process.exit(1)
}

console.log('📦 正在解压…')
try {
  // Linux / macOS 自带 unzip；Windows 回退到 PowerShell 的 Expand-Archive
  try {
    execFileSync('unzip', ['-q', '-o', zipPath, '-d', vendorDir], { stdio: 'inherit' })
  } catch {
    if (process.platform === 'win32') {
      execFileSync(
        'powershell',
        ['-NoProfile', '-Command', `Expand-Archive -Path "${zipPath}" -DestinationPath "${vendorDir}" -Force`],
        { stdio: 'inherit' }
      )
    } else {
      throw new Error('未找到 unzip 命令')
    }
  }
} catch (e) {
  console.error(`❌ 解压失败：${e.message}`)
  console.error(`   请手动把 ${zipPath} 解压到 ${vendorDir}`)
  process.exit(1)
}

rmSync(zipPath, { force: true })

if (!isReady()) {
  console.error('❌ 解压后仍未找到必需文件：' + REQUIRED_FILES.join(', '))
  console.error('   可能是上游包结构变化，请检查解压结果：' + vendorDir)
  process.exit(1)
}

console.log(`✅ GeoGebra 资源就绪：${vendorDir}`)
console.log('   现在执行 npm run build 即可把离线资源打进 dist。')
