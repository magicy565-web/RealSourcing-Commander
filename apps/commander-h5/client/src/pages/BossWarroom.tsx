import { useState, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   BossWarroom — Premium Mobile Dashboard
   Design: Raycast × Linear × Apple iOS 17 Widget
   
   Key design decisions:
   - SVG-based noise texture (no external dependency)
   - Real glassmorphism: backdrop-filter + layered gradients
   - Bubble spheres: multi-layer radial gradients simulating glass refraction
   - Hero card: aurora background with animated mesh gradient
   - Platform cards: true app-widget aesthetic
   - AI card: real conversation UI with message bubbles
   - Typography: tabular-nums, optical kerning, weight hierarchy
═══════════════════════════════════════════════════════════════════ */

// ── Design tokens ──────────────────────────────────────────────────
const T = {
  // Backgrounds
  pageBg: '#07060F',
  cardBg: 'rgba(255,255,255,0.032)',
  cardBgDeep: 'rgba(14,11,28,0.85)',

  // Borders
  borderSubtle: 'rgba(255,255,255,0.07)',
  borderMid: 'rgba(255,255,255,0.11)',
  borderStrong: 'rgba(255,255,255,0.18)',
  borderPurple: 'rgba(139,92,246,0.35)',

  // Text
  textPrimary: 'rgba(255,255,255,0.93)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.28)',

  // Accent
  purple: '#8B5CF6',
  purpleBright: '#A78BFA',
  purpleDark: '#5B21B6',
  indigo: '#6366F1',
  blue: '#3B82F6',
  gold: '#F59E0B',
  red: '#EF4444',
  teal: '#06B6D4',

  // Shadows
  cardShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.3) inset',
};

// ── Noise SVG (inline, no external file needed) ────────────────────
const NoiseSVG = () => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.035, pointerEvents: 'none', zIndex: 1 }} xmlns="http://www.w3.org/2000/svg">
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" opacity="1"/>
  </svg>
);

