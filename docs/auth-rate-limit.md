# 认证端点限流（register / login / refresh）

面向运维与后续维护者：改阈值、换部署形态、验收上线，看这一篇就够。
代码在 `server/src/rateLimit.js`（判定）、`server/src/app.js`（IP 维度钩子）、`server/src/auth.js`（账号维度 preHandler + 失败记账）。

---

## 1. 它防什么 / 不防什么

| 维度 | 防的场景 | key | 行为 |
|---|---|---|---|
| IP（固定窗口） | 同一来源短时间狂刷注册/登录/刷新 | 客户端 IP | 窗口内超过 N 次 → 429，等窗口翻页自动恢复 |
| 账号（连续失败+封禁） | 针对某个账号的口令爆破 | 归一化账号（小写去空白） | 连续失败 8 次 → 封禁 15 分钟，登录成功即清零 |

**不防**：分布式慢速爆破（多 IP、每 IP 低于阈值）。这道防线要靠更强的密码策略或验证码，不在本次范围内。

两条硬性约定，改动前必须知道：

- **超限返回 429，不是 401。** 前端对 401 走的是「用户名或密码错误」分支，用户会信以为真继续重试，越试越被限流，形成死循环。
- **限流的任何内部故障一律 fail-open（放行）+ `log.error`。** 限流是防御不是业务。本项目有过「一个 SQL 报错拖垮 `/api/sync`」的事故（2026-10-17，根因见 `server/src/db.js` 的 `REQUIRED_CONSTRAINTS` 注释）——把限流系统自己的故障放大成「全站登录 500」是本末倒置。

---

## 2. 为什么存 PostgreSQL 而不是内存

`scripts/deploy-backend.sh` 每次上线都执行 `systemctl restart danzhao-api`。
进程内存里的计数器会被**一次发布清零** —— 靠内存做「封禁 15 分钟」等于没锁，攻击者只要等一次发布即可。

代价是可接受的：计数是一次 `INSERT ... ON CONFLICT ... RETURNING`，loopback 上亚毫秒级；而 `login` 本身已经在跑 Argon2 校验，量级差着几百倍。

---

## 3. nginx 配置（IP 维度的前提）

后端只能看到 nginx 的回源地址，必须让 nginx 把真实来源**追加**进 `X-Forwarded-For`：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    # ⚠️ 必须是 $proxy_add_x_forwarded_for（**追加**），不能是 $remote_addr 或手写常量：
    #    那样等于覆盖，客户端自带的伪造值要么被丢弃、要么反而被信任。
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP       $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

改完：`sudo nginx -t && sudo systemctl reload nginx`。

---

## 4. `TRUST_PROXY` 核查（上线必做）

取值规则：**填可信代理的回源 IP；nginx 与后端同机即 `127.0.0.1`。**

- 不填 → `request.ip` 恒为 `127.0.0.1`，全站公网用户共用同一个桶，第一个撞线的人锁死所有人。代码会跳过 IP 维度并在启动时 `console.warn`（fail-open，见第 1 节）。
- 填 `true` / `*` → 等于信任 XFF **最左值**，攻击者伪造头部即可任意换桶。代码在启动时直接 `exit 1` 拒绝。
- 填 `127.0.0.1` → 安全。代理链从**右往左**扫，返回第一个不可信地址；伪造值在左侧扫不到，被返回的始终是 nginx 追加的真实 IP。
- 多层代理（CDN → nginx → 后端）→ 逗号分隔列出所有跳的回源 IP。

核查步骤：

```bash
# ① 确认 .env 里配了
grep -n '^TRUST_PROXY' /opt/danzhao-study/server/.env
# 期望输出：TRUST_PROXY=127.0.0.1

# ② 确认启动时没有那条 warn
sudo journalctl -u danzhao-api -n 50 --no-pager | grep -i 'rate-limit' || echo '（无告警 = 已生效）'

# ③ 确认伪造 XFF 不能换桶：连打 20 次，第 16 次起应返回 429
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code} " \
    -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -H 'X-Forwarded-For: 1.2.3.4' \
    -d '{"username":"probe","password":"wrong"}'
done; echo
# 期望：前 15 个 401，之后全是 429（伪造头没起作用）
```

---

## 5. 阈值参数表

