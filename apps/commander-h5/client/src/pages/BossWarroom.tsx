/**
 * BossWarroom — 全屏沉浸式老板指挥台
 * APEX COMMANDER v3 — Real Mobile APP Design
 *
 * 设计升级：
 *   - 真实手机状态栏（时间 + 信号 + 电量）
 *   - iOS/Android 风格顶部导航栏（头像 + 通知角标）
 *   - 真实底部 Tab Bar（图标 + 标签 + 激活态 + 安全区）
 *   - 卡片触摸反馈（ripple effect + scale）
 *   - 首页 Hero Banner（渐变背景 + 核心数据）
 *   - 快捷操作网格（2×2 功能入口）
 *   - 询盘列表预览（真实 APP 列表样式）
 *   - 数字员工状态卡（在线/离线/执行中）
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { bossApi, multiAccountApi, openclawApi } from '../lib/api';

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

// ─── 状态栏组件（模拟真实手机状态栏）────────────────────────────────────────
function StatusBar() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div
      className="flex items-center justify-between px-5 relative z-50"
      style={{ height: 44, paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* 时间 */}
      <span className="text-white text-[15px] font-semibold tabular-nums tracking-tight">{time}</span>

      {/* 右侧：信号 + WiFi + 电量 */}
      <div className="flex items-center gap-1.5">
        {/* 信号格 */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <rect x="0" y="8" width="3" height="4" rx="0.5" fill="white" opacity="1" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="white" opacity="1" />
          <rect x="9" y="2.5" width="3" height="9.5" rx="0.5" fill="white" opacity="1" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="white" opacity="0.35" />
        </svg>
        {/* WiFi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 9.5C8.828 9.5 9.5 10.172 9.5 11S8.828 12.5 8 12.5 6.5 11.828 6.5 11 7.172 9.5 8 9.5Z" fill="white" />
          <path d="M4.5 7.5C5.5 6.3 6.7 5.5 8 5.5s2.5.8 3.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M1.5 4.5C3.2 2.5 5.5 1.2 8 1.2s4.8 1.3 6.5 3.3" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
        </svg>
        {/* 电量 */}
        <div className="flex items-center gap-0.5">
          <div className="relative" style={{ width: 25, height: 12 }}>
            <div className="absolute inset-0 rounded-[3px] border border-white/60" />
            <div className="absolute" style={{
              left: 2, top: 2, bottom: 2, right: 2,
              background: 'white',
              borderRadius: 1.5,
              width: '75%',
            }} />
            <div className="absolute" style={{
              right: -3, top: '50%', transform: 'translateY(-50%)',
              width: 2, height: 5,
              background: 'rgba(255,255,255,0.4)',
              borderRadius: '0 1px 1px 0',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sparkline SVG Component ──────────────────────────────────────────────────
function Sparkline({
  data, color = '#C9A84C', height = 32, width = 80, filled = true,
}: {
  data: number[]; color?: string; height?: number; width?: number; filled?: boolean;
}) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / range) * (height - 4) - 2,
  ]);
  const pathD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;
  const id = `spark-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {filled && <path d={areaD} fill={`url(#${id})`} />}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
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
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} />
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
            <div className="h-2 rounded-full" style={{
              width: `${thisPct}%`, background: color,
              transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: `0 0 8px ${color}60`,
            }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#6B6B80] text-xs w-8 text-right">上周</span>
          <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-2 rounded-full" style={{
              width: `${lastPct}%`, background: 'rgba(255,255,255,0.20)',
              transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bento SVG Icons ──────────────────────────────────────────────────────────
function IconInbox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}
function IconAlertCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IconTrendingUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IconCpu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}
function IconMonitor() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function IconZap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconCheckCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconActivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Bento Card 基础容器 ──────────────────────────────────────────────────────
function BentoCard({
  children, className = '', style = {}, onClick,
  accentColor = 'rgba(255,255,255,0.06)',
  borderColor = 'rgba(255,255,255,0.09)',
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  accentColor?: string;
  borderColor?: string;
  glow?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-[20px] ${onClick ? 'cursor-pointer active:scale-[0.97]' : ''} ${className}`}
      style={{
        background: accentColor,
        border: `1px solid ${borderColor}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'transform 0.12s ease, opacity 0.12s ease',
        ...style,
      }}
    >
      {glow && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at top right, ${glow} 0%, transparent 60%)`,
        }} />
      )}
      {children}
    </div>
  );
}

// ─── 顶部导航栏（真实 APP 风格）────────────────────────────────────────────────
function AppHeader({
  greeting, dateStr, unreadCount, onNotification, onSettings,
}: {
  greeting: string;
  dateStr: string;
  unreadCount: number;
  onNotification: () => void;
  onSettings: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 pb-3 relative z-20">
      {/* 左侧：头像 + 问候语 */}
      <div className="flex items-center gap-3">
        {/* 用户头像 */}
        <div
          className="relative flex-shrink-0"
          style={{ width: 40, height: 40 }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #C9A84C 0%, #F5D07A 100%)',
              color: '#0A0A0F',
            }}
          >
            老
          </div>
          {/* 在线状态点 */}
          <div
            className="absolute bottom-0 right-0 rounded-full border-2"
            style={{
              width: 11, height: 11,
              background: '#34D399',
              borderColor: '#0A0A0F',
            }}
          />
        </div>

        {/* 问候语 */}
        <div>
          <p className="text-white text-[16px] font-bold leading-tight tracking-tight">
            {greeting}，老板 👋
          </p>
          <p className="text-[#5A5A72] text-[12px] mt-0.5 font-medium">{dateStr}</p>
        </div>
      </div>

      {/* 右侧：通知 + 设置 */}
      <div className="flex items-center gap-2">
        {/* 通知按钮 */}
        <button
          onClick={onNotification}
          className="relative flex items-center justify-center rounded-full active:scale-90 transition-transform"
          style={{
            width: 38, height: 38,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ color: '#A0A0B0' }}><IconBell /></span>
          {/* 通知角标 */}
          {unreadCount > 0 && (
            <div
              className="absolute flex items-center justify-center rounded-full"
              style={{
                top: -2, right: -2,
                minWidth: 16, height: 16,
                background: '#EF4444',
                fontSize: 9,
                fontWeight: 700,
                color: 'white',
                paddingInline: 3,
                boxShadow: '0 0 0 2px #0A0A0F',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>

        {/* 设置按钮 */}
        <button
          onClick={onSettings}
          className="flex items-center justify-center rounded-full active:scale-90 transition-transform"
          style={{
            width: 38, height: 38,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ color: '#A0A0B0' }}><IconSettings /></span>
        </button>
      </div>
    </div>
  );
}

// ─── Hero Banner（核心数据一览）────────────────────────────────────────────────
function HeroBanner({
  todayInq, unread, aiOps, weekReplyRate, data,
}: {
  todayInq: number; unread: number; aiOps: number; weekReplyRate: number; data: any;
}) {
  return (
    <div
      className="mx-4 rounded-[24px] overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #1A1508 0%, #1E1A08 40%, #0F1520 100%)',
        border: '1px solid rgba(201,168,76,0.25)',
        boxShadow: '0 8px 32px rgba(201,168,76,0.12), 0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          background: 'radial-gradient(circle, rgba(201,168,76,0.2) 0%, transparent 65%)',
          filter: 'blur(30px)',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: -20, width: 120, height: 120,
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)',
          filter: 'blur(25px)',
        }} />
      </div>

      <div className="relative p-5">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[#C9A84C] text-[11px] font-bold tracking-[0.15em] uppercase mb-1">今日战报</p>
            <p className="text-white text-[22px] font-black leading-tight">
              {data ? todayInq : '—'}
              <span className="text-[#8B8B9E] text-[14px] font-medium ml-1.5">条询盘</span>
            </p>
          </div>
          {/* 状态徽章 */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: unread > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.12)',
              border: `1px solid ${unread > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.25)'}`,
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: unread > 0 ? '#F87171' : '#34D399',
              boxShadow: `0 0 6px ${unread > 0 ? '#F87171' : '#34D399'}`,
            }} />
            <span className="text-[11px] font-bold" style={{ color: unread > 0 ? '#F87171' : '#34D399' }}>
              {unread > 0 ? `${unread} 未回复` : '全部已回'}
            </span>
          </div>
        </div>

        {/* 三个核心指标 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '未回复', value: data ? unread : '—', color: unread > 0 ? '#F87171' : '#34D399', icon: '📨' },
            { label: 'AI 操作', value: data ? aiOps : '—', color: '#60A5FA', icon: '🤖' },
            { label: '回复率', value: data ? `${weekReplyRate}%` : '—', color: '#C9A84C', icon: '⚡' },
          ].map(item => (
            <div
              key={item.label}
              className="flex flex-col items-center py-3 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-base mb-1">{item.icon}</span>
              <span className="text-[20px] font-black tabular-nums leading-none" style={{ color: item.color }}>
                {item.value}
              </span>
              <span className="text-[#5A5A72] text-[10px] mt-1.5 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 快捷功能网格 ──────────────────────────────────────────────────────────────
function QuickActions({ onNavigate }: { onNavigate: (path: string) => void }) {
  const actions = [
    {
      icon: '📨', label: '询盘管理', sub: '处理新询盘',
      color: '#C9A84C', bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.2)',
      path: '/phone',
    },
    {
      icon: '🤖', label: '数字员工', sub: '下达指令',
      color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)',
      path: '/phone',
    },
    {
      icon: '🌍', label: '市场拓展', sub: '开发新市场',
      color: '#34D399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)',
      path: '/market',
    },
    {
      icon: '📊', label: '增长报告', sub: '查看数据',
      color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)',
      path: '/web',
    },
    {
      icon: '🎬', label: 'TikTok', sub: '内容运营',
      color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)',
      path: '/tiktok',
    },
    {
      icon: '💼', label: 'LinkedIn', sub: '开发客户',
      color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)',
      path: '/linkedin',
    },
    {
      icon: '💬', label: 'WhatsApp', sub: '客户沟通',
      color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.18)',
      path: '/whatsapp',
    },
    {
      icon: '💰', label: 'ROI 分析', sub: '投资回报',
      color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)',
      path: '/roi',
    },
  ];

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white text-[15px] font-bold">快捷功能</span>
        <button className="text-[#5A5A72] text-[12px] flex items-center gap-0.5">
          全部 <span style={{ color: '#5A5A72' }}><IconChevronRight /></span>
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => onNavigate(action.path)}
            className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
          >
            {/* 图标容器 */}
            <div
              className="flex items-center justify-center rounded-[18px]"
              style={{
                width: 56, height: 56,
                background: action.bg,
                border: `1px solid ${action.border}`,
              }}
            >
              <span className="text-[24px]">{action.icon}</span>
            </div>
            <span className="text-[#A0A0B0] text-[11px] font-medium text-center leading-tight">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 数字员工状态卡 ────────────────────────────────────────────────────────────
