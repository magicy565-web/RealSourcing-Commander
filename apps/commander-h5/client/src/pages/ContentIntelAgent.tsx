import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticMedium, hapticSuccess, hapticLight } from '../lib/haptics';

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
const SPRING_GENTLE = { type: 'spring' as const, stiffness: 260, damping: 30 };

/* ── Mock 数据 ── */
const MOCK_TOP_VIDEOS = [
  {
    id: 'v1', account: '@guangzhoufurniture', accountName: '广州家具工厂',
    title: '你知道为什么欧美买家不选你的工厂吗？3个供应链细节',
    duration: 28, playCount: 284000, likeCount: 19800, commentCount: 1240,
    interactionRate: 9.2, openingType: '问题式', tags: ['#furniture', '#factory', '#B2B'],
    bgm: 'Corporate Motivation v3', publishedAt: '3小时前',
    insight: '问题式开场 + 痛点共鸣，触发买家自我代入',
  },
  {
    id: 'v2', account: '@shenzhenelectronics', accountName: '深圳电子厂',
    title: '工厂直播：一条生产线如何日产10万件',
    duration: 45, playCount: 512000, likeCount: 31200, commentCount: 2800,
    interactionRate: 8.6, openingType: '工厂实拍', tags: ['#electronics', '#manufacturing', '#OEM'],
    bgm: 'Factory Beat 2024', publishedAt: '8小时前',
    insight: '工厂实拍建立信任感，买家最关心产能和品控',
  },
  {
    id: 'v3', account: '@yiwumarket', accountName: '义乌小商品市场',
    title: '2024最新爆款：这5类产品欧美买家抢着要',
    duration: 32, playCount: 198000, likeCount: 14600, commentCount: 980,
    interactionRate: 7.8, openingType: '数字冲击式', tags: ['#yiwu', '#wholesale', '#trending'],
    bgm: 'Upbeat Commerce', publishedAt: '14小时前',
    insight: '数字+爆款组合，激发选品焦虑，评论区大量询价',
  },
  {
    id: 'v4', account: '@foshan_ceramics', accountName: '佛山陶瓷出口',
    title: 'MOQ只要50件！这款瓷砖为什么让美国设计师疯狂',
    duration: 22, playCount: 156000, likeCount: 11200, commentCount: 1560,
    interactionRate: 8.2, openingType: 'MOQ钩子式', tags: ['#ceramics', '#tiles', '#interior'],
    bgm: 'Luxury Ambient', publishedAt: '20小时前',
    insight: '低MOQ降低决策门槛，设计师群体转发率高',
  },
  {
    id: 'v5', account: '@hangzhou_textiles', accountName: '杭州纺织出口',
    title: '客户说价格太高？教你用这3句话谈成订单',
    duration: 35, playCount: 89000, likeCount: 7800, commentCount: 2100,
    interactionRate: 11.1, openingType: '解决方案式', tags: ['#textiles', '#negotiation', '#export'],
    bgm: 'Business Talk', publishedAt: '22小时前',
    insight: '解决谈判痛点，评论区互动率最高，大量同行转发',
  },
];

