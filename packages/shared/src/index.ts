/**
 * RealSourcing Commander 5.0 — 共享类型定义
 * 手机端、Web 端、服务端共用
 */

// ─── OpenClaw 实例类型 ────────────────────────────────────────

export type OpenClawInstanceType = "dedicated" | "standard";

export type OpenClawInstanceStatus =
  | "active"      // 正常运行
  | "idle"        // 空闲待命
  | "executing"   // 执行任务中
  | "paused"      // 已暂停
  | "error";      // 异常

// ─── 任务类型 ─────────────────────────────────────────────────

export type CommanderTaskType =
  | "rfq_monitor"    // RFQ 监控（自动触发）
  | "hunter"         // 猎手 Agent（老板发起）
  | "content"        // 内容 Agent（自动触发）
  | "geo_builder"    // GEO 建造者（后台静默）
  | "daily_report";  // 每日战报（定时触发）

export type CommanderTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

// ─── 询盘（线索）类型 ─────────────────────────────────────────

export type LeadSource =
  | "alibaba"
  | "made_in_china"
  | "global_sources"
  | "linkedin"
  | "facebook"
  | "hunter_agent"
  | "manual";

export type LeadStatus =
  | "new"           // 新询盘，待老板查看
  | "viewed"        // 老板已查看
  | "replied"       // 已回复
  | "qualified"     // 已确认为有效线索
  | "disqualified"  // 无效线索
  | "converted";    // 已成交

// ─── 平台账号类型 ─────────────────────────────────────────────

export type AccountPlatform =
  | "alibaba"
  | "made_in_china"
  | "global_sources"
  | "linkedin"
  | "facebook";

export type AccountStatus =
  | "active"
  | "session_expired"
  | "banned"
  | "pending_login";

// ─── 通知类型 ─────────────────────────────────────────────────

export type NotificationPriority = "urgent" | "normal" | "low";

export interface LeadNotification {
  leadId: number;
  buyerName: string;
  buyerCountry: string;
  productCategory: string;
  qualityScore: number;
  source: LeadSource;
  previewText: string;
}

export interface TaskProgressNotification {
  taskId: number;
  taskType: CommanderTaskType;
  step: number;
  totalSteps: number;
  stepDescription: string;
  result?: string;
}

export interface DailyReportNotification {
  reportDate: string;
  newLeadsCount: number;
  repliedCount: number;
  geoScoreChange: number;
  topLead?: {
    buyerName: string;
    buyerCountry: string;
    qualityScore: number;
  };
}

// ─── 积分类型 ─────────────────────────────────────────────────

export type CreditTransactionType =
  | "purchase"        // 购买积分
  | "task_consume"    // 任务消耗
  | "refund"          // 退款
  | "bonus"           // 赠送
  | "subscription";   // 订阅赠送

// ─── API 响应格式 ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date().toISOString() };
}

export function createErrorResponse(code: string, message: string): ApiResponse {
  return { success: false, error: { code, message }, timestamp: new Date().toISOString() };
}
