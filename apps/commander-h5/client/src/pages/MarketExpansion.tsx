/* ============================================================
   新市场开发计划向导
   DESIGN: Night Commander — 多 Agent 联动任务创建 + 进度追踪
   Philosophy: 意图驱动 · 向导式创建 · 可视化 Agent 协作链路
   ============================================================ */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Globe, Target, BarChart3, Zap, Bot,
  ChevronRight, ChevronDown, Check, Clock, Play,
  TrendingUp, Users, MessageSquare, Search,
  FileText, Send, AlertCircle, CheckCircle2,
  Sparkles, Map, Layers, Activity, Plus,
  Coins, Calendar, ArrowRight, Info
} from "lucide-react";
import { toast } from "sonner";

// ─── 类型 ─────────────────────────────────────────────────────

type WizardStep = "market" | "product" | "strategy" | "budget" | "review";
type TaskStatus = "pending" | "running" | "done" | "waiting";

interface AgentTask {
  id: string;
  agentName: string;
  agentType: "research" | "content" | "outreach" | "monitor";
  title: string;
  description: string;
  status: TaskStatus;
  progress?: number;
  estimatedCredits: number;
  estimatedDays: string;
  dependsOn?: string[];
  outputs?: string[];
}

// ─── Mock 进行中的计划 ─────────────────────────────────────────

const activeMarketPlans = [
  {
    id: "mp-001",
    market: "越南",
    flag: "🇻🇳",
    product: "太阳能组件 400W",
    status: "running",
    startedAt: "2026-02-20",
    progress: 35,
    creditsUsed: 420,
    creditsTotal: 1200,
    currentPhase: "市场调研",
    agents: [
      { id:"a1", agentName:"调研 Agent", agentType:"research" as const, title:"越南太阳能市场调研", description:"分析越南光伏市场规模、主要采购商、竞品价格区间、政策环境", status:"done" as TaskStatus, estimatedCredits:150, estimatedDays:"已完成", outputs:["市场规模报告", "竞品价格分析", "Top 50 采购商名单"] },
      { id:"a2", agentName:"内容 Agent", agentType:"content" as const, title:"本地化营销内容生成", description:"生成越南语产品介绍、LinkedIn 帖子、邮件模板", status:"running" as TaskStatus, progress:60, estimatedCredits:200, estimatedDays:"进行中", dependsOn:["a1"], outputs:["越南语产品页", "10 篇 LinkedIn 帖子草稿"] },
      { id:"a3", agentName:"外联 Agent", agentType:"outreach" as const, title:"LinkedIn/Facebook 精准触达", description:"向 Top 50 采购商发送连接请求和个性化 InMail", status:"waiting" as TaskStatus, estimatedCredits:500, estimatedDays:"待 a2 完成后启动", dependsOn:["a2"] },
      { id:"a4", agentName:"监控 Agent", agentType:"monitor" as const, title:"指标追踪与战报生成", description:"每日追踪连接接受率、回复率、询盘转化率，生成战报", status:"waiting" as TaskStatus, estimatedCredits:100, estimatedDays:"持续运行", dependsOn:["a3"] },
    ] as AgentTask[],
    kpis: [
      { label: "目标询盘", value: "20条", current: "3条", pct: 15 },
      { label: "LinkedIn 连接", value: "50个", current: "0个", pct: 0 },
      { label: "内容发布", value: "10篇", current: "4篇", pct: 40 },
    ],
  },
];

// ─── 市场选项 ─────────────────────────────────────────────────

const marketOptions = [
  { id: "vn", name: "越南", flag: "🇻🇳", desc: "光伏装机量高速增长，政策利好" },
  { id: "in", name: "印度", flag: "🇮🇳", desc: "全球第三大光伏市场，采购量大" },
  { id: "de", name: "德国", flag: "🇩🇪", desc: "高端市场，溢价空间大" },
  { id: "br", name: "巴西", flag: "🇧🇷", desc: "新兴市场，竞争相对较少" },
  { id: "au", name: "澳大利亚", flag: "🇦🇺", desc: "屋顶光伏渗透率高" },
  { id: "custom", name: "自定义市场", flag: "🌍", desc: "输入目标国家/地区" },
];

