# 批 P5 前置验证报告（2026-10-17）

> 结论先行：**P5 的 GitHub 构建路径不是「从零开始」，而是「已被历史验证过、需重新跑一遍确认」**。
> 仓库里 `.github/workflows/release.yml` 一直存在（此前被误读为已删除），其中 `android` job
> 完整覆盖了工具链 → init → 签名 → 出包 → 上传 Release 全链路；GitHub Releases 里已有
> **4 个签名 APK**（v0.1.0 / v0.1.1 / v0.1.2 / v0.3.0）。
> 当前代码未发现会阻断 Android 构建的因素。剩余工作 = 三项收尾 + 真机验证（P5-T3，必须人做）。

---

## 1. GitHub 侧现状（证据：git 历史 + Actions API + Releases API）

### 1.1 现成的 release.yml（`git show HEAD:.github/workflows/release.yml`）

`android` job 的关键步骤（逐条与仓库现状核对过，均可用）：

| 步骤 | 内容 | 现状核对 |
|---|---|---|
| Node | `setup-node@v4` node-version 22 | 与 CI 一致 ✓ |
| Rust | `dtolnay/rust-toolchain@stable` + `targets: aarch64-linux-android,armv7-linux-androideabi,i686-linux-android,x86_64-linux-android` | ✓ 四个 target 一次装齐 |
| Rust 缓存 | `swatinem/rust-cache@v2`（workspaces `./src-tauri -> target`） | ✓ |
| JDK | `setup-java@v4` temurin 17 | 本机无 JDK，但 CI 有 ✓ |
| Android SDK | `android-actions/setup-android@v3`，`packages: platform-tools` | 注释已说明为何不装遗留 `tools` 包 ✓ |
| NDK | `nttld/setup-ndk@v1` ndk-version **r26d** | ✓ |
| SDK 组件 | `sdkmanager "platforms;android-36" "build-tools;36.0.0" "platform-tools"` | ✓ |
| 前端 | `npm ci` → `validate:content` → `npm test` | `npm test` 已改为串行口径，CI 上约 2 分钟，可接受 |
| init | `npm run tauri:android:init` | `package.json:17` 有该脚本 ✓ |
| 签名 | `node scripts/setup-android-signing.mjs` | 脚本健在（见 §3.4）✓ |
| 出包 | `npm run tauri:android:build -- --apk`，`NDK_HOME` 由 setup-ndk 注入 | `package.json:18` 有该脚本 ✓ |
| 上传 | `gh release upload <tag> .../apk/universal/release/*.apk --clobber` | ✓ |

### 1.2 历史运行与产物（Actions API 匿名可读）

- Release workflow 共 5 次运行：`35832783039`（2026-09-23，**success**）、`35829918428`（2026-09-23，failure）、`34350531714`（2026-09-09，success）、`32150802120`（2026-08-18，success）、`32074817713`（2026-08-17，success）。
- Releases：**v0.3.0 / v0.1.2 / v0.1.1 / v0.1.0**，每个都带 `app-universal-release.apk`
  （v0.3.0 = **99.5 MB**，v0.1.x = 54.5 MB）。→ **签名 APK 出过，且已包含内容 bundle**。
- 最后一次成功构建是 **2026-09-23**，早于 S1/S2/S3/S4/S5 全部工作 → 当前 main 需要重新验证一次。

### 1.3 签名 secrets：名字知道，是否还在无法匿名确认

workflow 引用了三个 secret（只看名字、不看值）：

