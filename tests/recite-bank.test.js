/**
 * 每日背诵 · 篇目产物测试（T02；2026-10-30 方案变更后重写）
 *
 * 被测对象：`scripts/build-recite-bank.mjs`（构建脚本）+ 入库的 `public/recite-bank/chinese.json`。
 *
 * ⚠️ 数据源变更：上一版验的是「07-默写专项的 cloze 挖空」；本轮起数据源是
 *    **08-背诵专项的 `knowledge` 区块**（每篇 = 完整诗词原文 + 内联注音），**不挖空、不判分**。
 *    产物的 cloze 时代字段 `mode` / `sentenceCount` / `blankCount` / `strictCount` 已整体退役，
 *    由 `paragraphs`（正文段落数组）取代 —— 本文件把它们钉成「**不许再出现**」（见 `RETIRED_PIECE_FIELDS`）：
 *    字段退役本身既不报错也不告警，唯一看得见的形态是「哪天有人把它当有效口径接回来」，
 *    所以必须留一条 negative 断言专职报警。
 *
 * 三层断言，各管一件事（别把三者混成一个 it，红了要能定位到层）：
 *  1. **形状**：产出的每条篇目必须是**长键**（`PIECE_FIELDS`，与运行时形状一致）、无多余字段、
 *     **无残留紧凑键**、**无 cloze 时代退役字段**、正文是字符串数组。
 *     为什么钉「无残留紧凑键」：`PIECE_KEYS` 双形态容错让 `k` 与 `key` 并存时两边都"能用"，
 *     改一处漏另一处就会静默分叉 —— 这种错不报错，只在某天首页显示错的分母。
 *  2. **内容基线快照**：64 篇 / lesson 64 / review 0 —— 与构建脚本的
 *     `BASELINE` **同一个常量**比对，内容侧一改背诵篇目就红（有意设计，见 design §0）。
 *     这里刻意**不写第二份数字**：断言用 `BASELINE`，避免"脚本改了常量、测试还钉死旧数"。
 *  3. **入库产物与内容同步**：现场扫库（collectReciteBank）与盘上 JSON 逐字节一致（剔除
 *     `generatedAt`）—— 内容侧改了篇目但忘记 `npm run build:recite` 时，这一步会红。
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
  RECITE_UNIT_NUM,
  assertBaseline,
  collectReciteBlocks,
  collectReciteBank,
  fingerprintOf,
  summarize
} from '../scripts/build-recite-bank.mjs'
import { CONTENT_VERSION } from '../src/content/contentManifest.js'
import {
  BANK_SCHEMA_VERSION,
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

/**
 * cloze 时代的产物字段（2026-10-30 随「不再挖空/不再判分」一并退役）。
 *
 * 为什么反反复复钉"不许出现"：退役的字段**不会让任何东西报错** —— 运行时 `normalizePiece`
 * 会把它静静吞掉，UI 也看不出来。它唯一的形态是「一段时间后有人把它当有效口径接回来」。
 * 这条 negative 断言是那道唯一会报警的地方。
 */
