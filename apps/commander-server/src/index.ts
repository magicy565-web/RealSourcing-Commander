/**
 * RealSourcing Commander — 后端服务入口
 *
 * 技术栈：Hono + SQLite (better-sqlite3) + JWT + OpenAI API
 *
 * 核心路由：
 *   /api/v1/auth        认证（登录/注册）
 *   /api/v1/inquiries   询盘管理（RFQ 核心）
 *   /api/v1/boss        老板指令中心 + 审批闭环 + 战报
 *   /api/v1/tasks       OpenClaw 任务队列
 *   /api/v1/feed        信息流卡片（每日配额推荐）
 *   /api/v1/admin       管理后台（询盘上传 + 视频上传）
 *   /api/v1/video-feed  火山引擎 VOD 信息流
 */
import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

// 初始化数据库（建表 + 种子数据）
import "./db/index.js";

// 路由模块
import authRouter from "./routes/auth.js";
import inquiriesRouter from "./routes/inquiries.js";
import tasksRouter from "./routes/tasks.js";
import feedRouter from "./routes/feed.js";
import adminRouter from "./routes/admin.js";
import videoFeedRouter from "./routes/video-feed.js";
import bossRouter from "./routes/boss.js";

import { scanAndPushFollowupReminders, autoReplyAgent } from "./services/followup.js";
import { scheduleDailyReport } from "./services/dailyReport.js";

const app = new Hono();

// ─── 中间件 ───────────────────────────────────────────────────
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ─── 健康检查 ─────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({
    status: "ok",
    version: "6.0.0-clean",
    service: "RealSourcing Commander Server",
    timestamp: new Date().toISOString(),
    database: "SQLite (local)",
    ai: "OpenAI GPT-4",
    features: [
      "inquiries",
      "video-feed-vod",
      "daily-report",
      "boss-command",
      "approval-loop",
      "warroom",
      "auto-reply-agent",
    ],
  })
);

// ─── API 路由 ─────────────────────────────────────────────────
app.route("/api/v1/auth", authRouter);
app.route("/api/v1/inquiries", inquiriesRouter);
app.route("/api/v1/tasks", tasksRouter);
app.route("/api/v1/feed", feedRouter);
app.route("/api/v1/admin", adminRouter);
app.route("/api/v1/video-feed", videoFeedRouter);
app.route("/api/v1/boss", bossRouter);

// ─── 404 ──────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "接口不存在" }, 404));

// ─── 错误处理 ─────────────────────────────────────────────────
app.onError((err, c) => {
  console.error("[Server Error]", err);
  return c.json({ error: "服务器内部错误", message: err.message }, 500);
});

// ─── 启动服务 ─────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 4000);
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀 Commander Server v6.0.0-clean 已启动 → http://localhost:${PORT}`);
  console.log(`📌 演示账号: admin@minghui.com / admin123`);

  // 启动 24 小时跟进扫描（每小时执行一次）
  setInterval(() => {
    scanAndPushFollowupReminders().catch(err => console.error("Followup scan failed:", err));
  }, 60 * 60 * 1000);

  // 启动时立即执行一次
  scanAndPushFollowupReminders().catch(err => console.error("Initial followup scan failed:", err));

  // 每日战报定时推送（每天 09:00）
  scheduleDailyReport();

  // AI 自动回复 Agent（每 5 分钟扫描一次新询盘）
  const AUTO_REPLY_INTERVAL = Number(process.env.AUTO_REPLY_INTERVAL_MS ?? 5 * 60 * 1000);
  setInterval(() => {
    autoReplyAgent().catch(err => console.error("[AutoReplyAgent] 定时任务失败:", err));
  }, AUTO_REPLY_INTERVAL);
  setTimeout(() => {
    autoReplyAgent().catch(err => console.error("[AutoReplyAgent] 首次扫描失败:", err));
  }, 30 * 1000);
  console.log(`🤖 AI 自动回复 Agent 已启动（间隔 ${AUTO_REPLY_INTERVAL / 1000}s）`);
});

export default app;
