/**
 * Commander 5.0 — Web 管理端仪表板路由
 *
 * GET /api/v1/dashboard/overview    总览数据
 * GET /api/v1/dashboard/credits     积分流水
 * GET /api/v1/dashboard/report      每日战报
 */
import { Hono } from "hono";
import db from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";

const dashboard = new Hono();
dashboard.use("*", authMiddleware);

// ─── 总览 ─────────────────────────────────────────────────────
dashboard.get("/overview", (c) => {
  const user = c.get("user");
  const tenantId = user.tenantId;

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(now);
  week.setDate(week.getDate() - 7);
  const month = new Date(now);
  month.setDate(1);
  month.setHours(0, 0, 0, 0);

  // 询盘统计
  const inquiryStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN received_at >= ? THEN 1 ELSE 0 END) as today,
      SUM(CASE WHEN received_at >= ? THEN 1 ELSE 0 END) as this_week,
      SUM(CASE WHEN received_at >= ? THEN 1 ELSE 0 END) as this_month,
      SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread,
      SUM(CASE WHEN status = 'unquoted' THEN 1 ELSE 0 END) as unquoted,
      SUM(CASE WHEN status = 'quoted' THEN 1 ELSE 0 END) as quoted,
      SUM(CASE WHEN status = 'contracted' THEN 1 ELSE 0 END) as contracted,
      SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
      COALESCE(SUM(estimated_value), 0) as total_value,
      COALESCE(SUM(CASE WHEN received_at >= ? THEN estimated_value ELSE 0 END), 0) as month_value
    FROM inquiries WHERE tenant_id = ?
  `).get(today.toISOString(), week.toISOString(), month.toISOString(), month.toISOString(), tenantId) as any;

  // 渠道分布（近30天）
  const thirtyDays = new Date(now);
  thirtyDays.setDate(thirtyDays.getDate() - 30);
  const channelDist = db.prepare(`
    SELECT source_platform as platform, COUNT(*) as count,
           COALESCE(SUM(estimated_value), 0) as value
    FROM inquiries
    WHERE tenant_id = ? AND received_at >= ?
    GROUP BY source_platform
    ORDER BY count DESC
  `).all(tenantId, thirtyDays.toISOString()) as any[];

  // 近7天每日询盘趋势
  const dailyTrend: any[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const count = (db.prepare(
      "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND received_at >= ? AND received_at < ?"
    ).get(tenantId, d.toISOString(), nextD.toISOString()) as any).c;
    dailyTrend.push({
      date: d.toISOString().slice(0, 10),
      count,
    });
  }

  // 置信度分布
  const confidenceDist = db.prepare(`
    SELECT
      SUM(CASE WHEN confidence_score >= 80 THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN confidence_score >= 50 AND confidence_score < 80 THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN confidence_score < 50 THEN 1 ELSE 0 END) as low
    FROM inquiries WHERE tenant_id = ?
  `).get(tenantId) as any;

  // 租户信息
  const tenant = db.prepare("SELECT * FROM tenants WHERE id = ?").get(tenantId) as any;
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(tenantId) as any;

  // 社媒账号状态
  const accounts = instance
    ? db.prepare("SELECT * FROM social_accounts WHERE instance_id = ? AND is_active = 1").all(instance.id) as any[]
    : [];

  return c.json({
    tenant: {
      name: tenant?.name,
      planType: tenant?.plan_type,
      creditsBalance: tenant?.credits_balance ?? 0,
    },
    inquiries: inquiryStats,
    channelDistribution: channelDist,
    dailyTrend,
    confidenceDistribution: confidenceDist,
    openclaw: instance ? {
      status: instance.status,
      opsToday: instance.ops_today,
      opsLimit: instance.ops_limit,
      lastHeartbeat: instance.last_heartbeat,
    } : null,
    socialAccounts: accounts.map(a => ({
      platform: a.platform,
      accountName: a.account_name,
      healthStatus: a.health_status,
      dailyOpsUsed: a.daily_ops_used,
      dailyOpsLimit: a.daily_ops_limit,
    })),
  });
});

// ─── 积分流水 ─────────────────────────────────────────────────
dashboard.get("/credits", (c) => {
  const user = c.get("user");
  const { page = "1", limit = "30" } = c.req.query();

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));

  const rows = db.prepare(`
    SELECT * FROM credit_ledger
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(user.tenantId, limitNum, (pageNum - 1) * limitNum) as any[];

  const tenant = db.prepare("SELECT credits_balance FROM tenants WHERE id = ?").get(user.tenantId) as any;

  return c.json({
    balance: tenant?.credits_balance ?? 0,
    items: rows,
  });
});

