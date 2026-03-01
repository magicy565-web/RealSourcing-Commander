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
