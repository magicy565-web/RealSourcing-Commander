/* ============================================================
   Phase 5 — Sprint 5.4
   ROI 计算器 + 成交漏斗 + 飞书每日战报
   DESIGN: Night Commander — 商业化闭环可视化
   ============================================================ */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, TrendingUp, Clock, DollarSign, BarChart2,
  RefreshCw, Send, CheckCircle2, AlertCircle, ChevronRight,
  Target, Zap, Award, Filter, Edit3
} from "lucide-react";
import { toast } from "sonner";
import { roiApi, dashboardExtApi } from "../lib/api";

// ─── 类型 ─────────────────────────────────────────────────────

interface RoiSummary {
  totalHoursSaved: number;
  totalCostSaved: number;
  inquiriesProcessed: number;
  avgResponseTime: string;
  productivityGain: number;
  weeklyHoursSaved: number;
  monthlyCostSaved: number;
}

interface BreakdownItem {
  category: string;
  count: number;
  minutesPerItem: number;
  totalMinutes: number;
  costSaved: number;
}

interface FunnelStage {
  id: string;
  stage: string;
  label: string;
  count: number;
  value: number;
  color: string;
  pct: number;
}

interface FunnelInquiry {
  id: string;
  subject: string;
  country: string;
  status: string;
  funnelStage: string;
  estimatedValue: number;
  dealValue?: number;
  createdAt: string;
}

// ─── 漏斗阶段配置 ─────────────────────────────────────────────

const FUNNEL_STAGES = [
  { id: "new",        label: "新询盘",   color: "#6b7280", icon: "📥" },
  { id: "contacted",  label: "已联系",   color: "#3b82f6", icon: "📤" },
  { id: "quoted",     label: "已报价",   color: "#8b5cf6", icon: "💰" },
  { id: "negotiating",label: "谈判中",   color: "#f59e0b", icon: "🤝" },
  { id: "contracted", label: "已成交",   color: "#10b981", icon: "✅" },
  { id: "lost",       label: "已流失",   color: "#ef4444", icon: "❌" },
];

// ─── Tab 切换 ─────────────────────────────────────────────────

type Tab = "roi" | "funnel" | "report";

// ─── ROI 面板 ─────────────────────────────────────────────────

function RoiPanel() {
  const [summary, setSummary] = useState<RoiSummary | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      roiApi.getSummary().catch(() => null),
      roiApi.getCalculator().catch(() => null),
    ]).then(([sumRes, calcRes]) => {
      if (sumRes) setSummary(sumRes.roi);
      if (calcRes) setBreakdown(calcRes.breakdown ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#10b981", borderTopColor: "transparent" }} />
    </div>
  );

  if (!summary) return (
    <div className="text-center py-12">
      <AlertCircle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
      <p className="text-sm text-slate-500">暂无数据</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 核心指标 */}
      <div className="rounded-2xl p-4"
        style={{ background: "linear-gradient(135deg, oklch(0.22 0.06 160), oklch(0.18 0.04 160))", border: "1px solid #10b98125" }}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-white">ROI 总览</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: "oklch(0.16 0.02 250 / 60%)" }}>
            <p className="text-xs text-slate-500 mb-1">累计节省工时</p>
            <p className="text-2xl font-black text-emerald-400">{summary.totalHoursSaved}<span className="text-sm font-normal text-slate-500 ml-1">小时</span></p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "oklch(0.16 0.02 250 / 60%)" }}>
            <p className="text-xs text-slate-500 mb-1">累计节省成本</p>
            <p className="text-2xl font-black text-emerald-400">${summary.totalCostSaved}<span className="text-sm font-normal text-slate-500 ml-1">USD</span></p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "oklch(0.16 0.02 250 / 60%)" }}>
            <p className="text-xs text-slate-500 mb-1">本周节省工时</p>
            <p className="text-xl font-black text-white">{summary.weeklyHoursSaved}<span className="text-sm font-normal text-slate-500 ml-1">小时</span></p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "oklch(0.16 0.02 250 / 60%)" }}>
            <p className="text-xs text-slate-500 mb-1">本月节省成本</p>
            <p className="text-xl font-black text-white">${summary.monthlyCostSaved}<span className="text-sm font-normal text-slate-500 ml-1">USD</span></p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid #10b98120" }}>
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">处理询盘 <span className="text-white font-semibold">{summary.inquiriesProcessed}</span> 条</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs text-slate-400">效率提升 <span className="text-yellow-400 font-semibold">{summary.productivityGain}%</span></span>
          </div>
        </div>
      </div>

      {/* 工时节省明细 */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">工时节省明细</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          {breakdown.map((item, i) => (
            <div key={item.category} className="px-4 py-3 flex items-center gap-3"
              style={{ borderBottom: i < breakdown.length - 1 ? "1px solid oklch(1 0 0 / 5%)" : "none" }}>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{item.category}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.count} 次 × {item.minutesPerItem} 分钟/次
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400">
                  {item.totalMinutes >= 60
                    ? `${(item.totalMinutes / 60).toFixed(1)}h`
                    : `${item.totalMinutes}m`}
                </p>
                <p className="text-xs text-slate-500">${item.costSaved}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 说明 */}
      <div className="rounded-xl p-3 flex items-start gap-2.5"
        style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 6%)" }}>
        <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          工时节省基于实际操作数据计算，时薪按 $15/小时 估算。实际效益因业务规模和人员配置而异。
        </p>
      </div>
    </div>
  );
}

