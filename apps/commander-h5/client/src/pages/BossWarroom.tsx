import { useState, useEffect, useCallback, useRef } from 'react';
import { useWarroomData } from '../hooks/useWarroomData';
import type { PlatformData, ChatMessage } from '../types/warroom';

/* ─────────────────────────────────────────────────────────────────
   Design System
   ─────────────────────────────────────────────────────────────────
   Color:   #000 base, #7C3AED primary, 8-step opacity scale
   Grid:    8pt base unit (8/12/16/20/24/32)
   Type:    -apple-system SF Pro, tabular-nums for data
   Radius:  16/20/24/28/full
   Motion:  spring(stiffness:300, damping:30) equiv in CSS
   ───────────────────────────────────────────────────────────────── */

const C = {
  bg:        '#000000',
  surface1:  'rgba(255,255,255,0.04)',
  surface2:  'rgba(255,255,255,0.07)',
  surface3:  'rgba(255,255,255,0.10)',
  border1:   'rgba(255,255,255,0.06)',
  border2:   'rgba(255,255,255,0.10)',
  borderP:   'rgba(124,58,237,0.35)',
  primary:   '#7C3AED',
  primaryL:  '#A78BFA',
  primaryD:  '#4C1D95',
  text1:     'rgba(255,255,255,0.92)',
  text2:     'rgba(255,255,255,0.55)',
  text3:     'rgba(255,255,255,0.28)',
  amber:     '#F59E0B',
  green:     '#10B981',
  red:       '#EF4444',
  blue:      '#3B82F6',
};

// ── Hooks ──────────────────────────────────────────────────────────
function useCounter(target: number, duration = 1000, enabled = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!enabled || target === 0) return;
    let raf: number, start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(ease * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return val;
}

function usePressState() {
  const [pressed, setPressed] = useState(false);
  return {
    pressed,
    handlers: {
      onPointerDown: () => setPressed(true),
      onPointerUp:   () => setPressed(false),
      onPointerLeave:() => setPressed(false),
    }
  };
}

// ── Primitives ─────────────────────────────────────────────────────
function Noise() {
  return (
    <svg aria-hidden style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.025, pointerEvents:'none', zIndex:1, borderRadius:'inherit' }}>
      <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
      <rect width="100%" height="100%" filter="url(#n)"/>
    </svg>
  );
}

function Divider({ opacity = 0.06 }: { opacity?: number }) {
  return <div style={{ height:1, background:`rgba(255,255,255,${opacity})`, margin:'0 -1px' }}/>;
}

function Skeleton({ w, h, r=8 }: { w:string|number; h:number; r?:number }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:'rgba(255,255,255,0.06)', animation:'skPulse 1.6s ease-in-out infinite' }}/>;
}

// ── Sparkline ──────────────────────────────────────────────────────
function Sparkline({ data, color, w=88, h=24 }: { data:number[]; color:string; w?:number; h?:number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v,i) => `${((i/(data.length-1))*w).toFixed(1)},${(h - ((v-min)/range)*h*0.75 - h*0.12).toFixed(1)}`).join(' ');
  const gid = `sg${color.replace(/[^a-z0-9]/gi,'')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display:'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${w},${h} 0,${h}`} fill={`url(#${gid})`}/>
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Arc Progress (more refined than ring) ─────────────────────────
function ArcProgress({ value, max, size=68, stroke=4.5, color='#7C3AED' }: { value:number; max:number; size?:number; stroke?:number; color?:string }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value,max)/max) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ filter:`drop-shadow(0 0 5px ${color}90)`, transition:'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  );
}

