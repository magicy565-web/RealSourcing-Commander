import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Sparkles,
  FileText,
  Image,
  Video,
  Mic,
  Calendar,
  Clock,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Edit3,
  Trash2,
  Copy,
  ChevronRight,
  TrendingUp,
  Wand2,
  RefreshCw,
  Send,
  Check,
  X,
  Linkedin,
  Twitter,
  Instagram,
  Globe,
} from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface ContentItem {
  id: string;
  title: string;
  type: 'article' | 'post' | 'video' | 'podcast';
  status: 'draft' | 'scheduled' | 'published' | 'ai-generating';
  platforms: ('linkedin' | 'twitter' | 'instagram' | 'website')[];
  thumbnail?: string;
  scheduledAt?: string;
  publishedAt?: string;
  stats?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  aiGenerated: boolean;
  preview: string;
}

interface AIContentSuggestion {
  id: string;
  topic: string;
  type: 'article' | 'post' | 'video';
  reason: string;
  confidence: number;
}

const mockContent: ContentItem[] = [
  {
    id: '1',
    title: '2024年B2B销售趋势：AI如何重塑客户关系',
    type: 'article',
    status: 'published',
    platforms: ['linkedin', 'website'],
    scheduledAt: undefined,
    publishedAt: '2小时前',
    stats: { views: 1234, likes: 89, comments: 23, shares: 45 },
    aiGenerated: true,
    preview: '人工智能正在彻底改变B2B销售的方式。从预测分析到自动化外展...',
  },
  {
    id: '2',
    title: '客户成功案例：某科技公司如何实现300%增长',
    type: 'post',
    status: 'scheduled',
    platforms: ['linkedin', 'twitter'],
    scheduledAt: '今天 14:00',
    aiGenerated: false,
    preview: '很荣幸分享我们与某科技公司的合作案例。在过去一年中...',
  },
  {
    id: '3',
    title: '销售团队周报视频',
    type: 'video',
    status: 'ai-generating',
    platforms: ['linkedin'],
    aiGenerated: true,
    preview: 'AI正在生成本周销售亮点视频...',
  },
  {
    id: '4',
    title: '行业洞察：供应链数字化转型',
    type: 'article',
    status: 'draft',
    platforms: ['website'],
    aiGenerated: false,
    preview: '数字化转型已经从可选项变成了必选项...',
  },
];

const aiSuggestions: AIContentSuggestion[] = [
  {
    id: '1',
    topic: '远程销售团队管理最佳实践',
    type: 'article',
    reason: '基于行业趋势和您的目标客户兴趣',
    confidence: 92,
  },
  {
    id: '2',
    topic: '客户证言视频合集',
    type: 'video',
    reason: '视频内容在您的受众中表现最好',
    confidence: 88,
  },
  {
    id: '3',
    topic: '每周市场动态快讯',
    type: 'post',
    reason: '定期内容有助于保持品牌曝光',
    confidence: 85,
  },
];

const typeIcons = {
  article: FileText,
  post: Edit3,
  video: Video,
  podcast: Mic,
};

const typeColors = {
  article: 'from-blue-500/30 to-blue-600/20',
  post: 'from-emerald-500/30 to-emerald-600/20',
  video: 'from-rose-500/30 to-rose-600/20',
  podcast: 'from-violet-500/30 to-violet-600/20',
};

const platformIcons = {
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  website: Globe,
};

