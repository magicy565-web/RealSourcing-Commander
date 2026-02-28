/**
 * Commander 5.0 Phase 3 — 管理后台 API
 * GET  /api/v1/admin/knowledge         行业知识库列表
 * POST /api/v1/admin/knowledge         添加知识点
 * DELETE /api/v1/admin/knowledge/:id   删除知识点
 * GET  /api/v1/admin/monitor           系统监控数据
 * GET  /api/v1/admin/feed              信息流管理列表
 * PATCH /api/v1/admin/feed/:id         更新信息流条目状态
 */
import { Hono } from "hono";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { nanoid } from "nanoid";
import os from "os";

const admin = new Hono();
admin.use("*", authMiddleware);

// 管理员权限检查中间件
admin.use("*", async (c, next) => {
  const user = c.get("user");
  const dbUser = db.prepare("SELECT role FROM users WHERE id = ?").get(user.sub) as any;
  if (dbUser?.role !== "admin") {
    return c.json({ error: "需要管理员权限" }, 403);
  }
  await next();
});

// ─── 行业知识库管理 ──────────────────────────────────────────
admin.get("/knowledge", (c) => {
  const { industry, category } = c.req.query();

  let sql = "SELECT * FROM industry_knowledge WHERE 1=1";
  const params: string[] = [];

  if (industry) {
    sql += " AND industry = ?";
    params.push(industry);
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  sql += " ORDER BY industry, category, key";

  const items = db.prepare(sql).all(...params) as any[];

  return c.json({
    items,
    total: items.length,
    industries: ["furniture", "textile"],
    categories: ["price_range", "cert", "term", "template"],
  });
});

admin.post("/knowledge", async (c) => {
  const body = await c.req.json();
  const { industry, category, key, value, source = "seed" } = body;

  if (!industry || !category || !key || !value) {
    return c.json({ error: "industry, category, key, value 为必填项" }, 400);
  }

  const id = `kb-${nanoid(8)}`;
  db.prepare(`
    INSERT INTO industry_knowledge (id, industry, category, key, value, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, industry, category, key, value, source);

  return c.json({ id, industry, category, key, value, source }, 201);
});

admin.delete("/knowledge/:id", (c) => {
  const id = c.req.param("id");
  const item = db.prepare("SELECT id FROM industry_knowledge WHERE id = ?").get(id);
  if (!item) {
    return c.json({ error: "知识点不存在" }, 404);
  }
  db.prepare("DELETE FROM industry_knowledge WHERE id = ?").run(id);
  return c.json({ message: "已删除" });
});

// ─── 系统监控数据 ────────────────────────────────────────────
admin.get("/monitor", (c) => {
  const user = c.get("user");
  const today = new Date().toISOString().split("T")[0];

  // 系统健康
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const cpuLoad = os.loadavg()[0];
  const cpuPercent = Math.min(Math.round((cpuLoad / os.cpus().length) * 100), 100);

  // 业务指标
  const todayInquiries = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND received_at >= ?"
  ).get(user.tenantId, `${today}T00:00:00`) as any).c;

  const todayOps = (db.prepare(
    "SELECT COUNT(*) as c FROM agent_logs WHERE tenant_id = ? AND created_at >= ?"
  ).get(user.tenantId, `${today}T00:00:00`) as any).c;

  const todayCredits = (db.prepare(
    "SELECT COALESCE(SUM(credits_used), 0) as total FROM agent_logs WHERE tenant_id = ? AND created_at >= ?"
  ).get(user.tenantId, `${today}T00:00:00`) as any).total;

  const tenant = db.prepare("SELECT credits_balance FROM tenants WHERE id = ?").get(user.tenantId) as any;

  // OpenClaw 状态
  const openclaw = db.prepare(
    "SELECT * FROM openclaw_instances WHERE tenant_id = ? LIMIT 1"
  ).get(user.tenantId) as any;

  const socialAccounts = db.prepare(
    "SELECT platform, account_name, health_status, daily_ops_used, daily_ops_limit FROM social_accounts WHERE tenant_id = ?"
  ).all(user.tenantId) as any[];

  // 最近 10 条操作日志
  const recentLogs = db.prepare(`
    SELECT id, action_type, platform, status, credits_used, detail, created_at
    FROM agent_logs
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).all(user.tenantId) as any[];

  // AI 接口统计（模拟）
  const apiStats = {
    todayCalls: todayOps * 2,
    avgResponseMs: 850,
    successRate: 98.5,
  };

  // 信息流统计
  const feedStats = {
    total: (db.prepare("SELECT COUNT(*) as c FROM feed_items WHERE status = 'active'").get() as any).c,
    todayBookmarks: (db.prepare(
      "SELECT COUNT(*) as c FROM bookmarks WHERE tenant_id = ? AND created_at >= ?"
    ).get(user.tenantId, `${today}T00:00:00`) as any).c,
  };

  return c.json({
    system: {
      status: "online",
      version: "5.0.3",
      uptime: Math.floor(process.uptime()),
      memoryUsed: usedMemPercent,
      cpuUsed: cpuPercent,
      database: "SQLite (connected)",
    },
    business: {
      todayInquiries,
      todayOps,
      todayCredits,
      creditsBalance: tenant?.credits_balance ?? 0,
    },
    openclaw: openclaw
      ? {
          status: openclaw.status,
          opsToday: openclaw.ops_today,
          opsLimit: openclaw.ops_limit,
          lastHeartbeat: openclaw.last_heartbeat,
          accounts: socialAccounts,
        }
      : null,
    ai: apiStats,
    feed: feedStats,
    recentLogs: recentLogs.map((log) => ({
      ...log,
      detail: JSON.parse(log.detail ?? "{}"),
    })),
    timestamp: new Date().toISOString(),
  });
});

// ─── 信息流管理 ──────────────────────────────────────────────
admin.get("/feed", (c) => {
  const { status = "active", page = "1", limit = "20" } = c.req.query();
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const items = db.prepare(`
    SELECT * FROM feed_items
    WHERE status = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(status, parseInt(limit), offset) as any[];

  const total = (db.prepare(
    "SELECT COUNT(*) as c FROM feed_items WHERE status = ?"
  ).get(status) as any).c;

  return c.json({
    items: items.map((item) => ({
      ...item,
      ai_tags: JSON.parse(item.ai_tags ?? "[]"),
    })),
    total,
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

admin.patch("/feed/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { status } = body;

  if (!["active", "archived"].includes(status)) {
    return c.json({ error: "status 只能为 active 或 archived" }, 400);
  }

  const item = db.prepare("SELECT id FROM feed_items WHERE id = ?").get(id);
  if (!item) {
    return c.json({ error: "条目不存在" }, 404);
  }

  db.prepare("UPDATE feed_items SET status = ? WHERE id = ?").run(status, id);
  return c.json({ message: "已更新", id, status });
});

export default admin;
