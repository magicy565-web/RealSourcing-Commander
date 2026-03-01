/**
 * Phase 5 — Sprint 5.4
 * ROI 计算器与商业化闭环路由
 *
 * GET  /api/v1/roi/summary        ROI 汇总（节省工时、成本等）
 * GET  /api/v1/roi/calculator     详细工时节省计算
 * GET  /api/v1/roi/funnel         成交漏斗数据（细化状态）
 * PATCH /api/v1/roi/funnel/:id    更新询盘漏斗状态
 */
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { db } from "../db/index.js";

const roi = new Hono();
roi.use("*", authMiddleware);

// ─── 工时计算常量 ─────────────────────────────────────────────
const TIME_SAVINGS = {
  inquiry_analysis: 15,    // 分析一条询盘节省 15 分钟
  draft_generation: 20,    // 生成一份草稿节省 20 分钟
  quote_preparation: 30,   // AI 辅助报价节省 30 分钟
  followup_reminder: 5,    // 跟进提醒节省 5 分钟
  social_reply: 10,        // 社媒回复节省 10 分钟
  translation: 15,         // 翻译节省 15 分钟
};

const HOURLY_RATE_USD = 15; // 外贸业务员平均时薪（美元）

// ─── 确保漏斗状态字段 ─────────────────────────────────────────
function ensureFunnelFields() {
  const cols = (db.prepare("PRAGMA table_info(inquiries)").all() as any[]).map(c => c.name);
  if (!cols.includes("funnel_stage")) {
    db.exec(`ALTER TABLE inquiries ADD COLUMN funnel_stage TEXT DEFAULT 'lead'`);
  }
  if (!cols.includes("sample_sent_at")) {
    db.exec(`ALTER TABLE inquiries ADD COLUMN sample_sent_at TEXT`);
  }
  if (!cols.includes("deal_closed_at")) {
    db.exec(`ALTER TABLE inquiries ADD COLUMN deal_closed_at TEXT`);
  }
  if (!cols.includes("deal_value")) {
    db.exec(`ALTER TABLE inquiries ADD COLUMN deal_value REAL DEFAULT 0`);
  }
}
ensureFunnelFields();

// ─── GET /summary — ROI 汇总 ──────────────────────────────────
roi.get("/summary", (c) => {
  const { tenantId } = c.get("user") as any;

  // 询盘统计
  const inquiryStats = db.prepare(`
    SELECT
      COUNT(*) as total_inquiries,
      SUM(CASE WHEN ai_draft_en IS NOT NULL AND ai_draft_en != '' THEN 1 ELSE 0 END) as ai_drafted,
      SUM(CASE WHEN status = 'contracted' THEN 1 ELSE 0 END) as contracted,
      SUM(CASE WHEN status = 'quoted' THEN 1 ELSE 0 END) as quoted
    FROM inquiries WHERE tenant_id = ?
  `).get(tenantId) as any;

  // 报价统计
  const quotationStats = db.prepare(`
    SELECT COUNT(*) as total FROM quotations WHERE tenant_id = ?
  `).get(tenantId) as any;

  // 回复统计
  const replyStats = db.prepare(`
    SELECT COUNT(*) as total FROM inquiry_replies WHERE tenant_id = ?
  `).get(tenantId) as any;

  // 社媒消息统计
  const socialStats = (() => {
    try {
      return db.prepare(`
        SELECT COUNT(*) as total FROM social_messages WHERE tenant_id = ?
      `).get(tenantId) as any;
    } catch { return { total: 0 }; }
  })();

  // 计算节省工时
  const totalInquiries = inquiryStats?.total_inquiries ?? 0;
  const aiDrafted = inquiryStats?.ai_drafted ?? 0;
  const totalQuotations = quotationStats?.total ?? 0;
  const totalReplies = replyStats?.total ?? 0;
  const totalSocialMessages = socialStats?.total ?? 0;

  const minutesSaved =
    totalInquiries * TIME_SAVINGS.inquiry_analysis +
    aiDrafted * TIME_SAVINGS.draft_generation +
    totalQuotations * TIME_SAVINGS.quote_preparation +
    totalReplies * TIME_SAVINGS.followup_reminder +
    totalSocialMessages * TIME_SAVINGS.social_reply;

  const hoursSaved = Math.round(minutesSaved / 60 * 10) / 10;
  const costSaved = Math.round(hoursSaved * HOURLY_RATE_USD);

  // 成交价值
  const dealValue = (db.prepare(`
    SELECT SUM(estimated_value) as v FROM inquiries WHERE tenant_id = ? AND status = 'contracted'
  `).get(tenantId) as any)?.v ?? 0;

  // 管道价值（已报价但未成交）
  const pipelineValue = (db.prepare(`
    SELECT SUM(estimated_value) as v FROM inquiries WHERE tenant_id = ? AND status IN ('quoted', 'unquoted')
  `).get(tenantId) as any)?.v ?? 0;

  return c.json({
    roi: {
      hoursSaved,
      costSaved,
      minutesSaved,
      hourlyRate: HOURLY_RATE_USD,
    },
    business: {
      totalInquiries,
      aiDraftedCount: aiDrafted,
      aiDraftRate: totalInquiries > 0 ? Math.round((aiDrafted / totalInquiries) * 100) : 0,
      contractedCount: inquiryStats?.contracted ?? 0,
      conversionRate: totalInquiries > 0
        ? Math.round(((inquiryStats?.contracted ?? 0) / totalInquiries) * 100)
        : 0,
      dealValue,
      pipelineValue,
      totalQuotations,
      totalReplies,
    },
    efficiency: {
      avgTimePerInquiry: totalInquiries > 0 ? Math.round(minutesSaved / totalInquiries) : 0,
      productivityMultiplier: hoursSaved > 0 ? Math.round((hoursSaved / Math.max(1, totalInquiries * 0.5)) * 10) / 10 : 1,
    },
  });
});

