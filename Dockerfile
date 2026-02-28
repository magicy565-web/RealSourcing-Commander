# ============================================================
# RealSourcing Commander 5.0 — Dockerfile (Phase 3 M7)
# Multi-stage build: builder + runner
# ============================================================

# ─── Stage 1: Builder ─────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 workspace 配置
COPY package.json pnpm-workspace.yaml ./
COPY apps/commander-server/package.json ./apps/commander-server/
COPY apps/commander-h5/package.json ./apps/commander-h5/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY apps/commander-server ./apps/commander-server
COPY apps/commander-h5 ./apps/commander-h5

# 构建前端
RUN cd apps/commander-h5 && pnpm build

# 构建后端
RUN cd apps/commander-server && pnpm build 2>/dev/null || \
    npx esbuild src/index.ts \
      --platform=node \
      --packages=external \
      --bundle \
      --format=esm \
      --outdir=dist

# ─── Stage 2: Runner ──────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache curl

# 复制构建产物
COPY --from=builder /app/apps/commander-server/dist ./apps/commander-server/dist
COPY --from=builder /app/apps/commander-server/package.json ./apps/commander-server/
COPY --from=builder /app/dist/public ./dist/public

# 安装生产依赖
WORKDIR /app/apps/commander-server
RUN npm install --production --ignore-scripts

WORKDIR /app

# 创建数据目录
RUN mkdir -p data logs

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=4000
ENV DB_PATH=/app/data/commander.db

# 暴露端口
EXPOSE 4000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# 启动命令
CMD ["node", "apps/commander-server/dist/index.js"]
