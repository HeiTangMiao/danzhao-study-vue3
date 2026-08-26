# 迁移开发文档

> 浙江单招学习应用 —— 从原生 JS PWA 迁移到 Vue3 + Tauri 2.0

---

## 项目概况

| 项目 | 说明 |
|------|------|
| 原架构 | 纯原生 JS + 92 个手写 HTML + PWA Service Worker |
| 新架构 | Vue 3 + Vite 6 + Pinia 3 + Vue Router 4 + Tauri 2.0 |
| 目标 | 数据驱动渲染、低代码内容编辑、跨平台打包 |

## 快速开始

```bash
cd vue3-refactor
npm install          # 安装依赖
npm run dev          # 启动开发服务器（默认 5173）
npm run build        # 生产构建
npm run validate:content  # 校验内容数据合法性
```

## 项目结构

```
vue3-refactor/
├── schema/                     # JSON Schema 定义
│   ├── content-schema.json     # 内容页面结构
│   └── site-schema.json        # 站点配置结构
├── src/
│   ├── types/                  # TypeScript 类型声明（.d.ts）
│   │   ├── content.d.ts        # 内容 Schema 类型
│   │   ├── site.d.ts           # 站点配置类型（含 Subject 联合类型）
│   │   ├── store.d.ts          # Store 类型（Progress / GameEngine / StudyDB）
│   │   └── composable.d.ts     # Composable 类型（7 个组合式函数）
│   ├── content/                # 内容数据（Schema 实例，多学科）
│   │   ├── index.js            # 多学科内容索引（SUBJECTS / getSubjectConfig）
│   │   ├── site.js             # 数学站点配置（12 单元）
│   │   ├── math/               # 数学内容（12 单元）
│   │   │   └── 01-集合与逻辑/   # 各单元文件夹
│   │   ├── chinese/            # 语文内容（6 单元）
│   │   │   ├── site.js         # 语文站点配置
│   │   │   └── 01-语言文字运用/ # 各单元文件夹
│   │   └── computer/           # 计算机内容（5 单元）
│   │       ├── site.js         # 计算机站点配置
│   │       └── 01-职业素养/     # 各单元文件夹
│   ├── components/             # Vue 组件
│   │   ├── BlockRenderer.vue   # 区块分发器
│   │   ├── FormulaEditor.vue   # 公式可视化编辑器（含模板面板）
│   │   ├── MathJaxRender.vue   # 公式渲染（KaTeX 引擎）
│   │   ├── JsxGraphBoard.vue   # 几何画板
│   │   └── blocks/             # 区块渲染组件（9 个）
│   ├── composables/            # 组合式函数（7 个）
│   ├── stores/                 # Pinia 状态管理（3 个，多学科隔离）
│   ├── views/                  # 页面视图
│   │   ├── HomeView.vue        # 首页（学科选择 + 阶段分组）
│   │   ├── UnitView.vue        # 内容页（多学科动态加载）
│   │   ├── DashboardView.vue   # 学习仪表盘（含学科进度）
│   │   └── editor/EditorView.vue # 低代码编辑器（多学科）
│   ├── router/index.js         # 路由配置（/study/:subject/:unitNum/:fileIndex?）
│   ├── App.vue                 # 根组件
│   └── main.js                 # 入口
├── scripts/validate-content.mjs # Schema 校验脚本
├── src-tauri/                  # Tauri 配置
├── docs/COMPONENTS.md          # 组件文档
└── vite.config.js              # Vite 配置
```

## 架构设计

### 数据驱动渲染

内容以 JSON Schema 数据文件形式存储，渲染组件根据 `block.type` 动态分发：

```
内容数据(.js) → BlockRenderer → 各类型区块组件 → 渲染输出
```

新增内容类型只需：
1. 在 `content-schema.json` 添加类型定义
2. 创建 `blocks/XxxBlock.vue` 渲染组件
3. 在 `BlockRenderer.vue` 注册映射

### TypeScript 类型定义

项目使用 `.js` 源文件 + `.d.ts` 声明文件的方式获得 IDE 类型提示，无需全量迁移到 TypeScript：

| 文件 | 覆盖范围 |
|------|----------|
| `src/types/content.d.ts` | 内容 Schema 类型（区块、页面结构） |
| `src/types/site.d.ts` | 站点配置类型（含 `Subject = 'math' \| 'chinese' \| 'computer'` 联合类型） |
| `src/types/store.d.ts` | Store 类型：`ProgressStore`（含多学科 API）、`GameEngine`（含 `DashboardData`、`Achievement` 等）、`StudyDB`（含 `NoteRecord`、`ErrorRecord` 等） |
| `src/types/composable.d.ts` | Composable 类型：`useNotes`、`useBookmarks`、`useTheme`、`usePomodoro`、`useSpacedReview`（另含 `useKatex` / `useMermaid` 模块级函数） |

### 状态管理

| Store | 职责 | 持久化 |
|-------|------|--------|
| progress | 学习进度（按学科隔离的页面完成标记） | localStorage |
| studyDb | IndexedDB 数据层（7 仓库 CRUD） | IndexedDB |
| gameEngine | XP / 等级 / 连击 / 成就 / 学科进度 | IndexedDB（经 studyDb） |

### IndexedDB 数据仓库

| 仓库名 | keyPath | 说明 |
|--------|---------|------|
| study_log | id (auto) | 学习日志 |
| daily_stats | date | 每日统计 |
| achievements | id | 成就解锁 |
| page_progress | key | 页面进度 |
| error_book | id (auto) | 错题本（含 SM-2 字段） |
| notes | pageKey | 笔记 |
| bookmarks | pageKey | 书签 |

数据库结构与旧版完全一致，旧 PWA 数据可直接读取。

