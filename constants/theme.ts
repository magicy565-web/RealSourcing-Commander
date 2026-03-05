/**
 * Commander Boss Phone — 设计系统
 * 与 v0 版本保持一致的颜色、间距、动画配置
 */

export const C = {
  // 背景
  bg: '#000000',
  bgCard: '#111118',
  bgGlass: 'rgba(255,255,255,0.04)',

  // 文字
  t1: 'rgba(255,255,255,0.92)',
  t2: 'rgba(255,255,255,0.52)',
  t3: 'rgba(255,255,255,0.26)',

  // 强调色
  P: '#7C3AED',     // 主紫色
  PL: '#A78BFA',    // 浅紫色
  amber: '#F59E0B',
  green: '#10B981',
  blue: '#60A5FA',
  red: '#F87171',
  teal: '#2DD4BF',
  orange: '#f97316',
  cyan: '#06b6d4',

  // 边框
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',
};

export const SPRING = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 28,
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 30,
};

export const SPRING_BOUNCY = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 22,
};
