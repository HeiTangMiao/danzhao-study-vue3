/**
 * 画板模块契约测试（B1′ 重构后的护栏）
 *
 * 背景：diagram 区块的画板代码原先是内容数据里的 initCode 字符串，运行期用 new Function 编译。
 *      生产 CSP 的 script-src 'self' 不含 'unsafe-eval'，桌面端必然抛 EvalError。
 *      现已一次性 codemod 成真实模块 src/geometry/boards/<boardId>.js。
 *
 * 这次迁移引入了一个新的可能断裂点：「内容页写了 boardId，但 boards 目录下没有对应模块」
 * （以前由「initCode 非空」这层校验兜住）。本测试就是这层保证的替代：
 *   - 正向：每个 diagram 区块的 boardId 都能命中同名模块，且 default 导出是可执行的 setup 函数
 *   - 反向：boards 目录下不能有孤儿文件（改了 boardId 却忘了改文件名）
 *   - 顺带：boardId 仍然全局唯一（防止将来复制粘贴导致重名互相覆盖）
 *
 * 扫描规则复用 collectFiles(CONTENT_DIR)，与 content-style / content-smoke 保持一致
 * ——「哪些算内容页」只有一处定义。
 */
import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { CONTENT_DIR, BOARD_DIR, collectFiles, collectBoardIds, relPathOf } from '../scripts/lib/load-content.mjs'

/**
 * 递归收集内容页里所有 diagram 区块（穿透 columns / group 嵌套）
 * @param {Array} blocks 区块数组
 * @param {Array<object>} out 收集结果
 */
function collectDiagrams(blocks, out = []) {
  if (!Array.isArray(blocks)) return out
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'diagram') {
      out.push(block)
      continue
    }
    if (Array.isArray(block.items)) {
      if (block.type === 'columns') block.items.forEach((col) => collectDiagrams(col, out))
      else collectDiagrams(block.items, out)
    }
  }
  return out
}

/** 全部内容页的区块（一次加载，供多条用例复用） */
const pages = await Promise.all(
  collectFiles(CONTENT_DIR).map(async (file) => ({
    rel: relPathOf(file),
    page: (await import(/* @vite-ignore */ file)).default
  }))
)
const diagrams = pages.flatMap(({ rel, page }) =>
  collectDiagrams(page && page.blocks).map((b) => ({ ...b, __file: rel }))
)

/** boards 目录下的模块名（去扩展名） */
const boardFiles = readdirSync(BOARD_DIR).filter((n) => n.endsWith('.js')).map((n) => n.slice(0, -3))

describe('画板模块契约', () => {
  it('内容页里的 diagram 区块非空（防止 collectDiagrams 递归漏掉嵌套后静默通过）', () => {
    expect(diagrams.length).toBeGreaterThan(0)
  })

  it('每个 diagram 区块都有非空 boardId', () => {
    const missing = diagrams.filter((b) => !b.boardId || String(b.boardId).trim() === '')
    expect(missing.map((b) => b.__file)).toEqual([])
  })

  it('boardId 全局唯一', () => {
    const ids = diagrams.map((b) => b.boardId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个 boardId 都能命中 src/geometry/boards/<boardId>.js', () => {
    const orphanIds = diagrams
      .map((b) => b.boardId)
      .filter((id) => !boardFiles.includes(id))
    expect(orphanIds).toEqual([])
  })

  it('boards 目录下无孤儿文件（每个模块都被某个 boardId 引用）', () => {
    const usedIds = new Set(diagrams.map((b) => b.boardId))
    expect(boardFiles.filter((f) => !usedIds.has(f))).toEqual([])
  })

  it('每个画板模块的 default 导出是接受 3 个参数的函数', async () => {
    for (const id of boardFiles) {
      const mod = await import(/* @vite-ignore */ `${BOARD_DIR}/${id}.js`)
      expect(typeof mod.default, `画板 ${id} 的 default 导出`).toBe('function')
      expect(mod.default.length, `画板 ${id} 的 setup 应接受 (board, colors, JXG)`).toBe(3)
    }
  })

  it('collectBoardIds() 与目录实际内容一致（Node 侧枚举入口未漂移）', () => {
    expect(collectBoardIds().sort()).toEqual([...boardFiles].sort())
  })

  it('每个画板模块的 setup 都能真正执行且不抛错（桩 board，不依赖 DOM）', async () => {
    // 画板代码只用 board.create / 返回元素上的取值方法，全部用桩接住：
    // 任意属性访问都返回一个「再调用返回 0」的函数，足以覆盖 Value()/X()/Y() 等。
    const stubElement = new Proxy({}, { get: () => () => 0 })
    const stubBoard = new Proxy(
      {},
      { get: (_t, prop) => (prop === 'objectsList' ? [] : () => stubElement) }
    )
    const colors = { bg: '#fff', primary: '#000', accent: '#000', text: '#000', muted: '#000' }

    for (const id of boardFiles) {
      const mod = await import(/* @vite-ignore */ `${BOARD_DIR}/${id}.js`)
      expect(() => mod.default(stubBoard, colors, null), `画板 ${id} 执行 setup 时抛错`).not.toThrow()
    }
  })
})
