/**
 * 每日背诵 · 篇目产物测试（T02）
 *
 * 被测对象：`scripts/build-recite-bank.mjs`（构建脚本）+ 入库的 `public/recite-bank/chinese.json`。
 *
 * 三层断言，各管一件事（别把三者混成一个 it，红了要能定位到层）：
 *  1. **形状**：产出的每条篇目必须是**长键**（`PIECE_FIELDS`，与运行时形状一致）、无多余字段、
 *     **无残留紧凑键**、lesson 不带 trigger、mode 恒 input。
 *     为什么钉「无残留紧凑键」：`PIECE_KEYS` 双形态容错让 `k` 与 `key` 并存时两边都"能用"，
 *     改一处漏另一处就会静默分叉 —— 这种错不报错，只在某天首页显示错的分母。
 *  2. **内容基线快照**：73 篇 / 170 句 / 193 空 / 16 篇一句多空 / strict 1 —— 与构建脚本的
 *     `BASELINE` **同一个常量**比对，内容侧一改 cloze 就红（有意设计，见 design §0）。
 *     这里刻意**不写第二份数字**：断言用 `BASELINE`，避免"脚本改了常量、测试还钉死旧数"。
 *  3. **入库产物与内容同步**：现场扫库（collectReciteBank）与盘上 JSON 逐字节一致（剔除
 *     `generatedAt`）—— 内容侧改了 cloze 但忘记 `npm run build:recite` 时，这一步会红。
 *
 * ⚠️ `contentVersion` **断言等于 `CONTENT_VERSION` 常量**，不硬编码 4：
 *    硬编码会在下次 bump 内容版本时假红（本仓踩过这个坑）。
 *
 * ⚠️ 本文件会真实 import 全部内容页（与 practice-bank / content-smoke 同样的 Vite transform
 *    开销），故 beforeAll 超时放宽到 120s —— 默认 5s 会间歇性假失败。
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeAll } from 'vitest'
import {
  BASELINE,
  SUBJECT,
  assertBaseline,
  collectClozeBlocks,
  collectReciteBank,
  countBlock,
  fingerprintOf,
  summarize
} from '../scripts/build-recite-bank.mjs'
import { CONTENT_VERSION } from '../src/content/contentManifest.js'
import {
  BANK_SCHEMA_VERSION,
  CLOZE_MODE_INPUT,
  PIECE_FIELDS,
  PIECE_KEYS,
  PIECE_ROLE,
  PIECE_TRIGGER,
  RECITE_BANK_PATH,
  deriveCounts,
  normalizePiece,
  sanitizeBank,
  subjectOfPiece
} from '../src/content/reciteBank.js'

// 产物路径经 RECITE_BANK_PATH（全仓唯一定义）拼接，禁止在此手拼 'recite-bank/chinese.json'
const ARTIFACT_PATH = fileURLToPath(new URL(`../public/${RECITE_BANK_PATH}`, import.meta.url))
const PKG_PATH = fileURLToPath(new URL('../package.json', import.meta.url))

/** 紧凑形态的键名清单（`PIECE_KEYS` 的键）—— 仅用于「不得残留紧凑键」的反向断言 */
const COMPACT_KEYS = Object.keys(PIECE_KEYS)

let collected = null

beforeAll(async () => {
  collected = await collectReciteBank()
}, 120000)

/** 便捷取篇目（beforeAll 之后必已就绪） */
function pieces() {
  return collected.pieces
}

/** 按标题找篇（标题在内容侧唯一；找不到直接失败而不是返回 undefined 让下游报奇怪的错） */
function pieceByTitle(title) {
  const hit = pieces().find((p) => p.title === title)
  expect(hit, `产物中找不到标题为「${title}」的篇目`).toBeDefined()
  return hit
}

