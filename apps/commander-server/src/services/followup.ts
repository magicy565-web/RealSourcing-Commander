import { db } from "../db/index.js";
import { pushFollowupReminder } from "./feishu.js";
import { generateFollowupDraft } from "./ai.js";

/**
 * 扫描并推送 24 小时未回复提醒
 * 逻辑：我方发出报价（quotations.sent_at）超过 24 小时，且询盘状态仍为 'quoted'（表示买家未回复或未进入下一阶段）
 */
export async function scanAndPushFollowupReminders() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  // 查找符合条件的报价单：已发送超过24小时，且询盘状态为 'quoted'
  // 同时确保该报价单还没有推送过提醒（避免重复推送）
  const pendingFollowups = db.prepare(`
    SELECT q.*, i.buyer_name, i.product_name as inq_product_name
    FROM quotations q
    JOIN inquiries i ON q.inquiry_id = i.id
    WHERE q.sent_at < ? 
      AND i.status = 'quoted'
      AND q.followup_reminder_sent = 0
  `).all(twentyFourHoursAgo) as any[];

  console.log(`[Followup Service] Found ${pendingFollowups.length} pending follow-up reminders.`);

  for (const quot of pendingFollowups) {
    try {
      await pushFollowupReminder({
        id: quot.id,
        inquiry_id: quot.inquiry_id,
        buyer_name: quot.buyer_name || "客户",
        product_name: quot.product_name || quot.inq_product_name,
      });

      // 标记为已提醒
      db.prepare("UPDATE quotations SET followup_reminder_sent = 1 WHERE id = ?").run(quot.id);
      console.log(`[Followup Service] Sent reminder for quotation ${quot.id}`);
    } catch (error) {
      console.error(`[Followup Service] Failed to send reminder for ${quot.id}:`, error);
    }
  }
}

/**
 * 执行一键 AI 跟进
 * 逻辑：生成跟进草稿并记录到回复表
 */
export async function executeAiFollowup(quotationId: string) {
  const quot = db.prepare(`
    SELECT q.*, i.buyer_name, i.product_name as inq_product_name, i.tenant_id
    FROM quotations q
    JOIN inquiries i ON q.inquiry_id = i.id
    WHERE q.id = ?
  `).get(quotationId) as any;

  if (!quot) throw new Error("Quotation not found");

  // 获取租户信息和风格档案
  const tenant = db.prepare("SELECT name FROM tenants WHERE id=?").get(quot.tenant_id) as any;
  const profile = db.prepare("SELECT summary FROM style_profiles WHERE tenant_id=?").get(quot.tenant_id) as any;

  // 生成 AI 跟进草稿
  const result = await generateFollowupDraft({
    buyerName: quot.buyer_name || "Customer",
    productName: quot.product_name || quot.inq_product_name,
    unitPrice: quot.unit_price,
    currency: quot.currency,
    minOrder: quot.min_order,
    deliveryDays: quot.delivery_days,
    styleProfile: profile?.summary,
    tenantName: tenant?.name,
  });

  // 插入回复记录
  const replyId = `reply-followup-${Date.now()}`;
  db.prepare(`
    INSERT INTO inquiry_replies (id, inquiry_id, quotation_id, reply_type, content_zh, content_en, send_status, sent_at)
    VALUES (?, ?, ?, 'followup', ?, ?, ?, ?)
  `).run(
    replyId, quot.inquiry_id, quot.id,
    "AI 自动跟进消息", result.draftEn,
    "sent", new Date().toISOString()
  );

  // 更新询盘状态为 'quoted' (保持或更新时间)
  db.prepare("UPDATE inquiries SET updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), quot.inquiry_id);

  return { success: true, replyId, content: result.draftEn };
}
