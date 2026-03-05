/**
 * DecisionFeed — AI 决策卡片流
 * 核心交互：左滑驳回（暂搁置）/ 右滑确认 / 长按展开
 */
import { useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolate, Extrapolation } from 'react-native-reanimated';
import { Check, X, ChevronDown, ChevronUp, Zap, TrendingUp, Globe, Sparkles } from 'lucide-react-native';
import { hapticSuccess, hapticLight, hapticMedium, hapticWarning } from '@/constants/haptics';
import { C } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

type DecisionType = 'opportunity' | 'lead' | 'content' | 'optimization' | 'alert';
type Urgency = 'low' | 'medium' | 'high';

interface DecisionCard {
  id: string;
  type: DecisionType;
  title: string;
  summary: string;
  source: string;
  urgency: Urgency;
  metrics?: { label: string; value: string; trend?: 'up' | 'down' }[];
  aiReasoning?: string;
  suggestedAction?: string;
  estimatedValue?: string;
}

const MOCK_CARDS: DecisionCard[] = [
  {
    id: '1', type: 'opportunity',
    title: '沙特不锈钢餐具需求激增 15%',
    summary: '海关数据显示沙特 2026 年基建预算增加，工业管材需求旺盛，12 家采购商正在寻源。',
    source: '火山引擎 · 中东海关数据',
    urgency: 'high',
    metrics: [{ label: '匹配采购商', value: '12家', trend: 'up' }, { label: '预估询盘价值', value: '$48K', trend: 'up' }],
    aiReasoning: '基于过去 6 个月的海关进出口数据，结合您的产品目录，AI 判断此市场机会匹配度达 94%。',
    suggestedAction: '生成《沙特基建市场渗透报告》',
    estimatedValue: '$48,000',
  },
  {
    id: '2', type: 'lead',
    title: '高意向买家 Ahmed Al-Rashid 待跟进',
    summary: 'LinkedIn 上的沙特采购总监，已浏览您的产品页 3 次，停留时长 8 分钟，意向信号强烈。',
    source: 'LinkedIn · AI 行为分析',
    urgency: 'high',
    metrics: [{ label: '意向评分', value: '94分', trend: 'up' }, { label: '最佳联系窗口', value: '今日 14:00-16:00' }],
    suggestedAction: '发送个性化 WhatsApp 开场白',
    estimatedValue: '$25,000',
  },
  {
    id: '3', type: 'content',
    title: '产品图册中东点击率低于均值',
    summary: '当前图册在中东市场点击率 2.3%，行业均值 4.8%。AI 建议调整为「沙漠奢华风」视觉风格。',
    source: 'RealSourcing · Flux AI',
    urgency: 'medium',
    metrics: [{ label: '当前点击率', value: '2.3%', trend: 'down' }, { label: '行业均值', value: '4.8%' }, { label: '预期提升', value: '+2.1x', trend: 'up' }],
    suggestedAction: '重新生成中东风格图册',
  },
];

const TYPE_CONFIG = {
  opportunity: { color: C.green, label: '市场机会', icon: Globe },
  lead: { color: C.amber, label: '高意向买家', icon: Zap },
  content: { color: C.blue, label: '内容优化', icon: Sparkles },
  optimization: { color: C.PL, label: '流程优化', icon: TrendingUp },
  alert: { color: C.red, label: '紧急提醒', icon: Zap },
};

const URGENCY_COLOR = { low: C.t3, medium: C.amber, high: C.red };

