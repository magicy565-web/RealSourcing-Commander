/**
 * Phase 5 — Sprint 5.3
 * 多账号 OpenClaw 协同管理路由
 *
 * GET  /api/v1/multi-account/instances              所有实例列表（含账号）
 * POST /api/v1/multi-account/instances              注册新实例
 * GET  /api/v1/multi-account/instances/:id          单实例详情
 * PATCH /api/v1/multi-account/instances/:id/status  更新实例状态
 * DELETE /api/v1/multi-account/instances/:id        删除实例
 * POST /api/v1/multi-account/instances/:id/accounts 为实例绑定新账号
 * PATCH /api/v1/multi-account/accounts/:id/health   更新账号健康状态
 * POST /api/v1/multi-account/route-task             智能任务路由（选择最优实例）
 * GET  /api/v1/multi-account/health                 所有实例健康总览
 * POST /api/v1/multi-account/circuit-breaker/:id    触发熔断（暂停问题实例）
 */
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { db } from "../db/index.js";

const multiAccount = new Hono();
multiAccount.use("*", authMiddleware);

function safeJson(v: any, fallback: any = {}) {
  if (!v) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

// ─── 确保多实例支持表（扩展 openclaw_instances）────────────────
function ensureMultiAccountTables() {
  // 为 openclaw_instances 添加 Phase 5 字段
  const cols = (db.prepare("PRAGMA table_info(openclaw_instances)").all() as any[]).map(c => c.name);
  if (!cols.includes("circuit_breaker_enabled")) {
    db.exec(`ALTER TABLE openclaw_instances ADD COLUMN circuit_breaker_enabled INTEGER DEFAULT 1`);
  }
  if (!cols.includes("circuit_breaker_threshold")) {
    db.exec(`ALTER TABLE openclaw_instances ADD COLUMN circuit_breaker_threshold INTEGER DEFAULT 3`);
  }
  if (!cols.includes("priority")) {
    db.exec(`ALTER TABLE openclaw_instances ADD COLUMN priority INTEGER DEFAULT 1`);
  }
  if (!cols.includes("proxy_url")) {
    db.exec(`ALTER TABLE openclaw_instances ADD COLUMN proxy_url TEXT`);
  }
  if (!cols.includes("mode")) {
    db.exec(`ALTER TABLE openclaw_instances ADD COLUMN mode TEXT DEFAULT 'local'`);
  }
  if (!cols.includes("tags")) {
    db.exec(`ALTER TABLE openclaw_instances ADD COLUMN tags TEXT DEFAULT '[]'`);
  }
}
ensureMultiAccountTables();

// ─── 辅助：格式化实例数据 ─────────────────────────────────────
function formatInstance(inst: any, accounts: any[] = []) {
  const isSleeping = inst.sleep_until && new Date(inst.sleep_until) > new Date();
  const effectiveStatus = isSleeping ? "sleeping" : inst.status;

  return {
    id: inst.id,
    name: inst.name,
    status: effectiveStatus,
    mode: inst.mode ?? "local",
    priority: inst.priority ?? 1,
    apiEndpoint: inst.api_endpoint,
    opsToday: inst.ops_today ?? 0,
    opsLimit: inst.ops_limit ?? 200,
    opsPercent: Math.round(((inst.ops_today ?? 0) / (inst.ops_limit ?? 200)) * 100),
    consecutiveFailures: inst.consecutive_failures ?? 0,
    sleepUntil: isSleeping ? inst.sleep_until : null,
    lastHeartbeat: inst.last_heartbeat,
    circuitBreakerEnabled: !!inst.circuit_breaker_enabled,
    circuitBreakerThreshold: inst.circuit_breaker_threshold ?? 3,
    proxyUrl: inst.proxy_url,
    tags: safeJson(inst.tags, []),
    config: safeJson(inst.config, {}),
    createdAt: inst.created_at,
    accounts: accounts.map(acc => ({
      id: acc.id,
      platform: acc.platform,
      accountName: acc.account_name,
      healthStatus: acc.health_status,
      dailyOpsUsed: acc.daily_ops_used,
      dailyOpsLimit: acc.daily_ops_limit,
      isActive: !!acc.is_active,
    })),
    accountCount: accounts.length,
    healthyAccounts: accounts.filter(a => a.health_status === "normal" && a.is_active).length,
  };
}

// ─── GET /instances — 所有实例列表 ────────────────────────────────
multiAccount.get("/instances", (c) => {
  const { tenantId } = c.get("user") as any;

  const instances = db.prepare(`
    SELECT * FROM openclaw_instances WHERE tenant_id = ? ORDER BY priority DESC, created_at ASC
  `).all(tenantId) as any[];

  const result = instances.map(inst => {
    const accounts = db.prepare(
      "SELECT * FROM social_accounts WHERE instance_id = ? AND is_active = 1"
    ).all(inst.id) as any[];
    return formatInstance(inst, accounts);
  });

  // 汇总统计
  const summary = {
    total: result.length,
    online: result.filter(i => i.status === "online").length,
    sleeping: result.filter(i => i.status === "sleeping").length,
    offline: result.filter(i => i.status === "offline").length,
    paused: result.filter(i => i.status === "paused").length,
    totalAccounts: result.reduce((s, i) => s + i.accountCount, 0),
    totalOpsToday: result.reduce((s, i) => s + i.opsToday, 0),
  };

  return c.json({ instances: result, summary });
});

// ─── POST /instances — 注册新实例 ────────────────────────────────
multiAccount.post("/instances", async (c) => {
  const { tenantId } = c.get("user") as any;
  const body = await c.req.json();
  const { name, apiEndpoint, apiKey, mode = "local", priority = 1, proxyUrl, tags = [] } = body;

  if (!name) return c.json({ error: "name 为必填项" }, 400);

  const id = `inst-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO openclaw_instances
      (id, tenant_id, name, api_endpoint, api_key, status, ops_today, ops_limit,
       mode, priority, proxy_url, tags, circuit_breaker_enabled, circuit_breaker_threshold, created_at)
    VALUES (?,?,?,?,?,'offline',0,200,?,?,?,?,1,3,?)
  `).run(id, tenantId, name, apiEndpoint ?? null, apiKey ?? null,
    mode, priority, proxyUrl ?? null, JSON.stringify(tags), now);

  const inst = db.prepare("SELECT * FROM openclaw_instances WHERE id = ?").get(id) as any;
  return c.json({ success: true, instance: formatInstance(inst, []) }, 201);
});

