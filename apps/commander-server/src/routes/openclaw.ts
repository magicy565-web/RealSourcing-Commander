/**
 * Commander 5.0 — OpenClaw 管理路由
 *
 * GET  /api/v1/openclaw/status          实例状态 + 社媒账号
 * GET  /api/v1/openclaw/logs            操作日志
 * POST /api/v1/openclaw/heartbeat       心跳上报（OpenClaw 调用）
 * POST /api/v1/openclaw/simulate-lead   模拟新询盘到达（演示用）
 *
 * Phase 3 M6 — 安全增强:
 * POST /api/v1/openclaw/pause           暂停实例
 * POST /api/v1/openclaw/resume          恢复实例
 * PUT  /api/v1/openclaw/ops-limit       更新每日操作上限
 * PUT  /api/v1/openclaw/account/:id/health  更新账号健康状态
 * GET  /api/v1/openclaw/security-logs   安全事件日志
 * GET  /api/v1/openclaw/work-hours      获取工作时间段
 * PUT  /api/v1/openclaw/work-hours      设置工作时间段
 */
import { Hono } from "hono";
import db from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { pushInquiryNotification } from "../services/feishu.js";

const openclaw = new Hono();

// 心跳接口不需要用户认证（OpenClaw 实例调用）
openclaw.post("/heartbeat", async (c) => {
  const { instanceId, apiKey, status, opsToday } = await c.req.json();

  const instance = db.prepare(
    "SELECT * FROM openclaw_instances WHERE id = ? AND api_key = ?"
  ).get(instanceId, apiKey) as any;

  if (!instance) {
    return c.json({ error: "实例不存在或 API Key 无效" }, 401);
  }

  db.prepare(`
    UPDATE openclaw_instances
    SET status = ?, last_heartbeat = ?, ops_today = ?
    WHERE id = ?
  `).run(status ?? "online", new Date().toISOString(), opsToday ?? instance.ops_today, instanceId);

  return c.json({ success: true, message: "心跳已记录" });
});

// 以下接口需要认证
openclaw.use("*", authMiddleware);

