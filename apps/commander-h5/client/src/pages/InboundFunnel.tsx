import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  ArrowLeft,
  Filter,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Clock,
  Star,
  ChevronRight,
  Phone,
  Mail,
  Globe,
  Zap,
  Target,
  BarChart3,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface Lead {
  id: string;
  name: string;
  company: string;
  avatar: string;
  source: 'website' | 'referral' | 'linkedin' | 'email' | 'ads';
  score: number;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation';
  value: number;
  lastActivity: string;
  aiRecommendation?: string;
  isHot: boolean;
  tags: string[];
}

interface FunnelStage {
  id: string;
  name: string;
  count: number;
  value: number;
  conversionRate: number;
  trend: 'up' | 'down' | 'stable';
}

const mockLeads: Lead[] = [
  {
    id: '1',
    name: '张伟',
    company: '华为技术有限公司',
    avatar: 'Z',
    source: 'linkedin',
    score: 95,
    stage: 'qualified',
    value: 500000,
    lastActivity: '10分钟前',
    aiRecommendation: '建议立即跟进，决策窗口期仅剩3天',
    isHot: true,
    tags: ['决策者', '高预算'],
  },
  {
    id: '2',
    name: '李芳',
    company: '阿里巴巴集团',
    avatar: 'L',
    source: 'website',
    score: 88,
    stage: 'proposal',
    value: 320000,
    lastActivity: '1小时前',
    aiRecommendation: '报价已发送，等待回复中',
    isHot: true,
    tags: ['技术决策者'],
  },
  {
    id: '3',
    name: '王磊',
    company: '字节跳动',
    avatar: 'W',
    source: 'referral',
    score: 76,
    stage: 'contacted',
    value: 180000,
    lastActivity: '3小时前',
    isHot: false,
    tags: ['中型企业'],
  },
  {
    id: '4',
    name: '陈静',
    company: '腾讯科技',
    avatar: 'C',
    source: 'ads',
    score: 82,
    stage: 'new',
    value: 250000,
    lastActivity: '刚刚',
    aiRecommendation: '新线索！来自Google广告，建议24小时内联系',
    isHot: true,
    tags: ['新线索', '广告来源'],
  },
];

const funnelStages: FunnelStage[] = [
  { id: 'new', name: '新线索', count: 156, value: 4800000, conversionRate: 100, trend: 'up' },
  { id: 'contacted', name: '已联系', count: 89, value: 2900000, conversionRate: 57, trend: 'up' },
  { id: 'qualified', name: '已验证', count: 45, value: 1800000, conversionRate: 51, trend: 'stable' },
  { id: 'proposal', name: '提案中', count: 23, value: 980000, conversionRate: 51, trend: 'down' },
  { id: 'negotiation', name: '谈判中', count: 12, value: 560000, conversionRate: 52, trend: 'up' },
];

const sourceIcons = {
  website: Globe,
  referral: Users,
  linkedin: MessageSquare,
  email: Mail,
  ads: Target,
};

const sourceColors = {
  website: 'from-blue-500/20 to-blue-600/10',
  referral: 'from-green-500/20 to-green-600/10',
  linkedin: 'from-sky-500/20 to-sky-600/10',
  email: 'from-purple-500/20 to-purple-600/10',
  ads: 'from-orange-500/20 to-orange-600/10',
};