const statusConfig = {
  draft: { label: '草稿', color: 'text-white/50', bg: 'bg-white/10' },
  scheduled: { label: '已排期', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  published: { label: '已发布', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  'ai-generating': { label: 'AI生成中', color: 'text-violet-400', bg: 'bg-violet-500/20' },
};

// Content Card Component
function ContentCard({ item, onSelect }: { item: ContentItem; onSelect: () => void }) {
  const TypeIcon = typeIcons[item.type];
  
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => {
        triggerHaptic('light');
        onSelect();
      }}
      className={`
        relative overflow-hidden p-4 rounded-2xl cursor-pointer
        bg-gradient-to-br ${typeColors[item.type]}
        backdrop-blur-xl border border-white/10
      `}
    >
      {/* AI Badge */}
      {item.aiGenerated && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-violet-500/30 rounded-full">
          <Sparkles className="w-3 h-3 text-violet-400" />
          <span className="text-xs text-violet-300">AI</span>
        </div>
      )}
      
      {/* Status Badge for AI Generating */}
      {item.status === 'ai-generating' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          {item.status === 'ai-generating' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-5 h-5 text-violet-400" />
            </motion.div>
          ) : (
            <TypeIcon className="w-5 h-5 text-white/70" />
          )}
        </div>
        <div className="flex-1 min-w-0 pr-10">
          <h3 className="font-semibold text-white line-clamp-2">{item.title}</h3>
        </div>
      </div>
      
      {/* Preview */}
      <p className="text-sm text-white/60 line-clamp-2 mb-3">{item.preview}</p>
      
      {/* Platforms */}
      <div className="flex items-center gap-2 mb-3">
        {item.platforms.map((platform) => {
          const PlatformIcon = platformIcons[platform];
          return (
            <div
              key={platform}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"
            >
              <PlatformIcon className="w-3 h-3 text-white/60" />
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <span className={`px-2 py-1 ${statusConfig[item.status].bg} rounded-full text-xs ${statusConfig[item.status].color}`}>
          {statusConfig[item.status].label}
        </span>
        
        {item.stats && (
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {item.stats.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {item.stats.likes}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {item.stats.comments}
            </span>
          </div>
        )}
        
        {item.scheduledAt && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <Clock className="w-3 h-3" />
            {item.scheduledAt}
          </span>
        )}
        
        {item.publishedAt && !item.stats && (
          <span className="text-xs text-white/40">{item.publishedAt}</span>
        )}
      </div>
    </motion.div>
  );
}

// AI Suggestion Card
function AISuggestionCard({ suggestion, onAccept, onReject }: {
  suggestion: AIContentSuggestion;
  onAccept: () => void;
  onReject: () => void;
}) {
  const TypeIcon = typeIcons[suggestion.type];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative min-w-[280px] p-4 bg-gradient-to-br from-violet-500/20 to-purple-500/10 backdrop-blur-xl border border-violet-500/20 rounded-2xl"
    >
      {/* Confidence Score */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <div className="relative w-8 h-8">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="3"
            />
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke="rgb(139, 92, 246)"
              strokeWidth="3"
              strokeDasharray={`${(suggestion.confidence / 100) * 75.4} 75.4`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs text-violet-400 font-medium">
            {suggestion.confidence}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/30 flex items-center justify-center">
          <TypeIcon className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1 pr-8">
          <h4 className="font-medium text-white mb-1">{suggestion.topic}</h4>
          <p className="text-xs text-white/50">{suggestion.reason}</p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('success');
            onAccept();
          }}
          className="flex-1 py-2 px-4 bg-violet-500/30 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-violet-300"
        >
          <Wand2 className="w-4 h-4" />
          AI生成
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic('light');
            onReject();
          }}
          className="py-2 px-3 bg-white/10 rounded-xl"
        >
          <X className="w-4 h-4 text-white/50" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// Content Calendar View
function CalendarView() {
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  const today = new Date().getDay();
  
  // Mock scheduled items for the week
  const weekSchedule = [
    { day: 1, items: [{ type: 'post', time: '09:00' }] },
    { day: 2, items: [] },
    { day: 3, items: [{ type: 'article', time: '14:00' }, { type: 'post', time: '18:00' }] },
    { day: 4, items: [{ type: 'video', time: '10:00' }] },
    { day: 5, items: [{ type: 'post', time: '12:00' }] },
    { day: 6, items: [] },
    { day: 0, items: [] },
  ];
  
  return (
    <div className="px-4 py-4">
      <h3 className="text-sm font-medium text-white/70 mb-4">本周发布计划</h3>
      
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const scheduleIndex = index === 6 ? 0 : index + 1; // Adjust for Sunday
          const schedule = weekSchedule.find(s => s.day === scheduleIndex);
          const isToday = (index === 6 ? 0 : index + 1) === today;
          
          return (
            <motion.div
              key={day}
              whileHover={{ scale: 1.05 }}
              className={`
                relative flex flex-col items-center p-2 rounded-xl
                ${isToday ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5'}
              `}
            >
              <span className={`text-xs mb-2 ${isToday ? 'text-emerald-400' : 'text-white/50'}`}>
                {day}
              </span>
              
              {/* Content indicators */}
              <div className="flex flex-col gap-1">
                {schedule?.items.map((item, i) => {
                  const colors = {
                    article: 'bg-blue-400',
                    post: 'bg-emerald-400',
                    video: 'bg-rose-400',
                  };
                  return (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${colors[item.type as keyof typeof colors]}`}
                    />
                  );
                })}
                {(!schedule || schedule.items.length === 0) && (
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-white/50">
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          文章
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          帖子
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-rose-400" />
          视频
        </span>
      </div>
    </div>
  );
}

// Performance Stats
function PerformanceStats() {
  const stats = [
    { label: '总浏览量', value: '12.5K', change: 23, icon: Eye },
    { label: '互动率', value: '8.7%', change: 12, icon: Heart },
    { label: '分享次数', value: '234', change: -5, icon: Share2 },
  ];
  
  return (
    <div className="px-4 mb-6">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-3 bg-white/5 rounded-xl text-center"
          >
            <stat.icon className="w-4 h-4 text-white/40 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{stat.value}</div>
            <div className={`text-xs ${stat.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stat.change >= 0 ? '+' : ''}{stat.change}%
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function ContentStudio() {
  const [activeTab, setActiveTab] = useState<'content' | 'calendar' | 'analytics'>('content');
  const [filter, setFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  
  const filteredContent = mockContent.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
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
          
          <h1 className="text-xl font-bold">内容工作室</h1>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center"
          >
            <Plus className="w-5 h-5 text-emerald-400" />
          </motion.button>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
          {[
            { id: 'content', label: '内容', icon: FileText },
            { id: 'calendar', label: '日历', icon: Calendar },
            { id: 'analytics', label: '分析', icon: TrendingUp },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(tab.id as 'content' | 'calendar' | 'analytics');
              }}
              className={`
                flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors
                flex items-center justify-center gap-2
                ${activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </motion.button>
          ))}
        </div>
      </header>
      
      {/* Content */}
      <div className="relative z-10 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'content' && (
            <motion.div
              key="content"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* AI Suggestions */}
              {showAISuggestions && (
                <div className="mb-6">
                  <div className="flex items-center justify-between px-4 mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-medium text-white/70">AI 内容建议</span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowAISuggestions(false)}
                      className="text-xs text-white/40"
                    >
                      隐藏
                    </motion.button>
                  </div>
                  
                  <div className="flex gap-3 px-4 overflow-x-auto pb-2">
                    {aiSuggestions.map((suggestion) => (
                      <AISuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onAccept={() => console.log('Accept', suggestion.id)}
                        onReject={() => console.log('Reject', suggestion.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Filter Pills */}
              <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-2">
                {[
                  { id: 'all', label: '全部' },
                  { id: 'draft', label: '草稿' },
                  { id: 'scheduled', label: '已排期' },
                  { id: 'published', label: '已发布' },
                ].map((f) => (
                  <motion.button
                    key={f.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setFilter(f.id as 'all' | 'draft' | 'scheduled' | 'published');
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
              
              {/* Content List */}
              <div className="px-4 space-y-3">
                {filteredContent.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ContentCard
                      item={item}
                      onSelect={() => console.log('Select', item.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
          
          {activeTab === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CalendarView />
              
              {/* Upcoming Content */}
              <div className="px-4 mt-6">
                <h3 className="text-sm font-medium text-white/70 mb-4">即将发布</h3>
                <div className="space-y-3">
                  {mockContent
                    .filter(item => item.status === 'scheduled')
                    .map((item) => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        onSelect={() => console.log('Select', item.id)}
                      />
                    ))}
                </div>
              </div>
            </motion.div>
          )}
          
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PerformanceStats />
              
              {/* Top Performing Content */}
              <div className="px-4">
                <h3 className="text-sm font-medium text-white/70 mb-4">表现最佳内容</h3>
                <div className="space-y-3">
                  {mockContent
                    .filter(item => item.stats)
                    .sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0))
                    .map((item) => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        onSelect={() => console.log('Select', item.id)}
                      />
                    ))}
                </div>
              </div>
              
              {/* AI Insights */}
              <div className="px-4 mt-6">
                <motion.div
                  className="p-4 bg-gradient-to-r from-violet-500/20 to-purple-500/10 rounded-2xl border border-violet-500/20"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-white mb-1">AI 洞察</h4>
                      <p className="text-sm text-white/70">
                        您的LinkedIn帖子在工作日上午9-11点发布效果最好，平均互动率提升35%。
                        建议本周增加1篇深度文章以提高专业形象。
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
