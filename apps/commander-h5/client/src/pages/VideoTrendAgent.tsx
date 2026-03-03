import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';

/* ─────────────────────────────────────────────────────────────────
   Agent B — 竞品视频爆款内容分析看板
   ─────────────────────────────────────────────────────────────────
   功能：定时抓取竞品账号近期视频，AI 分析爆款规律，
         输出选题建议报告，支持手动确认执行
   ───────────────────────────────────────────────────────────────── */

const C = {
  bg:    '#000000',
  s1:    'rgba(255,255,255,0.04)',
  s2:    'rgba(255,255,255,0.07)',
  b1:    'rgba(255,255,255,0.06)',
  b2:    'rgba(255,255,255,0.11)',
  P:     '#7C3AED',
  PL:    '#A78BFA',
  t1:    'rgba(255,255,255,0.92)',
  t2:    'rgba(255,255,255,0.52)',
  t3:    'rgba(255,255,255,0.26)',
  green: '#10B981',
  amber: '#F59E0B',
  red:   '#F87171',
  blue:  '#60A5FA',
  teal:  '#2DD4BF',
  pink:  '#F472B6',
};

const SPRING = { type: 'spring' as const, stiffness: 380, damping: 26 };

// ── Mock 竞品视频数据 ─────────────────────────────────────────────
const MOCK_VIDEOS = [
  {
    id: 'v1', accountHandle: '@guangzhou_furniture_co', accountName: '广州家具出口',
    title: 'How We Make 500 Dining Tables in 24 Hours | Factory Tour',
    views: 284000, likes: 18400, comments: 1240, shares: 3200,
    engagementRate: 8.1, duration: 32,
    openingType: '工厂参观式', bgm: 'Corporate Motivation v3',
    tags: ['#furnitureoem', '#chinafactory', '#wholesale'],
    publishedAt: '2天前', isViral: true,
    thumbnail: '🪑',
  },
  {
    id: 'v2', accountHandle: '@shenzhen_led_factory', accountName: '深圳LED工厂',
    title: 'Why Your LED Supplier Is Overcharging You (Real Cost Breakdown)',
    views: 156000, likes: 12300, comments: 890, shares: 2100,
    engagementRate: 9.8, duration: 28,
    openingType: '痛点质疑式', bgm: 'Epic Business Background',
    tags: ['#ledsupplier', '#chinamanufacturing', '#b2b'],
    publishedAt: '3天前', isViral: true,
    thumbnail: '💡',
  },
  {
    id: 'v3', accountHandle: '@yiwu_wholesale_hub', accountName: '义乌批发中心',
    title: '5 Products That Will Blow Up in 2024 Q4 | Yiwu Market Insider',
    views: 421000, likes: 31200, comments: 2100, shares: 8900,
    engagementRate: 10.1, duration: 45,
    openingType: '数字预测式', bgm: 'Trending Pop Beat 2024',
    tags: ['#yiwumarket', '#trending', '#wholesale'],
    publishedAt: '5天前', isViral: true,
    thumbnail: '📦',
  },
  {
    id: 'v4', accountHandle: '@guangzhou_furniture_co', accountName: '广州家具出口',
    title: 'Customer Review: 200 Sofas Delivered to US in 30 Days',
    views: 89000, likes: 6200, comments: 430, shares: 980,
    engagementRate: 8.6, duration: 38,
    openingType: '客户见证式', bgm: 'Warm Corporate',
    tags: ['#customerstory', '#furniture', '#export'],
    publishedAt: '6天前', isViral: false,
    thumbnail: '🛋️',
  },
  {
    id: 'v5', accountHandle: '@foshan_hardware_oem', accountName: '佛山五金OEM',
    title: 'OEM Process: From Your Design to 10,000 Units in 45 Days',
    views: 67000, likes: 4800, comments: 320, shares: 760,
    engagementRate: 8.8, duration: 41,
    openingType: '流程展示式', bgm: 'Industrial Ambient',
    tags: ['#oemmanufacturing', '#hardware', '#customproduct'],
    publishedAt: '1周前', isViral: false,
    thumbnail: '🔧',
  },
];

