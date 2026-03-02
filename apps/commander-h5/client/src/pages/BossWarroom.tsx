import { useState, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   BossWarroom — Redesigned from scratch
   
   Design philosophy:
   · Information hierarchy first — numbers tell the story
   · Every pixel earns its place
   · Motion serves meaning, not decoration
   · Dark matter aesthetic: deep space + aurora light
═══════════════════════════════════════════════════════════════════ */

// ── Animated counter hook ──────────────────────────────────────────
function useCounter(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const p = Math.min((timestamp - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val;
}

// ── Inline SVG noise (no external file) ───────────────────────────
function Noise({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}>
      <filter id={`n${opacity}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="100%" height="100%" filter={`url(#n${opacity})`}/>
    </svg>
  );
}

// ── Tiny sparkline ─────────────────────────────────────────────────
function Sparkline({ data, color, width = 60, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height * 0.8 - height * 0.1;
    return `${x},${y}`;
  }).join(' ');
  const areaBottom = `${width},${height} 0,${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <defs>
        <linearGradient id={`sg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${areaBottom}`} fill={`url(#sg${color.replace('#','')})`}/>
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Ring progress ──────────────────────────────────────────────────
function RingProgress({ value, max, size = 64, stroke = 5, color = '#8B5CF6' }: {
  value: number; max: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / max) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
    </svg>
  );
}

export default function BossWarroom() {
  const [time, setTime] = useState('');
  const [input, setInput] = useState('');
  const [aiStep, setAiStep] = useState(0); // 0=typing, 1=msg1, 2=msg2, 3=typing2
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalCount = useCounter(28, 1400);
  const tiktokCount = useCounter(210, 1600);
  const metaCount = useCounter(145, 1500);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setAiStep(1), 1800),
      setTimeout(() => setAiStep(2), 3200),
      setTimeout(() => setAiStep(3), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const tiktokData = [120, 145, 132, 168, 155, 180, 210];
  const metaData = [90, 105, 98, 120, 115, 132, 145];

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#07060F',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"SF Pro Display",-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',
      color: 'rgba(255,255,255,0.92)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Page ambient lights ── */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -100, left: -60, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.15) 0%, transparent 70%)', filter: 'blur(70px)' }}/>
        <div style={{ position: 'absolute', top: '30%', right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)', filter: 'blur(60px)' }}/>
        <div style={{ position: 'absolute', bottom: '15%', left: '25%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(50px)' }}/>
      </div>

      {/* ── Status Bar ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 22px 4px', flexShrink: 0 }}>
        <span style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: -0.6, fontVariantNumeric: 'tabular-nums' }}>{time || '9:41'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5.5 }}>
          {/* Signal */}
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
            <rect x="0" y="8" width="3" height="4" rx="0.5" fill="white"/>
            <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="white"/>
            <rect x="9" y="2" width="3" height="10" rx="0.5" fill="white"/>
            <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="white" opacity="0.3"/>
          </svg>
          {/* WiFi */}
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <circle cx="8" cy="11" r="1.4" fill="white"/>
            <path d="M4.5 7.5C5.5 6.3 6.7 5.5 8 5.5s2.5.8 3.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M1.5 4.5C3.2 2.5 5.5 1.2 8 1.2s4.8 1.3 6.5 3.3" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
          </svg>
          {/* Battery */}
          <div style={{ position: 'relative', width: 25, height: 12 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 3, border: '1.5px solid rgba(255,255,255,0.5)' }}/>
            <div style={{ position: 'absolute', left: 2, top: 2, bottom: 2, width: '75%', background: 'white', borderRadius: 1.5 }}/>
            <div style={{ position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)', width: 2, height: 5, background: 'rgba(255,255,255,0.35)', borderRadius: '0 1px 1px 0' }}/>
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 6px' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/assets/images/openclaw-logo.png" alt="OpenClaw"
            style={{ height: 22, objectFit: 'contain', mixBlendMode: 'screen', filter: 'brightness(1.1)' }}
          />
        </div>
        {/* User avatar */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6D28D9, #4F46E5)',
            border: '1.5px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 3px rgba(109,40,217,0.2)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.9)"/>
              <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          {/* Online dot */}
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#10B981', border: '2px solid #07060F', boxShadow: '0 0 6px rgba(16,185,129,0.7)' }}/>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 10, scrollbarWidth: 'none' }}>

        {/* ╔══════════════════════════════════════════════════════╗
            ║  HERO METRIC CARD                                    ║
            ╚══════════════════════════════════════════════════════╝ */}
        <div style={{
          position: 'relative',
          borderRadius: 24,
          overflow: 'hidden',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.042) 0%, rgba(255,255,255,0.016) 100%)',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.5)',
          padding: '20px 20px 18px',
        }}>
          <Noise opacity={0.032}/>
          {/* Aurora bg */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, left: '30%', width: 260, height: 200, background: 'radial-gradient(ellipse, rgba(109,40,217,0.25) 0%, transparent 70%)', filter: 'blur(30px)', animation: 'auroraA 7s ease-in-out infinite alternate' }}/>
            <div style={{ position: 'absolute', bottom: -30, right: '10%', width: 180, height: 160, background: 'radial-gradient(ellipse, rgba(79,70,229,0.2) 0%, transparent 70%)', filter: 'blur(25px)', animation: 'auroraB 9s ease-in-out infinite alternate-reverse' }}/>
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Top row: label + ring */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
                  今日待处理
                </div>
                {/* Giant number */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{
                    fontSize: 64, fontWeight: 800, letterSpacing: -4,
                    fontVariantNumeric: 'tabular-nums',
                    background: 'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.7) 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    lineHeight: 1,
                  }}>{totalCount}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600, letterSpacing: -0.2 }}>↑ 12</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>较昨日</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginTop: 4 }}>
                  条消息待回复
                </div>
              </div>

              {/* Ring progress */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <RingProgress value={28} max={50} size={72} stroke={5} color="#8B5CF6"/>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>56%</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>完成率</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', margin: '16px 0 14px' }}/>

            {/* Chips row */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { icon: '✉', label: '邮件', count: 12, color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
                { icon: '✓', label: '任务', count: 5, color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
                { icon: '🔔', label: '通知', count: 8, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', dot: true },
                { icon: '💬', label: '其他', count: 3, color: '#6366F1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)' },
              ].map(chip => (
                <div key={chip.label} style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 12,
                  background: chip.bg,
                  border: `1px solid ${chip.border}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  position: 'relative',
                }}>
                  {chip.dot && (
                    <div style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: '1.5px solid #07060F', boxShadow: '0 0 6px rgba(239,68,68,0.7)' }}/>
                  )}
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{chip.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: chip.color, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>{chip.count}</span>
                  <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{chip.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ╔══════════════════════════════════════════════════════╗
            ║  PLATFORM CARDS                                      ║
            ╚══════════════════════════════════════════════════════╝ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* TikTok */}
          <div style={{
            borderRadius: 22,
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.5)',
            padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
            position: 'relative', overflow: 'hidden',
            minHeight: 150,
          }}>
            <Noise opacity={0.025}/>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)', pointerEvents: 'none', zIndex: 2 }}/>
            <div style={{ position: 'relative', zIndex: 3 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <TikTokLogo />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.8)' }}/>
              </div>
              {/* Big number */}
              <div style={{ fontSize: 36, fontWeight: 800, color: '#F59E0B', letterSpacing: -2, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{tiktokCount}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginTop: 3 }}>条未读消息</div>
              {/* Sparkline */}
              <div style={{ marginTop: 10 }}>
                <Sparkline data={tiktokData} color="#F59E0B" width={100} height={28}/>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div style={{
            borderRadius: 22,
            background: 'linear-gradient(145deg, #ECEDF8 0%, #F5F5FF 60%, #EAEBF4 100%)',
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 24px rgba(0,0,0,0.12)',
            padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
            position: 'relative', overflow: 'hidden',
            minHeight: 150,
          }}>
            <div style={{ position: 'absolute', top: -20, right: -10, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }}/>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <MetaLogo />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }}/>
            </div>
            {/* Big number */}
            <div style={{ fontSize: 36, fontWeight: 800, color: '#D97706', letterSpacing: -2, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{metaCount}</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', fontWeight: 400, marginTop: 3 }}>条未读消息</div>
            {/* Sparkline */}
            <div style={{ marginTop: 10 }}>
              <Sparkline data={metaData} color="#D97706" width={100} height={28}/>
            </div>
          </div>
        </div>

        {/* ╔══════════════════════════════════════════════════════╗
            ║  AI CONVERSATION CARD                                ║
            ╚══════════════════════════════════════════════════════╝ */}
        <div style={{
          borderRadius: 22,
          background: 'linear-gradient(145deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.014) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <Noise opacity={0.028}/>
          {/* Top accent */}
          <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)', zIndex: 5 }}/>

          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* AI avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
                border: '1.5px solid rgba(255,255,255,0.15)',
                boxShadow: '0 0 0 3px rgba(124,58,237,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.9)"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.88)', letterSpacing: -0.2 }}>OpenClaw AI</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 4px rgba(16,185,129,0.8)' }}/>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>在线</span>
                </div>
              </div>
            </div>
            {/* Expand */}
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 1.5L6.5 4.5L2.5 7.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }}/>

          {/* Messages */}
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 2 }}>

            {/* AI message 1 */}
            {aiStep >= 1 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, animation: 'msgIn 0.3s ease-out' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.9)"/></svg>
                </div>
                <div style={{ maxWidth: '80%' }}>
                  <div style={{ padding: '9px 13px', borderRadius: '14px 14px 14px 4px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', backdropFilter: 'blur(10px)' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>检测到 <strong style={{ color: '#A78BFA' }}>28</strong> 条待处理消息，已按优先级整理完毕 ✓</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 4, paddingLeft: 4 }}>刚刚</div>
                </div>
              </div>
            )}

            {/* User message */}
            {aiStep >= 2 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'msgIn 0.3s ease-out' }}>
                <div style={{ maxWidth: '75%' }}>
                  <div style={{ padding: '9px 13px', borderRadius: '14px 14px 4px 14px', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>先处理 TikTok 的消息</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 4, textAlign: 'right', paddingRight: 4 }}>刚刚</div>
                </div>
              </div>
            )}

            {/* AI typing */}
            {(aiStep === 0 || aiStep === 3) && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, animation: 'msgIn 0.3s ease-out' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.9)"/></svg>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 200, 400].map(d => (
                    <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: '#A78BFA', animation: 'dotBounce 1.4s ease-in-out infinite', animationDelay: `${d}ms` }}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', position: 'relative', zIndex: 2 }}>
            {['查看全部', '标记已读', '优先处理'].map((label, i) => (
              <button key={label} style={{
                flex: 1, padding: '8px 0', borderRadius: 10,
                background: i === 0 ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.2))' : 'rgba(255,255,255,0.05)',
                border: i === 0 ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.07)',
                color: i === 0 ? '#A78BFA' : 'rgba(255,255,255,0.45)',
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                letterSpacing: -0.2,
              } as React.CSSProperties}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ╔══════════════════════════════════════════════════════╗
          ║  BOTTOM INPUT BAR                                    ║
          ╚══════════════════════════════════════════════════════╝ */}
      <div style={{ flexShrink: 0, padding: '6px 14px 30px', position: 'relative', zIndex: 10 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(to top, #07060F, transparent)', pointerEvents: 'none' }}/>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px',
          borderRadius: 50,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(30px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <button style={{
            width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          } as React.CSSProperties}>
            <svg width="17" height="14" viewBox="0 0 22 16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round">
              <line x1="1" y1="8" x2="1" y2="8"/><line x1="4" y1="5" x2="4" y2="11"/>
              <line x1="7" y1="2" x2="7" y2="14"/><line x1="10" y1="5" x2="10" y2="11"/>
              <line x1="13" y1="3" x2="13" y2="13"/><line x1="16" y1="6" x2="16" y2="10"/>
              <line x1="19" y1="8" x2="19" y2="8"/>
            </svg>
          </button>
          <input
            type="text" placeholder="晚安，需要我帮您做什么？"
            value={input} onChange={e => setInput(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'rgba(255,255,255,0.85)', caretColor: '#A78BFA' }}
          />
          <button style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: input ? 'linear-gradient(135deg, #7C3AED, #4F46E5)' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: input ? '0 4px 16px rgba(124,58,237,0.5)' : '0 2px 12px rgba(0,0,0,0.4)',
            transition: 'all 0.2s ease',
          } as React.CSSProperties}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={input ? 'white' : '#07060F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input ? 'white' : '#07060F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div style={{ width: 108, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.22)', margin: '10px auto 0' }}/>
      </div>

      <style>{`
        @keyframes auroraA { 0%{transform:scale(1) translate(0,0)} 100%{transform:scale(1.2) translate(20px,-10px)} }
        @keyframes auroraB { 0%{transform:scale(1) translate(0,0)} 100%{transform:scale(1.15) translate(-15px,10px)} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0) scale(1);opacity:0.5} 40%{transform:translateY(-5px) scale(1.2);opacity:1} }
        @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder { color:rgba(255,255,255,0.2); }
        button { -webkit-tap-highlight-color:transparent; font-family:inherit; }
        *::-webkit-scrollbar { display:none; }
      `}</style>
    </div>
  );
}

/* ── Logo components ── */
function TikTokLogo() {
  const p = "M22 0C22 4.9 25.8 8.5 30 8.5V15.5C27.5 15.5 25.2 14.6 23.5 13.2V23.5C23.5 30.4 18 36 11.5 36C5 36 0 30.4 0 23.5C0 16.6 5 11 11.5 11C12 11 12.5 11.1 13 11.1V18.2C12.5 18.1 12 18 11.5 18C8.5 18 6 20.5 6 23.5C6 26.5 8.5 29 11.5 29C14.5 29 17 26.5 17 23.5V0H22Z";
  return (
    <div style={{ position: 'relative', width: 28, height: 30 }}>
      {[{x:-1.5,y:1.5,c:'#00F2EA',o:0.75},{x:1.5,y:1.5,c:'#FF0050',o:0.75},{x:0,y:0,c:'white',o:1}].map((l,i)=>(
        <svg key={i} style={{position:'absolute',left:l.x,top:l.y,opacity:l.o}} width="28" height="30" viewBox="0 0 30 36" fill={l.c}><path d={p}/></svg>
      ))}
    </div>
  );
}

function MetaLogo() {
  return (
    <svg width="44" height="22" viewBox="0 0 54 28" fill="none">
      <defs>
        <linearGradient id="mg3" x1="0" y1="0" x2="54" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0064E0"/><stop offset="100%" stopColor="#00B4FF"/>
        </linearGradient>
      </defs>
      <path d="M7 14C7 9.5 9.8 6.5 13.5 6.5C16.5 6.5 18.8 8.5 22 13.2L27 21.5L32 13.2C35.2 8.5 37.5 6.5 40.5 6.5C44.2 6.5 47 9.5 47 14C47 18.5 44.2 21.5 40.5 21.5C37.5 21.5 35.2 19.5 32 14.8L27 6.5L22 14.8C18.8 19.5 16.5 21.5 13.5 21.5C9.8 21.5 7 18.5 7 14Z" fill="url(#mg3)"/>
    </svg>
  );
}
