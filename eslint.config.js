/**
 * ESLint 扁平配置（Flat Config，ESLint 10）
 * 规则集：@eslint/js recommended + eslint-plugin-vue recommended + Prettier 兼容
 */
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    // 忽略构建产物与生成目录
    ignores: ['dist/**', 'node_modules/**', 'src-tauri/**', 'public/**', 'coverage/**']
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  // Prettier 兼容：关闭与 Prettier 冲突的格式规则
  prettier,
  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      // 未使用变量：允许下划线前缀（如事件回调占位参数）
      // caughtErrors: 'none' 允许 catch(e) 中未使用 e（常见于仅记录日志）
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      // 生产环境允许 console（Tauri 调试需要）
      'no-console': 'off',
      // v-html 用于内容渲染（KaTeX 公式 + HTML 转义），属安全用法
      'vue/no-v-html': 'off',
      // Vue 3 允许 camelCase 的 props/事件（:modelValue / @update:modelValue 为标准写法）
      'vue/attribute-hyphenation': 'off',
      'vue/v-on-event-hyphenation': 'off'
    }
  },
  {
    // 内容数据文件：包含大量 LaTeX 定界符（\\( \\) 等），转义是必要的，关闭误报规则
    files: ['src/content/**/*.js'],
    rules: {
      'no-useless-escape': 'off'
    }
  }
]
