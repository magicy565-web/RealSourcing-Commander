/**
 * BossWarroom — APEX COMMANDER v4
 * 超级炫酷沉浸式战报首页
 *
 * 四大核心模块（全屏卡片式滚动）：
 *   ① 今日询盘战报 — 大数字 + 发光 + 动态计数
 *   ② OpenClaw AI 实时任务 — 真实品牌 + 任务流 + 成果
 *   ③ 今日 vs 昨日对比 — 动态进度条 + 趋势箭头
 *   ④ AI 今日建议 — 智能推荐卡片
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { bossApi, multiAccountApi, openclawApi } from '../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function agentStatusColor(s: string): string {
  if (['online', 'working', 'active'].includes(s)) return '#00F5A0';
  if (s === 'sleeping') return '#F5D07A';
  return '#EF4444';
}
function agentStatusLabel(s: string): string {
  const m: Record<string, string> = {
    online: '执行中', working: '执行中', active: '执行中',
    sleeping: '休眠中', paused: '已暂停', offline: '离线', error: '异常',
  };
  return m[s] || s;
}
function agentStatusBadgeClass(s: string): string {
  if (['online', 'working', 'active'].includes(s)) return 'badge-working';
  if (s === 'sleeping') return 'badge-sleeping';
  return 'badge-offline';
}

// ─── 状态栏 ───────────────────────────────────────────────────────────────────
function StatusBar({ transparent = false }: { transparent?: boolean }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const upd = () => {
      const n = new Date();
      setTime(n.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    upd();
    const iv = setInterval(upd, 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="flex items-center justify-between px-5 relative z-50" style={{ height: 44 }}>
      <span className="text-white text-[15px] font-semibold tabular-nums tracking-tight">{time}</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <rect x="0" y="8" width="3" height="4" rx="0.5" fill="white" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="white" />
          <rect x="9" y="2.5" width="3" height="9.5" rx="0.5" fill="white" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="white" opacity="0.35" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <circle cx="8" cy="11" r="1.5" fill="white" />
          <path d="M4.5 7.5C5.5 6.3 6.7 5.5 8 5.5s2.5.8 3.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M1.5 4.5C3.2 2.5 5.5 1.2 8 1.2s4.8 1.3 6.5 3.3" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
        </svg>
        <div style={{ width: 25, height: 12, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 3, border: '1.5px solid rgba(255,255,255,0.6)' }} />
          <div style={{ position: 'absolute', left: 2, top: 2, bottom: 2, width: '75%', background: 'white', borderRadius: 1.5 }} />
          <div style={{ position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)', width: 2, height: 5, background: 'rgba(255,255,255,0.4)', borderRadius: '0 1px 1px 0' }} />
        </div>
      </div>
    </div>
  );
}

// ─── 动态计数器 ───────────────────────────────────────────────────────────────
function CountUp({ target, duration = 1200, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return <>{val}{suffix}</>;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color, h = 36, w = 80 }: { data: number[]; color: string; h?: number; w?: number }) {
  if (!data || data.length < 2) return <div style={{ width: w, height: h }} />;
  const max = Math.max(...data, 1), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - 6) - 3,
  ]);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${d} L${w},${h} L0,${h} Z`;
  const id = `sp${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

// ─── 扫描线动画 ───────────────────────────────────────────────────────────────
function ScanLine() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]" style={{ zIndex: 1 }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,245,160,0.4) 50%, transparent 100%)',
        animation: 'scanline 3s linear infinite',
      }} />
    </div>
  );
}

// ─── 粒子背景 ─────────────────────────────────────────────────────────────────
function ParticleBg({ color = '#C9A84C' }: { color?: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: Math.random() * 3 + 1,
          height: Math.random() * 3 + 1,
          borderRadius: '50%',
          background: color,
          opacity: 0.3 + Math.random() * 0.4,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }} />
      ))}
    </div>
  );
}

// ─── 模块一：今日询盘战报 ─────────────────────────────────────────────────────
function WarReportCard({ data }: { data: any }) {
  const signals = data?.signals ?? null;
  const todayInq = signals?.newInquiries ?? 0;
  const unread = signals?.unread ?? 0;
  const replied = todayInq - unread;
  const replyRate = todayInq > 0 ? Math.round((replied / todayInq) * 100) : 0;

  // mock 渠道数据
  const channels = [
    { name: 'Alibaba', count: Math.max(Math.round(todayInq * 0.4), 2), color: '#F59E0B' },
    { name: 'LinkedIn', count: Math.max(Math.round(todayInq * 0.25), 1), color: '#60A5FA' },
    { name: 'WhatsApp', count: Math.max(Math.round(todayInq * 0.2), 1), color: '#34D399' },
    { name: 'TikTok', count: Math.max(Math.round(todayInq * 0.15), 1), color: '#F472B6' },
  ];

  return (
    <div className="relative overflow-hidden rounded-[28px] mx-4" style={{
      background: 'linear-gradient(145deg, #0D0D1A 0%, #111128 60%, #0A0A18 100%)',
      border: '1px solid rgba(201,168,76,0.2)',
      boxShadow: '0 0 60px rgba(201,168,76,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      <ParticleBg color="#C9A84C" />
      <ScanLine />

      {/* 顶部光晕 */}
      <div className="absolute pointer-events-none" style={{
        top: -80, left: '20%', width: 260, height: 260,
        background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 65%)',
        filter: 'blur(40px)',
      }} />

      <div className="relative z-10 p-6">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#C9A84C',
              boxShadow: '0 0 12px #C9A84C, 0 0 24px rgba(201,168,76,0.5)',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
            <span className="text-[#C9A84C] text-[11px] font-bold tracking-[0.2em] uppercase">今日战报</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{
            background: unread > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(0,245,160,0.12)',
            border: `1px solid ${unread > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(0,245,160,0.25)'}`,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: unread > 0 ? '#F87171' : '#00F5A0',
              boxShadow: `0 0 8px ${unread > 0 ? '#F87171' : '#00F5A0'}`,
            }} />
            <span className="text-[10px] font-bold" style={{ color: unread > 0 ? '#F87171' : '#00F5A0' }}>
              {unread > 0 ? `${unread} 待回复` : '全部已回'}
            </span>
          </div>
        </div>

        {/* 超大核心数字 */}
        <div className="mb-6">
          <div className="flex items-end gap-3 mb-1">
            <span className="font-black tabular-nums leading-none" style={{
              fontSize: 80,
              background: 'linear-gradient(135deg, #F5D07A 0%, #C9A84C 50%, #E8B84B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.4))',
              lineHeight: 1,
            }}>
              {data ? <CountUp target={todayInq} duration={1500} /> : '—'}
            </span>
            <div className="pb-3">
              <p className="text-[#8B8B9E] text-[13px] font-medium">条询盘</p>
              <p className="text-[#5A5A72] text-[11px]">今日收获</p>
            </div>
          </div>

          {/* 回复进度条 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[#6B6B80] text-[11px]">回复进度</span>
              <span className="text-[#C9A84C] text-[12px] font-bold">{replyRate}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div style={{
                height: '100%',
                width: `${replyRate}%`,
                background: 'linear-gradient(90deg, #C9A84C, #F5D07A)',
                borderRadius: 4,
                boxShadow: '0 0 12px rgba(201,168,76,0.6)',
                transition: 'width 1.5s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
          </div>
        </div>

        {/* 三个关键指标 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: '未回复', value: unread, color: unread > 0 ? '#F87171' : '#00F5A0', glow: unread > 0 ? '#F87171' : '#00F5A0' },
            { label: '已回复', value: replied, color: '#34D399', glow: '#34D399' },
            { label: '回复率', value: `${replyRate}%`, color: '#C9A84C', glow: '#C9A84C' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center py-3 rounded-2xl" style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${item.color}20`,
            }}>
              <span className="text-[22px] font-black tabular-nums" style={{
                color: item.color,
                textShadow: `0 0 20px ${item.glow}60`,
              }}>
                {data ? item.value : '—'}
              </span>
              <span className="text-[#5A5A72] text-[10px] mt-1 font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        {/* 渠道来源横条 */}
        <div>
          <p className="text-[#5A5A72] text-[10px] font-semibold tracking-wider uppercase mb-2.5">渠道分布</p>
          <div className="flex gap-1.5">
            {channels.map(ch => {
              const total = channels.reduce((s, c) => s + c.count, 0);
              const pct = total > 0 ? (ch.count / total) * 100 : 25;
              return (
                <div key={ch.name} className="flex flex-col gap-1" style={{ flex: `${pct} 0 0` }}>
                  <div className="h-1.5 rounded-full" style={{
                    background: ch.color,
                    boxShadow: `0 0 8px ${ch.color}60`,
                  }} />
                  <span className="text-[9px] font-bold" style={{ color: ch.color }}>{ch.count}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {channels.map(ch => (
              <div key={ch.name} className="flex items-center gap-1" style={{ flex: 1 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: ch.color, flexShrink: 0 }} />
                <span className="text-[9px] text-[#4A4A62] truncate">{ch.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 模块二：OpenClaw AI 实时状态 ─────────────────────────────────────────────
function OpenClawCard({ data, openclawData }: { data: any; openclawData: any }) {
  const agent = data?.agent ?? null;
  const ocStatus = openclawData?.status ?? 'offline';
  const isActive = ['online', 'working', 'active'].includes(ocStatus);
  const opsToday = openclawData?.opsToday ?? 0;
  const opsLimit = openclawData?.opsLimit ?? 200;
  const utilization = opsLimit > 0 ? Math.round((opsToday / opsLimit) * 100) : 0;
  const currentTask = agent?.instance?.current_task ?? null;
  const completedTasks = agent?.completedTasks ?? 0;

  // 模拟任务流（当没有真实数据时）
  const mockTasks = [
    { id: 1, text: '扫描 Alibaba 新询盘 × 12', status: 'done', time: '08:32', platform: 'Alibaba' },
    { id: 2, text: '分析买家意向，生成回复草稿', status: 'done', time: '09:15', platform: 'AI' },
    { id: 3, text: '发送 LinkedIn 开发信 × 8', status: 'done', time: '10:40', platform: 'LinkedIn' },
    { id: 4, text: '跟进 WhatsApp 未回复客户', status: 'running', time: '进行中', platform: 'WhatsApp' },
    { id: 5, text: '生成今日市场分析报告', status: 'pending', time: '待执行', platform: 'AI' },
  ];

  const platformColors: Record<string, string> = {
    'Alibaba': '#F59E0B',
    'LinkedIn': '#60A5FA',
    'WhatsApp': '#34D399',
    'TikTok': '#F472B6',
    'AI': '#A78BFA',
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] mx-4" style={{
      background: 'linear-gradient(145deg, #0D0A1A 0%, #130D28 60%, #0A0A18 100%)',
      border: '1px solid rgba(124,58,237,0.25)',
      boxShadow: '0 0 60px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      <ParticleBg color="#7C3AED" />

      {/* 背景光晕 */}
      <div className="absolute pointer-events-none" style={{
        top: -60, right: -40, width: 240, height: 240,
        background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 65%)',
        filter: 'blur(40px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: -40, left: -20, width: 180, height: 180,
        background: 'radial-gradient(circle, rgba(0,245,160,0.12) 0%, transparent 65%)',
        filter: 'blur(35px)',
      }} />

      <div className="relative z-10 p-6">
        {/* OpenClaw 品牌头部 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* 真实 OpenClaw 吉祥物 */}
            <div className="relative" style={{ width: 48, height: 48 }}>
              <div className="absolute inset-0 rounded-2xl" style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(0,245,160,0.15) 100%)',
                border: '1px solid rgba(124,58,237,0.4)',
              }} />
              <img
                src="/openclaw-mascot.png"
                alt="OpenClaw"
                className="absolute inset-0 w-full h-full object-contain p-1"
                style={{
                  filter: isActive ? 'drop-shadow(0 0 8px rgba(0,245,160,0.6))' : 'grayscale(0.5)',
                  animation: isActive ? 'float 3s ease-in-out infinite' : 'none',
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white text-[16px] font-black">Open</span>
                <span className="text-[16px] font-black" style={{
                  background: 'linear-gradient(135deg, #FF6B35, #F59E0B)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Claw</span>
              </div>
              <p className="text-[#6B6B80] text-[11px]">AI 自动化引擎</p>
            </div>
          </div>

          {/* 运行状态 */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{
              background: isActive ? 'rgba(0,245,160,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${isActive ? 'rgba(0,245,160,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isActive ? '#00F5A0' : '#F87171',
                boxShadow: `0 0 8px ${isActive ? '#00F5A0' : '#F87171'}`,
                animation: isActive ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
              }} />
              <span className="text-[11px] font-bold" style={{ color: isActive ? '#00F5A0' : '#F87171' }}>
                {isActive ? '运行中' : '离线'}
              </span>
            </div>
            {isActive && (
              <span className="text-[#5A5A72] text-[10px]">利用率 {utilization}%</span>
            )}
          </div>
        </div>

        {/* 今日成果 — 三个大数字 */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[
            { label: '完成任务', value: completedTasks || opsToday || 0, color: '#A78BFA', icon: '⚡' },
            { label: '处理询盘', value: data?.signals?.newInquiries ?? 0, color: '#00F5A0', icon: '📨' },
            { label: '发送消息', value: Math.round((completedTasks || opsToday || 0) * 2.3), color: '#60A5FA', icon: '💬' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center py-3.5 rounded-2xl" style={{
              background: `${item.color}0A`,
              border: `1px solid ${item.color}20`,
            }}>
              <span className="text-base mb-1">{item.icon}</span>
              <span className="text-[24px] font-black tabular-nums" style={{
                color: item.color,
                textShadow: `0 0 20px ${item.color}50`,
              }}>
                <CountUp target={item.value} duration={1200} />
              </span>
              <span className="text-[#5A5A72] text-[10px] mt-1">{item.label}</span>
            </div>
          ))}
        </div>

        {/* 实时任务流 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#8B8B9E] text-[11px] font-bold tracking-wider uppercase">任务流</p>
            <span className="text-[#5A5A72] text-[10px]">今日</span>
          </div>
          <div className="flex flex-col gap-2">
            {mockTasks.map((task, i) => {
              const isDone = task.status === 'done';
              const isRunning = task.status === 'running';
              const isPending = task.status === 'pending';
              const pColor = platformColors[task.platform] ?? '#8B8B9E';
              return (
                <div key={task.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl" style={{
                  background: isRunning
                    ? 'rgba(124,58,237,0.12)'
                    : isDone ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
                  border: isRunning ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.05)',
                }}>
                  {/* 状态图标 */}
                  <div style={{ width: 20, height: 20, flexShrink: 0 }}>
                    {isDone && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" fill="rgba(0,245,160,0.15)" stroke="#00F5A0" strokeWidth="1.5" />
                        <path d="M6 10l3 3 5-5" stroke="#00F5A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {isRunning && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.3)', borderTopColor: '#A78BFA', animation: 'spin 1s linear infinite' }} />
                    )}
                    {isPending && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                        <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.2)" />
                      </svg>
                    )}
                  </div>

                  {/* 任务文字 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{
                      color: isDone ? '#6B6B80' : isRunning ? '#E0D0FF' : '#4A4A62',
                    }}>
                      {task.text}
                    </p>
                  </div>

                  {/* 平台 + 时间 */}
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
                      background: `${pColor}15`,
                      color: pColor,
                    }}>{task.platform}</span>
                    <span className="text-[9px]" style={{ color: isRunning ? '#A78BFA' : '#3A3A52' }}>{task.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 利用率进度条 */}
        {isActive && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[#6B6B80] text-[11px]">操作配额 {opsToday} / {opsLimit}</span>
              <span className="text-[#A78BFA] text-[11px] font-bold">{utilization}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(utilization, 100)}%`,
                background: utilization > 80
                  ? 'linear-gradient(90deg, #F87171, #F59E0B)'
                  : 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                borderRadius: 4,
                boxShadow: `0 0 10px ${utilization > 80 ? 'rgba(248,113,113,0.5)' : 'rgba(167,139,250,0.5)'}`,
                transition: 'width 1.5s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 模块三：今日 vs 昨日对比 ─────────────────────────────────────────────────
function CompareCard({ data }: { data: any }) {
  const weekReport = data?.weekReport ?? null;
  const today = weekReport?.today ?? {};
  const yesterday = weekReport?.yesterday ?? {};

  // mock 数据
  const metrics = [
    {
      label: '询盘量',
      today: today.inquiries ?? (data?.signals?.newInquiries ?? 8),
      yesterday: yesterday.inquiries ?? 5,
      color: '#C9A84C',
      icon: '📨',
      trend: [3, 5, 4, 6, 5, 7, data?.signals?.newInquiries ?? 8],
    },
    {
      label: '回复率',
      today: today.replyRate ?? 78,
      yesterday: yesterday.replyRate ?? 65,
      color: '#60A5FA',
      icon: '⚡',
      suffix: '%',
      trend: [60, 65, 62, 70, 68, 72, 78],
    },
    {
      label: 'AI 操作',
      today: today.aiOps ?? (data?.agent?.completedTasks ?? 24),
      yesterday: yesterday.aiOps ?? 18,
      color: '#A78BFA',
      icon: '🤖',
      trend: [12, 15, 18, 16, 20, 18, 24],
    },
    {
      label: '新客户',
      today: today.newClients ?? 3,
      yesterday: yesterday.newClients ?? 2,
      color: '#34D399',
      icon: '🌍',
      trend: [1, 2, 1, 3, 2, 2, 3],
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-[28px] mx-4" style={{
      background: 'linear-gradient(145deg, #080D14 0%, #0C1220 60%, #080A18 100%)',
      border: '1px solid rgba(96,165,250,0.18)',
      boxShadow: '0 0 60px rgba(96,165,250,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <ParticleBg color="#60A5FA" />

      <div className="absolute pointer-events-none" style={{
        top: -60, left: '30%', width: 220, height: 220,
        background: 'radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 65%)',
        filter: 'blur(40px)',
      }} />

      <div className="relative z-10 p-6">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#60A5FA',
              boxShadow: '0 0 12px #60A5FA',
            }} />
            <span className="text-[#60A5FA] text-[11px] font-bold tracking-[0.2em] uppercase">数据对比</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#60A5FA' }} />
              <span className="text-[#6B6B80] text-[10px]">今日</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
              <span className="text-[#6B6B80] text-[10px]">昨日</span>
            </div>
          </div>
        </div>

        {/* 四个对比指标 */}
        <div className="flex flex-col gap-4">
          {metrics.map(m => {
            const diff = m.yesterday > 0 ? ((m.today - m.yesterday) / m.yesterday) * 100 : 0;
            const up = m.today >= m.yesterday;
            const maxVal = Math.max(m.today, m.yesterday, 1);
            const todayPct = (m.today / maxVal) * 100;
            const yestPct = (m.yesterday / maxVal) * 100;
            return (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{m.icon}</span>
                    <span className="text-[#A0A0B0] text-[12px] font-semibold">{m.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#5A5A72] text-[12px] tabular-nums">{m.yesterday}{m.suffix ?? ''}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[14px] font-black tabular-nums" style={{ color: m.color }}>
                        {m.today}{m.suffix ?? ''}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: up ? '#34D399' : '#F87171' }}>
                        {up ? '▲' : '▼'}{Math.abs(diff).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 双层进度条 */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{
                        height: '100%',
                        width: `${todayPct}%`,
                        background: `linear-gradient(90deg, ${m.color}80, ${m.color})`,
                        borderRadius: 4,
                        boxShadow: `0 0 8px ${m.color}50`,
                        transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
                      }} />
                    </div>
                    <Sparkline data={m.trend} color={m.color} h={24} w={52} />
                  </div>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{
                      height: '100%',
                      width: `${yestPct}%`,
                      background: 'rgba(255,255,255,0.18)',
                      borderRadius: 4,
                      transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 模块四：AI 今日建议 ──────────────────────────────────────────────────────
function AiAdviceCard({ data }: { data: any }) {
  const [expanded, setExpanded] = useState<number | null>(0);

  const signals = data?.signals ?? null;
  const unread = signals?.unread ?? 0;
  const todayInq = signals?.newInquiries ?? 0;

  // 动态生成建议（基于真实数据）
  const advices = [
    {
      priority: 'urgent',
      icon: '🔥',
      title: unread > 0 ? `立即回复 ${unread} 条未处理询盘` : '保持回复节奏，今日表现优秀',
      detail: unread > 0
        ? `检测到 ${unread} 条询盘超过 2 小时未回复，买家意向较高，建议优先处理越南和德国客户的询盘，回复率直接影响 Alibaba 排名。`
        : `今日所有询盘均已及时回复，回复率达到 ${todayInq > 0 ? Math.round(((todayInq - unread) / todayInq) * 100) : 100}%，继续保持这个节奏。`,
      color: unread > 0 ? '#F87171' : '#34D399',
      bg: unread > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(52,211,153,0.08)',
      border: unread > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.2)',
      action: unread > 0 ? '立即处理' : '查看详情',
    },
    {
      priority: 'high',
      icon: '🌍',
      title: '欧洲市场窗口期：德国、荷兰买家活跃',
      detail: '当前时间对应欧洲工作时间（下午 3-5 点），建议 OpenClaw 重点扫描欧洲区域询盘，并发送定制化开发信给上周浏览过产品页的潜在客户。',
      color: '#60A5FA',
      bg: 'rgba(96,165,250,0.08)',
      border: 'rgba(96,165,250,0.2)',
      action: '开启拓展',
    },
    {
      priority: 'medium',
      icon: '📊',
      title: '本周询盘量同比上升 23%，建议扩大 LinkedIn 投入',
      detail: 'LinkedIn 渠道本周 ROI 最高（每条询盘成本 ¥12），建议将 OpenClaw 的 LinkedIn 开发信配额从 10 条/天提升至 20 条/天，预计可增加 3-5 条高质量询盘。',
      color: '#A78BFA',
      bg: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.2)',
      action: '调整配置',
    },
    {
      priority: 'low',
      icon: '💡',
      title: '优化产品图片可提升 Alibaba 点击率 15%',
      detail: 'AI 分析发现你的主力产品「太阳能板」的主图点击率低于行业平均 12%，建议更换为白底高清图，并添加认证标志。预计 7 天内可见效果。',
      color: '#C9A84C',
      bg: 'rgba(201,168,76,0.08)',
      border: 'rgba(201,168,76,0.2)',
      action: '查看建议',
    },
  ];

  const priorityLabel: Record<string, string> = {
    urgent: '紧急', high: '重要', medium: '建议', low: '优化',
  };
  const priorityBg: Record<string, string> = {
    urgent: 'rgba(239,68,68,0.2)', high: 'rgba(96,165,250,0.15)',
    medium: 'rgba(167,139,250,0.15)', low: 'rgba(201,168,76,0.15)',
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] mx-4" style={{
      background: 'linear-gradient(145deg, #0A0D10 0%, #0E1218 60%, #080A14 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <ParticleBg color="#A78BFA" />

      <div className="absolute pointer-events-none" style={{
        bottom: -40, right: -20, width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 65%)',
        filter: 'blur(35px)',
      }} />

      <div className="relative z-10 p-6">
        {/* 标题 */}
        <div className="flex items-center gap-2 mb-5">
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#A78BFA',
            boxShadow: '0 0 12px #A78BFA',
          }} />
          <span className="text-[#A78BFA] text-[11px] font-bold tracking-[0.2em] uppercase">AI 今日建议</span>
          <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
            background: 'rgba(167,139,250,0.12)',
            border: '1px solid rgba(167,139,250,0.2)',
          }}>
            <span className="text-[#A78BFA] text-[10px] font-bold">{advices.length} 条</span>
          </div>
        </div>

        {/* 建议列表 */}
        <div className="flex flex-col gap-2.5">
          {advices.map((adv, i) => {
            const isOpen = expanded === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-2xl"
                style={{
                  background: isOpen ? adv.bg : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isOpen ? adv.border : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.3s ease',
                }}
              >
                {/* 折叠头部 */}
                <button
                  className="w-full flex items-center gap-3 p-3.5 text-left active:scale-[0.99] transition-transform"
                  onClick={() => setExpanded(isOpen ? null : i)}
                >
                  <span className="text-lg flex-shrink-0">{adv.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
                        background: priorityBg[adv.priority],
                        color: adv.color,
                      }}>
                        {priorityLabel[adv.priority]}
                      </span>
                    </div>
                    <p className="text-[12px] font-semibold leading-tight truncate" style={{
                      color: isOpen ? 'white' : '#A0A0B0',
                    }}>
                      {adv.title}
                    </p>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={adv.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* 展开内容 */}
                {isOpen && (
                  <div className="px-4 pb-4">
                    <p className="text-[#8B8B9E] text-[12px] leading-relaxed mb-3">{adv.detail}</p>
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold active:scale-95 transition-transform"
                      style={{
                        background: `${adv.color}20`,
                        color: adv.color,
                        border: `1px solid ${adv.color}30`,
                      }}
                    >
                      {adv.action}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 底部 Tab Bar ─────────────────────────────────────────────────────────────
function BottomTabBar({
  activeTab, onSelect, onNavigate, unreadCount,
}: {
  activeTab: number; onSelect: (i: number) => void;
  onNavigate?: (path: string) => void; unreadCount: number;
}) {
  const tabs = [
    {
      id: 0, label: '战报', color: '#C9A84C',
      icon: (a: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? 'none' : 'none'} stroke={a ? '#C9A84C' : '#4A4A62'} strokeWidth={a ? '2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill={a ? 'rgba(201,168,76,0.15)' : 'none'} />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 1, label: '指挥', color: '#60A5FA',
      icon: (a: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? '#60A5FA' : '#4A4A62'} strokeWidth={a ? '2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={a ? 'rgba(96,165,250,0.15)' : 'none'} />
        </svg>
      ),
    },
    {
      id: 'inquiry', label: '询盘', color: '#EF4444', isCenter: true,
      icon: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
    },
    {
      id: 2, label: '周报', color: '#34D399',
      icon: (a: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? '#34D399' : '#4A4A62'} strokeWidth={a ? '2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      id: 'profile', label: '我的', color: '#A78BFA',
      icon: (a: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? '#A78BFA' : '#4A4A62'} strokeWidth={a ? '2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50" style={{
      background: 'rgba(6,6,14,0.96)',
      backdropFilter: 'blur(30px) saturate(200%)',
      WebkitBackdropFilter: 'blur(30px) saturate(200%)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      paddingBottom: 'env(safe-area-inset-bottom, 8px)',
    }}>
      <div className="flex items-end justify-around px-2 pt-2 pb-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isCenter = (tab as any).isCenter;
          if (isCenter) {
            return (
              <button key={tab.id} onClick={() => onNavigate?.('/phone')} className="flex flex-col items-center" style={{ marginBottom: 4 }}>
                <div className="flex items-center justify-center rounded-full active:scale-90 transition-transform relative" style={{
                  width: 52, height: 52, marginTop: -18,
                  background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
                  boxShadow: '0 4px 24px rgba(239,68,68,0.5), 0 2px 8px rgba(0,0,0,0.4)',
                }}>
                  {tab.icon(false)}
                  {unreadCount > 0 && (
                    <div className="absolute flex items-center justify-center rounded-full" style={{
                      top: -2, right: -2, minWidth: 16, height: 16,
                      background: 'white', fontSize: 9, fontWeight: 700, color: '#EF4444',
                      paddingInline: 3, boxShadow: '0 0 0 2px rgba(6,6,14,0.96)',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-1" style={{ color: '#F87171' }}>{tab.label}</span>
              </button>
            );
          }
          return (
            <button
              key={tab.id}
              onClick={() => typeof tab.id === 'number' ? onSelect(tab.id) : undefined}
              className="flex flex-col items-center gap-1 min-w-[52px] py-1 active:scale-90 transition-transform"
            >
              {tab.icon(isActive)}
              <span className="text-[10px] font-semibold" style={{ color: isActive ? (tab as any).color : '#4A4A62' }}>
                {tab.label}
              </span>
              {isActive && (
                <div className="rounded-full" style={{
                  width: 4, height: 4, marginTop: -2,
                  background: (tab as any).color,
                  boxShadow: `0 0 8px ${(tab as any).color}`,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── 全屏轮播卡片 1：今日询盘 ────────────────────────────────────────────────
function SlideInquiries({ data }: { data: any }) {
  const signals = data?.signals ?? null;
  const todayInq = signals?.newInquiries ?? 0;
  const unread = signals?.unread ?? 0;
  const replied = todayInq - unread;
  const replyRate = todayInq > 0 ? Math.round((replied / todayInq) * 100) : 0;
  const channels = [
    { name: 'Alibaba', count: Math.max(Math.round(todayInq * 0.4), 2), color: '#F59E0B' },
    { name: 'LinkedIn', count: Math.max(Math.round(todayInq * 0.25), 1), color: '#60A5FA' },
    { name: 'WhatsApp', count: Math.max(Math.round(todayInq * 0.2), 1), color: '#34D399' },
    { name: 'TikTok', count: Math.max(Math.round(todayInq * 0.15), 1), color: '#F472B6' },
  ];
  const total = channels.reduce((s, c) => s + c.count, 0);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{
      background: 'linear-gradient(145deg, #0D0D1A 0%, #111128 60%, #0A0A18 100%)',
    }}>
      {/* 插画背景 — 半透明叠加 */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <img
          src="/card-inquiries.png"
          alt=""
          className="absolute right-0 top-0 h-full w-auto object-cover"
          style={{ opacity: 0.22, mixBlendMode: 'lighten', transform: 'scale(1.05)', transformOrigin: 'right center' }}
        />
        {/* 左侧渐变遮罩，确保文字可读 */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(90deg, rgba(13,13,26,0.98) 0%, rgba(13,13,26,0.85) 45%, rgba(13,13,26,0.3) 75%, rgba(13,13,26,0.1) 100%)',
        }} />
        {/* 底部渐变遮罩 */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, transparent 40%, rgba(13,13,26,0.95) 100%)',
        }} />
      </div>

      {/* 金色光晕 */}
      <div className="absolute pointer-events-none" style={{
        top: -80, left: '15%', width: 280, height: 280,
        background: 'radial-gradient(circle, rgba(201,168,76,0.2) 0%, transparent 65%)',
        filter: 'blur(50px)', zIndex: 1,
      }} />

      {/* 内容 */}
      <div className="relative z-10 flex flex-col justify-between h-full px-6 pt-6 pb-6">
        {/* 顶部标签 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#C9A84C',
              boxShadow: '0 0 12px #C9A84C, 0 0 24px rgba(201,168,76,0.5)',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
            <span className="text-[#C9A84C] text-[11px] font-bold tracking-[0.2em] uppercase">今日询盘</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{
            background: unread > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(0,245,160,0.12)',
            border: `1px solid ${unread > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(0,245,160,0.25)'}`,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: unread > 0 ? '#F87171' : '#00F5A0',
              boxShadow: `0 0 8px ${unread > 0 ? '#F87171' : '#00F5A0'}`,
            }} />
            <span className="text-[10px] font-bold" style={{ color: unread > 0 ? '#F87171' : '#00F5A0' }}>
              {unread > 0 ? `${unread} 待回复` : '全部已回'}
            </span>
          </div>
        </div>

        {/* 超大核心数字 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-end gap-3 mb-2">
            <span className="font-black tabular-nums leading-none" style={{
              fontSize: 96,
              background: 'linear-gradient(135deg, #F5D07A 0%, #C9A84C 50%, #E8B84B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 30px rgba(201,168,76,0.5))',
              lineHeight: 1,
            }}>
              {data ? <CountUp target={todayInq} duration={1500} /> : '—'}
            </span>
            <div className="pb-4">
              <p className="text-white text-[18px] font-bold">条询盘</p>
              <p className="text-[#5A5A72] text-[12px]">今日收获</p>
            </div>
          </div>

          {/* 回复进度条 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[#6B6B80] text-[11px]">回复进度</span>
              <span className="text-[#C9A84C] text-[13px] font-bold">{replyRate}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div style={{
                height: '100%',
                width: `${replyRate}%`,
                background: 'linear-gradient(90deg, #C9A84C, #F5D07A)',
                borderRadius: 4,
                boxShadow: '0 0 16px rgba(201,168,76,0.7)',
                transition: 'width 1.5s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
          </div>
        </div>

        {/* 底部：三指标 + 渠道 */}
        <div>
          {/* 三个关键指标 */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { label: '未回复', value: unread, color: unread > 0 ? '#F87171' : '#00F5A0' },
              { label: '已回复', value: replied, color: '#34D399' },
              { label: '回复率', value: `${replyRate}%`, color: '#C9A84C' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center py-3 rounded-2xl" style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${item.color}25`,
              }}>
                <span className="text-[24px] font-black tabular-nums" style={{
                  color: item.color,
                  textShadow: `0 0 20px ${item.color}60`,
                }}>
                  {data ? item.value : '—'}
                </span>
                <span className="text-[#5A5A72] text-[10px] mt-0.5 font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          {/* 渠道分布 */}
          <div>
            <p className="text-[#5A5A72] text-[10px] font-semibold tracking-wider uppercase mb-2">渠道分布</p>
            <div className="flex gap-1.5 mb-2">
              {channels.map(ch => (
                <div key={ch.name} style={{ flex: `${(ch.count / total) * 100} 0 0` }}>
                  <div style={{
                    height: 4, borderRadius: 2,
                    background: ch.color,
                    boxShadow: `0 0 8px ${ch.color}80`,
                  }} />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              {channels.map(ch => (
                <div key={ch.name} className="flex items-center gap-1">
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: ch.color }} />
                  <span className="text-[10px]" style={{ color: '#6B6B80' }}>{ch.name}</span>
                  <span className="text-[10px] font-bold" style={{ color: ch.color }}>{ch.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 全屏轮播卡片 2：待回复 ───────────────────────────────────────────────────
function SlidePending({ data }: { data: any }) {
  const unread = data?.signals?.unread ?? 0;
  const urgentItems = [
    { name: 'Hans Mueller', country: '🇩🇪', product: '太阳能板 200W', time: '2h 前', platform: 'Alibaba', color: '#F59E0B' },
    { name: 'Sarah Johnson', country: '🇺🇸', product: 'LED 灯带定制', time: '3h 前', platform: 'LinkedIn', color: '#60A5FA' },
    { name: 'Nguyen Van A', country: '🇻🇳', product: '充电宝 OEM', time: '4h 前', platform: 'WhatsApp', color: '#34D399' },
  ];

  return (
    <div className="relative w-full h-full overflow-hidden" style={{
      background: 'linear-gradient(145deg, #140808 0%, #1A0D0D 60%, #0F0808 100%)',
    }}>
      {/* 插画背景 */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <img
          src="/card-pending.png"
          alt=""
          className="absolute right-0 top-0 h-full w-auto object-cover"
          style={{ opacity: 0.28, mixBlendMode: 'lighten', transform: 'scale(1.05)', transformOrigin: 'right center' }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(90deg, rgba(20,8,8,0.98) 0%, rgba(20,8,8,0.88) 45%, rgba(20,8,8,0.35) 75%, rgba(20,8,8,0.1) 100%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, transparent 35%, rgba(20,8,8,0.97) 100%)',
        }} />
      </div>

      {/* 红色光晕 */}
      <div className="absolute pointer-events-none" style={{
        top: -60, left: '20%', width: 260, height: 260,
        background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 65%)',
        filter: 'blur(50px)', zIndex: 1,
      }} />

      <div className="relative z-10 flex flex-col justify-between h-full px-6 pt-6 pb-6">
        {/* 顶部标签 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#F87171',
              boxShadow: '0 0 12px #F87171, 0 0 24px rgba(239,68,68,0.5)',
              animation: 'pulse-dot 1s ease-in-out infinite',
            }} />
            <span className="text-[#F87171] text-[11px] font-bold tracking-[0.2em] uppercase">待回复</span>
          </div>
          {unread > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid rgba(239,68,68,0.4)',
            }}>
              <span className="text-[#F87171] text-[11px] font-bold">紧急处理</span>
            </div>
          )}
        </div>

        {/* 核心数字 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-end gap-3 mb-3">
            <span className="font-black tabular-nums leading-none" style={{
              fontSize: 96,
              background: 'linear-gradient(135deg, #FCA5A5 0%, #EF4444 50%, #DC2626 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.6))',
              lineHeight: 1,
            }}>
              {data ? <CountUp target={unread} duration={1200} /> : '—'}
            </span>
            <div className="pb-4">
              <p className="text-white text-[18px] font-bold">条待回复</p>
              <p className="text-[#7A3A3A] text-[12px]">需要处理</p>
            </div>
          </div>

          {/* 紧急程度说明 */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2" style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span className="text-[#F87171] text-[11px] font-medium">超过 2 小时未回复将影响 Alibaba 排名</span>
          </div>
        </div>

        {/* 待回复列表 */}
        <div>
          <p className="text-[#5A3A3A] text-[10px] font-semibold tracking-wider uppercase mb-2.5">最紧急询盘</p>
          <div className="flex flex-col gap-2">
            {urgentItems.slice(0, unread > 0 ? Math.min(unread, 3) : 3).map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl" style={{
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(239,68,68,0.15)',
              }}>
                <div className="flex items-center justify-center rounded-full text-[13px] font-black flex-shrink-0" style={{
                  width: 36, height: 36,
                  background: `linear-gradient(135deg, ${item.color}30, ${item.color}15)`,
                  border: `1px solid ${item.color}30`,
                  color: item.color,
                }}>
                  {item.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-[12px] font-semibold truncate">{item.name}</span>
                    <span className="text-[11px]">{item.country}</span>
                  </div>
                  <p className="text-[#6B6B80] text-[10px] truncate">{item.product}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
                    background: `${item.color}15`, color: item.color,
                  }}>{item.platform}</span>
                  <span className="text-[#5A3A3A] text-[9px]">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 全屏轮播卡片 3：消息通知 ─────────────────────────────────────────────────
function SlideNotifications({ data }: { data: any }) {
  const notifications = [
    { type: 'inquiry', icon: '📨', title: '新询盘来自德国', desc: 'Hans Mueller 询问太阳能板 200W 的 MOQ 和价格', time: '5分钟前', color: '#F59E0B', unread: true },
    { type: 'reply', icon: '💬', title: 'OpenClaw 已回复 3 条询盘', desc: '自动生成并发送了专业回复，等待买家确认', time: '12分钟前', color: '#A78BFA', unread: true },
    { type: 'alert', icon: '⚡', title: 'LinkedIn 开发信发送完成', desc: '今日 8 条开发信已发送，预计 2-3 天内收到回复', time: '1小时前', color: '#60A5FA', unread: false },
    { type: 'tip', icon: '🎯', title: '欧洲市场活跃时段开始', desc: '当前是德国、荷兰买家的工作时间，建议优先处理欧洲询盘', time: '2小时前', color: '#34D399', unread: false },
  ];
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="relative w-full h-full overflow-hidden" style={{
      background: 'linear-gradient(145deg, #080D18 0%, #0A1020 60%, #080A18 100%)',
    }}>
      {/* 插画背景 */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <img
          src="/card-notifications.png"
          alt=""
          className="absolute right-0 top-0 h-full w-auto object-cover"
          style={{ opacity: 0.25, mixBlendMode: 'lighten', transform: 'scale(1.05)', transformOrigin: 'right center' }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(90deg, rgba(8,13,24,0.98) 0%, rgba(8,13,24,0.88) 45%, rgba(8,13,24,0.35) 75%, rgba(8,13,24,0.1) 100%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, transparent 30%, rgba(8,13,24,0.97) 100%)',
        }} />
      </div>

      {/* 蓝色光晕 */}
      <div className="absolute pointer-events-none" style={{
        top: -60, left: '20%', width: 260, height: 260,
        background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%)',
        filter: 'blur(50px)', zIndex: 1,
      }} />

      <div className="relative z-10 flex flex-col justify-between h-full px-6 pt-6 pb-6">
        {/* 顶部标签 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#60A5FA',
              boxShadow: '0 0 12px #60A5FA, 0 0 24px rgba(96,165,250,0.5)',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
            <span className="text-[#60A5FA] text-[11px] font-bold tracking-[0.2em] uppercase">消息通知</span>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{
              background: 'rgba(96,165,250,0.15)',
              border: '1px solid rgba(96,165,250,0.3)',
            }}>
              <span className="text-[#60A5FA] text-[11px] font-bold">{unreadCount} 条未读</span>
            </div>
          )}
        </div>

        {/* 核心数字 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-end gap-3 mb-4">
            <span className="font-black tabular-nums leading-none" style={{
              fontSize: 96,
              background: 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 50%, #1D4ED8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 30px rgba(59,130,246,0.5))',
              lineHeight: 1,
            }}>
              <CountUp target={notifications.length} duration={1000} />
            </span>
            <div className="pb-4">
              <p className="text-white text-[18px] font-bold">条通知</p>
              <p className="text-[#3A4A6A] text-[12px]">{unreadCount} 条未读</p>
            </div>
          </div>
        </div>

        {/* 通知列表 */}
        <div>
          <div className="flex flex-col gap-2">
            {notifications.slice(0, 4).map((notif, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-2xl" style={{
                background: notif.unread ? `${notif.color}0A` : 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${notif.unread ? `${notif.color}25` : 'rgba(255,255,255,0.05)'}`,
              }}>
                <div className="flex items-center justify-center rounded-xl flex-shrink-0 text-base" style={{
                  width: 34, height: 34,
                  background: `${notif.color}15`,
                  border: `1px solid ${notif.color}25`,
                }}>
                  {notif.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold truncate" style={{ color: notif.unread ? 'white' : '#6B6B80' }}>{notif.title}</p>
                    <span className="text-[9px] flex-shrink-0" style={{ color: '#3A4A6A' }}>{notif.time}</span>
                  </div>
                  <p className="text-[10px] leading-relaxed truncate" style={{ color: '#4A5A7A' }}>{notif.desc}</p>
                </div>
                {notif.unread && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: notif.color, flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 全屏轮播卡片 4：OpenClaw 任务状态 ───────────────────────────────────────
function SlideOpenClaw({ data, openclawData }: { data: any; openclawData: any }) {
  const agent = openclawData ?? data?.agent ?? null;
  const status = agent?.instance?.status ?? 'working';
  const isActive = ['online', 'working', 'active'].includes(status);
  const completedTasks = agent?.completedTasks ?? 24;
  const opsToday = agent?.opsToday ?? 0;
  const currentTask = '跟进 WhatsApp 未回复客户';

  const tasks = [
    { text: '扫描 Alibaba 新询盘 × 12', status: 'done', platform: 'Alibaba', color: '#F59E0B' },
    { text: '分析买家意向，生成回复草稿', status: 'done', platform: 'AI', color: '#A78BFA' },
    { text: '发送 LinkedIn 开发信 × 8', status: 'done', platform: 'LinkedIn', color: '#60A5FA' },
    { text: '跟进 WhatsApp 未回复客户', status: 'running', platform: 'WhatsApp', color: '#34D399' },
    { text: '生成今日市场分析报告', status: 'pending', platform: 'AI', color: '#A78BFA' },
  ];

  return (
    <div className="relative w-full h-full overflow-hidden" style={{
      background: 'linear-gradient(145deg, #0D0A1A 0%, #130D28 60%, #0A0818 100%)',
    }}>
      {/* 插画背景 */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <img
          src="/card-openclaw.png"
          alt=""
          className="absolute right-0 top-0 h-full w-auto object-cover"
          style={{ opacity: 0.18, mixBlendMode: 'screen', transform: 'scale(1.05)', transformOrigin: 'right center' }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(90deg, rgba(13,10,26,0.98) 0%, rgba(13,10,26,0.88) 45%, rgba(13,10,26,0.35) 75%, rgba(13,10,26,0.1) 100%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, transparent 30%, rgba(13,10,26,0.97) 100%)',
        }} />
      </div>

      {/* 紫色光晕 */}
      <div className="absolute pointer-events-none" style={{
        top: -60, left: '20%', width: 260, height: 260,
        background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 65%)',
        filter: 'blur(50px)', zIndex: 1,
      }} />

      <div className="relative z-10 flex flex-col justify-between h-full px-6 pt-6 pb-6">
        {/* 顶部：OpenClaw 品牌 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative" style={{ width: 44, height: 44 }}>
              <div className="absolute inset-0 rounded-2xl" style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.4) 0%, rgba(0,245,160,0.2) 100%)',
                border: '1px solid rgba(124,58,237,0.5)',
              }} />
              <img
                src="/openclaw-mascot.png"
                alt="OpenClaw"
                className="absolute inset-0 w-full h-full object-contain p-1"
                style={{
                  filter: isActive ? 'drop-shadow(0 0 8px rgba(0,245,160,0.7))' : 'grayscale(0.5)',
                  animation: isActive ? 'float 3s ease-in-out infinite' : 'none',
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-[16px] font-black">Open</span>
                <span className="text-[16px] font-black" style={{
                  background: 'linear-gradient(135deg, #FF6B35, #F59E0B)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Claw</span>
              </div>
              <p className="text-[#5A4A7A] text-[10px]">AI 自动化引擎</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{
            background: isActive ? 'rgba(0,245,160,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${isActive ? 'rgba(0,245,160,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isActive ? '#00F5A0' : '#F87171',
              boxShadow: `0 0 8px ${isActive ? '#00F5A0' : '#F87171'}`,
              animation: isActive ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
            }} />
            <span className="text-[11px] font-bold" style={{ color: isActive ? '#00F5A0' : '#F87171' }}>
              {isActive ? '运行中' : '离线'}
            </span>
          </div>
        </div>

        {/* 核心数字 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-end gap-3 mb-3">
            <span className="font-black tabular-nums leading-none" style={{
              fontSize: 96,
              background: 'linear-gradient(135deg, #C4B5FD 0%, #7C3AED 50%, #5B21B6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 30px rgba(124,58,237,0.6))',
              lineHeight: 1,
            }}>
              <CountUp target={completedTasks} duration={1400} />
            </span>
            <div className="pb-4">
              <p className="text-white text-[18px] font-bold">个任务</p>
              <p className="text-[#4A3A6A] text-[12px]">今日完成</p>
            </div>
          </div>

          {/* 当前任务 */}
          {isActive && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2" style={{
              background: 'rgba(124,58,237,0.12)',
              border: '1px solid rgba(124,58,237,0.3)',
            }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.4)', borderTopColor: '#A78BFA', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[#A78BFA] text-[10px] font-bold uppercase tracking-wider mb-0.5">正在执行</p>
                <p className="text-white text-[12px] font-medium truncate">{currentTask}</p>
              </div>
            </div>
          )}
        </div>

        {/* 任务流 */}
        <div>
          <p className="text-[#4A3A6A] text-[10px] font-semibold tracking-wider uppercase mb-2">今日任务流</p>
          <div className="flex flex-col gap-1.5">
            {tasks.map((task, i) => {
              const isDone = task.status === 'done';
              const isRunning = task.status === 'running';
              return (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{
                  background: isRunning ? 'rgba(124,58,237,0.1)' : isDone ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(8px)',
                  border: isRunning ? '1px solid rgba(124,58,237,0.25)' : '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{ width: 16, height: 16, flexShrink: 0 }}>
                    {isDone && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" fill="rgba(0,245,160,0.15)" stroke="#00F5A0" strokeWidth="1.2" />
                        <path d="M5 8l2.5 2.5 4-4" stroke="#00F5A0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {isRunning && (
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid rgba(124,58,237,0.3)', borderTopColor: '#A78BFA', animation: 'spin 1s linear infinite' }} />
                    )}
                    {task.status === 'pending' && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
                        <circle cx="8" cy="8" r="1.5" fill="rgba(255,255,255,0.15)" />
                      </svg>
                    )}
                  </div>
                  <p className="flex-1 text-[11px] font-medium truncate" style={{
                    color: isDone ? '#4A3A6A' : isRunning ? '#DDD0FF' : '#3A2A5A',
                  }}>{task.text}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{
                    background: `${task.color}12`, color: task.color,
                  }}>{task.platform}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 0: 炫酷首页（全屏轮播） ─────────────────────────────────────────
function HomeScreen({
  data, openclawData, onNavigate,
}: {
  data: any; openclawData: any; onNavigate: (path: string) => void;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalSlides = 4;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? '凌晨好' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  // 触摸/鼠标滑动处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
    setDragDelta(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientX - dragStart;
    setDragDelta(delta);
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(dragDelta) > 50) {
      if (dragDelta < 0 && activeSlide < totalSlides - 1) {
        setActiveSlide(s => s + 1);
      } else if (dragDelta > 0 && activeSlide > 0) {
        setActiveSlide(s => s - 1);
      }
    }
    setIsDragging(false);
    setDragDelta(0);
  }, [dragDelta, activeSlide, totalSlides]);

  const slideColors = ['#C9A84C', '#EF4444', '#3B82F6', '#7C3AED'];
  const slideLabels = ['今日询盘', '待回复', '通知', 'AI 任务'];

  return (
    <div className="relative flex flex-col h-full" style={{
      background: '#050508',
    }}>
      {/* 状态栏 */}
      <div className="relative z-50">
        <StatusBar />
      </div>

      {/* 顶部问候栏 */}
      <div className="flex items-center justify-between px-5 pb-3 relative z-20">
        <div>
          <p className="text-[#5A5A72] text-[11px] font-medium tracking-wider uppercase">{greeting}</p>
          <p className="text-white text-[20px] font-black tracking-tight leading-tight">指挥台 <span style={{
            background: 'linear-gradient(135deg, #F5D07A, #C9A84C)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>LIVE</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/notifications')}
            className="relative flex items-center justify-center rounded-full active:scale-90 transition-transform"
            style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B8B9E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {(data?.signals?.unread ?? 0) > 0 && (
              <div className="absolute flex items-center justify-center rounded-full" style={{
                top: -2, right: -2, minWidth: 14, height: 14,
                background: '#EF4444', fontSize: 8, fontWeight: 700, color: 'white', paddingInline: 2,
                boxShadow: '0 0 0 2px #050508',
              }}>
                {data?.signals?.unread}
              </div>
            )}
          </button>
          <div className="relative" style={{ width: 38, height: 38 }}>
            <div className="w-full h-full rounded-full flex items-center justify-center text-sm font-black" style={{
              background: 'linear-gradient(135deg, #C9A84C 0%, #F5D07A 100%)',
              color: '#0A0A0F',
            }}>老</div>
            <div className="absolute bottom-0 right-0 rounded-full border-2" style={{
              width: 10, height: 10, background: '#00F5A0', borderColor: '#050508',
            }} />
          </div>
        </div>
      </div>

      {/* 轮播卡片区域 — 占据剩余全部高度 */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* 卡片轨道 */}
        <div
          className="flex h-full"
          style={{
            width: `${totalSlides * 100}%`,
            transform: `translateX(calc(${-activeSlide * (100 / totalSlides)}% + ${isDragging ? dragDelta / totalSlides : 0}px))`,
            transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {/* 卡片 1 */}
          <div style={{ width: `${100 / totalSlides}%`, height: '100%' }}>
            <SlideInquiries data={data} />
          </div>
          {/* 卡片 2 */}
          <div style={{ width: `${100 / totalSlides}%`, height: '100%' }}>
            <SlidePending data={data} />
          </div>
          {/* 卡片 3 */}
          <div style={{ width: `${100 / totalSlides}%`, height: '100%' }}>
            <SlideNotifications data={data} />
          </div>
          {/* 卡片 4 */}
          <div style={{ width: `${100 / totalSlides}%`, height: '100%' }}>
            <SlideOpenClaw data={data} openclawData={openclawData} />
          </div>
        </div>

        {/* 分页指示器 — 右侧竖排 */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              style={{
                width: i === activeSlide ? 4 : 4,
                height: i === activeSlide ? 28 : 8,
                borderRadius: 2,
                background: i === activeSlide ? slideColors[i] : 'rgba(255,255,255,0.2)',
                boxShadow: i === activeSlide ? `0 0 12px ${slideColors[i]}` : 'none',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                border: 'none',
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* 底部标签提示 */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-50 px-8">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className="flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all"
              style={{
                background: i === activeSlide ? `${slideColors[i]}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === activeSlide ? `${slideColors[i]}50` : 'rgba(255,255,255,0.08)'}`,
                color: i === activeSlide ? slideColors[i] : '#3A3A52',
                backdropFilter: 'blur(8px)',
              }}
            >
              {slideLabels[i]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Screen 1: 指挥台 ─────────────────────────────────────────────────────────
function CommandScreen({ data, onBack, onNext }: { data: any; onBack: () => void; onNext: () => void }) {
  const [command, setCommand] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [labMode, setLabMode] = useState(false);
  const [labLoading, setLabLoading] = useState(false);
  const [labResult, setLabResult] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const quickCommands = [
    { icon: '🌍', text: '今天重点开发欧洲市场' },
    { icon: '⭐', text: '优先回复高价值询盘' },
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
    } catch (e) { console.error(e); }
    finally { setLabLoading(false); }
  };

  const agent = data?.agent ?? null;
  const agentStatus = agent?.instance?.status ?? 'offline';
  const statusColor = agentStatusColor(agentStatus);

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{
      background: 'linear-gradient(180deg, #050510 0%, #080818 100%)',
    }}>
      <div className="absolute pointer-events-none" style={{
        top: -80, right: -60, width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)',
        filter: 'blur(60px)',
      }} />
      <StatusBar />
      <div className="flex items-center justify-between px-5 pb-4 relative z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-[#4A4A62] text-sm active:opacity-60 transition-opacity">
          <span>←</span><span>战报</span>
        </button>
        <h1 className="text-[#F1F1F5] text-base font-bold">数字员工指挥台</h1>
        <button onClick={onNext} className="flex items-center gap-1 text-[#4A4A62] text-sm active:opacity-60 transition-opacity">
          <span>周报</span><span>→</span>
        </button>
      </div>

      <div className="flex-1 scroll-area px-4 pb-28 relative z-10">
        <div className="glass-card-elevated p-4 mb-4 slide-up" style={{ border: `1px solid ${statusColor}30`, boxShadow: `0 0 20px ${statusColor}15` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}`, animation: 'pulse-dot 2s ease-in-out infinite' }} />
              <span className="text-[#F1F1F5] text-sm font-bold">{agent?.instance?.name || '数字员工'}</span>
            </div>
            <span className={agentStatusBadgeClass(agentStatus)}>{agentStatusLabel(agentStatus)}</span>
          </div>
          {agent?.instance ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="metric-card">
                <p className="text-[#6B6B80] text-xs mb-1">今日完成任务</p>
                <p className="text-3xl font-black tabular-nums" style={{ color: '#60A5FA' }}>{agent.completedTasks ?? 0}</p>
              </div>
              <div className="metric-card">
                <p className="text-[#6B6B80] text-xs mb-1">待执行指令</p>
                <p className="text-3xl font-black tabular-nums text-[#F1F1F5]">{agent.pendingCommands ?? 0}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="shimmer rounded-xl h-16" /><div className="shimmer rounded-xl h-16" />
            </div>
          )}
        </div>

        <div className="glass-card-elevated p-4 mb-4 slide-up delay-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#A0A0B0] text-sm font-semibold">下达指令</p>
            <button onClick={() => { setLabMode(v => !v); setLabResult(null); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: labMode ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${labMode ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: labMode ? '#A78BFA' : '#6B6B80',
              }}>
              <span>🧪</span><span>指令实验室</span>
            </button>
          </div>
          <textarea ref={textareaRef} value={command} onChange={e => setCommand(e.target.value)}
            placeholder={labMode ? '输入复合指令，AI 将拆解为可视化执行流程…' : '用自然语言告诉数字员工今天的重点…'}
            className="input-dark w-full resize-none text-sm leading-relaxed" rows={3} />
          {labMode ? (
            <button onClick={handleLabAnalyze} disabled={!command.trim() || labLoading}
              className="w-full py-3.5 text-sm mt-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: (!command.trim() || labLoading) ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', opacity: (!command.trim() || labLoading) ? 0.6 : 1, color: '#fff' }}>
              {labLoading ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI 拆解中…</> : <><span>🧪</span>分析指令流程</>}
            </button>
          ) : (
            <button onClick={handleSend} disabled={!command.trim() || sending}
              className={`btn-gold w-full py-3.5 text-sm mt-3 font-bold active:scale-95 transition-transform ${(!command.trim() || sending) ? 'opacity-50' : 'glow-pulse'}`}>
              {sending ? '发送中…' : sent ? '✓ 指令已发送' : '⚡ 发送指令'}
            </button>
          )}
          {sent && !labMode && <p className="text-[#34D399] text-xs text-center mt-2 fade-in">数字员工已收到指令，正在解析执行</p>}
        </div>

        <div className="glass-card-elevated p-4 slide-up delay-200">
          <p className="text-[#A0A0B0] text-sm font-semibold mb-3">快捷指令</p>
          <div className="flex flex-col gap-2">
            {quickCommands.map((cmd, i) => (
              <button key={i} onClick={() => setCommand(cmd.text)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98]"
                style={{ background: command === cmd.text ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${command === cmd.text ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                <span className="text-lg">{cmd.icon}</span>
                <span className="text-[#A0A0B0] text-sm">{cmd.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: 周报 ───────────────────────────────────────────────────────────
function ReportScreen({ data, onBack }: { data: any; onBack: () => void }) {
  const weekReport = data?.weekReport ?? null;
  const roi = data?.roi ?? null;
  const thisWeek = weekReport?.thisWeek ?? {};
  const lastWeek = weekReport?.lastWeek ?? {};
  const compareItems = [
    { label: '询盘量', thisWeek: thisWeek.inquiries ?? 0, lastWeek: lastWeek.inquiries ?? 0, color: '#C9A84C' },
    { label: '回复率', thisWeek: thisWeek.replyRate ?? 0, lastWeek: lastWeek.replyRate ?? 0, color: '#60A5FA' },
    { label: '转化率', thisWeek: thisWeek.conversionRate ?? 0, lastWeek: lastWeek.conversionRate ?? 0, color: '#34D399' },
    { label: 'AI 操作', thisWeek: thisWeek.aiOps ?? 0, lastWeek: lastWeek.aiOps ?? 0, color: '#A78BFA' },
  ];
  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background: 'linear-gradient(180deg, #050510 0%, #080818 100%)' }}>
      <div className="absolute pointer-events-none" style={{ top: -60, left: '30%', width: 240, height: 240, background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 65%)', filter: 'blur(50px)' }} />
      <StatusBar />
      <div className="flex items-center justify-between px-5 pb-4 relative z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-[#4A4A62] text-sm active:opacity-60 transition-opacity"><span>←</span><span>指挥</span></button>
        <h1 className="text-[#F1F1F5] text-base font-bold">经营周报</h1>
        <div style={{ width: 48 }} />
      </div>
      <div className="flex-1 scroll-area px-4 pb-28 relative z-10">
        <div className="glass-card-elevated p-4 mb-4 slide-up delay-100">
          <p className="text-[#A0A0B0] text-sm font-semibold mb-4">本周 vs 上周</p>
          {weekReport ? (
            compareItems.map(item => {
              const maxVal = Math.max(item.thisWeek, item.lastWeek, 1);
              const up = item.thisWeek >= item.lastWeek;
              const diff = item.lastWeek > 0 ? ((item.thisWeek - item.lastWeek) / item.lastWeek * 100).toFixed(0) : '—';
              return (
                <div key={item.label} className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[#A0A0B0] text-xs font-medium">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#5A5A72] text-xs">{item.lastWeek}</span>
                      <span className="text-xs font-bold" style={{ color: up ? '#34D399' : '#F87171' }}>{up ? '▲' : '▼'} {item.thisWeek}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', width: `${(item.thisWeek / maxVal) * 100}%`, background: item.color, borderRadius: 4, boxShadow: `0 0 8px ${item.color}60`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', width: `${(item.lastWeek / maxVal) * 100}%`, background: 'rgba(255,255,255,0.2)', borderRadius: 4, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="shimmer rounded-xl h-10" />)}</div>
          )}
        </div>
        {roi && (
          <div className="glass-card-elevated p-4 slide-up delay-200">
            <p className="text-[#A0A0B0] text-sm font-semibold mb-3">AI 效率收益</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '节省工时', value: `${roi.hoursSaved}h`, color: '#C9A84C', icon: '⏱' },
                { label: '节省成本', value: `¥${roi.costSaved}`, color: '#34D399', icon: '💰' },
                { label: '转化率', value: `${roi.conversionRate}%`, color: '#60A5FA', icon: '🎯' },
              ].map(r => (
                <div key={r.label} className="metric-card text-center">
                  <span className="text-lg mb-1 block">{r.icon}</span>
                  <p className="text-lg font-bold tabular-nums" style={{ color: r.color }}>{r.value}</p>
                  <p className="text-[#6B6B80] text-xs mt-1">{r.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 页面指示点 ───────────────────────────────────────────────────────────────
function PageDots({ screen, total }: { screen: number; total: number }) {
  return (
    <div className="absolute flex items-center gap-1.5 z-30" style={{ top: 50, left: '50%', transform: 'translateX(-50%)' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="rounded-full transition-all duration-300" style={{
          width: screen === i ? 18 : 4, height: 4,
          background: screen === i ? '#C9A84C' : 'rgba(255,255,255,0.18)',
          boxShadow: screen === i ? '0 0 8px rgba(201,168,76,0.6)' : 'none',
        }} />
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
  const [openclawData, setOpenclawData] = useState<any>(null);
  const [transitioning, setTransitioning] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      const [warroomRes, approvalsRes] = await Promise.all([
        bossApi.getWarroom(),
        bossApi.getPendingApprovals('pending'),
      ]);
      setData(warroomRes);
      setApprovals(approvalsRes?.approvals ?? []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchOpenclawData = useCallback(async () => {
    try {
      const res = await openclawApi.status();
      const instances = await multiAccountApi.getInstances();
      const instanceList = instances?.instances ?? [];
      setOpenclawData({
        status: res?.instance?.status ?? 'offline',
        instances: instanceList.length || 1,
        opsToday: res?.instance?.opsToday ?? 0,
        opsLimit: res?.instance?.opsLimit ?? 200,
      });
    } catch (e) {
      setOpenclawData({ status: 'offline', instances: 0, opsToday: 0, opsLimit: 200 });
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchOpenclawData();
    const iv = setInterval(fetchData, 30000);
    const iv2 = setInterval(fetchOpenclawData, 60000);
    return () => { clearInterval(iv); clearInterval(iv2); };
  }, [fetchData, fetchOpenclawData]);

  const handleApprove = async (id: string) => {
    try { await bossApi.approve(id); setApprovals(prev => prev.filter((a: any) => a.id !== id)); } catch (e) { console.error(e); }
  };
  const handleReject = async (id: string) => {
    try { await bossApi.reject(id, '老板拒绝'); setApprovals(prev => prev.filter((a: any) => a.id !== id)); } catch (e) { console.error(e); }
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

  const unreadCount = (data?.signals?.unread ?? 0) + approvals.length;

  return (
    <div
      className="phone-frame relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <PageDots screen={screen} total={3} />

      <div className="flex h-full" style={{
        width: '300%',
        transform: `translateX(-${screen * (100 / 3)}%)`,
        transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
      }}>
        <div style={{ width: '33.333%', height: '100dvh', flexShrink: 0 }}>
          <HomeScreen data={data} openclawData={openclawData} onNavigate={navigate} />
        </div>
        <div style={{ width: '33.333%', height: '100dvh', flexShrink: 0 }}>
          <CommandScreen data={data} onBack={() => goToScreen(0)} onNext={() => goToScreen(2)} />
        </div>
        <div style={{ width: '33.333%', height: '100dvh', flexShrink: 0 }}>
          <ReportScreen data={data} onBack={() => goToScreen(1)} />
        </div>
      </div>

      <BottomTabBar
        activeTab={screen}
        onSelect={goToScreen}
        onNavigate={navigate}
        unreadCount={unreadCount}
      />
    </div>
  );
}
