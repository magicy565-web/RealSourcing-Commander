import { useState, useEffect, useCallback } from 'react';
import type { WarroomData, UseWarroomDataReturn } from '../types/warroom';

/**
 * useWarroomData — Warroom 核心数据 Hook
 *
 * ═══════════════════════════════════════════════════════════════
 * 当前状态：使用 MOCK_DATA，模拟 300ms 网络延迟
 *
 * 接入真实 API 的步骤：
 *   1. 将下方 `fetchData` 函数中的 Mock 逻辑替换为真实 fetch：
 *
 *      const res = await fetch('/api/warroom/summary', {
 *        headers: { Authorization: `Bearer ${token}` }
 *      });
 *      if (!res.ok) throw new Error('Failed to fetch warroom data');
 *      const json = await res.json();
 *      return mapApiResponseToWarroomData(json); // 字段映射函数
 *
 *   2. 如需轮询（实时更新），将 POLL_INTERVAL 改为期望的毫秒数（如 30000）
 *   3. 如需接入 React Query，将此 Hook 内部替换为 useQuery 调用
 * ═══════════════════════════════════════════════════════════════
 */

// ── 轮询间隔（0 = 不轮询，接入真实 API 后建议设为 30000）──────────
const POLL_INTERVAL = 0;

// ── Mock 数据（与 WarroomData 接口完全对应）────────────────────────
const MOCK_DATA: WarroomData = {
  totalPending: 28,
  deltaVsYesterday: 12,
  completionRate: 56,
  categories: [
    { id: 'email',        label: '邮件', count: 12, hasUrgent: false },
    { id: 'task',         label: '任务', count: 5,  hasUrgent: false },
    { id: 'notification', label: '通知', count: 8,  hasUrgent: true  },
    { id: 'other',        label: '其他', count: 3,  hasUrgent: false },
  ],
  platforms: [
    {
      id: 'tiktok',
      unreadCount: 210,
      trend7d: [120, 145, 132, 168, 155, 180, 210],
      isConnected: true,
    },
    {
      id: 'meta',
      unreadCount: 145,
      trend7d: [90, 105, 98, 120, 115, 132, 145],
      isConnected: true,
    },
  ],
  chatHistory: [
    {
      id: 'msg-1',
      role: 'ai',
      content: '检测到 28 条待处理消息，已按优先级整理完毕 ✓',
      createdAt: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: 'msg-2',
      role: 'user',
      content: '先处理 TikTok 的消息',
      createdAt: new Date(Date.now() - 30000).toISOString(),
    },
  ],
  updatedAt: new Date().toISOString(),
};

// ── Hook 实现 ────────────────────────────────────────────────────────
export function useWarroomData(): UseWarroomDataReturn {
  const [data, setData] = useState<WarroomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // ── TODO: 接入真实 API 时替换此处 ──────────────────────────
      // const res = await fetch('/api/warroom/summary');
      // if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // const json = await res.json();
      // setData(mapApiResponseToWarroomData(json));
      // ────────────────────────────────────────────────────────────

      // 模拟网络延迟
      await new Promise(r => setTimeout(r, 300));
      setData(MOCK_DATA);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (POLL_INTERVAL > 0) {
      const id = setInterval(fetchData, POLL_INTERVAL);
      return () => clearInterval(id);
    }
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * mapApiResponseToWarroomData — 后端字段映射函数（预留）
 *
 * 当后端返回的字段名与前端接口不一致时，在此处做转换。
 * 例如后端返回 snake_case，前端使用 camelCase。
 *
 * @example
 * const data = mapApiResponseToWarroomData({
 *   total_pending: 28,
 *   delta_vs_yesterday: 12,
 *   completion_rate: 56,
 *   ...
 * });
 */
// export function mapApiResponseToWarroomData(raw: Record<string, unknown>): WarroomData {
//   return {
//     totalPending: raw.total_pending as number,
//     deltaVsYesterday: raw.delta_vs_yesterday as number,
//     completionRate: raw.completion_rate as number,
//     categories: (raw.categories as any[]).map(c => ({
//       id: c.id,
//       label: c.label,
//       count: c.unread_count,
//       hasUrgent: c.has_urgent,
//     })),
//     platforms: (raw.platforms as any[]).map(p => ({
//       id: p.id,
//       unreadCount: p.unread_count,
//       trend7d: p.trend_7d,
//       isConnected: p.is_connected,
//     })),
//     chatHistory: (raw.chat_history as any[]).map(m => ({
//       id: m.id,
//       role: m.role,
//       content: m.content,
//       createdAt: m.created_at,
//     })),
//     updatedAt: raw.updated_at as string,
//   };
// }
