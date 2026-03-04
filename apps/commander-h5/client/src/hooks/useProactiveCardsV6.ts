/**
 * useProactiveCardsV6 — V6.0 AI 主动决策卡片生成 Hook
 *
 * 核心逻辑（对应战略文档 §3.1 市场扫描逻辑）：
 *  1. 外部信号监测：中东海关数据变动 / TikTok 话题热度 / 询盘激增
 *  2. 内部匹配：产品库高匹配度 + 市场信号 → 触发决策卡片
 *  3. 三种决策形态：研究型 / 行动型 / 优化型
 *  4. 早晨 8 点自动生成「指挥官简报」
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { ProactiveCardV6Data, DecisionType } from '../components/ProactiveCardV6';
import type { WarroomData } from '../types/warroom';

// ── 市场信号数据（模拟外部数据源） ──────────────────────────
const MARKET_SIGNALS = [
  {
    id: 'saudi-infra-2026',
    title: '沙特基建需求激增，工业管材极具竞争力',
    body: '检测到沙特 2026 愿景下基建项目激增，您的【工业管材】产品与 12 个高意向采购商匹配。是否生成一份《沙特基建市场渗透报告》？',
    type: 'research' as DecisionType,
    metrics: [{ label: '匹配采购商', value: '12个', delta: '+3', positive: true }, { label: '预估询盘价值', value: '$48K', positive: true }],
    steps: [
      { label: '扫描沙特海关数据库', detail: '分析近90天进口记录', status: 'pending' as const, platform: '海关数据' },
      { label: '匹配产品竞争力矩阵', detail: '对标 RealSourcing 同类产品', status: 'pending' as const, platform: 'RealSourcing' },
      { label: '生成市场渗透报告', detail: 'AI 撰写 PDF 报告（约 8 页）', status: 'pending' as const },
      { label: '推送至 Boss Phone', detail: '报告已就绪，可一键分享', status: 'pending' as const },
    ],
    platform: '火山引擎 · 中东海关数据',
    urgency: 'high' as const,
    estimatedTime: '约 3 分钟',
    creditCost: 15,
    confirmLabel: '生成报告',
    executionResult: '《沙特基建市场渗透报告》已生成，已推送至您的 Boss Phone',
  },
  {
    id: 'tiktok-leads-batch',
    title: '已筛选 12 个高匹配度 TikTok 线索',
    body: '已从火山引擎信息流筛选出 12 个高匹配度中东买家线索，平均意向分 87/100。是否立即启动 AI 自动触达并生成本土化海报？',
    type: 'action' as DecisionType,
    metrics: [{ label: '高意向线索', value: '12个', delta: '+5', positive: true }, { label: '平均意向分', value: '87分', positive: true }, { label: '预估转化', value: '3-5单', positive: true }],
    steps: [
      { label: '筛选高意向买家', detail: '意向分 ≥ 80 的线索', status: 'pending' as const, platform: 'TikTok' },
      { label: '生成本土化海报', detail: '沙漠奢华风格 × 12 张', status: 'pending' as const, platform: 'Midjourney' },
      { label: 'AI 发起 DM 触达', detail: '阿拉伯语个性化消息', status: 'pending' as const, platform: 'TikTok DM' },
      { label: '跟踪回复率', detail: '24h 内自动汇报结果', status: 'pending' as const },
    ],
    platform: 'TikTok · 火山引擎',
    urgency: 'high' as const,
    estimatedTime: '约 8 分钟',
    creditCost: 24,
    confirmLabel: '立即触达',
    executionResult: 'AI 已向 12 个买家发送本土化触达消息，预计 24h 内获得首批回复',
  },
  {
    id: 'catalog-optimize',
    title: '产品图册在中东点击率低于行业均值',
    body: '当前产品图册在中东市场的点击率（2.3%）低于行业平均值（4.8%）。是否让 AI 将图册风格调整为「沙漠奢华风」并重新生成？',
    type: 'optimize' as DecisionType,
    metrics: [{ label: '当前点击率', value: '2.3%', delta: '-52%', positive: false }, { label: '行业均值', value: '4.8%', positive: true }, { label: '预期提升', value: '+2.1x', positive: true }],
    steps: [
      { label: '分析现有图册弱点', detail: '视觉风格 · 文案 · 配色', status: 'pending' as const },
      { label: '生成「沙漠奢华风」素材', detail: 'Flux AI 重新渲染 × 6 张', status: 'pending' as const, platform: 'Flux AI' },
      { label: '多语言文案本土化', detail: '阿拉伯语 + 英语双版本', status: 'pending' as const },
      { label: '更新 RealSourcing 产品页', detail: '自动替换图册并提交审核', status: 'pending' as const, platform: 'RealSourcing' },
    ],
    platform: 'RealSourcing · Flux AI',
    urgency: 'medium' as const,
    estimatedTime: '约 12 分钟',
    creditCost: 30,
    confirmLabel: '优化图册',
    executionResult: '新版「沙漠奢华风」图册已生成并提交至 RealSourcing 审核',
  },
  {
    id: 'webinar-suggestion',
    title: '检测到 UAE 有大量潜在分销商',
    body: 'Commander 识别出阿联酋地区有 28 家潜在分销商活跃在 RealSourcing 平台。是否主动建议老板在 RealSourcing 举办一场代理商 Webinar？',
    type: 'action' as DecisionType,
    metrics: [{ label: '潜在分销商', value: '28家', delta: '+8', positive: true }, { label: '预估参会率', value: '45%', positive: true }],
    steps: [
      { label: '生成 Webinar 邀请函', detail: '阿拉伯语 + 英语双语版', status: 'pending' as const },
      { label: '批量发送邀请', detail: '向 28 家分销商发送', status: 'pending' as const, platform: 'RealSourcing' },
      { label: '收集报名信息', detail: '自动汇总参会名单', status: 'pending' as const },
      { label: '会后自动跟进', detail: '发送录播 + 代理政策', status: 'pending' as const },
    ],
    platform: 'RealSourcing · UAE',
    urgency: 'medium' as const,
    estimatedTime: '约 5 分钟',
    creditCost: 18,
    confirmLabel: '发起 Webinar',
    executionResult: 'Webinar 邀请已发送给 28 家分销商，收集报名中',
  },
];// ── Hook 实现 ─────────────────────────────────────────────────────
export function useProactiveCardsV6(data: WarroomData | null) {
  const [cards, setCards] = useState<ProactiveCardV6Data[]>([]);
  const [showMorningBriefing, setShowMorningBriefing] = useState(false);
  const [aiBriefingData, setAiBriefingData] = useState<{
    greeting: string;
    todaySummary: string;
    topPriorities: Array<{ rank: number; action: string; reason: string; urgency: string }>;
    marketInsight: string;
    aiRecommendation: string;
  } | null>(null);
  const shownRef = useRef<Set<string>>(new Set());
  const initRef = useRef(false);

  // 调用 AI 简报接口
  const fetchAiBriefing = useCallback(async (warroomData: WarroomData) => {
    try {
      const res = await fetch('/api/v1/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalPending: warroomData.totalPending,
          urgentInquiries: warroomData.categories?.find(c => c.id === 'notification')?.count ?? 0,
          platforms: warroomData.platforms?.map(p => p.id) ?? ['TikTok', 'Meta'],
          topProducts: ['工业管材', 'LED灯具', '太阳能板'],
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setAiBriefingData(d.briefing);
      }
    } catch (err) {
      console.warn('[useProactiveCardsV6] AI 简报获取失败:', err);
    }
  }, []);

  const addCard = useCallback((
    signal: typeof MARKET_SIGNALS[0],
    overrides?: Partial<ProactiveCardV6Data>
  ) => {
    if (shownRef.current.has(signal.id)) return;
    shownRef.current.add(signal.id);

    const card: ProactiveCardV6Data = {
      id: nanoid(8),
      type: signal.type,
      title: signal.title,
      body: signal.body,
      confirmLabel: signal.confirmLabel,
      metrics: signal.metrics,
      steps: signal.steps.map(s => ({ ...s })),
      platform: signal.platform,
      urgency: signal.urgency,
      estimatedTime: signal.estimatedTime,
      creditCost: signal.creditCost,
      timestamp: new Date(),
      executionState: 'idle',
      executionResult: signal.executionResult,
      ...overrides,
    };

    setCards(prev => [card, ...prev].slice(0, 6));
  }, []);

  const dismissCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  const confirmCard = useCallback((id: string) => {
    // 卡片内部处理执行逻辑，这里只做状态标记
    setCards(prev => prev.map(c => c.id === id ? { ...c, executionState: 'running' } : c));
    setTimeout(() => {
      setCards(prev => prev.map(c => c.id === id ? { ...c, executionState: 'done' } : c));
      // 执行完成后 5 秒自动移除
      setTimeout(() => {
        setCards(prev => prev.filter(c => c.id !== id));
      }, 5000);
    }, 3000 + Math.random() * 2000);
  }, []);

  // 首次加载：根据数据状态触发决策卡片
  useEffect(() => {
    if (!data || initRef.current) return;
    initRef.current = true;

    // 延迟触发，让页面先渲染
    const timer = setTimeout(() => {
      // 根据数据状态决定推送哪些卡片
      if (data.totalPending > 5) {
        addCard(MARKET_SIGNALS[1]); // 线索触达
      }
      if (data.completionRate < 60) {
        addCard(MARKET_SIGNALS[2]); // 图册优化
      }
      // 始终推送市场扫描
      addCard(MARKET_SIGNALS[0]); // 沙特基建

      // 判断是否展示早晨简报（8-10点）
      const hour = new Date().getHours();
      if (hour >= 8 && hour < 10) {
        // 先获取 AI 简报数据，再展示
        fetchAiBriefing(data);
        setTimeout(() => setShowMorningBriefing(true), 1500);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [data, addCard]);

  // 定时推送新卡片（模拟实时市场信号）
  useEffect(() => {
    const interval = setInterval(() => {
      const unshown = MARKET_SIGNALS.filter(s => !shownRef.current.has(s.id));
      if (unshown.length > 0 && cards.length < 3) {
        addCard(unshown[Math.floor(Math.random() * unshown.length)]);
      }
    }, 45_000); // 每45秒检查一次

    return () => clearInterval(interval);
  }, [addCard, cards.length]);

  return {
    cards,
    dismissCard,
    confirmCard,
    showMorningBriefing,
    setShowMorningBriefing,
    morningBriefingCards: cards.slice(0, 3),
    aiBriefingData,
    fetchAiBriefing,
  };
}
