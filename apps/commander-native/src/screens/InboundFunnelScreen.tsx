import React, { useState } from 'react';
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
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { hapticMedium, hapticSuccess } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.xl;
const SWIPE_THRESHOLD = 100;

// Funnel stages
const funnelStages = [
  { id: 'awareness', name: '认知', count: 1250, color: colors.accent.cyan },
  { id: 'interest', name: '兴趣', count: 680, color: colors.accent.blue },
  { id: 'consideration', name: '考虑', count: 245, color: colors.brand.gold },
  { id: 'intent', name: '意向', count: 89, color: colors.status.warning },
  { id: 'purchase', name: '成交', count: 34, color: colors.status.success },
];

// Lead data
const initialLeads = [
  {
    id: '1',
    name: '张伟科技有限公司',
    contact: '王总',
    source: '官网表单',
    stage: 'consideration',
    value: '¥150,000',
    lastActivity: '10分钟前',
    score: 85,
  },
  {
    id: '2',
    name: '创新数字解决方案',
    contact: '李经理',
    source: 'LinkedIn',
    stage: 'intent',
    value: '¥280,000',
    lastActivity: '1小时前',
    score: 92,
  },
  {
    id: '3',
    name: '未来智能制造',
    contact: '陈总监',
    source: '展会',
    stage: 'interest',
    value: '¥75,000',
    lastActivity: '3小时前',
    score: 68,
  },
  {
    id: '4',
    name: '华盛电子商务',
    contact: '刘总',
    source: '转介绍',
    stage: 'consideration',
    value: '¥420,000',
    lastActivity: '昨天',
    score: 78,
  },
];

