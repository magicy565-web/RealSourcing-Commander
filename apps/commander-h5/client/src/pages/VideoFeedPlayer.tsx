/**
 * VideoFeedPlayer.tsx
 * TikTok 风格全屏竖版视频信息流（火山引擎 VOD 接入）
 * - 上下滑动切换视频（touch + wheel 手势）
 * - 自动播放（进入视口时）
 * - 右侧操作栏（点赞/收藏）
 * - 底部视频信息（公司名、描述、标签）
 * - 收藏后才能报价
 * - 行业过滤（默认只看自己行业）
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { videoFeedApi, VideoFeedItem } from '../lib/api';
import { toast } from 'sonner';

interface Props {
  onBack: () => void;
}

// ─── 单个视频卡片 ─────────────────────────────────────────────────────────────
function VideoCard({
  item,
  isActive,
  onLike,
  onBookmark,
}: {
  item: VideoFeedItem;
  isActive: boolean;
  onLike: (id: string) => void;
  onBookmark: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div className="relative w-full h-full bg-black flex-shrink-0 overflow-hidden" onClick={togglePlay}>
      {/* 视频 */}
      {item.play_url ? (
        <video
          ref={videoRef}
          src={item.play_url}
          poster={item.cover_url}
          muted={muted}
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : item.cover_url ? (
        <img
          src={item.cover_url}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="text-center">
            <div className="text-6xl mb-3">🎬</div>
            <p className="text-white/60 text-sm">视频处理中</p>
          </div>
        </div>
      )}

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* 播放/暂停指示 */}
      {!playing && isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* 右侧操作栏 */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        {/* 点赞 */}
        <button
          onClick={(e) => { e.stopPropagation(); onLike(item.id); }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${item.is_liked ? 'bg-red-500' : 'bg-black/40'} backdrop-blur-sm transition-colors`}>
            <svg className="w-6 h-6 text-white" fill={item.is_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium drop-shadow">{item.likes_count}</span>
        </button>

        {/* 收藏（转入询盘） */}
        <button
          onClick={(e) => { e.stopPropagation(); onBookmark(item.id); }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${item.is_bookmarked ? 'bg-yellow-500' : 'bg-black/40'} backdrop-blur-sm transition-colors`}>
            <svg className="w-6 h-6 text-white" fill={item.is_bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium drop-shadow">{item.is_bookmarked ? '已收藏' : '收藏'}</span>
        </button>

        {/* 静音切换 */}
        <button
          onClick={toggleMute}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            {muted ? (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </div>
          <span className="text-white text-xs font-medium drop-shadow">{muted ? '静音' : '有声'}</span>
        </button>
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-14 p-4 z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {item.company_name?.[0] ?? '?'}
          </div>
          <span className="text-white font-semibold text-sm drop-shadow truncate">{item.company_name}</span>
          {item.is_bookmarked && (
            <span className="text-xs bg-yellow-500/80 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">已收藏</span>
          )}
        </div>
        <p className="text-white/90 text-sm leading-snug drop-shadow line-clamp-2 mb-2">{item.title}</p>
        {item.description && (
          <p className="text-white/60 text-xs leading-snug drop-shadow line-clamp-1 mb-2">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {item.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
          {item.duration && (
            <span className="text-xs bg-black/30 backdrop-blur-sm text-white/80 px-2 py-0.5 rounded-full">
              {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
            </span>
          )}
        </div>
        {item.is_bookmarked && (
          <div className="mt-2 text-xs text-yellow-300 drop-shadow">
            ✓ 已加入询盘，可在「我的询盘」中查看并报价
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export default function VideoFeedPlayer({ onBack }: Props) {
  const [items, setItems] = useState<VideoFeedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isAnimating = useRef(false);

  // 加载视频列表
  const loadVideos = useCallback(async (pageNum: number, append = false) => {
    try {
      if (!append) setLoading(true);
      const res = await videoFeedApi.getVideos({ page: pageNum, limit: 10 });
      if (append) {
        setItems((prev) => [...prev, ...res.items]);
      } else {
        setItems(res.items);
      }
      setHasMore(res.items.length === 10);
    } catch (err) {
      toast.error('加载视频失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos(1);
  }, [loadVideos]);

  // 切换到下一个视频
  const goNext = useCallback(() => {
    if (isAnimating.current) return;
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= items.length - 2 && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadVideos(nextPage, true);
      }
      return Math.min(next, items.length - 1);
    });
  }, [items.length, hasMore, page, loadVideos]);

  // 切换到上一个视频
  const goPrev = useCallback(() => {
    if (isAnimating.current) return;
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // 触摸手势
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 50) {
      if (dy > 0) goNext();
      else goPrev();
    }
  };

  // 鼠标滚轮
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) goNext();
    else goPrev();
  }, [goNext, goPrev]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // 点赞
  const handleLike = useCallback(async (id: string) => {
    try {
      const res = await videoFeedApi.like(id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, is_liked: res.liked, likes_count: res.likes_count }
            : item
        )
      );
    } catch {
      toast.error('操作失败');
    }
  }, []);

  // 收藏
  const handleBookmark = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.is_bookmarked) {
      toast.info('已在询盘列表中');
      return;
    }
    try {
      await videoFeedApi.bookmark(id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_bookmarked: true } : item
        )
      );
      toast.success('✓ 已加入询盘，可在「我的询盘」中报价');
    } catch (err: any) {
      toast.error(err.message ?? '收藏失败');
    }
  }, [items]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm">加载视频中...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <button onClick={onBack} className="absolute top-4 left-4 text-white/60 p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-6xl mb-4">🎬</div>
        <p className="text-white font-semibold text-lg mb-2">暂无视频</p>
        <p className="text-white/50 text-sm text-center px-8">管理员还未上传视频询盘，请稍后再来</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 顶部标题 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <span className="text-white font-semibold text-sm drop-shadow">视频询盘</span>
      </div>

      {/* 进度指示器 */}
      <div className="absolute top-4 right-4 z-20">
        <span className="text-white/60 text-xs">{currentIndex + 1} / {items.length}</span>
      </div>

      {/* 视频列表（CSS transform 切换） */}
      <div
        className="w-full h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${currentIndex * 100}%)` }}
      >
        {items.map((item, idx) => (
          <div key={item.id} className="w-full h-full" style={{ height: '100dvh' }}>
            <VideoCard
              item={item}
              isActive={idx === currentIndex}
              onLike={handleLike}
              onBookmark={handleBookmark}
            />
          </div>
        ))}
      </div>

      {/* 上下滑动提示（首次进入） */}
      {currentIndex === 0 && items.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 animate-bounce pointer-events-none">
          <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-white/40 text-xs">上滑查看下一个</span>
        </div>
      )}
    </div>
  );
}