// ── Status bar icons ───────────────────────────────────────────────
function StatusIcons() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      {/* Signal */}
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
        {[0,1,2,3].map((i)=>(
          <rect key={i} x={i*4} y={10-i*2.5} width="3" height={i*2.5+1} rx="0.6"
            fill="white" opacity={i<3?1:0.3}/>
        ))}
      </svg>
      {/* WiFi */}
      <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
        <circle cx="7.5" cy="10" r="1.3" fill="white"/>
        <path d="M4.5 7C5.6 5.8 6.5 5.2 7.5 5.2s1.9.6 3 1.8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M1.5 4C3.3 1.9 5.3.8 7.5.8s4.2 1.1 6 3.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.35"/>
      </svg>
      {/* Battery */}
      <div style={{ position:'relative', width:24, height:11 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:3, border:'1.5px solid rgba(255,255,255,0.45)' }}/>
        <div style={{ position:'absolute', left:2, top:2, bottom:2, width:'72%', background:'white', borderRadius:1.5 }}/>
        <div style={{ position:'absolute', right:-3, top:'50%', transform:'translateY(-50%)', width:2.5, height:5, background:'rgba(255,255,255,0.3)', borderRadius:'0 1px 1px 0' }}/>
      </div>
    </div>
  );
}

// ── TikTok logo (layered) ──────────────────────────────────────────
function TikTokLogo({ size=26 }: { size?:number }) {
  const path = "M22 0C22 4.9 25.8 8.5 30 8.5V15.5C27.5 15.5 25.2 14.6 23.5 13.2V23.5C23.5 30.4 18 36 11.5 36C5 36 0 30.4 0 23.5C0 16.6 5 11 11.5 11C12 11 12.5 11.1 13 11.1V18.2C12.5 18.1 12 18 11.5 18C8.5 18 6 20.5 6 23.5C6 26.5 8.5 29 11.5 29C14.5 29 17 26.5 17 23.5V0H22Z";
  const s = size / 30;
  return (
    <div style={{ position:'relative', width:size, height:size*1.2, flexShrink:0 }}>
      {[{dx:-1.2,dy:1.2,c:'#00F2EA',o:0.7},{dx:1.2,dy:1.2,c:'#FF0050',o:0.7},{dx:0,dy:0,c:'white',o:1}].map((l,i)=>(
        <svg key={i} style={{ position:'absolute', left:l.dx, top:l.dy, opacity:l.o }} width={size} height={size*1.2} viewBox="0 0 30 36" fill={l.c}>
          <path d={path}/>
        </svg>
      ))}
    </div>
  );
}

// ── Meta logo ──────────────────────────────────────────────────────
function MetaLogo() {
  return (
    <svg width="46" height="20" viewBox="0 0 54 24" fill="none">
      <defs>
        <linearGradient id="mlg" x1="0" y1="0" x2="54" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0064E0"/>
          <stop offset="100%" stopColor="#00B4FF"/>
        </linearGradient>
      </defs>
      <path d="M6 12C6 7.5 9 4 13 4C16.5 4 19 6.5 22.5 12L27 20L31.5 12C35 6.5 37.5 4 41 4C45 4 48 7.5 48 12C48 16.5 45 20 41 20C37.5 20 35 17.5 31.5 12L27 4L22.5 12C19 17.5 16.5 20 13 20C9 20 6 16.5 6 12Z" fill="url(#mlg)"/>
    </svg>
  );
}

