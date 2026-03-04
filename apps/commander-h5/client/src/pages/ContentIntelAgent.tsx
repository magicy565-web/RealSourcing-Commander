import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticMedium, hapticSuccess, hapticLight } from '../lib/haptics';
import { agentApi, type Agent, type AgentTask, type ContentSuggestion, type TrendVideo } from '../lib/api';

/* ─────────────────────────────────────────────────────────────────
   Agent 03 — 选题助手看板（Phase 9 真实 API 版）
   ─────────────────────────────────────────────────────────────────
   功能：基于竞品爆款分析，AI 生成高转化选题和 4 段式脚本框架
   ───────────────────────────────────────────────────────────────── */

/* ── Design System ── */
const C = {
  bg: '#000000', s1: 'rgba(255,255,255,0.04)', s2: 'rgba(255,255,255,0.07)',
  b1: 'rgba(255,255,255,0.06)', b2: 'rgba(255,255,255,0.11)',
  P: '#7C3AED', PL: '#A78BFA', bP: 'rgba(124,58,237,0.38)',
  t1: 'rgba(255,255,255,0.92)', t2: 'rgba(255,255,255,0.52)', t3: 'rgba(255,255,255,0.26)',
  amber: '#F59E0B', amberL: '#FCD34D',
  green: '#10B981', red: '#F87171', blue: '#60A5FA', indigo: '#818CF8',
  teal: '#2DD4BF', orange: '#FB923C',
};
const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 420, damping: 28 };

