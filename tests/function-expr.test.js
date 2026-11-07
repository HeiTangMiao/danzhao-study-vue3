/**
 * functionExpr —— 表达式解析契约测试（CSP 安全护栏）
 *
 * 覆盖：显函数 / y= 形式 / 一元负号与幂的优先级 / 隐函数 / 隐式乘法 / pi 归一化 / 错误输入，
 * 以及两条 CSP 护栏：
 *   - 静态：源码不得出现 toJSFunction（只有它用 new Function，会被生产 CSP 拦）
 *   - 运行时：把全局 Function/eval 置为抛错后，evaluate() 仍能求值
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyze, preprocess } from '@/utils/functionExpr'

const ROOT = process.cwd()

describe('preprocess（隐式乘法 / 常量归一化）', () => {
  it('数字后接字母：2x → 2*x', () => {
    expect(preprocess('2x')).toBe('2*x')
    expect(preprocess('x^2 - 2x - 3')).toBe('x^2-2*x-3')
    expect(preprocess('y^2 - 2x + 4y')).toBe('y^2-2*x+4*y')
  })

  it('数字后接括号：2(x+1) → 2*(x+1)', () => {
    expect(preprocess('2(x+1)')).toBe('2*(x+1)')
  })

  it('右括号后接内容：(x+1)(x-1) → (x+1)*(x-1)', () => {
    expect(preprocess('(x+1)(x-1)')).toBe('(x+1)*(x-1)')
  })

  it('小写 pi → 内置常量 PI', () => {
    expect(preprocess('pi*x')).toBe('PI*x')
    expect(preprocess('2pi')).toBe('2*PI')
  })

  it('不误伤函数名 / 一元负号：sin(x)、ln(x)、log10(x)、-(x+1)^2 保持原样', () => {
    expect(preprocess('sin(x)')).toBe('sin(x)')
    expect(preprocess('ln(x)')).toBe('ln(x)')
    expect(preprocess('log10(x)')).toBe('log10(x)')
    expect(preprocess('-(x+1)^2')).toBe('-(x+1)^2')
    expect(preprocess('2^x')).toBe('2^x')
  })
})

describe('analyze（显函数）', () => {
  it('f(x) = ... 形式', () => {
    const r = analyze('f(x) = x^2')
    expect(r.kind).toBe('explicit')
    expect(r.evaluate(3)).toBe(9)
  })

  it('y = ... 形式', () => {
    const r = analyze('y = x^2 - 2x - 3')
    expect(r.kind).toBe('explicit')
    expect(r.evaluate(3)).toBe(0)
    expect(r.evaluate(0)).toBe(-3)
  })

  it('显式函数也支持隐式乘法：f(x) = 2x + 1', () => {
    expect(analyze('f(x) = 2x + 1').evaluate(3)).toBe(7)
  })

  it('一元负号按数学惯例绑定幂：y = -(x+1)^2 + 4', () => {
    const r = analyze('y = -(x+1)^2 + 4')
    expect(r.kind).toBe('explicit')
    expect(r.evaluate(-1)).toBe(4)
    expect(r.evaluate(0)).toBe(3)
    expect(r.evaluate(1)).toBe(0)
  })

  it('pi 归一化后可求值：f(x) = pi', () => {
    expect(analyze('f(x) = pi').evaluate(1)).toBeCloseTo(Math.PI, 12)
  })

  it('无等号且只含 x 时按显函数处理：x^2', () => {
    const r = analyze('x^2')
    expect(r.kind).toBe('explicit')
    expect(r.evaluate(4)).toBe(16)
  })
})

describe('analyze（隐函数）', () => {
  it('y^2 - 2x + 4y = 0 识别为隐函数', () => {
    const r = analyze('y^2 - 2x + 4y = 0')
    expect(r.kind).toBe('implicit')
    // F(x,y) = y^2 - 2x + 4y
    expect(r.evaluate(0, 0)).toBe(0)
    expect(r.evaluate(0, -4)).toBe(0)
    expect(r.evaluate(0, 2)).toBe(4 - 0 + 8)
  })

  it('x^2 + y^2 = 1 识别为隐函数', () => {
    const r = analyze('x^2 + y^2 = 1')
    expect(r.kind).toBe('implicit')
    expect(r.evaluate(1, 0)).toBe(0)
    expect(r.evaluate(0, 1)).toBe(0)
  })

  it('无等号且含 y 时按隐函数 F(x,y)=0 处理', () => {
    const r = analyze('x^2 + y^2 - 1')
    expect(r.kind).toBe('implicit')
    expect(r.evaluate(1, 0)).toBe(0)
  })
})

describe('analyze（错误输入必须明确报错，不静默）', () => {
  it('空表达式', () => {
    expect(() => analyze('')).toThrow('表达式为空')
    expect(() => analyze('   ')).toThrow('表达式为空')
  })

  it('等号右侧为空', () => {
    expect(() => analyze('f(x) = ')).toThrow()
  })

  it('语法错误', () => {
    expect(() => analyze('f(x) = x^2 +')).toThrow()
  })

  it('未知变量', () => {
    expect(() => analyze('f(x) = z * x')).toThrow('未知变量')
  })

  it('多个等号', () => {
    expect(() => analyze('y = x = 1')).toThrow('等号')
  })

  it('显函数右侧含 y', () => {
    // y = ... 且右侧含 y → 按隐函数处理，不应是显函数
    expect(analyze('y = x + y').kind).toBe('implicit')
  })
})

describe('CSP 护栏', () => {
  it('源码不得出现 toJSFunction / new Function（那会编译成原生函数，被生产 CSP 拦下）', () => {
    for (const rel of ['src/utils/functionExpr.js', 'src/utils/functionPlot.js']) {
      const src = readFileSync(join(ROOT, rel), 'utf-8')
      expect(src, `${rel} 不应出现 toJSFunction`).not.toContain('toJSFunction')
      expect(src, `${rel} 不应出现 new Function`).not.toContain('new Function')
    }
  })

  it('运行时：禁用全局 Function/eval 后 evaluate() 仍可求值（证明走的是解释器）', () => {
    const RealFunction = globalThis.Function
    const RealEval = globalThis.eval
    try {
      globalThis.Function = function () { throw new Error('Function() blocked by CSP (simulated)') }
      globalThis.eval = function () { throw new Error('eval() blocked by CSP (simulated)') }
      expect(analyze('y = x^2 - 2x - 3').evaluate(3)).toBe(0)
      expect(analyze('y^2 - 2x + 4y = 0').evaluate(0, -4)).toBe(0)
      expect(analyze('f(x) = 2^x').evaluate(5)).toBe(32)
    } finally {
      globalThis.Function = RealFunction
      globalThis.eval = RealEval
    }
  })
})
