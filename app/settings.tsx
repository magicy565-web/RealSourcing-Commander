/**
 * Settings — 设置与安全
 */
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { ChevronRight, Bell, Lock, Zap, HelpCircle, LogOut } from 'lucide-react-native';
import { hapticLight } from '@/constants/haptics';
import { C } from '@/constants/theme';
import { useState } from 'react';

interface SettingItem {
  icon: any;
  label: string;
  description?: string;
  type: 'toggle' | 'action' | 'info';
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

const SETTINGS: SettingItem[] = [
  {
    icon: Bell,
    label: '推送通知',
    description: '接收重要商机和决策提醒',
    type: 'toggle',
    value: true,
  },
  {
    icon: Zap,
    label: '触觉反馈',
    description: '按钮点击反馈',
    type: 'toggle',
    value: true,
  },
  {
    icon: Lock,
    label: '数据安全',
    description: '查看隐私政策和数据处理',
    type: 'action',
  },
  {
    icon: HelpCircle,
    label: '帮助与反馈',
    description: '联系客服或提交建议',
    type: 'action',
  },
];

function SettingRow({ item }: { item: SettingItem }) {
  const [enabled, setEnabled] = useState(item.value ?? false);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Pressable
        onPress={() => {
          hapticLight();
          if (item.type === 'action') item.onPress?.();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{ backgroundColor: C.PL + '20', borderRadius: 10, padding: 8 }}>
            <item.icon size={18} color={C.PL} />
          </View>
          <View>
            <Text style={{ color: C.t1, fontSize: 14, fontWeight: '600' }}>{item.label}</Text>
            {item.description && (
              <Text style={{ color: C.t2, fontSize: 12, marginTop: 2 }}>{item.description}</Text>
            )}
          </View>
        </View>

        {item.type === 'toggle' && (
          <Switch
            value={enabled}
            onValueChange={(val) => {
              hapticLight();
              setEnabled(val);
            }}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: C.green + '40' }}
            thumbColor={enabled ? C.green : C.t3}
          />
        )}
        {item.type === 'action' && <ChevronRight size={18} color={C.t3} />}
      </Pressable>
    </MotiView>
  );
}

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => { hapticLight(); router.back(); }}>
            <Text style={{ fontSize: 24 }}>←</Text>
          </Pressable>
          <Text style={{ color: C.t1, fontSize: 22, fontWeight: '700' }}>设置</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Settings Sections */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: C.t2, fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 8 }}>偏好设置</Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, marginHorizontal: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              {SETTINGS.map((item, i) => <SettingRow key={item.label} item={item} />)}
            </View>
          </View>

          {/* Account Section */}
          <View style={{ marginTop: 24, marginBottom: 100 }}>
            <Text style={{ color: C.t2, fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 8 }}>账户</Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, marginHorizontal: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Pressable
                onPress={() => { hapticLight(); router.push('/'); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ backgroundColor: C.red + '20', borderRadius: 10, padding: 8 }}>
                    <LogOut size={18} color={C.red} />
                  </View>
                  <Text style={{ color: C.red, fontSize: 14, fontWeight: '600' }}>退出登录</Text>
                </View>
                <ChevronRight size={18} color={C.t3} />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
