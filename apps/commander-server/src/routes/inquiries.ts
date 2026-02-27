/**
 * Commander 5.0 — 询盘管理路由（接入真实 AI）
 *
 * GET    /api/v1/inquiries              列表（支持状态/渠道/分页筛选）
 * GET    /api/v1/inquiries/stats        统计数据（今日战报）
 * GET    /api/v1/inquiries/:id          详情
 * PATCH  /api/v1/inquiries/:id/status   更新状态
 * POST   /api/v1/inquiries/:id/quote    提交报价
 * POST   /api/v1/inquiries/:id/reply    提交回复（AI 翻译）
 * POST   /api/v1/inquiries/:id/transfer 转人工
 * POST   /api/v1/inquiries/:id/ai-draft 重新生成 AI 草稿（真实 AI）
 * POST   /api/v1/inquiries              手动创建询盘（AI 自动分析）
 */
import { Hono } from "hono";
import db from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { generateInquiryDraft, generateFollowupDraft } from "../services/ai.js";

const inquiries = new Hono();
inquiries.use("*", authMiddleware);

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
  const items = rows.map(parseInquiry);

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

  const channelDist = db.prepare(
    "SELECT source_platform, COUNT(*) as count FROM inquiries WHERE tenant_id = ? GROUP BY source_platform"
  ).all(tenantId) as any[];

  const tenant = db.prepare("SELECT * FROM tenants WHERE id = ?").get(tenantId) as any;
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(tenantId) as any;
  const agentLogsToday = (db.prepare(
    "SELECT COUNT(*) as c FROM agent_logs WHERE tenant_id = ? AND created_at >= ?"
  ).get(tenantId, todayStr) as any).c;

  const creditsUsedToday = (db.prepare(
    "SELECT COALESCE(SUM(credits_used), 0) as v FROM agent_logs WHERE tenant_id = ? AND created_at >= ?"
  ).get(tenantId, todayStr) as any).v;

  // 任务队列统计
  let taskStats = { pending: 0, running: 0, completed: 0 };
  try {
    taskStats = db.prepare(`
      SELECT
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
      FROM task_queue WHERE tenant_id=?
    `).get(tenantId) as any ?? taskStats;
  } catch { /* task_queue 表可能还未创建 */ }

  // 风格档案状态
  let hasStyleProfile = false;
  try {
    const profile = db.prepare("SELECT id FROM style_profiles WHERE tenant_id=?").get(tenantId);
    hasStyleProfile = !!profile;
  } catch { /* style_profiles 表可能还未创建 */ }

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
    taskQueue: taskStats,
    ai: {
      hasStyleProfile,
      model: process.env.DASHSCOPE_MODEL ?? "qwen-plus",
    },
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

  if (row.status === "unread") {
    db.prepare("UPDATE inquiries SET status = 'unquoted', updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), id);
    row.status = "unquoted";
  }

  const quotation = db.prepare(
    "SELECT * FROM quotations WHERE inquiry_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(id) as any;

  const replies = db.prepare(
    "SELECT * FROM inquiry_replies WHERE inquiry_id = ? ORDER BY created_at ASC"
  ).all(id) as any[];

  return c.json({
    ...parseInquiry(row),
    quotation: quotation ?? null,
    replies,
  });
});

