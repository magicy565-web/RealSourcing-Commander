/* ============================================================
   OpenClaw 数字员工详情页
   DESIGN: Night Commander — 手机端只读状态看板
   Philosophy: 老板碎片时间查看，Web端配置，手机端只看状态
   Phase 3: Mock → 真实 API 数据
   ============================================================ */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Bot, Activity, Clock, CheckCircle2,
  AlertCircle, Pause, Play, ChevronRight, ChevronDown,
  Linkedin, Facebook, MessageSquare, Globe,
  BarChart3, Zap, Shield, Cpu, Wifi,
  TrendingUp, Users, Send, Eye, Heart,
  RefreshCw, Settings, ExternalLink, Info
} from "lucide-react";
import { toast } from "sonner";
import { openclawApi, type OpenClawStatus } from "@/lib/api";
import OpenClawSecurityPanel from "../components/OpenClawSecurityPanel";

// ─── 类型 ─────────────────────────────────────────────────────

type AgentStatus = "running" | "paused" | "warning" | "idle" | "sleeping";

interface PlatformStat {
  platform: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  status: AgentStatus;
  todayOps: number;
  quota: number;
  lastAction: string;
  lastActionTime: string;
  pendingCount: number;
  metrics: { label: string; value: string; trend?: "up" | "down" | "flat" }[];
}

interface TaskItem {
  id: string;
  title: string;
  platform: string;
  status: "running" | "queued" | "done" | "failed";
  progress?: number;
  startedAt: string;
  estimatedCredits: number;
}

interface LogItem {
  id: string;
  time: string;
  platform: string;
  action: string;
  result: "success" | "warning" | "error" | "info";
  detail?: string;
}

// ─── 平台图标映射 ─────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { icon: React.ReactNode; color: string; borderColor: string; label: string }> = {
  linkedin:  { icon: <Linkedin className="w-3.5 h-3.5" />, color: "#0a66c2", borderColor: "#0a66c230", label: "LinkedIn" },
  facebook:  { icon: <Facebook className="w-3.5 h-3.5" />, color: "#1877f2", borderColor: "#1877f230", label: "Facebook" },
  tiktok:    { icon: <span className="text-xs font-bold" style={{color:"#fe2c55"}}>TK</span>, color: "#fe2c55", borderColor: "#fe2c5530", label: "TikTok" },
  whatsapp:  { icon: <MessageSquare className="w-3.5 h-3.5" />, color: "#25d366", borderColor: "#25d36630", label: "WhatsApp" },
  alibaba:   { icon: <Globe className="w-3.5 h-3.5" />, color: "#ff6a00", borderColor: "#ff6a0030", label: "阿里巴巴" },
  geo:       { icon: <Globe className="w-3.5 h-3.5" />, color: "#8b5cf6", borderColor: "#8b5cf630", label: "GEO" },
};

function getPlatformConfig(platform: string) {
  return PLATFORM_CONFIG[platform.toLowerCase()] ?? {
    icon: <Globe className="w-3.5 h-3.5" />,
    color: "#64748b",
    borderColor: "#64748b30",
    label: platform,
  };
}

// ─── 状态映射 ─────────────────────────────────────────────────

function mapApiStatus(status: string, sleeping: boolean): AgentStatus {
  if (sleeping) return "sleeping";
  if (status === "online") return "running";
  if (status === "paused") return "paused";
  if (status === "offline") return "idle";
  if (status === "warning") return "warning";
  return "idle";
}

function mapHealthStatus(health: string): AgentStatus {
  if (health === "normal") return "running";
  if (health === "warning") return "warning";
  if (health === "suspended") return "paused";
  return "idle";
}

// ─── 日志转换 ─────────────────────────────────────────────────

