import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import avatarImg from '../assets/avatar.png';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useWarroomData } from '../hooks/useWarroomData';
import { useWarroomWS } from '../hooks/useWarroomWS';
import { useProactiveCards } from '../hooks/useProactiveCards';
import { usePullToRefresh } from '../hooks/useSpringGesture';
import { FluidAurora } from '../components/FluidAurora';
import { ProactiveCardStack } from '../components/ProactiveCard';
import { VoiceInput } from '../components/VoiceInput';
import { QuickActions, buildQuickActions } from '../components/QuickActions';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '../lib/haptics';
import {
  IconInquiry, IconMessage, IconReply, IconBuyer, IconGlobe, IconUrgent,
  IconCheckCircle, IconClock, IconStar, IconFilter, IconSearch, IconSort,
  IconTrending, IconTrendingDown, IconPackage, IconTag, IconChevronRight, IconMore,
  IconDollar, IconShipping,
} from '../components/AppIcons';
import type { PlatformData, ChatMessage } from '../types/warroom';

/* ─────────────────────────────────────────────────────────────────
   Design System v5 — Fluid Aurora + Spring Physics
   ─────────────────────────────────────────────────────────────────
   Philosophy: Immersive · Alive · Responsive
   Visual:  Canvas fluid aurora · SVG noise micro-texture · edge diffraction
   Motion:  framer-motion spring physics · rubber-band pull-to-refresh
   Input:   Voice waveform · Quick actions · Haptic feedback
   Data:    WebSocket realtime · LinkedIn · Shopify · 7-day sparklines
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

// Spring config presets
const SPRING_SNAPPY  = { type: 'spring' as const, stiffness: 420, damping: 28 };
const SPRING_BOUNCY  = { type: 'spring' as const, stiffness: 380, damping: 22 };
const SPRING_GENTLE  = { type: 'spring' as const, stiffness: 260, damping: 30 };

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

// ── Primitives ─────────────────────────────────────────────────────
// Enhanced noise with edge diffraction effect
const Noise = ({ intensity = 0.022 }: { intensity?: number }) => (
  <svg aria-hidden style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:intensity, pointerEvents:'none', zIndex:1, borderRadius:'inherit' }}>
    <filter id="nz2">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#nz2)"/>
  </svg>
);

// Edge diffraction glow — simulates physical material light refraction
const EdgeDiffraction = ({ color = 'rgba(255,255,255,0.12)' }: { color?: string }) => (
  <div aria-hidden style={{
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: 3,
    boxShadow: `inset 0 0 0 0.5px ${color}, inset 0 1px 0 rgba(255,255,255,0.08)`,
  }}/>
);

const Skeleton = ({ w, h, r=8 }:{ w:string|number; h:number; r?:number }) => (
  <div style={{ width:w, height:h, borderRadius:r, background:'rgba(255,255,255,0.055)', animation:'skPulse 1.6s ease-in-out infinite' }}/>
);

// ── Enhanced Sparkline with smooth animation ───────────────────────
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

  // Smooth bezier path
  const points = data.map((v,i) => ({
    x: (i / (data.length-1)) * w,
    y: h - pad - ((v-min)/range) * (h - pad*2),
  }));
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cp1x = (points[i-1].x + points[i].x) / 2;
    d += ` C ${cp1x},${points[i-1].y} ${cp1x},${points[i].y} ${points[i].x},${points[i].y}`;
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display:'block', overflow:'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Filled area */}
      <path d={`${d} L ${points[points.length-1].x},${h} L ${points[0].x},${h} Z`} fill={`url(#${gid})`}/>
      {/* Smooth line */}
      <path d={d} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Endpoint dot with pulse */}
      <circle cx={lx} cy={ly} r="3.5" fill={color} style={{ filter:`drop-shadow(0 0 5px ${color})` }}/>
      <circle cx={lx} cy={ly} r="6" fill={color} opacity="0.15"/>
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
        style={{ filter:`drop-shadow(0 0 8px ${color}99)`, transition:'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  );
}

// ── Enhanced Card shell with spring press ─────────────────────────
function Card({ children, style={}, accentColor, dark=false, onPress }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accentColor?: string;
  dark?: boolean;
  onPress?: () => void;
}) {
  return (
    <motion.div
      whileTap={onPress ? { scale: 0.97 } : undefined}
      transition={SPRING_SNAPPY}
      onClick={onPress}
      style={{
        position:'relative', borderRadius:24, overflow:'hidden',
        background: dark ? '#0A0A0A' : 'linear-gradient(145deg, rgba(255,255,255,0.046) 0%, rgba(255,255,255,0.018) 100%)',
        border: `1px solid ${accentColor ? `${accentColor}40` : C.b1}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,${dark?'0.04':'0.08'}), 0 20px 40px rgba(0,0,0,0.55)`,
        cursor: onPress ? 'pointer' : 'default',
        ...style,
      }}
    >
      <Noise intensity={0.028}/>
      <EdgeDiffraction color={accentColor ? `${accentColor}30` : 'rgba(255,255,255,0.06)'}/>
      <div aria-hidden style={{ position:'absolute', top:0, left:16, right:16, height:1, background:`linear-gradient(90deg, transparent, ${accentColor ?? 'rgba(255,255,255,0.18)'}, transparent)`, zIndex:5, pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:2 }}>{children}</div>
    </motion.div>
  );
}

// ── Status bar ─────────────────────────────────────────────────────
function StatusBar({ time, wsStatus }:{ time:string; wsStatus: 'connected'|'disconnected'|'connecting'|'error' }) {
  const wsColor = wsStatus === 'connected' ? C.green : wsStatus === 'connecting' ? C.amber : C.red;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 22px 0', flexShrink:0 }}>
      <span style={{ fontSize:16, fontWeight:700, letterSpacing:-0.5, fontVariantNumeric:'tabular-nums' }}>{time||'9:41'}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {/* WS status dot */}
        <motion.div
          animate={{ opacity: wsStatus === 'connecting' ? [1, 0.3, 1] : 1 }}
          transition={{ duration: 1.2, repeat: wsStatus === 'connecting' ? Infinity : 0 }}
          style={{ width:5, height:5, borderRadius:'50%', background:wsColor, boxShadow:`0 0 5px ${wsColor}` }}
          title={`WebSocket: ${wsStatus}`}
        />
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
      <path d="M8 14C8 9.6 10.8 6 14.5 6C17.8 6 20.2 8.2 23.5 14C26.8 19.8 29.2 22 32.5 22C36.2 22 39 18.4 39 14C39 9.6 36.2 6 32.5 6C29.2 6 26.8 8.2 23.5 14C20.2 19.8 17.8 22 14.5 22C10.8 22 8 18.4 8 14Z" stroke="url(#metaGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function LinkedInIcon({ size=28 }:{ size?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#0A66C2"/>
      <rect x="6" y="10" width="3.5" height="12" rx="1" fill="white"/>
      <circle cx="7.75" cy="7.5" r="2" fill="white"/>
      <path d="M12.5 10h3.2v1.8c.7-1.1 2-2 3.8-2C22.5 9.8 24 11.5 24 14.5V22h-3.5v-6.8c0-1.6-.7-2.5-2-2.5-1.4 0-2.5 1-2.5 2.8V22H12.5V10z" fill="white"/>
    </svg>
  );
}

