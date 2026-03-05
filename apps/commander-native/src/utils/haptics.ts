import * as Haptics from 'expo-haptics';

// Haptic feedback utilities for rich tactile interactions

export const haptic = {
  // Light feedback - for hover, focus, minor selections
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  
  // Medium feedback - for button presses, tab switches
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  
  // Heavy feedback - for important actions, confirmations
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  
  // Success feedback - for completed actions, approvals
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  
  // Warning feedback - for alerts, pending states
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  
  // Error feedback - for failures, rejections
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  
  // Selection feedback - for pickers, lists
  selection: () => Haptics.selectionAsync(),
};

// Shorthand exports
export const hapticLight = haptic.light;
export const hapticMedium = haptic.medium;
export const hapticHeavy = haptic.heavy;
export const hapticSuccess = haptic.success;
export const hapticWarning = haptic.warning;
export const hapticError = haptic.error;
export const hapticSelection = haptic.selection;

export default haptic;
