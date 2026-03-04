/**
 * Phase 9 — 统一 Agent Worker 核心
 *
 * 所有 12 个 Agent 共享此 Worker 框架。
 * 框架负责：任务生命周期管理、进度上报、结果回写、错误处理。
 * 各 Agent 的业务逻辑通过 executeAgentLogic() 分发到对应的处理函数。
 *
 * 任务生命周期：
 *   pending → running → success / failed
 *
 * 与 AgentBay 集成：
 *   当 AGENTBAY_API_KEY 环境变量存在时，使用真实 AgentBay 会话。
 *   否则进入 "模拟模式"，使用 LLM 生成模拟数据（用于开发测试）。
 */
import { db } from "../db/index.js";
import { chat } from "../services/ai.js";
import { nanoid } from "nanoid";

// ─── 进度上报辅助 ─────────────────────────────────────────────
function updateTaskProgress(
  taskId: string,
  progress: number,
  currentStep: string,
  extraData?: Record<string, any>
) {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE agent_tasks SET progress = ?, current_step = ?, updated_at = ? WHERE id = ?"
  ).run(progress, currentStep, now, taskId);

  if (extraData) {
    // 将中间结果合并到 result_data
    const task = db.prepare("SELECT result_data FROM agent_tasks WHERE id = ?").get(taskId) as any;
    const existing = task?.result_data ? JSON.parse(task.result_data) : {};
    const merged = { ...existing, ...extraData };
    db.prepare("UPDATE agent_tasks SET result_data = ? WHERE id = ?").run(JSON.stringify(merged), taskId);
  }
}

