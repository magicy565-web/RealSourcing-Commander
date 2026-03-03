/**
 * SocialHostingLanding — 社媒托管"解锁式"转化落地页
 * v2: 全数据卡片化，用数字代替文字段落
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticMedium, hapticSuccess, hapticSelection } from '../lib/haptics';

// ── Design tokens ──────────────────────────────────────────────────
const C = {
  bg:    '#000000',
  P:     '#7C3AED',
  PL:    '#A78BFA',
  t1:    'rgba(255,255,255,0.92)',
  t2:    'rgba(255,255,255,0.52)',
  t3:    'rgba(255,255,255,0.28)',
  green: '#10B981',
  red:   '#F87171',
  amber: '#F59E0B',
  blue:  '#60A5FA',
};

const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 420, damping: 28 };
const SPRING_BOUNCY = { type: 'spring' as const, stiffness: 380, damping: 22 };
const SPRING_GENTLE = { type: 'spring' as const, stiffness: 260, damping: 30 };

// ── 平台配置 ──────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<string, {
  name: string; sub: string; color: string; bg: string;
  glowA: string; glowB: string;
  hiddenCount: number; waitingHours: number;
  estimatedValue: string; urgentTip: string;
  ctaPath: string;
  // TikTok 专属数据
  commentRate: string;    // 评论询价率
  avgWaitLoss: string;    // 平均等待流失率
  dailyViews: string;     // 日均播放量
  conversionNow: string;  // 当前转化率
  aiLogs: { time: string; action: string; tag: string; tagColor: string }[];
}> = {
  tiktok: {
    name: 'TikTok',
    sub: '抖音 · Douyin',
    color: '#FE2C55',
    bg: 'linear-gradient(160deg, #1a0508 0%, #0C0C0C 100%)',
    glowA: 'rgba(0,242,234,0.15)',
    glowB: 'rgba(255,0,80,0.12)',
    hiddenCount: 14,
    waitingHours: 2,
    estimatedValue: '$8,600+',
    urgentTip: '预计 2 小时后买家将转向竞对',
    ctaPath: '/tiktok',
    commentRate: '3.2%',
    avgWaitLoss: '68%',
    dailyViews: '12,400',
    conversionNow: '0.3%',
    aiLogs: [
      { time: '09:12', action: 'AI 识别到 @john_buyer 评论 "Price?" 并秒级回复', tag: '已捕获', tagColor: C.green },
      { time: '09:15', action: 'AI 向 5 位高意向用户主动发起 DM 触达', tag: '主动出击', tagColor: '#60A5FA' },
      { time: '09:28', action: 'AI 为询盘 #INQ-047 自动生成含 MOQ 的报价草稿', tag: '自动报价', tagColor: '#F59E0B' },
      { time: '09:41', action: 'AI 跟进 3 小时未回复的买家，发送催单消息', tag: '智能跟进', tagColor: '#A78BFA' },
    ],
  },
  facebook: {
    name: 'Meta',
    sub: 'Meta · Facebook',
    color: '#0064E0',
    bg: 'linear-gradient(160deg, #020a1a 0%, #071020 100%)',
    glowA: 'rgba(0,100,224,0.18)',
    glowB: 'rgba(0,180,255,0.12)',
    hiddenCount: 3,
    waitingHours: 6,
    estimatedValue: '$12,400+',
    urgentTip: '非工作时间无人响应，买家已等待 6 小时',
    ctaPath: '/facebook',
    commentRate: '2.1%',
    avgWaitLoss: '74%',
    dailyViews: '8,200',
    conversionNow: '0.4%',
    aiLogs: [
      { time: '02:34', action: 'AI 在深夜回复私信买家，避免流失', tag: '24h响应', tagColor: C.green },
      { time: '08:15', action: 'AI 向目标行业群组发起主动触达', tag: '主动出击', tagColor: '#60A5FA' },
      { time: '10:22', action: 'AI 自动回复 Messenger 询盘并推送产品册', tag: '自动报价', tagColor: '#F59E0B' },
    ],
  },
  linkedin: {
    name: 'LinkedIn',
    sub: '领英 · LinkedIn',
    color: '#0A66C2',
    bg: 'linear-gradient(160deg, #020d1c 0%, #040E1A 100%)',
    glowA: 'rgba(10,102,194,0.2)',
    glowB: 'rgba(56,168,255,0.12)',
    hiddenCount: 20,
    waitingHours: 12,
    estimatedValue: '$45,000+',
    urgentTip: '采购经理已读未回，商机窗口正在关闭',
    ctaPath: '/linkedin',
    commentRate: '4.8%',
    avgWaitLoss: '81%',
    dailyViews: '3,600',
    conversionNow: '0.6%',
    aiLogs: [
      { time: '09:05', action: 'AI 向 12 位采购经理发送个性化 InMail', tag: '精准触达', tagColor: C.green },
      { time: '10:30', action: 'AI 跟进已读未回的采购经理，发送案例资料', tag: '智能跟进', tagColor: '#A78BFA' },
      { time: '11:45', action: 'AI 为高意向线索生成定制化合作提案', tag: '自动提案', tagColor: '#F59E0B' },
    ],
  },
  openclaw: {
    name: 'Shopify',
    sub: 'Shopify · 独立站',
    color: '#96BF48',
    bg: 'linear-gradient(160deg, #0a1503 0%, #091305 100%)',
    glowA: 'rgba(150,191,72,0.15)',
    glowB: 'rgba(94,142,62,0.1)',
    hiddenCount: 7,
    waitingHours: 3,
    estimatedValue: '$5,200+',
    urgentTip: '7 个购物车已放弃，买家正在流失',
    ctaPath: '/openclaw',
    commentRate: '5.6%',
    avgWaitLoss: '62%',
    dailyViews: '5,800',
    conversionNow: '1.2%',
    aiLogs: [
      { time: '14:22', action: 'AI 识别弃单买家并发送挽回邮件', tag: '挽回弃单', tagColor: C.green },
      { time: '15:10', action: 'AI 向高意向访客推送限时优惠', tag: '智能促单', tagColor: '#F59E0B' },
      { time: '16:05', action: 'AI 自动跟进 3 天未付款的询盘', tag: '智能跟进', tagColor: '#A78BFA' },
    ],
  },
};

// ── 噪声纹理 ──────────────────────────────────────────────────────
const Noise = () => (
  <svg aria-hidden style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.025, pointerEvents:'none', zIndex:1, borderRadius:'inherit' }}>
    <filter id="lnz2">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#lnz2)"/>
  </svg>
);

// ── 流失倒计时 hook ───────────────────────────────────────────────
function useLeakTimer(initialSeconds: number) {
  const [secs, setSecs] = useState(initialSeconds);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── 计数动画 hook ─────────────────────────────────────────────────
function useCounter(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0, start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// ── 竞对动态滚动条 ────────────────────────────────────────────────
const COMPETITOR_EVENTS = [
  '同行 A 刚通过 AI 托管解锁了 3 条新询盘',
  '来自德国的买家刚刚转向了竞争对手',
  '同行 B 的 AI 在 30 秒内回复了 TikTok 询价',
  '同行 C 今日已通过 AI 触达 87 位采购经理',
  '来自美国的买家因等待超时已关闭对话',
  '同行 D 通过 AI 托管本周新增询盘 23 条',
];

function CompetitorTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % COMPETITOR_EVENTS.length), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)', overflow: 'hidden' }}>
      <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
        style={{ width: 6, height: 6, borderRadius: '50%', background: C.red, flexShrink: 0, boxShadow: `0 0 6px ${C.red}` }}/>
      <AnimatePresence mode="wait">
        <motion.span key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING_SNAPPY}
          style={{ fontSize: 11, color: 'rgba(248,113,113,0.8)', fontWeight: 500, lineHeight: 1.4 }}>
          {COMPETITOR_EVENTS[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ── 模糊买家行 ────────────────────────────────────────────────────
function BlurredRow({ delay = 0, width = '70%' }: { delay?: number; width?: string }) {
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING_GENTLE, delay }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.08)', filter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.06)' }}/>
      <div style={{ flex: 1 }}>
        <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.13)', width, filter: 'blur(3.5px)', marginBottom: 5 }}/>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', width: '45%', filter: 'blur(2.5px)' }}/>
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </motion.div>
  );
}

// ── 痛点数据卡片（大数字版）────────────────────────────────────────
function PainDataCard({ bigNum, unit, label, sublabel, icon, color, delay = 0 }: {
  bigNum: string; unit?: string; label: string; sublabel: string;
  icon: React.ReactNode; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_GENTLE, delay }}
      style={{ borderRadius: 18, padding: '16px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}
    >
      {/* 左侧色条 */}
      <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: '0 3px 3px 0', background: color }}/>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingLeft: 10 }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1.5, fontVariantNumeric: 'tabular-nums', color, lineHeight: 1 }}>{bigNum}</span>
            {unit && <span style={{ fontSize: 13, fontWeight: 700, color: `${color}99` }}>{unit}</span>}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.5 }}>{sublabel}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ── 前后对比卡片（双列）────────────────────────────────────────────
