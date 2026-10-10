# 浙江单招学习打卡（danzhao-study-vue3）

> 面向浙江单招单考考生的学习应用，覆盖数学、语文与计算机三大科目。基于 Vue 3 + Vite + Tauri 2 构建，采用 Schema 驱动的数据渲染架构，支持桌面端、移动端与浏览器多端运行；学习数据存本地 IndexedDB，并可通过独立的 Fastify 后端在多设备间同步。

[![CI](https://github.com/HeiTangMiao/danzhao-study-vue3/actions/workflows/ci.yml/badge.svg)](https://github.com/HeiTangMiao/danzhao-study-vue3/actions/workflows/ci.yml)
[![Release](https://github.com/HeiTangMiao/danzhao-study-vue3/actions/workflows/release.yml/badge.svg)](https://github.com/HeiTangMiao/danzhao-study-vue3/actions/workflows/release.yml)

---

## ✨ 功能特性

### 学习内容

- **三学科体系**：数学 + 语文 + 计算机，内容按单元、页面、区块三级组织
- **Schema 驱动渲染**：内容以数据文件形式存储，22 种区块类型（思维导图、知识点、公式、表格、例题、练习题、易错专项、考试技巧、模拟卷、多栏/分组容器、编号步骤条、一页速记、双栏对照、术语卡、代码块、挖空默写等）由渲染器动态分发
- **公式渲染**：KaTeX 渲染 LaTeX 公式，支持 `==高亮==` 重点标记
- **可视化组件**：JSXGraph 几何画板、Mermaid 图表（思维导图/流程图/甘特图等）
- **易错专项与冲刺**：每个单元配备高频易错点对比（常见错误 vs 正确思路）与冲刺拔高题
- **真题模拟卷**：限时全真模拟，逐题计分、自动判卷

### 交互体验

- **可点击作答**：选择题点击选项即时判对错，自动展开解析
- **即时反馈**：练习即时判对错并展开解析，页面专注知识点本身（无游戏化奖励）
- **目录导航**：每页提供折叠式目录，点击平滑跳转；顶部阅读进度条实时显示阅读位置
- **例题折叠**：解答默认折叠，先思考后看解，强化主动学习

### 学习工具

- **错题本**：答错自动收录，支持筛选、重练与删除，内置 SM-2 间隔复习
- **间隔复习**：基于遗忘曲线安排错题复习时间（学习记录，无游戏化激励）
- **学习仪表盘**：学科进度、今日学习统计与错题学情分析一览

### 数据与工具

- **本地存储**：IndexedDB 数据层（学习日志、进度、错题、笔记、书签），离线可读写
- **账号与跨设备同步**：注册/登录后，学习数据通过 Fastify 后端在多设备间同步（见「运行与登录」）
- **数据导出/导入**：一键备份与迁移全部学习数据
- **番茄钟**：内置专注计时器，辅助高效学习

---

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3（Composition API）+ Vite 6 |
| 状态管理 | Pinia 3（含持久化插件） |
| 路由 | Vue Router 4（**hash 模式**，兼容 Tauri 本地文件协议；全站强制登录守卫） |
| 桌面端 / 移动端 | Tauri 2（Rust 外壳，Android APK 同源） |
| **认证** | **JWT（access + refresh），自建账号体系** |
| **同步后端** | **Fastify 5 + PostgreSQL / 内嵌 PGlite，独立部署于 `server/`；`/api/sync` 基于 `updated_at` 做 LWW 合并** |
| 公式渲染 | KaTeX（异步懒加载 + 预热，不进关键路径） |
| 图表 | Mermaid（异步懒加载）、JSXGraph（动态导入） |
| 渲染管线 | KaTeX / Mermaid / JSXGraph **全部异步按需加载**，重型依赖不进主 chunk |
| 本地存储 | IndexedDB（`study_game_db`，当前版本 v6）+ localStorage |
| 密码哈希 | Argon2id（后端） |
| 数据校验 | JSON Schema + 自定义校验脚本 |
| 测试 | Vitest（前端）+ node:test（后端） |

---

## 🚀 运行与登录

> ⚠️ **应用首屏会跳转到 `/login`。** `src/router/index.js` 有全局前置守卫：**除 `/login` 外所有路由都要求已登录**，未登录一律重定向到登录页（带 `redirect` 回跳参数）；`/admin` 还额外要求 `role === 'admin'`。
> 因此**必须先启动 `server/` 后端并注册一个账号**，才能进入内容页。纯离线打开前端只会停在登录页。

### 最小启动步骤

**1）后端（`server/`）——先起这一个**

```bash
cd server
npm install
cp .env.example .env     # 首次必须执行：npm run dev 用 --env-file=.env 启动，缺文件会直接报错
npm run dev              # 默认监听 3000
```

- 未设置 `DATABASE_URL` 时自动使用**内嵌 PGlite**（文件库落在 `server/data/`），无需装 PostgreSQL。
- 本地开发同样建议把 `.env` 里的 `JWT_SECRET` 改成一个随机值；`NODE_ENV=production` 下未设置 `JWT_SECRET` 会拒绝启动。

**2）前端（仓库根目录）**

```bash
npm install
npm run dev              # Vite 开发服务器 http://localhost:5173
```

- 开发期 Vite 已配好代理：`/api/*` → `http://127.0.0.1:3000`，前端代码里一律用相对路径 `/api`，无需配域名。
- 打开 http://localhost:5173 → 自动落到 `#/login` → 注册账号后即可进入。

### 常用命令

前端（根目录）：

```bash
npm run validate:content  # 校验内容数据合法性（Schema 校验）
npm run lint              # ESLint 代码检查（--max-warnings 0）
npm test                  # 单元测试（Vitest）
npm run build             # 前端生产构建（会先跑 prebuild 生成搜索索引）
npm run tauri:dev         # Tauri 桌面开发模式
npm run tauri:build       # 构建桌面安装包
```

后端（`server/` 目录下）：

```bash
npm run dev               # node --watch 开发模式
npm test                  # node --test
npm start                 # 生产式启动（node --env-file=.env）
```

### 环境要求

- Node.js 22+
- Rust（仅 Tauri 桌面端需要）
- Tauri 2 平台依赖（[官方文档](https://v2.tauri.app/start/prerequisites/)）

---

## 📁 项目结构

```
danzhao-study-vue3/
├── schema/                     # JSON Schema 定义
│   ├── content-schema.json     # 内容页面结构（22 种区块；顶层仅 blocks 为必填）
│   └── site-schema.json        # 站点配置结构
├── src/
│   ├── content/                # 内容数据（页面文件只允许导出 blocks）
│   │   ├── index.js            # 多学科内容索引（SUBJECTS / getSubjectConfig）
│   │   ├── site.js             # 数学站点配置（元信息唯一真相源）
│   │   ├── pageMeta.js         # 元信息推导（浏览器 / Node 共用）
│   │   ├── loadPage.js         # 浏览器侧加载链路
│   │   ├── searchIndex.js      # 搜索索引形状定义（两端共用）
│   │   ├── math/               # 数学内容
│   │   ├── chinese/            # 语文内容（含自己的 site.js）
│   │   └── computer/           # 计算机内容（含自己的 site.js）
│   ├── components/             # Vue 组件
│   │   ├── BlockRenderer.vue   # 区块分发器
│   │   ├── MathJaxRender.vue   # 公式渲染（KaTeX 引擎）
│   │   ├── JsxGraphBoard.vue   # 几何画板
│   │   └── blocks/             # 区块渲染组件 + registry.js 映射表
│   ├── composables/            # 组合式函数（KaTeX/Mermaid/笔记/书签/主题/番茄钟/间隔复习）
│   ├── stores/                 # Pinia 状态管理（auth / progress / studyDb）
│   ├── sync/                   # 同步层（api.js 请求封装 + engine.js push/pull + LWW）
│   ├── router/index.js         # 路由配置（hash 模式 + 强制登录守卫）
│   ├── utils/                  # 工具（validateBlock / search 等）
│   ├── views/                  # 页面视图（首页/登录/内容页/仪表盘/错题本/管理）
│   └── types/                  # TypeScript 类型声明（.d.ts，仅文档用途）
├── scripts/
│   ├── validate-content.mjs    # Schema 校验脚本（npm run validate:content）
│   ├── build-search-index.mjs  # 生成两级搜索索引
│   ├── migrate-content-*.mjs   # 内容迁移脚本（默认干跑）
│   ├── deploy-backend.sh       # 后端一键部署
│   └── lib/load-content.mjs    # Node 侧内容加载（与浏览器共用推导规则）
├── server/                     # 独立后端工程（Fastify + JWT；自带 package.json）
│   ├── src/                    # app.js / auth.js / sync.js / admin.js / db.js
│   └── test/                   # node --test 用例
├── tests/                      # 前端 Vitest 用例
├── src-tauri/                  # Tauri 配置与 Rust 后端
├── .github/workflows/          # CI 与 Release 工作流
├── docs/                       # 文档地图见 docs/README.md（指南 / 系统设计 / 方案 / 归档）
└── CLAUDE.md / MIGRATION-README.md
```

---

## 📝 内容创作

内容以数据文件形式存储在 `src/content/` 下，遵循 `schema/content-schema.json` 定义：

1. 在对应学科的单元文件夹下新建 `.js` 数据文件，**只导出 `blocks`**（`export default { blocks: [...] }`）
2. 按 Schema 编写区块（知识点、公式、例题、练习题、易错专项、模拟卷等）
3. 在站点配置（`src/content/site.js` / `chinese/site.js` / `computer/site.js`）的 `files` 数组中注册——**页面元信息（id/unitNum/subject/title/subtitle/icon）只写在这里**，写进内容文件是校验硬错误
4. 运行 `npm run validate:content` 校验数据合法性

> 历史文档 `MIGRATION-README.md` 里「内容文件需 `export default { subject, unitNum, blocks }`」的写法**已废弃**，以 `CLAUDE.md` 的内容铁律为准。

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

#### ⚠️ 桌面端必须显式配置后端地址

桌面端打包后前端运行在 `tauri://localhost` 下 —— **既没有 vite proxy，也没有 nginx**。
默认的相对路径 `/api` 会被解析成 `tauri://localhost/api`，该协议下不存在后端，请求必然失败。

因此 `tauri:build` 执行的是 `build:tauri`（即 `vite build --mode tauri`），
它会加载 `.env.tauri` 注入绝对地址。

**改后端地址时，以下三处必须一致，缺一处就会失败：**

| 位置 | 作用 | 缺了会怎样 |
|---|---|---|
| `.env.tauri` 的 `VITE_API_BASE` | 决定前端把请求发往哪里 | 请求打到 `tauri://localhost/api` |
| `src-tauri/tauri.conf.json` 的 `csp.connect-src` | 放行该域名 | **被 WebView 拦下**，控制台报 CSP violation |
| 后端 `server/.env` 的 `ALLOWED_ORIGIN` | 放行桌面端来源 | **被 CORS 拦下**，浏览器报跨域错误 |

后端的放行来源需包含 Tauri 的**三种可能 origin**（客户端平台不同则 origin 不同）：

| origin | 适用平台 |
|---|---|
| `tauri://localhost` | macOS / Linux / **iOS** |
| `http://tauri.localhost` | Windows / **Android** |
| `https://tauri.localhost` | Windows / Android（启用 `useHttpsScheme` 后） |

三种都建议配置：`http://tauri.localhost` 并非 secure context，Tauri 正在推动切换到
`https://tauri.localhost`，只配前者会在未来启用时立刻失效。

`npm run build`（Web 构建）不受以上影响，仍使用相对路径 `/api`，由 nginx 同源反代。

---

## 🔒 安全说明

- 桌面端在 `src-tauri/tauri.conf.json` 的 `app.security.csp` 中启用了 CSP（`devCsp` 为 `tauri dev` 下的宽松版本）。CSP 收紧了 `script-src` / `connect-src`；`connect-src` 保留 `ipc: http://ipc.localhost` 以保证 `invoke` 可用，并放行了桌面端需要访问的后端域名。**改动后端地址时，务必同步这里的 `connect-src`**（详见上文「本地构建」的三处一致性说明）。
- 后端的跨域白名单完全由环境变量 `ALLOWED_ORIGIN` 驱动（逗号分隔），代码中不含任何硬编码域名；未设置时回退到仅本地开发地址。**要让桌面端访问，需把 `tauri://localhost` 加进白名单。**
- 前端后端地址统一由 `src/sync/apiBase.js` 提供（读 `VITE_API_BASE`，缺省 `/api`），
  `api.js` 与 `auth.js` 均从它取地址 —— 新增请求时不要再自己写 `/api`。
- 生产环境必须设置 `JWT_SECRET`；永远不要提交 `server/.env`。

### 已知技术债（暂不处理）

- 桌面端**依赖网络**：当前方案下桌面端指向远程后端，断网时登录与同步不可用。
  若要完全离线，需改为 Tauri sidecar 内嵌本地后端（后端已支持 PGlite 嵌入式数据库，
  具备该方案的可行性前提；主要障碍是 `@node-rs/argon2` 为 Rust native 模块，单文件打包需先替换为纯 JS 实现）。

---

## 📄 许可证

本项目为个人学习项目，内容版权归原作者所有。
