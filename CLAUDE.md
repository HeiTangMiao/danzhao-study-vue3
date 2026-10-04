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
npm run lint               # 对 src+tests+scripts 执行 ESLint，--max-warnings 0（CI 会卡这一项）
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

> 注意：`server/` 是**独立工程**（自带 `package.json`、不共用根目录的 ESLint 配置，也**没有自己的 ESLint 配置与依赖**）。
> 因此根目录的 `npm run lint` **不包含** `server/`，CI 的 server job 也只跑 `npm test`。
> 已登记待办：若后端要纳入 lint，需先在 `server/` 内单独引入 ESLint 配置与依赖，不要直接把它塞进根 lint 命令（会配置冲突）。

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

这条规则在**三处**各自钉死，改任何一处都要同步另外两处：`src/content/pageMeta.js` 的 `PAGE_META_KEYS`（常量清单）、`scripts/validate-content.mjs` 的 `residue` 检查（CI 关卡，命中即 `errorCount += residue.length`）、`schema/content-schema.json` 顶层 `required`（**只有 `["blocks"]`**——那 6 个元信息键保留在 `properties` 里但全部标了 `deprecated: true`，仅供编辑器识别遗留字段，**绝不是必填**）。
另注意：校验器**不跑通用 JSON-Schema 引擎**，走的是 `src/utils/validateBlock.js` 的自定义规则（schema 只被用来派生类型白名单 / 难度 / 题型枚举，以及给 `/editor` 推导表单），所以改了 schema 不等于改了校验口径——语义规则要改 `validateBlock.js`。

- Block 结构由 `schema/content-schema.json` 约束（22 种类型：mindmap / objectives / knowledge / formula / table / warning / tip / example / quiz / diagram / errorfocus / strategy / exam / desmos / columns / group / steps / summary / compare / vocab / code / cloze）。该 schema 是**类型白名单的唯一真相源**，validator 的白名单从它派生，`tests/block-registry.test.js` 负责钉死它与渲染注册表 `registry.js`、`.d.ts` 三者一致。
  新增类型 = schema 加 allOf 分支（+ 子对象 definition）+ 新建组件 + `registry.js` / `blockTypes.js` 各加一行 + 同步 `.d.ts`；编辑器表单与校验白名单会自动跟随，不要再手写字段表。
- `UnitView.vue` 把路由参数解析为 学科/单元/fileIndex，再动态导入内容文件，因此**每个内容文件都是独立的懒加载 chunk**（139 个页面）。内容文件需自包含；每个页面文件都单独打包发布。
- **`site.js` 的 `files[]` 数组顺序就是 `fileIndex`**，直接决定 URL 与历史进度语义——**绝不可重排**，只能追加。
- 每个页面在 `site.js` 中有一组中文 `files` 名称；首页、侧边栏、目录都由这些站点配置派生（经 `src/content/index.js` → `SUBJECTS` / `getSubjectConfig`）。
- 加载链路统一走 `src/content/loadPage.js`（浏览器）与 `scripts/lib/load-content.mjs`（Node）；两者共用 `pageMeta.js` 的推导规则，不要在任何地方另写一份。
- 全文搜索索引由 `scripts/build-search-index.mjs` 生成，**分两级**：`public/search-meta.json`（标题级，常驻）+ `public/search-body/{学科}.json`（正文分片，按需加载），形状定义在 `src/content/searchIndex.js`（两端共用，不要另写一份）。`npm run build` 会自动执行；新增内容后请手动跑一次（`node scripts/build-search-index.mjs`）以保持开发环境搜索新鲜。

## 渲染与重型依赖

`BlockRenderer.vue` 按 block 的 `type` 分发到 `src/components/blocks/*.vue`（映射表在 `src/components/blocks/registry.js`，不要另建一份）。重型库**故意**采用懒加载，必须保持这种方式（这里的打包体量纪律很重要——主 chunk 曾从约 1MB 精简到几十 KB，当前实测约 47KB）：

- KaTeX——公式（`FormulaCard` 等），通过 `useKatex` 组合式函数。**523 KB 引擎已移出内容页关键路径**：`warmKatex()` 幂等异步加载（路由守卫 / 空闲回调 / `MathJaxRender.onMounted` 三处预热），`renderMath` 保持同步、引擎未就绪时返回纯文本兜底，组件靠 `engineVersion` 在就绪后重渲染；渲染结果另有 512 KB FIFO memo（`clearMathCache()` 可清）。**不要**把 `import katex` 或 `katex.min.css` 改回静态 import。
- Mermaid——思维导图/流程图，异步加载（`useMermaid`）。
- JSXGraph——`GeometryBlock`/`JsxGraphBoard`，约 1MB，仅动态导入。
- GeoGebra——自托管离线资源放在 `public/vendor` 下（不走外部 CDN），用于 `GeoGebraPlayground.vue`。⚠️ **已知技术债（暂不动）：该目录约 48 MB 且直接进 git，是仓库体积的主要来源。** 它是可选功能（几何演练场），后续应移出仓库改为按需下载。

