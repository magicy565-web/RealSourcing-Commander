/**
 * Phase 5 — Sprint 5.2
 * GEO 市场洞察路由 (Market Insight)
 *
 * GET  /api/v1/geo/heatmap        全球买家热力图数据（基于真实询盘来源）
 * GET  /api/v1/geo/competitors    竞争对手分布分析
 * POST /api/v1/geo/strategy       AI 区域化报价策略建议
 * GET  /api/v1/geo/market-summary 市场概况摘要
 * GET  /api/v1/geo/top-markets    热门目标市场排行
 */
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { chat } from "../services/ai.js";

const geo = new Hono();
geo.use("*", authMiddleware);

// ─── 国家坐标映射 ─────────────────────────────────────────────
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; region: string }> = {
  "美国": { lat: 37.09, lng: -95.71, region: "北美" },
  "德国": { lat: 51.17, lng: 10.45, region: "欧洲" },
  "英国": { lat: 55.38, lng: -3.44, region: "欧洲" },
  "法国": { lat: 46.23, lng: 2.21, region: "欧洲" },
  "意大利": { lat: 41.87, lng: 12.57, region: "欧洲" },
  "西班牙": { lat: 40.46, lng: -3.75, region: "欧洲" },
  "荷兰": { lat: 52.13, lng: 5.29, region: "欧洲" },
  "波兰": { lat: 51.92, lng: 19.15, region: "欧洲" },
  "越南": { lat: 14.06, lng: 108.28, region: "东南亚" },
  "泰国": { lat: 15.87, lng: 100.99, region: "东南亚" },
  "印度尼西亚": { lat: -0.79, lng: 113.92, region: "东南亚" },
  "菲律宾": { lat: 12.88, lng: 121.77, region: "东南亚" },
  "马来西亚": { lat: 4.21, lng: 101.98, region: "东南亚" },
  "印度": { lat: 20.59, lng: 78.96, region: "南亚" },
  "巴基斯坦": { lat: 30.38, lng: 69.35, region: "南亚" },
  "孟加拉国": { lat: 23.68, lng: 90.36, region: "南亚" },
  "沙特阿拉伯": { lat: 23.89, lng: 45.08, region: "中东" },
  "阿联酋": { lat: 23.42, lng: 53.85, region: "中东" },
  "土耳其": { lat: 38.96, lng: 35.24, region: "中东" },
  "以色列": { lat: 31.05, lng: 34.85, region: "中东" },
  "巴西": { lat: -14.24, lng: -51.93, region: "南美" },
  "墨西哥": { lat: 23.63, lng: -102.55, region: "北美" },
  "阿根廷": { lat: -38.42, lng: -63.62, region: "南美" },
  "南非": { lat: -30.56, lng: 22.94, region: "非洲" },
  "尼日利亚": { lat: 9.08, lng: 8.68, region: "非洲" },
  "埃及": { lat: 26.82, lng: 30.80, region: "非洲" },
  "澳大利亚": { lat: -25.27, lng: 133.78, region: "大洋洲" },
  "新西兰": { lat: -40.90, lng: 174.89, region: "大洋洲" },
  "日本": { lat: 36.20, lng: 138.25, region: "东亚" },
  "韩国": { lat: 35.91, lng: 127.77, region: "东亚" },
  "加拿大": { lat: 56.13, lng: -106.35, region: "北美" },
  "未知": { lat: 0, lng: 0, region: "其他" },
};

// ─── GET /heatmap — 全球买家热力图数据 ───────────────────────────
geo.get("/heatmap", (c) => {
  const { tenantId } = c.get("user") as any;
  const { product } = c.req.query();

  // 基于真实询盘数据聚合买家分布
  let sql = `
    SELECT
      buyer_country,
      COUNT(*) as inquiry_count,
      SUM(estimated_value) as total_value,
      AVG(confidence_score) as avg_confidence,
      SUM(CASE WHEN status = 'contracted' THEN 1 ELSE 0 END) as contracted_count,
      SUM(CASE WHEN urgency = 'high' THEN 1 ELSE 0 END) as high_urgency_count
    FROM inquiries
    WHERE tenant_id = ?
  `;
  const params: any[] = [tenantId];

  if (product) {
    sql += " AND product_name LIKE ?";
    params.push(`%${product}%`);
  }

  sql += " GROUP BY buyer_country ORDER BY inquiry_count DESC";

  const rows = db.prepare(sql).all(...params) as any[];

  // 附加坐标和区域信息
  const heatmapData = rows.map(row => {
    const coords = COUNTRY_COORDS[row.buyer_country] ?? { lat: 0, lng: 0, region: "其他" };
    return {
      country: row.buyer_country,
      lat: coords.lat,
      lng: coords.lng,
      region: coords.region,
      inquiryCount: row.inquiry_count,
      totalValue: row.total_value ?? 0,
      avgConfidence: Math.round(row.avg_confidence ?? 0),
      contractedCount: row.contracted_count ?? 0,
      highUrgencyCount: row.high_urgency_count ?? 0,
      conversionRate: row.inquiry_count > 0
        ? Math.round((row.contracted_count / row.inquiry_count) * 100)
        : 0,
      intensity: Math.min(1.0, (row.inquiry_count / 10)), // 热力强度 0-1
    };
  });

  // 区域汇总
  const regionSummary: Record<string, { count: number; value: number }> = {};
  for (const d of heatmapData) {
    if (!regionSummary[d.region]) regionSummary[d.region] = { count: 0, value: 0 };
    regionSummary[d.region].count += d.inquiryCount;
    regionSummary[d.region].value += d.totalValue;
  }

  return c.json({
    heatmap: heatmapData,
    regionSummary: Object.entries(regionSummary).map(([region, data]) => ({
      region, ...data,
    })).sort((a, b) => b.count - a.count),
    totalCountries: heatmapData.length,
    totalInquiries: heatmapData.reduce((s, d) => s + d.inquiryCount, 0),
  });
});

