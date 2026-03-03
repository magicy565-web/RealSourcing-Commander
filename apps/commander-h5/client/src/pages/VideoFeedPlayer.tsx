/**
 * VideoFeedPlayer.tsx — TikTok 风格视频询盘信息流 V3
 *
 * 特性：
 *   ① 全屏竖向 scroll-snap 滑动（原生流畅）
 *   ② 通过后端 API + 火山引擎 VOD GetPlayInfo 动态获取播放地址（auth_key 实时刷新）
 *   ③ IntersectionObserver 自动播放/暂停（进入视口 70% 触发）
 *   ④ 实时进度条（底部 2px 白色进度条）
 *   ⑤ 右侧操作栏：买家头像、点赞、收藏（转询盘）、评论、静音
 *   ⑥ 底部询盘信息：公司名+国旗+紧急标签+产品描述+标签+预算
 *   ⑦ 「立即报价」弹出底部 Sheet（spring 动画）
 *   ⑧ 顶部导航：返回按钮 + 标题 + 竖向分页指示器
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { videoFeedApi, VideoFeedItem } from '../lib/api';

// ─── 静态询盘元数据（与数据库 feed_items 对应）──────────────────────────────────
const INQUIRY_META: Record<string, {
  country: string;
  budget: string;
  urgent: boolean;
  avatarColor: string;
  comments: number;
}> = {
  'feed-v1': { country: '🇻🇳 越南', budget: '$45,000 / 月', urgent: true,  avatarColor: 'from-orange-400 to-red-500',    comments: 34  },
  'feed-v2': { country: '🇩🇪 德国', budget: '$120,000 / 季', urgent: false, avatarColor: 'from-blue-400 to-indigo-600',   comments: 89  },
  'feed-v3': { country: '🇦🇺 澳大利亚', budget: '$80,000 / 年', urgent: true, avatarColor: 'from-green-400 to-emerald-600', comments: 21  },
  'feed-v4': { country: '🇳🇴 挪威', budget: '$200,000 / 年', urgent: false, avatarColor: 'from-cyan-400 to-blue-500',     comments: 67  },
};

// ─── 单个视频卡片 ──────────────────────────────────────────────────────────────
function VideoCard({
  item,
  index,
}: {
  item: VideoFeedItem & { playUrl?: string };
  index: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(item.is_liked ?? false);
  const [bookmarked, setBookmarked] = useState(item.is_bookmarked ?? false);
  const [likeCount, setLikeCount] = useState(item.likes_count ?? 0);
  const [showQuote, setShowQuote] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const pauseIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meta = INQUIRY_META[item.id] ?? {
    country: '🌍 海外', budget: '面议', urgent: false,
    avatarColor: 'from-purple-400 to-indigo-600', comments: 0,
  };

  // IntersectionObserver 自动播放/暂停
  // 依赖 item.playUrl：playUrl 异步到达后重新注册，确保视频元素已挂载
  useEffect(() => {
    const v = videoRef.current;
    const card = cardRef.current;
    if (!v || !card) return;

    let isVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting && entry.intersectionRatio > 0.7;
        if (isVisible) {
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

    // playUrl 刚到达时，如果卡片已在视口内则立即播放
    // （Observer 首次回调可能在 playUrl 到达前已经触发过）
    const rect = card.getBoundingClientRect();
    const viewH = window.innerHeight;
    const ratio = Math.min(rect.bottom, viewH) - Math.max(rect.top, 0);
    if (ratio / viewH > 0.7) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    }

    return () => observer.disconnect();
  }, [item.playUrl]);

  // 进度条更新
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      if (!progressRef.current || !v.duration) return;
      progressRef.current.style.width = `${(v.currentTime / v.duration) * 100}%`;
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
    setLiked(prev => { setLikeCount(c => prev ? c - 1 : c + 1); return !prev; });
    if (navigator.vibrate) navigator.vibrate(15);
    videoFeedApi.like(item.id).catch(() => {});
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked(prev => !prev);
    if (!bookmarked) setShowQuote(true);
    if (navigator.vibrate) navigator.vibrate([10, 5, 10]);
    videoFeedApi.bookmark(item.id).catch(() => {});
  };

  const tags: string[] = (() => {
    try { return JSON.parse(item.tags as unknown as string) as string[]; }
    catch { return (item.tags as unknown as string[]) ?? []; }
  })();

  return (
    <div
      ref={cardRef}
      className="relative w-full flex-shrink-0 bg-black overflow-hidden"
      style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      onClick={togglePlay}
    >
      {/* 视频 */}
      {item.playUrl ? (
        <video
          ref={videoRef}
          src={item.playUrl}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0f0a1e, #1a0a2e)' }}>
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/50 text-sm">加载中...</p>
          </div>
        </div>
      )}

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.3) 100%)'
      }} />

      {/* 进度条 */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-20">
        <div ref={progressRef} className="h-full bg-white" style={{ width: '0%', transition: 'none' }} />
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
      <div className="absolute right-3 z-10 flex flex-col items-center gap-5" style={{ bottom: '100px' }}>
        {/* 买家头像 */}
        <div className="flex flex-col items-center gap-1">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${meta.avatarColor} flex items-center justify-center text-white font-bold text-lg border-2 border-white/30`}>
            {(item.company_name ?? '?')[0]}
          </div>
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center -mt-3 border border-black">
            <svg width="10" height="10" viewBox="0 0 24 24" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M12 5v14M5 12l7-7 7 7" />
            </svg>
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

        {/* 收藏 */}
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
          <span className="text-white text-xs font-semibold drop-shadow">{item.is_bookmarked ? '已收藏' : '收藏'}</span>
        </button>

        {/* 评论 */}
        <button className="flex flex-col items-center gap-1" style={{ touchAction: 'none' }}
          onClick={e => e.stopPropagation()}>
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center" style={{ backdropFilter: 'blur(8px)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{meta.comments}</span>
        </button>

        {/* 静音 */}
        <button onClick={toggleMute} className="flex flex-col items-center gap-1" style={{ touchAction: 'none' }}>
          <div className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center" style={{ backdropFilter: 'blur(8px)' }}>
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
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-white font-bold text-sm drop-shadow">{item.company_name}</span>
          <span className="text-white/70 text-xs">{meta.country}</span>
          {meta.urgent && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(254,44,85,0.85)', color: 'white' }}>紧急</span>
          )}
        </div>
        <p className="text-white/90 text-sm leading-snug drop-shadow mb-2 line-clamp-2">{item.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs text-white/80 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              #{tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
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
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${meta.avatarColor} flex items-center justify-center text-white font-bold`}>
                {(item.company_name ?? '?')[0]}
              </div>
              <div>
                <div className="text-white font-bold text-sm">{item.company_name}</div>
                <div className="text-white/50 text-xs">{meta.country} · {item.title}</div>
              </div>
            </div>
            <div className="rounded-2xl p-3 mb-4" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <p className="text-white/70 text-xs leading-relaxed">{item.description}</p>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowQuote(false)}
                className="flex-1 py-3 rounded-2xl text-white/60 text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >稍后处理</motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { setBookmarked(true); setShowQuote(false); }}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(67,56,202,0.8))',
                  border: '1px solid rgba(167,139,250,0.3)',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                }}
              >收藏并报价 ✓</motion.button>
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
  const [items, setItems] = useState<(VideoFeedItem & { playUrl?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else navigate('/boss-warroom');
  }, [onBack, navigate]);

  // 加载视频列表 + 逐一获取播放地址
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await videoFeedApi.getVideos({ limit: 10 });
        if (cancelled) return;

        // 先展示列表（无播放地址），再逐一获取
        setItems(res.items.map(i => ({ ...i, playUrl: undefined })));
        setLoading(false);

        // 并发获取所有播放地址
        await Promise.all(
          res.items.map(async (item, idx) => {
            try {
              const playInfo = await videoFeedApi.getPlayInfo(item.id);
              if (cancelled) return;
              setItems(prev => {
                const next = [...prev];
                if (next[idx]) next[idx] = { ...next[idx], playUrl: playInfo.play_url };
                return next;
              });
            } catch (e) {
              console.warn(`[VOD] getPlayInfo failed for ${item.id}:`, e);
            }
          })
        );
      } catch (e) {
        console.error('[VideoFeed] load failed:', e);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

        {/* 竖向分页指示器 */}
        <div className="flex flex-col gap-1">
          {items.map((_, i) => (
            <div key={i} className="w-1 rounded-full transition-all duration-300"
              style={{
                height: i === currentIndex ? '16px' : '4px',
                background: i === currentIndex ? 'white' : 'rgba(255,255,255,0.3)',
              }} />
          ))}
        </div>
      </div>

      {/* ── 加载中 ── */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-30"
          style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/60 text-sm">正在加载询盘视频...</p>
          </div>
        </div>
      )}

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
        {items.map((item, index) => (
          <VideoCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}
