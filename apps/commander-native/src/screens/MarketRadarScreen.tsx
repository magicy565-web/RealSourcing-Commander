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
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { hapticMedium, hapticLight } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_SIZE = SCREEN_WIDTH * 0.85;

// Market signals data
const marketSignals = [
  {
    id: '1',
    type: 'opportunity' as const,
    title: '竞争对手降价',
    description: 'XX公司主力产品价格下调15%',
    impact: 'high' as const,
    distance: 0.3, // 0-1, closer = more urgent
    angle: 45,
    source: '市场监测',
    time: '2小时前',
  },
  {
    id: '2',
    type: 'threat' as const,
    title: '原材料涨价预警',
    description: '铜价预计下月上涨8-12%',
    impact: 'medium' as const,
    distance: 0.5,
    angle: 120,
    source: '供应链分析',
    time: '4小时前',
  },
  {
    id: '3',
    type: 'opportunity' as const,
    title: '新兴市场机会',
    description: '东南亚市场需求增长23%',
    impact: 'high' as const,
    distance: 0.6,
    angle: 200,
    source: 'Scout Agent',
    time: '6小时前',
  },
  {
    id: '4',
    type: 'info' as const,
    title: '政策动向',
    description: '新能源补贴政策延续至2026年',
    impact: 'low' as const,
    distance: 0.8,
    angle: 280,
    source: '政策监测',
    time: '1天前',
  },
  {
    id: '5',
    type: 'threat' as const,
    title: '客户流失风险',
    description: '重点客户接触竞品频率上升',
    impact: 'urgent' as const,
    distance: 0.2,
    angle: 330,
    source: '客户洞察',
    time: '30分钟前',
  },
];

// Radar sweep animation
const RadarSweep: React.FC = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.sweepContainer, sweepStyle]}>
      <LinearGradient
        colors={['transparent', colors.brand.gold + '40', colors.brand.gold]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 0 }}
        style={styles.sweepGradient}
      />
    </Animated.View>
  );
};

// Sonar pulse rings
const SonarPulse: React.FC<{ delay: number }> = ({ delay }) => {
  const scale = useSharedValue(0.1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, { duration: 3000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.sonarPulse, pulseStyle]} />;
};

// Signal blip on radar
const SignalBlip: React.FC<{
  signal: typeof marketSignals[0];
  onPress: () => void;
}> = ({ signal, onPress }) => {
  const blipScale = useSharedValue(1);
  const blipOpacity = useSharedValue(1);

  useEffect(() => {
    if (signal.impact === 'urgent' || signal.impact === 'high') {
      blipScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
      blipOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [signal.impact]);

  const blipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blipScale.value }],
    opacity: blipOpacity.value,
  }));

  const angle = (signal.angle * Math.PI) / 180;
  const radius = (RADAR_SIZE / 2 - 30) * signal.distance;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const blipColor = {
    opportunity: colors.status.success,
    threat: colors.status.error,
    info: colors.accent.blue,
  }[signal.type];

  const impactSize = {
    low: 8,
    medium: 12,
    high: 16,
    urgent: 20,
  }[signal.impact];

  return (
    <Pressable
      onPress={() => {
        hapticMedium();
        onPress();
      }}
      style={[
        styles.blipContainer,
        { transform: [{ translateX: x }, { translateY: y }] },
      ]}
    >
      <Animated.View
        style={[
          styles.blip,
          {
            width: impactSize,
            height: impactSize,
            borderRadius: impactSize / 2,
            backgroundColor: blipColor,
          },
          blipStyle,
        ]}
      />
      {signal.impact === 'urgent' && (
        <View style={[styles.blipRing, { borderColor: blipColor }]} />
      )}
    </Pressable>
  );
};

interface MarketRadarScreenProps {
  navigation: any;
}

