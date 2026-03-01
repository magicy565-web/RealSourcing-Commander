/**
 * Phase 5 — Sprint 5.1
 * 社交媒体管理路由 (Social Media Management)
 *
 * GET  /api/v1/social/accounts              获取所有社媒账号列表
 * GET  /api/v1/social/accounts/:id/messages 获取账号的评论/私信列表
 * POST /api/v1/social/messages/:id/analyze  AI 情感分析单条消息
 * POST /api/v1/social/messages/:id/reply    AI 生成回复草稿并发出
 * POST /api/v1/social/messages/:id/convert  将消息转化为询盘
 * POST /api/v1/social/messages/batch-analyze 批量情感分析
 * GET  /api/v1/social/stats                 社媒整体统计
 */
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { chat } from "../services/ai.js";

const social = new Hono();
social.use("*", authMiddleware);

// ─── 辅助：安全解析 JSON ──────────────────────────────────────
function safeJson(v: any, fallback: any = {}) {
  if (!v) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

// ─── AI 情感分析 ──────────────────────────────────────────────
async function analyzeSentiment(content: string, platform: string): Promise<{
  intent: "inquiry" | "complaint" | "spam" | "general";
  intentScore: number;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  suggestedAction: string;
  isHighValue: boolean;
}> {
  const systemPrompt = `你是一个外贸社媒评论分析专家。
分析评论的购买意图、情感倾向，识别高价值询盘线索。
严格输出 JSON，不要有其他文字。`;

  const userPrompt = `平台：${platform}
评论内容：${content}

请输出：
{
  "intent": "inquiry|complaint|spam|general",
  "intentScore": 0-100的整数（购买意图强度）,
  "sentiment": "positive|neutral|negative",
  "summary": "一句话总结（中文，30字以内）",
  "suggestedAction": "建议操作（中文，如：立即私信跟进、转入询盘、忽略等）",
  "isHighValue": true/false（是否为高价值线索）
}`;

  try {
    const raw = await chat(systemPrompt, userPrompt, { temperature: 0.3, maxTokens: 300 });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("格式错误");
    return JSON.parse(match[0]);
  } catch {
    return {
      intent: "general",
      intentScore: 0,
      sentiment: "neutral",
      summary: "无法分析",
      suggestedAction: "人工审阅",
      isHighValue: false,
    };
  }
}

// ─── AI 回复草稿生成 ──────────────────────────────────────────
async function generateSocialReply(params: {
  content: string;
  platform: string;
  senderName: string;
  intent: string;
  tenantName: string;
}): Promise<{ draftEn: string; draftZh: string }> {
  const systemPrompt = `你是专业外贸社媒运营助手，代表 ${params.tenantName} 回复 ${params.platform} 上的评论/私信。
风格：热情、专业、简洁，引导用户进一步咨询。`;

  const userPrompt = `用户 ${params.senderName} 的消息：
${params.content}

消息意图：${params.intent}

请生成回复草稿：
{
  "draftEn": "英文回复（100词以内，自然友好）",
  "draftZh": "中文回复（80字以内，供内部参考）"
}`;

  try {
    const raw = await chat(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 400 });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("格式错误");
    return JSON.parse(match[0]);
  } catch {
    return {
      draftEn: `Hi ${params.senderName}, thank you for your message! We'd love to help. Please send us a direct message for more details.`,
      draftZh: `您好 ${params.senderName}，感谢您的留言！请私信我们了解更多详情。`,
    };
  }
}