// ─── 实例状态 ─────────────────────────────────────────────────
openclaw.get("/status", (c) => {
  const user = c.get("user");

  const instance = db.prepare(
    "SELECT * FROM openclaw_instances WHERE tenant_id = ?"
  ).get(user.tenantId) as any;

  if (!instance) {
    return c.json({ instance: null, accounts: [], recentLogs: [] });
  }

  const accounts = db.prepare(
    "SELECT * FROM social_accounts WHERE instance_id = ? AND is_active = 1"
  ).all(instance.id) as any[];

  const recentLogs = db.prepare(`
    SELECT * FROM agent_logs
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(user.tenantId) as any[];

  // 今日操作统计
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const todayStats = db.prepare(`
    SELECT
      COUNT(*) as total_ops,
      COALESCE(SUM(credits_used), 0) as credits_used,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as fail_count
    FROM agent_logs
    WHERE tenant_id = ? AND created_at >= ?
  `).get(user.tenantId, todayStr) as any;

  // 读取工作时间段配置
  const config = safeParseJson(instance.config, {});

  return c.json({
    instance: {
      id: instance.id,
      name: instance.name,
      status: instance.status,
      lastHeartbeat: instance.last_heartbeat,
      opsToday: instance.ops_today,
      opsLimit: instance.ops_limit,
      opsPercent: Math.round((instance.ops_today / instance.ops_limit) * 100),
      workHours: config.workHours ?? null,
    },
    accounts: accounts.map(a => ({
      id: a.id,
      platform: a.platform,
      accountName: a.account_name,
      healthStatus: a.health_status,
      dailyOpsUsed: a.daily_ops_used,
      dailyOpsLimit: a.daily_ops_limit,
      opsPercent: Math.round((a.daily_ops_used / a.daily_ops_limit) * 100),
    })),
    todayStats: {
      totalOps: todayStats.total_ops,
      creditsUsed: todayStats.credits_used,
      successCount: todayStats.success_count,
      failCount: todayStats.fail_count,
    },
    recentLogs: recentLogs.map(l => ({
      id: l.id,
      actionType: l.action_type,
      platform: l.platform,
      status: l.status,
      creditsUsed: l.credits_used,
      detail: safeParseJson(l.detail, {}),
      createdAt: l.created_at,
    })),
  });
});

// ─── 操作日志 ─────────────────────────────────────────────────
openclaw.get("/logs", (c) => {
  const user = c.get("user");
  const { platform, status, page = "1", limit = "30" } = c.req.query();

  let sql = "SELECT * FROM agent_logs WHERE tenant_id = ?";
  const params: any[] = [user.tenantId];

  if (platform) { sql += " AND platform = ?"; params.push(platform); }
  if (status) { sql += " AND status = ?"; params.push(status); }

  sql += " ORDER BY created_at DESC";
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  sql += ` LIMIT ${limitNum} OFFSET ${(pageNum - 1) * limitNum}`;

  const rows = db.prepare(sql).all(...params) as any[];

  return c.json({
    items: rows.map(l => ({
      ...l,
      detail: safeParseJson(l.detail, {}),
    })),
  });
});

// ─── 模拟新询盘到达（演示用）──────────────────────────────────
openclaw.post("/simulate-lead", async (c) => {
  const user = c.get("user");

  const platforms = ["linkedin", "facebook", "alibaba", "tiktok", "whatsapp", "geo"];
  const countries = [
    { name: "美国", flag: "🇺🇸" },
    { name: "德国", flag: "🇩🇪" },
    { name: "英国", flag: "🇬🇧" },
    { name: "澳大利亚", flag: "🇦🇺" },
    { name: "巴西", flag: "🇧🇷" },
    { name: "日本", flag: "🇯🇵" },
  ];
  const products = ["LED 灯具", "太阳能板", "户外家具", "建材配件", "电子元件", "纺织品"];
  const companies = ["Global Trade Co", "Pacific Imports", "Euro Sourcing Ltd", "Asia Pacific LLC"];

  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  const country = countries[Math.floor(Math.random() * countries.length)];
  const product = products[Math.floor(Math.random() * products.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const score = Math.floor(Math.random() * 60) + 30;

  const id = `inq-sim-${Date.now()}`;
  db.prepare(`
    INSERT INTO inquiries (
      id, tenant_id, source_platform, buyer_name, buyer_company, buyer_country,
      product_name, raw_content, ai_summary,
      estimated_value, confidence_score, confidence_breakdown,
      status, urgency, tags, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?, '[]', ?)
  `).run(
    id, user.tenantId, platform,
    `Test Buyer ${Math.floor(Math.random() * 1000)}`,
    company, country.name, product,
    `Hi, we are interested in your ${product}. Please send us your best price and MOQ.`,
    `${country.name}买家询问 ${product}，需要报价和 MOQ`,
    Math.floor(Math.random() * 100000) + 5000,
    score,
    JSON.stringify({
      channelWeight: Math.floor(score * 0.35),
      contentQuality: Math.floor(score * 0.35),
      buyerCompleteness: Math.floor(score * 0.30),
    }),
    score > 70 ? "high" : score > 50 ? "normal" : "low",
    new Date().toISOString()
  );

  // 记录 Agent 操作
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (instance) {
    db.prepare(`
      INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 'success', 2, ?, ?)
    `).run(
      user.tenantId, instance.id,
      `${platform}_lead_captured`, platform,
      JSON.stringify({ inquiryId: id, company, product }),
      new Date().toISOString()
    );
  }

  // 推送飞书通知
  pushInquiryNotification({
    id,
    buyer_name: `Test Buyer ${Math.floor(Math.random() * 1000)}`,
    buyer_company: company,
    product_name: product,
    estimated_value: Math.floor(Math.random() * 100000) + 5000,
    confidence_score: score,
  }).catch(err => console.error("Failed to push Feishu inquiry notification:", err));

  return c.json({
    success: true,
    message: `✅ 模拟询盘已创建：${company} (${country.name}) 询问 ${product}`,
    inquiryId: id,
    platform,
  });
});

// ─── M6 安全增强: 暂停实例 ────────────────────────────────────
openclaw.post("/pause", (c) => {
  const user = c.get("user");
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (!instance) return c.json({ error: "实例不存在" }, 404);

  db.prepare("UPDATE openclaw_instances SET status = 'paused' WHERE id = ?").run(instance.id);

  // 记录安全事件
  db.prepare(`
    INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, 'security_pause', 'system', 'success', 0, ?, ?)
  `).run(user.tenantId, instance.id, JSON.stringify({ reason: 'manual_pause', operator: user.userId }), new Date().toISOString());

  return c.json({ success: true, status: "paused", message: "OpenClaw 已暂停" });
});

// ─── M6 安全增强: 恢复实例 ────────────────────────────────────
openclaw.post("/resume", (c) => {
  const user = c.get("user");
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (!instance) return c.json({ error: "实例不存在" }, 404);

  db.prepare("UPDATE openclaw_instances SET status = 'online' WHERE id = ?").run(instance.id);

  db.prepare(`
    INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, 'security_resume', 'system', 'success', 0, ?, ?)
  `).run(user.tenantId, instance.id, JSON.stringify({ operator: user.userId }), new Date().toISOString());

  return c.json({ success: true, status: "online", message: "OpenClaw 已恢复" });
});

// ─── M6 安全增强: 更新每日操作上限 ───────────────────────────
openclaw.put("/ops-limit", async (c) => {
  const user = c.get("user");
  const { opsLimit } = await c.req.json();

  if (!opsLimit || opsLimit < 1 || opsLimit > 500) {
    return c.json({ error: "ops_limit 必须在 1-500 之间" }, 400);
  }

  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (!instance) return c.json({ error: "实例不存在" }, 404);

  db.prepare("UPDATE openclaw_instances SET ops_limit = ? WHERE id = ?").run(opsLimit, instance.id);

  db.prepare(`
    INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, 'ops_limit_update', 'system', 'success', 0, ?, ?)
  `).run(user.tenantId, instance.id, JSON.stringify({ oldLimit: instance.ops_limit, newLimit: opsLimit }), new Date().toISOString());

  return c.json({ success: true, opsLimit, message: `每日操作上限已更新为 ${opsLimit}` });
});

// ─── M6 安全增强: 更新账号健康状态 ───────────────────────────
openclaw.put("/account/:accountId/health", async (c) => {
  const user = c.get("user");
  const accountId = c.req.param("accountId");
  const { healthStatus } = await c.req.json();

  const validStatuses = ["healthy", "warning", "suspended", "banned"];
  if (!validStatuses.includes(healthStatus)) {
    return c.json({ error: `healthStatus 必须是: ${validStatuses.join(", ")}` }, 400);
  }

  // 验证账号属于该租户
  const account = db.prepare(`
    SELECT sa.* FROM social_accounts sa
    JOIN openclaw_instances oi ON sa.instance_id = oi.id
    WHERE sa.id = ? AND oi.tenant_id = ?
  `).get(accountId, user.tenantId) as any;

  if (!account) return c.json({ error: "账号不存在" }, 404);

  db.prepare("UPDATE social_accounts SET health_status = ? WHERE id = ?").run(healthStatus, accountId);

  // 如果账号被封禁或暂停，自动停用
  if (healthStatus === "banned" || healthStatus === "suspended") {
    db.prepare("UPDATE social_accounts SET is_active = 0 WHERE id = ?").run(accountId);
  }

  return c.json({ success: true, healthStatus, message: `账号状态已更新为 ${healthStatus}` });
});

// ─── M6 安全增强: 安全事件日志 ───────────────────────────────
openclaw.get("/security-logs", (c) => {
  const user = c.get("user");

  const securityActions = ["security_pause", "security_resume", "ops_limit_update", "account_suspended"];
  const placeholders = securityActions.map(() => "?").join(",");

  const rows = db.prepare(`
    SELECT * FROM agent_logs
    WHERE tenant_id = ? AND action_type IN (${placeholders})
    ORDER BY created_at DESC
    LIMIT 50
  `).all(user.tenantId, ...securityActions) as any[];

  return c.json({
    items: rows.map(l => ({
      ...l,
      detail: safeParseJson(l.detail, {}),
    })),
  });
});

// ─── M6 安全增强: 工作时间段设置 ─────────────────────────────
openclaw.get("/work-hours", (c) => {
  const user = c.get("user");
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (!instance) return c.json({ workHours: null });

  const config = safeParseJson(instance.config, {});
  return c.json({
    workHours: config.workHours ?? {
      startHour: 8,
      endHour: 22,
      timezone: "Asia/Shanghai",
      weekdays: [1, 2, 3, 4, 5],
    },
  });
});

openclaw.put("/work-hours", async (c) => {
  const user = c.get("user");
  const { startHour, endHour, timezone, weekdays } = await c.req.json();

  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
    return c.json({ error: "时间范围无效（0-23）" }, 400);
  }

  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (!instance) return c.json({ error: "实例不存在" }, 404);

  const existingConfig = safeParseJson(instance.config, {});
  const newConfig = {
    ...existingConfig,
    workHours: {
      startHour,
      endHour,
      timezone: timezone ?? "Asia/Shanghai",
      weekdays: weekdays ?? [1, 2, 3, 4, 5],
    },
  };

  db.prepare("UPDATE openclaw_instances SET config = ? WHERE id = ?").run(JSON.stringify(newConfig), instance.id);

  return c.json({ success: true, workHours: newConfig.workHours, message: "工作时间段已更新" });
});

function safeParseJson(str: string | null, fallback: any) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default openclaw;
