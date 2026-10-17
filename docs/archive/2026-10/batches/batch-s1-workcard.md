# 批 S1 派工单：内容快照 / 清单（纯构建期）

> 作者：team-lead（据 `docs/proposals/batch-s1-tasks.md` 架构任务卡 + 本人实测复核）
> 裁定日期：2026-10-12 ｜ 基线 HEAD = `e5e3e57`（工作树干净）
> 目标读者：software-engineer（实施）→ software-qa-engineer（独立验证）
> **完整设计见** `docs/proposals/batch-s1-tasks.md` §1–§7；本单只钉死**裁定结论 + 可执行落点 + 精确接口**。

---

## 0. 裁定结论（team-lead 已拍板，工程师按此实施，不再自行选择）

| # | 事项 | 裁定 | 落地含义（工程师照做） |
|:-:|---|---|---|
| **P-S01** | `public/content-remote/**` 是否入库 | **(a) gitignore** | `.gitignore` 追加 `public/content-remote/`，注释「构建产物，按需生成，不入库」，位置紧随现有 `public/search-body/`（`:18-20`）之后。理由：快照含 182 页正文（LaTeX/mermaid），入库会让每次内容改动产生巨大 JSON diff；与 `search-*` 先例一致。**不改** `public/practice-bank/`（先例不一致已登记为后续可选统一项，非本批范围）。 |
| **P-S02** | `contentVersion` 来源 | **(a) 单调号 + 另存指纹** | `contentManifest.js` 定义 `export const CONTENT_VERSION = 1`（**人工/CI 发布时手动 +1**）；脚本另算 `contentHash`（全页指纹，**不含时间戳**）写入 manifest。理由：前进式回滚需可表达的单调号；指纹用于「内容真变了才换号」的去重/审计。 |
| **P-S03** | 分片粒度 | **(a) 一单元一片** | `public/content-remote/{subject}/{unitNum}.json`。 |
| **P-S04** | `sitePatch` 在 S1 的策略 | **(a) 预留空结构** | manifest 写 `sitePatch: { "units": {}, "fileMetaUpdates": [] }`（键位一次到位），并算 `sitePatchHash`。B1 **不产出**任何 site 变更。 |
| **P-S05** | `build:content-remote` 何时跑 | **(a) 独立手动脚本** | `package.json` 仅加 `"build:content-remote": "node scripts/build-content-remote.mjs"`；**不动** `prebuild` / `build:index`。理由：S1 零运行时影响，普通构建不需要产出远程快照。 |
| **P-S06** | `hash` 规范化口径 | **(b) 规范化序列化** | 脚本内一个 ~15 行递归键序归一函数（**零依赖**，不引第三方），对对象键升序后 stringify；数组保序。 |
| **P-S07** | manifest 是否预留 `search`/`practice` | **(a) 预留键位、不产出** | manifest 顶层写 `"search": null`、`"practice": null`（键位在数据中可见 → S5+ 老客户端可平滑处理）；`contentManifest.js` 定义 `const OPTIONAL_SECTIONS = ['search', 'practice']` 常量并注释「S5+ 产出」。**不产出**空占位分片。 |

---

## 1. 目标（一句话）

**纯构建期**产出「内容快照 + 清单」的形状定义与生成脚本 → `public/content-remote/manifest.json` + 每单元分片 JSON。**零运行时影响**：不接 `loadPage`、不接 IndexedDB、不接 CSP 配置、不加任何前端 `import()`/`eval`。

---

## 2. 落点（6 个文件，精确）

| 动作 | 路径 | 说明 |
|---|---|---|
| **新增** | `src/content/contentManifest.js` | 形状定义（**纯 ESM、零 import**）。内容：`SCHEMA_VERSION`、`CONTENT_VERSION`、`OPTIONAL_SECTIONS`、`SHARD_WARN_BYTES`、`MANIFEST_PATH`、`shardPath(subject, unitNum)`、`unitKeyOf(meta)`、`pageKeyOf(meta)`、`op` 取值常量。风格照 `src/content/searchIndex.js`（63 行）/ `src/content/practiceBank.js`（110 行） |
| **新增** | `scripts/build-content-remote.mjs` | 发布脚本。**导出** `collectSnapshot()`（纯函数，不落盘，供测试）+ 内部 `build()`（落盘）。`process.argv[1]` 守卫（照 `build-search-index.mjs:255`） |
| **改** | `package.json` | scripts 加 `"build:content-remote": "node scripts/build-content-remote.mjs"`；**不纳入** prebuild/build:index（P-S05） |
| **新增** | `tests/content-manifest.test.js` | 形状定义断言（路径/键/常量） |
| **新增** | `tests/build-content-remote.test.js` | `collectSnapshot()` 纯函数断言（见 §6） |
| **改** | `.gitignore` | 追加 `public/content-remote/`（P-S01） |
| **复用（禁止改动/复制）** | `scripts/lib/load-content.mjs`、`src/utils/validateBlock.js`、`schema/content-schema.json`、`src/content/pageMeta.js` | 单一真相源（H7） |

