/**
 * useSpringGesture — 弹簧物理手势 Hook v2
 *
 * 修复垂直滚动与下拉刷新的手势冲突：
 * - 只在明确判断为垂直向下拖拽（且已在顶部）时才拦截事件
 * - 水平方向完全不干预，交给 CSS scroll-snap 处理
 * - 使用 passive: false 精确控制 preventDefault 时机
 */

import { useRef, useCallback, useEffect } from 'react';
import { hapticLight, hapticSuccess } from '../lib/haptics';

const PULL_THRESHOLD = 72;
const RUBBER_BAND_FACTOR = 0.4;
const DIRECTION_LOCK_THRESHOLD = 6; // px，方向锁定阈值

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const startYRef        = useRef(0);
  const startXRef        = useRef(0);
  const isPullingRef     = useRef(false);   // 已锁定为下拉刷新手势
  const isRefreshingRef  = useRef(false);
  const directionRef     = useRef<'vertical' | 'horizontal' | null>(null);
  const containerRef     = useRef<HTMLDivElement>(null);
  const indicatorRef     = useRef<HTMLDivElement>(null);

  // 用 useEffect 绑定 non-passive touch 事件，以便在需要时调用 preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      directionRef.current = null;
      isPullingRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      const dy = e.touches[0].clientY - startYRef.current;
      const dx = e.touches[0].clientX - startXRef.current;

      // 方向尚未锁定时，判断主方向
      if (directionRef.current === null) {
        if (Math.abs(dx) > DIRECTION_LOCK_THRESHOLD || Math.abs(dy) > DIRECTION_LOCK_THRESHOLD) {
          directionRef.current = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
        } else {
          return; // 移动量不足，继续等待
        }
      }

      // 水平方向：完全不干预，让 scroll-snap 自然处理
      if (directionRef.current === 'horizontal') return;

      // 垂直方向：只在顶部且向下拉时激活下拉刷新
      const atTop = container.scrollTop <= 0;
      if (!atTop || dy <= 0) return;

      // 确认是下拉刷新手势，阻止默认的页面滚动
      e.preventDefault();
      isPullingRef.current = true;

      const rubberDist = Math.pow(dy, RUBBER_BAND_FACTOR) * 8;
      const clamped = Math.min(rubberDist, PULL_THRESHOLD * 1.5);

      if (indicatorRef.current) {
        indicatorRef.current.style.transform = `translateY(${clamped}px)`;
        indicatorRef.current.style.opacity = String(Math.min(clamped / PULL_THRESHOLD, 1));
      }

      if (clamped >= PULL_THRESHOLD * 0.7) {
        hapticLight();
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      directionRef.current = null;

      const indicator = indicatorRef.current;
      if (!indicator) return;

      const currentTranslate = parseFloat(
        indicator.style.transform.replace('translateY(', '').replace('px)', '') || '0'
      );

      if (currentTranslate >= PULL_THRESHOLD * 0.7) {
        isRefreshingRef.current = true;
        hapticSuccess();
        indicator.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
        indicator.style.transform = `translateY(${PULL_THRESHOLD * 0.6}px)`;

        try {
          await onRefresh();
        } finally {
          isRefreshingRef.current = false;
          indicator.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease';
          indicator.style.transform = 'translateY(0px)';
          indicator.style.opacity = '0';
          setTimeout(() => { if (indicator) indicator.style.transition = ''; }, 400);
        }
      } else {
        indicator.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease';
        indicator.style.transform = 'translateY(0px)';
        indicator.style.opacity = '0';
        setTimeout(() => { if (indicator) indicator.style.transition = ''; }, 350);
      }
    };

    // passive: false 允许在需要时调用 preventDefault
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false });
    el.addEventListener('touchend',   handleTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove',  handleTouchMove);
      el.removeEventListener('touchend',   handleTouchEnd);
    };
  }, [onRefresh]);

  // React 合成事件版本（桌面浏览器 fallback，不做实际处理）
  const onTouchStart = useCallback(() => {}, []);
  const onTouchMove  = useCallback(() => {}, []);
  const onTouchEnd   = useCallback(() => {}, []);

  return { containerRef, indicatorRef, onTouchStart, onTouchMove, onTouchEnd };
}

export function useSwipeBack(onBack: () => void) {
  const startXRef    = useRef(0);
  const startYRef    = useRef(0);
  const isSwipingRef = useRef(false);
  const overlayRef   = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches[0].clientX > 30) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isSwipingRef.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwipingRef.current) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = Math.abs(e.touches[0].clientY - startYRef.current);
    if (dy > dx) { isSwipingRef.current = false; return; }
    if (dx < 0) return;
    const progress = Math.min(dx / window.innerWidth, 1);
    if (overlayRef.current) {
      overlayRef.current.style.transform = `translateX(${dx * 0.4}px)`;
      overlayRef.current.style.opacity = String(1 - progress * 0.3);
    }
    if (progress > 0.1) hapticLight();
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isSwipingRef.current) return;
    isSwipingRef.current = false;
    const dx = e.changedTouches[0].clientX - startXRef.current;
    const progress = dx / window.innerWidth;
    if (overlayRef.current) {
      if (progress > 0.35) {
        overlayRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)';
        overlayRef.current.style.transform = `translateX(${window.innerWidth}px)`;
        overlayRef.current.style.opacity = '0';
        setTimeout(onBack, 300);
      } else {
        overlayRef.current.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease';
        overlayRef.current.style.transform = 'translateX(0)';
        overlayRef.current.style.opacity = '1';
        setTimeout(() => { if (overlayRef.current) overlayRef.current.style.transition = ''; }, 350);
      }
    }
  }, [onBack]);

  return { overlayRef, onTouchStart, onTouchMove, onTouchEnd };
}
