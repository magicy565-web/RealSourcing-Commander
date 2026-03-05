/**
 * MarketRadar - 全球市场信号雷达
 *
 * 设计理念：
 * - 氛围：像声呐探测，活的指挥中心
 * - 地图有缓慢脉动或扫描网格效果，感觉是活着在呼吸
 * - 新市场信号出现时，从位置涟漪扩散，像声呐 ping
 * - 每个信号点击可以直接生成决策卡片
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';

// Design tokens
const C = {
  bg: '#000000',
  t1: 'rgba(255,255,255,0.92)',
  t2: 'rgba(255,255,255,0.52)',
  t3: 'rgba(255,255,255,0.26)',
  P: '#7C3AED',
  PL: '#A78BFA',
  amber: '#F59E0B',
  green: '#10B981',
  blue: '#60A5FA',
  red: '#F87171',
  teal: '#2DD4BF',
  cyan: '#06B6D4',
};

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };
const SPRING_GENTLE = { type: 'spring' as const, stiffness: 260, damping: 30 };

// 市场信号类型
type SignalType = 'opportunity' | 'demand' | 'competitor' | 'trend';

interface MarketSignal {
  id: string;
  type: SignalType;
  title: string;
  description: string;
  region: string;
  country: string;
  coordinates: { x: number; y: number }; // 相对于地图的百分比位置
  strength: 'strong' | 'medium' | 'weak';
  timestamp: Date;
  metrics?: { label: string; value: string }[];
  isNew?: boolean;
}

// 信号类型配置
const SIGNAL_CONFIG: Record<SignalType, { icon: string; color: string; label: string }> = {
  opportunity: { icon: '🎯', color: C.green, label: '商机' },
  demand: { icon: '📈', color: C.blue, label: '需求' },
  competitor: { icon: '⚔️', color: C.amber, label: '竞争' },
  trend: { icon: '🌊', color: C.PL, label: '趋势' },
};

// Mock 市场信号数据
const MOCK_SIGNALS: MarketSignal[] = [
  {
    id: '1',
    type: 'opportunity',
    title: '不锈钢餐具需求激增',
    description: '沙特海关数据显示，不锈钢餐具进口量同比增长 15%',
    region: '中东',
    country: '沙特阿拉伯',
    coordinates: { x: 58, y: 38 },
    strength: 'strong',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    metrics: [
      { label: '增长率', value: '+15%' },
      { label: '市场规模', value: '$2.4M' },
    ],
    isNew: true,
  },
  {
    id: '2',
    type: 'demand',
    title: '酒店用品采购季',
    description: '阿联酋迪拜世博会后续采购需求持续释放',
    region: '中东',
    country: '阿联酋',
    coordinates: { x: 60, y: 40 },
    strength: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    metrics: [
      { label: '询盘量', value: '+23%' },
    ],
  },
  {
    id: '3',
    type: 'trend',
    title: 'TikTok 热门趋势',
    description: '东南亚 TikTok 上不锈钢厨具开箱视频播放量暴增',
    region: '东南亚',
    country: '泰国',
    coordinates: { x: 72, y: 50 },
    strength: 'strong',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    metrics: [
      { label: '播放量', value: '12M+' },
      { label: '互动率', value: '8.5%' },
    ],
    isNew: true,
  },
  {
    id: '4',
    type: 'competitor',
    title: '竞品价格调整',
    description: '印度主要竞争对手下调 FOB 价格 5%',
    region: '南亚',
    country: '印度',
    coordinates: { x: 65, y: 45 },
    strength: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    metrics: [
      { label: '降幅', value: '-5%' },
    ],
  },
  {
    id: '5',
    type: 'opportunity',
    title: '新兴市场崛起',
    description: '非洲肯尼亚不锈钢餐具进口需求年增 40%',
    region: '非洲',
    country: '肯尼亚',
    coordinates: { x: 55, y: 55 },
    strength: 'weak',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    metrics: [
      { label: '增长率', value: '+40%' },
    ],
  },
  {
    id: '6',
    type: 'demand',
    title: '欧洲环保认证需求',
    description: '德国买家更倾向采购有环保认证的不锈钢产品',
    region: '欧洲',
    country: '德国',
    coordinates: { x: 48, y: 30 },
    strength: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
  },
];

// Noise 纹理
const Noise = ({ intensity = 0.022 }: { intensity?: number }) => (
  <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: intensity, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}>
    <filter id="nzmr"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#nzmr)"/>
  </svg>
);

// 声呐扫描线
function SonarScanline() {
  return (
    <motion.div
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '150%',
        height: 2,
        transformOrigin: 'left center',
        background: `linear-gradient(90deg, ${C.cyan}60, transparent)`,
        filter: 'blur(1px)',
        pointerEvents: 'none',
      }}
    />
  );
}

// 雷达网格
function RadarGrid() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* 同心圆 */}
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          animate={{ 
            scale: [1, 1.02, 1],
            opacity: [0.15, 0.08, 0.15],
          }}
          transition={{ 
            duration: 4 + i, 
            repeat: Infinity,
            delay: i * 0.5,
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: `${30 + i * 25}%`,
            height: `${30 + i * 25}%`,
            borderRadius: '50%',
            border: `1px solid ${C.cyan}`,
            transform: 'translate(-50%, -50%)',
            opacity: 0.1,
          }}
        />
      ))}

      {/* 经纬线 */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}>
        {/* 水平线 */}
        {[20, 40, 60, 80].map(y => (
          <line key={`h${y}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke={C.cyan} strokeWidth="0.5" strokeDasharray="4 8"/>
        ))}
        {/* 垂直线 */}
        {[20, 40, 60, 80].map(x => (
          <line key={`v${x}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke={C.cyan} strokeWidth="0.5" strokeDasharray="4 8"/>
        ))}
      </svg>
    </div>
  );
}

