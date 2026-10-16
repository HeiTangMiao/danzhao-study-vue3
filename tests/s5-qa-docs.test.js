// @vitest-environment node
/**
 * 批 S5 · QA 独立对抗验证 —— E 组：**docs/remote-assets.md 与代码一致性**（攻击面 ⑩）
 *
 * 做法：把文档里的**可核对断言**逐条抽出来，用**代码/产物**去证伪，而不是靠人眼比对：
 *   1. 文档 §1 表里写的三个运行时入口文件，必须真的存在于 `src/utils/`；
 *   2. 文档 §5 基址表的 4 个格子，必须等于 `contentRootFrom/siteRootFrom` 的**实际返回值**；
 *   3. 文档 §3 的 4 个缓存键常量，必须等于模块导出值；
 *   4. 文档 §2.1 的 `PENDING_MAX_ATTEMPTS = 5`，必须等于 contentClient 的导出值；
 *   5. 文档 §2.2 的「≥ 2 字才拉正文」，必须等于 SearchPanel 的 `BODY_MIN_QUERY`；
 *   6. 文档 §5 的 CSP 提示：站点域名必须已在 `tauri.conf.json` 的 `connect-src` 里；
 *   7. 文档 §8 的自检命令必须都存在于 package.json；
 *   8. 「内置 chunk 数」**双向成立**（team-lead 拍板口径：文档与源码注释一律不再写死页数）：
 *        写数字 → 必须等于真实页合计；不写数字 → 必须给出可核对指向（SITE_FILES / contentManifest …）。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { contentRootFrom, siteRootFrom } from '../src/utils/assetBase.js'
import { SEARCH_META_KEY, searchBodyKey } from '../src/utils/searchClient.js'
import { BANK_INDEX_KEY, bankShardKey } from '../src/utils/practiceBankClient.js'
import { collectFiles, CONTENT_DIR, SITE_FILES } from '../scripts/lib/load-content.mjs'

const ROOT = process.cwd()
const read = (p) => readFileSync(join(ROOT, p), 'utf-8')

describe('E1 · 文档 §1 表：三个运行时入口文件真实存在', () => {
  it('contentClient / searchClient / practiceBankClient 都在 src/utils/', () => {
    for (const f of [
      'src/utils/contentClient.js',
      'src/utils/searchClient.js',
      'src/utils/practiceBankClient.js',
      'src/utils/assetClient.js',
      'src/utils/assetBase.js'
    ]) {
      expect(existsSync(join(ROOT, f)), `文档声称存在但盘上没有：${f}`).toBe(true)
    }
  })

  it('★ 文档 §1 声称「共享原语 = assetClient」→ 两个新客户端确实 import 了它', () => {
    const sc = read('src/utils/searchClient.js')
    const pc = read('src/utils/practiceBankClient.js')
    expect(sc).toMatch(/from\s+'@\/utils\/assetClient'/)
    expect(pc).toMatch(/from\s+'@\/utils\/assetClient'/)
  })

  it('★ 文档 §1 声称「基址派生 = assetBase」→ 两个新客户端 import siteRoot 而非自己拼', () => {
    for (const [name, src] of [
      ['searchClient', read('src/utils/searchClient.js')],
      ['practiceBankClient', read('src/utils/practiceBankClient.js')]
    ]) {
      expect(src, `${name} 未从 assetBase 取基址`).toMatch(/from\s+'@\/utils\/assetBase'/)
      // 不得出现 API_BASE 字符串拼接（/api 前缀陷阱）
      expect(src, `${name} 出现 API_BASE 拼接`).not.toMatch(/API_BASE\s*\+/)
    }
  })
})

describe('E2 · 文档 §5 基址表：4 个格子逐格等于实际返回值', () => {
  it('相对模式：contentRoot = ./content-remote，siteRoot = ./', () => {
    expect(contentRootFrom('./api', false)).toBe('./content-remote')
    expect(siteRootFrom('./api', false)).toBe('./')
  })

  it('★ 绝对模式：contentRoot = https://520305.top/content-remote，siteRoot = https://520305.top', () => {
    expect(contentRootFrom('https://520305.top/api', true)).toBe('https://520305.top/content-remote')
    expect(siteRootFrom('https://520305.top/api', true)).toBe('https://520305.top')
  })

  it('★ 文档 §5 的 CSP 提示成立：站点域名已在 tauri connect-src 中', () => {
    const raw = read('src-tauri/tauri.conf.json')
    const m = raw.match(/"csp"\s*:\s*"([^"]*)"/s)
    expect(m, '未解析到 csp 配置').toBeTruthy()
    const csp = m[1]
    const c = csp.match(/connect-src([^;]*)/)
    expect(c, 'connect-src 缺失').toBeTruthy()
    expect(c[1], `站点域名未放行：${c[1]}`).toContain('https://520305.top')
  })
})

describe('E3 · 文档 §3 缓存键 / §2.1 重试上限：常量与文档一致', () => {
  it('★ 4 个缓存键 = 文档所述（search:meta / search:<subj> / practice:index / practice:<subj>）', () => {
    expect(SEARCH_META_KEY).toBe('search:meta')
    expect(searchBodyKey('math')).toBe('search:math')
    expect(BANK_INDEX_KEY).toBe('practice:index')
    expect(bankShardKey('math')).toBe('practice:math')
  })

  it('★ 文档 §2.1 的 PENDING_MAX_ATTEMPTS = 5 与代码一致', async () => {
    const mod = await import('../src/utils/contentClient.js')
    expect(mod.PENDING_MAX_ATTEMPTS).toBe(5)
  })

  it('★ 文档 §2.2 的「≥ 2 字才拉正文」与 SearchPanel 的 BODY_MIN_QUERY 一致', () => {
    const src = read('src/components/SearchPanel.vue')
    const m = src.match(/const\s+BODY_MIN_QUERY\s*=\s*(\d+)/)
    expect(m, '未找到 BODY_MIN_QUERY').toBeTruthy()
    expect(Number(m[1])).toBe(2)
  })
})

/**
 * E4 · 「内置 chunk 数」**双向成立**（team-lead 拍板口径）
 *
 * 为什么是双向而不是「必须等于某个数」：写死页数**必然**随内容增长而腐烂（本轮已实证一次：
 * 文档写 182、实际 183）。所以架构约束不是「数字对不对」，而是**不许写死**：
 *   - 写了数字   → 该数字必须等于真实页合计（允许作者保留数字，但要对）；
 *   - 不写数字   → 必须给出**可核对的指向**（写明以哪个权威为准），光说「若干 / 一些」不算。
 * 这样无论作者选哪种写法，约束都被守住。
 */

