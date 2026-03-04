/**
 * AgentIcons.tsx — RealSourcing Commander AI 全家桶图标系统
 *
 * 设计规范：
 * - 画布：32×32 viewBox，建议渲染尺寸 24-48px
 * - 风格：极简线性 + 单色填充，暗色背景优化
 * - 色彩：每个 Agent 有专属主色，背景为主色 15% 透明度圆角矩形
 * - 线条：strokeWidth 1.8，strokeLinecap="round"，strokeLinejoin="round"
 * - 特征：每个图标有一个"AI 激活"装饰元素（小圆点/闪光/脉冲环）
 *
 * 12 个 Agent 色彩系统：
 * 第一梯队（情报与流量）：
 *   01 线索猎手    #7C3AED 紫色
 *   02 爆款雷达    #F59E0B 琥珀
 *   03 选题助手    #10B981 翠绿
 * 第二梯队（内容生产）：
 *   04 数字分身    #3B82F6 蓝色
 *   05 全网分发    #EC4899 粉红
 *   06 私信客服    #06B6D4 青色
 * 第三梯队（线索转化）：
 *   07 邮件跟进    #8B5CF6 靛紫
 *   08 收单收款    #22C55E 绿色
 * 第四梯队（经营管理）：
 *   09 财务预算    #F97316 橙色
 *   10 物流管理    #64748B 石板灰
 *   11 阳光政务    #EAB308 金黄
 *   12 SEO优化师   #14B8A6 青绿
 */

import React from 'react';

interface IconProps {
  size?: number;
  /** 覆盖主色 */
  color?: string;
  /** 是否显示激活状态（脉冲动画） */
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// ─── 通用属性 ─────────────────────────────────────────────────
const BASE = {
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// ─── 01 线索猎手 (Leads Hunter) — 紫色 #7C3AED ────────────────
export function IconLeadsHunter({ size = 32, color = '#7C3AED', style }: IconProps) {
  const bg = `${color}20`;
  const stroke = color;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* 背景 */}
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 放大镜主体 */}
      <circle cx="14" cy="14" r="6" stroke={stroke} strokeWidth="1.8" {...BASE}/>
      {/* 放大镜手柄 */}
      <line x1="19" y1="19" x2="25" y2="25" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      {/* 内部十字（扫描感） */}
      <line x1="14" y1="11" x2="14" y2="17" stroke={`${color}80`} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="11" y1="14" x2="17" y2="14" stroke={`${color}80`} strokeWidth="1.4" strokeLinecap="round"/>
      {/* AI 激活点 */}
      <circle cx="25" cy="8" r="3.5" fill={color}/>
      <circle cx="25" cy="8" r="1.5" fill="white"/>
    </svg>
  );
}

// ─── 02 爆款雷达 (Trend Radar) — 琥珀 #F59E0B ─────────────────
export function IconTrendRadar({ size = 32, color = '#F59E0B', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 雷达同心圆 */}
      <circle cx="16" cy="17" r="10" stroke={`${color}25`} strokeWidth="1.2" {...BASE}/>
      <circle cx="16" cy="17" r="6.5" stroke={`${color}40`} strokeWidth="1.2" {...BASE}/>
      <circle cx="16" cy="17" r="3" stroke={`${color}70`} strokeWidth="1.4" {...BASE}/>
      {/* 雷达扫描线 */}
      <line x1="16" y1="17" x2="24" y2="9" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* 中心点 */}
      <circle cx="16" cy="17" r="1.5" fill={color}/>
      {/* 信号点（爆款命中） */}
      <circle cx="22" cy="11" r="2.2" fill={color}/>
      <circle cx="22" cy="11" r="4" stroke={color} strokeWidth="1" fill="none" opacity="0.5"/>
      {/* 顶部闪光 */}
      <path d="M16 4 L17.2 7 L16 6.5 L14.8 7 Z" fill={color}/>
    </svg>
  );
}

// ─── 03 选题助手 (Content Pilot) — 翠绿 #10B981 ───────────────
export function IconContentPilot({ size = 32, color = '#10B981', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 文档 */}
      <rect x="7" y="6" width="14" height="18" rx="3" stroke={color} strokeWidth="1.8" {...BASE}/>
      {/* 文字行 */}
      <line x1="10" y1="11" x2="18" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="15" x2="16" y2="15" stroke={`${color}80`} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="19" x2="14" y2="19" stroke={`${color}50`} strokeWidth="1.5" strokeLinecap="round"/>
      {/* AI 笔 */}
      <path d="M20 20 L26 14 L28 16 L22 22 Z" fill={color} opacity="0.9"/>
      <path d="M19.5 21.5 L21 20 L22 22 L19.5 21.5 Z" fill={color}/>
      {/* 笔尖闪光 */}
      <circle cx="27" cy="7" r="2.5" fill={color}/>
      <path d="M27 5 L27.8 7 L27 6.5 L26.2 7 Z" fill="white" opacity="0.8"/>
    </svg>
  );
}

