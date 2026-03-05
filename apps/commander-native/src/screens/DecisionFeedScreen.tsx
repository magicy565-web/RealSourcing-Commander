import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { hapticSuccess, hapticMedium, hapticHeavy, hapticWarning } from '../utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

// Decision card data
const initialDecisions = [
  {
    id: '1',
    type: 'approval' as const,
    title: '供应商合同续签',
    description: '深圳华强供应链申请续签年度合同，报价较去年降低5%',
    amount: '¥2,450,000',
    agent: 'Scout',
    urgency: 'high' as const,
    aiRecommendation: '建议批准：该供应商过去3年准时交付率99.2%',
    timestamp: '10分钟前',
  },
  {
    id: '2',
    type: 'review' as const,
    title: '新产品线投资提案',
    description: '市场部建议开拓智能家居产品线，预计投资回报周期18个月',
    amount: '¥8,000,000',
    agent: 'Analyst',
    urgency: 'medium' as const,
    aiRecommendation: '需要审慎考虑：市场竞争激烈，建议先小规模试点',
    timestamp: '1小时前',
  },
  {
    id: '3',
    type: 'approval' as const,
    title: '招聘高级工程师',
    description: 'HR推荐候选人张明，10年经验，期望薪资45K/月',
    amount: '¥540,000/年',
    agent: 'Writer',
    urgency: 'low' as const,
    aiRecommendation: '建议批准：候选人背景符合需求，薪资在预算范围内',
    timestamp: '3小时前',
  },
  {
    id: '4',
    type: 'urgent' as const,
    title: '紧急：服务器扩容',
    description: '当前服务器负载达85%，需要紧急扩容以应对促销活动',
    amount: '¥180,000',
    agent: 'Scout',
    urgency: 'urgent' as const,
    aiRecommendation: '强烈建议立即批准：延迟可能导致系统崩溃',
    timestamp: '刚刚',
  },
];

interface Decision {
  id: string;
  type: 'approval' | 'review' | 'urgent';
  title: string;
  description: string;
  amount: string;
  agent: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  aiRecommendation: string;
  timestamp: string;
}

interface DecisionCardProps {
  decision: Decision;
  onApprove: () => void;
  onReject: () => void;
  onExpand: () => void;
  isExpanded: boolean;
}

const DecisionCard: React.FC<DecisionCardProps> = ({
  decision,
  onApprove,
  onReject,
  onExpand,
  isExpanded,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const cardRotate = useSharedValue(0);
  const approveOpacity = useSharedValue(0);
  const rejectOpacity = useSharedValue(0);
  const expandScale = useSharedValue(1);
  const expandY = useSharedValue(0);

  const handleApprove = useCallback(() => {
    hapticSuccess();
    onApprove();
  }, [onApprove]);

  const handleReject = useCallback(() => {
    hapticWarning();
    onReject();
  }, [onReject]);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      cardRotate.value = interpolate(
        translateX.value,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-15, 0, 15],
        Extrapolate.CLAMP
      );
      approveOpacity.value = interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD],
        [0, 1],
        Extrapolate.CLAMP
      );
      rejectOpacity.value = interpolate(
        translateX.value,
        [-SWIPE_THRESHOLD, 0],
        [1, 0],
        Extrapolate.CLAMP
      );
    },
    onEnd: (event) => {
      if (translateX.value > SWIPE_THRESHOLD) {
        // Approve animation - satisfying burst to the right
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 15 });
        scale.value = withSequence(
          withSpring(1.1, { damping: 10 }),
          withSpring(0.8, { damping: 15 })
        );
        opacity.value = withDelay(200, withTiming(0, { duration: 200 }));
        runOnJS(handleApprove)();
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        // Reject animation - gentle slide to the side (put aside, not delete)
        translateX.value = withSpring(-SCREEN_WIDTH * 0.3, { damping: 20 });
        opacity.value = withTiming(0.3, { duration: 300 });
        runOnJS(handleReject)();
      } else {
        // Reset
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        cardRotate.value = withSpring(0, { damping: 15 });
        approveOpacity.value = withTiming(0, { duration: 150 });
        rejectOpacity.value = withTiming(0, { duration: 150 });
      }
    },
  });

  // Long press expand animation
  const handleLongPress = () => {
    hapticHeavy();
    expandScale.value = withSpring(1.05, { damping: 12, stiffness: 100 });
    expandY.value = withSpring(-20, { damping: 12 });
    onExpand();
  };

  const handlePressOut = () => {
    if (isExpanded) return;
    expandScale.value = withSpring(1, { damping: 15 });
    expandY.value = withSpring(0, { damping: 15 });
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + expandY.value },
      { rotate: `${cardRotate.value}deg` },
      { scale: scale.value * expandScale.value },
    ],
    opacity: opacity.value,
  }));

  const approveIndicatorStyle = useAnimatedStyle(() => ({
    opacity: approveOpacity.value,
    transform: [{ scale: interpolate(approveOpacity.value, [0, 1], [0.5, 1]) }],
  }));

  const rejectIndicatorStyle = useAnimatedStyle(() => ({
    opacity: rejectOpacity.value,
    transform: [{ scale: interpolate(rejectOpacity.value, [0, 1], [0.5, 1]) }],
  }));

  const urgencyColor = {
    low: colors.accent.blue,
    medium: colors.status.warning,
    high: colors.status.error,
    urgent: colors.status.error,
  }[decision.urgency];

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.cardContainer, cardStyle]}>
        <Pressable
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
          delayLongPress={300}
        >
          <LinearGradient
            colors={[colors.background.tertiary, colors.background.secondary]}
            style={styles.card}
          >
            {/* Swipe indicators */}
            <Animated.View style={[styles.approveIndicator, approveIndicatorStyle]}>
              <Feather name="check" size={40} color={colors.status.success} />
              <Text style={styles.indicatorText}>批准</Text>
            </Animated.View>
            
            <Animated.View style={[styles.rejectIndicator, rejectIndicatorStyle]}>
              <Feather name="clock" size={40} color={colors.status.warning} />
              <Text style={styles.indicatorText}>稍后</Text>
            </Animated.View>

            {/* Card header */}
            <View style={styles.cardHeader}>
              <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
                <Text style={styles.urgencyText}>
                  {decision.urgency === 'urgent' ? '紧急' : decision.type === 'approval' ? '待批准' : '待审核'}
                </Text>
              </View>
              <Text style={styles.timestamp}>{decision.timestamp}</Text>
            </View>

            {/* Card content */}
            <Text style={styles.cardTitle}>{decision.title}</Text>
            <Text style={styles.cardDescription}>{decision.description}</Text>
            
            {/* Amount */}
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>涉及金额</Text>
              <Text style={styles.amountValue}>{decision.amount}</Text>
            </View>

            {/* AI Recommendation */}
            <View style={styles.aiRecommendation}>
              <View style={styles.aiHeader}>
                <Feather name="cpu" size={16} color={colors.brand.gold} />
                <Text style={styles.aiLabel}>AI 建议</Text>
              </View>
              <Text style={styles.aiText}>{decision.aiRecommendation}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <Pressable
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => {
                  hapticMedium();
                  translateX.value = withSpring(-SCREEN_WIDTH * 0.3, { damping: 20 });
                  opacity.value = withTiming(0.3, { duration: 300 });
                  handleReject();
                }}
              >
                <Feather name="clock" size={20} color={colors.status.warning} />
                <Text style={[styles.actionBtnText, { color: colors.status.warning }]}>稍后处理</Text>
              </Pressable>
              
              <Pressable
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => {
                  hapticSuccess();
                  translateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 15 });
                  scale.value = withSequence(
                    withSpring(1.1, { damping: 10 }),
                    withSpring(0.8, { damping: 15 })
                  );
                  opacity.value = withDelay(200, withTiming(0, { duration: 200 }));
                  handleApprove();
                }}
              >
                <Feather name="check" size={20} color={colors.text.inverse} />
                <Text style={[styles.actionBtnText, { color: colors.text.inverse }]}>批准</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </PanGestureHandler>
  );
};

