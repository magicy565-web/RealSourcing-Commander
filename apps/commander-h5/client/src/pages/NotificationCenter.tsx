/* ============================================================
   DESIGN: Night Commander — Notification Center
   Layout: 全屏通知中心，顶部状态卡 + 历史列表 + 底部设置入口
   Colors: 继承暗夜指挥官风格，通知优先级用颜色区分
   Philosophy: 让老板一眼看清"系统在替我工作"的全貌
   ============================================================ */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Bell, BellRing, BellOff, CheckCircle2, AlertCircle,
  TrendingUp, MessageSquare, Globe, Zap, Target,
  Clock, Settings, ChevronRight, ArrowLeft,
  Coins, RefreshCw, Smartphone, Shield,
  Calendar, Filter, MoreHorizontal, Eye, EyeOff,
  Wifi, WifiOff, Star
} from "lucide-react";
import { toast } from "sonner";

// ─── 类型定义 ─────────────────────────────────────────────────

type NotifPriority = "urgent" | "normal" | "info";
type NotifType = "daily_report" | "new_lead" | "task_done" | "geo_alert" | "credit_low" | "system";
type NotifChannel = "wechat" | "app" | "both";

interface Notification {
  id: string;
  type: NotifType;
  priority: NotifPriority;
  title: string;
  body: string;
  detail?: string;
  time: string;
  timestamp: number;
  read: boolean;
  channel: NotifChannel;
  actionLabel?: string;
  data?: Record<string, string | number>;
}

// ─── Mock 数据 ────────────────────────────────────────────────

