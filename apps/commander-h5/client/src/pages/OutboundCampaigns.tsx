import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  BarChart3,
  Mail,
  MessageSquare,
  Phone,
  Linkedin,
  Users,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Send,
} from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'linkedin' | 'call' | 'multi-channel';
  status: 'active' | 'paused' | 'completed' | 'draft';
  progress: number;
  stats: {
    sent: number;
    opened: number;
    replied: number;
    meetings: number;
  };
  aiOptimizing: boolean;
  targetCount: number;
  startDate: string;
  performance: 'excellent' | 'good' | 'average' | 'poor';
}

interface CampaignStep {
  id: string;
  day: number;
  channel: 'email' | 'linkedin' | 'call';
  action: string;
  status: 'completed' | 'in-progress' | 'pending';
  sentCount: number;
  responseRate: number;
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: '科技企业决策者拓展',
    type: 'multi-channel',
    status: 'active',
    progress: 68,
    stats: { sent: 1250, opened: 456, replied: 89, meetings: 23 },
    aiOptimizing: true,
    targetCount: 500,
    startDate: '3天前',
    performance: 'excellent',
  },
  {
    id: '2',
    name: 'Q1产品发布预热',
    type: 'email',
    status: 'active',
    progress: 45,
    stats: { sent: 890, opened: 312, replied: 45, meetings: 12 },
    aiOptimizing: false,
    targetCount: 2000,
    startDate: '1周前',
    performance: 'good',
  },
  {
    id: '3',
    name: 'LinkedIn高管触达',
    type: 'linkedin',
    status: 'paused',
    progress: 82,
    stats: { sent: 320, opened: 180, replied: 67, meetings: 18 },
    aiOptimizing: false,
    targetCount: 400,
    startDate: '2周前',
    performance: 'excellent',
  },
  {
    id: '4',
    name: '电话跟进计划',
    type: 'call',
    status: 'draft',
    progress: 0,
    stats: { sent: 0, opened: 0, replied: 0, meetings: 0 },
    aiOptimizing: false,
    targetCount: 150,
    startDate: '未开始',
    performance: 'average',
  },
];

const campaignSteps: CampaignStep[] = [
  { id: '1', day: 1, channel: 'email', action: '初始联系邮件', status: 'completed', sentCount: 500, responseRate: 12 },
  { id: '2', day: 3, channel: 'linkedin', action: 'LinkedIn连接请求', status: 'completed', sentCount: 450, responseRate: 28 },
  { id: '3', day: 5, channel: 'email', action: '价值分享邮件', status: 'in-progress', sentCount: 340, responseRate: 15 },
  { id: '4', day: 7, channel: 'call', action: '电话跟进', status: 'pending', sentCount: 0, responseRate: 0 },
  { id: '5', day: 10, channel: 'email', action: '案例研究分享', status: 'pending', sentCount: 0, responseRate: 0 },
];

const channelIcons = {
  email: Mail,
  linkedin: Linkedin,
  call: Phone,
  'multi-channel': Zap,
};

const channelColors = {
  email: 'from-blue-500/30 to-blue-600/20',
  linkedin: 'from-sky-500/30 to-sky-600/20',
  call: 'from-emerald-500/30 to-emerald-600/20',
  'multi-channel': 'from-violet-500/30 to-violet-600/20',
};

const statusConfig = {
  active: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: Play },
  paused: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Pause },
  completed: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: CheckCircle2 },
  draft: { color: 'text-white/50', bg: 'bg-white/10', icon: AlertCircle },
};

const performanceConfig = {
  excellent: { color: 'text-emerald-400', label: '优秀' },
  good: { color: 'text-blue-400', label: '良好' },
  average: { color: 'text-amber-400', label: '一般' },
  poor: { color: 'text-rose-400', label: '需改进' },
};

