/**
 * Commander 5.0 — 询盘管理路由
 *
 * GET    /api/v1/inquiries              列表（支持状态/渠道/分页筛选）
 * GET    /api/v1/inquiries/stats        统计数据（今日战报）
 * GET    /api/v1/inquiries/:id          详情
 * PATCH  /api/v1/inquiries/:id/status   更新状态
 * POST   /api/v1/inquiries/:id/quote    提交报价
 * POST   /api/v1/inquiries/:id/reply    提交回复（触发 AI 翻译）
 * POST   /api/v1/inquiries/:id/transfer 转人工
 * POST   /api/v1/inquiries              手动创建询盘（测试用）
 */
import { Hono } from "hono";
import db from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import OpenAI from "openai";

const inquiries = new Hono();
inquiries.use("*", authMiddleware);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
});

// ─── 列表 ─────────────────────────────────────────────────────
inquiries.get("/", (c) => {
  const user = c.get("user");
  const { status, platform, urgency, page = "1", limit = "20" } = c.req.query();

  let sql = "SELECT * FROM inquiries WHERE tenant_id = ?";
  const params: any[] = [user.tenantId];

  if (status) { sql += " AND status = ?"; params.push(status); }
  if (platform) { sql += " AND source_platform = ?"; params.push(platform); }
  if (urgency) { sql += " AND urgency = ?"; params.push(urgency); }

  sql += " ORDER BY received_at DESC";

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  sql += ` LIMIT ${limitNum} OFFSET ${(pageNum - 1) * limitNum}`;

  const rows = db.prepare(sql).all(...params) as any[];

  // 解析 JSON 字段
  const items = rows.map(parseInquiry);

  // 总数
  let countSql = "SELECT COUNT(*) as total FROM inquiries WHERE tenant_id = ?";
  const countParams: any[] = [user.tenantId];
  if (status) { countSql += " AND status = ?"; countParams.push(status); }
  if (platform) { countSql += " AND source_platform = ?"; countParams.push(platform); }
  const { total } = db.prepare(countSql).get(...countParams) as any;

  return c.json({ items, total, page: pageNum, limit: limitNum });
});

// ─── 统计数据（今日战报）──────────────────────────────────────
inquiries.get("/stats", (c) => {
  const user = c.get("user");
  const tenantId = user.tenantId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const totalToday = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND received_at >= ?"
  ).get(tenantId, todayStr) as any).c;

  const unread = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND status = 'unread'"
  ).get(tenantId) as any).c;

  const unquoted = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND status = 'unquoted'"
  ).get(tenantId) as any).c;

  const quoted = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND status = 'quoted'"
  ).get(tenantId) as any).c;

  const contracted = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND status = 'contracted'"
  ).get(tenantId) as any).c;

  const totalValue = (db.prepare(
    "SELECT COALESCE(SUM(estimated_value), 0) as v FROM inquiries WHERE tenant_id = ? AND received_at >= ?"
  ).get(tenantId, todayStr) as any).v;

  const totalAllValue = (db.prepare(
    "SELECT COALESCE(SUM(estimated_value), 0) as v FROM inquiries WHERE tenant_id = ?"
  ).get(tenantId) as any).v;

  // 渠道分布
  const channelDist = db.prepare(
    "SELECT source_platform, COUNT(*) as count FROM inquiries WHERE tenant_id = ? GROUP BY source_platform"
  ).all(tenantId) as any[];

  // OpenClaw 今日操作
  const tenant = db.prepare("SELECT * FROM tenants WHERE id = ?").get(tenantId) as any;
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(tenantId) as any;
  const agentLogsToday = (db.prepare(
    "SELECT COUNT(*) as c FROM agent_logs WHERE tenant_id = ? AND created_at >= ?"
  ).get(tenantId, todayStr) as any).c;

  const creditsUsedToday = (db.prepare(
    "SELECT COALESCE(SUM(credits_used), 0) as v FROM agent_logs WHERE tenant_id = ? AND created_at >= ?"
  ).get(tenantId, todayStr) as any).v;

  return c.json({
    today: {
      newInquiries: totalToday,
      totalValue,
      agentOps: agentLogsToday,
      creditsUsed: creditsUsedToday,
    },
    pipeline: {
      unread,
      unquoted,
      quoted,
      contracted,
      total: unread + unquoted + quoted + contracted,
    },
    totalAllTime: {
      inquiries: (db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ?").get(tenantId) as any).c,
      value: totalAllValue,
    },
    channelDistribution: channelDist,
    credits: {
      balance: tenant?.credits_balance ?? 0,
      usedToday: creditsUsedToday,
    },
    openclaw: instance ? {
      status: instance.status,
      opsToday: instance.ops_today,
      opsLimit: instance.ops_limit,
      lastHeartbeat: instance.last_heartbeat,
    } : null,
  });
});

