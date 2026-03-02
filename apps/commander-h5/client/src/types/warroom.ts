/**
 * Warroom 数据类型定义
 *
 * 数据映射说明：
 * ─────────────────────────────────────────────────────────────
 * 当前阶段：所有数据由 useWarroomData() Hook 内的 MOCK_DATA 提供。
 *
 * 接入真实 API 时，只需修改 useWarroomData() 内部的数据来源：
 *   1. 将 `return MOCK_DATA` 替换为 `await fetch('/api/warroom/summary')`
 *   2. 后端返回的 JSON 结构需符合下方 WarroomData 接口
 *   3. 组件层零改动
 *
 * 推荐接入方式（优先级从高到低）：
 *   · React Query (TanStack Query) — 适合需要缓存、轮询、乐观更新的场景
 *   · SWR — 轻量级，适合简单数据获取
 *   · 原生 useEffect + fetch — 当前 Mock 阶段使用此方式
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
  id: 'tiktok' | 'meta';
  /** 当前未读数 — 对应后端字段: unread_count */
  unreadCount: number;
  /** 近 7 日趋势数据（从旧到新）— 对应后端字段: trend_7d */
  trend7d: number[];
  /** 是否在线/已连接 — 对应后端字段: is_connected */
  isConnected: boolean;
}

// ── AI 对话消息 ─────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  /** 'ai' | 'user' */
  role: 'ai' | 'user';
  content: string;
  /** ISO 8601 时间字符串 — 对应后端字段: created_at */
  createdAt: string;
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
   * 平台数据列表
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
}

// ── Hook 返回类型 ────────────────────────────────────────────────────
export interface UseWarroomDataReturn {
  data: WarroomData | null;
  isLoading: boolean;
  error: Error | null;
  /** 手动刷新数据 */
  refetch: () => void;
}
