# 2026-10-12 知会：全量测试有 1 条失败 —— `blockTypes.js` 与 `content-schema.json` 不同步（多出 `workcard`）

> 面向：功能侧
> 性质：**知会，非内容侧求助**。我方终态验证时发现，属你方代码/配置内部不一致，疑由 `bb4b1d4`（schema 口径收敛）或相邻提交引入。

---

## 一、现象

我方跑全量 `vitest`（终态 = 两处清洗全部落盘后），结果 **1 failed / 859 passed（860）**：

```
FAIL  tests/block-registry.test.js > 区块类型清单一致性 > blockTypes.js 与 content-schema.json 完全一致

- Expected        (= schema 的 definitions.block.properties.type.enum)
+ Received        (= BLOCK_TYPES)
+   "workcard",
```

即：**`src/components/blocks/blockTypes.js` 的 `BLOCK_TYPES` 里有 `workcard`，而 `schema/content-schema.json` 的类型枚举里没有。**

## 二、为什么判定与我方内容改动无关（两条证据）

1. **该测试不读任何内容数据**：`tests/block-registry.test.js` 只读 `blockTypes.js`、`schema/content-schema.json`、`src/types/content.d.ts`、`src/assets/css/blocks.css`、`src/views/UnitView.vue` —— **不遍历 `src/content/**`**。我方本轮改动的是 154 页（选项前缀剥离）+ 73 页（solution 缩进清洗），全在 `src/content/` 下，逻辑上不可能影响这条断言。
2. **全库内容 0 处用到 `workcard`**：我方扫描 `src/content/**/*.js`，`workcard` 命中 **0**。故该类型当前是"注册表里有、内容里没用"的状态，缺 schema 分支不会让我方内容报错（我方 `validate:content` 也确实全绿）。

## 三、可能的引入点（供你方定位）

你方近期提交：

| commit | 说明 |
|---|---|
| `bb4b1d4` | `refactor(validate): schema 口径 5 处收敛（Fc4：formula 兼容期 / solve 去并集 / table·columns 补强 / diagram 补字段）` |
| `b81394e` | 断点口径更正 |
| `89d2e60` | `feat(guide): 志愿填报页骨架 + 最小外链工具（Fc6）` |

`workcard` 看起来是**新增类型**（曾用名/新引入）。按 `block-registry.test.js` 头注释的纪律，新增类型要**同时**改 6 处（schema 枚举 / schema 字段分支 / `validateBlock` / `content.d.ts` / `blockTypes.js` / 渲染组件绑定），任何一处漏改本测试即失败。从报错看，**schema 的 `type.enum` 这一处漏了**（`allOf` 分支是否也漏，你方顺手一并核）。

## 四、我方终态（除这一条外全绿）

| 项 | 结果 |
|---|---|
| `validate:content` | ✅ 182 个内容文件 + 3 站点配置 |
| `build:practice` | ✅ 2357 题 / 可判分 1482 / 派生 515 / 可规整 153 |
| `build:search` | ✅ 182 条 meta，无截断告警；分片 1593 KB |
| `check-duplicates` | ✅ **L1/L2 0 组、L3 0 组** |
| `check-single-choice` | ✅ **A 类 0 处**；`--selftest` 22 项全 ✓；**新增 B8 防复发规则实跑 0 处** |
| `npm run lint` | ✅ 0 warning |
| 全量 `vitest` | ⚠️ **859 passed / 860**，唯一失败即本函所述（你方内部不一致） |

**两处清洗均已清零**：选项字母前缀 **3335 → 残留 1（真实内容 `H.264`，受规则保护）**；解析字段缩进 **281 → 0**。

## 五、请你方处置

1. 补齐 schema（`definitions.block.properties.type.enum` 加 `workcard`，以及 `allOf` 字段分支 + `content.d.ts`），或反之从 `blockTypes.js` 移除 ——  whichever 符合 Fc4 的口径；
2. 修好后我方重跑一次全量取绿，再发终态记录。

（我方不自行改 `schema/` 与 `src/components/blocks/blockTypes.js`，按分工归你方。）
