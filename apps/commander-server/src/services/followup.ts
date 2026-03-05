/**
 * RealSourcing Commander — 跟进与自动回复服务
 *
 * 包含两个核心功能：
 * 1. scanAndPushFollowupReminders — 扫描 24 小时未回复的报价，推送飞书提醒
 * 2. autoReplyAgent — 定时 AI Agent，自动处理新询盘并发送首次回复邮件
 *
 * autoReplyAgent 的工作流程：
 *   ① 扫描数据库中状态为 'unread' 且超过 5 分钟未处理的询盘
 *   ② 调用 generateInquiryDraft 生成 AI 草稿（中文摘要 + 英文回复）
 *   ③ 调用 emailService.sendEmail 发送首次回复邮件给买家
 *   ④ 更新询盘状态为 'unquoted'，记录 AI 回复日志
 *   ⑤ 写入 agent_logs 表，供前端展示 Agent 工作记录
 */

import { db } from "../db/index.js";
import { pushFollowupReminder } from "./feishu.js";
import { generateFollowupDraft, generateInquiryDraft } from "./ai.js";
import { sendEmail, buildFirstReplyHtml, buildFollowupHtml } from "./emailService.js";

// ─── 1. 24小时跟进提醒扫描 ────────────────────────────────────

/**
 * 扫描并推送 24 小时未回复提醒
 */
export async function scanAndPushFollowupReminders() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const pendingFollowups = db.prepare(`
    SELECT q.*, i.buyer_name, i.product_name as inq_product_name
    FROM quotations q
    JOIN inquiries i ON q.inquiry_id = i.id
    WHERE q.sent_at < ?
      AND i.status = 'quoted'
      AND q.followup_reminder_sent = 0
  `).all(twentyFourHoursAgo) as any[];

  console.log(`[Followup] 扫描到 ${pendingFollowups.length} 条待提醒跟进`);

  for (const quot of pendingFollowups) {
    try {
      await pushFollowupReminder({
        id: quot.id,
        inquiry_id: quot.inquiry_id,
        buyer_name: quot.buyer_name || "客户",
        product_name: quot.product_name || quot.inq_product_name,
      });
      db.prepare("UPDATE quotations SET followup_reminder_sent = 1 WHERE id = ?").run(quot.id);
      console.log(`[Followup] ✅ 已推送提醒 quotation=${quot.id}`);
    } catch (error) {
      console.error(`[Followup] ❌ 推送提醒失败 quotation=${quot.id}:`, error);
    }
  }
}

// ─── 2. AI 自动回复 Agent ─────────────────────────────────────

/**
 * AI 自动回复 Agent
 *
 * 每次调用时，扫描所有"新到未处理"的询盘，
 * 自动生成 AI 草稿并发送首次回复邮件。
 *
 * 触发条件：
 * - 询盘状态为 'unread'
 * - 询盘到达时间超过 5 分钟（避免刚创建就立即回复，给人工审核留窗口）
 * - 询盘中有买家邮箱（buyer_contact 包含 @）
 * - 该询盘尚未被 Agent 处理过（ai_draft_en 为空 或 status = 'unread'）
 *
 * 安全机制：
 * - 每次最多处理 10 条，防止 LLM 费用突增
 * - 每条询盘处理间隔 2 秒，避免 API 限流
 * - 所有操作记录到 agent_logs 表
 */