// ─── GET /instances/:id — 单实例详情 ─────────────────────────────
multiAccount.get("/instances/:id", (c) => {
  const { tenantId } = c.get("user") as any;
  const instId = c.req.param("id");

  const inst = db.prepare(
    "SELECT * FROM openclaw_instances WHERE id = ? AND tenant_id = ?"
  ).get(instId, tenantId) as any;
  if (!inst) return c.json({ error: "实例不存在" }, 404);

  const accounts = db.prepare(
    "SELECT * FROM social_accounts WHERE instance_id = ?"
  ).all(instId) as any[];

  // 近期日志
  const logs = db.prepare(`
    SELECT * FROM agent_logs WHERE instance_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(instId) as any[];

  // 今日统计
  const today = new Date().toISOString().split("T")[0];
  const todayStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(credits_used) as credits
    FROM agent_logs WHERE instance_id = ? AND created_at >= ?
  `).get(instId, today + "T00:00:00") as any;

  return c.json({
    instance: formatInstance(inst, accounts),
    logs: logs.map(l => ({ ...l, detail: (() => { try { return JSON.parse(l.detail); } catch { return {}; } })() })),
    todayStats: {
      totalOps: todayStats?.total ?? 0,
      successCount: todayStats?.success ?? 0,
      failCount: todayStats?.failed ?? 0,
      creditsUsed: todayStats?.credits ?? 0,
    },
  });
});

// ─── PATCH /instances/:id/status — 更新实例状态 ──────────────────
multiAccount.patch("/instances/:id/status", async (c) => {
  const { tenantId } = c.get("user") as any;
  const instId = c.req.param("id");
  const { status } = await c.req.json();

  const validStatuses = ["online", "offline", "paused", "sleeping"];
  if (!validStatuses.includes(status)) {
    return c.json({ error: `status 必须是: ${validStatuses.join(", ")}` }, 400);
  }

  const inst = db.prepare(
    "SELECT * FROM openclaw_instances WHERE id = ? AND tenant_id = ?"
  ).get(instId, tenantId) as any;
  if (!inst) return c.json({ error: "实例不存在" }, 404);

  const updates: any = { status };
  if (status === "online") {
    updates.consecutive_failures = 0;
    updates.sleep_until = null;
  }

  db.prepare(`
    UPDATE openclaw_instances SET status = ?,
      consecutive_failures = CASE WHEN ? = 'online' THEN 0 ELSE consecutive_failures END,
      sleep_until = CASE WHEN ? = 'online' THEN NULL ELSE sleep_until END
    WHERE id = ?
  `).run(status, status, status, instId);

  return c.json({ success: true, status });
});

// ─── DELETE /instances/:id — 删除实例 ────────────────────────────
multiAccount.delete("/instances/:id", (c) => {
  const { tenantId } = c.get("user") as any;
  const instId = c.req.param("id");

  const inst = db.prepare(
    "SELECT * FROM openclaw_instances WHERE id = ? AND tenant_id = ?"
  ).get(instId, tenantId) as any;
  if (!inst) return c.json({ error: "实例不存在" }, 404);

  // 软删除：将状态设为 offline，不真正删除（保留日志）
  db.prepare("UPDATE openclaw_instances SET status = 'offline', name = ? WHERE id = ?")
    .run(`[已删除] ${inst.name}`, instId);
  db.prepare("UPDATE social_accounts SET is_active = 0 WHERE instance_id = ?").run(instId);

  return c.json({ success: true });
});