// ── AI 分析报告 Mock ──────────────────────────────────────────────
const MOCK_REPORT = {
  analyzedCount: 47,
  viralCount: 12,
  avgEngagement: 8.9,
  topPatterns: [
    {
      id: 'p1', rank: 1, icon: '🏭',
      pattern: '工厂实拍 + 数量震撼',
      description: '展示大规模生产过程，强调"X件/24小时"等数字',
      avgEngagement: 10.3, videoCount: 8,
      example: 'How We Make 500 Tables in 24 Hours',
      color: C.green,
    },
    {
      id: 'p2', rank: 2, icon: '❓',
      pattern: '痛点质疑式开场',
      description: '以"为什么你的供应商在坑你"等质疑句开头',
      avgEngagement: 9.8, videoCount: 6,
      example: 'Why Your Supplier Is Overcharging You',
      color: C.amber,
    },
    {
      id: 'p3', rank: 3, icon: '🔢',
      pattern: '数字预测 + 趋势',
      description: '"5个2024年Q4爆款产品"等数字+时间限定标题',
      avgEngagement: 10.1, videoCount: 5,
      example: '5 Products That Will Blow Up in Q4',
      color: C.blue,
    },
    {
      id: 'p4', rank: 4, icon: '⭐',
      pattern: '客户见证 + 交付数量',
      description: '真实客户案例，强调交付规模和时效',
      avgEngagement: 8.6, videoCount: 4,
      example: '200 Sofas Delivered to US in 30 Days',
      color: C.pink,
    },
  ],
  durationInsight: { sweet: '28-35秒', reason: '完播率最高，平均高出其他时长 34%' },
  bgmInsight: { top: 'Corporate Motivation v3', usage: '被 6 个竞品账号使用，互动率 +28%' },
  bestTime: { time: '周二/周四 19:00-21:00', reason: '目标买家（欧美）工作日晚间活跃高峰' },
  suggestions: [
    {
      id: 's1', priority: 'high',
      title: '工厂规模震撼视频',
      script: '开场3秒：俯拍生产线全景 → 字幕"我们每天生产X件" → 展示质检流程 → 结尾：私信获取报价',
      estimatedViews: '15-30万',
      tags: ['#chinafactory', '#oem', '#wholesale'],
      duration: '30-32秒',
      bgm: 'Corporate Motivation v3',
    },
    {
      id: 's2', priority: 'high',
      title: '供应商成本揭秘',
      script: '开场：问句"你知道你多付了多少钱吗？" → 展示原材料成本 vs 市场价 → 我们的工厂直供价格 → CTA',
      estimatedViews: '10-20万',
      tags: ['#b2bsupplier', '#costbreakdown', '#directfactory'],
      duration: '28-35秒',
      bgm: 'Epic Business Background',
    },
    {
      id: 's3', priority: 'medium',
      title: '2024年Q4爆款产品预测',
      script: '标题：5 Products That Will Dominate Q4 → 逐一展示产品 + 数据支撑 → 最后CTA：私信获取批发价',
      estimatedViews: '8-15万',
      tags: ['#trending2024', '#wholesale', '#productprediction'],
      duration: '40-50秒',
      bgm: 'Trending Pop Beat 2024',
    },
  ],
};

type AgentStatus = 'idle' | 'pending_confirm' | 'running' | 'done';

