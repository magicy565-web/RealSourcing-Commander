/**
 * RealSourcing Commander 5.0 Phase 5 — 后端服务入口
 *
 * 技术栈：Hono + SQLite (better-sqlite3) + JWT + 阿里云百炼 AI
 *
 * Phase 5 新增路由：
 *   GET  /api/v1/social/accounts              社媒账号列表
 *   GET  /api/v1/social/accounts/:id/messages 账号消息列表
 *   GET  /api/v1/social/messages              全平台消息列表
 *   POST /api/v1/social/messages/:id/analyze  AI 情感分析
 *   POST /api/v1/social/messages/:id/generate-reply AI 回复草稿
 *   POST /api/v1/social/messages/:id/reply    发送回复
 *   POST /api/v1/social/messages/:id/convert  转化为询盘
 *   POST /api/v1/social/messages/batch-analyze 批量分析
 *   GET  /api/v1/social/stats                 社媒统计
 *
 *   GET  /api/v1/geo/heatmap                  全球买家热力图数据
 *   GET  /api/v1/geo/competitors              竞争对手分析
 *   POST /api/v1/geo/strategy                 AI 区域化报价策略建议
 *   GET  /api/v1/geo/market-summary           市场概况
 *
 *   GET  /api/v1/multi-account/instances      多实例列表
 *   POST /api/v1/multi-account/instances      添加实例
 *   GET  /api/v1/multi-account/instances/:id  实例详情
 *   PATCH /api/v1/multi-account/instances/:id/status 更新实例状态
 *   POST /api/v1/multi-account/route-task     智能任务路由
 *   GET  /api/v1/multi-account/health         所有实例健康状态
 *
 *   GET  /api/v1/roi/summary                  ROI 汇总
 *   GET  /api/v1/roi/calculator               工时节省计算
 *   GET  /api/v1/dashboard/funnel             成交漏斗数据
 *   POST /api/v1/dashboard/daily-report/push  手动触发飞书战报推送
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
import feedRouter from "./routes/feed.js";
import adminRouter from "./routes/admin.js";
import videoFeedRouter from "./routes/video-feed.js";
// Phase 5 新增路由
import socialRouter from "./routes/social.js";
import geoRouter from "./routes/geo.js";
import multiAccountRouter from "./routes/multi-account.js";
import roiRouter from "./routes/roi.js";
// Phase 6 新增路由
import bossRouter from "./routes/boss.js";
// Phase 9 AI 全家桶 新增路由
import agentsRouter from "./routes/agents.js";

import { scanAndPushFollowupReminders } from "./services/followup.js";
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
    version: "5.0.7-phase9",
    service: "RealSourcing Commander Server",
    timestamp: new Date().toISOString(),
    database: "SQLite (local)",
    ai: "阿里云百炼 Qwen-Plus",
    features: [
      "ai-draft", "style-training", "task-queue", "feed",
      "knowledge-base", "monitor", "video-feed-vod",
      "social-media", "geo-insight", "multi-account", "roi-calculator",
      "daily-report", "funnel-tracking",
      "boss-command", "approval-loop", "warroom",
      "agent-manager", "leads-hunter", "trend-radar", "content-pilot",
    ],
  })
);

// ─── API 路由 ─────────────────────────────────────────────────
app.route("/api/v1/auth", authRouter);
app.route("/api/v1/inquiries", inquiriesRouter);
app.route("/api/v1/openclaw", openclawRouter);
app.route("/api/v1/dashboard", dashboardRouter);
app.route("/api/v1/training", trainingRouter);
app.route("/api/v1/tasks", tasksRouter);
// Phase 3 新增路由
app.route("/api/v1/feed", feedRouter);
app.route("/api/v1/admin", adminRouter);
// Phase 3 视频信息流（火山引擎 VOD）
app.route("/api/v1/video-feed", videoFeedRouter);
// Phase 5 新增路由
app.route("/api/v1/social", socialRouter);
app.route("/api/v1/geo", geoRouter);
app.route("/api/v1/multi-account", multiAccountRouter);
app.route("/api/v1/roi", roiRouter);
// Phase 6 新增路由
app.route("/api/v1/boss", bossRouter);
// Phase 9 AI 全家桶 新增路由
app.route("/api/v1/agents", agentsRouter);

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
  console.log(`🚀 Commander Server v5.0.7-phase9 已启动 → http://localhost:${PORT}`);
  console.log(`🤖 AI 引擎：阿里云百炼 Qwen-Plus`);
  console.log(`📌 演示账号: admin@minghui.com / admin123`);
  console.log(`📡 Phase 5 新增：社交媒体管理、GEO洞察、多账号协同、ROI计算器、每日战报`);
  console.log(`👔 Phase 6 新增：老板指令中心、审批闭环、极简战报首页`);

  // 启动 24 小时跟进扫描（每小时执行一次）
  setInterval(() => {
    scanAndPushFollowupReminders().catch(err => console.error("Followup scan failed:", err));
  }, 60 * 60 * 1000);

  // 启动时立即执行一次
  scanAndPushFollowupReminders().catch(err => console.error("Initial followup scan failed:", err));

  // Phase 5: 启动每日战报定时推送（每天 09:00）
  scheduleDailyReport();
});

export default app;
