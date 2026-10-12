// @vitest-environment jsdom
/**
 * 批 S2 · 独立证伪 · 攻点⑪ P-S11(a)：**进页路径必须零网络请求**
 *
 * 为什么这条必须钉死：`UnitView.vue:551` 有一条 `Promise.race([数据, sleep(400)])` 的
 * 滑动翻页竞速 —— `loadPage` 一旦 await 网络，翻页转场就会被劣化。而这类回归
 * **测试全绿也发现不了**（用例照过、体验变卡），所以必须用「数 fetch 调用次数」直接钉。
 *
 * 一句话验收标准：**拔掉网络也要能出页面**。
 *
 * ⚠️ 防假绿：本文件第一条是**探针有效性正对照** —— 先证明装上的 fetch 计数器真的能
 *    观察到 `refreshIfNewer` 的网络调用；否则「0 次」可能只是探针没生效（空断言）。
 *
 * ⚠️ 环境纪律：不读 `public/content-remote/`（已 gitignore）→ 一律 mock fetch / 注入 IDB。
 *    fake-indexeddb 在同一文件内跨用例持久 → beforeEach 显式 clearContentCache()。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadPage } from '@/content/loadPage'
import { startBackgroundRefresh, refreshIfNewer, resetContentClient } from '@/utils/contentClient'
import { useStudyDbStore } from '@/stores/studyDb'
import { OP, HASH_PREFIX } from '@/content/contentManifest'

const ROOT = process.cwd()
const SUBJECT = 'math'
const UNIT = '01'
const FILE_INDEX = 0
const ORIGINAL_FETCH = globalThis.fetch

/** 合法形态哈希 */
const H = (tag = 'a') => HASH_PREFIX + tag.repeat(64).slice(0, 64)

/** 安装 fetch 计数器；impl 决定「网络」行为（默认：模拟离线，直接抛） */
function installFetchSpy(impl) {
  const urls = []
  globalThis.fetch = vi.fn(async (...args) => {
    urls.push(String(args[0]))
    return impl ? impl(...args) : Promise.reject(new Error('offline'))
  })
  return urls
}

/** 向 content_cache 注入一个可用分片 */
async function injectCache({ registered = H('a'), pageHash = H('a'), text = '远程正文' } = {}) {
  const db = useStudyDbStore()
  await db.saveContentCache({
    key: `${SUBJECT}/${UNIT}`,
    version: 1,
    hash: H('u'),
    pageHashes: { [`${UNIT}/${FILE_INDEX}`]: registered },
    pages: [
      {
        subject: SUBJECT,
        unitNum: UNIT,
        fileIndex: FILE_INDEX,
        fileKey: `${SUBJECT}_${UNIT}_p${FILE_INDEX}`,
        op: OP.UPSERT,
        blocks: [{ type: 'text', text }],
        hash: pageHash
      }
    ],
    manifestUpdatedAt: '2026-01-01T00:00:00.000Z'
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  resetContentClient()
  await useStudyDbStore().clearContentCache()
})
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

describe('S2 · 攻点⑪ · 探针有效性（防「0 次」空断言）', () => {
  it('正对照：同一套 fetch 计数器能观察到 refreshIfNewer 的网络调用', async () => {
    const urls = installFetchSpy(async () => ({ ok: true, status: 200, json: async () => ({}) }))
    await refreshIfNewer({ base: './content-remote' })
    expect(urls.length, '探针失效：refreshIfNewer 的网络调用没被计数器观察到').toBeGreaterThan(0)
    expect(urls[0]).toContain('manifest.json')
  })
})

describe('S2 · 攻点⑪ · 进页路径零网络（核心）', () => {
  it('★ 缓存命中：loadPage 期间 fetch 调用数 === 0', async () => {
    await injectCache()
    const urls = installFetchSpy() // 离线：调用即抛
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p.blocks).toEqual([{ type: 'text', text: '远程正文' }]) // 确实走了远程缓存
    expect(urls, `进页不得发网络：${urls}`).toEqual([])
  })

  it('★ 缓存未命中：走内置 import()，fetch 调用数 === 0', async () => {
    const urls = installFetchSpy()
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p.blocks.length).toBeGreaterThan(0) // 内置内容照常出页面
    expect(urls, `未命中也不得发网络：${urls}`).toEqual([])
  })

  it('哈希不符 → 回落内置，fetch 仍 === 0', async () => {
    await injectCache({ registered: H('b'), pageHash: H('a') })
    const urls = installFetchSpy()
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p.blocks.length).toBeGreaterThan(0)
    expect(urls).toEqual([])
  })

  it('IDB 抛异常 → 回落内置，fetch 仍 === 0', async () => {
    vi.spyOn(useStudyDbStore(), 'getContentCache').mockRejectedValue(new Error('idb boom'))
    const urls = installFetchSpy()
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p.blocks.length).toBeGreaterThan(0)
    expect(urls).toEqual([])
  })

  it('★ 拔掉网络（fetch 必抛）+ 无缓存 → 仍然出页面，且 fetch === 0', async () => {
    const urls = installFetchSpy() // impl 缺省 = 每次调用都 reject
    // 断言「离线下仍能出页面」——这正是 P-S11(a) 的验收标准
    await expect(loadPage(SUBJECT, UNIT, FILE_INDEX)).resolves.toBeTruthy()
    const p = await loadPage(SUBJECT, UNIT, FILE_INDEX)
    expect(p.blocks.length).toBeGreaterThan(0)
    expect(urls, '离线场景下进页竟发了网络请求').toEqual([])
  })

  it('连续进 3 次页（含缓存命中与未命中）→ fetch 累计 === 0', async () => {
    await injectCache()
    const urls = installFetchSpy()
    for (const idx of [0, 1, 2]) {
      const p = await loadPage(SUBJECT, UNIT, idx)
      expect(p.blocks.length).toBeGreaterThan(0)
    }
    expect(urls).toEqual([])
  })
})

