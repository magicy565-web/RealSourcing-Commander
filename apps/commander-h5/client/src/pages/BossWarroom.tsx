/**
 * BossWarroom — 全屏沉浸式老板指挥台
 * APEX COMMANDER v2 Design System — Enhanced Edition
 *
 * 三屏滑动架构（左右水平滑动）：
 *   Screen 0 (Hero):    今日战报 + 核心数字 + 紧急信号 + 审批操作
 *   Screen 1 (Command): 数字员工状态 + 老板指令下达 + 快捷指令
 *   Screen 2 (Report):  经营周报对比 + ROI 摘要
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { bossApi } from '../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pctNum(a: number, b: number): number {
  if (b === 0) return 0;
  return ((a - b) / b) * 100;
}
function agentStatusLabel(s: string): string {
  const map: Record<string, string> = {
    online: '执行中', working: '执行中', active: '执行中',
    sleeping: '休眠中', paused: '已暂停',
    offline: '离线', error: '异常',
  };
  return map[s] || s;
}
function agentStatusBadgeClass(s: string): string {
  if (['online', 'working', 'active'].includes(s)) return 'badge-working';
  if (s === 'sleeping') return 'badge-sleeping';
  return 'badge-offline';
}
function agentStatusColor(s: string): string {
  if (['online', 'working', 'active'].includes(s)) return '#3B82F6';
  if (s === 'sleeping') return '#F5D07A';
  return '#EF4444';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Skeleton({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`shimmer rounded-lg ${w} ${h}`} />;
}

function Trend({ current, previous }: { current: number; previous: number }) {
  const diff = pctNum(current, previous);
  if (previous === 0) return <span className="text-[#6B6B80] text-xs">—</span>;
  const up = diff >= 0;
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${up ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
      <span>{up ? '▲' : '▼'}</span>
      <span>{Math.abs(diff).toFixed(1)}%</span>
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = agentStatusColor(status);
  return (
    <span
      className="pulse-dot inline-block rounded-full flex-shrink-0"
      style={{ width: 8, height: 8, background: color }}
    />
  );
}

/** 环形进度条 */
function RingProgress({
  value, max, size = 120, strokeWidth = 8, color = '#C9A84C', label, sublabel,
}: {
  value: number; max: number; size?: number; strokeWidth?: number;
  color?: string; label: string; sublabel?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circ * (1 - pct);
  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
          {sublabel && <span className="text-[#6B6B80] text-xs mt-0.5">{sublabel}</span>}
        </div>
      </div>
      <span className="text-[#A0A0B0] text-xs font-medium">{label}</span>
    </div>
  );
}

