# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 语言要求（最高优先级）

**永远使用中文回复。** 无论用户用什么语言提问，所有回答、说明、计划、总结、提交信息都要用中文书写；代码注释、面向用户的文案同样保持中文。此规则覆盖默认行为，不得例外。

## 项目概览

**浙江单招单考学习打卡**（`danzhao-study-vue3`）——面向浙江单招考生的内容驱动型学习应用，覆盖 数学 / 语文 / 计算机。以 Vue 3 网页 + Tauri 2 桌面端 + Android APK 三种形态发布。内容是数据文件，由 schema 驱动的组件渲染；学习记录存放在 IndexedDB，并可通过一个轻量 Fastify 后端在多设备间同步。

一个仓库里包含三个工作区：

| 路径 | 内容 | 说明 |
|---|---|---|
| 根目录 | 前端应用（Vue 3 + Vite + Pinia + Tauri） | 主包；内容、渲染、store 都在 `src/` 下 |
| `server/` | 可选的账号同步后端（Fastify + JWT，PostgreSQL / PGlite） | 仅在需要登录 + 跨设备同步时才需要 |
| `src-tauri/` | 桌面端 / 移动端打包的 Rust 外壳 | Rust 代码相互独立；前端构建产物输出到 `dist/` |

代码注释、面向用户的文案和提交信息都用中文书写——请保持一致风格。

## 常用命令

前端（根目录）：

```bash
npm run dev                # Vite 开发服务器，端口 5173；/api 代理到 127.0.0.1:3000
npm run build              # 生产构建（会先执行 build-search-index）
npm test                   # 运行 Vitest（node 环境，tests/**/*.test.js）
npx vitest run tests/useKatex.test.js   # 运行单个测试文件
npm run lint               # 对 src+tests 执行 ESLint，--max-warnings 0（CI 会卡这一项）
npm run lint:fix
npm run validate:content   # 内容数据的 JSON-Schema 校验——改完内容必须通过
npm run format             # 对 src/tests 执行 Prettier
ANALYZE=1 npm run build    # 生成 dist/stats.html 打包体积可视化
npm run tauri:dev / tauri:build
```

后端（`server/`），在该目录下执行：

```bash
cp .env.example .env       # 首次使用；然后修改 JWT_SECRET
npm run dev                # node --watch；未设置 DATABASE_URL 时使用 PGlite（文件库位于 server/data/）
npm test                   # node --test（test/sync-core.test.js）
node --env-file=.env src/index.js   # 生产式启动
```

CI（`.github/workflows/ci.yml`）在每次推送到 `main` 时运行：内容校验 → lint → vitest → `vite build`，另外还有 Tauri 的 `cargo check` 和后端测试。CI 通过后有两个额外任务分别部署前端（零停机 rsync）和后端。

## 内容的工作方式（核心模型）

内容页是**数据，不是模板**。新增页面**不需要**写 Vue 组件：