// ─── 初始化社媒消息表（如不存在）────────────────────────────────
function ensureSocialMessagesTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_messages (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT REFERENCES tenants(id),
      account_id      TEXT REFERENCES social_accounts(id),
      platform        TEXT NOT NULL,
      message_type    TEXT DEFAULT 'comment',
      sender_name     TEXT,
      sender_id       TEXT,
      sender_avatar   TEXT,
      content         TEXT NOT NULL,
      intent          TEXT DEFAULT 'general',
      intent_score    INTEGER DEFAULT 0,
      sentiment       TEXT DEFAULT 'neutral',
      ai_summary      TEXT,
      ai_draft_en     TEXT,
      ai_draft_zh     TEXT,
      suggested_action TEXT,
      is_high_value   INTEGER DEFAULT 0,
      status          TEXT DEFAULT 'pending',
      replied_at      TEXT,
      reply_content   TEXT,
      converted_inquiry_id TEXT,
      post_id         TEXT,
      post_title      TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    )
  `);
}
ensureSocialMessagesTable();

// ─── 种子数据（首次调用时插入演示数据）──────────────────────────
function seedSocialMessages(tenantId: string) {
  const count = (db.prepare("SELECT COUNT(*) as c FROM social_messages WHERE tenant_id = ?").get(tenantId) as any)?.c ?? 0;
  if (count > 0) return;

  const accounts = db.prepare("SELECT * FROM social_accounts WHERE tenant_id = ?").all(tenantId) as any[];
  const fbAcc = accounts.find(a => a.platform === "facebook");
  const tkAcc = accounts.find(a => a.platform === "tiktok");

  const messages = [
    {
      id: "smsg-001",
      account_id: fbAcc?.id ?? "acc-002",
      platform: "facebook",
      message_type: "comment",
      sender_name: "Ahmed Al-Rashid",
      sender_id: "fb-user-001",
      sender_avatar: "🇸🇦",
      content: "Hi! I'm interested in your LED products. What's the MOQ for 5000 units? We need them for our hotel project in Saudi Arabia.",
      intent: "inquiry",
      intent_score: 92,
      sentiment: "positive",
      ai_summary: "沙特买家询问 LED 产品 5000 件 MOQ，酒店项目",
      ai_draft_en: "Hi Ahmed! Thank you for your interest in our LED products. For 5,000 units, our MOQ is 500 units with competitive pricing. For hotel projects, we offer special bulk discounts and can provide CE/UL certified products. Could you share more details about your project requirements? We'd love to send you a customized quote!",
      ai_draft_zh: "您好 Ahmed！感谢您对我们 LED 产品的关注。5000 件批量价格极具竞争力，酒店项目可享特别折扣。请分享更多项目需求，我们将为您定制报价方案！",
      suggested_action: "立即私信跟进，转入询盘",
      is_high_value: 1,
      status: "pending",
      post_id: "post-001",
      post_title: "New LED Series Launch 2024",
    },
    {
      id: "smsg-002",
      account_id: fbAcc?.id ?? "acc-002",
      platform: "facebook",
      message_type: "messenger",
      sender_name: "Maria Santos",
      sender_id: "fb-user-002",
      sender_avatar: "🇧🇷",
      content: "Olá! We are a distributor in Brazil looking for LED strip lights. Can you send your catalog and price list?",
      intent: "inquiry",
      intent_score: 85,
      sentiment: "positive",
      ai_summary: "巴西分销商询问 LED 灯带目录和价格单",
      ai_draft_en: "Hello Maria! Great to hear from you! We'd be happy to send our LED strip lights catalog and price list for Brazilian distributors. We offer competitive FOB pricing with UL/CE certifications. Please share your email and we'll send the full catalog right away!",
      ai_draft_zh: "您好 Maria！很高兴收到您的消息！我们的 LED 灯带系列拥有 UL/CE 认证，价格极具竞争力。请分享您的邮箱，我们立即发送完整目录！",
      suggested_action: "发送产品目录，转入询盘",
      is_high_value: 1,
      status: "replied",
      replied_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      reply_content: "Hello Maria! Great to hear from you! Sending catalog now...",
      post_id: null,
      post_title: null,
    },
    {
      id: "smsg-003",
      account_id: tkAcc?.id ?? "acc-003",
      platform: "tiktok",
      message_type: "comment",
      sender_name: "@solar_installer_us",
      sender_id: "tk-user-001",
      sender_avatar: "🇺🇸",
      content: "What's the warranty on these panels? Do you ship to the US?",
      intent: "inquiry",
      intent_score: 78,
      sentiment: "neutral",
      ai_summary: "美国用户询问保修期和美国发货",
      ai_draft_en: "Hi! Our solar panels come with a 25-year performance warranty and 10-year product warranty. Yes, we ship to the US with full UL certification. DM us for pricing and shipping details! 🌞",
      ai_draft_zh: "您好！我们的太阳能板提供 25 年性能保修和 10 年产品保修，支持发货到美国，拥有 UL 认证。私信我们获取报价！",
      suggested_action: "回复评论，引导私信",
      is_high_value: 0,
      status: "pending",
      post_id: "post-002",
      post_title: "Solar Panel Installation Tutorial",
    },
    {
      id: "smsg-004",
      account_id: tkAcc?.id ?? "acc-003",
      platform: "tiktok",
      message_type: "comment",
      sender_name: "@eco_home_de",
      sender_id: "tk-user-002",
      sender_avatar: "🇩🇪",
      content: "Sehr interessant! Haben Sie CE-Zertifizierung? Wir suchen Lieferanten für den deutschen Markt.",
      intent: "inquiry",
      intent_score: 88,
      sentiment: "positive",
      ai_summary: "德国买家询问 CE 认证，寻找德国市场供应商",
      ai_draft_en: "Hello! Yes, all our products are CE certified and comply with EU standards. We have extensive experience supplying to the German market. Please DM us for our product catalog and pricing. Wir freuen uns auf die Zusammenarbeit! 🇩🇪",
      ai_draft_zh: "您好！我们所有产品均已通过 CE 认证，符合欧盟标准，有丰富的德国市场供货经验。请私信我们获取产品目录和报价！",
      suggested_action: "立即回复，引导私信，高价值线索",
      is_high_value: 1,
      status: "pending",
      post_id: "post-002",
      post_title: "Solar Panel Installation Tutorial",
    },
    {
      id: "smsg-005",
      account_id: fbAcc?.id ?? "acc-002",
      platform: "facebook",
      message_type: "comment",
      sender_name: "Spam Bot 123",
      sender_id: "fb-user-003",
      sender_avatar: "🤖",
      content: "CLICK HERE FOR FREE MONEY!!! www.spam-site.com",
      intent: "spam",
      intent_score: 0,
      sentiment: "negative",
      ai_summary: "垃圾信息，无商业价值",
      ai_draft_en: "",
      ai_draft_zh: "",
      suggested_action: "标记为垃圾信息并隐藏",
      is_high_value: 0,
      status: "ignored",
      post_id: "post-001",
      post_title: "New LED Series Launch 2024",
    },
  ];

  for (const msg of messages) {
    db.prepare(`
      INSERT OR IGNORE INTO social_messages
        (id, tenant_id, account_id, platform, message_type, sender_name, sender_id, sender_avatar,
         content, intent, intent_score, sentiment, ai_summary, ai_draft_en, ai_draft_zh,
         suggested_action, is_high_value, status, replied_at, reply_content, post_id, post_title)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      msg.id, tenantId, msg.account_id, msg.platform, msg.message_type,
      msg.sender_name, msg.sender_id, msg.sender_avatar, msg.content,
      msg.intent, msg.intent_score, msg.sentiment, msg.ai_summary,
      msg.ai_draft_en, msg.ai_draft_zh, msg.suggested_action, msg.is_high_value,
      msg.status, msg.replied_at ?? null, msg.reply_content ?? null,
      msg.post_id ?? null, msg.post_title ?? null,
    );
  }
}