`vite.config.js` 的 `manualChunks` 会拆分 vendor chunk，并设置 `chunkSizeWarningLimit: 1000`；不要把大库强行塞进主包。

## 数据层与 store

- 单一 IndexedDB 数据库 **`study_game_db`（v6）**，由 `src/stores/studyDb.js`（一个提供 CRUD actions 的 Pinia store）打开并封装。Object store：`study_log`、`daily_stats`、`page_progress`、`error_book`、`notes`、`bookmarks`（`user_progress` 见下条）。
- **Schema 演进规则：** 新增/重命名 store 时，要升 `DB_VERSION` 并按 `oldVersion` 添加对应的 `onupgradeneeded` 分支——`DB_NAME` 保持不变以兼容旧数据（历史升级分支保留，供老安装包升级用）。已知版本：v5 删除了遗留的 `achievements` store；**v6** 去掉了 `error_book` / `study_log` 的自增主键（改由业务层生成 UUID，避免跨设备撞键）并引入软删墓碑 `deleted`。
- **`user_progress` 已退役**：v4 分支里那个 store 仍会被创建（兼容老库），但代码已不再读写它——完成状态改由 `page_progress` 推导，导入/导出也不再包含它。不要再用它做新的进度功能。
- 功能类组合式函数（`useNotes`、`useBookmarks`、`useSpacedReview`、`usePomodoro`、`useTheme` 等）都是薄封装，内部调用 `studyDb` 的 actions。
- `src/stores/progress.js` 是**只读缓存**：它维护 `学科→单元→fileIndex` 的完成度快照，唯一数据源是 `studyDb` 的 `page_progress`（完成语义 = 访问过，测验/模拟卷页还需已交卷）。写入侧是 `markPageVisited` / `recordTest`，进度变化后调 `refresh()` 重建快照；它不再持久化到 `user_progress`。
- 游戏化（XP / 成就 / 连续天数 / 热力图 / 打卡）已在 **v0.2.0 中刻意移除**。残留的提到 XP/打卡 的注释是过时的——不要复活该功能或那些字段，把游戏化概念一律视为已删除。
- `src/types/*.d.ts` **仅为文档**——从不做类型检查（没有 `vue-tsc` 脚本；tsconfig 排除了普通 `.js`，代码是 JS 不是 TS）。不要把它们当作强制契约。

### 已知的设计张力（不要再增加）

- **进度模型已收敛为一套：** 唯一事实来源是 `page_progress`（每次访问页面自动写入 `visited`，测验页记 `testScore`）。旧的 `user_progress.completed`（手动勾选）已随 v6 退役。不要再引入第二套追踪器。
- **同步主键：** v6 起 `error_book` / `study_log` 的主键由业务层生成 UUID，**不再**用本地自增数字（自增 id 跨设备不防冲突，两台设备都从 1 开始会 LWW 相互覆盖）。新增需要同步的数据时，一律用 UUID / 语义主键（notes 和 bookmarks 按 `pageKey` 做键，是安全的）。
- **删除会传播（v6 起）：** 删除是**软删**——置 `deleted: true` 墓碑而非物理删行，`src/sync/engine.js` 会把 `deleted:true` 一并推送到服务端，服务端按 `updated_at` 做 LWW 裁决后再下发到其他设备。因此读取侧一律要 `.filter(r => !r.deleted)`；**不要**把删除改回物理删行，那会让删除无法到达其他设备。

## 认证与同步架构

- **除 `/login` 外所有路由都需要登录**（`src/router/index.js` 守卫）；`/admin` 还额外要求 `role === 'admin'`。切换完成状态 / 访问记录等操作仅在登录状态下发生。
- Token（`access` + `refresh`）通过 `auth` Pinia store 持久化到 localStorage。`sync/api.js` 会附加 Bearer，并在 401 时自动刷新一次。
- **API 地址统一从 `src/sync/apiBase.js` 取**（读 `VITE_API_BASE`，缺省 `/api`）——`sync/api.js` 与 `stores/auth.js` 都已改用它。**新增任何请求都不要自己写死 `/api` 相对路径。**
  - 三种环境的行为：dev 走 vite proxy、Web 生产走 nginx 同源反代（两者都用相对路径 `/api`）；**Tauri 桌面端没有转发层**，相对路径会解析成 `tauri://localhost/api` 而必然失败，因此桌面构建走 `npm run build:tauri`，由 `.env.tauri` 注入绝对地址。
  - ⚠️ 改后端地址时**三处必须同步**：`.env.tauri` 的 `VITE_API_BASE`、`tauri.conf.json` 的 `csp.connect-src`、后端 `ALLOWED_ORIGIN`。漏改的表现各不相同——分别是「请求打到错误地址」「CSP violation 被 WebView 拦下」「CORS 跨域错误」，排查时先确认这三处。
  - **后端 CORS 需要放行 Tauri 的三种可能 origin**（平台不同 origin 不同，漏配则客户端被 CORS 拒绝）：`tauri://localhost`（macOS/Linux/iOS）、`http://tauri.localhost`（Windows/Android）、`https://tauri.localhost`（Win/Android 启用 `useHttpsScheme` 后）。三种都建议配 —— `http://tauri.localhost` 不是 secure context，Tauri 正在推动切 https，只配前者未来会失效。