1. 在该学科的 `site.js` 文件数组中注册一条（`src/content/site.js` = 数学，`chinese/site.js`，`computer/site.js`）。单元带 `phase`，测试页标 `isTest: true`，冲刺单元标 `sprint: true`。
2. 在 `src/content/<学科>/<单元>/NN-<名称>.js` 下创建页面模块，`export default { blocks: [...] }`。
3. 运行 `npm run validate:content`——CI 会拒绝非法内容。已知的严格规则：公式行结尾不能是单独的 `\`。

**内容文件风格由 `src/content/serializePage.js` 统一定义**（无引号键、2 空格缩进、对象多行、短数组单行、顶层区块间空行、保留文件头注释）：编辑器「复制 .js / 导出文件」、开发期写回（`scripts/vite-plugin-content-write.mjs`，仅 `apply: 'serve'`）与迁移脚本共用这份定义，**不要再手写第二套序列化**。存量文件若还是引号键风格，跑 `node scripts/migrate-content-style.mjs`（默认干跑，`--write` 才落盘）。风格契约由 `tests/content-style.test.js` 守护（含「内容页不得出现引号键」的全库扫描）。

**元信息只在 site.js 里写一份。** 页面对象**只能**导出 `blocks`——`id / unitNum / subject / title / subtitle / icon` 出现在内容文件中是**校验硬错误**。
原因见 `src/content/pageMeta.js`：这批字段曾在 139 个文件里各手写一份、又在 site.js 各写一份，实测漂移了 19 页（页头与侧边栏显示两个版本）。现在 site.js 是唯一真相源，元信息由 `resolvePageMeta(学科配置, 单元号, fileIndex)` 推导并在加载时注入；`title`/`subtitle` 一律取自 site.js，页面文件里的同名字段即使写了也被忽略。
若你接手的是 1B 之前的旧文件（还带着五元组），运行 `node scripts/migrate-content-meta.mjs --write` 剥离（默认干跑，不加 `--write` 不落盘）。

- Block 结构由 `schema/content-schema.json` 约束（22 种类型：mindmap / objectives / knowledge / formula / table / warning / tip / example / quiz / diagram / errorfocus / strategy / exam / desmos / columns / group / steps / summary / compare / vocab / code / cloze）。该 schema 是**类型白名单的唯一真相源**，validator 的白名单从它派生，`tests/block-registry.test.js` 负责钉死它与渲染注册表 `registry.js`、`.d.ts` 三者一致。
  新增类型 = schema 加 allOf 分支（+ 子对象 definition）+ 新建组件 + `registry.js` / `blockTypes.js` 各加一行 + 同步 `.d.ts`；编辑器表单与校验白名单会自动跟随，不要再手写字段表。
- `UnitView.vue` 把路由参数解析为 学科/单元/fileIndex，再动态导入内容文件，因此**每个内容文件都是独立的懒加载 chunk**（139 个页面）。内容文件需自包含；每个页面文件都单独打包发布。
- **`site.js` 的 `files[]` 数组顺序就是 `fileIndex`**，直接决定 URL 与历史进度语义——**绝不可重排**，只能追加。
- 每个页面在 `site.js` 中有一组中文 `files` 名称；首页、侧边栏、目录都由这些站点配置派生（经 `src/content/index.js` → `SUBJECTS` / `getSubjectConfig`）。
- 加载链路统一走 `src/content/loadPage.js`（浏览器）与 `scripts/lib/load-content.mjs`（Node）；两者共用 `pageMeta.js` 的推导规则，不要在任何地方另写一份。
- 全文搜索索引由 `scripts/build-search-index.mjs` 生成到 `public/search-index.json`。`npm run build` 会自动执行；新增内容后请手动跑一次（`node scripts/build-search-index.mjs`）以保持开发环境搜索新鲜。

## 渲染与重型依赖

`BlockRenderer.vue` 按 block 的 `type` 分发到 `src/components/blocks/*.vue`（映射表在 `src/components/blocks/registry.js`，不要另建一份）。重型库**故意**采用懒加载，必须保持这种方式（这里的打包体量纪律很重要——主 chunk 曾从约 1MB 精简到几十 KB，当前实测约 47KB）：

- KaTeX——公式（`FormulaCard` 等），通过 `useKatex` 组合式函数。**523 KB 引擎已移出内容页关键路径**：`warmKatex()` 幂等异步加载（路由守卫 / 空闲回调 / `MathJaxRender.onMounted` 三处预热），`renderMath` 保持同步、引擎未就绪时返回纯文本兜底，组件靠 `engineVersion` 在就绪后重渲染；渲染结果另有 512 KB FIFO memo（`clearMathCache()` 可清）。**不要**把 `import katex` 或 `katex.min.css` 改回静态 import。
- Mermaid——思维导图/流程图，异步加载（`useMermaid`）。
- JSXGraph——`GeometryBlock`/`JsxGraphBoard`，约 1MB，仅动态导入。
- GeoGebra——自托管离线资源放在 `public/vendor` 下（不走外部 CDN），用于 `GeoGebraPlayground.vue`。

`vite.config.js` 的 `manualChunks` 会拆分 vendor chunk，并设置 `chunkSizeWarningLimit: 1000`；不要把大库强行塞进主包。

## 数据层与 store

- 单一 IndexedDB 数据库 **`study_game_db`（v5）**，由 `src/stores/studyDb.js`（一个提供 CRUD actions 的 Pinia store）打开并封装。Object store：`study_log`、`daily_stats`、`page_progress`、`error_book`、`notes`、`bookmarks`、`user_progress`。
- **Schema 演进规则：** 新增/重命名 store 时，要升 `DB_VERSION` 并按 `oldVersion` 添加对应的 `onupgradeneeded` 分支——`DB_NAME` 保持不变以兼容旧数据（v5 删除了遗留的 `achievements` store；历史升级分支保留，供老安装包升级用）。
- 功能类组合式函数（`useNotes`、`useBookmarks`、`useSpacedReview`、`usePomodoro`、`useTheme` 等）都是薄封装，内部调用 `studyDb` 的 actions。
- `src/stores/progress.js` 维护 `学科→单元→fileIndex` 的完成度映射，并持久化到 `user_progress` store（`'main'` 行）。它还会一次性迁移遗留的 localStorage 进度。
- 游戏化（XP / 成就 / 连续天数 / 热力图 / 打卡）已在 **v0.2.0 中刻意移除**。残留的提到 XP/打卡 的注释是过时的——不要复活该功能或那些字段，把游戏化概念一律视为已删除。
- `src/types/*.d.ts` **仅为文档**——从不做类型检查（没有 `vue-tsc` 脚本；tsconfig 排除了普通 `.js`，代码是 JS 不是 TS）。不要把它们当作强制契约。

### 已知的设计张力（不要再增加）

- **两套进度模型并存：** `page_progress.visited`（每次访问页面自动写入；驱动仪表盘）vs `user_progress.completed`（手动切换；驱动首页/单元 UI）。两者可能不一致，测试页还会被双份记录。不要再引入第三套追踪器；理想情况下在做新的进度功能之前先把这两者收敛。
- **同步主键：** `error_book` / `study_log` 用本地自增数字 `id` 同步，这在**跨设备时不是防冲突的**（两台设备都从 1 开始，LWW 相互覆盖）。新增需要同步的数据时，优先用 UUID / 语义主键（notes 和 bookmarks 已按 `pageKey` 做键，是安全的）。
- **删除不会传播：** 本地删除只是删掉 IndexedDB 行；同步层只会*应用*从服务端拉到的墓碑，从不写入墓碑。不要假设删除会到达其他设备。

## 认证与同步架构

- **除 `/login` 外所有路由都需要登录**（`src/router/index.js` 守卫）；`/admin` 还额外要求 `role === 'admin'`。切换完成状态 / 访问记录等操作仅在登录状态下发生。
- Token（`access` + `refresh`）通过 `auth` Pinia store 持久化到 localStorage。`sync/api.js` 会附加 Bearer，并在 401 时自动刷新一次。
- 后端路由：`/api/auth/*`（注册/登录/刷新/me）、`/api/sync`（一次 push+pull 调用，基于 `sync_items` 的 LWW 冲突解决）、`/api/admin/*`。密码用 Argon2id 哈希。设置 `DATABASE_URL` 时用 PostgreSQL，否则用内嵌 PGlite 文件。
- **同步引擎原则：IndexedDB 是唯一事实来源，网络只是通道。** `src/sync/engine.js` 收集本地所有带 `updatedAt` 的行并推送，再按游标拉取变更并应用（墓碑，或按服务端时间戳覆盖）。它**只**在 `App.vue` 中被接线（手动按钮、挂载时、5 分钟间隔）——不在各个 store 中调用。
- 后端配置由环境变量驱动：`JWT_SECRET`、`ALLOWED_ORIGIN`、`DATABASE_URL`（见 `server/.env.example`）。生产环境必须设置 `JWT_SECRET`；永远不要提交 `server/.env`。开发用兜底密钥刻意是不安全的——本地开发之外不要依赖它。

## 值得了解的约定

- 路由是 **hash 模式**，Vite `base: './'`——这是 Tauri 本地文件协议所必需的。不要改成 history 模式。
- `validate:content` + `lint --max-warnings 0` 是硬性 CI 关卡；提交前请在本地跑一遍。
- 内容/UI 是中文；新增内容 block、站点条目和注释都保持同样风格。
- `docs/COMPONENTS.md` 和 `MIGRATION-README.md` 记录了组件清单与迁移历史——对命名和意图理解很有用。
- `/editor` 路由下有一个低代码编辑器，用于编写内容 block，并可从中导出为数据文件。它的表单是 **schema 驱动**的：形状由 `src/views/editor/schemaForm.js` 从 `content-schema.json` 推导（见 `BlockForm.vue`），校验用与 CI **同一份实现**（`src/utils/validateBlock.js`）。所以**新增区块类型只需要改 schema**——编辑器表单会自动出现，不要再去写字段表。schema 通过 `src/utils/contentSchema.js` 导入，随 `/editor` 懒加载 chunk 走，不进主包。