- `ANDROID_KEYSTORE_BASE64`（keystore 的 base64）
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`

⚠️ **`GET /repos/{o}/{r}/actions/secrets` 需要 repo admin 权限**，本机没有 `gh`、没有 token
（`gh: command not found`；`~/.config/gh`、`~/.netrc` 均不存在），因此**无法远程列出 secret**。
两条路可确认：① 你在 GitHub 网页 Settings → Secrets and variables → Actions 里看一眼；
② 直接跑一次构建——`setup-android-signing.mjs` 在 secret 缺失时会**回退生成临时 keystore**
（仍能出可安装包，日志会打印「已生成临时 keystore」），所以构建结果本身就能回答这个问题。

### 1.4 ⚠️ runner 镜像：`ubuntu-22.04` 已进入弃用期

release.yml 两处 `runs-on: ubuntu-22.04`（desktop matrix 的 ubuntu 项 + android job）。
外部事实（2026-10 检索，endoflife.date / actions/runner-images#14254）：

- **弃用开始 2026-09-17**，**完全不可用 2027-04-17**，2027-03-23 起有 24 小时 brownout 窗口。
- 9-23 那次成功构建说明**现在还能跑**，但发布链不该跑在已弃用的镜像上。

**建议**：两处改为 `ubuntu-24.04`（CI 的 quality job 用的 `ubuntu-latest` 即 24.04，已在用、
无兼容问题）。此项属「择机修复」，不阻断本次验证——本次先用现有配置跑通基线，再迁。

---

## 2. 本地工具链现状（本机无法出包）

| 项 | 现状 | 影响 |
|---|---|---|
| JDK | `java -version` → "Unable to locate a Java Runtime" | 无法跑 keytool / Gradle |
| `ANDROID_HOME` | 未设置，`~/Library/Android/sdk` 不存在 | 无 SDK |
| NDK | `~/Library/Android/sdk/ndk` 不存在 | 无法链接 Rust target |
| rustup targets | 仅 `aarch64-apple-darwin` | 无 android target |
| cargo / rustc | 1.99.0（有） | — |

**结论**：本机出不了 Android 包（P5-T1 的「本地工具链」这条路等于没铺）。**GitHub Actions 是唯一现实路径**，
这也与你此前的做法一致（4 个 APK 全是 CI 出的）。

---

## 3. 代码侧就绪度（逐项核对）

### 3.1 CSP —— 远程内容链在 WebView 里通 ✅

`src-tauri/tauri.conf.json:23` 的 `csp` 已显式放行远端：

```
connect-src 'self' ipc: http://ipc.localhost https://520305.top;
```

→ S5 的「三层共用一个版本权威 + 绝对基址 `https://520305.top`」在 Android WebView 下不会被 CSP 拦。
`devCsp` 同样放行。**这是 P5 最容易踩的坑，已经提前铺好了。**

### 3.2 Rust 入口 —— 无需 `#[cfg(desktop)]` 改造 ✅

`src-tauri/src/lib.rs`（20 行）：`#[cfg_attr(mobile, tauri::mobile_entry_point)]` 在位；
唯一的窗口操作在 `#[cfg(debug_assertions)]` 里（release 不编译），无桌面专属 API。
→ P5-T2 第 ⑤ 条「移动端缺失能力用 cfg 隔离」**无需改动**。

### 3.3 capabilities —— Android 可用 ✅

`src-tauri/capabilities/default.json`：`core:default` + `shell:allow-open`，均支持 Android。

### 3.4 签名脚本 —— 健在且幂等 ✅

`scripts/setup-android-signing.mjs`（93 行）：secret 在 → 用正式 keystore；不在 → 生成临时 keystore；
`keystore.properties` 已存在则保留（`9c5919f` 修过「覆盖正式密码」的回归）；
对 `app/build.gradle.kts` 的注入三段都做了幂等判断。

### 3.5 首个 APK 带远程内容层 —— 链路已通 ✅

`tauri android build` 会跑 `beforeBuildCommand` = `npm run build:tauri`
→ npm 自动前置钩子 `prebuild:tauri` = `npm run build:index` → `build:practice && build:search`
→ 产物进 `dist/` → 打进 APK。v0.3.0 的 99.5 MB（vs v0.1.x 的 54.5 MB）正是内容 bundle 的体积证据。
⚠️ 注意桌面链的 `tauri:build` 会先 `clean:content-remote`，Android 链不跑它（Android 不产 content-remote），
所以**不会**把 1740 KB 死文件带进包。

### 3.6 ⚠️ `gen/android` 不入库（与设计文档的建议相反，但工作正常）

`.gitignore:29` 有 `src-tauri/gen/` → `src-tauri/gen/android` 不在版本控制内，CI 每次重新
`tauri:android:init` 生成。`system_design.md` P5-T2 建议「纳入版本控制」。
现状能跑（init 不需要网络、模板来自 CLI 包内），代价是每次发布多花约 1 分钟 init。
**建议维持现状**（入库会让 CLI 升级时产生大量无意义 diff），但在 P5-T2 完成时把这条分歧写进文档。

