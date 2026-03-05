import React, { useEffect } from 'react';
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
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { hapticMedium } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// AI Capability data
const capabilities = [
  { id: 'market', name: '市场洞察', level: 85, color: colors.brand.gold },
  { id: 'sales', name: '销售策略', level: 72, color: colors.accent.blue },
  { id: 'content', name: '内容创作', level: 90, color: colors.status.success },
  { id: 'analysis', name: '数据分析', level: 78, color: colors.accent.cyan },
  { id: 'customer', name: '客户服务', level: 65, color: colors.status.warning },
];

// Training sessions
const trainingSessions = [
  {
    id: '1',
    title: '行业报告学习',
    source: '36氪、虎嗅等媒体',
    progress: 45,
    docsCount: 128,
    status: 'training' as const,
  },
  {
    id: '2',
    title: '销售话术优化',
    source: '历史成交记录',
    progress: 100,
    docsCount: 256,
    status: 'completed' as const,
  },
  {
    id: '3',
    title: '产品知识库更新',
    source: '产品文档、FAQ',
    progress: 12,
    docsCount: 89,
    status: 'training' as const,
  },
];

// Knowledge flow particle
const KnowledgeParticle: React.FC<{ delay: number; startX: number }> = ({ delay, startX }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(startX);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-200, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      )
    );
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(startX + 20, { duration: 1500 }),
          withTiming(startX - 20, { duration: 1500 })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 500 })
        ),
        -1,
        false
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.8, { duration: 2500 })
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.particle, style]}>
      <LinearGradient
        colors={[colors.brand.gold, 'transparent']}
        style={styles.particleGradient}
      />
    </Animated.View>
  );
};