---

## 3. 协议形状（钉死，工程师逐字对齐）

### 分片 `public/content-remote/{subject}/{unitNum}.json`

```jsonc
{
  "schemaVersion": 1,
  "contentVersion": 1,
  "unitKey": "math/01",
  "pages": [
    {
      "subject": "math",
      "unitNum": "01",
      "fileIndex": 0,                 // 数字，坐标身份（不得重排/位移，H2）
      "fileKey": "math/01/01-集合的概念与表示",  // pageFileKeyOf(meta) 产物
      "op": "upsert",                 // B1 恒 upsert；'append' 仅协议预留
      "hash": "sha256:<hex64>",       // 该页规范化 JSON 的 hash
      "blocks": [ /* 与内置完全同构，22 种区块之一，原样搬运不截断 */ ]
    }
  ]
}
```

### 清单 `public/content-remote/manifest.json`

```jsonc
{
  "schemaVersion": 1,
  "contentVersion": 1,
  "contentHash": "sha256:<hex64>",          // 全局内容指纹（不含 generatedAt）
  "generatedAt": "<ISO8601>",
  "sitePatchHash": "sha256:<hex64>",
  "sitePatch": { "units": {}, "fileMetaUpdates": [] },   // B1 空结构（P-S04）
  "units": {
    "math/01": { "hash": "sha256:<hex64>", "updatedAt": "<ISO8601>", "path": "math/01.json", "count": 8, "version": 1 }
  },
  "search": null,      // P-S07 预留键位
  "practice": null     // P-S07 预留键位
}
```

> **路径口径钉死**：`manifest.units[k].path` 用**相对 `content-remote/` 的路径**（如 `"math/01.json"`），不带 `public/`、不带 `content-remote/` 前缀 —— 客户端 fetch 时拼 `基址 + '/content-remote/' + path`。（dual-track §2.2 示例里的 `"content/math/01.json"` 是旧稿笔误，以此处为准。）

### hash 口径（钉死）

| 字段 | 计算口径 |
|---|---|
| `pageHash` | `'sha256:' + sha256hex(canonicalJSON({ subject, unitNum, fileIndex, fileKey, op, blocks }))` —— **不含** `hash` 自身、**不含** `generatedAt` |
| `units[k].hash` | `'sha256:' + sha256hex(canonicalJSON(pages))`（该分片 pages 整体指纹） |
| `contentHash` | `'sha256:' + sha256hex(全部页按 fileKey 升序后 '`fileKey`:`pageHash`' 逐行 join('\n'))` —— **不含** `generatedAt`、**不受分片顺序影响** |
| `sitePatchHash` | `'sha256:' + sha256hex(canonicalJSON(sitePatch))` |

`canonicalJSON` = 递归：对象键升序重排 → `JSON.stringify(x, null, 0)`；数组保序；`undefined` 键剔除。

---

## 4. 复用接口（精确，已实测）

从 `scripts/lib/load-content.mjs`：
- `ROOT` / `CONTENT_DIR` / `SITE_FILES` / `collectFiles(dir)` → **绝对路径数组** / `loadSite(subject)` → **async，返回 site（含 `units`）** / `buildMetaIndex()` → **async，返回 `Map<relPath, meta>`** / `importFresh(file)` → **async** / `relPathOf(file)` → `subject/folder/name.js`

**配对方式（实测）**：
```js
const files = collectFiles(CONTENT_DIR)                 // 182 个
const idx = await buildMetaIndex()                      // Map，size 182
for (const file of files) {
  const meta = idx.get(relPathOf(file))                 // ← 用 relPathOf 配对
  const { blocks } = (await importFresh(file)).default  // ← 内容页 export default { blocks }
  // meta = { id, unitNum, subject, title, subtitle, isTest, unitTitle, folder, name, fileIndex }
}
```
- ⚠️ **meta 里没有 `fileKey`** → 必须 `pageFileKeyOf(meta)`（`src/content/pageMeta.js:63-65`）派生。
- ⚠️ `unitKey` = `` `${meta.subject}/${meta.unitNum}` ``；`meta.unitNum` 是**字符串**（`"01"`），`meta.fileIndex` 是**数字**。