describe('S2 · 攻点⑪ · 反向：网络只发生在后台刷新里', () => {
  it('startBackgroundRefresh() 确实会发网络（与进页路径形成对照）', async () => {
    let manifestJson = { schemaVersion: 1, contentVersion: 9, units: {} }
    const urls = installFetchSpy(async () => ({ ok: true, status: 200, json: async () => manifestJson }))
    startBackgroundRefresh()
    // 它是 fire-and-forget（microtask 里发起），需放行一个宏任务才能观察到
    await new Promise((r) => setTimeout(r, 0))
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.some((u) => u.includes('manifest.json'))).toBe(true)
  })

  it('★ fire-and-forget：调用**同步返回布尔值**，不返回 Promise（故不阻塞渲染/首屏）', () => {
    installFetchSpy(async () => ({ ok: true, json: async () => ({}) }))
    const ret = startBackgroundRefresh()
    expect(typeof ret).toBe('boolean') // 不是 Promise → 调用方无法 await，天然不在关键路径
    expect(ret).toBe(true)
  })

  it('P-S14 a：一次会话只触发一次（第二次返回 false 且不再发起网络）', async () => {
    let n = 0
    const urls = installFetchSpy(async () => {
      n++
      return { ok: true, status: 200, json: async () => ({ schemaVersion: 1, contentVersion: 9, units: {} }) }
    })
    expect(startBackgroundRefresh()).toBe(true)
    await new Promise((r) => setTimeout(r, 0))
    const after1 = n
    expect(after1).toBeGreaterThan(0)

    expect(startBackgroundRefresh()).toBe(false) // 已触发过
    await new Promise((r) => setTimeout(r, 0))
    expect(n, '第二次调用不得再发起网络').toBe(after1)
    expect(urls.filter((u) => u.includes('manifest.json')).length).toBe(1)
  })
})

describe('S2 · 攻点⑪ · 副作用：App.vue 接线不引入同步阻塞', () => {
  const appSrc = readFileSync(join(ROOT, 'src/App.vue'), 'utf8')

  it('App.vue 调用 startBackgroundRefresh 时**没有 await / 没有接收返回值**', () => {
    expect(appSrc).toMatch(/startBackgroundRefresh\(\)/)
    expect(appSrc, '不得 await 后台刷新（会把它拉进首屏关键路径）').not.toMatch(/await\s+startBackgroundRefresh/)
    expect(appSrc, '不得接收返回值后 await').not.toMatch(/=\s*startBackgroundRefresh/)
  })

  it('该调用位于 onMounted 内（不在模块顶层 / 不在渲染期）', () => {
    const lines = appSrc.split('\n')
    const callIdx = lines.findIndex((l) => /^\s*startBackgroundRefresh\(\)/.test(l))
    expect(callIdx, '未找到 startBackgroundRefresh() 调用行').toBeGreaterThan(-1)
    const before = lines.slice(0, callIdx).join('\n')
    const onMountedIdx = before.lastIndexOf('onMounted(')
    expect(onMountedIdx, '调用不在 onMounted 之后 → 可能在模块顶层（会阻塞求值）').toBeGreaterThan(-1)
    // onMounted 与调用之间不应跨越 setup 结束（即不应出现 </script>）
    expect(before.slice(onMountedIdx), '调用与 onMounted 之间不应跨出 script').not.toContain('</script>')
  })

  it('App.vue 的 onMounted 回调内无 await（不会阻塞首屏）', () => {
    const script = appSrc.slice(0, appSrc.indexOf('</script>'))
    const m = script.slice(script.indexOf('onMounted('))
    const block = m.slice(0, m.indexOf('\n})'))
    // ⚠️ 必须去注释后再判：注释里就有「不 await…」的说明文字（初版即被它误命中）
    const code = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    expect(code, 'onMounted 回调内不得 await（否则首屏被阻塞）').not.toMatch(/\bawait\b/)
    // 挂载期只做「发起」，不等待结果
    expect(code).toMatch(/startBackgroundRefresh\(\)/)
  })

  it('loadPage 源码内不出现 fetch（结构上就不可能发网络）', () => {
    const src = readFileSync(join(ROOT, 'src/content/loadPage.js'), 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
    expect(code).not.toMatch(/\bfetch\s*\(/)
    expect(code).not.toMatch(/XMLHttpRequest/)
  })
})
