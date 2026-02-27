/**
 * RealSourcing Commander 5.0 — 后端服务入口
 *
 * 架构：Hono (轻量 HTTP 框架) + BullMQ (任务队列) + Drizzle ORM
 *
 * 路由结构：
 *   /api/v1/commander/*   指挥台 API（手机端 + Web 端共用）
 *   /api/v1/webhook/*     OpenClaw 回调 + 微信事件
 *   /api/v1/admin/*       管理端 API
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

// TODO: 引入路由模块（待开发）
// import { commanderRouter } from "./routes/commander";
// import { webhookRouter } from "./routes/webhook";
// import { adminRouter } from "./routes/admin";

// TODO: 启动 Worker（待开发）
// import { startRfqMonitorWorker } from "./_core/rfqMonitorWorker";
// import { startDailyReportWorker } from "./_core/dailyReportWorker";

const app = new Hono();

// ─── 中间件 ───────────────────────────────────────────────────
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: [
      process.env.COMMANDER_APP_URL ?? "http://localhost:5173",
      process.env.COMMANDER_WEB_URL ?? "http://localhost:5174",
    ],
    credentials: true,
  })
);

// ─── 健康检查 ─────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({
    status: "ok",
    version: "5.0.0",
    service: "RealSourcing Commander Server",
    timestamp: new Date().toISOString(),
  })
);

// ─── API 路由（占位，待实现）─────────────────────────────────
app.get("/api/v1/commander/status", (c) =>
  c.json({ message: "Commander API v1 — 开发中" })
);

// ─── 启动服务 ─────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 4000);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀 Commander Server 已启动 → http://localhost:${PORT}`);
  console.log(`📋 健康检查 → http://localhost:${PORT}/health`);

  // TODO: 启动 Workers
  // startRfqMonitorWorker();
  // startDailyReportWorker();
  // console.log("⚙️  BullMQ Workers 已启动");
});

export default app;
