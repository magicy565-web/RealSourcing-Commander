import { useState, useEffect } from 'react';

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
      background: '#0C0A18',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif',
      color: 'white',
      overflowX: 'hidden',
    }}>

      {/* ── Status Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px 6px', flexShrink: 0 }}>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5 }}>{time}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
            <rect x="0" y="8" width="3" height="4" rx="0.5" fill="white"/>
            <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="white"/>
            <rect x="9" y="2" width="3" height="10" rx="0.5" fill="white"/>
            <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="white" opacity="0.35"/>
          </svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <circle cx="8" cy="11" r="1.5" fill="white"/>
            <path d="M4.5 7.5C5.5 6.3 6.7 5.5 8 5.5s2.5.8 3.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M1.5 4.5C3.2 2.5 5.5 1.2 8 1.2s4.8 1.3 6.5 3.3" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
          </svg>
          <div style={{ position: 'relative', width: 25, height: 12 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 3, border: '1.5px solid rgba(255,255,255,0.55)' }}/>
            <div style={{ position: 'absolute', left: 2, top: 2, bottom: 2, width: '75%', background: 'white', borderRadius: 1.5 }}/>
            <div style={{ position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)', width: 2, height: 5, background: 'rgba(255,255,255,0.4)', borderRadius: '0 1px 1px 0' }}/>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'none' }}>

        {/* ═══════════════════════════════════════════════════════
            CARD 1 — OpenClaw 核心大卡
            深紫背景 + 精致紫色边框 + 官方 Logo 居中 + 四气泡
        ═══════════════════════════════════════════════════════ */}
        <div style={{
          position: 'relative',
          borderRadius: 26,
          background: 'linear-gradient(155deg, #16112E 0%, #110E28 40%, #0D0B1F 100%)',
          border: '1px solid rgba(120, 70, 220, 0.5)',
          boxShadow: '0 0 0 1px rgba(120,70,220,0.08), 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          overflow: 'hidden',
          minHeight: 340,
        }}>
          {/* 顶部紫色光晕 */}
          <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 280, height: 280, background: 'radial-gradient(circle, rgba(100,50,200,0.22) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }}/>

          {/* Openclaw 品牌角标 — 右上 */}
          <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, zIndex: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)',
            }}>
              {/* 小龙虾剪影 SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 4C10 4 8.5 5.5 8.5 7.5C8.5 9 9 10 9.5 10.5C8 11 6.5 12.5 6.5 14.5C6.5 17 8.5 19 12 19C15.5 19 17.5 17 17.5 14.5C17.5 12.5 16 11 14.5 10.5C15 10 15.5 9 15.5 7.5C15.5 5.5 14 4 12 4Z" fill="rgba(255,255,255,0.65)"/>
                <path d="M9 8L6.5 6M15 8L17.5 6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M8.5 14.5L6 15.5M15.5 14.5L18 15.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 0.3 }}>Opencalw</span>
          </div>

          {/* ── 四个精致玻璃气泡 ── */}

          {/* 气泡1：邮件 — 左上 */}
          <div style={{ position: 'absolute', top: 18, left: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, animation: 'bub1 5s ease-in-out infinite', zIndex: 10 }}>
            <GlassBubble>
              <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                <rect x="1" y="1" width="18" height="14" rx="2.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4"/>
                <path d="M1 4.5L10 10L19 4.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </GlassBubble>
            <BubbleLabel>【12 未回复消息】</BubbleLabel>
          </div>

          {/* 气泡2：任务 — 右上偏中 */}
          <div style={{ position: 'absolute', top: 12, right: 58, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, animation: 'bub2 4.2s ease-in-out infinite', zIndex: 10 }}>
            <GlassBubble size={48}>
              <svg width="19" height="21" viewBox="0 0 19 21" fill="none">
                <rect x="2" y="2" width="15" height="17" rx="2.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4"/>
                <path d="M6 2.5V4.5H13V2.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M6 11L8.5 13.5L13.5 8.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </GlassBubble>
            <BubbleLabel>【5 已完成任务】</BubbleLabel>
          </div>

          {/* 气泡3：通知 — 左下 */}
          <div style={{ position: 'absolute', bottom: 52, left: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, animation: 'bub3 5.8s ease-in-out infinite', zIndex: 10 }}>
            <div style={{ position: 'relative' }}>
              <GlassBubble>
                <svg width="18" height="21" viewBox="0 0 18 21" fill="none">
                  <path d="M9 1.5C9 1.5 3.5 4.5 3.5 10V16H14.5V10C14.5 4.5 9 1.5 9 1.5Z" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M3.5 16H14.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round"/>
                  <circle cx="9" cy="19" r="1.3" fill="rgba(255,255,255,0.75)"/>
                </svg>
              </GlassBubble>
              <div style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', border: '2px solid #0C0A18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 8, fontWeight: 800 }}>1</span>
              </div>
            </div>
            <BubbleLabel>【8 消息通知】</BubbleLabel>
          </div>

          {/* 气泡4：聊天 — 右下 */}
          <div style={{ position: 'absolute', bottom: 44, right: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, animation: 'bub4 5s ease-in-out infinite', zIndex: 10 }}>
            <GlassBubble>
              <svg width="21" height="20" viewBox="0 0 21 20" fill="none">
                <path d="M18.5 10C18.5 14.5 14.8 18 10.5 18C9.2 18 8 17.7 7 17.2L3 19L4 16C2.8 14.7 2 13 2 11C2 6.5 5.7 3 10 3C14.3 3 18.5 5.8 18.5 10Z" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinejoin="round"/>
                <circle cx="7.5" cy="11" r="1.1" fill="rgba(255,255,255,0.75)"/>
                <circle cx="10.5" cy="11" r="1.1" fill="rgba(255,255,255,0.75)"/>
                <circle cx="13.5" cy="11" r="1.1" fill="rgba(255,255,255,0.75)"/>
              </svg>
            </GlassBubble>
            <BubbleLabel>【3 其他未确认消息】</BubbleLabel>
          </div>

          {/* 装饰小气泡 */}
          <div style={{ position: 'absolute', left: '44%', top: '36%', width: 9, height: 9, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', animation: 'bub1 8s ease-in-out infinite' }}/>
          <div style={{ position: 'absolute', right: '28%', top: '52%', width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', animation: 'bub3 7s ease-in-out infinite' }}/>
          <div style={{ position: 'absolute', left: '32%', bottom: '24%', width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', animation: 'bub2 9s ease-in-out infinite' }}/>

          {/* ── OpenClaw 官方 Logo 居中 ── */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 220, height: 110,
            zIndex: 5,
            animation: 'mascotFloat 4.5s ease-in-out infinite',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src="/assets/images/openclaw-logo.png"
              alt="OpenClaw"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 20px rgba(220,50,50,0.35)) drop-shadow(0 0 40px rgba(180,30,30,0.2))',
              }}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            CARD 2 — 平台双卡
        ═══════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* TikTok — 纯黑 */}
          <div style={{
            borderRadius: 22,
            background: '#000000',
            border: '1px solid rgba(120,70,220,0.3)',
            padding: '22px 14px 18px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
            minHeight: 148,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* TikTok 三层 Logo */}
            <div style={{ position: 'relative', width: 40, height: 46 }}>
              <svg style={{ position: 'absolute', left: -2, top: 2 }} width="40" height="46" viewBox="0 0 40 46" fill="#00F2EA" opacity="0.7">
                <path d="M29 0C29 6.5 34 11 40 11V20C36.5 20 33.5 18.8 31 17V31C31 39.3 24.7 46 16.5 46C8.3 46 2 39.3 2 31C2 22.7 8.3 16 16.5 16C17.3 16 18.1 16.1 18.9 16.2V25.5C18.1 25.2 17.3 25 16.5 25C13 25 10 28 10 31.5C10 35 13 38 16.5 38C20 38 23 35 23 31.5V0H29Z"/>
              </svg>
              <svg style={{ position: 'absolute', left: 2, top: 2 }} width="40" height="46" viewBox="0 0 40 46" fill="#FF0050" opacity="0.7">
                <path d="M29 0C29 6.5 34 11 40 11V20C36.5 20 33.5 18.8 31 17V31C31 39.3 24.7 46 16.5 46C8.3 46 2 39.3 2 31C2 22.7 8.3 16 16.5 16C17.3 16 18.1 16.1 18.9 16.2V25.5C18.1 25.2 17.3 25 16.5 25C13 25 10 28 10 31.5C10 35 13 38 16.5 38C20 38 23 35 23 31.5V0H29Z"/>
              </svg>
              <svg style={{ position: 'absolute', left: 0, top: 0 }} width="40" height="46" viewBox="0 0 40 46" fill="white">
                <path d="M29 0C29 6.5 34 11 40 11V20C36.5 20 33.5 18.8 31 17V31C31 39.3 24.7 46 16.5 46C8.3 46 2 39.3 2 31C2 22.7 8.3 16 16.5 16C17.3 16 18.1 16.1 18.9 16.2V25.5C18.1 25.2 17.3 25 16.5 25C13 25 10 28 10 31.5C10 35 13 38 16.5 38C20 38 23 35 23 31.5V0H29Z"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center', lineHeight: 1.6 }}>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>抖音：【</span>
              <span style={{ fontSize: 13, color: '#FFD166', fontWeight: 700 }}>210</span>
              <br/>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>条消息】</span>
            </div>
          </div>

          {/* Meta — 浅色 */}
          <div style={{
            borderRadius: 22,
            background: 'linear-gradient(145deg, #EAEAF5 0%, #F4F4FF 60%, #EDEDF8 100%)',
            border: '1px solid rgba(120,70,220,0.2)',
            padding: '22px 14px 18px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
            minHeight: 148,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Meta ∞ Logo — 蓝色渐变 */}
            <svg width="56" height="30" viewBox="0 0 56 30" fill="none">
              <defs>
                <linearGradient id="mg" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0064E0"/>
                  <stop offset="100%" stopColor="#00C8FF"/>
                </linearGradient>
              </defs>
              <path d="M8 15C8 10.5 10.5 7.5 14 7.5C16.8 7.5 19 9.2 22 13.5L28 22.5L34 13.5C37 9.2 39.2 7.5 42 7.5C45.5 7.5 48 10.5 48 15C48 19.5 45.5 22.5 42 22.5C39.2 22.5 37 20.8 34 16.5L28 7.5L22 16.5C19 20.8 16.8 22.5 14 22.5C10.5 22.5 8 19.5 8 15Z" fill="url(#mg)"/>
            </svg>
            <div style={{ textAlign: 'center', lineHeight: 1.6 }}>
              <span style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>Meta：【</span>
              <span style={{ fontSize: 13, color: '#B8860B', fontWeight: 700 }}>145</span>
              <br/>
              <span style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>条消息】</span>
            </div>
            {/* 右侧箭头 */}
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M2.5 1.5L6.5 4.5L2.5 7.5" stroke="rgba(0,0,0,0.35)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            CARD 3 — AI 对话区
        ═══════════════════════════════════════════════════════ */}
        <div style={{
          borderRadius: 22,
          background: 'linear-gradient(155deg, #16112E 0%, #110E28 100%)',
          border: '1px solid rgba(120,70,220,0.4)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          padding: '14px 14px 12px',
          display: 'flex', flexDirection: 'column', gap: 11,
          overflow: 'hidden',
        }}>
          {/* 蓝紫进度条 + 用户头像 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 9, borderRadius: 5, background: 'linear-gradient(90deg, #5B3FE8 0%, #8B5CF6 55%, #C084FC 100%)', boxShadow: '0 0 14px rgba(91,63,232,0.55)' }}/>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #5B3FE8)', border: '1.5px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.85)"/>
                <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* AI 思考气泡 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }}/>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {[0, 180, 360].map(d => (
                <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', animation: `dotBounce 1.3s ease-in-out infinite`, animationDelay: `${d}ms` }}/>
              ))}
            </div>
          </div>

          {/* 蓝紫按钮 + 箭头 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 34, borderRadius: 17, background: 'linear-gradient(90deg, #5B3FE8 0%, #8B5CF6 100%)', boxShadow: '0 4px 18px rgba(91,63,232,0.45)' }}/>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M3 2L7.5 5L3 8" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BOTTOM BAR — 固定底部输入栏
      ═══════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, padding: '8px 14px 30px', background: 'linear-gradient(to top, #0C0A18 70%, transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 50, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(20px)' }}>
          {/* 声纹按钮 */}
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="12" x2="2" y2="12"/><line x1="5" y1="9" x2="5" y2="15"/>
              <line x1="8" y1="6" x2="8" y2="18"/><line x1="11" y1="9" x2="11" y2="15"/>
              <line x1="14" y1="7" x2="14" y2="17"/><line x1="17" y1="10" x2="17" y2="14"/>
              <line x1="20" y1="12" x2="20" y2="12"/>
            </svg>
          </div>
          {/* 输入框 */}
          <input
            type="text"
            placeholder="晚安，需要我帮您做什么？"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'rgba(255,255,255,0.8)', caretColor: '#8B5CF6' }}
          />
          {/* 发送按钮 */}
          <button style={{ width: 34, height: 34, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="#0C0A18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#0C0A18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        {/* Home Indicator */}
        <div style={{ width: 110, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.22)', margin: '10px auto 0' }}/>
      </div>

      <style>{`
        @keyframes bub1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
        @keyframes bub2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-13px)} }
        @keyframes bub3 { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} 80%{transform:translateY(-11px)} }
        @keyframes bub4 { 0%,100%{transform:translateY(0)} 60%{transform:translateY(-10px)} }
        @keyframes mascotFloat { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-7px)} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0);opacity:0.45} 40%{transform:translateY(-5px);opacity:1} }
        input::placeholder { color:rgba(255,255,255,0.28); }
        *::-webkit-scrollbar { display:none; }
      `}</style>
    </div>
  );
}

/* ── 复用组件 ── */
function GlassBubble({ children, size = 46 }: { children: React.ReactNode; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(255,255,255,0.07)',
      border: '1.5px solid rgba(255,255,255,0.18)',
      backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
    }}>
      {children}
    </div>
  );
}

function BubbleLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
      whiteSpace: 'nowrap',
      textShadow: '0 1px 6px rgba(0,0,0,0.6)',
      letterSpacing: -0.2,
    }}>
      {children}
    </span>
  );
}