describe('产物形状（collectReciteBank，不读盘）', () => {
  it('篇目数与 counts 自洽（counts 由 deriveCounts 派生，不第二次数）', () => {
    const list = pieces()
    expect(list.length).toBe(BASELINE.pieces)
    const counts = deriveCounts(list.map((p) => ({ role: p.role })))
    expect(counts).toEqual({ all: list.length, lesson: BASELINE.lesson, review: BASELINE.review })
    expect(collected.bank.counts).toEqual(counts)
  })

  it('每条篇目：长键齐全（= PIECE_FIELDS）、无多余字段、无残留紧凑键、类型正确', () => {
    const numberKeys = new Set(['order', 'fileIndex', 'blockIndex', 'sentenceCount', 'blankCount', 'strictCount'])
    // 残留紧凑键清单：除 fp（紧凑键与长键同名）外，任何一个出现都说明「两套形态混写」。
    // 混写的危害不是报错，而是 `k` 与 `key` 并存时两边都"能用"，改一处漏另一处 → 静默分叉。
    const residualCompact = COMPACT_KEYS.filter((compact) => PIECE_KEYS[compact] !== compact)

    for (const p of pieces()) {
      // ① 键集合 ⊆ PIECE_FIELDS —— 多出字段即形状漂移（运行时会静默忽略，最难查）
      for (const field of Object.keys(p)) {
        expect(PIECE_FIELDS.includes(field), `篇目 ${p.key} 出现未登记字段 ${field}`).toBe(true)
      }
      // ② 除 trigger（review 专属可选字段）外，全部长键必须存在
      for (const field of PIECE_FIELDS) {
        if (field === 'trigger') continue
        expect(p[field], `篇目 ${p.key} 缺字段 ${field}`).toBeDefined()
      }
      // ③ 不得残留任何紧凑键
      for (const compact of residualCompact) {
        expect(p[compact], `篇目 ${p.key} 残留紧凑键 ${compact}（应写作 ${PIECE_KEYS[compact]}）`).toBeUndefined()
      }
      // ④ 学科**不进条目**：学科由产物根 `subject` 给出（T01 裁定）。带空 subject 拼出来的 key
      //    语法合法但没有任何行会认领 → 作答记到不存在的篇上，是静默错源。
      expect(p.subject, `篇目 ${p.key} 不应带 subject（学科在产物根）`).toBeUndefined()
      // ⑤ 类型：计数字段必须是非负整数，其余是字符串
      for (const field of PIECE_FIELDS) {
        if (field === 'trigger') continue
        if (numberKeys.has(field)) {
          expect(Number.isInteger(p[field]), `篇目 ${p.key} 的 ${field} 不是整数：${p[field]}`).toBe(true)
          expect(p[field], `篇目 ${p.key} 的 ${field} 为负`).toBeGreaterThanOrEqual(0)
        } else {
          expect(typeof p[field], `篇目 ${p.key} 的 ${field} 不是字符串`).toBe('string')
        }
      }
      // ⑥ 键序 === PIECE_FIELDS 顺序（产物逐字节幂等依赖稳定键序；乱序会让 diff 无谓变大）
      expect(Object.keys(p)).toEqual(PIECE_FIELDS.filter((f) => f !== 'trigger' || 'trigger' in p))
    }
  })

  it('每条篇目都能被运行时 normalizePiece 完整还原（字段契约往返，sanitizeBank 对它是幂等的）', () => {
    for (const p of pieces()) {
      const normalized = normalizePiece(p)
      for (const field of PIECE_FIELDS) {
        // trigger 是可选字段（仅 review 有，设计 §3.4 `trigger?`）→ lesson 篇跳过
        if (field === 'trigger' && p.role === PIECE_ROLE.LESSON) continue
        const value = normalized[field]
        expect(value, `篇目 ${p.key} 经 normalizePiece 后 ${field} 为空`).not.toBe('')
        expect(value, `篇目 ${p.key} 经 normalizePiece 后 ${field} 为 undefined`).toBeDefined()
      }
      // 主键与坐标必须原样穿过（键里含中文，任何"顺手 trim/encode"都会让进度记到别的篇上）
      expect(normalized.key).toBe(p.key)
      expect(normalized.blockIndex).toBe(p.blockIndex)
      expect(normalized.fileKey).toBe(p.fileKey)
      // 产物形状 === 运行时形状：归一化后逐字段相等（不是"字段齐但值不同"）
      expect(normalized).toEqual(p)
    }
  })

  it('mode 恒为 input（reveal 篇构建期即排除）', () => {
    const modes = [...new Set(pieces().map((p) => p.mode))]
    expect(modes).toEqual([CLOZE_MODE_INPUT])
  })

  it('role 只有 lesson / review；lesson 不带 trigger，review 必带合法 trigger', () => {
    for (const p of pieces()) {
      expect([PIECE_ROLE.LESSON, PIECE_ROLE.REVIEW]).toContain(p.role)
      if (p.role === PIECE_ROLE.LESSON) {
        expect('trigger' in p, `lesson 篇 ${p.key} 不应带 trigger`).toBe(false)
      } else {
        expect([PIECE_TRIGGER.FILE, PIECE_TRIGGER.ALL]).toContain(p.trigger)
      }
    }
  })

  it('6 篇 review 的 trigger = 5 个 file + 1 个 all（按 title 含「冲关」烘焙）', () => {
    const review = pieces().filter((p) => p.role === PIECE_ROLE.REVIEW)
    expect(review.length).toBe(BASELINE.review)
    expect(review.filter((p) => p.trigger === PIECE_TRIGGER.FILE).length).toBe(5)
    const all = review.filter((p) => p.trigger === PIECE_TRIGGER.ALL)
    expect(all.length).toBe(1)
    expect(all[0].title).toContain('冲关')
    // 5 篇综合自测的 title 完全相同 → UI 必须显示 fileTitle（设计 §3.4 的坑），此处确认 title 确实重名
    const selfTest = review.filter((p) => p.trigger === PIECE_TRIGGER.FILE)
    expect(new Set(selfTest.map((p) => p.title)).size).toBe(1)
    expect(new Set(selfTest.map((p) => p.fileTitle)).size).toBe(5)
  })

  it('order 为 0..n-1 单调连续；key 唯一；学科前缀可由 subjectOfPiece 反解', () => {
    const list = pieces()
    list.forEach((p, i) => {
      expect(p.order, `第 ${i} 位的 order 不连续`).toBe(i)
    })
    expect(new Set(list.map((p) => p.key)).size).toBe(list.length)
    for (const p of list) {
      // subjectOfPiece 读的是长键 `key`（产物已是长键形态，无需先 normalizePiece）
      expect(subjectOfPiece(p)).toBe(SUBJECT)
      // 主键格式 `${subject}|${fileKey}|${blockIndex}`（设计 §7.2，禁把 title/text 放进键）
      expect(p.key).toBe(`${SUBJECT}|${p.fileKey}|${p.blockIndex}`)
    }
  })

  it('每篇都有可默写内容：sentenceCount > 0 且 blankCount > 0', () => {
    for (const p of pieces()) {
      expect(p.sentenceCount, `篇目 ${p.key} 没有句子`).toBeGreaterThan(0)
      expect(p.blankCount, `篇目 ${p.key} 没有空位（渲染层会输出空白页）`).toBeGreaterThan(0)
    }
  })
})