// ─── GET /accounts — 获取社媒账号列表 ────────────────────────────
social.get("/accounts", (c) => {
  const { tenantId } = c.get("user") as any;
  const accounts = db.prepare(`
    SELECT sa.*, oi.name as instance_name
    FROM social_accounts sa
    LEFT JOIN openclaw_instances oi ON sa.instance_id = oi.id
    WHERE sa.tenant_id = ? AND sa.is_active = 1
    ORDER BY sa.platform
  `).all(tenantId) as any[];

  // 附加每个账号的消息统计
  const result = accounts.map(acc => {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN is_high_value = 1 THEN 1 ELSE 0 END) as high_value,
        SUM(CASE WHEN intent = 'inquiry' THEN 1 ELSE 0 END) as inquiries
      FROM social_messages WHERE account_id = ? AND tenant_id = ?
    `).get(acc.id, tenantId) as any;

    return {
      id: acc.id,
      platform: acc.platform,
      accountName: acc.account_name,
      accountType: acc.account_type,
      healthStatus: acc.health_status,
      dailyOpsUsed: acc.daily_ops_used,
      dailyOpsLimit: acc.daily_ops_limit,
      lastActive: acc.last_active,
      instanceName: acc.instance_name,
      messageStats: {
        total: stats?.total ?? 0,
        pending: stats?.pending ?? 0,
        highValue: stats?.high_value ?? 0,
        inquiries: stats?.inquiries ?? 0,
      },
    };
  });

  return c.json({ accounts: result });
});

// ─── GET /accounts/:id/messages — 获取账号消息列表 ───────────────
social.get("/accounts/:id/messages", (c) => {
  const { tenantId } = c.get("user") as any;
  const accountId = c.req.param("id");
  const { status, intent, platform, limit = "50", offset = "0" } = c.req.query();

  // 确保种子数据存在
  seedSocialMessages(tenantId);

  let sql = `SELECT * FROM social_messages WHERE tenant_id = ? AND account_id = ?`;
  const params: any[] = [tenantId, accountId];

  if (status) { sql += " AND status = ?"; params.push(status); }
  if (intent) { sql += " AND intent = ?"; params.push(intent); }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const messages = db.prepare(sql).all(...params) as any[];
  const total = (db.prepare(
    `SELECT COUNT(*) as c FROM social_messages WHERE tenant_id = ? AND account_id = ?`
  ).get(tenantId, accountId) as any)?.c ?? 0;

  return c.json({
    messages: messages.map(m => ({
      ...m,
      isHighValue: !!m.is_high_value,
    })),
    total,
  });
});

// ─── GET /messages — 获取所有平台消息（跨账号）──────────────────
social.get("/messages", (c) => {
  const { tenantId } = c.get("user") as any;
  const { status, intent, platform, limit = "50", offset = "0" } = c.req.query();

  seedSocialMessages(tenantId);

  let sql = `SELECT * FROM social_messages WHERE tenant_id = ?`;
  const params: any[] = [tenantId];

  if (status) { sql += " AND status = ?"; params.push(status); }
  if (intent) { sql += " AND intent = ?"; params.push(intent); }
  if (platform) { sql += " AND platform = ?"; params.push(platform); }

  sql += " ORDER BY is_high_value DESC, created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const messages = db.prepare(sql).all(...params) as any[];
  const total = (db.prepare(`SELECT COUNT(*) as c FROM social_messages WHERE tenant_id = ?`).get(tenantId) as any)?.c ?? 0;

  return c.json({
    messages: messages.map(m => ({ ...m, isHighValue: !!m.is_high_value })),
    total,
  });
});

// ─── POST /messages/:id/analyze — AI 情感分析 ────────────────────
social.post("/messages/:id/analyze", async (c) => {
  const { tenantId } = c.get("user") as any;
  const msgId = c.req.param("id");

  const msg = db.prepare("SELECT * FROM social_messages WHERE id = ? AND tenant_id = ?").get(msgId, tenantId) as any;
  if (!msg) return c.json({ error: "消息不存在" }, 404);

  const analysis = await analyzeSentiment(msg.content, msg.platform);

  db.prepare(`
    UPDATE social_messages
    SET intent = ?, intent_score = ?, sentiment = ?, ai_summary = ?,
        suggested_action = ?, is_high_value = ?, updated_at = ?
    WHERE id = ?
  `).run(
    analysis.intent, analysis.intentScore, analysis.sentiment,
    analysis.summary, analysis.suggestedAction,
    analysis.isHighValue ? 1 : 0,
    new Date().toISOString(), msgId
  );

  return c.json({ success: true, analysis });
});

// ─── POST /messages/:id/generate-reply — AI 生成回复草稿 ─────────
social.post("/messages/:id/generate-reply", async (c) => {
  const { tenantId } = c.get("user") as any;
  const msgId = c.req.param("id");

  const msg = db.prepare("SELECT * FROM social_messages WHERE id = ? AND tenant_id = ?").get(msgId, tenantId) as any;
  if (!msg) return c.json({ error: "消息不存在" }, 404);

  const tenant = db.prepare("SELECT name FROM tenants WHERE id = ?").get(tenantId) as any;

  const draft = await generateSocialReply({
    content: msg.content,
    platform: msg.platform,
    senderName: msg.sender_name,
    intent: msg.intent,
    tenantName: tenant?.name ?? "明辉照明",
  });

  db.prepare(`
    UPDATE social_messages SET ai_draft_en = ?, ai_draft_zh = ?, updated_at = ? WHERE id = ?
  `).run(draft.draftEn, draft.draftZh, new Date().toISOString(), msgId);

  return c.json({ success: true, draftEn: draft.draftEn, draftZh: draft.draftZh });
});

// ─── POST /messages/:id/reply — 发送回复 ─────────────────────────
social.post("/messages/:id/reply", async (c) => {
  const { tenantId } = c.get("user") as any;
  const msgId = c.req.param("id");
  const { content } = await c.req.json();

  if (!content?.trim()) return c.json({ error: "回复内容不能为空" }, 400);

  const msg = db.prepare("SELECT * FROM social_messages WHERE id = ? AND tenant_id = ?").get(msgId, tenantId) as any;
  if (!msg) return c.json({ error: "消息不存在" }, 404);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE social_messages
    SET status = 'replied', reply_content = ?, replied_at = ?, updated_at = ?
    WHERE id = ?
  `).run(content, now, now, msgId);

  // 记录 agent_log
  const instance = db.prepare("SELECT id FROM openclaw_instances WHERE tenant_id = ?").get(tenantId) as any;
  if (instance) {
    db.prepare(`
      INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, 'social_reply', ?, 'success', 2, ?, ?)
    `).run(
      tenantId, instance.id, msg.platform,
      JSON.stringify({ messageId: msgId, senderName: msg.sender_name, platform: msg.platform }),
      now
    );
  }

  return c.json({ success: true, repliedAt: now });
});

