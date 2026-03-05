/**
 * Haptics — 原生触感反馈工具
 * 使用 expo-haptics 实现真实的原生震动
 */
import * as Haptics from 'expo-haptics';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection';

export async function haptic(type: HapticPattern = 'light'): Promise<void> {
  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch {
    // Silent fail on unsupported devices
  }
}

export const triggerHaptic = haptic;
export const hapticLight = () => haptic('light');
export const hapticMedium = () => haptic('medium');
export const hapticHeavy = () => haptic('heavy');
export const hapticSuccess = () => haptic('success');
export const hapticError = () => haptic('error');
export const hapticWarning = () => haptic('warning');
export const hapticSelection = () => haptic('selection');