// Animated Funnel Visualization
function FunnelVisualization({ stages }: { stages: FunnelStage[] }) {
  return (
    <div className="relative px-4 py-6">
      <div className="relative">
        {stages.map((stage, index) => {
          const widthPercent = 100 - (index * 15);
          const isLast = index === stages.length - 1;
          
          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative mb-1"
            >
              <div 
                className="relative mx-auto overflow-hidden"
                style={{ width: `${widthPercent}%` }}
              >
                {/* Funnel segment */}
                <motion.div
                  className={`
                    relative h-14 rounded-lg
                    ${index === 0 ? 'bg-gradient-to-r from-emerald-500/30 to-emerald-400/20' : ''}
                    ${index === 1 ? 'bg-gradient-to-r from-blue-500/30 to-blue-400/20' : ''}
                    ${index === 2 ? 'bg-gradient-to-r from-violet-500/30 to-violet-400/20' : ''}
                    ${index === 3 ? 'bg-gradient-to-r from-amber-500/30 to-amber-400/20' : ''}
                    ${index === 4 ? 'bg-gradient-to-r from-rose-500/30 to-rose-400/20' : ''}
                    backdrop-blur-sm border border-white/10
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Flowing particles */}
                  <div className="absolute inset-0 overflow-hidden">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white/40 rounded-full"
                        animate={{
                          x: ['-10%', '110%'],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          delay: i * 0.3,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        style={{ top: `${30 + i * 20}%` }}
                      />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex items-center justify-between h-full px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white/90">{stage.name}</span>
                      <span className="text-xs text-white/50">
                        {stage.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400 inline" />}
                        {stage.trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-400 inline" />}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{stage.count}</div>
                        <div className="text-xs text-white/50">线索</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-white/80">
                          ¥{(stage.value / 10000).toFixed(0)}万
                        </div>
                        <div className="text-xs text-white/50">价值</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Conversion rate connector */}
                {!isLast && (
                  <div className="flex items-center justify-center py-1">
                    <motion.div
                      className="flex items-center gap-1 text-xs text-white/40"
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ArrowDownRight className="w-3 h-3" />
                      <span>{stages[index + 1].conversionRate}%</span>
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Lead Card Component
function LeadCard({ lead, onAction }: { lead: Lead; onAction: (action: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0, 100],
    ['rgba(239, 68, 68, 0.3)', 'rgba(0, 0, 0, 0)', 'rgba(34, 197, 94, 0.3)']
  );
  
  const SourceIcon = sourceIcons[lead.source];
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 100) {
      triggerHaptic('success');
      onAction('contact');
    } else if (info.offset.x < -100) {
      triggerHaptic('warning');
      onAction('defer');
    }
  };
  
  return (
    <motion.div
      style={{ background }}
      className="relative overflow-hidden rounded-2xl"
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`
          relative bg-gradient-to-br ${sourceColors[lead.source]}
          backdrop-blur-xl border border-white/10 rounded-2xl p-4
        `}
        whileTap={{ scale: 0.98 }}
        onTap={() => {
          triggerHaptic('light');
          setIsExpanded(!isExpanded);
        }}
      >
        {/* Hot indicator */}
        {lead.isHot && (
          <motion.div
            className="absolute top-3 right-3"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
          </motion.div>
        )}
        
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-white font-bold text-lg">
              {lead.avatar}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
              <SourceIcon className="w-3 h-3 text-white/70" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{lead.name}</h3>
              <div className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                ${lead.score >= 90 ? 'bg-emerald-500/30 text-emerald-300' : ''}
                ${lead.score >= 70 && lead.score < 90 ? 'bg-blue-500/30 text-blue-300' : ''}
                ${lead.score < 70 ? 'bg-white/20 text-white/70' : ''}
              `}>
                {lead.score}分
              </div>
            </div>
            <p className="text-sm text-white/60 truncate">{lead.company}</p>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-bold text-white">¥{(lead.value / 10000).toFixed(0)}万</div>
            <div className="text-xs text-white/50">{lead.lastActivity}</div>
          </div>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {lead.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/70"
            >
              {tag}
            </span>
          ))}
        </div>
        
        {/* AI Recommendation */}
        {lead.aiRecommendation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-3 bg-gradient-to-r from-violet-500/20 to-purple-500/10 rounded-xl border border-violet-500/20"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white/80">{lead.aiRecommendation}</p>
            </div>
          </motion.div>
        )}
        
        {/* Expanded Actions */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="grid grid-cols-3 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    triggerHaptic('medium');
                    onAction('call');
                  }}
                  className="flex flex-col items-center gap-1 p-3 bg-emerald-500/20 rounded-xl"
                >
                  <Phone className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs text-white/70">拨打</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    triggerHaptic('medium');
                    onAction('email');
                  }}
                  className="flex flex-col items-center gap-1 p-3 bg-blue-500/20 rounded-xl"
                >
                  <Mail className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-white/70">邮件</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    triggerHaptic('medium');
                    onAction('view');
                  }}
                  className="flex flex-col items-center gap-1 p-3 bg-violet-500/20 rounded-xl"
                >
                  <BarChart3 className="w-5 h-5 text-violet-400" />
                  <span className="text-xs text-white/70">详情</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Expand indicator */}
        <div className="flex justify-center mt-3">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4 text-white/50" />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Stats Card
