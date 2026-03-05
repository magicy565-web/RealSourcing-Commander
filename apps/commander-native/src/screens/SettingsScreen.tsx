import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { hapticLight, hapticMedium } from '../utils/haptics';

// 设置项数据
const settingsSections = [
  {
    title: '账户',
    items: [
      { id: 'profile', icon: 'person', label: '个人资料', type: 'link' },
      { id: 'company', icon: 'business', label: '公司信息', type: 'link' },
      { id: 'subscription', icon: 'card', label: '订阅管理', type: 'link', badge: 'PRO' },
    ],
  },
  {
    title: '通知',
    items: [
      { id: 'push', icon: 'notifications', label: '推送通知', type: 'switch', value: true },
      { id: 'email', icon: 'mail', label: '邮件通知', type: 'switch', value: true },
      { id: 'urgent', icon: 'alert-circle', label: '紧急决策提醒', type: 'switch', value: true },
      { id: 'digest', icon: 'newspaper', label: '每日摘要', type: 'switch', value: false },
    ],
  },
  {
    title: 'AI 设置',
    items: [
      { id: 'voice', icon: 'mic', label: '语音助手', type: 'switch', value: true },
      { id: 'suggestions', icon: 'bulb', label: 'AI 建议', type: 'switch', value: true },
      { id: 'autolearn', icon: 'school', label: '自动学习', type: 'switch', value: true },
      { id: 'training', icon: 'fitness', label: 'AI 训练偏好', type: 'link' },
    ],
  },
  {
    title: '外观',
    items: [
      { id: 'theme', icon: 'moon', label: '深色模式', type: 'switch', value: true },
      { id: 'haptics', icon: 'hand-left', label: '触觉反馈', type: 'switch', value: true },
      { id: 'animations', icon: 'sparkles', label: '动画效果', type: 'switch', value: true },
    ],
  },
  {
    title: '安全',
    items: [
      { id: 'faceid', icon: 'scan', label: 'Face ID / Touch ID', type: 'switch', value: true },
      { id: 'password', icon: 'lock-closed', label: '修改密码', type: 'link' },
      { id: 'twofa', icon: 'shield-checkmark', label: '双因素认证', type: 'link', badge: '已启用' },
    ],
  },
  {
    title: '其他',
    items: [
      { id: 'help', icon: 'help-circle', label: '帮助与支持', type: 'link' },
      { id: 'privacy', icon: 'document-text', label: '隐私政策', type: 'link' },
      { id: 'about', icon: 'information-circle', label: '关于', type: 'link' },
      { id: 'logout', icon: 'log-out', label: '退出登录', type: 'danger' },
    ],
  },
];

// 设置项组件
const SettingsItem = ({ item, index }: { item: any; index: number }) => {
  const [switchValue, setSwitchValue] = React.useState(item.value);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (item.type === 'switch') return;
    hapticMedium();
    scale.value = withSequence(
      withSpring(0.97),
      withSpring(1)
    );
  };

  const handleToggle = (value: boolean) => {
    hapticLight();
    setSwitchValue(value);
  };

  const isDanger = item.type === 'danger';

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={styles.settingsItem}
        onPress={handlePress}
        activeOpacity={item.type === 'switch' ? 1 : 0.7}
      >
        <View style={[
          styles.itemIcon,
          { backgroundColor: isDanger ? `${theme.colors.danger}20` : `${theme.colors.primary}15` }
        ]}>
          <Ionicons
            name={item.icon}
            size={20}
            color={isDanger ? theme.colors.danger : theme.colors.primary}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemLabel, isDanger && styles.dangerText]}>
            {item.label}
          </Text>
        </View>
        {item.badge && (
          <View style={[
            styles.badge,
            item.badge === 'PRO' ? styles.proBadge : styles.normalBadge
          ]}>
            <Text style={[
              styles.badgeText,
              item.badge === 'PRO' && styles.proBadgeText
            ]}>
              {item.badge}
            </Text>
          </View>
        )}
        {item.type === 'switch' && (
          <Switch
            value={switchValue}
            onValueChange={handleToggle}
            trackColor={{
              false: theme.colors.surface,
              true: `${theme.colors.primary}80`,
            }}
            thumbColor={switchValue ? theme.colors.primary : theme.colors.textSecondary}
            ios_backgroundColor={theme.colors.surface}
          />
        )}
        {item.type === 'link' && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textSecondary}
          />
        )}
        {item.type === 'danger' && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.danger}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SettingsScreen() {
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
        {/* 用户头像卡片 */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <BlurView intensity={20} tint="dark" style={styles.profileCard}>
            <LinearGradient
              colors={[`${theme.colors.primary}30`, `${theme.colors.primary}05`]}
              style={StyleSheet.absoluteFill}
            />
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>张总</Text>
              <Text style={styles.profileEmail}>zhang@company.com</Text>
              <View style={styles.proPill}>
                <Ionicons name="star" size={12} color={theme.colors.primary} />
                <Text style={styles.proText}>Commander Pro</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="pencil" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </BlurView>
        </Animated.View>

        {/* 设置列表 */}
        {settingsSections.map((section, sectionIndex) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.delay(150 + sectionIndex * 50).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <BlurView intensity={15} tint="dark" style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={item.id}>
                  <SettingsItem item={item} index={itemIndex} />
                  {itemIndex < section.items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </BlurView>
          </Animated.View>
        ))}

        {/* 版本信息 */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.versionInfo}>
          <Text style={styles.versionText}>Commander v2.0.0</Text>
          <Text style={styles.copyrightText}>2024 Commander Inc.</Text>
        </Animated.View>

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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  proText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  dangerText: {
    color: theme.colors.danger,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  normalBadge: {
    backgroundColor: `${theme.colors.success}20`,
  },
  proBadge: {
    backgroundColor: `${theme.colors.primary}20`,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.success,
  },
  proBadgeText: {
    color: theme.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 64,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  bottomSpacer: {
    height: 100,
  },
});
