/**
 * AITraining - AI 大脑训练中心
 *
 * 设计理念：
 * - 训练进度：像知识在流动，有机而非机械
 *   进度条使用液态 shimmer 效果，模拟知识注入
 * - 能力解锁：像技能树上的星星点亮
 *   解锁时有庆祝动画，营造成就感
 * - 整体感觉：看着 AI 员工成长，温暖而有力量
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticLight, hapticSuccess, hapticMedium } from '../lib/haptics';

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

// 能力维度类型
interface CapabilityDimension {
  id: string;
  name: string;
  description: string;
  progress: number;
  level: number;
  maxLevel: number;
  color: string;
  icon: string;
  skills: {
    name: string;
    unlocked: boolean;
    description: string;
  }[];
  isTraining: boolean;
}

// Mock 训练数据
const MOCK_CAPABILITIES: CapabilityDimension[] = [
  {
    id: 'product',
    name: '产品知识',
    description: '深度理解您的产品特性、参数与竞争优势',
    progress: 85,
    level: 4,
    maxLevel: 5,
    color: C.blue,
    icon: '📦',
    skills: [
      { name: '基础参数识别', unlocked: true, description: '识别产品核心参数' },
      { name: '材质分析', unlocked: true, description: '分析材质特性与应用场景' },
      { name: '认证解读', unlocked: true, description: '解读各类国际认证标准' },
      { name: '竞品对比', unlocked: true, description: '与竞品进行差异化分析' },
      { name: '技术创新识别', unlocked: false, description: '识别技术创新点' },
    ],
    isTraining: true,
  },
  {
    id: 'market',
    name: '市场语言',
    description: '掌握目标市场的商业用语与文化习惯',
    progress: 72,
    level: 3,
    maxLevel: 5,
    color: C.green,
    icon: '🌍',
    skills: [
      { name: '英语商务写作', unlocked: true, description: '专业的英语商务沟通' },
      { name: '阿拉伯语基础', unlocked: true, description: '中东市场沟通能力' },
      { name: '文化敏感度', unlocked: true, description: '理解不同市场文化差异' },
      { name: '本地化表达', unlocked: false, description: '使用本地化的表达方式' },
      { name: '多语言谈判', unlocked: false, description: '多语言谈判技巧' },
    ],
    isTraining: false,
  },
  {
    id: 'negotiation',
    name: '谈判策略',
    description: '学习您的报价策略与成交技巧',
    progress: 58,
    level: 2,
    maxLevel: 5,
    color: C.amber,
    icon: '🤝',
    skills: [
      { name: '价格锚定', unlocked: true, description: '设定有效的价格锚点' },
      { name: '阶梯报价', unlocked: true, description: '根据订单量灵活报价' },
      { name: '异议处理', unlocked: false, description: '处理客户价格异议' },
      { name: '紧迫感营造', unlocked: false, description: '营造成交紧迫感' },
      { name: '大客户策略', unlocked: false, description: '大客户专属谈判策略' },
    ],
    isTraining: false,
  },
  {
    id: 'content',
    name: '内容创作',
    description: '生成符合品牌调性的营销内容',
    progress: 91,
    level: 4,
    maxLevel: 5,
    color: C.PL,
    icon: '✨',
    skills: [
      { name: '产品文案', unlocked: true, description: '撰写产品描述文案' },
      { name: '社媒内容', unlocked: true, description: '创作社交媒体内容' },
      { name: '视频脚本', unlocked: true, description: '编写短视频脚本' },
      { name: '风格适配', unlocked: true, description: '适配不同市场风格' },
      { name: '爆款预测', unlocked: false, description: '预测内容传播潜力' },
    ],
    isTraining: true,
  },
  {
    id: 'outreach',
    name: '多语触达',
    description: '多渠道、多语言的客户触达能力',
    progress: 45,
    level: 2,
    maxLevel: 5,
    color: C.teal,
    icon: '📡',
    skills: [
      { name: '邮件模板', unlocked: true, description: '标准化邮件模板' },
      { name: 'DM 开发', unlocked: true, description: '社交平台 DM 开发' },
      { name: '跟进序列', unlocked: false, description: '自动化跟进序列' },
      { name: '个性化触达', unlocked: false, description: '高度个性化的触达' },
      { name: '全渠道协同', unlocked: false, description: '多渠道协同触达' },
    ],
    isTraining: false,
  },
];

// Noise 纹理
const Noise = ({ intensity = 0.022 }: { intensity?: number }) => (
  <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: intensity, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}>
    <filter id="nzat"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#nzat)"/>
  </svg>
);

// 液态流动进度条
function LiquidProgressBar({ 
  progress, 
  color, 
  isTraining,
  height = 8,
}: { 
  progress: number; 
  color: string;
  isTraining: boolean;
  height?: number;
}) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height,
      borderRadius: height / 2,
      background: 'rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      {/* 进度填充 */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          height: '100%',
          borderRadius: height / 2,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 液态 shimmer 效果 - 知识流动感 */}
        {isTraining && (
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)`,
            }}
          />
        )}
      </motion.div>

      {/* 光晕效果 */}
      <div style={{
        position: 'absolute',
        left: `${progress}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        filter: 'blur(4px)',
        pointerEvents: 'none',
      }}/>
    </div>
  );
}

