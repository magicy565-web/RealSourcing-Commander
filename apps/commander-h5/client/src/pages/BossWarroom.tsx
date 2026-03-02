import { useState, useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────────
   BossWarroom — Premium Bento Dashboard
   Design language: Linear × Apple × Vercel
   - Glassmorphism with real depth
   - Micro-typography with optical precision
   - Layered ambient lighting
   - Purposeful motion
───────────────────────────────────────────────────────────────── */

const C = {
  bg: '#080612',
  surface: 'rgba(255,255,255,0.035)',
  surfaceHover: 'rgba(255,255,255,0.055)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.13)',
  purple: '#7C3AED',
  purpleLight: '#A78BFA',
  purpleDim: 'rgba(124,58,237,0.18)',
  red: '#EF4444',
  gold: '#F59E0B',
  text: 'rgba(255,255,255,0.92)',
  textMuted: 'rgba(255,255,255,0.38)',
  textDim: 'rgba(255,255,255,0.22)',
};

export default function BossWarroom() {
  const [time, setTime] = useState('');
  const [input, setInput] = useState('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      minHeight: '100dvh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"SF Pro Display",-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',
      color: C.text,
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Ambient background glow ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }}/>
        <div style={{ position: 'absolute', top: '55%', right: '10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', filter: 'blur(50px)' }}/>
        <div style={{ position: 'absolute', bottom: '5%', left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }}/>
      </div>

      {/* ── Status Bar ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px', flexShrink: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.5, color: C.text }}>{time || '9:41'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
            <rect x="0" y="7.5" width="2.5" height="3.5" rx="0.5" fill="white" opacity="0.9"/>
            <rect x="4" y="4.5" width="2.5" height="6.5" rx="0.5" fill="white" opacity="0.9"/>
            <rect x="8" y="2" width="2.5" height="9" rx="0.5" fill="white" opacity="0.9"/>
            <rect x="12" y="0" width="2.5" height="11" rx="0.5" fill="white" opacity="0.3"/>
          </svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
            <circle cx="7.5" cy="10" r="1.3" fill="white" opacity="0.9"/>
            <path d="M4 7C5 5.8 6.2 5 7.5 5s2.5.8 3.5 2" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.9"/>
            <path d="M1.2 4C3 2 5.1 1 7.5 1s4.5 1 6.3 3" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.4"/>
          </svg>
          <div style={{ position: 'relative', width: 24, height: 11 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 3, border: '1.2px solid rgba(255,255,255,0.5)' }}/>
            <div style={{ position: 'absolute', left: 1.5, top: 1.5, bottom: 1.5, width: '72%', background: 'white', borderRadius: 1.5 }}/>
            <div style={{ position: 'absolute', right: -2.5, top: '50%', transform: 'translateY(-50%)', width: 2, height: 4.5, background: 'rgba(255,255,255,0.35)', borderRadius: '0 1px 1px 0' }}/>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 10, scrollbarWidth: 'none' }}>

        {/* ══════════════════════════════════════════════════════
            HERO CARD — OpenClaw 核心状态
        ══════════════════════════════════════════════════════ */}
        <div style={{
          position: 'relative',
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(255,255,255,0.042) 0%, rgba(255,255,255,0.018) 100%)',
          border: `1px solid ${C.border}`,
          overflow: 'hidden',
          minHeight: 320,
          // Top highlight line
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 0 rgba(0,0,0,0.4)',
        }}>
          {/* Inner glow top-center */}
          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 240, height: 180, background: 'radial-gradient(ellipse, rgba(124,58,237,0.2) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }}/>

          {/* ── Openclaw brand badge — top right ── */}
          <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 20 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Claw icon */}
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C7.5 2 6 3.8 6 6C6 7.4 6.6 8.5 7.5 9.2C5.8 9.9 4.5 11.6 4.5 13.8C4.5 16.8 6.8 18.5 10 18.5C13.2 18.5 15.5 16.8 15.5 13.8C15.5 11.6 14.2 9.9 12.5 9.2C13.4 8.5 14 7.4 14 6C14 3.8 12.5 2 10 2Z" fill="rgba(255,255,255,0.55)"/>
                <path d="M7.5 5.5L5 4M12.5 5.5L15 4" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 8, color: C.textDim, fontWeight: 600, letterSpacing: 0.5 }}>Opencalw</span>
          </div>

          {/* ── Four status bubbles ── */}

          {/* Bubble: Mail — top left */}
          <StatusBubble
            style={{ top: 18, left: 14 }}
            animClass="floatA"
            label="【12 未回复消息】"
            badge={<MailIcon />}
          />

          {/* Bubble: Task — top right area */}
          <StatusBubble
            style={{ top: 14, right: 56 }}
            animClass="floatB"
            label="【5 已完成任务】"
            badge={<TaskIcon />}
          />

          {/* Bubble: Bell — bottom left */}
          <StatusBubble
            style={{ bottom: 46, left: 14 }}
            animClass="floatC"
            label="【8 消息通知】"
            badge={<BellIcon />}
            dot
          />

          {/* Bubble: Chat — bottom right */}
          <StatusBubble
            style={{ bottom: 38, right: 14 }}
            animClass="floatD"
            label="【3 其他未确认消息】"
            badge={<ChatIcon />}
          />

          {/* Micro bubbles */}
          {[
            { s: 8, l: '43%', t: '34%', a: 'floatA', d: '0s' },
            { s: 6, r: '27%', t: '50%', a: 'floatC', d: '1.5s' },
            { s: 5, l: '31%', b: '22%', a: 'floatB', d: '0.8s' },
          ].map((b, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: b.s, height: b.s,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              left: b.l, right: (b as any).r,
              top: b.t, bottom: (b as any).b,
              animation: `${b.a} ${6 + i * 1.5}s ease-in-out infinite`,
              animationDelay: b.d,
            }}/>
          ))}

          {/* ── OpenClaw Logo centered ── */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 15,
            animation: 'mascotFloat 5s ease-in-out infinite',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src="/assets/images/openclaw-logo.png"
              alt="OpenClaw"
              style={{
                width: 180,
                objectFit: 'contain',
                mixBlendMode: 'screen',
                filter: 'drop-shadow(0 0 24px rgba(239,68,68,0.5)) drop-shadow(0 0 48px rgba(239,68,68,0.2)) brightness(1.1)',
              }}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            PLATFORM CARDS — TikTok + Meta
        ══════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* TikTok */}
          <div style={{
            borderRadius: 20,
            background: '#0a0a0a',
            border: `1px solid rgba(255,255,255,0.07)`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            padding: '20px 12px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            minHeight: 140,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* subtle gradient top */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)', pointerEvents: 'none' }}/>
            <TikTokLogo />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', fontWeight: 400, letterSpacing: -0.1 }}>
                抖音
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: -0.3, marginTop: 2 }}>
                <span style={{ color: C.gold, fontWeight: 700 }}>210</span> 条消息
              </div>
            </div>
          </div>

          {/* Meta */}
          <div style={{
            borderRadius: 20,
            background: 'linear-gradient(145deg, #f0f0f8 0%, #fafaff 100%)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 0 rgba(0,0,0,0.08)',
            padding: '20px 12px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            minHeight: 140,
            position: 'relative', overflow: 'hidden',
          }}>
            <MetaLogo />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.35)', fontWeight: 400, letterSpacing: -0.1 }}>
                Meta
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.6)', letterSpacing: -0.3, marginTop: 2 }}>
                <span style={{ color: '#D97706', fontWeight: 700 }}>145</span> 条消息
              </div>
            </div>
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M2 1.5L5.5 4L2 6.5" stroke="rgba(0,0,0,0.3)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            AI CONVERSATION CARD
        ══════════════════════════════════════════════════════ */}
        <div style={{
          borderRadius: 20,
          background: 'linear-gradient(145deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.015) 100%)',
          border: `1px solid ${C.border}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
          padding: '14px',
          display: 'flex', flexDirection: 'column', gap: 10,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Top: progress bar + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              flex: 1, height: 8, borderRadius: 4,
              background: 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 45%, #A855F7 80%, #C084FC 100%)',
              boxShadow: '0 0 16px rgba(124,58,237,0.5), 0 0 32px rgba(124,58,237,0.2)',
            }}/>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6D28D9, #4F46E5)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(79,70,229,0.4)',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.9)"/>
                <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* Typing bubble */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }}/>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '7px 12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${C.border}`,
            }}>
              {[0, 200, 400].map(delay => (
                <div key={delay} style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.4)',
                  animation: 'dotPulse 1.4s ease-in-out infinite',
                  animationDelay: `${delay}ms`,
                }}/>
              ))}
            </div>
          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              flex: 1, height: 32, borderRadius: 16,
              background: 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%)',
              boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
            }}/>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M2.5 1.5L6.5 4.5L2.5 7.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Input Bar ── */}
      <div style={{ flexShrink: 0, padding: '8px 14px 32px', position: 'relative', zIndex: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px',
          borderRadius: 50,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${C.border}`,
          backdropFilter: 'blur(24px)',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.04)',
        }}>
          {/* Waveform button */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="14" viewBox="0 0 22 18" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round">
              <line x1="1" y1="9" x2="1" y2="9"/>
              <line x1="4" y1="6" x2="4" y2="12"/>
              <line x1="7" y1="3" x2="7" y2="15"/>
              <line x1="10" y1="6" x2="10" y2="12"/>
              <line x1="13" y1="4" x2="13" y2="14"/>
              <line x1="16" y1="7" x2="16" y2="11"/>
              <line x1="19" y1="9" x2="19" y2="9"/>
            </svg>
          </div>

          <input
            type="text"
            placeholder="晚安，需要我帮您做什么？"
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 14, color: C.text, caretColor: C.purpleLight,
            }}
          />

          {/* Send button */}
          <button style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'white',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={C.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={C.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Home indicator */}
        <div style={{ width: 100, height: 3.5, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '10px auto 0' }}/>
      </div>

      <style>{`
        @keyframes floatA { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
        @keyframes floatB { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-14px)} }
        @keyframes floatC { 0%,100%{transform:translateY(0px)} 40%{transform:translateY(-8px)} 80%{transform:translateY(-12px)} }
        @keyframes floatD { 0%,100%{transform:translateY(0px)} 60%{transform:translateY(-11px)} }
        @keyframes mascotFloat { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-8px)} }
        @keyframes dotPulse { 0%,80%,100%{transform:scale(1);opacity:0.4} 40%{transform:scale(1.4);opacity:1} }
        input::placeholder { color:rgba(255,255,255,0.25); }
        *::-webkit-scrollbar { display:none; }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function StatusBubble({ style, animClass, label, badge, dot }: {
  style: React.CSSProperties;
  animClass: string;
  label: string;
  badge: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <div style={{
      position: 'absolute',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      animation: `${animClass} ${animClass === 'floatA' ? 5 : animClass === 'floatB' ? 4.2 : animClass === 'floatC' ? 5.8 : 5}s ease-in-out infinite`,
      zIndex: 20,
      ...style,
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}>
          {badge}
        </div>
        {dot && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 15, height: 15, borderRadius: '50%',
            background: '#EF4444',
            border: '2px solid #080612',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 8px rgba(239,68,68,0.6)',
          }}>
            <span style={{ fontSize: 7.5, fontWeight: 800, color: 'white' }}>1</span>
          </div>
        )}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: 'rgba(255,255,255,0.82)',
        whiteSpace: 'nowrap',
        letterSpacing: -0.2,
        textShadow: '0 1px 8px rgba(0,0,0,0.8)',
      }}>
        {label}
      </span>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <rect x="1" y="1" width="16" height="12" rx="2" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3"/>
      <path d="M1 4L9 9L17 4" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
      <rect x="1.5" y="1.5" width="13" height="15" rx="2" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3"/>
      <path d="M5 1.5V3.5H11V1.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M5 10L7 12.5L11 8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
      <path d="M8 1.5C8 1.5 3.5 4 3.5 9V14H12.5V9C12.5 4 8 1.5 8 1.5Z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M3.5 14H12.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="8" cy="16.5" r="1.2" fill="rgba(255,255,255,0.7)"/>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="19" height="17" viewBox="0 0 19 17" fill="none">
      <path d="M16.5 8.5C16.5 12.5 13.2 15.5 9.5 15.5C8.3 15.5 7.2 15.2 6.2 14.7L2.5 16.5L3.5 13.5C2.4 12.3 1.5 10.7 1.5 9C1.5 5 4.8 2 9.5 2C13.2 2 16.5 4.8 16.5 8.5Z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="6.5" cy="9" r="1" fill="rgba(255,255,255,0.7)"/>
      <circle cx="9.5" cy="9" r="1" fill="rgba(255,255,255,0.7)"/>
      <circle cx="12.5" cy="9" r="1" fill="rgba(255,255,255,0.7)"/>
    </svg>
  );
}

