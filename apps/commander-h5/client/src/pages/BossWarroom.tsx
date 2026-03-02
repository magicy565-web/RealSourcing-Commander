import { useState, useEffect, useRef } from 'react';
import { useWarroomData } from '../hooks/useWarroomData';
import type { PlatformData, ChatMessage } from '../types/warroom';

/* ─────────────────────────────────────────────────────────────────
   Design System v4 — Multi-platform Brand Cards
   ─────────────────────────────────────────────────────────────────
   Philosophy: Each card tells ONE story. Brand identity is sacred.
   Color:   #000 base · single primary #7C3AED · 8-step opacity
   Grid:    8pt · card padding 20px · gap 12px · 2×2 platform grid
   Type:    900w hero · 700w label · 400w body · tabular-nums
   Cards:   glass morphism · inner glow · top specular line
   Brands:  TikTok(#FE2C55+#00F2EA) · Meta(#0064E0) ·
            LinkedIn(#0A66C2) · Shopify(#96BF48+#5E8E3E)
   ───────────────────────────────────────────────────────────────── */

const C = {
  bg:       '#000000',
  s1:       'rgba(255,255,255,0.04)',
  s2:       'rgba(255,255,255,0.07)',
  b1:       'rgba(255,255,255,0.06)',
  b2:       'rgba(255,255,255,0.11)',
  bP:       'rgba(124,58,237,0.38)',
  P:        '#7C3AED',
  PL:       '#A78BFA',
  t1:       'rgba(255,255,255,0.92)',
  t2:       'rgba(255,255,255,0.52)',
  t3:       'rgba(255,255,255,0.26)',
  amber:    '#F59E0B',
  amberL:   '#FCD34D',
  green:    '#10B981',
  red:      '#F87171',
  blue:     '#60A5FA',
  indigo:   '#818CF8',
};

// ── Hooks ──────────────────────────────────────────────────────────
function useCounter(target: number, duration = 800, enabled = true) {
  const [val, setVal] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const from = prevRef.current;
    prevRef.current = target;
    let raf = 0, start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(from + (target - from) * ease));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return val;
}

function usePress() {
  const [on, set] = useState(false);
  return { on, bind: { onPointerDown:()=>set(true), onPointerUp:()=>set(false), onPointerLeave:()=>set(false) } };
}

// ── Primitives ─────────────────────────────────────────────────────
const Noise = () => (
  <svg aria-hidden style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.022, pointerEvents:'none', zIndex:1, borderRadius:'inherit' }}>
    <filter id="nz"><feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#nz)"/>
  </svg>
);

const Skeleton = ({ w, h, r=8 }:{ w:string|number; h:number; r?:number }) => (
  <div style={{ width:w, height:h, borderRadius:r, background:'rgba(255,255,255,0.055)', animation:'skPulse 1.6s ease-in-out infinite' }}/>
);

// ── Sparkline ──────────────────────────────────────────────────────
function Sparkline({ data, color, w=100, h=36 }:{ data:number[]; color:string; w?:number; h?:number }) {
  if (data.length < 2) return (
    <div style={{ width:w, height:h, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'60%', height:1, background:'rgba(255,255,255,0.08)', borderRadius:1 }}/>
    </div>
  );
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pad = 4;
  const pts = data.map((v,i) => {
    const x = (i / (data.length-1)) * w;
    const y = h - pad - ((v-min)/range) * (h - pad*2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = pts.split(' ').pop()!;
  const [lx, ly] = last.split(',').map(Number);
  const gid = `spk${color.replace(/[^a-z0-9]/gi,'')}${w}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display:'block', overflow:'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${gid})`}/>
      <polyline points={pts} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lx} cy={ly} r="3" fill={color} style={{ filter:`drop-shadow(0 0 4px ${color})` }}/>
    </svg>
  );
}

// ── Arc progress ───────────────────────────────────────────────────
function Arc({ v, max, size=72, sw=5, color=C.P }:{ v:number; max:number; size?:number; sw?:number; color?:string }) {
  const r = (size - sw*2) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(v,max)/max) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ filter:`drop-shadow(0 0 6px ${color}88)`, transition:'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  );
}

