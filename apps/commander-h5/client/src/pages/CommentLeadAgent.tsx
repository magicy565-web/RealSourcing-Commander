import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';
import { agentApi, type Agent, type AgentTask, type Lead } from '../lib/api';
import { AgentIcon } from '../components/AgentIcons';

/* ─────────────────────────────────────────────────────────────────
   Agent 01 — 评论区买家线索挖掘看板（Phase 9 真实 API 版）
   ─────────────────────────────────────────────────────────────────
   功能：通过 AI 扫描竞品评论区，识别商业意图，输出结构化买家线索
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
  inquiry: { label: '高意向', color: C.green,  bg: 'rgba(16,185,129,0.15)' },
  interest:{ label: '中意向', color: C.amber,  bg: 'rgba(245,158,11,0.15)' },
  general: { label: '低意向', color: C.t3,     bg: 'rgba(255,255,255,0.06)' },
  spam:    { label: '垃圾',   color: C.red,    bg: 'rgba(248,113,113,0.1)' },
};

// ── 线索卡片组件 ──────────────────────────────────────────────────
function LeadCard({ lead, onUpdateStatus, index }: {
  lead: Lead;
  onUpdateStatus: (id: string, status: Lead['status']) => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = INTENT_CONFIG[lead.intent_label] ?? INTENT_CONFIG.general;
  const isHighIntent = lead.intent_label === 'inquiry';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: index * 0.06 }}
      style={{
        background: C.s1,
        border: `1px solid ${isHighIntent ? 'rgba(16,185,129,0.25)' : C.b1}`,
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 10,
        opacity: lead.status === 'ignored' ? 0.5 : 1,
      }}
    >
      {/* 头部：用户 + 意向 + 评分 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.P}, ${C.blue})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {(lead.user_handle?.[1] ?? lead.user_name?.[0] ?? '?').toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ color: C.t1, fontSize: 13, fontWeight: 600 }}>{lead.user_handle}</span>
            <span style={{ color: C.t3, fontSize: 11 }}>{lead.user_name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              background: cfg.bg, color: cfg.color,
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              border: `1px solid ${cfg.color}40`,
            }}>
              {cfg.label}
            </span>
            <span style={{ color: C.t3, fontSize: 10 }}>AI评分 {lead.intent_score}</span>
            <span style={{ color: C.t3, fontSize: 10 }}>· {lead.source_platform}</span>
          </div>
        </div>

        <span style={{ color: C.t3, fontSize: 10, flexShrink: 0 }}>
          {new Date(lead.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* 评论内容 */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 10, padding: '10px 12px',
        marginBottom: 10,
        borderLeft: `3px solid ${cfg.color}60`,
      }}>
        <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          "{lead.content}"
        </p>
      </div>

      {/* AI 摘要 */}
      {lead.ai_summary && (
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={() => { setExpanded(!expanded); hapticLight(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              color: C.PL, fontSize: 11, padding: 0, marginBottom: expanded ? 8 : 0,
            }}
          >
            <span>💡 AI 摘要</span>
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
                    {lead.ai_summary}
                  </p>
                  {/* 联系方式 */}
                  {(lead.contact_info?.email || lead.contact_info?.whatsapp) && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {lead.contact_info.email && (
                        <span style={{ color: C.blue, fontSize: 11 }}>📧 {lead.contact_info.email}</span>
                      )}
                      {lead.contact_info.whatsapp && (
                        <span style={{ color: C.green, fontSize: 11 }}>💬 {lead.contact_info.whatsapp}</span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 操作按钮 */}
      {lead.intent_label !== 'spam' && lead.status !== 'ignored' && (
        <div style={{ display: 'flex', gap: 8 }}>
          {lead.status === 'new' && (
            <button
              onClick={() => { onUpdateStatus(lead.id, 'contacted'); hapticSuccess(); }}
              style={{
                flex: 1,
                background: `linear-gradient(135deg, ${C.P}, #6D28D9)`,
                border: 'none', borderRadius: 10, padding: '9px 0',
                color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ✓ 标记已联系
            </button>
          )}
          {lead.status === 'contacted' && (
            <button
              onClick={() => { onUpdateStatus(lead.id, 'converted'); hapticSuccess(); }}
              style={{
                flex: 1,
                background: `linear-gradient(135deg, ${C.green}, #059669)`,
                border: 'none', borderRadius: 10, padding: '9px 0',
                color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              🎉 标记已转化
            </button>
          )}
          {lead.status === 'converted' && (
            <div style={{ flex: 1, textAlign: 'center', color: C.green, fontSize: 12, fontWeight: 600, padding: '9px 0' }}>
              ✅ 已转化
            </div>
          )}
          <button
            onClick={() => { onUpdateStatus(lead.id, 'ignored'); hapticLight(); }}
            style={{
              width: 40,
              background: C.s2, border: `1px solid ${C.b1}`,
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}
          >
            🗑
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function CommentLeadAgent() {
  const [, navigate] = useLocation();

  // Agent 状态
  const [agent, setAgent] = useState<Agent | null>(null);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);

  // UI 状态
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'inquiry' | 'interest' | 'general'>('all');
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 加载 Agent 和线索数据 ──────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const agentList = await agentApi.list();
      const leadsHunter = agentList.find(a => a.type === 'leads_hunter');
      if (leadsHunter) {
        setAgent(leadsHunter);

        // 加载最近任务
        const tasksRes = await agentApi.tasks(leadsHunter.id, { limit: 1 });
        if (tasksRes.items.length > 0) {
          setCurrentTask(tasksRes.items[0]);
        }
      }

      // 加载线索
      const leadsRes = await agentApi.leads({ limit: 50 });
      setLeads(leadsRes.items);
      setTotalLeads(leadsRes.total);
    } catch (e: any) {
      setError(e.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadData]);

  // ── 轮询任务状态 ──────────────────────────────────────────────
  const startPolling = useCallback((taskId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const task = await agentApi.getTask(taskId);
        setCurrentTask(task);

        if (task.status === 'success' || task.status === 'failed' || task.status === 'cancelled') {
          clearInterval(pollRef.current!);
          pollRef.current = null;

          // 刷新 Agent 状态和线索
          const agentList = await agentApi.list();
          const updated = agentList.find(a => a.type === 'leads_hunter');
          if (updated) setAgent(updated);

          const leadsRes = await agentApi.leads({ limit: 50 });
          setLeads(leadsRes.items);
          setTotalLeads(leadsRes.total);

          if (task.status === 'success') hapticSuccess();
        }
      } catch { /* 忽略轮询错误 */ }
    }, 2000);
  }, []);

  // ── 触发 Agent ────────────────────────────────────────────────
  const handleTrigger = async () => {
    if (!agent || triggering) return;
    setTriggering(true);
    setError(null);
    try {
      const res = await agentApi.trigger(agent.id);
      const task = await agentApi.getTask(res.taskId);
      setCurrentTask(task);
      startPolling(res.taskId);
      hapticMedium();
    } catch (e: any) {
      setError(e.message ?? '触发失败');
    } finally {
      setTriggering(false);
    }
  };

  // ── 更新线索状态 ──────────────────────────────────────────────
  const handleUpdateStatus = async (id: string, status: Lead['status']) => {
    try {
      await agentApi.updateLead(id, status);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    } catch (e: any) {
      setError(e.message ?? '更新失败');
    }
  };

  // ── 过滤线索 ──────────────────────────────────────────────────
  const filteredLeads = leads.filter(l => {
    if (activeFilter === 'all') return l.status !== 'ignored';
    return l.intent_label === activeFilter && l.status !== 'ignored';
  });

  const highCount = leads.filter(l => l.intent_label === 'inquiry').length;
  const midCount  = leads.filter(l => l.intent_label === 'interest').length;

  const isRunning = agent?.status === 'running' || currentTask?.status === 'running' || currentTask?.status === 'pending';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${C.P}`, borderTopColor: 'transparent' }} />
      </div>
    );
  }

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
            <AgentIcon type="leads_hunter" size={28} />
            <span style={{ color: C.t1, fontSize: 16, fontWeight: 700 }}>线索猎手</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <motion.div
                animate={isRunning ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: isRunning ? C.P :
                               agent?.status === 'error' ? C.red :
                               totalLeads > 0 ? C.green : C.t3,
                }}
              />
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: isRunning ? C.PL :
                       agent?.status === 'error' ? C.red :
                       totalLeads > 0 ? C.green : C.t3,
              }}>
                {isRunning ? '扫描中' :
                 agent?.status === 'error' ? '异常' :
                 totalLeads > 0 ? '已完成' : '待机'}
              </span>
            </div>
          </div>
          <p style={{ color: C.t3, fontSize: 11, margin: 0, marginTop: 1 }}>
            Agent 01 · 线索猎手 · {agent?.config?.platforms?.join('/') ?? 'TikTok/Instagram'}
          </p>
        </div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 12, padding: '10px 14px', marginBottom: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span style={{ color: C.red, fontSize: 12 }}>{error}</span>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 今日战报数据卡 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: '总线索', value: totalLeads, color: C.t1, icon: '📊' },
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

        {/* 任务进度 */}
        <AnimatePresence>
          {isRunning && currentTask && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 14, padding: '14px 16px', marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${C.P}`, borderTopColor: 'transparent' }}
                  />
                  <span style={{ color: C.PL, fontSize: 13, fontWeight: 600 }}>
                    {currentTask.current_step ?? 'AI 正在扫描评论区...'}
                  </span>
                </div>
                <span style={{ color: C.t2, fontSize: 12, fontWeight: 700 }}>{currentTask.progress}%</span>
              </div>
              <div style={{ height: 4, background: C.s2, borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${currentTask.progress}%` }}
                  style={{ height: '100%', background: `linear-gradient(90deg, ${C.P}, #6D28D9)`, borderRadius: 2 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 最近任务结果 */}
        <AnimatePresence>
          {currentTask?.status === 'success' && currentTask.result_data?.leadsFound !== undefined && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 14, padding: '12px 16px', marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✅</span>
                <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>
                  {currentTask.result_data.summary ?? `扫描完成，发现 ${currentTask.result_data.leadsFound} 条线索`}
                </span>
              </div>
            </motion.div>
          )}
          {currentTask?.status === 'failed' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 14, padding: '12px 16px', marginBottom: 16,
              }}
            >
              <span style={{ color: C.red, fontSize: 13 }}>❌ 任务失败：{currentTask.error_msg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 意向过滤器 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['all', 'inquiry', 'interest', 'general'] as const).map(f => {
            const labels = { all: '全部', inquiry: '高意向', interest: '中意向', general: '低意向' };
            const colors = { all: C.t1, inquiry: C.green, interest: C.amber, general: C.t3 };
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
        {filteredLeads.length > 0 ? (
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
                onUpdateStatus={handleUpdateStatus}
                index={i}
              />
            ))}
          </div>
        ) : (
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
              {isRunning ? 'AI 正在扫描中...' : '暂无线索数据'}
            </p>
            <p style={{ color: C.t3, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              {isRunning ? '请稍候，AI 正在识别买家意向' : '点击下方按钮触发 AI 扫描'}
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
          onClick={handleTrigger}
          disabled={isRunning || triggering}
          style={{
            width: '100%',
            background: isRunning || triggering ? C.b1 : `linear-gradient(135deg, ${C.P}, #6D28D9)`,
            border: 'none', borderRadius: 16, padding: '15px 0',
            color: isRunning || triggering ? C.t3 : '#fff',
            fontSize: 15, fontWeight: 700, cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning ? '⏳ 扫描中...' : triggering ? '⚡ 启动中...' : '▶ 立即扫描竞品评论区'}
        </button>
      </div>
    </div>
  );
}
