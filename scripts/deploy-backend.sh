#!/usr/bin/env bash
# 一键部署后端到服务器：打包 server/ → scp 上传 → 服务器安装并重启
# 用法：DEPLOY_HOST=IP DEPLOY_USER=root bash scripts/deploy-backend.sh
# 依赖：~/.ssh/id_ed25519 已配置为服务器免密（CI 或本地均可）
set -euo pipefail

HOST="${DEPLOY_HOST:?需要 DEPLOY_HOST 环境变量}"
USER="${DEPLOY_USER:-root}"
SSH_ARGS="-i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no -o IdentitiesOnly=yes -o BatchMode=yes"

echo "==> 打包 server/（排除 node_modules/data/.env）..."
tar -czf /tmp/danzhao-server.tar.gz -C server --exclude=node_modules --exclude=data --exclude=.env .

echo "==> 上传到 ${USER}@${HOST} ..."
scp $SSH_ARGS /tmp/danzhao-server.tar.gz "${USER}@${HOST}:/tmp/danzhao-server.tar.gz"

echo "==> 服务器安装并重启 danzhao-api ..."
ssh $SSH_ARGS "${USER}@${HOST}" 'cd /opt/danzhao-study/server && tar -xzf /tmp/danzhao-server.tar.gz && npm ci --omit=dev && systemctl restart danzhao-api && sleep 2 && systemctl is-active danzhao-api && echo "health:" && curl -s http://127.0.0.1:3000/api/health && echo'

echo "==> 部署完成"