export async function autoReplyAgent() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // 查找符合条件的询盘
  const pendingInquiries = db.prepare(`
    SELECT i.*, t.name as tenant_name, t.id as t_id
    FROM inquiries i
    JOIN tenants t ON i.tenant_id = t.id
    WHERE i.status = 'unread'
      AND i.received_at < ?
      AND i.buyer_contact LIKE '%@%'
      AND (i.ai_draft_en IS NULL OR i.ai_draft_en = '')
    ORDER BY i.received_at ASC
    LIMIT 10
  `).all(fiveMinutesAgo) as any[];

  if (pendingInquiries.length === 0) {
    console.log(`[AutoReplyAgent] 暂无待处理询盘`);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`[AutoReplyAgent] 🤖 发现 ${pendingInquiries.length} 条待自动回复询盘`);

  let succeeded = 0;
  let failed = 0;

  for (const inquiry of pendingInquiries) {
    const startTime = Date.now();
    try {
      // ① 获取风格档案（如有）
      let styleProfile: string | undefined;
      try {
        const profile = db.prepare(
          "SELECT summary FROM style_profiles WHERE tenant_id=?"
        ).get(inquiry.tenant_id) as any;
        styleProfile = profile?.summary;
      } catch { /* 忽略，style_profiles 表可能不存在 */ }

      // ② 调用 AI 生成询盘草稿
      console.log(`[AutoReplyAgent] 处理询盘 ${inquiry.id}（${inquiry.product_name}，来自 ${inquiry.buyer_name}）`);
      const draft = await generateInquiryDraft({
        rawContent: inquiry.raw_content ?? `产品：${inquiry.product_name}，数量：${inquiry.quantity}，要求：${inquiry.requirements}`,
        buyerName: inquiry.buyer_name ?? "Buyer",
        buyerCompany: inquiry.buyer_company ?? "Company",
        buyerCountry: inquiry.buyer_country ?? "Unknown",
        productName: inquiry.product_name ?? "Product",
        platform: inquiry.source_platform ?? "custom",
        quantity: inquiry.quantity ?? "",
        tenantName: inquiry.tenant_name,
        styleProfile,
      } as any);

      // ③ 将草稿写入数据库
      db.prepare(`
        UPDATE inquiries
        SET ai_summary = ?, ai_draft_cn = ?, ai_draft_en = ?, ai_analysis = ?,
            status = 'unquoted', updated_at = ?
        WHERE id = ?
      `).run(
        draft.summary || "",
        draft.draftCn || "",
        draft.draftEn || "",
        JSON.stringify({ confidence: (draft as any).confidence ?? 0.8, tags: (draft as any).tags ?? [] }),
        new Date().toISOString(),
        inquiry.id
      );

      // ④ 发送首次回复邮件
      const buyerEmail = extractEmail(inquiry.buyer_contact);
      let emailResult = { success: false, simulated: true, messageId: "" as string | undefined };

      if (buyerEmail) {
        const htmlBody = buildFirstReplyHtml({
          buyerName: inquiry.buyer_name ?? "Dear Customer",
          productName: inquiry.product_name ?? "your inquiry",
          bodyText: draft.draftEn,
          senderName: inquiry.tenant_name ?? "Sales Team",
          senderTitle: "International Sales Manager",
          companyName: inquiry.tenant_name ?? "Our Company",
        });

        emailResult = await (sendEmail as any)({
          to: buyerEmail,
          toName: inquiry.buyer_name ?? undefined,
          subject: `Re: ${inquiry.product_name ?? "Your Inquiry"} - ${inquiry.buyer_company ?? ""}`.trim(),
          bodyText: draft.draftEn,
          bodyHtml: htmlBody,
          fromName: inquiry.tenant_name ?? "Sales Team",
        });
      }

      // ⑤ 插入回复记录
      const replyId = `reply-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      db.prepare(`
        INSERT INTO inquiry_replies
          (id, inquiry_id, tenant_id, reply_type, content_zh, content_en, send_status, sent_at)
        VALUES (?, ?, ?, 'auto_reply', ?, ?, ?, ?)
      `).run(
        replyId,
        inquiry.id,
        inquiry.tenant_id,
        draft.draftCn,
        draft.draftEn,
        emailResult.success ? "sent" : "draft",
        emailResult.success ? new Date().toISOString() : null
      );

      // ⑥ 写入 agent_logs
      const logId = `log-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      db.prepare(`
        INSERT INTO agent_logs
          (id, tenant_id, action_type, platform, target_url, status)
        VALUES (?, ?, 'auto_reply', ?, ?, ?)
      `).run(
        logId,
        inquiry.tenant_id,
        inquiry.source_platform ?? "email",
        buyerEmail ?? inquiry.buyer_contact ?? "",
        emailResult.success ? "success" : "partial"
      );

      const elapsed = Date.now() - startTime;
      console.log(
        `[AutoReplyAgent] ✅ 完成 ${inquiry.id} | AI草稿生成 | 邮件${emailResult.simulated ? "模拟" : "真实"}发送 | 耗时 ${elapsed}ms`
      );
      succeeded++;

      // 每条之间等待 2 秒，避免 LLM API 限流
      await sleep(2000);
    } catch (err: any) {
      console.error(`[AutoReplyAgent] ❌ 处理失败 inquiry=${inquiry.id}:`, err.message);

      // 记录失败日志
      try {
        db.prepare(`
          INSERT INTO agent_logs (id, tenant_id, action_type, platform, status)
          VALUES (?, ?, 'auto_reply_failed', ?, 'failed')
        `).run(
          `log-fail-${Date.now()}`,
          inquiry.tenant_id,
          inquiry.source_platform ?? "email"
        );
      } catch { /* 忽略日志写入失败 */ }

      failed++;
    }
  }

  console.log(`[AutoReplyAgent] 本轮完成：成功 ${succeeded}，失败 ${failed}`);
  return { processed: pendingInquiries.length, succeeded, failed };
}