/** 横向对比条 */
function CompareBar({
  label, thisWeek, lastWeek, color = '#C9A84C',
}: {
  label: string; thisWeek: number; lastWeek: number; color?: string;
}) {
  const maxVal = Math.max(thisWeek, lastWeek, 1);
  const thisPct = (thisWeek / maxVal) * 100;
  const lastPct = (lastWeek / maxVal) * 100;
  const up = thisWeek >= lastWeek;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[#A0A0B0] text-xs font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[#6B6B80] text-xs">{lastWeek}</span>
          <span className={`text-xs font-bold ${up ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
            {up ? '▲' : '▼'} {thisWeek}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[#6B6B80] text-xs w-8 text-right">本周</span>
          <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-2 rounded-full"
              style={{
                width: `${thisPct}%`,
                background: color,
                transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: `0 0 8px ${color}60`,
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#6B6B80] text-xs w-8 text-right">上周</span>
          <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-2 rounded-full"
              style={{
                width: `${lastPct}%`,
                background: 'rgba(255,255,255,0.20)',
                transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 0: Hero War Report ────────────────────────────────────────────────
function HeroScreen({
  data, approvals, onApprove, onReject, onSwipe,
}: {
  data: any; approvals: any[]; onApprove: (id: string) => void;
  onReject: (id: string) => void; onSwipe: () => void;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? '凌晨好' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
  const signals = data?.signals ?? null;
  const agent = data?.agent ?? null;
  const agentStatus = agent?.instance?.status ?? 'offline';
  const weekReport = data?.weekReport ?? null;

  const todayInq = signals?.newInquiries ?? 0;
  const lastWeekInq = weekReport?.lastWeek?.inquiries ?? 0;
  const dailyTarget = lastWeekInq > 0 ? Math.ceil(lastWeekInq / 7) : 5;

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{
      background: 'linear-gradient(180deg, #0A0A0F 0%, #0D0D18 40%, #0A0A12 100%)',
    }}>
      {/* Background glow orbs */}
      <div className="absolute pointer-events-none" style={{
        top: -100, left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 65%)',
        filter: 'blur(60px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: 120, right: -80,
        width: 280, height: 280,
        background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 65%)',
        filter: 'blur(50px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        top: '40%', left: -60,
        width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 65%)',
        filter: 'blur(40px)',
      }} />

      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 relative z-10">
        <div>
          <p className="text-[#6B6B80] text-xs font-medium tracking-wide">{dateStr}</p>
          <p className="text-[#F1F1F5] text-lg font-bold mt-0.5">{greeting}，老板</p>
        </div>
        <div className="flex items-center gap-2 glass-card px-3 py-2 glow-pulse">
          <StatusDot status={agentStatus} />
          <div className="flex flex-col items-end">
            <span className="text-[#A0A0B0] text-xs leading-none">数字员工</span>
            <span className="text-[#F1F1F5] text-xs font-semibold mt-0.5">{agentStatusLabel(agentStatus)}</span>
          </div>
        </div>
      </div>

      {/* Hero section: Ring progress + key numbers */}
      <div className="flex items-center justify-around px-6 py-4 relative z-10">
        <RingProgress
          value={todayInq}
          max={Math.max(dailyTarget, todayInq)}
          size={110}
          strokeWidth={7}
          color="#C9A84C"
          label="今日询盘"
          sublabel="条"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-[#6B6B80] text-xs mb-0.5">未回复</span>
            <span className="text-3xl font-black tabular-nums" style={{
              color: (signals?.unread ?? 0) > 0 ? '#F87171' : '#6B6B80',
            }}>
              {signals ? signals.unread ?? 0 : '—'}
            </span>
            {(signals?.unread ?? 0) > 0 && (
              <span className="text-[#F87171] text-xs font-semibold">需处理</span>
            )}
          </div>
          <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="flex flex-col items-center">
            <span className="text-[#6B6B80] text-xs mb-0.5">待审批</span>
            <span className="text-3xl font-black tabular-nums" style={{
              color: approvals.length > 0 ? '#F5D07A' : '#6B6B80',
            }}>
              {approvals.length}
            </span>
            {approvals.length > 0 && (
              <span className="text-[#F5D07A] text-xs font-semibold">待操作</span>
            )}
          </div>
        </div>
        <RingProgress
          value={agent?.completedTasks ?? 0}
          max={Math.max(agent?.completedTasks ?? 0, 10)}
          size={110}
          strokeWidth={7}
          color="#3B82F6"
          label="今日任务"
          sublabel="完成"
        />
      </div>

      {/* Divider */}
      <div className="mx-5 relative z-10" style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
      }} />

      {/* Signal summary row */}
      <div className="px-4 py-3 relative z-10">
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: '新报价', value: signals?.newQuotations ?? 0,
              color: '#60A5FA', icon: '📋',
            },
            {
              label: 'AI 操作', value: agent?.completedTasks ?? 0,
              color: '#A78BFA', icon: '🤖',
            },
            {
              label: '本周询盘', value: weekReport?.thisWeek?.inquiries ?? 0,
              color: '#34D399', icon: '📈',
            },
          ].map((item, i) => (
            <div
              key={item.label}
              className="metric-card flex flex-col items-center gap-1 slide-up"
              style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-xl font-bold tabular-nums" style={{ color: item.color }}>
                {signals ? item.value : '—'}
              </span>
              <span className="text-[#6B6B80] text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Approval cards */}
      {approvals.length > 0 && (
        <div className="px-4 relative z-10 flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0B0] text-sm font-semibold">待审批回复</span>
            <span className="badge-sleeping">{approvals.length} 条</span>
          </div>
          <div className="scroll-area" style={{ maxHeight: 200 }}>
            <div className="flex flex-col gap-2.5">
              {approvals.map((a: any, i: number) => (
                <div
                  key={a.id}
                  className="glass-card-elevated p-3.5 slide-up"
                  style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[#F1F1F5] text-sm font-semibold">{a.buyerName || a.customerName || '客户'}</p>
                      <p className="text-[#6B6B80] text-xs mt-0.5">询盘 #{String(a.inquiryId || a.id).slice(-6)}</p>
                    </div>
                    <span className="text-[#6B6B80] text-xs">
                      {new Date(a.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[#A0A0B0] text-xs leading-relaxed line-clamp-2 mb-3">
                    {a.draftContent || a.draft || '（草稿内容）'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => onApprove(a.id)} className="btn-gold flex-1 py-2 text-xs font-bold">
                      ✓ 批准发送
                    </button>
                    <button onClick={() => onReject(a.id)} className="btn-danger flex-1 py-2 text-xs font-semibold">
                      ✗ 拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state when no approvals */}
      {approvals.length === 0 && signals && (
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
          <div className="glass-card p-5 text-center w-full" style={{
            background: 'rgba(52, 211, 153, 0.05)',
            border: '1px solid rgba(52, 211, 153, 0.15)',
          }}>
            <div className="text-3xl mb-2">✅</div>
            <p className="text-[#34D399] text-sm font-semibold">一切正常</p>
            <p className="text-[#6B6B80] text-xs mt-1">暂无待审批的回复草稿</p>
          </div>
        </div>
      )}

      {/* Swipe hint */}
      <div
        className="flex flex-col items-center pb-24 pt-3 mt-auto relative z-10 cursor-pointer"
        onClick={onSwipe}
      >
        <span className="text-[#6B6B80] text-xs mb-1 tracking-wider">滑动查看指挥台</span>
        <span className="text-[#C9A84C] text-lg float">→</span>
      </div>
    </div>
  );
}

// ─── Screen 1: Command Center ─────────────────────────────────────────────────
// 指令实验室阶段颜色
const PHASE_COLORS: Record<string, string> = {
  analyze:  '#60A5FA',
  filter:   '#A78BFA',
  execute:  '#34D399',
  report:   '#F59E0B',
};
const PHASE_ICONS: Record<string, string> = {
  analyze:  '🔍',
  filter:   '🎯',
  execute:  '⚡',
  report:   '📊',
};

function CommandScreen({ data, onBack, onNext }: { data: any; onBack: () => void; onNext: () => void }) {
  const [command, setCommand] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Command Lab 2.0 state
  const [labMode, setLabMode] = useState(false);
  const [labLoading, setLabLoading] = useState(false);
  const [labResult, setLabResult] = useState<null | {
    title: string;
    steps: Array<{ id: number; phase: string; label: string; detail: string; estimatedTime: string; platform?: string; creditCost: number }>;
    totalCredits: number;
    totalTime: string;
    riskLevel: 'low' | 'medium' | 'high';
    riskNote: string;
    subTasks: string[];
  }>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const quickCommands = [
    { icon: '🌍', text: '今天重点开发欧洲市场' },
    { icon: '⭐', text: '优先回复高价値询盘' },
    { icon: '🇺🇸', text: '加大对美国客户的触达频率' },
    { icon: '🔄', text: '暂停推广，专注跟进老客户' },
  ];

  const handleSend = async () => {
    if (!command.trim()) return;
    setSending(true);
    try {
      await bossApi.sendCommand(command.trim());
      setRecent(prev => [command.trim(), ...prev.slice(0, 2)]);
      setCommand('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const handleLabAnalyze = async () => {
    if (!command.trim()) return;
    setLabLoading(true);
    try {
      const res = await bossApi.commandLab(command.trim());
      setLabResult(res.lab);
      setActiveStep(null);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLabLoading(false);
    }
  };

  const agent = data?.agent ?? null;
  const agentStatus = agent?.instance?.status ?? 'offline';
  const statusColor = agentStatusColor(agentStatus);

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{
      background: 'linear-gradient(180deg, #080812 0%, #0A0A18 40%, #080810 100%)',
    }}>
      {/* Background glow */}
      <div className="absolute pointer-events-none" style={{
        top: -80, right: -60, width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)',
        filter: 'blur(60px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: 100, left: -40, width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 65%)',
        filter: 'blur(40px)',
      }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 relative z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-[#6B6B80] text-sm active:opacity-60 transition-opacity">
          <span>←</span>
          <span>战报</span>
        </button>
        <h1 className="text-[#F1F1F5] text-base font-bold">数字员工指挥台</h1>
        <button onClick={onNext} className="flex items-center gap-1 text-[#6B6B80] text-sm active:opacity-60 transition-opacity">
          <span>周报</span>
          <span>→</span>
        </button>
      </div>

      <div className="flex-1 scroll-area px-4 pb-28 relative z-10">
        {/* Agent status card */}
        <div className="glass-card-elevated p-4 mb-4 slide-up" style={{
          border: `1px solid ${statusColor}30`,
          boxShadow: `0 0 20px ${statusColor}15`,
        }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <StatusDot status={agentStatus} />
              <span className="text-[#F1F1F5] text-sm font-bold">
                {agent?.instance?.name || '数字员工'}
              </span>
            </div>
            <span className={agentStatusBadgeClass(agentStatus)}>{agentStatusLabel(agentStatus)}</span>
          </div>

          {agent?.instance ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="metric-card">
                  <p className="text-[#6B6B80] text-xs mb-1">今日完成任务</p>
                  <p className="text-3xl font-black tabular-nums" style={{ color: '#60A5FA' }}>
                    {agent.completedTasks ?? 0}
                  </p>
                </div>
                <div className="metric-card">
                  <p className="text-[#6B6B80] text-xs mb-1">待执行指令</p>
                  <p className="text-3xl font-black tabular-nums text-[#F1F1F5]">
                    {agent.pendingCommands ?? 0}
                  </p>
                </div>
              </div>
              {agent.instance.current_task && (
                <div className="flex items-start gap-2 p-3 rounded-xl" style={{
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.15)',
                }}>
                  <span className="text-[#60A5FA] text-xs mt-0.5">▶</span>
                  <div>
                    <p className="text-[#6B6B80] text-xs mb-0.5">当前执行</p>
                    <p className="text-[#60A5FA] text-sm font-medium">{agent.instance.current_task}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Skeleton h="h-16" />
              <Skeleton h="h-16" />
            </div>
          )}
        </div>

        {/* Command input + Lab Mode */}
        <div className="glass-card-elevated p-4 mb-4 slide-up delay-100">
          {/* 标题行 */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#A0A0B0] text-sm font-semibold">下达指令</p>
            <button
              onClick={() => { setLabMode(v => !v); setLabResult(null); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: labMode ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${labMode ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: labMode ? '#A78BFA' : '#6B6B80',
              }}
            >
              <span>🧪</span>
              <span>指令实验室</span>
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder={labMode ? '输入复合指令，AI 将拆解为可视化执行流程…' : '用自然语言告诉数字员工今天的重点…'}
            className="input-dark w-full resize-none text-sm leading-relaxed"
            rows={3}
          />

          {labMode ? (
            <button
              onClick={handleLabAnalyze}
              disabled={!command.trim() || labLoading}
              className="w-full py-3.5 text-sm mt-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              style={{
                background: (!command.trim() || labLoading) ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                opacity: (!command.trim() || labLoading) ? 0.6 : 1,
                color: '#fff',
              }}
            >
              {labLoading ? (
                <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI 拆解中…</>
              ) : (
                <><span>🧪</span>分析指令流程</>
              )}
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!command.trim() || sending}
              className={`btn-gold w-full py-3.5 text-sm mt-3 font-bold ${(!command.trim() || sending) ? 'opacity-50' : 'glow-pulse'}`}
              style={{ fontSize: '0.9375rem', letterSpacing: '0.02em' }}
            >
              {sending ? '发送中…' : sent ? '✓ 指令已发送' : '⚡ 发送指令'}
            </button>
          )}

          {sent && !labMode && (
            <p className="text-[#34D399] text-xs text-center mt-2 fade-in">
              数字员工已收到指令，正在解析执行
            </p>
          )}
        </div>

        {/* Command Lab 结果卡片 */}
        {labMode && labResult && (
          <div className="glass-card-elevated p-4 mb-4 slide-up" style={{ border: '1px solid rgba(124,58,237,0.3)' }}>
            {/* 标题 */}
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <p className="text-[#A78BFA] text-xs font-semibold mb-0.5">指令实验室 · 执行路径</p>
                <p className="text-[#F1F1F5] text-sm font-bold">{labResult.title}</p>
              </div>
              <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                background: labResult.riskLevel === 'high' ? 'rgba(239,68,68,0.2)' : labResult.riskLevel === 'medium' ? 'rgba(245,158,11,0.2)' : 'rgba(52,211,153,0.2)',
                color: labResult.riskLevel === 'high' ? '#F87171' : labResult.riskLevel === 'medium' ? '#FCD34D' : '#34D399',
              }}>
                {labResult.riskLevel === 'high' ? '高风险' : labResult.riskLevel === 'medium' ? '中风险' : '低风险'}
              </span>
            </div>

            {/* 执行流程步骤 */}
            <div className="space-y-2 mb-4">
              {labResult.steps.map((step, idx) => {
                const color = PHASE_COLORS[step.phase] ?? '#A0A0B0';
                const icon = PHASE_ICONS[step.phase] ?? '▶';
                const isActive = activeStep === step.id;
                return (
                  <div key={step.id}>
                    <button
                      onClick={() => setActiveStep(isActive ? null : step.id)}
                      className="w-full text-left rounded-xl p-3 transition-all"
                      style={{
                        background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? color + '40' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {/* 连接线 */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: `${color}25` }}>
                            {icon}
                          </div>
                          {idx < labResult.steps.length - 1 && (
                            <div className="w-px h-2 mt-1" style={{ background: `${color}30` }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color }}>{step.label}</span>
                            {step.platform && <span className="text-xs text-[#6B6B80]">{step.platform}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-[#6B6B80]">≈{step.estimatedTime}</span>
                            <span className="text-xs text-[#6B6B80]">{step.creditCost} 积分</span>
                          </div>
                        </div>
                        <span className="text-[#6B6B80] text-xs">{isActive ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    {isActive && (
                      <div className="mt-1 px-3 py-2 rounded-xl text-xs text-[#A0A0B0] leading-relaxed"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {step.detail}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 汇总行 */}
            <div className="flex items-center justify-between py-3 px-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-4">
                <span className="text-xs text-[#6B6B80]">总耗时 <span className="text-[#F1F1F5] font-semibold">{labResult.totalTime}</span></span>
                <span className="text-xs text-[#6B6B80]">总积分 <span className="text-[#C9A84C] font-semibold">{labResult.totalCredits}</span></span>
              </div>
              <button
                onClick={async () => {
                  setSending(true);
                  try {
                    await bossApi.sendCommand(command.trim());
                    setSent(true);
                    setTimeout(() => setSent(false), 3000);
                  } catch {}
                  finally { setSending(false); }
                }}
                disabled={sending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                {sending ? '执行中…' : '确认执行'}
              </button>
            </div>

            {/* 风险提示 */}
            <p className="text-xs text-[#6B6B80] mt-2 leading-relaxed">
              ⚠️ {labResult.riskNote}
            </p>
          </div>
        )}

        {/* Recent commands */}
        {recent.length > 0 && (
          <div className="mb-4 slide-up delay-150">
            <p className="text-[#6B6B80] text-xs font-medium mb-2 px-1">最近指令</p>
            <div className="flex flex-col gap-1.5">
              {recent.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setCommand(r)}
                  className="btn-ghost text-left px-3 py-2 text-xs text-[#A0A0B0] flex items-center gap-2"
                >
                  <span className="text-[#C9A84C] text-xs">↩</span>
                  <span className="line-clamp-1">{r}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick commands */}
        <div className="mb-4 slide-up delay-200">
          <p className="text-[#6B6B80] text-xs font-medium mb-2 px-1">快捷指令</p>
          <div className="grid grid-cols-1 gap-2">
            {quickCommands.map((q, i) => (
              <button
                key={i}
                onClick={() => setCommand(q.text)}
                className="btn-ghost text-left px-4 py-3 text-sm text-[#A0A0B0] flex items-center gap-3"
              >
                <span className="text-base flex-shrink-0">{q.icon}</span>
                <span>{q.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: Weekly Report ──────────────────────────────────────────────────
function ReportScreen({ data, onBack }: { data: any; onBack: () => void }) {
  const weekReport = data?.weekReport ?? null;
  const roi = data?.roi ?? null;
  const thisWeek = weekReport?.thisWeek ?? {};
  const lastWeek = weekReport?.lastWeek ?? {};

  const compareItems = [
    { label: '询盘数', thisWeek: thisWeek.inquiries ?? 0, lastWeek: lastWeek.inquiries ?? 0, color: '#C9A84C' },
    { label: '回复数', thisWeek: thisWeek.replies ?? 0, lastWeek: lastWeek.replies ?? 0, color: '#60A5FA' },
    { label: '新客户', thisWeek: thisWeek.newCustomers ?? 0, lastWeek: lastWeek.newCustomers ?? 0, color: '#34D399' },
    { label: '报价单', thisWeek: thisWeek.quotations ?? 0, lastWeek: lastWeek.quotations ?? 0, color: '#A78BFA' },
  ];

  const totalThis = (thisWeek.inquiries ?? 0) + (thisWeek.replies ?? 0);
  const totalLast = (lastWeek.inquiries ?? 0) + (lastWeek.replies ?? 0);
  const overallTrend = pctNum(totalThis, totalLast);

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{
      background: 'linear-gradient(180deg, #080A0F 0%, #0A0D16 40%, #080A10 100%)',
    }}>
      {/* Background glow */}
      <div className="absolute pointer-events-none" style={{
        top: -60, left: '30%',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 65%)',
        filter: 'blur(60px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: 80, right: -40,
        width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 65%)',
        filter: 'blur(40px)',
      }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 relative z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-[#6B6B80] text-sm active:opacity-60 transition-opacity">
          <span>←</span>
          <span>指挥台</span>
        </button>
        <h1 className="text-[#F1F1F5] text-base font-bold">经营周报</h1>
        <div style={{ width: 60 }} />
      </div>

      <div className="flex-1 scroll-area px-4 pb-28 relative z-10">
        {/* Overall trend card */}
        <div className="glass-card-elevated p-4 mb-4 slide-up" style={{
          background: overallTrend >= 0
            ? 'linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(16,185,129,0.04) 100%)'
            : 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.04) 100%)',
          border: `1px solid ${overallTrend >= 0 ? 'rgba(52,211,153,0.20)' : 'rgba(239,68,68,0.20)'}`,
        }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#6B6B80] text-xs mb-1">本周整体趋势</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black" style={{
                  color: overallTrend >= 0 ? '#34D399' : '#F87171',
                }}>
                  {overallTrend >= 0 ? '▲' : '▼'} {Math.abs(overallTrend).toFixed(1)}%
                </span>
              </div>
              <p className="text-[#6B6B80] text-xs mt-1">较上周同期</p>
            </div>
            <div className="text-5xl">{overallTrend >= 0 ? '📈' : '📉'}</div>
          </div>
        </div>

        {/* Legend */}
        {weekReport && (
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#C9A84C' }} />
              <span className="text-[#6B6B80] text-xs">本周（彩色）</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[#6B6B80] text-xs">上周（灰色）</span>
            </div>
          </div>
        )}

        {/* Compare bars */}
        <div className="glass-card-elevated p-4 mb-4 slide-up delay-100">
          <p className="text-[#A0A0B0] text-sm font-semibold mb-4">数据对比</p>
          {weekReport ? (
            compareItems.map((item) => (
              <CompareBar
                key={item.label}
                label={item.label}
                thisWeek={item.thisWeek}
                lastWeek={item.lastWeek}
                color={item.color}
              />
            ))
          ) : (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} h="h-10" />)}
            </div>
          )}
        </div>

        {/* ROI summary */}
        {roi && (
          <div className="glass-card-elevated p-4 slide-up delay-200">
            <p className="text-[#A0A0B0] text-sm font-semibold mb-3">AI 效率收益</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '节省工时', value: `${roi.hoursSaved}h`, cls: 'text-gold-gradient', icon: '⏱' },
                { label: '节省成本', value: `¥${roi.costSaved}`, cls: 'text-green-gradient', icon: '💰' },
                { label: '转化率', value: `${roi.conversionRate}%`, cls: 'text-blue-gradient', icon: '🎯' },
              ].map(r => (
                <div key={r.label} className="metric-card text-center">
                  <span className="text-lg mb-1 block">{r.icon}</span>
                  <p className={`text-lg font-bold tabular-nums ${r.cls}`}>{r.value}</p>
                  <p className="text-[#6B6B80] text-xs mt-1">{r.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No data state */}
        {!weekReport && !roi && (
          <div className="glass-card p-6 text-center slide-up delay-200">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-[#A0A0B0] text-sm font-semibold">周报生成中</p>
            <p className="text-[#6B6B80] text-xs mt-1">数据正在汇总，稍后刷新查看</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────
function BottomNav({ screen, onSelect }: { screen: number; onSelect: (i: number) => void }) {
  const tabs = [
    { icon: '⚡', label: '战报', color: '#C9A84C' },
    { icon: '🤖', label: '指挥', color: '#60A5FA' },
    { icon: '📊', label: '周报', color: '#34D399' },
  ];
  return (
    <div className="bottom-nav">
      <div className="flex items-center justify-around py-3 px-4">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className="flex flex-col items-center gap-1 min-w-[60px] transition-all duration-300"
            style={{
              opacity: screen === i ? 1 : 0.4,
              transform: screen === i ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <span className="text-xl">{t.icon}</span>
            <span
              className="text-xs font-semibold"
              style={{ color: screen === i ? t.color : '#6B6B80' }}
            >
              {t.label}
            </span>
            {screen === i && (
              <div
                className="rounded-full"
                style={{ width: 4, height: 4, background: t.color, marginTop: -2 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page Indicator ───────────────────────────────────────────────────────────
function PageIndicator({ screen, total }: { screen: number; total: number }) {
  return (
    <div
      className="absolute flex items-center gap-1.5 z-20"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: screen === i ? 16 : 4,
            height: 4,
            background: screen === i ? '#C9A84C' : 'rgba(255,255,255,0.20)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BossWarroom() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState(0);
  const [data, setData] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [warroomRes, approvalsRes] = await Promise.all([
        bossApi.getWarroom(),
        bossApi.getPendingApprovals('pending'),
      ]);
      setData(warroomRes);
      setApprovals(approvalsRes?.approvals ?? []);
    } catch (e) {
      console.error('Warroom fetch error', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    try {
      await bossApi.approve(id);
      setApprovals(prev => prev.filter((a: any) => a.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleReject = async (id: string) => {
    try {
      await bossApi.reject(id, '老板拒绝');
      setApprovals(prev => prev.filter((a: any) => a.id !== id));
    } catch (e) { console.error(e); }
  };

  const goToScreen = (s: number) => {
    if (transitioning || s === screen) return;
    setTransitioning(true);
    setScreen(s);
    setTimeout(() => setTransitioning(false), 500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0 && screen < 2) goToScreen(screen + 1);
      if (dx < 0 && screen > 0) goToScreen(screen - 1);
    }
  };

  // Unused navigate reference kept for future back button
  void navigate;

  return (
    <div
      ref={containerRef}
      className="phone-frame relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Page indicator dots */}
      <PageIndicator screen={screen} total={3} />

      {/* Sliding screen container */}
      <div
        className="flex h-full"
        style={{
          width: '300%',
          transform: `translateX(-${screen * (100 / 3)}%)`,
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform',
        }}
      >
        <div style={{ width: '33.333%', height: '100dvh', flexShrink: 0 }}>
          <HeroScreen
            data={data}
            approvals={approvals}
            onApprove={handleApprove}
            onReject={handleReject}
            onSwipe={() => goToScreen(1)}
          />
        </div>
        <div style={{ width: '33.333%', height: '100dvh', flexShrink: 0 }}>
          <CommandScreen
            data={data}
            onBack={() => goToScreen(0)}
            onNext={() => goToScreen(2)}
          />
        </div>
        <div style={{ width: '33.333%', height: '100dvh', flexShrink: 0 }}>
          <ReportScreen data={data} onBack={() => goToScreen(1)} />
        </div>
      </div>

      {/* Bottom navigation */}
      <BottomNav screen={screen} onSelect={goToScreen} />
    </div>
  );
}
