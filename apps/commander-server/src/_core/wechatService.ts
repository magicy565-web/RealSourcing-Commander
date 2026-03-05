/**
 * RealSourcing 5.0 — 微信通知服务
 *
 * 设计原则：
 * - 三级通知优先级：LEAD_ARRIVED（立即）/ TASK_PROGRESS（分步）/ DAILY_REPORT（定时）
 * - 通过微信公众号模板消息推送，老板无需安装额外 App
 * - 所有通知均有飞书备份，确保消息不丢失
 *
 * 依赖：微信公众号服务号（需申请模板消息权限）
 * 文档：https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html
 */

import { env } from "./env.js";

// ─── 通知类型定义 ─────────────────────────────────────────────

export type WechatNotificationPriority = "immediate" | "progress" | "daily";

export interface WechatTemplateData {
  [key: string]: {
    value: string;
    color?: string;
  };
}

export interface SendTemplateMessageParams {
  /** 接收者的微信 OpenID */
  openId: string;
  /** 模板 ID（在微信公众平台申请） */
  templateId: string;
  /** 点击通知后跳转的 URL（指挥台 H5 地址） */
  url?: string;
  /** 模板数据 */
  data: WechatTemplateData;
}

// ─── 预定义通知模板 ───────────────────────────────────────────

/**
 * 模板一：新询盘到达（最高优先级，立即推送）
 * 触发时机：RFQ 监控 Worker 发现新询盘时
 */
export interface LeadArrivedParams {
  openId: string;
  buyerName: string;
  buyerCountry: string;
  productCategory: string;
  qualityScore: number;
  leadId: number;
}

/**
 * 模板二：Agent 任务进度（中优先级，分步推送）
 * 触发时机：猎手/侦察/内容 Agent 完成每个步骤时
 */
export interface TaskProgressParams {
  openId: string;
  taskTitle: string;
  stepName: string;
  stepResult: string;
  nextStep?: string;
  taskId: number;
}

/**
 * 模板三：每日战报（低优先级，每日早 8 点推送）
 * 触发时机：每日战报 Worker 生成报告时
 */
export interface DailyReportParams {
  openId: string;
  date: string;
  newLeads: number;
  totalLeads: number;
  completedTasks: number;
  creditBalance: number;
}

// ─── 微信 Access Token 管理 ───────────────────────────────────

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  const appId = env.WECHAT_APP_ID;
  const appSecret = env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("[WechatService] WECHAT_APP_ID 或 WECHAT_APP_SECRET 未配置");
  }

  const resp = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
  );
  const data = (await resp.json()) as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };

  if (!data.access_token) {
    throw new Error(`[WechatService] 获取 Access Token 失败: ${data.errmsg}`);
  }

  cachedAccessToken = data.access_token;
  // 提前 5 分钟过期，避免边界问题
  tokenExpiresAt = Date.now() + (data.expires_in! - 300) * 1000;

  return cachedAccessToken;
}

// ─── 核心发送函数 ─────────────────────────────────────────────

export async function sendTemplateMessage(params: SendTemplateMessageParams): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();

    const body = {
      touser: params.openId,
      template_id: params.templateId,
      url: params.url,
      data: params.data,
    };

    const resp = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const result = (await resp.json()) as { errcode: number; errmsg: string };

    if (result.errcode !== 0) {
      console.error(`[WechatService] 模板消息发送失败: ${result.errmsg} (code: ${result.errcode})`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[WechatService] 发送异常:", err);
    return false;
  }
}

// ─── 业务通知函数 ─────────────────────────────────────────────

/**
 * 通知一：新询盘到达
 * 优先级：立即推送（Immediate）
 */
export async function notifyLeadArrived(params: LeadArrivedParams): Promise<boolean> {
  const templateId = env.WECHAT_TEMPLATE_LEAD_ARRIVED;
  if (!templateId) {
    console.warn("[WechatService] WECHAT_TEMPLATE_LEAD_ARRIVED 未配置，跳过通知");
    return false;
  }

  const scoreColor = params.qualityScore >= 80 ? "#FF6B35" : params.qualityScore >= 60 ? "#F7C59F" : "#999999";

  return sendTemplateMessage({
    openId: params.openId,
    templateId,
    url: `${env.COMMANDER_APP_URL}/leads/${params.leadId}`,
    data: {
      first: {
        value: "🎯 新询盘到达，请及时查看",
        color: "#333333",
      },
      keyword1: {
        value: params.buyerName || "未知买家",
        color: "#333333",
      },
      keyword2: {
        value: `${params.buyerCountry} · ${params.productCategory}`,
        color: "#333333",
      },
      keyword3: {
        value: `${params.qualityScore} 分`,
        color: scoreColor,
      },
      remark: {
        value: "点击查看详情并回复 →",
        color: "#FF6B35",
      },
    },
  });
}

/**
 * 通知二：Agent 任务进度
 * 优先级：分步推送（Progress）
 */
export async function notifyTaskProgress(params: TaskProgressParams): Promise<boolean> {
  const templateId = env.WECHAT_TEMPLATE_TASK_PROGRESS;
  if (!templateId) {
    console.warn("[WechatService] WECHAT_TEMPLATE_TASK_PROGRESS 未配置，跳过通知");
    return false;
  }

  return sendTemplateMessage({
    openId: params.openId,
    templateId,
    url: `${env.COMMANDER_APP_URL}/tasks/${params.taskId}`,
    data: {
      first: {
        value: `⚡ ${params.taskTitle}`,
        color: "#333333",
      },
      keyword1: {
        value: params.stepName,
        color: "#333333",
      },
      keyword2: {
        value: params.stepResult,
        color: "#333333",
      },
      remark: {
        value: params.nextStep ? `下一步：${params.nextStep}` : "✅ 任务已完成，点击查看战报",
        color: params.nextStep ? "#999999" : "#FF6B35",
      },
    },
  });
}

/**
 * 通知三：每日战报
 * 优先级：定时推送（Daily，每日早 8 点）
 */
export async function notifyDailyReport(params: DailyReportParams): Promise<boolean> {
  const templateId = env.WECHAT_TEMPLATE_DAILY_REPORT;
  if (!templateId) {
    console.warn("[WechatService] WECHAT_TEMPLATE_DAILY_REPORT 未配置，跳过通知");
    return false;
  }

  return sendTemplateMessage({
    openId: params.openId,
    templateId,
    url: `${env.COMMANDER_APP_URL}/reports`,
    data: {
      first: {
        value: `📊 ${params.date} 每日战报`,
        color: "#333333",
      },
      keyword1: {
        value: `今日新增 ${params.newLeads} 条 / 累计 ${params.totalLeads} 条`,
        color: params.newLeads > 0 ? "#FF6B35" : "#333333",
      },
      keyword2: {
        value: `${params.completedTasks} 个任务已完成`,
        color: "#333333",
      },
      keyword3: {
        value: `${params.creditBalance} 积分`,
        color: params.creditBalance < 100 ? "#E74C3C" : "#27AE60",
      },
      remark: {
        value: params.creditBalance < 100 ? "⚠️ 积分余额不足，请及时充值" : "点击查看完整战报 →",
        color: params.creditBalance < 100 ? "#E74C3C" : "#FF6B35",
      },
    },
  });
}