// ─── POST /instances/:id/accounts — 为实例绑定新账号 ─────────────
multiAccount.post("/instances/:id/accounts", async (c) => {
  const { tenantId } = c.get("user") as any;
  const instId = c.req.param("id");
  const { platform, accountName, accountType = "personal", dailyOpsLimit = 50 } = await c.req.json();

  if (!platform || !accountName) {
    return c.json({ error: "platform 和 accountName 为必填项" }, 400);
  }

  const inst = db.prepare(
    "SELECT id FROM openclaw_instances WHERE id = ? AND tenant_id = ?"
  ).get(instId, tenantId) as any;
  if (!inst) return c.json({ error: "实例不存在" }, 404);

  const accId = `acc-${Date.now()}`;
  db.prepare(`
    INSERT INTO social_accounts
      (id, instance_id, tenant_id, platform, account_name, account_type,
       health_status, daily_ops_used, daily_ops_limit, is_active)
    VALUES (?,?,?,?,?,?,'normal',0,?,1)
  `).run(accId, instId, tenantId, platform, accountName, accountType, dailyOpsLimit);

  return c.json({ success: true, accountId: accId }, 201);
});

// ─── PATCH /accounts/:id/health — 更新账号健康状态 ───────────────
multiAccount.patch("/accounts/:id/health", async (c) => {
  const { tenantId } = c.get("user") as any;
  const accId = c.req.param("id");
  const { healthStatus } = await c.req.json();

  const validStatuses = ["normal", "warning", "suspended", "banned"];
  if (!validStatuses.includes(healthStatus)) {
    return c.json({ error: `healthStatus 必须是: ${validStatuses.join(", ")}` }, 400);
  }

  const acc = db.prepare(`
    SELECT sa.* FROM social_accounts sa
    JOIN openclaw_instances oi ON sa.instance_id = oi.id
    WHERE sa.id = ? AND oi.tenant_id = ?
  `).get(accId, tenantId) as any;
  if (!acc) return c.json({ error: "账号不存在" }, 404);

  db.prepare("UPDATE social_accounts SET health_status = ? WHERE id = ?").run(healthStatus, accId);

  // 如果封号/暂停，停用该账号
  if (healthStatus === "banned" || healthStatus === "suspended") {
    db.prepare("UPDATE social_accounts SET is_active = 0 WHERE id = ?").run(accId);
  }

  return c.json({ success: true, healthStatus });
});

// ─── POST /route-task — 智能任务路由 ─────────────────────────────
multiAccount.post("/route-task", async (c) => {
  const { tenantId } = c.get("user") as any;
  const { platform, taskType, priority = 1 } = await c.req.json();

  if (!platform) return c.json({ error: "platform 为必填项" }, 400);

  // 查找所有在线实例，找到有对应平台账号且健康的实例
  const candidates = db.prepare(`
    SELECT oi.*, sa.id as acc_id, sa.account_name, sa.daily_ops_used, sa.daily_ops_limit, sa.health_status
    FROM openclaw_instances oi
    JOIN social_accounts sa ON sa.instance_id = oi.id
    WHERE oi.tenant_id = ?
      AND oi.status = 'online'
      AND sa.platform = ?
      AND sa.health_status = 'normal'
      AND sa.is_active = 1
      AND sa.daily_ops_used < sa.daily_ops_limit
      AND (oi.sleep_until IS NULL OR oi.sleep_until < datetime('now'))
    ORDER BY oi.priority DESC, sa.daily_ops_used ASC
  `).all(tenantId, platform) as any[];

  if (candidates.length === 0) {
    return c.json({
      success: false,
      error: "没有可用的实例处理该任务",
      reason: "所有实例均不可用或已达操作上限",
    }, 503);
  }

  // 选择最优候选（优先级最高 + 操作数最少）
  const selected = candidates[0];

  // 记录路由决策日志
  db.prepare(`
    INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, 'task_routed', ?, 'success', 0, ?, ?)
  `).run(
    tenantId, selected.id, platform,
    JSON.stringify({ taskType, accountId: selected.acc_id, accountName: selected.account_name }),
    new Date().toISOString()
  );

  return c.json({
    success: true,
    routedTo: {
      instanceId: selected.id,
      instanceName: selected.name,
      accountId: selected.acc_id,
      accountName: selected.account_name,
      platform,
      opsRemaining: selected.daily_ops_limit - selected.daily_ops_used,
    },
    alternativeCount: candidates.length - 1,
  });
});

