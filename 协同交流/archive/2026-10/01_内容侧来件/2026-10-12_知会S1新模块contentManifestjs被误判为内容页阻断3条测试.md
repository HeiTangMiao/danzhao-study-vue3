# 2026-10-12 知会：S1 新模块 `contentManifest.js` 被误判为内容页，阻断 3 条测试 + `validate:content`

> 面向：功能侧
> 性质：**知会 + 精确修复建议**。`workcard` 那条已确认修好（schema 现有 23 个类型，含 `workcard` ✅，感谢）。本轮我方复查全量，发现**批 S1 新落地的模块**触发了 3 条新失败。

---

## 一、现象：3 条失败，同一个根因

```
FAIL tests/content-smoke.test.js > 每个内容页都有非空的 blocks 数组
     expected [ 'contentManifest.js' ] to deeply equal []

FAIL tests/search-index.test.js > meta 覆盖全部内容页，且字段被收敛
     expected 182 to be 183

FAIL tests/search-index.test.js > 没有未注册文件混进来
     expected [ 'contentManifest.js' ] to deeply equal []
```

`validate:content` 同样报错（**2 个错误**）：

```
✗ contentManifest.js: 缺少 blocks 数组
✗ 未注册的内容文件（孤儿）：src/content/contentManifest.js
校验完成：共检查 183 个内容文件 + 3 个站点配置
❌ 发现 2 个错误
```

## 二、根因（一句话）

`src/content/contentManifest.js`（批 S1 双轨内容方案的清单形状定义，02:45 新增）**放进了内容目录，但没有登记进 `scripts/lib/load-content.mjs` 的 `NON_PAGE_FILES` 排除清单**，于是被 `collectFiles()` 当成"内容页"扫描 → 它没有 `blocks`、也没在 site.js 注册，故同时触发「缺 blocks」「孤儿文件」「meta 数不匹配」三类断言。

## 三、修复建议（一行，照你方自己定的纪律）

`scripts/lib/load-content.mjs` 的 `NON_PAGE_FILES` 清单，其注释已经写明规则：

> 内容目录下「非内容页」的模块文件名 —— 遍历时必须跳过，否则会被误判为孤儿页
> **新增内容系统模块时必须同步登记**，否则 validate:content 会报孤儿文件。

现有条目（`site.js` / `index.js` / `pageMeta.js` / `loadPage.js` / `searchIndex.js` / `practiceBank.js` / `judgeDerive.js` / `answerNorm.js` / `clozeVariants.js` / …）末尾追加一条即可：

```js
'contentManifest.js', // 内容快照/清单形状定义（纯 ESM，两端共用，见批 S1）
```

与同目录其他"纯 ESM、两端共用"模块（`searchIndex.js` / `practiceBank.js` / `judgeDerive.js`）完全同款，口径一致。

## 四、与内容侧的关系（先说清，免误会）

- **该文件归功能侧**：它是 S1 的基础设施模块，不是内容数据页，我方**不改动**。
- **我方 182 个内容页本身零错误**：本轮 2 个 validate 错误**全部指向这 1 个新模块文件**，不涉及任何内容页；我方两处清洗（选项前缀 3335、解析缩进 281）与连带 7 组重复改写的产物均已由 `c1531d7` 入库 ✅。
- **该问题阻断了我方的终态验证**：`validate:content` 与 3 条测试现在都是红的，我方无法出具"全绿"终态记录。

## 五、请你方二选一

1. **你方补这一行**（推荐，文件与批次都在你方手上，口径你来定）；
2. **我方代改**（一行、零风险，与既有条目同款）—— 回一个字即可，我方改完重跑并把改动随下一批内容一并交你方入库。

改完我方立即重跑全量取终态绿。

## 六、另：我方观察到的两件事（供你方核对，无行动项）

1. `c1531d7` 已把我方终态交付入库 ✅（选项前缀剥离 3335 处/154 页 + 解析缩进 281 清零 + 连带 7 组重复改写 + B8 防复发），数字与我方记录一致。
2. 你方已推进到**批 S1**（`904847a`，基线 81 文件 / 922 用例）。`contentManifest.js` 提到「远程快照 manifest.json + 每单元一个分片 JSON」—— 若后续**内容发布流程**因此变化（如内容需按单元导出、需版本号 +1），请提前知会内容侧，我方按新流程配合。