function BeforeAfterCard({ label, before, beforeSub, after, afterSub, color, delay = 0 }: {
  label: string; before: string; beforeSub: string; after: string; afterSub: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_GENTLE, delay }}
      style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* 标题行 */}
      <div style={{ padding: '10px 14px 8px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: 0.3 }}>{label}</span>
      </div>
      {/* 对比行 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* 托管前 */}
        <div style={{ padding: '14px 14px', background: 'rgba(248,113,113,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 9, color: C.red, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6, opacity: 0.8 }}>托管前</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.red, letterSpacing: -0.8, fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 4 }}>{before}</div>
          <div style={{ fontSize: 10, color: 'rgba(248,113,113,0.5)', lineHeight: 1.4 }}>{beforeSub}</div>
        </div>
        {/* 托管后 */}
        <div style={{ padding: '14px 14px', background: `${color}0a` }}>
          <div style={{ fontSize: 9, color, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6, opacity: 0.8 }}>托管后</div>
          <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: -0.8, fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 4 }}>{after}</div>
          <div style={{ fontSize: 10, color: `${color}88`, lineHeight: 1.4 }}>{afterSub}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ── AI 能力卡片 ───────────────────────────────────────────────────
function AiCapCard({ icon, title, metric, metricLabel, desc, color, delay = 0 }: {
  icon: React.ReactNode; title: string; metric: string; metricLabel: string; desc: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING_BOUNCY, delay }}
      style={{ borderRadius: 18, padding: '14px 14px', background: `${color}0d`, border: `1px solid ${color}22` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1 }}>{metric}</span>
        <span style={{ fontSize: 11, color: `${color}88`, fontWeight: 600 }}>{metricLabel}</span>
      </div>
      <div style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.5 }}>{desc}</div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
