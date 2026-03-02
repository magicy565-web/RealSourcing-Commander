import { useState, useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   BossWarroom — Bento Grid Dashboard
   像素级还原参考稿件：
   ① 顶部大卡：螃蟹吉祥物居中 + 四个玻璃气泡（邮件/任务/通知/消息）
   ② 中部双卡：TikTok 黑底 + Meta 白底
   ③ 底部 AI 对话卡：蓝紫色进度条 + 气泡 + 用户头像
   ④ 固定底栏：声纹图标 + 输入框 + 发送按钮
───────────────────────────────────────────────────────────────────────────── */

export default function BossWarroom() {
  const [time, setTime] = useState('9:41');
  const [chatInput, setChatInput] = useState('');

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
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      background: '#0E0B1A',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif',
      color: 'white',
      overflow: 'hidden',
    }}>

      {/* ── iOS Status Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px 8px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{time}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Signal */}
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
            <rect x="0" y="8" width="3" height="4" rx="0.5" fill="white"/>
            <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="white"/>
            <rect x="9" y="2" width="3" height="10" rx="0.5" fill="white"/>
            <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="white" opacity="0.35"/>
          </svg>
          {/* WiFi */}
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <circle cx="8" cy="11" r="1.5" fill="white"/>
            <path d="M4.5 7.5C5.5 6.3 6.7 5.5 8 5.5s2.5.8 3.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M1.5 4.5C3.2 2.5 5.5 1.2 8 1.2s4.8 1.3 6.5 3.3" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
          </svg>
          {/* Battery */}
          <div style={{ position: 'relative', width: 25, height: 12 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 3, border: '1.5px solid rgba(255,255,255,0.55)' }}/>
            <div style={{ position: 'absolute', left: 2, top: 2, bottom: 2, width: '75%', background: 'white', borderRadius: 1.5 }}/>
            <div style={{ position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)', width: 2, height: 5, background: 'rgba(255,255,255,0.4)', borderRadius: '0 1px 1px 0' }}/>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        scrollbarWidth: 'none',
      }}>

        {/* ════════════════════════════════════════════════════════════
            CARD 1 — OpenClaw 核心卡（大 Bento）
            深色背景 + 紫色边框光晕 + 螃蟹居中 + 四气泡
        ════════════════════════════════════════════════════════════ */}
        <div style={{
          position: 'relative',
          borderRadius: 28,
          background: 'linear-gradient(160deg, #1A1530 0%, #141028 50%, #0F0C22 100%)',
          border: '1.5px solid rgba(130,80,220,0.45)',
          boxShadow: '0 0 40px rgba(100,60,200,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
          overflow: 'hidden',
          minHeight: 360,
        }}>
          {/* 背景紫色光晕 */}
          <div style={{
            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
            width: 320, height: 320,
            background: 'radial-gradient(circle, rgba(100,60,200,0.18) 0%, transparent 70%)',
            filter: 'blur(30px)', pointerEvents: 'none',
          }}/>
          <div style={{
            position: 'absolute', bottom: -40, right: -40,
            width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(80,40,180,0.12) 0%, transparent 70%)',
            filter: 'blur(25px)', pointerEvents: 'none',
          }}/>

          {/* Openclaw 品牌标签 — 右上角 */}
          <div style={{
            position: 'absolute', top: 14, right: 14,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            zIndex: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>
              {/* OpenClaw 爪子图标 SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C9 3 7 5 7 7.5C7 9 7.5 10 8 11C6.5 11.5 5 13 5 15.5C5 18.5 7.5 21 12 21C16.5 21 19 18.5 19 15.5C19 13 17.5 11.5 16 11C16.5 10 17 9 17 7.5C17 5 15 3 12 3Z" fill="rgba(255,255,255,0.7)"/>
                <circle cx="9.5" cy="7" r="1.5" fill="rgba(255,255,255,0.9)"/>
                <circle cx="14.5" cy="7" r="1.5" fill="rgba(255,255,255,0.9)"/>
              </svg>
            </div>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 0.5 }}>Opencalw</span>
          </div>

          {/* ── 四个玻璃气泡 ── */}

          {/* 气泡1：邮件 — 左上 */}
          <div style={{
            position: 'absolute', top: 20, left: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            animation: 'floatA 5s ease-in-out infinite',
            zIndex: 10,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}>
              <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
                <rect x="1" y="1" width="22" height="16" rx="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
                <path d="M1 4L12 11L23 4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}>【12 未回复消息】</span>
          </div>

          {/* 气泡2：任务 — 右上偏中 */}
          <div style={{
            position: 'absolute', top: 14, right: 60,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            animation: 'floatB 4s ease-in-out infinite',
            zIndex: 10,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="3" width="14" height="18" rx="2" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"/>
                <path d="M9 3V5H15V3" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 12L11 15L16 9" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}>【5 已完成任务】</span>
          </div>

          {/* 气泡3：通知 — 左下 */}
          <div style={{
            position: 'absolute', bottom: 60, left: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            animation: 'floatC 6s ease-in-out infinite',
            zIndex: 10,
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}>
                <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
                  <path d="M11 2C11 2 5 5 5 12V18H17V12C17 5 11 2 11 2Z" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M5 18H17" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="11" cy="21" r="1.5" fill="rgba(255,255,255,0.85)"/>
                </svg>
              </div>
              {/* 红点 */}
              <div style={{
                position: 'absolute', top: -2, right: -2,
                width: 18, height: 18, borderRadius: '50%',
                background: '#EF4444',
                border: '2px solid #0E0B1A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: 'white' }}>1</span>
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}>【8 消息通知】</span>
          </div>

          {/* 气泡4：聊天 — 右下 */}
          <div style={{
            position: 'absolute', bottom: 50, right: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            animation: 'floatD 5.5s ease-in-out infinite',
            zIndex: 10,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}>
              <svg width="24" height="22" viewBox="0 0 24 22" fill="none">
                <path d="M21 11C21 16 16.5 20 11 20C9.5 20 8 19.7 6.7 19.2L3 21L4.2 17.5C2.8 16 2 14.1 2 12C2 7 6.5 3 12 3C16.5 3 20.3 5.8 21 9.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8" cy="12" r="1.2" fill="rgba(255,255,255,0.85)"/>
                <circle cx="12" cy="12" r="1.2" fill="rgba(255,255,255,0.85)"/>
                <circle cx="16" cy="12" r="1.2" fill="rgba(255,255,255,0.85)"/>
              </svg>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}>【3 其他未确认消息】</span>
          </div>

          {/* 装饰小泡泡 */}
          <div style={{ position: 'absolute', left: '42%', top: '38%', width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', animation: 'floatA 7s ease-in-out infinite' }}/>
          <div style={{ position: 'absolute', right: '30%', top: '55%', width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', animation: 'floatB 8s ease-in-out infinite' }}/>
          <div style={{ position: 'absolute', left: '30%', bottom: '28%', width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', animation: 'floatC 6s ease-in-out infinite' }}/>

          {/* ── 螃蟹吉祥物居中 ── */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 200, height: 200,
            zIndex: 5,
            animation: 'floatMascot 4s ease-in-out infinite',
          }}>
            <img
              src="/assets/images/openclaw-crab.png"
              alt="OpenClaw"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            CARD 2 — 平台双卡（TikTok 黑 + Meta 白）
        ════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* TikTok — 黑底 */}
          <div style={{
            borderRadius: 24,
            background: '#000000',
            border: '1.5px solid rgba(130,80,220,0.35)',
            padding: '20px 16px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            minHeight: 150,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* TikTok 双色 Logo */}
            <div style={{ position: 'relative', width: 44, height: 50 }}>
              {/* 青色阴影 */}
              <svg style={{ position: 'absolute', left: -2, top: 2, opacity: 0.7 }} width="44" height="50" viewBox="0 0 44 50" fill="none">
                <path d="M32 0C32 7 37 12 44 12V22C40 22 36.5 20.5 34 18V34C34 43 27 50 18 50C9 50 2 43 2 34C2 25 9 18 18 18C19 18 20 18.1 21 18.3V28.5C20.1 28.2 19.1 28 18 28C14 28 11 31 11 35C11 39 14 42 18 42C22 42 25 39 25 35V0H32Z" fill="#00F2EA"/>
              </svg>
              {/* 红色阴影 */}
              <svg style={{ position: 'absolute', left: 2, top: 2, opacity: 0.7 }} width="44" height="50" viewBox="0 0 44 50" fill="none">
                <path d="M32 0C32 7 37 12 44 12V22C40 22 36.5 20.5 34 18V34C34 43 27 50 18 50C9 50 2 43 2 34C2 25 9 18 18 18C19 18 20 18.1 21 18.3V28.5C20.1 28.2 19.1 28 18 28C14 28 11 31 11 35C11 39 14 42 18 42C22 42 25 39 25 35V0H32Z" fill="#FF0050"/>
              </svg>
              {/* 白色主体 */}
              <svg style={{ position: 'absolute', left: 0, top: 0 }} width="44" height="50" viewBox="0 0 44 50" fill="none">
                <path d="M32 0C32 7 37 12 44 12V22C40 22 36.5 20.5 34 18V34C34 43 27 50 18 50C9 50 2 43 2 34C2 25 9 18 18 18C19 18 20 18.1 21 18.3V28.5C20.1 28.2 19.1 28 18 28C14 28 11 31 11 35C11 39 14 42 18 42C22 42 25 39 25 35V0H32Z" fill="white"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500, lineHeight: 1.5 }}>
                抖音：【<span style={{ color: '#FFD166', fontWeight: 700 }}>210</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                条消息】
              </div>
            </div>
          </div>

          {/* Meta — 白底 */}
          <div style={{
            borderRadius: 24,
            background: 'linear-gradient(135deg, #E8E8F0 0%, #F5F5FF 50%, #EEF0FF 100%)',
            border: '1.5px solid rgba(130,80,220,0.25)',
            padding: '20px 16px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            minHeight: 150,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Meta ∞ Logo */}
            <svg width="52" height="28" viewBox="0 0 52 28" fill="none">
              <path d="M8 14C8 10 10 7 13 7C15.5 7 17.5 8.5 20 12L26 21L32 12C34.5 8.5 36.5 7 39 7C42 7 44 10 44 14C44 18 42 21 39 21C36.5 21 34.5 19.5 32 16L26 7L20 16C17.5 19.5 15.5 21 13 21C10 21 8 18 8 14Z" fill="url(#metaGrad)"/>
              <defs>
                <linearGradient id="metaGrad" x1="8" y1="7" x2="44" y2="21" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0064E0"/>
                  <stop offset="50%" stopColor="#0078FF"/>
                  <stop offset="100%" stopColor="#00C7FF"/>
                </linearGradient>
              </defs>
            </svg>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: 500, lineHeight: 1.5 }}>
                Meta：【<span style={{ color: '#D4A017', fontWeight: 700 }}>145</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: 500 }}>
                条消息】
              </div>
            </div>
            {/* 右侧箭头 */}
            <div style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M3 2L7 5L3 8" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            CARD 3 — AI 对话区
            蓝紫进度条 + 用户头像 + 气泡 + 蓝紫按钮
        ════════════════════════════════════════════════════════════ */}
        <div style={{
          borderRadius: 24,
          background: 'linear-gradient(160deg, #1A1530 0%, #141028 100%)',
          border: '1.5px solid rgba(130,80,220,0.35)',
          padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 12,
          overflow: 'hidden',
        }}>
          {/* 顶部：蓝紫进度条 + 用户头像 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              flex: 1, height: 10, borderRadius: 6,
              background: 'linear-gradient(90deg, #6B48FF 0%, #9B6BFF 50%, #C084FC 100%)',
              boxShadow: '0 0 12px rgba(107,72,255,0.5)',
            }}/>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #8B5CF6, #6B48FF)',
              border: '2px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.8)"/>
                <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* AI 对话气泡 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* AI 头像 */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }}/>
            </div>
            {/* 输入中气泡 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 16,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'dotBounce 1.2s ease-in-out infinite', animationDelay: '0ms' }}/>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'dotBounce 1.2s ease-in-out infinite', animationDelay: '200ms' }}/>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'dotBounce 1.2s ease-in-out infinite', animationDelay: '400ms' }}/>
            </div>
          </div>

          {/* 底部蓝紫按钮条 + 箭头 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              flex: 1, height: 36, borderRadius: 18,
              background: 'linear-gradient(90deg, #6B48FF 0%, #9B6BFF 100%)',
              boxShadow: '0 4px 16px rgba(107,72,255,0.4)',
            }}/>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M5 2L9 6L5 10" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BOTTOM BAR — 固定底部输入栏
          声纹图标 + 输入框 + 发送按钮
      ════════════════════════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0,
        padding: '10px 16px 32px',
        background: 'linear-gradient(to top, #0E0B1A 80%, transparent)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          borderRadius: 50,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
        }}>
          {/* 声纹图标 */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="12" x2="4" y2="12"/>
              <line x1="7" y1="9" x2="7" y2="15"/>
              <line x1="10" y1="6" x2="10" y2="18"/>
              <line x1="13" y1="9" x2="13" y2="15"/>
              <line x1="16" y1="7" x2="16" y2="17"/>
              <line x1="19" y1="10" x2="19" y2="14"/>
              <line x1="22" y1="12" x2="22" y2="12"/>
            </svg>
          </div>

          {/* 输入框 */}
          <input
            type="text"
            placeholder="晚安，需要我帮您做什么？"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'rgba(255,255,255,0.85)',
              caretColor: '#9B6BFF',
            }}
          />

          {/* 发送按钮 */}
          <button style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'white',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="#0E0B1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#0E0B1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Home Indicator */}
        <div style={{
          width: 120, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.25)',
          margin: '10px auto 0',
        }}/>
      </div>

      {/* ── Global Animations ── */}
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-8px) rotate(1deg); }
          66% { transform: translateY(-4px) rotate(-0.5deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          40% { transform: translateY(-6px) rotate(-1deg); }
          80% { transform: translateY(-10px) rotate(0.5deg); }
        }
        @keyframes floatD {
          0%, 100% { transform: translateY(0px); }
          60% { transform: translateY(-9px); }
        }
        @keyframes floatMascot {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-8px); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        input::placeholder { color: rgba(255,255,255,0.3); }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