const mockNotifications: Notification[] = [
  {
    id: "n1", type: "daily_report", priority: "normal",
    title: "📊 今日战报已生成",
    body: "今日共收到 4 条新询盘，OpenClaw 执行了 28 次操作，AI 可见度指数 +3",
    detail: "• RFQ 询盘：3 条（Alibaba 2 条 + Global Sources 1 条）\n• AI 引流：1 条（Perplexity 搜索越南太阳能板）\n• OpenClaw 操作：LinkedIn 连接 12 次、消息回复 8 次、Facebook 互动 8 次\n• 积分消耗：180 分（剩余 2,840 分）",
    time: "今天 08:00", timestamp: Date.now() - 2 * 3600 * 1000,
    read: true, channel: "both",
    actionLabel: "查看完整战报",
    data: { leads: 4, operations: 28, creditsUsed: 180 }
  },
  {
    id: "n2", type: "new_lead", priority: "urgent",
    title: "🔥 紧急询盘：越南买家 $120K",
    body: "SunPower Solutions（越南）通过 LinkedIn 发来询盘，询价太阳能板 5000 件",
    detail: "买家：Nguyen Van A\n公司：SunPower Solutions\n国家：越南 🇻🇳\n产品：太阳能板 5000 件\n预估金额：$120,000\n来源：LinkedIn（OpenClaw 监控发现）\n\n原文：Hi, I'm interested in your solar panel products. Could you provide a quotation?",
    time: "今天 10:42", timestamp: Date.now() - 20 * 60 * 1000,
    read: false, channel: "wechat",
    actionLabel: "立即回复",
    data: { value: 120000, company: "SunPower Solutions", country: "越南" }
  },
  {
    id: "n3", type: "new_lead", priority: "urgent",
    title: "🔥 AI 引流：德国买家主动搜索",
    body: "EcoHome Trading（德国）通过 Perplexity AI 搜索找到您的工厂，正在浏览产品页",
    detail: "买家：Klaus Weber\n公司：EcoHome Trading\n国家：德国 🇩🇪\n搜索词：outdoor furniture supplier China\nAI 引擎：Perplexity AI\n行为：访问了您的数字工厂孪生页面 3 次",
    time: "今天 10:18", timestamp: Date.now() - 44 * 60 * 1000,
    read: false, channel: "wechat",
    actionLabel: "查看买家详情",
    data: { company: "EcoHome Trading", country: "德国", source: "Perplexity AI" }
  },
  {
    id: "n4", type: "task_done", priority: "normal",
    title: "✅ 任务完成：德国家具 GEO 优化",
    body: "GEO 建造者 Agent 已完成德国家具买家市场优化，发现 8 条高意向线索",
    detail: "任务：德国家具买家 GEO 优化\nAgent：GEO 建造者 Agent\n执行时长：2小时 15分钟\n\n成果：\n• 创建数字工厂孪生页面 1 个\n• 同步至 8 个商业目录\n• 部署 Schema 结构化数据\n• 发现高意向买家 8 家\n\n积分消耗：120 分",
    time: "昨天 16:30", timestamp: Date.now() - 18 * 3600 * 1000,
    read: true, channel: "both",
    actionLabel: "查看战报",
    data: { leads: 8, creditsUsed: 120 }
  },
  {
    id: "n5", type: "geo_alert", priority: "normal",
    title: "📈 GEO 可见度提升",
    body: "您在 ChatGPT Search 中的可见度指数从 66 提升至 71，本周增长 +5",
    detail: "AI 引擎：ChatGPT Search\n上周指数：66\n本周指数：71\n增长：+5（+7.6%）\n\n触发关键词：\n• China outdoor furniture manufacturer\n• LED lighting factory China\n• Solar panel OEM supplier",
    time: "昨天 08:00", timestamp: Date.now() - 26 * 3600 * 1000,
    read: true, channel: "app",
    data: { engine: "ChatGPT Search", score: 71, growth: 5 }
  },
  {
    id: "n6", type: "daily_report", priority: "normal",
    title: "📊 昨日战报",
    body: "昨日收到 2 条询盘，OpenClaw 执行 22 次操作，一切正常运行",
    detail: "• RFQ 询盘：2 条\n• AI 引流：0 条\n• OpenClaw 操作：22 次\n• 积分消耗：95 分",
    time: "昨天 08:00", timestamp: Date.now() - 26 * 3600 * 1000,
    read: true, channel: "both",
    data: { leads: 2, operations: 22, creditsUsed: 95 }
  },
  {
    id: "n7", type: "credit_low", priority: "urgent",
    title: "⚠️ 积分余额提醒",
    body: "您的积分余额为 2,840 分，预计可用 14 天，建议提前充值",
    detail: "当前余额：2,840 分\n日均消耗：约 200 分\n预计耗尽：14 天后\n\n建议充值套餐：\n• 5,000 分 ¥499（¥0.10/分）\n• 20,000 分 ¥1,599（¥0.08/分）",
    time: "2天前 08:00", timestamp: Date.now() - 50 * 3600 * 1000,
    read: true, channel: "wechat",
    actionLabel: "立即充值",
    data: { balance: 2840, daysLeft: 14 }
  },
  {
    id: "n8", type: "system", priority: "info",
    title: "🔧 系统维护完成",
    body: "OpenClaw 实例 oc-001 已完成例行维护，所有功能恢复正常",
    time: "3天前 03:00", timestamp: Date.now() - 75 * 3600 * 1000,
    read: true, channel: "app",
    data: { instance: "oc-001" }
  },
];

// ─── 工具函数 ─────────────────────────────────────────────────