interface SocialHostingLandingProps {
  platform?: string;
  onBack?: () => void;
}

export default function SocialHostingLanding({ platform = 'tiktok', onBack }: SocialHostingLandingProps) {
  const [, navigate] = useLocation();
  const cfg = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG.tiktok;
  const [ctaPressed, setCtaPressed] = useState(false);
  const timerStr = useLeakTimer(cfg.waitingHours * 3600 + 1247);
  const leakCount = useCounter(cfg.hiddenCount, 1800);

  const handleBack = () => {
    hapticSelection();
    if (onBack) onBack();
    else navigate('/boss-warroom');
  };

  const handleUnlock = () => {
    hapticSuccess();
    setCtaPressed(true);
    setTimeout(() => navigate(cfg.ctaPath), 400);
  };

  return (
    <div style={{
      height: '100dvh',
      background: C.bg,
      overflowX: 'hidden',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch' as any,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
      color: C.t1,
      position: 'relative',
    }}>
      {/* ── 全局环境光 ── */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, left: '-20%', width: '80%', height: 400, background: `radial-gradient(ellipse, ${cfg.glowA} 0%, transparent 65%)`, filter: 'blur(60px)' }}/>
        <div style={{ position: 'absolute', bottom: -80, right: '-15%', width: '70%', height: 350, background: `radial-gradient(ellipse, ${cfg.glowB} 0%, transparent 65%)`, filter: 'blur(55px)' }}/>
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: '60%', height: 300, background: 'radial-gradient(ellipse, rgba(124,58,237,0.06) 0%, transparent 65%)', filter: 'blur(50px)' }}/>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '0 0 48px' }}>

        {/* ── 顶部导航栏 ── */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px 0', gap: 12 }}>
          <motion.button whileTap={{ scale: 0.88 }} transition={SPRING_SNAPPY} onClick={handleBack}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.t1} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </motion.button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>解锁 {cfg.name} 托管</div>
            <div style={{ fontSize: 10.5, color: C.t3, marginTop: 1 }}>{cfg.sub}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: C.t3, marginBottom: 2 }}>商机流失倒计时</div>
            <motion.div animate={{ color: [C.red, 'rgba(255,100,100,0.6)', C.red] }} transition={{ duration: 1, repeat: Infinity }}
              style={{ fontSize: 15, fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>
              {timerStr}
            </motion.div>
          </div>
        </div>

        {/* ── HERO：锁定的商机池 ── */}
        <div style={{ padding: '20px 16px 0' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_GENTLE, delay: 0.1 }}
            style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', background: cfg.bg, border: `1px solid rgba(248,113,113,0.2)`, boxShadow: `0 24px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)`, padding: '18px 16px 16px' }}>
            <Noise/>
            <div aria-hidden style={{ position:'absolute', top:-40, left:-20, width:180, height:180, borderRadius:'50%', background:`radial-gradient(circle, ${cfg.glowA} 0%, transparent 65%)`, filter:'blur(30px)', pointerEvents:'none', zIndex:0 }}/>
            <div aria-hidden style={{ position:'absolute', bottom:-30, right:-10, width:150, height:150, borderRadius:'50%', background:`radial-gradient(circle, ${cfg.glowB} 0%, transparent 65%)`, filter:'blur(25px)', pointerEvents:'none', zIndex:0 }}/>

            <div style={{ position: 'relative', zIndex: 2 }}>
              {/* 头部 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.t1, letterSpacing: -0.5 }}>{cfg.name}</div>
                  <div style={{ fontSize: 10, color: C.t3, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 1 }}>{cfg.sub}</div>
                </div>
                <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.2, repeat: Infinity }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 50, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.red }}>未托管</span>
                </motion.div>
              </div>

              {/* 流失警告 */}
              <motion.div animate={{ borderColor: ['rgba(248,113,113,0.18)', 'rgba(248,113,113,0.38)', 'rgba(248,113,113,0.18)'] }} transition={{ duration: 2.4, repeat: Infinity }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 14, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', marginBottom: 14 }}>
                <motion.div animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ flexShrink: 0, marginTop: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </motion.div>
                <div>
                  <span style={{ fontSize: 11.5, color: 'rgba(248,113,113,0.9)', lineHeight: 1.55, fontWeight: 500 }}>
                    AI 监控到 <span style={{ fontWeight: 900, color: C.red }}>{leakCount} 条</span>高意向询价，已等待 <span style={{ fontWeight: 900, color: C.red }}>{cfg.waitingHours}h</span>，无人响应中
                  </span>
                  <div style={{ fontSize: 10, color: 'rgba(248,113,113,0.55)', marginTop: 3 }}>{cfg.urgentTip}</div>
                </div>
              </motion.div>

              {/* 模糊商机池 */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: C.t3, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>商机池（已锁定）</div>
                <BlurredRow delay={0.2} width="75%"/>
                <BlurredRow delay={0.3} width="62%"/>
                <BlurredRow delay={0.4} width="82%"/>
                <div aria-hidden style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))', pointerEvents: 'none' }}/>
              </div>

              {/* 估值 + 进度条 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 9.5, color: C.t3, fontWeight: 500, marginBottom: 3 }}>待解锁询盘估值</div>
                  <motion.span animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 2.8, repeat: Infinity }}
                    style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1.5, fontVariantNumeric: 'tabular-nums', background: `linear-gradient(135deg, ${cfg.color} 30%, ${cfg.color}88)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 0 10px ${cfg.color}66)`, display: 'block' }}>
                    {cfg.estimatedValue}
                  </motion.span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: C.t3, marginBottom: 4 }}>商机捕获率</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 3 }}>
                    <div style={{ width: 64, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <div style={{ width: '0%', height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})` }}/>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 900, color: C.red }}>0%</span>
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>沉睡状态</div>
                </div>
              </div>

              {/* 竞对滚动条 */}
              <CompetitorTicker/>
            </div>
          </motion.div>
        </div>

        {/* ════════════════════════════════════════════════════════
            SECTION 1：痛点数据卡片（3 张大数字卡）
        ════════════════════════════════════════════════════════ */}
        <div style={{ padding: '28px 16px 0' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_GENTLE, delay: 0.2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>您正在流失什么？</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.t1, letterSpacing: -0.7, lineHeight: 1.3, marginBottom: 16 }}>每条未回复的询价<br/>都是流向竞对的订单</div>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 卡片 1：无响应时长 */}
            <PainDataCard
              delay={0.25}
              bigNum={`${cfg.waitingHours}h`}
              label="买家平均等待时长"
              sublabel={`您的 ${cfg.name} 评论区有 "Price?" "MOQ?" 等询价，已无人响应超过 ${cfg.waitingHours} 小时`}
              color={C.red}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              }
            />
            {/* 卡片 2：流失率 */}
            <PainDataCard
              delay={0.33}
              bigNum={cfg.avgWaitLoss}
              label="超时买家流失率"
              sublabel="等待超过 1 小时未收到回复的买家，有 68% 会转向竞争对手，不再回头"
              color={C.amber}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                </svg>
              }
            />
            {/* 卡片 3：当前转化率 */}
            <PainDataCard
              delay={0.41}
              bigNum={cfg.conversionNow}
              label="当前社媒转化率"
              sublabel={`日均 ${cfg.dailyViews} 次播放，仅 ${cfg.commentRate} 的用户询价，但几乎全部流失——手动运营无法覆盖`}
              color={C.blue}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              }
            />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            SECTION 2：前后对比数据卡片（4 张双列卡）
        ════════════════════════════════════════════════════════ */}
        <div style={{ padding: '28px 16px 0' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_GENTLE, delay: 0.35 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>开通后的确定性增长</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.t1, letterSpacing: -0.7, lineHeight: 1.3, marginBottom: 16 }}>不是功能，是<br/>一台永不下班的询盘机器</div>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BeforeAfterCard
              delay={0.4}
              label="询盘捕获率"
              before="~30%"   beforeSub="大量询价无人处理，漏单严重"
              after=">95%"    afterSub="秒级响应，几乎零漏单"
              color={C.green}
            />
            <BeforeAfterCard
              delay={0.47}
              label="平均回盘时间"
              before="4-12h"  beforeSub="深夜询价等到天亮才有人看"
              after="< 2min"  afterSub="AI 7×24h 秒级回复，买家不等待"
              color={C.blue}
            />
            <BeforeAfterCard
              delay={0.54}
              label="每日主动触达量"
              before="5-10人" beforeSub="人工维护精力有限，覆盖面窄"
              after="50-100人" afterSub="AI 并发触达，10× 扩大漏斗顶部"
              color={C.amber}
            />
            <BeforeAfterCard
              delay={0.61}
              label="运营人力成本"
              before="≈8k/月" beforeSub="1 名专职运营，还无法保证质量"
              after="0 人力"  afterSub="AI 全自动，每年节省 10w+ 人力"
              color={C.PL}
            />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            SECTION 3：AI 能力数据卡片（3 张）
        ════════════════════════════════════════════════════════ */}
        <div style={{ padding: '28px 16px 0' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_GENTLE, delay: 0.5 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>开通后，AI 为您做什么</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.t1, letterSpacing: -0.7, lineHeight: 1.3, marginBottom: 16 }}>3 项核心能力<br/>覆盖询盘全链路</div>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AiCapCard
              delay={0.55}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
              title="评论区 / 私信 秒级捕获"
              metric="< 30"
              metricLabel="秒响应"
              desc={`AI 24h 监控 ${cfg.name} 评论区，识别 Price / MOQ / Sample 等关键词，秒级回复并引导私信，将路人转化为询盘`}
              color={C.green}
            />
            <AiCapCard
              delay={0.62}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
              title="主动出击开发买家"
              metric="100+"
              metricLabel="人/日"
              desc="AI 每日主动触达目标行业买家，发送个性化开场白，10× 扩大漏斗顶部，不再坐等买家来"
              color={C.blue}
            />
            <AiCapCard
              delay={0.69}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
              title="自动报价 & 跟进"
              metric="3步"
              metricLabel="全自动"
              desc="询盘 → AI 生成含 MOQ/价格的报价草稿 → 自动发送 → 跟进未回复买家，全链路无需人工介入"
              color={C.amber}
            />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            SECTION 4：AI 操作实录（带数据标签）
        ════════════════════════════════════════════════════════ */}
        <div style={{ padding: '28px 16px 0' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_GENTLE, delay: 0.6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>AI 实时操作预览</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.t1, letterSpacing: -0.7, lineHeight: 1.3, marginBottom: 16 }}>开通后，这是<br/>AI 每天在为您做的事</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_GENTLE, delay: 0.65 }}
            style={{ borderRadius: 20, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '14px 14px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <motion.div animate={{ boxShadow: [`0 0 4px ${C.green}`, `0 0 12px ${C.green}`, `0 0 4px ${C.green}`] }} transition={{ duration: 2, repeat: Infinity }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>AI 工作日志</span>
              <span style={{ fontSize: 10, color: C.t3, marginLeft: 'auto' }}>开通后即可查看完整记录</span>
            </div>
            {cfg.aiLogs.map((log, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING_GENTLE, delay: 0.7 + i * 0.08 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < cfg.aiLogs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ fontSize: 10, color: C.t3, fontVariantNumeric: 'tabular-nums', flexShrink: 0, width: 36 }}>{log.time}</span>
                <span style={{ fontSize: 11, color: C.t2, flex: 1, lineHeight: 1.4 }}>{log.action}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: log.tagColor, padding: '2px 7px', borderRadius: 50, background: `${log.tagColor}18`, border: `1px solid ${log.tagColor}30`, flexShrink: 0, whiteSpace: 'nowrap' }}>{log.tag}</span>
              </motion.div>
            ))}
            {/* 模糊遮罩 — 暗示更多 */}
            <div style={{ filter: 'blur(4px)', opacity: 0.35, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                <span style={{ fontSize: 10, color: C.t3, width: 36 }}>10:02</span>
                <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.1)', flex: 1 }}/>
                <div style={{ height: 18, width: 52, borderRadius: 50, background: 'rgba(16,185,129,0.15)' }}/>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── STICKY CTA ── */}
        <div style={{ padding: '32px 16px 0' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_GENTLE, delay: 0.75 }}>
            {/* 最后一击 */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: C.t3, lineHeight: 1.6 }}>
                您的 {cfg.name} 账号是一座金矿<br/>
                <span style={{ color: C.t2, fontWeight: 600 }}>只是现在还没有挖掘机</span>
              </div>
            </div>

            {/* 主 CTA 按钮 */}
            <motion.button whileTap={{ scale: 0.96 }} transition={SPRING_BOUNCY} onClick={handleUnlock}
              animate={ctaPressed ? { scale: [1, 0.96, 1.02, 1] } : {}}
              style={{ width: '100%', padding: '16px 20px', borderRadius: 18, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: `linear-gradient(135deg, ${cfg.color} 0%, ${cfg.color}CC 100%)`, boxShadow: `0 8px 32px ${cfg.color}55, 0 2px 0 rgba(255,255,255,0.15) inset`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative', overflow: 'hidden' } as React.CSSProperties}>
              <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)', pointerEvents: 'none' }}/>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span style={{ fontSize: 15, fontWeight: 900, color: 'white', letterSpacing: -0.3, position: 'relative' }}>
                立即解锁 {cfg.name} 托管
              </span>
            </motion.button>

            {/* 副文案 */}
            <div style={{ textAlign: 'center', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              {['随时可暂停', 'AI 全自动', '0 人力投入'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ fontSize: 10.5, color: C.t3 }}>{t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      </div>

      <style>{`@keyframes skPulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
    </div>
  );
}
