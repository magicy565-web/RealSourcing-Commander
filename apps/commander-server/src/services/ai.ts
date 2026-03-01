/**
 * Commander 5.0 — AI 服务模块
 * 使用阿里云百炼（Qwen）作为主力 LLM
 * 支持：动态草稿生成、风格提取、任务规划
 */
import OpenAI from "openai";

// ─── AI 客户端初始化 ──────────────────────────────────────────
const dashscope = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY ?? "",
  baseURL: process.env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

const MODEL = process.env.DASHSCOPE_MODEL ?? "qwen-plus";

// ─── 通用 Chat 调用 ───────────────────────────────────────────
export async function chat(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const resp = await dashscope.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1000,
  });
  return resp.choices[0]?.message?.content ?? "";
}

// ─── 1. 询盘分析 & AI 草稿生成 ───────────────────────────────
export interface InquiryDraftResult {
  summary: string;
  draftCn: string;
  draftEn: string;
  analysis: string;
  confidenceScore: number;
  confidenceBreakdown: { channelWeight: number; contentQuality: number; buyerCompleteness: number };
  urgency: "high" | "normal" | "low";
  tags: string[];
  estimatedValue: number;
}

export async function generateInquiryDraft(params: {
  rawContent: string;
  buyerName: string;
  buyerCompany: string;
  buyerCountry: string;
  productName: string;
  quantity?: string;
  platform: string;
  styleProfile?: string; // 用户风格档案
  tenantName?: string;
}): Promise<InquiryDraftResult> {
  const systemPrompt = `你是一个专业的外贸询盘分析和回复助手。
公司名称：${params.tenantName ?? "明辉照明有限公司"}
${params.styleProfile ? `\n用户的个人回复风格档案：\n${params.styleProfile}` : ""}

你的任务是分析询盘并生成专业的中英文回复草稿。
要求：
1. 中文草稿：自然、专业，符合用户风格档案（如有），300字以内
2. 英文草稿：地道商务英语，与中文草稿内容对应，200词以内
3. 分析：简短说明询盘价值和处理建议
4. 严格按照 JSON 格式输出`;

  const userPrompt = `询盘信息：
来源平台：${params.platform}
买家：${params.buyerName}（${params.buyerCompany}，${params.buyerCountry}）
产品：${params.productName}${params.quantity ? `，数量：${params.quantity}` : ""}
询盘原文：${params.rawContent}

请输出以下 JSON（不要有其他文字）：
{
  "summary": "一句话总结询盘（中文，50字以内）",
  "draftCn": "中文回复草稿",
  "draftEn": "English reply draft",
  "analysis": "询盘价值分析和处理建议（中文，100字以内）",
  "confidenceScore": 0-100的整数,
  "confidenceBreakdown": {
    "channelWeight": 0-35,
    "contentQuality": 0-40,
    "buyerCompleteness": 0-25
  },
  "urgency": "high|normal|low",
  "tags": ["标签1", "标签2"],
  "estimatedValue": 预估金额（美元整数，没有信息则填0）
}`;

  const raw = await chat(systemPrompt, userPrompt, { temperature: 0.6, maxTokens: 1500 });

  // 提取 JSON
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI 返回格式错误");

  const result = JSON.parse(jsonMatch[0]) as InquiryDraftResult;
  return result;
}

// ─── 2. 风格提取（从历史报价中学习用户风格）────────────────────
export interface StyleProfile {
  tone: string;           // 语气风格
  greeting: string;       // 常用开场白
  closing: string;        // 常用结尾
  keyPhrases: string[];   // 常用短语
  pricingApproach: string; // 报价策略
  followupStyle: string;  // 跟进风格
  summary: string;        // 风格总结（用于 AI 提示词）
}

export async function extractStyleProfile(samples: string[]): Promise<StyleProfile> {
  const systemPrompt = `你是一个专业的商务写作分析师。
请分析用户提供的历史报价/回复邮件样本，提取其个人写作风格特征。
严格按照 JSON 格式输出，不要有其他文字。`;

  const userPrompt = `以下是用户的历史报价/回复邮件样本（${samples.length} 条）：

${samples.map((s, i) => `【样本 ${i + 1}】\n${s}`).join("\n\n---\n\n")}

请分析并输出以下 JSON：
{
  "tone": "语气风格描述（如：专业正式、热情友好、简洁直接等）",
  "greeting": "常用开场白模式（如：'您好！感谢您的询问。'）",
  "closing": "常用结尾模式（如：'期待与您合作！'）",
  "keyPhrases": ["常用短语1", "常用短语2", "常用短语3"],
  "pricingApproach": "报价策略描述（如：先建立信任再报价、直接给出价格区间等）",
  "followupStyle": "跟进风格（如：24小时内跟进、提供样品、邀请视频会议等）",
  "summary": "用于 AI 提示词的风格总结（100字以内，描述这个人的写作特点）"
}`;

  const raw = await chat(systemPrompt, userPrompt, { temperature: 0.4, maxTokens: 800 });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI 风格提取格式错误");
  return JSON.parse(jsonMatch[0]) as StyleProfile;
}