// ─── 04 数字分身 (Digital Human) — 蓝色 #3B82F6 ──────────────
export function IconDigitalHuman({ size = 32, color = '#3B82F6', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 人形轮廓 */}
      <circle cx="16" cy="11" r="4.5" stroke={color} strokeWidth="1.8" {...BASE}/>
      <path d="M8 26 C8 20.5 11.6 17 16 17 C20.4 17 24 20.5 24 26" stroke={color} strokeWidth="1.8" {...BASE}/>
      {/* 数字化网格叠加 */}
      <circle cx="16" cy="11" r="4.5" stroke={`${color}30`} strokeWidth="3" strokeDasharray="2 2" {...BASE}/>
      {/* 右上角 AI 徽章 */}
      <circle cx="24" cy="8" r="4" fill={color}/>
      <text x="24" y="10.5" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="white" fontFamily="system-ui">AI</text>
      {/* 数字粒子 */}
      <circle cx="9" cy="19" r="1" fill={`${color}60`}/>
      <circle cx="23" cy="19" r="1" fill={`${color}60`}/>
      <circle cx="7" cy="23" r="0.8" fill={`${color}40`}/>
      <circle cx="25" cy="23" r="0.8" fill={`${color}40`}/>
    </svg>
  );
}

// ─── 05 全网分发 (Auto Poster) — 粉红 #EC4899 ─────────────────
export function IconAutoPoster({ size = 32, color = '#EC4899', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 中心发射节点 */}
      <circle cx="16" cy="16" r="3.5" fill={color}/>
      {/* 辐射连线 */}
      <line x1="16" y1="12.5" x2="16" y2="7" stroke={`${color}80`} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
      <line x1="19" y1="13.5" x2="24" y2="9" stroke={`${color}80`} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
      <line x1="19.5" y1="16" x2="25" y2="16" stroke={`${color}80`} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
      <line x1="19" y1="18.5" x2="24" y2="23" stroke={`${color}80`} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
      <line x1="16" y1="19.5" x2="16" y2="25" stroke={`${color}80`} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
      <line x1="13" y1="18.5" x2="8" y2="23" stroke={`${color}60`} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
      <line x1="12.5" y1="16" x2="7" y2="16" stroke={`${color}60`} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 1.5"/>
      {/* 平台节点 */}
      <circle cx="16" cy="6" r="2.5" fill={color} opacity="0.9"/>
      <circle cx="25" cy="8.5" r="2.5" fill={color} opacity="0.9"/>
      <circle cx="26" cy="16" r="2.5" fill={color} opacity="0.9"/>
      <circle cx="25" cy="23.5" r="2.5" fill={color} opacity="0.7"/>
      <circle cx="16" cy="26" r="2.5" fill={color} opacity="0.7"/>
      <circle cx="7" cy="23.5" r="2" fill={`${color}60`}/>
      <circle cx="6" cy="16" r="2" fill={`${color}60`}/>
    </svg>
  );
}

// ─── 06 私信客服 (DM Closer) — 青色 #06B6D4 ──────────────────
export function IconDMCloser({ size = 32, color = '#06B6D4', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 消息气泡 */}
      <path d="M5 9 C5 7.3 6.3 6 8 6 L24 6 C25.7 6 27 7.3 27 9 L27 19 C27 20.7 25.7 22 24 22 L12 22 L7 27 L7 22 L8 22 C6.3 22 5 20.7 5 19 Z" stroke={color} strokeWidth="1.8" {...BASE}/>
      {/* 打字指示点 */}
      <circle cx="11" cy="14.5" r="1.5" fill={color}/>
      <circle cx="16" cy="14.5" r="1.5" fill={color} opacity="0.7"/>
      <circle cx="21" cy="14.5" r="1.5" fill={color} opacity="0.4"/>
      {/* AI 激活徽章 */}
      <circle cx="25" cy="7" r="3.5" fill={color}/>
      <path d="M23.5 7 L24.5 5.5 L25.5 7 L24.5 8.5 Z" fill="white" opacity="0.9"/>
    </svg>
  );
}

