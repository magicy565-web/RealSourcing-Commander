/**
 * DigitalAgents - 数字员工团队管理
 *
 * 设计特点：
 * - 每个 Agent 有独特的个性、角色和当前任务
 * - "工作中"状态使用缓慢的脉搏动画，像在"呼吸"或"思考"
 * - 任务完成时显示快速的勾选动画
 * - 可以点击进入单个 Agent 查看详情或重新分配任务
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '../lib/haptics';

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
  pink: '#F472B6',
};

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };
const SPRING_GENTLE = { type: 'spring' as const, stiffness: 260, damping: 30 };

// Agent 状态
type AgentStatus = 'working' | 'busy' | 'standby' | 'offline';

// AI Agent 类型
interface DigitalAgent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  status: AgentStatus;
  currentTask?: string;
  taskProgress?: number;
  completedTasks: number;
  totalTasks: number;
  lastActive: Date;
  specialties: string[];
  personality: string;
}

// Mock Agent 数据
const MOCK_AGENTS: DigitalAgent[] = [
  {
    id: 'sage',
    name: 'Sage',
    role: '策略顾问',
    avatar: '🧠',
    color: C.PL,
    status: 'working',
    currentTask: '分析沙特市场竞品定价策略',
    taskProgress: 65,
    completedTasks: 12,
    totalTasks: 15,
    lastActive: new Date(),
    specialties: ['市场分析', '竞争策略', '定价优化'],
    personality: '深思熟虑，数据驱动，善于发现隐藏的市场机会',
  },
  {
    id: 'scout',
    name: 'Scout',
    role: '市场猎手',
    avatar: '🔭',
    color: C.blue,
    status: 'busy',
    currentTask: '扫描东南亚不锈钢餐具海关数据',
    taskProgress: 82,
    completedTasks: 28,
    totalTasks: 30,
    lastActive: new Date(),
    specialties: ['全球市场监控', '海关数据分析', '趋势预测'],
    personality: '敏锐警觉，全球视野，第一时间捕捉商机',
  },
  {
    id: 'muse',
    name: 'Muse',
    role: '内容创作',
    avatar: '✨',
    color: C.amber,
    status: 'working',
    currentTask: '生成中东风格产品海报',
    taskProgress: 45,
    completedTasks: 8,
    totalTasks: 10,
    lastActive: new Date(),
    specialties: ['多语言文案', '视觉设计', '本地化创意'],
    personality: '充满创意，审美敏锐，让每个市场都能感受品牌魅力',
  },
  {
    id: 'echo',
    name: 'Echo',
    role: '客服专员',
    avatar: '💬',
    color: C.green,
    status: 'standby',
    completedTasks: 45,
    totalTasks: 45,
    lastActive: new Date(Date.now() - 1000 * 60 * 15),
    specialties: ['询盘回复', '客户沟通', '问题解答'],
    personality: '温和耐心，响应迅速，让每位客户感受到专业与关怀',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    role: '数据分析',
    avatar: '📊',
    color: C.teal,
    status: 'working',
    currentTask: '生成本周业务报告',
    taskProgress: 30,
    completedTasks: 6,
    totalTasks: 8,
    lastActive: new Date(),
    specialties: ['数据可视化', '业绩分析', '趋势报告'],
    personality: '严谨细致，数字说话，让复杂数据变得一目了然',
  },
  {
    id: 'nova',
    name: 'Nova',
    role: '新市场开拓',
    avatar: '🚀',
    color: C.pink,
    status: 'offline',
    completedTasks: 0,
    totalTasks: 0,
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24),
    specialties: ['新市场调研', '渠道开发', '合作洽谈'],
    personality: '即将加入团队，专注新兴市场开拓',
  },
];

// Noise 纹理
const Noise = ({ intensity = 0.022 }: { intensity?: number }) => (
  <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: intensity, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}>
    <filter id="nzda"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#nzda)"/>
  </svg>
);

// 状态徽章
function StatusBadge({ status }: { status: AgentStatus }) {
  const configs = {
    working: { label: '工作中', color: C.green, pulse: true },
    busy: { label: '忙碌', color: C.amber, pulse: true },
    standby: { label: '待命', color: C.t3, pulse: false },
    offline: { label: '离线', color: C.red, pulse: false },
  };
  const cfg = configs[status];

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 50,
      background: `${cfg.color}15`,
      border: `1px solid ${cfg.color}30`,
    }}>
      {/* 状态点 - 呼吸动画 */}
      <motion.div
        animate={cfg.pulse ? { 
          scale: [1, 1.3, 1],
          opacity: [1, 0.6, 1],
        } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.color,
          boxShadow: cfg.pulse ? `0 0 8px ${cfg.color}` : 'none',
        }}
      />
      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: 0.3 }}>
        {cfg.label}
      </span>
    </div>
  );
}

