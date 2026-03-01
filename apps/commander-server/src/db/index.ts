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
  role            TEXT DEFAULT 'user',
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
  config          TEXT DEFAULT '{}',
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
  reply_type      TEXT,  -- nullable: reply 路由不强制传入
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

-- Phase 3: 信息流条目（管理方上传）
CREATE TABLE IF NOT EXISTS feed_items (
  id              TEXT PRIMARY KEY,
  media_type      TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'image' | 'video'
  media_url       TEXT,                          -- video: 'vid:xxxxx' (VOD vid)
  buyer_company   TEXT NOT NULL DEFAULT '',
  buyer_country   TEXT NOT NULL DEFAULT '',
  buyer_name      TEXT,
  product_name    TEXT NOT NULL DEFAULT '',
  quantity        TEXT,
  raw_content     TEXT,
  industry        TEXT DEFAULT 'other',          -- 'furniture' | 'textile' | 'other'
  estimated_value INTEGER DEFAULT 0,
  confidence_score INTEGER DEFAULT 0,
  ai_summary      TEXT,
  ai_tags         TEXT DEFAULT '[]',
  status          TEXT DEFAULT 'active',         -- 'active' | 'archived' | 'published' | 'pending'
  created_by      TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  -- Phase 3 Video fields
  title           TEXT,
  description     TEXT,
  company_name    TEXT,
  tags            TEXT DEFAULT '[]',
  cover_url       TEXT,
  duration        INTEGER DEFAULT 0,
  likes_count     INTEGER DEFAULT 0,
  views_count     INTEGER DEFAULT 0
);