const MOCK_SUGGESTIONS = [
  {
    id: 's1', priority: 1, title: '你的工厂为什么接不到欧美大单？3个供应链细节决定买家选择',
    predictedRate: '8-10%', duration: '28-32秒', openingType: '问题式开场',
    refVideo: '@guangzhoufurniture 的爆款视频',
    tags: ['#factory', '#B2B', '#supplier', '#manufacturing'],
    bgmSuggestion: 'Corporate Motivation v3（参考竞品同款BGM）',
    scriptFramework: [
      { time: '0-3s', action: '开场问题', content: '"你知道为什么你的工厂每年丢掉几十万美元的订单吗？"（直视镜头，表情严肃）' },
      { time: '3-15s', action: '痛点展开', content: '展示3个供应链细节：交货期承诺、品控报告、包装规格——这3点决定欧美买家是否信任你' },
      { time: '15-25s', action: '价值证明', content: '我们工厂是如何做到的：[展示实际操作/证书/客户反馈]' },
      { time: '25-32s', action: 'CTA', content: '"评论区留言「报价」，我发你完整的供应商资质包"' },
    ],
    reasoning: '过去24小时内，问题式开场的视频平均互动率比其他类型高35%；供应链主题在欧美买家群体中评论转化率最高（均值2.1%）',
  },
  {
    id: 's2', priority: 2, title: '工厂实拍：我们如何保证每批货的品控达到欧盟标准',
    predictedRate: '7-9%', duration: '40-50秒', openingType: '工厂实拍',
    refVideo: '@shenzhenelectronics 的工厂实拍系列',
    tags: ['#quality', '#EU', '#certification', '#factory'],
    bgmSuggestion: 'Factory Beat 2024（工业感强，适合实拍场景）',
    scriptFramework: [
      { time: '0-5s', action: '开场实拍', content: '直接进入工厂生产线画面，无需文字说明，让画面说话' },
      { time: '5-25s', action: '品控流程', content: '展示3个关键品控节点：原材料检测→生产过程抽检→出货前全检，每个节点配数据字幕' },
      { time: '25-40s', action: '证书展示', content: '快速展示CE/FDA/ISO等认证证书，配字幕"这是买家最关心的"' },
      { time: '40-50s', action: 'CTA', content: '"需要完整品控报告？私信我，24小时内发给你"' },
    ],
    reasoning: '工厂实拍类视频在B2B买家中信任度评分最高；品控主题在欧盟市场询盘转化率比均值高2.3倍',
  },
  {
    id: 's3', priority: 3, title: '2024年Q2最新爆款：这5类产品欧美采购商正在疯狂下单',
    predictedRate: '6-8%', duration: '30-38秒', openingType: '数字冲击式',
    refVideo: '@yiwumarket 的选品情报系列',
    tags: ['#trending', '#2024', '#wholesale', '#hotproducts'],
    bgmSuggestion: 'Upbeat Commerce（节奏感强，适合快切产品展示）',
    scriptFramework: [
      { time: '0-3s', action: '数字钩子', content: '"2024年Q2，这5类产品在亚马逊搜索量暴涨300%"（大字幕冲击）' },
      { time: '3-25s', action: '产品展示', content: '快切展示5类产品，每个产品配：当前市场价/MOQ/交货期，节奏要快（每个产品不超过4秒）' },
      { time: '25-38s', action: 'CTA', content: '"评论区留言「选品」，发你完整的2024爆款产品目录，含成本价"' },
    ],
    reasoning: '数字冲击式开场在前3秒留存率比平均高28%；选品焦虑是外贸买家最强烈的情绪触发点',
  },
];