describe('内容基线快照（73 篇 / 170 句 / 193 空 / 16 篇一句多空）', () => {
  it('汇总口径逐项等于脚本顶部 BASELINE（内容侧一改 cloze 就红，有意设计）', () => {
    expect(summarize(pieces(), collected.blockRows)).toEqual(BASELINE)
  })

  it('关雎：strict 句 1 / 2 句 / 4 空（strictCount 是句数，不是空位数）', () => {
    const guanJu = pieceByTitle('《诗经》 · 关雎')
    expect(guanJu.strictCount).toBe(1)
    expect(guanJu.sentenceCount).toBe(2)
    expect(guanJu.blankCount).toBe(4)
    // 该校验同时也是「strictCount 按句而非按空」的锚点：该 strict 句含 2 个空，若按空计会是 2
    expect(guanJu.blankCount).toBeGreaterThan(guanJu.strictCount)
  })

  it('一句多空 16 篇，且确实存在 blankCount > sentenceCount 的篇（该字段不是摆设）', () => {
    const multi = pieces().filter((p) => p.blankCount > p.sentenceCount)
    expect(multi.length).toBe(BASELINE.multiBlankPieces)
    expect(multi.length).toBeGreaterThan(0)
    for (const p of multi) expect(p.blankCount).toBeGreaterThan(p.sentenceCount)
    // 全库口径（含被排除的 reveal 篇）= 17，比产物内多 1 —— 汇总行的「全库 N」据此得出
    expect(summarize(pieces(), collected.blockRows).multiBlankAllBlocks).toBe(BASELINE.multiBlankAllBlocks)
  })

  it('contentVersion 投影 CONTENT_VERSION（断言相等，不硬编码数字）', () => {
    expect(collected.bank.contentVersion).toBe(CONTENT_VERSION)
    expect(Number.isFinite(collected.bank.contentVersion)).toBe(true)
    expect(collected.bank.schemaVersion).toBe(BANK_SCHEMA_VERSION)
    expect(collected.bank.subject).toBe(SUBJECT)
  })

  it('generatedAt 是合法 ISO 时间字符串（仅审计用，不参与比较）', () => {
    expect(typeof collected.bank.generatedAt).toBe('string')
    expect(Number.isNaN(Date.parse(collected.bank.generatedAt))).toBe(false)
  })
})

