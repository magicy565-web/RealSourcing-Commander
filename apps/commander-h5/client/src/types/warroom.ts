/**
 * Warroom 数据类型定义 — V5 生产级
 *
 * 数据来源：
 * ─────────────────────────────────────────────────────────────
 * 真实 API：GET /api/v1/boss/warroom（需要 JWT 认证）
 * 实时推送：WebSocket /ws/warroom（JWT token 参数认证）
 * 数据库：SQLite（better-sqlite3），表：inquiries / task_queue /
 *         social_accounts / openclaw_instances / pending_approvals
 *
 * 映射逻辑在 useWarroomData.ts 的 mapToWarroomData() 函数中。
 * 数据库为空时，所有字段默认为 0 / [] / false。
 *
 * 数据刷新策略：
 *   主通道：WebSocket 实时推送（秒级）
 *   降级：30 秒轮询（WebSocket 不可用时）
 * ─────────────────────────────────────────────────────────────
 */

// ── 消息分类 ────────────────────────────────────────────────────────
export interface MessageCategory {
  /** 分类 ID，对应后端枚举值 */
  id: 'email' | 'task' | 'notification' | 'other';
  /** 显示标签 */
  label: string;
  /** 未读数量 — 对应后端字段: unread_count */
  count: number;
  /** 是否有紧急标记 — 对应后端字段: has_urgent */
  hasUrgent?: boolean;
}

// ── 平台数据 ────────────────────────────────────────────────────────
export interface PlatformData {
  /** 平台 ID */
  id: 'tiktok' | 'meta' | 'linkedin' | 'shopify';
  /** 当前未读数 — 对应后端字段: unread_count */
  unreadCount: number;
  /** 近 7 日趋势数据（从旧到新）— 对应后端字段: trend_7d */
  trend7d: number[];
  /** 是否在线/已连接 — 对应后端字段: is_connected */
  isConnected: boolean;
  /** 平台特定扩展数据 */
  extra?: PlatformExtra;
}

// ── 平台特定扩展字段 ────────────────────────────────────────────────
export interface PlatformExtra {
  // LinkedIn
  /** 领英未读通知数 — 来自 social_accounts.linkedin_unread */
  linkedinUnread?: number;
  /** 领英人脉总数 */
  linkedinConnections?: number;
  /** 领英本周新增连接 */
  linkedinNewConnections?: number;

  // Shopify
  /** 今日 GMV（美元）— 来自 Shopify Orders API */
  shopifyGmvToday?: number;
  /** 昨日 GMV（美元）*/
  shopifyGmvYesterday?: number;
  /** 订单转化率（%）*/
  shopifyConversionRate?: number;
  /** 今日订单数 */
  shopifyOrdersToday?: number;
  /** 实时 GMV 波动（较昨日同期，%）*/
  shopifyGmvDelta?: number;
}

// ── AI 对话消息 ─────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  /** 'ai' | 'user' */
  role: 'ai' | 'user';
  content: string;
  /** ISO 8601 时间字符串 — 对应后端字段: created_at */
  createdAt: string;
  /** 消息来源平台（可选）*/
  platform?: string;
  /** 消息优先级 */
  priority?: 'normal' | 'urgent';
}

// ── 顶层数据结构（与后端 API 响应一一对应）──────────────────────────
export interface WarroomData {
  /**
   * 今日待处理总数
   * 后端 API: GET /api/warroom/summary → { total_pending: number }
   */
  totalPending: number;

  /**
   * 较昨日变化量（正数=增加，负数=减少）
   * 后端 API: GET /api/warroom/summary → { delta_vs_yesterday: number }
   */
  deltaVsYesterday: number;

  /**
   * 今日完成率 0-100
   * 后端 API: GET /api/warroom/summary → { completion_rate: number }
   */
  completionRate: number;

  /**
   * 消息分类列表
   * 后端 API: GET /api/warroom/categories → MessageCategory[]
   */
  categories: MessageCategory[];

  /**
   * 平台数据列表（TikTok · Meta · LinkedIn · Shopify）
   * 后端 API: GET /api/warroom/platforms → PlatformData[]
   */
  platforms: PlatformData[];

  /**
   * AI 对话历史（最近 N 条）
   * 后端 API: GET /api/warroom/chat/history?limit=10 → ChatMessage[]
   */
  chatHistory: ChatMessage[];

  /**
   * 数据最后更新时间
   * 后端 API: GET /api/warroom/summary → { updated_at: string }
   */
  updatedAt: string;

  /**
   * 近 7 日逐日统计（用于全局趋势图）
   * 后端 API: GET /api/warroom/trend?days=7 → DailyStats[]
   */
  trend7d?: DailyStats[];
}

// ── 逐日统计数据 ────────────────────────────────────────────────────
export interface DailyStats {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 当日询盘数 */
  inquiries: number;
  /** 当日回复数 */
  replies: number;
  /** 当日完成任务数 */
  completed: number;
  /** 当日 GMV（美元，如有 Shopify）*/
  gmv?: number;
}

// ── WebSocket 消息协议 ──────────────────────────────────────────────
export type WSMessageType =
  | 'warroom_update'
  | 'new_inquiry'
  | 'platform_update'
  | 'ai_suggestion'
  | 'ping'
  | 'pong';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload?: T;
  timestamp?: string;
}

export interface WSWarroomUpdate {
  totalPending?: number;
  deltaVsYesterday?: number;
  completionRate?: number;
  platforms?: Partial<PlatformData>[];
}

export interface WSNewInquiry extends ChatMessage {
  inquiryId: string;
  buyerCountry?: string;
  productName?: string;
  estimatedValue?: number;
}

// ── Hook 返回类型 ────────────────────────────────────────────────────
export interface UseWarroomDataReturn {
  data: WarroomData | null;
  isLoading: boolean;
  error: Error | null;
  /** 手动刷新数据 */
  refetch: () => void;
}