// ─── 详情 ─────────────────────────────────────────────────────
inquiries.get("/:id", (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const row = db.prepare(
    "SELECT * FROM inquiries WHERE id = ? AND tenant_id = ?"
  ).get(id, user.tenantId) as any;

  if (!row) return c.json({ error: "询盘不存在" }, 404);

  // 标记为已读
  if (row.status === "unread") {
    db.prepare("UPDATE inquiries SET status = 'unquoted', updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), id);
    row.status = "unquoted";
  }

  // 获取报价记录
  const quotation = db.prepare(
    "SELECT * FROM quotations WHERE inquiry_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(id) as any;

  // 获取回复记录
  const replies = db.prepare(
    "SELECT * FROM inquiry_replies WHERE inquiry_id = ? ORDER BY created_at ASC"
  ).all(id) as any[];

  return c.json({
    ...parseInquiry(row),
    quotation: quotation ?? null,
    replies,
  });
});

// ─── 更新状态 ─────────────────────────────────────────────────
inquiries.patch("/:id/status", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const { status } = await c.req.json();

  const validStatuses = ["unread", "unquoted", "quoted", "no_reply", "transferred", "contracted", "expired"];
  if (!validStatuses.includes(status)) {
    return c.json({ error: "无效的状态值" }, 400);
  }

  const row = db.prepare(
    "SELECT * FROM inquiries WHERE id = ? AND tenant_id = ?"
  ).get(id, user.tenantId) as any;
  if (!row) return c.json({ error: "询盘不存在" }, 404);

  db.prepare("UPDATE inquiries SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, new Date().toISOString(), id);

  return c.json({ success: true, status });
});

// ─── 提交报价 ─────────────────────────────────────────────────
inquiries.post("/:id/quote", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await c.req.json();

  const row = db.prepare(
    "SELECT * FROM inquiries WHERE id = ? AND tenant_id = ?"
  ).get(id, user.tenantId) as any;
  if (!row) return c.json({ error: "询盘不存在" }, 404);

  const quotationId = `quot-${Date.now()}`;
  db.prepare(`
    INSERT INTO quotations (id, inquiry_id, tenant_id, product_name, unit_price, currency, unit, price_term, min_order, delivery_days, validity_days, followup_style, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
  `).run(
    quotationId, id, user.tenantId,
    body.productName ?? row.product_name,
    body.unitPrice, body.currency ?? "USD",
    body.unit ?? "件", body.priceTerm ?? "FOB",
    body.minOrder ?? 1, body.deliveryDays ?? 30,
    body.validityDays ?? 30, body.followupStyle ?? "business"
  );

  // 更新询盘状态为已报价
  db.prepare("UPDATE inquiries SET status = 'quoted', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);

  // 扣减积分
  const creditsUsed = 5;
  db.prepare("UPDATE tenants SET credits_balance = credits_balance - ? WHERE id = ?")
    .run(creditsUsed, user.tenantId);
  const tenant = db.prepare("SELECT credits_balance FROM tenants WHERE id = ?").get(user.tenantId) as any;
  db.prepare(`
    INSERT INTO credit_ledger (id, tenant_id, type, amount, balance_after, description, task_id)
    VALUES (lower(hex(randomblob(16))), ?, 'task_deduct', ?, ?, ?, ?)
  `).run(user.tenantId, -creditsUsed, tenant.credits_balance, `报价发送 - ${row.product_name}`, id);

  return c.json({ success: true, quotationId });
});

// ─── 提交回复（AI 翻译 + 模拟 OpenClaw 发送）────────────────────
inquiries.post("/:id/reply", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const { contentZh, quotationId, useAiDraft } = await c.req.json();

  const row = db.prepare(
    "SELECT * FROM inquiries WHERE id = ? AND tenant_id = ?"
  ).get(id, user.tenantId) as any;
  if (!row) return c.json({ error: "询盘不存在" }, 404);

  let contentEn = "";

  if (useAiDraft) {
    // 直接使用 AI 预生成的英文草稿
    contentEn = row.ai_draft_en ?? "";
  } else {
    // 调用 AI 翻译中文回复
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "你是一个专业的外贸回复翻译助手。将中文外贸回复翻译成专业的英文商务邮件格式。保持语气专业、友好，符合国际贸易习惯。只返回翻译后的英文内容，不要加任何解释。",
          },
          {
            role: "user",
            content: `买家来自 ${row.buyer_country}，询盘产品：${row.product_name}。\n\n请翻译以下中文回复：\n\n${contentZh}`,
          },
        ],
        max_tokens: 800,
      });
      contentEn = completion.choices[0].message.content ?? "";
    } catch (err) {
      // AI 翻译失败时使用预设草稿
      contentEn = row.ai_draft_en ?? "[翻译失败，请手动填写英文内容]";
    }
  }

  const replyId = `reply-${Date.now()}`;
  db.prepare(`
    INSERT INTO inquiry_replies (id, inquiry_id, quotation_id, reply_type, content_zh, content_en, send_status, sent_at)
    VALUES (?, ?, ?, 'human_confirmed', ?, ?, 'sent', ?)
  `).run(replyId, id, quotationId ?? null, contentZh, contentEn, new Date().toISOString());

  // 更新询盘状态
  db.prepare("UPDATE inquiries SET status = 'quoted', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);

  // 模拟 OpenClaw 发送记录
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (instance) {
    db.prepare(`
      INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 'success', 5, ?, ?)
    `).run(
      user.tenantId, instance.id,
      `${row.source_platform}_message_sent`,
      row.source_platform,
      JSON.stringify({ to: row.buyer_name, preview: contentEn.slice(0, 100) }),
      new Date().toISOString()
    );
    db.prepare("UPDATE openclaw_instances SET ops_today = ops_today + 1 WHERE id = ?")
      .run(instance.id);
  }

  // 扣减积分
  const creditsUsed = 5;
  db.prepare("UPDATE tenants SET credits_balance = credits_balance - ? WHERE id = ?")
    .run(creditsUsed, user.tenantId);
  const tenant = db.prepare("SELECT credits_balance FROM tenants WHERE id = ?").get(user.tenantId) as any;
  db.prepare(`
    INSERT INTO credit_ledger (id, tenant_id, type, amount, balance_after, description)
    VALUES (lower(hex(randomblob(16))), ?, 'task_deduct', ?, ?, ?)
  `).run(user.tenantId, -creditsUsed, tenant.credits_balance, `回复发送 - ${row.buyer_name}`);

  return c.json({
    success: true,
    replyId,
    contentEn,
    creditsUsed,
  });
});

