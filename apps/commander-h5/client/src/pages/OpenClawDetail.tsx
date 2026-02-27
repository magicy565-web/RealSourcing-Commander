/* ============================================================
   OpenClaw 数字员工详情页
   DESIGN: Night Commander — 手机端只读状态看板
   Philosophy: 老板碎片时间查看，Web端配置，手机端只看状态
   ============================================================ */
import { useState } from "react";
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

// ─── 类型 ─────────────────────────────────────────────────────

type AgentStatus = "running" | "paused" | "warning" | "idle";

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

// ─── Mock 数据 ────────────────────────────────────────────────

const mockInstances = [
  {
    id: "oc-001",
    name: "李总 · 广州明辉照明",
    overallStatus: "running" as AgentStatus,
    todayTotalOps: 28,
    creditsUsed: 180,
    creditsTotal: 3000,
    uptime: "99.2%",
    serverRegion: "新加坡 SG-01",
    proxyStatus: "住宅代理 · 正常",
    platforms: [
      {
        platform: "LinkedIn",
        icon: <Linkedin className="w-3.5 h-3.5" />,
        color: "#0a66c2",
        borderColor: "#0a66c230",
        status: "running" as AgentStatus,
        todayOps: 12,
        quota: 25,
        lastAction: "向 SunPower Solutions 采购总监发送连接请求",
        lastActionTime: "14分钟前",
        pendingCount: 5,
        metrics: [
          { label: "连接请求", value: "12/25", trend: "up" },
          { label: "InMail 发送", value: "3/10", trend: "flat" },
          { label: "帖子互动", value: "8次", trend: "up" },
          { label: "个人主页浏览", value: "24次", trend: "up" },
        ],
      },
      {
        platform: "Facebook",
        icon: <Facebook className="w-3.5 h-3.5" />,
        color: "#1877f2",
        borderColor: "#1877f230",
        status: "running" as AgentStatus,
        todayOps: 8,
        quota: 20,
        lastAction: "回复 Vietnam Solar Group 私信询价",
        lastActionTime: "32分钟前",
        pendingCount: 3,
        metrics: [
          { label: "私信发送", value: "5/20", trend: "flat" },
          { label: "评论回复", value: "3次", trend: "up" },
          { label: "群组互动", value: "2次", trend: "flat" },
          { label: "主页访客", value: "156人", trend: "up" },
        ],
      },
      {
        platform: "TikTok",
        icon: <span className="text-xs font-bold" style={{color:"#fe2c55"}}>TK</span>,
        color: "#fe2c55",
        borderColor: "#fe2c5530",
        status: "idle" as AgentStatus,
        todayOps: 5,
        quota: 10,
        lastAction: "监控到 23 条询价评论待处理",
        lastActionTime: "1小时前",
        pendingCount: 23,
        metrics: [
          { label: "评论监控", value: "23条待处理", trend: "up" },
          { label: "已回复", value: "0/23", trend: "flat" },
          { label: "视频播放", value: "+1.2K", trend: "up" },
          { label: "粉丝增长", value: "+18", trend: "up" },
        ],
      },
      {
        platform: "WhatsApp",
        icon: <MessageSquare className="w-3.5 h-3.5" />,
        color: "#25d366",
        borderColor: "#25d36630",
        status: "running" as AgentStatus,
        todayOps: 3,
        quota: 15,
        lastAction: "自动回复 Priya Sharma 询价消息",
        lastActionTime: "45分钟前",
        pendingCount: 0,
        metrics: [
          { label: "消息发送", value: "3/15", trend: "flat" },
          { label: "自动回复", value: "2次", trend: "up" },
          { label: "待处理", value: "0条", trend: "flat" },
          { label: "响应率", value: "100%", trend: "up" },
        ],
      },
    ] as PlatformStat[],
    tasks: [
      { id:"t1", title:"LinkedIn 每日连接配额执行", platform:"LinkedIn", status:"running", progress:48, startedAt:"09:00", estimatedCredits:20 },
      { id:"t2", title:"Facebook 询价私信回复", platform:"Facebook", status:"queued", startedAt:"待执行", estimatedCredits:8 },
      { id:"t3", title:"TikTok 评论监控扫描", platform:"TikTok", status:"done", startedAt:"08:30", estimatedCredits:5 },
      { id:"t4", title:"WhatsApp 自动回复模板执行", platform:"WhatsApp", status:"done", startedAt:"10:15", estimatedCredits:3 },
      { id:"t5", title:"LinkedIn 潜在买家资料分析", platform:"LinkedIn", status:"queued", startedAt:"待执行", estimatedCredits:15 },
    ] as TaskItem[],
    logs: [
      { id:"l1", time:"14:32", platform:"LinkedIn", action:"向 SunPower Solutions 采购总监发送连接请求", result:"success" },
      { id:"l2", time:"14:18", platform:"Facebook", action:"回复 Vietnam Solar Group 询价私信", result:"success", detail:"已发送标准询问模板，等待回复" },
      { id:"l3", time:"13:55", platform:"LinkedIn", action:"浏览 Ahmed Al-Rashid 个人主页", result:"info" },
      { id:"l4", time:"13:42", platform:"WhatsApp", action:"自动回复 Priya Sharma 询价消息", result:"success" },
      { id:"l5", time:"13:20", platform:"LinkedIn", action:"InMail 发送失败（账号每日限额已达）", result:"warning", detail:"今日 InMail 配额已用完，明日恢复" },
      { id:"l6", time:"12:58", platform:"TikTok", action:"检测到 23 条新询价评论", result:"info", detail:"已推送到询盘管理，等待人工处理" },
      { id:"l7", time:"12:30", platform:"Facebook", action:"加入 Solar Energy Vietnam 行业群组", result:"success" },
      { id:"l8", time:"11:45", platform:"LinkedIn", action:"帖子互动：点赞 + 评论 SunPower 新产品发布", result:"success" },
    ] as LogItem[],
  },
  {
    id: "oc-002",
    name: "张总 · 佛山顺达五金",
    overallStatus: "running" as AgentStatus,
    todayTotalOps: 12,
    creditsUsed: 95,
    creditsTotal: 2000,
    uptime: "98.7%",
    serverRegion: "新加坡 SG-02",
    proxyStatus: "住宅代理 · 正常",
    platforms: [
      {
        platform: "LinkedIn",
        icon: <Linkedin className="w-3.5 h-3.5" />,
        color: "#0a66c2",
        borderColor: "#0a66c230",
        status: "running" as AgentStatus,
        todayOps: 12,
        quota: 25,
        lastAction: "完成每日连接配额 (25/25)",
        lastActionTime: "2小时前",
        pendingCount: 0,
        metrics: [
          { label: "连接请求", value: "25/25", trend: "up" },
          { label: "InMail 发送", value: "5/10", trend: "up" },
          { label: "帖子互动", value: "12次", trend: "up" },
          { label: "个人主页浏览", value: "18次", trend: "flat" },
        ],
      },
    ] as PlatformStat[],
    tasks: [
      { id:"t1", title:"LinkedIn 每日连接配额执行", platform:"LinkedIn", status:"done", startedAt:"09:00", estimatedCredits:20 },
      { id:"t2", title:"LinkedIn InMail 批量发送", platform:"LinkedIn", status:"done", startedAt:"10:30", estimatedCredits:25 },
    ] as TaskItem[],
    logs: [
      { id:"l1", time:"12:00", platform:"LinkedIn", action:"完成每日连接配额 (25/25)", result:"success" },
      { id:"l2", time:"11:30", platform:"LinkedIn", action:"向 5 位采购决策者发送 InMail", result:"success" },
    ] as LogItem[],
  },
];