function getNextPushTime(hour: number, minute: number): { label: string; secondsLeft: number } {
  const now = new Date();
  // 北京时间 = UTC+8
  const bjNow = new Date(now.getTime() + 8 * 3600 * 1000);
  const bjHour = bjNow.getUTCHours();
  const bjMinute = bjNow.getUTCMinutes();
  const bjSecond = bjNow.getUTCSeconds();

  let secondsLeft = (hour * 3600 + minute * 60) - (bjHour * 3600 + bjMinute * 60 + bjSecond);
  if (secondsLeft <= 0) secondsLeft += 24 * 3600;

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;

  const label = h > 0
    ? `${h}小时 ${m}分钟后`
    : m > 0
    ? `${m}分钟 ${s}秒后`
    : `${s}秒后`;

  return { label, secondsLeft };
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

const typeConfig: Record<NotifType, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  daily_report: { icon: <TrendingUp className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/15", label: "日报" },
  new_lead: { icon: <MessageSquare className="w-4 h-4" />, color: "text-orange-400", bg: "bg-orange-500/15", label: "新询盘" },
  task_done: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-teal-400", bg: "bg-teal-500/15", label: "任务完成" },
  geo_alert: { icon: <Globe className="w-4 h-4" />, color: "text-purple-400", bg: "bg-purple-500/15", label: "GEO 动态" },
  credit_low: { icon: <Coins className="w-4 h-4" />, color: "text-yellow-400", bg: "bg-yellow-500/15", label: "积分提醒" },
  system: { icon: <Settings className="w-4 h-4" />, color: "text-slate-400", bg: "bg-slate-500/15", label: "系统" },
};

const priorityConfig: Record<NotifPriority, { dot: string; border: string }> = {
  urgent: { dot: "bg-orange-500 animate-pulse", border: "border-orange-500/25" },
  normal: { dot: "bg-blue-500", border: "border-white/8" },
  info: { dot: "bg-slate-500", border: "border-white/5" },
};

// ─── 子组件 ───────────────────────────────────────────────────

function CountdownCard({ pushHour, pushMinute }: { pushHour: number; pushMinute: number }) {
  const [countdown, setCountdown] = useState(() => getNextPushTime(pushHour, pushMinute));

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(getNextPushTime(pushHour, pushMinute));
    }, 1000);
    return () => clearInterval(t);
  }, [pushHour, pushMinute]);

  const progress = 1 - countdown.secondsLeft / (24 * 3600);
  const circumference = 2 * Math.PI * 28;

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, oklch(0.20 0.04 250) 0%, oklch(0.17 0.03 250) 100%)", border: "1px solid oklch(0.50 0.10 250 / 30%)" }}>
      {/* Glow */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.60 0.15 250) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />

      <div className="flex items-center gap-5">
        {/* Circular Progress */}
        <div className="relative flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
            <circle cx="36" cy="36" r="28" fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth="4" />
            <circle cx="36" cy="36" r="28" fill="none" stroke="#f97316" strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Bell className="w-6 h-6 text-orange-400" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 mb-0.5">下次推送</p>
          <p className="text-2xl font-bold text-white font-mono" style={{ fontFamily: "'Roboto Mono', monospace" }}>
            {String(pushHour).padStart(2, "0")}:{String(pushMinute).padStart(2, "0")}
          </p>
          <p className="text-xs text-orange-300 mt-0.5">北京时间 · {countdown.label}</p>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 justify-end mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs text-teal-400">定时已开启</span>
          </div>
          <p className="text-xs text-slate-500">今日已推送 1 次</p>
          <p className="text-xs text-slate-500">微信 + App 双渠道</p>
        </div>
      </div>
    </div>
  );
}