// ─── POST /messages/:id/convert — 转化为询盘 ─────────────────────
social.post("/messages/:id/convert", async (c) => {
  const { tenantId } = c.get("user") as any;
  const msgId = c.req.param("id");

  const msg = db.prepare("SELECT * FROM social_messages WHERE id = ? AND tenant_id = ?").get(msgId, tenantId) as any;
  if (!msg) return c.json({ error: "消息不存在" }, 404);
  if (msg.converted_inquiry_id) {
    return c.json({ error: "该消息已转化为询盘", inquiryId: msg.converted_inquiry_id }, 400);
  }

  const inquiryId = `inq-social-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO inquiries
      (id, tenant_id, source_platform, buyer_name, buyer_company, buyer_country, buyer_contact,
       product_name, raw_content, ai_summary, ai_draft_en, ai_analysis,
       estimated_value, confidence_score, status, urgency, tags, received_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    inquiryId, tenantId, msg.platform,
    msg.sender_name, msg.sender_name, "未知",
    msg.sender_id ?? "",
    "社媒线索（待确认产品）",
    msg.content,
    msg.ai_summary ?? msg.content.substring(0, 100),
    msg.ai_draft_en ?? "",
    `来源：${msg.platform} ${msg.message_type}，AI 意图分析：${msg.intent}（${msg.intent_score}分）`,
    0,
    msg.intent_score ?? 50,
    "unread",
    msg.intent_score >= 80 ? "high" : "normal",
    JSON.stringify([msg.platform, "社媒线索"]),
    now
  );

  db.prepare(`
    UPDATE social_messages SET converted_inquiry_id = ?, status = 'converted', updated_at = ? WHERE id = ?
  `).run(inquiryId, now, msgId);

  return c.json({ success: true, inquiryId });
});

// ─── POST /messages/batch-analyze — 批量情感分析 ─────────────────
social.post("/messages/batch-analyze", async (c) => {
  const { tenantId } = c.get("user") as any;
  const { accountId } = await c.req.json();

  const pending = db.prepare(`
    SELECT * FROM social_messages
    WHERE tenant_id = ? AND intent = 'general'
    ${accountId ? "AND account_id = ?" : ""}
    LIMIT 10
  `).all(...(accountId ? [tenantId, accountId] : [tenantId])) as any[];

  let processed = 0;
  for (const msg of pending) {
    try {
      const analysis = await analyzeSentiment(msg.content, msg.platform);
      db.prepare(`
        UPDATE social_messages
        SET intent = ?, intent_score = ?, sentiment = ?, ai_summary = ?,
            suggested_action = ?, is_high_value = ?, updated_at = ?
        WHERE id = ?
      `).run(
        analysis.intent, analysis.intentScore, analysis.sentiment,
        analysis.summary, analysis.suggestedAction,
        analysis.isHighValue ? 1 : 0,
        new Date().toISOString(), msg.id
      );
      processed++;
    } catch { /* skip */ }
  }

  return c.json({ success: true, processed, total: pending.length });
});

// ─── GET /stats — 社媒整体统计 ────────────────────────────────────
social.get("/stats", (c) => {
  const { tenantId } = c.get("user") as any;
  seedSocialMessages(tenantId);

  const overall = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied,
      SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted,
      SUM(CASE WHEN is_high_value = 1 THEN 1 ELSE 0 END) as high_value,
      SUM(CASE WHEN intent = 'inquiry' THEN 1 ELSE 0 END) as inquiries,
      SUM(CASE WHEN intent = 'complaint' THEN 1 ELSE 0 END) as complaints,
      SUM(CASE WHEN intent = 'spam' THEN 1 ELSE 0 END) as spam
    FROM social_messages WHERE tenant_id = ?
  `).get(tenantId) as any;

  const byPlatform = db.prepare(`
    SELECT platform,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN is_high_value = 1 THEN 1 ELSE 0 END) as high_value
    FROM social_messages WHERE tenant_id = ?
    GROUP BY platform
  `).all(tenantId) as any[];

  return c.json({ overall, byPlatform });
});