// ── 视频卡片 ──────────────────────────────────────────────────────
function VideoCard({ video, index }: { video: typeof MOCK_VIDEOS[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING, delay: index * 0.07 }}
      style={{
        background: C.s1,
        border: `1px solid ${video.isViral ? 'rgba(16,185,129,0.25)' : C.b1}`,
        borderRadius: 14, padding: '12px 14px',
        marginBottom: 8, display: 'flex', gap: 12,
      }}
    >
      {/* 缩略图 */}
      <div style={{
        width: 52, height: 52, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg, ${C.P}40, ${C.blue}40)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, position: 'relative',
      }}>
        {video.thumbnail}
        {video.isViral && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            background: C.green, borderRadius: 10, fontSize: 8,
            fontWeight: 700, color: '#fff', padding: '2px 5px',
          }}>
            爆款
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 标题 */}
        <p style={{
          color: C.t1, fontSize: 12, fontWeight: 600, margin: '0 0 6px',
          lineHeight: 1.4, display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {video.title}
        </p>

        {/* 账号 + 时间 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ color: C.t3, fontSize: 10 }}>{video.accountName}</span>
          <span style={{ color: C.t3, fontSize: 10 }}>· {video.publishedAt}</span>
          <span style={{ color: C.t3, fontSize: 10 }}>· {video.duration}s</span>
        </div>

        {/* 数据指标 */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { icon: '👁', val: video.views >= 10000 ? `${(video.views / 10000).toFixed(1)}w` : video.views, color: C.t2 },
            { icon: '❤️', val: `${(video.likes / 1000).toFixed(1)}k`, color: C.red },
            { icon: '💬', val: video.comments, color: C.blue },
            { icon: '📈', val: `${video.engagementRate}%`, color: C.green },
          ].map(m => (
            <div key={m.icon} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 10 }}>{m.icon}</span>
              <span style={{ color: m.color, fontSize: 11, fontWeight: 600 }}>{m.val}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── 选题建议卡片 ──────────────────────────────────────────────────
function SuggestionCard({ s, index }: { s: typeof MOCK_REPORT.suggestions[0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isHigh = s.priority === 'high';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: index * 0.1 }}
      style={{
        background: isHigh ? 'rgba(124,58,237,0.08)' : C.s1,
        border: `1px solid ${isHigh ? `${C.P}40` : C.b1}`,
        borderRadius: 16, padding: '14px 16px', marginBottom: 10,
      }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: isHigh ? `${C.P}30` : C.s2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ color: C.t1, fontSize: 13, fontWeight: 700 }}>{s.title}</span>
            {isHigh && (
              <span style={{
                background: `${C.green}20`, color: C.green,
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
                border: `1px solid ${C.green}40`,
              }}>
                强烈推荐
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: C.t3, fontSize: 10 }}>⏱ {s.duration}</span>
            <span style={{ color: C.green, fontSize: 10 }}>👁 预估 {s.estimatedViews}</span>
          </div>
        </div>
      </div>

      {/* 话题标签 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {s.tags.map(tag => (
          <span key={tag} style={{
            background: `${C.blue}15`, color: C.blue,
            fontSize: 10, padding: '2px 7px', borderRadius: 20,
          }}>
            {tag}
          </span>
        ))}
        <span style={{
          background: `${C.amber}15`, color: C.amber,
          fontSize: 10, padding: '2px 7px', borderRadius: 20,
        }}>
          🎵 {s.bgm}
        </span>
      </div>

      {/* 脚本展开 */}
      <button
        onClick={() => { setExpanded(!expanded); hapticLight(); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          color: C.PL, fontSize: 11, padding: 0, marginBottom: expanded ? 8 : 0,
        }}
      >
        <span>📝 查看脚本框架</span>
        <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▾</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: `${C.P}10`, border: `1px solid ${C.P}25`,
              borderRadius: 10, padding: '10px 12px',
            }}>
              <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.7, margin: 0 }}>
                {s.script}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function VideoTrendAgent() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<AgentStatus>('pending_confirm');
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleHour, setScheduleHour] = useState(7);
  const [scheduleMinute, setScheduleMinute] = useState(0);
  const [activeTab, setActiveTab] = useState<'videos' | 'patterns' | 'suggestions'>('patterns');
  const [runProgress, setRunProgress] = useState(0);
  const runTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleConfirm = () => {
    setStatus('running');
    setRunProgress(0);
    hapticMedium();
    let p = 0;
    runTimerRef.current = setInterval(() => {
      p += Math.random() * 18 + 8;
      if (p >= 100) {
        p = 100;
        clearInterval(runTimerRef.current!);
        setTimeout(() => { setStatus('done'); hapticSuccess(); }, 400);
      }
      setRunProgress(Math.min(p, 100));
    }, 400);
  };

  useEffect(() => {
    return () => { if (runTimerRef.current) clearInterval(runTimerRef.current); };
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    }}>
      {/* 顶部导航 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.b1}`,
        padding: '14px 20px 12px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => { navigate('/boss-warroom'); hapticLight(); }}
          style={{
            background: C.s2, border: `1px solid ${C.b1}`,
            borderRadius: 10, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16, color: C.t1,
          }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🎬</span>
            <span style={{ color: C.t1, fontSize: 16, fontWeight: 700 }}>爆款视频分析</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <motion.div
                animate={status === 'running' ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: status === 'running' ? C.P :
                               status === 'done' ? C.green :
                               status === 'pending_confirm' ? C.amber : C.t3,
                }}
              />
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: status === 'running' ? C.PL :
                       status === 'done' ? C.green :
                       status === 'pending_confirm' ? C.amber : C.t3,
              }}>
                {status === 'running' ? '分析中' :
                 status === 'done' ? '报告就绪' :
                 status === 'pending_confirm' ? '待确认' : '待机'}
              </span>
            </div>
          </div>
          <p style={{ color: C.t3, fontSize: 11, margin: 0, marginTop: 1 }}>
            Agent B · 监听 4 个竞品账号 · 分析近 30 条视频
          </p>
        </div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {/* 数据概览卡 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: '分析视频', value: MOCK_REPORT.analyzedCount, color: C.t1, icon: '🎬' },
            { label: '爆款视频', value: MOCK_REPORT.viralCount, color: C.green, icon: '🔥' },
            { label: '平均互动率', value: `${MOCK_REPORT.avgEngagement}%`, color: C.amber, icon: '📈' },
          ].map(item => (
            <div key={item.label} style={{
              background: C.s1, border: `1px solid ${C.b1}`,
              borderRadius: 14, padding: '12px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ color: item.color, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{item.value}</div>
              <div style={{ color: C.t3, fontSize: 10, marginTop: 3 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* 定时调度面板 */}
        <div style={{
          background: C.s1, border: `1px solid ${C.b2}`,
          borderRadius: 16, padding: '16px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⏰</span>
              <span style={{ color: C.t1, fontSize: 14, fontWeight: 600 }}>定时执行计划</span>
            </div>
            <button
              onClick={() => { setScheduleEnabled(!scheduleEnabled); hapticLight(); }}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: scheduleEnabled ? C.P : C.b2, position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: scheduleEnabled ? 23 : 3, transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {scheduleEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ color: C.t2, fontSize: 13 }}>每天</span>
              <select
                value={scheduleHour}
                onChange={e => setScheduleHour(Number(e.target.value))}
                style={{
                  background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 8,
                  color: C.t1, fontSize: 14, fontWeight: 600, padding: '6px 10px', cursor: 'pointer',
                }}
              >
                {hours.map(h => (
                  <option key={h} value={h} style={{ background: '#1a1a2e' }}>
                    {String(h).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span style={{ color: C.t2, fontSize: 16, fontWeight: 700 }}>:</span>
              <select
                value={scheduleMinute}
                onChange={e => setScheduleMinute(Number(e.target.value))}
                style={{
                  background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 8,
                  color: C.t1, fontSize: 14, fontWeight: 600, padding: '6px 10px', cursor: 'pointer',
                }}
              >
                {minutes.map(m => (
                  <option key={m} value={m} style={{ background: '#1a1a2e' }}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span style={{ color: C.t2, fontSize: 13 }}>生成报告</span>
            </div>
          )}

          {/* 待确认 */}
          {status === 'pending_confirm' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: 12, padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <span style={{ color: C.amber, fontSize: 13, fontWeight: 600 }}>
                  定时任务已到，等待您确认执行
                </span>
              </div>
              <p style={{ color: C.t2, fontSize: 12, margin: '0 0 12px 0', lineHeight: 1.5 }}>
                Agent 将分析 4 个竞品账号共约 47 条视频，生成爆款规律报告和选题建议，预计耗时 5-8 分钟。
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleConfirm}
                  style={{
                    flex: 1, background: `linear-gradient(135deg, ${C.amber}, #D97706)`,
                    border: 'none', borderRadius: 10, padding: '10px 0',
                    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  ✓ 确认执行
                </button>
                <button
                  onClick={() => { setStatus('idle'); hapticLight(); }}
                  style={{
                    flex: 1, background: C.s2, border: `1px solid ${C.b2}`,
                    borderRadius: 10, padding: '10px 0',
                    color: C.t2, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  跳过本次
                </button>
              </div>
            </motion.div>
          )}

          {/* 运行中进度 */}
          {status === 'running' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 12, padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${C.P}`, borderTopColor: 'transparent' }}
                  />
                  <span style={{ color: C.PL, fontSize: 13, fontWeight: 600 }}>
                    {runProgress < 30 ? '正在抓取视频数据...' :
                     runProgress < 60 ? '正在分析互动规律...' :
                     runProgress < 85 ? '正在生成选题建议...' : '报告生成中...'}
                  </span>
                </div>
                <span style={{ color: C.PL, fontSize: 12, fontWeight: 700 }}>
                  {Math.round(runProgress)}%
                </span>
              </div>
              <div style={{ height: 4, background: C.b1, borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${runProgress}%` }}
                  transition={{ duration: 0.4 }}
                  style={{ height: '100%', background: `linear-gradient(90deg, ${C.P}, ${C.blue})`, borderRadius: 2 }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* 内容区域（仅在 done 状态显示） */}
        {(status === 'done' || status === 'running') && (
          <>
            {/* Tab 切换 */}
            <div style={{
              display: 'flex', background: C.s1,
              border: `1px solid ${C.b1}`, borderRadius: 14,
              padding: 4, marginBottom: 16, gap: 2,
            }}>
              {([
                { key: 'patterns', label: '🔥 爆款规律', },
                { key: 'suggestions', label: '💡 选题建议', },
                { key: 'videos', label: '🎬 竞品视频', },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); hapticLight(); }}
                  style={{
                    flex: 1, background: activeTab === tab.key ? C.P : 'transparent',
                    border: 'none', borderRadius: 10, padding: '8px 4px',
                    color: activeTab === tab.key ? '#fff' : C.t3,
                    fontSize: 11, fontWeight: activeTab === tab.key ? 700 : 400,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 爆款规律 Tab */}
            {activeTab === 'patterns' && (
              <div>
                {/* 关键洞察卡片 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { icon: '⏱', label: '最佳时长', value: MOCK_REPORT.durationInsight.sweet, sub: MOCK_REPORT.durationInsight.reason, color: C.teal },
                    { icon: '🎵', label: '热门BGM', value: 'Corp. Motivation', sub: MOCK_REPORT.bgmInsight.usage, color: C.pink },
                    { icon: '📅', label: '最佳发布', value: '周二/周四', sub: MOCK_REPORT.bestTime.reason, color: C.amber },
                    { icon: '🎯', label: '平均互动率', value: `${MOCK_REPORT.avgEngagement}%`, sub: '行业均值 3.2%', color: C.green },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: `${item.color}10`,
                      border: `1px solid ${item.color}30`,
                      borderRadius: 14, padding: '12px',
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                      <div style={{ color: item.color, fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{item.value}</div>
                      <div style={{ color: C.t3, fontSize: 10, marginBottom: 4 }}>{item.label}</div>
                      <div style={{ color: C.t3, fontSize: 9, lineHeight: 1.4 }}>{item.sub}</div>
                    </div>
                  ))}
                </div>

                {/* 爆款模式列表 */}
                <div style={{ color: C.t2, fontSize: 12, fontWeight: 600, marginBottom: 10, paddingLeft: 2 }}>
                  爆款内容模式排行
                </div>
                {MOCK_REPORT.topPatterns.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING, delay: i * 0.08 }}
                    style={{
                      background: C.s1, border: `1px solid ${C.b1}`,
                      borderRadius: 14, padding: '14px', marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: `${p.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20,
                      }}>
                        {p.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ color: p.color, fontSize: 11, fontWeight: 700 }}>#{p.rank}</span>
                          <span style={{ color: C.t1, fontSize: 13, fontWeight: 700 }}>{p.pattern}</span>
                        </div>
                        <p style={{ color: C.t2, fontSize: 11, margin: '0 0 8px', lineHeight: 1.5 }}>
                          {p.description}
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <span style={{ color: C.green, fontSize: 10 }}>📈 互动率 {p.avgEngagement}%</span>
                          <span style={{ color: C.t3, fontSize: 10 }}>📹 {p.videoCount} 条视频</span>
                        </div>
                        <div style={{
                          background: C.s2, borderRadius: 8, padding: '6px 10px', marginTop: 8,
                        }}>
                          <span style={{ color: C.t3, fontSize: 10 }}>例：</span>
                          <span style={{ color: C.t2, fontSize: 10, fontStyle: 'italic' }}> "{p.example}"</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 选题建议 Tab */}
            {activeTab === 'suggestions' && (
              <div>
                <div style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 12, padding: '10px 14px', marginBottom: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 14 }}>🤖</span>
                  <span style={{ color: C.green, fontSize: 12, lineHeight: 1.5 }}>
                    基于 {MOCK_REPORT.analyzedCount} 条竞品视频分析，AI 为您生成以下选题建议
                  </span>
                </div>
                {MOCK_REPORT.suggestions.map((s, i) => (
                  <SuggestionCard key={s.id} s={s} index={i} />
                ))}
              </div>
            )}

            {/* 竞品视频 Tab */}
            {activeTab === 'videos' && (
              <div>
                <div style={{ color: C.t2, fontSize: 12, fontWeight: 600, marginBottom: 10, paddingLeft: 2 }}>
                  近期高互动视频（按互动率排序）
                </div>
                {[...MOCK_VIDEOS].sort((a, b) => b.engagementRate - a.engagementRate).map((v, i) => (
                  <VideoCard key={v.id} video={v} index={i} />
                ))}
              </div>
            )}
          </>
        )}

        {/* 空状态 */}
        {status === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '60px 20px',
              background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 20,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
            <p style={{ color: C.t2, fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
              等待执行分析
            </p>
            <p style={{ color: C.t3, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              {scheduleEnabled
                ? `已设定每天 ${String(scheduleHour).padStart(2, '0')}:${String(scheduleMinute).padStart(2, '0')} 自动提醒`
                : '请开启定时计划或手动触发分析'}
            </p>
          </motion.div>
        )}
      </div>

      {/* 底部手动触发 */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 16px 28px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 60%, transparent)',
      }}>
        <button
          onClick={() => {
            if (status === 'idle' || status === 'done') {
              setStatus('pending_confirm');
              hapticMedium();
            }
          }}
          disabled={status === 'running' || status === 'pending_confirm'}
          style={{
            width: '100%',
            background: status === 'running' || status === 'pending_confirm'
              ? C.b1
              : `linear-gradient(135deg, ${C.teal}, #0D9488)`,
            border: 'none', borderRadius: 16, padding: '15px 0',
            color: status === 'running' || status === 'pending_confirm' ? C.t3 : '#fff',
            fontSize: 15, fontWeight: 700, cursor: status === 'running' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'running' ? '⏳ 分析中...' :
           status === 'pending_confirm' ? '⚡ 等待确认' :
           '▶ 立即分析竞品爆款视频'}
        </button>
      </div>
    </div>
  );
}