- 后端路由：`/api/auth/*`（注册/登录/刷新/me）、`/api/sync`（一次 push+pull 调用，基于 `sync_items` 的 LWW 冲突解决）、`/api/admin/*`。密码用 Argon2id 哈希。设置 `DATABASE_URL` 时用 PostgreSQL，否则用内嵌 PGlite 文件。
- **同步引擎原则：IndexedDB 是唯一事实来源，网络只是通道。** `src/sync/engine.js` 收集本地所有带 `updatedAt` 的行并推送，再按游标拉取变更并应用（墓碑，或按服务端时间戳覆盖）。它**只**在 `App.vue` 中被接线（手动按钮、挂载时、5 分钟间隔）——不在各个 store 中调用。
- 后端配置由环境变量驱动：`JWT_SECRET`、`ALLOWED_ORIGIN`、`DATABASE_URL`（见 `server/.env.example`）。生产环境必须设置 `JWT_SECRET`；永远不要提交 `server/.env`。开发用兜底密钥刻意是不安全的——本地开发之外不要依赖它。
- **跨域白名单不含硬编码域名**：`server/src/index.js` 只在 `ALLOWED_ORIGIN` 未设置时回退到「仅本地开发地址」。要放开线上域名，改环境变量，**不要**把域名写回代码。
- **桌面端 CSP 已开启**（`src-tauri/tauri.conf.json` 的 `app.security.csp`；`tauri dev` 走同文件里的 `devCsp`）。`connect-src` 里的 `ipc: http://ipc.localhost` 是 `invoke` 的通道，**不能删**；桌面端访问外部后端域名必须同步写进 `connect-src`（当前已放行线上后端域名，与 `.env.tauri` 的 `VITE_API_BASE` 保持一致）。
  - 已放行：`style-src 'self' 'unsafe-inline'`（KaTeX 的行内 style、Mermaid 的内联 `<style>`、JSXGraph 的 SVG 属性都必须）、`img-src 'self' data: blob:`、`font-src 'self' data:`。Tauri 编译期会自动把打包内联脚本的 hash / 外部脚本 nonce 追加进 CSP，所以 `script-src 'self'` 不需要 `'unsafe-inline'`。
  - ⚠️ **未经实机验证的风险（已登记）**：`desmos` 区块（`GeoGebraPlayground.vue`）依赖 GeoGebra 的 GWT 引导脚本，它用 `eval` 且动态注入脚本，在 `script-src 'self'`（无 `'unsafe-eval'`）下**大概率加载不了**。全库只有 1 页用到（`src/content/math/03-函数与基本初等函数/03-二次函数.js`），且组件已有「无法加载 GeoGebra 计算器」降级 UI。**若确认必须保住这一页，把 `script-src` 改成 `'self' 'unsafe-eval'` 即可**（其余指令不变）。改动 CSP 后请务必跑一次 `tauri build` 并开着 WebView 控制台看有没有 violation —— CSP 违规只是 console 警告，不会弹窗。

## 值得了解的约定

- 路由是 **hash 模式**，Vite `base: './'`——这是 Tauri 本地文件协议所必需的。不要改成 history 模式。
- `validate:content` + `lint --max-warnings 0` 是硬性 CI 关卡；提交前请在本地跑一遍。
- 内容/UI 是中文；新增内容 block、站点条目和注释都保持同样风格。
- `docs/COMPONENTS.md` 和 `MIGRATION-README.md` 记录了组件清单与迁移历史——对命名和意图理解很有用。
- `/editor` 路由下有一个低代码编辑器，用于编写内容 block，并可从中导出为数据文件。它的表单是 **schema 驱动**的：形状由 `src/views/editor/schemaForm.js` 从 `content-schema.json` 推导（见 `BlockForm.vue`），校验用与 CI **同一份实现**（`src/utils/validateBlock.js`）。所以**新增区块类型只需要改 schema**——编辑器表单会自动出现，不要再去写字段表。schema 通过 `src/utils/contentSchema.js` 导入，随 `/editor` 懒加载 chunk 走，不进主包。