function ShopifyIcon({ size=28 }:{ size?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M7 10.5L8.5 22h11L21 10.5" stroke="#96BF48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.5 10.5C10.5 8 12 6 14 6C16 6 17.5 8 17.5 10.5" stroke="#96BF48" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18.5 7C18.5 7 17.5 6.5 16.5 7C15.5 7.5 15.5 8.5 16 9C16.5 9.5 17.5 9.5 18 10C18.5 10.5 18.5 11.5 17.5 12" stroke="#5E8E3E" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════
// Platform Card — Spring-animated with brand identity
// ══════════════════════════════════════════════════════════════════
interface PlatformCardProps {
  platform?: PlatformData;
  isLoading: boolean;
  brandName: string;
  brandSub: string;
  brandColor: string;
  glowColorA: string;
  glowColorB: string;
  specularA: string;
  specularB: string;
  bgGradient: string;
  borderColor: string;
  textDark?: boolean;
  icon: React.ReactNode;
  // Extended fields for LinkedIn/Shopify
  extraMetric?: { label: string; value: string; color?: string };
}

function PlatformCard({
  platform, isLoading,
  brandName, brandSub, brandColor,
  glowColorA, glowColorB, specularA, specularB,
  bgGradient, borderColor, textDark = false,
  icon, extraMetric,
}: PlatformCardProps) {
  const count = useCounter(platform?.unreadCount ?? 0, 900, !isLoading);
  const trend = platform?.trend7d ?? [];
  const up = trend.length >= 2 && trend[trend.length - 1] > trend[0];
  const pct = trend.length >= 2 && trend[0] !== 0
    ? Math.round(((trend[trend.length - 1] - trend[0]) / Math.abs(trend[0])) * 100)
    : 0;

  const textPrimary = textDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.92)';
  const textSub     = textDark ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.28)';
  const textMuted   = textDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.18)';

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={SPRING_BOUNCY}
      onTapStart={() => hapticSelection()}
      style={{
        borderRadius: 22, overflow: 'hidden', position: 'relative',
        background: bgGradient,
        border: `1px solid ${borderColor}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,${textDark ? '0.7' : '0.04'}), 0 20px 48px rgba(0,0,0,${textDark ? '0.18' : '0.75'})`,
        padding: '16px 14px 14px',
        cursor: 'pointer', minHeight: 172,
        display: 'flex', flexDirection: 'column',
      }}
    >
      <Noise intensity={0.025}/>
      <EdgeDiffraction color={`${brandColor}20`}/>

      {/* Brand ambient glows */}
      <div aria-hidden style={{ position:'absolute', top:-50, left:-20, width:150, height:150, borderRadius:'50%', background:`radial-gradient(circle, ${glowColorA} 0%, transparent 65%)`, filter:'blur(28px)', pointerEvents:'none', zIndex:0 }}/>
      <div aria-hidden style={{ position:'absolute', bottom:-40, right:-15, width:130, height:130, borderRadius:'50%', background:`radial-gradient(circle, ${glowColorB} 0%, transparent 65%)`, filter:'blur(24px)', pointerEvents:'none', zIndex:0 }}/>

      {/* Top specular line */}
      <div aria-hidden style={{ position:'absolute', top:0, left:10, right:10, height:1, background:`linear-gradient(90deg, transparent, ${specularA}, ${specularB}, transparent)`, zIndex:5 }}/>

      <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', flex:1 }}>
        {/* Header */}
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
            <motion.div
              animate={{ boxShadow: platform?.isConnected ? [`0 0 4px ${C.green}`, `0 0 8px ${C.green}`, `0 0 4px ${C.green}`] : 'none' }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                width:6, height:6, borderRadius:'50%',
                background: platform?.isConnected ? C.green : '#4B5563',
              }}
            />
          </div>
        </div>

        {/* Platform label */}
        <div style={{ fontSize:10, fontWeight:600, color:textMuted, letterSpacing:0.8, textTransform:'uppercase', marginBottom:5 }}>
          {brandSub}
        </div>

        {/* Hero number — 900 Black weight */}
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
        <div style={{ fontSize:11, color:textSub, fontWeight:400, marginTop:3 }}>条未读消息</div>

        {/* Extra metric (LinkedIn connections / Shopify GMV) */}
        {extraMetric && !isLoading && (
          <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ fontSize:10, color:textMuted, fontWeight:500 }}>{extraMetric.label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:extraMetric.color ?? brandColor, fontVariantNumeric:'tabular-nums' }}>{extraMetric.value}</span>
          </div>
        )}

        {/* Sparkline */}
        <div style={{ marginTop:'auto', paddingTop:10 }}>
          {isLoading
            ? <Skeleton w="100%" h={32} r={6}/>
            : <Sparkline data={trend} color={brandColor} w={130} h={32}/>
          }
        </div>
      </div>
    </motion.div>
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
      {/* Aurora background within card */}
      <div aria-hidden style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:'inherit', zIndex:0 }}>
        <div style={{ position:'absolute', top:-100, left:'20%', width:300, height:250, background:'radial-gradient(ellipse, rgba(109,40,217,0.3) 0%, transparent 68%)', filter:'blur(60px)', animation:'ambA 13s ease-in-out infinite alternate' }}/>
        <div style={{ position:'absolute', bottom:-80, right:'10%', width:240, height:200, background:'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 68%)', filter:'blur(50px)', animation:'ambB 16s ease-in-out infinite alternate-reverse' }}/>
      </div>

      <div style={{ position:'relative', zIndex:2 }}>
        {/* Top row: metric + arc */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:C.t3, letterSpacing:0.6, textTransform:'uppercase', marginBottom:8 }}>今日待处理</div>
            {isLoading ? <Skeleton w={120} h={60} r={10}/> : (
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                {/* 900 Black hero number */}
                <span style={{ fontSize:60, fontWeight:900, letterSpacing:-4, fontVariantNumeric:'tabular-nums', lineHeight:1, background:'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.5))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  {total}
                </span>
                {data?.deltaVsYesterday !== undefined && (
                  <motion.span
                    initial={{ opacity:0, y:4 }}
                    animate={{ opacity:1, y:0 }}
                    transition={SPRING_GENTLE}
                    style={{ fontSize:13, fontWeight:700, color:data.deltaVsYesterday >= 0 ? C.red : C.green, letterSpacing:-0.3 }}
                  >
                    {data.deltaVsYesterday >= 0 ? '+' : ''}{data.deltaVsYesterday}
                  </motion.span>
                )}
              </div>
            )}
            <div style={{ fontSize:12, color:C.t3, marginTop:4, fontWeight:400 }}>较昨日</div>
          </div>

          <div style={{ position:'relative', flexShrink:0 }}>
            <Arc v={data?.completionRate ?? 0} max={100} size={72} sw={5} color={C.P}/>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:16, fontWeight:800, color:C.t1, fontVariantNumeric:'tabular-nums', letterSpacing:-0.5 }}>{data?.completionRate ?? 0}%</span>
              <span style={{ fontSize:8.5, color:C.t3, fontWeight:400, marginTop:1 }}>完成率</span>
            </div>
          </div>
        </div>

        {/* Category chips */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {cats.map((cat: any, i: number) => {
            const cfg = catCfg[i] ?? catCfg[3];
            return (
              <motion.div
                key={cat.id}
                whileTap={{ scale: 0.93 }}
                transition={SPRING_SNAPPY}
                onTapStart={() => hapticSelection()}
                style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'10px 4px 8px', borderRadius:14, background:cfg.bg, border:`1px solid ${cfg.color}22`, cursor:'pointer' }}
              >
                {cat.hasUrgent && (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    style={{ position:'absolute', top:-3, right:-3, width:8, height:8, borderRadius:'50%', background:C.red, border:`1.5px solid ${C.bg}`, boxShadow:`0 0 7px ${C.red}` }}
                  />
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={cfg.icon}/>
                </svg>
                {isLoading ? <Skeleton w={18} h={16} r={4}/> : (
                  <span style={{ fontSize:16, fontWeight:800, color:cfg.color, fontVariantNumeric:'tabular-nums', letterSpacing:-0.8, lineHeight:1 }}>{cat.count}</span>
                )}
                <span style={{ fontSize:10, color:C.t3, fontWeight:400 }}>{cat.label}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// CARD 2 — Platform Cards (Swipeable Carousel)
// ══════════════════════════════════════════════════════════════════

// ── Swipeable Card Carousel — CSS scroll-snap 实现丝滑滑动 ──────────────────────
function SwipeableCards({ children }: { children: React.ReactNode[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const count = children.length;
  const isScrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 监听 scroll 事件更新分页点
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 清除之前的延迟判断
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const idx = Math.round(el.scrollLeft / el.offsetWidth);
      if (idx !== activeIndex) {
        setActiveIndex(idx);
        hapticSelection();
      }
    }, 80);
  }, [activeIndex]);

  // 点击分页点平滑滚动到对应卡片
  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.offsetWidth, behavior: 'smooth' });
    setActiveIndex(idx);
    hapticSelection();
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Scroll track with CSS scroll-snap */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'scroll',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch' as any,
          scrollbarWidth: 'none',
          gap: 12,
          borderRadius: 22,
          paddingBottom: 2,
          // 告知浏览器此区域只处理水平手势，垂直交给父容器
          touchAction: 'pan-x',
        } as React.CSSProperties}
      >
        {children.map((child, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: '100%',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
            }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 }}>
        {children.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === activeIndex ? 22 : 6,
              opacity: i === activeIndex ? 1 : 0.35,
              background: i === activeIndex ? C.PL : 'rgba(255,255,255,0.5)',
            }}
            transition={SPRING_SNAPPY}
            onClick={() => scrollTo(i)}
            style={{
              height: 6,
              borderRadius: 3,
              cursor: 'pointer',
              boxShadow: i === activeIndex ? `0 0 10px ${C.PL}99` : 'none',
            }}
          />
        ))}
      </div>

      {/* Page counter */}
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={activeIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={SPRING_SNAPPY}
            style={{ fontSize: 11, color: C.t3, fontWeight: 500, letterSpacing: 0.5 }}
          >
            {activeIndex + 1} / {count}
          </motion.span>
        </AnimatePresence>
      </div>

      <style>{`
        .swipe-track::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}


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
      extraMetric={{ label: '人脉', value: '—', color: '#38A8FF' }}
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
      extraMetric={{ label: 'GMV', value: '—', color: '#96BF48' }}
    />
  );
}

// ══════════════════════════════════════════════════════════════════
// CARD 3 — AI Chat Card (Enhanced with Quick Actions + Voice)
// ══════════════════════════════════════════════════════════════════

function ChatBubble({ msg }:{ msg:ChatMessage }) {
  const isAI = msg.role === 'ai';
  const t = new Date(msg.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
  return (
    <motion.div
      initial={{ opacity:0, y:8, scale:0.97 }}
      animate={{ opacity:1, y:0, scale:1 }}
      transition={SPRING_SNAPPY}
      style={{ display:'flex', flexDirection:'column', alignItems:isAI?'flex-start':'flex-end', gap:3 }}
    >
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
    </motion.div>
  );
}

function AIChatCard({
  chatHistory,
  aiTyping,
  input,
  onInputChange,
  onSend,
  onVoiceToggle,
  showVoice,
  quickActions,
}: {
  chatHistory: ChatMessage[];
  aiTyping: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onVoiceToggle: () => void;
  showVoice: boolean;
  quickActions: ReturnType<typeof buildQuickActions>;
}) {
  return (
    <Card accentColor={C.PL}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 18px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg, #7C3AED 0%, #4338CA 100%)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 3px rgba(124,58,237,0.2), 0 4px 14px rgba(124,58,237,0.4)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.95)"/></svg>
            </div>
            <motion.div
              animate={{ boxShadow: [`0 0 4px ${C.green}`, `0 0 10px ${C.green}`, `0 0 4px ${C.green}`] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background:C.green, border:`2px solid ${C.bg}` }}
            />
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
        <AnimatePresence mode="popLayout">
          {chatHistory.map(msg => <ChatBubble key={msg.id} msg={msg}/>)}
        </AnimatePresence>
        {aiTyping && (
          <motion.div
            initial={{ opacity:0, y:6 }}
            animate={{ opacity:1, y:0 }}
            transition={SPRING_SNAPPY}
            style={{ display:'flex', alignItems:'flex-end', gap:8 }}
          >
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg, #7C3AED, #4338CA)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 10px rgba(124,58,237,0.45)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 8.5H21L15.5 12.5L17.5 19L12 15L6.5 19L8.5 12.5L3 8.5H9.5L12 2Z" fill="rgba(255,255,255,0.95)"/></svg>
            </div>
            <div style={{ padding:'11px 16px', borderRadius:'16px 16px 16px 4px', background:'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(67,56,202,0.1))', border:'1px solid rgba(124,58,237,0.22)', display:'flex', gap:5, alignItems:'center', boxShadow:'inset 0 1px 0 rgba(167,139,250,0.12)' }}>
              {[0,160,320].map(d=>(
                <div key={d} style={{ width:5, height:5, borderRadius:'50%', background:C.PL, animation:'dotB 1.3s ease-in-out infinite', animationDelay:`${d}ms` }}/>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ padding:'0 18px 10px' }}>
        <QuickActions
          actions={quickActions}
          onSelect={(prompt) => onInputChange(prompt)}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:8, padding:'4px 18px 18px', flexWrap:'wrap' }}>
        {[
          { label:'查看全部消息', primary:true },
          { label:'标记已读', primary:false },
          { label:'优先处理', primary:false },
        ].map(({ label, primary }) => (
          <motion.button
            key={label}
            whileTap={{ scale: 0.95 }}
            transition={SPRING_SNAPPY}
            onClick={() => hapticSelection()}
            style={{
              padding:'7px 14px', borderRadius:50, cursor:'pointer', fontFamily:'inherit',
              background: primary ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(67,56,202,0.2))' : C.s1,
              border: primary ? '1px solid rgba(124,58,237,0.4)' : `1px solid ${C.b1}`,
              color: primary ? C.PL : C.t2,
              fontSize:12, fontWeight:600, letterSpacing:-0.2,
              boxShadow: primary ? '0 2px 12px rgba(124,58,237,0.2)' : 'none',
            } as React.CSSProperties}
          >
            {label}
          </motion.button>
        ))}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════
// BENTO GRID — 快捷功能入口模块
// ══════════════════════════════════════════════════════════════════

// ── Bento Grid 快捷入口数据定义 ──────────────────────────────────
interface BentoItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  gradient: string;
  borderColor: string;
  glowColor: string;
  href?: string;
  span?: 'wide' | 'normal'; // wide = 2 columns
}

const MOCK_INQUIRIES = [
  {
    id: 'inq-001',
    platform: 'tiktok',
    platformColor: '#FE2C55',
    platformLabel: 'TikTok',
    buyerName: 'SunPower Solutions',
    country: '🇻🇳',
    countryName: 'Vietnam',
    product: '太阳能电池板 300W',
    amount: '$12,500',
    qty: '500 pcs',
    status: 'urgent' as const,
    time: '2分钟前',
    isNew: true,
    trend: 'up' as const,
  },
  {
    id: 'inq-002',
    platform: 'meta',
    platformColor: '#1877F2',
    platformLabel: 'Meta',
    buyerName: 'Klaus Weber',
    country: '🇩🇪',
    countryName: 'Germany',
    product: 'LED 路灯 150W',
    amount: '$8,200',
    qty: '200 pcs',
    status: 'pending' as const,
    time: '18分钟前',
    isNew: true,
    trend: 'up' as const,
  },
  {
    id: 'inq-003',
    platform: 'linkedin',
    platformColor: '#0A66C2',
    platformLabel: 'LinkedIn',
    buyerName: 'Ahmed Al-Rashid',
    country: '🇦🇪',
    countryName: 'UAE',
    product: '工业储能系统 100kWh',
    amount: '$45,000',
    qty: '2 sets',
    status: 'replied' as const,
    time: '1小时前',
    isNew: false,
    trend: 'up' as const,
  },
  {
    id: 'inq-004',
    platform: 'shopify',
    platformColor: '#96BF48',
    platformLabel: 'Shopify',
    buyerName: 'Maria Santos',
    country: '🇧🇷',
    countryName: 'Brazil',
    product: '便携式充电宝 20000mAh',
    amount: '$3,600',
    qty: '300 pcs',
    status: 'pending' as const,
    time: '3小时前',
    isNew: false,
    trend: 'down' as const,
  },
  {
    id: 'inq-005',
    platform: 'tiktok',
    platformColor: '#FE2C55',
    platformLabel: 'TikTok',
    buyerName: 'Nguyen Van Minh',
    country: '🇻🇳',
    countryName: 'Vietnam',
    product: '蓝牙耳机 TWS',
    amount: '$5,800',
    qty: '1000 pcs',
    status: 'urgent' as const,
    time: '4小时前',
    isNew: false,
    trend: 'up' as const,
  },
];

type InquiryStatus = 'urgent' | 'pending' | 'replied';

const STATUS_CFG: Record<InquiryStatus, { label:string; color:string; bg:string; icon:React.ReactNode }> = {
  urgent:  { label:'紧急', color:'#F87171', bg:'rgba(248,113,113,0.12)', icon: <IconUrgent size={10} color="#F87171" strokeWidth={2}/> },
  pending: { label:'待回复', color:'#FCD34D', bg:'rgba(252,211,77,0.1)',  icon: <IconClock size={10} color="#FCD34D" strokeWidth={2}/> },
  replied: { label:'已回复', color:'#10B981', bg:'rgba(16,185,129,0.1)', icon: <IconCheckCircle size={10} color="#10B981" strokeWidth={2}/> },
};

function InquiryRow({ inq, index }: { inq: typeof MOCK_INQUIRIES[0]; index: number }) {
  const sc = STATUS_CFG[inq.status];
  return (
    <motion.div
      initial={{ opacity:0, x:-12 }}
      animate={{ opacity:1, x:0 }}
      transition={{ ...SPRING_GENTLE, delay: index * 0.06 }}
      whileTap={{ scale:0.98, backgroundColor:'rgba(255,255,255,0.03)' }}
      onClick={() => hapticSelection()}
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'12px 0',
        borderBottom: index < MOCK_INQUIRIES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        cursor:'pointer', borderRadius:4,
      }}
    >
      {/* Platform badge + country flag */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <div style={{
          width:40, height:40, borderRadius:12,
          background:`${inq.platformColor}18`,
          border:`1px solid ${inq.platformColor}30`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 0 12px ${inq.platformColor}20`,
        }}>
          <span style={{ fontSize:18 }}>
            {inq.platform === 'tiktok' ? '𝕋' :
             inq.platform === 'meta' ? 'f' :
             inq.platform === 'linkedin' ? 'in' : '🛍'}
          </span>
        </div>
        {/* Country flag badge */}
        <div style={{
          position:'absolute', bottom:-3, right:-3,
          width:18, height:18, borderRadius:'50%',
          background:C.bg, border:`1.5px solid rgba(255,255,255,0.08)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10, lineHeight:1,
        }}>
          {inq.country}
        </div>
        {/* New dot */}
        {inq.isNew && (
          <motion.div
            animate={{ scale:[1,1.4,1], opacity:[1,0.6,1] }}
            transition={{ duration:1.8, repeat:Infinity }}
            style={{
              position:'absolute', top:-2, left:-2,
              width:8, height:8, borderRadius:'50%',
              background:C.red, border:`1.5px solid ${C.bg}`,
              boxShadow:`0 0 6px ${C.red}`,
            }}
          />
        )}
      </div>

      {/* Main info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
          <span style={{ fontSize:13.5, fontWeight:700, color:C.t1, letterSpacing:-0.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>
            {inq.buyerName}
          </span>
          {/* Status chip */}
          <div style={{
            display:'flex', alignItems:'center', gap:3,
            padding:'2px 7px', borderRadius:50,
            background:sc.bg, border:`1px solid ${sc.color}30`,
            flexShrink:0,
          }}>
            {sc.icon}
            <span style={{ fontSize:10, fontWeight:600, color:sc.color }}>{sc.label}</span>
          </div>
        </div>
        <div style={{ fontSize:11.5, color:C.t3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:4 }}>
          <IconPackage size={10} color={C.t3} style={{ display:'inline', verticalAlign:'middle', marginRight:3 }}/>
          {inq.product}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:C.t3 }}>{inq.countryName}</span>
          <span style={{ width:2, height:2, borderRadius:'50%', background:C.t3, flexShrink:0 }}/>
          <span style={{ fontSize:11, color:C.t3 }}>{inq.time}</span>
        </div>
      </div>

      {/* Amount + trend */}
      <div style={{ flexShrink:0, textAlign:'right' }}>
        <div style={{ fontSize:14, fontWeight:800, color:C.t1, letterSpacing:-0.5, fontVariantNumeric:'tabular-nums' }}>
          {inq.amount}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:3, marginTop:2 }}>
          {inq.trend === 'up'
            ? <IconTrending size={11} color={C.green}/>
            : <IconTrendingDown size={11} color={C.red}/>
          }
          <span style={{ fontSize:10.5, color:inq.trend==='up'?C.green:C.red, fontWeight:600 }}>
            {inq.qty}
          </span>
        </div>
        <IconChevronRight size={13} color={C.t3} style={{ marginTop:2 }}/>
      </div>
    </motion.div>
  );
}

function BentoInquiryFeed() {
  // 快捷功能入口配置
  const bentoItems: BentoItem[] = [
    {
      id: 'inquiry-feed',
      label: '信息流询盘',
      sublabel: 'TikTok 火山引擎',
      span: 'wide',
      badge: 3,
      badgeColor: C.red,
      href: 'https://business.oceanengine.com/site/login',
      gradient: 'linear-gradient(135deg, rgba(254,44,85,0.22) 0%, rgba(180,20,60,0.12) 100%)',
      borderColor: 'rgba(254,44,85,0.3)',
      glowColor: 'rgba(254,44,85,0.25)',
      icon: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          {/* TikTok 火山引擎 信息流图标 */}
          <rect width="32" height="32" rx="8" fill="rgba(254,44,85,0.15)"/>
          {/* 流动列表线条 */}
          <rect x="6" y="8" width="14" height="2.5" rx="1.25" fill="#FE2C55" opacity="0.9"/>
          <rect x="6" y="13" width="20" height="2.5" rx="1.25" fill="rgba(254,44,85,0.6)"/>
          <rect x="6" y="18" width="17" height="2.5" rx="1.25" fill="rgba(254,44,85,0.4)"/>
          <rect x="6" y="23" width="12" height="2.5" rx="1.25" fill="rgba(254,44,85,0.25)"/>
          {/* 小火焰图标 */}
          <path d="M24 6 C24 6 22 9 24 11 C26 13 28 11 26 8 C25 6.5 24 6 24 6Z" fill="#FE2C55"/>
          <path d="M24 11 C24 11 23 13 24.5 14 C26 15 27 13.5 26 12 C25.5 11.2 24 11 24 11Z" fill="rgba(254,44,85,0.7)"/>
        </svg>
      ),
    },
    {
      id: 'ai-reply',
      label: 'AI 智能回复',
      sublabel: '自动处理询盘',
      badge: '新',
      badgeColor: C.green,
      gradient: 'linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(67,56,202,0.12) 100%)',
      borderColor: 'rgba(124,58,237,0.3)',
      glowColor: 'rgba(124,58,237,0.25)',
      icon: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="rgba(124,58,237,0.15)"/>
          <path d="M16 4L19 11H26L20.5 15.5L22.5 22.5L16 18.5L9.5 22.5L11.5 15.5L6 11H13L16 4Z" fill="rgba(167,139,250,0.9)"/>
          <circle cx="24" cy="8" r="3" fill="#10B981"/>
          <path d="M23 8h2M24 7v2" stroke="white" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: 'data-report',
      label: '数据报表',
      sublabel: '7日趋势',
      gradient: 'linear-gradient(135deg, rgba(96,165,250,0.18) 0%, rgba(59,130,246,0.1) 100%)',
      borderColor: 'rgba(96,165,250,0.25)',
      glowColor: 'rgba(96,165,250,0.2)',
      icon: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="rgba(96,165,250,0.12)"/>
          <rect x="6" y="20" width="4" height="7" rx="1" fill="rgba(96,165,250,0.5)"/>
          <rect x="12" y="14" width="4" height="13" rx="1" fill="rgba(96,165,250,0.7)"/>
          <rect x="18" y="17" width="4" height="10" rx="1" fill="rgba(96,165,250,0.55)"/>
          <rect x="24" y="9" width="4" height="18" rx="1" fill="#60A5FA"/>
          <polyline points="8,16 14,10 20,13 26,6" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <circle cx="26" cy="6" r="2" fill="#60A5FA"/>
        </svg>
      ),
    },
    {
      id: 'buyer-crm',
      label: '买家 CRM',
      sublabel: '客户管理',
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.1) 100%)',
      borderColor: 'rgba(16,185,129,0.25)',
      glowColor: 'rgba(16,185,129,0.2)',
      icon: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="rgba(16,185,129,0.12)"/>
          {/* 主用户 */}
          <circle cx="16" cy="11" r="4.5" fill="rgba(16,185,129,0.7)"/>
          <path d="M7 26C7 21.6 11 18 16 18C21 18 25 21.6 25 26" stroke="#10B981" strokeWidth="2" strokeLinecap="round" fill="none"/>
          {/* 小用户 */}
          <circle cx="25" cy="12" r="3" fill="rgba(16,185,129,0.45)"/>
          <path d="M22 22C22 19.8 23.3 18 25 18C26.7 18 28 19.8 28 22" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        </svg>
      ),
    },
    {
      id: 'product-lib',
      label: '产品库',
      sublabel: 'SKU 管理',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.1) 100%)',
      borderColor: 'rgba(245,158,11,0.25)',
      glowColor: 'rgba(245,158,11,0.2)',
      icon: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="rgba(245,158,11,0.12)"/>
          <path d="M16 4L28 10V22L16 28L4 22V10L16 4Z" stroke="#F59E0B" strokeWidth="1.8" fill="rgba(245,158,11,0.12)" strokeLinejoin="round"/>
          <path d="M16 4L16 28" stroke="rgba(245,158,11,0.4)" strokeWidth="1.2" strokeDasharray="2 2"/>
          <path d="M4 10L28 10" stroke="rgba(245,158,11,0.4)" strokeWidth="1.2" strokeDasharray="2 2"/>
          <circle cx="16" cy="16" r="3" fill="#F59E0B" opacity="0.8"/>
        </svg>
      ),
    },
    {
      id: 'logistics',
      label: '物流跟踪',
      sublabel: '订单状态',
      gradient: 'linear-gradient(135deg, rgba(251,146,60,0.18) 0%, rgba(234,88,12,0.1) 100%)',
      borderColor: 'rgba(251,146,60,0.25)',
      glowColor: 'rgba(251,146,60,0.2)',
      icon: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="rgba(251,146,60,0.12)"/>
          {/* 车身 */}
          <rect x="3" y="12" width="18" height="11" rx="2" fill="rgba(251,146,60,0.3)" stroke="#FB923C" strokeWidth="1.5"/>
          {/* 车头 */}
          <path d="M21 15H27L29 19V23H21V15Z" fill="rgba(251,146,60,0.2)" stroke="#FB923C" strokeWidth="1.5" strokeLinejoin="round"/>
          {/* 轮子 */}
          <circle cx="8" cy="24" r="2.5" fill="#FB923C"/>
          <circle cx="8" cy="24" r="1" fill="rgba(0,0,0,0.3)"/>
          <circle cx="24" cy="24" r="2.5" fill="#FB923C"/>
          <circle cx="24" cy="24" r="1" fill="rgba(0,0,0,0.3)"/>
          {/* 路线 */}
          <path d="M4 9L10 6L16 9" stroke="rgba(251,146,60,0.5)" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  const urgentCount = 3; // 来自真实数据
  const [activeFilter, setActiveFilter] = useState<'all'|'urgent'|'pending'|'replied'>('all');
  const [searchOpen, setSearchOpen] = useState(false);

  const filters: Array<{ id: 'all'|'urgent'|'pending'|'replied'; label:string; count:number }> = [
    { id:'all',     label:'全部', count: MOCK_INQUIRIES.length },
    { id:'urgent',  label:'紧急', count: MOCK_INQUIRIES.filter(i=>i.status==='urgent').length },
    { id:'pending', label:'待回复', count: MOCK_INQUIRIES.filter(i=>i.status==='pending').length },
    { id:'replied', label:'已回复', count: MOCK_INQUIRIES.filter(i=>i.status==='replied').length },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>

      {/* ── 头部标题 ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 2px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{
            width:26, height:26, borderRadius:8,
            background:'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(67,56,202,0.2))',
            border:'1px solid rgba(124,58,237,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill={C.PL} opacity="0.9"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill={C.PL} opacity="0.6"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill={C.PL} opacity="0.6"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill={C.PL} opacity="0.4"/>
            </svg>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:C.t1, letterSpacing:-0.3 }}>快捷功能</span>
        </div>
        <span style={{ fontSize:10.5, color:C.t3 }}>全部应用</span>
      </div>

      {/* ── Row 1: 信息流询盘 (宽格) + AI 智能回复 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {/* 信息流询盘 — 宽格卡片 (2列) */}
        <motion.button
          initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
          transition={{ ...SPRING_GENTLE, delay:0 }}
          whileTap={{ scale:0.96 }}
          onClick={() => {
            hapticMedium();
            window.open('https://business.oceanengine.com/site/login', '_blank');
          }}
          style={{
            gridColumn:'1 / -1',
            borderRadius:20, padding:'16px 18px',
            background:'linear-gradient(135deg, rgba(254,44,85,0.2) 0%, rgba(180,20,60,0.1) 60%, rgba(0,0,0,0.3) 100%)',
            border:'1px solid rgba(254,44,85,0.28)',
            boxShadow:'inset 0 1px 0 rgba(254,44,85,0.15), 0 8px 32px rgba(0,0,0,0.5)',
            cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            position:'relative', overflow:'hidden',
          } as React.CSSProperties}
        >
          {/* 背景光晕 */}
          <div aria-hidden style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, rgba(254,44,85,0.2) 0%, transparent 70%)', filter:'blur(20px)', pointerEvents:'none' }}/>
          <div aria-hidden style={{ position:'absolute', bottom:-20, left:60, width:80, height:80, borderRadius:'50%', background:'radial-gradient(circle, rgba(254,44,85,0.1) 0%, transparent 70%)', filter:'blur(16px)', pointerEvents:'none' }}/>

          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {/* 大图标 */}
            <div style={{
              width:52, height:52, borderRadius:16, flexShrink:0,
              background:'linear-gradient(135deg, rgba(254,44,85,0.25), rgba(180,20,60,0.15))',
              border:'1px solid rgba(254,44,85,0.35)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 16px rgba(254,44,85,0.2)',
            }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="6" width="16" height="3" rx="1.5" fill="#FE2C55"/>
                <rect x="4" y="12" width="24" height="3" rx="1.5" fill="rgba(254,44,85,0.65)"/>
                <rect x="4" y="18" width="20" height="3" rx="1.5" fill="rgba(254,44,85,0.45)"/>
                <rect x="4" y="24" width="14" height="3" rx="1.5" fill="rgba(254,44,85,0.28)"/>
                <path d="M27 3 C27 3 24.5 7 27 10 C29.5 13 32 10 30 6.5 C28.8 4.5 27 3 27 3Z" fill="#FE2C55"/>
                <path d="M27 10 C27 10 25.5 13 27.5 14.5 C29.5 16 31 14 29.5 11.5 C28.8 10.5 27 10 27 10Z" fill="rgba(254,44,85,0.7)"/>
              </svg>
            </div>
            <div style={{ textAlign:'left' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                <span style={{ fontSize:15, fontWeight:800, color:C.t1, letterSpacing:-0.4 }}>信息流询盘</span>
                {/* 待处理徽章 */}
                <div style={{
                  display:'flex', alignItems:'center', gap:3,
                  padding:'2px 8px', borderRadius:50,
                  background:'rgba(254,44,85,0.18)', border:'1px solid rgba(254,44,85,0.35)',
                }}>
                  <motion.div
                    animate={{ scale:[1,1.4,1], opacity:[1,0.5,1] }}
                    transition={{ duration:1.6, repeat:Infinity }}
                    style={{ width:5, height:5, borderRadius:'50%', background:C.red, boxShadow:`0 0 5px ${C.red}` }}
                  />
                  <span style={{ fontSize:10, fontWeight:700, color:C.red }}>{urgentCount} 待处理</span>
                </div>
              </div>
              <div style={{ fontSize:11, color:C.t3, letterSpacing:0 }}>火山引擎 · TikTok 商业平台</div>
            </div>
          </div>

          {/* 右侧箭头 */}
          <div style={{
            width:32, height:32, borderRadius:'50%', flexShrink:0,
            background:'rgba(254,44,85,0.15)', border:'1px solid rgba(254,44,85,0.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FE2C55" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </motion.button>

        {/* AI 智能回复 */}
        {bentoItems.filter(b=>b.id==='ai-reply').map((item, i) => (
          <BentoIconTile key={item.id} item={item} index={i+1}/>
        ))}

        {/* 数据报表 */}
        {bentoItems.filter(b=>b.id==='data-report').map((item, i) => (
          <BentoIconTile key={item.id} item={item} index={i+2}/>
        ))}
      </div>

      {/* ── Row 2: 买家CRM + 产品库 + 物流跟踪 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {bentoItems.filter(b=>['buyer-crm','product-lib','logistics'].includes(b.id)).map((item, i) => (
          <BentoIconTile key={item.id} item={item} index={i+4} compact/>
        ))}
      </div>
    </div>
  );
}

function BentoIconTile({ item, index, compact }: { item: BentoItem; index: number; compact?: boolean }) {
  return (
    <motion.button
      initial={{ opacity:0, scale:0.93 }}
      animate={{ opacity:1, scale:1 }}
      transition={{ ...SPRING_GENTLE, delay: index * 0.05 }}
      whileTap={{ scale:0.94 }}
      onClick={() => {
        hapticSelection();
        if (item.href) window.open(item.href, '_blank');
      }}
      style={{
        borderRadius: compact ? 18 : 20,
        padding: compact ? '14px 10px' : '16px 14px',
        background: item.gradient,
        border: `1px solid ${item.borderColor}`,
        boxShadow: `inset 0 1px 0 ${item.glowColor.replace('0.25','0.12')}, 0 8px 24px rgba(0,0,0,0.45)`,
        cursor:'pointer', fontFamily:'inherit',
        display:'flex', flexDirection:'column', alignItems: compact ? 'center' : 'flex-start',
        gap: compact ? 6 : 8,
        position:'relative', overflow:'hidden',
        textAlign: compact ? 'center' : 'left',
      } as React.CSSProperties}
    >
      {/* 背景光晕 */}
      <div aria-hidden style={{ position:'absolute', top:-15, right:-15, width:60, height:60, borderRadius:'50%', background:`radial-gradient(circle, ${item.glowColor} 0%, transparent 70%)`, filter:'blur(14px)', pointerEvents:'none' }}/>

      {/* 徽章区域 */}
      <div style={{ position:'relative' }}>
        {item.icon}
        {/* Badge */}
        {item.badge !== undefined && (
          <div style={{
            position:'absolute', top:-4, right:-4,
            minWidth:16, height:16, borderRadius:50,
            background: item.badgeColor ?? C.red,
            border:`1.5px solid rgba(0,0,0,0.6)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:'0 3px',
          }}>
            <span style={{ fontSize:9, fontWeight:800, color:'#fff', lineHeight:1 }}>{item.badge}</span>
          </div>
        )}
      </div>

      {/* 文字 */}
      <div>
        <div style={{ fontSize: compact ? 11 : 12.5, fontWeight:700, color:C.t1, letterSpacing:-0.3, lineHeight:1.2 }}>{item.label}</div>
        {item.sublabel && (
          <div style={{ fontSize: compact ? 9.5 : 10.5, color:C.t3, marginTop:2, fontWeight:400 }}>{item.sublabel}</div>
        )}
      </div>
    </motion.button>
  );
}

