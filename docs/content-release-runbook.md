# 内容发布与前进式回滚 SOP（Runbook）

> **适用**：任何改动 `src/content/**` 并要让**已缓存旧版的客户端**看到新内容的发布。
> **不适用**：仅改前端代码（那是普通 Web/Tauri 发布，走 `.github/workflows/ci.yml` 即可）。
>
> **为什么需要这份 SOP**：2026-10-15 真实事故——线上 v1 快照不含新内容 + `CONTENT_VERSION` 漏 bump
> → 客户端版本闸门（`src/utils/contentClient.js` 的 `isNewer`）在单元级哈希比对**之前**返回 `not-newer`
> → 已缓存客户端**永久拉不到新内容，且不报错、不崩溃**。
> 这不是「拉得慢」，是**静默失效**；靠人记住纪律是不可靠的，故把流程写成**可执行、可断言**的单一文档。
>
> 相关文档：`docs/proposals/batch-s4-tasks.md`（设计依据）、`docs/远程内容链路验证清单.md`（历史验证记录）。

---

## 0. 一页速览

```
改内容 → CONTENT_VERSION +1 → 重建（build:content-remote + build:search）→ 产物自检
      → 备份线上 manifest → 部署（先分片、后清单）→ 部署后四项探测 → 完成
```

**顺序不可调换**。回滚同样走这条路，只是「内容」换成旧的好内容（见 §6）。

---

## 1. 第 1 段 · Bump（改内容 → 版本号 +1）

1. 改 `src/content/**`（若涉及新的 schema 字段，先走 H5 白名单流程改 `schema/content-schema.json` 等五处）。
2. **`src/content/contentManifest.js` 的 `CONTENT_VERSION` 手动 +1**（当前基线见该文件常量）。
3. 自查：`CONTENT_VERSION` 是**手填的单调号**，与 release tag / `package.json` version **完全解耦**——
   不要因为「没发新版」就不 +1，也不要因为「发了新版」就自动 +1。判据只有一条：
   **`src/content/**` 有改动且要发布 → 必 +1**。

> ⚠️ **回滚也走本段**：从备份 / `git` 恢复旧好内容之后，**同样必须 +1**（回滚 = 发一版**号更大**的旧内容）。

---

## 2. 第 2 段 · 重建（构建 + 产物自检）

4. 重建产物：
   ```bash
   npm run build:content-remote   # 产出 public/content-remote/manifest.json + 每单元分片
   npm run build:search           # 题库/搜索索引同代次（避免「看得到新内容、搜不到」）
   ```
   （或直接 `npm run build` —— 其 `prebuild` 已串起 `build:index` 与 `build:content-remote`。）
5. **核对产物四项**（用 Node/脚本数，不要靠肉眼看目录）：
   - `contentVersion`（应等于刚 bump 的值）
   - `contentHash`
   - 单元数
   - 页数（`manifest.units[].count` 合计）
6. **产物不变量自检**：
   ```bash
   npm run check:content-remote
   ```
   它断言：清单 `schemaVersion` / `contentVersion` 为有限数字且不低于源码常量 / `units` 键数与分片数一致 /
   `sitePatch` 恒空（B1）/ S5+ 预留键存在且为 `null`，并逐个确认清单声明的分片**真在盘上**。
   **失败即停**：不要「先发上去再说」。

> 📌 构建脚本内部已内嵌 CI 同款逐块校验器（`createBlockValidator`）：**内容非法则不产出任何分片**。
> 所以本段失败通常意味着「内容本身不过关」→ 跑 `npm run validate:content` 定位到具体文件与区块。

---

## 3. 第 3 段 · 部署（备份 + 零停机顺序）

7. **先备份线上现状**（回滚要用，也用于「确认是向前的一版」）：
   ```bash
   TS=$(date +%Y%m%d-%H%M%S)
   curl -s https://520305.top/content-remote/manifest.json > /tmp/danzhao-backup-$TS-manifest.json
   ```
   记录备份路径与线上 `contentVersion`。
8. **rsync 顺序：先分片、后清单**。
   ```bash
   # ① 先传全部分片（增量；不带 --delete）
   rsync -avz --exclude manifest.json ./dist/content-remote/ <user>@<host>:/var/www/danzhao-study/content-remote/
   # ② 最后单独切清单
   rsync -avz ./dist/content-remote/manifest.json <user>@<host>:/var/www/danzhao-study/content-remote/manifest.json
   ```
   - **为什么先分片后清单**：`manifest.json` 是客户端的入口指针。最后切它，才能保证**任何时刻**
     线上清单指向的分片都已就位（否则会有一个「清单已更新、分片还没到」的 404 窗口）。
   - **为什么不带 `--delete`**：单元下线时旧分片残留无害（客户端只按清单指向拉取），
     而 `--delete` 会在「新清单已上线、仍有旧客户端在飞」的窗口里删掉它们正在请求的文件。