// Campaign Card Component
function CampaignCard({ campaign, onSelect }: { campaign: Campaign; onSelect: () => void }) {
  const ChannelIcon = channelIcons[campaign.type];
  const StatusIcon = statusConfig[campaign.status].icon;
  
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => {
        triggerHaptic('light');
        onSelect();
      }}
      className={`
        relative overflow-hidden p-4 rounded-2xl
        bg-gradient-to-br ${channelColors[campaign.type]}
        backdrop-blur-xl border border-white/10 cursor-pointer
      `}
    >
      {/* AI Optimizing Indicator */}
      {campaign.aiOptimizing && (
        <motion.div
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-violet-500/30 rounded-full"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-3 h-3 text-violet-400" />
          <span className="text-xs text-violet-300">AI优化中</span>
        </motion.div>
      )}
      
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
          <ChannelIcon className="w-6 h-6 text-white/80" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate pr-16">{campaign.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`flex items-center gap-1 px-2 py-0.5 ${statusConfig[campaign.status].bg} rounded-full text-xs ${statusConfig[campaign.status].color}`}>
              <StatusIcon className="w-3 h-3" />
              {campaign.status === 'active' ? '运行中' : campaign.status === 'paused' ? '已暂停' : campaign.status === 'completed' ? '已完成' : '草稿'}
            </span>
            <span className="text-xs text-white/40">{campaign.startDate}</span>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-white/50">进度</span>
          <span className="text-xs text-white/70">{campaign.progress}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${campaign.progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: '已发送', value: campaign.stats.sent, icon: Send },
          { label: '已打开', value: campaign.stats.opened, icon: Mail },
          { label: '已回复', value: campaign.stats.replied, icon: MessageSquare },
          { label: '会议', value: campaign.stats.meetings, icon: Users },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-lg font-bold text-white">{stat.value}</div>
            <div className="text-xs text-white/40">{stat.label}</div>
          </div>
        ))}
      </div>
      
      {/* Performance Badge */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-white/50" />
          <span className="text-sm text-white/70">{campaign.targetCount} 目标</span>
        </div>
        <span className={`text-sm font-medium ${performanceConfig[campaign.performance].color}`}>
          {performanceConfig[campaign.performance].label}
        </span>
      </div>
    </motion.div>
  );
}

