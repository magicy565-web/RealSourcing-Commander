/**
 * Commander V6.0 — AI Engine
 * 三大 AI 服务的核心实现：
 *  1. 资产解构 (Asset Decomposition) → ProductNeuron
 *  2. 询盘分析 (Inquiry Analysis) → BuyerProfile + IntentAnalysis + ReplyDraft
 *  3. 智能报价 (Smart Quote) → PriceRange + QuoteStrategy
 */

import OpenAI from "openai";

// ── OpenAI 客户端（使用环境变量中预配置的 base_url 和 key）────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

const MODEL = "gpt-4.1-mini"; // 成本效益最优，支持结构化输出

// ══════════════════════════════════════════════════════════════════
// 1. 资产解构服务 — Asset Decomposition
// ══════════════════════════════════════════════════════════════════

export interface ProductNeuron {
  name: string;
  category: string;
  coreParams: Array<{ key: string; value: string }>;
  targetMarkets: string[];
  competitiveAdvantages: string[];
  buyerPersona: string;
  keywords: string[];
  suggestedPrice: { min: number; max: number; currency: string };
  certifications: string[];
  summary: string;
}

/**
 * 从文本内容中提取产品知识节点
 * 支持 PDF 文本、Excel 文本、纯文本描述
 */
export async function decomposeAsset(
  fileName: string,
  textContent: string
): Promise<ProductNeuron> {
  const prompt = `你是一个专业的外贸产品分析师。请从以下产品资料中提取结构化的产品知识节点。

文件名：${fileName}
文件内容：
${textContent.slice(0, 6000)}

请严格按照以下 JSON 格式输出，不要添加任何额外文字：
{
  "name": "产品名称（简洁，如：工业不锈钢管材）",
  "category": "产品大类（如：工业管材/LED灯具/太阳能板）",
  "coreParams": [
    {"key": "材质", "value": "304不锈钢"},
    {"key": "规格", "value": "DN15-DN200"},
    {"key": "压力等级", "value": "PN10-PN40"}
  ],
  "targetMarkets": ["沙特阿拉伯", "阿联酋", "中东北非"],
  "competitiveAdvantages": [
    "通过 SASO 认证，符合沙特标准",
    "MOQ 低至 100 件，支持小批量采购",
    "7-15 天快速交货期"
  ],
  "buyerPersona": "中东工程承包商、建材分销商，年采购额 $50K-$500K，注重认证和交期",
  "keywords": ["stainless steel pipe", "industrial pipe", "SASO certified", "Saudi Arabia"],
  "suggestedPrice": {"min": 15, "max": 45, "currency": "USD"},
  "certifications": ["SASO", "CE", "ISO 9001"],
  "summary": "一段 50 字以内的产品核心卖点总结"
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as ProductNeuron;
  } catch {
    throw new Error(`AI 返回格式错误: ${raw.slice(0, 200)}`);
  }
}

// ══════════════════════════════════════════════════════════════════
// 2. 询盘分析服务 — Inquiry Analysis
// ══════════════════════════════════════════════════════════════════

export interface BuyerProfile {
  name: string;
  company: string;
  country: string;
  estimatedScale: string;
  purchaseRole: string;
  decisionPower: "high" | "medium" | "low";
  riskLevel: "low" | "medium" | "high";
}

export interface IntentAnalysis {
  intentType: "price_inquiry" | "sample_request" | "bulk_order" | "agent_seeking" | "general_inquiry";
  urgency: "urgent" | "high" | "normal" | "low";
  confidenceScore: number;
  keyRequirements: string[];
  redFlags: string[];
  opportunityScore: number;
  reasoning: string;
}

export interface ReplyDraft {
  subjectLine: string;
  bodyEn: string;
  bodyCn: string;
  tone: "formal" | "friendly" | "urgent";
  followUpSuggestion: string;
}

export interface InquiryAnalysisResult {
  buyerProfile: BuyerProfile;
  intentAnalysis: IntentAnalysis;
  replyDraft: ReplyDraft;
}

/**
 * 对询盘进行 AI 全面分析
 */
export async function analyzeInquiry(
  rawContent: string,
  buyerName: string,
  buyerCompany: string,
  buyerCountry: string,
  productName: string,
  sourcePlatform: string
): Promise<InquiryAnalysisResult> {
  const prompt = `你是 Commander AI，一个专业的外贸询盘分析助手。请对以下询盘进行全面分析。

询盘来源平台：${sourcePlatform}
买家姓名：${buyerName}
买家公司：${buyerCompany}
买家国家：${buyerCountry}
询盘产品：${productName}
询盘原文：
${rawContent}

请严格按照以下 JSON 格式输出完整分析，不要添加任何额外文字：
{
  "buyerProfile": {
    "name": "${buyerName}",
    "company": "${buyerCompany}",
    "country": "${buyerCountry}",
    "estimatedScale": "预估公司规模，如：中型分销商（年营收 $1M-$10M）",
    "purchaseRole": "采购角色，如：最终用户/分销商/代理商/工程承包商",
    "decisionPower": "high/medium/low",
    "riskLevel": "low/medium/high"
  },
  "intentAnalysis": {
    "intentType": "price_inquiry/sample_request/bulk_order/agent_seeking/general_inquiry",
    "urgency": "urgent/high/normal/low",
    "confidenceScore": 85,
    "keyRequirements": ["具体需求点1", "具体需求点2"],
    "redFlags": ["风险点1（如无则为空数组）"],
    "opportunityScore": 78,
    "reasoning": "50字以内的分析理由"
  },
  "replyDraft": {
    "subjectLine": "Re: Inquiry for ${productName} - Competitive Price & Fast Delivery",
    "bodyEn": "英文回复正文（专业、简洁、有吸引力，200字以内）",
    "bodyCn": "中文版本回复正文（供参考，200字以内）",
    "tone": "formal/friendly/urgent",
    "followUpSuggestion": "后续跟进建议，如：3天后发送产品规格书"
  }
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as InquiryAnalysisResult;
  } catch {
    throw new Error(`AI 返回格式错误: ${raw.slice(0, 200)}`);
  }
}

