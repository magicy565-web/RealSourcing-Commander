/**
 * RealSourcing 5.0 — RFQ 监控 Worker
 *
 * 这是短期获客引擎的核心，负责：
 * 1. 通过 OpenClaw 登录工厂的平台账号（阿里巴巴/Made-in-China/Global Sources）
 * 2. 抓取新到的买家询盘
 * 3. AI 生成中文摘要 + 质量评分
 * 4. 存入 inbound_leads 表
 * 5. 触发微信通知（立即推送）
 * 6. 归档到飞书多维表格
 *
 * 设计原则：
 * - MVP 阶段，所有询盘必须经过人工审核才能推送给老板（人工兜底）
 * - 任务失败时立即告警，不允许静默失败
 * - 复用现有的 aiService、feishuService、clawAgentRouter
 *
 * TODO（待实现）：
 * - [RFQ-02] 阿里巴巴国际站询盘抓取指令
 * - [RFQ-03] Made-in-China 询盘抓取指令
 * - [RFQ-04] Global Sources 询盘抓取指令
 * - [RFQ-05] AI 摘要生成
 * - [RFQ-06] 询盘质量评分
 * - [RFQ-07] 微信通知
 * - [RFQ-08] 飞书归档
 */

import { Worker, Job } from "bullmq";
import { redisConnection } from "./queue";
import { COMMANDER_QUEUES, RfqMonitorJobData } from "./commanderQueue";
import { notifyLeadArrived } from "./wechatService";
// import { callClawAgent } from "./clawAgentRouter";   // TODO: 集成 OpenClaw 指令
// import { generateText } from "./aiService";           // TODO: AI 摘要
// import { writeToFeishuTable } from "./feishuService"; // TODO: 飞书归档
// import { db } from "../db";                           // TODO: 数据库操作

// ─── 平台指令模板 ─────────────────────────────────────────────
// 这些是发给 OpenClaw 的操作指令，描述云电脑需要执行的步骤

const PLATFORM_INSTRUCTIONS = {
  alibaba: `
    任务：抓取阿里巴巴国际站新询盘
    步骤：
    1. 导航到 https://www.alibaba.com/trade/inquiry/alitrade/getInquiryList.htm
    2. 筛选"未回复"状态的询盘
    3. 提取每条询盘的：买家名称、国家、询盘内容、产品品类、联系方式
    4. 仅返回 lastFetchAt 之后的新询盘
    输出格式：JSON 数组，每项包含 buyerName, buyerCountry, content, productCategory, contactInfo, inquiryTime
  `,
  made_in_china: `
    任务：抓取 Made-in-China 新询盘
    步骤：
    1. 导航到 https://supplier.made-in-china.com/inquiry/
    2. 筛选最新未处理询盘
    3. 提取询盘详情
    输出格式：同上
  `,
  global_sources: `
    任务：抓取 Global Sources 新询盘
    步骤：
    1. 导航到 https://www.globalsources.com/gsol/InquiryManagement/
    2. 获取最新询盘列表
    3. 提取询盘详情
    输出格式：同上
  `,
};

// ─── Worker 处理函数 ──────────────────────────────────────────

