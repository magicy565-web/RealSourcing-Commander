/**
 * WatchFace - Commander Boss Phone 首页表盘
 * 
 * 设计理念：
 * - 灵感来自 Apple Watch 表盘，沉稳高级
 * - 时间作为视觉焦点，AI 状态作为环绕元素
 * - 平静无缝的入口体验，每日清晨的第一眼
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { FluidAurora } from '../components/FluidAurora';
import { hapticLight, hapticMedium, hapticSelection } from '../lib/haptics';

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
};

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };
const SPRING_GENTLE = { type: 'spring' as const, stiffness: 260, damping: 30 };

// AI Agent 状态类型
interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'working' | 'standby' | 'busy';
  currentTask?: string;
  color: string;
}

// 快捷统计
interface QuickStat {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  path: string;
}

// 模拟 AI Agent 数据
const MOCK_AGENTS: AgentStatus[] = [
  { id: '1', name: 'Scout', role: '市场猎手', status: 'working', currentTask: '扫描东南亚不锈钢市场', color: C.blue },
  { id: '2', name: 'Sage', role: '策略顾问', status: 'standby', color: C.PL },
  { id: '3', name: 'Echo', role: '客服专员', status: 'busy', currentTask: '回复询盘 #INQ-047', color: C.green },
  { id: '4', name: 'Muse', role: '内容创作', status: 'working', currentTask: '生成中东风格海报', color: C.amber },
];

// Noise 纹理
const Noise = ({ intensity = 0.022 }: { intensity?: number }) => (
  <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: intensity, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}>
    <filter id="nzwf"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#nzwf)"/>
  </svg>
);

// 状态指示点 - 带有呼吸动画
function StatusDot({ status, size = 8 }: { status: 'working' | 'standby' | 'busy'; size?: number }) {
  const colors = {
    working: C.green,
    standby: C.t3,
    busy: C.amber,
  };
  const color = colors[status];

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* 呼吸光晕 */}
      {status === 'working' && (
        <motion.div
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: -2,
            borderRadius: '50%',
            background: color,
          }}
        />
      )}
      {status === 'busy' && (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      )}
      {/* 核心点 */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: color,
        boxShadow: status !== 'standby' ? `0 0 8px ${color}` : 'none',
      }}/>
    </div>
  );
}

// Agent 环绕图标
function AgentOrbitIcon({ agent, angle, radius }: { agent: AgentStatus; angle: number; radius: number }) {
  const x = Math.cos(angle * Math.PI / 180) * radius;
  const y = Math.sin(angle * Math.PI / 180) * radius;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING_GENTLE, delay: angle / 360 * 0.5 }}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
    >
      <motion.div
        whileTap={{ scale: 0.9 }}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${agent.color}25, ${agent.color}10)`,
          border: `1.5px solid ${agent.color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          cursor: 'pointer',
          boxShadow: agent.status === 'working' ? `0 0 20px ${agent.color}30` : 'none',
        }}
        onClick={() => hapticLight()}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: agent.color, letterSpacing: -0.3 }}>
          {agent.name.charAt(0)}
        </span>
        <StatusDot status={agent.status} size={5}/>
      </motion.div>
    </motion.div>
  );
}

