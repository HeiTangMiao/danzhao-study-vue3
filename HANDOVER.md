# 项目交接文档

> 面向即将接手 `danzhao-study-vue3` 的团队。读完本文 + `CLAUDE.md` 即可上手。
> 最后更新：2026-10-19（交接整理）

---

## 1. 这个项目是什么

**浙江单招单考学习打卡** —— 面向浙江单招考生（对口升学）的内容驱动型学习应用，覆盖 **数学 / 语文 / 计算机** 三科。

**一个仓库，三种形态：**

| 形态 | 路径 | 说明 |
|---|---|---|
| 网页 | 根目录 | Vue 3 + Vite，部署在 `/var/www/danzhao-study`，Nginx 反代 |
| 桌面端 | `src-tauri/` | Tauri 2，产出 macOS / Linux / Windows 包 |
| Android APK | `src-tauri/` | Tauri Android，产出 APK |
| 后端 | `server/` | Fastify + JWT 的账号与跨设备同步服务（**可选**：不登录也能用） |

**当前版本**：v0.3.1（tag `v0.3.1`）
**仓库地址**：`ssh://github-danzhao/HeiTangMiao/danzhao-study-vue3.git`

### 核心设计：内容是数据，不是模板

**新增内容页不需要写 Vue 组件**。页面是纯数据文件（`export default { blocks: [...] }`），由 schema 驱动的 `BlockRenderer` 渲染成 23 种区块。

- 内容量：183 个内容文件、2363 道题目
- 内容目录：`src/content/{math,chinese,computer}/<单元>/NN-<名称>.js`
- 注册入口：`src/content/site.js`（数学）/ `chinese/site.js` / `computer/site.js`

---

## 2. 环境搭建

### 前端（根目录）

```bash
npm ci
npm run dev              # 开发服务器 5173，/api 代理到 127.0.0.1:3000
```

### 后端（server/，可选）

```bash
cd server
cp .env.example .env     # 必须改 JWT_SECRET
npm ci
npm run dev              # 未设 DATABASE_URL 时用内嵌 PGlite
```

> 生产环境用真 PostgreSQL（127.0.0.1:5432），`DATABASE_URL` 在 `server/.env`。
> ⚠️ `server/` 是独立工程，自带 `package.json`，**根目录的 lint 不包含它**。

### 常用命令

```bash
npm test                 # Vitest，114 文件 1427 用例，约 5 分钟
npx vitest run tests/xxx.test.js           # 单文件
npm run test:coverage    # 带覆盖率
npm run lint             # ESLint，--max-warnings 0（CI 硬关卡）
npm run validate:content # 内容校验（改完内容必跑）
npm run check:dup        # 题库重复检测（含 --selftest）
npm run check:single     # 单选/判断口径检测（含 --selftest）
npm run check:fill       # 填空可判性检测
```

⚠️ 已知环境坑：
- **vitest 必须用 Node v22**（v24 下 SIGKILL）
- `npm run build` 在某些环境会被 safe-delete 守卫拦（清 dist 超阈值），可改用 `npx vite build`
- `grep` 在本仓库多次漏命中，关键校验请用 Grep 工具或 Python

---

## 3. 上手必读的红线

以下每一条都有**实证过的事故**，违反会造成难以排查的故障。完整版见 `CLAUDE.md`。

### 🔴 等级一：会造成线上事故

| 红线 | 后果 |
|---|---|
| **`CONTENT_VERSION` 必须手动 +1**，顺序「改内容 → +1 → 构建 → 部署」 | 漏 bump 时版本闸门在哈希比对之前，客户端**永久收不到更新且不报错** |
| **部署顺序：产物先行、清单最后**（manifest.json 最后上传） | 先上清单会开出「新清单已到、指向的分片还没到」的窗口 → 客户端 404 |
| **CI 检出必须 `fetch-depth: 0`** | 守卫测试用 `git show/diff` 对照基线，浅克隆会让旧提交不可解析 → 测试挂 → 整条自动部署链跳过 |
| **`site.js` 的 `files[]` 只许末尾追加** | 顺序就是 `fileIndex`，直接决定 URL 与历史进度语义，重排会让老用户的进度错位 |
| **网页端 rsync 绝不带 `--delete`** | index.html 无 Cache-Control，旧入口请求已删的 hash 资产 = 白屏 |
| **RSS/API 地址三处同步**：`.env.tauri` 的 `VITE_API_BASE`、`tauri.conf.json` 的 `csp.connect-src`、后端 `ALLOWED_ORIGIN` | 漏改表现各异（打到错地址 / CSP 拦截 / CORS 错误），排查先确认这三处 |

### 🟡 等级二：动之前先确认

| 规则 | 说明 |
|---|---|
| **动被校验的字段前，先查有没有守卫测试在守它** | 有守卫 = **设计边界**，要走决策；无守卫 = 可能是漏洞。例：quiz 块不含 `solve` 题型是批 F 的有意设计（"去并集"），由 3 个测试钉住 |
| **五处一致**：schema / `validateBlock.js` / `types/content.d.ts` / `registry.js` / `blockTypes.js` | 只改 schema 不补手写校验 = 形同虚设（本仓无 JSON-Schema 引擎，真关卡是手写 `validateBlock.js`） |
| **`answerNorm.js` 见 `→` 或 `_{3,}` 直接 `return []` 是有意守卫** | 防"值+解析"复合答案把解析里数字当候选 → 误判对。填空判不出来时改内容标注，**绝不许放宽这行** |
| **删改用软删墓碑（`deleted: true`）** | 物理删行会让删除无法传播到其他设备 |
| **同步主键一律用 UUID / 语义主键** | 自增 id 跨设备会 LWW 互相覆盖 |

