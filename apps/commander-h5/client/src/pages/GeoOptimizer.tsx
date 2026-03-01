/* ============================================================
   GEO 加速优化向导
   DESIGN: Night Commander — 3步向导 + 进度追踪
   Philosophy: 选目标 AI 搜索引擎 → 选产品/关键词 → 设优化周期 → 启动
   ============================================================ */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Globe, Search, Zap, Check, ChevronRight,
  Plus, X, Clock, TrendingUp, BarChart2, RefreshCw,
  Target, Layers, Sparkles, CheckCircle2, AlertCircle,
  Eye, Tag
} from "lucide-react";
import { toast } from "sonner";
import { geoApi } from "../lib/api";

// ─── 类型 ─────────────────────────────────────────────────────

type GeoStep = "engines" | "keywords" | "schedule" | "confirm";

interface AiEngine {
  id: string;
  name: string;
  icon: string;
  desc: string;
  coverage: string;
  selected: boolean;
}

interface ActiveTask {
  id: string;
  product: string;
  engines: string[];
  keywords: string[];
  cycle: string;
  startedAt: string;
  status: "running" | "paused" | "completed";
  progress: number;
  citations: number;
  impressions: number;
}

// ─── 数据 ─────────────────────────────────────────────────────

const AI_ENGINES: AiEngine[] = [
  { id: "perplexity", name: "Perplexity AI", icon: "🔍", desc: "全球最大 AI 搜索，B2B 采购决策者高频使用", coverage: "全球", selected: false },
  { id: "chatgpt", name: "ChatGPT Search", icon: "🤖", desc: "OpenAI 搜索功能，欧美市场渗透率高", coverage: "欧美为主", selected: false },
  { id: "gemini", name: "Google Gemini", icon: "✨", desc: "Google AI 搜索，与 Google 搜索结果深度整合", coverage: "全球", selected: false },
  { id: "claude", name: "Claude.ai", icon: "🧠", desc: "Anthropic 旗下，科技/工业领域专业用户偏好", coverage: "欧美/亚太", selected: false },
  { id: "grok", name: "Grok / X AI", icon: "⚡", desc: "X 平台 AI，实时信息整合，适合市场动态监控", coverage: "北美/欧洲", selected: false },
  { id: "you", name: "You.com", icon: "🌐", desc: "企业级 AI 搜索，B2B 场景使用率上升", coverage: "北美", selected: false },
];

const MOCK_PRODUCTS = [
  "太阳能组件 400W 单晶硅",
  "储能系统 10kWh 壁挂式",
  "LED 工矿灯 200W",
  "光伏逆变器 5kW",
];

const ACTIVE_TASKS: ActiveTask[] = [
  {
    id: "geo1",
    product: "太阳能组件 400W 单晶硅",
    engines: ["Perplexity AI", "ChatGPT Search"],
    keywords: ["solar panel manufacturer China", "400W monocrystalline wholesale"],
    cycle: "持续优化（每周更新）",
    startedAt: "2026-02-20",
    status: "running",
    progress: 68,
    citations: 24,
    impressions: 3840,
  },
  {
    id: "geo2",
    product: "储能系统 10kWh",
    engines: ["Google Gemini"],
    keywords: ["home battery storage China supplier"],
    cycle: "30 天测试期",
    startedAt: "2026-02-15",
    status: "running",
    progress: 45,
    citations: 11,
    impressions: 1620,
  },
];

// ─── 创建向导 ─────────────────────────────────────────────────

function GeoWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<GeoStep>("engines");
  const [engines, setEngines] = useState<AiEngine[]>(AI_ENGINES.map(e => ({...e})));
  const [selectedProduct, setSelectedProduct] = useState("");
  const [customProduct, setCustomProduct] = useState("");
  const [keywords, setKeywords] = useState<string[]>(["", ""]);
  const [cycle, setCycle] = useState("30days");
  const [launching, setLaunching] = useState(false);

  const steps: GeoStep[] = ["engines", "keywords", "schedule", "confirm"];
  const stepIdx = steps.indexOf(step);
  const stepLabels = { engines: "选择引擎", keywords: "产品与关键词", schedule: "优化周期", confirm: "确认启动" };
  const selectedEngines = engines.filter(e => e.selected);
  const finalProduct = customProduct.trim() || selectedProduct;
  const validKeywords = keywords.filter(k => k.trim().length > 0);

  function handleLaunch() {
    setLaunching(true);
    setTimeout(() => {
      toast.success(`GEO 优化任务已启动！OpenClaw 将开始在 ${selectedEngines.map(e=>e.name).join("、")} 上优化"${finalProduct}"的可见度`);
      onClose();
    }, 2000);
  }

  const cycleOptions = [
    { id: "14days", label: "14 天测试", desc: "快速验证效果，适合新产品" },
    { id: "30days", label: "30 天测试", desc: "标准测试周期，数据更稳定" },
    { id: "90days", label: "90 天深度", desc: "建立长期权威性，效果最佳" },
    { id: "continuous", label: "持续优化", desc: "无限期运行，每周自动更新内容" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{background:"oklch(0 0 0 / 75%)"}}>
      <div className="w-full rounded-t-3xl overflow-hidden flex flex-col"
        style={{background:"oklch(0.16 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)", maxHeight:"92dvh"}}>

        {/* 拖拽条 + 标题 */}
        <div className="flex-shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <div className="px-5 py-3 flex items-center justify-between border-b border-white/8">
            <div>
              <h2 className="text-base font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>GEO 加速优化</h2>
              <p className="text-xs text-slate-500">{stepLabels[step]} · {stepIdx + 1}/{steps.length}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex gap-1 px-5 py-3">
            {steps.map((s, i) => (
              <div key={s} className="flex-1 h-1 rounded-full transition-all"
                style={{background: i <= stepIdx ? "#f97316" : "oklch(0.25 0.02 250)"}} />
            ))}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{scrollbarWidth:"none"}}>

          {/* Step 1: 选择 AI 搜索引擎 */}
          {step === "engines" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">选择要优化的 AI 搜索引擎（可多选），OpenClaw 将生成针对性内容提升在这些引擎中的引用率</p>
              <div className="space-y-2">
                {engines.map((engine, i) => (
                  <button key={engine.id}
                    onClick={() => setEngines(prev => prev.map((e, j) => j === i ? {...e, selected: !e.selected} : e))}
                    className="w-full text-left rounded-xl p-4 transition-all active:scale-98"
                    style={{
                      background: engine.selected ? "oklch(0.22 0.05 40)" : "oklch(0.20 0.02 250)",
                      border: `1px solid ${engine.selected ? "#f9731640" : "oklch(1 0 0 / 8%)"}`,
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{background: engine.selected ? "#f9731620" : "oklch(0.25 0.02 250)"}}>
                        {engine.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">{engine.name}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/8 text-slate-500">{engine.coverage}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{engine.desc}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                        style={{background: engine.selected ? "#f97316" : "oklch(0.28 0.02 250)"}}>
                        {engine.selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: 产品与关键词 */}
          {step === "keywords" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">选择产品</label>
                <div className="space-y-2 mb-2">
                  {MOCK_PRODUCTS.map(p => (
                    <button key={p} onClick={() => { setSelectedProduct(p); setCustomProduct(""); }}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all active:scale-98"
                      style={{
                        background: selectedProduct === p && !customProduct ? "oklch(0.22 0.05 40)" : "oklch(0.20 0.02 250)",
                        border: `1px solid ${selectedProduct === p && !customProduct ? "#f9731640" : "oklch(1 0 0 / 8%)"}`,
                        color: selectedProduct === p && !customProduct ? "white" : "oklch(0.7 0 0)",
                      }}>
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{background:"oklch(0.22 0.02 250)", border:`1px solid ${customProduct ? "#f9731640" : "oklch(1 0 0 / 12%)"}`}}
                  placeholder="或输入自定义产品名称..."
                  value={customProduct}
                  onChange={e => { setCustomProduct(e.target.value); setSelectedProduct(""); }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  目标关键词（英文，最多 5 条）
                </label>
                <p className="text-xs text-slate-500 mb-2">这些是买家在 AI 搜索引擎中搜索时使用的词汇，OpenClaw 将围绕这些词优化内容</p>
                {keywords.map((kw, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input
                      className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none"
                      style={{background:"oklch(0.22 0.02 250)", border:"1px solid oklch(1 0 0 / 12%)"}}
                      placeholder={[
                        "如：solar panel manufacturer China",
                        "如：400W monocrystalline wholesale",
                        "如：solar module factory direct",
                        "如：cheap solar panels bulk order",
                        "如：OEM solar panel supplier",
                      ][i] || "添加关键词..."}
                      value={kw}
                      onChange={e => setKeywords(prev => prev.map((k, j) => j === i ? e.target.value : k))}
                    />
                    {keywords.length > 1 && (
                      <button onClick={() => setKeywords(prev => prev.filter((_, j) => j !== i))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{background:"oklch(0.22 0.02 250)"}}>
                        <X className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    )}
                  </div>
                ))}
                {keywords.length < 5 && (
                  <button onClick={() => setKeywords(prev => [...prev, ""])}
                    className="flex items-center gap-1.5 text-xs text-orange-400 mt-1">
                    <Plus className="w-3.5 h-3.5" />添加关键词
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: 优化周期 */}
          {step === "schedule" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">选择优化周期，OpenClaw 将在此期间持续更新内容、监控引用率并调整策略</p>
              <div className="space-y-2 mb-5">
                {cycleOptions.map(opt => (
                  <button key={opt.id} onClick={() => setCycle(opt.id)}
                    className="w-full text-left rounded-xl p-4 transition-all active:scale-98"
                    style={{
                      background: cycle === opt.id ? "oklch(0.22 0.05 40)" : "oklch(0.20 0.02 250)",
                      border: `1px solid ${cycle === opt.id ? "#f9731640" : "oklch(1 0 0 / 8%)"}`,
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                        style={{background: cycle === opt.id ? "#f97316" : "oklch(0.28 0.02 250)"}}>
                        {cycle === opt.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="rounded-xl p-4"
                style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                <p className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-orange-400" />GEO 优化的工作原理
                </p>
                <div className="space-y-1.5">
                  {[
                    "OpenClaw 生成针对 AI 引擎优化的结构化内容（FAQ/产品描述/行业报告）",
                    "内容发布到高权重平台（LinkedIn/行业媒体/公司官网）",
                    "AI 搜索引擎抓取并引用这些内容作为答案来源",
                    "买家在 AI 搜索中提问时，您的产品出现在推荐结果中",
                  ].map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{background:"#f9731620"}}>
                        <span className="text-xs font-bold text-orange-400">{i+1}</span>
                      </div>
                      <p className="text-xs text-slate-400">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: 确认启动 */}
          {step === "confirm" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">确认以下配置后，OpenClaw 将立即开始 GEO 优化任务</p>
              <div className="rounded-xl overflow-hidden mb-4"
                style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                {[
                  { label: "目标产品", value: finalProduct },
                  { label: "AI 搜索引擎", value: selectedEngines.map(e => e.name).join("、") },
                  { label: "目标关键词", value: validKeywords.join("、") || "（未设置）" },
                  { label: "优化周期", value: cycleOptions.find(c => c.id === cycle)?.label || "" },
                ].map((item, i, arr) => (
                  <div key={item.label} className="px-4 py-3 flex items-start gap-3"
                    style={{borderBottom: i < arr.length - 1 ? "1px solid oklch(1 0 0 / 6%)" : "none"}}>
                    <span className="text-xs text-slate-500 w-20 flex-shrink-0 mt-0.5">{item.label}</span>
                    <span className="text-xs font-medium text-white flex-1">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-3 flex items-start gap-2.5 mb-4"
                style={{background:"oklch(0.20 0.05 40)", border:"1px solid #f9731620"}}>
                <Zap className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-orange-300 mb-0.5">预计效果</p>
                  <p className="text-xs text-slate-400">首次引用通常在 7-14 天内出现，30 天后可见明显的曝光量增长。战报将在每日早报中汇报 GEO 引用数据。</p>
                </div>
              </div>
              <div className="rounded-xl p-3 flex items-start gap-2.5"
                style={{background:"oklch(0.17 0.02 250)", border:"1px solid oklch(1 0 0 / 6%)"}}>
                <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500">GEO 优化消耗积分将根据引擎数量和优化周期计算，具体用量在战报中查看</p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex-shrink-0 px-5 py-4 flex gap-3" style={{borderTop:"1px solid oklch(1 0 0 / 8%)"}}>
          {stepIdx > 0 && (
            <button onClick={() => setStep(steps[stepIdx - 1])}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 transition-all active:scale-98"
              style={{background:"oklch(0.22 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)"}}>
              上一步
            </button>
          )}
          {step === "engines" && (
            <button onClick={() => setStep("keywords")} disabled={selectedEngines.length === 0}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 disabled:opacity-40"
              style={{background:"linear-gradient(135deg, #f97316, #ea580c)"}}>
              已选 {selectedEngines.length} 个引擎 <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
          {step === "keywords" && (
            <button onClick={() => setStep("schedule")} disabled={!finalProduct}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 disabled:opacity-40"
              style={{background:"linear-gradient(135deg, #f97316, #ea580c)"}}>
              下一步 <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
          {step === "schedule" && (
            <button onClick={() => setStep("confirm")}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98"
              style={{background:"linear-gradient(135deg, #f97316, #ea580c)"}}>
              下一步 <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
          {step === "confirm" && (
            <button onClick={handleLaunch} disabled={launching}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 flex items-center justify-center gap-2"
              style={{background:"linear-gradient(135deg, #f97316, #ea580c)"}}>
              {launching
                ? <><Zap className="w-4 h-4 animate-spin" />启动中...</>
                : <><Zap className="w-4 h-4" />立即启动</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────

export default function GeoOptimizer() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [marketSummary, setMarketSummary] = useState<any>(null);
  const [topMarkets, setTopMarkets] = useState<any[]>([]);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    setLoadingInsight(true);
    Promise.all([
      geoApi.getMarketSummary().catch(() => null),
      geoApi.getTopMarkets().catch(() => null),
    ]).then(([summaryRes, marketsRes]) => {
      if (summaryRes) setMarketSummary(summaryRes.summary);
      if (marketsRes) setTopMarkets(marketsRes.markets ?? []);
    }).finally(() => setLoadingInsight(false));
  }, []);

  return (
    <div className="min-h-screen flex items-start justify-center sm:py-8" style={{background:"oklch(0.10 0.02 250)"}}>
      <div className="w-full sm:rounded-3xl sm:overflow-hidden sm:shadow-2xl flex flex-col"
        style={{background:"oklch(0.14 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)", maxWidth:"390px", minHeight:"100dvh"}}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-12 pb-4" style={{borderBottom:"1px solid oklch(1 0 0 / 8%)"}}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/phone")}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{background:"oklch(0.22 0.02 250)"}}>
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>GEO 加速优化</h1>
              <p className="text-xs text-slate-500">让 AI 搜索引擎主动推荐您的产品</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white active:scale-95 transition-all"
              style={{background:"linear-gradient(135deg, #f97316, #ea580c)"}}>
              <Plus className="w-3.5 h-3.5" />新建任务
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{scrollbarWidth:"none"}}>

          {/* 概念说明卡 */}
          <div className="rounded-2xl p-4 mb-5"
            style={{background:"linear-gradient(135deg, oklch(0.22 0.06 40), oklch(0.18 0.04 40))",
              border:"1px solid #f9731625"}}>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-white">什么是 GEO？</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              GEO（Generative Engine Optimization）是针对 AI 搜索引擎的优化策略。当买家在 Perplexity、ChatGPT 等 AI 工具中搜索"太阳能组件供应商"时，您的产品会出现在 AI 的推荐答案中。
            </p>
            <div className="flex items-center gap-4 mt-3 pt-3" style={{borderTop:"1px solid #f9731620"}}>
              <div className="text-center">
                <p className="text-lg font-bold text-orange-400">6</p>
                <p className="text-xs text-slate-500">支持引擎</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-orange-400">7-14天</p>
                <p className="text-xs text-slate-500">首次见效</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-orange-400">24/7</p>
                <p className="text-xs text-slate-500">持续曝光</p>
              </div>
            </div>
          </div>

          {/* 进行中的任务 */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">进行中的任务</p>
          <div className="space-y-3 mb-5">
            {ACTIVE_TASKS.map(task => (
              <div key={task.id} className="rounded-2xl overflow-hidden"
                style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{task.product}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {task.engines.map(e => (
                          <span key={e} className="text-xs px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">{e}</span>
                        ))}
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />运行中
                    </span>
                  </div>
                  {/* 进度条 */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">优化进度</span>
                      <span className="text-xs font-semibold text-orange-400">{task.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{background:"oklch(0.25 0.02 250)"}}>
                      <div className="h-full rounded-full transition-all"
                        style={{width:`${task.progress}%`, background:"linear-gradient(90deg, #f97316, #fb923c)"}} />
                    </div>
                  </div>
                  {/* 数据 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg p-2 text-center" style={{background:"oklch(0.16 0.02 250)"}}>
                      <p className="text-sm font-bold text-white">{task.citations}</p>
                      <p className="text-xs text-slate-500">AI 引用次数</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{background:"oklch(0.16 0.02 250)"}}>
                      <p className="text-sm font-bold text-white">{task.impressions.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">曝光量</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{background:"oklch(0.16 0.02 250)"}}>
                      <p className="text-sm font-bold text-white">{task.cycle}</p>
                      <p className="text-xs text-slate-500">优化周期</p>
                    </div>
                  </div>
                  {/* 关键词 */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {task.keywords.map(kw => (
                      <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-white/6 text-slate-400 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />{kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 市场洞察区块 */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 mt-5">市场洞察</p>
          {loadingInsight ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "#f97316", borderTopColor: "transparent" }} />
            </div>
          ) : (
            <div className="space-y-3 mb-5">
              {marketSummary && (
                <div className="rounded-2xl p-4"
                  style={{ background: "oklch(0.19 0.02 250)", border: "1px solid #f9731625" }}>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "覆盖国家", value: marketSummary.totalCountries ?? topMarkets.length, color: "#f97316" },
                      { label: "询盘总量", value: marketSummary.totalInquiries ?? "—", color: "#10b981" },
                      { label: "平均询盘值", value: marketSummary.avgInquiryValue ? `$${marketSummary.avgInquiryValue}` : "—", color: "#8b5cf6" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-2.5 text-center"
                        style={{ background: "oklch(0.22 0.02 250)" }}>
                        <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
                        <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  {marketSummary.topRegion && (
                    <div className="flex items-center gap-2 px-1">
                      <TrendingUp className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      <span className="text-xs text-slate-400">
                        最活跃区域：<span className="text-orange-400 font-semibold">{marketSummary.topRegion}</span>
                        {marketSummary.topRegionPct && <span className="text-slate-500"> · 占比 {marketSummary.topRegionPct}%</span>}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {topMarkets.length > 0 && (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "oklch(0.19 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                  <div className="px-4 py-3 flex items-center gap-2"
                    style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
                    <Globe className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs font-semibold text-white">热门目标市场 TOP 8</span>
                  </div>
                  <div className="px-4 py-2">
                    {topMarkets.slice(0, 8).map((m: any, i: number) => (
                      <div key={m.country} className="flex items-center gap-3 py-2"
                        style={{ borderBottom: i < Math.min(topMarkets.length, 8) - 1 ? "1px solid oklch(1 0 0 / 5%)" : "none" }}>
                        <span className="text-xs font-bold text-slate-500 w-4 text-right flex-shrink-0">{i + 1}</span>
                        <span className="text-sm flex-shrink-0">{m.flag ?? "🌍"}</span>
                        <span className="text-xs font-semibold text-white flex-1">{m.country}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.25 0.02 250)" }}>
                            <div className="h-full rounded-full" style={{ width: `${m.pct ?? 0}%`, background: "#f97316" }} />
                          </div>
                          <span className="text-xs font-mono text-orange-400 w-8 text-right">{m.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* 支持的引擎列表 */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">支持的 AI 搜索引擎</p>
          <div className="grid grid-cols-2 gap-2">
            {AI_ENGINES.map(e => (
              <div key={e.id} className="rounded-xl p-3 flex items-center gap-2.5"
                style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                <span className="text-xl">{e.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{e.name}</p>
                  <p className="text-xs text-slate-500">{e.coverage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCreate && <GeoWizard onClose={() => setShowCreate(false)} />}
    </div>
  );
}