const strategyOptions = [
  { id: "aggressive", name: "强势开拓", desc: "高频触达，快速建立市场存在感", credits: 1500, days: "30天" },
  { id: "balanced",   name: "均衡推进", desc: "稳步渗透，注重关系质量",         credits: 800,  days: "45天" },
  { id: "conservative", name: "保守试探", desc: "低成本验证市场可行性",           credits: 300,  days: "30天" },
];

// ─── 子组件 ───────────────────────────────────────────────────

function AgentTypeIcon({ type }: { type: AgentTask["agentType"] }) {
  const map = {
    research: { icon: <Search className="w-3.5 h-3.5" />, color: "#8b5cf6", bg: "#8b5cf620" },
    content:  { icon: <FileText className="w-3.5 h-3.5" />, color: "#3b82f6", bg: "#3b82f620" },
    outreach: { icon: <Send className="w-3.5 h-3.5" />, color: "#f59e0b", bg: "#f59e0b20" },
    monitor:  { icon: <Activity className="w-3.5 h-3.5" />, color: "#22c55e", bg: "#22c55e20" },
  };
  const { icon, color, bg } = map[type];
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{background: bg, color}}>
      {icon}
    </div>
  );
}

function AgentStatusBadge({ status }: { status: TaskStatus }) {
  const map = {
    pending: { label: "待启动", bg: "bg-slate-500/15", color: "text-slate-400" },
    running: { label: "执行中", bg: "bg-blue-500/15",  color: "text-blue-400" },
    done:    { label: "已完成", bg: "bg-teal-500/15",  color: "text-teal-400" },
    waiting: { label: "等待前置", bg: "bg-amber-500/15", color: "text-amber-400" },
  };
  const { label, bg, color } = map[status];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bg} ${color}`}>{label}</span>;
}

// ─── 进行中的计划卡片 ─────────────────────────────────────────

function ActivePlanCard({ plan }: { plan: typeof activeMarketPlans[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(0.50 0.10 250 / 20%)"}}>
      <button className="w-full px-4 py-4 flex items-start gap-3 text-left"
        onClick={() => setExpanded(e => !e)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{background:"oklch(0.22 0.02 250)"}}>
          {plan.flag}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-white">{plan.market} 市场开发</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">进行中</span>
          </div>
          <p className="text-xs text-slate-400 mb-2">{plan.product} · 当前阶段：{plan.currentPhase}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:"oklch(0.25 0.02 250)"}}>
              <div className="h-full rounded-full bg-blue-500" style={{width:`${plan.progress}%`}} />
            </div>
            <span className="text-xs text-slate-400 font-mono">{plan.progress}%</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 mt-1 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5">
          {/* KPI 进度 */}
          <div className="grid grid-cols-3 gap-2 mt-3 mb-4">
            {plan.kpis.map(kpi => (
              <div key={kpi.label} className="rounded-xl p-3 text-center"
                style={{background:"oklch(0.16 0.02 250)"}}>
                <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                <p className="text-sm font-bold text-white font-mono">{kpi.current}</p>
                <p className="text-xs text-slate-600">目标 {kpi.value}</p>
                <div className="h-1 rounded-full overflow-hidden mt-1.5" style={{background:"oklch(0.25 0.02 250)"}}>
                  <div className="h-full rounded-full bg-teal-500" style={{width:`${kpi.pct}%`}} />
                </div>
              </div>
            ))}
          </div>

          {/* Agent 链路 */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">多 Agent 执行链路</p>
          <div className="space-y-2">
            {plan.agents.map((agent, i) => (
              <div key={agent.id}>
                <div className="rounded-xl px-3 py-3 flex items-start gap-3"
                  style={{background:"oklch(0.16 0.02 250)", border:"1px solid oklch(1 0 0 / 6%)"}}>
                  <AgentTypeIcon type={agent.agentType} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white">{agent.title}</span>
                      <AgentStatusBadge status={agent.status} />
                    </div>
                    <p className="text-xs text-slate-500 mb-1.5">{agent.description}</p>
                    {agent.status === "running" && agent.progress !== undefined && (
                      <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{background:"oklch(0.25 0.02 250)"}}>
                        <div className="h-full rounded-full bg-blue-500" style={{width:`${agent.progress}%`}} />
                      </div>
                    )}
                    {agent.outputs && agent.status === "done" && (
                      <div className="flex flex-wrap gap-1">
                        {agent.outputs.map(o => (
                          <span key={o} className="text-xs px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400">{o}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-600 flex items-center gap-1"><Coins className="w-3 h-3" />{agent.estimatedCredits} 积分</span>
                      <span className="text-xs text-slate-600 flex items-center gap-1"><Clock className="w-3 h-3" />{agent.estimatedDays}</span>
                    </div>
                  </div>
                </div>
                {i < plan.agents.length - 1 && (
                  <div className="flex justify-center my-1">
                    <ArrowRight className="w-3 h-3 text-slate-600 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 积分消耗 */}
          <div className="mt-4 rounded-xl px-4 py-3" style={{background:"oklch(0.16 0.02 250)"}}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">积分消耗进度</span>
              <span className="text-xs text-slate-400">{plan.creditsUsed} / {plan.creditsTotal}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{background:"oklch(0.25 0.02 250)"}}>
              <div className="h-full rounded-full bg-orange-400"
                style={{width:`${Math.round(plan.creditsUsed/plan.creditsTotal*100)}%`}} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 创建向导 ─────────────────────────────────────────────────

function CreateWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>("market");
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [customMarket, setCustomMarket] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [creditBudget, setCreditBudget] = useState(800);
  const [submitting, setSubmitting] = useState(false);

  const steps: WizardStep[] = ["market", "product", "strategy", "budget", "review"];
  const stepIdx = steps.indexOf(step);

  const stepLabels = { market: "目标市场", product: "推广产品", strategy: "开拓策略", budget: "积分预算", review: "确认计划" };

  const products = ["太阳能组件 400W", "太阳能组件 600W", "储能系统 10kWh", "逆变器 5kW", "LED 工矿灯 200W"];

  const selectedStrategyObj = strategyOptions.find(s => s.id === selectedStrategy);

  function handleSubmit() {
    setSubmitting(true);
    setTimeout(() => {
      toast.success("新市场开发计划已创建！多 Agent 将在 30 分钟内开始执行");
      onClose();
    }, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{background:"oklch(0 0 0 / 75%)"}}>
      <div className="w-full rounded-t-3xl overflow-hidden flex flex-col"
        style={{background:"oklch(0.16 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)", maxHeight:"90dvh"}}>

        {/* 拖拽条 + 标题 */}
        <div className="flex-shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <div className="px-5 py-3 flex items-center justify-between border-b border-white/8">
            <div>
              <h2 className="text-base font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>新市场开发计划</h2>
              <p className="text-xs text-slate-500">{stepLabels[step]} · 步骤 {stepIdx + 1}/{steps.length}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10">
              <span className="text-white text-sm">✕</span>
            </button>
          </div>
          {/* 步骤进度条 */}
          <div className="flex gap-1 px-5 py-3">
            {steps.map((s, i) => (
              <div key={s} className="flex-1 h-1 rounded-full transition-all"
                style={{background: i <= stepIdx ? "#3b82f6" : "oklch(0.25 0.02 250)"}} />
            ))}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{scrollbarWidth:"none"}}>

          {/* Step 1: 目标市场 */}
          {step === "market" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">选择您想要开拓的目标市场</p>
              <div className="space-y-2">
                {marketOptions.map(m => (
                  <button key={m.id} onClick={() => setSelectedMarket(m.id)}
                    className="w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 transition-all active:scale-98"
                    style={selectedMarket === m.id
                      ? {background:"oklch(0.22 0.04 250)", border:"1px solid #3b82f640"}
                      : {background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                    <span className="text-xl">{m.flag}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.desc}</p>
                    </div>
                    {selectedMarket === m.id && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
              {selectedMarket === "custom" && (
                <input
                  className="mt-3 w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{background:"oklch(0.22 0.02 250)", border:"1px solid #3b82f640"}}
                  placeholder="输入目标国家/地区名称"
                  value={customMarket}
                  onChange={e => setCustomMarket(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Step 2: 推广产品 */}
          {step === "product" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">选择要在此市场推广的产品（可多选）</p>
              <div className="space-y-2">
                {products.map(p => {
                  const selected = selectedProducts.includes(p);
                  return (
                    <button key={p} onClick={() => setSelectedProducts(prev =>
                      selected ? prev.filter(x => x !== p) : [...prev, p]
                    )}
                      className="w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 transition-all active:scale-98"
                      style={selected
                        ? {background:"oklch(0.22 0.04 250)", border:"1px solid #3b82f640"}
                        : {background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{background: selected ? "#3b82f620" : "oklch(0.22 0.02 250)"}}>
                        <Layers className="w-4 h-4" style={{color: selected ? "#3b82f6" : "oklch(0.5 0.01 250)"}} />
                      </div>
                      <span className="text-sm font-medium text-white flex-1">{p}</span>
                      {selected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: 开拓策略 */}
          {step === "strategy" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">选择 Agent 执行策略</p>
              <div className="space-y-3">
                {strategyOptions.map(s => (
                  <button key={s.id} onClick={() => setSelectedStrategy(s.id)}
                    className="w-full text-left rounded-xl px-4 py-4 transition-all active:scale-98"
                    style={selectedStrategy === s.id
                      ? {background:"oklch(0.22 0.04 250)", border:"1px solid #3b82f640"}
                      : {background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-white">{s.name}</span>
                      {selectedStrategy === s.id && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{s.desc}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-orange-400 flex items-center gap-1"><Coins className="w-3 h-3" />约 {s.credits} 积分</span>
                      <span className="text-xs text-blue-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{s.days}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-xl p-3 flex items-start gap-2.5"
                style={{background:"oklch(0.17 0.02 250)", border:"1px solid oklch(1 0 0 / 6%)"}}>
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">多 Agent 协作链路：调研 Agent → 内容 Agent → 外联 Agent → 监控 Agent，每个阶段完成后自动触发下一阶段</p>
              </div>
            </div>
          )}

          {/* Step 4: 积分预算 */}
          {step === "budget" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">设置积分预算上限（当前余额：2,840 积分）</p>
              <div className="rounded-xl p-5 mb-4" style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-400">预算上限</span>
                  <span className="text-2xl font-bold text-orange-400 font-mono">{creditBudget}</span>
                </div>
                <input type="range" min={200} max={2840} step={100} value={creditBudget}
                  onChange={e => setCreditBudget(Number(e.target.value))}
                  className="w-full accent-orange-400" />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-600">200</span>
                  <span className="text-xs text-slate-600">2,840</span>
                </div>
              </div>
              {selectedStrategyObj && (
                <div className="space-y-2">
                  <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                    <span className="text-xs text-slate-400">策略建议积分</span>
                    <span className="text-sm font-bold text-blue-400 font-mono">~{selectedStrategyObj.credits}</span>
                  </div>
                  {creditBudget < selectedStrategyObj.credits && (
                    <div className="rounded-xl px-4 py-3 flex items-center gap-2"
                      style={{background:"#f59e0b10", border:"1px solid #f59e0b30"}}>
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <p className="text-xs text-amber-400">预算低于策略建议值，部分 Agent 任务可能提前终止</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 5: 确认计划 */}
          {step === "review" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">确认以下计划内容，创建后多 Agent 将自动开始执行</p>
              <div className="space-y-3">
                {[
                  { label: "目标市场", value: selectedMarket === "custom" ? customMarket : marketOptions.find(m => m.id === selectedMarket)?.name || "-" },
                  { label: "推广产品", value: selectedProducts.length > 0 ? selectedProducts.join("、") : "-" },
                  { label: "开拓策略", value: strategyOptions.find(s => s.id === selectedStrategy)?.name || "-" },
                  { label: "积分预算", value: `${creditBudget} 积分` },
                ].map(item => (
                  <div key={item.label} className="rounded-xl px-4 py-3"
                    style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                    <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                    <p className="text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl p-4" style={{background:"oklch(0.17 0.02 250)", border:"1px solid oklch(1 0 0 / 6%)"}}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">将启动的 Agent 链路</p>
                <div className="space-y-2">
                  {[
                    { name: "调研 Agent", type: "research" as const, desc: "市场调研 + 竞品分析 + 采购商名单" },
                    { name: "内容 Agent", type: "content" as const, desc: "本地化营销内容生成" },
                    { name: "外联 Agent", type: "outreach" as const, desc: "LinkedIn/Facebook 精准触达" },
                    { name: "监控 Agent", type: "monitor" as const, desc: "每日指标追踪 + 战报生成" },
                  ].map((a, i) => (
                    <div key={a.name} className="flex items-center gap-3">
                      <AgentTypeIcon type={a.type} />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white">{a.name}</p>
                        <p className="text-xs text-slate-500">{a.desc}</p>
                      </div>
                      {i < 3 && <ArrowRight className="w-3 h-3 text-slate-600 rotate-90 absolute" style={{display:"none"}} />}
                    </div>
                  ))}
                </div>
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
          {step !== "review" ? (
            <button
              onClick={() => setStep(steps[stepIdx + 1])}
              disabled={
                (step === "market" && !selectedMarket) ||
                (step === "product" && selectedProducts.length === 0) ||
                (step === "strategy" && !selectedStrategy)
              }
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 disabled:opacity-40"
              style={{background:"linear-gradient(135deg, #3b82f6, #2563eb)"}}>
              下一步 <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 flex items-center justify-center gap-2"
              style={{background:"linear-gradient(135deg, #22c55e, #16a34a)"}}>
              {submitting ? <><Sparkles className="w-4 h-4 animate-spin" />创建中...</> : <><Zap className="w-4 h-4" />启动多 Agent 计划</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────

export default function MarketExpansion() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen flex items-start justify-center sm:py-8" style={{background:"oklch(0.10 0.02 250)"}}>
      <div className="w-full sm:rounded-3xl sm:overflow-hidden sm:shadow-2xl flex flex-col"
        style={{background:"oklch(0.14 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)", maxWidth:"390px", minHeight:"100dvh"}}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-12 pb-4"
          style={{borderBottom:"1px solid oklch(1 0 0 / 8%)"}}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/phone")}
              className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{background:"oklch(0.22 0.02 250)"}}>
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>新市场开发</h1>
              <p className="text-xs text-slate-500">多 Agent 联动 · 全自动执行</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white active:scale-95 transition-all"
              style={{background:"linear-gradient(135deg, #3b82f6, #2563eb)"}}>
              <Plus className="w-3.5 h-3.5" />新建计划
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{scrollbarWidth:"none"}}>

          {/* 进行中的计划 */}
          {activeMarketPlans.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">进行中的计划</p>
              {activeMarketPlans.map(plan => <ActivePlanCard key={plan.id} plan={plan} />)}
            </div>
          )}

          {/* 多 Agent 说明 */}
          <div className="rounded-2xl p-4 mb-4"
            style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(0.50 0.10 250 / 20%)"}}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-white">多 Agent 协作机制</span>
            </div>
            <div className="space-y-3">
              {[
                { type: "research" as const, name: "调研 Agent", desc: "分析目标市场规模、主要采购商、竞品价格、政策环境" },
                { type: "content" as const, name: "内容 Agent", desc: "生成本地化产品介绍、LinkedIn 帖子、邮件模板" },
                { type: "outreach" as const, name: "外联 Agent", desc: "OpenClaw 执行 LinkedIn/Facebook 精准触达" },
                { type: "monitor" as const, name: "监控 Agent", desc: "每日追踪指标，生成战报，异常时通知老板" },
              ].map((a, i) => (
                <div key={a.name} className="flex items-start gap-3">
                  <AgentTypeIcon type={a.type} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="absolute ml-4 mt-8">
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-slate-500">各 Agent 按顺序自动触发，老板只需在关键节点审核输出内容</p>
            </div>
          </div>

          {/* 空状态引导 */}
          {activeMarketPlans.length === 0 && (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400 mb-1">还没有进行中的市场开发计划</p>
              <p className="text-xs text-slate-600 mb-4">创建计划后，多 Agent 将自动执行调研、内容生成和外联触达</p>
              <button onClick={() => setShowCreate(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95 transition-all"
                style={{background:"linear-gradient(135deg, #3b82f6, #2563eb)"}}>
                创建第一个市场开发计划
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateWizard onClose={() => setShowCreate(false)} />}
    </div>
  );
}