/* ── 子组件 ── */
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 12, padding: '12px 14px', flex: 1 }}>
      <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function VideoCard({ video, rank }: { video: typeof MOCK_TOP_VIDEOS[0]; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const rateColor = video.interactionRate >= 9 ? C.green : video.interactionRate >= 7 ? C.amber : C.blue;

  return (
    <motion.div
      layout
      style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}
    >
      <div
        style={{ padding: '12px 14px', cursor: 'pointer' }}
        onClick={() => { setExpanded(!expanded); hapticLight(); }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* 排名 */}
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: rank <= 2 ? `linear-gradient(135deg, ${C.amber}, ${C.orange})` : C.s2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: rank <= 2 ? '#000' : C.t2,
          }}>{rank}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.PL, marginBottom: 3 }}>{video.accountName}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, lineHeight: 1.4, marginBottom: 6 }}>
              {video.title}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: `${rateColor}22`, color: rateColor, fontWeight: 700 }}>
                互动率 {video.interactionRate}%
              </span>
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: C.s2, color: C.t3 }}>
                {video.openingType}
              </span>
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: C.s2, color: C.t3 }}>
                {video.duration}s
              </span>
            </div>
          </div>

          {/* 播放量 */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>
              {video.playCount >= 1000000 ? `${(video.playCount / 1000000).toFixed(1)}M` : `${(video.playCount / 1000).toFixed(0)}K`}
            </div>
            <div style={{ fontSize: 10, color: C.t3 }}>播放</div>
          </div>
        </div>

        {/* 展开箭头 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} style={{ color: C.t3, fontSize: 12 }}>▼</motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={SPRING_GENTLE}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.b1}` }}>
              {/* AI 洞察 */}
              <div style={{ marginTop: 12, padding: '10px 12px', background: `${C.P}15`, borderRadius: 10, borderLeft: `3px solid ${C.P}` }}>
                <div style={{ fontSize: 10, color: C.PL, marginBottom: 4, fontWeight: 600 }}>🤖 AI 爆款洞察</div>
                <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{video.insight}</div>
              </div>
              {/* 数据详情 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, textAlign: 'center', background: C.s2, borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>
                    {(video.likeCount / 1000).toFixed(1)}K
                  </div>
                  <div style={{ fontSize: 10, color: C.t3 }}>点赞</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', background: C.s2, borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>
                    {(video.commentCount / 1000).toFixed(1)}K
                  </div>
                  <div style={{ fontSize: 10, color: C.t3 }}>评论</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', background: C.s2, borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.amber }}>{video.duration}s</div>
                  <div style={{ fontSize: 10, color: C.t3 }}>时长</div>
                </div>
              </div>
              {/* BGM */}
              <div style={{ marginTop: 8, fontSize: 11, color: C.t3 }}>
                🎵 BGM：<span style={{ color: C.t2 }}>{video.bgm}</span>
              </div>
              {/* 话题标签 */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {video.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: C.s2, color: C.indigo }}>{tag}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SuggestionCard({ s, index }: { s: typeof MOCK_SUGGESTIONS[0]; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const priorityColors = ['#F59E0B', '#A78BFA', '#60A5FA'];
  const priorityLabels = ['首选', '备选', '参考'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_GENTLE, delay: index * 0.1 }}
      style={{
        background: index === 0 ? `linear-gradient(135deg, rgba(124,58,237,0.12), rgba(45,212,191,0.06))` : C.s1,
        border: `1px solid ${index === 0 ? C.bP : C.b1}`,
        borderRadius: 16, overflow: 'hidden', marginBottom: 12,
      }}
    >
      {/* 优先级标签 */}
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            background: `${priorityColors[index]}22`, color: priorityColors[index],
          }}>
            {index === 0 ? '⭐ ' : ''}{priorityLabels[index]}推荐
          </span>
          <span style={{ fontSize: 10, color: C.t3 }}>预测互动率</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{s.predictedRate}</span>
        </div>

        {/* 标题 */}
        <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, lineHeight: 1.45, marginBottom: 8 }}>
          "{s.title}"
        </div>

        {/* 基础参数 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: C.s2, color: C.teal }}>
            ⏱ {s.duration}
          </span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: C.s2, color: C.amber }}>
            🎬 {s.openingType}
          </span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: C.s2, color: C.t3 }}>
            参考：{s.refVideo}
          </span>
        </div>

        {/* AI 推荐理由 */}
        <div style={{ padding: '8px 10px', background: `${C.green}12`, borderRadius: 8, marginBottom: 10, borderLeft: `2px solid ${C.green}` }}>
          <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginBottom: 3 }}>📊 AI 推荐理由</div>
          <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.6 }}>{s.reasoning}</div>
        </div>

        {/* 展开/收起脚本 */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 12 }}
          onClick={() => { setExpanded(!expanded); hapticLight(); }}
        >
          <div style={{ fontSize: 11, color: C.PL, fontWeight: 600 }}>
            {expanded ? '收起' : '查看'}脚本框架
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} style={{ color: C.PL, fontSize: 11 }}>▼</motion.div>
        </div>
      </div>

      {/* 脚本框架 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={SPRING_GENTLE}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.b1}` }}>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 12, marginBottom: 8, fontWeight: 600 }}>
                📝 脚本框架（可直接使用）
              </div>
              {s.scriptFramework.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    flexShrink: 0, width: 48, height: 20, borderRadius: 6,
                    background: C.s2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: C.t3, fontWeight: 600,
                  }}>{step.time}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: C.PL, fontWeight: 600, marginBottom: 2 }}>{step.action}</div>
                    <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.55 }}>{step.content}</div>
                  </div>
                </div>
              ))}

              {/* BGM 建议 */}
              <div style={{ marginTop: 8, padding: '8px 10px', background: C.s2, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: C.t3 }}>🎵 BGM 建议</div>
                <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>{s.bgmSuggestion}</div>
              </div>

              {/* 话题标签 */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {s.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: C.s2, color: C.indigo }}>{tag}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── 主页面 ── */