function SwipeableCard({ card, onConfirm, onDismiss }: {
  card: DecisionCard;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const translateX = useSharedValue(0);
  const config = TYPE_CONFIG[card.type];

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > 100) {
        translateX.value = withSpring(SCREEN_W);
        runOnJS(hapticSuccess)();
        runOnJS(onConfirm)(card.id);
      } else if (e.translationX < -100) {
        translateX.value = withSpring(-SCREEN_W);
        runOnJS(hapticWarning)();
        runOnJS(onDismiss)(card.id);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const bgStyle = useAnimatedStyle(() => {
    const confirmOpacity = interpolate(translateX.value, [0, 100], [0, 1], Extrapolation.CLAMP);
    const dismissOpacity = interpolate(translateX.value, [-100, 0], [1, 0], Extrapolation.CLAMP);
    return { opacity: Math.max(confirmOpacity, dismissOpacity) };
  });

  return (
    <View style={{ marginBottom: 12, position: 'relative' }}>
      {/* Swipe hint background */}
      <Animated.View style={[{ position: 'absolute', inset: 0, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 }, bgStyle]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Check size={24} color={C.green} />
          <Text style={{ color: C.green, fontWeight: '700' }}>确认执行</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: C.red, fontWeight: '700' }}>暂时搁置</Text>
          <X size={24} color={C.red} />
        </View>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View style={animStyle}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: card.urgency === 'high' ? config.color + '40' : 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}>
            {/* Top accent bar */}
            <View style={{ height: 3, backgroundColor: config.color }} />

            <View style={{ padding: 18 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={{ backgroundColor: config.color + '20', borderRadius: 8, padding: 6 }}>
                    <config.icon size={14} color={config.color} />
                  </View>
                  <Text style={{ color: config.color, fontSize: 12, fontWeight: '600' }}>{config.label}</Text>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: URGENCY_COLOR[card.urgency] }} />
                </View>
                <Text style={{ color: C.t3, fontSize: 11 }}>{card.source}</Text>
              </View>

              <Text style={{ color: C.t1, fontSize: 16, fontWeight: '700', marginBottom: 8, lineHeight: 22 }}>{card.title}</Text>
              <Text style={{ color: C.t2, fontSize: 13, lineHeight: 19 }}>{card.summary}</Text>

              {/* Metrics */}
              {card.metrics && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  {card.metrics.map(m => (
                    <View key={m.label} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ color: C.t2, fontSize: 10 }}>{m.label}</Text>
                      <Text style={{ color: m.trend === 'up' ? C.green : m.trend === 'down' ? C.red : C.t1, fontSize: 14, fontWeight: '700' }}>{m.value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Expand/Collapse */}
              {card.aiReasoning && (
                <Pressable
                  onPress={() => { hapticLight(); setExpanded(!expanded); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 }}
                >
                  <Text style={{ color: C.PL, fontSize: 12 }}>AI 决策依据</Text>
                  {expanded ? <ChevronUp size={14} color={C.PL} /> : <ChevronDown size={14} color={C.PL} />}
                </Pressable>
              )}

              {expanded && card.aiReasoning && (
                <MotiView
                  from={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' as any }}
                  style={{ marginTop: 10, padding: 12, backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 12, borderLeftWidth: 2, borderLeftColor: C.PL }}
                >
                  <Text style={{ color: C.t2, fontSize: 12, lineHeight: 18 }}>{card.aiReasoning}</Text>
                </MotiView>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable
                  onPress={() => { hapticSuccess(); onConfirm(card.id); }}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={[config.color, config.color + 'cc']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                      {card.suggestedAction ?? '确认执行'}
                    </Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={() => { hapticLight(); onDismiss(card.id); }}
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' }}
                >
                  <Text style={{ color: C.t2, fontWeight: '600', fontSize: 14 }}>暂不</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function DecisionFeedScreen() {
  const [cards, setCards] = useState(MOCK_CARDS);
  const [confirmed, setConfirmed] = useState<string[]>([]);

  const handleConfirm = (id: string) => {
    setConfirmed(prev => [...prev, id]);
    setTimeout(() => setCards(prev => prev.filter(c => c.id !== id)), 300);
  };

  const handleDismiss = (id: string) => {
    setTimeout(() => setCards(prev => prev.filter(c => c.id !== id)), 300);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: C.t1, fontSize: 22, fontWeight: '700' }}>决策中心</Text>
            <Text style={{ color: C.t2, fontSize: 13, marginTop: 2 }}>AI 正在为您主动发现商机</Text>
          </View>
          <View style={{ backgroundColor: C.red + '30', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }}>{cards.length} 待处理</Text>
          </View>
        </View>

        {/* Swipe hint */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
          <Text style={{ color: C.t3, fontSize: 11 }}>← 右滑确认</Text>
          <Text style={{ color: C.t3, fontSize: 11 }}>左滑搁置 →</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
          <AnimatePresence>
            {cards.map((card, i) => (
              <MotiView
                key={card.id}
                from={{ opacity: 0, translateY: 30 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 100, type: 'spring', stiffness: 300, damping: 25 }}
              >
                <SwipeableCard card={card} onConfirm={handleConfirm} onDismiss={handleDismiss} />
              </MotiView>
            ))}
          </AnimatePresence>

          {cards.length === 0 && (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ alignItems: 'center', paddingTop: 80 }}
            >
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text style={{ color: C.t1, fontSize: 18, fontWeight: '700', marginTop: 16 }}>全部处理完毕</Text>
              <Text style={{ color: C.t2, fontSize: 14, marginTop: 8, textAlign: 'center' }}>AI 正在持续监控市场，有新机会会立即通知您</Text>
            </MotiView>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