// ─── 07 邮件跟进 (Email Follower) — 靛紫 #8B5CF6 ─────────────
export function IconEmailFollower({ size = 32, color = '#8B5CF6', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 信封 */}
      <rect x="5" y="9" width="22" height="16" rx="3" stroke={color} strokeWidth="1.8" {...BASE}/>
      {/* 信封折线 */}
      <path d="M5 12 L16 18 L27 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      {/* 右上角发送箭头 */}
      <circle cx="25" cy="8" r="4" fill={color}/>
      <path d="M23 8 L25.5 5.5 L28 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="25.5" y1="5.5" x2="25.5" y2="10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ─── 08 收单收款 (Payment Pilot) — 绿色 #22C55E ──────────────
export function IconPaymentPilot({ size = 32, color = '#22C55E', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 信用卡 */}
      <rect x="5" y="9" width="22" height="15" rx="3.5" stroke={color} strokeWidth="1.8" {...BASE}/>
      {/* 磁条 */}
      <rect x="5" y="13" width="22" height="4" fill={`${color}30`}/>
      {/* 芯片 */}
      <rect x="8" y="18" width="6" height="4" rx="1.5" stroke={color} strokeWidth="1.4" {...BASE}/>
      {/* 无线支付波纹 */}
      <path d="M20 17 C21 16 21 18 20 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M22 15.5 C24 14 24 20 22 20.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>
      {/* 成功勾 */}
      <circle cx="25" cy="8" r="3.5" fill={color}/>
      <path d="M23.2 8 L24.5 9.3 L26.8 6.7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// ─── 09 财务预算 (Finance Pilot) — 橙色 #F97316 ──────────────
export function IconFinancePilot({ size = 32, color = '#F97316', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 折线图 */}
      <polyline points="5,23 10,18 14,20 19,12 24,15 27,9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* 数据点 */}
      <circle cx="10" cy="18" r="2" fill={color}/>
      <circle cx="14" cy="20" r="2" fill={color} opacity="0.7"/>
      <circle cx="19" cy="12" r="2.5" fill={color}/>
      <circle cx="24" cy="15" r="2" fill={color} opacity="0.7"/>
      {/* 坐标轴 */}
      <line x1="5" y1="25" x2="28" y2="25" stroke={`${color}40`} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="5" y1="7" x2="5" y2="25" stroke={`${color}40`} strokeWidth="1.2" strokeLinecap="round"/>
      {/* 上升箭头 */}
      <circle cx="25" cy="7" r="3.5" fill={color}/>
      <path d="M23.5 8.5 L25 6 L26.5 8.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// ─── 10 物流管理 (Logistics Sentinel) — 石板灰 #64748B ────────
export function IconLogisticsSentinel({ size = 32, color = '#64748B', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 货箱 */}
      <rect x="6" y="10" width="14" height="14" rx="2.5" stroke={color} strokeWidth="1.8" {...BASE}/>
      {/* 箱子封条 */}
      <line x1="13" y1="10" x2="13" y2="24" stroke={`${color}60`} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="6" y1="17" x2="20" y2="17" stroke={`${color}60`} strokeWidth="1.4" strokeLinecap="round"/>
      {/* 运输箭头 */}
      <path d="M20 16 L26 16 L24 13 M26 16 L24 19" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* 定位 pin */}
      <circle cx="25" cy="8" r="3.5" fill={color}/>
      <path d="M25 5.5 C23.3 5.5 22 6.8 22 8.5 C22 10.5 25 13 25 13 C25 13 28 10.5 28 8.5 C28 6.8 26.7 5.5 25 5.5 Z" fill={color} opacity="0" />
      <circle cx="25" cy="8.5" r="1.2" fill="white"/>
    </svg>
  );
}

// ─── 11 阳光政务 (Gov Compliance) — 金黄 #EAB308 ─────────────
export function IconGovCompliance({ size = 32, color = '#EAB308', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 盾牌 */}
      <path d="M16 5 L26 9 L26 17 C26 22 21 26 16 28 C11 26 6 22 6 17 L6 9 Z" stroke={color} strokeWidth="1.8" {...BASE}/>
      {/* 盾牌内勾选 */}
      <path d="M11 16 L14.5 19.5 L21 13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* 顶部星章 */}
      <circle cx="25" cy="7" r="3.5" fill={color}/>
      <path d="M25 4.5 L25.6 6.3 L27.5 6.3 L26 7.4 L26.6 9.2 L25 8.1 L23.4 9.2 L24 7.4 L22.5 6.3 L24.4 6.3 Z" fill="white" opacity="0.9"/>
    </svg>
  );
}