function AgentStatusCard({
  data, openclawData, onNavigate,
}: {
  data: any; openclawData: any; onNavigate: (path: string) => void;
}) {
  const agent = data?.agent ?? null;
  const agentStatus = agent?.instance?.status ?? 'offline';
  const ocStatus = openclawData?.status ?? 'offline';
  const ocIsActive = ['online', 'working', 'active'].includes(ocStatus);
  const ocOpsToday = openclawData?.opsToday ?? 0;
  const ocOpsLimit = openclawData?.opsLimit ?? 200;
  const ocUtilization = ocOpsLimit > 0 ? Math.round((ocOpsToday / ocOpsLimit) * 100) : 0;

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white text-[15px] font-bold">数字员工</span>
        <button
          onClick={() => onNavigate('/phone')}
          className="text-[#C9A84C] text-[12px] flex items-center gap-0.5 font-semibold"
        >
          管理 <span><IconChevronRight /></span>
        </button>
      </div>

      <BentoCard
        accentColor="rgba(96,165,250,0.06)"
        borderColor="rgba(96,165,250,0.18)"
        glow="rgba(96,165,250,0.1)"
        onClick={() => onNavigate('/phone')}
        style={{ padding: '16px' }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* OpenClaw 图标 */}
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(59,130,246,0.1) 100%)',
                border: '1px solid rgba(96,165,250,0.25)',
                color: '#60A5FA',
              }}
            >
              <IconMonitor />
            </div>
            <div>
              <p className="text-white text-[15px] font-bold leading-tight">OpenClaw</p>
              <p className="text-[#5A5A72] text-[11px] mt-0.5">云端自动化引擎</p>
            </div>
          </div>

          {/* 运行状态 */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: ocIsActive ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${ocIsActive ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: ocIsActive ? '#34D399' : '#F87171',
              boxShadow: `0 0 6px ${ocIsActive ? '#34D399' : '#F87171'}`,
            }} />
            <span className="text-[11px] font-bold" style={{ color: ocIsActive ? '#34D399' : '#F87171' }}>
              {ocIsActive ? '运行中' : '离线'}
            </span>
          </div>
        </div>

        {/* 三个指标 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: '实例数', value: openclawData?.instances ?? 1, color: '#60A5FA' },
            { label: '今日操作', value: ocOpsToday, color: '#A78BFA' },
            { label: '利用率', value: `${ocUtilization}%`, color: ocUtilization > 80 ? '#F87171' : '#34D399' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center py-3 rounded-2xl" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <span className="text-[20px] font-black tabular-nums leading-none" style={{ color: item.color }}>
                {item.value}
              </span>
              <span className="text-[#5A5A72] text-[10px] mt-1.5 font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        {/* 进度条 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[#8B8B9E] text-[11px] font-medium">操作配额</span>
            <span className="text-[#8B8B9E] text-[11px]">{ocOpsToday} / {ocOpsLimit}</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-1.5 rounded-full" style={{
              width: `${Math.min(ocUtilization, 100)}%`,
              background: ocUtilization > 80
                ? 'linear-gradient(90deg, #F87171, #F59E0B)'
                : 'linear-gradient(90deg, #60A5FA, #A78BFA)',
              boxShadow: `0 0 8px ${ocUtilization > 80 ? 'rgba(248,113,113,0.4)' : 'rgba(96,165,250,0.4)'}`,
              transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
        </div>
      </BentoCard>
    </div>
  );
}

// ─── 待处理询盘列表 ────────────────────────────────────────────────────────────
function PendingInquiriesList({
  approvals, onApprove, onReject, onNavigate,
}: {
  approvals: any[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  // Mock 询盘数据（当没有真实数据时显示）
  const mockItems = [
    {
      id: 'mock1',
      buyerName: 'Nguyen Van An',
      company: 'SunPower Solutions',
      country: '🇻🇳 越南',
      product: '400W 单晶硅太阳能板',
      channel: 'Alibaba RFQ',
      channelColor: '#F59E0B',
      time: '3分钟前',
      urgency: 'high',
      confidence: 87,
    },
    {
      id: 'mock2',
      buyerName: 'Klaus Weber',
      company: 'EcoHome Trading GmbH',
      country: '🇩🇪 德国',
      product: '户外柚木家具套装',
      channel: 'LinkedIn',
      channelColor: '#60A5FA',
      time: '18分钟前',
      urgency: 'normal',
      confidence: 72,
    },
    {
      id: 'mock3',
      buyerName: 'Mike Johnson',
      company: 'Pacific Imports LLC',
      country: '🇺🇸 美国',
      product: 'LED 灯具 OEM 定制',
      channel: 'WhatsApp',
      channelColor: '#34D399',
      time: '1小时前',
      urgency: 'normal',
      confidence: 91,
    },
  ];

  const displayItems = approvals.length > 0
    ? approvals.map((a: any) => ({
        id: a.id,
        buyerName: a.buyerName || a.customerName || '客户',
        company: a.company || '未知公司',
        country: '',
        product: a.product || '产品询盘',
        channel: a.channel || 'AI 草稿',
        channelColor: '#C9A84C',
        time: new Date(a.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        urgency: 'normal',
        confidence: 80,
        draftContent: a.draftContent || a.draft,
        isApproval: true,
      }))
    : mockItems;

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-white text-[15px] font-bold">待处理询盘</span>
          {approvals.length > 0 && (
            <div
              className="flex items-center justify-center rounded-full text-[10px] font-bold"
              style={{
                minWidth: 18, height: 18,
                background: '#EF4444',
                color: 'white',
                paddingInline: 4,
              }}
            >
              {approvals.length}
            </div>
          )}
        </div>
        <button
          onClick={() => onNavigate('/phone')}
          className="text-[#C9A84C] text-[12px] flex items-center gap-0.5 font-semibold"
        >
          全部 <span><IconChevronRight /></span>
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {displayItems.slice(0, 3).map((item: any) => (
          <div
            key={item.id}
            onClick={() => onNavigate('/phone')}
            className="flex items-center gap-3 p-3.5 rounded-[18px] cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* 头像 */}
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold"
              style={{
                width: 44, height: 44,
                background: `${item.channelColor}20`,
                border: `1.5px solid ${item.channelColor}40`,
                color: item.channelColor,
              }}
            >
              {item.buyerName.charAt(0).toUpperCase()}
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-white text-[13px] font-semibold truncate">{item.buyerName}</span>
                <span className="text-[#5A5A72] text-[11px] flex-shrink-0 ml-2">{item.time}</span>
              </div>
              <p className="text-[#8B8B9E] text-[12px] truncate mb-1">{item.product}</p>
              <div className="flex items-center gap-2">
                {/* 渠道标签 */}
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${item.channelColor}15`,
                    color: item.channelColor,
                    border: `1px solid ${item.channelColor}25`,
                  }}
                >
                  {item.channel}
                </span>
                {/* 置信度 */}
                <span className="text-[#5A5A72] text-[10px]">{item.country}</span>
              </div>
            </div>

            {/* 置信度 + 箭头 */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: item.confidence >= 80 ? 'rgba(52,211,153,0.12)' : item.confidence >= 60 ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.12)',
                  color: item.confidence >= 80 ? '#34D399' : item.confidence >= 60 ? '#F59E0B' : '#94A3B8',
                }}
              >
                {item.confidence}%
              </div>
              <span style={{ color: '#3A3A52' }}><IconChevronRight /></span>
            </div>
          </div>
        ))}
      </div>

      {/* 审批按钮（当有真实审批数据时） */}
      {approvals.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {approvals.slice(0, 2).map((a: any) => (
            <div
              key={`approval-${a.id}`}
              className="p-4 rounded-[18px]"
              style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white text-[13px] font-bold">{a.buyerName || '客户'}</p>
                  <p className="text-[#5A5A72] text-[11px] mt-0.5">AI 草稿 · 等待审批</p>
                </div>
                <span className="text-[#F59E0B] text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  待审批
                </span>
              </div>
              <p className="text-[#8B8B9E] text-[12px] leading-relaxed line-clamp-2 mb-3">
                {a.draftContent || a.draft || '（草稿内容）'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(a.id)}
                  className="flex-1 py-2.5 rounded-2xl text-[12px] font-bold active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg, #C9A84C, #F5D07A)', color: '#0A0A0F' }}
                >
                  ✓ 批准发送
                </button>
                <button
                  onClick={() => onReject(a.id)}
                  className="flex-1 py-2.5 rounded-2xl text-[12px] font-semibold active:scale-95 transition-transform"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  ✗ 拒绝
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 渠道来源卡片 ──────────────────────────────────────────────────────────────
function ChannelSummary({ todayInq }: { todayInq: number }) {
  const channels = [
    { name: 'Alibaba', abbr: 'Ali', count: Math.max(todayInq > 0 ? Math.round(todayInq * 0.4) : 2, 0), replyRate: 85, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    { name: 'LinkedIn', abbr: 'In', count: Math.max(todayInq > 0 ? Math.round(todayInq * 0.25) : 1, 0), replyRate: 72, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
    { name: 'WhatsApp', abbr: 'WA', count: Math.max(todayInq > 0 ? Math.round(todayInq * 0.15) : 1, 0), replyRate: 91, color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
    { name: 'TikTok', abbr: 'TT', count: Math.max(todayInq > 0 ? Math.round(todayInq * 0.1) : 1, 0), replyRate: 45, color: '#F472B6', bg: 'rgba(244,114,182,0.1)' },
  ];

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white text-[15px] font-bold">渠道来源</span>
        <span className="text-[#5A5A72] text-[12px]">今日</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {channels.map(ch => (
          <div
            key={ch.name}
            className="flex flex-col items-center py-3 px-2 rounded-[18px] active:scale-95 transition-transform cursor-pointer"
            style={{
              background: ch.bg,
              border: `1px solid ${ch.color}25`,
            }}
          >
            {/* 渠道缩写 */}
            <div
              className="flex items-center justify-center rounded-xl mb-2 font-black text-[11px]"
              style={{
                width: 34, height: 34,
                background: `${ch.color}20`,
                color: ch.color,
                border: `1px solid ${ch.color}30`,
              }}
            >
              {ch.abbr}
            </div>
            <div className="text-[22px] font-black tabular-nums leading-none" style={{ color: ch.color }}>{ch.count}</div>
            <div className="text-[9px] text-[#5A5A72] mt-1 truncate w-full text-center">{ch.name}</div>
            {/* 回复率进度条 */}
            <div className="mt-2 w-full h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-0.5 rounded-full" style={{ width: `${ch.replyRate}%`, background: ch.color }} />
            </div>
            <span className="text-[9px] font-semibold mt-1" style={{ color: ch.color }}>{ch.replyRate}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 近7天趋势 ────────────────────────────────────────────────────────────────
function WeekTrendCard({ inqTrend, todayInq }: { inqTrend: number[]; todayInq: number }) {
  return (
    <div className="px-4">
      <BentoCard
        accentColor="rgba(255,255,255,0.03)"
        borderColor="rgba(255,255,255,0.07)"
        style={{ padding: '16px 18px 14px' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-white text-[14px] font-bold">近 7 天询盘趋势</span>
          <span className="text-[#34D399] text-[11px] font-bold">▲ 持续增长</span>
        </div>
        <div className="flex items-end gap-1.5" style={{ height: 52 }}>
          {inqTrend.map((v, i) => {
            const maxV = Math.max(...inqTrend, 1);
            const h = Math.max((v / maxV) * 44, 4);
            const days = ['一', '二', '三', '四', '五', '六', '日'];
            const isToday = i === inqTrend.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md" style={{
                  height: h,
                  background: isToday
                    ? 'linear-gradient(180deg, #C9A84C 0%, rgba(201,168,76,0.3) 100%)'
                    : 'rgba(255,255,255,0.09)',
                  boxShadow: isToday ? '0 0 10px rgba(201,168,76,0.35)' : 'none',
                }} />
                <span style={{ fontSize: 9, color: isToday ? '#C9A84C' : '#3A3A52', fontWeight: isToday ? 700 : 400 }}>周{days[i]}</span>
              </div>
            );
          })}
        </div>
      </BentoCard>
    </div>
  );
}

// ─── Screen 0: 首页（Home）────────────────────────────────────────────────────
function HomeScreen({
  data, approvals, onApprove, onReject, onNavigate, openclawData,
}: {
  data: any; approvals: any[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onNavigate: (path: string) => void;
  openclawData: any;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? '凌晨好' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${dayNames[now.getDay()]}`;

  const signals = data?.signals ?? null;
  const agent = data?.agent ?? null;
  const weekReport = data?.weekReport ?? null;

  const todayInq = signals?.newInquiries ?? 0;
  const unread = signals?.unread ?? 0;
  const aiOps = agent?.completedTasks ?? 0;
  const weekReplyRate = weekReport?.thisWeek?.replyRate ?? 78;
  const lastWeekInq = weekReport?.lastWeek?.inquiries ?? 0;

  const inqTrend = [lastWeekInq > 0 ? Math.round(lastWeekInq / 7) : 2, 3, 5, 4, 6, 4, todayInq || 5];

  return (
    <div
      className="relative flex flex-col h-full"
      style={{
        background: 'linear-gradient(180deg, #070710 0%, #0A0A18 100%)',
      }}
    >
      {/* 背景光晕 */}
      <div className="absolute pointer-events-none" style={{
        top: -60, left: '15%', width: 280, height: 280,
        background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 65%)',
        filter: 'blur(50px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        top: '30%', right: -40, width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 65%)',
        filter: 'blur(40px)',
      }} />

      {/* 状态栏 */}
      <StatusBar />

      {/* 顶部导航 */}
      <AppHeader
        greeting={greeting}
        dateStr={dateStr}
        unreadCount={unread + approvals.length}
        onNotification={() => onNavigate('/notifications')}
        onSettings={() => {}}
      />

      {/* 可滚动内容区 */}
      <div className="flex-1 overflow-y-auto scroll-area relative z-10" style={{ paddingBottom: 90 }}>
        <div className="flex flex-col gap-5 pb-4">

          {/* Hero Banner */}
          <HeroBanner
            todayInq={todayInq}
            unread={unread}
            aiOps={aiOps}
            weekReplyRate={weekReplyRate}
            data={data}
          />

          {/* 快捷功能 */}
          <QuickActions onNavigate={onNavigate} />

          {/* 待处理询盘 */}
          <PendingInquiriesList
            approvals={approvals}
            onApprove={onApprove}
            onReject={onReject}
            onNavigate={onNavigate}
          />

          {/* 数字员工状态 */}
          <AgentStatusCard
            data={data}
            openclawData={openclawData}
            onNavigate={onNavigate}
          />

          {/* 渠道来源 */}
          <ChannelSummary todayInq={todayInq} />

          {/* 趋势图 */}
          <WeekTrendCard inqTrend={inqTrend} todayInq={todayInq} />

        </div>
      </div>
    </div>
  );
}