/** 真实页合计：直接用构建脚本的权威 `collectFiles`，不自己重实现一份枚举 */
function actualPageCount() {
  return collectFiles(CONTENT_DIR).length
}

/** 提及点前后各取多少字符作为「局部窗口」（用于查可核对指向） */
const WINDOW = 250

/**
 * 找出文件里所有「chunk」提及，并判断它属于哪一类声明
 *   - num != null  → 数字型：「182 个 chunk」，必须等于真实页合计
 *   - vague        → 含糊型：「很多个 / 若干个 chunk」，没数字但仍在暗示数量
 *   - 其余          → 中性描述：「独立懒加载 chunk」「巨型 chunk」，只讲机制不讲数量
 * @returns {Array<{line:number, num:number|null, vague:boolean, snippet:string, window:string, at:number}>}
 */
function chunkMentions(text) {
  const out = []
  const re = /chunk/g
  let m
  while ((m = re.exec(text)) !== null) {
    const start = m.index
    const line = text.slice(0, start).split('\n').length
    // 往前看 70 字符，取**最近的**那个数；数字与 chunk 之间不得再出现数字，
    // 且数字不能是「2.1」这类小节号的一部分（前后字符约束）
    const before = text.slice(Math.max(0, start - 70), start)
    const nm = /(?<![\d.])(\d+)(?!\.)[^\d]{0,60}$/.exec(before)
    const wFrom = Math.max(0, start - WINDOW)
    const wTo = Math.min(text.length, start + WINDOW)
    out.push({
      line,
      at: start,
      num: nm ? Number(nm[1]) : null,
      vague: nm ? false : VAGUE_RE.test(text.slice(Math.max(0, start - 40), start)),
      snippet: text.slice(Math.max(0, start - 60), wTo).replace(/\s+/g, ' ').slice(0, 90),
      window: text.slice(wFrom, wTo)
    })
  }
  return out
}

/** 没写数字、却仍在暗示数量的含糊量词（team-lead：光说「若干」不算） */
const VAGUE_RE = /(?:很多|大量|若干|许多|不少|一堆|多个|N)\s*个/

/** 取该位置所属的「章节」文本（上一个 # 标题到下一个 # 标题之间），用于文档侧的指向查找 */
function sectionOf(text, at) {
  const head = text.lastIndexOf('\n#', at)
  const from = head === -1 ? 0 : head
  const next = text.indexOf('\n#', at + 1)
  const to = next === -1 ? text.length : next
  return text.slice(from, to)
}

/**
 * 双向判据（team-lead 拍板口径：文档与源码注释一律不再写死页数）
 *   1. 写了数字 —— 不管文档还是注释，必须等于真实页合计（腐烂即缺陷）；
 *   2. 没写数字 ——
 *        · 文档：必须在本章节内给出可核对指向（SITE_FILES / contentManifest …）；
 *        · 源码注释：含糊量词（很多个 / 若干个）时必须给指向；纯机制描述豁免
 *          （否则「打进同一个巨型 chunk」这类说明会被误判，反而制造噪声）。
 * @returns {string[]} 不合规清单
 */
