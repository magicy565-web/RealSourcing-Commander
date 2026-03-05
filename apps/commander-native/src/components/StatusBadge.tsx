import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius } from '../theme';

type StatusType = 'online' | 'busy' | 'idle' | 'offline' | 'urgent' | 'success';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const statusColors: Record<StatusType, string> = {
  online: colors.status.success,
  busy: colors.status.warning,
  idle: colors.accent.blue,
  offline: colors.text.tertiary,
  urgent: colors.status.error,
  success: colors.brand.gold,
};

const statusLabels: Record<StatusType, string> = {
  online: '在线',
  busy: '忙碌',
  idle: '空闲',
  offline: '离线',
  urgent: '紧急',
  success: '完成',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  pulse = false,
}) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  React.useEffect(() => {
    if (pulse) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 })
        ),
        -1,
        false
      );
    }
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const dotSize = size === 'sm' ? 6 : size === 'md' ? 8 : 10;
  const fontSize = size === 'sm' ? typography.fontSize.xs : size === 'md' ? typography.fontSize.sm : typography.fontSize.base;
  const color = statusColors[status];

  return (
    <View style={styles.container}>
      <View style={styles.dotContainer}>
        {pulse && (
          <Animated.View
            style={[
              styles.pulse,
              { backgroundColor: color, width: dotSize * 2, height: dotSize * 2 },
              pulseStyle,
            ]}
          />
        )}
        <View
          style={[
            styles.dot,
            { backgroundColor: color, width: dotSize, height: dotSize },
          ]}
        />
      </View>
      {(label || statusLabels[status]) && (
        <Text style={[styles.label, { fontSize, color: colors.text.secondary }]}>
          {label || statusLabels[status]}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dotContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: borderRadius.full,
  },
  pulse: {
    position: 'absolute',
    borderRadius: borderRadius.full,
  },
  label: {
    fontWeight: typography.fontWeight.medium,
  },
});

export default StatusBadge;
