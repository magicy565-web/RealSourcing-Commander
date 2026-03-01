/**
 * Commander 5.0 — OpenClaw 管理路由 (Phase 3 Sprint 3.1 — 故障自愈版)
 *
 * 新增功能（Sprint 3.1）：
 *   POST /api/v1/openclaw/report-failure  上报操作失败（连续失败自动休眠 + 飞书告警）
 *   POST /api/v1/openclaw/report-success  上报操作成功（重置失败计数）
 *   GET  /api/v1/openclaw/self-heal-status  查看自愈状态
 *
 * 自愈逻辑：
 *   连续失败 ≥ 3 次 → 进入 sleeping 状态，指数退避休眠
 *   休眠时长：3次=5min, 6次=15min, 9次+=60min
 *   心跳上报时自动检查 sleep_until，超时则恢复 online
 *   进入休眠时推送飞书告警卡片
 *
 * 原有接口（保持不变）：
 * GET  /api/v1/openclaw/status
 * GET  /api/v1/openclaw/logs
 * POST /api/v1/openclaw/heartbeat
 * POST /api/v1/openclaw/simulate-lead
 * POST /api/v1/openclaw/pause
 * POST /api/v1/openclaw/resume
 * PUT  /api/v1/openclaw/ops-limit
 * PUT  /api/v1/openclaw/account/:id/health
 * GET  /api/v1/openclaw/security-logs
 * GET  /api/v1/openclaw/work-hours
 * PUT  /api/v1/openclaw/work-hours
 * GET  /api/v1/openclaw/delay-config
 * PUT  /api/v1/openclaw/delay-config
 */
import { Hono } from "hono";
import db from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import type { JWTPayload } from "../middleware/auth.js";
import { pushInquiryNotification, sendFeishuCard } from "../services/feishu.js";

const openclaw = new Hono<{ Variables: { user: JWTPayload } }>();

// ─── 自愈常量 ─────────────────────────────────────────────────────────────────
const FAILURE_THRESHOLD = 3;       // 连续失败次数阈值
const SLEEP_DURATIONS_MS = [
  5  * 60 * 1000,   // 3~5次：5 分钟
  15 * 60 * 1000,   // 6~8次：15 分钟
  60 * 60 * 1000,   // 9次+：60 分钟
];

function getSleepDuration(consecutiveFailures: number): number {
  if (consecutiveFailures < 6) return SLEEP_DURATIONS_MS[0];
  if (consecutiveFailures < 9) return SLEEP_DURATIONS_MS[1];
  return SLEEP_DURATIONS_MS[2];
}

function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  return min >= 60 ? `${Math.round(min / 60)} 小时` : `${min} 分钟`;
}

