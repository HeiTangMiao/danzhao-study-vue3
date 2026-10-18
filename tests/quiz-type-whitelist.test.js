/**
 * 题型白名单一致性守卫（对应 project-assessment-2026-10-17.md 改进项）
 *
 * 背景：题型枚举散落在多处，改一处漏一处是本项目**已被实证**的失效模式
 * —— 批 S4 时 `batch-s4-tasks.md` 的路径被 `tests/s4-verify-gate.test.js:85`
 *    断言与 `mergeContent.js:37` 注释双向咬住，漏改即红；
 * —— 而 schema 侧的枚举改动**没有任何自动化能拦**（schema 只是常量源，
 *    真正的关卡是手写 `src/utils/validateBlock.js`）。
 *
 * 本文件钉住两件事：
 *  ① quiz 块允许 solve —— 开放式 / 多步命令序列题应能改标 solve 走自评，
 *     否则它们被 isFillItem 判成填空而**学员答对也判 miss**（静默缺陷）。
 *  ② validateBlock 的 allowed **必须来自 schema**，不得另起一份硬编码枚举
 *     （否则改 schema 不生效，形同虚设）。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const schema = JSON.parse(readFileSync(join(ROOT, 'schema/content-schema.json'), 'utf8'))
const validateSrc = readFileSync(join(ROOT, 'src/utils/validateBlock.js'), 'utf8')

describe('题型白名单一致性', () => {
  it('① quiz 块允许 solve 题型（开放式/多步命令题才能改标走自评）', () => {
    const quizTypes = schema.definitions.quizItem.properties.type.enum
    expect(quizTypes, 'quiz 块枚举必须含 solve，否则开放性题目只能顶着 fill 被自动判分').toContain('solve')
  })

  it('② exam 块允许 solve（与 quiz 口径一致）', () => {
    const examTypes = schema.definitions.examItem.properties.type.enum
    expect(examTypes).toContain('solve')
  })

  it('③ validateBlock 的题型枚举来自 schema，未另起硬编码清单', () => {
    // 若哪天有人把 QUIZ_TYPES 写死成字面量数组，这条会红——那意味着改 schema 不再生效
    expect(validateSrc).toMatch(/QUIZ_TYPES\s*=\s*schema\.definitions\.quizItem\.properties\.type\.enum/)
    expect(validateSrc).toMatch(/EXAM_TYPES\s*=\s*schema\.definitions\.examItem\.properties\.type\.enum/)
    expect(validateSrc).not.toMatch(/QUIZ_TYPES\s*=\s*\[/)
    expect(validateSrc).not.toMatch(/EXAM_TYPES\s*=\s*\[/)
  })

  it('④ solve 条目不被判为填空（isFillItem 收紧生效）', async () => {
    const { isFillItem } = await import('@/content/answerNorm')
    expect(isFillItem({ type: 'solve', question: '直线的斜率为 ______。' })).toBe(false)
  })

  it('⑤ 反向锚：type:fill 仍被判为填空，未被误伤', async () => {
    const { isFillItem } = await import('@/content/answerNorm')
    expect(isFillItem({ type: 'fill', question: '任意题干' })).toBe(true)
    expect(isFillItem({ question: '函数 f(x)=______ 的值' })).toBe(true)
  })
})
