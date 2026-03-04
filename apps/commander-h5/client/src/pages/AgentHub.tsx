/**
 * AgentHub.tsx — AI 全家桶总览页面
 *
 * 展示全部 12 个 Agent 的状态看板，支持：
 * - 按梯队分组展示（4 个梯队）
 * - 每个 Agent 的运行状态、最近任务、核心指标
 * - 一键触发 Agent 任务
 * - 实时进度轮询
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { agentApi, type Agent, type AgentTask } from '@/lib/api';
import { AgentIcon, AGENT_ICON_MAP, TIER_CONFIG } from '@/components/AgentIcons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// ─── 梯队分组 ─────────────────────────────────────────────────
const TIER_ORDER: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

// ─── 状态颜色 ─────────────────────────────────────────────────
function statusColor(status: string) {
  switch (status) {
    case 'idle':    return 'text-emerald-400';
    case 'running': return 'text-blue-400';
    case 'error':   return 'text-red-400';
    default:        return 'text-slate-400';
  }
}
function statusLabel(status: string) {
  switch (status) {
    case 'idle':    return '就绪';
    case 'running': return '运行中';
    case 'error':   return '异常';
    default:        return '未激活';
  }
}
function taskStatusBadge(status: string) {
  switch (status) {
    case 'success': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">成功</Badge>;
    case 'failed':  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">失败</Badge>;
    case 'running': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs animate-pulse">运行中</Badge>;
    default:        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">等待</Badge>;
  }
}

// ─── Agent 卡片 ───────────────────────────────────────────────
function AgentCard({
  agent,
  latestTask,
  onTrigger,
  isTriggering,
}: {
  agent: Agent;
  latestTask?: AgentTask;
  onTrigger: (agentId: string, agentType: string) => void;
  isTriggering: boolean;
}) {
  const meta = AGENT_ICON_MAP[agent.type];
  const color = meta?.color ?? '#64748B';
  const isRunning = agent.status === 'running' || latestTask?.status === 'running';

  return (
    <div
      className="relative rounded-2xl border transition-all duration-200 hover:scale-[1.01] cursor-default"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, rgba(0,0,0,0.3) 100%)`,
        borderColor: `${color}25`,
      }}
    >
      {/* 顶部光晕 */}
      <div
        className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
      />

      <div className="p-4">
        {/* 头部：图标 + 名称 + 状态 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <AgentIcon type={agent.type} size={40} />
              {isRunning && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse"
                  style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                />
              )}
            </div>
            <div>
              <div className="font-semibold text-white text-sm">{agent.name}</div>
              <div className={`text-xs mt-0.5 ${statusColor(agent.status)}`}>
                ● {statusLabel(agent.status)}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            disabled={isTriggering || isRunning}
            onClick={() => onTrigger(agent.id, agent.type)}
            className="h-7 px-3 text-xs rounded-lg font-medium transition-all"
            style={{
              background: isRunning ? 'rgba(255,255,255,0.05)' : `${color}25`,
              color: isRunning ? '#64748B' : color,
              border: `1px solid ${color}40`,
            }}
          >
            {isRunning ? '运行中' : isTriggering ? '启动中...' : '立即运行'}
          </Button>
        </div>

        {/* 描述 */}
        <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
          {agent.description}
        </p>

        {/* 最近任务进度 */}
        {latestTask && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{latestTask.currentStep || '等待执行'}</span>
              {taskStatusBadge(latestTask.status)}
            </div>
            {latestTask.status === 'running' && (
              <Progress
                value={latestTask.progress}
                className="h-1.5"
                style={{ '--progress-color': color } as React.CSSProperties}
              />
            )}
          </div>
        )}

        {/* 上次运行时间 */}
        {agent.lastRunAt && (
          <div className="mt-2 text-xs text-slate-600">
            上次运行：{new Date(agent.lastRunAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────
export default function AgentHub() {
  const [, navigate] = useLocation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [latestTasks, setLatestTasks] = useState<Record<string, AgentTask>>({});
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, running: 0, idle: 0, error: 0 });

  // 加载 Agent 列表
  const loadAgents = useCallback(async () => {
    try {
      const data = await agentApi.listAgents();
      setAgents(data);
      const s = { total: data.length, running: 0, idle: 0, error: 0 };
      data.forEach((a: Agent) => {
        if (a.status === 'running') s.running++;
        else if (a.status === 'idle') s.idle++;
        else if (a.status === 'error') s.error++;
      });
      setStats(s);
    } catch (e) {
      console.error('加载 Agent 列表失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载最近任务
  const loadLatestTasks = useCallback(async (agentList: Agent[]) => {
    const taskMap: Record<string, AgentTask> = {};
    await Promise.allSettled(
      agentList.map(async (agent) => {
        try {
          const tasks = await agentApi.listTasks(agent.id, 1);
          if (tasks.length > 0) taskMap[agent.id] = tasks[0];
        } catch { /* ignore */ }
      })
    );
    setLatestTasks(taskMap);
  }, []);

  // 初始化
  useEffect(() => {
    loadAgents().then(() => {
      // agents 加载后再加载任务
    });
  }, [loadAgents]);

  useEffect(() => {
    if (agents.length > 0) {
      loadLatestTasks(agents);
    }
  }, [agents, loadLatestTasks]);

  // 轮询运行中的任务
  useEffect(() => {
    const hasRunning = agents.some(a => a.status === 'running') ||
      Object.values(latestTasks).some(t => t.status === 'running');
    if (!hasRunning) return;

    const timer = setInterval(() => {
      loadAgents();
      if (agents.length > 0) loadLatestTasks(agents);
    }, 3000);
    return () => clearInterval(timer);
  }, [agents, latestTasks, loadAgents, loadLatestTasks]);

  // 触发 Agent
  const handleTrigger = async (agentId: string, agentType: string) => {
    setTriggering(prev => ({ ...prev, [agentId]: true }));
    try {
      await agentApi.triggerAgent(agentId, {});
      toast.success(`${AGENT_ICON_MAP[agentType]?.label ?? 'Agent'} 已启动`);
      setTimeout(() => loadAgents(), 1000);
    } catch (e: any) {
      toast.error(e?.message ?? '启动失败，请重试');
    } finally {
      setTriggering(prev => ({ ...prev, [agentId]: false }));
    }
  };

  // 按梯队分组
  const agentsByTier = TIER_ORDER.reduce((acc, tier) => {
    acc[tier] = agents.filter(a => (AGENT_ICON_MAP[a.type]?.tier ?? 4) === tier);
    return acc;
  }, {} as Record<number, Agent[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.14 0.02 250)' }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">正在加载 AI 全家桶...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.14 0.02 250)' }}>
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/8"
        style={{ background: 'rgba(10,10,20,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/boss-warroom')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 className="text-white font-bold text-base">AI 全家桶</h1>
              <p className="text-slate-500 text-xs">RealSourcing Commander · {agents.length} 个 Agent</p>
            </div>
          </div>
          {/* 状态概览 */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-400">● {stats.idle} 就绪</span>
            {stats.running > 0 && <span className="text-blue-400 animate-pulse">● {stats.running} 运行中</span>}
            {stats.error > 0 && <span className="text-red-400">● {stats.error} 异常</span>}
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

        {/* 顶部 Banner */}
        <div className="relative rounded-2xl overflow-hidden p-6"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(59,130,246,0.15) 50%, rgba(16,185,129,0.1) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="absolute inset-0 opacity-30"
            style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.2) 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-1">Commander AI 全家桶</h2>
            <p className="text-slate-300 text-sm mb-4">12 个专业 AI Agent，覆盖外贸全链路自动化</p>
            <div className="grid grid-cols-4 gap-3">
              {TIER_ORDER.map(tier => {
                const cfg = TIER_CONFIG[tier];
                const count = agentsByTier[tier]?.length ?? 0;
                return (
                  <div key={tier} className="rounded-xl p-3 text-center" style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                    <div className="text-lg font-bold" style={{ color: cfg.color }}>{count}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{cfg.sublabel}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 按梯队展示 */}
        {TIER_ORDER.map(tier => {
          const cfg = TIER_CONFIG[tier];
          const tierAgents = agentsByTier[tier] ?? [];
          if (tierAgents.length === 0) return null;

          return (
            <section key={tier}>
              {/* 梯队标题 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${cfg.color}60, transparent)` }} />
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}40`, color: cfg.color }}>
                  <span>{cfg.label}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{cfg.sublabel}</span>
                </div>
                <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}60)` }} />
              </div>

              {/* Agent 卡片网格 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tierAgents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    latestTask={latestTasks[agent.id]}
                    onTrigger={handleTrigger}
                    isTriggering={!!triggering[agent.id]}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* 空状态：未初始化 */}
        {agents.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">AI 全家桶尚未初始化</h3>
              <p className="text-slate-500 text-sm mt-1">请联系管理员初始化 Agent 配置</p>
            </div>
          </div>
        )}

        {/* 底部说明 */}
        <div className="text-center text-xs text-slate-600 pb-4">
          Commander AI 全家桶 · Phase 9 · 12 个 Agent 全链路覆盖
        </div>
      </div>
    </div>
  );
}