// ─── 子组件 ───────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentStatus }) {
  const map = {
    running: "bg-teal-400 animate-pulse",
    paused:  "bg-yellow-400",
    warning: "bg-orange-400 animate-pulse",
    idle:    "bg-slate-500",
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${map[status]}`} />;
}

function StatusLabel({ status }: { status: AgentStatus }) {
  const map = {
    running: { label: "运行中", color: "text-teal-400" },
    paused:  { label: "已暂停", color: "text-yellow-400" },
    warning: { label: "警告",   color: "text-orange-400" },
    idle:    { label: "空闲",   color: "text-slate-400" },
  };
  const { label, color } = map[status];
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
        <div className="px-4 pb-4 border-t border-white/5">
          <div className="grid grid-cols-2 gap-2 mt-3">
            {p.metrics.map(m => (
              <div key={m.label} className="rounded-lg px-3 py-2" style={{background:"oklch(0.16 0.02 250)"}}>
                <p className="text-xs text-slate-500 mb-0.5">{m.label}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-white font-mono">{m.value}</p>
                  {m.trend === "up" && <TrendingUp className="w-3 h-3 text-teal-400" />}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            <span>最后操作：{p.lastActionTime}</span>
            {p.pendingCount > 0 && (
              <span className="ml-auto text-orange-400 font-medium">{p.pendingCount} 条待处理</span>
            )}
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">今日配额使用</span>
              <span className="text-xs text-slate-400">{p.todayOps}/{p.quota}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{background:"oklch(0.25 0.02 250)"}}>
              <div className="h-full rounded-full transition-all"
                style={{width:`${Math.min(100, (p.todayOps/p.quota)*100)}%`, background: p.color}} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────

export default function OpenClawDetail() {
  const [, navigate] = useLocation();
  const [instanceIdx, setInstanceIdx] = useState(0);
  const [activeSection, setActiveSection] = useState<"platforms" | "tasks" | "logs">("platforms");

  const inst = mockInstances[instanceIdx];
  const creditPct = Math.round((inst.creditsUsed / inst.creditsTotal) * 100);

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
            <button onClick={() => toast.info("配置功能请在 Web 管理端操作")}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{background:"oklch(0.22 0.02 250)"}}>
              <Settings className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* 实例切换 */}
          {mockInstances.length > 1 && (
            <div className="flex gap-2 mb-4">
              {mockInstances.map((inst, i) => (
                <button key={inst.id} onClick={() => setInstanceIdx(i)}
                  className="flex-1 text-left rounded-xl px-3 py-2 transition-all"
                  style={instanceIdx === i
                    ? {background:"oklch(0.22 0.04 250)", border:"1px solid oklch(0.50 0.10 250 / 40%)"}
                    : {background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <StatusDot status={inst.overallStatus} />
                    <span className="text-xs font-semibold text-white truncate">{inst.id}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{inst.name.split("·")[0].trim()}</p>
                </button>
              ))}
            </div>
          )}

          {/* 实例概览 */}
          <div className="rounded-xl p-4" style={{background:"linear-gradient(135deg, oklch(0.20 0.04 250), oklch(0.17 0.03 250))", border:"1px solid oklch(0.50 0.10 250 / 20%)"}}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-white">{inst.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot status={inst.overallStatus} />
                  <StatusLabel status={inst.overallStatus} />
                  <span className="text-xs text-slate-500">· 在线率 {inst.uptime}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-orange-400 font-mono">{inst.todayTotalOps}</p>
                <p className="text-xs text-slate-500">今日操作</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { icon: <Shield className="w-3 h-3" />, label: inst.proxyStatus, color: "text-teal-400" },
                { icon: <Cpu className="w-3 h-3" />,    label: inst.serverRegion, color: "text-blue-400" },
                { icon: <Wifi className="w-3 h-3" />,   label: `延迟 42ms`, color: "text-green-400" },
              ].map(s => (
                <div key={s.label} className="rounded-lg px-2 py-1.5 flex items-center gap-1.5"
                  style={{background:"oklch(0.16 0.02 250)"}}>
                  <span className={s.color}>{s.icon}</span>
                  <span className="text-xs text-slate-400 truncate">{s.label}</span>
                </div>
              ))}
            </div>
            {/* 积分进度 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">本月积分消耗</span>
                <span className="text-xs text-slate-400">{inst.creditsUsed} / {inst.creditsTotal}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{background:"oklch(0.25 0.02 250)"}}>
                <div className="h-full rounded-full transition-all"
                  style={{width:`${creditPct}%`,
                    background: creditPct > 80 ? "#f59e0b" : creditPct > 50 ? "#3b82f6" : "#22c55e"}} />
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex-shrink-0 flex gap-1 px-4 py-3" style={{borderBottom:"1px solid oklch(1 0 0 / 8%)"}}>
          {(["platforms", "tasks", "logs"] as const).map(s => {
            const labels = { platforms: "平台状态", tasks: "任务队列", logs: "操作日志" };
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
              {inst.platforms.map(p => <PlatformCard key={p.platform} p={p} />)}
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
              {inst.tasks.map(task => (
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
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" />预计 {task.estimatedCredits} 积分</span>
                    <span className="flex items-center gap-1 ml-auto">
                      <span className="w-2 h-2 rounded-sm" style={{
                        background: task.platform === "LinkedIn" ? "#0a66c2"
                          : task.platform === "Facebook" ? "#1877f2"
                          : task.platform === "TikTok" ? "#fe2c55"
                          : "#25d366"
                      }} />
                      {task.platform}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 操作日志 */}
          {activeSection === "logs" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">今日操作记录（{inst.logs.length} 条）</p>
                <button onClick={() => toast.info("日志已刷新")}
                  className="flex items-center gap-1 text-xs text-blue-400 active:scale-95 transition-transform">
                  <RefreshCw className="w-3 h-3" />刷新
                </button>
              </div>
              {inst.logs.map(log => (
                <div key={log.id} className="rounded-xl px-4 py-3"
                  style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                  <div className="flex items-start gap-2.5">
                    <LogResultIcon result={log.result} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white leading-relaxed">{log.action}</p>
                      {log.detail && (
                        <p className="text-xs text-slate-500 mt-0.5">{log.detail}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-600">{log.time}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: log.platform === "LinkedIn" ? "#0a66c220"
                              : log.platform === "Facebook" ? "#1877f220"
                              : log.platform === "TikTok" ? "#fe2c5520"
                              : "#25d36620",
                            color: log.platform === "LinkedIn" ? "#0a66c2"
                              : log.platform === "Facebook" ? "#1877f2"
                              : log.platform === "TikTok" ? "#fe2c55"
                              : "#25d366",
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
