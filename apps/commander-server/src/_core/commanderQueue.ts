/**
 * RealSourcing 5.0 — Commander 任务队列定义
 *
 * 架构说明：
 * - 完全复用 4.0 的 BullMQ + Redis 基础设施（见 queue.ts）
 * - 新增 5 个专属队列，与现有队列完全隔离
 * - 所有队列共享同一个 Redis 连接，通过队列名称区分
 *
 * 队列优先级设计：
 *   rfq-monitor    → 最高优先级（直接影响老板当日收益）
 *   hunter-agent   → 高优先级（主动获客核心）
 *   content-agent  → 中优先级（开发信生成）
 *   geo-builder    → 低优先级（长期资产，后台静默执行）
 *   daily-report   → 定时触发（每日早 8 点）
 */

import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { redisConnection } from "./queue"; // 复用 4.0 的 Redis 连接

// ─── 队列名称常量 ─────────────────────────────────────────────

export const COMMANDER_QUEUES = {
  RFQ_MONITOR:   "commander:rfq-monitor",
  HUNTER_AGENT:  "commander:hunter-agent",
  CONTENT_AGENT: "commander:content-agent",
  GEO_BUILDER:   "commander:geo-builder",
  DAILY_REPORT:  "commander:daily-report",
} as const;

// ─── 任务数据类型定义 ─────────────────────────────────────────

/** RFQ 监控任务：OpenClaw 登录平台账号，抓取新询盘 */
export interface RfqMonitorJobData {
  factoryId: number;
  instanceId: number;
  accountId: number;
  platform: "alibaba" | "made_in_china" | "global_sources";
  /** 上次抓取时间，用于增量抓取 */
  lastFetchAt?: string;
}

/** 猎手 Agent 任务：搜索目标市场买家 */
export interface HunterAgentJobData {
  factoryId: number;
  instanceId: number;
  commanderTaskId: number;
  targetMarket: string;       // 如 "Vietnam"
  targetIndustry: string;     // 如 "solar_panel"
  targetBuyerTitle?: string;  // 如 "Procurement Manager"
  maxResults: number;         // 默认 50
}

/** 内容 Agent 任务：为买家生成个性化开发信 */
export interface ContentAgentJobData {
  factoryId: number;
  commanderTaskId: number;
  leadIds: number[];          // 需要生成开发信的线索 ID 列表
  tone?: "formal" | "casual"; // 邮件风格
}

/** GEO 建造者任务：优化工厂 AI 可见度 */
export interface GeoBuilderJobData {
  factoryId: number;
  taskType: "sync_directories" | "update_schema" | "monitor_forums" | "generate_report";
}

/** 每日战报任务 */
export interface DailyReportJobData {
  factoryId: number;
  reportDate: string; // YYYY-MM-DD
}

// ─── 队列实例（懒加载，避免启动时连接失败） ───────────────────

let _rfqMonitorQueue: Queue | null = null;
let _hunterAgentQueue: Queue | null = null;
let _contentAgentQueue: Queue | null = null;
let _geoBuilderQueue: Queue | null = null;
let _dailyReportQueue: Queue | null = null;

const defaultQueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
};

export function getRfqMonitorQueue(): Queue<RfqMonitorJobData> {
  if (!_rfqMonitorQueue) {
    _rfqMonitorQueue = new Queue(COMMANDER_QUEUES.RFQ_MONITOR, defaultQueueOptions);
  }
  return _rfqMonitorQueue as Queue<RfqMonitorJobData>;
}

export function getHunterAgentQueue(): Queue<HunterAgentJobData> {
  if (!_hunterAgentQueue) {
    _hunterAgentQueue = new Queue(COMMANDER_QUEUES.HUNTER_AGENT, defaultQueueOptions);
  }
  return _hunterAgentQueue as Queue<HunterAgentJobData>;
}

export function getContentAgentQueue(): Queue<ContentAgentJobData> {
  if (!_contentAgentQueue) {
    _contentAgentQueue = new Queue(COMMANDER_QUEUES.CONTENT_AGENT, defaultQueueOptions);
  }
  return _contentAgentQueue as Queue<ContentAgentJobData>;
}

export function getGeoBuilderQueue(): Queue<GeoBuilderJobData> {
  if (!_geoBuilderQueue) {
    _geoBuilderQueue = new Queue(COMMANDER_QUEUES.GEO_BUILDER, {
      ...defaultQueueOptions,
      defaultJobOptions: {
        ...defaultQueueOptions.defaultJobOptions,
        // GEO 任务优先级最低，允许更长的延迟
        attempts: 5,
        backoff: { type: "exponential" as const, delay: 30000 },
      },
    });
  }
  return _geoBuilderQueue as Queue<GeoBuilderJobData>;
}

export function getDailyReportQueue(): Queue<DailyReportJobData> {
  if (!_dailyReportQueue) {
    _dailyReportQueue = new Queue(COMMANDER_QUEUES.DAILY_REPORT, defaultQueueOptions);
  }
  return _dailyReportQueue as Queue<DailyReportJobData>;
}

// ─── 任务派发辅助函数 ─────────────────────────────────────────

/**
 * 派发 RFQ 监控任务
 * 由定时调度器每 30 分钟触发一次（每个活跃工厂）
 */
export async function dispatchRfqMonitorJob(data: RfqMonitorJobData): Promise<string> {
  const queue = getRfqMonitorQueue();
  const job = await queue.add(
    `rfq-${data.factoryId}-${data.platform}`,
    data,
    {
      // 防止同一工厂同一平台重复排队
      jobId: `rfq-monitor-${data.factoryId}-${data.platform}`,
      priority: 1, // 最高优先级
    }
  );
  return job.id!;
}

/**
 * 派发猎手 Agent 任务
 * 由老板在指挥台点击"发起指令"时触发
 */
export async function dispatchHunterAgentJob(data: HunterAgentJobData): Promise<string> {
  const queue = getHunterAgentQueue();
  const job = await queue.add(
    `hunter-${data.factoryId}-${data.commanderTaskId}`,
    data,
    { priority: 2 }
  );
  return job.id!;
}

/**
 * 派发内容 Agent 任务
 * 由猎手 Agent 完成后自动触发（串联工作流）
 */
export async function dispatchContentAgentJob(data: ContentAgentJobData): Promise<string> {
  const queue = getContentAgentQueue();
  const job = await queue.add(
    `content-${data.factoryId}-${data.commanderTaskId}`,
    data,
    { priority: 3 }
  );
  return job.id!;
}

/**
 * 派发每日战报任务
 * 由 cron 调度器每日早 8 点触发
 */
export async function dispatchDailyReportJob(factoryId: number, reportDate: string): Promise<string> {
  const queue = getDailyReportQueue();
  const job = await queue.add(
    `daily-report-${factoryId}-${reportDate}`,
    { factoryId, reportDate },
    {
      // 防止同一天重复生成
      jobId: `daily-report-${factoryId}-${reportDate}`,
    }
  );
  return job.id!;
}
