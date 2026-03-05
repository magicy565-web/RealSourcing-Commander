import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { hapticMedium, hapticHeavy } from '../utils/haptics';

// Screens
import WatchFaceScreen from '../screens/WatchFaceScreen';
import DecisionFeedScreen from '../screens/DecisionFeedScreen';
import AITrainingScreen from '../screens/AITrainingScreen';
import MarketRadarScreen from '../screens/MarketRadarScreen';
import DigitalAgentsScreen from '../screens/DigitalAgentsScreen';
import CommanderChatScreen from '../screens/CommanderChatScreen';
import InboundFunnelScreen from '../screens/InboundFunnelScreen';
import ContentStudioScreen from '../screens/ContentStudioScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 85;

// 自定义 Tab Bar 按钮
const TabBarButton = ({ 
  icon, 
  label, 
  focused, 
  onPress,
  isCenter = false,
}: { 
  icon: string; 
  label: string; 
  focused: boolean; 
  onPress: () => void;
  isCenter?: boolean;
}) => {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scale.value, [0.9, 1, 1.1], [0.8, 1, 1.2], Extrapolate.CLAMP) },
    ],
  }));

  const handlePress = () => {
    if (isCenter) {
      hapticHeavy();
    } else {
      hapticMedium();
    }
    scale.value = withSequence(
      withSpring(isCenter ? 0.85 : 0.9),
      withSpring(1)
    );
    translateY.value = withSequence(
      withSpring(isCenter ? -5 : -3),
      withSpring(0)
    );
    onPress();
  };

  if (isCenter) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.centerButtonContainer}>
        <Animated.View style={[styles.centerButton, animatedStyle]}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.centerButtonGradient}
          >
            <Animated.View style={iconAnimatedStyle}>
              <Ionicons name={icon as any} size={28} color="#FFFFFF" />
            </Animated.View>
          </LinearGradient>
          {/* 发光效果 */}
          <View style={styles.centerButtonGlow} />
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.tabButton}>
      <Animated.View style={[styles.tabButtonInner, animatedStyle]}>
        <Animated.View style={iconAnimatedStyle}>
          <Ionicons
            name={(focused ? icon : `${icon}-outline`) as any}
            size={24}
            color={focused ? theme.colors.primary : theme.colors.textSecondary}
          />
        </Animated.View>
        {focused && <View style={styles.activeIndicator} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

// 自定义 Tab Bar
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const tabs = [
    { name: 'WatchFace', icon: 'time', label: '表盘' },
    { name: 'Decisions', icon: 'layers', label: '决策' },
    { name: 'Commander', icon: 'sparkles', label: '指挥', isCenter: true },
    { name: 'Radar', icon: 'radio', label: '雷达' },
    { name: 'Settings', icon: 'settings', label: '设置' },
  ];

  return (
    <View style={styles.tabBarContainer}>
      <BlurView intensity={80} tint="dark" style={styles.tabBarBlur}>
        <View style={styles.tabBarContent}>
          {tabs.map((tab, index) => {
            const isFocused = state.index === index;
            
            return (
              <TabBarButton
                key={tab.name}
                icon={tab.icon}
                label={tab.label}
                focused={isFocused}
                isCenter={tab.isCenter}
                onPress={() => {
                  const route = state.routes[index];
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

// 主 Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="WatchFace" component={WatchFaceScreen} />
      <Tab.Screen name="Decisions" component={DecisionFeedScreen} />
      <Tab.Screen name="Commander" component={CommanderChatScreen} />
      <Tab.Screen name="Radar" component={MarketRadarScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// 导航主题
const NavigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.primary,
  },
};

// 主导航
export default function Navigation() {
  return (
    <NavigationContainer theme={NavigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="AITraining" component={AITrainingScreen} />
        <Stack.Screen name="DigitalAgents" component={DigitalAgentsScreen} />
        <Stack.Screen name="InboundFunnel" component={InboundFunnelScreen} />
        <Stack.Screen name="ContentStudio" component={ContentStudioScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
  },
  tabBarBlur: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  tabButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginTop: 4,
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  centerButtonGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    opacity: 0.15,
    transform: [{ scale: 1.2 }],
  },
});
