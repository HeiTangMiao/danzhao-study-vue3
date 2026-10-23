# 单招学习 · 后端（Fastify + PostgreSQL/PGlite）容器镜像
#
# 每条设计约束都是验证过或踩过坑的，改动前请先读：
#
#  1. CMD 用 `node src/index.js` 而不是 `npm start`
#     package.json 的 start 是 `node --env-file=.env src/index.js`，而 Node 的 `--env-file`
#     在**文件不存在时直接致命报错**（实测：`node: .env: not found`）。容器内刻意不放 .env
#     （密钥不进镜像），环境变量一律由 compose / docker run 提供，所以不能用 npm start。
#
#  2. 数据目录固定为 /app/data
#     src/db.js 的 PGlite 初始化是 new PGlite(join(__dirname, '..', 'data'))，
#     源码在 /app/src → 落盘就是 /app/data。持久化必须挂卷到这个路径，**挂错等于每次起新库**。
#
#  3. @node-rs/argon2 是预编译原生模块（按平台发 optional 子包）
#     npm ci 会在构建平台上自动选对二进制，依赖 glibc（故用 bookworm-slim 而非 alpine）。
#     除非脱离本镜像交叉编译，否则**不需要**装 python3/make/g++ 等构建工具。
#
#  4. 健康检查用 Node 内置 fetch，不引 curl/wget，保持镜像最小。
#
#  5. 以非 root 的 node（uid 1000）运行，先把 /app/data 改好属主，
#     否则卷挂载后容器内用户写不进去，PGlite 会启动失败。

FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Shanghai

WORKDIR /app

# 依赖单独一层：只改源码时不会重装依赖
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 源码与运维脚本（scripts/make-admin.mjs 便于 docker compose exec 使用）
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts

# PGlite 落盘目录：先建好用 root 改属主，再切到 node 用户
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000

# /api/health 见 src/app.js:82（返回 { ok: true, time }）
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