// ─── 3. 报价后跟进草稿生成 ────────────────────────────────────
export async function generateFollowupDraft(params: {
  buyerName: string;
  buyerCompany: string;
  productName: string;
  unitPrice: number;
  currency: string;
  unit: string;
  priceTerm: string;
  style: "aggressive" | "friendly" | "business";
  styleProfile?: string;
  tenantName?: string;
}): Promise<{ draftCn: string; draftEn: string }> {
  const styleMap = {
    aggressive: "强势催促，制造紧迫感，强调价格有效期",
    friendly: "温和友好，关心买家需求，建立长期关系",
    business: "专业正式，简洁明了，适合欧美大客户",
  };

  const systemPrompt = `你是专业外贸跟进邮件撰写助手。
${params.styleProfile ? `用户风格档案：${params.styleProfile}` : ""}
风格要求：${styleMap[params.style]}`;

  const userPrompt = `为以下报价生成跟进邮件草稿：
买家：${params.buyerName}（${params.buyerCompany}）
产品：${params.productName}
报价：${params.currency}${params.unitPrice}/${params.unit} ${params.priceTerm}
公司：${params.tenantName ?? "明辉照明"}

输出 JSON：
{
  "draftCn": "中文跟进草稿（150字以内）",
  "draftEn": "English follow-up draft (within 100 words)"
}`;

  const raw = await chat(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 600 });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI 跟进草稿格式错误");
  return JSON.parse(jsonMatch[0]);
}

// ─── 4. OpenClaw 任务规划 ─────────────────────────────────────
export async function planAgentTask(params: {
  taskType: string;
  platform: string;
  targetInfo: string;
  context?: string;
}): Promise<{ steps: string[]; estimatedOps: number; estimatedCredits: number }> {
  const systemPrompt = `你是 OpenClaw 数字员工任务规划助手。
根据任务类型和目标信息，规划具体执行步骤。`;

  const userPrompt = `任务类型：${params.taskType}
平台：${params.platform}
目标：${params.targetInfo}
${params.context ? `上下文：${params.context}` : ""}

输出 JSON：
{
  "steps": ["步骤1", "步骤2", "步骤3"],
  "estimatedOps": 预估操作次数（整数）,
  "estimatedCredits": 预估消耗积分（整数）
}`;

  const raw = await chat(systemPrompt, userPrompt, { temperature: 0.5, maxTokens: 400 });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { steps: ["执行任务"], estimatedOps: 5, estimatedCredits: 10 };
  return JSON.parse(jsonMatch[0]);
}

// ─── 5. SmartQuoteAI — AI 智能价格建议 ──────────────────────
export interface SmartQuoteSuggestion {
  conservative: { price: number; label: string; desc: string; conversionRate: string };
  balanced:     { price: number; label: string; desc: string; conversionRate: string };
  aggressive:   { price: number; label: string; desc: string; conversionRate: string };
  marketInsight: string;
  riskNote: string;
  suggestedUnit: string;
  suggestedPriceTerm: string;
}

