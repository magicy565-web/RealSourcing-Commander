/**
 * DecisionFeed - AI 决策卡片流
 *
 * 交互设计核心：
 * - 确认决策：强烈且令人满足，像 Apple Watch 的震动反馈
 *   卡片收缩、粒子轨迹飞出，配合清脆震动
 * - 驳回卡片：是"暂时搁置"，不是"删除"
 *   卡片淡出滑走，温和地移至一旁
 * - 长按展开：卡片从页面上浮起，聚焦感
 *   背景模糊变暗，卡片 Z 轴提升
 *
 * 这是 Commander 的心脏，AI 主动推送商业决策给老板
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
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
};

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };
const SPRING_BOUNCY = { type: 'spring' as const, stiffness: 380, damping: 22 };

// 决策类型
type DecisionType = 'opportunity' | 'lead' | 'content' | 'optimization' | 'alert';

interface DecisionCard {
  id: string;
  type: DecisionType;
  title: string;
  summary: string;
  source: string;
  timestamp: Date;
  urgency: 'low' | 'medium' | 'high';
  metrics?: { label: string; value: string; trend?: 'up' | 'down' }[];
  aiReasoning?: string;
  suggestedAction?: string;
  estimatedValue?: string;
}

// Mock 数据
const MOCK_CARDS: DecisionCard[] = [
  {
    id: '1',
    type: 'opportunity',
    title: '沙特不锈钢餐具需求激增 15%',
    summary: '海关数据显示，过去 30 天沙特不锈钢餐具进口量同比增长 15%，主要来自中国和印度。',
    source: '市场雷达',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    urgency: 'high',
    metrics: [
      { label: '增长率', value: '+15%', trend: 'up' },
      { label: '市场规模', value: '$2.4M' },
    ],
    aiReasoning: '结合您的产品 SASO 认证和中东市场经验，建议立即启动定向触达，预计可获取 5-8 个优质询盘。',
    suggestedAction: '生成中东风格营销素材，触达 50 家沙特分销商',
    estimatedValue: '$45,000',
  },
  {
    id: '2',
    type: 'lead',
    title: '高意向买家：Dubai Hotel Group',
    summary: 'TikTok 评论区捕获，询问 MOQ 和 FOB 价格，公司规模 500+ 员工。',
    source: 'TikTok',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    urgency: 'high',
    metrics: [
      { label: '意向分', value: '92' },
      { label: '公司规模', value: '500+' },
    ],
    aiReasoning: '该买家过去 24 小时内互动 3 次，显示强烈采购意向。建议在 2 小时内回复以提高转化率。',
    suggestedAction: '发送个性化报价 + 产品目录',
    estimatedValue: '$12,000',
  },
  {
    id: '3',
    type: 'content',
    title: '审批：东南亚市场 TikTok 视频脚本',
    summary: 'AI 已生成适配东南亚市场的产品展示视频脚本，包含泰语和越南语字幕。',
    source: '内容工坊',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    urgency: 'medium',
    aiReasoning: '基于东南亚市场热门视频分析，采用快节奏剪辑和本地化音乐，预计播放量可达 10K+。',
    suggestedAction: '确认发布至 TikTok 账号',
  },
  {
    id: '4',
    type: 'optimization',
    title: '建议：更新产品定价策略',
    summary: '竞品分析显示，您的 304 不锈钢餐具定价低于市场均价 8%，存在提价空间。',
    source: '策略顾问',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    urgency: 'low',
    metrics: [
      { label: '当前价格', value: '$4.2/套' },
      { label: '建议价格', value: '$4.5/套' },
      { label: '预计增收', value: '+$3,200/月' },
    ],
    aiReasoning: '您的产品具有 SASO 认证优势，市场接受度高。建议分阶段提价，先测试中东市场反应。',
    suggestedAction: '更新报价单，提价 7%',
    estimatedValue: '$38,400/年',
  },
];

// 类型配置
const TYPE_CONFIG: Record<DecisionType, { icon: string; color: string; label: string }> = {
  opportunity: { icon: '🎯', color: C.green, label: '市场机会' },
  lead: { icon: '👤', color: C.blue, label: '询盘线索' },
  content: { icon: '🎨', color: C.PL, label: '内容审批' },
  optimization: { icon: '⚡', color: C.amber, label: '优化建议' },
  alert: { icon: '🚨', color: C.red, label: '紧急预警' },
};

// Noise 纹理
const Noise = ({ intensity = 0.022 }: { intensity?: number }) => (
  <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: intensity, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}>
    <filter id="nzdf"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#nzdf)"/>
  </svg>
);

// 粒子爆发效果
function ConfirmParticles({ color, onComplete }: { color: string; onComplete: () => void }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    distance: 80 + Math.random() * 40,
    size: 3 + Math.random() * 4,
    delay: Math.random() * 0.1,
  }));

  useEffect(() => {
    const timer = setTimeout(onComplete, 600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ 
            x: '50%', 
            y: '50%',
            scale: 1,
            opacity: 1,
          }}
          animate={{ 
            x: `calc(50% + ${Math.cos(p.angle * Math.PI / 180) * p.distance}px)`,
            y: `calc(50% + ${Math.sin(p.angle * Math.PI / 180) * p.distance}px)`,
            scale: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.5, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}

// 决策卡片组件
function DecisionCardComponent({ 
  card, 
  onConfirm, 
  onDismiss,
  isExpanded,
  onExpand,
  onCollapse,
}: { 
  card: DecisionCard; 
  onConfirm: () => void;
  onDismiss: () => void;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const config = TYPE_CONFIG[card.type];
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const rotateZ = useTransform(x, [-150, 0, 150], [-5, 0, 5]);

  const handleConfirm = useCallback(() => {
    hapticSuccess();
    setShowParticles(true);
    setIsConfirming(true);
    setTimeout(() => {
      onConfirm();
    }, 500);
  }, [onConfirm]);

  const handleDismiss = useCallback(() => {
    hapticLight();
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  }, [onDismiss]);

  const handlePanEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 100) {
      handleConfirm();
    } else if (info.offset.x < -100) {
      handleDismiss();
    }
  }, [handleConfirm, handleDismiss]);

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      hapticMedium();
      onExpand();
    }, 500);
  }, [onExpand]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // 展开状态下的渲染
  if (isExpanded) {
    return (
      <>
        {/* 模糊背景遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCollapse}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(20px)',
            zIndex: 50,
          }}
        />
        
        {/* 展开的卡片 */}
        <motion.div
          layoutId={`card-${card.id}`}
          initial={{ scale: 1 }}
          animate={{ scale: 1.02, y: -20 }}
          exit={{ scale: 1, y: 0 }}
          transition={SPRING}
          style={{
            position: 'fixed',
            top: '10%',
            left: 20,
            right: 20,
            maxHeight: '80vh',
            overflowY: 'auto',
            zIndex: 51,
            borderRadius: 24,
            background: `linear-gradient(145deg, ${config.color}15, ${config.color}05)`,
            border: `1.5px solid ${config.color}40`,
            boxShadow: `0 25px 80px rgba(0,0,0,0.7), 0 0 40px ${config.color}20, inset 0 1px 0 rgba(255,255,255,0.08)`,
            padding: 20,
          }}
        >
          <Noise intensity={0.025}/>
          
          {/* 关闭按钮 */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onCollapse}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </motion.button>

          {/* 头部 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingRight: 40 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `${config.color}20`,
              border: `1px solid ${config.color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}>
              {config.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: config.color, letterSpacing: 0.5 }}>{config.label}</span>
                {card.urgency === 'high' && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.red, padding: '2px 6px', borderRadius: 50, background: `${C.red}15`, border: `1px solid ${C.red}30` }}>紧急</span>
                )}
              </div>
              <span style={{ fontSize: 10, color: C.t3 }}>{card.source} · {Math.round((Date.now() - card.timestamp.getTime()) / 60000)} 分钟前</span>
            </div>
          </div>

          {/* 标题 */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.t1, letterSpacing: -0.5, lineHeight: 1.3, marginBottom: 12 }}>
            {card.title}
          </h2>

          {/* 摘要 */}
          <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, marginBottom: 16 }}>
            {card.summary}
          </p>

          {/* 指标 */}
          {card.metrics && card.metrics.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              {card.metrics.map((m, i) => (
                <div key={i} style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ fontSize: 10, color: C.t3, fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: m.trend === 'up' ? C.green : m.trend === 'down' ? C.red : C.t1, letterSpacing: -0.5 }}>{m.value}</span>
                    {m.trend && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={m.trend === 'up' ? C.green : C.red} strokeWidth="2.5" strokeLinecap="round">
                        <path d={m.trend === 'up' ? 'M7 17l5-5 5 5' : 'M7 7l5 5 5-5'}/>
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI 推理 */}
          {card.aiReasoning && (
            <div style={{
              padding: 14,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${C.PL}10, ${C.blue}08)`,
              border: `1px solid ${C.PL}25`,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.PL} strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.PL }}>AI 分析</span>
              </div>
              <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, margin: 0 }}>
                {card.aiReasoning}
              </p>
            </div>
          )}

          {/* 建议操作 */}
          {card.suggestedAction && (
            <div style={{
              padding: 14,
              borderRadius: 14,
              background: `${config.color}10`,
              border: `1px solid ${config.color}25`,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, color: C.t3, fontWeight: 600, marginBottom: 6 }}>建议操作</div>
              <div style={{ fontSize: 13, color: C.t1, fontWeight: 600 }}>{card.suggestedAction}</div>
              {card.estimatedValue && (
                <div style={{ fontSize: 11, color: config.color, fontWeight: 700, marginTop: 6 }}>
                  预估价值：{card.estimatedValue}
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleConfirm}
              style={{
                flex: 1,
                padding: '14px 0',
                borderRadius: 50,
                background: `linear-gradient(135deg, ${config.color}, ${config.color}CC)`,
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
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              确认执行
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleDismiss}
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
              暂不
            </motion.button>
          </div>
        </motion.div>
      </>
    );
  }

  // 收起状态
  return (
    <motion.div
      layoutId={`card-${card.id}`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ 
        opacity: isDismissing ? 0 : 1, 
        y: isDismissing ? -20 : 0, 
        scale: isConfirming ? 0.8 : 1,
        x: isDismissing ? -100 : 0,
      }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={isConfirming ? { duration: 0.4, ease: 'easeIn' } : SPRING_BOUNCY}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handlePanEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        x,
        opacity,
        rotateZ,
        position: 'relative',
        borderRadius: 22,
        background: `linear-gradient(145deg, ${config.color}12, ${config.color}05)`,
        border: `1px solid ${config.color}30`,
        boxShadow: `0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
        padding: 16,
        cursor: 'grab',
        touchAction: 'pan-y',
        overflow: 'hidden',
      }}
    >
      <Noise intensity={0.025}/>
      
      {/* 粒子效果 */}
      {showParticles && (
        <ConfirmParticles color={config.color} onComplete={() => setShowParticles(false)} />
      )}

      {/* 背景光晕 */}
      <div aria-hidden style={{
        position: 'absolute', top: -40, right: -20,
        width: 120, height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${config.color}18 0%, transparent 70%)`,
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }}/>

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: `${config.color}20`,
              border: `1px solid ${config.color}35`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}>
              {config.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: config.color, letterSpacing: 0.4 }}>{config.label}</span>
                {card.urgency === 'high' && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: C.red }}>紧急</span>
                )}
              </div>
              <span style={{ fontSize: 9, color: C.t3 }}>{card.source}</span>
            </div>
          </div>
          {card.estimatedValue && (
            <div style={{
              padding: '4px 10px',
              borderRadius: 50,
              background: `${C.green}15`,
              border: `1px solid ${C.green}30`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.green }}>{card.estimatedValue}</span>
            </div>
          )}
        </div>

        {/* 标题 */}
        <h3 style={{ fontSize: 14, fontWeight: 800, color: C.t1, letterSpacing: -0.3, lineHeight: 1.3, marginBottom: 8 }}>
          {card.title}
        </h3>

        {/* 摘要 */}
        <p style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {card.summary}
        </p>

        {/* 快速指标 */}
        {card.metrics && card.metrics.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {card.metrics.slice(0, 3).map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 50,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <span style={{ fontSize: 10, color: C.t3 }}>{m.label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: m.trend === 'up' ? C.green : m.trend === 'down' ? C.red : C.t1 }}>{m.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 50,
              background: `linear-gradient(135deg, ${config.color}30, ${config.color}18)`,
              border: `1px solid ${config.color}45`,
              fontSize: 12,
              fontWeight: 800,
              color: config.color,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            确认
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            style={{
              padding: '10px 18px',
              borderRadius: 50,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 12,
              fontWeight: 700,
              color: C.t3,
              cursor: 'pointer',
            }}
          >
            暂不
          </motion.button>
        </div>

        {/* 长按提示 */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 9, color: C.t3 }}>长按查看详情 · 左右滑动快速决策</span>
        </div>
      </div>
    </motion.div>
  );
}

// 空状态
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(96,165,250,0.1))',
          border: '1px solid rgba(124,58,237,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.PL} strokeWidth="1.5" strokeLinecap="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </motion.div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: C.t1, marginBottom: 8 }}>全部处理完毕</h3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.5 }}>
        AI 团队正在持续监控市场<br/>有新机会时会第一时间推送给您
      </p>
    </motion.div>
  );
}

// 主页面
export default function DecisionFeed() {
  const [, navigate] = useLocation();
  const [cards, setCards] = useState<DecisionCard[]>(MOCK_CARDS);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);

  const handleConfirm = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    setConfirmedCount(c => c + 1);
    setExpandedCardId(null);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    setDismissedCount(c => c + 1);
    setExpandedCardId(null);
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
        padding: '50px 20px 16px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
        position: 'relative',
        zIndex: 10,
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
            <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1, letterSpacing: -0.5, marginBottom: 2 }}>决策中心</h1>
            <span style={{ fontSize: 11, color: C.t3 }}>
              {cards.length > 0 ? `${cards.length} 条待处理` : '暂无待处理'}
            </span>
          </div>

          <div style={{ width: 36 }}/>
        </div>

        {/* 统计 */}
        {(confirmedCount > 0 || dismissedCount > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', justifyContent: 'center', gap: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{confirmedCount} 已确认</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
              <span style={{ fontSize: 11, color: C.t3, fontWeight: 600 }}>{dismissedCount} 已搁置</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* 卡片列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 20px 100px',
        position: 'relative',
      }}>
        {cards.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AnimatePresence mode="popLayout">
              {cards.map((card) => (
                <DecisionCardComponent
                  key={card.id}
                  card={card}
                  onConfirm={() => handleConfirm(card.id)}
                  onDismiss={() => handleDismiss(card.id)}
                  isExpanded={expandedCardId === card.id}
                  onExpand={() => setExpandedCardId(card.id)}
                  onCollapse={() => setExpandedCardId(null)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