// ─── 重新生成 AI 草稿（真实 AI）──────────────────────────────
inquiries.post("/:id/ai-draft", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();

  const row = db.prepare(
    "SELECT * FROM inquiries WHERE id = ? AND tenant_id = ?"
  ).get(id, user.tenantId) as any;
  if (!row) return c.json({ error: "询盘不存在" }, 404);

  // 获取用户风格档案
  let styleProfile: string | undefined;
  try {
    const profile = db.prepare(
      "SELECT summary FROM style_profiles WHERE tenant_id=?"
    ).get(user.tenantId) as any;
    styleProfile = profile?.summary;
  } catch { /* 忽略 */ }

  // 获取租户信息
  const tenant = db.prepare("SELECT name FROM tenants WHERE id=?").get(user.tenantId) as any;

  try {
    const result = await generateInquiryDraft({
      rawContent: row.raw_content ?? "",
      buyerName: row.buyer_name ?? "",
      buyerCompany: row.buyer_company ?? "",
      buyerCountry: row.buyer_country ?? "",
      productName: row.product_name ?? "",
      quantity: row.quantity ?? undefined,
      platform: row.source_platform ?? "custom",
      styleProfile,
      tenantName: tenant?.name,
    });

    // 更新数据库
    db.prepare(`
      UPDATE inquiries SET
        ai_summary=?, ai_draft_cn=?, ai_draft_en=?, ai_analysis=?,
        confidence_score=?, confidence_breakdown=?, urgency=?, tags=?,
        estimated_value=?, updated_at=?
      WHERE id=?
    `).run(
      result.summary, result.draftCn, result.draftEn, result.analysis,
      result.confidenceScore, JSON.stringify(result.confidenceBreakdown),
      result.urgency, JSON.stringify(result.tags),
      result.estimatedValue, new Date().toISOString(), id
    );

    // 扣积分（AI 生成消耗 3 积分）
    const creditsUsed = 3;
    db.prepare("UPDATE tenants SET credits_balance = credits_balance - ? WHERE id = ?")
      .run(creditsUsed, user.tenantId);
    const updatedTenant = db.prepare("SELECT credits_balance FROM tenants WHERE id = ?").get(user.tenantId) as any;
    db.prepare(`
      INSERT INTO credit_ledger (id, tenant_id, type, amount, balance_after, description, task_id)
      VALUES (lower(hex(randomblob(16))), ?, 'ai_draft', ?, ?, ?, ?)
    `).run(user.tenantId, -creditsUsed, updatedTenant.credits_balance, `AI 重新生成草稿 - ${row.product_name}`, id);

    return c.json({
      success: true,
      creditsUsed,
      draft: result,
      styleUsed: !!styleProfile,
    });
  } catch (err: any) {
    console.error("AI 草稿生成失败:", err);
    return c.json({ error: "AI 草稿生成失败，请稍后重试", detail: err.message }, 500);
  }
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
    INSERT INTO quotations (id, inquiry_id, tenant_id, product_name, unit_price, currency, unit, price_term, min_order, delivery_days, validity_days, followup_style, status, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?)
  `).run(
    quotationId, id, user.tenantId,
    body.productName ?? row.product_name,
    body.unitPrice, body.currency ?? "USD",
    body.unit ?? "件", body.priceTerm ?? "FOB",
    body.minOrder ?? 1, body.deliveryDays ?? 30,
    body.validityDays ?? 30, body.followupStyle ?? "business",
    new Date().toISOString()
  );

  db.prepare("UPDATE inquiries SET status = 'quoted', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);

  const creditsUsed = 5;
  db.prepare("UPDATE tenants SET credits_balance = credits_balance - ? WHERE id = ?")
    .run(creditsUsed, user.tenantId);
  const tenant = db.prepare("SELECT credits_balance FROM tenants WHERE id = ?").get(user.tenantId) as any;
  db.prepare(`
    INSERT INTO credit_ledger (id, tenant_id, type, amount, balance_after, description, task_id)
    VALUES (lower(hex(randomblob(16))), ?, 'task_deduct', ?, ?, ?, ?)
  `).run(user.tenantId, -creditsUsed, tenant.credits_balance, `报价发送 - ${row.product_name}`, id);

  return c.json({ success: true, quotationId, creditsUsed, newBalance: tenant.credits_balance });
});

// ─── 提交回复（AI 翻译）──────────────────────────────────────
inquiries.post("/:id/reply", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const { contentZh, quotationId, useAiDraft, followupStyle } = await c.req.json();

  const row = db.prepare(
    "SELECT * FROM inquiries WHERE id = ? AND tenant_id = ?"
  ).get(id, user.tenantId) as any;
  if (!row) return c.json({ error: "询盘不存在" }, 404);

  let contentEn = "";
  let creditsUsed = 3;

  if (useAiDraft) {
    contentEn = row.ai_draft_en ?? "";
    creditsUsed = 0;
  } else {
    // 使用阿里云百炼翻译
    try {
      const { generateFollowupDraft: genFollowup } = await import("../services/ai.js");
      const quotation = quotationId
        ? db.prepare("SELECT * FROM quotations WHERE id=?").get(quotationId) as any
        : null;

      if (quotation) {
        // 有报价时生成跟进草稿
        const tenant = db.prepare("SELECT name FROM tenants WHERE id=?").get(user.tenantId) as any;
        let styleProfile: string | undefined;
        try {
          const profile = db.prepare("SELECT summary FROM style_profiles WHERE tenant_id=?").get(user.tenantId) as any;
          styleProfile = profile?.summary;
        } catch { /* 忽略 */ }

        const draft = await genFollowup({
          buyerName: row.buyer_name ?? "",
          buyerCompany: row.buyer_company ?? "",
          productName: row.product_name ?? "",
          unitPrice: quotation.unit_price,
          currency: quotation.currency ?? "USD",
          unit: quotation.unit ?? "件",
          priceTerm: quotation.price_term ?? "FOB",
          style: (followupStyle ?? "business") as any,
          styleProfile,
          tenantName: tenant?.name,
        });
        contentEn = draft.draftEn;
      } else {
        // 纯翻译
        const OpenAI = (await import("openai")).default;
        const dashscope = new OpenAI({
          apiKey: process.env.DASHSCOPE_API_KEY ?? "",
          baseURL: process.env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
        });
        const resp = await dashscope.chat.completions.create({
          model: process.env.DASHSCOPE_MODEL ?? "qwen-plus",
          messages: [
            { role: "system", content: "你是专业外贸翻译助手。将中文外贸回复翻译成专业英文商务邮件。只返回翻译内容，不加解释。" },
            { role: "user", content: `买家来自 ${row.buyer_country}，产品：${row.product_name}。\n\n翻译：\n${contentZh}` },
          ],
          max_tokens: 600,
        });
        contentEn = resp.choices[0]?.message?.content ?? "";
      }
    } catch (err) {
      contentEn = row.ai_draft_en ?? "[翻译失败，请手动填写]";
      creditsUsed = 0;
    }
  }

  const replyId = `reply-${Date.now()}`;
  db.prepare(`
    INSERT INTO inquiry_replies (id, inquiry_id, quotation_id, reply_type, content_zh, content_en, send_status, sent_at)
    VALUES (?, ?, ?, 'human_confirmed', ?, ?, 'sent', ?)
  `).run(replyId, id, quotationId ?? null, contentZh, contentEn, new Date().toISOString());

  db.prepare("UPDATE inquiries SET status = 'quoted', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);

  // 记录 OpenClaw 操作
  const instance = db.prepare("SELECT * FROM openclaw_instances WHERE tenant_id = ?").get(user.tenantId) as any;
  if (instance) {
    db.prepare(`
      INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 'success', ?, ?, ?)
    `).run(
      user.tenantId, instance.id,
      `${row.source_platform}_message_sent`,
      row.source_platform, creditsUsed,
      JSON.stringify({ to: row.buyer_name, preview: contentEn.slice(0, 100) }),
      new Date().toISOString()
    );
    db.prepare("UPDATE openclaw_instances SET ops_today = ops_today + 1 WHERE id = ?").run(instance.id);
  }

  if (creditsUsed > 0) {
    db.prepare("UPDATE tenants SET credits_balance = credits_balance - ? WHERE id = ?")
      .run(creditsUsed, user.tenantId);
    const tenant = db.prepare("SELECT credits_balance FROM tenants WHERE id = ?").get(user.tenantId) as any;
    db.prepare(`
      INSERT INTO credit_ledger (id, tenant_id, type, amount, balance_after, description)
      VALUES (lower(hex(randomblob(16))), ?, 'task_deduct', ?, ?, ?)
    `).run(user.tenantId, -creditsUsed, tenant.credits_balance, `AI 翻译发送 - ${row.buyer_name}`);
  }

  return c.json({ success: true, replyId, contentEn, creditsUsed });
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

// ─── 手动创建询盘（AI 自动分析）──────────────────────────────
inquiries.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();

  const id = `inq-${Date.now()}`;

  // 尝试用 AI 分析
  let aiResult: any = null;
  if (body.rawContent && body.buyerName) {
    try {
      let styleProfile: string | undefined;
      try {
        const profile = db.prepare("SELECT summary FROM style_profiles WHERE tenant_id=?").get(user.tenantId) as any;
        styleProfile = profile?.summary;
      } catch { /* 忽略 */ }

      const tenant = db.prepare("SELECT name FROM tenants WHERE id=?").get(user.tenantId) as any;
      aiResult = await generateInquiryDraft({
        rawContent: body.rawContent,
        buyerName: body.buyerName ?? "",
        buyerCompany: body.buyerCompany ?? "",
        buyerCountry: body.buyerCountry ?? "",
        productName: body.productName ?? "",
        quantity: body.quantity,
        platform: body.sourcePlatform ?? "custom",
        styleProfile,
        tenantName: tenant?.name,
      });
    } catch (err) {
      console.error("创建询盘时 AI 分析失败:", err);
    }
  }

  db.prepare(`
    INSERT INTO inquiries (
      id, tenant_id, source_platform, buyer_name, buyer_company, buyer_country,
      buyer_contact, product_name, quantity, raw_content,
      ai_summary, ai_draft_cn, ai_draft_en, ai_analysis,
      estimated_value, confidence_score, confidence_breakdown,
      status, urgency, tags, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?, ?, ?)
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
    aiResult?.summary ?? null,
    aiResult?.draftCn ?? null,
    aiResult?.draftEn ?? null,
    aiResult?.analysis ?? null,
    aiResult?.estimatedValue ?? body.estimatedValue ?? 0,
    aiResult?.confidenceScore ?? body.confidenceScore ?? 50,
    aiResult ? JSON.stringify(aiResult.confidenceBreakdown) : "{}",
    aiResult?.urgency ?? body.urgency ?? "normal",
    aiResult ? JSON.stringify(aiResult.tags) : "[]",
    new Date().toISOString()
  );

  return c.json({ success: true, id, aiAnalyzed: !!aiResult }, 201);
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