describe('入库产物 public/recite-bank/chinese.json', () => {
  it('存在且能被运行时 sanitizeBank 完整接受（schemaVersion / contentVersion / 不丢条）', () => {
    expect(existsSync(ARTIFACT_PATH), `产物缺失：${RECITE_BANK_PATH}（请跑 node scripts/build-recite-bank.mjs）`).toBe(
      true
    )
    const raw = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8'))
    expect(raw.schemaVersion).toBe(BANK_SCHEMA_VERSION)
    expect(raw.contentVersion).toBe(CONTENT_VERSION)
    const bank = sanitizeBank(raw)
    expect(bank, 'sanitizeBank 判定产物不可用（运行时会导致「素材加载失败」）').not.toBeNull()
    expect(bank.pieces.length, 'sanitizeBank 丢弃了条目 → 产物字段不满足运行时契约').toBe(raw.pieces.length)
    expect(raw.pieces.length).toBe(BASELINE.pieces)
  })

  it('产物声明的 counts 必须与 deriveCounts(pieces) 逐键相等（运行时不用它，但它错了说明构建期算错了）', () => {
    const raw = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8'))
    const bank = sanitizeBank(raw)
    expect(bank).not.toBeNull()
    // ⚠️ 运行时**不读**产物的 counts（T01 起 sanitizeBank 一律用 deriveCounts(pieces) 现算，
    // 声明值只作构建期校验），所以这条断言守的**不是**「运行时采信声明值」，而是
    // 「构建期没算错、也没写占位值」—— 首页分母 `已背 X / 67` 与队列上限都出自这个数，
    // 错了不会报错、只会显示错的分母。这是唯一挡它的守卫，别当冗余删掉。
    expect(raw.counts).toEqual(deriveCounts(bank.pieces))
    // 同时钉住「声明的 counts 与构建期基线一致」：与 BASELINE 同源，避免此处硬编码 73/67/6
    expect(raw.counts).toEqual({
      all: BASELINE.pieces,
      lesson: BASELINE.lesson,
      review: BASELINE.review
    })
  })

  it('盘上产物逐条是长键形态（不是紧凑键，也不混写）', () => {
    const raw = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8'))
    const residualCompact = COMPACT_KEYS.filter((compact) => PIECE_KEYS[compact] !== compact)
    for (const p of raw.pieces) {
      expect(Object.keys(p).some((f) => residualCompact.includes(f)), `产物篇目 ${p.key} 残留紧凑键`).toBe(false)
      // 长键必备字段直接可读 —— 这正是「直接 JSON.parse 再读 piece.fileKey」那一类消费方的前提
      for (const field of PIECE_FIELDS) {
        if (field === 'trigger' && p.role !== PIECE_ROLE.REVIEW) continue
        expect(p[field], `产物篇目 ${p.key} 缺长键 ${field}`).toBeDefined()
      }
    }
  })

  it('入库产物与现场扫库一致（剔除 generatedAt）→ 改了内容却没重建会红', () => {
    const raw = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8'))
    const strip = (bank) => JSON.stringify({ ...bank, generatedAt: '<stripped>' })
    const failureHint =
      '盘上产物与当前内容不一致：请跑 `node scripts/build-recite-bank.mjs` 重建并提交 ' +
      `${RECITE_BANK_PATH}（内容侧改动后忘记重建是本仓常见疏漏）`
    expect(strip(raw), failureHint).toBe(strip(JSON.parse(JSON.stringify(collected.bank))))
  })
})

