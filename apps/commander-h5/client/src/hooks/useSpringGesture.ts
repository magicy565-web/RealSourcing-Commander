/**
 * useSpringGesture — 弹簧物理手势 Hook
 *
 * 提供 iOS 原生质感的手势交互：
 * - 侧滑返回（swipe-back）
 * - 下拉刷新回弹（rubber banding）
 * - 按压缩放（press scale）
 *
 * 基于 framer-motion 的弹簧物理引擎实现。
 */

import { useRef, useCallback } from 'react';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';

export interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
}

const PULL_THRESHOLD = 72;
const RUBBER_BAND_FACTOR = 0.4;

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshingRef.current) return;
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      isPullingRef.current = false;
      return;
    }

    const dy = e.touches[0].clientY - startYRef.current;
    if (dy <= 0) return;

    // Rubber band: diminishing returns
    const rubberDist = Math.pow(dy, RUBBER_BAND_FACTOR) * 8;
    const clamped = Math.min(rubberDist, PULL_THRESHOLD * 1.5);

    if (indicatorRef.current) {
      indicatorRef.current.style.transform = `translateY(${clamped}px)`;
      indicatorRef.current.style.opacity = String(Math.min(clamped / PULL_THRESHOLD, 1));
    }

    if (clamped >= PULL_THRESHOLD * 0.7) {
      hapticLight();
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    const indicator = indicatorRef.current;
    if (!indicator) return;

    const currentTranslate = parseFloat(indicator.style.transform.replace('translateY(', '').replace('px)', '') || '0');

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
        setTimeout(() => {
          if (indicator) indicator.style.transition = '';
        }, 400);
      }
    } else {
      indicator.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease';
      indicator.style.transform = 'translateY(0px)';
      indicator.style.opacity = '0';
      setTimeout(() => {
        if (indicator) indicator.style.transition = '';
      }, 350);
    }
  }, [onRefresh]);

  return { containerRef, indicatorRef, onTouchStart, onTouchMove, onTouchEnd };
}

export function useSwipeBack(onBack: () => void) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipingRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches[0].clientX > 30) return; // Only trigger from left edge
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
        hapticMedium();
        overlayRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)';
        overlayRef.current.style.transform = `translateX(${window.innerWidth}px)`;
        overlayRef.current.style.opacity = '0';
        setTimeout(onBack, 300);
      } else {
        overlayRef.current.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease';
        overlayRef.current.style.transform = 'translateX(0)';
        overlayRef.current.style.opacity = '1';
        setTimeout(() => {
          if (overlayRef.current) overlayRef.current.style.transition = '';
        }, 350);
      }
    }
  }, [onBack]);

  return { overlayRef, onTouchStart, onTouchMove, onTouchEnd };
}
