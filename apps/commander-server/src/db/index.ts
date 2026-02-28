/**
 * Commander 5.0 — SQLite 数据库初始化
 * 使用 better-sqlite3（同步 API，适合单进程服务）
 */
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, "../../commander.db");

export const db = new Database(DB_PATH);

// WAL 模式提升并发读性能
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── 建表 SQL ─────────────────────────────────────────────────
const INIT_SQL = `
-- 租户（公司）
CREATE TABLE IF NOT EXISTS tenants (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  plan_type       TEXT NOT NULL DEFAULT 'standard',
  industry        TEXT,
  credits_balance INTEGER NOT NULL DEFAULT 2840,
  feishu_webhook  TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  is_active       INTEGER DEFAULT 1
);

-- 用户
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT REFERENCES tenants(id),
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT UNIQUE,
  password_hash   TEXT NOT NULL,
  push_hour       INTEGER DEFAULT 8,
  push_hour_eve   INTEGER DEFAULT 18,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- OpenClaw 实例
CREATE TABLE IF NOT EXISTS openclaw_instances (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT REFERENCES tenants(id),
  name            TEXT NOT NULL,
  api_endpoint    TEXT,
  api_key         TEXT,
  status          TEXT DEFAULT 'offline',
  last_heartbeat  TEXT,
  ops_today       INTEGER DEFAULT 0,
  ops_limit       INTEGER DEFAULT 200,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- 社媒账号
CREATE TABLE IF NOT EXISTS social_accounts (
  id              TEXT PRIMARY KEY,
  instance_id     TEXT REFERENCES openclaw_instances(id),
  tenant_id       TEXT REFERENCES tenants(id),
  platform        TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  account_type    TEXT DEFAULT 'personal',
  health_status   TEXT DEFAULT 'normal',
  daily_ops_used  INTEGER DEFAULT 0,
  daily_ops_limit INTEGER DEFAULT 20,
  last_active     TEXT,
  is_active       INTEGER DEFAULT 1
);

-- 询盘主表
CREATE TABLE IF NOT EXISTS inquiries (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT REFERENCES tenants(id),
  source_platform TEXT NOT NULL DEFAULT 'custom',
  source_url      TEXT,
  raw_content     TEXT,
  buyer_name      TEXT,
  buyer_company   TEXT,
  buyer_country   TEXT,
  buyer_contact   TEXT,
  product_name    TEXT,
  quantity        TEXT,
  requirements    TEXT,
  estimated_value INTEGER,
  confidence_score INTEGER DEFAULT 0,
  confidence_breakdown TEXT DEFAULT '{}',
  ai_summary      TEXT,
  ai_draft_cn     TEXT,
  ai_draft_en     TEXT,
  ai_analysis     TEXT,
  tags            TEXT DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'unread',
  urgency         TEXT DEFAULT 'normal',
  assigned_to     TEXT,
  transfer_note   TEXT,
  received_at     TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- 报价单
CREATE TABLE IF NOT EXISTS quotations (
  id              TEXT PRIMARY KEY,
  inquiry_id      TEXT REFERENCES inquiries(id),
  tenant_id       TEXT REFERENCES tenants(id),
  product_name    TEXT,
  unit_price      REAL,
  currency        TEXT DEFAULT 'USD',
  unit            TEXT,
  price_term      TEXT DEFAULT 'FOB',
  min_order       INTEGER,
  delivery_days   INTEGER,
	  validity_days   INTEGER DEFAULT 30,
	  followup_style  TEXT DEFAULT 'business',
	  status          TEXT DEFAULT 'draft',
	  sent_at         TEXT,
	  followup_reminder_sent INTEGER DEFAULT 0,
	  created_at      TEXT DEFAULT (datetime('now'))
	);

-- 回复记录
CREATE TABLE IF NOT EXISTS inquiry_replies (
  id              TEXT PRIMARY KEY,
  inquiry_id      TEXT REFERENCES inquiries(id),
  quotation_id    TEXT REFERENCES quotations(id),
  reply_type      TEXT NOT NULL,
  content_zh      TEXT,
  content_en      TEXT,
  send_status     TEXT DEFAULT 'draft',
  sent_at         TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- 积分流水
CREATE TABLE IF NOT EXISTS credit_ledger (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT REFERENCES tenants(id),
  type            TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  description     TEXT,
  task_id         TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Agent 操作日志
CREATE TABLE IF NOT EXISTS agent_logs (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT REFERENCES tenants(id),
  instance_id     TEXT REFERENCES openclaw_instances(id),
  action_type     TEXT NOT NULL,
  platform        TEXT,
  target_url      TEXT,
  status          TEXT DEFAULT 'success',
  credits_used    INTEGER DEFAULT 0,
  detail          TEXT DEFAULT '{}',
  created_at      TEXT DEFAULT (datetime('now'))
);
`;

