/**
 * VideoFeedPlayer.tsx — Phase 3 Sprint 3.1 手势优化版
 *
 * 原生 App 级滑动体验：
 *   ① 实时跟手 (touchMove → translateY)
 *   ② 边界阻尼 (超出首/尾时阻力系数 0.25)
 *   ③ 速度感知切换 (velocity > 0.3px/ms 或位移 > 30% 视口高度)
 *   ④ 弹性回弹 (spring cubic-bezier)
 *   ⑤ 动画锁 (isAnimating.current 防止快速连击)
 *   ⑥ 鼠标滚轮防抖 (100ms 节流)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { videoFeedApi, VideoFeedItem } from '../lib/api';
import { toast } from 'sonner';

interface Props {
  onBack: () => void;
}

// ─── 常量 ─────────────────────────────────────────────────────────────────────
const SWITCH_THRESHOLD = 0.30;   // 位移超过视口高度 30% 触发切换
const VELOCITY_THRESHOLD = 0.30; // px/ms 速度阈值
const DAMPING = 0.25;            // 边界阻尼系数
const ANIM_DURATION_MS = 320;    // 切换动画时长 (ms)
const WHEEL_THROTTLE_MS = 100;   // 滚轮节流时长 (ms)

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
  const trackRef = useRef<HTMLDivElement>(null);

  // 已加载播放地址的 item id 集合（避免重复请求）
  const loadedPlayUrls = useRef<Set<string>>(new Set());

  // ─── 手势状态 (ref 避免 re-render 开销) ──────────────────────────────────
  const isAnimating = useRef(false);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const lastTouchY = useRef(0);
  const dragOffset = useRef(0);       // 当前拖拽偏移量 (px)
  const currentIndexRef = useRef(0);  // 与 state 同步的 ref，供手势回调使用

  // 同步 currentIndex → ref
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // ─── 加载视频列表 ─────────────────────────────────────────────────────────
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
    } catch {
      toast.error('加载视频失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos(1);
  }, [loadVideos]);

  // ─── 懒加载当前视频播放地址（切换时自动获取）─────────────────────────────────
  useEffect(() => {
    const item = items[currentIndex];
    if (!item) return;
    // 如果已有 play_url 或已经请求过，跳过
    if (item.play_url || loadedPlayUrls.current.has(item.id)) return;
    loadedPlayUrls.current.add(item.id);
    // 同时预加载下一条
    const toLoad = [item, items[currentIndex + 1]].filter(Boolean);
    toLoad.forEach(async (v) => {
      if (!v || v.play_url || loadedPlayUrls.current.has(v.id + '_next')) return;
      loadedPlayUrls.current.add(v.id + '_next');
      try {
        const res = await videoFeedApi.getPlayInfo(v.id);
        setItems((prev) =>
          prev.map((p) =>
            p.id === v.id
              ? { ...p, play_url: res.playUrl, cover_url: res.coverUrl || p.cover_url, duration: res.duration || p.duration }
              : p
          )
        );
      } catch (err) {
        console.warn('[VideoFeed] 获取播放地址失败', v.id, err);
      }
    });
  }, [currentIndex, items]);

  // ─── 设置轨道 transform（无动画，实时跟手）────────────────────────────────
  const setTrackOffset = useCallback((offset: number, animated = false) => {
    const track = trackRef.current;
    if (!track) return;
    const baseY = -(currentIndexRef.current * 100);
    const totalY = baseY + (offset / (window.innerHeight || 812)) * 100;
    if (animated) {
      track.style.transition = `transform ${ANIM_DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    } else {
      track.style.transition = 'none';
    }
    track.style.transform = `translateY(${totalY}%)`;
  }, []);

  // ─── 切换到指定 index（带动画锁）────────────────────────────────────────
  const goToIndex = useCallback((nextIndex: number, itemCount: number) => {
    if (isAnimating.current) return;
    const clamped = Math.max(0, Math.min(nextIndex, itemCount - 1));
    isAnimating.current = true;
    dragOffset.current = 0;

    // 预加载下一页
    if (clamped >= itemCount - 2 && hasMore) {
      setPage((p) => {
        const np = p + 1;
        loadVideos(np, true);
        return np;
      });
    }

    setCurrentIndex(clamped);
    currentIndexRef.current = clamped;

    // 应用动画
    const track = trackRef.current;
    if (track) {
      track.style.transition = `transform ${ANIM_DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      track.style.transform = `translateY(-${clamped * 100}%)`;
    }

    setTimeout(() => {
      isAnimating.current = false;
    }, ANIM_DURATION_MS + 20);
  }, [hasMore, loadVideos]);

  // ─── Touch 事件处理 ───────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating.current) return;
    touchStartY.current = e.touches[0].clientY;
    lastTouchY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    dragOffset.current = 0;
    // 立即取消过渡，准备跟手
    const track = trackRef.current;
    if (track) track.style.transition = 'none';
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isAnimating.current) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    lastTouchY.current = e.touches[0].clientY;
    const viewH = window.innerHeight || 812;
    const idx = currentIndexRef.current;
    const total = items.length;

    // 边界阻尼：首帧上滑 or 末帧下滑 时施加阻力
    let offset = dy;
    if ((idx === 0 && dy > 0) || (idx === total - 1 && dy < 0)) {
      offset = dy * DAMPING;
    }

    dragOffset.current = offset;
    setTrackOffset(offset, false);

    // 阻止页面滚动
    e.preventDefault();
  }, [items.length, setTrackOffset]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isAnimating.current) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY; // 正 = 上滑
    const dt = Date.now() - touchStartTime.current;
    const velocity = Math.abs(dy) / Math.max(dt, 1); // px/ms
    const viewH = window.innerHeight || 812;
    const ratio = Math.abs(dy) / viewH;
    const idx = currentIndexRef.current;

    const shouldSwitch = ratio > SWITCH_THRESHOLD || velocity > VELOCITY_THRESHOLD;

    if (shouldSwitch && dy > 0 && idx < items.length - 1) {
      goToIndex(idx + 1, items.length);
    } else if (shouldSwitch && dy < 0 && idx > 0) {
      goToIndex(idx - 1, items.length);
    } else {
      // 回弹到当前位置
      isAnimating.current = true;
      dragOffset.current = 0;
      const track = trackRef.current;
      if (track) {
        track.style.transition = `transform ${ANIM_DURATION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        track.style.transform = `translateY(-${idx * 100}%)`;
      }
      setTimeout(() => { isAnimating.current = false; }, ANIM_DURATION_MS + 20);
    }
  }, [items.length, goToIndex]);

  // ─── 鼠标滚轮（节流）────────────────────────────────────────────────────
  const wheelLastTime = useRef(0);
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - wheelLastTime.current < WHEEL_THROTTLE_MS) return;
    wheelLastTime.current = now;
    const idx = currentIndexRef.current;
    if (e.deltaY > 0) {
      goToIndex(idx + 1, items.length);
    } else {
      goToIndex(idx - 1, items.length);
    }
  }, [items.length, goToIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ─── 点赞 ─────────────────────────────────────────────────────────────────
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

  // ─── 收藏 ─────────────────────────────────────────────────────────────────
  const handleBookmark = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.is_bookmarked) {
      toast.info('已在询盘列表中');
      return;
    }
    try {
      await videoFeedApi.bookmark(id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, is_bookmarked: true } : it
        )
      );
      toast.success('✓ 已加入询盘，可在「我的询盘」中报价');
    } catch (err: any) {
      toast.error(err.message ?? '收藏失败');
    }
  }, [items]);

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
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
      className="fixed inset-0 bg-black z-50 overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
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

      {/* 视频轨道（CSS transform 实时跟手） */}
      <div
        ref={trackRef}
        className="w-full"
        style={{
          height: `${items.length * 100}dvh`,
          transform: `translateY(-${currentIndex * 100}%)`,
          willChange: 'transform',
        }}
      >
        {items.map((item, idx) => (
          <div key={item.id} className="w-full" style={{ height: '100dvh' }}>
            <VideoCard
              item={item}
              isActive={idx === currentIndex}
              onLike={handleLike}
              onBookmark={handleBookmark}
            />
          </div>
        ))}
      </div>

      {/* 上滑提示（首次进入，首屏且有下一个） */}
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
