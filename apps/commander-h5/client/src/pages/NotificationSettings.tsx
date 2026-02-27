/* ============================================================
   DESIGN: Night Commander — Notification Settings
   Layout: 分组设置面板，时间选择器 + 开关 + 渠道配置
   Philosophy: 让老板轻松定制"什么时候、什么事、用什么方式"收到通知
   ============================================================ */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Bell, BellRing, Clock, MessageSquare,
  Globe, CheckCircle2, Coins, Settings, Zap,
  Smartphone, Shield, ChevronRight, Save,
  TrendingUp, Target, AlertCircle, RefreshCw,
  Wifi, Moon, Sun, Volume2, VolumeX
} from "lucide-react";
import { toast } from "sonner";

// ─── 类型定义 ─────────────────────────────────────────────────

interface NotifTypeConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
  enabled: boolean;
  channel: "wechat" | "app" | "both";
  urgentOnly: boolean;
}

interface PushSchedule {
  enabled: boolean;
  hour: number;
  minute: number;
  label: string;
}

// ─── 预设时间选项 ─────────────────────────────────────────────

const timePresets = [
  { label: "早上 7:00", hour: 7, minute: 0 },
  { label: "早上 8:00", hour: 8, minute: 0 },
  { label: "早上 9:00", hour: 9, minute: 0 },
  { label: "中午 12:00", hour: 12, minute: 0 },
  { label: "下午 6:00", hour: 18, minute: 0 },
  { label: "晚上 9:00", hour: 21, minute: 0 },
];

// ─── Toggle 开关组件 ──────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${checked ? 'bg-orange-500' : 'bg-white/15'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${checked ? 'left-5.5' : 'left-0.5'}`}
        style={{ left: checked ? "calc(100% - 22px)" : "2px" }} />
    </button>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────

interface NotificationSettingsProps {
  initialHour?: number;
  initialMinute?: number;
  onSave?: (hour: number, minute: number) => void;
  onBack?: () => void;
}

