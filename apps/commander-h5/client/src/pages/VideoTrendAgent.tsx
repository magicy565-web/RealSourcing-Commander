import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';
import { agentApi, type Agent, type AgentTask, type TrendVideo } from '../lib/api';
import { AgentIcon } from '../components/AgentIcons';

/* ─────────────────────────────────────────────────────────────────
   Agent 02 — 爆款雷达看板（Phase 9 真实 API 版）
   ─────────────────────────────────────────────────────────────────
   功能：深度分析竞品视频的视觉、情绪、节奏规律，拆解爆款公式
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

// ── 格式化数字 ────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ── 视频卡片组件 ──────────────────────────────────────────────────
function VideoCard({ video, rank }: { video: TrendVideo; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const isViral = video.is_viral === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: rank * 0.06 }}
      style={{
        background: C.s1,
        border: `1px solid ${isViral ? 'rgba(245,158,11,0.3)' : C.b1}`,
        borderRadius: 16, padding: '14px 16px', marginBottom: 10,
      }}
    >
      {/* 排名 + 标题 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: rank <= 3 ? `linear-gradient(135deg, ${C.amber}, #D97706)` : C.s2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: rank <= 3 ? '#000' : C.t3,
        }}>
          {rank}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.t1, fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>
            {video.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: C.t3, fontSize: 11 }}>{video.account_handle}</span>
            {isViral && (
              <span style={{
                background: 'rgba(245,158,11,0.2)', color: C.amber,
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
              }}>🔥 爆款</span>
            )}
          </div>
        </div>
      </div>

      {/* 数据指标 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
        {[
          { label: '播放', value: fmtNum(video.views), icon: '👁' },
          { label: '点赞', value: fmtNum(video.likes), icon: '❤️' },
          { label: '评论', value: fmtNum(video.comments), icon: '💬' },
          { label: '互动率', value: `${video.engagement_rate}%`, icon: '📈', highlight: video.engagement_rate >= 7 },
        ].map(m => (
          <div key={m.label} style={{
            background: C.s2, borderRadius: 10, padding: '8px 6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, marginBottom: 2 }}>{m.icon}</div>
            <div style={{
              color: (m as any).highlight ? C.amber : C.t1,
              fontSize: 13, fontWeight: 700, lineHeight: 1,
            }}>{m.value}</div>
            <div style={{ color: C.t3, fontSize: 9, marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* 开场类型 + BGM */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {video.opening_type && (
          <span style={{
            background: `${C.P}20`, color: C.PL,
            fontSize: 10, padding: '3px 8px', borderRadius: 20,
          }}>
            🎬 {video.opening_type}
          </span>
        )}
        {video.bgm && (
          <span style={{
            background: `${C.teal}20`, color: C.teal,
            fontSize: 10, padding: '3px 8px', borderRadius: 20,
          }}>
            🎵 {video.bgm}
          </span>
        )}
        {video.duration > 0 && (
          <span style={{ color: C.t3, fontSize: 10, padding: '3px 0' }}>
            ⏱ {video.duration}s
          </span>
        )}
      </div>

      {/* AI 分析（可展开） */}
      {video.ai_analysis && (
        <div>
          <button
            onClick={() => { setExpanded(!expanded); hapticLight(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              color: C.amber, fontSize: 11, padding: 0,
            }}
          >
            <span>🤖 AI 爆款分析</span>
            <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▾</span>
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}
              >
                <div style={{
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 10, padding: '10px 12px', marginTop: 8,
                }}>
                  <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                    {video.ai_analysis}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function VideoTrendAgent() {
  const [, navigate] = useLocation();

  // Agent 状态
  const [agent, setAgent] = useState<Agent | null>(null);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const [videos, setVideos] = useState<TrendVideo[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);

  // UI 状态
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [tab, setTab] = useState<'viral' | 'all'>('viral');
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 加载数据 ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const agentList = await agentApi.list();
      const trendRadar = agentList.find(a => a.type === 'trend_radar');
      if (trendRadar) {
        setAgent(trendRadar);
        const tasksRes = await agentApi.tasks(trendRadar.id, { limit: 1 });
        if (tasksRes.items.length > 0) setCurrentTask(tasksRes.items[0]);
      }

      const trendsRes = await agentApi.trends({ limit: 20 });
      setVideos(trendsRes.items);
      setTotalVideos(trendsRes.total);
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

          const agentList = await agentApi.list();
          const updated = agentList.find(a => a.type === 'trend_radar');
          if (updated) setAgent(updated);

          const trendsRes = await agentApi.trends({ limit: 20 });
          setVideos(trendsRes.items);
          setTotalVideos(trendsRes.total);

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

  const isRunning = agent?.status === 'running' || currentTask?.status === 'running' || currentTask?.status === 'pending';

  const viralVideos = videos.filter(v => v.is_viral === 1);
  const avgEngagement = videos.length > 0
    ? (videos.reduce((s, v) => s + v.engagement_rate, 0) / videos.length).toFixed(1)
    : '0';

  const displayVideos = tab === 'viral' ? viralVideos : videos;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${C.amber}`, borderTopColor: 'transparent' }} />
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
            <AgentIcon type="trend_radar" size={28} />
            <span style={{ color: C.t1, fontSize: 16, fontWeight: 700 }}>爆款雷达</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <motion.div
                animate={isRunning ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: isRunning ? C.amber : totalVideos > 0 ? C.green : C.t3,
                }}
              />
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: isRunning ? C.amber : totalVideos > 0 ? C.green : C.t3,
              }}>
                {isRunning ? '分析中' : totalVideos > 0 ? '已完成' : '待机'}
              </span>
            </div>
          </div>
          <p style={{ color: C.t3, fontSize: 11, margin: 0, marginTop: 1 }}>
            Agent 02 · 爆款雷达 · {agent?.config?.analysisDays ?? 30}天竞品分析
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: '分析视频', value: totalVideos, color: C.t1, icon: '📊' },
            { label: '爆款视频', value: viralVideos.length, color: C.amber, icon: '🔥' },
            { label: '平均互动', value: `${avgEngagement}%`, color: C.green, icon: '📈' },
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

        {/* 任务进度 */}
        <AnimatePresence>
          {isRunning && currentTask && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 14, padding: '14px 16px', marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${C.amber}`, borderTopColor: 'transparent' }}
                  />
                  <span style={{ color: C.amber, fontSize: 13, fontWeight: 600 }}>
                    {currentTask.current_step ?? 'AI 正在分析竞品视频...'}
                  </span>
                </div>
                <span style={{ color: C.t2, fontSize: 12, fontWeight: 700 }}>{currentTask.progress}%</span>
              </div>
              <div style={{ height: 4, background: C.s2, borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${currentTask.progress}%` }}
                  style={{ height: '100%', background: `linear-gradient(90deg, ${C.amber}, ${C.P})`, borderRadius: 2 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 任务结果提示 */}
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
                ✅ {currentTask.result_data?.summary ?? '分析完成'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 切换 */}
        <div style={{
          display: 'flex', background: C.s1, borderRadius: 12, padding: 4, marginBottom: 16,
          border: `1px solid ${C.b1}`,
        }}>
          {(['viral', 'all'] as const).map(t => (
            <motion.button key={t}
              onClick={() => { setTab(t); hapticLight(); }}
              style={{
                flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === t ? `linear-gradient(135deg, ${C.amber}, #D97706)` : 'transparent',
                color: tab === t ? '#000' : C.t3,
              }}
            >
              {t === 'viral' ? `🔥 爆款视频 (${viralVideos.length})` : `📊 全部视频 (${totalVideos})`}
            </motion.button>
          ))}
        </div>

        {/* 视频列表 */}
        {displayVideos.length > 0 ? (
          <div>
            {displayVideos.map((video, i) => (
              <VideoCard key={video.id} video={video} rank={i + 1} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '60px 20px',
              background: C.s1, border: `1px solid ${C.b1}`,
              borderRadius: 20,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <p style={{ color: C.t2, fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
              {isRunning ? 'AI 正在分析竞品视频...' : '暂无分析数据'}
            </p>
            <p style={{ color: C.t3, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              {isRunning ? '请稍候，正在计算互动率和爆款特征' : '点击下方按钮触发爆款分析'}
            </p>
          </motion.div>
        )}
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
            background: isRunning || triggering ? C.b1 : `linear-gradient(135deg, ${C.amber}, #D97706)`,
            border: 'none', borderRadius: 16, padding: '15px 0',
            color: isRunning || triggering ? C.t3 : '#000',
            fontSize: 15, fontWeight: 700, cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning ? '⏳ 分析中...' : triggering ? '⚡ 启动中...' : '▶ 立即分析竞品爆款'}
        </button>
      </div>
    </div>
  );
}