// Campaign Detail Sheet
function CampaignDetail({ campaign, steps, onClose }: { 
  campaign: Campaign; 
  steps: CampaignStep[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#1a1a2e] to-[#0a0a0f] rounded-t-3xl max-h-[85vh] overflow-hidden"
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white">{campaign.name}</h2>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className={`
                px-4 py-2 rounded-xl flex items-center gap-2
                ${campaign.status === 'active' 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'bg-emerald-500/20 text-emerald-400'
                }
              `}
            >
              {campaign.status === 'active' ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span className="text-sm font-medium">暂停</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span className="text-sm font-medium">启动</span>
                </>
              )}
            </motion.button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-white">{campaign.stats.sent}</div>
              <div className="text-xs text-white/50">已发送</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-white">
                {campaign.stats.sent > 0 ? Math.round((campaign.stats.opened / campaign.stats.sent) * 100) : 0}%
              </div>
              <div className="text-xs text-white/50">打开率</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-white">
                {campaign.stats.sent > 0 ? Math.round((campaign.stats.replied / campaign.stats.sent) * 100) : 0}%
              </div>
              <div className="text-xs text-white/50">回复率</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-emerald-400">{campaign.stats.meetings}</div>
              <div className="text-xs text-white/50">会议</div>
            </div>
          </div>
        </div>
        
        {/* Campaign Sequence */}
        <div className="px-6 pb-6 overflow-y-auto max-h-[50vh]">
          <h3 className="text-sm font-medium text-white/70 mb-4">营销序列</h3>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-emerald-500/50 via-blue-500/50 to-white/10" />
            
            <div className="space-y-4">
              {steps.map((step, index) => {
                const StepIcon = channelIcons[step.channel];
                const isCompleted = step.status === 'completed';
                const isInProgress = step.status === 'in-progress';
                
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-start gap-4"
                  >
                    {/* Timeline node */}
                    <div className={`
                      relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                      ${isCompleted ? 'bg-emerald-500/30' : isInProgress ? 'bg-blue-500/30' : 'bg-white/10'}
                    `}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isInProgress ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                          <RefreshCw className="w-5 h-5 text-blue-400" />
                        </motion.div>
                      ) : (
                        <Clock className="w-5 h-5 text-white/40" />
                      )}
                    </div>
                    
                    {/* Step content */}
                    <div className={`
                      flex-1 p-4 rounded-xl border
                      ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20' : ''}
                      ${isInProgress ? 'bg-blue-500/10 border-blue-500/20' : ''}
                      ${step.status === 'pending' ? 'bg-white/5 border-white/10' : ''}
                    `}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center
                            ${step.channel === 'email' ? 'bg-blue-500/20' : ''}
                            ${step.channel === 'linkedin' ? 'bg-sky-500/20' : ''}
                            ${step.channel === 'call' ? 'bg-emerald-500/20' : ''}
                          `}>
                            <StepIcon className="w-3 h-3 text-white/70" />
                          </div>
                          <span className="text-sm font-medium text-white">{step.action}</span>
                        </div>
                        <span className="text-xs text-white/40">Day {step.day}</span>
                      </div>
                      
                      {(isCompleted || isInProgress) && (
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-white/50">
                            已发送: <span className="text-white/80">{step.sentCount}</span>
                          </span>
                          <span className="text-white/50">
                            回复率: <span className={step.responseRate > 10 ? 'text-emerald-400' : 'text-white/80'}>{step.responseRate}%</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* AI Insights */}
        {campaign.aiOptimizing && (
          <div className="px-6 pb-6">
            <motion.div
              className="p-4 bg-gradient-to-r from-violet-500/20 to-purple-500/10 rounded-2xl border border-violet-500/20"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-white mb-1">AI 正在优化</h4>
                  <p className="text-sm text-white/70">
                    检测到周二发送的邮件打开率提高了23%。AI正在调整发送时间以最大化触达效果。
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Quick Stats Overview
function QuickStats() {
  const stats = [
    { label: '活跃营销', value: '3', trend: 'up', change: 1 },
    { label: '本周触达', value: '2,460', trend: 'up', change: 15 },
    { label: '回复率', value: '8.2%', trend: 'up', change: 2.1 },
    { label: '预约会议', value: '53', trend: 'down', change: 5 },
  ];
  
  return (
    <div className="grid grid-cols-2 gap-3 px-4 mb-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="p-4 bg-white/5 rounded-2xl backdrop-blur-xl border border-white/10"
        >
          <p className="text-xs text-white/50 mb-1">{stat.label}</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-white">{stat.value}</span>
            <span className={`flex items-center gap-0.5 text-xs ${stat.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stat.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stat.change}%
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function OutboundCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  
  const filteredCampaigns = mockCampaigns.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      
      {/* Header */}
      <header className="relative z-10 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </motion.button>
          
          <h1 className="text-xl font-bold">外呼营销</h1>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center"
          >
            <Plus className="w-5 h-5 text-emerald-400" />
          </motion.button>
        </div>
      </header>
      
      {/* Quick Stats */}
      <QuickStats />
      
      {/* Filter Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'all', label: '全部' },
            { id: 'active', label: '运行中' },
            { id: 'paused', label: '已暂停' },
            { id: 'draft', label: '草稿' },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                setFilter(tab.id as 'all' | 'active' | 'paused' | 'draft');
              }}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${filter === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/50'
                }
              `}
              whileTap={{ scale: 0.95 }}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Campaign List */}
      <div className="relative z-10 px-4 pb-24 space-y-4">
        {filteredCampaigns.map((campaign, index) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CampaignCard
              campaign={campaign}
              onSelect={() => setSelectedCampaign(campaign)}
            />
          </motion.div>
        ))}
        
        {/* Create New Campaign CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full p-6 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center gap-3 text-white/50 hover:text-white/70 hover:border-white/30 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium">创建新营销活动</span>
        </motion.button>
      </div>
      
      {/* Campaign Detail Sheet */}
      <AnimatePresence>
        {selectedCampaign && (
          <CampaignDetail
            campaign={selectedCampaign}
            steps={campaignSteps}
            onClose={() => setSelectedCampaign(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