interface DecisionFeedScreenProps {
  navigation: any;
}

export const DecisionFeedScreen: React.FC<DecisionFeedScreenProps> = ({ navigation }) => {
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);

  const handleApprove = (id: string) => {
    setTimeout(() => {
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      setCompletedCount((prev) => prev + 1);
    }, 400);
  };

  const handleReject = (id: string) => {
    setTimeout(() => {
      setDecisions((prev) => prev.filter((d) => d.id !== id));
    }, 400);
  };

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, '#0F0F18', colors.background.primary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>决策中心</Text>
          <Text style={styles.headerSubtitle}>
            {decisions.length} 项待处理 · 今日已完成 {completedCount}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <View style={styles.instructionItem}>
          <Feather name="arrow-right" size={16} color={colors.status.success} />
          <Text style={styles.instructionText}>右滑批准</Text>
        </View>
        <View style={styles.instructionItem}>
          <Feather name="arrow-left" size={16} color={colors.status.warning} />
          <Text style={styles.instructionText}>左滑稍后</Text>
        </View>
        <View style={styles.instructionItem}>
          <Feather name="maximize-2" size={16} color={colors.text.secondary} />
          <Text style={styles.instructionText}>长按详情</Text>
        </View>
      </View>

      {/* Decision cards */}
      <View style={styles.cardsContainer}>
        {decisions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={64} color={colors.brand.gold} />
            <Text style={styles.emptyTitle}>全部处理完毕</Text>
            <Text style={styles.emptySubtitle}>今日已完成 {completedCount} 项决策</Text>
          </View>
        ) : (
          decisions.map((decision, index) => (
            <View
              key={decision.id}
              style={[
                styles.cardWrapper,
                { zIndex: decisions.length - index },
              ]}
            >
              <DecisionCard
                decision={decision}
                onApprove={() => handleApprove(decision.id)}
                onReject={() => handleReject(decision.id)}
                onExpand={() => handleExpand(decision.id)}
                isExpanded={expandedId === decision.id}
              />
            </View>
          ))
        )}
      </View>

      {/* Progress indicator */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(completedCount / (completedCount + decisions.length)) * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },
  instructions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    marginHorizontal: spacing.lg,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  instructionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  cardWrapper: {
    position: 'absolute',
  },
  cardContainer: {
    width: CARD_WIDTH,
    ...shadows.lg,
  },
  card: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  approveIndicator: {
    position: 'absolute',
    left: spacing.xl,
    top: '40%',
    alignItems: 'center',
  },
  rejectIndicator: {
    position: 'absolute',
    right: spacing.xl,
    top: '40%',
    alignItems: 'center',
  },
  indicatorText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  urgencyBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  urgencyText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  timestamp: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  cardTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.lg,
  },
  amountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  amountValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.brand.gold,
  },
  aiRecommendation: {
    backgroundColor: colors.overlay.light,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  aiLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.gold,
  },
  aiText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  rejectBtn: {
    backgroundColor: colors.overlay.light,
    borderWidth: 1,
    borderColor: colors.status.warning,
  },
  approveBtn: {
    backgroundColor: colors.status.success,
  },
  actionBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.background.tertiary,
    marginHorizontal: spacing.lg,
    marginBottom: 100,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand.gold,
    borderRadius: 2,
  },
});

export default DecisionFeedScreen;
