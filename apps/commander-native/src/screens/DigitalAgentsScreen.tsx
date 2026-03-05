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
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { hapticMedium } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Agent data
const agents = [
  {
    id: 'scout',
    name: 'Scout',
    role: '市场侦察员',
    description: '实时监控市场动态、竞争对手和行业趋势',
    status: 'online' as const,
    avatar: 'S',
    color: colors.status.success,
    stats: {
      tasksCompleted: 156,
      accuracy: 94,
      responseTime: '< 1分钟',
    },
    currentTasks: [
      '监控竞品价格变动',
      '分析东南亚市场数据',
      '追踪行业政策动向',
    ],
    recentActivity: '发现竞争对手降价信号',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    role: '数据分析师',
    description: '深度分析业务数据，生成洞察报告',
    status: 'busy' as const,
    avatar: 'A',
    color: colors.accent.blue,
    stats: {
      tasksCompleted: 89,
      accuracy: 97,
      responseTime: '< 5分钟',
    },
    currentTasks: [
      '生成季度销售报告',
      '客户行为分析',
    ],
    recentActivity: '完成Q3财务分析报告',
  },
  {
    id: 'writer',
    name: 'Writer',
    role: '内容创作者',
    description: '创作营销内容、产品文案和社媒帖子',
    status: 'online' as const,
    avatar: 'W',
    color: colors.brand.gold,
    stats: {
      tasksCompleted: 234,
      accuracy: 91,
      responseTime: '< 3分钟',
    },
    currentTasks: [
      '撰写产品发布文案',
      '生成社媒内容日历',
      '优化落地页文案',
    ],
    recentActivity: '完成10篇小红书笔记',
  },
  {
    id: 'closer',
    name: 'Closer',
    role: '成交转化专家',
    description: '跟进潜在客户，优化转化流程',
    status: 'idle' as const,
    avatar: 'C',
    color: colors.status.warning,
    stats: {
      tasksCompleted: 67,
      accuracy: 88,
      responseTime: '< 2分钟',
    },
    currentTasks: [
      '跟进高意向客户',
    ],
    recentActivity: '成功转化3个B端客户',
  },
];

// Agent card with breathing animation
const AgentCard: React.FC<{
  agent: typeof agents[0];
  onPress: () => void;
  onChat: () => void;
}> = ({ agent, onPress, onChat }) => {
  const breathScale = useSharedValue(1);

  useEffect(() => {
    if (agent.status === 'online') {
      breathScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        true
      );
    }
  }, [agent.status]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  return (
    <Animated.View style={breathStyle}>
      <GlassCard
        style={styles.agentCard}
        onPress={onPress}
        elevated={agent.status === 'online'}
        glowColor={agent.status === 'online' ? agent.color : undefined}
      >
        <View style={styles.agentHeader}>
          <View style={styles.agentAvatarContainer}>
            <LinearGradient
              colors={[agent.color, agent.color + '80']}
              style={styles.agentAvatar}
            >
              <Text style={styles.avatarText}>{agent.avatar}</Text>
            </LinearGradient>
            {agent.status === 'online' && (
              <View style={[styles.onlineDot, { backgroundColor: colors.status.success }]} />
            )}
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{agent.name}</Text>
            <Text style={styles.agentRole}>{agent.role}</Text>
          </View>
          <StatusBadge status={agent.status} pulse={agent.status === 'online'} />
        </View>

        <Text style={styles.agentDescription}>{agent.description}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{agent.stats.tasksCompleted}</Text>
            <Text style={styles.statLabel}>已完成</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{agent.stats.accuracy}%</Text>
            <Text style={styles.statLabel}>准确率</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{agent.stats.responseTime}</Text>
            <Text style={styles.statLabel}>响应</Text>
          </View>
        </View>

        {/* Current tasks */}
        <View style={styles.tasksSection}>
          <Text style={styles.tasksTitle}>当前任务</Text>
          {agent.currentTasks.map((task, index) => (
            <View key={index} style={styles.taskItem}>
              <View style={[styles.taskDot, { backgroundColor: agent.color }]} />
              <Text style={styles.taskText}>{task}</Text>
            </View>
          ))}
        </View>

        {/* Recent activity */}
        <View style={styles.recentActivity}>
          <Feather name="activity" size={14} color={colors.text.tertiary} />
          <Text style={styles.activityText}>{agent.recentActivity}</Text>
        </View>

        {/* Actions */}
        <View style={styles.agentActions}>
          <Pressable style={styles.actionBtn} onPress={onPress}>
            <Feather name="settings" size={18} color={colors.text.secondary} />
            <Text style={styles.actionText}>配置</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.chatBtn]}
            onPress={() => {
              hapticMedium();
              onChat();
            }}
          >
            <Feather name="message-circle" size={18} color={colors.text.inverse} />
            <Text style={styles.chatBtnText}>对话</Text>
          </Pressable>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

interface DigitalAgentsScreenProps {
  navigation: any;
}

export const DigitalAgentsScreen: React.FC<DigitalAgentsScreenProps> = ({ navigation }) => {
  const onlineCount = agents.filter((a) => a.status === 'online').length;
  const totalTasks = agents.reduce((sum, a) => sum + a.currentTasks.length, 0);

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
          <Text style={styles.headerTitle}>数字员工</Text>
          <Pressable style={styles.addBtn}>
            <Feather name="plus" size={20} color={colors.brand.gold} />
          </Pressable>
        </View>

        {/* Overview stats */}
        <View style={styles.overviewRow}>
          <GlassCard style={styles.overviewCard}>
            <Text style={[styles.overviewValue, { color: colors.status.success }]}>
              {onlineCount}
            </Text>
            <Text style={styles.overviewLabel}>在线</Text>
          </GlassCard>
          <GlassCard style={styles.overviewCard}>
            <Text style={[styles.overviewValue, { color: colors.brand.gold }]}>
              {agents.length}
            </Text>
            <Text style={styles.overviewLabel}>总数</Text>
          </GlassCard>
          <GlassCard style={styles.overviewCard}>
            <Text style={[styles.overviewValue, { color: colors.accent.blue }]}>
              {totalTasks}
            </Text>
            <Text style={styles.overviewLabel}>任务</Text>
          </GlassCard>
        </View>

        {/* Agent list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>团队成员</Text>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onPress={() => hapticMedium()}
              onChat={() => navigation.navigate('CommanderChat', { agentId: agent.id })}
            />
          ))}
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  overviewCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  overviewValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
  },
  overviewLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  agentCard: {
    marginBottom: spacing.lg,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  agentAvatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  agentRole: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  agentDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlay.light,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.default,
  },
  tasksSection: {
    marginBottom: spacing.md,
  },
  tasksTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  taskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  recentActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    marginBottom: spacing.md,
  },
  activityText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  agentActions: {
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
    backgroundColor: colors.background.tertiary,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  chatBtn: {
    backgroundColor: colors.brand.gold,
  },
  chatBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
});

export default DigitalAgentsScreen;