// ─── GET /templates — 获取回复模板列表 ─────────────────────────
social.get("/templates", (c) => {
  const { tenantId } = c.get("user") as any;
  const platform = c.req.query("platform");
  const category = c.req.query("category");

  let sql = `SELECT * FROM reply_templates WHERE tenant_id = ?`;
  const params: any[] = [tenantId];

  if (platform && platform !== "all") {
    sql += ` AND (platform = ? OR platform = 'all')`;
    params.push(platform);
  }
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  sql += ` ORDER BY use_count DESC, created_at DESC`;

  const templates = db.prepare(sql).all(...params) as any[];
  const categories = db.prepare(
    `SELECT DISTINCT category FROM reply_templates WHERE tenant_id = ? ORDER BY category`
  ).all(tenantId).map((r: any) => r.category);

  return c.json({
    templates: templates.map(t => ({
      ...t,
      tags: (() => { try { return JSON.parse(t.tags); } catch { return []; } })(),
    })),
    total: templates.length,
    categories,
  });
});

// ─── POST /templates — 创建回复模板 ──────────────────────────
social.post("/templates", async (c) => {
  const { tenantId } = c.get("user") as any;
  const body = await c.req.json() as any;
  const { platform, category, name, content_en, content_zh, tags } = body;

  if (!name || !content_en) {
    return c.json({ error: "name 和 content_en 为必填项" }, 400);
  }

  const id = `tpl-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO reply_templates (id, tenant_id, platform, category, name, content_en, content_zh, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, tenantId, platform ?? "all", category ?? "通用",
    name, content_en, content_zh ?? "",
    JSON.stringify(tags ?? []), now, now
  );

  const template = db.prepare(`SELECT * FROM reply_templates WHERE id = ?`).get(id) as any;
  return c.json({ success: true, template: { ...template, tags: tags ?? [] } }, 201);
});

// ─── POST /templates/:id/use — 使用模板（计数+1，返回填充后内容）
social.post("/templates/:id/use", async (c) => {
  const { tenantId } = c.get("user") as any;
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({})) as any;

  const template = db.prepare(
    `SELECT * FROM reply_templates WHERE id = ? AND tenant_id = ?`
  ).get(id, tenantId) as any;

  if (!template) return c.json({ error: "模板不存在" }, 404);

  const vars: Record<string, string> = body.vars ?? {};
  let contentEn = template.content_en;
  let contentZh = template.content_zh;
  for (const [k, v] of Object.entries(vars)) {
    contentEn = contentEn.replace(new RegExp(`\\{${k}\\}`, "g"), v as string);
    contentZh = contentZh.replace(new RegExp(`\\{${k}\\}`, "g"), v as string);
  }

  db.prepare(`UPDATE reply_templates SET use_count = use_count + 1 WHERE id = ?`).run(id);

  return c.json({ success: true, contentEn, contentZh, templateName: template.name });
});

// ─── DELETE /templates/:id — 删除模板 ────────────────────────
social.delete("/templates/:id", (c) => {
  const { tenantId } = c.get("user") as any;
  const { id } = c.req.param();

  const template = db.prepare(
    `SELECT id FROM reply_templates WHERE id = ? AND tenant_id = ?`
  ).get(id, tenantId);
  if (!template) return c.json({ error: "模板不存在" }, 404);

  db.prepare(`DELETE FROM reply_templates WHERE id = ?`).run(id);
  return c.json({ success: true });
});

export default social;