// ─── Screen 1: Command Center ─────────────────────────────────────────────────
const PHASE_COLORS: Record<string, string> = {
  analyze: '#60A5FA',
  filter: '#A78BFA',
  execute: '#34D399',
  report: '#F59E0B',
};
const PHASE_ICONS: Record<string, string> = {
  analyze: '🔍',
  filter: '🎯',
  execute: '⚡',
  report: '📊',
};

function CommandScreen({ data, onBack, onNext }: { data: any; onBack: () => void; onNext: () => void }) {
  const [command, setCommand] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

      {/* 状态栏 */}
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-4 relative z-10">
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
              className="w-full py-3.5 text-sm mt-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
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
              className={`btn-gold w-full py-3.5 text-sm mt-3 font-bold active:scale-95 transition-transform ${(!command.trim() || sending) ? 'opacity-50' : 'glow-pulse'}`}
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

            <div className="space-y-2 mb-4">
              {labResult.steps.map((step, idx) => {
                const color = PHASE_COLORS[step.phase] ?? '#A0A0B0';
                const icon = PHASE_ICONS[step.phase] ?? '▶';
                const isActive = activeStep === step.id;
                return (
                  <div key={step.id}>
                    <button
                      onClick={() => setActiveStep(isActive ? null : step.id)}
                      className="w-full text-left rounded-xl p-3 transition-all active:scale-[0.98]"
                      style={{
                        background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? color + '40' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
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

            <div className="flex items-center justify-between p-3 rounded-xl" style={{
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.2)',
            }}>
              <div>
                <p className="text-[#A78BFA] text-xs font-semibold">预计消耗</p>
                <p className="text-[#F1F1F5] text-sm font-bold mt-0.5">{labResult.totalCredits} 积分 · {labResult.totalTime}</p>
              </div>
              <button
                onClick={handleSend}
                className="px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff' }}
              >
                确认执行
              </button>
            </div>
          </div>
        )}

        {/* 快捷指令 */}
        <div className="glass-card-elevated p-4 slide-up delay-200">
          <p className="text-[#A0A0B0] text-sm font-semibold mb-3">快捷指令</p>
          <div className="flex flex-col gap-2">
            {quickCommands.map((cmd, i) => (
              <button
                key={i}
                onClick={() => setCommand(cmd.text)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98]"
                style={{
                  background: command === cmd.text ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${command === cmd.text ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <span className="text-lg">{cmd.icon}</span>
                <span className="text-[#A0A0B0] text-sm">{cmd.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 最近指令 */}
        {recent.length > 0 && (
          <div className="glass-card-elevated p-4 mt-4 slide-up delay-300">
            <p className="text-[#A0A0B0] text-sm font-semibold mb-3">最近指令</p>
            <div className="flex flex-col gap-2">
              {recent.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setCommand(r)}
                  className="flex items-center gap-2 p-2.5 rounded-lg text-left active:scale-[0.98] transition-transform"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span className="text-[#6B6B80] text-xs">↩</span>
                  <span className="text-[#8B8B9E] text-xs truncate">{r}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Screen 2: Report Screen ──────────────────────────────────────────────────
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
    <div className="relative flex flex-col h-full overflow-hidden" style={{
      background: 'linear-gradient(180deg, #080812 0%, #0A0A18 100%)',
    }}>
      <div className="absolute pointer-events-none" style={{
        top: -60, left: '30%', width: 240, height: 240,
        background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 65%)',
        filter: 'blur(50px)',
      }} />

      {/* 状态栏 */}
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-4 relative z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-[#6B6B80] text-sm active:opacity-60 transition-opacity">
          <span>←</span>
          <span>指挥</span>
        </button>
        <h1 className="text-[#F1F1F5] text-base font-bold">经营周报</h1>
        <div style={{ width: 48 }} />
      </div>

      <div className="flex-1 scroll-area px-4 pb-28 relative z-10">
        {/* 本周 vs 上周 标题 */}
        {weekReport && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl" style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
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

// ─── 底部 Tab Bar（真实 APP 风格）────────────────────────────────────────────
function BottomTabBar({
  activeTab,
  onSelect,
  onNavigate,
  unreadCount,
}: {
  activeTab: number;
  onSelect: (i: number) => void;
  onNavigate?: (path: string) => void;
  unreadCount: number;
}) {
  const tabs = [
    {
      id: 0,
      label: '首页',
      activeColor: '#C9A84C',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#C9A84C' : 'none'} stroke={active ? '#C9A84C' : '#6B6B80'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 1,
      label: '指挥',
      activeColor: '#60A5FA',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#60A5FA' : 'none'} stroke={active ? '#60A5FA' : '#6B6B80'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      id: 'inquiry',
      label: '询盘',
      activeColor: '#EF4444',
      isCenter: true,
      icon: (active: boolean) => (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
    },
    {
      id: 2,
      label: '周报',
      activeColor: '#34D399',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#34D399' : 'none'} stroke={active ? '#34D399' : '#6B6B80'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: '我的',
      activeColor: '#A78BFA',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#A78BFA' : 'none'} stroke={active ? '#A78BFA' : '#6B6B80'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(8, 8, 16, 0.95)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      }}
    >
      <div className="flex items-end justify-around px-2 pt-2 pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isCenter = (tab as any).isCenter;
          const isInquiry = tab.id === 'inquiry';
          const isProfile = tab.id === 'profile';

          if (isCenter) {
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate?.('/phone')}
                className="flex flex-col items-center relative"
                style={{ marginBottom: 4 }}
              >
                {/* 中央突出按钮 */}
                <div
                  className="flex items-center justify-center rounded-full active:scale-90 transition-transform relative"
                  style={{
                    width: 52, height: 52,
                    background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
                    boxShadow: '0 4px 20px rgba(239,68,68,0.4), 0 2px 8px rgba(0,0,0,0.3)',
                    marginTop: -16,
                  }}
                >
                  {tab.icon(false)}
                  {/* 未读角标 */}
                  {unreadCount > 0 && (
                    <div
                      className="absolute flex items-center justify-center rounded-full"
                      style={{
                        top: -2, right: -2,
                        minWidth: 16, height: 16,
                        background: '#fff',
                        fontSize: 9,
                        fontWeight: 700,
                        color: '#EF4444',
                        paddingInline: 3,
                        boxShadow: '0 0 0 2px rgba(8,8,16,0.95)',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-1" style={{ color: '#F87171' }}>
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isProfile) {
                  // 个人中心暂未实现
                } else {
                  onSelect(tab.id as number);
                }
              }}
              className="flex flex-col items-center gap-1 min-w-[52px] py-1 active:scale-90 transition-transform"
            >
              {/* 图标 */}
              <div className="relative">
                {tab.icon(isActive)}
              </div>
              {/* 标签 */}
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? (tab as any).activeColor : '#6B6B80' }}
              >
                {tab.label}
              </span>
              {/* 激活指示器 */}
              {isActive && (
                <div
                  className="rounded-full"
                  style={{
                    width: 4, height: 4,
                    background: (tab as any).activeColor,
                    boxShadow: `0 0 6px ${(tab as any).activeColor}`,
                    marginTop: -2,
                  }}
                />
              )}
            </button>
          );
        })}
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
        top: 'calc(env(safe-area-inset-top, 0px) + 48px)',
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
  const [openclawData, setOpenclawData] = useState<any>(null);
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

  const fetchOpenclawData = useCallback(async () => {
    try {
      const res = await openclawApi.status();
      const instances = await multiAccountApi.getInstances();
      const instanceList = instances?.instances ?? [];
      const activeCount = instanceList.filter((i: any) =>
        ['online', 'working', 'active'].includes(i.status)
      ).length;
      setOpenclawData({
        status: res?.instance?.status ?? 'offline',
        instances: instanceList.length || 1,
        activeInstances: activeCount,
        opsToday: res?.instance?.opsToday ?? 0,
        opsLimit: res?.instance?.opsLimit ?? 200,
      });
    } catch (e) {
      setOpenclawData({ status: 'offline', instances: 0, activeInstances: 0, opsToday: 0, opsLimit: 200 });
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

  const unreadCount = (data?.signals?.unread ?? 0) + approvals.length;

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
        {/* Screen 0: 首页 */}
        <div style={{ width: '33.333%', height: '100dvh', flexShrink: 0 }}>
          <HomeScreen
            data={data}
            approvals={approvals}
            onApprove={handleApprove}
            onReject={handleReject}
            onNavigate={navigate}
            openclawData={openclawData}
          />
        </div>

        {/* Screen 1: 指挥台 */}
        <div style={{ width: '33.333%', height: '100dvh', flexShrink: 0 }}>
          <CommandScreen
            data={data}
            onBack={() => goToScreen(0)}
            onNext={() => goToScreen(2)}
          />
        </div>

        {/* Screen 2: 周报 */}
        <div style={{ width: '33.333%', height: '100dvh', flexShrink: 0 }}>
          <ReportScreen data={data} onBack={() => goToScreen(1)} />
        </div>
      </div>

      {/* 底部 Tab Bar */}
      <BottomTabBar
        activeTab={screen}
        onSelect={goToScreen}
        onNavigate={navigate}
        unreadCount={unreadCount}
      />
    </div>
  );
}