function apiLogToLogItem(log: any): LogItem {
  const time = new Date(log.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  const pcfg = getPlatformConfig(log.platform ?? "");
  const actionMap: Record<string, string> = {
    linkedin_message_sent: "发送 LinkedIn 消息",
    linkedin_connection_sent: "发送 LinkedIn 连接请求",
    facebook_post_liked: "Facebook 帖子点赞",
    tiktok_comment_replied: "回复 TikTok 评论",
    geo_content_published: "发布 GEO 内容",
    whatsapp_message_sent: "发送 WhatsApp 消息",
    security_pause: "安全暂停实例",
    security_resume: "恢复实例运行",
    self_heal_sleep: "故障自愈：进入休眠",
    self_heal_recover: "故障自愈：已恢复",
  };
  const action = actionMap[log.action_type] ?? log.action_type;
  const detail = log.detail ? (log.detail.preview ?? log.detail.title ?? JSON.stringify(log.detail)) : undefined;
  const result: LogItem["result"] = log.status === "success" ? "success"
    : log.status === "warning" ? "warning"
    : log.status === "error" ? "error"
    : "info";
  return { id: log.id, time, platform: pcfg.label, action, result, detail };
}

// ─── 子组件 ───────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentStatus }) {
  const map: Record<AgentStatus, string> = {
    running:  "bg-teal-400 animate-pulse",
    paused:   "bg-yellow-400",
    warning:  "bg-orange-400 animate-pulse",
    idle:     "bg-slate-500",
    sleeping: "bg-purple-400",
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${map[status] ?? "bg-slate-500"}`} />;
}

function StatusLabel({ status }: { status: AgentStatus }) {
  const map: Record<AgentStatus, { label: string; color: string }> = {
    running:  { label: "运行中", color: "text-teal-400" },
    paused:   { label: "已暂停", color: "text-yellow-400" },
    warning:  { label: "警告",   color: "text-orange-400" },
    idle:     { label: "空闲",   color: "text-slate-400" },
    sleeping: { label: "休眠中", color: "text-purple-400" },
  };
  const { label, color } = map[status] ?? { label: status, color: "text-slate-400" };
  return <span className={`text-xs font-medium ${color}`}>{label}</span>;
}

function TaskStatusBadge({ status }: { status: TaskItem["status"] }) {
  const map = {
    running: { label: "执行中", bg: "bg-blue-500/15", color: "text-blue-400" },
    queued:  { label: "排队中", bg: "bg-slate-500/15", color: "text-slate-400" },
    done:    { label: "已完成", bg: "bg-teal-500/15",  color: "text-teal-400" },
    failed:  { label: "失败",   bg: "bg-red-500/15",   color: "text-red-400" },
  };
  const { label, bg, color } = map[status];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bg} ${color}`}>{label}</span>
  );
}

function LogResultIcon({ result }: { result: LogItem["result"] }) {
  if (result === "success") return <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />;
  if (result === "warning") return <AlertCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />;
  if (result === "error")   return <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
}

// ─── 平台卡片 ─────────────────────────────────────────────────

function PlatformCard({ p }: { p: PlatformStat }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{background:"oklch(0.19 0.02 250)", border:`1px solid ${p.borderColor}`}}>
      <button className="w-full px-4 py-3 flex items-center gap-3" onClick={() => setExpanded(e => !e)}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{background:`${p.color}20`}}>
          <span style={{color: p.color}}>{p.icon}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <StatusDot status={p.status} />
            <span className="text-sm font-semibold text-white">{p.platform}</span>
            <StatusLabel status={p.status} />
          </div>
          <p className="text-xs text-slate-500 truncate">{p.lastAction}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-bold font-mono" style={{color: p.color}}>{p.todayOps}</p>
          <p className="text-xs text-slate-500">/{p.quota}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t" style={{borderColor:"oklch(1 0 0 / 6%)"}}>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {p.metrics.map(m => (
              <div key={m.label} className="rounded-lg px-3 py-2" style={{background:"oklch(0.16 0.02 250)"}}>
                <p className="text-xs text-slate-500 mb-0.5">{m.label}</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-white">{m.value}</p>
                  {m.trend === "up" && <TrendingUp className="w-3 h-3 text-teal-400" />}
                </div>
              </div>
            ))}
          </div>
          {p.pendingCount > 0 && (
            <div className="mt-2 rounded-lg px-3 py-2 flex items-center gap-2"
              style={{background:"oklch(0.22 0.04 260 / 50%)"}}>
              <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
              <p className="text-xs text-orange-300">{p.pendingCount} 条待处理</p>
            </div>
          )}
          <p className="text-xs text-slate-600 mt-2">{p.lastActionTime}</p>
        </div>
      )}
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────

