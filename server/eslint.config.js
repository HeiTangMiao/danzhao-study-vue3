import js from '@eslint/js'
import globals from 'globals'

/**
 * 后端 ESLint 配置（flat config）
 *
 * 背景：server/ 是独立于前端的工作区（有自己的 package.json，非 npm workspace），
 *       此前完全没有被 lint 覆盖——根目录的 lint 脚本只跑 `src tests scripts`。
 *       这里单独配一份面向 Node ESM 服务的规则。
 *
 * 规则取舍：只启用 @eslint/js 的 recommended 这类「客观错误」级别规则
 *          （未定义变量、不可达代码、错误的正则等），不引入风格类规则，
 *          避免为了 lint 而大改业务代码。
 */
export default [
  {
    ignores: ['node_modules/**', 'data/**', 'coverage/**']
  },
  js.configs.recommended,
  {
    // 注意用 {js,mjs}：server/scripts/ 下是 .mjs（如 make-admin.mjs），
    // 只写 **/*.js 会漏掉它们，导致 process/console 报 no-undef
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      // 后端大量使用 `process.exit()`，禁掉 no-console 之外的噪音规则；
      // 允许 console 输出（服务日志是有意行为）
      'no-console': 'off',
      // Node 中常见的未使用参数（如 (req, reply) 只用其一），改为只警告非首个参数
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    // 测试文件允许更宽松的写法
    files: ['test/**/*.js'],
    rules: {
      'no-unused-vars': 'warn'
    }
  }
]
