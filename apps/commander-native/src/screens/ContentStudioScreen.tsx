import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  FadeInDown,
  FadeInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { hapticLight, hapticMedium } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 内容数据
const contentItems = [
  {
    id: '1',
    title: '2024年供应链趋势报告',
    type: 'article',
    status: 'published',
    engagement: 2847,
    thumbnail: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200',
    publishedAt: '2小时前',
  },
  {
    id: '2',
    title: '采购成本优化策略',
    type: 'video',
    status: 'draft',
    engagement: 0,
    thumbnail: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=200',
    publishedAt: null,
  },
  {
    id: '3',
    title: '供应商评估白皮书',
    type: 'document',
    status: 'scheduled',
    engagement: 0,
    thumbnail: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=200',
    publishedAt: '明天 10:00',
  },
  {
    id: '4',
    title: '行业案例分析',
    type: 'article',
    status: 'published',
    engagement: 1523,
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200',
    publishedAt: '1天前',
  },
];

// AI 建议
const aiSuggestions = [
  {
    id: '1',
    title: '热门话题建议',
    description: '根据行业趋势，建议发布关于"绿色供应链"的内容',
    icon: 'trending-up',
    color: theme.colors.success,
  },
  {
    id: '2',
    title: '最佳发布时间',
    description: '您的受众在周二上午10点最活跃',
    icon: 'time',
    color: theme.colors.primary,
  },
  {
    id: '3',
    title: '内容优化',
    description: '"采购成本优化"草稿可添加数据图表提升互动',
    icon: 'bulb',
    color: theme.colors.warning,
  },
];

// 内容类型图标
const typeIcons: Record<string, string> = {
  article: 'document-text',
  video: 'play-circle',
  document: 'folder',
};

// 状态颜色
const statusColors: Record<string, string> = {
  published: theme.colors.success,
  draft: theme.colors.textSecondary,
  scheduled: theme.colors.primary,
};

const statusLabels: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  scheduled: '已排期',
};

// AI 建议卡片
const AISuggestionCard = ({ suggestion, index }: { suggestion: typeof aiSuggestions[0]; index: number }) => {
  const scale = useSharedValue(1);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  const handlePress = () => {
    hapticLight();
    scale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 100).springify()}
      style={[styles.suggestionCard, animatedStyle]}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <BlurView intensity={20} tint="dark" style={styles.suggestionBlur}>
          <Animated.View style={[styles.suggestionGlow, shimmerStyle, { backgroundColor: suggestion.color }]} />
          <View style={[styles.suggestionIcon, { backgroundColor: `${suggestion.color}20` }]}>
            <Ionicons name={suggestion.icon as any} size={20} color={suggestion.color} />
          </View>
          <View style={styles.suggestionContent}>
            <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
            <Text style={styles.suggestionDesc}>{suggestion.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

// 内容卡片
const ContentCard = ({ item, index }: { item: typeof contentItems[0]; index: number }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    hapticMedium();
    scale.value = withSequence(
      withSpring(0.97),
      withSpring(1)
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={[styles.contentCard, animatedStyle]}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <BlurView intensity={15} tint="dark" style={styles.contentBlur}>
          <Image source={{ uri: item.thumbnail }} style={styles.contentThumbnail} />
          <View style={styles.contentInfo}>
            <View style={styles.contentHeader}>
              <View style={[styles.typeIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name={typeIcons[item.type] as any} size={14} color={theme.colors.primary} />
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColors[item.status]}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] }]} />
                <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                  {statusLabels[item.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.contentTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.contentMeta}>
              {item.status === 'published' ? (
                <View style={styles.metaItem}>
                  <Ionicons name="eye" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{item.engagement.toLocaleString()}</Text>
                </View>
              ) : (
                <Text style={styles.metaText}>
                  {item.publishedAt || '未排期'}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

// 快速操作按钮
const QuickAction = ({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    hapticMedium();
    scale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity style={styles.quickAction} onPress={handlePress} activeOpacity={0.7}>
        <LinearGradient
          colors={[`${color}30`, `${color}10`]}
          style={styles.quickActionGradient}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon as any} size={24} color={color} />
          </View>
          <Text style={styles.quickActionLabel}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ContentStudioScreen() {
  const [activeFilter, setActiveFilter] = useState('all');
  const filters = ['all', 'published', 'draft', 'scheduled'];
  const filterLabels: Record<string, string> = {
    all: '全部',
    published: '已发布',
    draft: '草稿',
    scheduled: '已排期',
  };

  const filteredContent = activeFilter === 'all'
    ? contentItems
    : contentItems.filter(item => item.status === activeFilter);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, '#0A0A12', theme.colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 标题 */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <Text style={styles.title}>内容工作室</Text>
          <Text style={styles.subtitle}>创作、管理、发布</Text>
        </Animated.View>

        {/* 快速操作 */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.quickActions}>
          <QuickAction
            icon="add-circle"
            label="新建内容"
            color={theme.colors.primary}
            onPress={() => {}}
          />
          <QuickAction
            icon="sparkles"
            label="AI生成"
            color={theme.colors.success}
            onPress={() => {}}
          />
          <QuickAction
            icon="calendar"
            label="排期管理"
            color={theme.colors.warning}
            onPress={() => {}}
          />
        </Animated.View>

        {/* AI 建议 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI 智能建议</Text>
          {aiSuggestions.map((suggestion, index) => (
            <AISuggestionCard key={suggestion.id} suggestion={suggestion} index={index} />
          ))}
        </View>

        {/* 内容筛选 */}
        <View style={styles.filterContainer}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => {
                hapticLight();
                setActiveFilter(filter);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive,
                ]}
              >
                {filterLabels[filter]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 内容列表 */}
        <View style={styles.contentList}>
          {filteredContent.map((item, index) => (
            <ContentCard key={item.id} item={item} index={index} />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  quickAction: {
    flex: 1,
  },
  quickActionGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  suggestionCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  suggestionBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  suggestionGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  suggestionDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: `${theme.colors.primary}20`,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  contentList: {
    gap: 12,
  },
  contentCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  contentBlur: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contentThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  contentInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 20,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  moreButton: {
    padding: 8,
    alignSelf: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
});