// ── Card shell ─────────────────────────────────────────────────────
function Card({ children, style={}, accentColor, dark=false }:{ children:React.ReactNode; style?:React.CSSProperties; accentColor?:string; dark?:boolean }) {
  return (
    <div style={{
      position:'relative', borderRadius:24, overflow:'hidden',
      background: dark ? '#0A0A0A' : 'linear-gradient(145deg, rgba(255,255,255,0.046) 0%, rgba(255,255,255,0.018) 100%)',
      border: `1px solid ${accentColor ? `${accentColor}40` : C.b1}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,${dark?'0.04':'0.08'}), 0 20px 40px rgba(0,0,0,0.55)`,
      ...style,
    }}>
      <Noise/>
      <div aria-hidden style={{ position:'absolute', top:0, left:16, right:16, height:1, background:`linear-gradient(90deg, transparent, ${accentColor ?? 'rgba(255,255,255,0.18)'}, transparent)`, zIndex:5, pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:2 }}>{children}</div>
    </div>
  );
}

// ── Status bar ─────────────────────────────────────────────────────
function StatusBar({ time }:{ time:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 22px 0', flexShrink:0 }}>
      <span style={{ fontSize:16, fontWeight:700, letterSpacing:-0.5, fontVariantNumeric:'tabular-nums' }}>{time||'9:41'}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          {[0,1,2,3].map(i=><rect key={i} x={i*4} y={10-i*2.5} width="3" height={i*2.5+1} rx="0.6" fill="white" opacity={i<3?1:0.3}/>)}
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
          <circle cx="7.5" cy="10" r="1.3" fill="white"/>
          <path d="M4.5 7C5.6 5.8 6.5 5.2 7.5 5.2s1.9.6 3 1.8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M1.5 4C3.3 1.9 5.3.8 7.5.8s4.2 1.1 6 3.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.35"/>
        </svg>
        <div style={{ position:'relative', width:24, height:11 }}>
          <div style={{ position:'absolute', inset:0, borderRadius:3, border:'1.5px solid rgba(255,255,255,0.45)' }}/>
          <div style={{ position:'absolute', left:2, top:2, bottom:2, width:'72%', background:'white', borderRadius:1.5 }}/>
          <div style={{ position:'absolute', right:-3, top:'50%', transform:'translateY(-50%)', width:2.5, height:5, background:'rgba(255,255,255,0.3)', borderRadius:'0 1px 1px 0' }}/>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Brand Icons
// ══════════════════════════════════════════════════════════════════

// TikTok — triple-layer offset logo
function TikTokIcon({ size=22 }:{ size?:number }) {
  const p = "M22 0C22 4.9 25.8 8.5 30 8.5V15.5C27.5 15.5 25.2 14.6 23.5 13.2V23.5C23.5 30.4 18 36 11.5 36C5 36 0 30.4 0 23.5C0 16.6 5 11 11.5 11C12 11 12.5 11.1 13 11.1V18.2C12.5 18.1 12 18 11.5 18C8.5 18 6 20.5 6 23.5C6 26.5 8.5 29 11.5 29C14.5 29 17 26.5 17 23.5V0H22Z";
  return (
    <div style={{ position:'relative', width:size, height:size*1.2, flexShrink:0 }}>
      {[{dx:-1,dy:1,c:'#00F2EA',o:0.7},{dx:1,dy:1,c:'#FF0050',o:0.7},{dx:0,dy:0,c:'white',o:1}].map((l,i)=>(
        <svg key={i} style={{ position:'absolute', left:l.dx, top:l.dy, opacity:l.o }} width={size} height={size*1.2} viewBox="0 0 30 36" fill={l.c}><path d={p}/></svg>
      ))}
    </div>
  );
}

// Meta — infinity loop with blue gradient
function MetaFBIcon({ size=28 }:{ size?:number }) {
  return (
    <svg width={size} height={size*0.5} viewBox="0 0 56 28" fill="none">
      <defs>
        <linearGradient id="metaGrad" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0064E0"/>
          <stop offset="50%" stopColor="#0082FB"/>
          <stop offset="100%" stopColor="#00B4FF"/>
        </linearGradient>
      </defs>
      {/* Meta ∞ shape */}
      <path d="M8 14C8 9.6 10.8 6 14.5 6C17.8 6 20.2 8.2 23.5 14C26.8 19.8 29.2 22 32.5 22C36.2 22 39 18.4 39 14C39 9.6 36.2 6 32.5 6C29.2 6 26.8 8.2 23.5 14C20.2 19.8 17.8 22 14.5 22C10.8 22 8 18.4 8 14Z" stroke="url(#metaGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// LinkedIn — blue "in" wordmark
function LinkedInIcon({ size=28 }:{ size?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#0A66C2"/>
      {/* "in" letterform */}
      <rect x="6" y="10" width="3.5" height="12" rx="1" fill="white"/>
      <circle cx="7.75" cy="7.5" r="2" fill="white"/>
      <path d="M12.5 10h3.2v1.8c.7-1.1 2-2 3.8-2C22.5 9.8 24 11.5 24 14.5V22h-3.5v-6.8c0-1.6-.7-2.5-2-2.5-1.4 0-2.5 1-2.5 2.8V22H12.5V10z" fill="white"/>
    </svg>
  );
}

// Shopify — shopping bag with leaf
function ShopifyIcon({ size=28 }:{ size?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Bag body */}
      <path d="M7 10.5L8.5 22h11L21 10.5" stroke="#96BF48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Handle */}
      <path d="M10.5 10.5C10.5 8 12 6 14 6C16 6 17.5 8 17.5 10.5" stroke="#96BF48" strokeWidth="2" strokeLinecap="round"/>
      {/* Shopify "S" leaf accent */}
      <path d="M18.5 7C18.5 7 17.5 6.5 16.5 7C15.5 7.5 15.5 8.5 16 9C16.5 9.5 17.5 9.5 18 10C18.5 10.5 18.5 11.5 17.5 12" stroke="#5E8E3E" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════
// Shared platform card shell — enforces consistent structure
// ══════════════════════════════════════════════════════════════════
interface PlatformCardProps {
  platform?: PlatformData;
  isLoading: boolean;
  // Brand config
  brandName: string;
  brandSub: string;
  brandColor: string;       // primary accent (Sparkline, number)
  glowColorA: string;       // top-left glow
  glowColorB: string;       // bottom-right glow
  specularA: string;        // top specular line color A
  specularB: string;        // top specular line color B
  bgGradient: string;       // card background gradient
  borderColor: string;      // card border
  textDark?: boolean;       // true for light-background cards (Meta)
  icon: React.ReactNode;
}

function PlatformCard({
  platform, isLoading,
  brandName, brandSub, brandColor,
  glowColorA, glowColorB, specularA, specularB,
  bgGradient, borderColor, textDark = false,
  icon,
}: PlatformCardProps) {
  const count = useCounter(platform?.unreadCount ?? 0, 900, !isLoading);
  const { on, bind } = usePress();
  const trend = platform?.trend7d ?? [];
  const up = trend.length >= 2 && trend[trend.length - 1] > trend[0];
  const pct = trend.length >= 2 && trend[0] !== 0
    ? Math.round(((trend[trend.length - 1] - trend[0]) / Math.abs(trend[0])) * 100)
    : 0;

  const textPrimary = textDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.92)';
  const textSub     = textDark ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.28)';
  const textMuted   = textDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.18)';
  const dotBg       = textDark ? '#E5E7EB' : C.bg;

  return (
    <div {...bind} style={{
      borderRadius: 22, overflow: 'hidden', position: 'relative',
      background: bgGradient,
      border: `1px solid ${borderColor}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,${textDark ? '0.7' : '0.04'}), 0 20px 48px rgba(0,0,0,${textDark ? '0.18' : '0.75'})`,
      padding: '16px 14px 14px',
      transform: on ? 'scale(0.96)' : 'scale(1)',
      transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
      cursor: 'pointer', minHeight: 172,
      display: 'flex', flexDirection: 'column',
    }}>
      <Noise/>

      {/* Brand ambient glows */}
      <div aria-hidden style={{ position:'absolute', top:-50, left:-20, width:150, height:150, borderRadius:'50%', background:`radial-gradient(circle, ${glowColorA} 0%, transparent 65%)`, filter:'blur(28px)', pointerEvents:'none', zIndex:0 }}/>
      <div aria-hidden style={{ position:'absolute', bottom:-40, right:-15, width:130, height:130, borderRadius:'50%', background:`radial-gradient(circle, ${glowColorB} 0%, transparent 65%)`, filter:'blur(24px)', pointerEvents:'none', zIndex:0 }}/>

      {/* Top specular line — brand-colored */}
      <div aria-hidden style={{ position:'absolute', top:0, left:10, right:10, height:1, background:`linear-gradient(90deg, transparent, ${specularA}, ${specularB}, transparent)`, zIndex:5 }}/>

      <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', flex:1 }}>

        {/* ── Header: Icon + trend badge + status dot ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          {icon}
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            {trend.length >= 2 && (
              <div style={{
                padding:'2px 7px', borderRadius:50,
                background: up ? 'rgba(16,185,129,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1px solid ${up ? 'rgba(16,185,129,0.25)' : 'rgba(248,113,113,0.25)'}`,
              }}>
                <span style={{ fontSize:10, fontWeight:700, color:up?C.green:C.red, letterSpacing:-0.2 }}>
                  {up ? '+' : ''}{pct}%
                </span>
              </div>
            )}
            <div style={{
              width:6, height:6, borderRadius:'50%',
              background: platform?.isConnected ? C.green : (textDark ? '#9CA3AF' : '#4B5563'),
              boxShadow: platform?.isConnected ? `0 0 6px ${C.green}` : 'none',
            }}/>
          </div>
        </div>

        {/* ── Platform label ── */}
        <div style={{ fontSize:10, fontWeight:600, color:textMuted, letterSpacing:0.8, textTransform:'uppercase', marginBottom:5 }}>
          {brandSub}
        </div>

        {/* ── Hero number ── */}
        {isLoading ? <Skeleton w="65%" h={40} r={8}/> : (
          <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
            <span style={{
              fontSize:40, fontWeight:900, letterSpacing:-2.5,
              fontVariantNumeric:'tabular-nums', lineHeight:1,
              background: textDark
                ? `linear-gradient(135deg, ${brandColor} 30%, ${brandColor}99)`
                : `linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.55))`,
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>
              {count}
            </span>
          </div>
        )}
        <div style={{ fontSize:11, color:textSub, fontWeight:500, marginTop:3 }}>条未读消息</div>

        {/* ── Sparkline ── */}
        <div style={{ marginTop:'auto', paddingTop:10 }}>
          {isLoading
            ? <Skeleton w="100%" h={32} r={6}/>
            : <Sparkline data={trend} color={brandColor} w={130} h={32}/>
          }
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CARD 1 — Hero Metric Card
// ══════════════════════════════════════════════════════════════════
function HeroCard({ data, isLoading }:{ data:any; isLoading:boolean }) {
  const total = useCounter(data?.totalPending ?? 0, 1000, !isLoading && !!data);
  const cats = data?.categories ?? [
    {id:'email',label:'邮件',count:0},
    {id:'task',label:'任务',count:0},
    {id:'notification',label:'通知',count:0,hasUrgent:false},
    {id:'other',label:'其他',count:0},
  ];

  const catCfg = [
    { color:C.PL,    bg:'rgba(167,139,250,0.1)', icon:'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { color:C.green, bg:'rgba(16,185,129,0.1)',  icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { color:C.amberL,bg:'rgba(252,211,77,0.1)',  icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { color:C.blue,  bg:'rgba(96,165,250,0.1)',  icon:'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  ];

  return (
    <Card accentColor={C.PL} style={{ padding:'22px 20px 20px' }}>
      {/* Aurora background */}
      <div aria-hidden style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:'inherit', zIndex:0 }}>
        <div style={{ position:'absolute', top:-100, left:'20%', width:300, height:250, background:'radial-gradient(ellipse, rgba(109,40,217,0.3) 0%, transparent 68%)', filter:'blur(60px)', animation:'ambA 13s ease-in-out infinite alternate' }}/>
        <div style={{ position:'absolute', bottom:-80, right:'10%', width:240, height:200, background:'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 68%)', filter:'blur(50px)', animation:'ambB 16s ease-in-out infinite alternate-reverse' }}/>
      </div>

      <div style={{ position:'relative', zIndex:2 }}>
        {/* ── Top row: metric + arc ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:C.t3, letterSpacing:0.6, textTransform:'uppercase', marginBottom:8 }}>今日待处理</div>
            {isLoading ? <Skeleton w={120} h={60} r={10}/> : (
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ fontSize:60, fontWeight:900, letterSpacing:-4, fontVariantNumeric:'tabular-nums', lineHeight:1, background:'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.5))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  {total}
                </span>
                {data?.deltaVsYesterday !== undefined && (
                  <span style={{ fontSize:13, fontWeight:700, color:data.deltaVsYesterday >= 0 ? C.red : C.green, letterSpacing:-0.3 }}>
                    {data.deltaVsYesterday >= 0 ? '+' : ''}{data.deltaVsYesterday}
                  </span>
                )}
              </div>
            )}
            <div style={{ fontSize:12, color:C.t3, marginTop:4 }}>较昨日</div>
          </div>

          {/* Arc progress */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <Arc v={data?.completionRate ?? 0} max={100} size={72} sw={5} color={C.P}/>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:16, fontWeight:800, color:C.t1, fontVariantNumeric:'tabular-nums', letterSpacing:-0.5 }}>{data?.completionRate ?? 0}%</span>
              <span style={{ fontSize:8.5, color:C.t3, fontWeight:500, marginTop:1 }}>完成率</span>
            </div>
          </div>
        </div>

        {/* ── Category chips ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {cats.map((cat: any, i: number) => {
            const cfg = catCfg[i] ?? catCfg[3];
            return (
              <div key={cat.id} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'10px 4px 8px', borderRadius:14, background:cfg.bg, border:`1px solid ${cfg.color}22` }}>
                {cat.hasUrgent && <div style={{ position:'absolute', top:-3, right:-3, width:8, height:8, borderRadius:'50%', background:C.red, border:`1.5px solid ${C.bg}`, boxShadow:`0 0 7px ${C.red}` }}/>}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={cfg.icon}/>
                </svg>
                {isLoading ? <Skeleton w={18} h={16} r={4}/> : (
                  <span style={{ fontSize:16, fontWeight:800, color:cfg.color, fontVariantNumeric:'tabular-nums', letterSpacing:-0.8, lineHeight:1 }}>{cat.count}</span>
                )}
                <span style={{ fontSize:10, color:C.t3, fontWeight:500 }}>{cat.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// CARD 2 — Platform Cards (2×2 grid)
// TikTok · Meta/Facebook · LinkedIn · Shopify
// ══════════════════════════════════════════════════════════════════

function TikTokCard({ platform, isLoading }: { platform?:PlatformData; isLoading:boolean }) {
  return (
    <PlatformCard
      platform={platform} isLoading={isLoading}
      brandName="TikTok" brandSub="抖音 · Douyin"
      brandColor="#FE2C55"
      glowColorA="rgba(0,242,234,0.07)"
      glowColorB="rgba(255,0,80,0.07)"
      specularA="rgba(0,242,234,0.18)"
      specularB="rgba(255,0,80,0.18)"
      bgGradient="linear-gradient(160deg, #141414 0%, #0C0C0C 100%)"
      borderColor="rgba(255,255,255,0.06)"
      icon={<TikTokIcon size={20}/>}
    />
  );
}

function MetaCard({ platform, isLoading }: { platform?:PlatformData; isLoading:boolean }) {
  return (
    <PlatformCard
      platform={platform} isLoading={isLoading}
      brandName="Meta" brandSub="Meta · Facebook"
      brandColor="#0064E0"
      glowColorA="rgba(0,100,224,0.1)"
      glowColorB="rgba(0,180,255,0.08)"
      specularA="rgba(0,100,224,0.3)"
      specularB="rgba(0,180,255,0.2)"
      bgGradient="linear-gradient(160deg, #0A1628 0%, #071020 100%)"
      borderColor="rgba(0,100,224,0.2)"
      icon={<MetaFBIcon size={32}/>}
    />
  );
}

function LinkedInCard({ platform, isLoading }: { platform?:PlatformData; isLoading:boolean }) {
  return (
    <PlatformCard
      platform={platform} isLoading={isLoading}
      brandName="LinkedIn" brandSub="领英 · LinkedIn"
      brandColor="#0A66C2"
      glowColorA="rgba(10,102,194,0.12)"
      glowColorB="rgba(10,102,194,0.06)"
      specularA="rgba(10,102,194,0.35)"
      specularB="rgba(56,168,255,0.2)"
      bgGradient="linear-gradient(160deg, #071525 0%, #040E1A 100%)"
      borderColor="rgba(10,102,194,0.22)"
      icon={<LinkedInIcon size={26}/>}
    />
  );
}

function ShopifyCard({ platform, isLoading }: { platform?:PlatformData; isLoading:boolean }) {
  return (
    <PlatformCard
      platform={platform} isLoading={isLoading}
      brandName="Shopify" brandSub="Shopify · 独立站"
      brandColor="#96BF48"
      glowColorA="rgba(150,191,72,0.1)"
      glowColorB="rgba(94,142,62,0.08)"
      specularA="rgba(150,191,72,0.3)"
      specularB="rgba(94,142,62,0.2)"
      bgGradient="linear-gradient(160deg, #0D1A07 0%, #091305 100%)"
      borderColor="rgba(150,191,72,0.2)"
      icon={<ShopifyIcon size={26}/>}
    />
  );
}

// ══════════════════════════════════════════════════════════════════
// CARD 3 — AI Chat Card
// ══════════════════════════════════════════════════════════════════
function ChatBubble({ msg }:{ msg:ChatMessage }) {
  const isAI = msg.role === 'ai';
  const t = new Date(msg.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:isAI?'flex-start':'flex-end', gap:3, animation:'msgIn 0.3s ease-out' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
        {isAI && (
          <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg, #7C3AED, #4338CA)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 10px rgba(124,58,237,0.45), 0 0 0 2px rgba(124,58,237,0.15)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.95)"/></svg>
          </div>
        )}
        <div style={{
          maxWidth:'78%', padding:'10px 14px',
          borderRadius: isAI ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
          background: isAI
            ? 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(67,56,202,0.12) 100%)'
            : 'rgba(255,255,255,0.09)',
          border: isAI ? '1px solid rgba(124,58,237,0.25)' : '1px solid rgba(255,255,255,0.1)',
          backdropFilter:'blur(20px)',
          boxShadow: isAI ? 'inset 0 1px 0 rgba(167,139,250,0.15)' : 'none',
        }}>
          <span style={{ fontSize:13.5, color:C.t1, lineHeight:1.6, fontWeight:400 }}>{msg.content}</span>
        </div>
      </div>
      <span style={{ fontSize:10, color:C.t3, paddingLeft:isAI?36:0, paddingRight:isAI?0:2 }}>{t}</span>
    </div>
  );
}

function AIChatCard({ chatHistory, aiTyping }:{ chatHistory:ChatMessage[]; aiTyping:boolean }) {
  return (
    <Card accentColor={C.PL}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 18px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg, #7C3AED 0%, #4338CA 100%)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 3px rgba(124,58,237,0.2), 0 4px 14px rgba(124,58,237,0.4)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.95)"/></svg>
            </div>
            <div style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background:C.green, border:`2px solid ${C.bg}`, boxShadow:`0 0 6px ${C.green}` }}/>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.t1, letterSpacing:-0.3 }}>Commander AI</div>
            <div style={{ fontSize:10.5, color:C.t3, fontWeight:400, marginTop:1 }}>随时为您服务</div>
          </div>
        </div>
        <div style={{ width:32, height:32, borderRadius:'50%', background:C.s1, border:`1px solid ${C.b1}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>

      <div style={{ height:1, background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', margin:'0 18px' }}/>

      <div style={{ padding:'14px 18px 12px', display:'flex', flexDirection:'column', gap:12 }}>
        {chatHistory.length === 0 && !aiTyping && (
          <div style={{ textAlign:'center', padding:'16px 0', color:C.t3, fontSize:13 }}>暂无消息，等待新询盘…</div>
        )}
        {chatHistory.map(msg => <ChatBubble key={msg.id} msg={msg}/>)}
        {aiTyping && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, animation:'msgIn 0.3s ease-out' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg, #7C3AED, #4338CA)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 10px rgba(124,58,237,0.45)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.95)"/></svg>
            </div>
            <div style={{ padding:'11px 16px', borderRadius:'16px 16px 16px 4px', background:'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(67,56,202,0.1))', border:'1px solid rgba(124,58,237,0.22)', display:'flex', gap:5, alignItems:'center', boxShadow:'inset 0 1px 0 rgba(167,139,250,0.12)' }}>
              {[0,160,320].map(d=>(
                <div key={d} style={{ width:5, height:5, borderRadius:'50%', background:C.PL, animation:'dotB 1.3s ease-in-out infinite', animationDelay:`${d}ms` }}/>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:8, padding:'4px 18px 18px', flexWrap:'wrap' }}>
        {[
          { label:'查看全部消息', primary:true },
          { label:'标记已读', primary:false },
          { label:'优先处理', primary:false },
        ].map(({ label, primary }) => (
          <button key={label} style={{
            padding:'7px 14px', borderRadius:50, cursor:'pointer', fontFamily:'inherit',
            background: primary ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(67,56,202,0.2))' : C.s1,
            border: primary ? '1px solid rgba(124,58,237,0.4)' : `1px solid ${C.b1}`,
            color: primary ? C.PL : C.t2,
            fontSize:12, fontWeight:600, letterSpacing:-0.2,
            boxShadow: primary ? '0 2px 12px rgba(124,58,237,0.2)' : 'none',
          } as React.CSSProperties}>
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════
export default function BossWarroom() {
  const { data, isLoading } = useWarroomData();
  const [time, setTime] = useState('');
  const [input, setInput] = useState('');
  const [aiTyping, setAiTyping] = useState(true);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}));
    tick(); const id = setInterval(tick,1000); return ()=>clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isLoading) { const t = setTimeout(()=>setAiTyping(false),2400); return ()=>clearTimeout(t); }
  }, [isLoading]);

  // Platform data — extend with linkedin/shopify from API when available
  const tiktok   = data?.platforms.find(p=>p.id==='tiktok');
  const meta     = data?.platforms.find(p=>p.id==='meta');
  // LinkedIn & Shopify: use empty state until backend provides data
  const linkedin: PlatformData = { id:'tiktok', unreadCount:0, trend7d:[], isConnected:false };
  const shopify:  PlatformData = { id:'meta',   unreadCount:0, trend7d:[], isConnected:false };

  return (
    <div style={{ height:'100dvh', background:C.bg, display:'flex', flexDirection:'column', fontFamily:'"SF Pro Display",-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif', color:C.t1, overflow:'hidden', WebkitFontSmoothing:'antialiased' }}>

      {/* Ambient lights */}
      <div aria-hidden style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:-140, left:-80, width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, rgba(109,40,217,0.16) 0%, transparent 65%)', filter:'blur(90px)', animation:'ambA 13s ease-in-out infinite alternate' }}/>
        <div style={{ position:'absolute', top:'40%', right:-100, width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%)', filter:'blur(75px)', animation:'ambB 16s ease-in-out infinite alternate-reverse' }}/>
        <div style={{ position:'absolute', bottom:'8%', left:'15%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.09) 0%, transparent 65%)', filter:'blur(65px)', animation:'ambA 11s ease-in-out infinite alternate 3s' }}/>
      </div>

      {/* Status bar */}
      <div style={{ position:'relative', zIndex:10, flexShrink:0 }}>
        <StatusBar time={time}/>
      </div>

      {/* App header */}
      <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px 8px', flexShrink:0 }}>
        <div>
          <h1 style={{ margin:0, fontSize:23, fontWeight:700, letterSpacing:-1, lineHeight:1.15 }}>指挥中心</h1>
          <p style={{ margin:'3px 0 0', fontSize:11.5, color:C.t3 }}>
            {data?.updatedAt ? `${new Date(data.updatedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 更新` : '同步中…'}
          </p>
        </div>
        <button style={{ position:'relative', width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg, #6D28D9, #4338CA)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 2.5px rgba(109,40,217,0.28), 0 4px 16px rgba(0,0,0,0.5)' } as React.CSSProperties}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.92)"/>
            <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke="rgba(255,255,255,0.92)" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          <div style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background:C.green, border:`2px solid ${C.bg}`, boxShadow:`0 0 7px ${C.green}` }}/>
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:'scroll', WebkitOverflowScrolling:'touch' as any, padding:'4px 16px 0', display:'flex', flexDirection:'column', gap:12, position:'relative', zIndex:10, scrollbarWidth:'none' }}>

        {/* Hero card */}
        <HeroCard data={data} isLoading={isLoading}/>

        {/* Platform cards — 2×2 grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <TikTokCard  platform={tiktok}   isLoading={isLoading}/>
          <MetaCard    platform={meta}     isLoading={isLoading}/>
          <LinkedInCard platform={linkedin} isLoading={isLoading}/>
          <ShopifyCard  platform={shopify}  isLoading={isLoading}/>
        </div>

        {/* AI Chat card */}
        <AIChatCard chatHistory={data?.chatHistory??[]} aiTyping={aiTyping}/>

        <div style={{ height:16 }}/>
      </div>

      {/* Bottom input bar */}
      <div style={{ flexShrink:0, padding:'8px 16px 36px', position:'relative', zIndex:10, background:`linear-gradient(to top, ${C.bg} 50%, transparent)` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 8px 8px 14px', borderRadius:50, background:'rgba(255,255,255,0.042)', border:`1px solid rgba(255,255,255,0.09)`, backdropFilter:'blur(40px)', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <button style={{ width:36, height:36, borderRadius:'50%', border:`1px solid ${C.b1}`, background:C.s1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 } as React.CSSProperties}>
            <svg width="14" height="18" viewBox="0 0 14 18" fill="none" stroke={C.t2} strokeWidth="1.6" strokeLinecap="round">
              <rect x="4" y="1" width="6" height="10" rx="3"/>
              <path d="M1 8.5C1 12 3.7 14.5 7 14.5C10.3 14.5 13 12 13 8.5"/>
              <line x1="7" y1="14.5" x2="7" y2="17"/>
              <line x1="4.5" y1="17" x2="9.5" y2="17"/>
            </svg>
          </button>
          <input type="text" placeholder="晚安，需要我帮您做什么？" value={input} onChange={e=>setInput(e.target.value)}
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:14, color:C.t1, caretColor:C.P }}
          />
          <button style={{ width:36, height:36, borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0, background:input?`linear-gradient(135deg, ${C.P}, #4338CA)`:'white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:input?`0 4px 18px rgba(124,58,237,0.6)`:'0 2px 10px rgba(0,0,0,0.4)', transition:'all 0.22s cubic-bezier(0.34,1.56,0.64,1)' } as React.CSSProperties}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={input?'white':'#07060F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input?'white':'#07060F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div style={{ width:108, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:'10px auto 0' }}/>
      </div>

      <style>{`
        @keyframes ambA   { 0%{transform:scale(1)translate(0,0);}    100%{transform:scale(1.2)translate(32px,-22px);} }
        @keyframes ambB   { 0%{transform:scale(1)translate(0,0);}    100%{transform:scale(1.15)translate(-24px,16px);} }
        @keyframes dotB   { 0%,80%,100%{transform:translateY(0)scale(1);opacity:.4;} 40%{transform:translateY(-5px)scale(1.3);opacity:1;} }
        @keyframes msgIn  { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes skPulse{ 0%,100%{opacity:.4;} 50%{opacity:.85;} }
        input::placeholder{ color:rgba(255,255,255,0.2); }
        button{ -webkit-tap-highlight-color:transparent; font-family:inherit; }
        *::-webkit-scrollbar{ display:none; }
      `}</style>
    </div>
  );
}
