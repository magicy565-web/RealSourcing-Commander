/**
 * VideoFeedPlayer.tsx — TikTok 风格视频询盘信息流 V2
 *
 * 特性：
 *   ① 全屏竖向 scroll-snap 滑动（原生流畅）
 *   ② 进入视口自动播放，离开自动暂停（IntersectionObserver）
 *   ③ 点击暂停/播放，长按静音切换
 *   ④ 右侧操作栏：点赞、收藏（转询盘）、分享、静音
 *   ⑤ 底部询盘信息：买家公司、产品标签、报价按钮
 *   ⑥ 顶部导航栏：返回 + 标题
 *   ⑦ 进度条：视频播放进度实时更新
 *   ⑧ 本地视频 fallback（后端无数据时使用本地 4 个视频演示）
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';

// ─── 本地演示数据 ──────────────────────────────────────────────────────────────
const LOCAL_VIDEOS = [
  {
    id: 'v1',
    src: '/videos/video1.mp4',
    company: 'SunPower Solutions',
    country: '🇻🇳 越南',
    product: '太阳能板组件',
    tags: ['Solar Panel', 'OEM', '500W+'],
    desc: '寻求太阳能板长期供应商，月需求量 2000 片，要求 IEC 认证，FOB 报价',
    budget: '$45,000 / 月',
    likes: 128,
    comments: 34,
    bookmarks: 56,
    avatar: 'S',
    avatarColor: 'from-orange-400 to-red-500',
    urgent: true,
  },
  {
    id: 'v2',
    src: '/videos/video2.mp4',
    company: 'EcoHome Trading GmbH',
    country: '🇩🇪 德国',
    product: '储能电池系统',
    tags: ['Battery', 'ESS', 'CE认证'],
    desc: '家用储能系统采购，10kWh 规格，需要 CE/TÜV 认证，季度采购计划',
    budget: '$120,000 / 季',
    likes: 256,
    comments: 89,
    bookmarks: 143,
    avatar: 'E',
    avatarColor: 'from-blue-400 to-indigo-600',
    urgent: false,
  },
  {
    id: 'v3',
    src: '/videos/video3.mp4',
    company: 'GreenTech Australia',
    country: '🇦🇺 澳大利亚',
    product: '光伏逆变器',
    tags: ['Inverter', '5kW', 'AS4777'],
    desc: '澳洲市场光伏逆变器分销合作，需符合 AS4777 标准，年采购 500 台',
    budget: '$80,000 / 年',
    likes: 92,
    comments: 21,
    bookmarks: 38,
    avatar: 'G',
    avatarColor: 'from-green-400 to-emerald-600',
    urgent: true,
  },
  {
    id: 'v4',
    src: '/videos/video4.mp4',
    company: 'Nordic Energy AS',
    country: '🇳🇴 挪威',
    product: '充电桩设备',
    tags: ['EV Charger', 'AC/DC', 'IEC 61851'],
    desc: '电动车充电桩采购，7kW/22kW 双规格，需 IEC 61851 认证，北欧市场',
    budget: '$200,000 / 年',
    likes: 315,
    comments: 67,
    bookmarks: 201,
    avatar: 'N',
    avatarColor: 'from-cyan-400 to-blue-500',
    urgent: false,
  },
];

// ─── 单个视频卡片 ──────────────────────────────────────────────────────────────
function VideoCard({ video, index }: { video: typeof LOCAL_VIDEOS[0]; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [showQuote, setShowQuote] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const pauseIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IntersectionObserver 自动播放/暂停
  useEffect(() => {
    const v = videoRef.current;
    const card = cardRef.current;
    if (!v || !card) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
          v.currentTime = 0;
          v.play().then(() => setPlaying(true)).catch(() => {});
        } else {
          v.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.7 }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // 进度条更新
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      if (!progressRef.current || !v.duration) return;
      const pct = (v.currentTime / v.duration) * 100;
      progressRef.current.style.width = `${pct}%`;
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    return () => v.removeEventListener('timeupdate', onTimeUpdate);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
      // 显示暂停图标 1s
      setShowPauseIcon(true);
      if (pauseIconTimer.current) clearTimeout(pauseIconTimer.current);
      pauseIconTimer.current = setTimeout(() => setShowPauseIcon(false), 900);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(v => {
      setLikeCount(c => v ? c - 1 : c + 1);
      return !v;
    });
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked(v => !v);
    if (!bookmarked) setShowQuote(true);
    if (navigator.vibrate) navigator.vibrate([10, 5, 10]);
  };

  return (
    <div
      ref={cardRef}
      className="relative w-full flex-shrink-0 bg-black overflow-hidden"
      style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      onClick={togglePlay}
    >
      {/* 视频 */}
      <video
        ref={videoRef}
        src={video.src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.3) 100%)'
      }} />

      {/* 进度条 */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-20">
        <div ref={progressRef} className="h-full bg-white transition-none" style={{ width: '0%' }} />
      </div>

      {/* 暂停图标动画 */}
      <AnimatePresence>
        {showPauseIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 右侧操作栏 ── */}
      <div className="absolute right-3 z-10 flex flex-col items-center gap-5"
        style={{ bottom: '100px' }}>

        {/* 买家头像 */}
        <div className="flex flex-col items-center gap-1">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${video.avatarColor} flex items-center justify-center text-white font-bold text-lg border-2 border-white/30`}>
            {video.avatar}
          </div>
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center -mt-3 border border-black">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 5v14M5 12l7-7 7 7" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
          </div>
        </div>

        {/* 点赞 */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1" style={{ touchAction: 'none' }}>
          <motion.div
            animate={liked ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`w-11 h-11 rounded-full flex items-center justify-center ${liked ? 'bg-red-500' : 'bg-black/40'}`}
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? 'white' : 'none'} stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </motion.div>
          <span className="text-white text-xs font-semibold drop-shadow">{likeCount}</span>
        </button>

        {/* 收藏（转询盘） */}
        <button onClick={handleBookmark} className="flex flex-col items-center gap-1" style={{ touchAction: 'none' }}>
          <motion.div
            animate={bookmarked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`w-11 h-11 rounded-full flex items-center justify-center ${bookmarked ? 'bg-yellow-500' : 'bg-black/40'}`}
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={bookmarked ? 'white' : 'none'} stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </motion.div>
          <span className="text-white text-xs font-semibold drop-shadow">{video.bookmarks}</span>
        </button>

        {/* 评论 */}
        <button className="flex flex-col items-center gap-1" style={{ touchAction: 'none' }}
          onClick={e => e.stopPropagation()}>
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center"
            style={{ backdropFilter: 'blur(8px)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{video.comments}</span>
        </button>

        {/* 静音 */}
        <button onClick={toggleMute} className="flex flex-col items-center gap-1" style={{ touchAction: 'none' }}>
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center"
            style={{ backdropFilter: 'blur(8px)' }}>
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{muted ? '静音' : '有声'}</span>
        </button>
      </div>

      {/* ── 底部询盘信息 ── */}
      <div className="absolute bottom-6 left-0 z-10 px-4" style={{ right: '72px' }}>
        {/* 公司 + 国家 */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-white font-bold text-sm drop-shadow">{video.company}</span>
          <span className="text-white/70 text-xs">{video.country}</span>
          {video.urgent && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(254,44,85,0.85)', color: 'white' }}>
              紧急
            </span>
          )}
        </div>

        {/* 产品描述 */}
        <p className="text-white/90 text-sm leading-snug drop-shadow mb-2 line-clamp-2">{video.desc}</p>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {video.tags.map(tag => (
            <span key={tag} className="text-xs text-white/80 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              #{tag}
            </span>
          ))}
        </div>

        {/* 预算 + 报价按钮 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span className="text-white/60 text-xs">预算</span>
            <span className="text-white font-bold text-sm">{video.budget}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={e => { e.stopPropagation(); setShowQuote(true); if (navigator.vibrate) navigator.vibrate(20); }}
            className="px-4 py-1.5 rounded-full text-white text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(67,56,202,0.8))',
              border: '1px solid rgba(167,139,250,0.4)',
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
            }}
          >
            立即报价 →
          </motion.button>
        </div>
      </div>

      {/* ── 报价弹窗 ── */}
      <AnimatePresence>
        {showQuote && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl p-6"
            style={{ background: 'rgba(15,10,30,0.97)', backdropFilter: 'blur(40px)', border: '1px solid rgba(124,58,237,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${video.avatarColor} flex items-center justify-center text-white font-bold`}>
                {video.avatar}
              </div>
              <div>
                <div className="text-white font-bold text-sm">{video.company}</div>
                <div className="text-white/50 text-xs">{video.country} · {video.product}</div>
              </div>
              <div className="ml-auto text-white font-bold text-base">{video.budget}</div>
            </div>
            <div className="rounded-2xl p-3 mb-4" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <p className="text-white/70 text-xs leading-relaxed">{video.desc}</p>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowQuote(false)}
                className="flex-1 py-3 rounded-2xl text-white/60 text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                稍后处理
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { setBookmarked(true); setShowQuote(false); }}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(67,56,202,0.8))',
                  border: '1px solid rgba(167,139,250,0.3)',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                }}
              >
                收藏并报价 ✓
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export default function VideoFeedPlayer({ onBack }: { onBack?: () => void }) {
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else navigate('/boss-warroom');
  }, [onBack, navigate]);

  // 监听滚动更新当前 index
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / window.innerHeight);
      setCurrentIndex(idx);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" style={{ touchAction: 'pan-y' }}>

      {/* ── 顶部导航 ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-12 pb-3"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </motion.button>

        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-sm tracking-wide">信息流询盘</span>
          <span className="text-white/50 text-xs mt-0.5">火山引擎 · TikTok 商业平台</span>
        </div>

        {/* 分页指示器 */}
        <div className="flex flex-col gap-1">
          {LOCAL_VIDEOS.map((_, i) => (
            <div key={i} className="w-1 rounded-full transition-all duration-300"
              style={{
                height: i === currentIndex ? '16px' : '4px',
                background: i === currentIndex ? 'white' : 'rgba(255,255,255,0.3)',
              }} />
          ))}
        </div>
      </div>

      {/* ── 视频滚动容器 ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}
      >
        {LOCAL_VIDEOS.map((video, index) => (
          <VideoCard key={video.id} video={video} index={index} />
        ))}
      </div>
    </div>
  );
}