export default function BossWarroom() {
  const [time, setTime] = useState('');
  const [input, setInput] = useState('');
  const [aiTyping, setAiTyping] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const t = setTimeout(() => setAiTyping(false), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.pageBg,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"SF Pro Display",-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',
      color: T.textPrimary,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ── Page-level ambient lights ── */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {/* Top-left aurora */}
        <div style={{ position: 'absolute', top: -120, left: -80, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle at 40% 40%, rgba(109,40,217,0.18) 0%, rgba(79,70,229,0.08) 40%, transparent 70%)', filter: 'blur(60px)' }}/>
        {/* Center glow */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(50px)' }}/>
        {/* Bottom-right */}
        <div style={{ position: 'absolute', bottom: '10%', right: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', filter: 'blur(45px)' }}/>
      </div>

      {/* ── Status Bar ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 22px 6px', flexShrink: 0 }}>
        <span style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: -0.6, fontVariantNumeric: 'tabular-nums' }}>{time || '9:41'}</span>
        <StatusBarIcons />
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 10, scrollbarWidth: 'none' }}>

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  HERO CARD — OpenClaw Command Center                 ║
            ╚═══════════════════════════════════════════════════════╝ */}
        <div style={{
          position: 'relative',
          borderRadius: 26,
          overflow: 'hidden',
          minHeight: 330,
          // Layered card construction
          background: 'linear-gradient(145deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.012) 100%)',
          border: `1px solid ${T.borderPurple}`,
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.09)',  // top highlight
            'inset 0 -1px 0 rgba(0,0,0,0.25)',        // bottom shadow
            '0 20px 60px rgba(0,0,0,0.5)',             // card shadow
            '0 0 0 0.5px rgba(139,92,246,0.2)',        // outer purple ring
          ].join(', '),
        }}>
          {/* Card noise texture */}
          <NoiseSVG />

          {/* Aurora mesh background */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: '140%', height: '70%', background: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.22) 0%, rgba(79,70,229,0.08) 40%, transparent 70%)', filter: 'blur(20px)', animation: 'auroraShift 8s ease-in-out infinite alternate' }}/>
            <div style={{ position: 'absolute', bottom: -20, left: '20%', width: '60%', height: '50%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(25px)', animation: 'auroraShift 10s ease-in-out infinite alternate-reverse' }}/>
          </div>

          {/* ── Openclaw badge — top right ── */}
          <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <GlassBall size={34} intensity="medium">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C9.2 3 7 5.2 7 8C7 9.7 7.8 11.2 9 12.1C7 12.9 5.5 14.8 5.5 17C5.5 20.1 8.4 22 12 22C15.6 22 18.5 20.1 18.5 17C18.5 14.8 17 12.9 15 12.1C16.2 11.2 17 9.7 17 8C17 5.2 14.8 3 12 3Z" fill="rgba(255,255,255,0.75)"/>
                <path d="M9 7L6.5 5.5M15 7L17.5 5.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </GlassBall>
            <span style={{ fontSize: 8, color: T.textTertiary, fontWeight: 600, letterSpacing: 0.4 }}>Opencalw</span>
          </div>

          {/* ── Four floating status bubbles ── */}

          {/* Mail — top left */}
          <FloatingBubble
            pos={{ top: 16, left: 14 }}
            delay={0}
            duration={5.2}
            label="【12 未回复消息】"
            labelColor="rgba(255,255,255,0.88)"
          >
            <MailSVG />
          </FloatingBubble>

          {/* Task — top right (offset from badge) */}
          <FloatingBubble
            pos={{ top: 12, right: 58 }}
            delay={0.8}
            duration={4.6}
            label="【5 已完成任务】"
            labelColor="rgba(255,255,255,0.88)"
            size={50}
          >
            <TaskSVG />
          </FloatingBubble>

          {/* Bell — bottom left */}
          <FloatingBubble
            pos={{ bottom: 52, left: 14 }}
            delay={1.4}
            duration={5.8}
            label="【8 消息通知】"
            labelColor="rgba(255,255,255,0.88)"
            badge={<RedDot />}
          >
            <BellSVG />
          </FloatingBubble>

          {/* Chat — bottom right */}
          <FloatingBubble
            pos={{ bottom: 44, right: 14 }}
            delay={0.4}
            duration={5.5}
            label="【3 其他未确认消息】"
            labelColor="rgba(255,255,255,0.88)"
          >
            <ChatSVG />
          </FloatingBubble>

          {/* Micro decorative bubbles */}
          <MicroBubble style={{ left: '42%', top: '35%' }} size={10} delay={0} dur={7} />
          <MicroBubble style={{ right: '26%', top: '52%' }} size={8} delay={1.5} dur={8.5} />
          <MicroBubble style={{ left: '28%', bottom: '25%' }} size={7} delay={0.7} dur={6.5} />
          <MicroBubble style={{ right: '38%', bottom: '38%' }} size={5} delay={2} dur={9} />

          {/* ── OpenClaw Logo — center ── */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            animation: 'mascotHover 5s ease-in-out infinite',
            filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.45)) drop-shadow(0 8px 30px rgba(0,0,0,0.6))',
          }}>
            <img
              src="/assets/images/openclaw-logo.png"
              alt="OpenClaw"
              style={{ width: 190, objectFit: 'contain', mixBlendMode: 'screen', filter: 'brightness(1.05) contrast(1.05)' }}
            />
          </div>
        </div>

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  PLATFORM CARDS — TikTok + Meta                      ║
            ╚═══════════════════════════════════════════════════════╝ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* TikTok Widget */}
          <div style={{
            borderRadius: 22,
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.5)',
            padding: '0',
            minHeight: 152,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <NoiseSVG />
            {/* Subtle top gradient */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, rgba(255,255,255,0.025), transparent)', pointerEvents: 'none', zIndex: 2 }}/>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 12px 16px', position: 'relative', zIndex: 3 }}>
              <TikTokLogo />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: T.textTertiary, fontWeight: 500, letterSpacing: 0.2, marginBottom: 3 }}>抖音</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.gold, letterSpacing: -1, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>210</div>
                <div style={{ fontSize: 11, color: T.textSecondary, fontWeight: 400, marginTop: 2 }}>条消息</div>
              </div>
            </div>
          </div>

          {/* Meta Widget */}
          <div style={{
            borderRadius: 22,
            background: 'linear-gradient(145deg, #ECEDF8 0%, #F6F6FF 50%, #EAEBF5 100%)',
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 24px rgba(0,0,0,0.15)',
            minHeight: 152,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Subtle mesh gradient */}
            <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }}/>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 12px 16px', position: 'relative', zIndex: 2 }}>
              <MetaLogo />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', fontWeight: 500, letterSpacing: 0.2, marginBottom: 3 }}>Meta</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#D97706', letterSpacing: -1, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>145</div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', fontWeight: 400, marginTop: 2 }}>条消息</div>
              </div>
            </div>
            {/* Chevron */}
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 1.5L5.5 4L2 6.5" stroke="rgba(0,0,0,0.3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  AI CONVERSATION CARD                                 ║
            ╚═══════════════════════════════════════════════════════╝ */}
        <div style={{
          borderRadius: 22,
          background: 'linear-gradient(145deg, rgba(255,255,255,0.036) 0%, rgba(255,255,255,0.014) 100%)',
          border: `1px solid ${T.borderSubtle}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.4)',
          padding: '14px 14px 12px',
          display: 'flex', flexDirection: 'column', gap: 10,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <NoiseSVG />
          {/* Purple top accent line */}
          <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)', zIndex: 5 }}/>

          {/* Row 1: Progress bar + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 2 }}>
            <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 4, background: 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 40%, #A855F7 75%, #C084FC 100%)', boxShadow: '0 0 12px rgba(124,58,237,0.6)', width: '78%' }}/>
            </div>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
              border: '1.5px solid rgba(255,255,255,0.15)',
              boxShadow: '0 0 0 3px rgba(109,40,217,0.2), 0 4px 12px rgba(79,70,229,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.9)"/>
                <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* Row 2: AI message bubble */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, position: 'relative', zIndex: 2 }}>
            {/* AI avatar */}
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(79,70,229,0.2))',
              border: `1px solid ${T.borderMid}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #A78BFA, #818CF8)' }}/>
            </div>
            {/* Bubble */}
            <div style={{
              padding: '8px 13px',
              borderRadius: '14px 14px 14px 4px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${T.borderSubtle}`,
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {aiTyping ? (
                [0, 220, 440].map(d => (
                  <div key={d} style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: T.purpleBright, animation: 'dotBounce 1.4s ease-in-out infinite', animationDelay: `${d}ms`, opacity: 0.7 }}/>
                ))
              ) : (
                <span style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5 }}>正在分析今日数据...</span>
              )}
            </div>
          </div>

          {/* Row 3: Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 2 }}>
            <div style={{
              flex: 1, height: 32, borderRadius: 16,
              background: 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%)',
              boxShadow: '0 4px 20px rgba(79,70,229,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Shimmer effect */}
              <div style={{ position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', animation: 'shimmer 3s ease-in-out infinite' }}/>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.borderSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2.5 1.5L6.5 4.5L2.5 7.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* ╔═══════════════════════════════════════════════════════╗
          ║  BOTTOM INPUT BAR                                     ║
          ╚═══════════════════════════════════════════════════════╝ */}
      <div style={{ flexShrink: 0, padding: '6px 14px 30px', position: 'relative', zIndex: 10 }}>
        {/* Frosted separator */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }}/>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px',
          borderRadius: 50,
          background: 'rgba(255,255,255,0.038)',
          border: `1px solid ${T.borderSubtle}`,
          backdropFilter: 'blur(30px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          {/* Waveform button */}
          <button style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.07)',
            border: `1px solid ${T.borderSubtle}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          } as React.CSSProperties}>
            <WaveformSVG />
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder="晚安，需要我帮您做什么？"
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 14, color: T.textPrimary, caretColor: T.purpleBright,
            }}
          />

          {/* Send button */}
          <button style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: input ? `linear-gradient(135deg, ${T.purple}, ${T.indigo})` : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: input ? '0 4px 16px rgba(139,92,246,0.5)' : '0 2px 12px rgba(0,0,0,0.4)',
            transition: 'all 0.2s ease',
          } as React.CSSProperties}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={input ? 'white' : '#07060F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input ? 'white' : '#07060F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Home indicator */}
        <div style={{ width: 108, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.22)', margin: '10px auto 0' }}/>
      </div>

      {/* ── Global CSS ── */}
      <style>{`
        @keyframes auroraShift {
          0% { transform: translateX(-50%) scale(1) rotate(0deg); opacity: 0.8; }
          100% { transform: translateX(-50%) scale(1.15) rotate(3deg); opacity: 1; }
        }
        @keyframes mascotHover {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-9px); }
        }
        @keyframes floatBubble {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-9px) rotate(0.5deg); }
          66% { transform: translateY(-5px) rotate(-0.3deg); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
          40% { transform: translateY(-5px) scale(1.2); opacity: 1; }
        }
        @keyframes shimmer {
          0% { left: -100%; }
          50%, 100% { left: 200%; }
        }
        @keyframes microFloat {
          0%, 100% { transform: translateY(0px); opacity: 0.6; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
        input::placeholder { color: rgba(255,255,255,0.22); }
        button { -webkit-tap-highlight-color: transparent; }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════════════════════ */

/** Glass sphere bubble — multi-layer radial gradient for 3D glass look */
function GlassBall({ size = 46, children, intensity = 'normal' }: {
  size?: number;
  children?: React.ReactNode;
  intensity?: 'light' | 'normal' | 'medium';
}) {
  const opacities = { light: [0.06, 0.12, 0.18], normal: [0.08, 0.15, 0.22], medium: [0.07, 0.13, 0.2] };
  const [bg1, bg2, border] = opacities[intensity];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      position: 'relative',
      // Base glass layer
      background: [
        `radial-gradient(circle at 35% 30%, rgba(255,255,255,${bg2 + 0.06}) 0%, rgba(255,255,255,${bg1}) 50%, transparent 70%)`,
        `radial-gradient(circle at 65% 75%, rgba(255,255,255,${bg1 * 0.5}) 0%, transparent 50%)`,
        `linear-gradient(145deg, rgba(255,255,255,${bg2}) 0%, rgba(255,255,255,${bg1 * 0.3}) 100%)`,
      ].join(', '),
      border: `1px solid rgba(255,255,255,${border})`,
      backdropFilter: 'blur(20px)',
      boxShadow: [
        `inset 0 1px 0 rgba(255,255,255,${bg2 + 0.05})`,  // top specular
        `inset 0 -1px 0 rgba(0,0,0,0.2)`,                  // bottom shadow
        `0 4px 20px rgba(0,0,0,0.4)`,                       // drop shadow
        `0 1px 3px rgba(0,0,0,0.3)`,                        // close shadow
      ].join(', '),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {/* Top-left specular highlight */}
      <div style={{
        position: 'absolute', top: '12%', left: '18%',
        width: '35%', height: '22%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.25) 0%, transparent 100%)',
        filter: 'blur(2px)',
        transform: 'rotate(-20deg)',
        pointerEvents: 'none',
      }}/>
      {children}
    </div>
  );
}

/** Floating bubble with label */
function FloatingBubble({ pos, delay, duration, label, labelColor, children, badge, size = 46 }: {
  pos: React.CSSProperties;
  delay: number;
  duration: number;
  label: string;
  labelColor: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
  size?: number;
}) {
  return (
    <div style={{
      position: 'absolute',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      animation: `floatBubble ${duration}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      zIndex: 25,
      ...pos,
    }}>
      <div style={{ position: 'relative' }}>
        <GlassBall size={size}>{children}</GlassBall>
        {badge}
      </div>
      <span style={{
        fontSize: 10.5, fontWeight: 600,
        color: labelColor,
        whiteSpace: 'nowrap',
        letterSpacing: -0.3,
        textShadow: '0 1px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6)',
      }}>
        {label}
      </span>
    </div>
  );
}

/** Tiny decorative bubble */
function MicroBubble({ style, size, delay, dur }: { style: React.CSSProperties; size: number; delay: number; dur: number }) {
  return (
    <div style={{
      position: 'absolute',
      width: size, height: size, borderRadius: '50%',
      background: [
        `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)`,
      ].join(', '),
      border: '1px solid rgba(255,255,255,0.15)',
      animation: `microFloat ${dur}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      zIndex: 15,
      ...style,
    }}/>
  );
}