| 环境变量 | 默认 | 含义 | 调整提示 |
|---|---|---|---|
| `TRUST_PROXY` | `127.0.0.1` | 可信代理回源地址 | 同机 nginx 就用默认值；不配则 IP 维度跳过 |
| `RATE_REGISTER_PER_IP` | `10` | 同 IP 注册次数上限 / 小时 | **校园网、公司 NAT 出口偏紧**，集中开户场景调到 30+ |
| `RATE_LOGIN_PER_IP` | `15` | 同 IP 登录次数上限 / 5 分钟 | 留足手抖与切号余量 |
| `RATE_REFRESH_PER_IP` | `60` | 同 IP 刷新次数上限 / 5 分钟 | 客户端自动调用，必须明显高于 login |
| `RATE_LOGIN_FAIL_MAX` | `8` | 账号连续失败上限 | 含「账号不存在」，两者必须同计数（见下） |
| `RATE_LOGIN_BLOCK_MIN` | `15` | 账号封禁时长（分钟） | 同时充当失败计数的窗口长度 |
| `RATE_*_PER_IP_WINDOW_SEC` | 3600/300/300 | 窗口长度（秒） | 可选，一般不改 |
| `RATE_LIMIT` | — | 总开关：`1` 强制开 / `0` 强制关 | 生产默认自动开启，无需配置 |

两个容易踩的坑，写在代码注释里也再强调一次：

1. **账号维度用账号字符串而非 `user_id` 做 key。** 账号不存在时也必须计数，否则「被限流 / 不被限流」的响应差异就是一个免费的**账号枚举探针**。
2. **封禁中不因继续尝试而延长。** 否则攻击者拿别人的账号一直乱试，就能把该账号越锁越久——把「防御」变成「拒绝服务」。

---

## 6. 上线验收命令

在服务器上依次执行（第 3 步会真的占用配额，验收完记得清表）：

```bash
# ① 表与主键存在（主键是 ON CONFLICT 的冲突目标，丢了会直接 500）
sudo -u postgres psql -d danzhao -c "\d auth_guard"

# ② 触发前确认是空的
sudo -u postgres psql -d danzhao -c "SELECT count(*) FROM auth_guard;"

# ③ IP 维度：同 IP 连打 20 次 login，期望前 15 个 401、之后 429
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'Content-Type: application/json' -d '{"username":"nobody","password":"wrong"}'
done; echo

# ④ 检查 429 的响应头与响应体
curl -s -D - -o /dev/null -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"nobody","password":"wrong"}' \
  | grep -i -E '^(HTTP|retry-after)'
# 期望：HTTP/1.1 429 Too Many Requests + Retry-After: <秒数>
# 响应体形如 {"error":"操作过于频繁，请 287 秒后再试","retryAfter":287}

# ⑤ 账号维度：对**存在的账号**连打 10 次错密码，期望前 8 个 401、之后 429
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'Content-Type: application/json' -d '{"username":"<真实账号>","password":"wrong"}'
done; echo

# ⑥ 看桶里的数据（kind/key/scope/count/blocked_until 是否符合预期）
sudo -u postgres psql -d danzhao -c \
  "SELECT kind,key,scope,count,window_start,blocked_until FROM auth_guard ORDER BY window_start DESC LIMIT 10;"

# ⑦ 验收完清干净
sudo -u postgres psql -d danzhao -c "TRUNCATE auth_guard;"
```

**回归提醒**：`server/test/api.test.js` 里 `TRUNCATE users ... CASCADE` 带不到 `auth_guard`（新表无外键），已单独补了 `TRUNCATE auth_guard`。以后新增测试若清空 users，记得照做。

---

## 7. 故障排查

| 现象 | 排查 |
|---|---|
| 全站用户一起被限流 | 十有八九是没配 `TRUST_PROXY`（`request.ip` 全是 127.0.0.1）。查启动日志里的 `[rate-limit]` warn |
| 限流完全不生效 | 若 `NODE_ENV` 不是 production 且没设 `RATE_LIMIT=1`，限流整体未开启 |
| 启动即退出 | `TRUST_PROXY` 被设成了 `true` / `*`，按提示改成 IP |
| 日志里有 `[rate-limit] 限流判定异常` | 限流内部出错（多为 DB 或表结构问题）。此时请求已**放行**，不会 500，但防护是失效的，需尽快修 |

正常运行时 `auth_guard` 的行数应与活跃 IP/账号数同量级；由 `index.js` 的会话清理定时器按小时顺带清理，无需手工维护。