// 统计卡片
function StatCard({ stat, index }: { stat: QuickStat; index: number }) {
  const [, navigate] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.3 + index * 0.08 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        hapticMedium();
        navigate(stat.path);
      }}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '14px 12px',
        borderRadius: 16,
        background: `linear-gradient(145deg, ${stat.color}12, ${stat.color}06)`,
        border: `1px solid ${stat.color}25`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 光晕 */}
      <div aria-hidden style={{
        position: 'absolute', top: -20, right: -20,
        width: 60, height: 60,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${stat.color}15 0%, transparent 70%)`,
        filter: 'blur(10px)',
        pointerEvents: 'none',
      }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          {stat.icon}
          <span style={{ fontSize: 10, color: C.t3, fontWeight: 600, letterSpacing: 0.3 }}>{stat.label}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>
          {stat.value}
        </div>
      </div>
    </motion.div>
  );
}

// 主时钟组件
function MainClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const dateStr = time.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
      {/* 日期 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_GENTLE, delay: 0.1 }}
        style={{ fontSize: 13, color: C.t2, fontWeight: 600, marginBottom: 8, letterSpacing: 0.5 }}
      >
        {dateStr}
      </motion.div>

      {/* 时间 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay: 0.15 }}
        style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}
      >
        <span style={{
          fontSize: 72,
          fontWeight: 200,
          color: C.t1,
          letterSpacing: -4,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif',
        }}>
          {hours}
        </span>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{ fontSize: 56, fontWeight: 200, color: C.PL }}
        >
          :
        </motion.span>
        <span style={{
          fontSize: 72,
          fontWeight: 200,
          color: C.t1,
          letterSpacing: -4,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif',
        }}>
          {minutes}
        </span>
        <span style={{
          fontSize: 24,
          fontWeight: 400,
          color: C.t3,
          marginLeft: 6,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {seconds}
        </span>
      </motion.div>
    </div>
  );
}

// Agent 轨道环
function AgentOrbit({ agents }: { agents: AgentStatus[] }) {
  const radius = 130;
  const angleStep = 360 / agents.length;

  return (
    <div style={{ position: 'relative', width: radius * 2 + 80, height: radius * 2 + 80, margin: '0 auto' }}>
      {/* 轨道环 */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${radius * 2 + 80} ${radius * 2 + 80}`}
      >
        <defs>
          <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={C.PL} stopOpacity="0.15"/>
            <stop offset="50%" stopColor={C.blue} stopOpacity="0.08"/>
            <stop offset="100%" stopColor={C.PL} stopOpacity="0.15"/>
          </linearGradient>
        </defs>
        <circle
          cx={radius + 40}
          cy={radius + 40}
          r={radius}
          fill="none"
          stroke="url(#orbitGrad)"
          strokeWidth="1"
          strokeDasharray="4 8"
        />
      </svg>

      {/* 中心时钟 */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 200,
        textAlign: 'center',
      }}>
        <MainClock />
      </div>

      {/* Agent 图标 */}
      {agents.map((agent, i) => (
        <AgentOrbitIcon
          key={agent.id}
          agent={agent}
          angle={-90 + i * angleStep}
          radius={radius}
        />
      ))}
    </div>
  );
}

// 活动日志项
function ActivityLogItem({ agent, delay }: { agent: AgentStatus; delay: number }) {
  if (agent.status === 'standby') return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING_GENTLE, delay }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{
        width: 28, height: 28,
        borderRadius: '50%',
        background: `${agent.color}20`,
        border: `1px solid ${agent.color}35`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: agent.color }}>{agent.name.charAt(0)}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>{agent.name}</span>
          <span style={{ fontSize: 10, color: C.t3 }}>{agent.role}</span>
          <StatusDot status={agent.status} size={5}/>
        </div>
        {agent.currentTask && (
          <div style={{ fontSize: 10.5, color: C.t2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {agent.currentTask}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// 主页面
export default function WatchFace() {
  const [, navigate] = useLocation();
  const [agents] = useState<AgentStatus[]>(MOCK_AGENTS);

  // 统计数据
  const stats: QuickStat[] = useMemo(() => [
    {
      label: '新询盘',
      value: 12,
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
      color: C.blue,
      path: '/inbound',
    },
    {
      label: '待决策',
      value: 5,
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
      color: C.amber,
      path: '/feed',
    },
    {
      label: '市场信号',
      value: 8,
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
      color: C.green,
      path: '/radar',
    },
    {
      label: '已覆盖',
      value: 24,
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.PL} strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>,
      color: C.PL,
      path: '/radar',
    },
  ], []);

  const activeAgents = agents.filter(a => a.status !== 'standby');

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100dvh',
      background: C.bg,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 流体极光背景 */}
      <FluidAurora />
      <Noise intensity={0.02}/>

      {/* 内容区域 */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 20px 100px',
        overflowY: 'auto',
      }}>
        {/* 顶部问候 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_GENTLE }}
          style={{ textAlign: 'center', marginBottom: 20 }}
        >
          <div style={{ fontSize: 11, color: C.t3, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Commander
          </div>
        </motion.div>

        {/* Agent 轨道 + 时钟 */}
        <AgentOrbit agents={agents} />

        {/* AI 活动状态 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ marginTop: 24, marginBottom: 20 }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingLeft: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }}
              />
              <span style={{ fontSize: 11, color: C.t2, fontWeight: 600 }}>
                {activeAgents.length} 个 AI 正在工作
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { hapticLight(); navigate('/agents'); }}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: 11,
                color: C.PL,
                fontWeight: 600,
              }}
            >
              查看全部
            </motion.button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeAgents.map((agent, i) => (
              <ActivityLogItem key={agent.id} agent={agent} delay={0.5 + i * 0.08} />
            ))}
          </div>
        </motion.div>

        {/* 快捷统计 */}
        <div style={{ display: 'flex', gap: 10 }}>
          {stats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
