/**
 * useProactiveCards — AI 主动建议卡片生成 Hook
 *
 * 监听数据波动，自动生成主动建议卡片：
 * - TikTok 流量骤降 → 预警卡片
 * - 询盘激增 → 洞察卡片
 * - 完成率低 → 行动建议卡片
 * - 周增长正向 → 正向反馈卡片
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { ProactiveCardData } from '../components/ProactiveCard';
import type { WarroomData } from '../types/warroom';

export function useProactiveCards(data: WarroomData | null) {
  const [cards, setCards] = useState<ProactiveCardData[]>([]);
  const prevDataRef = useRef<WarroomData | null>(null);
  const shownAlertsRef = useRef<Set<string>>(new Set());

  const addCard = useCallback((card: Omit<ProactiveCardData, 'id' | 'timestamp'>) => {
    const key = `${card.type}-${card.title}`;
    if (shownAlertsRef.current.has(key)) return;
    shownAlertsRef.current.add(key);

    const newCard: ProactiveCardData = {
      ...card,
      id: nanoid(8),
      timestamp: new Date(),
    };
    setCards(prev => [newCard, ...prev].slice(0, 5));

    // Auto-dismiss after 30s
    setTimeout(() => {
      setCards(prev => prev.filter(c => c.id !== newCard.id));
      shownAlertsRef.current.delete(key);
    }, 30_000);
  }, []);

  const dismissCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  useEffect(() => {
    if (!data) return;
    const prev = prevDataRef.current;

    // ── 首次加载：生成欢迎洞察 ──────────────────────────────────
    if (!prev) {
      if (data.totalPending > 10) {
        addCard({
          type: 'alert',
          title: '待处理消息积压',
          body: `当前有 ${data.totalPending} 条消息待处理，建议优先处理紧急询盘，避免客户流失。`,
          cta: '立即处理',
          metric: { label: '待处理', value: String(data.totalPending), delta: `+${data.deltaVsYesterday}`, isNegative: data.deltaVsYesterday > 0 },
        });
      } else if (data.completionRate < 40 && data.totalPending > 0) {
        addCard({
          type: 'action',
          title: '今日完成率偏低',
          body: `当前完成率仅 ${data.completionRate}%，建议开启 Commander AI 自动回复模式，提升处理效率。`,
          cta: '开启自动回复',
          metric: { label: '完成率', value: `${data.completionRate}%`, isNegative: true },
        });
      }

      // Platform connectivity check
      const disconnected = data.platforms.filter(p => !p.isConnected);
      if (disconnected.length > 0) {
        addCard({
          type: 'alert',
          title: `${disconnected.length} 个平台连接中断`,
          body: `${disconnected.map(p => p.id.toUpperCase()).join('、')} 账号连接异常，可能影响消息同步，请检查账号授权状态。`,
          cta: '检查连接',
          platform: disconnected.map(p => p.id.toUpperCase()).join(' · '),
        });
      }

      prevDataRef.current = data;
      return;
    }

    // ── 数据变化检测 ────────────────────────────────────────────

    // 询盘激增（较上次增加 5+ 条）
    if (data.totalPending - prev.totalPending >= 5) {
      addCard({
        type: 'insight',
        title: '询盘量激增',
        body: `过去几分钟新增 ${data.totalPending - prev.totalPending} 条询盘，建议立即查看并优先回复高价值客户。`,
        cta: '查看新询盘',
        metric: {
          label: '新增',
          value: `+${data.totalPending - prev.totalPending}`,
          delta: '刚刚',
          isNegative: false,
        },
      });
    }

    // TikTok 趋势骤降
    const tiktokNow = data.platforms.find(p => p.id === 'tiktok');
    const tiktokPrev = prev.platforms.find(p => p.id === 'tiktok');
    if (tiktokNow && tiktokPrev && tiktokNow.trend7d.length >= 2 && tiktokPrev.trend7d.length >= 2) {
      const nowLast = tiktokNow.trend7d[tiktokNow.trend7d.length - 1];
      const prevLast = tiktokPrev.trend7d[tiktokPrev.trend7d.length - 1];
      if (prevLast > 0 && (nowLast - prevLast) / prevLast < -0.3) {
        addCard({
          type: 'alert',
          title: 'TikTok 流量骤降',
          body: `TikTok 消息量下降超过 30%，可能是账号限流或内容触发审核。建议检查近期发布内容并联系平台支持。`,
          cta: '查看 TikTok',
          platform: 'TikTok · 抖音',
          metric: { label: '降幅', value: `${Math.round((nowLast - prevLast) / prevLast * 100)}%`, isNegative: true },
        });
      }
    }

    // 完成率提升到 80%+ → 正向反馈
    if (data.completionRate >= 80 && prev.completionRate < 80) {
      addCard({
        type: 'success',
        title: '今日完成率突破 80%',
        body: `出色！今日任务完成率已达 ${data.completionRate}%，团队效率优秀。继续保持！`,
        metric: { label: '完成率', value: `${data.completionRate}%`, delta: `+${data.completionRate - prev.completionRate}%`, isNegative: false },
      });
    }

    prevDataRef.current = data;
  }, [data, addCard]);

  return { cards, dismissCard };
}
