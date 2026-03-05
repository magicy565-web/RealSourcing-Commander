import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeInUp,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { hapticMedium, hapticLight, hapticSuccess } from '../utils/haptics';

// Agent info
const agentInfo: Record<string, { name: string; role: string; color: string }> = {
  scout: { name: 'Scout', role: '市场侦察员', color: colors.status.success },
  analyst: { name: 'Analyst', role: '数据分析师', color: colors.accent.blue },
  writer: { name: 'Writer', role: '内容创作者', color: colors.brand.gold },
  closer: { name: 'Closer', role: '成交转化专家', color: colors.status.warning },
};

// Message types
type MessageType = 'text' | 'decision' | 'report' | 'suggestion';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  decisionData?: {
    title: string;
    options: string[];
  };
  reportData?: {
    title: string;
    summary: string;
    metrics: { label: string; value: string }[];
  };
}

// Sample messages
const initialMessages: Message[] = [
  {
    id: '1',
    type: 'text',
    content: '老板好！我是Scout，您的市场侦察员。有什么需要我帮您调查的吗？',
    sender: 'agent',
    timestamp: new Date(Date.now() - 300000),
  },
];

// Typing indicator
const TypingIndicator: React.FC = () => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      true
    );
    dot2.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(-5, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      true
    );
    dot3.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 300 }),
        withTiming(-5, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      true
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.typingDot, dot1Style]} />
      <Animated.View style={[styles.typingDot, dot2Style]} />
      <Animated.View style={[styles.typingDot, dot3Style]} />
    </View>
  );
};