// ─── GET /competitors — 竞争对手分布分析 ─────────────────────────
geo.get("/competitors", (c) => {
  const { tenantId } = c.get("user") as any;
  const { market } = c.req.query();

  // 基于行业知识库和模拟数据生成竞争对手分析
  const knowledge = db.prepare(`
    SELECT * FROM industry_knowledge WHERE tenant_id = ? LIMIT 20
  `).all(tenantId) as any[];

  // 模拟竞争对手数据（基于市场）
  const competitorsByMarket: Record<string, any[]> = {
    "欧洲": [
      { name: "Philips Lighting", country: "荷兰", lat: 52.13, lng: 5.29, strength: "高端品牌", marketShare: 18, threat: "high" },
      { name: "OSRAM", country: "德国", lat: 51.17, lng: 10.45, strength: "技术领先", marketShare: 15, threat: "high" },
      { name: "Signify", country: "荷兰", lat: 52.13, lng: 5.29, strength: "IoT集成", marketShare: 12, threat: "medium" },
    ],
    "东南亚": [
      { name: "Havells India", country: "印度", lat: 20.59, lng: 78.96, strength: "本地渠道", marketShare: 22, threat: "high" },
      { name: "Wipro Lighting", country: "印度", lat: 20.59, lng: 78.96, strength: "性价比", marketShare: 15, threat: "medium" },
      { name: "Panasonic Lighting", country: "日本", lat: 36.20, lng: 138.25, strength: "品牌信任", marketShare: 10, threat: "medium" },
    ],
    "北美": [
      { name: "GE Lighting", country: "美国", lat: 37.09, lng: -95.71, strength: "本土品牌", marketShare: 20, threat: "high" },
      { name: "Cree Lighting", country: "美国", lat: 37.09, lng: -95.71, strength: "LED技术", marketShare: 16, threat: "high" },
      { name: "Acuity Brands", country: "美国", lat: 37.09, lng: -95.71, strength: "商业照明", marketShare: 14, threat: "medium" },
    ],
    "中东": [
      { name: "Thorn Lighting", country: "英国", lat: 55.38, lng: -3.44, strength: "工程项目", marketShare: 18, threat: "medium" },
      { name: "Zumtobel", country: "德国", lat: 51.17, lng: 10.45, strength: "高端设计", marketShare: 12, threat: "low" },
    ],
  };

  const targetMarket = market ?? "欧洲";
  const competitors = competitorsByMarket[targetMarket] ?? competitorsByMarket["欧洲"];

  // 我方优势分析
  const ourAdvantages = [
    { aspect: "价格", score: 85, description: "FOB 价格比欧洲竞品低 30-40%" },
    { aspect: "定制化", score: 90, description: "支持 OEM/ODM，MOQ 低至 500 件" },
    { aspect: "认证", score: 75, description: "CE/UL/RoHS 认证齐全" },
    { aspect: "交货期", score: 70, description: "标准款 30 天，急单 15 天" },
    { aspect: "品牌知名度", score: 35, description: "海外品牌认知度有待提升" },
  ];

  return c.json({
    market: targetMarket,
    competitors,
    ourAdvantages,
    marketOpportunity: {
      score: 72,
      description: `${targetMarket}市场对中国制造商接受度较高，价格优势明显，建议重点突破中小型分销商渠道`,
      entryBarrier: "medium",
      recommendedStrategy: "价格+认证双轮驱动，优先开发分销商",
    },
    availableMarkets: Object.keys(competitorsByMarket),
  });
});