// Lead card with swipe actions
const LeadCard: React.FC<{
  lead: typeof initialLeads[0];
  onPromote: () => void;
  onDismiss: () => void;
  onPress: () => void;
}> = ({ lead, onPromote, onDismiss, onPress }) => {
  const translateX = useSharedValue(0);
  const promoteOpacity = useSharedValue(0);
  const dismissOpacity = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      promoteOpacity.value = interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD],
        [0, 1],
        Extrapolate.CLAMP
      );
      dismissOpacity.value = interpolate(
        translateX.value,
        [-SWIPE_THRESHOLD, 0],
        [1, 0],
        Extrapolate.CLAMP
      );
    },
    onEnd: () => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH);
        runOnJS(onPromote)();
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH);
        runOnJS(onDismiss)();
      } else {
        translateX.value = withSpring(0);
        promoteOpacity.value = withTiming(0);
        dismissOpacity.value = withTiming(0);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const promoteStyle = useAnimatedStyle(() => ({
    opacity: promoteOpacity.value,
  }));

  const dismissStyle = useAnimatedStyle(() => ({
    opacity: dismissOpacity.value,
  }));

  const scoreColor =
    lead.score >= 80 ? colors.status.success :
    lead.score >= 60 ? colors.status.warning : colors.status.error;

  return (
    <View style={styles.leadCardContainer}>
      {/* Action indicators */}
      <Animated.View style={[styles.actionIndicator, styles.promoteIndicator, promoteStyle]}>
        <Feather name="arrow-up-circle" size={24} color={colors.status.success} />
        <Text style={styles.actionText}>推进</Text>
      </Animated.View>
      <Animated.View style={[styles.actionIndicator, styles.dismissIndicator, dismissStyle]}>
        <Feather name="x-circle" size={24} color={colors.status.error} />
        <Text style={styles.actionText}>丢弃</Text>
      </Animated.View>

      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={cardStyle}>
          <GlassCard style={styles.leadCard} onPress={onPress}>
            <View style={styles.leadHeader}>
              <View style={styles.leadInfo}>
                <Text style={styles.leadName}>{lead.name}</Text>
                <Text style={styles.leadContact}>{lead.contact} · {lead.source}</Text>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
                <Text style={[styles.scoreText, { color: scoreColor }]}>{lead.score}</Text>
              </View>
            </View>

            <View style={styles.leadDetails}>
              <View style={styles.detailItem}>
                <Feather name="dollar-sign" size={14} color={colors.brand.gold} />
                <Text style={styles.detailValue}>{lead.value}</Text>
              </View>
              <View style={styles.detailItem}>
                <Feather name="clock" size={14} color={colors.text.tertiary} />
                <Text style={styles.detailText}>{lead.lastActivity}</Text>
              </View>
            </View>

            <View style={styles.leadActions}>
              <Pressable style={styles.leadActionBtn}>
                <Feather name="phone" size={16} color={colors.text.secondary} />
              </Pressable>
              <Pressable style={styles.leadActionBtn}>
                <Feather name="mail" size={16} color={colors.text.secondary} />
              </Pressable>
              <Pressable style={styles.leadActionBtn}>
                <Feather name="message-circle" size={16} color={colors.text.secondary} />
              </Pressable>
              <Pressable style={[styles.leadActionBtn, styles.primaryActionBtn]}>
                <Feather name="user-plus" size={16} color={colors.text.inverse} />
                <Text style={styles.primaryActionText}>跟进</Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

interface InboundFunnelScreenProps {
  navigation: any;
}

export const InboundFunnelScreen: React.FC<InboundFunnelScreenProps> = ({ navigation }) => {
  const [leads, setLeads] = useState(initialLeads);
  const [activeStage, setActiveStage] = useState('all');

  const filteredLeads = activeStage === 'all'
    ? leads
    : leads.filter((l) => l.stage === activeStage);

  const handlePromote = (id: string) => {
    hapticSuccess();
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const handleDismiss = (id: string) => {
    hapticMedium();
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  // Calculate funnel visualization heights
  const maxCount = Math.max(...funnelStages.map((s) => s.count));

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
          <Text style={styles.headerTitle}>入站漏斗</Text>
          <Pressable style={styles.filterBtn}>
            <Feather name="filter" size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        {/* Funnel visualization */}
        <View style={styles.funnelContainer}>
          <View style={styles.funnelVisual}>
            {funnelStages.map((stage, index) => {
              const width = 100 - index * 15;
              const height = (stage.count / maxCount) * 60 + 20;
              return (
                <Pressable
                  key={stage.id}
                  style={[
                    styles.funnelStage,
                    { width: `${width}%`, minHeight: height },
                  ]}
                  onPress={() => {
                    hapticMedium();
                    setActiveStage(activeStage === stage.id ? 'all' : stage.id);
                  }}
                >
                  <LinearGradient
                    colors={[stage.color + '40', stage.color + '20']}
                    style={[
                      styles.funnelStageGradient,
                      activeStage === stage.id && styles.funnelStageActive,
                      { borderColor: stage.color },
                    ]}
                  >
                    <Text style={styles.funnelStageName}>{stage.name}</Text>
                    <Text style={[styles.funnelStageCount, { color: stage.color }]}>
                      {stage.count}
                    </Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Conversion stats */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>转化率</Text>
            <Text style={[styles.statValue, { color: colors.status.success }]}>2.7%</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>本周新增</Text>
            <Text style={[styles.statValue, { color: colors.accent.blue }]}>+128</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>预计成交</Text>
            <Text style={[styles.statValue, { color: colors.brand.gold }]}>¥1.2M</Text>
          </GlassCard>
        </View>

        {/* Lead list */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeStage === 'all' ? '全部线索' : funnelStages.find((s) => s.id === activeStage)?.name}
            </Text>
            <Text style={styles.leadCount}>{filteredLeads.length} 条</Text>
          </View>

          {/* Swipe instructions */}
          <View style={styles.instructions}>
            <View style={styles.instructionItem}>
              <Feather name="chevrons-right" size={14} color={colors.status.success} />
              <Text style={styles.instructionText}>右滑推进</Text>
            </View>
            <View style={styles.instructionItem}>
              <Feather name="chevrons-left" size={14} color={colors.status.error} />
              <Text style={styles.instructionText}>左滑丢弃</Text>
            </View>
          </View>

          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onPromote={() => handlePromote(lead.id)}
              onDismiss={() => handleDismiss(lead.id)}
              onPress={() => hapticMedium()}
            />
          ))}

          {filteredLeads.length === 0 && (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>暂无线索</Text>
            </View>
          )}
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
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  funnelContainer: {
    marginBottom: spacing.xl,
  },
  funnelVisual: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  funnelStage: {
    alignItems: 'center',
  },
  funnelStageGradient: {
    width: '100%',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  funnelStageActive: {
    borderWidth: 2,
  },
  funnelStageName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  funnelStageCount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  leadCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  instructions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  instructionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  leadCardContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  actionIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  promoteIndicator: {
    left: 0,
  },
  dismissIndicator: {
    right: 0,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  leadCard: {
    backgroundColor: colors.background.tertiary,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  leadContact: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  scoreBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  scoreText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  leadDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.gold,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  leadActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  leadActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    width: 'auto',
    gap: spacing.xs,
    backgroundColor: colors.brand.gold,
    borderRadius: borderRadius.lg,
  },
  primaryActionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
});

export default InboundFunnelScreen;