// ══════════════════════════════════════════════════════════════════
// Pull-to-Refresh Indicator
// ══════════════════════════════════════════════════════════════════
function PullIndicator({ indicatorRef }: { indicatorRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={indicatorRef as React.RefObject<HTMLDivElement>}
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%) translateY(0px)',
        opacity: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 50,
        background: 'rgba(124,58,237,0.2)',
        border: '1px solid rgba(124,58,237,0.3)',
        backdropFilter: 'blur(20px)',
        pointerEvents: 'none',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.PL} strokeWidth="2" strokeLinecap="round">
        <path d="M12 5v14M5 12l7-7 7 7"/>
      </svg>
      <span style={{ fontSize:11, fontWeight:600, color:C.PL }}>下拉刷新</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Main Page — BossWarroom V5
// ══════════════════════════════════════════════════════════════════
export default function BossWarroom() {
  const { data, isLoading, refetch } = useWarroomData();
  const [time, setTime] = useState('');
  const [input, setInput] = useState('');
  const [aiTyping, setAiTyping] = useState(true);
  const [showVoice, setShowVoice] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // WebSocket realtime
  const { status: wsStatus, newMessages } = useWarroomWS(
    useCallback((_update: Partial<import('../types/warroom').WarroomData>) => {
      // Merge partial updates from WS into data — handled by refetch
    }, [])
  );

  // Proactive AI cards
  const { cards: proactiveCards, dismissCard } = useProactiveCards(data);

  // Pull-to-refresh
  const { containerRef, indicatorRef, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(
    async () => { await refetch(); hapticSuccess(); }
  );

  // Quick actions
  const quickActions = buildQuickActions({
    totalPending: data?.totalPending ?? 0,
    completionRate: data?.completionRate ?? 0,
    hasTikTok: !!(data?.platforms.find(p => p.id === 'tiktok')?.isConnected),
    hasMeta: !!(data?.platforms.find(p => p.id === 'meta')?.isConnected),
  });

  // Clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}));
    tick(); const id = setInterval(tick,1000); return ()=>clearInterval(id);
  }, []);

  // AI typing simulation
  useEffect(() => {
    if (!isLoading) { const t = setTimeout(()=>setAiTyping(false),2400); return ()=>clearTimeout(t); }
  }, [isLoading]);

  // Sync chat history from data + WS new messages
  useEffect(() => {
    const base = data?.chatHistory ?? [];
    const wsNew = newMessages.filter(m => !base.find(b => b.id === m.id));
    setChatHistory([...base, ...wsNew].slice(-10));
  }, [data?.chatHistory, newMessages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    hapticMedium();
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    setChatHistory(prev => [...prev, userMsg].slice(-10));
    setInput('');
    setAiTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: '收到您的指令，正在分析数据并生成建议…',
        createdAt: new Date().toISOString(),
      };
      setChatHistory(prev => [...prev, aiMsg].slice(-10));
      setAiTyping(false);
      hapticSuccess();
    }, 2000 + Math.random() * 1000);
  }, [input]);

  // Platform data
  const tiktok   = data?.platforms.find(p=>p.id==='tiktok');
  const meta     = data?.platforms.find(p=>p.id==='meta');
  const linkedin: PlatformData = { id:'tiktok', unreadCount:0, trend7d:[], isConnected:false };
  const shopify:  PlatformData = { id:'meta',   unreadCount:0, trend7d:[], isConnected:false };

  return (
    <div style={{ height:'100dvh', background:C.bg, display:'flex', flexDirection:'column', fontFamily:'"SF Pro Display",-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif', color:C.t1, overflow:'hidden', WebkitFontSmoothing:'antialiased' }}>

      {/* ── Canvas Fluid Aurora Background ── */}
      <FluidAurora/>

      {/* Status bar */}
      <div style={{ position:'relative', zIndex:10, flexShrink:0 }}>
        <StatusBar time={time} wsStatus={wsStatus}/>
      </div>

      {/* App header */}
      <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px 8px', flexShrink:0 }}>
        <div>
          <h1 style={{ margin:0, fontSize:23, fontWeight:700, letterSpacing:-1, lineHeight:1.15 }}>指挥中心</h1>
          <p style={{ margin:'3px 0 0', fontSize:11.5, color:C.t3 }}>
            {data?.updatedAt ? `${new Date(data.updatedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 更新` : '同步中…'}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={SPRING_SNAPPY}
          onClick={() => hapticLight()}
          style={{ position:'relative', width:42, height:42, borderRadius:'50%', border:'none', cursor:'pointer', padding:0, background:'transparent', boxShadow:'0 0 0 2.5px rgba(109,40,217,0.45), 0 4px 16px rgba(0,0,0,0.6)' } as React.CSSProperties}
        >
          <img
            src={avatarImg}
            alt="Boss"
            style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover', display:'block' }}
          />
          <motion.div
            animate={{ boxShadow: [`0 0 4px ${C.green}`, `0 0 10px ${C.green}`, `0 0 4px ${C.green}`] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background:C.green, border:`2px solid ${C.bg}` }}
          />
        </motion.button>
      </div>

      {/* Scrollable content with pull-to-refresh */}
      <div
        ref={containerRef}
        style={{ flex:1, overflowY:'scroll', WebkitOverflowScrolling:'touch' as any, padding:'4px 16px 0', display:'flex', flexDirection:'column', gap:12, position:'relative', zIndex:10, scrollbarWidth:'none', touchAction:'pan-y' } as React.CSSProperties}
      >
        <PullIndicator indicatorRef={indicatorRef}/>

        {/* Proactive AI cards */}
        <AnimatePresence mode="popLayout">
          {proactiveCards.length > 0 && (
            <motion.div
              key="proactive-stack"
              initial={{ opacity:0, y:-10 }}
              animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-8 }}
              transition={SPRING_GENTLE}
            >
              <ProactiveCardStack
                cards={proactiveCards}
                onDismiss={dismissCard}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero card */}
        <HeroCard data={data} isLoading={isLoading}/>

        {/* Platform cards — Swipeable Carousel */}
        <SwipeableCards>
          {[<TikTokCard  key="tiktok"   platform={tiktok}   isLoading={isLoading}/>,
            <MetaCard    key="meta"     platform={meta}     isLoading={isLoading}/>,
            <LinkedInCard key="linkedin" platform={linkedin} isLoading={isLoading}/>,
            <ShopifyCard  key="shopify"  platform={shopify}  isLoading={isLoading}/>]}
        </SwipeableCards>

        {/* Bento Grid — 信息流询盘 */}
        <BentoInquiryFeed/>

        {/* AI Chat card */}
        <AIChatCard
          chatHistory={chatHistory}
          aiTyping={aiTyping}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onVoiceToggle={() => { setShowVoice(v => !v); hapticLight(); }}
          showVoice={showVoice}
          quickActions={quickActions}
        />

        <div style={{ height:16 }}/>
      </div>

      {/* Bottom input bar */}
      <div style={{ flexShrink:0, padding:'8px 16px 36px', position:'relative', zIndex:20, background:`linear-gradient(to top, ${C.bg} 50%, transparent)` }}>

        {/* Voice input overlay */}
        <AnimatePresence>
          {showVoice && (
            <VoiceInput
              onTranscript={(text) => { setInput(text); setShowVoice(false); }}
              onClose={() => setShowVoice(false)}
            />
          )}
        </AnimatePresence>

        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 8px 8px 14px', borderRadius:50, background:'rgba(255,255,255,0.042)', border:`1px solid rgba(255,255,255,0.09)`, backdropFilter:'blur(40px)', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          {/* Voice button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={SPRING_SNAPPY}
            onClick={() => { setShowVoice(v => !v); hapticLight(); }}
            style={{ width:36, height:36, borderRadius:'50%', border:`1px solid ${showVoice ? 'rgba(124,58,237,0.5)' : C.b1}`, background: showVoice ? 'rgba(124,58,237,0.2)' : C.s1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s ease' } as React.CSSProperties}
          >
            <svg width="14" height="18" viewBox="0 0 14 18" fill="none" stroke={showVoice ? C.PL : C.t2} strokeWidth="1.6" strokeLinecap="round">
              <rect x="4" y="1" width="6" height="10" rx="3"/>
              <path d="M1 8.5C1 12 3.7 14.5 7 14.5C10.3 14.5 13 12 13 8.5"/>
              <line x1="7" y1="14.5" x2="7" y2="17"/>
              <line x1="4.5" y1="17" x2="9.5" y2="17"/>
            </svg>
          </motion.button>

          <input
            type="text"
            placeholder="晚安，需要我帮您做什么？"
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:14, color:C.t1, caretColor:C.P }}
          />

          {/* Send button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={SPRING_BOUNCY}
            onClick={handleSend}
            style={{ width:36, height:36, borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0, background:input?`linear-gradient(135deg, ${C.P}, #4338CA)`:'white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:input?`0 4px 18px rgba(124,58,237,0.6)`:'0 2px 10px rgba(0,0,0,0.4)' } as React.CSSProperties}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={input?'white':'#07060F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input?'white':'#07060F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </div>

        {/* Home indicator */}
        <div style={{ width:108, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:'10px auto 0' }}/>
      </div>

      <style>{`
        @keyframes ambA   { 0%{transform:scale(1)translate(0,0);}    100%{transform:scale(1.2)translate(32px,-22px);} }
        @keyframes ambB   { 0%{transform:scale(1)translate(0,0);}    100%{transform:scale(1.15)translate(-24px,16px);} }
        @keyframes dotB   { 0%,80%,100%{transform:translateY(0)scale(1);opacity:.4;} 40%{transform:translateY(-5px)scale(1.3);opacity:1;} }
        @keyframes skPulse{ 0%,100%{opacity:.4;} 50%{opacity:.85;} }
        input::placeholder{ color:rgba(255,255,255,0.2); }
        button{ -webkit-tap-highlight-color:transparent; font-family:inherit; }
        *::-webkit-scrollbar{ display:none; }
      `}</style>
    </div>
  );
}