function judgeChunkMentions(file, text, actual) {
  const isDoc = file.startsWith('docs/')
  const problems = []
  for (const mt of chunkMentions(text)) {
    if (mt.num != null) {
      if (mt.num !== actual) {
        problems.push(
          `${file}:${mt.line} 写死 ${mt.num} 个 chunk，实际 ${actual} 个 → 数字已腐烂` +
            `（口径：一律不再写死页数；建议删掉数字或改为 ${POINTERS.slice(0, 2).join(' / ')} 等权威写法）`
        )
      }
      continue
    }
    const scope = isDoc ? sectionOf(text, mt.at) : mt.window
    const where = isDoc ? '本章节' : `附近 ${WINDOW} 字符`
    if (!isDoc && !mt.vague) continue // 源码里的纯机制描述，豁免
    const hit = POINTERS.find((p) => scope.includes(p))
    if (!hit) {
      problems.push(
        `${file}:${mt.line} 提到 chunk 但没写页数${mt.vague ? '（还用了含糊量词）' : ''}，` +
          `${where}也没有可核对指向（需写明以 ${POINTERS.slice(0, 3).join(' / ')} 等权威为准）；片段：${mt.snippet}`
      )
    }
  }
  return problems
}

/** 「不写死数字」时必须给出的可核对指向（写清以哪个权威为准） */
const POINTERS = [
  'SITE_FILES', 'contentManifest', 'content-remote', 'manifest.json',
  'collectFiles', 'src/content/', 'load-content'
]

describe('E4 · chunk 数口径双向成立：写数字必须对，不写数字必须给指向', () => {
  const TARGETS = ['docs/remote-assets.md', 'src/content/loadPage.js']

  it('真实页合计可求且非零（用构建脚本的 collectFiles 权威）', () => {
    const n = actualPageCount()
    expect(n, 'collectFiles 统计为 0 —— 脚本口径可能漂移，后续断言会失去意义').toBeGreaterThan(0)
    // 交叉验证：学科注册表 SITE_FILES 的三个学科目录都存在
    for (const sub of Object.keys(SITE_FILES)) {
      expect(existsSync(join(ROOT, 'src/content', sub)), `SITE_FILES 里的学科目录缺失：${sub}`).toBe(true)
    }
  })

  it('★ 双向成立：写数字必须对；不写数字必须给可核对指向', () => {
    const actual = actualPageCount()
    const problems = []
    for (const file of TARGETS) {
      const text = read(file)
      const mentions = chunkMentions(text)
      expect(mentions.length, `${file} 里没找到 chunk 提及 —— 本用例的匹配口径可能漂移`).toBeGreaterThan(0)
      problems.push(...judgeChunkMentions(file, text, actual))
    }
    expect(problems, problems.join('\n')).toEqual([])
  })

  it('★ 反向锚 · 数字腐烂：把数字改错，判据必须抓得到（否则本节恒真）', () => {
    const actual = actualPageCount()
    const fake = '内容层有内置兜底（999 个懒加载 chunk）'
    expect(chunkMentions(fake)[0].num).toBe(999)
    const p = judgeChunkMentions('docs/fake.md', `# 假章节\n${fake}\n`, actual)
    expect(p, '写死错误数字却没被判不合规 → 判据失效').toHaveLength(1)
    expect(p[0]).toContain('999')
  })

  it('★ 反向锚 · 含糊量词：既没数字又用「很多个」，判据必须抓得到', () => {
    const actual = actualPageCount()
    const fake = '内容层有内置兜底（很多个懒加载 chunk）'
    const mt = chunkMentions(fake)[0]
    expect(mt.num, '「很多个」不该被解析成数字').toBeNull()
    expect(mt.vague, '「很多个」必须被识别为含糊量词').toBe(true)
    for (const file of ['docs/fake.md', 'src/fake.js']) {
      const p = judgeChunkMentions(file, fake, actual)
      expect(p, `${file}：含糊量词且无指向却没被判不合规 → 判据失效`).toHaveLength(1)
    }
  })

  it('★ 反向锚 · 豁免边界：源码里的纯机制描述不误伤，文档里的同类描述仍要指向', () => {
    const actual = actualPageCount()
    const neutral = '一旦改成变量拼接，全部页面会被打进同一个巨型 chunk'
    const mt = chunkMentions(neutral)[0]
    expect(mt.num, '中性描述不该被解析出数字').toBeNull()
    expect(mt.vague, '「同一个巨型 chunk」不该被当成含糊量词').toBe(false)
    // 源码注释：豁免（否则这类机制说明会被误判成缺陷，制造噪声）
    expect(judgeChunkMentions('src/fake.js', neutral, actual)).toEqual([])
    // 文档：不豁免 —— 文档是给人核对的说明，必须写明权威来源
    const p = judgeChunkMentions('docs/fake.md', `# 假章节\n${neutral}\n`, actual)
    expect(p, '文档里没写数字也没给指向，却没被判不合规 → 文档侧判据失效').toHaveLength(1)
  })
})

describe('E5 · 文档 §8 的自检命令必须都真实存在', () => {
  it('npm run <script> 全部命中 package.json', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
    const scripts = pkg.scripts || {}
    const doc = read('docs/remote-assets.md')
    const cmds = [...doc.matchAll(/npm run ([a-z:_-]+)/g)].map((x) => x[1])
    const missing = cmds.filter((c) => !(c in scripts))
    expect(missing, `文档引用了不存在的脚本：${missing.join(', ')}`).toEqual([])
  })
})