## 多学科架构

### 概述

应用从单学科（数学）扩展为多学科（数学 + 语文）架构，所有模块均支持按学科动态加载内容、隔离进度和统计。

### 学科内容结构

| 学科 | key | 路径 | 单元数 | 页面数 | 站点配置 |
|------|-----|------|--------|--------|----------|
| 数学 | `math` | `src/content/math/` | 11 | 55 | `src/content/site.js` |
| 语文 | `chinese` | `src/content/chinese/` | 5 | 26 | `src/content/chinese/site.js` |

### 内容索引（src/content/index.js）

统一管理多学科配置，供路由、首页、内容页消费：

```js
import { SUBJECTS, SUBJECT_LIST, getSubjectConfig } from '@/content/index'

SUBJECTS['math']           // 获取数学配置
SUBJECT_LIST                // [{ key: 'math', ... }, { key: 'chinese', ... }]
getSubjectConfig('chinese') // 按学科 key 获取配置（未知学科回退到数学）
```

### 路由

多学科路由模式，旧路由自动重定向兼容：

```
/study/:subject/:unitNum/:fileIndex?   # 主路由（如 /study/math/01/0）
/unit/:unitNum/:fileIndex?             # 旧路由 → 重定向到 /study/math/...
```

### 各模块多学科改动

| 模块 | 改动说明 |
|------|----------|
| HomeView | 学科选择卡片（数学/语文），按阶段分组展示单元，localStorage 记忆选中学科 |
| UnitView | 通过 `route.params.subject` 动态加载 `@/content/${subject}/${folder}/${name}.js`，进度按学科隔离 |
| DashboardView | 新增学科进度区块，展示各学科完成百分比、已访问页面数和 XP |
| EditorView | 新增学科选择器和单元选择器，动态导入按 `editorSubject` 变量切换，导出时 page ID 包含正确学科 |
| progress store | 进度结构从 `completed[unitNum][fileIndex]` 改为 `completed[subject][unitNum][fileIndex]`，新增 `subjectTotalCompleted()` / `setBatchComplete()` / `resetSubject()` / `resetAll()` |
| gameEngine store | `_getUnitFileCount()` / `_getSubjectTotalFiles()` 通过 `getSubjectConfig()` 动态获取文件数；`getDashboardData()` 按学科汇总进度；新增 `all_math` / `all_chinese` / `dual_study` 成就 |

## 新增内容流程

### 方式一：手动创建数据文件

1. 在 `src/content/math/单元文件夹/` 或 `src/content/chinese/单元文件夹/` 下新建 `.js` 文件
2. 按 content-schema 格式编写内容（文件需 `export default { subject, unitNum, blocks: [...] }`）
3. 在对应学科的站点配置（`src/content/site.js` 或 `src/content/chinese/site.js`）的 `files` 数组中注册
4. 运行 `npm run validate:content` 校验

### 方式二：使用低代码编辑器

1. 启动应用，访问 `/editor` 路由
2. 顶部选择学科（数学/语文）和单元
3. 左栏选择页面 → 中栏编辑区块
4. 公式区块自动加载 FormulaEditor 可视化编辑器（含公式模板面板）
5. 点击"导出"下载 `.js` 数据文件
6. 将文件放入对应学科目录

## Tauri 打包

### 桌面端

```bash
npm run tauri:build        # 构建桌面安装包
npm run tauri:dev          # Tauri 开发模式
```

### Android

```bash
npm run tauri:android:build  # 构建 APK
```

前置条件：
- Android SDK + NDK 已安装
- Rust Android 目标已添加：`rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
- `src-tauri/gen/android/` 目录已初始化
- 签名配置：`keystore.properties` 指向签名文件

## 迁移完成状态

| 模块 | 状态 | 说明 |
|------|------|------|
| 内容 Schema 化 | ✅ 完成 | content-schema + site-schema |
| Vue3 工程骨架 | ✅ 完成 | Vite + Pinia + Router + Tauri |
| 多学科架构 | ✅ 完成 | 数学 + 语文 + 计算机三学科，统一索引与路由 |
| 数学内容迁移 | ✅ 完成 | 12 单元全部迁移 + 校验通过 |
| 语文内容迁移 | ✅ 完成 | 6 单元全部迁移 + 校验通过 |
| 计算机内容迁移 | ✅ 完成 | 5 单元全部迁移 + 校验通过 |
| 可视化组件 | ✅ 完成 | JSXGraph / Mermaid / KaTeX |
| 逻辑层迁移 | ✅ 完成 | studyDb + gameEngine + 7 composables |
| 仪表盘 | ✅ 完成 | 等级 / 热力图 / 成就墙 / 学科进度 |
| 低代码编辑器 | ✅ 完成 | 三栏布局 + 公式可视化编辑 + 模板面板 |
| 公式编辑器增强 | ✅ 完成 | 16 个常用公式模板快捷插入 |
| 类型定义 | ✅ 完成 | content.d.ts + site.d.ts + store.d.ts + composable.d.ts |
| 组件文档 | ✅ 完成 | docs/COMPONENTS.md |
| TypeScript 全量迁移 | 待办 | 当前使用 .d.ts 声明文件 |

## 技术选型说明

- **Vue 3 Composition API**：逻辑复用性强，composable 模式清晰
- **Pinia**：轻量级状态管理，TypeScript 友好，支持持久化插件
- **Vite 6**：极速 HMR，原生 ESM，构建优化好
- **Tauri 2.0**：Rust 后端，安装包小，内存占用低，跨平台
- **IndexedDB**：浏览器原生数据库，容量大，支持复杂查询
- **SM-2 算法**：成熟的间隔复习算法，Anki 同款