// ─── 3. 一键 AI 跟进（手动触发）─────────────────────────────

/**
 * 执行一键 AI 跟进（手动触发，针对已报价但未回复的询盘）
 */
export async function executeAiFollowup(quotationId: string) {
  const quot = db.prepare(`
    SELECT q.*, i.buyer_name, i.buyer_contact, i.product_name as inq_product_name,
           i.tenant_id, i.id as inquiry_id_val
    FROM quotations q
    JOIN inquiries i ON q.inquiry_id = i.id
    WHERE q.id = ?
  `).get(quotationId) as any;

  if (!quot) throw new Error("Quotation not found");

  const tenant = db.prepare("SELECT name FROM tenants WHERE id=?").get(quot.tenant_id) as any;
  let styleProfile: string | undefined;
  try {
    const profile = db.prepare("SELECT summary FROM style_profiles WHERE tenant_id=?").get(quot.tenant_id) as any;
    styleProfile = profile?.summary;
  } catch { /* 忽略 */ }

  // 生成 AI 跟进草稿
  const result = await generateFollowupDraft({
    buyerName: quot.buyer_name || "Customer",
    productName: quot.product_name || quot.inq_product_name,
    unitPrice: quot.unit_price,
    currency: quot.currency,
    unit: quot.unit || "unit",
    priceTerm: quot.price_term || "FOB",
    style: "friendly",
    styleProfile,
    tenantName: tenant?.name,
  } as any);

  // 发送跟进邮件
  const buyerEmail = extractEmail(quot.buyer_contact);
  let emailResult = { success: false, simulated: true };

  if (buyerEmail) {
    const htmlBody = buildFollowupHtml({
      buyerName: quot.buyer_name ?? "Customer",
      productName: quot.product_name ?? quot.inq_product_name ?? "Product",
      bodyText: result.draftEn,
      senderName: tenant?.name ?? "Sales Team",
      companyName: tenant?.name ?? "Our Company",
      quotedPrice: quot.unit_price ? `${quot.currency ?? "USD"} ${quot.unit_price}/${quot.unit ?? "unit"}` : undefined,
    });

    emailResult = await (sendEmail as any)({
      to: buyerEmail,
      toName: quot.buyer_name ?? undefined,
      subject: `Following up on ${quot.product_name ?? quot.inq_product_name} - ${quot.currency ?? "USD"} ${quot.unit_price ?? ""}`.trim(),
      bodyText: result.draftEn,
      bodyHtml: htmlBody,
      fromName: tenant?.name ?? "Sales Team",
    });
  }

  // 插入回复记录
  const replyId = `reply-followup-${Date.now()}`;
  db.prepare(`
    INSERT INTO inquiry_replies
      (id, inquiry_id, quotation_id, reply_type, content_zh, content_en, send_status, sent_at)
    VALUES (?, ?, ?, 'followup', ?, ?, ?, ?)
  `).run(
    replyId,
    quot.inquiry_id,
    quot.id,
    "AI 自动跟进消息",
    result.draftEn,
    emailResult.success ? "sent" : "draft",
    emailResult.success ? new Date().toISOString() : null
  );

  db.prepare("UPDATE inquiries SET updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), quot.inquiry_id);

  return {
    success: true,
    replyId,
    content: result.draftEn,
    emailSent: emailResult.success,
    emailSimulated: emailResult.simulated,
  };
}

// ─── 工具函数 ─────────────────────────────────────────────────

/** 从联系方式字段中提取邮箱地址 */
function extractEmail(contact: string | null | undefined): string | null {
  if (!contact) return null;
  const match = contact.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

/** 等待指定毫秒数 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
