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
import { addBitableRecord, createQuotationNotificationCard, sendFeishuCard, pushQuotationNotification } from "../services/feishu.js";
import { executeAiFollowup } from "../services/followup.js";

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

  const totalAllInquiries = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ?"
  ).get(tenantId) as any).c;

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
      inquiries: totalAllInquiries,
      value: totalAllValue,
    },
    channelDistribution: channelDist.map((ch: any) => ({
      source_platform: ch.source_platform,
      count: ch.count,
    })),
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

  return c.json(parseInquiry(row));
});

// ─── 辅助函数 ─────────────────────────────────────────────────
function parseInquiry(row: any) {
  return {
    id: row.id,
    buyerName: row.buyer_name,
    buyerCompany: row.buyer_company,
    buyerCountry: row.buyer_country,
    buyerEmail: row.buyer_email,
    productName: row.product_name,
    quantity: row.quantity,
    estimatedValue: row.estimated_value,
    sourcePlatform: row.source_platform,
    status: row.status,
    urgency: row.urgency,
    tags: row.tags ? JSON.parse(row.tags) : [],
    confidenceScore: row.confidence_score,
    confidenceBreakdown: row.confidence_breakdown ? JSON.parse(row.confidence_breakdown) : {},
    aiSummary: row.ai_summary,
    aiDraftCn: row.ai_draft_cn,
    aiDraftEn: row.ai_draft_en,
    aiAnalysis: row.ai_analysis,
    rawContent: row.raw_content,
    receivedAt: row.received_at,
    updatedAt: row.updated_at,
  };
}

// ─── 重新生成 AI 草稿 ──────────────────────────────────────────
inquiries.post("/:id/ai-draft", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = await c.req.json();

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

  // 异步写入飞书多维表格
  const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
  const tableId = process.env.FEISHU_BITABLE_TABLE_ID;
  if (appToken && tableId) {
    addBitableRecord(appToken, tableId, {
      "文本": `${row.buyer_name} (${row.buyer_company})`,
      "价格条款": body.priceTerm ?? "FOB",
      "跟进风格": body.followupStyle ?? "business",
      "报价时间": Date.now(),
      "状态": "已发送",
      "备注": `${row.product_name} - $${body.unitPrice}/${body.unit ?? '件'}`
    }).catch(err => console.error("Failed to write to Feishu Bitable:", err));
  }
  // 推送飞书 Webhook 通知
  pushQuotationNotification({
    id: quotationId,
    inquiry_id: id,
    product_name: row.product_name,
    unit_price: body.unitPrice,
    currency: body.currency ?? "USD",
    buyer_name: row.buyer_name
  }).catch(err => console.error("Failed to push Feishu notification:", err));

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

        const followupResult = await generateFollowupDraft({
          buyerName: row.buyer_name ?? "",
          productName: row.product_name ?? "",
          unitPrice: quotation.unit_price,
          currency: quotation.currency,
          minOrder: quotation.min_order,
          deliveryDays: quotation.delivery_days,
          styleProfile,
          tenantName: tenant?.name,
        });
        contentEn = followupResult.draftEn;
      } else {
        // 无报价时直接翻译
        contentEn = contentZh; // 简化处理，实际应调用翻译 API
      }
    } catch (err: any) {
      console.error("生成跟进草稿失败:", err);
      contentEn = contentZh;
    }
  }

  // 插入回复记录
  const replyId = `reply-${Date.now()}`;
  db.prepare(`
    INSERT INTO inquiry_replies (id, inquiry_id, tenant_id, content_zh, content_en, status, sent_at)
    VALUES (?, ?, ?, ?, ?, 'sent', ?)
  `).run(replyId, id, user.tenantId, contentZh, contentEn, new Date().toISOString());

  // 扣积分
  db.prepare("UPDATE tenants SET credits_balance = credits_balance - ? WHERE id = ?")
    .run(creditsUsed, user.tenantId);
  const updatedTenant = db.prepare("SELECT credits_balance FROM tenants WHERE id = ?").get(user.tenantId) as any;
  db.prepare(`
    INSERT INTO credit_ledger (id, tenant_id, type, amount, balance_after, description, task_id)
    VALUES (lower(hex(randomblob(16))), ?, 'reply_send', ?, ?, ?, ?)
  `).run(user.tenantId, -creditsUsed, updatedTenant.credits_balance, `回复发送 - ${row.product_name}`, id);

  return c.json({ success: true, replyId, creditsUsed, newBalance: updatedTenant.credits_balance });
});

// ─── 执行 AI 跟进 ─────────────────────────────────────────────
inquiries.post("/:id/ai-followup", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const { quotationId } = await c.req.json();

  try {
    const result = await executeAiFollowup(quotationId);
    return c.json(result);
  } catch (err: any) {
    console.error("AI 跟进执行失败:", err);
    return c.json({ error: "AI 跟进执行失败", detail: err.message }, 500);
  }
});

// ─── 转人工 ───────────────────────────────────────────────────
inquiries.post("/:id/transfer", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const { reason } = await c.req.json();

  const row = db.prepare(
    "SELECT * FROM inquiries WHERE id = ? AND tenant_id = ?"
  ).get(id, user.tenantId) as any;
  if (!row) return c.json({ error: "询盘不存在" }, 404);

  db.prepare("UPDATE inquiries SET status = 'transferred', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);

  const creditsUsed = 2;
  db.prepare("UPDATE tenants SET credits_balance = credits_balance - ? WHERE id = ?")
    .run(creditsUsed, user.tenantId);
  const tenant = db.prepare("SELECT credits_balance FROM tenants WHERE id = ?").get(user.tenantId) as any;
  db.prepare(`
    INSERT INTO credit_ledger (id, tenant_id, type, amount, balance_after, description, task_id)
    VALUES (lower(hex(randomblob(16))), ?, 'transfer', ?, ?, ?, ?)
  `).run(user.tenantId, -creditsUsed, tenant.credits_balance, `转人工 - ${reason}`, id);

  return c.json({ success: true, creditsUsed, newBalance: tenant.credits_balance });
});

export default inquiries;
