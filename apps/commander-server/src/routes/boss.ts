/**
 * Phase 6 — Boss Command Center
 * 老板指令中心：自然语言 → AI 结构化 → OpenClaw 任务队列
 *
 * POST /api/v1/boss/command          — 老板下达自然语言指令
 * GET  /api/v1/boss/commands         — 查看历史指令列表
 * GET  /api/v1/boss/commands/:id     — 查看指令详情
 * GET  /api/v1/boss/pending-approvals — 待审批回复草稿列表
 * POST /api/v1/boss/approvals/:id/approve — 批准草稿（触发 OpenClaw 自动发送）
 * POST /api/v1/boss/approvals/:id/reject  — 拒绝草稿
 * GET  /api/v1/boss/warroom          — 战报聚合数据（三模块）
 */

import { Hono } from "hono";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { chat } from "../services/ai.js";

const boss = new Hono();
boss.use("*", authMiddleware);

// ─── 确保 boss_commands 表存在 ────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS boss_commands (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    raw_input       TEXT NOT NULL,
    structured      TEXT DEFAULT '{}',
    status          TEXT DEFAULT 'queued',
    task_id         TEXT,
    result_summary  TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );
`);

// ─── 确保 pending_approvals 表存在 ────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS pending_approvals (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    inquiry_id      TEXT REFERENCES inquiries(id),
    reply_id        TEXT,
    content_en      TEXT NOT NULL,
    content_zh      TEXT,
    platform        TEXT,
    buyer_name      TEXT,
    buyer_company   TEXT,
    status          TEXT DEFAULT 'pending',
    approved_at     TEXT,
    rejected_at     TEXT,
    reject_reason   TEXT,
    sent_at         TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );
`);

// ─── 指令意图分类器 ──────────────────────────────────────────────
const INTENT_MAP: Record<string, {
  label: string;
  taskType: string;
  platform: string;
  description: string;
}> = {
  focus_market:   { label: "聚焦市场",   taskType: "market_focus",      platform: "all",       description: "调整 OpenClaw 优先抓取指定市场的买家消息" },
  reply_style:    { label: "回复风格",   taskType: "style_config",      platform: "all",       description: "调整 AI 回复草稿的语气和风格" },
  product_push:   { label: "产品推广",   taskType: "product_promotion",  platform: "facebook",  description: "在社媒平台重点推广指定产品" },
  followup:       { label: "跟进催单",   taskType: "followup_boost",    platform: "whatsapp",  description: "对指定阶段的询盘加强跟进频率" },
  pause:          { label: "暂停操作",   taskType: "pause_instance",    platform: "all",       description: "暂停 OpenClaw 的自动操作" },
  resume:         { label: "恢复操作",   taskType: "resume_instance",   platform: "all",       description: "恢复 OpenClaw 的自动操作" },
  report:         { label: "生成报告",   taskType: "generate_report",   platform: "feishu",    description: "立即生成并推送战报到飞书" },
  geo_expand:     { label: "开拓市场",   taskType: "geo_expansion",     platform: "all",       description: "向新的目标市场扩展询盘抓取" },
};