const RETIRED_PIECE_FIELDS = ['mode', 'sentenceCount', 'blankCount', 'strictCount']

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
    const numberKeys = new Set(['order', 'fileIndex', 'blockIndex'])
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
      // ⑤ 类型：计数字段必须是非负整数，正文是字符串数组，其余是字符串
      for (const field of PIECE_FIELDS) {
        if (field === 'trigger') continue
        if (field === 'paragraphs') {
          expect(Array.isArray(p.paragraphs), `篇目 ${p.key} 的 paragraphs 不是数组`).toBe(true)
          p.paragraphs.forEach((para, i) => {
            expect(typeof para, `篇目 ${p.key} 第 ${i + 1} 段不是字符串`).toBe('string')
            expect(para, `篇目 ${p.key} 第 ${i + 1} 段为空串`).not.toBe('')
          })
          continue
        }
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
      // 正文必须整段穿过（缺一段就少一段给人背 —— 且不报错）
      expect(normalized.paragraphs.length, `篇目 ${p.key} 经 normalizePiece 后正文段数变了`).toBe(
        p.paragraphs.length
      )
      expect(normalized.paragraphs, `篇目 ${p.key} 往返后正文被改写`).toEqual(p.paragraphs)
      // 主键与坐标必须原样穿过（键里含中文，任何"顺手 trim/encode"都会让进度记到别的篇上）
      expect(normalized.key).toBe(p.key)
      expect(normalized.blockIndex).toBe(p.blockIndex)
      expect(normalized.fileKey).toBe(p.fileKey)
      // 产物形状 === 运行时形状：归一化后逐字段相等（不是"字段齐但值不同"）
      expect(normalized).toEqual(p)
    }
  })

  it('每条篇目都不带 cloze 时代的退役字段（mode / sentenceCount / blankCount / strictCount）', () => {
    for (const p of pieces()) {
      for (const field of RETIRED_PIECE_FIELDS) {
        expect(
          p[field],
          `篇目 ${p.key} 仍带退役字段 ${field}（2026-10-30 起背诵不挖空、不判分，该字段已无语义）`
        ).toBeUndefined()
      }
    }
    // 盘上产物同口径：绕开 normalizePiece 直接读 JSON（构建期落盘的那一刻就可能写进去）
    expect(existsSync(ARTIFACT_PATH)).toBe(true)
    const raw = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8'))
    for (const p of raw.pieces) {
      for (const field of RETIRED_PIECE_FIELDS) {
        expect(field in p, `盘上产物篇目 ${p.key} 仍带退役字段 ${field}`).toBe(false)
      }
    }
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

  it('review 篇数 = BASELINE.review（08 单元当前全 lesson）；每篇 review 的 trigger 必须等于构建期烘焙值', () => {
    const review = pieces().filter((p) => p.role === PIECE_ROLE.REVIEW)
    expect(review.length).toBe(BASELINE.review)
    for (const p of review) {
      // 构建期规则（唯一的判定处）：title 含「冲关」→ 'all'，其余 review → 'file'；运行时不猜
      const expected = p.title.indexOf('冲关') >= 0 ? PIECE_TRIGGER.ALL : PIECE_TRIGGER.FILE
      expect(
        p.trigger,
        `review 篇 ${p.key}（title=${p.title}）的 trigger 与 title→trigger 烘焙规则不符`
      ).toBe(expected)
    }
    // ⚠️ 覆盖率提示：08 单元当前 review = 0，上面那个循环目前是空转的。
    //    它不是死守卫 —— 内容侧一旦新增「综合自测 / 综合大冲关」knowledge 块就会被立刻验到；
    //    想在 review=0 时也存在判别力，需要构建脚本把 title→role/trigger 提成可导出纯函数
  })

  it('order 为 0..n-1 单调连续；key 唯一；学科前缀与单元号由常量反解', () => {
    const list = pieces()
    list.forEach((p, i) => {
      expect(p.order, `第 ${i} 位的 order 不连续`).toBe(i)
    })
    expect(new Set(list.map((p) => p.key)).size).toBe(list.length)
    for (const p of list) {
      // subjectOfPiece 读的是长键 `key`（产物已是长键形态，无需先 normalizePiece）
      expect(subjectOfPiece(p)).toBe(SUBJECT)
      // 单元号必须恒为 08（构建期同时限定 subject+unitNum 才不误收 math/computer 的 08 单元）
      expect(p.unitNum, `篇目 ${p.key} 的 unitNum 不是 ${RECITE_UNIT_NUM}`).toBe(RECITE_UNIT_NUM)
      // 主键格式 `${subject}|${fileKey}|${blockIndex}`（设计 §7.2，禁把 title/text 放进键）
      expect(p.key).toBe(`${SUBJECT}|${p.fileKey}|${p.blockIndex}`)
    }
  })

  it('每篇都有可背诵的正文：paragraphs 非空且每段非空', () => {
    for (const p of pieces()) {
      expect(p.paragraphs.length, `篇目 ${p.key} 没有正文（渲染层会输出空白页）`).toBeGreaterThan(0)
      for (const para of p.paragraphs) {
        expect(para.trim(), `篇目 ${p.key} 存在空白段落`).not.toBe('')
      }
      // 整篇没有可显示的字 —— 同样是"渲染成功但什么也没有"，必须拦住
      expect(p.paragraphs.join('').length, `篇目 ${p.key} 正文全空`).toBeGreaterThan(0)
    }
  })
})