// ─── 每日战报 ─────────────────────────────────────────────────
dashboard.get("/report", (c) => {
  const user = c.get("user");
  const tenantId = user.tenantId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const newInquiries = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND received_at >= ?"
  ).get(tenantId, todayStr) as any).c;

  const replied = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiry_replies WHERE inquiry_id IN (SELECT id FROM inquiries WHERE tenant_id = ?) AND created_at >= ?"
  ).get(tenantId, todayStr) as any).c;

  const totalValue = (db.prepare(
    "SELECT COALESCE(SUM(estimated_value), 0) as v FROM inquiries WHERE tenant_id = ? AND received_at >= ?"
  ).get(tenantId, todayStr) as any).v;

  const agentOps = (db.prepare(
    "SELECT COUNT(*) as c FROM agent_logs WHERE tenant_id = ? AND created_at >= ?"
  ).get(tenantId, todayStr) as any).c;

  const creditsUsed = (db.prepare(
    "SELECT COALESCE(SUM(credits_used), 0) as v FROM agent_logs WHERE tenant_id = ? AND created_at >= ?"
  ).get(tenantId, todayStr) as any).v;

  // 平台分布
  const platformBreakdown = db.prepare(`
    SELECT platform, COUNT(*) as count
    FROM agent_logs
    WHERE tenant_id = ? AND created_at >= ?
    GROUP BY platform
  `).all(tenantId, todayStr) as any[];

  return c.json({
    date: today.toISOString().slice(0, 10),
    newInquiries,
    replied,
    totalValue,
    agentOps,
    creditsUsed,
    platformBreakdown,
  });
});

export default dashboard;

// ─── Phase 5: 成交漏斗 ────────────────────────────────────────
dashboard.get("/funnel", (c) => {
  const { tenantId } = c.get("user") as any;

  const stages = [
    { key: "unread", label: "新询盘", color: "#6366f1" },
    { key: "unquoted", label: "待报价", color: "#f59e0b" },
    { key: "quoted", label: "已报价", color: "#3b82f6" },
    { key: "no_reply", label: "待跟进", color: "#f97316" },
    { key: "contracted", label: "已成交", color: "#10b981" },
    { key: "transferred", label: "已转人工", color: "#64748b" },
    { key: "expired", label: "已过期", color: "#ef4444" },
  ];

  const counts = db.prepare(`
    SELECT status, COUNT(*) as count, SUM(estimated_value) as value
    FROM inquiries WHERE tenant_id = ? GROUP BY status
  `).all(tenantId) as any[];

  const countMap: Record<string, { count: number; value: number }> = {};
  for (const row of counts) countMap[row.status] = { count: row.count, value: row.value ?? 0 };

  const total = Object.values(countMap).reduce((s, v) => s + v.count, 0);
  const funnelData = stages.map(stage => ({
    ...stage,
    count: countMap[stage.key]?.count ?? 0,
    value: countMap[stage.key]?.value ?? 0,
    percentage: total > 0 ? Math.round(((countMap[stage.key]?.count ?? 0) / total) * 100) : 0,
  }));

  const contracted = countMap["contracted"]?.count ?? 0;
  const quoted = countMap["quoted"]?.count ?? 0;

  return c.json({
    funnel: funnelData,
    conversionRates: {
      inquiryToQuote: total > 0 ? Math.round(((quoted + contracted) / total) * 100) : 0,
      quoteToContract: (quoted + contracted) > 0 ? Math.round((contracted / (quoted + contracted)) * 100) : 0,
      overallConversion: total > 0 ? Math.round((contracted / total) * 100) : 0,
    },
    totalInquiries: total,
    totalDealValue: countMap["contracted"]?.value ?? 0,
  });
});

// ─── Phase 5: 手动触发飞书每日战报推送 ───────────────────────────
dashboard.post("/daily-report/push", async (c) => {
  const { tenantId } = c.get("user") as any;
  try {
    const { pushDailyReport } = await import("../services/dailyReport.js");
    await pushDailyReport(tenantId);
    return c.json({ success: true, message: "战报已推送到飞书" });
  } catch (e: any) {
    return c.json({ error: "推送失败", message: e.message }, 500);
  }
});
