/**
 * CommanderChat - 对话式指挥中心
 *
 * 设计特点：
 * - 多 AI Agent 可选：策略顾问、市场猎手、内容创作、客服专员
 * - 对话中嵌入可操作决策卡片，老板可以直接在聊天中执行
 * - 支持语音输入指令
 * - 流畅的打字机效果和消息动画
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticLight, hapticMedium, hapticSuccess, hapticSelection } from '../lib/haptics';

// Design tokens
const C = {
  bg: '#000000',
  t1: 'rgba(255,255,255,0.92)',
  t2: 'rgba(255,255,255,0.52)',
  t3: 'rgba(255,255,255,0.26)',
  P: '#7C3AED',
  PL: '#A78BFA',
  amber: '#F59E0B',
  green: '#10B981',
  blue: '#60A5FA',
  red: '#F87171',
  teal: '#2DD4BF',
};

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };
const SPRING_GENTLE = { type: 'spring' as const, stiffness: 260, damping: 30 };

// AI Agent 类型
interface AIAgent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  description: string;
  capabilities: string[];
}

// 消息类型
interface ChatMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'decision-card' | 'typing';
  decisionCard?: {
    title: string;
    summary: string;
    action: string;
    value?: string;
  };
}

// AI Agents
const AI_AGENTS: AIAgent[] = [
  {
    id: 'sage',
    name: 'Sage',
    role: '策略顾问',
    avatar: '🧠',
    color: C.PL,
    description: '分析市场趋势，提供战略建议',
    capabilities: ['市场分析', '竞争策略', '定价建议'],
  },
  {
    id: 'scout',
    name: 'Scout',
    role: '市场猎手',
    avatar: '🔭',
    color: C.blue,
    description: '全球市场信号扫描与机会发现',
    capabilities: ['信号监控', '线索挖掘', '趋势预测'],
  },
  {
    id: 'muse',
    name: 'Muse',
    role: '内容创作',
    avatar: '✨',
    color: C.amber,
    description: '多语言营销内容创作与优化',
    capabilities: ['文案创作', '视频脚本', '本地化'],
  },
  {
    id: 'echo',
    name: 'Echo',
    role: '客服专员',
    avatar: '💬',
    color: C.green,
    description: '智能客户沟通与询盘处理',
    capabilities: ['询盘回复', '跟进提醒', '客户画像'],
  },
];

// Mock 对话历史
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    agentId: 'sage',
    content: '早上好，老板！我已完成今日市场扫描。沙特不锈钢餐具需求持续增长，建议重点关注。',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    type: 'text',
  },
  {
    id: '2',
    agentId: 'sage',
    content: '',
    timestamp: new Date(Date.now() - 1000 * 60 * 28),
    type: 'decision-card',
    decisionCard: {
      title: '启动沙特市场专项触达',
      summary: '基于海关数据分析，建议触达 50 家沙特分销商',
      action: '确认启动',
      value: '预估价值 $45,000',
    },
  },
];

// Noise 纹理
const Noise = ({ intensity = 0.022 }: { intensity?: number }) => (
  <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: intensity, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}>
    <filter id="nzcc"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#nzcc)"/>
  </svg>
);

// Agent 选择器
function AgentSelector({ 
  agents, 
  selectedId, 
  onSelect 
}: { 
  agents: AIAgent[]; 
  selectedId: string; 
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 10,
      padding: '12px 20px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      {agents.map(agent => (
        <motion.button
          key={agent.id}
          whileTap={{ scale: 0.95 }}
          onClick={() => { hapticSelection(); onSelect(agent.id); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 50,
            background: selectedId === agent.id ? `${agent.color}20` : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${selectedId === agent.id ? agent.color : 'rgba(255,255,255,0.08)'}`,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: 16 }}>{agent.avatar}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: selectedId === agent.id ? agent.color : C.t1 }}>
              {agent.name}
            </div>
            <div style={{ fontSize: 9, color: C.t3 }}>{agent.role}</div>
          </div>
          {/* 在线状态 */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: C.green,
              boxShadow: `0 0 6px ${C.green}`,
            }}
          />
        </motion.button>
      ))}
    </div>
  );
}