---

## 4. 日常流程

### 改内容

1. 在 `src/content/<学科>/<单元>/` 下改/建页面文件
2. 如需新页，先在对应 `site.js` 的 `files[]` **末尾追加**
3. `npm run validate:content` 必须通过
4. 如影响题库（增删改题目），还需：
   - `npm run build:index`（重建搜索 + 题库产物）
   - `npm run check:dup` / `check:single` / `check:fill`
5. ⚠️ **改了内容要发布，必须先给 `CONTENT_VERSION` +1**

### 发版

```bash
# 1. 确认 CONTENT_VERSION 已 +1（改了内容的话）
# 2. 本地门禁
npm run validate:content && npm run lint && npm test && npm run check:dup && npm run check:single
# 3. 打 tag 触发 release.yml
git tag v0.3.2 && git push origin v0.3.2
```

`release.yml` 会先跑 `gate` job（与 CI 同口径的 9 项门禁），通过后 3 个桌面平台 + Android 并行构建。详见 `docs/content-release-runbook.md`。

⚠️ **匿名 API 看不到 draft release** —— 查不到不等于没生成。

### 部署

由 CI 自动完成（`ci.yml` 的 `deploy` / `deploy-backend`）。手工部署纪律见 `docs/` 与本文红线表。

---

## 5. 已知技术债与遗留问题

| 项 | 状态 | 说明 |
|---|---|---|
| **7 道填空自动判分不生效** | 刻意不修 | 5 道交换机命令序列 + 2 道开放式推导。修法已试两条路都不通（改 `solve` 撞设计边界已回滚；移到 example 块会让学员失去输入框＝体验倒退）。已登记进 `check:fill` 的 `KNOWN` 清单，**新题仍会被拦** |
| **`build.target` 残余** | 部分修复 | 业务主路径已降级到 es2019；mermaid 特定图型 chunk 还有 8 处 `?.`，GeoGebra 静态资源有大量（第三方内容，无法转译）。**真机验证不可省** |
| **`studyDb.js` 是 god module** | 拆分中 | 1067 行。已拆出 `stores/db/notes.js` + `bookmarks.js` 两域（委托式，**不减行数**）。剩余 8 个域未拆 |
| **文档归档遗留** | 已清理 | docs 主浏览面 39→13 份，93 份归入 `docs/archive/2026-10/`（零删除） |
| **后端无限流** | 未修 | `server/src/auth.js` 的 register/login/refresh 无 rate limit（服务已上线，建议补） |
| **历史 5.8MB zip 在.git 里** | 未清 | `release/` 的 v0.1.1 便携版 zip 已移除，但历史记录仍在。需 `filter-repo`/BFG 重写历史才能清除（会改所有 commit hash，需全员重新 clone） |
| **历史文档路径** | 不要移动 | 5 条硬引用红线，见 `CLAUDE.md` 末尾 |

---

## 6. 文档地图

| 文档 | 用途 |
|---|---|
| **`CLAUDE.md`** | ⭐ 最详尽的开发指南（架构、约定、CSP、同步）。**上手先读它** |
| `README.md` | 项目简介与快速开始 |
| `MIGRATION-README.md` | 迁移历史（理解命名与意图） |
| `docs/system_design.md` | 系统设计 |
| `docs/content-authoring-guide.md` | 内容编写指南 |
| `docs/content-release-runbook.md` | 发版操作手册 |
| `docs/远程内容链路验证清单.md` | 远程链路验证 |
| `docs/project-assessment-2026-10-17.md` | 项目评估报告（12 条风险排序） |
| `docs/archive/2026-10/` | 归档区（batch 记录、提案、审计） |
| `协同交流/` | ⚠️ **不在 git 仓库内**（工作区根不是仓库），改动拿不到 git 历史 |

> ⚠️ 组件事实**一律以源码为准**。旧清单 `docs/COMPONENTS.md` 已归档且过时，不要读。

---

## 7. 交接检查清单

接手方请逐项确认：

- [ ] `npm ci` + `npm run dev` 能跑起来
- [ ] `npm test` 全绿（114 文件 / 1427 用例，约 5 分钟）
- [ ] `npm run validate:content` + `lint` + `check:dup` + `check:single` + `check:fill` 全绿
- [ ] 能打 tag 触发一次 `release.yml`（**`gate` job 尚未在真实 CI 跑过**，建议首次发版时盯一下）
- [ ] 拿到服务器 `/var/www/danzhao-study` 的部署权限与 rsync 目标
- [ ] 拿到 `server/.env`（含 `JWT_SECRET`、`DATABASE_URL`、`ALLOWED_ORIGIN`）
- [ ] 拿到 GitHub 仓库与 Release 权限
- [ ] 拿到 Tauri Android 签名（`ANDROID_KEYSTORE_BASE64` 等 secrets）
- [ ] 在**真实 Android 8 设备**上验证过 WebView 不白屏（build.target 修复未经真机验证）