// 技能节点
function SkillNode({ 
  skill, 
  color, 
  index,
  isLastUnlocked,
}: { 
  skill: { name: string; unlocked: boolean; description: string };
  color: string;
  index: number;
  isLastUnlocked: boolean;
}) {
  const [showCelebration, setShowCelebration] = useState(false);

  // 刚解锁的技能显示庆祝动画
  useEffect(() => {
    if (isLastUnlocked) {
      setTimeout(() => {
        setShowCelebration(true);
        hapticSuccess();
        setTimeout(() => setShowCelebration(false), 1500);
      }, 800 + index * 100);
    }
  }, [isLastUnlocked, index]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING_GENTLE, delay: index * 0.08 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        background: skill.unlocked ? `${color}10` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${skill.unlocked ? `${color}25` : 'rgba(255,255,255,0.06)'}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 庆祝粒子 */}
      <AnimatePresence>
        {showCelebration && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos(i * 45 * Math.PI / 180) * 40,
                  y: Math.sin(i * 45 * Math.PI / 180) * 40,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  position: 'absolute',
                  left: 20,
                  top: '50%',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 6px ${color}`,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* 状态图标 */}
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: skill.unlocked ? `${color}25` : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${skill.unlocked ? color : 'rgba(255,255,255,0.1)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
      }}>
        {skill.unlocked ? (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...SPRING, delay: index * 0.1 }}
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          >
            <path d="M20 6L9 17l-5-5"/>
          </motion.svg>
        ) : (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        )}

        {/* 解锁光晕 */}
        {skill.unlocked && (
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: `1px solid ${color}`,
            }}
          />
        )}
      </div>

      {/* 技能信息 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: skill.unlocked ? C.t1 : C.t3,
          marginBottom: 2,
        }}>
          {skill.name}
        </div>
        <div style={{
          fontSize: 10,
          color: skill.unlocked ? C.t2 : 'rgba(255,255,255,0.15)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {skill.description}
        </div>
      </div>
    </motion.div>
  );
}

// 能力卡片
function CapabilityCard({ 
  capability, 
  index,
  isExpanded,
  onToggle,
}: { 
  capability: CapabilityDimension;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const unlockedCount = capability.skills.filter(s => s.unlocked).length;
  const lastUnlockedIndex = capability.skills.findIndex(s => !s.unlocked) - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_GENTLE, delay: index * 0.1 }}
      style={{
        borderRadius: 20,
        background: `linear-gradient(145deg, ${capability.color}10, ${capability.color}05)`,
        border: `1px solid ${capability.color}25`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Noise intensity={0.02}/>

      {/* 背景光晕 */}
      <div aria-hidden style={{
        position: 'absolute', top: -40, right: -30,
        width: 120, height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${capability.color}15 0%, transparent 70%)`,
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }}/>

      {/* 训练中指示器 */}
      {capability.isTraining && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${capability.color}, transparent)`,
          }}
        />
      )}

      {/* 主内容 */}
      <motion.div
        onClick={() => { hapticLight(); onToggle(); }}
        style={{ padding: 16, cursor: 'pointer', position: 'relative', zIndex: 2 }}
      >
        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: `${capability.color}20`,
              border: `1px solid ${capability.color}35`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              position: 'relative',
            }}>
              {capability.icon}
              {/* 训练中动画 */}
              {capability.isTraining && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    inset: -3,
                    borderRadius: 17,
                    border: '2px solid transparent',
                    borderTopColor: capability.color,
                  }}
                />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.t1, letterSpacing: -0.3 }}>{capability.name}</span>
                {capability.isTraining && (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: capability.color,
                      padding: '2px 7px',
                      borderRadius: 50,
                      background: `${capability.color}15`,
                      border: `1px solid ${capability.color}30`,
                    }}
                  >
                    训练中
                  </motion.span>
                )}
              </div>
              <span style={{ fontSize: 11, color: C.t3 }}>{capability.description}</span>
            </div>
          </div>

          {/* 等级显示 */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: capability.color, letterSpacing: -1 }}>Lv.{capability.level}</span>
              <span style={{ fontSize: 11, color: C.t3 }}>/{capability.maxLevel}</span>
            </div>
            <span style={{ fontSize: 10, color: C.t3 }}>{unlockedCount}/{capability.skills.length} 技能</span>
          </div>
        </div>

        {/* 进度条 */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>训练进度</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: capability.color }}>{capability.progress}%</span>
          </div>
          <LiquidProgressBar
            progress={capability.progress}
            color={capability.color}
            isTraining={capability.isTraining}
          />
        </div>

        {/* 展开/收起指示器 */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </motion.div>
        </div>
      </motion.div>

      {/* 技能列表（展开） */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 16px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: 12,
            }}>
              <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>
                能力节点
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {capability.skills.map((skill, i) => (
                  <SkillNode
                    key={i}
                    skill={skill}
                    color={capability.color}
                    index={i}
                    isLastUnlocked={i === lastUnlockedIndex && capability.isTraining}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// AI 大脑可视化
function AIBrainVisualization({ capabilities }: { capabilities: CapabilityDimension[] }) {
  const totalProgress = Math.round(capabilities.reduce((sum, c) => sum + c.progress, 0) / capabilities.length);
  const trainingCount = capabilities.filter(c => c.isTraining).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_GENTLE}
      style={{
        position: 'relative',
        padding: '24px 20px',
        borderRadius: 24,
        background: 'linear-gradient(145deg, rgba(124,58,237,0.12), rgba(96,165,250,0.08))',
        border: '1px solid rgba(124,58,237,0.25)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        marginBottom: 20,
        overflow: 'hidden',
      }}
    >
      <Noise intensity={0.025}/>

      {/* 神经网络背景动画 */}
      <svg
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.3 }}
        viewBox="0 0 200 120"
      >
        {/* 连接线 */}
        {[
          { x1: 30, y1: 30, x2: 100, y2: 60 },
          { x1: 30, y1: 90, x2: 100, y2: 60 },
          { x1: 100, y1: 60, x2: 170, y2: 40 },
          { x1: 100, y1: 60, x2: 170, y2: 80 },
        ].map((line, i) => (
          <motion.line
            key={i}
            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke={C.PL}
            strokeWidth="0.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, repeatType: 'reverse' }}
          />
        ))}
        {/* 节点 */}
        {[
          { cx: 30, cy: 30 },
          { cx: 30, cy: 90 },
          { cx: 100, cy: 60 },
          { cx: 170, cy: 40 },
          { cx: 170, cy: 80 },
        ].map((node, i) => (
          <motion.circle
            key={i}
            cx={node.cx} cy={node.cy} r="4"
            fill={C.PL}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
          />
        ))}
      </svg>

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        {/* 总体进度 */}
        <div style={{ marginBottom: 16 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...SPRING, delay: 0.2 }}
            style={{
              width: 100,
              height: 100,
              margin: '0 auto 12px',
              position: 'relative',
            }}
          >
            {/* 外环 */}
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={`url(#brainGrad)`}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - totalProgress / 100) }}
                transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ filter: `drop-shadow(0 0 8px ${C.PL})` }}
              />
              <defs>
                <linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={C.PL}/>
                  <stop offset="100%" stopColor={C.blue}/>
                </linearGradient>
              </defs>
            </svg>

            {/* 中心数字 */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: C.t1, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>
                {totalProgress}%
              </span>
              <span style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>整体智力</span>
            </div>
          </motion.div>
        </div>

        {/* 状态信息 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.PL }}>{capabilities.length}</div>
            <div style={{ fontSize: 10, color: C.t3 }}>能力维度</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}/>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{trainingCount}</span>
              {trainingCount > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }}
                />
              )}
            </div>
            <div style={{ fontSize: 10, color: C.t3 }}>正在训练</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}/>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.amber }}>
              {capabilities.reduce((sum, c) => sum + c.skills.filter(s => s.unlocked).length, 0)}
            </div>
            <div style={{ fontSize: 10, color: C.t3 }}>已解锁技能</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 主页面
export default function AITraining() {
  const [, navigate] = useLocation();
  const [capabilities] = useState<CapabilityDimension[]>(MOCK_CAPABILITIES);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1, letterSpacing: -0.5 }}>AI 训练中心</h1>
            <span style={{ fontSize: 11, color: C.t3 }}>看着 AI 员工成长</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { hapticMedium(); navigate('/asset-vault'); }}
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
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </motion.button>
        </div>
      </div>

      {/* 内容区 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 20px 100px',
      }}>
        {/* AI 大脑可视化 */}
        <AIBrainVisualization capabilities={capabilities} />

        {/* 能力卡片列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {capabilities.map((cap, i) => (
            <CapabilityCard
              key={cap.id}
              capability={cap}
              index={i}
              isExpanded={expandedId === cap.id}
              onToggle={() => setExpandedId(expandedId === cap.id ? null : cap.id)}
            />
          ))}
        </div>

        {/* 底部提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>
            上传更多产品资料到<span style={{ color: C.PL, fontWeight: 700 }}>资产库</span>，<br/>AI 将持续学习并解锁更多能力
          </div>
        </motion.div>
      </div>
    </div>
  );
}
