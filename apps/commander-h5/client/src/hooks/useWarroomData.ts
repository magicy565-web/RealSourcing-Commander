import { useState, useEffect, useCallback, useRef } from 'react';
import type { WarroomData, UseWarroomDataReturn } from '../types/warroom';

/**
 * useWarroomData — Warroom 核心数据 Hook
 *
 * ═══════════════════════════════════════════════════════════════
 * 当前状态：Mock 模式，每 8 秒自动轮询并随机波动数据，模拟真实数据流。
 *
 * 接入真实 API 的步骤：
 *   1. 将 fetchData 函数中的 Mock 逻辑替换为真实 fetch：
 *      const res = await fetch('/api/warroom/summary', {
 *        headers: { Authorization: `Bearer ${token}` }
 *      });
 *      return mapApiResponseToWarroomData(await res.json());
 *   2. 将 POLL_INTERVAL 改为期望的轮询间隔（如 30000ms）
 *   3. 取消注释 mapApiResponseToWarroomData 字段映射函数
 * ═══════════════════════════════════════════════════════════════
 */

// ── 轮询间隔（Mock 模式 8s，真实 API 建议 30s）────────────────────
const POLL_INTERVAL = 8000;

// ── 基础 Mock 数据 ────────────────────────────────────────────────
const BASE_DATA: WarroomData = {
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

// ── 随机波动函数 ──────────────────────────────────────────────────
function jitter(base: number, range: number): number {
  return Math.max(0, base + Math.round((Math.random() - 0.5) * 2 * range));
}

function generateMockUpdate(prev: WarroomData): WarroomData {
  const tiktokPrev = prev.platforms.find(p => p.id === 'tiktok')!;
  const metaPrev   = prev.platforms.find(p => p.id === 'meta')!;

  const newTikTokCount = jitter(tiktokPrev.unreadCount, 8);
  const newMetaCount   = jitter(metaPrev.unreadCount, 5);

  // 滚动趋势数组（移除最旧的，追加最新的）
  const newTikTokTrend = [...tiktokPrev.trend7d.slice(1), newTikTokCount];
  const newMetaTrend   = [...metaPrev.trend7d.slice(1), newMetaCount];

  const newCategories = prev.categories.map(cat => ({
    ...cat,
    count: jitter(cat.count, 2),
  }));

  const newTotal = newCategories.reduce((sum, c) => sum + c.count, 0);
  const newCompletion = Math.min(99, Math.max(10, jitter(prev.completionRate, 3)));
  const newDelta = jitter(prev.deltaVsYesterday, 3);

  return {
    ...prev,
    totalPending: newTotal,
    deltaVsYesterday: newDelta,
    completionRate: newCompletion,
    categories: newCategories,
    platforms: [
      { ...tiktokPrev, unreadCount: newTikTokCount, trend7d: newTikTokTrend },
      { ...metaPrev,   unreadCount: newMetaCount,   trend7d: newMetaTrend   },
    ],
    updatedAt: new Date().toISOString(),
  };
}

// ── Hook 实现 ────────────────────────────────────────────────────
export function useWarroomData(): UseWarroomDataReturn {
  const [data, setData] = useState<WarroomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const dataRef = useRef<WarroomData | null>(null);

  const fetchData = useCallback(async (isFirst = false) => {
    try {
      if (isFirst) setIsLoading(true);
      setError(null);

      // ── TODO: 接入真实 API 时替换此处 ──────────────────────────
      // const res = await fetch('/api/warroom/summary');
      // if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // const json = await res.json();
      // const newData = mapApiResponseToWarroomData(json);
      // ────────────────────────────────────────────────────────────

      // Mock: 首次加载用基础数据，后续轮询随机波动
      await new Promise(r => setTimeout(r, isFirst ? 400 : 0));
      const newData = isFirst || !dataRef.current
        ? BASE_DATA
        : generateMockUpdate(dataRef.current);

      dataRef.current = newData;
      setData(newData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (isFirst) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const id = setInterval(() => fetchData(false), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  return { data, isLoading, error, refetch: () => fetchData(true) };
}

// ── 字段映射函数（接入真实 API 时取消注释）────────────────────────
// export function mapApiResponseToWarroomData(raw: Record<string, unknown>): WarroomData {
//   return {
//     totalPending:      raw.total_pending as number,
//     deltaVsYesterday:  raw.delta_vs_yesterday as number,
//     completionRate:    raw.completion_rate as number,
//     categories: (raw.categories as any[]).map(c => ({
//       id: c.id, label: c.label, count: c.unread_count, hasUrgent: c.has_urgent,
//     })),
//     platforms: (raw.platforms as any[]).map(p => ({
//       id: p.id, unreadCount: p.unread_count, trend7d: p.trend_7d, isConnected: p.is_connected,
//     })),
//     chatHistory: (raw.chat_history as any[]).map(m => ({
//       id: m.id, role: m.role, content: m.content, createdAt: m.created_at,
//     })),
//     updatedAt: raw.updated_at as string,
//   };
// }