9. Web 端还要确保 `dist/` 里 `content-remote/` 与 `practice-bank/` 一起上线。
   → 这已由 `.github/workflows/ci.yml` 的 `deploy` job 自动完成（S4-4a 闭环修复）。

---

## 4. 第 4 段 · 验证（部署后四项探测）

10. **类型正确**（不是 SPA 兜底）：
    ```bash
    curl -sI https://520305.top/content-remote/manifest.json | head -5
    ```
    要求 **`HTTP 200` + `Content-Type: application/json`**。若是 `text/html` → 落进了 SPA fallback
    → **文件其实不存在**（这条最容易骗人：HTTP 200 但不代表文件在）。
11. **版本向前**：线上 `contentVersion` **等于**本地刚构建的值，且 **大于** 备份值（§3 第 7 步）。
    ```bash
    curl -s https://520305.top/content-remote/manifest.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const m=JSON.parse(s);console.log('online contentVersion =',m.contentVersion,'units =',Object.keys(m.units).length,'pages =',Object.values(m.units).reduce((a,u)=>a+u.count,0))})"
    ```
12. **域名侧实测 1 页**：打开一个本次改动涉及的页面，确认新内容可见（不是只看清单）。
13. **已缓存客户端行为**：清空请求日志 → 刷新页面 → `manifest.json` 恰好请求 **1 次**
    （翻页不重拉；若反复拉说明闸门或缓存逻辑被改坏）。

---

## 5. 反事故条款（不可协商）

> **严禁降 `CONTENT_VERSION`**（客户端闸门是「严格大于」，降号 = 所有已缓存客户端永久收不到）。
> **严禁同号覆盖发布**（同号 + 不同内容 = 客户端 `not-newer` 直接返回，**永久不可见**；2026-10-15 事故根因）。
> **严禁**跳过第 1 段的 bump、或先部署后 bump。
> **必须**：先 bump → 再构建 → 再部署 → 再验证（四段顺序不可调换）。

**事故定义**：客户端仍显示旧内容，且**没有任何报错**（无 console 报错、无接口失败、页面不崩）。

---

## 6. 回滚（= 发一版号更大的旧内容）

「前进式回滚」：**不回退版本号，而是把旧内容当作一版新内容发出去**。

1. 恢复旧内容：从 `/tmp/danzhao-backup-<ts>-*` 或 `git` 取回那份**好**的内容文件。
2. **`CONTENT_VERSION` 在当前值上 +1**（不是恢复到旧值）。
3. 走 §2 重建 + §3 部署 + §4 验证。
4. 验证时第 11 项的「大于备份值」依然成立（回滚也是向前的一版）。

> 为什么不做「版本回退」：客户端的闸门只认「严格大于」。降号后**所有**已升级的客户端都收不到回滚内容，
> 等于把事故从一台设备扩散到全站。

---

## 7. 排查指引（症状 → 先查什么）

| 症状 | 第一件要查的事 |
|---|---|
| 内容改了，客户端没变（无报错） | **`CONTENT_VERSION` 有没有 +1**（漏 bump 是本类事故的头号原因） |
| 清单 200 但页面没变 | `curl -sI` 看 `Content-Type`：`text/html` = SPA 兜底 = 文件不存在 |
| 单个单元内容陈旧、其它正常 | 该单元分片是否发布；客户端 `content_meta.pendingUnits` 是否有它（连续失败 5 次后已停止重试） |
| 自动部署后线上没变 | CI `deploy` job 的 rsync 是否还包含 `dist/content-remote/`（不要删那几行；有 `tests/content-remote-ci-wiring.test.js` 守着） |
| 全站回到内置内容 | 清单形态是否合法（`npm run check:content-remote`）；`schemaVersion` 不符会让客户端**整份不消费** |

---

## 8. 自动化边界（谁做什么）

| 环节 | 自动化 |
|---|---|
| 内容逐块校验（不合法不产出） | ✅ 构建脚本内嵌（`createBlockValidator`） |
| 清单不变量自检 | ✅ `npm run check:content-remote`（CI 具名步骤「内容快照自检」） |
| 发布 `content-remote/` 与 `practice-bank/` | ✅ CI `deploy` job rsync（先分片后清单） |
| 部署后探测线上 manifest | ✅ CI「部署后验证」步骤（缺文件/类型不对即失败） |
| **是否该 bump 版本号** | ❌ **人工判断**（`CONTENT_VERSION` 是手填号，无法自动推断「这是一次内容改动」） |
| **「与线上版本对比」预检**（本地 ≤ 线上则拒发） | ❌ 不进 CI（CI 里 curl 生产域名脆弱且需网络）→ 人工按 §3 第 7 步 + §4 第 11 步做 |

---

> 本文件为功能实现侧的技术流程文档，不构成对考试成绩或录取结果的承诺；考试内容、结构与分值以浙江省教育考试院当年发布为准。
