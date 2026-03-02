/**
 * AppIcons — RealSourcing Commander 应用内图标系统
 *
 * 统一的 SVG 矢量图标库，所有图标遵循：
 * - 24×24 viewBox 标准
 * - 1.8px 描边宽度，圆角线帽
 * - 支持 size / color / strokeWidth 自定义
 * - 语义化命名，覆盖询盘、平台、操作、状态四大类别
 */

import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

const base = (size: number, color: string, sw: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

// ── 询盘 / 消息类 ──────────────────────────────────────────────────

export const IconInquiry = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    {/* 信封 + 询盘标志 */}
    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8"/>
    <rect x="3" y="6" width="18" height="13" rx="2"/>
    <circle cx="19" cy="5" r="3" fill={color} stroke="none"/>
    <path d="M19 3.5v1M19 5.5v.5" stroke="white" strokeWidth="1.2"/>
  </svg>
);

export const IconMessage = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

export const IconMessageUnread = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    <circle cx="18" cy="4" r="3" fill="#F87171" stroke="none"/>
  </svg>
);

export const IconReply = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <polyline points="9 17 4 12 9 7"/>
    <path d="M20 18v-2a4 4 0 00-4-4H4"/>
  </svg>
);

export const IconForward = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <polyline points="15 17 20 12 15 7"/>
    <path d="M4 18v-2a4 4 0 014-4h12"/>
  </svg>
);

// ── 用户 / 买家类 ──────────────────────────────────────────────────

export const IconBuyer = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export const IconCompany = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export const IconGlobe = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
);

// ── 状态 / 优先级类 ────────────────────────────────────────────────

export const IconUrgent = ({ size=20, color='#F87171', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export const IconCheckCircle = ({ size=20, color='#10B981', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

export const IconClock = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

export const IconStar = ({ size=20, color='#F59E0B', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// ── 操作类 ────────────────────────────────────────────────────────

export const IconFilter = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

export const IconSearch = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export const IconSort = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="15" y2="12"/>
    <line x1="3" y1="18" x2="9" y2="18"/>
  </svg>
);

export const IconMore = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <circle cx="12" cy="5" r="1" fill={color} stroke="none"/>
    <circle cx="12" cy="12" r="1" fill={color} stroke="none"/>
    <circle cx="12" cy="19" r="1" fill={color} stroke="none"/>
  </svg>
);

export const IconChevronRight = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export const IconChevronDown = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ── 数据 / 分析类 ─────────────────────────────────────────────────

export const IconTrending = ({ size=20, color='#10B981', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

export const IconTrendingDown = ({ size=20, color='#F87171', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
);

export const IconBarChart = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

// ── 产品 / 货物类 ─────────────────────────────────────────────────

export const IconPackage = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

export const IconTag = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

// ── 导航 / 标签页类 ───────────────────────────────────────────────

export const IconHome = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export const IconWarroom = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    {/* 指挥中心图标：雷达 + 中心点 */}
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2" fill={color} stroke="none"/>
    <line x1="12" y1="2" x2="12" y2="6"/>
    <line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="6" y2="12"/>
    <line x1="18" y1="12" x2="22" y2="12"/>
  </svg>
);

export const IconBento = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    {/* Bento Grid 图标 */}
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

export const IconAI = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z"/>
  </svg>
);

// ── 国旗 / 地区类（简化版）────────────────────────────────────────

export const IconFlag = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);

// ── 金融 / 货币类 ─────────────────────────────────────────────────

export const IconDollar = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
);

export const IconShipping = ({ size=20, color='currentColor', strokeWidth=1.8, style }: IconProps) => (
  <svg {...base(size, color, strokeWidth)} style={style}>
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
