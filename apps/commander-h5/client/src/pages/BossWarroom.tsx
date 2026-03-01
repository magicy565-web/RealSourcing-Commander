/**
 * Phase 6 — 极简老板指挥台（War Room）
 *
 * 三大核心模块：
 * 1. 今日信号   — 新询盘 / 未回复 / 待审批 / 新报价
 * 2. 数字员工   — OpenClaw 状态 / 账号健康 / 今日完成量
 * 3. 经营周报   — 本周 vs 上周 对比（询盘、回复率、成单额）
 *
 * 操作入口：
 * - 老板指令输入框（自然语言 → AI 结构化 → OpenClaw 任务）
 * - 待审批回复草稿列表（一键批准 / 拒绝）
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  bossApi,
  type WaRoomData,
  type PendingApproval,
  type BossCommand,
  type Inquiry,
} from "../lib/api";

// ─── 常量 ──────────────────────────────────────────────────────
const PLATFORM_ICON: Record<string, string> = {
  linkedin: "💼", facebook: "📘", tiktok: "🎵",
  whatsapp: "💬", instagram: "📸", alibaba: "🛒",
};
const PLATFORM_COLOR: Record<string, string> = {
  linkedin: "#0077b5", facebook: "#1877f2", tiktok: "#fe2c55",
  whatsapp: "#25d366", instagram: "#e1306c", alibaba: "#ff6900",
};
const STATUS_INFO: Record<string, { label: string; color: string; dot: string }> = {
  online:   { label: "运行中", color: "#10b981", dot: "bg-green-400" },
  offline:  { label: "离线",   color: "#6b7280", dot: "bg-gray-400" },
  sleeping: { label: "休眠中", color: "#f59e0b", dot: "bg-amber-400" },
  paused:   { label: "已暂停", color: "#ef4444", dot: "bg-red-400" },
};
const HEALTH_COLOR: Record<string, string> = {
  normal: "#10b981", warning: "#f59e0b", error: "#ef4444",
};
const QUICK_CMDS = [
  "今天重点跑欧洲市场",
  "推广 LED 照明产品",
  "加强跟进催单",
  "立即生成今日战报",
];

// ─── 子组件 ────────────────────────────────────────────────────
function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-400 text-xs">持平</span>;
  const up = value > 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-green-500" : "text-red-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

function PulsingDot({ className }: { className: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${className}`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${className}`} />
    </span>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
export default function BossWarroom() {
  const [, navigate] = useLocation();
  const [warroom, setWarroom] = useState<WaRoomData | null>(null);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [commands, setCommands] = useState<BossCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [commandInput, setCommandInput] = useState("");
  const [sending, setSending] = useState(false);
  const [cmdFeedback, setCmdFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"signals" | "agent" | "report">("signals");
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; buyerName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [wr, ap, cmds] = await Promise.all([
        bossApi.getWarroom(),
        bossApi.getPendingApprovals("pending"),
        bossApi.getCommands(5),
      ]);
      setWarroom(wr);
      setApprovals(ap.approvals ?? []);
      setCommands(cmds.commands ?? []);
    } catch (e) {
      console.error("Warroom load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const sendCommand = async () => {
    if (!commandInput.trim() || sending) return;
    setSending(true);
    setCmdFeedback(null);
    try {
      const res = await bossApi.sendCommand(commandInput.trim());
      setCmdFeedback({ type: "ok", msg: `✅ 指令已下达 — ${res.message}` });
      setCommandInput("");
      setTimeout(() => { load(); setCmdFeedback(null); }, 3000);
    } catch (e: any) {
      setCmdFeedback({ type: "err", msg: `❌ 下达失败：${e.message}` });
    } finally {
      setSending(false);
    }
  };

  const handleApprove = async (id: string) => {
    setApprovalLoading(id);
    try {
      await bossApi.approve(id);
      setApprovals(prev => prev.filter(a => a.id !== id));
      setWarroom(prev => prev ? {
        ...prev,
        signals: {
          ...prev.signals,
          pendingApprovals: Math.max(0, prev.signals.pendingApprovals - 1),
        },
      } : prev);
    } catch (e: any) {
      alert(`批准失败：${e.message}`);
    } finally {
      setApprovalLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setApprovalLoading(rejectModal.id);
    try {
      await bossApi.reject(rejectModal.id, rejectReason || "老板拒绝");
      setApprovals(prev => prev.filter(a => a.id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason("");
    } catch (e: any) {
      alert(`拒绝失败：${e.message}`);
    } finally {
      setApprovalLoading(null);
    }
  };

  // ── Loading 状态 ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">加载战报数据...</p>
        </div>
      </div>
    );
  }

  // ── 数据解构（带兜底） ────────────────────────────────────────
  const signals = warroom?.signals ?? {
    newInquiries: 0, unread: 0, pendingApprovals: 0, newQuotations: 0,
    latestInquiries: [], hasUrgent: false,
  };
  const agent = warroom?.agent ?? {
    instance: null, accounts: [], todayTasks: 0, completedTasks: 0, pendingCommands: 0,
  };
  const weekReport = warroom?.weekReport ?? {
    lastWeek: { inquiries: 0, replied: 0, contracted: 0, contractedValue: 0, highValue: 0, replyRate: 0 },
    thisWeek: { inquiries: 0, replied: 0, contracted: 0, contractedValue: 0, highValue: 0, replyRate: 0 },
    growth: { inquiries: 0, replied: 0, contracted: 0, contractedValue: 0, highValue: 0 },
  };

  const instanceStatus = agent.instance?.status ?? "offline";
  const statusInfo = STATUS_INFO[instanceStatus] ?? STATUS_INFO.offline;

  // ── 渲染 ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* ── 顶部 Header ─────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-safe pt-4 pb-3 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
            >
              ←
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">指挥台</h1>
              <p className="text-xs text-gray-400">
                {new Date().toLocaleDateString("zh-CN", {
                  month: "long", day: "numeric", weekday: "short",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {signals.hasUrgent && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium animate-pulse">
                高价值线索 ⚡
              </span>
            )}
            <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              {instanceStatus === "online"
                ? <PulsingDot className="bg-green-400" />
                : <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
              }
              <span className="text-xs text-gray-500">{statusInfo.label}</span>
            </div>
          </div>
        </div>

        {/* 快速信号栏 */}
        <div className="grid grid-cols-4 gap-0 bg-gray-50 rounded-2xl p-2">
          {[
            { label: "新询盘", value: signals.newInquiries, color: "#3b82f6" },
            { label: "未回复", value: signals.unread, color: signals.unread > 0 ? "#ef4444" : "#9ca3af" },
            { label: "待审批", value: signals.pendingApprovals, color: signals.pendingApprovals > 0 ? "#f59e0b" : "#9ca3af" },
            { label: "新报价", value: signals.newQuotations, color: "#10b981" },
          ].map(item => (
            <div key={item.label} className="text-center py-1">
              <div className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>
                {item.value}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">

        {/* ── 老板指令输入框 ───────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm">
              🎯
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-tight">下达指令</p>
              <p className="text-xs text-gray-400">AI 自动解析并分配给数字员工执行</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={commandInput}
              onChange={e => setCommandInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendCommand()}
              placeholder="例：今天重点跑欧洲市场..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition bg-gray-50"
            />
            <button
              onClick={sendCommand}
              disabled={sending || !commandInput.trim()}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition whitespace-nowrap shadow-sm"
            >
              {sending ? "⏳" : "下达"}
            </button>
          </div>

          {cmdFeedback && (
            <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${
              cmdFeedback.type === "ok"
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-500"
            }`}>
              {cmdFeedback.msg}
            </div>
          )}

          {/* 快捷指令 */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {QUICK_CMDS.map(cmd => (
              <button
                key={cmd}
                onClick={() => setCommandInput(cmd)}
                className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-500 px-2.5 py-1 rounded-full transition"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* 最近指令 */}
          {commands.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
              <p className="text-xs text-gray-400 font-medium">最近指令</p>
              {commands.slice(0, 3).map(cmd => (
                <div key={cmd.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    cmd.status === "dispatched" ? "bg-green-400" :
                    cmd.status === "failed" ? "bg-red-400" : "bg-amber-400"
                  }`} />
                  <span className="text-gray-600 flex-1 truncate">{cmd.raw_input}</span>
                  <span className="text-gray-300 flex-shrink-0 text-right">
                    {cmd.structured?.humanReadable ??
                      (cmd.status === "dispatched" ? "已分配" :
                       cmd.status === "failed" ? "失败" : "处理中")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 待审批回复草稿 ───────────────────────────────── */}
        {approvals.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm">
                ✍️
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 leading-tight">待审批回复</p>
                <p className="text-xs text-gray-400">批准后 OpenClaw 将自动发送</p>
              </div>
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {approvals.length}
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {approvals.map(ap => (
                <div key={ap.id} className="px-4 py-3">
                  {/* 买家信息 */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-800">
                          {ap.buyer_name ?? "未知买家"}
                        </span>
                        {ap.buyer_company && (
                          <span className="text-xs text-gray-400">· {ap.buyer_company}</span>
                        )}
                        {ap.platform && (
                          <span className="text-xs" style={{ color: PLATFORM_COLOR[ap.platform] ?? "#6b7280" }}>
                            {PLATFORM_ICON[ap.platform] ?? "🌐"} {ap.platform}
                          </span>
                        )}
                      </div>
                      {ap.product_name && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{ap.product_name}</p>
                      )}
                    </div>
                    {(ap.confidence_score ?? 0) >= 80 && (
                      <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                        高价值
                      </span>
                    )}
                  </div>

                  {/* 回复内容预览 */}
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 border border-gray-100">
                    <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed">
                      {ap.content_en}
                    </p>
                    {ap.content_zh && (
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed border-t border-gray-100 pt-1.5">
                        {ap.content_zh}
                      </p>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(ap.id)}
                      disabled={approvalLoading === ap.id}
                      className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold py-2.5 rounded-xl transition shadow-sm"
                    >
                      {approvalLoading === ap.id ? "处理中..." : "✓ 批准发送"}
                    </button>
                    <button
                      onClick={() => setRejectModal({ id: ap.id, buyerName: ap.buyer_name ?? "该买家" })}
                      disabled={approvalLoading === ap.id}
                      className="flex-1 bg-gray-100 hover:bg-red-50 hover:text-red-500 active:bg-red-100 text-gray-500 text-sm font-semibold py-2.5 rounded-xl transition"
                    >
                      ✗ 拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 三模块 Tab ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab 导航 */}
          <div className="flex border-b border-gray-100">
            {([
              { key: "signals", label: "📥 今日信号" },
              { key: "agent",   label: "🤖 数字员工" },
              { key: "report",  label: "📊 经营周报" },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 text-xs font-semibold py-3 transition ${
                  activeTab === tab.key
                    ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50/50"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: 今日信号 ─────────────────────────────── */}
          {activeTab === "signals" && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "今日新询盘", value: signals.newInquiries, accent: "#3b82f6", sub: "条" },
                  { label: "未回复询盘", value: signals.unread, accent: signals.unread > 0 ? "#ef4444" : "#10b981", sub: "条" },
                  { label: "待审批草稿", value: signals.pendingApprovals, accent: signals.pendingApprovals > 0 ? "#f59e0b" : "#10b981", sub: "条" },
                  { label: "今日新报价", value: signals.newQuotations, accent: "#8b5cf6", sub: "条" },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: item.accent }}>
                      {item.value}
                      <span className="text-sm font-normal text-gray-400 ml-0.5">{item.sub}</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* 最新待处理询盘 */}
              {(signals.latestInquiries ?? []).length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold mb-2">最新待处理询盘</p>
                  <div className="space-y-2">
                    {(signals.latestInquiries as Inquiry[]).map((inq) => (
                      <div key={inq.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">
                            {inq.buyerName ?? (inq as any).buyer_name ?? "未知"}{" "}
                            <span className="font-normal text-gray-400">
                              · {inq.buyerCompany ?? (inq as any).buyer_company ?? ""}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {inq.productName ?? (inq as any).product_name}{" "}
                            · {inq.buyerCountry ?? (inq as any).buyer_country}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-blue-500">
                            {inq.confidenceScore ?? (inq as any).confidence_score}分
                          </div>
                          {((inq.estimatedValue ?? (inq as any).estimated_value) ?? 0) > 0 && (
                            <div className="text-xs text-gray-400">
                              ${(((inq.estimatedValue ?? (inq as any).estimated_value) ?? 0) / 1000).toFixed(0)}K
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {signals.newInquiries === 0 && signals.unread === 0 && (
                <div className="text-center py-8 text-gray-300">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm font-medium">今日无待处理事项</p>
                  <p className="text-xs mt-1">数字员工正在为您持续获客</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: 数字员工 ─────────────────────────────── */}
          {activeTab === "agent" && (
            <div className="p-4 space-y-4">
              {agent.instance ? (
                <>
                  {/* 实例状态卡 */}
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {instanceStatus === "online"
                          ? <PulsingDot className="bg-green-400" />
                          : <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.dot}`} />
                        }
                        <span className="text-sm font-bold text-gray-800">{agent.instance.name}</span>
                      </div>
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: `${statusInfo.color}18`, color: statusInfo.color }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* 进度条 */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                        <span>今日操作量</span>
                        <span className="font-medium text-gray-600">
                          {agent.instance.opsToday} / {agent.instance.opsLimit}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(agent.instance.utilizationRate, 100)}%`,
                            background:
                              agent.instance.utilizationRate > 80 ? "#ef4444" :
                              agent.instance.utilizationRate > 60 ? "#f59e0b" : "#10b981",
                          }}
                        />
                      </div>
                      <div className="text-right text-xs text-gray-400 mt-1">
                        已使用 {agent.instance.utilizationRate}%
                      </div>
                    </div>

                    {/* 任务统计 */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "今日任务", value: agent.todayTasks, color: "text-gray-800" },
                        { label: "已完成", value: agent.completedTasks, color: "text-green-500" },
                        { label: "待执行", value: agent.pendingCommands, color: "text-amber-500" },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-lg py-2 border border-gray-100">
                          <div className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* 异常提示 */}
                    {agent.instance.consecutiveFailures > 0 && (
                      <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        <p className="text-xs text-amber-600 font-medium">
                          ⚠️ 连续失败 {agent.instance.consecutiveFailures} 次
                          {agent.instance.sleepUntil && (
                            <span className="font-normal">
                              {" · "}休眠至{" "}
                              {new Date(agent.instance.sleepUntil).toLocaleTimeString("zh-CN", {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {agent.instance.lastHeartbeat && (
                      <p className="text-xs text-gray-300 mt-2 text-right">
                        最后心跳{" "}
                        {new Date(agent.instance.lastHeartbeat).toLocaleTimeString("zh-CN", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  {/* 账号健康状态 */}
                  {agent.accounts.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 font-semibold mb-2">账号健康状态</p>
                      <div className="space-y-2.5">
                        {agent.accounts.map((acc, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-base w-6 text-center">
                              {PLATFORM_ICON[acc.platform] ?? "🌐"}
                            </span>
                            <span className="text-xs text-gray-600 flex-1 capitalize font-medium">
                              {acc.platform}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${acc.usageRate}%`,
                                    background: HEALTH_COLOR[acc.healthStatus] ?? "#10b981",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
                                {acc.usageRate}%
                              </span>
                            </div>
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: HEALTH_COLOR[acc.healthStatus] ?? "#10b981" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-gray-300">
                  <div className="text-4xl mb-2">🔌</div>
                  <p className="text-sm font-medium">OpenClaw 未连接</p>
                  <p className="text-xs mt-1">请检查云电脑上的 OpenClaw 是否已启动</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: 经营周报 ─────────────────────────────── */}
          {activeTab === "report" && (
            <div className="p-4 space-y-4">
              {/* 成单金额高亮 */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white">
                <p className="text-xs opacity-80 mb-1 font-medium">本周成单金额</p>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-bold tabular-nums">
                    ${weekReport.thisWeek.contractedValue.toLocaleString()}
                  </span>
                  <div className="mb-0.5">
                    <GrowthBadge value={weekReport.growth.contractedValue} />
                  </div>
                </div>
                <p className="text-xs opacity-60 mt-1">
                  上周 ${weekReport.lastWeek.contractedValue.toLocaleString()}
                </p>
              </div>

              {/* 四项核心指标对比 */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "询盘总量",
                    thisWeek: weekReport.thisWeek.inquiries,
                    lastWeek: weekReport.lastWeek.inquiries,
                    growth: weekReport.growth.inquiries,
                    unit: "条",
                    accent: "#3b82f6",
                  },
                  {
                    label: "回复率",
                    thisWeek: weekReport.thisWeek.replyRate,
                    lastWeek: weekReport.lastWeek.replyRate,
                    growth: weekReport.growth.replied,
                    unit: "%",
                    accent: "#10b981",
                  },
                  {
                    label: "成单数",
                    thisWeek: weekReport.thisWeek.contracted,
                    lastWeek: weekReport.lastWeek.contracted,
                    growth: weekReport.growth.contracted,
                    unit: "单",
                    accent: "#8b5cf6",
                  },
                  {
                    label: "高价值线索",
                    thisWeek: weekReport.thisWeek.highValue,
                    lastWeek: weekReport.lastWeek.highValue,
                    growth: weekReport.growth.highValue,
                    unit: "条",
                    accent: "#f59e0b",
                  },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1.5">{item.label}</p>
                    <div className="flex items-end gap-1.5">
                      <span className="text-xl font-bold tabular-nums" style={{ color: item.accent }}>
                        {item.thisWeek}
                        <span className="text-sm font-normal text-gray-400 ml-0.5">{item.unit}</span>
                      </span>
                      <div className="mb-0.5">
                        <GrowthBadge value={item.growth} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">上周 {item.lastWeek}{item.unit}</p>
                  </div>
                ))}
              </div>

              {/* 简化对比条形图 */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-400 font-semibold mb-3">本周 vs 上周</p>
                {[
                  { label: "询盘", this: weekReport.thisWeek.inquiries, last: weekReport.lastWeek.inquiries },
                  { label: "回复", this: weekReport.thisWeek.replied, last: weekReport.lastWeek.replied },
                  { label: "成单", this: weekReport.thisWeek.contracted, last: weekReport.lastWeek.contracted },
                ].map(row => {
                  const max = Math.max(row.this, row.last, 1);
                  return (
                    <div key={row.label} className="flex items-center gap-2 mb-2.5 last:mb-0">
                      <span className="text-xs text-gray-400 w-8 flex-shrink-0">{row.label}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 bg-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${(row.this / max) * 100}%`, minWidth: row.this > 0 ? "6px" : "0" }}
                          />
                          <span className="text-xs text-blue-500 font-semibold tabular-nums">{row.this}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 bg-gray-200 rounded-full transition-all duration-500"
                            style={{ width: `${(row.last / max) * 100}%`, minWidth: row.last > 0 ? "6px" : "0" }}
                          />
                          <span className="text-xs text-gray-400 tabular-nums">{row.last}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4 mt-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 bg-blue-400 rounded-full" />
                    <span className="text-xs text-gray-400">本周</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 bg-gray-200 rounded-full" />
                    <span className="text-xs text-gray-400">上周</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 底部快捷导航 ─────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "询盘管理", icon: "📋", path: "/inquiries" },
            { label: "管理后台", icon: "⚙️", path: "/dashboard" },
            { label: "ROI 分析", icon: "💰", path: "/roi" },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="bg-white rounded-xl py-3 text-center shadow-sm border border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition"
            >
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-xs text-gray-500 font-medium">{item.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 拒绝弹窗 ─────────────────────────────────────── */}
      {rejectModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-50 backdrop-blur-sm"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-gray-800 mb-1">拒绝回复草稿</h3>
            <p className="text-xs text-gray-400 mb-4">
              拒绝发送给「{rejectModal.buyerName}」的回复草稿
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="拒绝原因（可选，将记录在案）..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 resize-none mb-4 bg-gray-50"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold py-3 rounded-xl transition"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={approvalLoading === rejectModal.id}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white text-sm font-semibold py-3 rounded-xl transition shadow-sm"
              >
                {approvalLoading === rejectModal.id ? "处理中..." : "确认拒绝"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
