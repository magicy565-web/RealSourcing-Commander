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

// ── 根据 Warroom 数据生成上下文快捷指令 ──────────────────────────
export function buildQuickActions(params: {
  totalPending: number;
  completionRate: number;
  hasTikTok: boolean;
  hasMeta: boolean;
}): QuickAction[] {
  const actions: QuickAction[] = [];

  if (params.totalPending > 0) {
    actions.push({
      id: 'summarize',
      label: '汇总今日待办',
      icon: '📋',
      prompt: `请汇总今日 ${params.totalPending} 条待处理消息的优先级，并给出处理建议。`,
      color: '#A78BFA',
    });
  }

  if (params.completionRate < 60) {
    actions.push({
      id: 'boost',
      label: '提升完成率',
      icon: '🚀',
      prompt: '当前完成率偏低，请分析原因并给出 3 个快速提升完成率的具体行动方案。',
      color: '#F59E0B',
    });
  }

  if (params.hasTikTok) {
    actions.push({
      id: 'tiktok',
      label: 'TikTok 分析',
      icon: '🎵',
      prompt: '请分析 TikTok 平台近 7 日的询盘趋势，识别高转化内容特征，并给出内容优化建议。',
      color: '#FE2C55',
    });
  }

  if (params.hasMeta) {
    actions.push({
      id: 'meta',
      label: 'Meta 广告优化',
      icon: '📘',
      prompt: '请分析 Meta 平台广告效果，给出受众定向和创意优化的具体建议。',
      color: '#60A5FA',
    });
  }

  actions.push({
    id: 'weekly',
    label: '本周报告',
    icon: '📊',
    prompt: '请生成本周业务数据摘要报告，包含询盘量、回复率、转化率等核心指标的分析。',
    color: '#34D399',
  });

  actions.push({
    id: 'competitors',
    label: '竞品动态',
    icon: '🔍',
    prompt: '请分析近期竞品的市场动态，识别潜在威胁和机会，给出差异化竞争建议。',
  });

  return actions.slice(0, 5);
}