function RedDot() {
  return (
    <div style={{
      position: 'absolute', top: -3, right: -3,
      width: 16, height: 16, borderRadius: '50%',
      background: 'linear-gradient(135deg, #F87171, #EF4444)',
      border: '2px solid #07060F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 8px rgba(239,68,68,0.7)',
    }}>
      <span style={{ fontSize: 7.5, fontWeight: 800, color: 'white', lineHeight: 1 }}>1</span>
    </div>
  );
}

/* ── Icon SVGs ── */
function MailSVG() {
  return (
    <svg width="19" height="15" viewBox="0 0 19 15" fill="none">
      <rect x="1" y="1" width="17" height="13" rx="2.5" stroke="rgba(255,255,255,0.78)" strokeWidth="1.3"/>
      <path d="M1 4.5L9.5 10L18 4.5" stroke="rgba(255,255,255,0.78)" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function TaskSVG() {
  return (
    <svg width="17" height="19" viewBox="0 0 17 19" fill="none">
      <rect x="1.5" y="1.5" width="14" height="16" rx="2.5" stroke="rgba(255,255,255,0.78)" strokeWidth="1.3"/>
      <path d="M5.5 1.5V3.5H11.5V1.5" stroke="rgba(255,255,255,0.78)" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M5.5 10.5L7.5 13L11.5 8.5" stroke="rgba(255,255,255,0.78)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BellSVG() {
  return (
    <svg width="17" height="19" viewBox="0 0 17 19" fill="none">
      <path d="M8.5 1.5C8.5 1.5 3.5 4.2 3.5 9.5V15H13.5V9.5C13.5 4.2 8.5 1.5 8.5 1.5Z" stroke="rgba(255,255,255,0.78)" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M3.5 15H13.5" stroke="rgba(255,255,255,0.78)" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="8.5" cy="17.5" r="1.3" fill="rgba(255,255,255,0.78)"/>
    </svg>
  );
}

function ChatSVG() {
  return (
    <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
      <path d="M17.5 9C17.5 13 14 16.5 10 16.5C8.8 16.5 7.6 16.2 6.5 15.7L2.5 17.5L3.5 14C2.3 12.7 1.5 11 1.5 9C1.5 5 5 1.5 10 1.5C14 1.5 17.5 4.8 17.5 9Z" stroke="rgba(255,255,255,0.78)" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="7" cy="9.5" r="1.1" fill="rgba(255,255,255,0.78)"/>
      <circle cx="10" cy="9.5" r="1.1" fill="rgba(255,255,255,0.78)"/>
      <circle cx="13" cy="9.5" r="1.1" fill="rgba(255,255,255,0.78)"/>
    </svg>
  );
}

function WaveformSVG() {
  return (
    <svg width="18" height="14" viewBox="0 0 22 16" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round">
      <line x1="1" y1="8" x2="1" y2="8"/>
      <line x1="4" y1="5" x2="4" y2="11"/>
      <line x1="7" y1="2" x2="7" y2="14"/>
      <line x1="10" y1="5" x2="10" y2="11"/>
      <line x1="13" y1="3" x2="13" y2="13"/>
      <line x1="16" y1="6" x2="16" y2="10"/>
      <line x1="19" y1="8" x2="19" y2="8"/>
    </svg>
  );
}

function StatusBarIcons() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
        <rect x="0" y="8" width="3" height="4" rx="0.5" fill="white"/>
        <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="white"/>
        <rect x="9" y="2" width="3" height="10" rx="0.5" fill="white"/>
        <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="white" opacity="0.3"/>
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <circle cx="8" cy="11" r="1.4" fill="white"/>
        <path d="M4.5 7.5C5.5 6.3 6.7 5.5 8 5.5s2.5.8 3.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M1.5 4.5C3.2 2.5 5.5 1.2 8 1.2s4.8 1.3 6.5 3.3" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
      </svg>
      <div style={{ position: 'relative', width: 25, height: 12 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 3, border: '1.5px solid rgba(255,255,255,0.5)' }}/>
        <div style={{ position: 'absolute', left: 2, top: 2, bottom: 2, width: '75%', background: 'white', borderRadius: 1.5 }}/>
        <div style={{ position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)', width: 2, height: 5, background: 'rgba(255,255,255,0.35)', borderRadius: '0 1px 1px 0' }}/>
      </div>
    </div>
  );
}

function TikTokLogo() {
  const path = "M26 0C26 5.8 30.5 10 36 10V18C32.5 18 29.5 16.8 27 15V28C27 35.7 21.2 42 14 42C6.8 42 1 35.7 1 28C1 20.3 6.8 14 14 14C14.7 14 15.4 14.1 16.1 14.2V22.5C15.4 22.2 14.7 22 14 22C10.7 22 8 24.7 8 28C8 31.3 10.7 34 14 34C17.3 34 20 31.3 20 28V0H26Z";
  return (
    <div style={{ position: 'relative', width: 34, height: 40 }}>
      {[{ x: -2, y: 2, c: '#00F2EA', o: 0.75 }, { x: 2, y: 2, c: '#FF0050', o: 0.75 }, { x: 0, y: 0, c: 'white', o: 1 }].map((l, i) => (
        <svg key={i} style={{ position: 'absolute', left: l.x, top: l.y, opacity: l.o }} width="34" height="40" viewBox="0 0 37 42" fill={l.c}>
          <path d={path}/>
        </svg>
      ))}
    </div>
  );
}

function MetaLogo() {
  return (
    <svg width="54" height="28" viewBox="0 0 54 28" fill="none">
      <defs>
        <linearGradient id="mg2" x1="0" y1="0" x2="54" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0064E0"/>
          <stop offset="55%" stopColor="#0082FB"/>
          <stop offset="100%" stopColor="#00B4FF"/>
        </linearGradient>
      </defs>
      <path d="M7 14C7 9.5 9.8 6.5 13.5 6.5C16.5 6.5 18.8 8.5 22 13.2L27 21.5L32 13.2C35.2 8.5 37.5 6.5 40.5 6.5C44.2 6.5 47 9.5 47 14C47 18.5 44.2 21.5 40.5 21.5C37.5 21.5 35.2 19.5 32 14.8L27 6.5L22 14.8C18.8 19.5 16.5 21.5 13.5 21.5C9.8 21.5 7 18.5 7 14Z" fill="url(#mg2)"/>
    </svg>
  );
}
