import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { hapticMedium } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CLOCK_SIZE = SCREEN_WIDTH * 0.7;

// Agent data
const agents = [
  { id: 'scout', name: 'Scout', role: '市场侦察', status: 'online' as const, tasks: 12 },
  { id: 'analyst', name: 'Analyst', role: '数据分析', status: 'busy' as const, tasks: 5 },
  { id: 'writer', name: 'Writer', role: '内容创作', status: 'online' as const, tasks: 8 },
  { id: 'closer', name: 'Closer', role: '成交转化', status: 'idle' as const, tasks: 3 },
];

interface WatchFaceScreenProps {
  navigation: any;
}

export default function WatchFaceScreen({ navigation }: WatchFaceScreenProps) {
  const [time, setTime] = useState(new Date());
  
  // Animation values
  const secondsRotation = useSharedValue(0);
  const minutesRotation = useSharedValue(0);
  const hoursRotation = useSharedValue(0);
  const breathScale = useSharedValue(1);
  const ringProgress = useSharedValue(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      
      const seconds = now.getSeconds();
      const minutes = now.getMinutes();
      const hours = now.getHours() % 12;
      
      secondsRotation.value = withTiming((seconds / 60) * 360, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      minutesRotation.value = withTiming(((minutes + seconds / 60) / 60) * 360, {
        duration: 200,
      });
      hoursRotation.value = withTiming(((hours + minutes / 60) / 12) * 360, {
        duration: 200,
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Breathing animation for the outer ring
  useEffect(() => {
    breathScale.value = withRepeat(
      withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    ringProgress.value = withTiming(0.75, { duration: 2000 });
  }, []);

  const secondHandStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${secondsRotation.value}deg` }],
  }));

  const minuteHandStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${minutesRotation.value}deg` }],
  }));

  const hourHandStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${hoursRotation.value}deg` }],
  }));

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const pendingDecisions = 7;
  const urgentItems = 2;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, '#0F0F18', colors.background.primary]}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>早安, 老板</Text>
          <Pressable 
            style={styles.notificationBtn}
            onPress={() => {
              hapticMedium();
              navigation.navigate('Settings');
            }}
          >
            <Feather name="bell" size={22} color={colors.text.secondary} />
            {urgentItems > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{urgentItems}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Clock Face */}
        <View style={styles.clockContainer}>
          <Animated.View style={[styles.clockOuter, breathStyle]}>
            {/* Progress ring */}
            <View style={styles.progressRing}>
              <View style={[styles.progressArc, { backgroundColor: colors.brand.gold }]} />
            </View>
            
            {/* Clock face */}
            <View style={styles.clockFace}>
              {/* Hour markers */}
              {[...Array(12)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.hourMarker,
                    {
                      transform: [
                        { rotate: `${i * 30}deg` },
                        { translateY: -CLOCK_SIZE / 2 + 20 },
                      ],
                    },
                  ]}
                >
                  <View style={[
                    styles.markerDot,
                    i % 3 === 0 && styles.markerDotLarge,
                  ]} />
                </View>
              ))}
              
              {/* Digital time */}
              <View style={styles.digitalTime}>
                <Text style={styles.timeText}>{formatTime(time)}</Text>
                <Text style={styles.dateText}>{formatDate(time)}</Text>
              </View>

              {/* Clock hands */}
              <View style={styles.handsContainer}>
                <Animated.View style={[styles.hourHand, hourHandStyle]} />
                <Animated.View style={[styles.minuteHand, minuteHandStyle]} />
                <Animated.View style={[styles.secondHand, secondHandStyle]} />
                <View style={styles.centerDot} />
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <GlassCard
            style={styles.statCard}
            onPress={() => {
              hapticMedium();
              navigation.navigate('DecisionFeed');
            }}
          >
            <Text style={styles.statValue}>{pendingDecisions}</Text>
            <Text style={styles.statLabel}>待决策</Text>
          </GlassCard>
          
          <GlassCard
            style={styles.statCard}
            glowColor={colors.status.error}
            onPress={() => {
              hapticMedium();
              navigation.navigate('DecisionFeed');
            }}
          >
            <Text style={[styles.statValue, { color: colors.status.error }]}>{urgentItems}</Text>
            <Text style={styles.statLabel}>紧急</Text>
          </GlassCard>
          
          <GlassCard
            style={styles.statCard}
            onPress={() => {
              hapticMedium();
              navigation.navigate('DigitalAgents');
            }}
          >
            <Text style={[styles.statValue, { color: colors.status.success }]}>4</Text>
            <Text style={styles.statLabel}>AI在线</Text>
          </GlassCard>
        </View>

        {/* Agent Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>数字员工状态</Text>
            <Pressable onPress={() => navigation.navigate('DigitalAgents')}>
              <Text style={styles.seeAll}>查看全部</Text>
            </Pressable>
          </View>
          
          {agents.map((agent) => (
            <GlassCard
              key={agent.id}
              style={styles.agentCard}
              onPress={() => {
                hapticMedium();
                navigation.navigate('CommanderChat', { agentId: agent.id });
              }}
            >
              <View style={styles.agentInfo}>
                <View style={styles.agentAvatar}>
                  <LinearGradient
                    colors={[colors.brand.gold, colors.brand.goldDark]}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>{agent.name[0]}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.agentDetails}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <Text style={styles.agentRole}>{agent.role}</Text>
                </View>
              </View>
              <View style={styles.agentStatus}>
                <StatusBadge status={agent.status} pulse={agent.status === 'online'} />
                <Text style={styles.taskCount}>{agent.tasks} 任务</Text>
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快捷操作</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'command', label: '指挥中心', screen: 'CommanderChat' },
              { icon: 'radio', label: '市场雷达', screen: 'MarketRadar' },
              { icon: 'cpu', label: 'AI训练', screen: 'AITraining' },
              { icon: 'inbox', label: '入站漏斗', screen: 'InboundFunnel' },
            ].map((action) => (
              <GlassCard
                key={action.screen}
                style={styles.actionCard}
                onPress={() => {
                  hapticMedium();
                  navigation.navigate(action.screen);
                }}
              >
                <Feather name={action.icon as any} size={24} color={colors.brand.gold} />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </GlassCard>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  greeting: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.status.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  clockContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  clockOuter: {
    width: CLOCK_SIZE + 20,
    height: CLOCK_SIZE + 20,
    borderRadius: (CLOCK_SIZE + 20) / 2,
    padding: 10,
    backgroundColor: colors.background.secondary,
    ...shadows.lg,
  },
  progressRing: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: CLOCK_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.border.default,
  },
  progressArc: {
    position: 'absolute',
    top: -3,
    left: '25%',
    width: '50%',
    height: 3,
    borderRadius: 2,
  },
  clockFace: {
    width: CLOCK_SIZE,
    height: CLOCK_SIZE,
    borderRadius: CLOCK_SIZE / 2,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  hourMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text.tertiary,
  },
  markerDotLarge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text.secondary,
  },
  digitalTime: {
    alignItems: 'center',
    marginTop: 30,
  },
  timeText: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  dateText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  handsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourHand: {
    position: 'absolute',
    width: 4,
    height: CLOCK_SIZE * 0.25,
    backgroundColor: colors.text.primary,
    borderRadius: 2,
    bottom: '50%',
    transformOrigin: 'bottom',
  },
  minuteHand: {
    position: 'absolute',
    width: 3,
    height: CLOCK_SIZE * 0.35,
    backgroundColor: colors.text.secondary,
    borderRadius: 1.5,
    bottom: '50%',
    transformOrigin: 'bottom',
  },
  secondHand: {
    position: 'absolute',
    width: 2,
    height: CLOCK_SIZE * 0.4,
    backgroundColor: colors.brand.gold,
    borderRadius: 1,
    bottom: '50%',
    transformOrigin: 'bottom',
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand.gold,
    ...shadows.glow,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.brand.gold,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  seeAll: {
    fontSize: typography.fontSize.sm,
    color: colors.brand.gold,
  },
  agentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  agentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },
  agentDetails: {
    gap: 2,
  },
  agentName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  agentRole: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  agentStatus: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  taskCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 2 - spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  actionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
});

export default WatchFaceScreen;

export default WatchFaceScreen;
