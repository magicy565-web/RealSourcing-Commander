/* ============================================================
   DESIGN: Night Commander — Web Management Dashboard
   Mock data → Real API integration (Phase 3 完成版)
   ============================================================ */
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useNotifSettings } from "../App";
import {
  LayoutDashboard, Zap, Target, Database,
  TrendingUp, Globe, MessageSquare, Users, BarChart3,
  ArrowLeft, Bell, Building2, FileText,
  Coins, CheckCircle2, Loader2, Clock, RefreshCw,
  ArrowUpRight, ArrowDownRight, Star, Map,
  Monitor, AlertCircle, Play,
  Pause, Linkedin, Facebook,
  Server, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";
import {
  dashboardApi, openclawApi, inquiriesApi, tasksApi,
  DashboardOverview, OpenClawStatus, Inquiry, Task, TaskStats
} from "../lib/api";

const CHART_COLORS = ["#f97316", "#10b981", "#3b82f6", "#a855f7", "#eab308", "#ec4899"];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function fmtValue(v?: number): string {
  if (!v) return "—";
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
}

type NavItem = "overview" | "leads" | "tasks" | "openclaw" | "assets" | "geo" | "notifications";

export default function WebDashboard() {
  const [activeNav, setActiveNav] = useState<NavItem>("overview");
  const [, navigate] = useLocation();
  const { pushHour, pushMinute } = useNotifSettings();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    dashboardApi.overview()
      .then(setOverview)
      .catch(() => toast.error("加载仪表盘数据失败"))
      .finally(() => setOverviewLoading(false));
  }, []);

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
    overview: "增长总览", leads: "询盘管理", tasks: "Agent 任务中心",
    openclaw: "OpenClaw 管理", assets: "数字资产库", geo: "GEO 可见度监控", notifications: "通知中心",
  };

  const creditsBalance = overview?.tenant?.creditsBalance ?? 0;
  const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(0.12 0.02 250)", fontFamily: "'Inter', sans-serif" }}>
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/8" style={{ background: "oklch(0.14 0.02 250)" }}>
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
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left ${
                activeNav === item.id ? "bg-orange-500/15 text-orange-400 font-medium" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}>
              {item.icon}{item.label}
              {item.id === "openclaw" && overview?.openclaw && (
                <span className="ml-auto">
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                    overview.openclaw.status === "online" ? "bg-teal-400 animate-pulse" :
                    overview.openclaw.status === "sleeping" ? "bg-yellow-400" : "bg-red-400"
                  }`} />
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/8">
          <div className="rounded-xl p-3" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(0.70 0.18 40 / 20%)" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">可用积分</span>
              <Coins className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <p className="text-xl font-bold text-orange-400 font-mono">
              {overviewLoading ? "—" : creditsBalance.toLocaleString()}
            </p>
            <button onClick={() => toast.success("积分充值功能即将上线")}
              className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium text-white bg-orange-500/80 hover:bg-orange-500 transition-colors">
              充值积分
            </button>
          </div>
        </div>
        <div className="px-3 pb-4">
          <button onClick={() => navigate("/")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />返回原型首页
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/8" style={{ background: "oklch(0.14 0.02 250)" }}>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{titles[activeNav]}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{today} · 数据实时更新</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveNav("notifications")}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 relative hover:bg-white/12 transition-colors">
              <Bell className="w-4 h-4 text-slate-400" />
              {(overview?.inquiries?.unread ?? 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold" style={{ fontSize: "8px" }}>{overview!.inquiries.unread}</span>
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/8">
              <div className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center">
                <span className="text-xs font-bold text-orange-400">{overview?.tenant?.name?.[0] ?? "管"}</span>
              </div>
              <span className="text-sm text-white">{overview?.tenant?.name ?? "管理员"}</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {activeNav === "overview" && <OverviewContent overview={overview} loading={overviewLoading} />}
          {activeNav === "leads" && <LeadsContent />}
          {activeNav === "tasks" && <TasksContent />}
          {activeNav === "openclaw" && <OpenClawContent />}
          {activeNav === "assets" && <AssetsContent />}
          {activeNav === "geo" && <GeoContent />}
          {activeNav === "notifications" && <NotificationsContent overview={overview} />}
        </div>
      </main>
    </div>
  );
}

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

function OverviewContent({ overview, loading }: { overview: DashboardOverview | null; loading: boolean }) {
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      <span className="ml-3 text-slate-400">加载数据中...</span>
    </div>
  );
  if (!overview) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-slate-400">数据加载失败，请刷新重试</p>
    </div>
  );

  const inq = overview.inquiries;
  const channelChartData = (overview.channelDistribution || []).map((c: any, i: number) => ({
    market: c.platform, value: c.count, color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const trendChartData = (overview.dailyTrend || []).map((d: any) => ({
    date: d.date.slice(5), count: d.count,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="本月询盘总量" value={inq.this_month ?? 0} unit="条"
          trend={inq.today > 0 ? `今日 +${inq.today}` : undefined} trendUp
          icon={<MessageSquare className="w-4 h-4 text-orange-400" />} color="bg-orange-500/15" />
        <StatCard label="未读询盘" value={inq.unread ?? 0} unit="条"
          trend={inq.unquoted > 0 ? `待报价 ${inq.unquoted}` : undefined} trendUp={false}
          icon={<Globe className="w-4 h-4 text-teal-400" />} color="bg-teal-500/15" />
        <StatCard label="本月询盘价值" value={fmtValue(inq.month_value)} unit=""
          trend={inq.contracted > 0 ? `已签约 ${inq.contracted}` : undefined} trendUp
          icon={<TrendingUp className="w-4 h-4 text-blue-400" />} color="bg-blue-500/15" />
        <StatCard label="OpenClaw 今日操作" value={overview.openclaw?.opsToday ?? 0} unit="次"
          trend={overview.openclaw ? `限额 ${overview.openclaw.opsLimit}` : undefined} trendUp
          icon={<Coins className="w-4 h-4 text-yellow-400" />} color="bg-yellow-500/15" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>询盘增长趋势（近7天）</h3>
            <span className="text-xs text-slate-500">实时数据</span>
          </div>
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.02 250)", border: "1px solid oklch(1 0 0 / 15%)", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                <Area type="monotone" dataKey="count" name="询盘数" stroke="#f97316" strokeWidth={2} fill="url(#countGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-500 text-sm">暂无趋势数据</div>
          )}
        </div>
        <div className="rounded-xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>渠道分布（近30天）</h3>
          {channelChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={channelChartData} layout="vertical">
                  <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="market" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.02 250)", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                  <Bar dataKey="value" name="询盘数" radius={[0, 4, 4, 0]}>
                    {channelChartData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {channelChartData.slice(0, 5).map((m: any) => (
                  <div key={m.market} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 truncate max-w-[100px]">{m.market}</span>
                    <span className="text-white font-mono">{m.value} 条</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-500 text-sm">暂无渠道数据</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "未读", value: inq.unread ?? 0, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
          { label: "待报价", value: inq.unquoted ?? 0, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "已报价", value: inq.quoted ?? 0, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
          { label: "已签约", value: inq.contracted ?? 0, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" },
        ].map((stage) => (
          <div key={stage.label} className={`rounded-xl p-4 border ${stage.border} ${stage.bg}`}>
            <p className={`text-2xl font-bold font-mono ${stage.color}`}>{stage.value}</p>
            <p className="text-xs text-slate-400 mt-1">{stage.label}</p>
          </div>
        ))}
      </div>

      <RecentInquiriesTable />
    </div>
  );
}

function RecentInquiriesTable() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inquiriesApi.list({ limit: 8, page: 1 })
      .then((r) => setInquiries(r.items))
      .catch(() => toast.error("加载询盘列表失败"))
      .finally(() => setLoading(false));
  }, []);

  const statusCfg: Record<string, { label: string; cls: string }> = {
    new: { label: "新询盘", cls: "bg-orange-500/20 text-orange-400" },
    unread: { label: "未读", cls: "bg-orange-500/20 text-orange-400" },
    unquoted: { label: "待报价", cls: "bg-blue-500/20 text-blue-400" },
    quoted: { label: "已报价", cls: "bg-purple-500/20 text-purple-400" },
    contracted: { label: "已签约", cls: "bg-teal-500/20 text-teal-400" },
    expired: { label: "已过期", cls: "bg-slate-500/20 text-slate-400" },
    no_reply: { label: "未回复", cls: "bg-yellow-500/20 text-yellow-400" },
    replied: { label: "已回复", cls: "bg-blue-500/20 text-blue-400" },
    closed: { label: "已关闭", cls: "bg-slate-500/20 text-slate-400" },
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>最新询盘</h3>
        <span className="text-xs text-slate-500">实时数据</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
          <span className="ml-2 text-sm text-slate-400">加载中...</span>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <MessageSquare className="w-8 h-8 text-slate-600" />
          <p className="text-sm text-slate-500">暂无询盘数据</p>
          <p className="text-xs text-slate-600">OpenClaw 运行后将自动导入询盘</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {["公司", "国家", "产品", "金额", "渠道", "状态", "时间"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inq) => {
              const s = statusCfg[inq.status] ?? { label: inq.status, cls: "bg-slate-500/20 text-slate-400" };
              return (
                <tr key={inq.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-white">{inq.buyerCompany || inq.buyerName}</td>
                  <td className="px-5 py-3 text-sm text-slate-400">{inq.buyerCountry || "—"}</td>
                  <td className="px-5 py-3 text-sm text-slate-400 max-w-[120px] truncate">{inq.productName}</td>
                  <td className="px-5 py-3 text-sm text-orange-400 font-mono">{fmtValue(inq.estimatedValue)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500 max-w-[80px] truncate">{inq.sourcePlatform}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{timeAgo(inq.receivedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LeadsContent() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  const load = () => {
    setLoading(true);
    inquiriesApi.list({ status: statusFilter || undefined, page, limit })
      .then((r) => { setInquiries(r.items); setTotal(r.total); })
      .catch(() => toast.error("加载询盘失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, page]);

  const statusCfg: Record<string, { label: string; cls: string }> = {
    new: { label: "新询盘", cls: "bg-orange-500/20 text-orange-400" },
    unread: { label: "未读", cls: "bg-orange-500/20 text-orange-400" },
    unquoted: { label: "待报价", cls: "bg-blue-500/20 text-blue-400" },
    quoted: { label: "已报价", cls: "bg-purple-500/20 text-purple-400" },
    contracted: { label: "已签约", cls: "bg-teal-500/20 text-teal-400" },
    expired: { label: "已过期", cls: "bg-slate-500/20 text-slate-400" },
    no_reply: { label: "未回复", cls: "bg-yellow-500/20 text-yellow-400" },
    replied: { label: "已回复", cls: "bg-blue-500/20 text-blue-400" },
    closed: { label: "已关闭", cls: "bg-slate-500/20 text-slate-400" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          {[
            { value: "", label: "全部" },
            { value: "unread", label: "未读" },
            { value: "unquoted", label: "待报价" },
            { value: "quoted", label: "已报价" },
            { value: "contracted", label: "已签约" },
          ].map((f) => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.value ? "bg-orange-500 text-white" : "bg-white/8 text-slate-400 hover:bg-white/12 hover:text-white"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-500">共 {total} 条</span>
        <button onClick={load} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />刷新
        </button>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
            <span className="ml-2 text-sm text-slate-400">加载中...</span>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <MessageSquare className="w-10 h-10 text-slate-600" />
            <p className="text-slate-500">暂无询盘</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["公司", "国家", "产品", "金额", "渠道", "紧急度", "状态", "时间"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => {
                const s = statusCfg[inq.status] ?? { label: inq.status, cls: "bg-slate-500/20 text-slate-400" };
                const urgencyColor = inq.urgency === "high" ? "text-red-400" : inq.urgency === "medium" ? "text-yellow-400" : "text-slate-400";
                const urgencyLabel = inq.urgency === "high" ? "高" : inq.urgency === "medium" ? "中" : "低";
                return (
                  <tr key={inq.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-white">{inq.buyerCompany || inq.buyerName}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{inq.buyerCountry || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-300 max-w-[100px] truncate">{inq.productName}</td>
                    <td className="px-4 py-3 text-xs text-orange-400 font-mono">{fmtValue(inq.estimatedValue)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[80px] truncate">{inq.sourcePlatform}</td>
                    <td className="px-4 py-3 text-xs font-medium"><span className={urgencyColor}>{urgencyLabel}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(inq.receivedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {total > limit && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/8 text-slate-400 hover:bg-white/12 disabled:opacity-40">上一页</button>
          <span className="text-xs text-slate-500">第 {page} 页 / 共 {Math.ceil(total / limit)} 页</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/8 text-slate-400 hover:bg-white/12 disabled:opacity-40">下一页</button>
        </div>
      )}
    </div>
  );
}

function TasksContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = () => {
    setLoading(true);
    tasksApi.list(filter || undefined)
      .then((r) => { setTasks(r.items); setStats(r.stats); })
      .catch(() => toast.error("加载任务列表失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    running: { label: "执行中", color: "text-orange-400", bg: "bg-orange-500/15" },
    completed: { label: "已完成", color: "text-teal-400", bg: "bg-teal-500/15" },
    pending: { label: "等待中", color: "text-slate-400", bg: "bg-slate-500/15" },
    failed: { label: "失败", color: "text-red-400", bg: "bg-red-500/15" },
    cancelled: { label: "已取消", color: "text-slate-500", bg: "bg-slate-500/10" },
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "全部任务", value: stats.total, color: "text-white" },
            { label: "执行中", value: stats.running, color: "text-orange-400" },
            { label: "已完成", value: stats.completed, color: "text-teal-400" },
            { label: "失败", value: stats.failed, color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        {["", "running", "pending", "completed", "failed"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? "bg-orange-500 text-white" : "bg-white/8 text-slate-400 hover:bg-white/12 hover:text-white"
            }`}>
            {f === "" ? "全部" : statusCfg[f]?.label ?? f}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />刷新
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
          <span className="ml-2 text-sm text-slate-400">加载中...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <Target className="w-10 h-10 text-slate-600" />
          <p className="text-slate-500">暂无任务</p>
          <p className="text-xs text-slate-600">OpenClaw 运行后将自动创建任务</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const s = statusCfg[task.status] ?? { label: task.status, color: "text-slate-400", bg: "bg-slate-500/15" };
            return (
              <div key={task.id} className="rounded-xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{task.task_type} · {task.platform}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-md truncate">{task.target_info}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${s.color} ${s.bg}`}>{s.label}</span>
                </div>
                {(task.status === "running" || task.status === "completed") && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>执行进度</span>
                      <span className="font-mono">{task.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all" style={{ width: `${task.progress}%` }} />
                    </div>
                  </div>
                )}
                {task.error_msg && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400">{task.error_msg}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-xs text-slate-500">
                  <span>积分: <span className="text-white font-mono">{task.actual_credits || task.estimated_credits || "—"}</span></span>
                  <span>步骤: <span className="text-white font-mono">{task.current_step}/{task.total_steps}</span></span>
                  {task.status === "running" && (
                    <button onClick={() => tasksApi.cancel(task.id).then(() => { toast.success("任务已取消"); load(); }).catch(() => toast.error("取消失败"))}
                      className="ml-auto flex items-center gap-1 text-xs text-red-400 border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                      <Pause className="w-3 h-3" />取消
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OpenClawContent() {
  const [status, setStatus] = useState<OpenClawStatus | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"accounts" | "logs" | "selfheal">("accounts");

  const load = () => {
    setLoading(true);
    Promise.all([openclawApi.status(), openclawApi.logs({ page: 1 })])
      .then(([s, l]) => { setStatus(s); setLogs(l.items); })
      .catch(() => toast.error("加载 OpenClaw 状态失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      <span className="ml-3 text-slate-400">加载中...</span>
    </div>
  );

  if (!status?.instance) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 rounded-xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
      <Server className="w-12 h-12 text-slate-600" />
      <p className="text-slate-400 font-medium">尚未配置 OpenClaw 实例</p>
      <p className="text-xs text-slate-600">请联系技术支持完成实例部署</p>
    </div>
  );

  const inst = status.instance;
  const statusColor = inst.status === "online" ? "text-teal-400" : inst.status === "sleeping" ? "text-yellow-400" : "text-red-400";
  const statusDot = inst.status === "online" ? "bg-teal-400 animate-pulse" : inst.status === "sleeping" ? "bg-yellow-400" : "bg-red-400";
  const statusLabel = inst.status === "online" ? "在线" : inst.status === "sleeping" ? "休眠中" : "离线";

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Server className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">{inst.name}</p>
              <p className="text-xs text-slate-500">实例 {inst.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "今日操作", value: status.todayStats.totalOps, color: "text-orange-400" },
            { label: "成功", value: status.todayStats.successCount, color: "text-teal-400" },
            { label: "失败", value: status.todayStats.failCount, color: "text-red-400" },
            { label: "积分消耗", value: status.todayStats.creditsUsed, color: "text-yellow-400" },
          ].map((m) => (
            <div key={m.label} className="text-center rounded-lg p-3" style={{ background: "oklch(0.14 0.02 250)" }}>
              <p className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>今日操作配额</span>
            <span className="font-mono">{inst.opsToday} / {inst.opsLimit}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all"
              style={{ width: `${Math.min(100, (inst.opsToday / inst.opsLimit) * 100)}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openclawApi.status().then(setStatus).catch(() => toast.error("刷新失败"))}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />刷新状态
          </button>
          {inst.status === "online" && (
            <button onClick={() => openclawApi.pause().then(() => { toast.success("已暂停"); load(); }).catch(() => toast.error("操作失败"))}
              className="flex items-center gap-1.5 text-xs text-yellow-400 px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors">
              <Pause className="w-3.5 h-3.5" />暂停
            </button>
          )}
          {inst.status === "paused" && (
            <button onClick={() => openclawApi.resume().then(() => { toast.success("已恢复"); load(); }).catch(() => toast.error("操作失败"))}
              className="flex items-center gap-1.5 text-xs text-teal-400 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 transition-colors">
              <Play className="w-3.5 h-3.5" />恢复
            </button>
          )}
          {inst.lastHeartbeat && (
            <span className="ml-auto text-xs text-slate-600">上次心跳：{timeAgo(inst.lastHeartbeat)}</span>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "oklch(0.17 0.02 250)" }}>
        {[
          { id: "accounts" as const, label: "托管账号" },
          { id: "logs" as const, label: "操作日志" },
          { id: "selfheal" as const, label: "自愈状态" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "accounts" && (
        <div className="space-y-3">
          {status.accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 rounded-xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <Users className="w-8 h-8 text-slate-600" />
              <p className="text-sm text-slate-500">暂无托管账号</p>
            </div>
          ) : (
            status.accounts.map((acc: any) => {
              const healthColor = acc.healthStatus === "healthy" ? "text-teal-400" : acc.healthStatus === "warning" ? "text-yellow-400" : "text-red-400";
              return (
                <div key={acc.id} className="rounded-xl p-4 flex items-center gap-4" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    {acc.platform === "LinkedIn" ? <Linkedin className="w-4 h-4 text-blue-400" /> : <Facebook className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{acc.accountName}</p>
                    <p className="text-xs text-slate-500">{acc.platform}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${healthColor}`}>
                      {acc.healthStatus === "healthy" ? "健康" : acc.healthStatus === "warning" ? "警告" : "异常"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{acc.dailyOpsUsed}/{acc.dailyOpsLimit} 次</p>
                  </div>
                  <div className="w-20">
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (acc.dailyOpsUsed / acc.dailyOpsLimit) * 100)}%`, background: acc.opsPercent > 80 ? "#f97316" : "#10b981" }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <FileText className="w-8 h-8 text-slate-600" />
              <p className="text-sm text-slate-500">暂无操作日志</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${log.status === "success" ? "bg-teal-400" : log.status === "failed" ? "bg-red-400" : "bg-blue-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">
                      <span className="text-slate-500 mr-2">{log.platform}</span>
                      {log.actionType}
                      {log.detail?.target && <span className="text-slate-500 ml-1">· {log.detail.target}</span>}
                    </p>
                    {log.detail?.message && <p className="text-xs text-slate-600 mt-0.5 truncate">{log.detail.message}</p>}
                  </div>
                  <span className="text-xs text-slate-600 flex-shrink-0">{timeAgo(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "selfheal" && <SelfHealStatus />}
    </div>
  );
}

function SelfHealStatus() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    openclawApi.selfHealStatus()
      .then(setData)
      .catch(() => toast.error("加载自愈状态失败"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-orange-400 animate-spin" /></div>;
  if (!data) return null;

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
      <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>故障自愈机制</h3>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "连续失败次数", value: data.consecutiveFailures ?? 0, color: "text-white" },
          { label: "当前状态", value: data.isSleeping ? "休眠中" : "正常", color: data.isSleeping ? "text-yellow-400" : "text-teal-400" },
          { label: "累计休眠次数", value: data.sleepCount ?? 0, color: "text-blue-400" },
        ].map((m) => (
          <div key={m.label} className="rounded-lg p-3 text-center" style={{ background: "oklch(0.14 0.02 250)" }}>
            <p className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
      {data.isSleeping && data.sleepUntil && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-300">实例正在休眠，预计恢复时间：{new Date(data.sleepUntil).toLocaleString("zh-CN")}</p>
        </div>
      )}
      <div className="text-xs text-slate-500 space-y-1">
        <p>· 连续失败 3 次触发第一次休眠（5分钟）</p>
        <p>· 连续失败 6 次触发第二次休眠（15分钟）</p>
        <p>· 连续失败 9 次触发第三次休眠（60分钟）</p>
        <p>· 休眠结束后自动恢复，并推送飞书告警</p>
      </div>
    </div>
  );
}

function AssetsContent() {
  const assets = [
    { icon: <Users className="w-5 h-5" />, label: "客户联系人", value: "—", unit: "个", color: "text-blue-400", bg: "bg-blue-500/15", trend: "同步中", desc: "已结构化存储至飞书多维表格" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "沟通记录", value: "—", unit: "条", color: "text-purple-400", bg: "bg-purple-500/15", trend: "已同步", desc: "微信、邮件、WhatsApp 全渠道归集" },
    { icon: <Building2 className="w-5 h-5" />, label: "产品档案", value: "—", unit: "款", color: "text-orange-400", bg: "bg-orange-500/15", trend: "AI 结构化", desc: "含规格、价格、认证、图片" },
    { icon: <Map className="w-5 h-5" />, label: "市场情报", value: "—", unit: "份", color: "text-teal-400", bg: "bg-teal-500/15", trend: "本季度新增", desc: "各市场趋势、竞品、买家分析" },
    { icon: <BarChart3 className="w-5 h-5" />, label: "交易历史", value: "—", unit: "笔", color: "text-yellow-400", bg: "bg-yellow-500/15", trend: "总金额统计中", desc: "完整的订单和付款记录" },
    { icon: <Star className="w-5 h-5" />, label: "买家评价", value: "—", unit: "条", color: "text-pink-400", bg: "bg-pink-500/15", trend: "收集中", desc: "来自各平台的真实买家反馈" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">飞书数字资产库 · 实时同步中</p>
          <p className="text-xs text-slate-500">全部数据 AES-256 加密存储 · Phase 4 将接入真实数据</p>
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
              <span className="text-sm text-slate-400 mb-1">{a.unit}</span>
            </div>
            <p className="text-sm font-medium text-white mb-1">{a.label}</p>
            <p className="text-xs text-slate-500">{a.desc}</p>
            <div className="mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span className="text-xs text-teal-400">{a.trend}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeoContent() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 rounded-xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
      <Globe className="w-12 h-12 text-slate-600" />
      <div className="text-center">
        <p className="text-slate-400 font-medium">GEO 可见度监控</p>
        <p className="text-xs text-slate-600 mt-1">Phase 4 将接入 AI 搜索引擎可见度实时监控</p>
        <p className="text-xs text-slate-600">覆盖 Perplexity、ChatGPT、Gemini 等主流 AI 搜索</p>
      </div>
    </div>
  );
}

function NotificationsContent({ overview }: { overview: DashboardOverview | null }) {
  const notifications: { title: string; desc: string; color: string; icon: React.ReactElement }[] = [];

  if (overview) {
    if (overview.inquiries.unread > 0) {
      notifications.push({
        title: `${overview.inquiries.unread} 条未读询盘`,
        desc: "有新的买家询盘等待处理",
        color: "text-orange-400",
        icon: <MessageSquare className="w-4 h-4 text-orange-400" />,
      });
    }
    if (overview.inquiries.unquoted > 0) {
      notifications.push({
        title: `${overview.inquiries.unquoted} 条询盘待报价`,
        desc: "已接收但尚未发送报价",
        color: "text-blue-400",
        icon: <FileText className="w-4 h-4 text-blue-400" />,
      });
    }
    if (overview.openclaw?.status === "sleeping") {
      notifications.push({
        title: "OpenClaw 实例已进入休眠",
        desc: "连续失败次数超过阈值，已触发自愈机制",
        color: "text-yellow-400",
        icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
      });
    }
    if (overview.openclaw?.status === "online") {
      notifications.push({
        title: "OpenClaw 运行正常",
        desc: `今日已完成 ${overview.openclaw.opsToday} 次操作`,
        color: "text-teal-400",
        icon: <CheckCircle2 className="w-4 h-4 text-teal-400" />,
      });
    }
    if (overview.inquiries.contracted > 0) {
      notifications.push({
        title: `${overview.inquiries.contracted} 条询盘已签约`,
        desc: "恭喜！有询盘已进入签约阶段",
        color: "text-teal-400",
        icon: <Star className="w-4 h-4 text-teal-400" />,
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">系统通知（基于实时数据）</p>
        <span className="text-xs text-slate-500">{notifications.length} 条</span>
      </div>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <Bell className="w-10 h-10 text-slate-600" />
          <p className="text-slate-500">暂无通知</p>
          <p className="text-xs text-slate-600">系统运行正常，无需处理</p>
        </div>
      ) : (
        notifications.map((n, i) => (
          <div key={i} className="flex items-start gap-4 px-5 py-4 rounded-xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="w-9 h-9 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">{n.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{n.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
            </div>
            <span className={`text-xs ${n.color} flex-shrink-0`}>实时</span>
          </div>
        ))
      )}
    </div>
  );
}
