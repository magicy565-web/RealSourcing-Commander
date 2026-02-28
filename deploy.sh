#!/usr/bin/env bash
# ============================================================
# RealSourcing Commander 5.0 — 一键部署脚本 (M7)
# 支持: Ubuntu 22.04 / Debian 12 / macOS (开发模式)
#
# 用法:
#   chmod +x deploy.sh
#   ./deploy.sh [--env production|staging|dev] [--port 4000] [--skip-build]
#
# 环境变量（可提前设置，否则脚本会交互式询问）:
#   JWT_SECRET          JWT 签名密钥（生产环境必填）
#   OPENAI_API_KEY      OpenAI API Key
#   FEISHU_WEBHOOK_URL  飞书机器人 Webhook
#   PORT                服务端口（默认 4000）
# ============================================================
set -euo pipefail

# ─── 颜色输出 ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}   $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERR]${NC}  $*"; }
log_step()    { echo -e "\n${BOLD}${CYAN}▶ $*${NC}"; }

# ─── Banner ───────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
cat << 'EOF'
  ____            _ ____                      _
 |  _ \ ___  __ _| / ___|  ___  _   _ _ __ | |__  ___ ___
 | |_) / _ \/ _` | \___ \ / _ \| | | | '__|| '_ \/ __/ _ \
 |  _ <  __/ (_| | |___) | (_) | |_| | |   | | | \__ \  __/
 |_| \_\___|\__,_|_|____/ \___/ \__,_|_|   |_| |_|___/\___|

 Commander 5.0 — 一键部署脚本 (Phase 3 M7)
EOF
echo -e "${NC}"

# ─── 参数解析 ─────────────────────────────────────────────────
DEPLOY_ENV="production"
PORT="${PORT:-4000}"
SKIP_BUILD=false
INSTALL_DEPS=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --env) DEPLOY_ENV="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-deps) INSTALL_DEPS=false; shift ;;
    -h|--help)
      echo "用法: $0 [--env production|staging|dev] [--port 4000] [--skip-build] [--skip-deps]"
      exit 0
      ;;
    *) log_warn "未知参数: $1"; shift ;;
  esac
done

log_info "部署环境: ${BOLD}${DEPLOY_ENV}${NC}"
log_info "服务端口: ${BOLD}${PORT}${NC}"

# ─── 系统检测 ─────────────────────────────────────────────────
log_step "检测系统环境"

OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  OS="linux"
  DISTRO=$(lsb_release -si 2>/dev/null || echo "Unknown")
  log_info "操作系统: Linux ($DISTRO)"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  OS="macos"
  log_info "操作系统: macOS"
else
  log_error "不支持的操作系统: $OSTYPE"
  exit 1
fi

# 检测 Node.js
if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  log_success "Node.js: $NODE_VER"
  # 检查版本 >= 18
  NODE_MAJOR=$(echo $NODE_VER | sed 's/v\([0-9]*\).*/\1/')
  if [[ $NODE_MAJOR -lt 18 ]]; then
    log_error "Node.js 版本过低，需要 >= 18.x，当前: $NODE_VER"
    exit 1
  fi
else
  log_error "未找到 Node.js，请先安装 Node.js 18+"
  exit 1
fi

# 检测包管理器
if command -v pnpm &>/dev/null; then
  PKG_MGR="pnpm"
  log_success "包管理器: pnpm $(pnpm --version)"
elif command -v npm &>/dev/null; then
  PKG_MGR="npm"
  log_success "包管理器: npm $(npm --version)"
else
  log_error "未找到 pnpm 或 npm"
  exit 1
fi

# 检测 PM2（生产环境进程管理）
if [[ "$DEPLOY_ENV" == "production" ]]; then
  if ! command -v pm2 &>/dev/null; then
    log_warn "未找到 PM2，将尝试安装..."
    npm install -g pm2 || { log_error "PM2 安装失败"; exit 1; }
    log_success "PM2 已安装: $(pm2 --version)"
  else
    log_success "PM2: $(pm2 --version)"
  fi
fi

# ─── 环境变量配置 ─────────────────────────────────────────────
log_step "配置环境变量"

ENV_FILE="apps/commander-server/.env"

# 如果 .env 不存在，从模板创建
if [[ ! -f "$ENV_FILE" ]]; then
  log_info "创建 .env 配置文件..."

  # JWT_SECRET
  if [[ -z "${JWT_SECRET:-}" ]]; then
    if [[ "$DEPLOY_ENV" == "production" ]]; then
      JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
      log_info "已自动生成 JWT_SECRET"
    else
      JWT_SECRET="dev-secret-change-in-production"
    fi
  fi

  cat > "$ENV_FILE" << EOF
# RealSourcing Commander 5.0 — 环境配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# 部署环境: ${DEPLOY_ENV}

NODE_ENV=${DEPLOY_ENV}
PORT=${PORT}

# JWT 认证密钥（生产环境请使用强随机值）
JWT_SECRET=${JWT_SECRET}

# OpenAI API（用于 AI 草稿生成）
OPENAI_API_KEY=${OPENAI_API_KEY:-}

# 飞书机器人 Webhook（用于询盘通知）
FEISHU_WEBHOOK_URL=${FEISHU_WEBHOOK_URL:-}

# 数据库路径（SQLite）
DB_PATH=./data/commander.db

# 日志级别
LOG_LEVEL=${DEPLOY_ENV == "production" ? "warn" : "info"}
EOF

  log_success ".env 文件已创建: $ENV_FILE"
else
  log_info ".env 文件已存在，跳过创建"
fi

# 确保数据目录存在
mkdir -p apps/commander-server/data
log_success "数据目录: apps/commander-server/data"

# ─── 安装依赖 ─────────────────────────────────────────────────
if [[ "$INSTALL_DEPS" == "true" ]]; then
  log_step "安装依赖包"
  $PKG_MGR install --frozen-lockfile 2>/dev/null || $PKG_MGR install
  log_success "依赖安装完成"
fi

# ─── 构建 ─────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == "false" ]]; then
  log_step "构建前端和后端"

  log_info "构建前端 (Vite)..."
  cd apps/commander-h5
  $PKG_MGR run build
  cd ../..
  log_success "前端构建完成"

  log_info "构建后端 (esbuild)..."
  cd apps/commander-server
  $PKG_MGR run build 2>/dev/null || npx esbuild src/index.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outdir=dist
  cd ../..
  log_success "后端构建完成"
fi

# ─── 启动服务 ─────────────────────────────────────────────────
log_step "启动服务"

if [[ "$DEPLOY_ENV" == "production" ]]; then
  # 生产环境：使用 PM2
  log_info "使用 PM2 启动服务..."

  # 创建 PM2 配置文件
  cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [
    {
      name: 'commander-server',
      script: './apps/commander-server/dist/index.js',
      cwd: '$(pwd)',
      env: {
        NODE_ENV: 'production',
        PORT: ${PORT},
      },
      env_file: './apps/commander-server/.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/commander-error.log',
      out_file: './logs/commander-out.log',
      merge_logs: true,
    },
  ],
};
EOF

  mkdir -p logs

  # 停止旧实例（如果存在）
  pm2 stop commander-server 2>/dev/null || true
  pm2 delete commander-server 2>/dev/null || true

  # 启动新实例
  pm2 start ecosystem.config.cjs
  pm2 save

  # 设置开机自启
  if [[ "$OS" == "linux" ]]; then
    pm2 startup 2>/dev/null || log_warn "请手动运行 'pm2 startup' 设置开机自启"
  fi

  log_success "服务已启动（PM2）"
  pm2 status commander-server

else
  # 开发/Staging 环境：直接启动
  log_info "以开发模式启动..."

  # 检查端口是否被占用
  if lsof -i ":${PORT}" &>/dev/null 2>&1; then
    log_warn "端口 ${PORT} 已被占用，尝试停止旧进程..."
    pkill -f "commander-server" 2>/dev/null || true
    sleep 1
  fi

  cd apps/commander-server
  nohup node dist/index.js > /tmp/commander.log 2>&1 &
  SERVER_PID=$!
  cd ../..

  sleep 2
  if kill -0 $SERVER_PID 2>/dev/null; then
    log_success "服务已启动 (PID: $SERVER_PID)"
    echo $SERVER_PID > /tmp/commander.pid
  else
    log_error "服务启动失败，查看日志: /tmp/commander.log"
    tail -20 /tmp/commander.log
    exit 1
  fi
fi

# ─── 健康检查 ─────────────────────────────────────────────────
log_step "健康检查"

MAX_RETRIES=10
RETRY_INTERVAL=2
HEALTH_URL="http://localhost:${PORT}/health"

for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf "$HEALTH_URL" &>/dev/null; then
    HEALTH_RESP=$(curl -s "$HEALTH_URL")
    log_success "健康检查通过: $HEALTH_RESP"
    break
  fi
  if [[ $i -eq $MAX_RETRIES ]]; then
    log_error "健康检查失败（${MAX_RETRIES} 次重试后）"
    log_error "请检查日志: /tmp/commander.log"
    exit 1
  fi
  log_info "等待服务启动... ($i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

# ─── Nginx 配置提示（生产环境）────────────────────────────────
if [[ "$DEPLOY_ENV" == "production" ]]; then
  log_step "Nginx 反向代理配置（可选）"

  cat << EOF

${YELLOW}如需通过域名访问，请配置 Nginx 反向代理：${NC}

  server {
      listen 80;
      server_name your-domain.com;

      location / {
          proxy_pass http://localhost:${PORT};
          proxy_http_version 1.1;
          proxy_set_header Upgrade \$http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host \$host;
          proxy_set_header X-Real-IP \$remote_addr;
          proxy_cache_bypass \$http_upgrade;
      }
  }

保存到 /etc/nginx/sites-available/commander 后运行:
  sudo ln -s /etc/nginx/sites-available/commander /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx

EOF
fi

# ─── 完成 ─────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}✅ 部署完成！${NC}\n"
echo -e "  服务地址: ${CYAN}http://localhost:${PORT}${NC}"
echo -e "  健康检查: ${CYAN}http://localhost:${PORT}/health${NC}"
echo -e "  API 文档: ${CYAN}http://localhost:${PORT}/api/v1${NC}"
echo -e "  管理后台: ${CYAN}http://localhost:${PORT}/admin${NC}"
echo ""
echo -e "  ${YELLOW}默认账号: demo@commander.ai / demo123456${NC}"
echo ""

if [[ "$DEPLOY_ENV" == "production" ]]; then
  echo -e "  PM2 命令:"
  echo -e "    查看状态: ${CYAN}pm2 status${NC}"
  echo -e "    查看日志: ${CYAN}pm2 logs commander-server${NC}"
  echo -e "    重启服务: ${CYAN}pm2 restart commander-server${NC}"
  echo -e "    停止服务: ${CYAN}pm2 stop commander-server${NC}"
fi