describe('内容基线快照（64 篇 / lesson 64 / review 0）', () => {
  it('汇总口径逐项等于脚本顶部 BASELINE（内容侧一改背诵篇目就红，有意设计）', () => {
    const summary = summarize(pieces(), collected.blockRows)
    expect(summary).toMatchObject(BASELINE)
    // `summarize` 比 BASELINE 多一项诊断口径：正文段落总数。不在这里写第二个数字
    // （内容侧新增/拆分段落时这里会红并指明原因），只钉住"每篇至少 1 段"这条结构不变量。
    expect(
      summary.totalParagraphs,
      `有篇目没有正文段落（totalParagraphs=${summary.totalParagraphs} < pieces=${summary.pieces}）`
    ).toBeGreaterThanOrEqual(summary.pieces)
  })

  it('关雎：正文为整篇字符串数组，注音以全角括号内联在文本里，且没有任何挖空标记', () => {
    const guanJu = pieceByTitle('《诗经》 · 关雎')
    expect(Array.isArray(guanJu.paragraphs)).toBe(true)
    expect(guanJu.paragraphs.length).toBeGreaterThan(0)

    const text = guanJu.paragraphs.join('\n')
    // 有内容：起句与结句都在（正文被截断 / 漏抽，这里第一个发现）
    expect(text).toContain('关关雎鸠（guān guān jū jiū）')
    expect(text).toContain('辗转反侧（zhǎn zhuǎn fǎn cè）')
    // 注音形态：逐句全注（每一段都必须带内联括号）
    guanJu.paragraphs.forEach((para, i) => {
      expect(typeof para, `关雎第 ${i + 1} 段不是字符串`).toBe('string')
      expect(para.indexOf('（') >= 0 && para.indexOf('）') >= 0, `关雎第 ${i + 1} 段没有内联注音`).toBe(true)
    })
    // 不挖空：本方案**没有** cloze 语义，`{{...}}` 出现在正文里只可能是构建期抽错了数据源
    expect(text.indexOf('{{'), '关雎正文里出现了 cloze 挖空标记 {{').toBe(-1)
    expect(text.indexOf('}}'), '关雎正文里出现了 cloze 挖空标记 }}').toBe(-1)
    // 退役字段缺席（同上：沉默地"暂时留着"是最坏的形态）
    for (const field of RETIRED_PIECE_FIELDS) {
      expect(guanJu[field], `关雎仍带退役字段 ${field}`).toBeUndefined()
    }
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
    // 「构建期没算错、也没写占位值」—— 首页分母 `已背 X / N` 与队列上限都出自这个数，
    // 错了不会报错、只会显示错的分母。这是唯一挡它的守卫，别当冗余删掉。
    expect(raw.counts).toEqual(deriveCounts(bank.pieces))
    // 同时钉住「声明的 counts 与构建期基线一致」：与 BASELINE 同源，避免此处硬编码篇数
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

describe('collectReciteBlocks：嵌套 knowledge 必须与顶层分离（嵌套的定位不到 → 不许收）', () => {
  it('只收 page.blocks 顶层的 knowledge；layout/group/columns 里的 knowledge 归入 nested', () => {
    const blocks = [
      { type: 'knowledge', title: '顶层 A', paragraphs: ['甲'] },
      {
        type: 'layout',
        children: [{ type: 'knowledge', title: '嵌套 B（layout.children）', paragraphs: ['乙'] }]
      },
      { type: 'group', items: [{ type: 'knowledge', title: '嵌套 C（group.items）', paragraphs: ['丙'] }] },
      {
        type: 'columns',
        items: [[{ type: 'knowledge', title: '嵌套 D（columns 数组的数组）', paragraphs: ['丁'] }]]
      },
      { type: 'knowledge', title: '顶层 E', paragraphs: ['戊'] }
    ]
    const { topLevel, nested } = collectReciteBlocks(blocks)
    expect(topLevel.map((b) => b.title)).toEqual(['顶层 A', '顶层 E'])
    expect(nested.map((n) => n.block.title)).toEqual([
      '嵌套 B（layout.children）',
      '嵌套 C（group.items）',
      '嵌套 D（columns 数组的数组）'
    ])
    // 深度用于告警文案（depth>=1 即嵌套），不能是 undefined
    for (const n of nested) expect(n.depth).toBeGreaterThanOrEqual(1)
  })

  it('非对象 / 字符串 / 空数组不会炸，也不会被误当成 knowledge', () => {
    const { topLevel, nested } = collectReciteBlocks([null, 'text', [], { type: 'paragraph', text: 'x' }])
    expect(topLevel).toEqual([])
    expect(nested).toEqual([])
  })

  it('cloze 块一个都不收（数据源已切到 knowledge；静默混进来会让「第 N 块」指向另一个口径）', () => {
    const { topLevel, nested } = collectReciteBlocks([
      { type: 'knowledge', title: '真·背诵篇', paragraphs: ['甲'] },
      { type: 'cloze', title: 'cloze 顶层（07 单元的老数据源）', items: [{ text: '乙{{丙}}' }] },
      { type: 'layout', children: [{ type: 'cloze', title: 'cloze 嵌套', items: [] }] }
    ])
    // 顶层只有 knowledge；cloze 既不算顶层、也不进 nested（它不属于本功能的块型）
    expect(topLevel.map((b) => b.title)).toEqual(['真·背诵篇'])
    expect(nested.map((n) => n.block.type)).toEqual([])
  })
})

describe('fingerprintOf（knowledge 形态）', () => {
  it('同内容稳定；改正文一字即变；退役字段与坐标不参与（设计 §3.2）', () => {
    const base = {
      type: 'knowledge',
      title: '关雎',
      paragraphs: ['关关雎鸠（guān guān jū jiū），在河之洲（zài hé zhī zhōu）。']
    }
    const fp1 = fingerprintOf(base)
    expect(fp1).toBe(fingerprintOf(JSON.parse(JSON.stringify(base))))
    expect(fp1).toMatch(/^[0-9a-z]+$/)
    // 改正文 → 指纹变（这是运行时自动迁移的唯一依据）
    const edited = {
      ...base,
      paragraphs: ['关关雎鸠（guān guān jū jiū），在河之渚（zài hé zhī zhǔ）。']
    }
    expect(fingerprintOf(edited)).not.toBe(fp1)
    // 改标题 → 指纹变（换了一篇）
    expect(fingerprintOf({ ...base, title: '关雎（新版）' })).not.toBe(fp1)
    // strict / mode 这两类 cloze 时代的字段，与坐标 blockIndex 都不属于「内容同一性」→ 指纹不变
    expect(fingerprintOf({ ...base, mode: 'input' })).toBe(fp1)
    expect(fingerprintOf({ ...base, strictCount: 3 })).toBe(fp1)
    expect(fingerprintOf({ ...base, blockIndex: 9 })).toBe(fp1)
    expect(fingerprintOf({ ...base, items: [{ text: '甲{{乙}}' }] })).toBe(fp1)
  })

  it('空/非法入参不炸，且与「空内容」同一指纹', () => {
    expect(fingerprintOf({})).toBe(fingerprintOf({ title: '', paragraphs: [] }))
    expect(fingerprintOf(null)).toMatch(/^[0-9a-z]+$/)
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
    const broken = summaryOf({ totalReciteBlocks: 999, pieces: 72, lesson: 71, review: 1 })
    const failures = assertBaseline(broken, pieces(), collected.blockRows, { contentVersion: CONTENT_VERSION })

    const blockCount = failures.find((f) => f.label.includes('knowledge 块数'))
    expect(blockCount).toBeDefined()
    expect(blockCount.expected).toBe(BASELINE.totalReciteBlocks)
    expect(blockCount.actual).toBe(999)
    expect(blockCount.delta).toBe(999 - BASELINE.totalReciteBlocks)
    // 差异清单必须按文件落到「几篇 / 几段」，否则修的人还得自己再扫一遍库
    expect(blockCount.hints.some((h) => h.includes('篇 /') && h.includes('段'))).toBe(true)

    // 篇数不符时也要给出按文件分布
    const pieceCount = failures.find((f) => f.label.includes('篇目数'))
    expect(pieceCount).toBeDefined()
    expect(pieceCount.expected).toBe(BASELINE.pieces)
    expect(pieceCount.actual).toBe(72)
    expect(pieceCount.hints.some((h) => h.includes('篇 /'))).toBe(true)

    // review 篇数同样必须有单独的失败项（它的影响面是"复习触发"）
    const reviewCount = failures.find((f) => f.label.includes('review 篇数'))
    expect(reviewCount).toBeDefined()
    expect(reviewCount.expected).toBe(BASELINE.review)
    expect(reviewCount.actual).toBe(1)
  })

  it('结构性不变量失败时点名具体条目（order / 重复键 / 无正文 / 非法版本）', () => {
    const broken = pieces().map((p, i) => (i === 0 ? { ...p, order: 99, paragraphs: [] } : { ...p, order: i }))
    const dup = { ...broken[1], key: broken[0].key }
    const rows = [broken[0], dup, ...broken.slice(2)]
    const failures = assertBaseline(summarize(rows, collected.blockRows), rows, collected.blockRows, {
      contentVersion: NaN,
      roundTripPieces: rows.length - 1
    })
    const labels = failures.map((f) => f.label).join('\n')
    expect(labels).toContain('order 连续')
    expect(labels).toContain('重复主键')
    expect(labels).toContain('无正文')
    expect(labels).toContain('contentVersion')
    expect(labels).toContain('sanitizeBank')
    // 明细里必须有可定位的键
    expect(failures.find((f) => f.label.includes('order 连续')).hints.join('\n')).toContain('order=99')
    // 「无正文」必须点名是哪一篇，否则修的人还得自己扫一遍产物
    const emptyBody = failures.find((f) => f.label.includes('无正文'))
    expect(emptyBody.actual).toBe(1)
    expect(emptyBody.hints.join('\n')).toContain(broken[0].key)
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
