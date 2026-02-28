/* ============================================================
   DESIGN: Night Commander — Notification Center
   Layout: 全屏通知中心，顶部状态卡 + 历史列表 + 底部设置入口
   Colors: 继承暗夜指挥官风格，通知优先级用颜色区分
   Philosophy: 让老板一眼看清"系统在替我工作"的全貌
   ============================================================ */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Bell, BellOff, CheckCircle2,
  TrendingUp, MessageSquare, Globe, Zap,
  Clock, Settings, ChevronRight, ArrowLeft,
  Coins, RefreshCw, Shield,
} from "lucide-react";
import { toast } from "sonner";
import {
  inquiriesApi, dashboardApi, openclawApi,
  type Inquiry, type DashboardOverview, type OpenClawStatus,
} from "../lib/api";

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

// ─── 工具函数 ─────────────────────────────────────────────────

function getNextPushTime(hour: number, minute: number): { label: string; secondsLeft: number } {
  const now = new Date();
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

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
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

// ─── 从真实数据生成通知 ───────────────────────────────────────

function buildNotifications(
  inquiries: Inquiry[],
  overview: DashboardOverview | null,
  report: { date: string; newInquiries: number; replied: number; totalValue: number; agentOps: number; creditsUsed: number; platformBreakdown: { platform: string; count: number }[] } | null,
  clawStatus: OpenClawStatus | null,
): Notification[] {
  const notifs: Notification[] = [];

  // 1. 今日战报（来自 dashboard/report）
  if (report) {
    const platformSummary = report.platformBreakdown
      .map(p => `${p.platform} ${p.count} 条`)
      .join("、");
    notifs.push({
      id: `report-${report.date}`,
      type: "daily_report",
      priority: "normal",
      title: "📊 今日战报已生成",
      body: `今日共收到 ${report.newInquiries} 条新询盘，OpenClaw 执行了 ${report.agentOps} 次操作，积分消耗 ${report.creditsUsed} 分`,
      detail: `• 询盘来源：${platformSummary || "暂无"}\n• OpenClaw 操作：${report.agentOps} 次\n• 积分消耗：${report.creditsUsed} 分（剩余 ${overview?.tenant.creditsBalance ?? "—"} 分）\n• 询盘总价值：${formatCurrency(report.totalValue)}`,
      time: `今天 08:00`,
      timestamp: Date.now() - 2 * 3600 * 1000,
      read: true,
      channel: "both",
      actionLabel: "查看完整战报",
      data: { leads: report.newInquiries, operations: report.agentOps, creditsUsed: report.creditsUsed },
    });
  }

  // 2. 未读询盘通知（来自 inquiries API）
  const unreadInquiries = inquiries.filter(i => i.status === "unread" || i.status === "no_reply");
  unreadInquiries.slice(0, 5).forEach((inq, idx) => {
    const isUrgent = (inq.urgency === "high" || inq.urgency === "urgent") || (inq.estimatedValue ?? 0) > 50000;
    notifs.push({
      id: `lead-${inq.id}`,
      type: "new_lead",
      priority: isUrgent ? "urgent" : "normal",
      title: isUrgent
        ? `🔥 紧急询盘：${inq.buyerCompany ?? inq.buyerName} ${inq.estimatedValue ? formatCurrency(inq.estimatedValue) : ""}`
        : `📩 新询盘：${inq.buyerCompany ?? inq.buyerName}`,
      body: `${inq.buyerCompany ?? inq.buyerName}（${inq.buyerCountry ?? "未知"}）通过 ${inq.sourcePlatform} 发来询盘，询价 ${inq.productName ?? "产品"}`,
      detail: `买家：${inq.buyerName ?? "—"}\n公司：${inq.buyerCompany ?? "—"}\n国家：${inq.buyerCountry ?? "—"}\n产品：${inq.productName ?? "—"}\n预估金额：${inq.estimatedValue ? formatCurrency(inq.estimatedValue) : "—"}\n来源：${inq.sourcePlatform}\n\n${inq.aiSummary ?? ""}`,
      time: inq.receivedAt ? new Date(inq.receivedAt).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "—",
      timestamp: inq.receivedAt ? new Date(inq.receivedAt).getTime() : Date.now() - (idx + 1) * 3600 * 1000,
      read: false,
      channel: "wechat",
      actionLabel: "立即回复",
      data: { value: inq.estimatedValue ?? 0, company: inq.buyerCompany ?? "", country: inq.buyerCountry ?? "" },
    });
  });

  // 3. OpenClaw 自愈告警（来自 openclaw/status）
  if (clawStatus?.instance) {
    const inst = clawStatus.instance;
    if (inst.sleeping) {
      const remainMin = Math.ceil(inst.sleepRemainingMs / 60000);
      notifs.push({
        id: `claw-sleep-${Date.now()}`,
        type: "system",
        priority: "urgent",
        title: "⚠️ OpenClaw 自动休眠中",
        body: `OpenClaw 因连续失败 ${inst.consecutiveFailures} 次触发自愈机制，预计 ${remainMin} 分钟后自动恢复`,
        detail: `实例：${inst.name}\n状态：休眠中（自愈模式）\n连续失败次数：${inst.consecutiveFailures} 次\n失败阈值：${inst.failureThreshold} 次\n预计恢复：${remainMin} 分钟后\n\n系统将在休眠结束后自动恢复运行，无需手动干预。`,
        time: "刚刚",
        timestamp: Date.now() - 5 * 60 * 1000,
        read: false,
        channel: "wechat",
        data: { failures: inst.consecutiveFailures, remainMin },
      });
    } else if (inst.consecutiveFailures > 0) {
      notifs.push({
        id: `claw-warn-${inst.consecutiveFailures}`,
        type: "system",
        priority: "normal",
        title: `⚡ OpenClaw 连续失败 ${inst.consecutiveFailures} 次`,
        body: `OpenClaw 近期出现 ${inst.consecutiveFailures} 次连续失败，距自愈阈值还有 ${inst.failureThreshold - inst.consecutiveFailures} 次`,
        detail: `实例：${inst.name}\n连续失败次数：${inst.consecutiveFailures} 次\n自愈阈值：${inst.failureThreshold} 次\n当前状态：${inst.status}\n\n如持续失败将自动进入休眠模式并发送告警。`,
        time: "最近",
        timestamp: Date.now() - 30 * 60 * 1000,
        read: false,
        channel: "app",
        data: { failures: inst.consecutiveFailures },
      });
    }
  }

  // 4. 积分余额提醒（来自 dashboard/overview）
  if (overview) {
    const balance = overview.tenant.creditsBalance;
    const daysLeft = Math.floor(balance / 200); // 假设日均消耗 200
    if (balance < 5000) {
      notifs.push({
        id: `credit-low-${balance}`,
        type: "credit_low",
        priority: balance < 1000 ? "urgent" : "normal",
        title: balance < 1000 ? "🚨 积分余额严重不足" : "⚠️ 积分余额提醒",
        body: `您的积分余额为 ${balance.toLocaleString()} 分，预计可用约 ${daysLeft} 天，建议提前充值`,
        detail: `当前余额：${balance.toLocaleString()} 分\n日均消耗：约 200 分\n预计耗尽：${daysLeft} 天后\n\n建议充值套餐：\n• 5,000 分 ¥499（¥0.10/分）\n• 20,000 分 ¥1,599（¥0.08/分）`,
        time: "今天 08:00",
        timestamp: Date.now() - 3 * 3600 * 1000,
        read: balance >= 2000,
        channel: "wechat",
        actionLabel: "立即充值",
        data: { balance, daysLeft },
      });
    }
  }

  // 5. 已报价询盘通知
  const quotedInquiries = inquiries.filter(i => i.status === "quoted");
  if (quotedInquiries.length > 0) {
    notifs.push({
      id: `quoted-summary`,
      type: "task_done",
      priority: "normal",
      title: `✅ ${quotedInquiries.length} 条询盘已完成报价`,
      body: `${quotedInquiries.map(i => i.buyerCompany ?? i.buyerName).slice(0, 3).join("、")} 等询盘已发送报价，等待买家回复`,
      time: "今天",
      timestamp: Date.now() - 4 * 3600 * 1000,
      read: true,
      channel: "app",
      data: { count: quotedInquiries.length },
    });
  }

  // 按时间排序（未读优先，然后按时间倒序）
  return notifs.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return b.timestamp - a.timestamp;
  });
}