export default function ContentIntelAgent() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<'suggest' | 'videos'>('suggest');
  const [status, setStatus] = useState<'pending' | 'running' | 'done'>('pending');
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(true);
  const [lastRunTime] = useState('今日 02:14');
  const [nextRunTime] = useState('明日 02:00');
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟执行进度
  const handleConfirm = () => {
    hapticSuccess();
    setShowConfirm(false);
    setStatus('running');
    setProgress(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 100) {
        p = 100;
        clearInterval(progressRef.current!);
        setTimeout(() => setStatus('done'), 400);
      }
      setProgress(Math.min(p, 100));
    }, 300);
  };

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.t1, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* 顶部导航 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.b1}`, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => { hapticLight(); navigate('/tiktok'); }}
          style={{ background: C.s2, border: 'none', borderRadius: 8, padding: '6px 10px', color: C.t2, cursor: 'pointer', fontSize: 13 }}>
          ← 返回
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>内容情报 Agent</div>
          <div style={{ fontSize: 11, color: C.t3 }}>竞品监控 · AI 选题建议</div>
        </div>
        {/* 状态指示 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: status === 'running' ? C.amber : status === 'done' ? C.green : C.t3,
            boxShadow: status === 'running' ? `0 0 8px ${C.amber}` : status === 'done' ? `0 0 8px ${C.green}` : 'none',
          }} />
          <span style={{ fontSize: 11, color: C.t3 }}>
            {status === 'running' ? '分析中' : status === 'done' ? '已完成' : '等待确认'}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {/* 定时确认横幅 */}
        <AnimatePresence>
          {showConfirm && status === 'pending' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={SPRING_SNAPPY}
              style={{
                background: `linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,146,60,0.08))`,
                border: `1px solid ${C.amber}44`, borderRadius: 14, padding: '14px 16px', marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>⏰</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.amberL }}>定时任务已到，等待您确认</div>
                  <div style={{ fontSize: 11, color: C.t3 }}>将分析 Top 20 竞品账号过去 24 小时的视频</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  whileTap={{ scale: 0.96 }} onClick={handleConfirm}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${C.amber}, ${C.orange})`,
                    color: '#000', fontWeight: 700, fontSize: 13,
                  }}
                >确认执行</motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }} onClick={() => { hapticLight(); setShowConfirm(false); }}
                  style={{
                    padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.b2}`,
                    background: C.s1, color: C.t3, cursor: 'pointer', fontSize: 13,
                  }}
                >跳过</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 执行进度条 */}
        <AnimatePresence>
          {status === 'running' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: C.amberL, fontWeight: 600 }}>🤖 AI 正在分析竞品视频...</span>
                <span style={{ fontSize: 12, color: C.t2, fontWeight: 700 }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 4, background: C.s2, borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  style={{ height: '100%', background: `linear-gradient(90deg, ${C.amber}, ${C.P})`, borderRadius: 2 }}
                />
              </div>
              <div style={{ fontSize: 10, color: C.t3, marginTop: 6 }}>
                {progress < 30 ? '正在抓取竞品账号视频数据...' :
                  progress < 60 ? '正在计算互动率和爆款特征...' :
                    progress < 85 ? '正在调用 AI 生成选题建议...' : '正在生成脚本框架...'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 顶部统计卡 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <StatCard label="监控账号" value="20" sub="Top 竞品" color={C.PL} />
          <StatCard label="今日爆款" value="5" sub="互动率>7%" color={C.green} />
          <StatCard label="选题建议" value="3" sub="AI 生成" color={C.amber} />
        </div>

        {/* 运行时间 */}
        <div style={{
          background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 12,
          padding: '10px 14px', marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 11, color: C.t3 }}>上次运行：<span style={{ color: C.t2 }}>{lastRunTime}</span></div>
          <div style={{ width: 1, height: 14, background: C.b2 }} />
          <div style={{ fontSize: 11, color: C.t3 }}>下次运行：<span style={{ color: C.amber }}>{nextRunTime} 02:00</span></div>
        </div>

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
              {t === 'suggest' ? '⭐ AI 选题建议' : '📊 爆款视频榜'}
            </motion.button>
          ))}
        </div>

        {/* 内容区 */}
        <AnimatePresence mode="wait">
          {tab === 'suggest' ? (
            <motion.div key="suggest" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <div style={{ fontSize: 12, color: C.t3, marginBottom: 12 }}>
                基于过去 24 小时竞品爆款分析，AI 为您生成以下选题建议：
              </div>
              {MOCK_SUGGESTIONS.map((s, i) => <SuggestionCard key={s.id} s={s} index={i} />)}
            </motion.div>
          ) : (
            <motion.div key="videos" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <div style={{ fontSize: 12, color: C.t3, marginBottom: 12 }}>
                过去 24 小时内，互动率最高的竞品视频：
              </div>
              {MOCK_TOP_VIDEOS.map((v, i) => <VideoCard key={v.id} video={v} rank={i + 1} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