// ─── 飞书自愈告警卡片 ─────────────────────────────────────────────────────────
function createSelfHealAlertCard(params: {
  instanceName: string;
  consecutiveFailures: number;
  sleepUntil: string;
  sleepDurationMs: number;
}) {
  return {
    msg_type: "interactive" as const,
    card: {
      config: { wide_screen_mode: { enable: true } },
      header: {
        title: { content: `⚠️ OpenClaw 故障自愈告警`, tag: "plain_text" as const },
        template: "red" as const,
      },
      elements: [
        {
          tag: "div",
          text: {
            content: `**实例**：${params.instanceName}\n**连续失败**：${params.consecutiveFailures} 次\n**自动休眠**：${formatDuration(params.sleepDurationMs)}\n**恢复时间**：${new Date(params.sleepUntil).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
            tag: "lark_md",
          },
        },
        {
          tag: "div",
          text: {
            content: `> 系统已自动进入保护性休眠，避免账号被封禁。休眠结束后将自动恢复运行。如需立即恢复，请在 Commander 控制台手动点击「恢复」。`,
            tag: "lark_md",
          },
        },
      ],
    },
  };
}

// ─── 心跳接口（不需要用户认证，OpenClaw 实例调用）────────────────────────────
openclaw.post("/heartbeat", async (c) => {
  const { instanceId, apiKey, status, opsToday } = await c.req.json();

  const instance = db.prepare(
    "SELECT * FROM openclaw_instances WHERE id = ? AND api_key = ?"
  ).get(instanceId, apiKey) as any;

  if (!instance) {
    return c.json({ error: "实例不存在或 API Key 无效" }, 401);
  }

  const now = new Date().toISOString();

  // ─── 自愈检查：若休眠期已过，自动恢复 online ─────────────────────────────
  let resolvedStatus = status ?? "online";
  if (instance.status === "sleeping" && instance.sleep_until) {
    if (new Date(instance.sleep_until) <= new Date()) {
      resolvedStatus = "online";
      db.prepare(`
        UPDATE openclaw_instances
        SET status = 'online', sleep_until = NULL, consecutive_failures = 0
        WHERE id = ?
      `).run(instanceId);

      // 记录自愈恢复日志
      db.prepare(`
        INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
        VALUES (lower(hex(randomblob(16))), ?, ?, 'self_heal_recovered', 'system', 'success', 0, ?, ?)
      `).run(
        instance.tenant_id, instanceId,
        JSON.stringify({ message: "休眠期结束，自动恢复 online" }),
        now
      );
    } else {
      // 仍在休眠期，忽略心跳状态更新
      return c.json({
        success: true,
        message: "实例正在休眠中",
        sleeping: true,
        sleep_until: instance.sleep_until,
      });
    }
  }

  db.prepare(`
    UPDATE openclaw_instances
    SET status = ?, last_heartbeat = ?, ops_today = ?
    WHERE id = ?
  `).run(resolvedStatus, now, opsToday ?? instance.ops_today, instanceId);

  // ─── Phase 6: 拉取待发送的老板审批回复 ──────────────────────────────────
  const pendingSends = db.prepare(`
    SELECT pa.id, pa.inquiry_id, pa.content_en, pa.content_zh,
           pa.platform, pa.buyer_name, pa.buyer_company
    FROM pending_approvals pa
    WHERE pa.tenant_id = ? AND pa.status = 'approved'
    LIMIT 10
  `).all(instance.tenant_id) as any[];

  // 将已拉取的审批回复标记为 sent（模拟 OpenClaw 成功发送）
  if (pendingSends.length > 0) {
    const sentNow = new Date().toISOString();
    const ids = pendingSends.map(() => '?').join(',');
    db.prepare(`
      UPDATE pending_approvals SET status='sent', sent_at=?, updated_at=? WHERE id IN (${ids})
    `).run(sentNow, sentNow, ...pendingSends.map((p: any) => p.id));

    // 同步更新 inquiry_replies 中对应记录的 send_status
    db.prepare(`
      UPDATE inquiry_replies SET send_status='sent', sent_at=? WHERE send_status='queued_for_send'
    `).run(sentNow);
  }

  // ─── Phase 6: 拉取待执行的老板指令任务 ─────────────────────────────────────
  const pendingTasks = db.prepare(`
    SELECT id, task_type, platform, target_info, context, steps
    FROM task_queue
    WHERE tenant_id = ? AND status = 'pending'
    ORDER BY created_at ASC LIMIT 5
  `).all(instance.tenant_id) as any[];

  return c.json({
    success: true,
    message: "心跳已记录",
    status: resolvedStatus,
    // Phase 6 扩展：OpenClaw 拉取待执行项
    pendingSends: pendingSends.map((p: any) => ({
      approvalId: p.id,
      inquiryId: p.inquiry_id,
      platform: p.platform,
      buyerName: p.buyer_name,
      contentEn: p.content_en,
      contentZh: p.content_zh,
    })),
    pendingTasks: pendingTasks.map((t: any) => ({
      taskId: t.id,
      taskType: t.task_type,
      platform: t.platform,
      targetInfo: (() => { try { return JSON.parse(t.target_info); } catch { return {}; } })(),
      context: (() => { try { return JSON.parse(t.context); } catch { return {}; } })(),
    })),
  });
});

// 以下接口需要认证
openclaw.use("*", authMiddleware);

// ─── 上报操作失败（自愈核心逻辑）────────────────────────────────────────────
openclaw.post("/report-failure", async (c) => {
  const user = c.get("user");
  const { reason, platform } = await c.req.json().catch(() => ({}));

  const instance = db.prepare(
    "SELECT * FROM openclaw_instances WHERE tenant_id = ?"
  ).get(user.tenantId) as any;

  if (!instance) return c.json({ error: "实例不存在" }, 404);
  if (instance.status === "sleeping") {
    return c.json({
      sleeping: true,
      sleep_until: instance.sleep_until,
      message: "实例正在休眠中，请等待自动恢复",
    });
  }

  const now = new Date().toISOString();
  const newFailures = (instance.consecutive_failures ?? 0) + 1;

  db.prepare(`
    UPDATE openclaw_instances
    SET consecutive_failures = ?, last_failure_at = ?
    WHERE id = ?
  `).run(newFailures, now, instance.id);

  // 记录失败日志
  db.prepare(`
    INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, 'operation_failed', ?, 'failed', 0, ?, ?)
  `).run(
    user.tenantId, instance.id,
    platform ?? "system",
    JSON.stringify({ reason: reason ?? "未知原因", consecutiveFailures: newFailures }),
    now
  );

  // 达到阈值 → 进入休眠
  if (newFailures >= FAILURE_THRESHOLD) {
    const sleepMs = getSleepDuration(newFailures);
    const sleepUntil = new Date(Date.now() + sleepMs).toISOString();

    db.prepare(`
      UPDATE openclaw_instances
      SET status = 'sleeping', sleep_until = ?
      WHERE id = ?
    `).run(sleepUntil, instance.id);

    // 记录休眠日志
    db.prepare(`
      INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, 'self_heal_sleeping', 'system', 'warning', 0, ?, ?)
    `).run(
      user.tenantId, instance.id,
      JSON.stringify({
        consecutiveFailures: newFailures,
        sleepDurationMs: sleepMs,
        sleepUntil,
        reason: reason ?? "连续失败超过阈值",
      }),
      now
    );

    // 推送飞书告警（异步，不阻塞响应）
    const tenant = db.prepare("SELECT feishu_webhook FROM tenants WHERE id = ?").get(user.tenantId) as any;
    if (tenant?.feishu_webhook) {
      const card = createSelfHealAlertCard({
        instanceName: instance.name,
        consecutiveFailures: newFailures,
        sleepUntil,
        sleepDurationMs: sleepMs,
      });
      sendFeishuCard(tenant.feishu_webhook, card).catch((e) =>
        console.error("飞书自愈告警发送失败:", e)
      );
    }

    return c.json({
      sleeping: true,
      consecutive_failures: newFailures,
      sleep_until: sleepUntil,
      sleep_duration: formatDuration(sleepMs),
      message: `连续失败 ${newFailures} 次，已进入保护性休眠 ${formatDuration(sleepMs)}`,
    });
  }

  return c.json({
    sleeping: false,
    consecutive_failures: newFailures,
    remaining_before_sleep: FAILURE_THRESHOLD - newFailures,
    message: `已记录失败（${newFailures}/${FAILURE_THRESHOLD}），再失败 ${FAILURE_THRESHOLD - newFailures} 次将触发休眠`,
  });
});

// ─── 上报操作成功（重置失败计数）────────────────────────────────────────────
openclaw.post("/report-success", (c) => {
  const user = c.get("user");

  const instance = db.prepare(
    "SELECT * FROM openclaw_instances WHERE tenant_id = ?"
  ).get(user.tenantId) as any;

  if (!instance) return c.json({ error: "实例不存在" }, 404);

  const prevFailures = instance.consecutive_failures ?? 0;
  if (prevFailures > 0) {
    db.prepare(`
      UPDATE openclaw_instances SET consecutive_failures = 0 WHERE id = ?
    `).run(instance.id);
  }

  return c.json({
    success: true,
    consecutive_failures: 0,
    message: prevFailures > 0 ? `连续失败计数已重置（原为 ${prevFailures}）` : "运行正常",
  });
});

// ─── 查看自愈状态 ─────────────────────────────────────────────────────────────
openclaw.get("/self-heal-status", (c) => {
  const user = c.get("user");

  const instance = db.prepare(
    "SELECT id, name, status, consecutive_failures, sleep_until, last_failure_at FROM openclaw_instances WHERE tenant_id = ?"
  ).get(user.tenantId) as any;

  if (!instance) return c.json({ error: "实例不存在" }, 404);

  const isSleeping = instance.status === "sleeping" && instance.sleep_until;
  const remainingMs = isSleeping
    ? Math.max(0, new Date(instance.sleep_until).getTime() - Date.now())
    : 0;

  return c.json({
    instanceId: instance.id,
    instanceName: instance.name,
    status: instance.status,
    consecutiveFailures: instance.consecutive_failures ?? 0,
    failureThreshold: FAILURE_THRESHOLD,
    sleeping: isSleeping,
    sleepUntil: instance.sleep_until ?? null,
    remainingMs,
    remainingFormatted: remainingMs > 0 ? formatDuration(remainingMs) : null,
    lastFailureAt: instance.last_failure_at ?? null,
  });
});

// ─── 实例状态 ─────────────────────────────────────────────────────────────────
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

  const config = safeParseJson(instance.config, {});

  // 自愈状态
  const isSleeping = instance.status === "sleeping" && instance.sleep_until;
  const remainingMs = isSleeping
    ? Math.max(0, new Date(instance.sleep_until).getTime() - Date.now())
    : 0;

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
      // 自愈字段
      consecutiveFailures: instance.consecutive_failures ?? 0,
      failureThreshold: FAILURE_THRESHOLD,
      sleeping: isSleeping,
      sleepUntil: instance.sleep_until ?? null,
      sleepRemainingMs: remainingMs,
    },
    accounts: accounts.map((a) => ({
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
    recentLogs: recentLogs.map((l) => ({
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

// ─── 操作日志 ─────────────────────────────────────────────────────────────────
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
    items: rows.map((l) => ({
      ...l,
      detail: safeParseJson(l.detail, {}),
    })),
  });
});

// ─── 模拟新询盘到达（演示用）─────────────────────────────────────────────────
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

  pushInquiryNotification({
    id,
    buyer_name: `Test Buyer ${Math.floor(Math.random() * 1000)}`,
    buyer_company: company,
    product_name: product,
    estimated_value: Math.floor(Math.random() * 100000) + 5000,
    confidence_score: score,
  }).catch((err) => console.error("Failed to push Feishu inquiry notification:", err));

  return c.json({
    success: true,
    message: `✅ 模拟询盘已创建：${company} (${country.name}) 询问 ${product}`,
    inquiryId: id,
    platform,
  });
});

// ─── M6 安全增强: 暂停实例 ────────────────────────────────────────────────────
openclaw.post("/pause", (c) => {
  const user = c.get("user");
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (!instance) return c.json({ error: "实例不存在" }, 404);

  db.prepare("UPDATE openclaw_instances SET status = 'paused' WHERE id = ?").run(instance.id);

  db.prepare(`
    INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, 'security_pause', 'system', 'success', 0, ?, ?)
  `).run(user.tenantId, instance.id, JSON.stringify({ reason: "manual_pause", operator: user.userId }), new Date().toISOString());

  return c.json({ success: true, status: "paused", message: "OpenClaw 已暂停" });
});

// ─── M6 安全增强: 恢复实例 ────────────────────────────────────────────────────
openclaw.post("/resume", (c) => {
  const user = c.get("user");
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (!instance) return c.json({ error: "实例不存在" }, 404);

  // 恢复时同时清除休眠状态和失败计数
  db.prepare(`
    UPDATE openclaw_instances
    SET status = 'online', sleep_until = NULL, consecutive_failures = 0
    WHERE id = ?
  `).run(instance.id);

  db.prepare(`
    INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, 'security_resume', 'system', 'success', 0, ?, ?)
  `).run(user.tenantId, instance.id, JSON.stringify({ operator: user.userId }), new Date().toISOString());

  return c.json({ success: true, status: "online", message: "OpenClaw 已恢复" });
});

// ─── M6 安全增强: 更新每日操作上限 ───────────────────────────────────────────
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

// ─── M6 安全增强: 更新账号健康状态 ───────────────────────────────────────────
openclaw.put("/account/:accountId/health", async (c) => {
  const user = c.get("user");
  const accountId = c.req.param("accountId");
  const { healthStatus } = await c.req.json();

  const validStatuses = ["normal", "warning", "suspended", "banned"];
  if (!validStatuses.includes(healthStatus)) {
    return c.json({ error: `healthStatus 必须是: ${validStatuses.join(", ")}` }, 400);
  }

  const account = db.prepare(`
    SELECT sa.* FROM social_accounts sa
    JOIN openclaw_instances oi ON sa.instance_id = oi.id
    WHERE sa.id = ? AND oi.tenant_id = ?
  `).get(accountId, user.tenantId) as any;

  if (!account) return c.json({ error: "账号不存在" }, 404);

  db.prepare("UPDATE social_accounts SET health_status = ? WHERE id = ?").run(healthStatus, accountId);

  if (healthStatus === "banned" || healthStatus === "suspended") {
    db.prepare("UPDATE social_accounts SET is_active = 0 WHERE id = ?").run(accountId);
  }

  return c.json({ success: true, healthStatus, message: `账号状态已更新为 ${healthStatus}` });
});

// ─── M6 安全增强: 安全事件日志 ───────────────────────────────────────────────
openclaw.get("/security-logs", (c) => {
  const user = c.get("user");

  const securityActions = [
    "security_pause", "security_resume", "ops_limit_update", "account_suspended",
    "self_heal_sleeping", "self_heal_recovered",
  ];
  const placeholders = securityActions.map(() => "?").join(",");

  const rows = db.prepare(`
    SELECT * FROM agent_logs
    WHERE tenant_id = ? AND action_type IN (${placeholders})
    ORDER BY created_at DESC
    LIMIT 50
  `).all(user.tenantId, ...securityActions) as any[];

  return c.json({
    items: rows.map((l) => ({
      ...l,
      detail: safeParseJson(l.detail, {}),
    })),
  });
});

// ─── M6 安全增强: 工作时间段设置 ─────────────────────────────────────────────
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

// ─── M6 随机延迟配置 GET/PUT ──────────────────────────────────────────────────
const DEFAULT_DELAY_CONFIG = {
  linkedin: { min: 3000, max: 8000 },
  whatsapp: { min: 2000, max: 5000 },
  facebook: { min: 4000, max: 10000 },
  email: { min: 1000, max: 3000 },
  readingPauseProbability: 0.05,
  readingPauseDuration: { min: 5000, max: 15000 },
};

openclaw.get("/delay-config", (c) => {
  const user = c.get("user");
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (!instance) return c.json({ delayConfig: DEFAULT_DELAY_CONFIG });
  const cfg = safeParseJson(instance.config, {});
  return c.json({ delayConfig: cfg.delayConfig ?? DEFAULT_DELAY_CONFIG });
});

openclaw.put("/delay-config", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const { linkedin, whatsapp, facebook, email, readingPauseProbability, readingPauseDuration } = body;

  for (const [platform, range] of Object.entries({ linkedin, whatsapp, facebook, email })) {
    if (range && typeof range === "object") {
      const r = range as any;
      if (r.min < 500 || r.max > 60000 || r.min > r.max) {
        return c.json({ error: `${platform} 延迟范围无效（min>=500ms, max<=60s, min<=max）` }, 400);
      }
    }
  }
  if (readingPauseProbability !== undefined && (readingPauseProbability < 0 || readingPauseProbability > 0.5)) {
    return c.json({ error: "阅读停顿概率范围 0-0.5" }, 400);
  }

  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (!instance) return c.json({ error: "实例不存在" }, 404);

  const existingConfig = safeParseJson(instance.config, {});
  const newDelayConfig = {
    ...DEFAULT_DELAY_CONFIG,
    ...(existingConfig.delayConfig ?? {}),
    ...(linkedin ? { linkedin } : {}),
    ...(whatsapp ? { whatsapp } : {}),
    ...(facebook ? { facebook } : {}),
    ...(email ? { email } : {}),
    ...(readingPauseProbability !== undefined ? { readingPauseProbability } : {}),
    ...(readingPauseDuration ? { readingPauseDuration } : {}),
  };
  const newConfig = { ...existingConfig, delayConfig: newDelayConfig };
  db.prepare("UPDATE openclaw_instances SET config = ? WHERE id = ?").run(JSON.stringify(newConfig), instance.id);

  db.prepare(`
    INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, 'delay_config_update', 'system', 'success', 0, ?, ?)
  `).run(
    user.tenantId, instance.id,
    JSON.stringify({ operator: user.userId, newDelayConfig }),
    new Date().toISOString()
  );

  return c.json({ success: true, delayConfig: newDelayConfig, message: "随机延迟配置已更新" });
});

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
function safeParseJson(str: string | null, fallback: any) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default openclaw;
