import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';

/* ─────────────────────────────────────────────────────────────────
   Agent A — 竞品评论区买家线索挖掘看板
   ─────────────────────────────────────────────────────────────────
   功能：定时监听竞品 TikTok 账号评论区，AI 识别商业意图，
         输出结构化买家线索卡片，支持手动确认执行
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
};

const SPRING = { type: 'spring' as const, stiffness: 380, damping: 26 };

// ── 意向等级配置 ──────────────────────────────────────────────────
const INTENT_CONFIG = {
  high:   { label: '高意向', color: C.green,  bg: 'rgba(16,185,129,0.15)', dot: '#10B981' },
  medium: { label: '中意向', color: C.amber,  bg: 'rgba(245,158,11,0.15)', dot: '#F59E0B' },
  low:    { label: '低意向', color: C.t3,     bg: 'rgba(255,255,255,0.06)', dot: 'rgba(255,255,255,0.3)' },
};

// ── Mock 竞品账号 ─────────────────────────────────────────────────
const MOCK_ACCOUNTS = [
  { id: 'a1', handle: '@guangzhou_furniture_co', name: '广州家具出口', avatar: '🪑', followers: '12.4K', lastScan: '2小时前', newLeads: 4 },
  { id: 'a2', handle: '@shenzhen_led_factory',   name: '深圳LED工厂',  avatar: '💡', followers: '8.7K',  lastScan: '4小时前', newLeads: 7 },
  { id: 'a3', handle: '@yiwu_wholesale_hub',     name: '义乌批发中心', avatar: '📦', followers: '31.2K', lastScan: '1小时前', newLeads: 2 },
  { id: 'a4', handle: '@foshan_hardware_oem',    name: '佛山五金OEM',  avatar: '🔧', followers: '5.3K',  lastScan: '6小时前', newLeads: 0 },
];

// ── Mock 线索数据 ─────────────────────────────────────────────────
const MOCK_LEADS = [
  {
    id: 'l1', accountId: 'a1', intent: 'high' as const,
    username: '@mike_furniture_us', region: '🇺🇸 美国',
    comment: 'What\'s the MOQ for the dining set? We need 500 units for our retail chain.',
    keywords: ['MOQ', '500 units', 'retail chain'],
    videoTitle: 'New 2024 Dining Collection Showcase',
    timestamp: '14分钟前',
    suggestedReply: '感谢您的询问！500套起订，支持OEM定制。请私信我们获取完整报价单和样品信息。',
    score: 94,
  },
  {
    id: 'l2', accountId: 'a2', intent: 'high' as const,
    username: '@ahmed_trading_ae', region: '🇦🇪 迪拜',
    comment: 'Can you do OEM for our brand? We have a big project in UAE market.',
    keywords: ['OEM', 'big project', 'UAE market'],
    videoTitle: 'LED Strip Light Factory Tour',
    timestamp: '31分钟前',
    suggestedReply: '我们提供完整OEM服务，包含品牌定制和认证支持。请发私信告知项目规模，我们为您安排专属报价。',
    score: 91,
  },
  {
    id: 'l3', accountId: 'a1', intent: 'high' as const,
    username: '@carlos_import_mx', region: '🇲🇽 墨西哥',
    comment: 'Interested in wholesale price. We buy regularly for our 3 stores.',
    keywords: ['wholesale price', 'regularly', '3 stores'],
    videoTitle: 'New 2024 Dining Collection Showcase',
    timestamp: '52分钟前',
    suggestedReply: '欢迎长期合作！批发价格更优惠，3家门店的采购量可享受额外折扣。请私信我们详谈。',
    score: 88,
  },
  {
    id: 'l4', accountId: 'a3', intent: 'medium' as const,
    username: '@sarah_boutique_uk', region: '🇬🇧 英国',
    comment: 'How much does shipping cost to UK? And what\'s the lead time?',
    keywords: ['shipping cost', 'lead time', 'UK'],
    videoTitle: 'Yiwu Market New Arrivals 2024',
    timestamp: '1小时前',
    suggestedReply: '发往英国运费约$180/CBM，生产周期15-20天。私信我们获取精确报价。',
    score: 72,
  },
  {
    id: 'l5', accountId: 'a2', intent: 'medium' as const,
    username: '@john_electricals_au', region: '🇦🇺 澳大利亚',
    comment: 'Do you have CE certification? Need it for Australian market.',
    keywords: ['CE certification', 'Australian market'],
    videoTitle: 'LED Strip Light Factory Tour',
    timestamp: '1.5小时前',
    suggestedReply: '我们的产品具备CE、RoHS认证，符合澳洲市场要求。私信获取认证文件。',
    score: 68,
  },
  {
    id: 'l6', accountId: 'a1', intent: 'medium' as const,
    username: '@furniture_lover_de', region: '🇩🇪 德国',
    comment: 'Nice design! Is this available in white color? Price?',
    keywords: ['price', 'white color'],
    videoTitle: 'New 2024 Dining Collection Showcase',
    timestamp: '2小时前',
    suggestedReply: '白色款式有货，价格根据数量而定。请私信告知采购量，我们提供报价。',
    score: 61,
  },
  {
    id: 'l7', accountId: 'a4', intent: 'low' as const,
    username: '@diy_maker_ca', region: '🇨🇦 加拿大',
    comment: 'Great video! Where can I buy just 1 piece for personal use?',
    keywords: ['1 piece', 'personal use'],
    videoTitle: 'Hardware OEM Process',
    timestamp: '3小时前',
    suggestedReply: '',
    score: 28,
  },
];

// ── Agent 状态类型 ────────────────────────────────────────────────
type AgentStatus = 'idle' | 'scheduled' | 'pending_confirm' | 'running' | 'done';

interface ScheduleConfig {
  hour: number;
  minute: number;
  enabled: boolean;
}

// ── 线索卡片组件 ──────────────────────────────────────────────────
function LeadCard({ lead, onReply, index }: {
  lead: typeof MOCK_LEADS[0];
  onReply: (id: string) => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = INTENT_CONFIG[lead.intent];
  const account = MOCK_ACCOUNTS.find(a => a.id === lead.accountId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: index * 0.06 }}
      style={{
        background: C.s1,
        border: `1px solid ${lead.intent === 'high' ? 'rgba(16,185,129,0.25)' : C.b1}`,
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 10,
      }}
    >
      {/* 头部：用户 + 意向 + 评分 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        {/* 头像占位 */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.P}, ${C.blue})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {lead.username[1].toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ color: C.t1, fontSize: 13, fontWeight: 600 }}>{lead.username}</span>
            <span style={{ fontSize: 11 }}>{lead.region}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* 意向标签 */}
            <span style={{
              background: cfg.bg, color: cfg.color,
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              border: `1px solid ${cfg.color}40`,
            }}>
              {cfg.label}
            </span>
            {/* AI 评分 */}
            <span style={{ color: C.t3, fontSize: 10 }}>AI评分 {lead.score}</span>
            {/* 来源账号 */}
            <span style={{ color: C.t3, fontSize: 10 }}>· {account?.avatar} {account?.name}</span>
          </div>
        </div>

        {/* 时间 */}
        <span style={{ color: C.t3, fontSize: 10, flexShrink: 0 }}>{lead.timestamp}</span>
      </div>

      {/* 评论内容 */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 10, padding: '10px 12px',
        marginBottom: 10,
        borderLeft: `3px solid ${cfg.color}60`,
      }}>
        <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          "{lead.comment}"
        </p>
        {/* 关键词标签 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {lead.keywords.map(kw => (
            <span key={kw} style={{
              background: `${C.P}20`, color: C.PL,
              fontSize: 10, padding: '2px 7px', borderRadius: 20,
            }}>
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* 来源视频 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 10 }}>🎬</span>
        <span style={{ color: C.t3, fontSize: 10 }}>来自：{lead.videoTitle}</span>
      </div>

      {/* AI 建议回复（可展开） */}
      {lead.intent !== 'low' && (
        <div>
          <button
            onClick={() => { setExpanded(!expanded); hapticLight(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              color: C.PL, fontSize: 11, padding: 0, marginBottom: expanded ? 8 : 0,
            }}
          >
            <span>💡 AI 建议回复话术</span>
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
                  background: `${C.P}15`,
                  border: `1px solid ${C.P}30`,
                  borderRadius: 10, padding: '10px 12px',
                  marginBottom: 10,
                }}>
                  <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                    {lead.suggestedReply}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 操作按钮 */}
      {lead.intent !== 'low' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { onReply(lead.id); hapticSuccess(); }}
            style={{
              flex: 1,
              background: `linear-gradient(135deg, ${C.P}, #6D28D9)`,
              border: 'none', borderRadius: 10, padding: '9px 0',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            跳转评论区回复
          </button>
          <button
            onClick={() => hapticLight()}
            style={{
              width: 40,
              background: C.s2, border: `1px solid ${C.b1}`,
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}
          >
            📋
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── 定时调度组件 ──────────────────────────────────────────────────
function SchedulePanel({
  config, onChange, status, onConfirm, onCancel,
}: {
  config: ScheduleConfig;
  onChange: (c: ScheduleConfig) => void;
  status: AgentStatus;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <div style={{
      background: C.s1,
      border: `1px solid ${C.b2}`,
      borderRadius: 16, padding: '16px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⏰</span>
          <span style={{ color: C.t1, fontSize: 14, fontWeight: 600 }}>定时执行计划</span>
        </div>
        {/* 开关 */}
        <button
          onClick={() => { onChange({ ...config, enabled: !config.enabled }); hapticLight(); }}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: config.enabled ? C.P : C.b2,
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 3,
            left: config.enabled ? 23 : 3,
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {config.enabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ color: C.t2, fontSize: 13 }}>每天</span>
          {/* 小时选择 */}
          <select
            value={config.hour}
            onChange={e => onChange({ ...config, hour: Number(e.target.value) })}
            style={{
              background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 8,
              color: C.t1, fontSize: 14, fontWeight: 600, padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            {hours.map(h => (
              <option key={h} value={h} style={{ background: '#1a1a2e' }}>
                {String(h).padStart(2, '0')}
              </option>
            ))}
          </select>
          <span style={{ color: C.t2, fontSize: 16, fontWeight: 700 }}>:</span>
          {/* 分钟选择 */}
          <select
            value={config.minute}
            onChange={e => onChange({ ...config, minute: Number(e.target.value) })}
            style={{
              background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 8,
              color: C.t1, fontSize: 14, fontWeight: 600, padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            {minutes.map(m => (
              <option key={m} value={m} style={{ background: '#1a1a2e' }}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
          <span style={{ color: C.t2, fontSize: 13 }}>执行一次</span>
        </div>
      )}

      {/* 待确认状态 */}
      {status === 'pending_confirm' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 12, padding: '12px 14px',
            marginTop: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <span style={{ color: C.amber, fontSize: 13, fontWeight: 600 }}>
              定时任务已到，等待您确认执行
            </span>
          </div>
          <p style={{ color: C.t2, fontSize: 12, margin: '0 0 12px 0', lineHeight: 1.5 }}>
            Agent 将扫描 {MOCK_ACCOUNTS.length} 个竞品账号的最新评论，预计耗时 3-5 分钟。
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { onConfirm(); hapticSuccess(); }}
              style={{
                flex: 1, background: `linear-gradient(135deg, ${C.amber}, #D97706)`,
                border: 'none', borderRadius: 10, padding: '10px 0',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              ✓ 确认执行
            </button>
            <button
              onClick={() => { onCancel(); hapticLight(); }}
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

      {/* 运行中状态 */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${C.P}`, borderTopColor: 'transparent' }}
            />
            <span style={{ color: C.PL, fontSize: 13, fontWeight: 600 }}>Agent 正在扫描评论区...</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 3, background: C.b1, borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ height: '100%', width: '40%', background: `linear-gradient(90deg, transparent, ${C.P}, transparent)`, borderRadius: 2 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function CommentLeadAgent() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<AgentStatus>('pending_confirm');
  const [schedule, setSchedule] = useState<ScheduleConfig>({ hour: 8, minute: 0, enabled: true });
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [activeAccount, setActiveAccount] = useState<string>('all');
  const [repliedIds, setRepliedIds] = useState<Set<string>>(new Set());
  const runTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 模拟运行完成
  const handleConfirm = () => {
    setStatus('running');
    runTimerRef.current = setTimeout(() => {
      setStatus('done');
      hapticSuccess();
    }, 3500);
  };

  useEffect(() => {
    return () => { if (runTimerRef.current) clearTimeout(runTimerRef.current); };
  }, []);

  const handleReply = (id: string) => {
    setRepliedIds(prev => new Set([...prev, id]));
  };

  // 过滤线索
  const filteredLeads = MOCK_LEADS.filter(l => {
    const intentMatch = activeFilter === 'all' || l.intent === activeFilter;
    const accountMatch = activeAccount === 'all' || l.accountId === activeAccount;
    return intentMatch && accountMatch;
  });

  const highCount  = MOCK_LEADS.filter(l => l.intent === 'high').length;
  const midCount   = MOCK_LEADS.filter(l => l.intent === 'medium').length;
  const totalToday = MOCK_LEADS.length;

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    }}>
      {/* 顶部导航 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
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
            <span style={{ fontSize: 16 }}>🔍</span>
            <span style={{ color: C.t1, fontSize: 16, fontWeight: 700 }}>评论区买家线索</span>
            {/* 状态指示 */}
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
                {status === 'running' ? '扫描中' :
                 status === 'done' ? '已完成' :
                 status === 'pending_confirm' ? '待确认' : '待机'}
              </span>
            </div>
          </div>
          <p style={{ color: C.t3, fontSize: 11, margin: 0, marginTop: 1 }}>
            Agent A · 监听 {MOCK_ACCOUNTS.length} 个竞品账号
          </p>
        </div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {/* 今日战报数据卡 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: '今日线索', value: totalToday, color: C.t1, icon: '📊' },
            { label: '高意向', value: highCount, color: C.green, icon: '🔥' },
            { label: '中意向', value: midCount, color: C.amber, icon: '⚡' },
          ].map(item => (
            <div key={item.label} style={{
              background: C.s1, border: `1px solid ${C.b1}`,
              borderRadius: 14, padding: '12px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ color: item.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{item.value}</div>
              <div style={{ color: C.t3, fontSize: 10, marginTop: 3 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* 定时调度面板 */}
        <SchedulePanel
          config={schedule}
          onChange={setSchedule}
          status={status}
          onConfirm={handleConfirm}
          onCancel={() => setStatus('idle')}
        />

        {/* 监听账号列表 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.t2, fontSize: 12, fontWeight: 600, marginBottom: 10, paddingLeft: 2 }}>
            监听账号
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            <button
              onClick={() => { setActiveAccount('all'); hapticLight(); }}
              style={{
                flexShrink: 0,
                background: activeAccount === 'all' ? C.P : C.s2,
                border: `1px solid ${activeAccount === 'all' ? C.P : C.b1}`,
                borderRadius: 20, padding: '6px 14px',
                color: activeAccount === 'all' ? '#fff' : C.t2,
                fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              全部
            </button>
            {MOCK_ACCOUNTS.map(acc => (
              <button
                key={acc.id}
                onClick={() => { setActiveAccount(acc.id); hapticLight(); }}
                style={{
                  flexShrink: 0,
                  background: activeAccount === acc.id ? `${C.P}25` : C.s2,
                  border: `1px solid ${activeAccount === acc.id ? C.P : C.b1}`,
                  borderRadius: 20, padding: '6px 12px',
                  color: activeAccount === acc.id ? C.PL : C.t2,
                  fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <span>{acc.avatar}</span>
                <span>{acc.name}</span>
                {acc.newLeads > 0 && (
                  <span style={{
                    background: C.red, color: '#fff',
                    borderRadius: 10, fontSize: 9, fontWeight: 700,
                    padding: '1px 5px', minWidth: 16, textAlign: 'center',
                  }}>
                    {acc.newLeads}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 意向过滤器 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['all', 'high', 'medium', 'low'] as const).map(f => {
            const labels = { all: '全部', high: '高意向', medium: '中意向', low: '低意向' };
            const colors = { all: C.t1, high: C.green, medium: C.amber, low: C.t3 };
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => { setActiveFilter(f); hapticLight(); }}
                style={{
                  background: isActive ? `${colors[f]}20` : C.s1,
                  border: `1px solid ${isActive ? colors[f] : C.b1}`,
                  borderRadius: 20, padding: '6px 14px',
                  color: isActive ? colors[f] : C.t3,
                  fontSize: 12, fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* 线索列表 */}
        {(status === 'done' || status === 'running') ? (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <span style={{ color: C.t2, fontSize: 12, fontWeight: 600 }}>
                找到 {filteredLeads.length} 条线索
              </span>
              <span style={{ color: C.t3, fontSize: 11 }}>按意向排序</span>
            </div>
            {filteredLeads.map((lead, i) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onReply={handleReply}
                index={i}
              />
            ))}
          </div>
        ) : (
          /* 空状态 */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '60px 20px',
              background: C.s1, border: `1px solid ${C.b1}`,
              borderRadius: 20,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ color: C.t2, fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
              等待执行扫描
            </p>
            <p style={{ color: C.t3, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              {schedule.enabled
                ? `已设定每天 ${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')} 自动提醒\n确认后开始扫描竞品评论区`
                : '请开启定时计划或手动触发扫描'}
            </p>
          </motion.div>
        )}
      </div>

      {/* 底部手动触发按钮 */}
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
              : `linear-gradient(135deg, ${C.P}, #6D28D9)`,
            border: 'none', borderRadius: 16, padding: '15px 0',
            color: status === 'running' || status === 'pending_confirm' ? C.t3 : '#fff',
            fontSize: 15, fontWeight: 700, cursor: status === 'running' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'running' ? '⏳ 扫描中...' :
           status === 'pending_confirm' ? '⚡ 等待确认' :
           '▶ 立即扫描竞品评论区'}
        </button>
      </div>
    </div>
  );
}
