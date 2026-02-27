/**
 * Commander 5.0 — OpenClaw 任务队列页面
 * 人工触发任务 → 任务入队 → AI 规划步骤 → 模拟执行 → 实时状态回显
 */
import { useState, useEffect, useCallback } from "react";
import { tasksApi, Task, TaskStats } from "../lib/api";

interface TaskQueueProps {
  onBack: () => void;
}

const PLATFORM_ICONS: Record<string, string> = {
  linkedin: "💼",
  whatsapp: "📱",
  tiktok: "🎵",
  facebook: "📘",
  geo: "🌍",
  alibaba: "🛒",
  email: "📧",
  custom: "⚡",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: "待执行", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-400" },
  running: { label: "执行中", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
  completed: { label: "已完成", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  failed: { label: "失败", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
  cancelled: { label: "已取消", color: "text-gray-500", bg: "bg-gray-50", dot: "bg-gray-400" },
};

const TASK_TYPES = [
  { key: "linkedin_connect", label: "LinkedIn 发起连接", platform: "linkedin", credits: 3, desc: "向目标买家发送连接请求" },
  { key: "linkedin_message", label: "LinkedIn 发消息", platform: "linkedin", credits: 5, desc: "向已连接的买家发送开发信" },
  { key: "whatsapp_followup", label: "WhatsApp 跟进", platform: "whatsapp", credits: 4, desc: "通过 WhatsApp 跟进潜在客户" },
  { key: "tiktok_reply", label: "TikTok 评论回复", platform: "tiktok", credits: 2, desc: "回复产品视频下的买家评论" },
  { key: "alibaba_rfq_reply", label: "阿里 RFQ 回复", platform: "alibaba", credits: 5, desc: "批量回复阿里巴巴 RFQ 询盘" },
  { key: "geo_publish", label: "GEO 内容发布", platform: "geo", credits: 10, desc: "发布产品内容到 GEO 平台" },
];

export default function TaskQueue({ onBack }: TaskQueueProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedType, setSelectedType] = useState(TASK_TYPES[0].key);
  const [targetInfo, setTargetInfo] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadTasks = useCallback(async () => {
    try {
      const res = await tasksApi.list();
      setTasks(res.items);
      setStats(res.stats);
    } catch (err: any) {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    // 有运行中任务时，每 2 秒轮询一次
    const interval = setInterval(() => {
      loadTasks();
    }, 2500);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const handleCreate = async () => {
    if (!targetInfo.trim()) {
      showToast("请填写目标信息", "error");
      return;
    }
    setCreating(true);
    try {
      const taskConfig = TASK_TYPES.find((t) => t.key === selectedType)!;
      const res = await tasksApi.create({
        taskType: selectedType,
        platform: taskConfig.platform,
        targetInfo: targetInfo.trim(),
      });
      showToast(`✅ 任务已创建，AI 正在规划执行步骤...`);
      setShowCreate(false);
      setTargetInfo("");
      setCreating(false);
      // 非阻塞加载任务列表，不等待完成
      loadTasks().catch(() => {});
    } catch (err: any) {
      showToast(err.message ?? "创建失败", "error");
      setCreating(false);
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      await tasksApi.cancel(taskId);
      showToast("任务已取消");
      await loadTasks();
    } catch (err: any) {
      showToast(err.message ?? "取消失败", "error");
    }
  };

  const selectedTaskConfig = TASK_TYPES.find((t) => t.key === selectedType)!;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">OpenClaw 任务队列</h1>
          <p className="text-xs text-gray-500">人工触发 → AI 规划 → 自动执行</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          新任务
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-medium text-center ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="mx-4 mt-3 grid grid-cols-4 gap-2">
          {[
            { label: "待执行", value: stats.pending, color: "text-amber-600" },
            { label: "执行中", value: stats.running, color: "text-blue-600" },
            { label: "已完成", value: stats.completed, color: "text-emerald-600" },
            { label: "失败", value: stats.failed, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-2.5 text-center shadow-sm">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto mt-3 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="mx-4 bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-sm font-semibold text-gray-800 mb-1">暂无任务</p>
            <p className="text-xs text-gray-500 mb-4">点击右上角"新任务"，让 OpenClaw 帮你自动执行</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl"
            >
              创建第一个任务
            </button>
          </div>
        ) : (
          <div className="mx-4 space-y-2">
            {tasks.map((task) => {
              const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
              const isExpanded = expandedTask === task.id;
              const isRunning = task.status === "running";

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                  <div
                    className="p-3.5 cursor-pointer"
                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        {PLATFORM_ICONS[task.platform] ?? "⚡"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {TASK_TYPES.find((t) => t.key === task.task_type)?.label ?? task.task_type}
                          </p>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${isRunning ? "animate-pulse" : ""}`}></span>
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{task.target_info}</p>
                        {isRunning && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>步骤 {task.current_step}/{task.total_steps}</span>
                              <span>{task.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        {task.status === "completed" && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <span className="text-xs text-emerald-600">✓ 消耗 {task.actual_credits} 积分</span>
                          </div>
                        )}
                        {task.status === "failed" && task.error_msg && (
                          <p className="text-xs text-red-500 mt-1 truncate">{task.error_msg}</p>
                        )}
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* 展开：步骤详情 */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 px-3.5 pb-3.5 pt-2.5">
                      <p className="text-xs font-semibold text-gray-500 mb-2">执行步骤</p>
                      <div className="space-y-1.5">
                        {task.steps.map((step, idx) => {
                          const isDone = idx < task.current_step;
                          const isCurrent = idx === task.current_step && isRunning;
                          return (
                            <div key={idx} className="flex items-start gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isDone ? "bg-emerald-500" : isCurrent ? "bg-blue-500" : "bg-gray-200"
                              }`}>
                                {isDone ? (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : isCurrent ? (
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                ) : (
                                  <span className="text-xs text-gray-400">{idx + 1}</span>
                                )}
                              </div>
                              <p className={`text-xs ${isDone ? "text-gray-400 line-through" : isCurrent ? "text-blue-700 font-medium" : "text-gray-600"}`}>
                                {step}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex gap-2 mt-3">
                        {["pending", "running"].includes(task.status) && (
                          <button
                            onClick={() => handleCancel(task.id)}
                            className="flex-1 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-xl"
                          >
                            取消任务
                          </button>
                        )}
                        <p className="flex-1 text-xs text-gray-400 flex items-center justify-end">
                          预估 {task.estimated_credits} 积分
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">创建新任务</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 任务类型选择 */}
            <p className="text-xs font-semibold text-gray-500 mb-2">选择任务类型</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {TASK_TYPES.map((type) => (
                <button
                  key={type.key}
                  onClick={() => setSelectedType(type.key)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    selectedType === type.key
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{PLATFORM_ICONS[type.platform]}</span>
                    <span className={`text-xs font-semibold ${selectedType === type.key ? "text-white" : "text-gray-800"}`}>
                      {type.label}
                    </span>
                  </div>
                  <p className={`text-xs ${selectedType === type.key ? "text-blue-100" : "text-gray-500"}`}>
                    {type.desc}
                  </p>
                  <p className={`text-xs mt-1 font-medium ${selectedType === type.key ? "text-blue-200" : "text-amber-600"}`}>
                    ~{type.credits} 积分
                  </p>
                </button>
              ))}
            </div>

            {/* 目标信息 */}
            <p className="text-xs font-semibold text-gray-500 mb-2">目标信息</p>
            <textarea
              value={targetInfo}
              onChange={(e) => setTargetInfo(e.target.value)}
              placeholder={
                selectedType.includes("linkedin") ? "输入买家的 LinkedIn 主页链接或姓名公司..." :
                selectedType.includes("whatsapp") ? "输入买家的 WhatsApp 号码（含国家代码）..." :
                selectedType.includes("alibaba") ? "输入 RFQ 编号或买家公司名称..." :
                "输入目标信息..."
              }
              className="w-full h-20 text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* AI 提示 */}
            <div className="mt-3 p-3 bg-purple-50 rounded-xl">
              <p className="text-xs text-purple-700">
                <span className="font-semibold">🤖 AI 会自动规划：</span>
                提交后，AI 将根据任务类型和目标信息，自动规划具体执行步骤，并模拟 OpenClaw 逐步执行。
              </p>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !targetInfo.trim()}
              className="w-full mt-4 py-3.5 bg-blue-600 text-white text-sm font-bold rounded-2xl disabled:opacity-50 transition-all"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  AI 正在规划任务...
                </span>
              ) : (
                `🚀 创建任务（预估 ${selectedTaskConfig.credits} 积分）`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
