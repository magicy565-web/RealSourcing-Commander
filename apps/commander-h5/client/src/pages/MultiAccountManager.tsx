/* ============================================================
   Phase 7 — Matrix Management 2.0
   多账号矩阵仪表盘：热力图 + 批量操作 + 实例总览
   DESIGN: Night Commander — 暗色系移动端 B2B 仪表盘
   ============================================================ */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Plus, RefreshCw, Zap, Shield, AlertTriangle,
  CheckCircle2, XCircle, Clock, Activity, Server,
  ChevronRight, MoreVertical, Trash2, Play, Pause,
  Wifi, WifiOff, BarChart2, Target, Globe, Layers
} from "lucide-react";
import { toast } from "sonner";
import { multiAccountApi } from "../lib/api";

// ─── 类型 ─────────────────────────────────────────────────────

interface Instance {
  id: string;
  name: string;
  status: "active" | "sleeping" | "error" | "paused";
  mode: string;
  priority: number;
  consecutiveFailures: number;
  sleepUntil?: string;
  lastHeartbeat?: string;
  accounts: Account[];
  todayLeads?: number;
  todayOps?: number;
}

interface Account {
  id: string;
  platform: string;
  accountName: string;
  healthStatus: string;
  dailyOpsUsed: number;
  dailyOpsLimit: number;
}

interface Summary {
  total: number;
  active: number;
  sleeping: number;
  error: number;
  totalLeadsToday: number;
  totalOpsToday: number;
}

// ─── 辅助组件 ─────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, string> = {
  facebook: "📘", tiktok: "🎵", linkedin: "💼",
  whatsapp: "💬", instagram: "📸", twitter: "🐦",
};

const STATUS_CONFIG = {
  active:   { label: "运行中", color: "#10b981", bg: "#10b98120", dot: true },
  sleeping: { label: "休眠中", color: "#f59e0b", bg: "#f59e0b20", dot: false },
  error:    { label: "故障",   color: "#ef4444", bg: "#ef444420", dot: false },
  paused:   { label: "已暂停", color: "#6b7280", bg: "#6b728020", dot: false },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.paused;
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />}
      {cfg.label}
    </span>
  );
}

function HealthBar({ used, limit, color = "#10b981" }: { used: number; limit: number; color?: string }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barColor = pct > 80 ? "#ef4444" : pct > 60 ? "#f59e0b" : color;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.25 0.02 250)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <span className="text-xs font-mono text-slate-500 w-14 text-right">{used}/{limit}</span>
    </div>
  );
}

// ─── 新建实例抽屉 ─────────────────────────────────────────────

function CreateInstanceDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState("balanced");
  const [priority, setPriority] = useState(5);
  const [creating, setCreating] = useState(false);

  const modes = [
    { id: "aggressive", label: "激进模式", desc: "高频操作，快速积累数据，风险较高", color: "#ef4444" },
    { id: "balanced",   label: "均衡模式", desc: "平衡效率与安全，推荐日常使用",   color: "#10b981" },
    { id: "conservative", label: "保守模式", desc: "低频操作，降低封号风险，适合新账号", color: "#6b7280" },
  ];

  async function handleCreate() {
    if (!name.trim()) { toast.error("请输入实例名称"); return; }
    setCreating(true);
    try {
      await multiAccountApi.createInstance({ name: name.trim(), mode, priority });
      toast.success(`实例「${name}」已创建`);
      onCreated();
      onClose();
    } catch {
      toast.error("创建失败，请重试");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "oklch(0 0 0 / 75%)" }}>
      <div className="w-full rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: "oklch(0.16 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)", maxHeight: "88dvh" }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
          <h2 className="text-base font-bold text-white">新建 OpenClaw 实例</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10">
            <XCircle className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ scrollbarWidth: "none" }}>
          {/* 实例名称 */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">实例名称</label>
            <input
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
              style={{ background: "oklch(0.22 0.02 250)", border: "1px solid oklch(1 0 0 / 12%)" }}
              placeholder="如：主力实例-01 / 欧洲专线"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          {/* 运营模式 */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">运营模式</label>
            <div className="space-y-2">
              {modes.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className="w-full text-left rounded-xl p-3.5 transition-all active:scale-98"
                  style={{
                    background: mode === m.id ? "oklch(0.22 0.04 250)" : "oklch(0.20 0.02 250)",
                    border: `1px solid ${mode === m.id ? m.color + "60" : "oklch(1 0 0 / 8%)"}`,
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{m.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                    </div>
                    {mode === m.id && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: m.color }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* 优先级 */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              任务优先级 <span className="text-white ml-1">{priority}</span>
            </label>
            <input type="range" min={1} max={10} value={priority}
              onChange={e => setPriority(Number(e.target.value))}
              className="w-full accent-violet-500" />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>低优先级 (1)</span><span>高优先级 (10)</span>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 px-5 py-4" style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}>
          <button onClick={handleCreate} disabled={creating}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
            {creating ? <><RefreshCw className="w-4 h-4 animate-spin" />创建中...</> : <><Plus className="w-4 h-4" />创建实例</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 实例详情抽屉 ─────────────────────────────────────────────

function InstanceDetailDrawer({ instance, onClose, onRefresh }: {
  instance: Instance; onClose: () => void; onRefresh: () => void;
}) {
  const [actionLoading, setActionLoading] = useState("");

  async function handleStatusToggle() {
    const newStatus = instance.status === "active" ? "paused" : "active";
    setActionLoading("toggle");
    try {
      await multiAccountApi.updateStatus(instance.id, newStatus);
      toast.success(newStatus === "active" ? "实例已恢复运行" : "实例已暂停");
      onRefresh();
      onClose();
    } catch { toast.error("操作失败"); }
    finally { setActionLoading(""); }
  }

  async function handleCircuitBreaker(action: "trigger" | "reset") {
    setActionLoading(action);
    try {
      await multiAccountApi.triggerCircuitBreaker(instance.id, action,
        action === "trigger" ? "手动触发熔断" : undefined,
        action === "trigger" ? 60 : undefined
      );
      toast.success(action === "trigger" ? "熔断已触发，实例将休眠 60 分钟" : "熔断已重置，实例恢复运行");
      onRefresh();
      onClose();
    } catch { toast.error("操作失败"); }
    finally { setActionLoading(""); }
  }

  async function handleDelete() {
    if (!confirm(`确认删除实例「${instance.name}」？此操作不可撤销。`)) return;
    setActionLoading("delete");
    try {
      await multiAccountApi.deleteInstance(instance.id);
      toast.success("实例已删除");
      onRefresh();
      onClose();
    } catch { toast.error("删除失败"); }
    finally { setActionLoading(""); }
  }

  const isSleeping = instance.status === "sleeping";
  const isActive = instance.status === "active";

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "oklch(0 0 0 / 75%)" }}>
      <div className="w-full rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: "oklch(0.16 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)", maxHeight: "88dvh" }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
          <div>
            <h2 className="text-base font-bold text-white">{instance.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={instance.status} />
              <span className="text-xs text-slate-500">优先级 {instance.priority}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10">
            <XCircle className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ scrollbarWidth: "none" }}>
          {/* 今日数据 */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "今日线索", value: instance.todayLeads ?? 0, color: "#10b981", icon: Target },
              { label: "今日操作", value: instance.todayOps ?? 0, color: "#8b5cf6", icon: Activity },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: "oklch(0.20 0.02 250)" }}>
                <s.icon className="w-4 h-4 mb-1" style={{ color: s.color }} />
                <p className="text-lg font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
          {/* 连续失败 / 休眠 */}
          {(instance.consecutiveFailures > 0 || isSleeping) && (
            <div className="rounded-xl p-3 flex items-start gap-2.5"
              style={{ background: "oklch(0.20 0.05 20)", border: "1px solid #ef444430" }}>
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-300">
                  {isSleeping ? "熔断休眠中" : `连续失败 ${instance.consecutiveFailures} 次`}
                </p>
                {instance.sleepUntil && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    预计恢复：{new Date(instance.sleepUntil).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          )}
          {/* 绑定账号 */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">绑定账号</p>
            {instance.accounts.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">暂无绑定账号</p>
            ) : (
              <div className="space-y-2">
                {instance.accounts.map(acc => (
                  <div key={acc.id} className="rounded-xl p-3"
                    style={{ background: "oklch(0.20 0.02 250)", border: "1px solid oklch(1 0 0 / 6%)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{PLATFORM_ICONS[acc.platform] ?? "🌐"}</span>
                      <span className="text-sm font-semibold text-white flex-1">{acc.accountName}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: acc.healthStatus === "healthy" ? "#10b98120" : "#ef444420",
                          color: acc.healthStatus === "healthy" ? "#10b981" : "#ef4444" }}>
                        {acc.healthStatus === "healthy" ? "健康" : "异常"}
                      </span>
                    </div>
                    <HealthBar used={acc.dailyOpsUsed} limit={acc.dailyOpsLimit} />
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* 操作按钮 */}
          <div className="space-y-2">
            <button onClick={handleStatusToggle} disabled={!!actionLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: isActive ? "oklch(0.25 0.02 250)" : "linear-gradient(135deg, #10b981, #059669)" }}>
              {actionLoading === "toggle"
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : isActive ? <><Pause className="w-4 h-4" />暂停实例</> : <><Play className="w-4 h-4" />恢复运行</>}
            </button>
            {!isSleeping ? (
              <button onClick={() => handleCircuitBreaker("trigger")} disabled={!!actionLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "oklch(0.20 0.05 20)", border: "1px solid #ef444430", color: "#ef4444" }}>
                {actionLoading === "trigger"
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <><Shield className="w-4 h-4" />手动触发熔断（休眠 60 分钟）</>}
              </button>
            ) : (
              <button onClick={() => handleCircuitBreaker("reset")} disabled={!!actionLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "oklch(0.20 0.05 40)", border: "1px solid #f59e0b30", color: "#f59e0b" }}>
                {actionLoading === "reset"
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <><Zap className="w-4 h-4" />强制唤醒（重置熔断）</>}
              </button>
            )}
            <button onClick={handleDelete} disabled={!!actionLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "oklch(0.18 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)", color: "#6b7280" }}>
              {actionLoading === "delete"
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <><Trash2 className="w-4 h-4" />删除实例</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────

// ─── 热力图组件 ─────────────────────────────────────────────────
const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HeatmapCell({ count, maxCount }: { count: number; maxCount: number }) {
  const intensity = maxCount > 0 ? count / maxCount : 0;
  const opacity = intensity === 0 ? 0.06 : 0.15 + intensity * 0.75;
  const hue = intensity < 0.5 ? 250 : 280 - (intensity - 0.5) * 60;
  return (
    <div
      className="rounded-sm"
      style={{
        width: 10, height: 10,
        background: intensity === 0
          ? 'oklch(0.25 0 0)'
          : `oklch(${0.45 + intensity * 0.25} ${0.15 + intensity * 0.15} ${hue})`,
        opacity,
      }}
      title={`${count} 次操作`}
    />
  );
}

function MatrixHeatmap({ heatmap }: { heatmap: Array<{ day: number; hour: number; count: number }> }) {
  const maxCount = Math.max(...heatmap.map(h => h.count), 1);
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  heatmap.forEach(({ day, hour, count }) => { if (grid[day]) grid[day][hour] = count; });
  const now = new Date();
  const todayIdx = 6; // 最后一天是今天
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    return DAYS[d.getDay()];
  });
  return (
    <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      <div style={{ minWidth: 280 }}>
        {/* 小时标尺 */}
        <div className="flex gap-0.5 mb-1 ml-8">
          {[0,6,12,18,23].map(h => (
            <div key={h} className="text-slate-600" style={{ fontSize: 9, width: (h === 23 ? 10 : (h === 0 ? 10 : 10 * (h === 6 ? 6 : h === 12 ? 6 : h === 18 ? 6 : 5))) }}>{h}h</div>
          ))}
        </div>
        {/* 网格 */}
        {grid.map((row, dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-0.5 mb-0.5">
            <span className="text-slate-600 w-7 text-right pr-1 flex-shrink-0" style={{ fontSize: 9 }}>
              {dayLabels[dayIdx]}
            </span>
            {row.map((count, hour) => (
              <HeatmapCell key={hour} count={count} maxCount={maxCount} />
            ))}
          </div>
        ))}
        {/* 图例 */}
        <div className="flex items-center gap-2 mt-2 ml-8">
          <span className="text-slate-600" style={{ fontSize: 9 }}>少</span>
          {[0.06, 0.3, 0.55, 0.75, 1].map((v, i) => (
            <div key={i} className="rounded-sm" style={{
              width: 10, height: 10,
              background: v < 0.1 ? 'oklch(0.25 0 0)' : `oklch(${0.45 + v * 0.25} ${0.15 + v * 0.15} ${250 + v * 30})`,
              opacity: v < 0.1 ? 0.06 : 0.15 + v * 0.75,
            }} />
          ))}
          <span className="text-slate-600" style={{ fontSize: 9 }}>多</span>
        </div>
      </div>
    </div>
  );
}

export default function MultiAccountManager() {
  const [, navigate] = useLocation();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [routing, setRouting] = useState(false);
  // Matrix 2.0 state
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix'>('overview');
  const [matrixData, setMatrixData] = useState<{ heatmap: any[]; instances: any[]; batchSuggestions: any[]; summary: any } | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const res = await multiAccountApi.getInstances();
      setInstances(res.instances ?? []);
      setSummary(res.summary ?? null);
    } catch { toast.error("加载失败"); }
    finally { setLoading(false); }
  }

  async function loadMatrix() {
    setMatrixLoading(true);
    try {
      const res = await multiAccountApi.getMatrix();
      setMatrixData(res);
    } catch { toast.error("热力图加载失败"); }
    finally { setMatrixLoading(false); }
  }

  async function handleBatchAction(action: string) {
    setBatchLoading(action);
    try {
      const res = await multiAccountApi.batchAction(action);
      toast.success(res.message);
      await loadData();
      await loadMatrix();
    } catch { toast.error('批量操作失败'); }
    finally { setBatchLoading(''); }
  }

  useEffect(() => { loadData(); }, []);

  async function handleRouteTask() {
    setRouting(true);
    try {
      const res = await multiAccountApi.routeTask("facebook");
      if (res.success && res.routedTo) {
        toast.success(`任务已路由至「${res.routedTo.name}」`);
      } else {
        toast.error(res.error ?? "无可用实例");
      }
    } catch { toast.error("路由失败"); }
    finally { setRouting(false); }
  }

  const activeCount = instances.filter(i => i.status === "active").length;
  const errorCount  = instances.filter(i => i.status === "error").length;
  const sleepCount  = instances.filter(i => i.status === "sleeping").length;

  return (
    <div className="min-h-screen flex items-start justify-center sm:py-8" style={{ background: "oklch(0.10 0.02 250)" }}>
      <div className="w-full sm:rounded-3xl sm:overflow-hidden sm:shadow-2xl flex flex-col"
        style={{ background: "oklch(0.14 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)", maxWidth: "390px", minHeight: "100dvh" }}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-12 pb-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/phone")}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "oklch(0.22 0.02 250)" }}>
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>多账号协同管理</h1>
              <p className="text-xs text-slate-500">OpenClaw 实例集群 · Matrix 2.0</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
              <Plus className="w-3.5 h-3.5" />新建
            </button>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex-shrink-0 px-4 pt-3 pb-0">
          <div className="flex rounded-xl p-0.5" style={{ background: 'oklch(0.18 0.02 250)' }}>
            {[{ id: 'overview', label: '实例总览', icon: <Server className="w-3 h-3" /> }, { id: 'matrix', label: '矩阵热力图', icon: <Layers className="w-3 h-3" /> }].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'matrix' && !matrixData) loadMatrix();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: activeTab === tab.id ? 'oklch(0.26 0.06 280)' : 'transparent',
                  color: activeTab === tab.id ? '#a78bfa' : 'oklch(0.55 0 0)',
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{ scrollbarWidth: "none" }}>

          {/* 矩阵热力图视图 */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              {matrixLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#7c3aed', borderTopColor: 'transparent' }} />
                </div>
              ) : matrixData ? (
                <>
                  {/* 热力图卡片 */}
                  <div className="rounded-2xl p-4" style={{ background: 'oklch(0.19 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-bold text-white">7天操作热力图</span>
                      <button onClick={loadMatrix} className="ml-auto">
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${matrixLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <MatrixHeatmap heatmap={matrixData.heatmap} />
                  </div>

                  {/* 实例利用率 */}
                  <div className="rounded-2xl p-4" style={{ background: 'oklch(0.19 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">实例利用率</p>
                    <div className="space-y-3">
                      {matrixData.instances.map((inst: any) => (
                        <div key={inst.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-white">{inst.name}</span>
                            <span className="text-xs font-mono" style={{ color: inst.utilizationRate > 80 ? '#ef4444' : inst.utilizationRate > 60 ? '#f59e0b' : '#10b981' }}>
                              {inst.utilizationRate}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.25 0.02 250)' }}>
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${inst.utilizationRate}%`,
                              background: inst.utilizationRate > 80 ? '#ef4444' : inst.utilizationRate > 60 ? '#f59e0b' : '#10b981',
                            }} />
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">今日 {inst.opsToday}/{inst.opsLimit} 次操作</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 批量操作 */}
                  {matrixData.batchSuggestions.length > 0 && (
                    <div className="rounded-2xl p-4" style={{ background: 'oklch(0.19 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">批量操作</p>
                      <div className="space-y-2">
                        {matrixData.batchSuggestions.map((s: any) => (
                          <button
                            key={s.type}
                            onClick={() => handleBatchAction(s.type)}
                            disabled={!!batchLoading}
                            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-98 disabled:opacity-50"
                            style={{ background: 'oklch(0.22 0.02 250)', border: '1px solid oklch(1 0 0 / 8%)' }}
                          >
                            <span className="text-lg">{s.icon}</span>
                            <span className="flex-1 text-sm text-white">{s.label}</span>
                            {batchLoading === s.type
                              ? <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
                              : <ChevronRight className="w-4 h-4 text-slate-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Layers className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">点击加载矩阵数据</p>
                  <button onClick={loadMatrix} className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>加载</button>
                </div>
              )}
            </div>
          )}

          {/* 总览内容 - 只在 overview tab 显示 */}
          {activeTab === 'overview' && (
            <>
              {summary && (
                <div className="rounded-2xl p-4 mb-5"
                  style={{ background: "linear-gradient(135deg, oklch(0.22 0.06 280), oklch(0.18 0.04 280))", border: "1px solid #7c3aed25" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-bold text-white">集群总览</span>
                    <button onClick={loadData} className="ml-auto">
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "总实例", value: summary.total, color: "#a78bfa" },
                      { label: "运行中", value: summary.active, color: "#10b981" },
                      { label: "休眠", value: summary.sleeping, color: "#f59e0b" },
                      { label: "故障", value: summary.error, color: "#ef4444" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: "oklch(0.16 0.02 250 / 60%)" }}>
                        <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid #7c3aed20" }}>
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs text-slate-400">今日线索 <span className="text-white font-semibold">{summary.totalLeadsToday}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-xs text-slate-400">今日操作 <span className="text-white font-semibold">{summary.totalOpsToday}</span></span>
                    </div>
                  </div>
                </div>
              )}

              {/* 智能路由测试 */}
              <div className="rounded-2xl p-4 mb-5"
                style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-white">智能任务路由</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">系统自动将任务分配给最优实例（优先级最高 + 状态健康 + 操作余量充足）</p>
                <button onClick={handleRouteTask} disabled={routing || activeCount === 0}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  {routing
                    ? <><RefreshCw className="w-4 h-4 animate-spin" />路由中...</>
                    : <><Zap className="w-4 h-4" />测试路由（Facebook 任务）</>}
                </button>
              </div>

              {/* 实例列表 */}
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">实例列表</p>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "#7c3aed", borderTopColor: "transparent" }} />
                </div>
              ) : instances.length === 0 ? (
                <div className="text-center py-12">
                  <Server className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">暂无实例</p>
                  <p className="text-xs text-slate-600 mt-1">点击右上角「新建」创建第一个 OpenClaw 实例</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {instances.map(inst => (
                    <button key={inst.id} onClick={() => setSelectedInstance(inst)}
                      className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-98"
                      style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: inst.status === "active" ? "#10b98120" : "oklch(0.25 0.02 250)" }}>
                              <Server className="w-4 h-4" style={{ color: inst.status === "active" ? "#10b981" : "#6b7280" }} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{inst.name}</p>
                              <p className="text-xs text-slate-500">{inst.mode} · 优先级 {inst.priority}</p>
                            </div>
                          </div>
                          <StatusBadge status={inst.status} />
                        </div>
                        {inst.accounts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {inst.accounts.map(acc => (
                              <span key={acc.id} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                style={{ background: "oklch(0.25 0.02 250)", color: "oklch(0.7 0 0)" }}>
                                {PLATFORM_ICONS[acc.platform] ?? "🌐"} {acc.accountName}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Target className="w-3 h-3 text-emerald-400" />
                            <span className="text-white font-semibold">{inst.todayLeads ?? 0}</span> 线索
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Activity className="w-3 h-3 text-violet-400" />
                            <span className="text-white font-semibold">{inst.todayOps ?? 0}</span> 操作
                          </span>
                          {inst.consecutiveFailures > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-400 ml-auto">
                              <AlertTriangle className="w-3 h-3" />连续失败 {inst.consecutiveFailures}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 风险说明 */}
              <div className="rounded-2xl p-4 mt-5"
                style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 6%)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-400">风险熔断机制</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  当实例连续失败 <span className="text-white">3 次</span>时自动触发熔断，休眠 <span className="text-white">30 分钟</span>后自动恢复。
                  可手动触发熔断（最长 60 分钟）或强制唤醒。熔断期间任务将自动路由至其他健康实例。
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateInstanceDrawer onClose={() => setShowCreate(false)} onCreated={loadData} />
      )}
      {selectedInstance && (
        <InstanceDetailDrawer
          instance={selectedInstance}
          onClose={() => setSelectedInstance(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