// ─── GET /health — 所有实例健康总览 ──────────────────────────────
multiAccount.get("/health", (c) => {
  const { tenantId } = c.get("user") as any;

  const instances = db.prepare(`
    SELECT * FROM openclaw_instances WHERE tenant_id = ? ORDER BY priority DESC
  `).all(tenantId) as any[];

  const healthReport = instances.map(inst => {
    const isSleeping = inst.sleep_until && new Date(inst.sleep_until) > new Date();
    const effectiveStatus = isSleeping ? "sleeping" : inst.status;

    const accounts = db.prepare(`
      SELECT platform, health_status, daily_ops_used, daily_ops_limit, is_active
      FROM social_accounts WHERE instance_id = ?
    `).all(inst.id) as any[];

    const hasWarning = accounts.some(a => a.health_status === "warning");
    const hasBanned = accounts.some(a => a.health_status === "banned");
    const overloadedAccounts = accounts.filter(a => a.daily_ops_used >= a.daily_ops_limit * 0.9);

    let healthLevel: "healthy" | "warning" | "critical" = "healthy";
    if (hasBanned || effectiveStatus === "offline") healthLevel = "critical";
    else if (hasWarning || inst.consecutive_failures >= 2 || overloadedAccounts.length > 0) healthLevel = "warning";

    return {
      instanceId: inst.id,
      instanceName: inst.name,
      status: effectiveStatus,
      healthLevel,
      consecutiveFailures: inst.consecutive_failures ?? 0,
      opsUsagePercent: Math.round(((inst.ops_today ?? 0) / (inst.ops_limit ?? 200)) * 100),
      accountHealth: {
        total: accounts.length,
        normal: accounts.filter(a => a.health_status === "normal").length,
        warning: accounts.filter(a => a.health_status === "warning").length,
        banned: accounts.filter(a => a.health_status === "banned").length,
      },
      alerts: [
        ...(hasBanned ? ["有账号已被封禁"] : []),
        ...(hasWarning ? ["有账号处于警告状态"] : []),
        ...(inst.consecutive_failures >= 2 ? [`连续失败 ${inst.consecutive_failures} 次`] : []),
        ...(overloadedAccounts.length > 0 ? [`${overloadedAccounts.length} 个账号接近操作上限`] : []),
        ...(isSleeping ? [`实例休眠中，恢复时间: ${new Date(inst.sleep_until).toLocaleString("zh-CN")}`] : []),
      ],
    };
  });

  const overallHealth = healthReport.every(h => h.healthLevel === "healthy")
    ? "healthy"
    : healthReport.some(h => h.healthLevel === "critical")
      ? "critical"
      : "warning";

  return c.json({
    overallHealth,
    instances: healthReport,
    summary: {
      total: healthReport.length,
      healthy: healthReport.filter(h => h.healthLevel === "healthy").length,
      warning: healthReport.filter(h => h.healthLevel === "warning").length,
      critical: healthReport.filter(h => h.healthLevel === "critical").length,
    },
  });
});

// ─── POST /circuit-breaker/:id — 触发熔断 ────────────────────────
multiAccount.post("/circuit-breaker/:id", async (c) => {
  const { tenantId } = c.get("user") as any;
  const instId = c.req.param("id");
  const { action, reason, sleepMinutes = 30 } = await c.req.json();

  const inst = db.prepare(
    "SELECT * FROM openclaw_instances WHERE id = ? AND tenant_id = ?"
  ).get(instId, tenantId) as any;
  if (!inst) return c.json({ error: "实例不存在" }, 404);

  if (action === "trigger") {
    // 触发熔断：暂停实例
    const sleepUntil = new Date(Date.now() + sleepMinutes * 60 * 1000).toISOString();
    db.prepare(`
      UPDATE openclaw_instances SET status = 'sleeping', sleep_until = ? WHERE id = ?
    `).run(sleepUntil, instId);

    db.prepare(`
      INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, 'circuit_breaker_triggered', 'system', 'success', 0, ?, ?)
    `).run(
      tenantId, instId,
      JSON.stringify({ reason: reason ?? "手动触发熔断", sleepMinutes, sleepUntil }),
      new Date().toISOString()
    );

    return c.json({ success: true, action: "triggered", sleepUntil, message: `实例已熔断，将于 ${sleepMinutes} 分钟后自动恢复` });

  } else if (action === "reset") {
    // 重置熔断：恢复实例
    db.prepare(`
      UPDATE openclaw_instances SET status = 'online', sleep_until = NULL, consecutive_failures = 0 WHERE id = ?
    `).run(instId);

    return c.json({ success: true, action: "reset", message: "熔断已重置，实例已恢复在线" });
  }

  return c.json({ error: "action 必须是 trigger 或 reset" }, 400);
});

export default multiAccount;