export async function generateSmartQuote(params: {
  productName: string;
  quantity?: string;
  buyerCountry: string;
  buyerCompany?: string;
  estimatedValue?: number;
  historicalAvgPrice?: number;
  platform: string;
  tenantName?: string;
}): Promise<SmartQuoteSuggestion> {
  const systemPrompt = `你是一个专业的外贸报价策略顾问，擅长 B2B 出口定价分析。公司：${params.tenantName ?? "明辉照明有限公司"}。你的任务是根据询盘信息，给出三档报价建议，帮助老板快速决策。`;

  const userPrompt = `询盘信息：
产品：${params.productName}
数量：${params.quantity ?? "未知"}
买家国家：${params.buyerCountry}
买家公司：${params.buyerCompany ?? "未知"}
来源平台：${params.platform}
${params.estimatedValue ? `预估金额：$${params.estimatedValue}` : ""}
${params.historicalAvgPrice ? `历史成交均价：$${params.historicalAvgPrice}` : ""}

请给出三档报价建议，以 JSON 格式输出（只输出 JSON，不要其他文字）：
{
  "conservative": {"price": 单价数字,"label": "稳健型","desc": "适合新客户开发，高转化率","conversionRate": "75%"},
  "balanced": {"price": 单价数字,"label": "平衡型","desc": "利润与转化率兼顾","conversionRate": "55%"},
  "aggressive": {"price": 单价数字,"label": "溢价型","desc": "彰显品牌价值，高利润","conversionRate": "30%"},
  "marketInsight": "一句话市场洞察（中文，50字以内）",
  "riskNote": "一句话风险提示（中文，50字以内）",
  "suggestedUnit": "建议计价单位，如 件/套/KG",
  "suggestedPriceTerm": "建议贸易术语，如 FOB/CIF"
}`;

  const raw = await chat(systemPrompt, userPrompt, { temperature: 0.5, maxTokens: 600 });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    const base = params.estimatedValue ? Math.round((params.estimatedValue / 100) * 10) / 10 : 10;
    return {
      conservative: { price: +(base * 0.85).toFixed(2), label: "稳健型", desc: "高转化率，适合开发新客户", conversionRate: "75%" },
      balanced:     { price: +(base * 1.0).toFixed(2),  label: "平衡型", desc: "利润与转化率兼顾",         conversionRate: "55%" },
      aggressive:   { price: +(base * 1.2).toFixed(2),  label: "溢价型", desc: "彰显品牌价值，高利润",     conversionRate: "30%" },
      marketInsight: "当前市场竞争激烈，建议以平衡型价格切入",
      riskNote: "溢价型报价需配合详细产品优势说明",
      suggestedUnit: "件",
      suggestedPriceTerm: "FOB",
    };
  }
  return JSON.parse(jsonMatch[0]) as SmartQuoteSuggestion;
}

// ─── 6. Command Lab — 复合指令拆解 ───────────────────────────
export interface CommandLabResult {
  title: string;
  steps: Array<{
    id: number;
    phase: "analyze" | "filter" | "execute" | "report";
    label: string;
    detail: string;
    estimatedTime: string;
    platform?: string;
    creditCost: number;
  }>;
  totalCredits: number;
  totalTime: string;
  riskLevel: "low" | "medium" | "high";
  riskNote: string;
  subTasks: string[];
}

export async function parseComplexCommand(rawInput: string): Promise<CommandLabResult> {
  const systemPrompt = `你是一个外贸业务 AI 指挥官，擅长将复杂的复合指令拆解为可执行的子任务流程。每个步骤必须明确、可量化，并标注预估时间和积分消耗。`;

  const userPrompt = `老板指令：「${rawInput}」

请将这个复合指令拆解为 3-6 个执行步骤，以 JSON 格式输出（只输出 JSON，不要其他文字）：
{
  "title": "指令标题（简短，20字以内）",
  "steps": [
    {"id": 1,"phase": "analyze","label": "步骤名称（10字以内）","detail": "具体执行内容（30字以内）","estimatedTime": "预估时间，如 2分钟","platform": "执行平台，如 linkedin/whatsapp/feishu/all","creditCost": 积分消耗整数}
  ],
  "totalCredits": 总积分消耗整数,
  "totalTime": "总预估时间，如 15分钟",
  "riskLevel": "low|medium|high",
  "riskNote": "风险说明（30字以内）",
  "subTasks": ["子任务1", "子任务2"]
}
phase 类型说明：analyze=数据分析, filter=筛选目标, execute=执行操作, report=生成报告`;

  const raw = await chat(systemPrompt, userPrompt, { temperature: 0.6, maxTokens: 800 });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      title: "复合指令执行",
      steps: [
        { id: 1, phase: "analyze", label: "数据分析", detail: "分析历史询盘和客户数据", estimatedTime: "3分钟", platform: "feishu", creditCost: 5 },
        { id: 2, phase: "filter",  label: "筛选目标", detail: "筛选符合条件的目标客户", estimatedTime: "2分钟", platform: "all",    creditCost: 3 },
        { id: 3, phase: "execute", label: "执行方案", detail: "向目标客户发送挽回消息", estimatedTime: "10分钟", platform: "whatsapp", creditCost: 15 },
        { id: 4, phase: "report",  label: "生成报告", detail: "汇总执行结果推送飞书",  estimatedTime: "1分钟", platform: "feishu", creditCost: 2 },
      ],
      totalCredits: 25,
      totalTime: "16分钟",
      riskLevel: "medium",
      riskNote: "批量发送需控制频率，避免账号异常",
      subTasks: ["分析目标客户", "生成个性化消息", "监控回复率"],
    };
  }
  return JSON.parse(jsonMatch[0]) as CommandLabResult;
}