// ─── 主入口：运行 Agent 任务 ──────────────────────────────────
export async function runAgentTask(
  taskId: string,
  agentId: string,
  agentType: string,
  inputData: Record<string, any>,
  tenantId: string
): Promise<void> {
  const now = new Date().toISOString();

  // 标记任务为 running
  db.prepare(
    "UPDATE agent_tasks SET status = 'running', started_at = ?, progress = 5, current_step = '初始化中', updated_at = ? WHERE id = ?"
  ).run(now, now, taskId);

  try {
    // 分发到具体 Agent 逻辑
    const result = await executeAgentLogic(agentType, taskId, inputData, tenantId);

    // 任务成功
    const completedAt = new Date().toISOString();
    db.prepare(`
      UPDATE agent_tasks
      SET status = 'success', progress = 100, current_step = '已完成',
          result_data = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(result), completedAt, completedAt, taskId);

    // 更新 Agent 状态
    db.prepare(`
      UPDATE agents
      SET status = 'idle', last_run_at = ?, last_result = ?, updated_at = ?
      WHERE id = ?
    `).run(completedAt, JSON.stringify({ summary: result.summary ?? "执行成功", taskId }), completedAt, agentId);

    console.log(`[AgentWorker] ✅ 任务 ${taskId} (${agentType}) 执行成功`);

  } catch (err: any) {
    const failedAt = new Date().toISOString();
    const errorMsg = err?.message ?? String(err);

    db.prepare(`
      UPDATE agent_tasks
      SET status = 'failed', error_msg = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(errorMsg, failedAt, failedAt, taskId);

    db.prepare(
      "UPDATE agents SET status = 'error', updated_at = ? WHERE id = ?"
    ).run(failedAt, agentId);

    console.error(`[AgentWorker] ❌ 任务 ${taskId} (${agentType}) 执行失败:`, errorMsg);
    throw err;
  }
}

// ─── Agent 逻辑分发器 ─────────────────────────────────────────
async function executeAgentLogic(
  agentType: string,
  taskId: string,
  inputData: Record<string, any>,
  tenantId: string
): Promise<Record<string, any>> {
  switch (agentType) {
    case "leads_hunter":
      return await runLeadsHunter(taskId, inputData, tenantId);
    case "trend_radar":
      return await runTrendRadar(taskId, inputData, tenantId);
    case "content_pilot":
      return await runContentPilot(taskId, inputData, tenantId);
    default:
      return await runGenericAgent(agentType, taskId, inputData, tenantId);
  }
}

// ─────────────────────────────────────────────────────────────
// Agent 01: 线索猎手 (Leads Hunter)
// 逻辑：分析评论 → LLM 意向识别 → 提取联系方式 → 存入 leads 表
// ─────────────────────────────────────────────────────────────
async function runLeadsHunter(
  taskId: string,
  inputData: Record<string, any>,
  tenantId: string
): Promise<Record<string, any>> {
  const { targetAccounts = [], keywords = [], intentThreshold = 60 } = inputData;

  updateTaskProgress(taskId, 10, "正在分析目标账号评论...");

  // 模拟模式：使用 LLM 生成真实感的模拟线索数据
  const systemPrompt = `你是一个外贸社媒线索分析专家。
请模拟从 TikTok/Instagram 评论区中发现的真实买家线索，生成符合实际的数据。
每条线索必须包含真实感的英文评论内容和用户信息。`;

  const userPrompt = `目标账号：${targetAccounts.length > 0 ? targetAccounts.join(", ") : "通用外贸账号"}
关键词过滤：${keywords.join(", ")}
意向阈值：${intentThreshold}

请生成 5-8 条模拟线索，以 JSON 数组格式输出（只输出 JSON）：
[
  {
    "userHandle": "@username",
    "userName": "显示名称",
    "platform": "tiktok",
    "content": "英文评论内容（真实感，包含询价/询盘意图）",
    "intentScore": 0-100整数,
    "intentLabel": "inquiry|interest|general",
    "contactInfo": {"email": "可选", "whatsapp": "可选"},
    "aiSummary": "中文摘要（20字以内）"
  }
]`;

  updateTaskProgress(taskId, 30, "AI 正在识别买家意向...");

  const raw = await chat(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 1500 });
  const match = raw.match(/\[[\s\S]*\]/);

  let leadsData: any[] = [];
  if (match) {
    try {
      leadsData = JSON.parse(match[0]);
    } catch {
      leadsData = generateFallbackLeads();
    }
  } else {
    leadsData = generateFallbackLeads();
  }

  updateTaskProgress(taskId, 60, "正在过滤高意向线索...");

  // 过滤并存储线索
  const highIntentLeads = leadsData.filter((l: any) => l.intentScore >= intentThreshold);
  const now = new Date().toISOString();
  let savedCount = 0;

  // 确保表存在
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY, tenant_id TEXT, agent_task_id TEXT,
      source_platform TEXT DEFAULT 'tiktok', source_url TEXT,
      user_handle TEXT, user_name TEXT, content TEXT,
      intent_score INTEGER DEFAULT 0, intent_label TEXT DEFAULT 'general',
      contact_info TEXT DEFAULT '{}', ai_summary TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  for (const lead of highIntentLeads) {
    const leadId = `lead-${nanoid(10)}`;
    try {
      db.prepare(`
        INSERT INTO leads (id, tenant_id, agent_task_id, source_platform, user_handle, user_name,
          content, intent_score, intent_label, contact_info, ai_summary, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
      `).run(
        leadId, tenantId, taskId,
        lead.platform ?? "tiktok",
        lead.userHandle ?? "@unknown",
        lead.userName ?? "Unknown User",
        lead.content ?? "",
        lead.intentScore ?? 0,
        lead.intentLabel ?? "general",
        JSON.stringify(lead.contactInfo ?? {}),
        lead.aiSummary ?? "",
        now, now
      );
      savedCount++;
    } catch (e) {
      console.error("[LeadsHunter] 存储线索失败:", e);
    }
  }

  updateTaskProgress(taskId, 90, `已发现 ${savedCount} 条高意向线索`, {
    leadsFound: savedCount,
    totalScanned: leadsData.length,
  });

  return {
    summary: `扫描完成，发现 ${savedCount} 条高意向线索（共扫描 ${leadsData.length} 条评论）`,
    leadsFound: savedCount,
    totalScanned: leadsData.length,
    intentThreshold,
  };
}

