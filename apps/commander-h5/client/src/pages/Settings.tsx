import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Smartphone,
  Fingerprint,
  Lock,
  Eye,
  EyeOff,
  Key,
  Database,
  Cloud,
  Wifi,
  Zap,
  Sparkles,
  Users,
  Building,
  CreditCard,
  FileText,
  ToggleLeft,
  ToggleRight,
  Check,
} from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: SettingItem[];
}

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  type: 'toggle' | 'link' | 'select' | 'action';
  value?: boolean | string;
  options?: string[];
  danger?: boolean;
}

const settingSections: SettingSection[] = [
  {
    id: 'account',
    title: '账户',
    icon: User,
    items: [
      { id: 'profile', label: '个人资料', description: '编辑您的信息', type: 'link' },
      { id: 'company', label: '公司信息', description: '管理公司设置', type: 'link' },
      { id: 'team', label: '团队成员', description: '3位成员', type: 'link' },
      { id: 'subscription', label: '订阅计划', description: 'Pro 专业版', type: 'link' },
    ],
  },
  {
    id: 'notifications',
    title: '通知',
    icon: Bell,
    items: [
      { id: 'push', label: '推送通知', description: '接收即时提醒', type: 'toggle', value: true },
      { id: 'email', label: '邮件通知', description: '每日摘要', type: 'toggle', value: true },
      { id: 'decision', label: '决策提醒', description: '需要您批准时通知', type: 'toggle', value: true },
      { id: 'ai', label: 'AI洞察通知', description: '重要发现时提醒', type: 'toggle', value: false },
    ],
  },
  {
    id: 'security',
    title: '安全',
    icon: Shield,
    items: [
      { id: 'biometric', label: '生物识别', description: 'Face ID / 指纹', type: 'toggle', value: true },
      { id: 'password', label: '修改密码', type: 'link' },
      { id: '2fa', label: '两步验证', description: '已启用', type: 'link' },
      { id: 'sessions', label: '活跃会话', description: '2个设备', type: 'link' },
    ],
  },
  {
    id: 'ai',
    title: 'AI 设置',
    icon: Sparkles,
    items: [
      { id: 'auto-decision', label: '自动决策', description: '让AI处理低风险决策', type: 'toggle', value: false },
      { id: 'learning', label: '持续学习', description: '从您的决策中学习', type: 'toggle', value: true },
      { id: 'voice', label: '语音助手', description: '语音交互功能', type: 'toggle', value: true },
      { id: 'model', label: 'AI模型', description: 'GPT-4 Turbo', type: 'select', options: ['GPT-4 Turbo', 'Claude 3', 'Gemini Pro'] },
    ],
  },
  {
    id: 'appearance',
    title: '外观',
    icon: Palette,
    items: [
      { id: 'theme', label: '主题模式', description: '深色', type: 'select', options: ['深色', '浅色', '跟随系统'] },
      { id: 'haptic', label: '触觉反馈', description: '按钮点击反馈', type: 'toggle', value: true },
      { id: 'animations', label: '动画效果', description: '界面过渡动画', type: 'toggle', value: true },
    ],
  },
  {
    id: 'data',
    title: '数据与隐私',
    icon: Database,
    items: [
      { id: 'sync', label: '云同步', description: '自动备份数据', type: 'toggle', value: true },
      { id: 'export', label: '导出数据', type: 'link' },
      { id: 'privacy', label: '隐私政策', type: 'link' },
      { id: 'clear', label: '清除缓存', description: '释放存储空间', type: 'action', danger: true },
    ],
  },
];

// Setting Item Component
function SettingItemRow({ item, onToggle, onSelect }: {
  item: SettingItem;
  onToggle?: (value: boolean) => void;
  onSelect?: () => void;
}) {
  const [isToggled, setIsToggled] = useState(item.value as boolean);
  
  const handleToggle = () => {
    const newValue = !isToggled;
    setIsToggled(newValue);
    triggerHaptic('medium');
    onToggle?.(newValue);
  };
  
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        if (item.type === 'toggle') {
          handleToggle();
        } else {
          triggerHaptic('light');
          onSelect?.();
        }
      }}
      className={`
        flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer
        ${item.danger ? 'hover:bg-rose-500/10' : 'hover:bg-white/10'}
        transition-colors
      `}
    >
      <div className="flex-1 min-w-0">
        <span className={`font-medium ${item.danger ? 'text-rose-400' : 'text-white'}`}>
          {item.label}
        </span>
        {item.description && (
          <p className="text-sm text-white/50 mt-0.5">{item.description}</p>
        )}
      </div>
      
      {item.type === 'toggle' && (
        <motion.div
          className={`
            relative w-12 h-7 rounded-full transition-colors
            ${isToggled ? 'bg-emerald-500' : 'bg-white/20'}
          `}
          animate={{ backgroundColor: isToggled ? 'rgb(16, 185, 129)' : 'rgba(255, 255, 255, 0.2)' }}
        >
          <motion.div
            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
            animate={{ left: isToggled ? '26px' : '4px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </motion.div>
      )}
      
      {(item.type === 'link' || item.type === 'select' || item.type === 'action') && (
        <ChevronRight className={`w-5 h-5 ${item.danger ? 'text-rose-400' : 'text-white/30'}`} />
      )}
    </motion.div>
  );
}

// Profile Header
function ProfileHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 mb-6"
    >
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-violet-500/20 to-purple-500/10 rounded-2xl border border-violet-500/20">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
            王
          </div>
          <motion.div
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Check className="w-3 h-3 text-white" />
          </motion.div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white">王总</h2>
          <p className="text-sm text-white/60">CEO, 科技创新有限公司</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-violet-500/30 rounded-full text-xs text-violet-300">
              Pro 专业版
            </span>
            <span className="text-xs text-white/40">有效期至 2024.12.31</span>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5 text-white/50" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// Quick Stats
function QuickStats() {
  const stats = [
    { label: 'AI决策', value: '1,234', icon: Sparkles },
    { label: '节省时间', value: '45h', icon: Zap },
    { label: '数字员工', value: '5', icon: Users },
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
            <stat.icon className="w-5 h-5 text-violet-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">{stat.value}</div>
            <div className="text-xs text-white/50">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
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
          
          <h1 className="text-xl font-bold">设置</h1>
          
          <div className="w-10" />
        </div>
      </header>
      
      {/* Profile */}
      <ProfileHeader />
      
      {/* Quick Stats */}
      <QuickStats />
      
      {/* Settings Sections */}
      <div className="relative z-10 px-4 pb-24 space-y-6">
        {settingSections.map((section, sectionIndex) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <section.icon className="w-4 h-4 text-white/50" />
              <span className="text-sm font-medium text-white/50">{section.title}</span>
            </div>
            
            <div className="space-y-2">
              {section.items.map((item) => (
                <SettingItemRow
                  key={item.id}
                  item={item}
                  onToggle={(value) => console.log(`${item.id} toggled to ${value}`)}
                  onSelect={() => console.log(`${item.id} selected`)}
                />
              ))}
            </div>
          </motion.div>
        ))}
        
        {/* Logout Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => triggerHaptic('warning')}
          className="w-full p-4 bg-rose-500/10 rounded-xl flex items-center justify-center gap-2 text-rose-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">退出登录</span>
        </motion.button>
        
        {/* Version Info */}
        <div className="text-center text-xs text-white/30 pt-4">
          <p>Commander v2.0.1</p>
          <p className="mt-1">Made with AI by RealSourcing</p>
        </div>
      </div>
    </div>
  );
}