// 打字指示器
function TypingIndicator({ agent }: { agent: AIAgent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        padding: '12px 20px',
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: `${agent.color}20`,
        border: `1px solid ${agent.color}35`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        flexShrink: 0,
      }}>
        {agent.avatar}
      </div>
      <div style={{
        padding: '12px 16px',
        borderRadius: '18px 18px 18px 4px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: agent.color,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// 嵌入式决策卡片
function EmbeddedDecisionCard({ 
  card, 
  agentColor,
  onConfirm,
}: { 
  card: NonNullable<ChatMessage['decisionCard']>;
  agentColor: string;
  onConfirm: () => void;
}) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = () => {
    hapticSuccess();
    setIsConfirmed(true);
    setTimeout(onConfirm, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_GENTLE}
      style={{
        borderRadius: 16,
        background: `linear-gradient(145deg, ${agentColor}12, ${agentColor}06)`,
        border: `1px solid ${agentColor}30`,
        padding: 14,
        marginTop: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 确认后的覆盖层 */}
      <AnimatePresence>
        {isConfirmed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: `${C.green}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              borderRadius: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 6 }}>
        {card.title}
      </div>
      <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5, marginBottom: 10 }}>
        {card.summary}
      </div>
      {card.value && (
        <div style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 50,
          background: `${C.green}15`,
          border: `1px solid ${C.green}30`,
          fontSize: 11,
          fontWeight: 700,
          color: C.green,
          marginBottom: 10,
        }}>
          {card.value}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleConfirm}
          disabled={isConfirmed}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 50,
            background: `linear-gradient(135deg, ${agentColor}30, ${agentColor}18)`,
            border: `1px solid ${agentColor}45`,
            fontSize: 12,
            fontWeight: 800,
            color: agentColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            opacity: isConfirmed ? 0.5 : 1,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {card.action}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '10px 16px',
            borderRadius: 50,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 12,
            fontWeight: 700,
            color: C.t3,
            cursor: 'pointer',
          }}
        >
          稍后
        </motion.button>
      </div>
    </motion.div>
  );
}

// 消息气泡
function MessageBubble({ 
  message, 
  agent,
  onCardConfirm,
}: { 
  message: ChatMessage; 
  agent: AIAgent;
  onCardConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_GENTLE}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '8px 20px',
      }}
    >
      {/* Agent 头像 */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: `${agent.color}20`,
        border: `1px solid ${agent.color}35`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        flexShrink: 0,
      }}>
        {agent.avatar}
      </div>

      {/* 消息内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Agent 名称 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: agent.color }}>{agent.name}</span>
          <span style={{ fontSize: 10, color: C.t3 }}>
            {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* 文本消息 */}
        {message.type === 'text' && message.content && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '4px 18px 18px 18px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 13,
            color: C.t1,
            lineHeight: 1.55,
          }}>
            {message.content}
          </div>
        )}

        {/* 决策卡片 */}
        {message.type === 'decision-card' && message.decisionCard && (
          <EmbeddedDecisionCard 
            card={message.decisionCard} 
            agentColor={agent.color}
            onConfirm={onCardConfirm}
          />
        )}
      </div>
    </motion.div>
  );
}

// 语音输入按钮
function VoiceInputButton({ onActivate }: { onActivate: () => void }) {
  const [isActive, setIsActive] = useState(false);

  const handlePress = () => {
    hapticMedium();
    setIsActive(true);
    onActivate();
    setTimeout(() => setIsActive(false), 2000);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handlePress}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: isActive ? `${C.PL}30` : 'rgba(255,255,255,0.06)',
        border: `1.5px solid ${isActive ? C.PL : 'rgba(255,255,255,0.1)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 声波动画 */}
      {isActive && (
        <>
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              animate={{ scale: [1, 2], opacity: [0.5, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `1px solid ${C.PL}`,
              }}
            />
          ))}
        </>
      )}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isActive ? C.PL : 'rgba(255,255,255,0.5)'} strokeWidth="2" strokeLinecap="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </motion.button>
  );
}

// 快捷指令
function QuickCommand({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => { hapticLight(); onClick(); }}
      style={{
        padding: '8px 14px',
        borderRadius: 50,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 12,
        fontWeight: 600,
        color: C.t2,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </motion.button>
  );
}

// 主页面
export default function CommanderChat() {
  const [, navigate] = useLocation();
  const [selectedAgentId, setSelectedAgentId] = useState('sage');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAgent = AI_AGENTS.find(a => a.id === selectedAgentId) || AI_AGENTS[0];

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // 发送消息
  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    // 用户消息（这里简化处理，实际应该有用户消息类型）
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      agentId: 'user',
      content,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // 模拟 AI 响应
    setTimeout(() => {
      setIsTyping(false);
      const aiResponse: ChatMessage = {
        id: `ai-${Date.now()}`,
        agentId: selectedAgentId,
        content: `收到您的指令："${content}"。我正在分析相关数据，稍后为您提供详细建议。`,
        timestamp: new Date(),
        type: 'text',
      };
      setMessages(prev => [...prev, aiResponse]);

      // 如果是特定指令，追加决策卡片
      if (content.includes('触达') || content.includes('分析') || content.includes('市场')) {
        setTimeout(() => {
          const cardMessage: ChatMessage = {
            id: `card-${Date.now()}`,
            agentId: selectedAgentId,
            content: '',
            timestamp: new Date(),
            type: 'decision-card',
            decisionCard: {
              title: '执行市场分析任务',
              summary: '已识别 15 个潜在目标客户，建议启动定向触达序列',
              action: '立即执行',
              value: '预估转化率 12%',
            },
          };
          setMessages(prev => [...prev, cardMessage]);
        }, 1000);
      }
    }, 1500);
  }, [selectedAgentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const quickCommands = [
    '今日市场简报',
    '分析沙特市场',
    '生成营销内容',
    '查看待处理询盘',
  ];

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100dvh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Noise intensity={0.02}/>

      {/* 头部 */}
      <div style={{
        flexShrink: 0,
        padding: '50px 20px 0',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 100%)',
        position: 'relative',
        zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { hapticLight(); navigate('/'); }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </motion.button>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: C.t1, letterSpacing: -0.5 }}>指挥中心</h1>
            <span style={{ fontSize: 11, color: C.t3 }}>与 AI 团队对话</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { hapticLight(); navigate('/agents'); }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </motion.button>
        </div>

        {/* Agent 选择器 */}
        <AgentSelector
          agents={AI_AGENTS}
          selectedId={selectedAgentId}
          onSelect={setSelectedAgentId}
        />
      </div>

      {/* 消息列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: 12,
        paddingBottom: 20,
      }}>
        {messages.map(message => {
          const agent = AI_AGENTS.find(a => a.id === message.agentId);
          if (!agent) {
            // 用户消息（简化处理）
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  padding: '8px 20px',
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: '18px 18px 4px 18px',
                  background: `linear-gradient(135deg, ${C.PL}30, ${C.PL}20)`,
                  border: `1px solid ${C.PL}40`,
                  fontSize: 13,
                  color: C.t1,
                  lineHeight: 1.55,
                }}>
                  {message.content}
                </div>
              </motion.div>
            );
          }
          return (
            <MessageBubble
              key={message.id}
              message={message}
              agent={agent}
              onCardConfirm={() => console.log('Card confirmed')}
            />
          );
        })}

        {/* 打字指示器 */}
        <AnimatePresence>
          {isTyping && <TypingIndicator agent={selectedAgent} />}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* 快捷指令 */}
      <div style={{
        flexShrink: 0,
        padding: '8px 20px',
        overflowX: 'auto',
        display: 'flex',
        gap: 8,
        scrollbarWidth: 'none',
      }}>
        {quickCommands.map(cmd => (
          <QuickCommand key={cmd} label={cmd} onClick={() => sendMessage(cmd)} />
        ))}
      </div>

      {/* 输入区域 */}
      <div style={{
        flexShrink: 0,
        padding: '12px 20px 34px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <VoiceInputButton onActivate={() => console.log('Voice activated')} />
          
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            padding: '10px 16px',
            borderRadius: 50,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={`向 ${selectedAgent.name} 发送指令...`}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                color: C.t1,
              }}
            />
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!inputValue.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: inputValue.trim() ? `linear-gradient(135deg, ${C.PL}, ${C.blue})` : 'rgba(255,255,255,0.06)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              opacity: inputValue.trim() ? 1 : 0.5,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </motion.button>
        </form>
      </div>
    </div>
  );
}