### 3.7 ⚠️ 缺 `bundle.android` 段（P5-T2 待办）

`tauri.conf.json` 的 `bundle` 只有 `active/targets/icon`，没有 `android` 段
→ `minSdkVersion` 走 Tauri 2 默认值（24）。项目断点与容器查询要求 WebView 105+（Android 9+），
默认 24 低于该底线。**建议显式设 `bundle.android.minSdkVersion = 26`（Android 8.0，覆盖 >95% 设备）
并在文档记明依据**；此项改动会影响所有 Android 构建，需一次构建验证。

---

## 4. 风险与结论

| # | 项 | 级别 | 处置 |
|---|---|---|---|
| R-1 | 签名 secret 是否还在 | 中 | 一次真实构建即可验证（缺则回退临时 keystore，仍出可安装包） |
| R-2 | `ubuntu-22.04` 已弃用（2027-04-17 失效） | 中 | 择机迁 `ubuntu-24.04`；本次先跑基线 |
| R-3 | 当前 main 自 9-23 后未再构建过（S1/S2/S3/S4/S5 全在其后） | **高** | **本次即用测试 tag 触发一次验证** |
| R-4 | `minSdkVersion` 未显式设定 | 低 | P5-T2 收尾时定 |
| R-5 | 真机行为（CSP/远程加载/离线兜底/视觉参数/手势） | 高 | **CI 替代不了，必须人做**（P5-T3 / M5） |

**P5 前置验证结论：可以开工，且比预期省事**——工具链、签名脚本、CSP、内容层纪律全都已在位，
不需要从零搭建。真正的工作量集中在：① 一次真实构建确认 secret 与当前代码；
② 迁 runner 镜像；③ `minSdkVersion` 定档；④ 真机验证。

---

## 5. 本次验证动作记录

### 5.1 第一轮（tag `v0.3.1-precheck` @ `829ffab`）—— 四 job 全挂，暴露一个真 bug

结果：`release`（macos / ubuntu / windows）+ `android` **四个 job 全部失败在「单元测试」步骤**，
耗时 2–4 分钟（远小于正常构建时长 → 是早退，不是构建问题）。

**根因（本地复现确认）**：`release.yml` 的 checkout 用默认 `depth=1` **浅克隆**，
而三个守卫测试要 `git show <baseline>` / `git diff <baseline> HEAD` 对照基线提交
（`tests/loadpage-remote-fallback.test.js:212` 的 `54300fa` 等）→ 基线提交不可解析 → `execSync` 抛错。
本地按同口径 `git clone --depth 1 file://$PWD` 复现，一次命中：

```
fatal: ambiguous argument '54300fa': unknown revision or path not in the working tree.
```

⚠️ 这与 2026-10-15 CI 近 30 次全红是**同一个坑的第二个入口**：当时修的是 `ci.yml` 的 quality job，
`release.yml` 一直漏改。**两个入口必须同口径**——已修：两处 checkout 补 `fetch-depth: 0`，
并在两个 job 的测试前补 `npm run build:index`（否则干净检出下产物级测试 `skipIf` 静默跳过，
等于发布链上从未执行）。

**副产品（好消息）**：四个 job 都在测试步骤就退了，说明工具链安装、SDK/NDK、签名脚本这些
「会不会装」的问题一个都没遇到——它们排在测试之后，还没轮到。

### 5.2 第二轮（同 tag @ `7ef0960`，修 `fetch-depth` 后重跑）

触发方式不变（推测试 tag → `on: push: tags: ['v*']`，产物落**草稿 release**，不公开）。
验证点：① 四个 job 是否 success；② APK 是否上传到草稿 release；③ 签名用的是正式 keystore
还是临时 keystore（回答 R-1）。结果见 §6。

### 5.3 清理方式

验证完删除 tag 与草稿 release：`git push origin :refs/tags/v0.3.1-precheck` + 网页删 release。

---

## 6. 结果（回填）
