/**
 * Haptics — 触感反馈工具
 *
 * 封装 navigator.vibrate API，为关键操作提供触感反馈。
 * 在不支持的设备上静默降级。
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light:     10,
  medium:    20,
  heavy:     40,
  success:   [10, 50, 20],
  error:     [30, 60, 30, 60, 30],
  warning:   [20, 40, 20],
  selection: 8,
};

export function haptic(type: HapticPattern = 'light'): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(PATTERNS[type]);
    }
  } catch {
    // Silent fail on unsupported devices
  }
}

export function hapticLight()     { haptic('light'); }
export function hapticMedium()    { haptic('medium'); }
export function hapticHeavy()     { haptic('heavy'); }
export function hapticSuccess()   { haptic('success'); }
export function hapticError()     { haptic('error'); }
export function hapticWarning()   { haptic('warning'); }
export function hapticSelection() { haptic('selection'); }
