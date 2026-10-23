# 后端容器化部署

把 `server/`（Fastify + PostgreSQL/PGlite）打成镜像跑起来。**当前可选形态有两种**，按 `server/.env` 里有没有 `DATABASE_URL` 自动切换，代码不用改：

| 形态 | 条件 | 数据落点 | 适用 |
|---|---|---|---|
| **嵌入式 PGlite**（默认） | `DATABASE_URL` 留空 | 容器内 `/app/data` ← 命名卷 `api-data` | 单机、数据量小、想省掉数据库运维 |
| **外部 PostgreSQL** | 填了 `DATABASE_URL` | 外部库 | 多实例、要独立备份/扩容、已有 Postgres |

> ⚠️ **两种形态不能混**：切换前旧的 PGlite 数据不会自动迁到 Postgres，需要自行导出导入。

---

## 1. 前置

- Docker + Docker Compose v2（`docker compose version` 有输出即可）
- 镜像内 Node 版本固定为 **22**（见 `server/Dockerfile` 的 `FROM node:22-bookworm-slim`）
- 架构默认 x86_64；Apple Silicon / ARM 服务器构建时，`@node-rs/argon2` 会切到 arm64 预编译包，无需构建工具链

## 2. 首次部署

```bash
# 1) 生成环境文件并填密钥（生产缺 JWT_SECRET 会拒绝启动，这是有意的护栏）
cp server/.env.example server/.env
vim server/.env            # 至少改 JWT_SECRET 为强随机值

# 2) 别和现有 systemd 服务抢端口
sudo systemctl stop danzhao-api && sudo systemctl disable danzhao-api

# 3) 构建并后台启动
docker compose build
docker compose up -d

# 4) 验证（应返回 {"ok":true,"time":"..."}）
curl -s http://127.0.0.1:3000/api/health && echo
docker compose ps           # STATUS 应显示 healthy
docker compose logs -f api  # 排错看这里
```

更新部署（代码变更后）：

```bash
git pull && docker compose build && docker compose up -d
```

## 3. 数据与备份

数据卷 `api-data` 对应容器内 `/app/data`。**删卷等于删库**：`docker compose down` 不会删卷，但 `docker compose down -v` 会。

```bash
# 备份：把卷打成 tar 到当前目录
docker run --rm -v danzhao-study_api-data:/data -v "$PWD:/out" busybox \
  tar -czf /out/api-data-$(date +%F).tar.gz -C /data .

# 恢复（先停容器）
docker compose down
docker run --rm -v danzhao-study_api-data:/data -v "$PWD:/out" busybox \
  tar -xzf /out/api-data-2026-10-24.tar.gz -C /data
docker compose up -d
```

## 4. 换成外部 PostgreSQL

只需两步，代码会自动走 `pg` 驱动（`src/db.js` 按 `DATABASE_URL` 是否存在分流）：

```bash
# server/.env
DATABASE_URL=postgres://user:pass@db-host:5432/danzhao
```

库可以是宿主机上的 Postgres、容器外的独立实例，或托管服务。**换完注意**：旧 PGlite 数据不会自动过去，且首次连新库时 `initDB()` 会自动建表并自愈缺失约束（见 `src/db.js` 的 `REQUIRED_CONSTRAINTS`）。

## 5. 环境变量

由 `server/.env`（compose 的 `env_file`）提供，完整说明见 `server/.env.example`。容器相关的几个：

| 变量 | 容器内取值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 健康检查与端口映射都跟着它 |
| `TRUST_PROXY` | `127.0.0.1` | ⚠️ **绝不能是 `true` 或 `*`**——那等于信任 XFF 最左值，可被伪造绕过限流 |
| `NODE_ENV` | `production` | 生产缺 `JWT_SECRET` 会直接 `process.exit(1)` |
| `JWT_SECRET` | 无默认 | 必须自行设置强随机值 |

## 6. 和现有 systemd 部署的关系

现有链路是 CI → SSH → `scripts/deploy-backend.sh` → `npm ci` + `systemctl restart danzhao-api`。容器化**没有改它**，两条路并存由你决定：

- 继续用 systemd：不用动，`docker-compose.yml` 放着即可
- 切到容器：停 systemd 服务后按 §2 操作；若要把 CI 也改成容器部署，需要单独改 `ci.yml` 的 `deploy-backend` job（尚未做）

nginx 反代无需改动：容器仍监听宿主机 `127.0.0.1:3000`，回源地址不变。

## 7. ⚠️ 未验证项（必读）

**本仓库的 Docker 配置是在没有 Docker 环境的工作机上写的，从未真实构建过。** 首次在服务器上执行前，请按下面清单确认一遍：

- [ ] `docker compose config` 能正常解析（语法自检）
- [ ] `docker compose build` 成功，`npm ci` 在 build 阶段拿到 `@node-rs/argon2` 的预编译包
- [ ] `docker compose up -d` 后 `docker compose ps` 显示 `healthy`（若一直 `starting`，看 `logs`）
- [ ] `curl http://127.0.0.1:3000/api/health` 返回 `{"ok":true,...}`
- [ ] 重启容器后数据仍在（写一条业务数据 → `docker compose restart` → 再读）
- [ ] 经 nginx 的公网路径能正常访问鉴权接口

下面几项是拿不到 Docker 时已做过的静态验证，可作为参考：

| 检查 | 方式 | 结论 |
|---|---|---|
| `npm start` 能否在无 `.env` 的容器里用 | 实测 `node --env-file=不存在的文件` | ❌ 会致命报错，故 CMD 直调 `node src/index.js` |
| PGlite 数据目录 | `src/db.js:123` `join(__dirname,'..','data')` | 源码 `/app/src` → 落盘 `/app/data`，与挂载点一致 |
| 只用环境变量（无 `.env`）能否启动 | 临时目录模拟容器启动 + 请求 health | ✅ 见提交记录，服务正常起来并返回 ok |
| 绑定地址 / 优雅退出 | `src/index.js:117` `host:'0.0.0.0'`、`:114` SIGTERM | ✅ 容器友好，无需改代码 |