function TikTokLogo() {
  return (
    <div style={{ position: 'relative', width: 36, height: 42 }}>
      {[{ x: -2, y: 2, color: '#00F2EA', op: 0.75 }, { x: 2, y: 2, color: '#FF0050', op: 0.75 }, { x: 0, y: 0, color: 'white', op: 1 }].map((l, i) => (
        <svg key={i} style={{ position: 'absolute', left: l.x, top: l.y, opacity: l.op }} width="36" height="42" viewBox="0 0 36 42" fill={l.color}>
          <path d="M26 0C26 5.8 30.5 10 36 10V18C32.5 18 29.5 16.8 27 15V28C27 35.7 21.2 42 14 42C6.8 42 1 35.7 1 28C1 20.3 6.8 14 14 14C14.7 14 15.4 14.1 16.1 14.2V22.5C15.4 22.2 14.7 22 14 22C10.7 22 8 24.7 8 28C8 31.3 10.7 34 14 34C17.3 34 20 31.3 20 28V0H26Z"/>
        </svg>
      ))}
    </div>
  );
}

function MetaLogo() {
  return (
    <svg width="52" height="28" viewBox="0 0 52 28" fill="none">
      <defs>
        <linearGradient id="metaG" x1="0" y1="0" x2="52" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0064E0"/>
          <stop offset="60%" stopColor="#0082FB"/>
          <stop offset="100%" stopColor="#00B4FF"/>
        </linearGradient>
      </defs>
      <path d="M7 14C7 9.8 9.5 6.5 13 6.5C15.8 6.5 18 8.3 21 12.8L26 21L31 12.8C34 8.3 36.2 6.5 39 6.5C42.5 6.5 45 9.8 45 14C45 18.2 42.5 21.5 39 21.5C36.2 21.5 34 19.7 31 15.2L26 7L21 15.2C18 19.7 15.8 21.5 13 21.5C9.5 21.5 7 18.2 7 14Z" fill="url(#metaG)"/>
    </svg>
  );
}