describe('collectClozeBlocks：嵌套 cloze 必须与顶层分离（嵌套的定位不到 → 不许收）', () => {
  it('只收 page.blocks 顶层的 cloze；layout/group/columns 里的 cloze 归入 nested', () => {
    const blocks = [
      { type: 'cloze', title: '顶层 A', items: [] },
      {
        type: 'layout',
        children: [{ type: 'cloze', title: '嵌套 B（layout.children）', items: [] }]
      },
      { type: 'group', items: [{ type: 'cloze', title: '嵌套 C（group.items）', items: [] }] },
      { type: 'columns', items: [[{ type: 'cloze', title: '嵌套 D（columns 数组的数组）', items: [] }]] },
      { type: 'cloze', title: '顶层 E', items: [] }
    ]
    const { topLevel, nested } = collectClozeBlocks(blocks)
    expect(topLevel.map((b) => b.title)).toEqual(['顶层 A', '顶层 E'])
    expect(nested.map((n) => n.block.title)).toEqual([
      '嵌套 B（layout.children）',
      '嵌套 C（group.items）',
      '嵌套 D（columns 数组的数组）'
    ])
    // 深度用于告警文案（depth>=1 即嵌套），不能是 undefined
    for (const n of nested) expect(n.depth).toBeGreaterThanOrEqual(1)
  })

  it('非对象 / 字符串 / 空数组不会炸，也不会被误当成 cloze', () => {
    const { topLevel, nested } = collectClozeBlocks([null, 'text', [], { type: 'paragraph', text: 'x' }])
    expect(topLevel).toEqual([])
    expect(nested).toEqual([])
  })
})

describe('countBlock / fingerprintOf', () => {
  it('countBlock 句数 / 空数 / strict 句数（strict 按句计，不按空计）', () => {
    const block = {
      type: 'cloze',
      title: '夹具',
      items: [
        { text: '甲{{一}}乙' },
        { text: '丙{{二}}丁{{三}}戊', strict: true },
        { text: '无空句' }
      ]
    }
    expect(countBlock(block)).toEqual({ sentenceCount: 3, blankCount: 3, strictCount: 1 })
    // 空区块不炸（运行时的 total>0 守卫另有单测，这里只保证构建期不抛）
    expect(countBlock({})).toEqual({ sentenceCount: 0, blankCount: 0, strictCount: 0 })
  })

  it('fingerprintOf：同内容稳定、改字即变、改 strict/mode 不变（设计 §3.2）', () => {
    const base = { type: 'cloze', title: '关雎', items: [{ text: '求之不得，{{寤寐思服}}。' }] }
    const fp1 = fingerprintOf(base)
    expect(fp1).toBe(fingerprintOf(JSON.parse(JSON.stringify(base))))
    expect(fp1).toMatch(/^[0-9a-z]+$/)
    // 改正文 → 指纹变（这是运行时自动迁移的唯一依据）
    const edited = { ...base, items: [{ text: '求之不得，{{寤寐思服}}！' }] }
    expect(fingerprintOf(edited)).not.toBe(fp1)
    // strict / mode 不属于内容同一性 → 指纹不变
    expect(fingerprintOf({ ...base, items: [{ text: base.items[0].text, strict: true }] })).toBe(fp1)
    expect(fingerprintOf({ ...base, mode: 'reveal' })).toBe(fp1)
  })
})