// 信号点 - 带声呐涟漪效果
function SignalPoint({ 
  signal, 
  onClick,
  isSelected,
}: { 
  signal: MarketSignal;
  onClick: () => void;
  isSelected: boolean;
}) {
  const config = SIGNAL_CONFIG[signal.type];
  const [showRipple, setShowRipple] = useState(signal.isNew);

  // 新信号的涟漪效果
  useEffect(() => {
    if (signal.isNew) {
      const timer = setTimeout(() => setShowRipple(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [signal.isNew]);

  const strengthSize = {
    strong: 16,
    medium: 12,
    weak: 10,
  };

  const size = strengthSize[signal.strength];

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING_GENTLE}
      onClick={() => { hapticMedium(); onClick(); }}
      style={{
        position: 'absolute',
        left: `${signal.coordinates.x}%`,
        top: `${signal.coordinates.y}%`,
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: isSelected ? 20 : 10,
      }}
    >
      {/* 声呐涟漪 - 新信号时显示 */}
      {showRipple && (
        <>
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
              }}
              style={{
                position: 'absolute',
                inset: -size / 2,
                borderRadius: '50%',
                border: `2px solid ${config.color}`,
              }}
            />
          ))}
        </>
      )}

      {/* 选中时的光环 */}
      {isSelected && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: -8,
            borderRadius: '50%',
            border: `2px solid ${config.color}`,
            boxShadow: `0 0 20px ${config.color}50`,
          }}
        />
      )}

      {/* 核心点 */}
      <motion.div
        animate={showRipple ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.6, repeat: showRipple ? Infinity : 0 }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${config.color} 0%, ${config.color}80 100%)`,
          boxShadow: `0 0 ${size}px ${config.color}80, 0 0 ${size * 2}px ${config.color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.6,
        }}
      />

      {/* 信号标签 */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: isSelected ? 1 : 0.7, y: 0 }}
        style={{
          position: 'absolute',
          top: size + 4,
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          fontSize: 9,
          fontWeight: 700,
          color: config.color,
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}
      >
        {signal.country}
      </motion.div>
    </motion.div>
  );
}

