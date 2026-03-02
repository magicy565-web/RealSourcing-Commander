/**
 * ProactiveCard — AI 主动建议卡片
 *
 * AI 根据数据波动（如 TikTok 流量骤降、询盘激增）主动在 Warroom 顶部
 * 推送"行动建议"卡片，帮助老板快速决策。
 *
 * 卡片类型：
 *   - alert:   紧急预警（红色）
 *   - insight: 数据洞察（蓝色）
 *   - action:  行动建议（紫色）
 *   - success: 正向反馈（绿色）
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticLight, hapticMedium } from '../lib/haptics';

export type ProactiveCardType = 'alert' | 'insight' | 'action' | 'success';

export interface ProactiveCardData {
  id: string;
  type: ProactiveCardType;
  title: string;
  body: string;
  cta?: string;
  platform?: string;
  metric?: { label: string; value: string; delta?: string; isNegative?: boolean };
  timestamp: Date;
}

const TYPE_CONFIG: Record<ProactiveCardType, {
  icon: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
}> = {
  alert: {
    icon: '⚡',
    color: '#F87171',
    bg: 'linear-gradient(135deg, rgba(248,113,113,0.12) 0%, rgba(239,68,68,0.06) 100%)',
    border: 'rgba(248,113,113,0.3)',
    glow: 'rgba(248,113,113,0.15)',
  },
  insight: {
    icon: '📊',
    color: '#60A5FA',
    bg: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(59,130,246,0.06) 100%)',
    border: 'rgba(96,165,250,0.3)',
    glow: 'rgba(96,165,250,0.12)',
  },
  action: {
    icon: '🎯',
    color: '#A78BFA',
    bg: 'linear-gradient(135deg, rgba(167,139,250,0.14) 0%, rgba(124,58,237,0.07) 100%)',
    border: 'rgba(167,139,250,0.3)',
    glow: 'rgba(124,58,237,0.15)',
  },
  success: {
    icon: '✅',
    color: '#34D399',
    bg: 'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(16,185,129,0.06) 100%)',
    border: 'rgba(52,211,153,0.3)',
    glow: 'rgba(16,185,129,0.12)',
  },
};

interface ProactiveCardProps {
  card: ProactiveCardData;
  onDismiss: (id: string) => void;
  onAction?: (id: string) => void;
}

export function ProactiveCard({ card, onDismiss, onAction }: ProactiveCardProps) {
  const cfg = TYPE_CONFIG[card.type];
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    hapticLight();
    setDismissed(true);
    setTimeout(() => onDismiss(card.id), 300);
  };

  const handleAction = () => {
    hapticMedium();
    onAction?.(card.id);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          layout
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.94, transition: { duration: 0.22 } }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{
            position: 'relative',
            borderRadius: 20,
            overflow: 'hidden',
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            boxShadow: `0 0 0 1px ${cfg.glow}, 0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
            padding: '14px 16px 14px',
          }}
        >
          {/* Animated glow pulse */}
          <motion.div
            aria-hidden
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: -30,
              right: -20,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
              filter: 'blur(20px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: `${cfg.color}18`,
                  border: `1px solid ${cfg.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {cfg.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: -0.3, lineHeight: 1.2 }}>
                    {card.title}
                  </div>
                  {card.platform && (
                    <div style={{ fontSize: 10, color: cfg.color, fontWeight: 600, marginTop: 1, letterSpacing: 0.3 }}>
                      {card.platform}
                    </div>
                  )}
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginLeft: 8,
                } as React.CSSProperties}
              >
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55, margin: '0 0 10px', fontWeight: 400 }}>
              {card.body}
            </p>

            {/* Metric badge */}
            {card.metric && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 50,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: 10,
              }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{card.metric.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>
                  {card.metric.value}
                </span>
                {card.metric.delta && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: card.metric.isNegative ? '#F87171' : '#34D399' }}>
                    {card.metric.delta}
                  </span>
                )}
              </div>
            )}

            {/* CTA */}
            {card.cta && (
              <button
                onClick={handleAction}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 50,
                  background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}14)`,
                  border: `1px solid ${cfg.color}40`,
                  cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, color: cfg.color,
                  letterSpacing: -0.2,
                } as React.CSSProperties}
              >
                {card.cta}
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M7 3l3 3-3 3" stroke={cfg.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── ProactiveCardStack — 管理多张建议卡片 ──────────────────────────
interface ProactiveCardStackProps {
  cards: ProactiveCardData[];
  onDismiss: (id: string) => void;
  onAction?: (id: string) => void;
}

export function ProactiveCardStack({ cards, onDismiss, onAction }: ProactiveCardStackProps) {
  if (cards.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AnimatePresence mode="popLayout">
        {cards.slice(0, 3).map(card => (
          <ProactiveCard
            key={card.id}
            card={card}
            onDismiss={onDismiss}
            onAction={onAction}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
