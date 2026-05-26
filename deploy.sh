#!/bin/bash
# ============================================
# 工厂负载监控系统 — 一键部署到阿里云轻量服务器
# ============================================
# 前置条件:
#   - SSH config 已配置 aliyun 主机别名
#   - 服务器上已安装 Node.js 18+、PM2、Nginx
#
# 用法:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# 部署内容:
#   - frontend/dashboard/dist/ → /var/www/factory-monitor/frontend/dist/
#   - server/                  → /var/www/factory-monitor/server/
#   - ecosystem.config.js      → /var/www/factory-monitor/ecosystem.config.js
# ============================================

set -euo pipefail

SSH_HOST="${1:-aliyun}"
REMOTE_DIR="/var/www/factory-monitor"

echo "=== 1. 构建前端 ==="
cd "$(dirname "$0")/frontend/dashboard"
MSYS2_ARG_CONV_EXCL="*" npx vite build --base=/monitor/

echo ""
echo "=== 2. 上传前端静态文件 ==="
ssh "$SSH_HOST" "mkdir -p $REMOTE_DIR/monitor"
rsync -avz --delete dist/ "$SSH_HOST:$REMOTE_DIR/monitor/"

echo ""
echo "=== 3. 上传后端代码 ==="
cd "$(dirname "$0")"
rsync -avz --delete server/src "$SSH_HOST:$REMOTE_DIR/server/"
rsync -avz server/package.json server/package-lock.json "$SSH_HOST:$REMOTE_DIR/server/"
rsync -avz server/.env "$SSH_HOST:$REMOTE_DIR/server/"
rsync -avz ecosystem.config.js "$SSH_HOST:$REMOTE_DIR/"

echo ""
echo "=== 4. 安装后端依赖 ==="
ssh "$SSH_HOST" "cd $REMOTE_DIR/server && npm install --production"

echo ""
echo "=== 5. 重启服务 ==="
ssh "$SSH_HOST" "cd $REMOTE_DIR && pm2 startOrReload ecosystem.config.js --update-env"

echo ""
echo "=== 6. 同步 Nginx 配置 ==="
ssh "$SSH_HOST" "cp $REMOTE_DIR/nginx-locations.conf /etc/nginx/sites-available/packing-optimizer"
ssh "$SSH_HOST" "cp /etc/nginx/sites-available/packing-optimizer /etc/nginx/sites-enabled/packing-optimizer"
ssh "$SSH_HOST" "nginx -t && nginx -s reload && echo 'Nginx 已重载'"

echo ""
echo "=== ✅ 部署完成 ==="
echo "前端: https://k3-aitable.xyz/monitor/"
echo "API:  https://k3-aitable.xyz/api/monitor/health"
