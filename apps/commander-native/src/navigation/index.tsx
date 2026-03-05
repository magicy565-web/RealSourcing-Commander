import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import WatchFaceScreen from '../screens/WatchFaceScreen';
import DecisionFeedScreen from '../screens/DecisionFeedScreen';
import AITrainingScreen from '../screens/AITrainingScreen';
import MarketRadarScreen from '../screens/MarketRadarScreen';
import DigitalAgentsScreen from '../screens/DigitalAgentsScreen';
import CommanderChatScreen from '../screens/CommanderChatScreen';
import InboundFunnelScreen from '../screens/InboundFunnelScreen';
import ContentStudioScreen from '../screens/ContentStudioScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

const NavigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: '#0F0F1E',
    card: '#1A1A2E',
    text: '#FFFFFF',
    border: '#1A1A2E',
    primary: '#C9A84C',
  },
};

export default function Navigation() {
  return (
    <NavigationContainer theme={NavigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
          animationTypeForReplace: true,
          cardStyle: { backgroundColor: '#0F0F1E' },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ animationEnabled: false }}
        />
        <Stack.Screen 
          name="WatchFace" 
          component={WatchFaceScreen}
          options={{ title: '表盘首页' }}
        />
        <Stack.Screen 
          name="DecisionFeed" 
          component={DecisionFeedScreen}
          options={{ title: '决策流' }}
        />
        <Stack.Screen 
          name="AITraining" 
          component={AITrainingScreen}
          options={{ title: 'AI训练' }}
        />
        <Stack.Screen 
          name="MarketRadar" 
          component={MarketRadarScreen}
          options={{ title: '市场雷达' }}
        />
        <Stack.Screen 
          name="DigitalAgents" 
          component={DigitalAgentsScreen}
          options={{ title: '数字员工' }}
        />
        <Stack.Screen 
          name="CommanderChat" 
          component={CommanderChatScreen}
          options={{ title: '指挥对话' }}
        />
        <Stack.Screen 
          name="InboundFunnel" 
          component={InboundFunnelScreen}
          options={{ title: '入站漏斗' }}
        />
        <Stack.Screen 
          name="ContentStudio" 
          component={ContentStudioScreen}
          options={{ title: '内容工作室' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: '设置' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
