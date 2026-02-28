/**
 * RealSourcing Commander 5.0 — 后端服务入口
 *
 * 技术栈：Hono + SQLite (better-sqlite3) + JWT + 阿里云百炼 AI
 *
 * 路由结构：
 *   GET  /health                          健康检查
 *   POST /api/v1/auth/login               登录
 *   POST /api/v1/auth/refresh             刷新 Token
 *   GET  /api/v1/auth/me                  当前用户信息
 *   GET  /api/v1/inquiries                询盘列表
 *   GET  /api/v1/inquiries/stats          询盘统计（今日战报）
 *   GET  /api/v1/inquiries/:id            询盘详情
 *   PATCH /api/v1/inquiries/:id/status    更新状态
 *   POST /api/v1/inquiries/:id/quote      提交报价
 *   POST /api/v1/inquiries/:id/reply      提交回复（AI 翻译）
 *   POST /api/v1/inquiries/:id/transfer   转人工
 *   POST /api/v1/inquiries                手动创建询盘（AI 分析）
 *   POST /api/v1/inquiries/ai-draft       AI 重新生成草稿
 *   GET  /api/v1/openclaw/status          OpenClaw 实例状态
 *   GET  /api/v1/openclaw/logs            操作日志
 *   POST /api/v1/openclaw/simulate-lead   模拟新询盘（演示用）
 *   GET  /api/v1/dashboard/overview       Web 管理端总览
 *   GET  /api/v1/dashboard/credits        积分流水
 *   GET  /api/v1/dashboard/report         每日战报
 *   GET  /api/v1/training/samples         获取训练样本
 *   POST /api/v1/training/samples         上传训练样本
 *   POST /api/v1/training/extract         触发风格提取
 *   GET  /api/v1/training/profile         获取风格档案
 *   DELETE /api/v1/training/profile       重置风格档案
 *   GET  /api/v1/tasks                    任务队列列表
 *   POST /api/v1/tasks                    创建新任务
 *   GET  /api/v1/tasks/:id                任务详情
 *   POST /api/v1/tasks/:id/cancel         取消任务
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
import openclawRouter from "./routes/openclaw.js";
import dashboardRouter from "./routes/dashboard.js";
import trainingRouter from "./routes/training.js";
import tasksRouter from "./routes/tasks.js";
import { scanAndPushFollowupReminders } from "./services/followup.js";

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
    version: "5.0.1",
    service: "RealSourcing Commander Server",
    timestamp: new Date().toISOString(),
    database: "SQLite (local)",
    ai: "阿里云百炼 Qwen-Plus",
    features: ["ai-draft", "style-training", "task-queue"],
  })
);

// ─── API 路由 ─────────────────────────────────────────────────
app.route("/api/v1/auth", authRouter);
app.route("/api/v1/inquiries", inquiriesRouter);
app.route("/api/v1/openclaw", openclawRouter);
app.route("/api/v1/dashboard", dashboardRouter);
app.route("/api/v1/training", trainingRouter);
app.route("/api/v1/tasks", tasksRouter);

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
  console.log(`🚀 Commander Server v5.0.1 已启动 → http://localhost:${PORT}`);
  console.log(`🤖 AI 引擎：阿里云百炼 Qwen-Plus`);
  console.log(`📌 演示账号: admin@minghui.com / admin123`);

  // 启动 24 小时跟进扫描（每小时执行一次）
  setInterval(() => {
    scanAndPushFollowupReminders().catch(err => console.error("Followup scan failed:", err));
  }, 60 * 60 * 1000);
  
  // 启动时立即执行一次
  scanAndPushFollowupReminders().catch(err => console.error("Initial followup scan failed:", err));
});

export default app;