-- Phase 3: 收藏记录
CREATE TABLE IF NOT EXISTS bookmarks (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT REFERENCES tenants(id),
  user_id         TEXT REFERENCES users(id),
  feed_item_id    TEXT REFERENCES feed_items(id),
  inquiry_id      TEXT REFERENCES inquiries(id),
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Phase 3: 行业知识库
CREATE TABLE IF NOT EXISTS industry_knowledge (
  id              TEXT PRIMARY KEY,
  industry        TEXT NOT NULL,        -- 'furniture' | 'textile'
  category        TEXT NOT NULL,        -- 'price_range' | 'term' | 'template' | 'cert'
  key             TEXT NOT NULL,        -- 知识点名称
  value           TEXT NOT NULL,        -- 知识点内容
  source          TEXT DEFAULT 'seed',  -- 'seed' | 'learned'
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Phase 3: 用户偏好（推荐引擎使用）
CREATE TABLE IF NOT EXISTS user_preferences (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT REFERENCES tenants(id),
  user_id         TEXT REFERENCES users(id),
  preferred_industries TEXT DEFAULT '[]',
  preferred_products   TEXT DEFAULT '[]',
  skipped_products     TEXT DEFAULT '[]',
  daily_quota_used     INTEGER DEFAULT 0,
  quota_reset_date     TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
`;

/// 执行建表
db.exec(INIT_SQL);

// ─── Phase 3 Sprint 3.1: 故障自愈字段迁移 ─────────────────────────────────
// 使用 ALTER TABLE ... ADD COLUMN IF NOT EXISTS（SQLite 3.37+）
// 若列已存在则静默忽略
try {
  db.exec(`ALTER TABLE openclaw_instances ADD COLUMN consecutive_failures INTEGER DEFAULT 0`);
} catch { /* 列已存在，忽略 */ }
try {
  db.exec(`ALTER TABLE openclaw_instances ADD COLUMN sleep_until TEXT`);
} catch { /* 列已存在，忽略 */ }
try {
  db.exec(`ALTER TABLE openclaw_instances ADD COLUMN last_failure_at TEXT`);
} catch { /* 列已存在，忽略 */ }

// Phase 3 Sprint 3.2: 产品概念图字段迁移
try {
  db.exec(`ALTER TABLE inquiries ADD COLUMN concept_image_url TEXT`);
} catch { /* 列已存在，忽略 */ }
try {
  db.exec(`ALTER TABLE inquiries ADD COLUMN concept_image_status TEXT DEFAULT 'none'`);
  // 'none' | 'generating' | 'done' | 'failed'
} catch { /* 列已存在，忽略 */ }

// Phase 3 Sprint 3.2: Whisper 转录字段迁移
try {
  db.exec(`ALTER TABLE feed_items ADD COLUMN transcript TEXT`);
} catch { /* 列已存在，忽略 */ }
try {
  db.exec(`ALTER TABLE feed_items ADD COLUMN transcript_status TEXT DEFAULT 'none'`);
  // 'none' | 'pending' | 'processing' | 'done' | 'failed'
} catch { /* 列已存在，忽略 */ }

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
    INSERT INTO users (id, tenant_id, name, phone, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, tenantId, "李总", "13800138000", "admin@minghui.com", passwordHash, "admin");

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

  // Phase 3: 信息流种子数据（已清空 Mock 数据，视频由管理员通过 VOD 上传）
  const feedItems: any[] = [  // 空数组，不插入 Mock 数据
  /*
    {
      id: "feed-001",
      media_type: "text",
      buyer_company: "Nordic Home AB",
      buyer_country: "瑞典",
      buyer_name: "Erik Lindqvist",
      product_name: "实木餐桌套装",
      quantity: "200套/月",
      raw_content: "We are looking for solid wood dining table sets for our Scandinavian home brand. Need FSC certified oak or beech. Monthly volume 200 sets.",
      industry: "furniture",
      estimated_value: 56000,
      confidence_score: 88,
      ai_summary: "瑞典北欧家居品牌，寻求 FSC 认证实木餐桌套装，月量 200 套，高意向大客户",
      ai_tags: JSON.stringify(["北欧市场", "FSC认证", "实木家具", "大单"]),
    },
    {
      id: "feed-002",
      media_type: "text",
      buyer_company: "EcoTextile GmbH",
      buyer_country: "德国",
      buyer_name: "Anna Mueller",
      product_name: "有机棉 T 恤",
      quantity: "5000件/次",
      raw_content: "We need GOTS certified organic cotton t-shirts for our sustainable fashion brand. 5000 pieces per order, multiple colors.",
      industry: "textile",
      estimated_value: 25000,
      confidence_score: 82,
      ai_summary: "德国可持续时尚品牌，需要 GOTS 认证有机棉 T 恤，单次 5000 件",
      ai_tags: JSON.stringify(["欧洲市场", "GOTS认证", "有机棉", "可持续时尚"]),
    },
    {
      id: "feed-003",
      media_type: "text",
      buyer_company: "Pacific Furniture Co",
      buyer_country: "美国",
      buyer_name: "James Wilson",
      product_name: "皮质沙发套装",
      quantity: "100套/月",
      raw_content: "Looking for leather sofa sets for our US furniture retail chain. Need CARB certified, genuine leather preferred. Monthly 100 sets.",
      industry: "furniture",
      estimated_value: 45000,
      confidence_score: 79,
      ai_summary: "美国家具零售链，寻求 CARB 认证真皮沙发，月量 100 套",
      ai_tags: JSON.stringify(["美国市场", "CARB认证", "皮质沙发", "零售链"]),
    },
    {
      id: "feed-004",
      media_type: "text",
      buyer_company: "Tokyo Living KK",
      buyer_country: "日本",
      buyer_name: "Tanaka Hiroshi",
      product_name: "竹纤维毛巾",
      quantity: "10000条/次",
      raw_content: "We are looking for bamboo fiber towels for our Japanese hotel chain. Need F**** formaldehyde certification. 10000 pieces per order.",
      industry: "textile",
      estimated_value: 18000,
      confidence_score: 75,
      ai_summary: "日本酒店链寻求竹纤维毛巾，需要 F★★★★ 甲醇认证，单次 10000 条",
      ai_tags: JSON.stringify(["日本市场", "竹纤维", "酒店用品", "F★★★★认证"]),
    },
    {
      id: "feed-005",
      media_type: "text",
      buyer_company: "Dubai Interiors LLC",
      buyer_country: "阿联酋",
      buyer_name: "Mohammed Al-Rashid",
      product_name: "藤编户外家具",
      quantity: "500套",
      raw_content: "We need outdoor rattan furniture for luxury villa projects in Dubai. High-end quality, weather resistant. 500 sets total.",
      industry: "furniture",
      estimated_value: 75000,
      confidence_score: 71,
      ai_summary: "迪拜豪华别墅项目，需要高端耐候藤编户外家具 500 套",
      ai_tags: JSON.stringify(["中东市场", "豪华别墅", "户外家具", "高端定制"]),
    },
    {
      id: "feed-006",
      media_type: "text",
      buyer_company: "Seoul Fashion House",
      buyer_country: "韩国",
      buyer_name: "Kim Ji-yeon",
      product_name: "亚麻面料",
      quantity: "3000米/次",
      raw_content: "Looking for linen fabric for our Korean fashion brand. Need OEKO-TEX certified. 3000 meters per order, various colors.",
      industry: "textile",
      estimated_value: 15000,
      confidence_score: 68,
      ai_summary: "韩国时尚品牌，需要 OEKO-TEX 认证亚麻面料，单次 3000 米",
      ai_tags: JSON.stringify(["韩国市场", "OEKO-TEX认证", "亚麻面料", "时尚品牌"]),
    },
    {
      id: "feed-007",
      media_type: "text",
      buyer_company: "London Home Decor Ltd",
      buyer_country: "英国",
      buyer_name: "Sophie Brown",
      product_name: "橡木书柜",
      quantity: "50件/次",
      raw_content: "We are sourcing oak bookshelves for our UK interior design studio. CE certified, flat-pack preferred. 50 units per order.",
      industry: "furniture",
      estimated_value: 8500,
      confidence_score: 65,
      ai_summary: "英国室内设计工作室，寻求 CE 认证橡木书柜，平板包装，单次 50 件",
      ai_tags: JSON.stringify(["英国市场", "CE认证", "实木家具", "平板包装"]),
    },
    {
      id: "feed-008",
      media_type: "text",
      buyer_company: "Sydney Textile Imports",
      buyer_country: "澳大利亚",
      buyer_name: "Michael Chen",
      product_name: "有机棉婴儿服装",
      quantity: "8000件/季",
      raw_content: "Looking for GOTS certified organic cotton baby clothing for Australian market. 8000 pieces per season, safety standards required.",
      industry: "textile",
      estimated_value: 32000,
      confidence_score: 84,
      ai_summary: "澳大利亚进口商，寻求 GOTS 认证有机棉婴儿服，季度 8000 件",
      ai_tags: JSON.stringify(["澳大利亚市场", "GOTS认证", "婴儿服装", "有机棉"]),
    },
    {
      id: "feed-009",
      media_type: "text",
      buyer_company: "Toronto Furniture Group",
      buyer_country: "加拿大",
      buyer_name: "David Park",
      product_name: "实木床架",
      quantity: "150张/月",
      raw_content: "We need solid wood bed frames for our Canadian furniture retail chain. CARB certified, various sizes. Monthly 150 units.",
      industry: "furniture",
      estimated_value: 22500,
      confidence_score: 77,
      ai_summary: "加拿大家具零售链，需要 CARB 认证实木床架，月量 150 张",
      ai_tags: JSON.stringify(["加拿大市场", "CARB认证", "实木床架", "零售链"]),
    },
    {
      id: "feed-010",
      media_type: "text",
      buyer_company: "Amsterdam Eco Fashion",
      buyer_country: "荷兰",
      buyer_name: "Lars van den Berg",
      product_name: "竹纤维T恤",
      quantity: "3000件/次",
      raw_content: "We are looking for bamboo fiber t-shirts for our Dutch sustainable fashion brand. Bluesign certified preferred. 3000 pieces per order.",
      industry: "textile",
      estimated_value: 12000,
      confidence_score: 72,
      ai_summary: "荷兰可持续时尚品牌，寻求 Bluesign 认证竹纤维T恤，单次 3000 件",
      ai_tags: JSON.stringify(["欧洲市场", "Bluesign认证", "竹纤维", "可持续时尚"]),
    },
  */
  ];
  // feedItems 为空，无需插入

  // Phase 3: 行业知识库种子数据
  const knowledgeItems = [
    // 家具行业
    { id: "kb-001", industry: "furniture", category: "price_range", key: "实木餐桌", value: "FOB $80-$350/套，视材质和工艺" },
    { id: "kb-002", industry: "furniture", category: "price_range", key: "皮质沙发", value: "FOB $150-$800/套，真皮 vs PU 差异大" },
    { id: "kb-003", industry: "furniture", category: "price_range", key: "藤编户外家具", value: "FOB $60-$200/套" },
    { id: "kb-004", industry: "furniture", category: "price_range", key: "实木床架", value: "FOB $120-$450/张，视材质和尺寸" },
    { id: "kb-005", industry: "furniture", category: "price_range", key: "橡木书柜", value: "FOB $80-$280/件，平板包装可降低 20%" },
    { id: "kb-006", industry: "furniture", category: "cert", key: "欧洲市场", value: "CE 认证、REACH 法规、FSC 木材认证" },
    { id: "kb-007", industry: "furniture", category: "cert", key: "美国市场", value: "CARB 认证（甲醇）、ASTM 标准" },
    { id: "kb-008", industry: "furniture", category: "cert", key: "日本市场", value: "JIS 标准、F★★★★ 甲醇等级" },
    { id: "kb-009", industry: "furniture", category: "term", key: "交货条款", value: "FOB、CIF、EXW、DAP" },
    { id: "kb-010", industry: "furniture", category: "term", key: "包装", value: "Flat-pack / KD（平板包装）、RTA（即装）" },
    { id: "kb-011", industry: "furniture", category: "template", key: "标准报价", value: "含价格、MOQ、交货期、付款方式、有效期" },
    { id: "kb-012", industry: "furniture", category: "template", key: "24h 跟进", value: "商务/友好/强势三种风格" },
    // 纵织行业
    { id: "kb-013", industry: "textile", category: "price_range", key: "有机棉 T 恤", value: "FOB $2.5-$8/件，视克重和印花" },
    { id: "kb-014", industry: "textile", category: "price_range", key: "亚麻面料", value: "FOB $3-$12/米，视密度和宽幅" },
    { id: "kb-015", industry: "textile", category: "price_range", key: "竹纤维毛巾", value: "FOB $1.2-$4/条，视克重" },
    { id: "kb-016", industry: "textile", category: "price_range", key: "竹纤维T恤", value: "FOB $3-$9/件，比有机棉轻盈且更环保" },
    { id: "kb-017", industry: "textile", category: "price_range", key: "婴儿服装", value: "FOB $2-$6/件，有机棉安全要求高" },
    { id: "kb-018", industry: "textile", category: "cert", key: "有机棉", value: "GOTS 认证（全球有机纵织品标准）" },
    { id: "kb-019", industry: "textile", category: "cert", key: "环保面料", value: "OEKO-TEX Standard 100" },
    { id: "kb-020", industry: "textile", category: "cert", key: "欧洲市场", value: "REACH 法规、Bluesign" },
    { id: "kb-021", industry: "textile", category: "term", key: "面料规格", value: "克重（GSM）、纱支（支/英寸）、幅宽" },
    { id: "kb-022", industry: "textile", category: "term", key: "工艺", value: "活性染色、数码印花、提花、刺绣" },
    { id: "kb-023", industry: "textile", category: "template", key: "面料报价", value: "含克重、幅宽、颜色数、MOQ、交货期" },
    { id: "kb-024", industry: "textile", category: "template", key: "成衣报价", value: "含尺码范围、面料成分、洗涤标签要求" },
  ];
  const insertKnowledge = db.prepare(`
    INSERT INTO industry_knowledge (id, industry, category, key, value)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const item of knowledgeItems) {
    insertKnowledge.run(item.id, item.industry, item.category, item.key, item.value);
  }

  console.log("✅ 演示数据初始化完成（6条询盘，4个社媒账号，5条操作日志，24条知识库）");
}

export default db;
