/**
 * ProactiveCardV6 — AI 主动决策卡片系统 (V6.0)
 *
 * 三种决策形态（对应战略文档 §3.2）：
 *   research  — 研究型决策（蓝色）：生成市场报告
 *   action    — 行动型决策（紫色）：触达线索/发布内容
 *   optimize  — 优化型决策（琥珀色）：优化素材/定价
 *
 * 交互模型：
 *   老板只需点击「确认」或「暂不」，AI 自动执行后续
 *   执行中展示实时进度流
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';

// ── 类型定义 ──────────────────────────────────────────────────
export type DecisionType = 'research' | 'action' | 'optimize' | 'alert' | 'insight' | 'success';

export interface DecisionMetric {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}

export interface DecisionStep {
  label: string;
  detail: string;
  status: 'pending' | 'running' | 'done';
  platform?: string;
}

export interface ProactiveCardV6Data {
  id: string;
  type: DecisionType;
  title: string;
  body: string;
  confirmLabel?: string;
  dismissLabel?: string;
  metrics?: DecisionMetric[];
  steps?: DecisionStep[];
  platform?: string;
  urgency?: 'low' | 'medium' | 'high';
  estimatedTime?: string;
  creditCost?: number;
  timestamp: Date;
  // 执行状态
  executionState?: 'idle' | 'running' | 'done';
  executionResult?: string;
}

// ── 设计 Token ────────────────────────────────────────────────
const TYPE_CONFIG: Record<DecisionType, {
  icon: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  label: string;
}> = {
  research: {
    icon: '🔬',
    color: '#60A5FA',
    bg: 'linear-gradient(135deg, rgba(96,165,250,0.10) 0%, rgba(59,130,246,0.05) 100%)',
    border: 'rgba(96,165,250,0.28)',
    glow: 'rgba(96,165,250,0.12)',
    label: '研究型决策',
  },
  action: {
    icon: '⚡',
    color: '#A78BFA',
    bg: 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(124,58,237,0.06) 100%)',
    border: 'rgba(167,139,250,0.28)',
    glow: 'rgba(124,58,237,0.14)',
    label: '行动型决策',
  },
  optimize: {
    icon: '✨',
    color: '#F59E0B',
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(217,119,6,0.05) 100%)',
    border: 'rgba(245,158,11,0.28)',
    glow: 'rgba(245,158,11,0.12)',
    label: '优化型决策',
  },
  alert: {
    icon: '🚨',
    color: '#F87171',
    bg: 'linear-gradient(135deg, rgba(248,113,113,0.10) 0%, rgba(239,68,68,0.05) 100%)',
    border: 'rgba(248,113,113,0.28)',
    glow: 'rgba(248,113,113,0.12)',
    label: '紧急预警',
  },
  insight: {
    icon: '📊',
    color: '#34D399',
    bg: 'linear-gradient(135deg, rgba(52,211,153,0.10) 0%, rgba(16,185,129,0.05) 100%)',
    border: 'rgba(52,211,153,0.28)',
    glow: 'rgba(52,211,153,0.12)',
    label: '数据洞察',
  },
  success: {
    icon: '🎉',
    color: '#34D399',
    bg: 'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(16,185,129,0.06) 100%)',
    border: 'rgba(52,211,153,0.3)',
    glow: 'rgba(16,185,129,0.12)',
    label: '正向反馈',
  },
};

const URGENCY_CONFIG = {
  low:    { label: '低优先级', color: 'rgba(255,255,255,0.3)' },
  medium: { label: '中优先级', color: '#F59E0B' },
  high:   { label: '高优先级', color: '#F87171' },
};

// ── 执行步骤列表 ──────────────────────────────────────────────
function ExecutionSteps({ steps }: { steps: DecisionStep[] }) {
  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
        >
          {/* 状态图标 */}
          <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: step.status === 'done' ? 'rgba(52,211,153,0.2)' : step.status === 'running' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${step.status === 'done' ? 'rgba(52,211,153,0.4)' : step.status === 'running' ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
            {step.status === 'done' ? (
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : step.status === 'running' ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M10 6a4 4 0 1 1-4-4" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </motion.div>
            ) : (
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}/>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: step.status === 'done' ? 'rgba(255,255,255,0.7)' : step.status === 'running' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', letterSpacing: -0.2 }}>{step.label}</div>
            {step.detail && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{step.detail}</div>}
          </div>
          {step.platform && (
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', padding: '2px 6px', borderRadius: 50, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>{step.platform}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── 指标徽章行 ────────────────────────────────────────────────
function MetricsRow({ metrics, color }: { metrics: DecisionMetric[]; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
      {metrics.map((m, i) => (
        <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 50, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{m.label}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>{m.value}</span>
          {m.delta && (
            <span style={{ fontSize: 10, fontWeight: 700, color: m.positive ? '#34D399' : '#F87171' }}>{m.delta}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── 单张决策卡片 ──────────────────────────────────────────────
interface ProactiveCardV6Props {
  card: ProactiveCardV6Data;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function ProactiveCardV6({ card, onConfirm, onDismiss }: ProactiveCardV6Props) {
  const cfg = TYPE_CONFIG[card.type];
  const urgencyCfg = card.urgency ? URGENCY_CONFIG[card.urgency] : null;
  const [localState, setLocalState] = useState<'idle' | 'running' | 'done'>(card.executionState ?? 'idle');
  const [steps, setSteps] = useState<DecisionStep[]>(card.steps ?? []);
  const [dismissed, setDismissed] = useState(false);

  // 模拟执行步骤动画
  const runSteps = () => {
    if (!steps.length) return;
    let i = 0;
    const advance = () => {
      if (i >= steps.length) {
        setLocalState('done');
        hapticSuccess();
        return;
      }
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
      setTimeout(() => {
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'done' } : s));
        i++;
        setTimeout(advance, 400);
      }, 800 + Math.random() * 600);
    };
    advance();
  };

  const handleConfirm = () => {
    hapticMedium();
    setLocalState('running');
    runSteps();
    onConfirm(card.id);
  };

  const handleDismiss = () => {
    hapticLight();
    setDismissed(true);
    setTimeout(() => onDismiss(card.id), 280);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          layout
          initial={{ opacity: 0, y: -18, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.93, transition: { duration: 0.22 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          style={{
            position: 'relative', borderRadius: 22, overflow: 'hidden',
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            boxShadow: `0 0 0 1px ${cfg.glow}, 0 20px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)`,
            padding: '16px 16px 14px',
          }}
        >
          {/* 背景光晕 */}
          <motion.div
            aria-hidden
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: -35, right: -20, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`, filter: 'blur(24px)', pointerEvents: 'none' }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* 顶部：类型标签 + 紧急度 + 关闭 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: `${cfg.color}18`, border: `1px solid ${cfg.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color, letterSpacing: 0.5 }}>{cfg.label}</span>
                    {urgencyCfg && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: urgencyCfg.color, letterSpacing: 0.3 }}>· {urgencyCfg.label}</span>
                    )}
                  </div>
                  {card.platform && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{card.platform}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {card.estimatedTime && (
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', padding: '2px 7px', borderRadius: 50, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>⏱ {card.estimatedTime}</div>
                )}
                {localState === 'idle' && (
                  <button onClick={handleDismiss} style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties}>
                    <svg width="7" height="7" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* 标题 */}
            <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: -0.4, lineHeight: 1.25, marginBottom: 7 }}>
              {card.title}
            </div>

            {/* 正文 */}
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 1.6, margin: '0 0 10px', fontWeight: 400 }}>
              {card.body}
            </p>

            {/* 指标 */}
            {card.metrics && card.metrics.length > 0 && (
              <MetricsRow metrics={card.metrics} color={cfg.color}/>
            )}

            {/* 执行步骤（运行中或完成后展示） */}
            <AnimatePresence>
              {(localState === 'running' || localState === 'done') && steps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginBottom: 10 }}
                >
                  <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <ExecutionSteps steps={steps}/>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 完成结果 */}
            <AnimatePresence>
              {localState === 'done' && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', marginBottom: 10 }}
                >
                  <div style={{ fontSize: 11.5, color: '#34D399', fontWeight: 700 }}>
                    ✓ {card.executionResult ?? 'AI 已完成执行，结果已同步到 Boss Warroom'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 操作按钮 */}
            {localState === 'idle' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleConfirm}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 50,
                    background: `linear-gradient(135deg, ${cfg.color}28, ${cfg.color}18)`,
                    border: `1px solid ${cfg.color}40`,
                    fontSize: 12.5, fontWeight: 800, color: cfg.color,
                    cursor: 'pointer', letterSpacing: -0.2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  } as React.CSSProperties}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  {card.confirmLabel ?? '确认执行'}
                  {card.creditCost && <span style={{ fontSize: 10, opacity: 0.7 }}>({card.creditCost} 积分)</span>}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleDismiss}
                  style={{
                    padding: '9px 16px', borderRadius: 50,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                  } as React.CSSProperties}
                >
                  {card.dismissLabel ?? '暂不'}
                </motion.button>
              </div>
            )}

            {/* 执行中状态 */}
            {localState === 'running' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 50, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </motion.div>
                <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>AI 正在执行...</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── 卡片堆栈 ──────────────────────────────────────────────────
interface ProactiveCardV6StackProps {
  cards: ProactiveCardV6Data[];
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function ProactiveCardV6Stack({ cards, onConfirm, onDismiss }: ProactiveCardV6StackProps) {
  if (cards.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AnimatePresence mode="popLayout">
        {cards.slice(0, 4).map(card => (
          <ProactiveCardV6
            key={card.id}
            card={card}
            onConfirm={onConfirm}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── 早晨简报组件 ──────────────────────────────────────────────
interface MorningBriefingProps {
  userName?: string;
  cards: ProactiveCardV6Data[];
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

export function MorningBriefing({ userName = '老板', cards, onConfirm, onDismiss, onClose }: MorningBriefingProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: 430, margin: '0 auto', width: '100%', padding: '60px 16px 100px' }}>

        {/* 问候语 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ textAlign: 'center', marginBottom: 28 }}
        >
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6 }}>
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: -0.8, marginBottom: 6 }}>
            {greeting}，{userName} 👋
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            AI 已完成今日市场扫描，为您准备了 <span style={{ color: '#A78BFA', fontWeight: 700 }}>{cards.length} 条</span> 决策建议
          </div>
        </motion.div>

        {/* 决策卡片列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <ProactiveCardV6
                card={card}
                onConfirm={onConfirm}
                onDismiss={onDismiss}
              />
            </motion.div>
          ))}
        </div>

        {/* 关闭按钮 */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { hapticLight(); onClose(); }}
          style={{
            width: '100%', marginTop: 20, padding: '14px', borderRadius: 18,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
          } as React.CSSProperties}
        >
          稍后再看
        </motion.button>
      </div>
    </motion.div>
  );
}
