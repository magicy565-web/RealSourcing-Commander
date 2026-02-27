/* ============================================================
   DESIGN: Night Commander — Web Management Dashboard
   Layout: Left sidebar (56px collapsed / 224px expanded) + main content
   Colors: Dark navy base oklch(0.12 0.02 250), orange (#f97316) primary,
           teal (#10b981) success, blue (#3b82f6) data, purple (#a855f7) AI
   Typography: Space Grotesk (headings) + Roboto Mono (numbers)
   Philosophy: 指挥官的全局视野——数据驱动，一目了然
   ============================================================ */
import { useState } from "react";
import { useLocation } from "wouter";
import { useNotifSettings } from "../App";
import {
  LayoutDashboard, Zap, Target, Database, Settings,
  TrendingUp, Globe, MessageSquare, Users, BarChart3,
  ArrowLeft, Bell, ChevronRight, Building2, FileText,
  Coins, CheckCircle2, Loader2, Clock, RefreshCw,
  ArrowUpRight, ArrowDownRight, Star, Map,
  Smartphone, Shield, Activity, Link2, Monitor,
  Cpu, HardDrive, Wifi, Eye, AlertCircle, Play,
  Pause, RotateCcw, ExternalLink, Linkedin, Facebook,
  Server, Lock, Zap as ZapIcon
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";

// ─── Mock 数据 ────────────────────────────────────────────────

const inquiryData = [
  { month: "9月", rfq: 4, geo: 1 },
  { month: "10月", rfq: 7, geo: 2 },
  { month: "11月", rfq: 6, geo: 3 },
  { month: "12月", rfq: 9, geo: 4 },
  { month: "1月", rfq: 11, geo: 5 },
  { month: "2月", rfq: 15, geo: 8 },
];

const marketData = [
  { market: "越南", value: 8, color: "#f97316" },
  { market: "德国", value: 6, color: "#10b981" },
  { market: "美国", value: 5, color: "#3b82f6" },
  { market: "日本", value: 3, color: "#a855f7" },
  { market: "澳洲", value: 2, color: "#eab308" },
];

const recentLeads = [
  { company: "SunPower Solutions", country: "🇻🇳 越南", product: "太阳能板", value: "$120K", source: "Alibaba RFQ", status: "new", time: "3分钟前" },
  { company: "EcoHome Trading", country: "🇩🇪 德国", product: "户外家具", value: "AI引流", source: "Perplexity", status: "new", time: "18分钟前" },
  { company: "Pacific Imports", country: "🇺🇸 美国", product: "LED灯具", value: "$45K", source: "Global Sources", status: "contacted", time: "1小时前" },
  { company: "Nordik Furniture", country: "🇸🇪 瑞典", product: "实木家具", value: "AI引流", source: "ChatGPT", status: "contacted", time: "2小时前" },
  { company: "BuildRight Corp", country: "🇨🇦 加拿大", product: "建材配件", value: "$28K", source: "Thomasnet", status: "archived", time: "3小时前" },
];

const openclawInstances = [
  {
    id: "oc-001", name: "李总 · 广州明辉照明", type: "independent", tier: "独立版",
    status: "online", region: "新加坡 SG1", uptime: "99.8%", cpu: 23, ram: 41,
    accounts: [
      { platform: "LinkedIn", handle: "@guangzhou-minghui-lighting", status: "active", todayActions: 12, pendingMsgs: 3, lastActive: "5分钟前" },
      { platform: "Facebook", handle: "@minghui-lighting-official", status: "active", todayActions: 8, pendingMsgs: 1, lastActive: "12分钟前" },
    ],
    recentLogs: [
      { time: "10:42", action: "LinkedIn: 发现新询盘 · SunPower Solutions (越南)", type: "success" },
      { time: "10:38", action: "LinkedIn: 已向 Klaus Weber 发送连接请求", type: "info" },
      { time: "10:15", action: "Facebook: 回复了 Nordik Furniture 的消息", type: "success" },
      { time: "09:52", action: "RFQ 监控：Alibaba 发现 3 条新询盘", type: "success" },
      { time: "09:30", action: "系统：OpenClaw 实例启动完成", type: "info" },
    ]
  },
  {
    id: "oc-002", name: "张总 · 佛山顺达五金", type: "standard", tier: "标准版",
    status: "online", region: "香港 HK1", uptime: "98.2%", cpu: 15, ram: 28,
    accounts: [
      { platform: "LinkedIn", handle: "@shunde-hardware-factory", status: "active", todayActions: 6, pendingMsgs: 0, lastActive: "32分钟前" },
    ],
    recentLogs: [
      { time: "10:20", action: "LinkedIn: 完成每日连接配额 (25/25)", type: "success" },
      { time: "09:45", action: "GEO: 更新了 3 个商业目录页面", type: "info" },
      { time: "09:10", action: "RFQ 监控：Global Sources 发现 1 条新询盘", type: "success" },
    ]
  },
];

type NavItem = "overview" | "leads" | "tasks" | "openclaw" | "assets" | "geo" | "notifications";

// ─── 主组件 ───────────────────────────────────────────────────

export default function WebDashboard() {
  const [activeNav, setActiveNav] = useState<NavItem>("overview");
  const [, navigate] = useLocation();

  const { pushHour, pushMinute } = useNotifSettings();

  const navItems = [
    { id: "overview" as NavItem, icon: <LayoutDashboard className="w-4 h-4" />, label: "增长总览" },
    { id: "leads" as NavItem, icon: <MessageSquare className="w-4 h-4" />, label: "询盘管理" },
    { id: "tasks" as NavItem, icon: <Target className="w-4 h-4" />, label: "Agent 任务" },
    { id: "openclaw" as NavItem, icon: <Monitor className="w-4 h-4" />, label: "OpenClaw 管理" },
    { id: "assets" as NavItem, icon: <Database className="w-4 h-4" />, label: "数字资产库" },
    { id: "geo" as NavItem, icon: <Globe className="w-4 h-4" />, label: "GEO 监控" },
    { id: "notifications" as NavItem, icon: <Bell className="w-4 h-4" />, label: "通知中心" },
  ];

  const titles: Record<NavItem, string> = {
    overview: "增长总览",
    leads: "询盘管理",
    tasks: "Agent 任务中心",
    openclaw: "OpenClaw 管理",
    assets: "数字资产库",
    geo: "GEO 可见度监控",
    notifications: "通知中心",
  };

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(0.12 0.02 250)", fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/8" style={{ background: "oklch(0.14 0.02 250)" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>RealSourcing</p>
              <p className="text-xs text-slate-500">指挥官系统 5.0</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left ${
                activeNav === item.id
                  ? "bg-orange-500/15 text-orange-400 font-medium"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}>
              {item.icon}
              {item.label}
              {item.id === "openclaw" && (
                <span className="ml-auto flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Credits */}
        <div className="px-4 py-4 border-t border-white/8">
          <div className="rounded-xl p-3" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(0.70 0.18 40 / 20%)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">可用积分</span>
              <Coins className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <p className="text-xl font-bold text-orange-400 font-mono">2,840</p>
            <button onClick={() => toast.success("积分充值功能即将上线")}
              className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium text-white bg-orange-500/80 hover:bg-orange-500 transition-colors">
              充值积分
            </button>
          </div>
        </div>

        {/* Back */}
        <div className="px-3 pb-4">
          <button onClick={() => navigate("/")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />返回原型首页
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/8" style={{ background: "oklch(0.14 0.02 250)" }}>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {titles[activeNav]}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">2026年2月27日 · 数据实时更新</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveNav("notifications")}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 relative hover:bg-white/12 transition-colors">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-white font-bold" style={{ fontSize: "8px" }}>2</span>
              </span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/8">
              <div className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center">
                <span className="text-xs font-bold text-orange-400">王</span>
              </div>
              <span className="text-sm text-white">王总</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeNav === "overview" && <OverviewContent />}
          {activeNav === "leads" && <LeadsContent />}
          {activeNav === "tasks" && <TasksContent />}
          {activeNav === "openclaw" && <OpenClawContent />}
          {activeNav === "assets" && <AssetsContent />}
          {activeNav === "geo" && <GeoContent />}
          {activeNav === "notifications" && (
            <WebNotificationPanel pushHour={pushHour} pushMinute={pushMinute} onOpenSettings={() => setActiveNav("notifications")} />
          )}
        </div>
      </main>
    </div>
  );
}

// ─── 子组件 ───────────────────────────────────────────────────

function StatCard({ label, value, unit, trend, trendUp, icon, color }: any) {
  return (
    <div className="rounded-xl p-4" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trendUp ? 'text-teal-400' : 'text-red-400'}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span></p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function OverviewContent() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="本月询盘总量" value="23" unit="条" trend="+47%" trendUp icon={<MessageSquare className="w-4 h-4 text-orange-400" />} color="bg-orange-500/15" />
        <StatCard label="AI 搜索引流" value="8" unit="次" trend="+120%" trendUp icon={<Globe className="w-4 h-4 text-teal-400" />} color="bg-teal-500/15" />
        <StatCard label="AI 可见度指数" value="78" unit="/100" trend="+15%" trendUp icon={<TrendingUp className="w-4 h-4 text-blue-400" />} color="bg-blue-500/15" />
        <StatCard label="本月积分消耗" value="1,240" unit="分" trend="-8%" trendUp={false} icon={<Coins className="w-4 h-4 text-yellow-400" />} color="bg-yellow-500/15" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>询盘增长趋势</h3>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />平台 RFQ</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />AI 引流</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={inquiryData}>
              <defs>
                <linearGradient id="rfqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="geoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.02 250)", border: "1px solid oklch(1 0 0 / 15%)", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
              <Area type="monotone" dataKey="rfq" stroke="#f97316" strokeWidth={2} fill="url(#rfqGrad)" />
              <Area type="monotone" dataKey="geo" stroke="#10b981" strokeWidth={2} fill="url(#geoGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>市场分布</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={marketData} layout="vertical">
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="market" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.02 250)", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {marketData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {marketData.map((m) => (
              <div key={m.market} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{m.market}</span>
                <span className="text-white font-mono">{m.value} 条询盘</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>最新询盘</h3>
          <button className="text-xs text-orange-400 flex items-center gap-1 hover:text-orange-300">查看全部 <ChevronRight className="w-3 h-3" /></button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {["公司", "国家", "产品", "金额/来源", "渠道", "状态", "时间"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentLeads.map((lead, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-5 py-3 text-sm font-medium text-white">{lead.company}</td>
                <td className="px-5 py-3 text-sm text-slate-400">{lead.country}</td>
                <td className="px-5 py-3 text-sm text-slate-400">{lead.product}</td>
                <td className="px-5 py-3 text-sm text-orange-400 font-mono">{lead.value}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{lead.source}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    lead.status === 'new' ? 'bg-orange-500/20 text-orange-400' :
                    lead.status === 'contacted' ? 'bg-teal-500/20 text-teal-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {lead.status === 'new' ? '新询盘' : lead.status === 'contacted' ? '已接触' : '已归档'}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">{lead.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadsContent() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "新询盘", value: "7", color: "text-orange-400", bg: "bg-orange-500/15" },
          { label: "跟进中", value: "12", color: "text-blue-400", bg: "bg-blue-500/15" },
          { label: "本月成交", value: "3", color: "text-teal-400", bg: "bg-teal-500/15" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 flex items-center gap-3" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
              <span className={`text-xl font-bold ${s.color} font-mono`}>{s.value}</span>
            </div>
            <span className="text-sm text-slate-300">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="px-5 py-4 border-b border-white/8">
          <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>全部询盘</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {["公司", "国家", "产品", "金额", "渠道", "状态", "操作"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentLeads.map((lead, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-5 py-3 text-sm font-medium text-white">{lead.company}</td>
                <td className="px-5 py-3 text-sm text-slate-400">{lead.country}</td>
                <td className="px-5 py-3 text-sm text-slate-400">{lead.product}</td>
                <td className="px-5 py-3 text-sm text-orange-400 font-mono">{lead.value}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{lead.source}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${lead.status === 'new' ? 'bg-orange-500/20 text-orange-400' : lead.status === 'contacted' ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {lead.status === 'new' ? '新询盘' : lead.status === 'contacted' ? '已接触' : '已归档'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => toast.success(`已查看 ${lead.company}`)} className="text-xs text-orange-400 hover:text-orange-300">查看</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TasksContent() {
  const tasks = [
    { title: "开发越南太阳能板市场", agent: "猎手+侦察+内容 Agent", status: "running", progress: 65, leads: 32, credits: 180 },
    { title: "德国家具买家 GEO 优化", agent: "GEO 建造者 Agent", status: "done", progress: 100, leads: 8, credits: 120 },
    { title: "美国 LED 市场情报扫描", agent: "情报 Agent", status: "queued", progress: 0, leads: 0, credits: 0 },
  ];
  const cfg: any = {
    running: { label: "执行中", color: "text-orange-400", bg: "bg-orange-500/15", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    done: { label: "已完成", color: "text-teal-400", bg: "bg-teal-500/15", icon: <CheckCircle2 className="w-3 h-3" /> },
    queued: { label: "等待中", color: "text-slate-400", bg: "bg-slate-500/15", icon: <Clock className="w-3 h-3" /> },
  };
  return (
    <div className="space-y-4">
      <button onClick={() => toast.info("发起新任务功能即将上线")}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 transition-colors">
        <Zap className="w-4 h-4" />发起新任务
      </button>
      <div className="space-y-3">
        {tasks.map((task, i) => {
          const s = cfg[task.status];
          return (
            <div key={i} className="rounded-xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{task.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{task.agent}</p>
                </div>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${s.color} ${s.bg}`}>
                  {s.icon}{s.label}
                </span>
              </div>
              {task.status === 'running' && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>执行进度</span><span className="font-mono">{task.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400" style={{ width: `${task.progress}%` }} />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {["✅ 猎手 Agent：已找到 50 家越南企业", "✅ 侦察 Agent：筛出 32 家高意向买家", "⏳ 内容 Agent：正在生成个性化开发信..."].map((step, j) => (
                      <p key={j} className="text-xs text-slate-400">{step}</p>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div><p className="text-lg font-bold text-white font-mono">{task.leads || "—"}</p><p className="text-xs text-slate-500">发现线索</p></div>
                <div><p className="text-lg font-bold text-orange-400 font-mono">{task.credits || "—"}</p><p className="text-xs text-slate-500">积分消耗</p></div>
                <div className="flex items-end">
                  {task.status === 'done' && (
                    <button onClick={() => toast.success("战报已归档至飞书")}
                      className="flex items-center gap-1.5 text-xs text-teal-400 border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 rounded-lg hover:bg-teal-500/20 transition-colors">
                      <FileText className="w-3.5 h-3.5" />查看战报
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── OpenClaw 管理模块 ────────────────────────────────────────

function OpenClawContent() {
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [activeInstanceTab, setActiveInstanceTab] = useState<"accounts" | "logs" | "resources">("accounts");

  const instance = openclawInstances.find(i => i.id === selectedInstance) || openclawInstances[0];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-xl p-5 flex items-center gap-5"
        style={{ background: "linear-gradient(135deg, oklch(0.20 0.04 250) 0%, oklch(0.17 0.02 250) 100%)", border: "1px solid oklch(0.50 0.10 250 / 30%)" }}>
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Monitor className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>OpenClaw 云端实例</h2>
          <p className="text-xs text-slate-400 mt-0.5">云端 VPS 运行真实浏览器，模拟人工操作，以您的身份管理海外社交账号</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center">
            <p className="text-xl font-bold text-teal-400 font-mono">2</p>
            <p className="text-xs text-slate-500">运行中</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-bold text-orange-400 font-mono">3</p>
            <p className="text-xs text-slate-500">托管账号</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-xl font-bold text-white font-mono">4</p>
            <p className="text-xs text-slate-500">今日询盘</p>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "oklch(0.19 0.04 160 / 30%)", border: "1px solid oklch(0.60 0.12 160 / 25%)" }}>
        <Shield className="w-4 h-4 text-teal-400 flex-shrink-0" />
        <p className="text-xs text-teal-300">
          <strong>安全说明：</strong>OpenClaw 使用加密 Session Cookie 托管账号，不存储明文密码。所有操作均在隔离的云端 VPS 中执行，完整操作日志可随时审查。
        </p>
      </div>

      {/* Instance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {openclawInstances.map((inst) => (
          <div key={inst.id}
            className={`rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${selectedInstance === inst.id ? 'ring-2 ring-orange-500/50' : 'hover:border-white/20'}`}
            style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}
            onClick={() => setSelectedInstance(selectedInstance === inst.id ? null : inst.id)}>
            {/* Instance Header */}
            <div className="p-4 border-b border-white/8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inst.type === 'independent' ? 'bg-orange-500/20' : 'bg-blue-500/20'}`}>
                    <Server className={`w-5 h-5 ${inst.type === 'independent' ? 'text-orange-400' : 'text-blue-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{inst.name}</p>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${inst.type === 'independent' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {inst.tier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{inst.region} · 实例 {inst.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-xs text-teal-400">在线</span>
                </div>
              </div>
            </div>

            {/* Resource Meters */}
            <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-white/5">
              {[
                { label: "CPU", value: inst.cpu, color: inst.cpu > 70 ? "#f97316" : "#10b981" },
                { label: "内存", value: inst.ram, color: inst.ram > 80 ? "#f97316" : "#3b82f6" },
                { label: "在线率", value: parseFloat(inst.uptime), color: "#10b981" },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <div className="text-sm font-bold font-mono mb-1" style={{ color: m.color }}>{m.value}%</div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${m.value}%`, background: m.color }} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Accounts Summary */}
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500 mb-2">托管账号</p>
              <div className="space-y-1.5">
                {inst.accounts.map((acc, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {acc.platform === "LinkedIn"
                        ? <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                        : <Facebook className="w-3.5 h-3.5 text-blue-500" />}
                      <span className="text-xs text-slate-300">{acc.handle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {acc.pendingMsgs > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-xs bg-orange-500 text-white font-bold">{acc.pendingMsgs}</span>
                      )}
                      <span className="text-xs text-slate-500">{acc.lastActive}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-3 flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); toast.info("重启功能即将上线"); }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">
                <RotateCcw className="w-3 h-3" />重启
              </button>
              <button onClick={(e) => { e.stopPropagation(); toast.info("远程查看功能即将上线"); }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">
                <Eye className="w-3 h-3" />查看屏幕
              </button>
              <button onClick={(e) => { e.stopPropagation(); toast.info("日志下载功能即将上线"); }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">
                <FileText className="w-3 h-3" />操作日志
              </button>
              <span className="ml-auto text-xs text-slate-600">今日操作 {inst.accounts.reduce((a, b) => a + b.todayActions, 0)} 次</span>
            </div>
          </div>
        ))}

        {/* Add Instance Card */}
        <button onClick={() => toast.info("购买新 OpenClaw 实例功能即将上线")}
          className="rounded-xl p-6 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/10 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all duration-200 group">
          <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-orange-500/15 flex items-center justify-center transition-colors">
            <Monitor className="w-6 h-6 text-slate-500 group-hover:text-orange-400 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">添加 OpenClaw 实例</p>
            <p className="text-xs text-slate-600 mt-0.5">独立版 ¥29,800/年 · 标准版 ¥9,800/年</p>
          </div>
        </button>
      </div>

      {/* Detail Panel */}
      <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {instance.name} · 详细信息
          </h3>
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "oklch(0.14 0.02 250)" }}>
            {(["accounts", "logs", "resources"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveInstanceTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeInstanceTab === tab ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:text-white'}`}>
                {tab === "accounts" ? "账号详情" : tab === "logs" ? "操作日志" : "资源监控"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeInstanceTab === "accounts" && (
            <div className="space-y-4">
              {instance.accounts.map((acc, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "oklch(0.14 0.02 250)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        {acc.platform === "LinkedIn"
                          ? <Linkedin className="w-4 h-4 text-blue-400" />
                          : <Facebook className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{acc.platform}</p>
                        <p className="text-xs text-slate-500">{acc.handle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-teal-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />活跃
                      </span>
                      <button onClick={() => toast.info("账号设置功能即将上线")}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">
                        设置
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center py-2 rounded-lg bg-white/5">
                      <p className="text-sm font-bold text-orange-400 font-mono">{acc.todayActions}</p>
                      <p className="text-xs text-slate-500">今日操作</p>
                    </div>
                    <div className="text-center py-2 rounded-lg bg-white/5">
                      <p className="text-sm font-bold text-blue-400 font-mono">{acc.pendingMsgs}</p>
                      <p className="text-xs text-slate-500">待处理消息</p>
                    </div>
                    <div className="text-center py-2 rounded-lg bg-white/5">
                      <p className="text-xs font-medium text-white">{acc.lastActive}</p>
                      <p className="text-xs text-slate-500">最近活跃</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <Lock className="w-3 h-3 text-teal-400" />
                    <span>Session Cookie 加密存储 · 不保存明文密码 · 操作符合平台频率限制</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeInstanceTab === "logs" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">最近操作记录（今日）</p>
                <button onClick={() => toast.info("完整日志下载功能即将上线")}
                  className="text-xs text-orange-400 hover:text-orange-300">下载完整日志</button>
              </div>
              {instance.recentLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg" style={{ background: "oklch(0.14 0.02 250)" }}>
                  <span className="text-xs text-slate-500 font-mono flex-shrink-0 mt-0.5">{log.time}</span>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${log.type === 'success' ? 'bg-teal-400' : 'bg-blue-400'}`} />
                  <span className="text-xs text-slate-300">{log.action}</span>
                </div>
              ))}
            </div>
          )}

          {activeInstanceTab === "resources" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "CPU 使用率", value: instance.cpu, unit: "%", color: "#10b981", icon: <Cpu className="w-4 h-4" /> },
                { label: "内存使用率", value: instance.ram, unit: "%", color: "#3b82f6", icon: <HardDrive className="w-4 h-4" /> },
                { label: "网络延迟", value: 42, unit: "ms", color: "#a855f7", icon: <Wifi className="w-4 h-4" /> },
                { label: "在线率", value: parseFloat(instance.uptime), unit: "%", color: "#10b981", icon: <Activity className="w-4 h-4" /> },
              ].map((r) => (
                <div key={r.label} className="rounded-xl p-4 text-center" style={{ background: "oklch(0.14 0.02 250)" }}>
                  <div className="flex justify-center mb-2" style={{ color: r.color }}>{r.icon}</div>
                  <p className="text-2xl font-bold font-mono mb-0.5" style={{ color: r.color }}>{r.value}{r.unit}</p>
                  <p className="text-xs text-slate-500">{r.label}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(r.value, 100)}%`, background: r.color }} />
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

function AssetsContent() {
  const assets = [
    { icon: <Users className="w-5 h-5" />, label: "客户联系人", value: "247", unit: "个", color: "text-blue-400", bg: "bg-blue-500/15", trend: "+12 本月", desc: "已结构化存储至飞书多维表格" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "沟通记录", value: "1,832", unit: "条", color: "text-purple-400", bg: "bg-purple-500/15", trend: "已同步", desc: "微信、邮件、WhatsApp 全渠道归集" },
    { icon: <Building2 className="w-5 h-5" />, label: "产品档案", value: "68", unit: "款", color: "text-orange-400", bg: "bg-orange-500/15", trend: "AI 结构化", desc: "含规格、价格、认证、图片" },
    { icon: <Map className="w-5 h-5" />, label: "市场情报", value: "34", unit: "份", color: "text-teal-400", bg: "bg-teal-500/15", trend: "本季度新增", desc: "各市场趋势、竞品、买家分析" },
    { icon: <BarChart3 className="w-5 h-5" />, label: "交易历史", value: "156", unit: "笔", color: "text-yellow-400", bg: "bg-yellow-500/15", trend: "总金额 $2.4M", desc: "完整的订单和付款记录" },
    { icon: <Star className="w-5 h-5" />, label: "买家评价", value: "89", unit: "条", color: "text-pink-400", bg: "bg-pink-500/15", trend: "平均 4.7 分", desc: "来自各平台的真实买家反馈" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">飞书数字资产库 · 实时同步中</p>
          <p className="text-xs text-slate-500">上次同步：3分钟前 · 全部数据 AES-256 加密存储</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-teal-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />已连接
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((a) => (
          <div key={a.label} className="rounded-xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className={`w-10 h-10 rounded-lg ${a.bg} flex items-center justify-center mb-3 ${a.color}`}>{a.icon}</div>
            <div className="flex items-end gap-1 mb-0.5">
              <span className={`text-3xl font-bold ${a.color} font-mono`}>{a.value}</span>
              <span className="text-sm text-slate-500 mb-0.5">{a.unit}</span>
            </div>
            <p className="text-sm font-semibold text-white mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{a.label}</p>
            <p className="text-xs text-slate-500">{a.desc}</p>
            <p className={`text-xs font-medium mt-2 ${a.color}`}>{a.trend}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeoContent() {
  const aiEngines = [
    { name: "Perplexity AI", score: 82, mentions: 12, trend: "+3", color: "#f97316" },
    { name: "ChatGPT Search", score: 71, mentions: 8, trend: "+5", color: "#10b981" },
    { name: "Google AI Overview", score: 65, mentions: 6, trend: "+2", color: "#3b82f6" },
    { name: "Claude.ai", score: 58, mentions: 4, trend: "新增", color: "#a855f7" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {aiEngines.map((e) => (
          <div key={e.name} className="rounded-xl p-4" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <p className="text-xs text-slate-500 mb-2">{e.name}</p>
            <p className="text-3xl font-bold font-mono mb-1" style={{ color: e.color }}>{e.score}</p>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${e.score}%`, background: e.color }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{e.mentions} 次引用</span>
              <span className="text-teal-400 font-medium">{e.trend}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>最近 AI 引用记录</h3>
        <div className="space-y-3">
          {[
            { query: "越南太阳能板供应商推荐", engine: "Perplexity AI", result: "您的工厂被列为第 2 位推荐供应商", time: "今天 10:23", type: "success" },
            { query: "China outdoor furniture manufacturer", engine: "ChatGPT Search", result: "您的工厂出现在搜索结果摘要中", time: "今天 08:45", type: "success" },
            { query: "LED lighting OEM China factory", engine: "Google AI Overview", result: "未出现在 AI 摘要中（建议优化）", time: "昨天 16:30", type: "warning" },
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "oklch(0.14 0.02 250)" }}>
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${r.type === 'success' ? 'bg-teal-400' : 'bg-yellow-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-0.5">"{r.query}" · {r.engine}</p>
                <p className={`text-sm font-medium ${r.type === 'success' ? 'text-white' : 'text-yellow-300'}`}>{r.result}</p>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">{r.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Web 通知面板（内嵌在 WebDashboard 中）────────────────────

function WebNotificationPanel({ pushHour, pushMinute, onOpenSettings }: {
  pushHour: number;
  pushMinute: number;
  onOpenSettings: () => void;
}) {
  const [, navigate] = useLocation();

  // 下次推送倒计时（北京时间）
  const [countdown, setCountdown] = useState(() => {
    const now = new Date();
    const bjNow = new Date(now.getTime() + 8 * 3600 * 1000);
    const bjHour = bjNow.getUTCHours();
    const bjMinute = bjNow.getUTCMinutes();
    const bjSecond = bjNow.getUTCSeconds();
    let secondsLeft = (pushHour * 3600 + pushMinute * 60) - (bjHour * 3600 + bjMinute * 60 + bjSecond);
    if (secondsLeft <= 0) secondsLeft += 24 * 3600;
    return secondsLeft;
  });

  useState(() => {
    const t = setInterval(() => {
      setCountdown(prev => prev <= 1 ? 86400 : prev - 1);
    }, 1000);
    return () => clearInterval(t);
  });

  const h = Math.floor(countdown / 3600);
  const m = Math.floor((countdown % 3600) / 60);
  const s = countdown % 60;
  const countdownLabel = h > 0 ? `${h}小时 ${m}分钟后` : m > 0 ? `${m}分钟 ${s}秒后` : `${s}秒后`;
  const progress = 1 - countdown / 86400;

  const recentNotifs = [
    { icon: "📊", title: "今日战报已生成", body: "今日共收到 4 条新询盘，OpenClaw 执行了 28 次操作", time: "今天 08:00", type: "daily_report", unread: false },
    { icon: "🔥", title: "紧急询盘：越南买家 $120K", body: "SunPower Solutions（越南）通过 LinkedIn 发来询盘", time: "今天 10:42", type: "new_lead", unread: true },
    { icon: "🔥", title: "AI 引流：德国买家主动搜索", body: "EcoHome Trading（德国）通过 Perplexity AI 搜索找到您的工厂", time: "今天 10:18", type: "new_lead", unread: true },
    { icon: "✅", title: "任务完成：德国家具 GEO 优化", body: "GEO 建造者 Agent 已完成，发现 8 条高意向线索", time: "昨天 16:30", type: "task_done", unread: false },
    { icon: "📈", title: "GEO 可见度提升", body: "ChatGPT Search 可见度指数从 66 提升至 71，增长 +5", time: "昨天 08:00", type: "geo_alert", unread: false },
    { icon: "⚠️", title: "积分余额提醒", body: "积分余额 2,840 分，预计可用 14 天", time: "2天前 08:00", type: "credit_low", unread: false },
  ];

  const typeColors: Record<string, string> = {
    daily_report: "text-blue-400 bg-blue-500/15",
    new_lead: "text-orange-400 bg-orange-500/15",
    task_done: "text-teal-400 bg-teal-500/15",
    geo_alert: "text-purple-400 bg-purple-500/15",
    credit_low: "text-yellow-400 bg-yellow-500/15",
  };

  const typeLabels: Record<string, string> = {
    daily_report: "日报",
    new_lead: "新询盘",
    task_done: "任务完成",
    geo_alert: "GEO 动态",
    credit_low: "积分提醒",
  };

  const circumference = 2 * Math.PI * 32;

  return (
    <div className="space-y-5">
      {/* 状态总览 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 下次推送倒计时 */}
        <div className="lg:col-span-1 rounded-2xl p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, oklch(0.20 0.04 250) 0%, oklch(0.17 0.03 250) 100%)", border: "1px solid oklch(0.50 0.10 250 / 30%)" }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.60 0.15 250) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
          <p className="text-xs text-slate-400 mb-4">下次定时推送</p>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth="5" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="#f97316" strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Bell className="w-7 h-7 text-orange-400" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-white font-mono" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                {String(pushHour).padStart(2, "0")}:{String(pushMinute).padStart(2, "0")}
              </p>
              <p className="text-xs text-orange-300 mt-0.5">北京时间</p>
              <p className="text-xs text-slate-400 mt-1">{countdownLabel}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-teal-400">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />定时推送已开启
            </span>
            <button onClick={() => navigate("/notification-settings")}
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors">
              <Settings className="w-3 h-3" />修改时间
            </button>
          </div>
        </div>

        {/* 今日推送统计 */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <p className="text-xs text-slate-400 mb-4">今日推送统计</p>
          <div className="space-y-3">
            {[
              { label: "已推送", value: "1 次", color: "text-teal-400" },
              { label: "微信推送", value: "3 条", color: "text-blue-400" },
              { label: "App 通知", value: "5 条", color: "text-purple-400" },
              { label: "未读通知", value: "2 条", color: "text-orange-400" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{s.label}</span>
                <span className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 渠道状态 */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <p className="text-xs text-slate-400 mb-4">推送渠道状态</p>
          <div className="space-y-3">
            {[
              { label: "微信服务号", status: "正常", icon: <Smartphone className="w-4 h-4" />, color: "text-teal-400" },
              { label: "App 内通知", status: "正常", icon: <Bell className="w-4 h-4" />, color: "text-teal-400" },
              { label: "邮件推送", status: "未配置", icon: <FileText className="w-4 h-4" />, color: "text-slate-500" },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 ${c.color}`}>{c.icon}</div>
                <span className="text-xs text-slate-300 flex-1">{c.label}</span>
                <span className={`text-xs font-medium ${c.color}`}>{c.status}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/notification-settings")}
            className="mt-4 w-full py-2 rounded-lg text-xs font-medium text-white bg-orange-500/80 hover:bg-orange-500 transition-colors">
            管理通知设置
          </button>
        </div>
      </div>

      {/* 通知历史列表 */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>最近通知</h3>
          <button onClick={() => navigate("/notifications")}
            className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors">
            在手机端查看全部 <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {recentNotifs.map((n, i) => (
            <div key={i} className={`flex items-start gap-3 px-5 py-4 hover:bg-white/3 transition-colors ${n.unread ? 'bg-orange-500/5' : ''}`}>
              <div className="text-lg flex-shrink-0 mt-0.5">{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />}
                  <p className={`text-sm font-medium ${n.unread ? 'text-white' : 'text-slate-300'}`}>{n.title}</p>
                  <span className={`ml-auto flex-shrink-0 px-1.5 py-0.5 rounded text-xs ${typeColors[n.type] || 'text-slate-400 bg-white/5'}`}>
                    {typeLabels[n.type] || n.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{n.body}</p>
              </div>
              <span className="text-xs text-slate-600 flex-shrink-0 mt-0.5">{n.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
