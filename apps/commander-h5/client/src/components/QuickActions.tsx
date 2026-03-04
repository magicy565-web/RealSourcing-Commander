/**
 * QuickActions — 快捷指令组件
 *
 * 在对话框上方提供基于上下文的快捷回复模板。
 * 根据当前数据状态动态生成相关指令。
 */

import { motion } from 'framer-motion';
import { hapticSelection } from '../lib/haptics';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  color?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  onSelect: (prompt: string) => void;
}

export function QuickActions({ actions, onSelect }: QuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        display: 'flex',
        gap: 7,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        paddingBottom: 2,
      }}
    >
      {actions.map((action, i) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 28 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            hapticSelection();
            onSelect(action.prompt);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 12px',
            borderRadius: 50,
            background: action.color
              ? `${action.color}14`
              : 'rgba(255,255,255,0.05)',
            border: action.color
              ? `1px solid ${action.color}28`
              : '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          } as React.CSSProperties}
        >
          <span style={{ fontSize: 12 }}>{action.icon}</span>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: action.color ?? 'rgba(255,255,255,0.6)',
            letterSpacing: -0.2,
          }}>
            {action.label}
          </span>
        </motion.button>
      ))}
    </motion.div>
  );
}

// ── 根据 Warroom 数据生成上下文快捷指令（对齐新产品方向）──────────
export function buildQuickActions(params: {
  totalPending: number;
  completionRate: number;
  hasProducts: boolean;
  hasInquiries: boolean;
}): QuickAction[] {
  const actions: QuickAction[] = [];

  // 核心：产品资料库上传引导
  actions.push({
    id: 'upload-product',
    label: '上传产品资料',
    icon: '📦',
    prompt: '我想上传产品资料，让 AI 开始学习并分析市场机会。请告诉我需要准备哪些文件格式，以及上传后 AI 会做什么。',
    color: '#F59E0B',
  });

  // 有待处理询盘时优先提示
  if (params.totalPending > 0) {
    actions.push({
      id: 'handle-inquiries',
      label: `处理 ${params.totalPending} 条询盘`,
      icon: '📬',
      prompt: `当前有 ${params.totalPending} 条待处理询盘，请按优先级排序，并为每条询盘生成一份专业的英文回复草稿。`,
      color: '#F87171',
    });
  }

  // 有产品资料时推送市场扫描
  if (params.hasProducts) {
    actions.push({
      id: 'market-scan',
      label: '扫描目标市场',
      icon: '🔍',
      prompt: '请基于我的产品资料库，分析中东（沙特、UAE）市场的需求趋势、竞争强度和进入机会，给出优先开发的市场建议。',
      color: '#A78BFA',
    });
  }

  // 有询盘时推送质量分析
  if (params.hasInquiries) {
    actions.push({
      id: 'inquiries-analysis',
      label: '询盘质量分析',
      icon: '📊',
      prompt: '请分析最近的询盘数据，识别高意向买家特征，给出提升询盘转化率的具体建议。',
      color: '#34D399',
    });
  }

  // 本土化内容生成
  actions.push({
    id: 'localize-content',
    label: '生成本土化内容',
    icon: '🌍',
    prompt: '请为我的产品生成一套面向中东市场的本土化内容方案，包括：阿拉伯语产品介绍、Facebook 帖子文案、海报设计方向。',
    color: '#60A5FA',
  });

  return actions.slice(0, 5);
}
