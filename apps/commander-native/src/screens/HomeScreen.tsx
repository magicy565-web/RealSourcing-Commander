import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const screens = [
  { name: 'WatchFace', title: '表盘首页', desc: '时钟动画 + AI状态' },
  { name: 'DecisionFeed', title: '决策流', desc: '滑动手势 + 满足感动画' },
  { name: 'AITraining', title: 'AI训练', desc: '知识流动效果' },
  { name: 'MarketRadar', title: '市场雷达', desc: '声呐探测动画' },
  { name: 'DigitalAgents', title: '数字员工', desc: '团队状态展示' },
  { name: 'CommanderChat', title: '指挥对话', desc: '多Agent对话' },
  { name: 'InboundFunnel', title: '入站漏斗', desc: '销售漏斗' },
  { name: 'ContentStudio', title: '内容工作室', desc: '内容管理' },
];

export default function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Commander Boss Phone</Text>
        <Text style={styles.subtitle}>AI 指挥官中心</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {screens.map((screen) => (
            <Pressable 
              key={screen.name}
              onPress={() => navigation.navigate(screen.name)}
            >
              <LinearGradient
                colors={['#1A1A2E', '#16213E']}
                style={styles.card}
              >
                <Text style={styles.cardTitle}>{screen.title}</Text>
                <Text style={styles.cardDesc}>{screen.desc}</Text>
                <View style={styles.cardBadge}>
                  <Text style={styles.badgeText}>✨ 演示</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9A84C33',
    minHeight: 100,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#AAAAAA',
    marginBottom: 12,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#C9A84C33',
  },
  badgeText: {
    fontSize: 11,
    color: '#C9A84C',
    fontWeight: '500',
  },
});
