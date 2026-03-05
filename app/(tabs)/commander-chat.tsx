/**
 * CommanderChat — 对话式交互中心
 * 核心功能：与 AI 对话、接收决策建议、快捷操作
 */
import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Keyboard, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Mic, Plus, Copy, Check } from 'lucide-react-native';
import { hapticLight, hapticSuccess } from '@/constants/haptics';
import { C } from '@/constants/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actionCard?: { title: string; description: string; action: string };
}

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: '早上好！我已经扫描了全球市场，发现了 3 个新的商机。您想先了解哪个市场？',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    role: 'user',
    content: '告诉我关于沙特市场的情况',
    timestamp: new Date(Date.now() - 3000000),
  },
  {
    id: '3',
    role: 'assistant',
    content: '沙特市场目前处于高速增长期。根据最新海关数据，工业管材进口需求增长 15%，预计今年采购额将达 $500M+。',
    timestamp: new Date(Date.now() - 2900000),
    actionCard: {
      title: '生成沙特市场分析报告',
      description: '包含竞争分析、采购商名单、价格区间',
      action: '生成报告 (15 积分)',
    },
  },
  {
    id: '4',
    role: 'user',
    content: '好的，生成报告',
    timestamp: new Date(Date.now() - 1800000),
  },
  {
    id: '5',
    role: 'assistant',
    content: '报告已生成！我还发现了 12 家高意向采购商。要我帮您生成个性化的开场邮件吗？',
    timestamp: new Date(Date.now() - 1700000),
  },
];

const QUICK_ACTIONS = [
  { icon: '🔍', label: '扫描市场', action: '帮我扫描东南亚市场机会' },
  { icon: '📊', label: '生成报告', action: '生成本月销售分析报告' },
  { icon: '✉️', label: '客户邮件', action: '帮我写一封开场邮件' },
  { icon: '🎨', label: '优化内容', action: '帮我优化产品图册' },
];

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{ marginBottom: 12, flexDirection: isUser ? 'row-reverse' : 'row', gap: 8 }}
    >
      {/* Avatar */}
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: isUser ? C.PL + '30' : C.green + '30',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
      }}>
        <Text style={{ fontSize: 14 }}>{isUser ? '👤' : '🤖'}</Text>
      </View>

      {/* Message Bubble */}
      <View style={{ flex: 1, maxWidth: '85%' }}>
        <View style={{
          backgroundColor: isUser ? C.PL + '20' : 'rgba(255,255,255,0.06)',
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: isUser ? C.PL + '40' : 'rgba(255,255,255,0.08)',
        }}>
          <Text style={{ color: C.t1, fontSize: 14, lineHeight: 20 }}>{message.content}</Text>
        </View>

        {/* Action Card */}
        {message.actionCard && (
          <View style={{
            marginTop: 10,
            backgroundColor: 'rgba(124,58,237,0.1)',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.PL + '40',
            padding: 12,
          }}>
            <Text style={{ color: C.t1, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
              {message.actionCard.title}
            </Text>
            <Text style={{ color: C.t2, fontSize: 12, marginBottom: 10 }}>
              {message.actionCard.description}
            </Text>
            <Pressable
              onPress={() => { hapticSuccess(); }}
              style={{ backgroundColor: C.PL, borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                {message.actionCard.action}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Timestamp */}
        <Text style={{ color: C.t3, fontSize: 11, marginTop: 4 }}>
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </MotiView>
  );
}

export default function CommanderChatScreen() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!input.trim()) return;

    hapticLight();
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setShowQuickActions(false);
    Keyboard.dismiss();

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '我正在分析您的请求，请稍候...',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 500);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setShowQuickActions(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
          <Text style={{ color: C.t1, fontSize: 18, fontWeight: '700' }}>Commander AI</Text>
          <Text style={{ color: C.t2, fontSize: 12, marginTop: 2 }}>随时为您服务</Text>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
        >
          {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        </ScrollView>

        {/* Quick Actions */}
        <AnimatePresence>
          {showQuickActions && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 20 }}
              style={{ paddingHorizontal: 20, marginBottom: 12 }}
            >
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {QUICK_ACTIONS.map(action => (
                  <Pressable
                    key={action.label}
                    onPress={() => handleQuickAction(action.action)}
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <Text style={{ color: C.t1, fontSize: 12 }}>
                      {action.icon} {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </MotiView>
          )}
        </AnimatePresence>

        {/* Input */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}>
            <Pressable
              onPress={() => { hapticLight(); setShowQuickActions(!showQuickActions); }}
              style={{ padding: 6 }}
            >
              <Plus size={20} color={C.PL} />
            </Pressable>

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="晚安，需要我帮您做什么？"
              placeholderTextColor={C.t3}
              style={{
                flex: 1,
                color: C.t1,
                fontSize: 14,
                paddingVertical: 8,
              }}
              multiline
              maxHeight={100}
            />

            <Pressable
              onPress={handleSend}
              disabled={!input.trim()}
              style={{ padding: 6 }}
            >
              <Send size={18} color={input.trim() ? C.PL : C.t3} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