function NotifCard({ notif, onExpand }: { notif: Notification; onExpand: (id: string) => void }) {
  const tc = typeConfig[notif.type];
  const pc = priorityConfig[notif.priority];

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all duration-200 active:scale-98"
      style={{ background: "oklch(0.19 0.02 250)", border: `1px solid ${notif.read ? 'oklch(1 0 0 / 8%)' : 'oklch(0.70 0.18 40 / 25%)'}` }}
      onClick={() => onExpand(notif.id)}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tc.bg} ${tc.color}`}>
            {tc.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {!notif.read && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pc.dot}`} />}
                <span className="text-sm font-semibold text-white leading-tight">{notif.title}</span>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0 mt-0.5">{formatRelativeTime(notif.timestamp)}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{notif.body}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${tc.bg} ${tc.color}`}>{tc.label}</span>
              <span className="text-xs text-slate-600">
                {notif.channel === "wechat" ? "📱 微信" : notif.channel === "app" ? "🔔 App" : "📱 微信 + 🔔 App"}
              </span>
              {notif.actionLabel && (
                <span className="ml-auto text-xs text-orange-400 flex items-center gap-0.5">
                  {notif.actionLabel} <ChevronRight className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotifDetail({ notif, onClose }: { notif: Notification; onClose: () => void }) {
  const tc = typeConfig[notif.type];

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "oklch(0 0 0 / 70%)" }} onClick={onClose}>
      <div className="w-full rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ background: "oklch(0.16 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="overflow-y-auto px-5 pb-8">
          {/* Header */}
          <div className="flex items-center gap-3 py-4 border-b border-white/8 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tc.bg} ${tc.color}`}>
              {tc.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{notif.title}</p>
              <p className="text-xs text-slate-500">{notif.time} · {tc.label}</p>
            </div>
          </div>

          {/* Body */}
          <p className="text-sm text-slate-300 leading-relaxed mb-4">{notif.body}</p>

          {/* Detail */}
          {notif.detail && (
            <div className="rounded-xl p-4 mb-4" style={{ background: "oklch(0.20 0.02 250)" }}>
              <p className="text-xs text-slate-500 mb-2">详细信息</p>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{notif.detail}</p>
            </div>
          )}

          {/* Channel */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-500">推送渠道：</span>
            <span className="text-xs text-slate-300">
              {notif.channel === "wechat" ? "📱 微信服务号" : notif.channel === "app" ? "🔔 App 内通知" : "📱 微信 + 🔔 App 双渠道"}
            </span>
          </div>

          {/* Action */}
          {notif.actionLabel && (
            <button onClick={() => { toast.success(`${notif.actionLabel}功能即将上线`); onClose(); }}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, oklch(0.70 0.18 40) 0%, oklch(0.63 0.20 35) 100%)" }}>
              <Zap className="w-4 h-4" />{notif.actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────

interface NotificationCenterProps {
  pushHour?: number;
  pushMinute?: number;
  onOpenSettings?: () => void;
  onBack?: () => void;
}

export default function NotificationCenter({
  pushHour = 8,
  pushMinute = 0,
  onOpenSettings,
  onBack,
}: NotificationCenterProps) {
  const [, navigate] = useLocation();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | NotifType>("all");

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  const handleExpand = useCallback((id: string) => {
    setExpandedId(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("已全部标为已读");
  };

  const expandedNotif = notifications.find(n => n.id === expandedId);

  const filterTabs = [
    { id: "all" as const, label: "全部" },
    { id: "unread" as const, label: `未读 ${unreadCount > 0 ? `(${unreadCount})` : ""}` },
    { id: "new_lead" as const, label: "询盘" },
    { id: "daily_report" as const, label: "日报" },
    { id: "task_done" as const, label: "任务" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(0.14 0.02 250)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              通知中心
            </h1>
            {unreadCount > 0 && (
              <p className="text-xs text-orange-400">{unreadCount} 条未读</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/5 transition-colors">
              全部已读
            </button>
          )}
          <button onClick={onOpenSettings || (() => navigate("/notification-settings"))}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition-colors">
            <Settings className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Countdown Card */}
      <div className="px-4 mb-4 flex-shrink-0">
        <CountdownCard pushHour={pushHour} pushMinute={pushMinute} />
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mb-3 flex-shrink-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {filterTabs.map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === tab.id
                  ? "bg-orange-500/20 text-orange-400"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2.5" style={{ scrollbarWidth: "none" }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
              <BellOff className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">暂无通知</p>
          </div>
        ) : (
          filtered.map(notif => (
            <NotifCard key={notif.id} notif={notif} onExpand={handleExpand} />
          ))
        )}
      </div>

      {/* Detail Modal */}
      {expandedNotif && (
        <NotifDetail notif={expandedNotif} onClose={() => setExpandedId(null)} />
      )}
    </div>
  );
}