// ─── GET /calculator — 详细工时节省计算 ──────────────────────────
roi.get("/calculator", (c) => {
  const { tenantId } = c.get("user") as any;

  const breakdown = [
    {
      category: "询盘智能分析",
      icon: "🔍",
      count: (db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ?").get(tenantId) as any)?.c ?? 0,
      minutesPerUnit: TIME_SAVINGS.inquiry_analysis,
      description: "AI 自动分析询盘意图、买家背景、置信度评分",
    },
    {
      category: "AI 草稿生成",
      icon: "✍️",
      count: (db.prepare(`
        SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND ai_draft_en IS NOT NULL AND ai_draft_en != ''
      `).get(tenantId) as any)?.c ?? 0,
      minutesPerUnit: TIME_SAVINGS.draft_generation,
      description: "AI 自动生成中英文回复草稿，无需从零撰写",
    },
    {
      category: "智能报价辅助",
      icon: "💰",
      count: (db.prepare("SELECT COUNT(*) as c FROM quotations WHERE tenant_id = ?").get(tenantId) as any)?.c ?? 0,
      minutesPerUnit: TIME_SAVINGS.quote_preparation,
      description: "AI 辅助报价单生成，自动计算利润空间",
    },
    {
      category: "跟进提醒自动化",
      icon: "⏰",
      count: (db.prepare(`
        SELECT COUNT(*) as c FROM inquiry_replies WHERE tenant_id = ?
      `).get(tenantId) as any)?.c ?? 0,
      minutesPerUnit: TIME_SAVINGS.followup_reminder,
      description: "24 小时自动跟进提醒，无需手动记录",
    },
    {
      category: "社媒评论处理",
      icon: "💬",
      count: (() => {
        try {
          return (db.prepare("SELECT COUNT(*) as c FROM social_messages WHERE tenant_id = ?").get(tenantId) as any)?.c ?? 0;
        } catch { return 0; }
      })(),
      minutesPerUnit: TIME_SAVINGS.social_reply,
      description: "AI 情感分析 + 回复草稿，快速处理社媒线索",
    },
  ].map(item => ({
    ...item,
    totalMinutes: item.count * item.minutesPerUnit,
    totalHours: Math.round((item.count * item.minutesPerUnit) / 60 * 10) / 10,
    costSaved: Math.round((item.count * item.minutesPerUnit / 60) * HOURLY_RATE_USD),
  }));

  const totalMinutes = breakdown.reduce((s, b) => s + b.totalMinutes, 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const totalCost = Math.round(totalHours * HOURLY_RATE_USD);

  return c.json({
    breakdown,
    total: {
      minutes: totalMinutes,
      hours: totalHours,
      costSaved: totalCost,
      hourlyRate: HOURLY_RATE_USD,
      equivalentDays: Math.round(totalHours / 8 * 10) / 10,
    },
    assumptions: {
      hourlyRate: `$${HOURLY_RATE_USD}/小时（外贸业务员平均薪资）`,
      workingHoursPerDay: 8,
      currency: "USD",
    },
  });
});

// ─── GET /funnel — 成交漏斗数据 ───────────────────────────────────
roi.get("/funnel", (c) => {
  const { tenantId } = c.get("user") as any;

  // 细化漏斗阶段（Phase 5 新增：已读、待跟进、已寄样、已成交）
  const stages = [
    { key: "unread", label: "新询盘", color: "#6366f1", description: "刚收到，尚未处理" },
    { key: "unquoted", label: "待报价", color: "#f59e0b", description: "已阅读，等待报价" },
    { key: "quoted", label: "已报价", color: "#3b82f6", description: "已发出报价，等待买家回复" },
    { key: "no_reply", label: "待跟进", color: "#f97316", description: "买家 24h 未回复，需要跟进" },
    { key: "sample_sent", label: "已寄样", color: "#8b5cf6", description: "已向买家寄送样品" },
    { key: "contracted", label: "已成交", color: "#10b981", description: "订单已确认" },
    { key: "transferred", label: "已转人工", color: "#64748b", description: "已转交人工处理" },
    { key: "expired", label: "已过期", color: "#ef4444", description: "询盘超时未处理" },
  ];

  const counts = db.prepare(`
    SELECT status, COUNT(*) as count, SUM(estimated_value) as value
    FROM inquiries WHERE tenant_id = ?
    GROUP BY status
  `).all(tenantId) as any[];

  const countMap: Record<string, { count: number; value: number }> = {};
  for (const row of counts) {
    countMap[row.status] = { count: row.count, value: row.value ?? 0 };
  }

  const total = Object.values(countMap).reduce((s, v) => s + v.count, 0);

  const funnelData = stages.map(stage => {
    const data = countMap[stage.key] ?? { count: 0, value: 0 };
    return {
      ...stage,
      count: data.count,
      value: data.value,
      percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
    };
  });

  // 漏斗转化率计算
  const unread = countMap["unread"]?.count ?? 0;
  const unquoted = countMap["unquoted"]?.count ?? 0;
  const quoted = countMap["quoted"]?.count ?? 0;
  const contracted = countMap["contracted"]?.count ?? 0;
  const topOfFunnel = unread + unquoted + quoted + contracted;

  return c.json({
    funnel: funnelData,
    conversionRates: {
      inquiryToQuote: topOfFunnel > 0 ? Math.round(((quoted + contracted) / topOfFunnel) * 100) : 0,
      quoteToContract: (quoted + contracted) > 0 ? Math.round((contracted / (quoted + contracted)) * 100) : 0,
      overallConversion: total > 0 ? Math.round((contracted / total) * 100) : 0,
    },
    totalInquiries: total,
    totalPipelineValue: Object.values(countMap).reduce((s, v) => s + v.value, 0),
    totalDealValue: countMap["contracted"]?.value ?? 0,
  });
});

// ─── PATCH /funnel/:id — 更新询盘漏斗状态 ────────────────────────
roi.patch("/funnel/:id", async (c) => {
  const { tenantId } = c.get("user") as any;
  const inquiryId = c.req.param("id");
  const { status, dealValue, funnelStage } = await c.req.json();

  const validStatuses = ["unread", "unquoted", "quoted", "no_reply", "sample_sent", "transferred", "contracted", "expired"];
  if (status && !validStatuses.includes(status)) {
    return c.json({ error: `status 必须是: ${validStatuses.join(", ")}` }, 400);
  }

  const inquiry = db.prepare(
    "SELECT id FROM inquiries WHERE id = ? AND tenant_id = ?"
  ).get(inquiryId, tenantId) as any;
  if (!inquiry) return c.json({ error: "询盘不存在" }, 404);

  const now = new Date().toISOString();
  const updates: string[] = ["updated_at = ?"];
  const params: any[] = [now];

  if (status) { updates.push("status = ?"); params.push(status); }
  if (dealValue !== undefined) { updates.push("deal_value = ?"); params.push(dealValue); }
  if (funnelStage) { updates.push("funnel_stage = ?"); params.push(funnelStage); }
  if (status === "contracted") { updates.push("deal_closed_at = ?"); params.push(now); }
  if (status === "sample_sent") { updates.push("sample_sent_at = ?"); params.push(now); }

  params.push(inquiryId);
  db.prepare(`UPDATE inquiries SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  return c.json({ success: true, status, updatedAt: now });
});

export default roi;