// Shimmer effect for progress bars
const ShimmerBar: React.FC<{ width: number; color: string }> = ({ width, color }) => {
  const shimmerX = useSharedValue(-100);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(SCREEN_WIDTH, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <View style={[styles.progressBarContainer]}>
      <View style={[styles.progressBarBg]}>
        <View style={[styles.progressBarFill, { width: `${width}%`, backgroundColor: color }]}>
          <Animated.View style={[styles.shimmer, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

// Brain visualization with neural connections
const BrainVisualization: React.FC = () => {
  const pulseScale = useSharedValue(1);
  const rotateValue = useSharedValue(0);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
    rotateValue.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  return (
    <View style={styles.brainContainer}>
      {/* Particles */}
      {[...Array(8)].map((_, i) => (
        <KnowledgeParticle
          key={i}
          delay={i * 400}
          startX={(i % 4) * 60 - 90}
        />
      ))}
      
      {/* Outer ring */}
      <Animated.View style={[styles.outerRing, rotateStyle]}>
        {[...Array(12)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.ringDot,
              {
                transform: [
                  { rotate: `${i * 30}deg` },
                  { translateY: -80 },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>
      
      {/* Core brain */}
      <Animated.View style={[styles.brainCore, pulseStyle]}>
        <LinearGradient
          colors={[colors.brand.goldLight, colors.brand.gold, colors.brand.goldDark]}
          style={styles.brainGradient}
        >
          <Feather name="cpu" size={40} color={colors.text.inverse} />
        </LinearGradient>
      </Animated.View>
      
      {/* Neural connections */}
      {capabilities.map((cap, i) => {
        const angle = (i / capabilities.length) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * 100;
        const y = Math.sin(angle) * 100;
        
        return (
          <View
            key={cap.id}
            style={[
              styles.neuralNode,
              { transform: [{ translateX: x }, { translateY: y }] },
            ]}
          >
            <View style={[styles.nodeCore, { backgroundColor: cap.color }]} />
            <Text style={styles.nodeLabel}>{cap.name}</Text>
            <Text style={styles.nodeLevel}>{cap.level}%</Text>
          </View>
        );
      })}
    </View>
  );
};

interface AITrainingScreenProps {
  navigation: any;
}

export const AITrainingScreen: React.FC<AITrainingScreenProps> = ({ navigation }) => {
  const overallProgress = Math.round(
    capabilities.reduce((sum, c) => sum + c.level, 0) / capabilities.length
  );

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
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>AI 大脑</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Brain Visualization */}
        <BrainVisualization />

        {/* Overall Stats */}
        <View style={styles.statsContainer}>
          <GlassCard style={styles.overallCard}>
            <View style={styles.overallHeader}>
              <Text style={styles.overallLabel}>综合能力指数</Text>
              <View style={styles.trendBadge}>
                <Feather name="trending-up" size={14} color={colors.status.success} />
                <Text style={styles.trendText}>+5.2%</Text>
              </View>
            </View>
            <Text style={styles.overallValue}>{overallProgress}</Text>
            <ShimmerBar width={overallProgress} color={colors.brand.gold} />
          </GlassCard>
        </View>

        {/* Capability Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>能力图谱</Text>
          {capabilities.map((cap) => (
            <GlassCard key={cap.id} style={styles.capabilityCard}>
              <View style={styles.capHeader}>
                <Text style={styles.capName}>{cap.name}</Text>
                <Text style={[styles.capLevel, { color: cap.color }]}>{cap.level}%</Text>
              </View>
              <ShimmerBar width={cap.level} color={cap.color} />
            </GlassCard>
          ))}
        </View>

        {/* Training Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>训练任务</Text>
            <Pressable
              onPress={() => {
                hapticMedium();
              }}
            >
              <Text style={styles.addNew}>+ 新建</Text>
            </Pressable>
          </View>
          
          {trainingSessions.map((session) => (
            <GlassCard
              key={session.id}
              style={styles.sessionCard}
              onPress={() => hapticMedium()}
            >
              <View style={styles.sessionHeader}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionSource}>{session.source}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    session.status === 'completed' && styles.completedBadge,
                  ]}
                >
                  {session.status === 'training' ? (
                    <Feather name="loader" size={14} color={colors.brand.gold} />
                  ) : (
                    <Feather name="check" size={14} color={colors.status.success} />
                  )}
                </View>
              </View>
              
              <View style={styles.sessionStats}>
                <Text style={styles.sessionStat}>{session.docsCount} 文档</Text>
                <Text style={styles.sessionStat}>{session.progress}% 完成</Text>
              </View>
              
              <ShimmerBar
                width={session.progress}
                color={session.status === 'completed' ? colors.status.success : colors.brand.gold}
              />
            </GlassCard>
          ))}
        </View>

        {/* Knowledge Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>知识来源</Text>
          <View style={styles.sourcesGrid}>
            {[
              { icon: 'file-text', label: '内部文档', count: 1234 },
              { icon: 'message-circle', label: '对话记录', count: 5678 },
              { icon: 'globe', label: '网页抓取', count: 892 },
              { icon: 'database', label: '业务数据', count: 12456 },
            ].map((source) => (
              <GlassCard key={source.label} style={styles.sourceCard}>
                <Feather name={source.icon as any} size={24} color={colors.brand.gold} />
                <Text style={styles.sourceLabel}>{source.label}</Text>
                <Text style={styles.sourceCount}>{source.count.toLocaleString()}</Text>
              </GlassCard>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  headerRight: {
    width: 44,
  },
  brainContainer: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  particle: {
    position: 'absolute',
    bottom: 20,
  },
  particleGradient: {
    width: 6,
    height: 20,
    borderRadius: 3,
  },
  outerRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.gold,
  },
  brainCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    ...shadows.glow,
  },
  brainGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neuralNode: {
    position: 'absolute',
    alignItems: 'center',
  },
  nodeCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  nodeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  nodeLevel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  statsContainer: {
    marginBottom: spacing.xl,
  },
  overallCard: {
    paddingVertical: spacing.xl,
  },
  overallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  overallLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: typography.fontSize.sm,
    color: colors.status.success,
    fontWeight: typography.fontWeight.semibold,
  },
  overallValue: {
    fontSize: typography.fontSize['5xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.brand.gold,
    marginBottom: spacing.md,
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
    marginBottom: spacing.lg,
  },
  addNew: {
    fontSize: typography.fontSize.sm,
    color: colors.brand.gold,
    fontWeight: typography.fontWeight.semibold,
  },
  capabilityCard: {
    marginBottom: spacing.md,
  },
  capHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  capName: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  capLevel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  progressBarContainer: {
    height: 8,
    marginTop: spacing.sm,
  },
  progressBarBg: {
    height: '100%',
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
  },
  sessionCard: {
    marginBottom: spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  sessionSource: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.overlay.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    backgroundColor: colors.status.success + '20',
  },
  sessionStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  sessionStat: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  sourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  sourceCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 2 - spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  sourceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  sourceCount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
});

export default AITrainingScreen;
