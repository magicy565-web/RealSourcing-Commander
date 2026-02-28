/**
 * Commander 5.0 Phase 3 — M6 OpenClaw 安全增强前端组件
 * 提供：暂停/恢复、每日操作上限、工作时间段设置、安全日志
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "/api/v1";

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("commander_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "请求失败");
  }
  return res.json();
}

interface OpenClawStatus {
  instance: {
    id: string;
    name: string;
    status: "online" | "paused" | "offline";
    opsToday: number;
    opsLimit: number;
    opsPercent: number;
    workHours?: WorkHours;
  } | null;
  accounts: Array<{
    id: string;
    platform: string;
    accountName: string;
    healthStatus: "healthy" | "warning" | "suspended" | "banned";
    dailyOpsUsed: number;
    dailyOpsLimit: number;
  }>;
  todayStats: {
    totalOps: number;
    creditsUsed: number;
    successCount: number;
    failCount: number;
  };
}

interface WorkHours {
  startHour: number;
  endHour: number;
  timezone: string;
  weekdays: number[];
}

const PLATFORM_ICON: Record<string, string> = {
  linkedin: "💼",
  facebook: "📘",
  tiktok: "🎵",
  whatsapp: "💬",
  alibaba: "🛒",
  instagram: "📸",
};

const HEALTH_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  healthy: { label: "正常", color: "text-green-600", bg: "bg-green-50" },
  warning: { label: "警告", color: "text-yellow-600", bg: "bg-yellow-50" },
  suspended: { label: "暂停", color: "text-orange-600", bg: "bg-orange-50" },
  banned: { label: "封禁", color: "text-red-600", bg: "bg-red-50" },
};

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export default function OpenClawSecurityPanel({ instanceId: _instanceId }: { instanceId?: string } = {}) {
  const [status, setStatus] = useState<OpenClawStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showWorkHours, setShowWorkHours] = useState(false);
  const [showOpsLimit, setShowOpsLimit] = useState(false);
  const [newOpsLimit, setNewOpsLimit] = useState(100);
  const [workHoursForm, setWorkHoursForm] = useState<WorkHours>({
    startHour: 8,
    endHour: 22,
    timezone: "Asia/Shanghai",
    weekdays: [1, 2, 3, 4, 5],
  });

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/openclaw/status");
      setStatus(data);
      if (data.instance?.workHours) {
        setWorkHoursForm(data.instance.workHours);
      }
      if (data.instance?.opsLimit) {
        setNewOpsLimit(data.instance.opsLimit);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handlePauseResume = async () => {
    if (!status?.instance) return;
    const action = status.instance.status === "paused" ? "resume" : "pause";
    setActionLoading(action);
    try {
      await apiFetch(`/openclaw/${action}`, { method: "POST" });
      showToast(action === "pause" ? "OpenClaw 已暂停" : "OpenClaw 已恢复");
      loadStatus();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateOpsLimit = async () => {
    setActionLoading("ops-limit");
    try {
      await apiFetch("/openclaw/ops-limit", {
        method: "PUT",
        body: JSON.stringify({ opsLimit: newOpsLimit }),
      });
      showToast(`每日上限已更新为 ${newOpsLimit}`);
      setShowOpsLimit(false);
      loadStatus();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateWorkHours = async () => {
    setActionLoading("work-hours");
    try {
      await apiFetch("/openclaw/work-hours", {
        method: "PUT",
        body: JSON.stringify(workHoursForm),
      });
      showToast("工作时间段已更新");
      setShowWorkHours(false);
      loadStatus();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccountHealth = async (accountId: string, healthStatus: string) => {
    setActionLoading(`health-${accountId}`);
    try {
      await apiFetch(`/openclaw/account/${accountId}/health`, {
        method: "PUT",
        body: JSON.stringify({ healthStatus }),
      });
      showToast(`账号状态已更新为 ${HEALTH_STYLE[healthStatus]?.label ?? healthStatus}`);
      loadStatus();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!status?.instance) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-3xl mb-2">🤖</p>
        <p className="text-sm">未找到 OpenClaw 实例</p>
      </div>
    );
  }

  const { instance, accounts, todayStats } = status;
  const isPaused = instance.status === "paused";

  return (
    <div className="space-y-4">
      {/* 实例状态卡片 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-yellow-400" : instance.status === "online" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <span className="text-sm font-semibold text-gray-800">{instance.name}</span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPaused ? "bg-yellow-50 text-yellow-600" : "bg-green-50 text-green-600"}`}>
            {isPaused ? "已暂停" : "运行中"}
          </span>
        </div>

        {/* 操作进度 */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>今日操作</span>
            <span className="font-semibold text-gray-700">{instance.opsToday} / {instance.opsLimit}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${instance.opsPercent >= 90 ? "bg-red-500" : instance.opsPercent >= 70 ? "bg-yellow-500" : "bg-indigo-500"}`}
              style={{ width: `${Math.min(instance.opsPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* 今日统计 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "总操作", value: todayStats.totalOps, color: "text-indigo-600" },
            { label: "成功", value: todayStats.successCount, color: "text-green-600" },
            { label: "失败", value: todayStats.failCount, color: "text-red-500" },
            { label: "积分", value: todayStats.creditsUsed, color: "text-amber-600" },
          ].map((item) => (
            <div key={item.label} className="text-center bg-gray-50 rounded-lg p-2">
              <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-400">{item.label}</p>
            </div>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handlePauseResume}
            disabled={!!actionLoading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
              ${isPaused
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-yellow-500 text-white hover:bg-yellow-600"
              } disabled:opacity-50`}
          >
            {actionLoading === "pause" || actionLoading === "resume" ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{isPaused ? "▶" : "⏸"}</span>
            )}
            {isPaused ? "恢复运行" : "暂停实例"}
          </button>
          <button
            onClick={() => setShowOpsLimit(true)}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200"
          >
            上限
          </button>
          <button
            onClick={() => setShowWorkHours(true)}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200"
          >
            时段
          </button>
        </div>
      </div>

      {/* 工作时间段当前设置 */}
      {instance.workHours && (
        <div className="bg-indigo-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">🕐</span>
            <span className="text-xs font-semibold text-indigo-700">工作时间段</span>
          </div>
          <p className="text-xs text-indigo-600">
            {instance.workHours.startHour}:00 - {instance.workHours.endHour}:00 ({instance.workHours.timezone})
          </p>
          <p className="text-xs text-indigo-500 mt-0.5">
            工作日: {instance.workHours.weekdays.map(d => WEEKDAY_LABELS[d]).join("、")}
          </p>
        </div>
      )}

      {/* 账号列表 */}
      {accounts.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">账号健康状态</h3>
          <div className="space-y-2">
            {accounts.map((acc) => {
              const health = HEALTH_STYLE[acc.healthStatus] ?? HEALTH_STYLE.healthy;
              return (
                <div key={acc.id} className="flex items-center gap-2">
                  <span className="text-base">{PLATFORM_ICON[acc.platform] ?? "🌐"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{acc.accountName}</p>
                    <p className="text-xs text-gray-400">{acc.dailyOpsUsed}/{acc.dailyOpsLimit} 操作</p>
                  </div>
                  <select
                    value={acc.healthStatus}
                    onChange={(e) => handleAccountHealth(acc.id, e.target.value)}
                    disabled={actionLoading === `health-${acc.id}`}
                    className={`text-xs font-medium px-2 py-1 rounded-lg border-0 ${health.bg} ${health.color} disabled:opacity-50`}
                  >
                    <option value="healthy">正常</option>
                    <option value="warning">警告</option>
                    <option value="suspended">暂停</option>
                    <option value="banned">封禁</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 每日上限弹窗 */}
      <AnimatePresence>
        {showOpsLimit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/50"
            onClick={() => setShowOpsLimit(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full bg-white rounded-t-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-gray-900 mb-4">设置每日操作上限</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">上限次数</span>
                  <span className="text-lg font-bold text-indigo-600">{newOpsLimit}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={newOpsLimit}
                  onChange={(e) => setNewOpsLimit(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10</span>
                  <span>250</span>
                  <span>500</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateOpsLimit}
                  disabled={actionLoading === "ops-limit"}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {actionLoading === "ops-limit" ? "保存中..." : "确认保存"}
                </button>
                <button
                  onClick={() => setShowOpsLimit(false)}
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 工作时间段弹窗 */}
      <AnimatePresence>
        {showWorkHours && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/50"
            onClick={() => setShowWorkHours(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full bg-white rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-gray-900 mb-4">工作时间段设置</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">开始时间</label>
                    <select
                      value={workHoursForm.startHour}
                      onChange={(e) => setWorkHoursForm({ ...workHoursForm, startHour: parseInt(e.target.value) })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">结束时间</label>
                    <select
                      value={workHoursForm.endHour}
                      onChange={(e) => setWorkHoursForm({ ...workHoursForm, endHour: parseInt(e.target.value) })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">工作日</label>
                  <div className="flex gap-2">
                    {WEEKDAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const days = workHoursForm.weekdays.includes(idx)
                            ? workHoursForm.weekdays.filter((d) => d !== idx)
                            : [...workHoursForm.weekdays, idx].sort();
                          setWorkHoursForm({ ...workHoursForm, weekdays: days });
                        }}
                        className={`w-9 h-9 rounded-full text-xs font-semibold transition-colors
                          ${workHoursForm.weekdays.includes(idx)
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-500"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">时区</label>
                  <select
                    value={workHoursForm.timezone}
                    onChange={(e) => setWorkHoursForm({ ...workHoursForm, timezone: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={handleUpdateWorkHours}
                  disabled={actionLoading === "work-hours"}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {actionLoading === "work-hours" ? "保存中..." : "确认保存"}
                </button>
                <button
                  onClick={() => setShowWorkHours(false)}
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-white text-sm font-medium shadow-lg z-50
              ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