// Decision card embedded in chat
const DecisionCard: React.FC<{
  title: string;
  options: string[];
  onSelect: (option: string) => void;
}> = ({ title, options, onSelect }) => {
  return (
    <View style={styles.decisionCard}>
      <Text style={styles.decisionTitle}>{title}</Text>
      <View style={styles.decisionOptions}>
        {options.map((option, index) => (
          <Pressable
            key={index}
            style={styles.decisionOption}
            onPress={() => {
              hapticSuccess();
              onSelect(option);
            }}
          >
            <Text style={styles.decisionOptionText}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

// Report card embedded in chat
const ReportCard: React.FC<{
  title: string;
  summary: string;
  metrics: { label: string; value: string }[];
}> = ({ title, summary, metrics }) => {
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Feather name="bar-chart-2" size={16} color={colors.brand.gold} />
        <Text style={styles.reportTitle}>{title}</Text>
      </View>
      <Text style={styles.reportSummary}>{summary}</Text>
      <View style={styles.reportMetrics}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.metricItem}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
      <Pressable style={styles.reportBtn}>
        <Text style={styles.reportBtnText}>查看完整报告</Text>
        <Feather name="arrow-right" size={14} color={colors.brand.gold} />
      </Pressable>
    </View>
  );
};

// Message bubble
const MessageBubble: React.FC<{
  message: Message;
  agentColor: string;
  onDecisionSelect?: (option: string) => void;
}> = ({ message, agentColor, onDecisionSelect }) => {
  const isUser = message.sender === 'user';

  return (
    <Animated.View
      entering={FadeInUp.duration(300).springify()}
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.agentBubble,
      ]}
    >
      {!isUser && (
        <View style={[styles.agentIndicator, { backgroundColor: agentColor }]} />
      )}
      
      {message.type === 'text' && (
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {message.content}
        </Text>
      )}
      
      {message.type === 'decision' && message.decisionData && (
        <DecisionCard
          title={message.decisionData.title}
          options={message.decisionData.options}
          onSelect={onDecisionSelect || (() => {})}
        />
      )}
      
      {message.type === 'report' && message.reportData && (
        <ReportCard
          title={message.reportData.title}
          summary={message.reportData.summary}
          metrics={message.reportData.metrics}
        />
      )}
      
      <Text style={styles.timestamp}>
        {message.timestamp.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Animated.View>
  );
};

interface CommanderChatScreenProps {
  navigation: any;
  route: any;
}

export const CommanderChatScreen: React.FC<CommanderChatScreenProps> = ({
  navigation,
  route,
}) => {
  const agentId = route.params?.agentId || 'scout';
  const agent = agentInfo[agentId];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    hapticLight();
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      content: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate agent response
    setTimeout(() => {
      setIsTyping(false);
      
      // Generate contextual response
      let response: Message;
      
      if (inputText.toLowerCase().includes('竞争') || inputText.toLowerCase().includes('对手')) {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'report',
          content: '',
          sender: 'agent',
          timestamp: new Date(),
          reportData: {
            title: '竞争对手分析报告',
            summary: '检测到3个主要竞争对手近期有重大动态',
            metrics: [
              { label: '价格变动', value: '-15%' },
              { label: '新品发布', value: '2个' },
              { label: '市场份额', value: '+3%' },
            ],
          },
        };
      } else if (inputText.toLowerCase().includes('建议') || inputText.toLowerCase().includes('推荐')) {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'decision',
          content: '',
          sender: 'agent',
          timestamp: new Date(),
          decisionData: {
            title: '基于当前市场分析，我有以下建议：',
            options: ['立即跟进降价', '观望等待', '差异化竞争', '寻找新市场'],
          },
        };
      } else {
        response = {
          id: (Date.now() + 1).toString(),
          type: 'text',
          content: `好的，我明白了。让我帮您分析一下"${inputText.trim()}"相关的市场情况。根据最新数据，这个领域目前呈现上升趋势，建议密切关注。`,
          sender: 'agent',
          timestamp: new Date(),
        };
      }

      setMessages((prev) => [...prev, response]);
    }, 1500);
  };

  const handleDecisionSelect = (option: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      content: `我选择：${option}`,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const response: Message = {
        id: (Date.now() + 1).toString(),
        type: 'text',
        content: `明白了！我会立即按照"${option}"策略开始执行，并在有重要进展时通知您。`,
        sender: 'agent',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
    }, 1000);
  };

  // Quick action buttons
  const quickActions = [
    { icon: 'bar-chart-2', label: '市场报告' },
    { icon: 'users', label: '竞品分析' },
    { icon: 'trending-up', label: '趋势预测' },
    { icon: 'alert-circle', label: '风险预警' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={[colors.background.primary, '#0F0F18', colors.background.primary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.agentHeaderInfo}>
            <View style={[styles.agentDot, { backgroundColor: agent.color }]} />
            <Text style={styles.headerTitle}>{agent.name}</Text>
          </View>
          <Text style={styles.headerSubtitle}>{agent.role}</Text>
        </View>
        <Pressable style={styles.moreBtn}>
          <Feather name="more-vertical" size={20} color={colors.text.secondary} />
        </Pressable>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            agentColor={agent.color}
            onDecisionSelect={handleDecisionSelect}
          />
        ))}
        
        {isTyping && (
          <View style={[styles.messageBubble, styles.agentBubble]}>
            <View style={[styles.agentIndicator, { backgroundColor: agent.color }]} />
            <TypingIndicator />
          </View>
        )}
      </ScrollView>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              style={styles.quickActionBtn}
              onPress={() => {
                hapticLight();
                setInputText(`请帮我生成${action.label}`);
              }}
            >
              <Feather name={action.icon as any} size={16} color={colors.brand.gold} />
              <Text style={styles.quickActionText}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Input area */}
      <View style={styles.inputContainer}>
        <Pressable style={styles.attachBtn}>
          <Feather name="plus" size={22} color={colors.text.secondary} />
        </Pressable>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入指令..."
          placeholderTextColor={colors.text.tertiary}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[
            styles.sendBtn,
            inputText.trim() && styles.sendBtnActive,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Feather
            name="send"
            size={20}
            color={inputText.trim() ? colors.text.inverse : colors.text.tertiary}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  agentHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  agentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand.gold,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.tertiary,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  agentIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: spacing.sm,
    minHeight: 20,
  },
  messageText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  userMessageText: {
    color: colors.text.inverse,
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  typingContainer: {
    flexDirection: 'row',
    gap: 4,
    padding: spacing.sm,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.tertiary,
  },
  decisionCard: {
    flex: 1,
  },
  decisionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  decisionOptions: {
    gap: spacing.sm,
  },
  decisionOption: {
    backgroundColor: colors.overlay.light,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  decisionOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    textAlign: 'center',
  },
  reportCard: {
    flex: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  reportTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.gold,
  },
  reportSummary: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  reportMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.overlay.light,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  metricLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  reportBtnText: {
    fontSize: typography.fontSize.sm,
    color: colors.brand.gold,
  },
  quickActions: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginLeft: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
  },
  quickActionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: colors.brand.gold,
  },
});

export default CommanderChatScreen;