// 任务进度条
function TaskProgress({ progress, color }: { progress: number; color: string }) {
  return (
    <div style={{
      width: '100%',
      height: 4,
      borderRadius: 2,
      background: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          height: '100%',
          borderRadius: 2,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          position: 'relative',
        }}
      >
        {/* 流动效果 */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          }}
        />
      </motion.div>
    </div>
  );
}

// Agent 卡片
function AgentCard({ 
  agent, 
  index,
  onTap,
}: { 
  agent: DigitalAgent;
  index: number;
  onTap: () => void;
}) {
  const [showCheckmark, setShowCheckmark] = useState(false);

  // 模拟任务完成动画
  useEffect(() => {
    if (agent.taskProgress && agent.taskProgress >= 100) {
      setShowCheckmark(true);
      hapticSuccess();
      setTimeout(() => setShowCheckmark(false), 1500);
    }
  }, [agent.taskProgress]);

  const isActive = agent.status === 'working' || agent.status === 'busy';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_GENTLE, delay: index * 0.08 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { hapticLight(); onTap(); }}
      style={{
        position: 'relative',
        borderRadius: 20,
        background: `linear-gradient(145deg, ${agent.color}10, ${agent.color}05)`,
        border: `1px solid ${agent.color}25`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
        padding: 16,
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      <Noise intensity={0.02}/>

      {/* 背景光晕 */}
      <div aria-hidden style={{
        position: 'absolute', top: -30, right: -20,
        width: 100, height: 100,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${agent.color}15 0%, transparent 70%)`,
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }}/>

      {/* 任务完成勾选动画 */}
      <AnimatePresence>
        {showCheckmark && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: `${C.green}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              borderRadius: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={SPRING}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          {/* 头像 */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `${agent.color}20`,
            border: `1.5px solid ${agent.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            position: 'relative',
            flexShrink: 0,
          }}>
            {agent.avatar}
            {/* 工作中旋转圈 */}
            {isActive && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: 17,
                  border: '2px solid transparent',
                  borderTopColor: agent.color,
                  opacity: 0.6,
                }}
              />
            )}
          </div>

          {/* 信息 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.t1, letterSpacing: -0.3 }}>{agent.name}</span>
              <StatusBadge status={agent.status} />
            </div>
            <span style={{ fontSize: 12, color: agent.color, fontWeight: 600 }}>{agent.role}</span>
          </div>
        </div>

        {/* 当前任务 */}
        {agent.currentTask && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 10, color: C.t3, fontWeight: 600, marginBottom: 6 }}>当前任务</div>
            <div style={{ fontSize: 12, color: C.t1, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
              {agent.currentTask}
            </div>
            {agent.taskProgress !== undefined && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.t3 }}>进度</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: agent.color }}>{agent.taskProgress}%</span>
                </div>
                <TaskProgress progress={agent.taskProgress} color={agent.color} />
              </div>
            )}
          </div>
        )}

        {/* 待命状态提示 */}
        {agent.status === 'standby' && (
          <div style={{
            padding: '12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.1)',
            textAlign: 'center',
            marginBottom: 12,
          }}>
            <span style={{ fontSize: 11, color: C.t3 }}>等待分配任务...</span>
          </div>
        )}

        {/* 离线状态提示 */}
        {agent.status === 'offline' && (
          <div style={{
            padding: '12px',
            borderRadius: 12,
            background: `${C.red}08`,
            border: `1px solid ${C.red}15`,
            textAlign: 'center',
            marginBottom: 12,
          }}>
            <span style={{ fontSize: 11, color: C.t3 }}>即将解锁</span>
          </div>
        )}

        {/* 底部统计 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="2" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <span style={{ fontSize: 11, color: C.t3 }}>
              已完成 <span style={{ fontWeight: 700, color: agent.color }}>{agent.completedTasks}</span>/{agent.totalTasks}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span style={{ fontSize: 10, color: C.t3 }}>
              {agent.lastActive.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Agent 详情面板
function AgentDetailPanel({ 
  agent, 
  onClose,
  onAssignTask,
}: { 
  agent: DigitalAgent;
  onClose: () => void;
  onAssignTask: () => void;
}) {
  return (
    <>
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
          zIndex: 50,
        }}
      />

      {/* 详情面板 */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '85vh',
          background: 'linear-gradient(180deg, rgba(17,17,24,0.98) 0%, rgba(10,10,15,1) 100%)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 40px',
          zIndex: 51,
          overflowY: 'auto',
        }}
      >
        {/* 拖动条 */}
        <div style={{
          width: 40,
          height: 4,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 20px',
        }}/>

        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: `${agent.color}20`,
            border: `2px solid ${agent.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}>
            {agent.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: C.t1, letterSpacing: -0.5 }}>{agent.name}</h2>
              <StatusBadge status={agent.status} />
            </div>
            <div style={{ fontSize: 14, color: agent.color, fontWeight: 600 }}>{agent.role}</div>
          </div>
        </div>

        {/* 性格描述 */}
        <div style={{
          padding: 16,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${agent.color}10, ${agent.color}05)`,
          border: `1px solid ${agent.color}20`,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, color: C.t3, fontWeight: 600, marginBottom: 6 }}>性格特点</div>
          <p style={{ fontSize: 13, color: C.t1, lineHeight: 1.55, margin: 0 }}>
            {agent.personality}
          </p>
        </div>

        {/* 专长标签 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.t3, fontWeight: 600, marginBottom: 10 }}>专业技能</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {agent.specialties.map(skill => (
              <div key={skill} style={{
                padding: '6px 12px',
                borderRadius: 50,
                background: `${agent.color}12`,
                border: `1px solid ${agent.color}25`,
                fontSize: 12,
                fontWeight: 600,
                color: agent.color,
              }}>
                {skill}
              </div>
            ))}
          </div>
        </div>

        {/* 工作统计 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{
            flex: 1,
            padding: 14,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: agent.color, letterSpacing: -1 }}>
              {agent.completedTasks}
            </div>
            <div style={{ fontSize: 11, color: C.t3 }}>已完成任务</div>
          </div>
          <div style={{
            flex: 1,
            padding: 14,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.t1, letterSpacing: -1 }}>
              {agent.totalTasks - agent.completedTasks}
            </div>
            <div style={{ fontSize: 11, color: C.t3 }}>待处理</div>
          </div>
          <div style={{
            flex: 1,
            padding: 14,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.green, letterSpacing: -1 }}>
              {agent.totalTasks > 0 ? Math.round(agent.completedTasks / agent.totalTasks * 100) : 0}%
            </div>
            <div style={{ fontSize: 11, color: C.t3 }}>完成率</div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { hapticMedium(); onAssignTask(); }}
            style={{
              flex: 1,
              padding: '14px 0',
              borderRadius: 50,
              background: `linear-gradient(135deg, ${agent.color}, ${agent.color}CC)`,
              border: 'none',
              fontSize: 14,
              fontWeight: 800,
              color: '#000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            分配任务
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onClose}
            style={{
              padding: '14px 24px',
              borderRadius: 50,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 14,
              fontWeight: 700,
              color: C.t2,
              cursor: 'pointer',
            }}
          >
            关闭
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// 主页面
export default function DigitalAgents() {
  const [, navigate] = useLocation();
  const [agents] = useState<DigitalAgent[]>(MOCK_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<DigitalAgent | null>(null);

  const activeCount = agents.filter(a => a.status === 'working' || a.status === 'busy').length;
  const standbyCount = agents.filter(a => a.status === 'standby').length;

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
        padding: '50px 20px 16px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
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
            <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1, letterSpacing: -0.5 }}>数字员工</h1>
            <span style={{ fontSize: 11, color: C.t3 }}>您的 AI 团队</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: `${C.PL}20`,
              border: `1px solid ${C.PL}35`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.PL} strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </motion.button>
        </div>

        {/* 团队状态概览 */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: 14,
            background: `${C.green}10`,
            border: `1px solid ${C.green}25`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }}
              />
              <span style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>工作中</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: C.green }}>{activeCount}</span>
          </div>
          <div style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.t3 }}/>
              <span style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>待命</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: C.t1 }}>{standbyCount}</span>
          </div>
          <div style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>总计</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: C.PL }}>{agents.length}</span>
          </div>
        </div>
      </div>

      {/* Agent 列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 20px 100px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {agents.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={i}
              onTap={() => setSelectedAgent(agent)}
            />
          ))}
        </div>
      </div>

      {/* Agent 详情面板 */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentDetailPanel
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onAssignTask={() => {
              setSelectedAgent(null);
              navigate('/chat');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