/* ── 格式化数字 ── */
function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ── 选题卡片组件 ── */
function SuggestionCard({ s, index, onUpdateStatus }: {
  s: ContentSuggestion;
  index: number;
  onUpdateStatus: (id: string, status: ContentSuggestion['status']) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    pending:  { label: '待审核', color: C.amber, bg: 'rgba(245,158,11,0.15)' },
    approved: { label: '已采纳', color: C.green, bg: 'rgba(16,185,129,0.15)' },
    rejected: { label: '已拒绝', color: C.red,   bg: 'rgba(248,113,113,0.1)' },
    used:     { label: '已使用', color: C.teal,  bg: 'rgba(45,212,191,0.15)' },
  };
  const sc = statusConfig[s.status] ?? statusConfig.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_SNAPPY, delay: index * 0.07 }}
      style={{
        background: C.s1,
        border: `1px solid ${s.status === 'approved' ? 'rgba(16,185,129,0.3)' : C.b1}`,
        borderRadius: 16, padding: '16px', marginBottom: 12,
      }}
    >
      {/* 头部：排名 + 标题 + 状态 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: index === 0 ? `linear-gradient(135deg, ${C.amber}, #D97706)` :
                      index === 1 ? `linear-gradient(135deg, ${C.P}, #5B21B6)` :
                      C.s2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800,
          color: index < 2 ? '#fff' : C.t3,
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.t1, fontSize: 13, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>
            {s.title}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              background: sc.bg, color: sc.color,
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            }}>
              {sc.label}
            </span>
            {s.estimated_views > 0 && (
              <span style={{
                background: 'rgba(99,102,241,0.15)', color: C.indigo,
                fontSize: 10, padding: '2px 8px', borderRadius: 20,
              }}>
                📈 预估 {fmtNum(s.estimated_views)} 播放
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4 段式脚本摘要 */}
      {(s.hook || s.value_prop) && (
        <div style={{ marginBottom: 12 }}>
          {[
            { label: '🎣 Hook', content: s.hook },
            { label: '💎 Value', content: s.value_prop },
            { label: '✅ Proof', content: s.proof },
            { label: '📣 CTA', content: s.cta },
          ].filter(item => item.content).map(item => (
            <div key={item.label} style={{
              display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start',
            }}>
              <span style={{ color: C.PL, fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                {item.label}
              </span>
              <span style={{ color: C.t2, fontSize: 11, lineHeight: 1.5 }}>
                {item.content}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 完整脚本（可展开） */}
      {s.full_script && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => { setExpanded(!expanded); hapticLight(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              color: C.PL, fontSize: 11, padding: 0,
            }}
          >
            <span>📝 查看完整脚本</span>
            <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▾</span>
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}
              >
                <div style={{
                  background: `${C.P}10`, border: `1px solid ${C.P}25`,
                  borderRadius: 10, padding: '12px', marginTop: 8,
                }}>
                  <pre style={{
                    color: C.t2, fontSize: 11, lineHeight: 1.7, margin: 0,
                    whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                  }}>
                    {s.full_script}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 标签 */}
      {s.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
          {s.tags.map(tag => (
            <span key={tag} style={{
              background: 'rgba(99,102,241,0.12)', color: C.indigo,
              fontSize: 10, padding: '2px 7px', borderRadius: 20,
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      {s.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { onUpdateStatus(s.id, 'approved'); hapticSuccess(); }}
            style={{
              flex: 1, background: `linear-gradient(135deg, ${C.green}, #059669)`,
              border: 'none', borderRadius: 10, padding: '9px 0',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ✓ 采纳选题
          </button>
          <button
            onClick={() => { onUpdateStatus(s.id, 'rejected'); hapticLight(); }}
            style={{
              width: 40, background: C.s2, border: `1px solid ${C.b1}`,
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      )}
      {s.status === 'approved' && (
        <button
          onClick={() => { onUpdateStatus(s.id, 'used'); hapticSuccess(); }}
          style={{
            width: '100%', background: `${C.teal}20`, border: `1px solid ${C.teal}40`,
            borderRadius: 10, padding: '9px 0',
            color: C.teal, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          🎬 标记为已拍摄
        </button>
      )}
    </motion.div>
  );
}

/* ── 竞品视频小卡片 ── */
function TrendVideoMini({ video, rank }: { video: TrendVideo; rank: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING_SNAPPY, delay: rank * 0.05 }}
      style={{
        background: C.s1, border: `1px solid ${video.is_viral ? 'rgba(245,158,11,0.3)' : C.b1}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: rank <= 3 ? `linear-gradient(135deg, ${C.amber}, #D97706)` : C.s2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: rank <= 3 ? '#000' : C.t3,
        }}>
          {rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.t1, fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 3 }}>
            {video.title}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: C.t3, fontSize: 10 }}>{video.account_handle}</span>
            <span style={{ color: video.engagement_rate >= 7 ? C.amber : C.t3, fontSize: 10, fontWeight: 600 }}>
              {video.engagement_rate}% 互动
            </span>
          </div>
        </div>
        {video.is_viral === 1 && (
          <span style={{ fontSize: 14 }}>🔥</span>
        )}
      </div>
    </motion.div>
  );
}

/* ── 主页面 ── */
export default function ContentIntelAgent() {
  const [, navigate] = useLocation();

  // Agent 状态
  const [agent, setAgent] = useState<Agent | null>(null);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [trendVideos, setTrendVideos] = useState<TrendVideo[]>([]);

  // UI 状态
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [tab, setTab] = useState<'suggest' | 'videos'>('suggest');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 加载数据 ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const agentList = await agentApi.list();
      const contentPilot = agentList.find(a => a.type === 'content_pilot');
      if (contentPilot) {
        setAgent(contentPilot);
        const tasksRes = await agentApi.tasks(contentPilot.id, { limit: 1 });
        if (tasksRes.items.length > 0) {
          setCurrentTask(tasksRes.items[0]);
          setProgress(tasksRes.items[0].progress);
        }
      }

      const [suggRes, trendRes] = await Promise.all([
        agentApi.suggestions({ limit: 20 }),
        agentApi.trends({ limit: 5, viral_only: true }),
      ]);
      setSuggestions(suggRes.items);
      setTrendVideos(trendRes.items);
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
        setProgress(task.progress);

        if (task.status === 'success' || task.status === 'failed' || task.status === 'cancelled') {
          clearInterval(pollRef.current!);
          pollRef.current = null;

          const agentList = await agentApi.list();
          const updated = agentList.find(a => a.type === 'content_pilot');
          if (updated) setAgent(updated);

          const suggRes = await agentApi.suggestions({ limit: 20 });
          setSuggestions(suggRes.items);

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
    setProgress(0);
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

  // ── 更新选题状态 ──────────────────────────────────────────────
  const handleUpdateStatus = async (id: string, status: ContentSuggestion['status']) => {
    try {
      await agentApi.updateSuggestion(id, status);
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    } catch (e: any) {
      setError(e.message ?? '更新失败');
    }
  };

  const isRunning = agent?.status === 'running' || currentTask?.status === 'running' || currentTask?.status === 'pending';
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const approvedSuggestions = suggestions.filter(s => s.status === 'approved');

  // 最后运行时间
  const lastRunTime = agent?.last_run_at
    ? new Date(agent.last_run_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '从未运行';

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
      minHeight: '100vh', background: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    }}>
      {/* 顶部导航 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.b1}`, padding: '14px 20px 12px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => { navigate('/boss-warroom'); hapticLight(); }}
          style={{
            background: C.s2, border: `1px solid ${C.b1}`, borderRadius: 10,
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16, color: C.t1,
          }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✍️</span>
            <span style={{ color: C.t1, fontSize: 16, fontWeight: 700 }}>选题助手</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <motion.div
                animate={isRunning ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: isRunning ? C.P : suggestions.length > 0 ? C.green : C.t3,
                }}
              />
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: isRunning ? C.PL : suggestions.length > 0 ? C.green : C.t3,
              }}>
                {isRunning ? '生成中' : suggestions.length > 0 ? '已完成' : '待机'}
              </span>
            </div>
          </div>
          <p style={{ color: C.t3, fontSize: 11, margin: 0, marginTop: 1 }}>
            Agent 03 · 选题助手 · 上次运行：{lastRunTime}
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

        {/* 统计卡 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 12, padding: '12px 14px', flex: 1 }}>
            <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>竞品参考</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.PL }}>{trendVideos.length}</div>
            <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>爆款视频</div>
          </div>
          <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 12, padding: '12px 14px', flex: 1 }}>
            <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>待审选题</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.amber }}>{pendingSuggestions.length}</div>
            <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>AI 生成</div>
          </div>
          <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 12, padding: '12px 14px', flex: 1 }}>
            <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>已采纳</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.green }}>{approvedSuggestions.length}</div>
            <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>选题</div>
          </div>
        </div>

        {/* 执行进度条 */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: C.amberL, fontWeight: 600 }}>
                  🤖 {currentTask?.current_step ?? 'AI 正在生成选题...'}
                </span>
                <span style={{ fontSize: 12, color: C.t2, fontWeight: 700 }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 4, background: C.s2, borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  style={{ height: '100%', background: `linear-gradient(90deg, ${C.amber}, ${C.P})`, borderRadius: 2 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 任务完成提示 */}
        <AnimatePresence>
          {currentTask?.status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 14, padding: '12px 16px', marginBottom: 16,
              }}
            >
              <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>
                ✅ {currentTask.result_data?.summary ?? '选题生成完成'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 切换 */}
        <div style={{
          display: 'flex', background: C.s1, borderRadius: 12, padding: 4, marginBottom: 16,
          border: `1px solid ${C.b1}`,
        }}>
          {(['suggest', 'videos'] as const).map(t => (
            <motion.button key={t}
              onClick={() => { setTab(t); hapticLight(); }}
              style={{
                flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === t ? `linear-gradient(135deg, ${C.P}, #5B21B6)` : 'transparent',
                color: tab === t ? '#fff' : C.t3,
              }}
            >
              {t === 'suggest' ? `⭐ AI 选题建议 (${suggestions.length})` : `📊 竞品爆款 (${trendVideos.length})`}
            </motion.button>
          ))}
        </div>

        {/* 内容区 */}
        <AnimatePresence mode="wait">
          {tab === 'suggest' ? (
            <motion.div key="suggest" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              {suggestions.length > 0 ? (
                <>
                  <div style={{ fontSize: 12, color: C.t3, marginBottom: 12 }}>
                    基于竞品爆款分析，AI 为您生成以下选题建议：
                  </div>
                  {suggestions.map((s, i) => (
                    <SuggestionCard key={s.id} s={s} index={i} onUpdateStatus={handleUpdateStatus} />
                  ))}
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 20,
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>✍️</div>
                  <p style={{ color: C.t2, fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
                    {isRunning ? 'AI 正在生成选题...' : '暂无选题建议'}
                  </p>
                  <p style={{ color: C.t3, fontSize: 12, margin: 0 }}>
                    点击下方按钮触发 AI 选题生成
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="videos" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              {trendVideos.length > 0 ? (
                <>
                  <div style={{ fontSize: 12, color: C.t3, marginBottom: 12 }}>
                    过去 30 天内，互动率最高的竞品视频：
                  </div>
                  {trendVideos.map((v, i) => (
                    <TrendVideoMini key={v.id} video={v} rank={i + 1} />
                  ))}
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 20,
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                  <p style={{ color: C.t2, fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>暂无竞品数据</p>
                  <p style={{ color: C.t3, fontSize: 12, margin: 0 }}>请先运行爆款雷达 Agent 获取竞品数据</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部触发按钮 */}
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
          {isRunning ? '⏳ 生成中...' : triggering ? '⚡ 启动中...' : '▶ 立即生成 AI 选题'}
        </button>
      </div>
    </div>
  );
}