export const MarketRadarScreen: React.FC<MarketRadarScreenProps> = ({ navigation }) => {
  const [selectedSignal, setSelectedSignal] = useState<typeof marketSignals[0] | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'opportunity' | 'threat' | 'info'>('all');

  const filteredSignals = marketSignals.filter(
    (s) => activeFilter === 'all' || s.type === activeFilter
  );

  const signalCounts = {
    opportunity: marketSignals.filter((s) => s.type === 'opportunity').length,
    threat: marketSignals.filter((s) => s.type === 'threat').length,
    info: marketSignals.filter((s) => s.type === 'info').length,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, '#0A0F14', colors.background.primary]}
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
          <Text style={styles.headerTitle}>市场雷达</Text>
          <Pressable style={styles.settingsBtn}>
            <Feather name="sliders" size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        {/* Radar visualization */}
        <View style={styles.radarContainer}>
          {/* Radar background circles */}
          <View style={styles.radarBg}>
            {[0.25, 0.5, 0.75, 1].map((scale, i) => (
              <View
                key={i}
                style={[
                  styles.radarCircle,
                  {
                    width: RADAR_SIZE * scale,
                    height: RADAR_SIZE * scale,
                    borderRadius: (RADAR_SIZE * scale) / 2,
                  },
                ]}
              />
            ))}
            
            {/* Cross lines */}
            <View style={styles.crossLineH} />
            <View style={styles.crossLineV} />
            
            {/* Sonar pulses */}
            <SonarPulse delay={0} />
            <SonarPulse delay={1000} />
            <SonarPulse delay={2000} />
            
            {/* Radar sweep */}
            <RadarSweep />
            
            {/* Center dot */}
            <View style={styles.centerDot}>
              <View style={styles.centerDotInner} />
            </View>
            
            {/* Signal blips */}
            {filteredSignals.map((signal) => (
              <SignalBlip
                key={signal.id}
                signal={signal}
                onPress={() => setSelectedSignal(signal)}
              />
            ))}
          </View>
        </View>

        {/* Signal type filters */}
        <View style={styles.filters}>
          {[
            { key: 'all', label: '全部', count: marketSignals.length },
            { key: 'opportunity', label: '机会', count: signalCounts.opportunity, color: colors.status.success },
            { key: 'threat', label: '威胁', count: signalCounts.threat, color: colors.status.error },
            { key: 'info', label: '资讯', count: signalCounts.info, color: colors.accent.blue },
          ].map((filter) => (
            <Pressable
              key={filter.key}
              style={[
                styles.filterBtn,
                activeFilter === filter.key && styles.filterBtnActive,
              ]}
              onPress={() => {
                hapticLight();
                setActiveFilter(filter.key as any);
              }}
            >
              {filter.color && (
                <View style={[styles.filterDot, { backgroundColor: filter.color }]} />
              )}
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.key && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
              <Text style={styles.filterCount}>{filter.count}</Text>
            </Pressable>
          ))}
        </View>

        {/* Selected signal detail */}
        {selectedSignal && (
          <GlassCard style={styles.detailCard} elevated glowColor={
            selectedSignal.type === 'opportunity' ? colors.status.success :
            selectedSignal.type === 'threat' ? colors.status.error : colors.accent.blue
          }>
            <View style={styles.detailHeader}>
              <View style={[
                styles.detailBadge,
                { backgroundColor: 
                  selectedSignal.type === 'opportunity' ? colors.status.success :
                  selectedSignal.type === 'threat' ? colors.status.error : colors.accent.blue
                },
              ]}>
                <Text style={styles.detailBadgeText}>
                  {selectedSignal.type === 'opportunity' ? '机会' :
                   selectedSignal.type === 'threat' ? '威胁' : '资讯'}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedSignal(null)}>
                <Feather name="x" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
            <Text style={styles.detailTitle}>{selectedSignal.title}</Text>
            <Text style={styles.detailDesc}>{selectedSignal.description}</Text>
            <View style={styles.detailMeta}>
              <View style={styles.metaItem}>
                <Feather name="radio" size={14} color={colors.text.tertiary} />
                <Text style={styles.metaText}>{selectedSignal.source}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="clock" size={14} color={colors.text.tertiary} />
                <Text style={styles.metaText}>{selectedSignal.time}</Text>
              </View>
            </View>
            <View style={styles.detailActions}>
              <Pressable style={styles.detailBtn}>
                <Text style={styles.detailBtnText}>查看详情</Text>
              </Pressable>
              <Pressable style={[styles.detailBtn, styles.detailBtnPrimary]}>
                <Text style={styles.detailBtnTextPrimary}>制定策略</Text>
              </Pressable>
            </View>
          </GlassCard>
        )}

        {/* Recent signals list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>信号时间线</Text>
          {filteredSignals.map((signal, index) => (
            <GlassCard
              key={signal.id}
              style={styles.signalCard}
              onPress={() => setSelectedSignal(signal)}
            >
              <View style={styles.signalRow}>
                <View style={[
                  styles.signalIndicator,
                  { backgroundColor: 
                    signal.type === 'opportunity' ? colors.status.success :
                    signal.type === 'threat' ? colors.status.error : colors.accent.blue
                  },
                ]} />
                <View style={styles.signalContent}>
                  <Text style={styles.signalTitle}>{signal.title}</Text>
                  <Text style={styles.signalDesc} numberOfLines={1}>
                    {signal.description}
                  </Text>
                </View>
                <View style={styles.signalTime}>
                  <Text style={styles.timeText}>{signal.time}</Text>
                  {(signal.impact === 'urgent' || signal.impact === 'high') && (
                    <View style={styles.urgentDot} />
                  )}
                </View>
              </View>
            </GlassCard>
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
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  radarBg: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.brand.gold + '20',
  },
  crossLineH: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: 1,
    backgroundColor: colors.brand.gold + '15',
  },
  crossLineV: {
    position: 'absolute',
    width: 1,
    height: RADAR_SIZE,
    backgroundColor: colors.brand.gold + '15',
  },
  sweepContainer: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE / 2,
    bottom: RADAR_SIZE / 2,
    transformOrigin: 'bottom',
  },
  sweepGradient: {
    width: '50%',
    height: '100%',
    marginLeft: '50%',
  },
  sonarPulse: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.brand.gold + '30',
  },
  centerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.gold + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.gold,
  },
  blipContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blip: {
    ...shadows.glow,
  },
  blipRing: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    opacity: 0.5,
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
  },
  filterBtnActive: {
    backgroundColor: colors.brand.gold + '20',
    borderWidth: 1,
    borderColor: colors.brand.gold,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  filterTextActive: {
    color: colors.brand.gold,
    fontWeight: typography.fontWeight.semibold,
  },
  filterCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginLeft: 2,
  },
  detailCard: {
    marginBottom: spacing.xl,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  detailBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  detailTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  detailDesc: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing.md,
  },
  detailMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  detailActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
  },
  detailBtnPrimary: {
    backgroundColor: colors.brand.gold,
  },
  detailBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  detailBtnTextPrimary: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
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
  signalCard: {
    marginBottom: spacing.md,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  signalContent: {
    flex: 1,
  },
  signalTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  signalDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  signalTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.status.error,
    marginTop: 4,
  },
});

export default MarketRadarScreen;