// 执行建表
db.exec(INIT_SQL);

// ─── 种子数据（首次启动时插入）──────────────────────────────────
const tenantCount = (db.prepare("SELECT COUNT(*) as c FROM tenants").get() as any).c;
if (tenantCount === 0) {
  console.log("🌱 初始化演示数据...");
  seedDemoData();
}

function seedDemoData() {
  const tenantId = "demo-tenant-001";
  const userId = "demo-user-001";
  const instanceId = "demo-claw-001";

  db.prepare(`
    INSERT INTO tenants (id, name, plan_type, industry, credits_balance)
    VALUES (?, ?, ?, ?, ?)
  `).run(tenantId, "明辉照明有限公司", "enterprise", "照明/LED", 2840);

  // 密码: admin123
  const passwordHash = bcrypt.hashSync("admin123", 10);
  db.prepare(`
    INSERT INTO users (id, tenant_id, name, phone, email, password_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, tenantId, "李总", "13800138000", "admin@minghui.com", passwordHash);

  db.prepare(`
    INSERT INTO openclaw_instances (id, tenant_id, name, status, ops_today, ops_limit)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(instanceId, tenantId, "李总的OpenClaw", "online", 47, 200);

  // 社媒账号
  const platforms = [
    { id: "acc-001", platform: "linkedin", account_name: "Ming Hui Lighting", health_status: "normal", daily_ops_used: 12, daily_ops_limit: 20 },
    { id: "acc-002", platform: "facebook", account_name: "明辉照明官方", health_status: "normal", daily_ops_used: 8, daily_ops_limit: 30 },
    { id: "acc-003", platform: "tiktok", account_name: "@minghui_led", health_status: "warning", daily_ops_used: 45, daily_ops_limit: 50 },
    { id: "acc-004", platform: "whatsapp", account_name: "+86 138 0013 8000", health_status: "normal", daily_ops_used: 5, daily_ops_limit: 20 },
  ];
  for (const p of platforms) {
    db.prepare(`
      INSERT INTO social_accounts (id, instance_id, tenant_id, platform, account_name, health_status, daily_ops_used, daily_ops_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(p.id, instanceId, tenantId, p.platform, p.account_name, p.health_status, p.daily_ops_used, p.daily_ops_limit);
  }

  // 询盘数据
  const now = Date.now();
  const inquiries = [
    {
      id: "inq-001",
      source_platform: "alibaba",
      buyer_name: "Nguyen Van A",
      buyer_company: "SunPower Solutions",
      buyer_country: "越南",
      buyer_contact: "nguyen@sunpower.vn",
      product_name: "太阳能板",
      quantity: "5000件",
      raw_content: "Hi, we are interested in your solar panels. We need 5000 units for our project in Vietnam. Please send us your best price for 300W panels. MOQ and delivery time?",
      ai_summary: "越南买家询问 300W 太阳能板 5000 件，需要报价和交货期",
      ai_draft_cn: "您好！感谢您的询问。\n\n我们的 300W 太阳能板现货充足，5000 件批量价格极具竞争力。\n\n报价：$0.28/W（FOB 深圳），即 $84/件\n最小起订量：500 件\n交货期：30 天\n\n如需样品，可安排免费寄送。请问您方便提供 WhatsApp 联系方式吗？",
      ai_draft_en: "Dear Nguyen,\n\nThank you for your inquiry about our 300W solar panels.\n\nWe are pleased to offer: $0.28/W (FOB Shenzhen) = $84/unit for 5,000 units.\nMOQ: 500 units | Delivery: 30 days\n\nFree samples available. Could you share your WhatsApp for faster communication?\n\nBest regards,\nMing Hui Lighting",
      ai_analysis: "阿里巴巴 RFQ：越南太阳能项目，数量大（5000件），买家信息完整。高置信度询盘，建议优先处理。",
      estimated_value: 420000,
      confidence_score: 87,
      confidence_breakdown: JSON.stringify({ channelWeight: 30, contentQuality: 32, buyerCompleteness: 25 }),
      status: "unread",
      urgency: "high",
      tags: JSON.stringify(["阿里RFQ", "越南市场", "大单"]),
      received_at: new Date(now - 3 * 60 * 1000).toISOString(),
    },
    {
      id: "inq-002",
      source_platform: "geo",
      buyer_name: "Klaus Weber",
      buyer_company: "EcoHome Trading GmbH",
      buyer_country: "德国",
      buyer_contact: "k.weber@ecohome.de",
      product_name: "户外家具套装",
      quantity: null,
      raw_content: "Found your company through Perplexity AI search. We are looking for outdoor furniture suppliers for the European market. CE certification required.",
      ai_summary: "德国买家通过 AI 搜索找到，询问户外家具欧洲市场供应，需要 CE 认证",
      ai_draft_cn: "您好 Klaus！\n\n感谢您通过 AI 搜索找到我们！我们的户外家具系列均已通过 CE 认证，符合欧盟标准。\n\n我们可以提供：铝合金户外桌椅套装、柚木户外家具、PE 藤编系列\n\n请问您主要面向哪个价格段的市场？我们可以根据您的需求定制方案。",
      ai_draft_en: "Dear Klaus,\n\nGreat to connect! We found you through AI search as well.\n\nAll our outdoor furniture is CE certified and ready for the European market. We offer aluminum, teak, and PE rattan collections.\n\nWhat price segment are you targeting? We can customize solutions for your market.\n\nBest regards,\nMing Hui",
      ai_analysis: "GEO 引流：德国买家主动通过 AI 搜索找到，说明 GEO 优化有效。买家信息完整，欧洲市场高价值。",
      estimated_value: 80000,
      confidence_score: 72,
      confidence_breakdown: JSON.stringify({ channelWeight: 20, contentQuality: 28, buyerCompleteness: 24 }),
      status: "unread",
      urgency: "normal",
      tags: JSON.stringify(["GEO引流", "德国市场", "CE认证"]),
      received_at: new Date(now - 18 * 60 * 1000).toISOString(),
    },
    {
      id: "inq-003",
      source_platform: "linkedin",
      buyer_name: "Mike Johnson",
      buyer_company: "Pacific Imports LLC",
      buyer_country: "美国",
      buyer_contact: "mike@pacificimports.com",
      product_name: "LED 灯具 OEM",
      quantity: "10000件/月",
      raw_content: "Hi, I'm the procurement manager at Pacific Imports. We're looking for an LED lighting OEM partner for our US retail chain. Monthly volume: 10,000 units. Need UL certification.",
      ai_summary: "美国采购经理寻找 LED 灯具 OEM 合作，月量 1 万件，需要 UL 认证",
      ai_draft_cn: "您好 Mike！\n\n感谢您的 LinkedIn 私信！我们是专业 LED 灯具 OEM 制造商，已服务多家美国零售连锁品牌。\n\n我们的优势：UL/ETL 认证齐全、月产能 50 万件、支持 OEM/ODM、提供免费打样\n\n建议我们安排一次视频会议，详细了解您的产品需求。您这周哪天方便？",
      ai_draft_en: "Hi Mike,\n\nThank you for reaching out on LinkedIn! We specialize in LED lighting OEM for US retail chains.\n\nOur advantages: Full UL/ETL certifications, 500K monthly capacity, OEM/ODM support, free samples.\n\nShall we schedule a video call this week to discuss your product requirements in detail?\n\nBest,\nMing Hui Lighting",
      ai_analysis: "LinkedIn 私信：美国采购经理，月量大（1万件），有明确认证需求。高价值 B2B 询盘，建议安排视频会议。",
      estimated_value: 450000,
      confidence_score: 91,
      confidence_breakdown: JSON.stringify({ channelWeight: 30, contentQuality: 35, buyerCompleteness: 26 }),
      status: "unquoted",
      urgency: "high",
      tags: JSON.stringify(["LinkedIn", "美国市场", "OEM", "大单"]),
      received_at: new Date(now - 60 * 60 * 1000).toISOString(),
    },
    {
      id: "inq-004",
      source_platform: "geo",
      buyer_name: "Erik Lindqvist",
      buyer_company: "Nordik Furniture AB",
      buyer_country: "瑞典",
      buyer_contact: "erik@nordik.se",
      product_name: "实木家具",
      quantity: null,
      raw_content: "We found your company when searching for solid wood furniture suppliers on ChatGPT. We are interested in establishing a long-term supply relationship.",
      ai_summary: "瑞典家具公司通过 ChatGPT 搜索找到，寻求实木家具长期供应合作",
      ai_draft_cn: "您好 Erik！\n\n很高兴通过 ChatGPT 搜索与您相识！我们是中国领先的实木家具制造商，主要出口北欧市场。\n\n我们的实木家具系列：橡木、榉木、胡桃木，均符合 FSC 认证要求，适合北欧市场的环保标准。\n\n请问您目前主要采购哪类实木家具？我们可以发送产品目录。",
      ai_draft_en: "Dear Erik,\n\nDelighted to connect through ChatGPT search! We are a leading solid wood furniture manufacturer in China, specializing in the Nordic market.\n\nOur collections: Oak, Beech, Walnut - all FSC certified, meeting Nordic environmental standards.\n\nWhat types of solid wood furniture are you currently sourcing? We'd love to send our catalog.\n\nBest regards",
      ai_analysis: "GEO 引流：瑞典买家通过 ChatGPT 找到，寻求长期合作。北欧市场高端，重视环保认证。",
      estimated_value: 60000,
      confidence_score: 68,
      confidence_breakdown: JSON.stringify({ channelWeight: 20, contentQuality: 25, buyerCompleteness: 23 }),
      status: "quoted",
      urgency: "normal",
      tags: JSON.stringify(["GEO引流", "瑞典市场", "FSC认证"]),
      received_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "inq-005",
      source_platform: "facebook",
      buyer_name: "Sarah Chen",
      buyer_company: "BuildRight Corp",
      buyer_country: "加拿大",
      buyer_contact: "s.chen@buildright.ca",
      product_name: "建材配件",
      quantity: "MOQ 100",
      raw_content: "Hello! I saw your post on Facebook. We need building material accessories for our construction projects in Canada. MOQ 100 units. What's your price?",
      ai_summary: "加拿大建材公司通过 Facebook 询问建材配件价格，MOQ 100",
      ai_draft_cn: "您好 Sarah！\n\n感谢您在 Facebook 上联系我们！我们的建材配件系列非常适合加拿大市场。\n\nMOQ 100 件起，价格根据具体规格而定。请问您需要哪类建材配件？我们可以提供详细报价单。",
      ai_draft_en: "Hi Sarah,\n\nThank you for reaching out on Facebook! Our building material accessories are well-suited for the Canadian market.\n\nStarting from MOQ 100 units. Pricing depends on specific specifications. What type of accessories do you need? We can provide a detailed quotation.\n\nBest regards",
      ai_analysis: "Facebook 私信：加拿大建材公司，数量适中，买家信息完整。中等置信度，建议发送产品目录。",
      estimated_value: 28000,
      confidence_score: 65,
      confidence_breakdown: JSON.stringify({ channelWeight: 22, contentQuality: 24, buyerCompleteness: 19 }),
      status: "no_reply",
      urgency: "low",
      tags: JSON.stringify(["Facebook", "加拿大市场"]),
      received_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "inq-006",
      source_platform: "tiktok",
      buyer_name: "Raj Patel",
      buyer_company: "个人采购",
      buyer_country: "印度",
      buyer_contact: null,
      product_name: "太阳能板",
      quantity: "50件",
      raw_content: "How much for 50 solar panels? Need for rooftop project in Mumbai. Please DM me price.",
      ai_summary: "印度买家通过 TikTok 评论询问 50 件太阳能板价格，用于孟买屋顶项目",
      ai_draft_cn: "您好！感谢您的询问。\n\n50件太阳能板用于孟买屋顶项目，请问您需要什么功率？我们有 200W-600W 多种规格。\n\n如方便，请提供您的 WhatsApp 号码，我们可以发送详细报价。",
      ai_draft_en: "Hello! Thank you for your inquiry.\n\nFor 50 solar panels for your Mumbai rooftop project, what wattage do you need? We have options from 200W to 600W.\n\nIf convenient, please share your WhatsApp number so we can send you a detailed quote.",
      ai_analysis: "TikTok 评论转入：个人屋顶项目，数量小（50件），买家信息不完整。低置信度，建议发送标准询问模板。",
      estimated_value: 4200,
      confidence_score: 38,
      confidence_breakdown: JSON.stringify({ channelWeight: 10, contentQuality: 15, buyerCompleteness: 13 }),
      status: "unread",
      urgency: "low",
      tags: JSON.stringify(["TikTok转入", "印度市场", "小单"]),
      received_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const insertInquiry = db.prepare(`
    INSERT INTO inquiries (
      id, tenant_id, source_platform, buyer_name, buyer_company, buyer_country, buyer_contact,
      product_name, quantity, raw_content, ai_summary, ai_draft_cn, ai_draft_en, ai_analysis,
      estimated_value, confidence_score, confidence_breakdown, status, urgency, tags, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const inq of inquiries) {
    insertInquiry.run(
      inq.id, tenantId, inq.source_platform, inq.buyer_name, inq.buyer_company,
      inq.buyer_country, inq.buyer_contact ?? null, inq.product_name, inq.quantity ?? null,
      inq.raw_content, inq.ai_summary, inq.ai_draft_cn, inq.ai_draft_en, inq.ai_analysis,
      inq.estimated_value, inq.confidence_score, inq.confidence_breakdown,
      inq.status, inq.urgency, inq.tags, inq.received_at
    );
  }

  // 为 inq-004 添加一条报价记录
  db.prepare(`
    INSERT INTO quotations (id, inquiry_id, tenant_id, product_name, unit_price, currency, unit, price_term, min_order, delivery_days, followup_style, status, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("quot-001", "inq-004", tenantId, "实木橡木餐桌套装", 280, "USD", "套", "FOB", 20, 45, "business", "sent", new Date(now - 90 * 60 * 1000).toISOString());

  // Agent 操作日志
  const agentActions = [
    { id: "log-001", action_type: "linkedin_message_sent", platform: "linkedin", status: "success", credits_used: 5, detail: JSON.stringify({ to: "Mike Johnson", preview: "Thank you for reaching out..." }) },
    { id: "log-002", action_type: "alibaba_rfq_monitored", platform: "alibaba", status: "success", credits_used: 2, detail: JSON.stringify({ rfq_count: 12, new_count: 3 }) },
    { id: "log-003", action_type: "tiktok_comment_replied", platform: "tiktok", status: "success", credits_used: 3, detail: JSON.stringify({ comment_id: "tt_123456", preview: "Hello! Thank you..." }) },
    { id: "log-004", action_type: "geo_content_published", platform: "geo", status: "success", credits_used: 10, detail: JSON.stringify({ platform: "perplexity", title: "LED Lighting Manufacturer China" }) },
    { id: "log-005", action_type: "facebook_message_sent", platform: "facebook", status: "success", credits_used: 5, detail: JSON.stringify({ to: "Sarah Chen", preview: "Hi Sarah, thank you..." }) },
  ];
  for (const log of agentActions) {
    db.prepare(`
      INSERT INTO agent_logs (id, tenant_id, instance_id, action_type, platform, status, credits_used, detail, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(log.id, tenantId, instanceId, log.action_type, log.platform, log.status, log.credits_used, log.detail, new Date(now - Math.floor(Math.random() * 3600000)).toISOString());
  }

  console.log("✅ 演示数据初始化完成（6条询盘，4个社媒账号，5条操作日志）");
}

export default db;