// 信号详情面板
function SignalDetailPanel({ 
  signal, 
  onClose,
  onCreateDecision,
}: { 
  signal: MarketSignal;
  onClose: () => void;
  onCreateDecision: () => void;
}) {
  const config = SIGNAL_CONFIG[signal.type];

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={SPRING}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(180deg, rgba(17,17,24,0.95) 0%, rgba(10,10,15,0.98) 100%)',
        borderRadius: '20px 20px 0 0',
        padding: '16px 20px 30px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderBottom: 'none',
        zIndex: 30,
      }}
    >
      {/* 拖动条 */}
      <div style={{
        width: 40,
        height: 4,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.15)',
        margin: '0 auto 16px',
      }}/>

      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${config.color}20`,
            border: `1px solid ${config.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}>
            {config.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: config.color, letterSpacing: 0.5 }}>{config.label}</span>
              <span style={{ fontSize: 9, color: C.t3 }}>{signal.region} · {signal.country}</span>
            </div>
            <span style={{ fontSize: 9, color: C.t3 }}>
              {Math.round((Date.now() - signal.timestamp.getTime()) / 60000)} 分钟前
            </span>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </motion.button>
      </div>

      {/* 标题 */}
      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.t1, letterSpacing: -0.3, marginBottom: 8, lineHeight: 1.3 }}>
        {signal.title}
      </h3>

      {/* 描述 */}
      <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, marginBottom: 14 }}>
        {signal.description}
      </p>

      {/* 指标 */}
      {signal.metrics && signal.metrics.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {signal.metrics.map((m, i) => (
            <div key={i} style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              background: `${config.color}10`,
              border: `1px solid ${config.color}20`,
            }}>
              <div style={{ fontSize: 10, color: C.t3, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: config.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 10 }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => { hapticSuccess(); onCreateDecision(); }}
          style={{
            flex: 1,
            padding: '12px 0',
            borderRadius: 50,
            background: `linear-gradient(135deg, ${config.color}, ${config.color}CC)`,
            border: 'none',
            fontSize: 13,
            fontWeight: 800,
            color: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          生成决策卡片
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          style={{
            padding: '12px 20px',
            borderRadius: 50,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            fontSize: 13,
            fontWeight: 700,
            color: C.t2,
            cursor: 'pointer',
          }}
        >
          详情
        </motion.button>
      </div>
    </motion.div>
  );
}

// 信号统计
function SignalStats({ signals }: { signals: MarketSignal[] }) {
  const newCount = signals.filter(s => s.isNew).length;
  const typeCount = {
    opportunity: signals.filter(s => s.type === 'opportunity').length,
    demand: signals.filter(s => s.type === 'demand').length,
    competitor: signals.filter(s => s.type === 'competitor').length,
    trend: signals.filter(s => s.type === 'trend').length,
  };

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '8px 20px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      {/* 新信号 */}
      {newCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 12px',
            borderRadius: 50,
            background: `${C.red}15`,
            border: `1px solid ${C.red}30`,
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.red }}>{newCount} 新信号</span>
        </motion.div>
      )}

      {/* 分类统计 */}
      {Object.entries(typeCount).map(([type, count]) => {
        if (count === 0) return null;
        const cfg = SIGNAL_CONFIG[type as SignalType];
        return (
          <div key={type} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            borderRadius: 50,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 10 }}>{cfg.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.t2 }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// 主页面
export default function MarketRadar() {
  const [, navigate] = useLocation();
  const [signals] = useState<MarketSignal[]>(MOCK_SIGNALS);
  const [selectedSignal, setSelectedSignal] = useState<MarketSignal | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // 模拟新信号到达
  const [newSignalAlert, setNewSignalAlert] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      setNewSignalAlert(true);
      hapticMedium();
      setTimeout(() => setNewSignalAlert(false), 2000);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100dvh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Noise intensity={0.02}/>

      {/* 头部 */}
      <div style={{
        flexShrink: 0,
        padding: '50px 20px 12px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, transparent 100%)',
        position: 'relative',
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { hapticLight(); navigate('/'); }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </motion.button>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1, letterSpacing: -0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              市场雷达
              {/* 扫描指示器 */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: `2px solid ${C.cyan}40`,
                  borderTopColor: C.cyan,
                }}
              />
            </h1>
            <span style={{ fontSize: 11, color: C.t3 }}>全球市场信号监控</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </motion.button>
        </div>

        {/* 信号统计 */}
        <SignalStats signals={signals} />
      </div>

      {/* 地图区域 */}
      <div 
        ref={mapRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          margin: '0 10px',
          borderRadius: 20,
          background: 'linear-gradient(180deg, rgba(6,182,212,0.05) 0%, rgba(0,0,0,0.8) 100%)',
          border: '1px solid rgba(6,182,212,0.15)',
        }}
      >
        {/* 背景渐变 */}
        <div aria-hidden style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 40%, rgba(6,182,212,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 30% 70%, rgba(124,58,237,0.05) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
        }}/>

        {/* 雷达网格 */}
        <RadarGrid />

        {/* 声呐扫描线 */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', pointerEvents: 'none' }}>
          <SonarScanline />
        </div>

        {/* 简化世界地图轮廓 - 使用 CSS 绘制 */}
        <svg 
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}
          viewBox="0 0 100 60"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* 简化大陆轮廓 */}
          <path 
            d="M15,20 Q20,15 30,18 L35,15 Q42,12 48,15 L50,18 Q45,22 48,25 L52,28 Q48,35 45,38 L40,35 Q35,38 30,35 L25,38 Q20,35 18,30 L15,25 Z"
            fill={C.cyan}
            opacity="0.3"
          />
          <path 
            d="M55,25 Q60,22 68,25 L72,28 Q75,35 72,42 L68,48 Q62,52 55,50 L52,45 Q50,38 52,32 Z"
            fill={C.cyan}
            opacity="0.25"
          />
          <path 
            d="M75,35 Q82,32 88,38 L90,45 Q88,52 82,55 L78,52 Q75,48 76,42 Z"
            fill={C.cyan}
            opacity="0.2"
          />
        </svg>

        {/* 信号点 */}
        {signals.map(signal => (
          <SignalPoint
            key={signal.id}
            signal={signal}
            onClick={() => setSelectedSignal(signal)}
            isSelected={selectedSignal?.id === signal.id}
          />
        ))}

        {/* 新信号提示 */}
        <AnimatePresence>
          {newSignalAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 16px',
                borderRadius: 50,
                background: `${C.cyan}20`,
                border: `1px solid ${C.cyan}40`,
                backdropFilter: 'blur(10px)',
                zIndex: 25,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan }}>检测到新市场信号</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 信号详情面板 */}
        <AnimatePresence>
          {selectedSignal && (
            <SignalDetailPanel
              signal={selectedSignal}
              onClose={() => setSelectedSignal(null)}
              onCreateDecision={() => {
                setSelectedSignal(null);
                navigate('/feed');
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* 底部安全区 */}
      <div style={{ height: 100 }}/>
    </div>
  );
}
