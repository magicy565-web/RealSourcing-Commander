/**
 * DigitalAgents — 数字员工团队管理
 * 核心功能：查看员工状态、分配任务、监控进度
 */
import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, Plus, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react-native';
import { hapticLight, hapticMedium } from '@/constants/haptics';
import { C } from '@/constants/theme';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'working' | 'standby' | 'busy' | 'offline';
  color: string;
  currentTask?: string;
  completedToday: number;
  uptime: string;
  efficiency: number;
}

const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Scout',
    role: '市场猎手',
    status: 'working',
    color: C.blue,
    currentTask: '扫描东南亚不锈钢市场',
    completedToday: 12,
    uptime: '18h 42m',
    efficiency: 94,
  },
  {
    id: '2',
    name: 'Sage',
    role: '策略顾问',
    status: 'standby',
    color: C.PL,
    completedToday: 8,
    uptime: '24h 0m',
    efficiency: 88,
  },
  {
    id: '3',
    name: 'Echo',
    role: '客服专员',
    status: 'busy',
    color: C.green,
    currentTask: '回复询盘 #INQ-047',
    completedToday: 23,
    uptime: '24h 0m',
    efficiency: 96,
  },
  {
    id: '4',
    name: 'Muse',
    role: '内容创作',
    status: 'working',
    color: C.amber,
    currentTask: '生成中东风格海报',
    completedToday: 5,
    uptime: '12h 30m',
    efficiency: 91,
  },
];

const STATUS_CONFIG = {
  working: { label: '工作中', color: C.green, icon: Play },
  standby: { label: '待命', color: C.t2, icon: Pause },
  busy: { label: '忙碌', color: C.amber, icon: AlertCircle },
  offline: { label: '离线', color: C.t3, icon: AlertCircle },
};

function AgentCard({ agent }: { agent: Agent }) {
  const config = STATUS_CONFIG[agent.status];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: agent.status === 'working' ? agent.color + '30' : 'rgba(255,255,255,0.08)',
        padding: 18,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      {/* Top accent bar */}
      <View style={{ height: 3, backgroundColor: agent.color, marginHorizontal: -18, marginTop: -18, marginBottom: 14 }} />

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: agent.color + '30', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: agent.color }}>{agent.name[0]}</Text>
          </View>
          <View>
            <Text style={{ color: C.t1, fontSize: 16, fontWeight: '700' }}>{agent.name}</Text>
            <Text style={{ color: C.t2, fontSize: 12, marginTop: 2 }}>{agent.role}</Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={{
          backgroundColor: config.color + '20',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: config.color }} />
          <Text style={{ color: config.color, fontSize: 11, fontWeight: '600' }}>{config.label}</Text>
        </View>
      </View>

      {/* Current Task */}
      {agent.currentTask && (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, marginBottom: 12 }}>
          <Text style={{ color: C.t2, fontSize: 11, marginBottom: 4 }}>当前任务</Text>
          <Text style={{ color: C.t1, fontSize: 13, fontWeight: '500' }}>{agent.currentTask}</Text>
        </View>
      )}

      {/* Stats Grid */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10 }}>
          <Text style={{ color: C.t2, fontSize: 10 }}>今日完成</Text>
          <Text style={{ color: C.t1, fontSize: 18, fontWeight: '700', marginTop: 4 }}>{agent.completedToday}</Text>
          <Text style={{ color: C.t3, fontSize: 9, marginTop: 2 }}>项任务</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10 }}>
          <Text style={{ color: C.t2, fontSize: 10 }}>运行时长</Text>
          <Text style={{ color: C.t1, fontSize: 16, fontWeight: '700', marginTop: 4 }}>{agent.uptime}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10 }}>
          <Text style={{ color: C.t2, fontSize: 10 }}>效率</Text>
          <Text style={{ color: agent.efficiency >= 90 ? C.green : agent.efficiency >= 80 ? C.amber : C.red, fontSize: 18, fontWeight: '700', marginTop: 4 }}>
            {agent.efficiency}%
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => hapticLight()}
          style={{ flex: 1, backgroundColor: agent.color + '20', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
        >
          <Text style={{ color: agent.color, fontWeight: '600', fontSize: 13 }}>
            {agent.status === 'working' ? '暂停' : '启动'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => hapticLight()}
          style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
        >
          <Text style={{ color: C.t1, fontWeight: '600', fontSize: 13 }}>分配任务</Text>
        </Pressable>
      </View>
    </MotiView>
  );
}

export default function DigitalAgentsScreen() {
  const [agents, setAgents] = useState(MOCK_AGENTS);
  const workingCount = agents.filter(a => a.status === 'working').length;
  const totalTasksToday = agents.reduce((sum, a) => sum + a.completedToday, 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
            <Text style={{ color: C.t1, fontSize: 22, fontWeight: '700' }}>数字员工团队</Text>
            <Text style={{ color: C.t2, fontSize: 13, marginTop: 2 }}>您的虚拟业务执行团队</Text>
          </View>

          {/* Stats Overview */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <LinearGradient
                colors={['rgba(16,185,129,0.1)', 'rgba(16,185,129,0.05)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: C.green + '40',
                  padding: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: C.green, fontSize: 24, fontWeight: '700' }}>{workingCount}</Text>
                <Text style={{ color: C.t2, fontSize: 11, marginTop: 4 }}>员工工作中</Text>
              </LinearGradient>

              <LinearGradient
                colors={['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.05)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: C.blue + '40',
                  padding: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: C.blue, fontSize: 24, fontWeight: '700' }}>{totalTasksToday}</Text>
                <Text style={{ color: C.t2, fontSize: 11, marginTop: 4 }}>今日完成任务</Text>
              </LinearGradient>

              <LinearGradient
                colors={['rgba(124,58,237,0.1)', 'rgba(124,58,237,0.05)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: C.PL + '40',
                  padding: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: C.PL, fontSize: 24, fontWeight: '700' }}>4</Text>
                <Text style={{ color: C.t2, fontSize: 11, marginTop: 4 }}>总员工数</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Agents List */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: C.t1, fontSize: 16, fontWeight: '600' }}>团队成员</Text>
              <Pressable onPress={() => hapticMedium()}>
                <View style={{ backgroundColor: C.PL + '20', borderRadius: 8, padding: 6 }}>
                  <Plus size={16} color={C.PL} />
                </View>
              </Pressable>
            </View>

            {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
          </View>

          {/* Recruitment Card */}
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <Pressable onPress={() => hapticMedium()}>
              <LinearGradient
                colors={['rgba(124,58,237,0.15)', 'rgba(124,58,237,0.05)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: C.PL + '40',
                  padding: 16,
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Plus size={24} color={C.PL} />
                <Text style={{ color: C.t1, fontSize: 14, fontWeight: '600' }}>招募新数字员工</Text>
                <Text style={{ color: C.t2, fontSize: 12 }}>扩展您的虚拟团队能力</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