describe('assertBaseline 的失败信息必须可操作（不是只 exit 1）', () => {
  const summaryOf = (over = {}) => ({ ...summarize([], []), ...over })

  it('全部达标时返回空数组', () => {
    expect(assertBaseline(summarize(pieces(), collected.blockRows), pieces(), collected.blockRows, {
      contentVersion: CONTENT_VERSION,
      roundTripPieces: pieces().length
    })).toEqual([])
  })

  it('阈值不符时给出 期望 / 实际 / 差 + 差异清单', () => {
    const broken = summaryOf({ totalBlank: 999, pieces: 72 })
    const failures = assertBaseline(broken, pieces(), collected.blockRows, { contentVersion: CONTENT_VERSION })
    const blank = failures.find((f) => f.label.includes('总空位数'))
    expect(blank).toBeDefined()
    expect(blank.expected).toBe(BASELINE.totalBlank)
    expect(blank.actual).toBe(999)
    expect(blank.delta).toBe(999 - BASELINE.totalBlank)
    // 差异清单必须按文件落到「几篇 / 几句 / 几空」，否则修的人还得自己再扫一遍库
    expect(blank.hints.some((h) => h.includes('篇 /') && h.includes('空'))).toBe(true)
    // 篇数不符时也要给出按文件分布
    const pieceCount = failures.find((f) => f.label.includes('篇目数'))
    expect(pieceCount).toBeDefined()
    expect(pieceCount.hints.some((h) => h.includes('篇 /'))).toBe(true)
  })

  it('结构性不变量失败时点名具体条目（order / 重复键 / 零空位 / 非法版本）', () => {
    const broken = pieces().map((p, i) => (i === 0 ? { ...p, order: 99, blankCount: 0 } : { ...p, order: i }))
    const dup = { ...broken[1], key: broken[0].key }
    const rows = [broken[0], dup, ...broken.slice(2)]
    const failures = assertBaseline(summarize(rows, collected.blockRows), rows, collected.blockRows, {
      contentVersion: NaN,
      roundTripPieces: rows.length - 1
    })
    const labels = failures.map((f) => f.label).join('\n')
    expect(labels).toContain('order 连续')
    expect(labels).toContain('重复主键')
    expect(labels).toContain('零空位')
    expect(labels).toContain('contentVersion')
    expect(labels).toContain('sanitizeBank')
    // 明细里必须有可定位的键
    expect(failures.find((f) => f.label.includes('order 连续')).hints.join('\n')).toContain('order=99')
  })
})

describe('package.json 串联（保守：只在 prebuild 链上追加一次）', () => {
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'))

  it('新增 build:recite 脚本', () => {
    expect(pkg.scripts['build:recite']).toBe('node scripts/build-recite-bank.mjs')
  })

  it('build:recite 串在 build:index 之后、build:content-remote 之前', () => {
    const prebuild = pkg.scripts.prebuild
    const i = prebuild.indexOf('build:index')
    const r = prebuild.indexOf('build:recite')
    const c = prebuild.indexOf('build:content-remote')
    expect(i).toBeGreaterThanOrEqual(0)
    expect(r).toBeGreaterThan(i)
    expect(c).toBeGreaterThan(r)
    // prebuild:tauri 也要产出背诵产物（Tauri 包内副本来自 public/）
    expect(pkg.scripts['prebuild:tauri']).toContain('build:recite')
  })

  it('同一条链里 build:recite 只出现一次（不会多跑一次）', () => {
    const count = (s) => s.split('build:recite').length - 1
    expect(count(pkg.scripts.prebuild)).toBe(1)
    expect(count(pkg.scripts['prebuild:tauri'])).toBe(1)
    // build:index 保持原样（s5-qa-artifacts 的 D3 逐字断言它；本任务不改它的语义）
    expect(pkg.scripts['build:index']).toBe('npm run build:practice && npm run build:search')
  })
})