async function processRfqMonitorJob(job: Job<RfqMonitorJobData>): Promise<void> {
  const { factoryId, instanceId, accountId, platform, lastFetchAt } = job.data;

  console.log(`[RfqMonitorWorker] 开始处理 | factoryId=${factoryId} platform=${platform}`);

  // Step 1: 通过 OpenClaw 执行平台询盘抓取
  // TODO: 替换为真实的 OpenClaw 调用
  // const clawResult = await callClawAgent({
  //   instanceId,
  //   instruction: PLATFORM_INSTRUCTIONS[platform],
  //   context: { accountId, lastFetchAt },
  // });
  //
  // 临时 Mock 数据（开发阶段使用）
  const mockLeads = [
    {
      buyerName: "Nguyen Van A",
      buyerCountry: "Vietnam",
      content: "We are looking for 500W solar panels, need 1000 units per month. Please send your best price.",
      productCategory: "Solar Panel",
      contactInfo: "nguyen@solarco.vn",
      inquiryTime: new Date().toISOString(),
    },
  ];

  if (mockLeads.length === 0) {
    console.log(`[RfqMonitorWorker] 无新询盘 | factoryId=${factoryId} platform=${platform}`);
    return;
  }

  console.log(`[RfqMonitorWorker] 发现 ${mockLeads.length} 条新询盘`);

  for (const lead of mockLeads) {
    // Step 2: AI 生成中文摘要
    // TODO: 调用 aiService 生成摘要
    const aiSummary = `越南买家询问 ${lead.productCategory}，需求量约每月 1000 件，请尽快回复报价。`;

    // Step 3: 质量评分（简单规则，后续用 AI 评分）
    const qualityScore = calculateQualityScore(lead);

    // Step 4: 存入数据库
    // TODO: 写入 inbound_leads 表
    const leadId = Math.floor(Math.random() * 10000); // Mock ID
    console.log(`[RfqMonitorWorker] 询盘已入库 | leadId=${leadId} score=${qualityScore}`);

    // Step 5: 获取老板的微信 OpenID
    // TODO: 从 commander_phones 表查询
    const wechatOpenId = "MOCK_OPENID"; // Mock

    // Step 6: 微信推送（仅高质量询盘立即推送，低质量询盘进入人工审核队列）
    if (qualityScore >= 60) {
      await notifyLeadArrived({
        openId: wechatOpenId,
        buyerName: lead.buyerName,
        buyerCountry: lead.buyerCountry,
        productCategory: lead.productCategory,
        qualityScore,
        leadId,
      });
      console.log(`[RfqMonitorWorker] 微信通知已发送 | leadId=${leadId}`);
    } else {
      console.log(`[RfqMonitorWorker] 询盘质量较低(${qualityScore})，进入人工审核队列 | leadId=${leadId}`);
      // TODO: 推入人工审核队列
    }

    // Step 7: 归档到飞书
    // TODO: 调用 feishuService 写入多维表格
    console.log(`[RfqMonitorWorker] 飞书归档完成 | leadId=${leadId}`);
  }
}

// ─── 质量评分算法（简单规则版，后续升级为 AI 评分） ───────────

function calculateQualityScore(lead: {
  buyerName: string;
  buyerCountry: string;
  content: string;
  productCategory: string;
  contactInfo: string;
}): number {
  let score = 50; // 基础分

  // 有联系方式 +20
  if (lead.contactInfo && lead.contactInfo.includes("@")) score += 20;

  // 询盘内容超过 50 字 +10
  if (lead.content.length > 50) score += 10;

  // 有明确数量需求 +10
  if (/\d+\s*(units?|pcs?|pieces?|sets?)/i.test(lead.content)) score += 10;

  // 有明确产品品类 +10
  if (lead.productCategory) score += 10;

  return Math.min(score, 100);
}

// ─── Worker 实例（懒加载） ────────────────────────────────────

let _rfqMonitorWorker: Worker | null = null;

export function startRfqMonitorWorker(): Worker {
  if (_rfqMonitorWorker) return _rfqMonitorWorker;

  _rfqMonitorWorker = new Worker<RfqMonitorJobData>(
    COMMANDER_QUEUES.RFQ_MONITOR,
    processRfqMonitorJob,
    {
      connection: redisConnection,
      concurrency: 3, // 最多同时处理 3 个工厂的监控任务
    }
  );

  _rfqMonitorWorker.on("completed", (job) => {
    console.log(`[RfqMonitorWorker] 任务完成 | jobId=${job.id}`);
  });

  _rfqMonitorWorker.on("failed", (job, err) => {
    console.error(`[RfqMonitorWorker] 任务失败 | jobId=${job?.id}`, err);
    // TODO: 触发飞书告警（复用现有 feishuService 的告警能力）
  });

  console.log("[RfqMonitorWorker] Worker 已启动");
  return _rfqMonitorWorker;
}

export function stopRfqMonitorWorker(): Promise<void> {
  return _rfqMonitorWorker?.close() ?? Promise.resolve();
}