// ─── 转人工 ───────────────────────────────────────────────────
inquiries.post("/:id/transfer", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const { assignedTo, note } = await c.req.json();

  db.prepare(
    "UPDATE inquiries SET status = 'transferred', assigned_to = ?, transfer_note = ?, updated_at = ? WHERE id = ? AND tenant_id = ?"
  ).run(assignedTo ?? "业务员", note ?? "", new Date().toISOString(), id, user.tenantId);

  return c.json({ success: true });
});

// ─── 手动创建询盘（测试/演示用）──────────────────────────────────
inquiries.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();

  const id = `inq-${Date.now()}`;
  db.prepare(`
    INSERT INTO inquiries (
      id, tenant_id, source_platform, buyer_name, buyer_company, buyer_country,
      buyer_contact, product_name, quantity, raw_content, estimated_value,
      confidence_score, status, urgency, tags, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?, '[]', ?)
  `).run(
    id, user.tenantId,
    body.sourcePlatform ?? "custom",
    body.buyerName ?? "未知买家",
    body.buyerCompany ?? "",
    body.buyerCountry ?? "",
    body.buyerContact ?? null,
    body.productName ?? "未知产品",
    body.quantity ?? null,
    body.rawContent ?? "",
    body.estimatedValue ?? 0,
    body.confidenceScore ?? 50,
    body.urgency ?? "normal",
    new Date().toISOString()
  );

  return c.json({ success: true, id }, 201);
});

// ─── 工具函数 ─────────────────────────────────────────────────
function parseInquiry(row: any) {
  return {
    ...row,
    confidence_breakdown: safeParseJson(row.confidence_breakdown, {}),
    tags: safeParseJson(row.tags, []),
  };
}

function safeParseJson(str: string | null, fallback: any) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default inquiries;