// ── Platform card ──────────────────────────────────────────────────
function PlatformCard({ platform, isLoading }: { platform?:PlatformData; isLoading:boolean }) {
  const isTT = platform?.id === 'tiktok';
  const count = useCounter(platform?.unreadCount ?? 0, 1200, !isLoading);
  const { pressed, handlers } = usePressState();

  const trendDir = platform?.trend7d && platform.trend7d.length >= 2
    ? platform.trend7d[platform.trend7d.length-1] > platform.trend7d[0] ? '↑' : '↓'
    : '';
  const trendColor = trendDir === '↑' ? C.green : C.red;

  if (isTT) {
    return (
      <div {...handlers} style={{
        borderRadius: 20,
        background: '#0A0A0A',
        border: `1px solid rgba(255,255,255,0.07)`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(0,0,0,0.5)',
        padding: '16px 14px 14px',
        display: 'flex', flexDirection: 'column', gap: 0,
        position: 'relative', overflow: 'hidden',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: 'pointer',
        minHeight: 152,
      }}>
        <Noise/>
        {/* Ambient glow */}
        <div aria-hidden style={{ position:'absolute', top:-30, left:-20, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,242,234,0.06) 0%, transparent 70%)', filter:'blur(20px)', pointerEvents:'none', zIndex:0 }}/>
        <div aria-hidden style={{ position:'absolute', bottom:-20, right:-10, width:100, height:100, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,0,80,0.06) 0%, transparent 70%)', filter:'blur(20px)', pointerEvents:'none', zIndex:0 }}/>

        <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', height:'100%' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <TikTokLogo size={22}/>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              {trendDir && <span style={{ fontSize:10, fontWeight:700, color:trendColor }}>{trendDir}</span>}
              <div style={{ width:6, height:6, borderRadius:'50%', background:platform?.isConnected ? C.green : '#6B7280', boxShadow:platform?.isConnected ? `0 0 5px ${C.green}` : 'none' }}/>
            </div>
          </div>

          {isLoading ? <Skeleton w="55%" h={32} r={6}/> : (
            <div style={{ fontSize:32, fontWeight:800, color:C.amber, letterSpacing:-1.5, fontVariantNumeric:'tabular-nums', lineHeight:1 }}>{count}</div>
          )}
          <div style={{ fontSize:11, color:C.text3, fontWeight:500, marginTop:3, marginBottom:'auto' }}>条未读</div>

          <div style={{ marginTop:12 }}>
            {isLoading ? <Skeleton w="100%" h={24} r={4}/> : (
              <Sparkline data={platform?.trend7d ?? []} color={C.amber} w={88} h={24}/>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div {...handlers} style={{
      borderRadius: 20,
      background: 'linear-gradient(150deg, #F0F0FA 0%, #E8E8F5 50%, #EBEBF5 100%)',
      border: '1px solid rgba(0,0,0,0.04)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 4px 20px rgba(0,0,0,0.15)',
      padding: '16px 14px 14px',
      display: 'flex', flexDirection: 'column', gap: 0,
      position: 'relative', overflow: 'hidden',
      transform: pressed ? 'scale(0.97)' : 'scale(1)',
      transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
      cursor: 'pointer',
      minHeight: 152,
    }}>
      <div aria-hidden style={{ position:'absolute', top:-20, right:-10, width:100, height:100, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter:'blur(18px)', pointerEvents:'none' }}/>

      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <MetaLogo/>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            {trendDir && <span style={{ fontSize:10, fontWeight:700, color:trendDir==='↑'?'#059669':'#DC2626' }}>{trendDir}</span>}
            <div style={{ width:6, height:6, borderRadius:'50%', background:platform?.isConnected ? '#059669' : '#9CA3AF', boxShadow:platform?.isConnected ? '0 0 5px rgba(5,150,105,0.7)' : 'none' }}/>
          </div>
        </div>

        {isLoading ? <Skeleton w="55%" h={32} r={6}/> : (
          <div style={{ fontSize:32, fontWeight:800, color:'#D97706', letterSpacing:-1.5, fontVariantNumeric:'tabular-nums', lineHeight:1 }}>{count}</div>
        )}
        <div style={{ fontSize:11, color:'rgba(0,0,0,0.3)', fontWeight:500, marginTop:3, marginBottom:'auto' }}>条未读</div>

        <div style={{ marginTop:12 }}>
          {isLoading ? <Skeleton w="100%" h={24} r={4}/> : (
            <Sparkline data={platform?.trend7d ?? []} color="#D97706" w={88} h={24}/>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chat message ───────────────────────────────────────────────────
function ChatBubble({ msg }: { msg:ChatMessage }) {
  const isAI = msg.role === 'ai';
  const t = new Date(msg.createdAt).toLocaleTimeString('zh-CN',{ hour:'2-digit', minute:'2-digit', hour12:false });
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:isAI?'flex-start':'flex-end', gap:4, animation:'msgIn 0.25s ease-out' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
        {isAI && (
          <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg, #7C3AED, #4F46E5)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(124,58,237,0.4)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.95)"/>
            </svg>
          </div>
        )}
        <div style={{
          maxWidth:'80%', padding:'10px 14px',
          borderRadius: isAI ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
          background: isAI ? 'rgba(124,58,237,0.14)' : 'rgba(255,255,255,0.08)',
          border: isAI ? '1px solid rgba(124,58,237,0.22)' : '1px solid rgba(255,255,255,0.09)',
          backdropFilter:'blur(20px)',
        }}>
          <span style={{ fontSize:13.5, color:C.text1, lineHeight:1.55, fontWeight:400 }}>{msg.content}</span>
        </div>
      </div>
      <span style={{ fontSize:10, color:C.text3, paddingLeft:isAI?34:0, paddingRight:isAI?0:2 }}>{t}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════
export default function BossWarroom() {
  const { data, isLoading } = useWarroomData();
  const [time, setTime] = useState('');
  const [input, setInput] = useState('');
  const [aiTyping, setAiTyping] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalCount = useCounter(data?.totalPending ?? 0, 1000, !isLoading && !!data);
  const tiktok = data?.platforms.find(p => p.id === 'tiktok');
  const meta   = data?.platforms.find(p => p.id === 'meta');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('zh-CN',{ hour:'2-digit', minute:'2-digit', hour12:false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setAiTyping(false), 2200);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  const categories = data?.categories ?? [
    { id:'email' as const,        label:'邮件', count:0, hasUrgent:false },
    { id:'task' as const,         label:'任务', count:0, hasUrgent:false },
    { id:'notification' as const, label:'通知', count:0, hasUrgent:true  },
    { id:'other' as const,        label:'其他', count:0, hasUrgent:false },
  ];

  const chipCfg = [
    { color:'#A78BFA', bg:'rgba(167,139,250,0.12)', border:'rgba(167,139,250,0.22)', icon:(
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 7 10-7"/></svg>
    )},
    { color:'#34D399', bg:'rgba(52,211,153,0.10)', border:'rgba(52,211,153,0.20)', icon:(
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
    )},
    { color:'#FCD34D', bg:'rgba(252,211,77,0.10)', border:'rgba(252,211,77,0.20)', icon:(
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
    )},
    { color:'#93C5FD', bg:'rgba(147,197,253,0.10)', border:'rgba(147,197,253,0.20)', icon:(
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    )},
  ];

  return (
    <div style={{
      height:'100dvh', background:C.bg,
      display:'flex', flexDirection:'column',
      fontFamily:'"SF Pro Display",-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',
      color:C.text1, position:'relative', overflow:'hidden',
      WebkitFontSmoothing:'antialiased',
    }}>

      {/* ── Ambient lights (fixed, behind everything) ── */}
      <div aria-hidden style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:-120, left:-80, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 65%)', filter:'blur(80px)', animation:'ambA 12s ease-in-out infinite alternate' }}/>
        <div style={{ position:'absolute', top:'35%', right:-100, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 65%)', filter:'blur(70px)', animation:'ambB 15s ease-in-out infinite alternate-reverse' }}/>
        <div style={{ position:'absolute', bottom:'10%', left:'20%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 65%)', filter:'blur(60px)', animation:'ambA 10s ease-in-out infinite alternate 2s' }}/>
      </div>

      {/* ── Status Bar ── */}
      <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 22px 0', flexShrink:0 }}>
        <span style={{ fontSize:16, fontWeight:700, letterSpacing:-0.5, fontVariantNumeric:'tabular-nums' }}>{time || '9:41'}</span>
        <StatusIcons/>
      </div>

      {/* ── App Header ── */}
      <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px 8px', flexShrink:0 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, letterSpacing:-0.9, lineHeight:1.15 }}>指挥中心</h1>
          <p style={{ margin:'3px 0 0', fontSize:11.5, color:C.text3, fontWeight:400 }}>
            {data?.updatedAt
              ? `${new Date(data.updatedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 更新`
              : '正在同步…'}
          </p>
        </div>
        {/* Avatar */}
        <button style={{ position:'relative', width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg, #6D28D9 0%, #4338CA 100%)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 2.5px rgba(109,40,217,0.3), 0 4px 12px rgba(0,0,0,0.5)' } as React.CSSProperties}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.92)"/>
            <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke="rgba(255,255,255,0.92)" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          <div style={{ position:'absolute', bottom:1, right:1, width:9, height:9, borderRadius:'50%', background:C.green, border:`2px solid ${C.bg}`, boxShadow:`0 0 6px ${C.green}` }}/>
        </button>
      </div>

      {/* ── Scrollable Content ── */}
      <div ref={scrollRef} style={{
        flex:1, overflowY:'scroll', WebkitOverflowScrolling:'touch' as any,
        padding:'4px 16px 0', display:'flex', flexDirection:'column', gap:12,
        position:'relative', zIndex:10, scrollbarWidth:'none',
      }}>

        {/* ── Hero Card ── */}
        <div style={{
          position:'relative', borderRadius:24, overflow:'hidden',
          background:'linear-gradient(145deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.018) 100%)',
          border:`1px solid ${C.borderP}`,
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.09), 0 24px 48px rgba(0,0,0,0.6)',
          padding:'20px 20px 18px',
        }}>
          <Noise/>
          {/* Inner aurora */}
          <div aria-hidden style={{ position:'absolute', inset:0, zIndex:0, overflow:'hidden', borderRadius:'inherit' }}>
            <div style={{ position:'absolute', top:-80, left:'25%', width:280, height:220, background:'radial-gradient(ellipse, rgba(109,40,217,0.28) 0%, transparent 70%)', filter:'blur(40px)', animation:'auroraA 8s ease-in-out infinite alternate' }}/>
            <div style={{ position:'absolute', bottom:-40, right:'5%', width:200, height:180, background:'radial-gradient(ellipse, rgba(79,70,229,0.2) 0%, transparent 70%)', filter:'blur(30px)', animation:'auroraB 11s ease-in-out infinite alternate-reverse' }}/>
          </div>
          {/* Top highlight line */}
          <div aria-hidden style={{ position:'absolute', top:0, left:20, right:20, height:1, background:'linear-gradient(90deg, transparent, rgba(167,139,250,0.6), transparent)', zIndex:5 }}/>

          <div style={{ position:'relative', zIndex:2 }}>
            {/* Metric row */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:C.text3, letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>今日待处理</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
                  {isLoading
                    ? <Skeleton w={96} h={56} r={8}/>
                    : <span style={{ fontSize:60, fontWeight:900, letterSpacing:-4, fontVariantNumeric:'tabular-nums', background:'linear-gradient(160deg, #fff 40%, rgba(255,255,255,0.5) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1 }}>{totalCount}</span>
                  }
                  {!isLoading && data && (
                    <div style={{ display:'flex', flexDirection:'column', gap:1, paddingBottom:6 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:data.deltaVsYesterday >= 0 ? C.green : C.red, letterSpacing:-0.3 }}>
                        {data.deltaVsYesterday >= 0 ? '↑' : '↓'}{Math.abs(data.deltaVsYesterday)}
                      </span>
                      <span style={{ fontSize:10, color:C.text3 }}>vs 昨日</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize:13, color:C.text3, fontWeight:400, marginTop:4 }}>条消息待回复</div>
              </div>

              {/* Arc progress */}
              <div style={{ position:'relative', flexShrink:0, marginTop:4 }}>
                {isLoading
                  ? <Skeleton w={68} h={68} r={34}/>
                  : <>
                      <ArcProgress value={data?.completionRate ?? 0} max={100} size={68} stroke={4.5} color={C.primary}/>
                      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1 }}>
                        <span style={{ fontSize:15, fontWeight:700, color:C.text1, fontVariantNumeric:'tabular-nums', letterSpacing:-0.5 }}>{data?.completionRate ?? 0}%</span>
                        <span style={{ fontSize:9, color:C.text3, fontWeight:500 }}>完成率</span>
                      </div>
                    </>
                }
              </div>
            </div>

            {/* Divider */}
            <div style={{ height:1, background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)', margin:'0 0 14px' }}/>

            {/* Category chips */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
              {categories.map((cat, i) => {
                const cfg = chipCfg[i];
                return (
                  <div key={cat.id} style={{ position:'relative', padding:'10px 0 8px', borderRadius:14, background:cfg.bg, border:`1px solid ${cfg.border}`, display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer' }}>
                    {cat.hasUrgent && (
                      <div style={{ position:'absolute', top:-3, right:-3, width:8, height:8, borderRadius:'50%', background:C.red, border:`1.5px solid ${C.bg}`, boxShadow:`0 0 6px ${C.red}` }}/>
                    )}
                    <div style={{ color:cfg.color, display:'flex', alignItems:'center', justifyContent:'center' }}>{cfg.icon}</div>
                    {isLoading
                      ? <Skeleton w={20} h={16} r={4}/>
                      : <span style={{ fontSize:15, fontWeight:800, color:cfg.color, fontVariantNumeric:'tabular-nums', letterSpacing:-0.5, lineHeight:1 }}>{cat.count}</span>
                    }
                    <span style={{ fontSize:9.5, color:C.text3, fontWeight:500 }}>{cat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Platform Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <PlatformCard platform={tiktok} isLoading={isLoading}/>
          <PlatformCard platform={meta}   isLoading={isLoading}/>
        </div>

        {/* ── AI Chat Card ── */}
        <div style={{
          borderRadius:24, overflow:'hidden', position:'relative',
          background:'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
          border:`1px solid ${C.border1}`,
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <Noise/>
          {/* Top accent line */}
          <div aria-hidden style={{ position:'absolute', top:0, left:20, right:20, height:1, background:`linear-gradient(90deg, transparent, ${C.primaryL}60, transparent)`, zIndex:5 }}/>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 12px', position:'relative', zIndex:2 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg, #7C3AED, #4338CA)', border:'1.5px solid rgba(255,255,255,0.12)', boxShadow:'0 0 0 3px rgba(124,58,237,0.18), 0 4px 12px rgba(124,58,237,0.35)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.95)"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize:13.5, fontWeight:600, color:C.text1, letterSpacing:-0.3 }}>Commander AI</div>
                <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:1 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:C.green, boxShadow:`0 0 4px ${C.green}` }}/>
                  <span style={{ fontSize:10, color:C.text3, fontWeight:500 }}>在线</span>
                </div>
              </div>
            </div>
            <button style={{ width:30, height:30, borderRadius:'50%', background:C.surface1, border:`1px solid ${C.border1}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' } as React.CSSProperties}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <Divider/>

          {/* Messages */}
          <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, position:'relative', zIndex:2 }}>
            {data?.chatHistory.map(msg => <ChatBubble key={msg.id} msg={msg}/>)}

            {/* Typing indicator */}
            {aiTyping && (
              <div style={{ display:'flex', alignItems:'flex-end', gap:8, animation:'msgIn 0.25s ease-out' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg, #7C3AED, #4338CA)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(124,58,237,0.4)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.95)"/></svg>
                </div>
                <div style={{ padding:'10px 14px', borderRadius:'16px 16px 16px 4px', background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.2)', display:'flex', gap:5, alignItems:'center' }}>
                  {[0,180,360].map(d => (
                    <div key={d} style={{ width:5, height:5, borderRadius:'50%', background:C.primaryL, animation:'dotBounce 1.3s ease-in-out infinite', animationDelay:`${d}ms` }}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ display:'flex', gap:8, padding:'2px 16px 14px', position:'relative', zIndex:2 }}>
            {[
              { label:'查看全部', primary:true },
              { label:'标记已读', primary:false },
              { label:'优先处理', primary:false },
            ].map(({ label, primary }) => (
              <button key={label} style={{
                flex:1, padding:'8px 0', borderRadius:12, cursor:'pointer',
                background: primary ? 'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(67,56,202,0.18))' : C.surface1,
                border: primary ? `1px solid rgba(124,58,237,0.35)` : `1px solid ${C.border1}`,
                color: primary ? C.primaryL : C.text3,
                fontSize:11.5, fontWeight:600, letterSpacing:-0.2, fontFamily:'inherit',
              } as React.CSSProperties}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scroll padding */}
        <div style={{ height:16 }}/>
      </div>

      {/* ── Bottom Input Bar ── */}
      <div style={{
        flexShrink:0, padding:'8px 16px 34px', position:'relative', zIndex:10,
        background:`linear-gradient(to top, ${C.bg} 55%, transparent)`,
      }}>
        <div style={{
          display:'flex', alignItems:'center', gap:10, padding:'8px 8px 8px 12px',
          borderRadius:50, background:'rgba(255,255,255,0.045)',
          border:`1px solid rgba(255,255,255,0.09)`,
          backdropFilter:'blur(40px)',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          {/* Mic button */}
          <button style={{ width:36, height:36, borderRadius:'50%', border:`1px solid ${C.border1}`, background:C.surface1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } as React.CSSProperties}>
            <svg width="15" height="18" viewBox="0 0 15 18" fill="none" stroke={C.text2} strokeWidth="1.6" strokeLinecap="round">
              <rect x="4.5" y="1" width="6" height="10" rx="3"/>
              <path d="M1.5 8.5C1.5 12 4.2 14.5 7.5 14.5C10.8 14.5 13.5 12 13.5 8.5"/>
              <line x1="7.5" y1="14.5" x2="7.5" y2="17"/>
              <line x1="5" y1="17" x2="10" y2="17"/>
            </svg>
          </button>

          <input
            type="text"
            placeholder="晚安，需要我帮您做什么？"
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:14, color:C.text1, caretColor:C.primaryL }}
          />

          {/* Send button */}
          <button style={{
            width:36, height:36, borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0,
            background: input ? `linear-gradient(135deg, ${C.primary}, #4338CA)` : 'white',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: input ? `0 4px 16px rgba(124,58,237,0.55)` : '0 2px 10px rgba(0,0,0,0.4)',
            transition:'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          } as React.CSSProperties}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={input?'white':'#07060F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input?'white':'#07060F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Home indicator */}
        <div style={{ width:108, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:'10px auto 0' }}/>
      </div>

      <style>{`
        @keyframes ambA    { 0%{transform:scale(1)translate(0,0);}   100%{transform:scale(1.2)translate(30px,-20px);} }
        @keyframes ambB    { 0%{transform:scale(1)translate(0,0);}   100%{transform:scale(1.15)translate(-20px,15px);} }
        @keyframes auroraA { 0%{transform:scale(1)translate(0,0);}   100%{transform:scale(1.25)translate(25px,-15px);} }
        @keyframes auroraB { 0%{transform:scale(1)translate(0,0);}   100%{transform:scale(1.2)translate(-20px,12px);} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)scale(1);opacity:.45;} 40%{transform:translateY(-5px)scale(1.25);opacity:1;} }
        @keyframes msgIn   { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes skPulse { 0%,100%{opacity:.45;} 50%{opacity:.9;} }
        input::placeholder { color:rgba(255,255,255,0.2); }
        button { -webkit-tap-highlight-color:transparent; font-family:inherit; }
        *::-webkit-scrollbar { display:none; }
      `}</style>
    </div>
  );
}