function StatsCard({ label, value, change, icon: Icon, color }: {
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden p-4 rounded-2xl
        bg-gradient-to-br ${color}
        backdrop-blur-xl border border-white/10
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/50 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white/70" />
        </div>
      </div>
      <div className={`flex items-center gap-1 mt-2 text-xs ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        <span>{Math.abs(change)}% vs 上周</span>
      </div>
    </motion.div>
  );
}

export default function InboundFunnel() {
  const [activeTab, setActiveTab] = useState<'funnel' | 'leads'>('funnel');
  const [filter, setFilter] = useState<'all' | 'hot' | 'new'>('all');
  
  const filteredLeads = mockLeads.filter(lead => {
    if (filter === 'hot') return lead.isHot;
    if (filter === 'new') return lead.stage === 'new';
    return true;
  });
  
  const handleLeadAction = useCallback((leadId: string, action: string) => {
    console.log(`Lead ${leadId} action: ${action}`);
  }, []);
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      
      {/* Header */}
      <header className="relative z-10 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </motion.button>
          
          <h1 className="text-xl font-bold">入站漏斗</h1>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <Filter className="w-5 h-5 text-white/70" />
          </motion.button>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <StatsCard
            label="本周线索"
            value="156"
            change={12}
            icon={Users}
            color="from-emerald-500/20 to-emerald-600/10"
          />
          <StatsCard
            label="预计价值"
            value="¥480万"
            change={8}
            icon={TrendingUp}
            color="from-blue-500/20 to-blue-600/10"
          />
        </div>
      </header>
      
      {/* Tab Switcher */}
      <div className="relative z-10 px-4 mb-4">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
          {[
            { id: 'funnel', label: '漏斗视图' },
            { id: 'leads', label: '线索列表' },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(tab.id as 'funnel' | 'leads');
              }}
              className={`
                flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'funnel' ? (
            <motion.div
              key="funnel"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <FunnelVisualization stages={funnelStages} />
              
              {/* Funnel Insights */}
              <div className="px-4 mt-4">
                <div className="p-4 bg-gradient-to-r from-violet-500/20 to-purple-500/10 rounded-2xl border border-violet-500/20">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/30 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">AI 洞察</h3>
                      <p className="text-sm text-white/70">
                        提案到谈判阶段的转化率下降了8%。建议优化报价策略，
                        AI已识别出3个高潜力线索可能在本周内流失。
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="mt-3 px-4 py-2 bg-violet-500/30 rounded-lg text-sm font-medium text-violet-300"
                      >
                        查看建议
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="leads"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-4"
            >
              {/* Filter Pills */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {[
                  { id: 'all', label: '全部' },
                  { id: 'hot', label: '热门' },
                  { id: 'new', label: '新线索' },
                ].map((f) => (
                  <motion.button
                    key={f.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setFilter(f.id as 'all' | 'hot' | 'new');
                    }}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                      ${filter === f.id
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-white/50'
                      }
                    `}
                    whileTap={{ scale: 0.95 }}
                  >
                    {f.label}
                  </motion.button>
                ))}
              </div>
              
              {/* Lead Cards */}
              <div className="space-y-3">
                {filteredLeads.map((lead, index) => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <LeadCard
                      lead={lead}
                      onAction={(action) => handleLeadAction(lead.id, action)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
