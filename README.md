# 浙江单招学习打卡（danzhao-study-vue3）

> 面向浙江单招单考考生的学习应用，覆盖数学与语文两大科目。基于 Vue 3 + Vite + Tauri 2 构建，采用 Schema 驱动的数据渲染架构，支持桌面端、移动端与浏览器多端运行。

[![CI](https://github.com/HeiTangMiao/danzhao-study-vue3/actions/workflows/ci.yml/badge.svg)](https://github.com/HeiTangMiao/danzhao-study-vue3/actions/workflows/ci.yml)
[![Release](https://github.com/HeiTangMiao/danzhao-study-vue3/actions/workflows/release.yml/badge.svg)](https://github.com/HeiTangMiao/danzhao-study-vue3/actions/workflows/release.yml)

---

## ✨ 功能特性

### 学习内容

- **双学科体系**：数学（12 单元）+ 语文（6 单元），内容按单元、页面、区块三级组织
- **Schema 驱动渲染**：内容以数据文件形式存储，14 种区块类型（思维导图、知识点、公式、表格、例题、练习题、易错专项、考试技巧、模拟卷等）由渲染器动态分发
- **公式渲染**：KaTeX 渲染 LaTeX 公式，支持 `==高亮==` 重点标记
- **可视化组件**：JSXGraph 几何画板、Mermaid 图表（思维导图/流程图/甘特图等）
- **易错专项与冲刺**：每个单元配备高频易错点对比（常见错误 vs 正确思路）与冲刺拔高题
- **真题模拟卷**：限时 120 分钟、满分 150 分全真模拟，逐题计分、自动判卷

### 交互体验

- **可点击作答**：选择题点击选项即时判对错，自动展开解析
- **即时反馈**：答对获得 XP 奖励与连击加成，页面弹出「+N XP」提示
- **目录导航**：每页提供折叠式目录，点击平滑跳转；顶部阅读进度条实时显示阅读位置
- **例题折叠**：解答默认折叠，先思考后看解，强化主动学习

### 学习激励（游戏化）

- **经验值与等级**：30 级段位体系（学徒 → 书童 → 秀才 → 举人 → 贡士 → 进士 → 探花 → 榜眼 → 状元）
- **成就系统**：14 项成就（连续学习、单元通关、满分测验、等级达成等）
- **每日打卡与连击**：连续学习天数统计，答题连击额外加成 XP
- **错题本**：答错自动收录，支持筛选、重练与删除，内置 SM-2 间隔复习
- **学习仪表盘**：等级进度、学习热力图、成就墙、学科进度一览

### 数据与工具

- **本地存储**：IndexedDB 数据层（学习日志、进度、错题、笔记、书签），数据完全离线可用
- **数据导出/导入**：一键备份与迁移全部学习数据
- **低代码内容编辑器**：内置 `/editor` 页面，可视化编辑内容区块，公式模板快捷插入，一键导出数据文件
- **番茄钟**：内置专注计时器，辅助高效学习

---

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3（Composition API）+ Vite 6 |
| 状态管理 | Pinia 3（含持久化插件） |
| 路由 | Vue Router 4（hash 模式，兼容本地文件协议） |
| 桌面端 | Tauri 2（Rust 后端） |
| 公式渲染 | KaTeX |
| 图表 | Mermaid + JSXGraph |
| 本地存储 | IndexedDB + localStorage |
| 数据校验 | JSON Schema + 自定义校验脚本 |
| 测试 | Vitest |

---

## 🚀 快速开始

### 环境要求

- Node.js 22+
- Rust（仅 Tauri 桌面端需要）
- Tauri 2 平台依赖（[官方文档](https://v2.tauri.app/start/prerequisites/)）

### 安装与开发

```bash
cd vue3-refactor
npm install          # 安装依赖
npm run dev          # 启动开发服务器（默认 5173）
```

### 常用命令

```bash
npm run validate:content  # 校验内容数据合法性（Schema 校验）
npm run lint              # ESLint 代码检查
npm test                  # 单元测试
npm run build             # 前端生产构建
npm run tauri:dev         # Tauri 桌面开发模式
npm run tauri:build       # 构建桌面安装包
```

---

## 📁 项目结构

```
vue3-refactor/
├── schema/                     # JSON Schema 定义
│   ├── content-schema.json     # 内容页面结构（14 种区块）
│   └── site-schema.json        # 站点配置结构
├── src/
│   ├── content/                # 内容数据（Schema 实例，多学科）
│   │   ├── index.js            # 多学科内容索引
│   │   ├── site.js             # 数学站点配置
│   │   ├── math/               # 数学内容（12 单元）
│   │   └── chinese/            # 语文内容（6 单元）
│   ├── components/             # Vue 组件
│   │   ├── BlockRenderer.vue   # 区块分发器
│   │   ├── MathJaxRender.vue   # 公式渲染
│   │   ├── JsxGraphBoard.vue   # 几何画板
│   │   └── blocks/             # 14 个区块渲染组件
│   ├── composables/            # 组合式函数（笔记/书签/主题/番茄钟/间隔复习等）
│   ├── stores/                 # Pinia 状态管理（progress/studyDb/gameEngine）
│   ├── views/                  # 页面视图（首页/内容页/仪表盘/错题本/编辑器）
│   ├── router/index.js         # 路由配置
│   └── types/                  # TypeScript 类型声明（.d.ts）
├── scripts/validate-content.mjs # Schema 校验脚本
├── src-tauri/                  # Tauri 配置与 Rust 后端
├── .github/workflows/          # CI 与 Release 工作流
└── MIGRATION-README.md         # 迁移开发文档
```

---

## 📝 内容创作

内容以数据文件形式存储在 `src/content/` 下，遵循 `schema/content-schema.json` 定义：

1. 在对应学科的单元文件夹下新建 `.js` 数据文件
2. 按 Schema 编写区块（知识点、公式、例题、练习题、易错专项、模拟卷等）
3. 在站点配置（`src/content/site.js` 或 `src/content/chinese/site.js`）的 `files` 数组中注册
4. 运行 `npm run validate:content` 校验数据合法性

也可以使用内置低代码编辑器（`/editor` 路由）可视化创作并导出数据文件。

---

## 📦 发布与构建

### GitHub Actions 自动发布

项目内置 Release 工作流（`.github/workflows/release.yml`），推送 `v*` 格式的 tag 即可自动触发：

```bash
git tag v0.1.0
git push origin v0.1.0
```

工作流会在 Windows / macOS / Linux 三平台构建安装包，并自动创建 GitHub Release（草稿），审阅后即可发布。

### 本地构建

```bash
npm run tauri:build   # 桌面安装包
npm run tauri:android:build  # Android APK（需配置 Android SDK/NDK）
```

---

## 📄 许可证

本项目为个人学习项目，内容版权归原作者所有。