从 `src/utils/validateBlock.js`：`createBlockValidator`（零 import，schema 用参数注入）→ 逐页逐块 `validateBlock(b)`；任一错 → **抛错/返回 `{ errors }`，调用方不落盘任何分片**（照 `scripts/validate-content.mjs:15/24/29` 的取 schema 方式：`readFileSync('schema/content-schema.json')` → `JSON.parse` → 建校验器）。

---

## 5. `contentManifest.js` 硬约束

**纯 ESM、零 import** —— 照 `src/content/searchIndex.js:9-11` 的原话：「本文件刻意不 import 任何模块：`scripts/build-search-index.mjs` 会直接 import 它，一旦引入依赖链就会把浏览器侧代码拖进 Node 构建进程」。`contentManifest.js` 必须同构（未来 S2 浏览器 loader 也要 import 它）。

---

## 6. 测试要求

**`tests/content-manifest.test.js`**：`MANIFEST_PATH`、`shardPath('math','01')`、`unitKeyOf`/`pageKeyOf` 与 `searchIndex`/`practiceBank` 风格一致；`SCHEMA_VERSION`/`CONTENT_VERSION` 存在。

**`tests/build-content-remote.test.js`**（`collectSnapshot()` 纯函数，**不落盘**）：
1. 分片 `pages[]` 结构（`subject`/`unitNum`/`fileIndex`/`fileKey`/`op`/`blocks`）；`op === 'upsert'`
2. `hash` **稳定**（同内容同值，跑两次相等）+ **敏感**（`blocks` 改一字节 → 变号）
3. `contentHash` **不受 `generatedAt` 影响**（注入两个不同 `generatedAt`，`contentHash` 相等）
4. `sitePatch` 为 `{ units:{}, fileMetaUpdates:[] }`（B1 空）+ `sitePatchHash` 稳定
5. **校验失败 → 不产出**（spy 一个非法 block → 返回 errors / 抛错，且无分片）
6. 超限 `console.warn` 点名（注入小 `warnBytes` 触发；**只告警、不截断内容**）
7. `search`/`practice` 键存在且为 `null`（P-S07）

> ⚠️ 测试**不要锚 `generatedAt` 的具体值**——`collectSnapshot()` 应接受可选 `{ contentVersion, generatedAt, warnBytes }` 注入，供测试固定。

---

## 7. 关卡（Node v22；提交前本地必跑）

```sh
export NODE=/Users/iras17514/.workbuddy/binaries/node/versions/22.22.2-6/bin/node
$NODE --version                        # 必须 v22（v24 下 vitest SIGKILL 137）
npm run validate:content               # 内置内容仍合规（S1 不改内容）
npm run lint --max-warnings 0
npx vitest run tests/content-manifest.test.js tests/build-content-remote.test.js --pool=threads --maxWorkers=1
npm run build:content-remote           # 冒烟：产出 public/content-remote/** 且全程校验通过
git status --short public/content-remote   # 应无输出（已 gitignore）
npx vitest run --pool=threads --maxWorkers=1   # 全量回归（批 E/F 纪律）
```

**环境红线（本沙箱实测）**：
- vitest **必须** `--pool=threads --maxWorkers=1`（forks 池坏）。
- Node **必须 v22**（v24 → 137 SIGKILL）。
- 后台命令输出会被工具吞 → `cmd > /tmp/x.log 2>&1; echo EXIT=$? >> /tmp/x.log` 落盘。
- 本环境 `grep` 漏命中 → 关键校验用 **Node/Python** 复核。

---

## 8. 提交与汇报

- 建议 commit 拆分：① `src/content/contentManifest.js` + `.gitignore` ② `scripts/build-content-remote.mjs` + `package.json` ③ 两个测试文件。（或按你判断合并，但**每笔 commit 后跑全量回归**。）
- 汇报必须包含：**commit hash**、**各关卡实测数字**（validate:content / lint / 新测文件用例数 / 全量通过数 / `build:content-remote` 产出文件数）、**任何必要偏离申报**（偏离前先说明，不得静默）。
- 完成后**不要**自行 push（团队纪律：推送由 team-lead 统一执行）。

---

> 本文件为功能实现侧技术规划，不构成对考试成绩或录取结果的承诺；考试内容、结构与分值以浙江省教育考试院当年发布为准。