// ─── 成交漏斗面板 ─────────────────────────────────────────────

function FunnelPanel() {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [inquiries, setInquiries] = useState<FunnelInquiry[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalDeal, setTotalDeal] = useState(0);
  const [filterStage, setFilterStage] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");

  async function loadFunnel() {
    setLoading(true);
    try {
      const res = await roiApi.getFunnel();
      setStages(res.funnel ?? []);
      setInquiries((res as any).inquiries ?? []);
      setTotalValue(res.totalPipelineValue ?? 0);
      setTotalDeal(res.totalDealValue ?? 0);
    } catch { toast.error("加载漏斗数据失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadFunnel(); }, []);

  async function handleStageUpdate(id: string, newStage: string) {
    setUpdating(id);
    try {
      await roiApi.updateFunnelStage(id, { funnelStage: newStage, status: newStage === "contracted" ? "contracted" : undefined });
      toast.success("漏斗阶段已更新");
      loadFunnel();
    } catch { toast.error("更新失败"); }
    finally { setUpdating(""); }
  }

  const filteredInquiries = filterStage === "all"
    ? inquiries
    : inquiries.filter(i => (i.funnelStage ?? i.status) === filterStage);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#8b5cf6", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 漏斗可视化 */}
      <div className="rounded-2xl p-4" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-white">成交漏斗</span>
          <div className="text-right">
            <p className="text-xs text-slate-500">管道总值</p>
            <p className="text-sm font-bold text-violet-400">${totalValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="space-y-2">
          {stages.map(stage => {
            const cfg = FUNNEL_STAGES.find(s => s.id === stage.stage) ?? FUNNEL_STAGES[0];
            return (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <span>{cfg.icon}</span>{cfg.label}
                  </span>
                  <span className="text-xs font-mono" style={{ color: cfg.color }}>
                    {stage.count} 条
                    {stage.value > 0 && <span className="text-slate-500 ml-1">· ${stage.value.toLocaleString()}</span>}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.25 0.02 250)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(stage.pct, 2)}%`, background: cfg.color }} />
                </div>
              </div>
            );
          })}
        </div>
        {totalDeal > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">已成交总值 <span className="text-emerald-400 font-bold">${totalDeal.toLocaleString()}</span></span>
          </div>
        )}
      </div>

      {/* 阶段筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <button onClick={() => setFilterStage("all")}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{ background: filterStage === "all" ? "#8b5cf6" : "oklch(0.22 0.02 250)", color: filterStage === "all" ? "white" : "oklch(0.6 0 0)" }}>
          全部
        </button>
        {FUNNEL_STAGES.map(s => (
          <button key={s.id} onClick={() => setFilterStage(s.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{ background: filterStage === s.id ? s.color : "oklch(0.22 0.02 250)", color: filterStage === s.id ? "white" : "oklch(0.6 0 0)" }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* 询盘列表 */}
      <div className="space-y-2">
        {filteredInquiries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">此阶段暂无询盘</p>
          </div>
        ) : filteredInquiries.map(inq => {
          const currentStage = inq.funnelStage ?? inq.status;
          const stageCfg = FUNNEL_STAGES.find(s => s.id === currentStage) ?? FUNNEL_STAGES[0];
          return (
            <div key={inq.id} className="rounded-xl p-3"
              style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 6%)" }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{inq.subject}</p>
                  <p className="text-xs text-slate-500">{inq.country} · {new Date(inq.createdAt).toLocaleDateString("zh-CN")}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: stageCfg.color + "20", color: stageCfg.color }}>
                  {stageCfg.icon} {stageCfg.label}
                </span>
              </div>
              {inq.estimatedValue > 0 && (
                <p className="text-xs text-slate-400 mb-2">
                  预估值 <span className="text-violet-400 font-semibold">${inq.estimatedValue.toLocaleString()}</span>
                  {inq.dealValue && inq.dealValue > 0 && (
                    <span className="ml-2">成交值 <span className="text-emerald-400 font-semibold">${inq.dealValue.toLocaleString()}</span></span>
                  )}
                </p>
              )}
              {/* 快速推进按钮 */}
              {currentStage !== "contracted" && currentStage !== "lost" && (
                <div className="flex gap-2 mt-2">
                  {FUNNEL_STAGES.filter(s => s.id !== currentStage && s.id !== "new").slice(0, 3).map(s => (
                    <button key={s.id} onClick={() => handleStageUpdate(inq.id, s.id)}
                      disabled={updating === inq.id}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: s.color + "20", color: s.color, border: `1px solid ${s.color}30` }}>
                      {updating === inq.id ? "..." : `→ ${s.label}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 每日战报面板 ─────────────────────────────────────────────

function ReportPanel() {
  const [pushing, setPushing] = useState(false);
  const [lastPushed, setLastPushed] = useState<string | null>(null);

  async function handlePushReport() {
    setPushing(true);
    try {
      const res = await dashboardExtApi.pushDailyReport();
      if (res.success) {
        toast.success("每日战报已推送至飞书");
        setLastPushed(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
      } else {
        toast.error("推送失败，请检查飞书 Webhook 配置");
      }
    } catch { toast.error("推送失败"); }
    finally { setPushing(false); }
  }

  return (
    <div className="space-y-4">
      {/* 战报说明 */}
      <div className="rounded-2xl p-4"
        style={{ background: "linear-gradient(135deg, oklch(0.22 0.05 30), oklch(0.18 0.03 30))", border: "1px solid #f9731625" }}>
        <div className="flex items-center gap-2 mb-2">
          <Send className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-bold text-white">飞书每日战报</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          战报包含今日询盘数量、高价值线索、OpenClaw 运行状态、社媒互动数据和 GEO 曝光量，每日 08:00 自动推送，也可手动触发。
        </p>
        <div className="space-y-2">
          {[
            { icon: "📥", label: "今日询盘数量与来源分布" },
            { icon: "💰", label: "高价值线索（>$5,000）详情" },
            { icon: "🤖", label: "OpenClaw 运行状态与操作量" },
            { icon: "📱", label: "社媒互动：评论、私信、线索转化" },
            { icon: "🌐", label: "GEO 引用次数与曝光量" },
            { icon: "📊", label: "成交漏斗变化与 ROI 数据" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-sm">{item.icon}</span>
              <span className="text-xs text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 推送按钮 */}
      <button onClick={handlePushReport} disabled={pushing}
        className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
        {pushing
          ? <><RefreshCw className="w-5 h-5 animate-spin" />推送中...</>
          : <><Send className="w-5 h-5" />立即推送战报至飞书</>}
      </button>

      {lastPushed && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: "oklch(0.20 0.05 160)", border: "1px solid #10b98130" }}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs text-emerald-300">战报已于 {lastPushed} 成功推送</span>
        </div>
      )}

      {/* 定时说明 */}
      <div className="rounded-2xl p-4" style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">自动推送设置</p>
        <div className="space-y-3">
          {[
            { label: "每日早报", time: "08:00", desc: "前一天数据汇总 + 今日待处理事项" },
            { label: "实时预警", time: "即时", desc: "高价值询盘（>$10,000）立即推送" },
            { label: "周报", time: "周一 09:00", desc: "上周 ROI 汇总与本周目标" },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#f97316" }} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <span className="text-xs text-orange-400 font-mono">{item.time}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 flex items-start gap-2" style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}>
          <AlertCircle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">飞书 Webhook 地址在管理员后台配置。推送失败时系统将在下次心跳时重试。</p>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────

export default function ROICalculator() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("roi");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "roi",    label: "ROI",   icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "funnel", label: "漏斗",  icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: "report", label: "战报",  icon: <Send className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen flex items-start justify-center sm:py-8" style={{ background: "oklch(0.10 0.02 250)" }}>
      <div className="w-full sm:rounded-3xl sm:overflow-hidden sm:shadow-2xl flex flex-col"
        style={{ background: "oklch(0.14 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)", maxWidth: "390px", minHeight: "100dvh" }}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-12 pb-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate("/phone")}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "oklch(0.22 0.02 250)" }}>
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>商业化闭环</h1>
              <p className="text-xs text-slate-500">ROI · 成交漏斗 · 飞书战报</p>
            </div>
          </div>
          {/* Tab 切换 */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "oklch(0.18 0.02 250)" }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: activeTab === tab.id ? "oklch(0.26 0.02 250)" : "transparent",
                  color: activeTab === tab.id ? "white" : "oklch(0.55 0 0)",
                  boxShadow: activeTab === tab.id ? "0 1px 4px oklch(0 0 0 / 30%)" : "none",
                }}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{ scrollbarWidth: "none" }}>
          {activeTab === "roi"    && <RoiPanel />}
          {activeTab === "funnel" && <FunnelPanel />}
          {activeTab === "report" && <ReportPanel />}
        </div>
      </div>
    </div>
  );
}
