import { Tabs } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Home, Layers, Brain, MessageSquare, Users } from 'lucide-react-native';
import { hapticLight } from '@/constants/haptics';
import { C } from '@/constants/theme';

const TABS = [
  { name: 'index', label: '主页', icon: Home },
  { name: 'decision-feed', label: '决策', icon: Layers },
  { name: 'asset-vault', label: '资产', icon: Brain },
  { name: 'commander-chat', label: '对话', icon: MessageSquare },
  { name: 'digital-agents', label: '团队', icon: Users },
];

function TabBarIcon({ icon: Icon, focused, color }: { icon: any; focused: boolean; color: string }) {
  return (
    <MotiView
      animate={{ scale: focused ? 1.1 : 1, translateY: focused ? -2 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Icon size={22} color={focused ? '#ffffff' : 'rgba(255,255,255,0.4)'} strokeWidth={focused ? 2.5 : 1.8} />
    </MotiView>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(10,10,18,0.95)',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '主页',
          tabBarIcon: ({ focused, color }) => <TabBarIcon icon={Home} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="decision-feed"
        options={{
          title: '决策',
          tabBarIcon: ({ focused, color }) => <TabBarIcon icon={Layers} focused={focused} color={color} />,
          tabBarBadge: 3,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="asset-vault"
        options={{
          title: '资产',
          tabBarIcon: ({ focused, color }) => <TabBarIcon icon={Brain} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="commander-chat"
        options={{
          title: '对话',
          tabBarIcon: ({ focused, color }) => <TabBarIcon icon={MessageSquare} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="digital-agents"
        options={{
          title: '团队',
          tabBarIcon: ({ focused, color }) => <TabBarIcon icon={Users} focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
