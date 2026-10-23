# 后端容器化部署

把 `server/`（Fastify + PostgreSQL）跑在容器里。**2026-10-24 已在服务器上真实构建并验证通过**，本文的每个设定都有实测依据。

> ⚠️ 本机开发环境没有 Docker。**要动下面这些设定前先看 §6 的实测数据**——走不通的路线我都替你试过了。

---

## 1. 前提：先看清部署形态，否则必踩坑

服务器上 **PostgreSQL 就在宿主机**，`DATABASE_URL` 指向 `127.0.0.1:5432`，而 postgresql.conf **只监听回环**。这一条决定了整个方案：

| 形态 | 条件 | 数据落点 | 网络模式 |
|---|---|---|---|
| **外部 PostgreSQL**（生产实际形态） | `DATABASE_URL` 已配置 | 宿主机 PostgreSQL | **必须 `network_mode: host`** |
| 嵌入式 PGlite（本地 / 无 PG 时） | `DATABASE_URL` 留空 | 容器内 `/app/data` ← 卷 `api-data` | bridge 亦可 |

为什么必须 host：见 §6 实测——bridge 网络下容器连不到宿主机的回环 PG，改 `host.docker.internal` 也没用（PG 根本没监听网桥地址）。

## 2. 首次部署（服务器实操顺序）

生产目录是 `/opt/danzhao-study/server/`（CI 部署过去的产物），compose 放在它的父目录。

```bash
cd /opt/danzhao-study              # docker-compose.yml 放这里
ls server/Dockerfile               # CI 已同步 Dockerfile，确认存在

# 1) **必须先停 systemd** —— 否则 3000 端口直接冲突
#    （更隐蔽的风险：host 网络下健康检查可能探到旧进程而"假绿"，见 §6 教训 2）
sudo systemctl stop danzhao-api && sudo systemctl disable danzhao-api

# 2) 构建并启动
docker compose build            # 约 1 分 30 秒
docker compose up -d

# 3) 验证
docker compose ps               # STATUS 应为 healthy
curl -s http://127.0.0.1:3000/api/health        # {"ok":true,"time":"..."}
curl -s https://520305.top/api/health           # 经 nginx 的公网路径也应 200
docker compose logs -f api
```

回滚到 systemd：`docker compose down && sudo systemctl start danzhao-api`（数据在 PostgreSQL 里，不随容器变动）。

## 3. 日常更新

```bash
cd /opt/danzhao-study
docker compose build && docker compose up -d    # 重建镜像 + 替换容器
```

> ⚠️ **别用 `docker compose down -v`**：`-v` 会删卷。PG 形态下卷是空的、删了无害，但一旦有人切回 PGlite 形态，那就是删库。

## 4. 环境变量

全部沿用 `server/.env`（由 compose 的 `env_file` 挂载）：

| 变量 | 容器取值 | 说明 |
|---|---|---|
| `PORT` | 沿用 `.env`（生产 3000） | host 网络下**它就是宿主机端口**，改动前确认没被占 |
| `TRUST_PROXY` | `127.0.0.1`（compose 强制覆盖） | ⚠️ 绝不能 `true` / `*`，否则 XFF 可伪造、限流失效 |
| `NODE_ENV` | `production` | 生产缺 `JWT_SECRET` 直接拒绝启动 |
| `DATABASE_URL` | 沿用 `.env` | 留空则退化为容器内的 PGlite |
| `JWT_SECRET` | 无默认 | 必须强随机值 |

完整清单见 `server/.env.example`。

## 5. 和 systemd 的关系

现有 CI 链路：SSH → `scripts/deploy-backend.sh` → `npm ci` + `systemctl restart danzhao-api`。**容器化没有改它**，两条路二选一：

- 继续 systemd：不用动，仓库里的 docker 文件纯备用
- 切容器：按 §2；若要把 CI 也改成容器部署，需单独改 `ci.yml` 的 `deploy-backend` job（尚未做）

nginx 反代无需改动：容器仍服务于宿主机 3000 端口（host 网络直接绑定，不经端口映射）。

## 6. 实测记录（2026-10-24，服务器 Docker 29.9.1 / Compose v5.6.0）

| # | 验证项 | 结果 |
|---|---|---|
| 1 | 镜像构建（`npm ci --omit=dev`） | ✅ 1 分 33 秒，镜像 386MB |
| 2 | `@node-rs/argon2` 预编译原生包在 Linux 上可用 | ✅ 注册接口返回用户与令牌（真实走 argon2 哈希），登录 verify 也通过 |
| 3 | 容器内置 HEALTHCHECK 判定是否正确 | ✅ 4 次轮询转 `healthy`；死端口对照组返回 1（不是永远绿） |
| 4 | 数据卷挂载路径 `/app/data` | ✅ 写入数据 → 重启容器 → 登录仍成功；卷内 28MB |
| 5 | 非 root 运行 | ✅ 容器内 uid 1000 / 用户 `node` |
| 6 | **bridge → 宿主机 `127.0.0.1:5432`** | ❌ ECONNREFUSED（连的是容器自己） |
| 7 | **bridge → 网桥网关 `172.17.0.1:5432`** | ❌ timeout（PG 未监听该地址） |
| 8 | **host → `127.0.0.1:5432`** | ✅ 连通 —— **这就是 compose 必须用 host 网络的原因** |
| 9 | host 网络 + 生产 env 端到端 | ✅ health 200；查不存在账号返回业务错误「用户名或密码错误」而非 500（证明真连上了 PG）；容器内 `/app/data` 文件数 0（证明没误用 PGlite） |
| 10 | 全程未影响生产 | ✅ systemd `danzhao-api` 始终 active，公网 `520305.top/api/health` 200 |

### 过程中踩到的两个坑（留个记号）

1. **`docker inspect` 会看到重复的 env key**：`--env-file` 与 `-e PORT=` 同名时两者都出现在 `Config.Env`，谁生效不确定 → 需要改值时**改写 env 文件副本**，别依赖 `-e` 覆盖。
2. **健康检查会"假绿"**：第一次测 PG 拓扑时我没清掉上一个占着 3999 的测试容器，新容器 `EADDRINUSE` 崩了，而 healthcheck 探的是宿主机 3999 → **探到的是旧容器**，照样返回健康。⚠️ host 网络下健康检查有可能在检查别人的进程，排错务必 `docker logs` 确认本容器真的起来了。

另注：探针别用 bash 的 `/dev/tcp` —— 镜像里 `/bin/sh` 是 dash，不支持，会全是假阴性；用 node 的 `net` 模块。