// ─── 子组件 ───────────────────────────────────────────────────

function CountdownCard({ pushHour, pushMinute, todayPushCount }: { pushHour: number; pushMinute: number; todayPushCount: number }) {
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
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.60 0.15 250) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />

      <div className="flex items-center gap-5">
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
          <p className="text-xs text-slate-500">今日已推送 {todayPushCount} 次</p>
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
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tc.bg} ${tc.color}`}>
            {tc.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
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
          <div className="flex items-center gap-3 py-4 border-b border-white/8 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tc.bg} ${tc.color}`}>
              {tc.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{notif.title}</p>
              <p className="text-xs text-slate-500">{notif.time} · {tc.label}</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-4">{notif.body}</p>

          {notif.detail && (
            <div className="rounded-xl p-4 mb-4" style={{ background: "oklch(0.20 0.02 250)" }}>
              <p className="text-xs text-slate-500 mb-2">详细信息</p>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{notif.detail}</p>
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-500">推送渠道：</span>
            <span className="text-xs text-slate-300">
              {notif.channel === "wechat" ? "📱 微信服务号" : notif.channel === "app" ? "🔔 App 内通知" : "📱 微信 + 🔔 App 双渠道"}
            </span>
          </div>

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | NotifType>("all");
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // ─── 加载真实数据 ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const [inquiriesRes, overviewRes, reportRes, clawRes] = await Promise.allSettled([
          inquiriesApi.list({ limit: 20 }),
          dashboardApi.overview(),
          dashboardApi.report(),
          openclawApi.status(),
        ]);

        if (cancelled) return;

        const inquiries = inquiriesRes.status === "fulfilled" ? inquiriesRes.value.items : [];
        const overview = overviewRes.status === "fulfilled" ? overviewRes.value : null;
        const report = reportRes.status === "fulfilled" ? reportRes.value as any : null;
        const clawStatus = clawRes.status === "fulfilled" ? clawRes.value : null;

        const built = buildNotifications(inquiries, overview, report, clawStatus);
        setNotifications(built);
      } catch (e) {
        console.error("Failed to load notifications:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [lastRefresh]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const todayPushCount = notifications.filter(n => {
    const diff = Date.now() - n.timestamp;
    return diff < 24 * 3600 * 1000;
  }).length;

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

  const handleRefresh = () => {
    setLastRefresh(Date.now());
    toast.success("正在刷新通知...");
  };

  const expandedNotif = notifications.find(n => n.id === expandedId);

  const filterTabs = [
    { id: "all" as const, label: "全部" },
    { id: "unread" as const, label: `未读 ${unreadCount > 0 ? `(${unreadCount})` : ""}` },
    { id: "new_lead" as const, label: "询盘" },
    { id: "daily_report" as const, label: "日报" },
    { id: "system" as const, label: "系统" },
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
          <button onClick={handleRefresh}
            className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition-colors ${loading ? "animate-spin" : ""}`}>
            <RefreshCw className="w-4 h-4 text-slate-300" />
          </button>
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
        <CountdownCard pushHour={pushHour} pushMinute={pushMinute} todayPushCount={todayPushCount} />
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-slate-600 animate-spin" />
            </div>
            <p className="text-sm text-slate-500">加载通知中...</p>
          </div>
        ) : filtered.length === 0 ? (
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