export default function NotificationSettings({
  initialHour = 8,
  initialMinute = 0,
  onSave,
  onBack,
}: NotificationSettingsProps) {
  const [, navigate] = useLocation();

  // ── 推送时间设置 ──
  const [schedules, setSchedules] = useState<PushSchedule[]>([
    { enabled: true, hour: initialHour, minute: initialMinute, label: "每日战报" },
    { enabled: false, hour: 20, minute: 0, label: "晚间汇总" },
  ]);
  const [customHour, setCustomHour] = useState(initialHour);
  const [customMinute, setCustomMinute] = useState(initialMinute);
  const [showCustomTime, setShowCustomTime] = useState(false);

  // ── 通知类型配置 ──
  const [notifTypes, setNotifTypes] = useState<NotifTypeConfig[]>([
    {
      id: "new_lead", icon: <MessageSquare className="w-4 h-4" />, label: "新询盘通知",
      desc: "OpenClaw 发现新询盘时立即推送", color: "text-orange-400",
      enabled: true, channel: "both", urgentOnly: false,
    },
    {
      id: "daily_report", icon: <TrendingUp className="w-4 h-4" />, label: "每日战报",
      desc: "每天定时推送昨日/今日运营数据", color: "text-blue-400",
      enabled: true, channel: "both", urgentOnly: false,
    },
    {
      id: "task_done", icon: <CheckCircle2 className="w-4 h-4" />, label: "任务完成通知",
      desc: "AI Agent 完成任务时推送结果摘要", color: "text-teal-400",
      enabled: true, channel: "app", urgentOnly: false,
    },
    {
      id: "geo_alert", icon: <Globe className="w-4 h-4" />, label: "GEO 可见度变化",
      desc: "AI 搜索引擎可见度显著变化时提醒", color: "text-purple-400",
      enabled: true, channel: "app", urgentOnly: false,
    },
    {
      id: "credit_low", icon: <Coins className="w-4 h-4" />, label: "积分余额提醒",
      desc: "积分低于 500 分时发送充值提醒", color: "text-yellow-400",
      enabled: true, channel: "wechat", urgentOnly: true,
    },
    {
      id: "system", icon: <Settings className="w-4 h-4" />, label: "系统通知",
      desc: "OpenClaw 维护、版本更新等系统消息", color: "text-slate-400",
      enabled: false, channel: "app", urgentOnly: false,
    },
  ]);

  // ── 全局开关 ──
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [wechatEnabled, setWechatEnabled] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [dndStart, setDndStart] = useState(22);
  const [dndEnd, setDndEnd] = useState(7);
  const [sound, setSound] = useState(true);

  const updateSchedule = (index: number, patch: Partial<PushSchedule>) => {
    setSchedules(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  };

  const updateNotifType = (id: string, patch: Partial<NotifTypeConfig>) => {
    setNotifTypes(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const applyPreset = (scheduleIndex: number, hour: number, minute: number) => {
    updateSchedule(scheduleIndex, { hour, minute });
    setShowCustomTime(false);
  };

  const handleSave = () => {
    const mainSchedule = schedules[0];
    if (onSave) {
      onSave(mainSchedule.hour, mainSchedule.minute);
    }
    toast.success("通知设置已保存", {
      description: `每日战报将于北京时间 ${String(mainSchedule.hour).padStart(2, "0")}:${String(mainSchedule.minute).padStart(2, "0")} 推送`,
    });
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(0.14 0.02 250)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-white/8">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
          )}
          <h1 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            通知设置
          </h1>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all">
          <Save className="w-3.5 h-3.5" />保存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5" style={{ scrollbarWidth: "none" }}>

        {/* ── 全局开关 ── */}
        <section className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">开启通知推送</p>
                <p className="text-xs text-slate-500">关闭后将停止所有推送</p>
              </div>
            </div>
            <Toggle checked={globalEnabled} onChange={setGlobalEnabled} />
          </div>

          {globalEnabled && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">微信服务号推送</p>
                    <p className="text-xs text-slate-500">重要询盘通过微信实时通知</p>
                  </div>
                </div>
                <Toggle checked={wechatEnabled} onChange={setWechatEnabled} />
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    {sound ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">通知声音</p>
                    <p className="text-xs text-slate-500">收到通知时播放提示音</p>
                  </div>
                </div>
                <Toggle checked={sound} onChange={setSound} />
              </div>
            </>
          )}
        </section>

        {/* ── 推送时间设置 ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">推送时间</h2>
          <div className="rounded-2xl overflow-hidden space-y-px" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            {schedules.map((schedule, i) => (
              <div key={i} className={i > 0 ? "border-t border-white/5" : ""}>
                <div className="flex items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{schedule.label}</p>
                      <p className="text-xs text-slate-500">
                        北京时间 {String(schedule.hour).padStart(2, "0")}:{String(schedule.minute).padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                  <Toggle checked={schedule.enabled} onChange={v => updateSchedule(i, { enabled: v })} />
                </div>

                {schedule.enabled && (
                  <div className="px-4 pb-4">
                    {/* Time Presets */}
                    <p className="text-xs text-slate-500 mb-2">快速选择</p>
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {timePresets.map(preset => (
                        <button key={preset.label}
                          onClick={() => applyPreset(i, preset.hour, preset.minute)}
                          className={`py-2 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                            schedule.hour === preset.hour && schedule.minute === preset.minute
                              ? "bg-orange-500/25 text-orange-400 border border-orange-500/40"
                              : "bg-white/5 text-slate-400 hover:text-white border border-transparent"
                          }`}>
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Time */}
                    <button onClick={() => setShowCustomTime(!showCustomTime)}
                      className="text-xs text-orange-400 flex items-center gap-1 mb-2">
                      <Clock className="w-3 h-3" />自定义时间
                      <ChevronRight className={`w-3 h-3 transition-transform ${showCustomTime ? 'rotate-90' : ''}`} />
                    </button>

                    {showCustomTime && (
                      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "oklch(0.16 0.02 250)" }}>
                        <div className="flex-1">
                          <label className="text-xs text-slate-500 mb-1 block">小时 (0-23)</label>
                          <input
                            type="number" min={0} max={23} value={customHour}
                            onChange={e => setCustomHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                            className="w-full px-3 py-2 rounded-lg text-sm text-white text-center font-mono outline-none"
                            style={{ background: "oklch(0.22 0.02 250)", border: "1px solid oklch(1 0 0 / 12%)" }} />
                        </div>
                        <span className="text-xl text-slate-400 font-bold mt-4">:</span>
                        <div className="flex-1">
                          <label className="text-xs text-slate-500 mb-1 block">分钟 (0/15/30/45)</label>
                          <select
                            value={customMinute}
                            onChange={e => setCustomMinute(parseInt(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg text-sm text-white text-center font-mono outline-none"
                            style={{ background: "oklch(0.22 0.02 250)", border: "1px solid oklch(1 0 0 / 12%)" }}>
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => applyPreset(i, customHour, customMinute)}
                          className="mt-4 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-orange-500 active:scale-95 transition-transform">
                          应用
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-teal-400" />
                      时间基于北京时间 (UTC+8)，服务器自动转换
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── 勿扰模式 ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">勿扰模式</h2>
          <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${doNotDisturb ? 'bg-purple-500/20' : 'bg-white/5'}`}>
                  <Moon className={`w-4 h-4 ${doNotDisturb ? 'text-purple-400' : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">夜间勿扰</p>
                  <p className="text-xs text-slate-500">
                    {doNotDisturb
                      ? `${String(dndStart).padStart(2, "0")}:00 — ${String(dndEnd).padStart(2, "0")}:00 静默推送`
                      : "关闭中，所有时段正常推送"}
                  </p>
                </div>
              </div>
              <Toggle checked={doNotDisturb} onChange={setDoNotDisturb} />
            </div>

            {doNotDisturb && (
              <div className="px-4 pb-4 border-t border-white/5">
                <p className="text-xs text-slate-500 mb-3 mt-3">勿扰时段（北京时间）</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                      <Moon className="w-3 h-3" />开始
                    </label>
                    <select value={dndStart} onChange={e => setDndStart(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none font-mono"
                      style={{ background: "oklch(0.22 0.02 250)", border: "1px solid oklch(1 0 0 / 12%)" }}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-slate-400 mt-4">至</span>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                      <Sun className="w-3 h-3" />结束
                    </label>
                    <select value={dndEnd} onChange={e => setDndEnd(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none font-mono"
                      style={{ background: "oklch(0.22 0.02 250)", border: "1px solid oklch(1 0 0 / 12%)" }}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-orange-300 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  紧急询盘（金额 &gt;$50K）将忽略勿扰模式
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── 通知类型配置 ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">通知类型</h2>
          <div className="rounded-2xl overflow-hidden space-y-px" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            {notifTypes.map((type, i) => (
              <div key={type.id} className={i > 0 ? "border-t border-white/5" : ""}>
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${type.enabled ? 'bg-white/8' : 'bg-white/3'} ${type.enabled ? type.color : 'text-slate-600'}`}>
                      {type.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${type.enabled ? 'text-white' : 'text-slate-500'}`}>{type.label}</p>
                      <p className="text-xs text-slate-500 truncate">{type.desc}</p>
                    </div>
                  </div>
                  <Toggle checked={type.enabled} onChange={v => updateNotifType(type.id, { enabled: v })} />
                </div>

                {type.enabled && (
                  <div className="px-4 pb-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">推送渠道：</span>
                    {(["wechat", "app", "both"] as const).map(ch => (
                      <button key={ch}
                        onClick={() => updateNotifType(type.id, { channel: ch })}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                          type.channel === ch
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-white/5 text-slate-500 hover:text-slate-300"
                        }`}>
                        {ch === "wechat" ? "📱 微信" : ch === "app" ? "🔔 App" : "📱+🔔 双渠道"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── 微信绑定状态 ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">微信绑定</h2>
          <div className="rounded-2xl p-4" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-teal-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">微信服务号</p>
                <p className="text-xs text-slate-500">RealSourcing 指挥官</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-teal-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />已绑定
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/5 rounded-lg px-3 py-2">
              <Shield className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>已绑定微信：王总 (wx_id: wangzong_****)</span>
            </div>
            <button onClick={() => toast.info("微信重新绑定功能即将上线")}
              className="mt-3 w-full py-2 rounded-lg text-xs text-slate-400 border border-white/10 hover:text-white hover:border-white/20 transition-colors">
              重新绑定微信账号
            </button>
          </div>
        </section>

        {/* ── 测试推送 ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">测试</h2>
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <p className="text-xs text-slate-400 mb-3">发送测试通知，验证推送渠道是否正常</p>
            {[
              { label: "发送测试日报", icon: <TrendingUp className="w-3.5 h-3.5" />, color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
              { label: "模拟新询盘通知", icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
              { label: "测试微信推送", icon: <Smartphone className="w-3.5 h-3.5" />, color: "text-teal-400 border-teal-500/30 bg-teal-500/10" },
            ].map(btn => (
              <button key={btn.label}
                onClick={() => toast.success(`${btn.label}已发送`, { description: "请查看对应渠道是否收到通知" })}
                className={`w-full py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border active:scale-95 transition-transform ${btn.color}`}>
                {btn.icon}{btn.label}
              </button>
            ))}
          </div>
        </section>

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  );
}