export default function OpenClawDetail() {
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<"platforms" | "tasks" | "logs" | "security">("platforms");
  const [apiStatus, setApiStatus] = useState<OpenClawStatus | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await openclawApi.status();
      setApiStatus(data);
    } catch {
      toast.error("加载 OpenClaw 状态失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await openclawApi.logs({ limit: 20 });
      setLogs(data.items.map(apiLogToLogItem));
    } catch {
      toast.error("加载操作日志失败");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => {
    if (activeSection === "logs") loadLogs();
  }, [activeSection, loadLogs]);

  // 构建平台卡片数据（从真实 API accounts）
  const platforms: PlatformStat[] = (apiStatus?.accounts ?? []).map(acc => {
    const pcfg = getPlatformConfig(acc.platform);
    const status = mapHealthStatus(acc.healthStatus);
    return {
      platform: pcfg.label,
      icon: pcfg.icon,
      color: pcfg.color,
      borderColor: pcfg.borderColor,
      status,
      todayOps: acc.dailyOpsUsed,
      quota: acc.dailyOpsLimit,
      lastAction: `${pcfg.label} 账号 ${acc.accountName}`,
      lastActionTime: `今日已用 ${acc.opsPercent}%`,
      pendingCount: acc.healthStatus === "warning" ? 1 : 0,
      metrics: [
        { label: "今日操作", value: `${acc.dailyOpsUsed}/${acc.dailyOpsLimit}`, trend: acc.opsPercent > 80 ? "up" : "flat" },
        { label: "使用率", value: `${acc.opsPercent}%`, trend: acc.opsPercent > 80 ? "up" : "flat" },
        { label: "账号状态", value: acc.healthStatus === "normal" ? "正常" : acc.healthStatus === "warning" ? "警告" : "异常", trend: "flat" },
        { label: "账号名", value: acc.accountName, trend: "flat" },
      ],
    };
  });

  // 构建任务数据（从 todayStats 生成摘要任务）
  const tasks: TaskItem[] = apiStatus ? [
    {
      id: "t-summary",
      title: `今日综合任务执行（${apiStatus.todayStats.totalOps} 次操作）`,
      platform: "全平台",
      status: apiStatus.instance?.sleeping ? "queued" : "running",
      progress: apiStatus.instance?.opsPercent ?? 0,
      startedAt: "今日",
      estimatedCredits: apiStatus.todayStats.creditsUsed,
    },
    ...platforms.map((p, i) => ({
      id: `t-${i}`,
      title: `${p.platform} 每日配额执行`,
      platform: p.platform,
      status: (p.todayOps >= p.quota ? "done" : p.todayOps > 0 ? "running" : "queued") as TaskItem["status"],
      progress: p.quota > 0 ? Math.round((p.todayOps / p.quota) * 100) : 0,
      startedAt: p.todayOps > 0 ? "今日" : "待执行",
      estimatedCredits: Math.round(p.todayOps * 3),
    })),
  ] : [];

  const inst = apiStatus?.instance;
  const overallStatus: AgentStatus = inst ? mapApiStatus(inst.status, inst.sleeping) : "idle";
  const creditPct = apiStatus?.instance?.opsPercent ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:"oklch(0.10 0.02 250)"}}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">加载 OpenClaw 状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center sm:py-8" style={{background:"oklch(0.10 0.02 250)"}}>
      <div className="w-full sm:rounded-3xl sm:overflow-hidden sm:shadow-2xl flex flex-col"
        style={{background:"oklch(0.14 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)", maxWidth:"390px", minHeight:"100dvh"}}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-12 pb-4"
          style={{borderBottom:"1px solid oklch(1 0 0 / 8%)"}}>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate("/phone")}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{background:"oklch(0.22 0.02 250)"}}>
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>数字员工详情</h1>
              <p className="text-xs text-slate-500">手机端只读 · Web端可配置</p>
            </div>
            <button onClick={() => { loadStatus(); toast.success("已刷新"); }}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{background:"oklch(0.22 0.02 250)"}}>
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* 实例概览 */}
          {inst && (
            <div className="rounded-xl p-4" style={{background:"linear-gradient(135deg, oklch(0.20 0.04 250), oklch(0.17 0.03 250))", border:"1px solid oklch(0.50 0.10 250 / 20%)"}}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-bold text-white">{inst.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot status={overallStatus} />
                    <StatusLabel status={overallStatus} />
                    {inst.sleeping && inst.sleepRemainingMs > 0 && (
                      <span className="text-xs text-purple-400">· 休眠剩余 {Math.ceil(inst.sleepRemainingMs / 60000)} 分钟</span>
                    )}
                    {!inst.sleeping && (
                      <span className="text-xs text-slate-500">· 连续失败 {inst.consecutiveFailures}/{inst.failureThreshold}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-orange-400 font-mono">{inst.opsToday}</p>
                  <p className="text-xs text-slate-500">今日操作</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { icon: <Shield className="w-3 h-3" />, label: "住宅代理 · 正常", color: "text-teal-400" },
                  { icon: <Cpu className="w-3 h-3" />,    label: "新加坡 SG-01", color: "text-blue-400" },
                  { icon: <Wifi className="w-3 h-3" />,   label: `延迟 42ms`, color: "text-green-400" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg px-2 py-1.5 flex items-center gap-1.5"
                    style={{background:"oklch(0.16 0.02 250)"}}>
                    <span className={s.color}>{s.icon}</span>
                    <span className="text-xs text-slate-400 truncate">{s.label}</span>
                  </div>
                ))}
              </div>
              {/* 操作进度 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">今日操作配额</span>
                  <span className="text-xs text-slate-400">{inst.opsToday} / {inst.opsLimit}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{background:"oklch(0.25 0.02 250)"}}>
                  <div className="h-full rounded-full transition-all"
                    style={{width:`${creditPct}%`,
                      background: creditPct > 80 ? "#f59e0b" : creditPct > 50 ? "#3b82f6" : "#22c55e"}} />
                </div>
              </div>
              {/* 自愈状态提示 */}
              {inst.sleeping && (
                <div className="mt-3 rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{background:"oklch(0.20 0.04 290 / 50%)", border:"1px solid oklch(0.50 0.10 290 / 30%)"}}>
                  <AlertCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <p className="text-xs text-purple-300">故障自愈模式：实例正在休眠恢复中</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section Tabs */}
        <div className="flex-shrink-0 flex gap-1 px-4 py-3" style={{borderBottom:"1px solid oklch(1 0 0 / 8%)"}}>
          {(["platforms", "tasks", "logs", "security"] as const).map(s => {
            const labels = { platforms: "平台状态", tasks: "任务队列", logs: "操作日志", security: "🔒 安全" };
            return (
              <button key={s} onClick={() => setActiveSection(s)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={activeSection === s
                  ? {background:"oklch(0.22 0.04 250)", color:"white", border:"1px solid oklch(0.50 0.10 250 / 40%)"}
                  : {background:"transparent", color:"oklch(0.5 0.01 250)", border:"1px solid transparent"}}>
                {labels[s]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-8 px-4 pt-4" style={{scrollbarWidth:"none"}}>

          {/* 平台状态 */}
          {activeSection === "platforms" && (
            <div className="space-y-3">
              {platforms.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">暂无平台账号</div>
              ) : (
                platforms.map(p => <PlatformCard key={p.platform} p={p} />)
              )}
              <div className="rounded-xl p-3 flex items-center gap-3"
                style={{background:"oklch(0.17 0.02 250)", border:"1px solid oklch(1 0 0 / 6%)"}}>
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-slate-400">参数配置（操作频率、目标人群、话术模板）请在 <span className="text-blue-400">Web 管理端</span> 调整</p>
              </div>
            </div>
          )}

          {/* 任务队列 */}
          {activeSection === "tasks" && (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">今日暂无任务</div>
              ) : tasks.map(task => (
                <div key={task.id} className="rounded-xl px-4 py-3"
                  style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-white flex-1">{task.title}</p>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  {task.status === "running" && task.progress !== undefined && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">执行进度</span>
                        <span className="text-xs text-blue-400 font-mono">{task.progress}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{background:"oklch(0.25 0.02 250)"}}>
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{width:`${task.progress}%`}} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{task.startedAt}</span>
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" />已用 {task.estimatedCredits} 积分</span>
                    <span className="flex items-center gap-1 ml-auto">
                      <span className="w-2 h-2 rounded-sm" style={{
                        background: task.platform === "LinkedIn" ? "#0a66c2"
                          : task.platform === "Facebook" ? "#1877f2"
                          : task.platform === "TikTok" ? "#fe2c55"
                          : task.platform === "WhatsApp" ? "#25d366"
                          : "#64748b"
                      }} />
                      {task.platform}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 安全控制面板 */}
          {activeSection === "security" && inst && (
            <OpenClawSecurityPanel instanceId={inst.id} />
          )}

          {/* 操作日志 */}
          {activeSection === "logs" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">今日操作记录（{logs.length} 条）</p>
                <button onClick={loadLogs}
                  className="flex items-center gap-1 text-xs text-blue-400 active:scale-95 transition-transform">
                  <RefreshCw className={`w-3 h-3 ${logsLoading ? "animate-spin" : ""}`} />刷新
                </button>
              </div>
              {logsLoading ? (
                <div className="text-center py-8">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">暂无操作日志</div>
              ) : logs.map(log => (
                <div key={log.id} className="rounded-xl px-4 py-3"
                  style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                  <div className="flex items-start gap-2.5">
                    <LogResultIcon result={log.result} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white leading-relaxed">{log.action}</p>
                      {log.detail && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{log.detail}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-600">{log.time}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: log.platform === "LinkedIn" ? "#0a66c220"
                              : log.platform === "Facebook" ? "#1877f220"
                              : log.platform === "TikTok" ? "#fe2c5520"
                              : log.platform === "WhatsApp" ? "#25d36620"
                              : "#64748b20",
                            color: log.platform === "LinkedIn" ? "#0a66c2"
                              : log.platform === "Facebook" ? "#1877f2"
                              : log.platform === "TikTok" ? "#fe2c55"
                              : log.platform === "WhatsApp" ? "#25d366"
                              : "#64748b",
                          }}>
                          {log.platform}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
