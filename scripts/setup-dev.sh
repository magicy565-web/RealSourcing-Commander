#!/bin/bash
# RealSourcing Commander 5.0 — 开发环境初始化脚本

set -e

echo "🚀 初始化 RealSourcing Commander 开发环境..."

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
  echo "❌ 请先安装 pnpm: npm install -g pnpm"
  exit 1
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
  echo "📋 复制环境变量模板..."
  cp .env.example .env
  echo "⚠️  请编辑 .env 文件，填入真实的配置值"
fi

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 执行数据库迁移
echo "🗄️  执行数据库迁移..."
pnpm db:migrate

echo ""
echo "✅ 开发环境初始化完成！"
echo ""
echo "启动命令："
echo "  pnpm dev          → 启动所有应用"
echo "  pnpm dev:app      → 仅启动手机端 H5 (port 5173)"
echo "  pnpm dev:web      → 仅启动 Web 管理端 (port 5174)"
echo "  pnpm dev:server   → 仅启动后端 API (port 4000)"
echo "  pnpm worker:start → 启动 BullMQ Workers"
