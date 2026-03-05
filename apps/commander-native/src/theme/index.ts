// Commander Theme System - Premium Dark Theme
// Inspired by Tesla App, Apple Watch, Bloomberg Terminal

export const colors = {
  // Background layers
  background: {
    primary: '#0A0A0F',      // Near black with blue tint
    secondary: '#12121A',    // Slightly lighter
    tertiary: '#1A1A24',     // Card backgrounds
    elevated: '#222230',     // Elevated surfaces
  },
  
  // Brand colors
  brand: {
    gold: '#C9A84C',         // Primary accent
    goldLight: '#F5D07A',    // Hover/active gold
    goldDark: '#8B7535',     // Muted gold
  },
  
  // Semantic colors
  accent: {
    blue: '#3B82F6',         // Data, secondary info
    blueLight: '#60A5FA',    // Active blue
    cyan: '#06B6D4',         // Technology
  },
  
  // Status colors
  status: {
    success: '#10B981',      // Growth, positive
    successLight: '#34D399',
    warning: '#F59E0B',      // Caution
    warningLight: '#FBBF24',
    error: '#EF4444',        // Urgent, negative
    errorLight: '#F87171',
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: '#A1A1AA',    // Muted text
    tertiary: '#71717A',     // Very muted
    inverse: '#0A0A0F',      // For light backgrounds
  },
  
  // Border colors
  border: {
    default: 'rgba(255, 255, 255, 0.08)',
    light: 'rgba(255, 255, 255, 0.12)',
    focus: 'rgba(201, 168, 76, 0.5)',
  },
  
  // Overlay colors
  overlay: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.1)',
    dark: 'rgba(0, 0, 0, 0.5)',
    blur: 'rgba(10, 10, 15, 0.8)',
  },
};

export const typography = {
  // Font families
  fontFamily: {
    display: 'System',      // Will use SF Pro on iOS, Roboto on Android
    body: 'System',
    mono: 'SpaceMono',
  },
  
  // Font sizes
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  
  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.brand.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};

// Animation presets for Reanimated
export const animations = {
  // Timing configurations
  timing: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Spring configurations
  spring: {
    gentle: { damping: 20, stiffness: 100 },
    bouncy: { damping: 12, stiffness: 180 },
    stiff: { damping: 30, stiffness: 300 },
  },
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
};

export type Theme = typeof theme;
export default theme;