// ─── 12 SEO 优化师 (SEO Optimizer) — 青绿 #14B8A6 ────────────
export function IconSEOOptimizer({ size = 32, color = '#14B8A6', style }: IconProps) {
  const bg = `${color}20`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill={bg} stroke={`${color}40`} strokeWidth="1"/>
      {/* 搜索引擎框 */}
      <rect x="5" y="7" width="22" height="6" rx="3" stroke={color} strokeWidth="1.8" {...BASE}/>
      {/* 搜索框内文字线 */}
      <line x1="8" y1="10" x2="20" y2="10" stroke={`${color}60`} strokeWidth="1.4" strokeLinecap="round"/>
      {/* 搜索按钮 */}
      <circle cx="23" cy="10" r="2" fill={color}/>
      {/* 排名条形 */}
      <rect x="5" y="17" width="16" height="2.5" rx="1.2" fill={color}/>
      <rect x="5" y="21" width="11" height="2.5" rx="1.2" fill={`${color}70`}/>
      <rect x="5" y="25" width="7" height="2.5" rx="1.2" fill={`${color}40`}/>
      {/* 排名数字 */}
      <text x="23" y="19.5" fontSize="6.5" fontWeight="800" fill={color} fontFamily="system-ui" textAnchor="middle">#1</text>
      {/* 上升箭头 */}
      <circle cx="27" cy="8" r="3" fill={color}/>
      <path d="M25.8 9 L27 7 L28.2 9" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// ─── 图标映射表（按 Agent type 索引） ─────────────────────────
export const AGENT_ICON_MAP: Record<string, {
  component: React.ComponentType<IconProps>;
  color: string;
  label: string;
  tier: 1 | 2 | 3 | 4;
}> = {
  leads_hunter:       { component: IconLeadsHunter,       color: '#7C3AED', label: '线索猎手',   tier: 1 },
  trend_radar:        { component: IconTrendRadar,         color: '#F59E0B', label: '爆款雷达',   tier: 1 },
  content_pilot:      { component: IconContentPilot,       color: '#10B981', label: '选题助手',   tier: 1 },
  digital_human:      { component: IconDigitalHuman,       color: '#3B82F6', label: '数字分身',   tier: 2 },
  auto_poster:        { component: IconAutoPoster,         color: '#EC4899', label: '全网分发',   tier: 2 },
  dm_closer:          { component: IconDMCloser,           color: '#06B6D4', label: '私信客服',   tier: 2 },
  email_follower:     { component: IconEmailFollower,      color: '#8B5CF6', label: '邮件跟进',   tier: 3 },
  payment_pilot:      { component: IconPaymentPilot,       color: '#22C55E', label: '收单收款',   tier: 3 },
  finance_pilot:      { component: IconFinancePilot,       color: '#F97316', label: '财务预算',   tier: 4 },
  logistics_sentinel: { component: IconLogisticsSentinel,  color: '#64748B', label: '物流管理',   tier: 4 },
  gov_compliance:     { component: IconGovCompliance,      color: '#EAB308', label: '阳光政务',   tier: 4 },
  seo_optimizer:      { component: IconSEOOptimizer,       color: '#14B8A6', label: 'SEO优化师',  tier: 4 },
};

// ─── 通用 Agent 图标渲染器 ────────────────────────────────────
export function AgentIcon({ type, size = 32, style }: { type: string; size?: number; style?: React.CSSProperties }) {
  const meta = AGENT_ICON_MAP[type];
  if (!meta) {
    // 未知类型：默认灰色机器人图标
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
        <rect x="2" y="2" width="28" height="28" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
        <rect x="9" y="10" width="14" height="14" rx="3" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8"/>
        <circle cx="13" cy="15" r="1.5" fill="rgba(255,255,255,0.4)"/>
        <circle cx="19" cy="15" r="1.5" fill="rgba(255,255,255,0.4)"/>
        <line x1="13" y1="19" x2="19" y2="19" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="13" y="7" width="6" height="3" rx="1.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4"/>
        <line x1="16" y1="7" x2="16" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4"/>
      </svg>
    );
  }
  const IconComponent = meta.component;
  return <IconComponent size={size} color={meta.color} style={style} />;
}

// ─── 梯队颜色配置 ─────────────────────────────────────────────
export const TIER_CONFIG = {
  1: { label: '第一梯队', sublabel: '情报与流量', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  2: { label: '第二梯队', sublabel: '内容生产',   color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  3: { label: '第三梯队', sublabel: '线索转化',   color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  4: { label: '第四梯队', sublabel: '经营管理',   color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
};