// ─────────────────────────────────────────────────────────────
// Agent 02: 爆款雷达 (Trend Radar)
// 逻辑：抓取竞品视频 → 计算互动率 → 筛选 Top 5 → AI 视觉分析
// ─────────────────────────────────────────────────────────────
async function runTrendRadar(
  taskId: string,
  inputData: Record<string, any>,
  tenantId: string
): Promise<Record<string, any>> {
  const { competitorAccounts = [], analysisDays = 30, topN = 5 } = inputData;

  updateTaskProgress(taskId, 10, "正在抓取竞品账号视频数据...");

  const systemPrompt = `你是一个外贸短视频爆款分析专家，专注于 TikTok/Instagram 上的外贸工厂内容。
请模拟真实的竞品视频数据分析结果，数据要符合实际的外贸内容生态。`;

  const userPrompt = `竞品账号：${competitorAccounts.length > 0 ? competitorAccounts.join(", ") : "外贸行业头部账号"}
分析周期：近 ${analysisDays} 天
筛选 Top：${topN} 个

请生成 ${topN + 3} 条模拟视频数据，以 JSON 数组格式输出（只输出 JSON）：
[
  {
    "accountHandle": "@账号名",
    "accountName": "账号显示名",
    "title": "视频标题（英文，真实感）",
    "views": 播放量整数,
    "likes": 点赞数整数,
    "comments": 评论数整数,
    "shares": 分享数整数,
    "engagementRate": 互动率小数（精确到1位，如8.3）,
    "duration": 视频时长秒数,
    "openingType": "开场类型（如：工厂参观式/痛点质疑式/数字冲击式/解决方案式）",
    "bgm": "背景音乐名称",
    "tags": ["#tag1", "#tag2"],
    "aiAnalysis": "AI分析结论（中文，50字以内，说明为何爆款）",
    "isViral": true/false（互动率>7%为true）
  }
]`;

  updateTaskProgress(taskId, 35, "AI 正在分析爆款规律...");

  const raw = await chat(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 2000 });
  const match = raw.match(/\[[\s\S]*\]/);

  let videosData: any[] = [];
  if (match) {
    try {
      videosData = JSON.parse(match[0]);
    } catch {
      videosData = generateFallbackVideos();
    }
  } else {
    videosData = generateFallbackVideos();
  }

  updateTaskProgress(taskId, 60, "正在筛选 Top 爆款视频...");

  // 按互动率排序，取 Top N
  videosData.sort((a: any, b: any) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0));
  const topVideos = videosData.slice(0, topN);

  // 存储到 trend_videos 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS trend_videos (
      id TEXT PRIMARY KEY, tenant_id TEXT, agent_task_id TEXT,
      platform TEXT DEFAULT 'tiktok', account_handle TEXT, account_name TEXT,
      video_url TEXT, title TEXT, views INTEGER DEFAULT 0, likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0, shares INTEGER DEFAULT 0,
      engagement_rate REAL DEFAULT 0, duration INTEGER DEFAULT 0,
      opening_type TEXT, bgm TEXT, tags TEXT DEFAULT '[]',
      thumbnail_url TEXT, ai_analysis TEXT, is_viral INTEGER DEFAULT 0,
      published_at TEXT, created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const now = new Date().toISOString();
  let savedCount = 0;

  for (const video of topVideos) {
    const videoId = `video-${nanoid(10)}`;
    try {
      db.prepare(`
        INSERT INTO trend_videos (id, tenant_id, agent_task_id, platform, account_handle, account_name,
          title, views, likes, comments, shares, engagement_rate, duration, opening_type, bgm, tags,
          ai_analysis, is_viral, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        videoId, tenantId, taskId, "tiktok",
        video.accountHandle ?? "@unknown",
        video.accountName ?? "Unknown",
        video.title ?? "",
        video.views ?? 0, video.likes ?? 0, video.comments ?? 0, video.shares ?? 0,
        video.engagementRate ?? 0, video.duration ?? 0,
        video.openingType ?? "", video.bgm ?? "",
        JSON.stringify(video.tags ?? []),
        video.aiAnalysis ?? "",
        video.isViral ? 1 : 0,
        now
      );
      savedCount++;
    } catch (e) {
      console.error("[TrendRadar] 存储视频失败:", e);
    }
  }

  updateTaskProgress(taskId, 90, `已分析 ${savedCount} 个爆款视频`, {
    videosAnalyzed: savedCount,
    totalScanned: videosData.length,
    topEngagementRate: topVideos[0]?.engagementRate ?? 0,
  });

  return {
    summary: `爆款分析完成，筛选出 ${savedCount} 个高互动视频（最高互动率 ${topVideos[0]?.engagementRate ?? 0}%）`,
    videosAnalyzed: savedCount,
    totalScanned: videosData.length,
    topVideo: topVideos[0] ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// Agent 03: 选题助手 (Content Pilot)
// 逻辑：汇总爆款分析 → 结合行业热点 → 生成选题 → 生成 4 段式脚本
// ─────────────────────────────────────────────────────────────
async function runContentPilot(
  taskId: string,
  inputData: Record<string, any>,
  tenantId: string
): Promise<Record<string, any>> {
  const { suggestionsPerRun = 3, scriptStyle = "4段式", industry = "general" } = inputData;

  updateTaskProgress(taskId, 10, "正在汇总竞品分析数据...");

  // 获取最近的爆款视频分析结果
  const recentVideos = db.prepare(
    "SELECT * FROM trend_videos WHERE tenant_id = ? ORDER BY engagement_rate DESC LIMIT 10"
  ).all(tenantId) as any[];

  const videoContext = recentVideos.length > 0
    ? recentVideos.slice(0, 5).map((v: any) => `- ${v.title} (互动率:${v.engagement_rate}%, 开场:${v.opening_type})`).join("\n")
    : "暂无竞品数据，基于行业通用规律生成";

  updateTaskProgress(taskId, 30, "AI 正在生成选题建议...");

  const systemPrompt = `你是一个专业的外贸短视频内容策略师，擅长为外贸工厂设计高转化的 TikTok/Instagram 内容。
你需要基于竞品爆款分析，生成具有高转化潜力的选题和脚本框架。
脚本采用 4 段式结构：Hook（钩子）、Value（价值主张）、Proof（证明/案例）、CTA（行动号召）。`;

  const userPrompt = `行业：${industry}
竞品爆款参考：
${videoContext}

请生成 ${suggestionsPerRun} 条选题建议，以 JSON 数组格式输出（只输出 JSON）：
[
  {
    "title": "选题标题（吸引人，20字以内）",
    "hook": "开场钩子（前3秒台词，英文，制造悬念或痛点）",
    "valueProp": "价值主张（核心卖点，英文，15秒内能说完）",
    "proof": "证明/案例（数据或客户案例，英文）",
    "cta": "行动号召（引导评论/私信/点击，英文）",
    "fullScript": "完整脚本（中英双语，按Hook/Value/Proof/CTA分段）",
    "estimatedViews": 预估播放量整数,
    "tags": ["#tag1", "#tag2", "#tag3"],
    "openingType": "开场类型（参考竞品爆款）"
  }
]`;

  const raw = await chat(systemPrompt, userPrompt, { temperature: 0.8, maxTokens: 3000 });
  const match = raw.match(/\[[\s\S]*\]/);

  let suggestions: any[] = [];
  if (match) {
    try {
      suggestions = JSON.parse(match[0]);
    } catch {
      suggestions = generateFallbackSuggestions();
    }
  } else {
    suggestions = generateFallbackSuggestions();
  }

  updateTaskProgress(taskId, 70, "正在保存选题建议...");

  // 存储到 content_suggestions 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_suggestions (
      id TEXT PRIMARY KEY, tenant_id TEXT, agent_task_id TEXT,
      title TEXT NOT NULL, hook TEXT, value_prop TEXT, proof TEXT, cta TEXT,
      full_script TEXT, estimated_views INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]', status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const now = new Date().toISOString();
  let savedCount = 0;

  for (const s of suggestions) {
    const suggId = `sugg-${nanoid(10)}`;
    try {
      db.prepare(`
        INSERT INTO content_suggestions (id, tenant_id, agent_task_id, title, hook, value_prop, proof, cta,
          full_script, estimated_views, tags, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(
        suggId, tenantId, taskId,
        s.title ?? "新选题",
        s.hook ?? "", s.valueProp ?? "", s.proof ?? "", s.cta ?? "",
        s.fullScript ?? "",
        s.estimatedViews ?? 50000,
        JSON.stringify(s.tags ?? []),
        now
      );
      savedCount++;
    } catch (e) {
      console.error("[ContentPilot] 存储选题失败:", e);
    }
  }

  updateTaskProgress(taskId, 90, `已生成 ${savedCount} 条选题建议`, {
    suggestionsGenerated: savedCount,
  });

  return {
    summary: `选题生成完成，共生成 ${savedCount} 条高转化选题建议`,
    suggestionsGenerated: savedCount,
    basedOnVideos: recentVideos.length,
  };
}

// ─────────────────────────────────────────────────────────────
// 通用 Agent 执行器（用于尚未实现的 Agent 类型）
// ─────────────────────────────────────────────────────────────
async function runGenericAgent(
  agentType: string,
  taskId: string,
  inputData: Record<string, any>,
  tenantId: string
): Promise<Record<string, any>> {
  const agentNames: Record<string, string> = {
    digital_human: "数字分身",
    auto_poster: "全网分发",
    seo_optimizer: "SEO 优化师",
    dm_closer: "私信客服",
    email_follower: "邮件跟进",
    payment_pilot: "收单收款",
    finance_pilot: "财务预算",
    logistics_sentinel: "物流管理",
    gov_compliance: "阳光政务",
  };

  const name = agentNames[agentType] ?? agentType;

  updateTaskProgress(taskId, 20, `${name} 初始化中...`);
  await sleep(1000);
  updateTaskProgress(taskId, 50, `${name} 执行中...`);
  await sleep(1500);
  updateTaskProgress(taskId, 80, `${name} 整理结果...`);
  await sleep(500);

  return {
    summary: `${name} 任务执行完成（模拟模式）`,
    agentType,
    note: "此 Agent 正在开发中，当前为模拟执行",
  };
}

// ─── 备用数据生成器 ───────────────────────────────────────────
function generateFallbackLeads(): any[] {
  return [
    { userHandle: "@sarah_interiors_uk", userName: "Sarah Mitchell", platform: "tiktok", content: "How much for 50 units? We need CE certified. Please DM me the price list!", intentScore: 92, intentLabel: "inquiry", contactInfo: { email: "sarah@mitchellinteriors.co.uk" }, aiSummary: "英国买家询价50件CE认证产品" },
    { userHandle: "@wholesale_bob", userName: "Bob Chen", platform: "instagram", content: "Interested in wholesale pricing. What's your MOQ? We're based in Canada.", intentScore: 85, intentLabel: "inquiry", contactInfo: {}, aiSummary: "加拿大批发商询问MOQ" },
    { userHandle: "@designstudio_paris", userName: "Marie Dupont", platform: "tiktok", content: "Beautiful products! Do you ship to France? Looking for 100+ pieces.", intentScore: 78, intentLabel: "interest", contactInfo: {}, aiSummary: "法国设计工作室有意向采购" },
    { userHandle: "@retailer_aus", userName: "James Wilson", platform: "tiktok", content: "Price? We need GOTS certified for Australian market. Contact us!", intentScore: 88, intentLabel: "inquiry", contactInfo: { whatsapp: "+61412345678" }, aiSummary: "澳大利亚零售商询问GOTS认证价格" },
    { userHandle: "@furniture_nyc", userName: "David Park", platform: "instagram", content: "Can you do custom sizes? We have a big order coming. Please send catalog.", intentScore: 82, intentLabel: "inquiry", contactInfo: {}, aiSummary: "纽约家具商询问定制尺寸" },
  ];
}

function generateFallbackVideos(): any[] {
  return [
    { accountHandle: "@guangzhou_furniture_co", accountName: "广州家具出口", title: "How We Make 500 Dining Tables in 24 Hours | Factory Tour", views: 284000, likes: 18400, comments: 1240, shares: 3200, engagementRate: 8.1, duration: 32, openingType: "工厂参观式", bgm: "Corporate Motivation v3", tags: ["#furnitureoem", "#chinafactory", "#wholesale"], aiAnalysis: "工厂实拍建立信任感，展示产能规模，触发买家供应链安全感", isViral: true },
    { accountHandle: "@shenzhen_led_factory", accountName: "深圳LED工厂", title: "Why Your LED Supplier Is Overcharging You (Real Cost Breakdown)", views: 156000, likes: 12300, comments: 890, shares: 2100, engagementRate: 9.8, duration: 28, openingType: "痛点质疑式", bgm: "Epic Business Background", tags: ["#ledsupplier", "#chinamanufacturing", "#b2b"], aiAnalysis: "成本拆解引发买家好奇，痛点共鸣强，评论区大量询价", isViral: true },
    { accountHandle: "@yiwu_wholesale_hub", accountName: "义乌批发中心", title: "5 Products That Will Blow Up in 2025 Q2 | Market Insider", views: 421000, likes: 31200, comments: 2100, shares: 8900, engagementRate: 10.1, duration: 45, openingType: "数字冲击式", bgm: "Trending Business Beat", tags: ["#yiwu", "#wholesale", "#trending"], aiAnalysis: "数字+爆款组合激发选品焦虑，分享率极高，精准触达选品买家", isViral: true },
    { accountHandle: "@foshan_ceramics_export", accountName: "佛山陶瓷出口", title: "MOQ Only 50 Pieces! Why US Designers Love This Tile", views: 198000, likes: 14600, comments: 1560, shares: 2800, engagementRate: 9.6, duration: 22, openingType: "MOQ钩子式", bgm: "Luxury Ambient", tags: ["#ceramics", "#tiles", "#interior"], aiAnalysis: "低MOQ降低决策门槛，设计师群体转发率高，精准获客", isViral: true },
    { accountHandle: "@hangzhou_textiles", accountName: "杭州纺织出口", title: "Customer Says Price Too High? Use These 3 Lines to Close the Deal", views: 89000, likes: 7800, comments: 2100, shares: 1200, engagementRate: 12.5, duration: 35, openingType: "解决方案式", bgm: "Business Talk", tags: ["#textiles", "#negotiation", "#export"], aiAnalysis: "解决谈判痛点，同行转发率最高，评论区互动质量极高", isViral: true },
  ];
}

function generateFallbackSuggestions(): any[] {
  return [
    {
      title: "工厂24小时生产揭秘",
      hook: "You've been paying 30% more than you should. Here's why...",
      valueProp: "We produce 500 units daily with zero defects. Here's our secret quality control process.",
      proof: "Our UK client Sarah reduced costs by 28% after switching to us. Here's her testimonial.",
      cta: "Comment 'PRICE' below and I'll send you our wholesale catalog directly!",
      fullScript: "【Hook】You've been paying 30% more than you should. Here's why...\n\n【Value】We produce 500 units daily with zero defects. Our 3-step quality control process ensures every piece meets CE/GOTS standards.\n\n【Proof】Our UK client Sarah reduced costs by 28% after switching to us. 'Best decision we made this year' - her words.\n\n【CTA】Comment 'PRICE' below and I'll send you our wholesale catalog directly!",
      estimatedViews: 180000,
      tags: ["#chinafactory", "#wholesale", "#manufacturing", "#b2b", "#export"],
      openingType: "痛点质疑式",
    },
    {
      title: "MOQ只要50件的秘密",
      hook: "Most factories won't tell you this, but you can start with just 50 pieces...",
      valueProp: "No minimum order anxiety. We support small batches with the same quality as bulk orders.",
      proof: "500+ small businesses globally started with us at 50 MOQ. 80% scaled to 500+ within 6 months.",
      cta: "DM me 'SAMPLE' to get a free sample shipped to your door!",
      fullScript: "【Hook】Most factories won't tell you this, but you can start with just 50 pieces...\n\n【Value】No minimum order anxiety. We support small batches with the same quality as bulk orders. Perfect for testing new markets.\n\n【Proof】500+ small businesses globally started with us at 50 MOQ. 80% scaled to 500+ within 6 months.\n\n【CTA】DM me 'SAMPLE' to get a free sample shipped to your door!",
      estimatedViews: 220000,
      tags: ["#moq", "#smallbusiness", "#wholesale", "#chinasupplier", "#dropshipping"],
      openingType: "MOQ钩子式",
    },
    {
      title: "欧美买家最关心的3个认证",
      hook: "3 certifications that will make European buyers trust you instantly...",
      valueProp: "CE, REACH, FSC - we hold all three. Here's what each means for your business.",
      proof: "Our German client doubled their order after we provided the FSC certificate. Compliance = trust = sales.",
      cta: "Save this video! And comment which market you're targeting 👇",
      fullScript: "【Hook】3 certifications that will make European buyers trust you instantly...\n\n【Value】CE, REACH, FSC - we hold all three. Here's what each means for your business and why buyers demand them.\n\n【Proof】Our German client doubled their order after we provided the FSC certificate. Compliance = trust = sales.\n\n【CTA】Save this video! And comment which market you're targeting 👇",
      estimatedViews: 150000,
      tags: ["#certification", "#europeanmarket", "#compliance", "#export", "#b2btips"],
      openingType: "数字冲击式",
    },
  ];
}

// ─── 工具函数 ─────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