// ─── POST /strategy — AI 区域化报价策略建议 ──────────────────────
geo.post("/strategy", async (c) => {
  const { tenantId } = c.get("user") as any;
  const { country, product, estimatedValue } = await c.req.json();

  if (!country || !product) {
    return c.json({ error: "country 和 product 为必填项" }, 400);
  }

  const coords = COUNTRY_COORDS[country];
  const region = coords?.region ?? "其他";

  // 获取该国家的历史询盘数据
  const history = db.prepare(`
    SELECT status, confidence_score, estimated_value
    FROM inquiries
    WHERE tenant_id = ? AND buyer_country = ?
    ORDER BY received_at DESC LIMIT 10
  `).all(tenantId, country) as any[];

  const systemPrompt = `你是专业外贸报价策略顾问。
根据目标市场特点，为外贸企业提供个性化的报价策略和沟通建议。
严格输出 JSON，不要有其他文字。`;

  const userPrompt = `目标市场：${country}（${region}）
产品：${product}
预估订单金额：$${estimatedValue ?? 0}
历史询盘数量：${history.length}
历史成交率：${history.length > 0 ? Math.round((history.filter(h => h.status === "contracted").length / history.length) * 100) : 0}%

请提供：
{
  "tone": "建议的沟通语气（如：专业正式/热情亲和/简洁直接）",
  "pricingStrategy": "报价策略建议（如：先报区间价/直接给最优价/分阶段报价）",
  "keyPoints": ["沟通要点1", "沟通要点2", "沟通要点3"],
  "culturalTips": "文化注意事项（50字以内）",
  "followupTiming": "建议跟进时机（如：24小时内/3个工作日内）",
  "draftOpening": "建议的开场白（英文，2句话）",
  "riskWarning": "潜在风险提示（如：付款方式/认证要求等）",
  "opportunityScore": 0-100的整数（市场机会评分）
}`;

  try {
    const raw = await chat(systemPrompt, userPrompt, { temperature: 0.5, maxTokens: 600 });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("格式错误");
    const strategy = JSON.parse(match[0]);
    return c.json({ success: true, country, region, product, strategy });
  } catch (e: any) {
    return c.json({ error: "AI 策略生成失败", message: e.message }, 500);
  }
});

// ─── GET /market-summary — 市场概况摘要 ──────────────────────────
geo.get("/market-summary", (c) => {
  const { tenantId } = c.get("user") as any;

  const topCountries = db.prepare(`
    SELECT
      buyer_country,
      COUNT(*) as count,
      SUM(estimated_value) as total_value,
      SUM(CASE WHEN status = 'contracted' THEN 1 ELSE 0 END) as contracted
    FROM inquiries WHERE tenant_id = ?
    GROUP BY buyer_country
    ORDER BY count DESC
    LIMIT 10
  `).all(tenantId) as any[];

  const totalInquiries = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ?"
  ).get(tenantId) as any)?.c ?? 0;

  const totalContracted = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND status = 'contracted'"
  ).get(tenantId) as any)?.c ?? 0;

  const totalValue = (db.prepare(
    "SELECT SUM(estimated_value) as v FROM inquiries WHERE tenant_id = ?"
  ).get(tenantId) as any)?.v ?? 0;

  // 区域分布
  const regionMap: Record<string, number> = {};
  for (const row of topCountries) {
    const region = COUNTRY_COORDS[row.buyer_country]?.region ?? "其他";
    regionMap[region] = (regionMap[region] ?? 0) + row.count;
  }

  return c.json({
    summary: {
      totalInquiries,
      totalContracted,
      totalValue,
      conversionRate: totalInquiries > 0 ? Math.round((totalContracted / totalInquiries) * 100) : 0,
      activeMarkets: topCountries.length,
    },
    topCountries: topCountries.map(r => ({
      country: r.buyer_country,
      count: r.count,
      totalValue: r.total_value ?? 0,
      contracted: r.contracted ?? 0,
      coords: COUNTRY_COORDS[r.buyer_country] ?? { lat: 0, lng: 0, region: "其他" },
    })),
    regionDistribution: Object.entries(regionMap).map(([region, count]) => ({
      region, count,
    })).sort((a, b) => b.count - a.count),
  });
});

// ─── GET /top-markets — 热门目标市场排行 ─────────────────────────
geo.get("/top-markets", (c) => {
  const { tenantId } = c.get("user") as any;

  const markets = db.prepare(`
    SELECT
      buyer_country as country,
      COUNT(*) as inquiries,
      AVG(confidence_score) as avg_score,
      SUM(estimated_value) as pipeline_value,
      MAX(received_at) as last_inquiry
    FROM inquiries WHERE tenant_id = ?
    GROUP BY buyer_country
    ORDER BY inquiries DESC, avg_score DESC
    LIMIT 8
  `).all(tenantId) as any[];

  return c.json({
    markets: markets.map((m, i) => ({
      rank: i + 1,
      country: m.country,
      inquiries: m.inquiries,
      avgScore: Math.round(m.avg_score ?? 0),
      pipelineValue: m.pipeline_value ?? 0,
      lastInquiry: m.last_inquiry,
      region: COUNTRY_COORDS[m.country]?.region ?? "其他",
      trend: i < 3 ? "rising" : i < 6 ? "stable" : "declining",
    })),
  });
});

export default geo;
