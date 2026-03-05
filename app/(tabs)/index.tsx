/**
 * Watch Face — Commander Boss Phone 首页表盘
 * 设计灵感来自 Apple Watch，沉稳高级
 * 时间作为视觉焦点，AI 状态作为环绕元素
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Activity, Zap, TrendingUp, Bell, Settings, ChevronRight, Globe, Users } from 'lucide-react-native';
import { hapticLight, hapticMedium } from '@/constants/haptics';
import { C } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const MOCK_AGENTS = [
  { id: '1', name: 'Scout', role: '市场猎手', status: 'working', task: '扫描东南亚不锈钢市场', color: C.blue },
  { id: '2', name: 'Sage', role: '策略顾问', status: 'standby', color: C.PL },
  { id: '3', name: 'Echo', role: '客服专员', status: 'busy', task: '回复询盘 #INQ-047', color: C.green },
  { id: '4', name: 'Muse', role: '内容创作', status: 'working', task: '生成中东风格海报', color: C.amber },
];

const QUICK_STATS = [
  { label: '待决策', value: 3, color: C.amber, icon: Zap, path: '/(tabs)/decision-feed' },
  { label: '新线索', value: 12, color: C.green, icon: TrendingUp, path: '/inbound-funnel' },
  { label: '市场信号', value: 5, color: C.blue, icon: Globe, path: '/market-radar' },
  { label: '数字员工', value: 4, color: C.PL, icon: Users, path: '/(tabs)/digital-agents' },
];

function AgentDot({ agent }: { agent: typeof MOCK_AGENTS[0] }) {
  const statusColor = agent.status === 'working' ? C.green : agent.status === 'busy' ? C.amber : C.t3;
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: agent.color + '30', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: agent.color, fontWeight: '700', fontSize: 14 }}>{agent.name[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.t1, fontWeight: '600', fontSize: 14 }}>{agent.name} · {agent.role}</Text>
        <Text style={{ color: C.t2, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {agent.task ?? '待命中'}
        </Text>
      </View>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
    </MotiView>
  );
}

export default function WatchFaceScreen() {
  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const h = new Date().getHours();
    setGreeting(h < 6 ? '深夜好' : h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好');
    return () => clearInterval(timer);
  }, []);

  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0a0015', '#000000', '#000000']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 }}>
            <Text style={{ color: C.t2, fontSize: 14 }}>{greeting}</Text>
            <Pressable onPress={() => { hapticLight(); router.push('/settings'); }}>
              <Settings size={20} color={C.t2} />
            </Pressable>
          </View>

          {/* Time Display */}
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <MotiText
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              style={{ fontSize: 88, fontWeight: '100', color: C.t1, letterSpacing: -4, lineHeight: 88 }}
            >
              {hh}:{mm}
            </MotiText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <MotiView
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ loop: true, duration: 2000 }}
                style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }}
              />
              <Text style={{ color: C.green, fontSize: 12, fontWeight: '500' }}>AI 指挥中心运行中</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {QUICK_STATS.map((stat, i) => (
                <Pressable
                  key={stat.label}
                  onPress={() => { hapticLight(); router.push(stat.path as any); }}
                  style={{ width: (SCREEN_W - 50) / 2 }}
                >
                  <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: i * 80, type: 'spring', stiffness: 300, damping: 25 }}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <stat.icon size={18} color={stat.color} />
                    <Text style={{ color: stat.color, fontSize: 28, fontWeight: '700', marginTop: 8 }}>{stat.value}</Text>
                    <Text style={{ color: C.t2, fontSize: 12, marginTop: 2 }}>{stat.label}</Text>
                  </MotiView>
                </Pressable>
              ))}
            </View>
          </View>

          {/* AI Agents Section */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: C.t1, fontSize: 16, fontWeight: '600' }}>数字员工动态</Text>
              <Pressable onPress={() => { hapticLight(); router.push('/(tabs)/digital-agents'); }}>
                <Text style={{ color: C.PL, fontSize: 13 }}>查看全部</Text>
              </Pressable>
            </View>
            {MOCK_AGENTS.map(agent => <AgentDot key={agent.id} agent={agent} />)}
          </View>

          {/* Quick Action */}
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <Pressable
              onPress={() => { hapticMedium(); router.push('/(tabs)/decision-feed'); }}
            >
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <View>
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>3 项决策等待您</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>AI 已完成分析，点击处理</Text>
                </View>
                <ChevronRight size={22} color="#ffffff" />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