// ─── AI 结构化指令解析 ───────────────────────────────────────────
async function parseCommand(rawInput: string): Promise<{
  intent: string;
  params: Record<string, any>;
  confidence: number;
  humanReadable: string;
}> {
  const prompt = `你是一个外贸业务 AI 助手，负责将老板的自然语言指令解析为结构化任务。

可用意图类型：
${Object.entries(INTENT_MAP).map(([k, v]) => `- ${k}: ${v.description}`).join('\n')}

老板指令：「${rawInput}」

请以 JSON 格式返回（只返回 JSON，不要其他文字）：
{
  "intent": "意图类型（从上面列表选一个）",
  "params": {
    "region": "目标地区（如有）",
    "product": "产品名称（如有）",
    "platform": "平台（如有）",
    "style": "风格描述（如有）",
    "priority": "high/normal/low",
    "duration": "持续时间（如有，单位小时）",
    "extra": "其他补充信息"
  },
  "confidence": 0.95,
  "humanReadable": "用一句话描述这个指令的含义"
}`;

  try {
    const raw = await chat(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    // 规则引擎兜底
    const lower = rawInput.toLowerCase();
    let intent = "focus_market";
    const params: Record<string, any> = { priority: "normal" };

    if (lower.includes("暂停") || lower.includes("停止")) intent = "pause";
    else if (lower.includes("恢复") || lower.includes("继续")) intent = "resume";
    else if (lower.includes("报告") || lower.includes("战报")) intent = "report";
    else if (lower.includes("推广") || lower.includes("产品")) intent = "product_push";
    else if (lower.includes("跟进") || lower.includes("催")) intent = "followup";
    else if (lower.includes("欧洲") || lower.includes("美国") || lower.includes("中东") || lower.includes("东南亚")) {
      intent = "focus_market";
      const regions = ["欧洲", "美国", "中东", "东南亚", "非洲", "南美", "日本", "韩国"];
      params.region = regions.find(r => lower.includes(r)) ?? "全球";
    }

    return {
      intent,
      params,
      confidence: 0.7,
      humanReadable: `执行「${INTENT_MAP[intent]?.label ?? intent}」操作`,
    };
  }
}

// ─── POST /boss/command — 老板下达指令 ──────────────────────────
boss.post("/command", async (c) => {
  const { tenantId, userId } = c.get("user") as any;
  const body = await c.req.json();
  const rawInput: string = body.command ?? "";

  if (!rawInput.trim()) {
    return c.json({ error: "指令不能为空" }, 400);
  }

  const commandId = `cmd-${Date.now()}`;

  // 先写入数据库（状态 queued），立即返回
  db.prepare(`
    INSERT INTO boss_commands (id, tenant_id, user_id, raw_input, status)
    VALUES (?, ?, ?, ?, 'queued')
  `).run(commandId, tenantId, userId, rawInput);

  // 异步 AI 解析（不阻塞响应）
  setImmediate(async () => {
    try {
      const parsed = await parseCommand(rawInput);
      const intentConfig = INTENT_MAP[parsed.intent] ?? INTENT_MAP.focus_market;

      // 写入 task_queue
      const taskId = `task-${Date.now()}`;
      const steps = JSON.stringify([
        { step: 1, action: "解析指令", status: "done" },
        { step: 2, action: intentConfig.description, status: "pending" },
        { step: 3, action: "等待 OpenClaw 执行", status: "pending" },
      ]);

      db.prepare(`
        INSERT INTO task_queue (
          id, tenant_id, user_id, task_type, platform,
          target_info, context, steps, total_steps, status,
          estimated_ops, estimated_credits, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3, 'pending', ?, ?, datetime('now'), datetime('now'))
      `).run(
        taskId, tenantId, userId,
        intentConfig.taskType,
        parsed.params.platform ?? intentConfig.platform,
        JSON.stringify({ region: parsed.params.region, product: parsed.params.product }),
        JSON.stringify({ ...parsed.params, rawCommand: rawInput, humanReadable: parsed.humanReadable }),
        steps,
        5, 10
      );

      // 更新指令状态
      db.prepare(`
        UPDATE boss_commands
        SET structured=?, status='dispatched', task_id=?, updated_at=datetime('now')
        WHERE id=?
      `).run(JSON.stringify(parsed), taskId, commandId);

    } catch (err) {
      db.prepare(`
        UPDATE boss_commands SET status='failed', updated_at=datetime('now') WHERE id=?
      `).run(commandId);
    }
  });

  return c.json({
    success: true,
    commandId,
    message: "指令已接收，正在解析并分配给 OpenClaw...",
    status: "queued",
  }, 202);
});

// ─── GET /boss/commands — 历史指令列表 ──────────────────────────
boss.get("/commands", (c) => {
  const { tenantId } = c.get("user") as any;
  const limit = parseInt(c.req.query("limit") ?? "20");

  const commands = db.prepare(`
    SELECT * FROM boss_commands
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(tenantId, limit) as any[];

  return c.json({
    commands: commands.map(cmd => ({
      ...cmd,
      structured: (() => { try { return JSON.parse(cmd.structured); } catch { return {}; } })(),
    })),
    total: commands.length,
  });
});

// ─── GET /boss/commands/:id — 指令详情 ──────────────────────────
boss.get("/commands/:id", (c) => {
  const { tenantId } = c.get("user") as any;
  const { id } = c.req.param();

  const cmd = db.prepare(`
    SELECT * FROM boss_commands WHERE id=? AND tenant_id=?
  `).get(id, tenantId) as any;

  if (!cmd) return c.json({ error: "指令不存在" }, 404);

  let task = null;
  if (cmd.task_id) {
    task = db.prepare("SELECT * FROM task_queue WHERE id=?").get(cmd.task_id) as any;
    if (task) {
      try { task.steps = JSON.parse(task.steps); } catch { task.steps = []; }
      try { task.context = JSON.parse(task.context); } catch { task.context = {}; }
    }
  }

  return c.json({
    command: {
      ...cmd,
      structured: (() => { try { return JSON.parse(cmd.structured); } catch { return {}; } })(),
    },
    task,
  });
});

// ─── GET /boss/pending-approvals — 待审批草稿列表 ───────────────
boss.get("/pending-approvals", (c) => {
  const { tenantId } = c.get("user") as any;
  const status = c.req.query("status") ?? "pending";

  const approvals = db.prepare(`
    SELECT pa.*, i.buyer_name, i.buyer_company, i.buyer_country,
           i.product_name, i.estimated_value, i.confidence_score
    FROM pending_approvals pa
    LEFT JOIN inquiries i ON pa.inquiry_id = i.id
    WHERE pa.tenant_id = ? AND pa.status = ?
    ORDER BY pa.created_at DESC
    LIMIT 50
  `).all(tenantId, status) as any[];

  const total = (db.prepare(`
    SELECT COUNT(*) as c FROM pending_approvals WHERE tenant_id=? AND status='pending'
  `).get(tenantId) as any).c;

  return c.json({ approvals, pendingCount: total });
});

// ─── POST /boss/approvals/:id/approve — 批准草稿 ────────────────
boss.post("/approvals/:id/approve", (c) => {
  const { tenantId } = c.get("user") as any;
  const { id } = c.req.param();

  const approval = db.prepare(`
    SELECT * FROM pending_approvals WHERE id=? AND tenant_id=? AND status='pending'
  `).get(id, tenantId) as any;

  if (!approval) return c.json({ error: "审批记录不存在或已处理" }, 404);

  const now = new Date().toISOString();

  // 更新审批状态为 approved
  db.prepare(`
    UPDATE pending_approvals
    SET status='approved', approved_at=?, updated_at=?
    WHERE id=?
  `).run(now, now, id);

  // 将回复写入 inquiry_replies（send_status = 'queued_for_send'，等待 OpenClaw 拉取）
  const replyId = `reply-${Date.now()}`;
  db.prepare(`
    INSERT INTO inquiry_replies (id, inquiry_id, reply_type, content_en, content_zh, send_status, created_at)
    VALUES (?, ?, 'boss_approved', ?, ?, 'queued_for_send', datetime('now'))
  `).run(replyId, approval.inquiry_id, approval.content_en, approval.content_zh ?? "");

  // 更新询盘状态为 replied
  db.prepare(`
    UPDATE inquiries SET status='replied', updated_at=? WHERE id=?
  `).run(now, approval.inquiry_id);

  // 写入 agent_logs（OpenClaw 下次 heartbeat 会读取 queued_for_send 的回复并执行发送）
  db.prepare(`
    INSERT INTO agent_logs (id, tenant_id, action_type, platform, status, detail, created_at)
    VALUES (?, ?, 'boss_approved_reply', ?, 'pending', ?, datetime('now'))
  `).run(
    `log-${Date.now()}`, tenantId,
    approval.platform ?? "unknown",
    JSON.stringify({
      approvalId: id,
      replyId,
      inquiryId: approval.inquiry_id,
      buyerName: approval.buyer_name,
      contentEn: approval.content_en,
      trigger: "boss_approval",
    })
  );

  return c.json({
    success: true,
    message: "已批准，OpenClaw 将在下次心跳时自动发送",
    replyId,
    status: "queued_for_send",
    approvedAt: now,
  });
});

// ─── POST /boss/approvals/:id/reject — 拒绝草稿 ─────────────────
boss.post("/approvals/:id/reject", async (c) => {
  const { tenantId } = c.get("user") as any;
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({}));
  const reason: string = body.reason ?? "老板拒绝";

  const approval = db.prepare(`
    SELECT * FROM pending_approvals WHERE id=? AND tenant_id=? AND status='pending'
  `).get(id, tenantId) as any;

  if (!approval) return c.json({ error: "审批记录不存在或已处理" }, 404);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE pending_approvals
    SET status='rejected', rejected_at=?, reject_reason=?, updated_at=?
    WHERE id=?
  `).run(now, reason, now, id);

  return c.json({ success: true, message: "已拒绝", rejectedAt: now });
});

// ─── GET /boss/warroom — 战报聚合数据（三模块） ──────────────────
boss.get("/warroom", (c) => {
  const { tenantId } = c.get("user") as any;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(today);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay());

  // ── 模块1：今日待处理信号 ──
  const newInquiries = (db.prepare(`
    SELECT COUNT(*) as c FROM inquiries WHERE tenant_id=? AND received_at >= ?
  `).get(tenantId, todayStr) as any).c;

  const unread = (db.prepare(`
    SELECT COUNT(*) as c FROM inquiries WHERE tenant_id=? AND status='unread'
  `).get(tenantId) as any).c;

  const pendingApprovals = (db.prepare(`
    SELECT COUNT(*) as c FROM pending_approvals WHERE tenant_id=? AND status='pending'
  `).get(tenantId) as any).c;

  const newQuotations = (db.prepare(`
    SELECT COUNT(*) as c FROM quotations q
    JOIN inquiries i ON q.inquiry_id = i.id
    WHERE i.tenant_id=? AND q.created_at >= ?
  `).get(tenantId, todayStr) as any).c;

  // 最新 3 条待处理询盘
  const latestInquiries = db.prepare(`
    SELECT id, buyer_name, buyer_company, buyer_country, product_name,
           estimated_value, confidence_score, status, received_at
    FROM inquiries WHERE tenant_id=? AND status IN ('unread','reading')
    ORDER BY received_at DESC LIMIT 3
  `).all(tenantId) as any[];

  // ── 模块2：数字员工状态 ──
  const instance = db.prepare(`
    SELECT id, name, status, ops_today, ops_limit,
           last_heartbeat, consecutive_failures, sleep_until
    FROM openclaw_instances WHERE tenant_id=? LIMIT 1
  `).get(tenantId) as any;

  const accounts = db.prepare(`
    SELECT platform, health_status, daily_ops_used, daily_ops_limit
    FROM social_accounts WHERE tenant_id=? AND is_active=1
  `).all(tenantId) as any[];

  const todayTasks = db.prepare(`
    SELECT COUNT(*) as c FROM task_queue WHERE tenant_id=? AND created_at >= ?
  `).get(tenantId, todayStr) as any;

  const completedTasks = db.prepare(`
    SELECT COUNT(*) as c FROM task_queue WHERE tenant_id=? AND status='completed' AND created_at >= ?
  `).get(tenantId, todayStr) as any;

  const pendingCommands = db.prepare(`
    SELECT COUNT(*) as c FROM boss_commands WHERE tenant_id=? AND status IN ('queued','dispatched')
  `).get(tenantId) as any;

  // ── 模块3：经营周报对比 ──
  const calcWeekStats = (startStr: string, endStr: string) => {
    const inq = (db.prepare(`
      SELECT COUNT(*) as c FROM inquiries WHERE tenant_id=? AND received_at >= ? AND received_at < ?
    `).get(tenantId, startStr, endStr) as any).c;

    const replied = (db.prepare(`
      SELECT COUNT(*) as c FROM inquiries WHERE tenant_id=? AND status='replied'
      AND updated_at >= ? AND updated_at < ?
    `).get(tenantId, startStr, endStr) as any).c;

    const contracted = (db.prepare(`
      SELECT COUNT(*) as c, COALESCE(SUM(estimated_value),0) as v
      FROM inquiries WHERE tenant_id=? AND status='contracted'
      AND updated_at >= ? AND updated_at < ?
    `).get(tenantId, startStr, endStr) as any);

    const highValue = (db.prepare(`
      SELECT COUNT(*) as c FROM inquiries WHERE tenant_id=? AND confidence_score >= 80
      AND received_at >= ? AND received_at < ?
    `).get(tenantId, startStr, endStr) as any).c;

    return {
      inquiries: inq,
      replied,
      contracted: contracted.c,
      contractedValue: contracted.v,
      highValue,
      replyRate: inq > 0 ? Math.round((replied / inq) * 100) : 0,
    };
  };

  const lastWeekStats = calcWeekStats(lastWeekStart.toISOString(), lastWeekEnd.toISOString());
  const thisWeekStats = calcWeekStats(thisWeekStart.toISOString(), new Date().toISOString());

  // 增长率计算
  const growthRate = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return c.json({
    // 模块1：今日待处理
    signals: {
      newInquiries,
      unread,
      pendingApprovals,
      newQuotations,
      latestInquiries,
      hasUrgent: latestInquiries.some((i: any) => i.confidence_score >= 80),
    },
    // 模块2：数字员工状态
    agent: {
      instance: instance ? {
        id: instance.id,
        name: instance.name,
        status: instance.status,
        opsToday: instance.ops_today,
        opsLimit: instance.ops_limit,
        lastHeartbeat: instance.last_heartbeat,
        consecutiveFailures: instance.consecutive_failures ?? 0,
        sleepUntil: instance.sleep_until,
        utilizationRate: instance.ops_limit > 0
          ? Math.round((instance.ops_today / instance.ops_limit) * 100)
          : 0,
      } : null,
      accounts: accounts.map((a: any) => ({
        platform: a.platform,
        healthStatus: a.health_status,
        usageRate: a.daily_ops_limit > 0
          ? Math.round((a.daily_ops_used / a.daily_ops_limit) * 100)
          : 0,
      })),
      todayTasks: todayTasks.c,
      completedTasks: completedTasks.c,
      pendingCommands: pendingCommands.c,
    },
    // 模块3：经营周报对比
    weekReport: {
      lastWeek: lastWeekStats,
      thisWeek: thisWeekStats,
      growth: {
        inquiries: growthRate(thisWeekStats.inquiries, lastWeekStats.inquiries),
        replied: growthRate(thisWeekStats.replied, lastWeekStats.replied),
        contracted: growthRate(thisWeekStats.contracted, lastWeekStats.contracted),
        contractedValue: growthRate(thisWeekStats.contractedValue, lastWeekStats.contractedValue),
        highValue: growthRate(thisWeekStats.highValue, lastWeekStats.highValue),
      },
    },
  });
});

export default boss;
