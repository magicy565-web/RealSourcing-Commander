/**
 * Dashboard - 交互页面导航仪表板
 * 
 * 快速访问所有新创建的交互页面
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  Watch,
  Zap,
  Brain,
  MessageSquare,
  Users,
  Radar,
  TrendingUp,
  Send,
  BookOpen,
  Settings,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

const C = {
  bg: '#000000',
  t1: 'rgba(255,255,255,0.92)',
  t2: 'rgba(255,255,255,0.52)',
  t3: 'rgba(255,255,255,0.26)',
  P: '#7C3AED',
  PL: '#A78BFA',
};

const pages = [
  {
    id: 'watch-face',
    name: '表盘首页',
    desc: '高级感的手表表盘设计，展示时间和AI代理状态',
    icon: Watch,
    color: 'from-blue-500 to-cyan-500',
    interaction: '平静无缝的页面切换',
  },
  {
    id: 'decision-feed',
    name: '决策流',
    desc: '确认卡片满足感动画、驳回暂存、长按展开',
    icon: Zap,
    color: 'from-yellow-500 to-orange-500',
    interaction: '强烈满足感 + 暂停感 + 聚焦感',
  },
  {
    id: 'ai-training',
    name: 'AI训练中心',
    desc: '知识流动的有机感，能力解锁动画',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    interaction: '液态shimmer效果，有生命感',
  },
  {
    id: 'commander-chat',
    name: '指挥对话',
    desc: '多Agent对话界面，支持内嵌决策卡片',
    icon: MessageSquare,
    color: 'from-emerald-500 to-teal-500',
    interaction: '流畅的对话体验',
  },
  {
    id: 'digital-agents',
    name: '数字员工团队',
    desc: '展示所有AI Agent的状态、任务和进度',
    icon: Users,
    color: 'from-indigo-500 to-purple-500',
    interaction: '实时状态反馈',
  },
  {
    id: 'market-radar',
    name: '市场雷达',
    desc: '声呐探测风格，全球市场信号可视化',
    icon: Radar,
    color: 'from-rose-500 to-pink-500',
    interaction: '活的指挥中心感',
  },
  {
    id: 'inbound-funnel',
    name: '入站漏斗',
    desc: '销售漏斗可视化，线索卡片支持滑动',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500',
    interaction: '流畅的数据流动',
  },
  {
    id: 'outbound-campaigns',
    name: '外呼营销',
    desc: '营销活动管理，AI优化建议',
    icon: Send,
    color: 'from-cyan-500 to-blue-500',
    interaction: '强大的营销工具',
  },
  {
    id: 'content-studio',
    name: '内容工作室',
    desc: '内容创作管理，AI生成建议，发布日历',
    icon: BookOpen,
    color: 'from-fuchsia-500 to-purple-500',
    interaction: '创意创作工具',
  },
  {
    id: 'settings',
    name: '设置中心',
    desc: '账户、通知、安全、AI设置、外观',
    icon: Settings,
    color: 'from-slate-500 to-gray-500',
    interaction: '完整的配置管理',
  },
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  const handleNavigate = (pageId: string) => {
    navigate(`/${pageId}`);
  };

  return (
    <div
      className="min-h-screen pb-20"
      style={{ background: C.bg }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 backdrop-blur-xl border-b"
        style={{
          borderColor: 'rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.5)',
        }}
      >
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/boss-warroom')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="flex items-center gap-2 text-white text-lg font-bold">
            <Sparkles className="w-5 h-5" style={{ color: C.P }} />
            交互页面
          </h1>
          <div className="w-14" />
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Grid of pages */}
        <div className="grid grid-cols-1 gap-3">
          {pages.map((page, idx) => {
            const Icon = page.icon;
            const isSelected = selectedPage === page.id;

            return (
              <motion.button
                key={page.id}
                onClick={() => handleNavigate(page.id)}
                onHoverStart={() => setSelectedPage(page.id)}
                onHoverEnd={() => setSelectedPage(null)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative overflow-hidden rounded-lg text-left group"
              >
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${page.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
                />

                {/* Border glow on hover */}
                <motion.div
                  className="absolute inset-0 rounded-lg border pointer-events-none"
                  style={{
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                  animate={{
                    borderColor: isSelected
                      ? 'rgba(255,255,255,0.3)'
                      : 'rgba(255,255,255,0.1)',
                  }}
                />

                {/* Content */}
                <div className="relative px-4 py-4 flex items-start gap-3">
                  {/* Icon */}
                  <motion.div
                    className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${page.color} flex items-center justify-center`}
                    animate={{
                      scale: isSelected ? 1.1 : 1,
                      rotate: isSelected ? 5 : 0,
                    }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </motion.div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-semibold text-base">{page.name}</h2>
                    <p className="text-white/50 text-xs mt-1 line-clamp-2">{page.desc}</p>
                    <motion.p
                      className="text-white/40 text-xs mt-2 flex items-center gap-1"
                      animate={{
                        opacity: isSelected ? 1 : 0.4,
                      }}
                    >
                      <span>→</span>
                      <span>{page.interaction}</span>
                    </motion.p>
                  </div>

                  {/* Arrow */}
                  <motion.div
                    animate={{
                      x: isSelected ? 4 : 0,
                    }}
                    className="text-white/30"
                  >
                    {'>'}
                  </motion.div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Info section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-lg"
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderLeft: `2px solid ${C.P}`,
          }}
        >
          <p className="text-white/60 text-xs leading-relaxed">
            这个仪表板展示了所有已实现的交互设计页面。每个页面都包含特定的交互模式和设计理念，用来优化老板的日常指挥体验。
          </p>
        </motion.div>
      </div>
    </div>
  );
}