// ══════════════════════════════════════════════════════════════════
// 3. 智能报价服务 — Smart Quote
// ══════════════════════════════════════════════════════════════════

export interface SmartQuoteResult {
  recommendedPrice: { value: number; currency: string; unit: string };
  priceRange: { min: number; max: number; currency: string };
  incoterms: string;
  paymentTerms: string;
  deliveryTime: string;
  moq: number;
  moqUnit: string;
  discountStrategy: string;
  negotiationTips: string[];
  quoteEmailEn: string;
  quoteEmailCn: string;
  reasoning: string;
}

/**
 * 生成智能报价建议
 */
export async function generateSmartQuote(
  productName: string,
  quantity: string,
  buyerCountry: string,
  buyerCompany: string,
  inquiryContent: string,
  productContext?: string
): Promise<SmartQuoteResult> {
  const prompt = `你是 Commander AI 的智能报价引擎。请根据以下信息生成专业的报价建议。

产品名称：${productName}
询盘数量：${quantity}
买家国家：${buyerCountry}
买家公司：${buyerCompany}
询盘内容：${inquiryContent}
${productContext ? `产品背景信息：${productContext}` : ""}

请结合中东市场行情、产品特性和买家背景，严格按照以下 JSON 格式输出，不要添加任何额外文字：
{
  "recommendedPrice": {
    "value": 28.5,
    "currency": "USD",
    "unit": "per piece"
  },
  "priceRange": {"min": 22, "max": 35, "currency": "USD"},
  "incoterms": "FOB Shanghai",
  "paymentTerms": "30% T/T in advance, 70% before shipment",
  "deliveryTime": "15-20 working days after deposit",
  "moq": 500,
  "moqUnit": "pieces",
  "discountStrategy": "订单量超过 1000 件可优惠 8%，超过 5000 件优惠 15%",
  "negotiationTips": [
    "买家提到 SASO 认证，可主动提供认证文件增加信任",
    "中东买家重视关系，建议附上公司介绍和客户案例",
    "可提供样品（收取样品费，大货下单后退还）"
  ],
  "quoteEmailEn": "英文报价邮件正文（专业格式，包含价格、条款、有效期，300字以内）",
  "quoteEmailCn": "中文版本报价邮件（供参考，300字以内）",
  "reasoning": "报价策略说明（50字以内）"
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as SmartQuoteResult;
  } catch {
    throw new Error(`AI 返回格式错误: ${raw.slice(0, 200)}`);
  }
}

// ══════════════════════════════════════════════════════════════════
// 4. 指挥官早晨简报 — Morning Briefing
// ══════════════════════════════════════════════════════════════════

export interface MorningBriefing {
  greeting: string;
  todaySummary: string;
  topPriorities: Array<{ rank: number; action: string; reason: string; urgency: "urgent" | "high" | "normal" }>;
  marketInsight: string;
  aiRecommendation: string;
}

/**
 * 生成每日早晨简报
 */
export async function generateMorningBriefing(context: {
  totalPending: number;
  urgentInquiries: number;
  platforms: string[];
  topProducts: string[];
}): Promise<MorningBriefing> {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";

  const prompt = `你是 Commander AI，请为外贸老板生成一份简洁有力的今日工作简报。

当前数据：
- 待处理事项：${context.totalPending} 条
- 高优先级询盘：${context.urgentInquiries} 条
- 已连接平台：${context.platforms.join("、")}
- 主营产品：${context.topProducts.join("、")}

请严格按照以下 JSON 格式输出，语气要像一个高效的商业助理，不要添加任何额外文字：
{
  "greeting": "${greeting}，指挥官！",
  "todaySummary": "今日工作摘要（30字以内，突出最重要的数字）",
  "topPriorities": [
    {"rank": 1, "action": "优先行动1", "reason": "原因", "urgency": "urgent"},
    {"rank": 2, "action": "优先行动2", "reason": "原因", "urgency": "high"},
    {"rank": 3, "action": "优先行动3", "reason": "原因", "urgency": "normal"}
  ],
  "marketInsight": "今日市场洞察（30字以内）",
  "aiRecommendation": "AI 今日最重要建议（40字以内）"
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as MorningBriefing;
  } catch {
    return {
      greeting: `${greeting}，指挥官！`,
      todaySummary: `今日共有 ${context.totalPending} 条待处理事项，其中 ${context.urgentInquiries} 条高优先级。`,
      topPriorities: [
        { rank: 1, action: "处理高优先级询盘", reason: "买家等待回复", urgency: "urgent" },
      ],
      marketInsight: "中东市场需求持续增长，把握机会。",
      aiRecommendation: "优先回复高意向询盘，提升转化率。",
    };
  }
}
