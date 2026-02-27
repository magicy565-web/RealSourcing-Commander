/* ============================================================
   新产品发布向导
   DESIGN: Night Commander — 图片上传 + AI 内容生成 + 多平台发布
   Philosophy: 老板提供核心信息，AI 生成多语言内容，OpenClaw 执行发布
   ============================================================ */
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Plus, Image, Sparkles, Check,
  ChevronRight, Globe, Send, Eye, Edit3,
  Linkedin, Facebook, MessageSquare, X,
  Layers, Tag, DollarSign, Package, Clock,
  CheckCircle2, Zap, RefreshCw, Upload, FileImage
} from "lucide-react";
import { toast } from "sonner";

// ─── 类型 ─────────────────────────────────────────────────────

type LaunchStep = "info" | "images" | "generate" | "preview" | "publish";

interface PlatformContent {
  platform: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  body: string;
  hashtags: string[];
  selected: boolean;
}

// ─── 已发布产品 ───────────────────────────────────────────────

const publishedProducts = [
  {
    id: "p1",
    name: "太阳能组件 400W 单晶硅",
    publishedAt: "2026-02-20",
    platforms: ["LinkedIn", "Facebook", "TikTok"],
    status: "published",
    impressions: 2840,
    inquiries: 3,
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&q=80",
  },
  {
    id: "p2",
    name: "储能系统 10kWh 壁挂式",
    publishedAt: "2026-02-15",
    platforms: ["LinkedIn"],
    status: "published",
    impressions: 1240,
    inquiries: 1,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
  },
];

// ─── AI 生成的内容模板 ────────────────────────────────────────

function generateContent(productName: string, keyPoints: string[], targetMarket: string): PlatformContent[] {
  const pts = keyPoints.filter(Boolean).join(", ");
  return [
    {
      platform: "LinkedIn",
      icon: <Linkedin className="w-3.5 h-3.5" />,
      color: "#0a66c2",
      title: `Introducing Our ${productName}`,
      body: `We're excited to announce the launch of our latest ${productName}. ${pts ? `Key features: ${pts}.` : ""} Perfect for ${targetMarket || "global"} markets. Contact us for pricing and MOQ details.`,
      hashtags: ["#SolarEnergy", "#Renewable", "#B2B", "#Manufacturing"],
      selected: true,
    },
    {
      platform: "Facebook",
      icon: <Facebook className="w-3.5 h-3.5" />,
      color: "#1877f2",
      title: `🌟 New Product Launch: ${productName}`,
      body: `Exciting news! Our new ${productName} is now available. ${pts ? `Highlights: ${pts}.` : ""} DM us for wholesale pricing! 🏭`,
      hashtags: ["#NewProduct", "#Solar", "#Wholesale"],
      selected: true,
    },
    {
      platform: "TikTok",
      icon: <span className="text-xs font-bold" style={{color:"#fe2c55"}}>TK</span>,
      color: "#fe2c55",
      title: `${productName} - Factory Direct`,
      body: `Check out our new ${productName}! ${pts ? pts + "." : ""} Factory direct pricing. Comment "PRICE" for wholesale quote! 💡`,
      hashtags: ["#SolarPanel", "#FactoryDirect", "#FYP"],
      selected: false,
    },
    {
      platform: "WhatsApp",
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      color: "#25d366",
      title: `New Product: ${productName}`,
      body: `Hi! We just launched our new ${productName}. ${pts ? `Features: ${pts}.` : ""} Interested in pricing? Reply YES for our catalog.`,
      hashtags: [],
      selected: false,
    },
  ];
}

// ─── 创建向导 ─────────────────────────────────────────────────

function LaunchWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<LaunchStep>("info");
  const [productName, setProductName] = useState("");
  const [keyPoints, setKeyPoints] = useState(["", "", ""]);
  const [targetMarket, setTargetMarket] = useState("");
  const [moq, setMoq] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [contents, setContents] = useState<PlatformContent[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps: LaunchStep[] = ["info", "images", "generate", "preview", "publish"];
  const stepIdx = steps.indexOf(step);
  const stepLabels = { info: "产品信息", images: "产品图片", generate: "AI 生成", preview: "内容预览", publish: "发布确认" };

  function handleGenerate() {
    setGenerating(true);
    setTimeout(() => {
      setContents(generateContent(productName, keyPoints, targetMarket));
      setGenerating(false);
      setGenerated(true);
      setStep("preview");
    }, 2000);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    // 模拟上传，用 Unsplash 占位
    const placeholders = [
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&q=80",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
      "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=400&q=80",
    ];
    const newImages = Array.from(files).slice(0, 3 - images.length).map((_, i) =>
      placeholders[(images.length + i) % placeholders.length]
    );
    setImages(prev => [...prev, ...newImages]);
    toast.success(`已上传 ${newImages.length} 张图片`);
  }

  function handlePublish() {
    setPublishing(true);
    setTimeout(() => {
      const selectedPlatforms = contents.filter(c => c.selected).map(c => c.platform);
      toast.success(`已发布到 ${selectedPlatforms.join("、")}！OpenClaw 将在 30 分钟内完成发布`);
      onClose();
    }, 2000);
  }

  const canProceedInfo = productName.trim().length > 0 && keyPoints.some(p => p.trim().length > 0);
  const selectedCount = contents.filter(c => c.selected).length;

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
              <h2 className="text-base font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>发布新产品</h2>
              <p className="text-xs text-slate-500">{stepLabels[step]} · {stepIdx + 1}/{steps.length}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex gap-1 px-5 py-3">
            {steps.map((s, i) => (
              <div key={s} className="flex-1 h-1 rounded-full transition-all"
                style={{background: i <= stepIdx ? "#22c55e" : "oklch(0.25 0.02 250)"}} />
            ))}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{scrollbarWidth:"none"}}>

          {/* Step 1: 产品信息 */}
          {step === "info" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">填写产品核心信息，AI 将据此生成多语言营销内容</p>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">产品名称 *</label>
                <input className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{background:"oklch(0.22 0.02 250)", border:"1px solid oklch(1 0 0 / 12%)"}}
                  placeholder="如：太阳能组件 400W 单晶硅"
                  value={productName} onChange={e => setProductName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">核心卖点 * （最多 3 条）</label>
                {keyPoints.map((kp, i) => (
                  <input key={i}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none mb-2"
                    style={{background:"oklch(0.22 0.02 250)", border:"1px solid oklch(1 0 0 / 12%)"}}
                    placeholder={["如：转换效率 22.5%，行业领先", "如：25年质保，IEC 认证", "如：工厂直供，支持 OEM"][i]}
                    value={kp} onChange={e => setKeyPoints(prev => prev.map((p, j) => j === i ? e.target.value : p))} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">目标市场</label>
                  <input className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{background:"oklch(0.22 0.02 250)", border:"1px solid oklch(1 0 0 / 12%)"}}
                    placeholder="如：越南、印度"
                    value={targetMarket} onChange={e => setTargetMarket(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">MOQ</label>
                  <input className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{background:"oklch(0.22 0.02 250)", border:"1px solid oklch(1 0 0 / 12%)"}}
                    placeholder="如：100 件"
                    value={moq} onChange={e => setMoq(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">参考价格区间（可选）</label>
                <input className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{background:"oklch(0.22 0.02 250)", border:"1px solid oklch(1 0 0 / 12%)"}}
                  placeholder="如：$0.28 - $0.32 / W"
                  value={priceRange} onChange={e => setPriceRange(e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: 产品图片 */}
          {step === "images" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">上传产品图片（最多 3 张），将用于各平台发布</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={handleImageUpload} />
              <div className="grid grid-cols-3 gap-2 mb-4">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded bg-black/60 text-white">封面</span>
                    )}
                  </div>
                ))}
                {images.length < 3 && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
                    style={{background:"oklch(0.22 0.02 250)", border:"2px dashed oklch(0.35 0.02 250)"}}>
                    <Upload className="w-5 h-5 text-slate-500" />
                    <span className="text-xs text-slate-500">上传图片</span>
                  </button>
                )}
              </div>
              <div className="rounded-xl p-3 flex items-start gap-2.5"
                style={{background:"oklch(0.17 0.02 250)", border:"1px solid oklch(1 0 0 / 6%)"}}>
                <FileImage className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">图片将上传至 CDN，AI 生成内容时自动附带图片。建议使用白底产品图或实景安装图。</p>
              </div>
              {images.length === 0 && (
                <p className="text-xs text-slate-500 text-center mt-4">也可跳过此步骤，使用纯文字内容发布</p>
              )}
            </div>
          )}

          {/* Step 3: AI 生成 */}
          {step === "generate" && (
            <div className="text-center py-8">
              {!generating && !generated && (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{background:"linear-gradient(135deg, #8b5cf620, #3b82f620)"}}>
                    <Sparkles className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-base font-bold text-white mb-2">AI 内容生成</p>
                  <p className="text-sm text-slate-400 mb-6">将为 LinkedIn、Facebook、TikTok、WhatsApp 分别生成适配的营销内容</p>
                  <div className="rounded-xl p-4 text-left mb-6"
                    style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                    <p className="text-xs text-slate-500 mb-2">基于以下信息生成：</p>
                    <p className="text-sm font-semibold text-white mb-1">{productName}</p>
                    {keyPoints.filter(Boolean).map((kp, i) => (
                      <p key={i} className="text-xs text-slate-400">· {kp}</p>
                    ))}
                    {targetMarket && <p className="text-xs text-slate-400 mt-1">目标市场：{targetMarket}</p>}
                  </div>
                  <button onClick={handleGenerate}
                    className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 flex items-center justify-center gap-2"
                    style={{background:"linear-gradient(135deg, #8b5cf6, #6d28d9)"}}>
                    <Sparkles className="w-4 h-4" />开始 AI 生成
                  </button>
                </>
              )}
              {generating && (
                <div>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{background:"linear-gradient(135deg, #8b5cf620, #3b82f620)"}}>
                    <Sparkles className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                  <p className="text-base font-bold text-white mb-2">正在生成内容...</p>
                  <p className="text-sm text-slate-400">AI 正在为 4 个平台生成本地化营销内容</p>
                  <div className="mt-6 space-y-2">
                    {["分析产品卖点...", "生成英文文案...", "适配各平台格式...", "优化 Hashtag..."].map((t, i) => (
                      <div key={t} className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{animationDelay:`${i*0.3}s`}} />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: 内容预览 */}
          {step === "preview" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">选择要发布的平台，点击内容可编辑</p>
              <div className="space-y-3">
                {contents.map((c, i) => (
                  <div key={c.platform} className="rounded-xl overflow-hidden"
                    style={{background:"oklch(0.19 0.02 250)",
                      border:`1px solid ${c.selected ? c.color + "40" : "oklch(1 0 0 / 8%)"}`}}>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <button onClick={() => setContents(prev => prev.map((x, j) => j === i ? {...x, selected: !x.selected} : x))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={{background: c.selected ? c.color : "oklch(0.25 0.02 250)"}}>
                        {c.selected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{background:`${c.color}20`, color: c.color}}>
                        {c.icon}
                      </div>
                      <span className="text-sm font-semibold text-white flex-1">{c.platform}</span>
                      <button onClick={() => setEditingIdx(editingIdx === i ? null : i)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{background:"oklch(0.25 0.02 250)"}}>
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                    {(editingIdx === i || c.selected) && (
                      <div className="px-4 pb-4 border-t border-white/5">
                        <p className="text-xs font-semibold text-white mt-3 mb-1">{c.title}</p>
                        {editingIdx === i ? (
                          <textarea
                            className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none resize-none"
                            style={{background:"oklch(0.22 0.02 250)", border:"1px solid oklch(1 0 0 / 12%)"}}
                            rows={4}
                            value={c.body}
                            onChange={e => setContents(prev => prev.map((x, j) => j === i ? {...x, body: e.target.value} : x))}
                          />
                        ) : (
                          <p className="text-xs text-slate-400 leading-relaxed">{c.body}</p>
                        )}
                        {c.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {c.hashtags.map(h => (
                              <span key={h} className="text-xs px-2 py-0.5 rounded-full"
                                style={{background:`${c.color}15`, color: c.color}}>{h}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: 发布确认 */}
          {step === "publish" && (
            <div>
              <p className="text-sm text-slate-400 mb-4">确认发布计划，OpenClaw 将在 30 分钟内完成所有平台的发布</p>
              <div className="rounded-xl p-4 mb-4"
                style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                <div className="flex items-center gap-3 mb-3">
                  {images[0] && (
                    <img src={images[0]} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-white">{productName}</p>
                    <p className="text-xs text-slate-500">{keyPoints.filter(Boolean).length} 条卖点 · {images.length} 张图片</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {contents.filter(c => c.selected).map(c => (
                    <div key={c.platform} className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                      style={{background:"oklch(0.16 0.02 250)"}}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{background:`${c.color}20`, color: c.color}}>
                        {c.icon}
                      </div>
                      <span className="text-xs font-medium text-white flex-1">{c.platform}</span>
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-3 flex items-start gap-2.5"
                style={{background:"oklch(0.17 0.02 250)", border:"1px solid oklch(1 0 0 / 6%)"}}>
                <Zap className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">发布后，OpenClaw 将持续监控各平台的互动情况，询价评论将自动转入询盘管理</p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex-shrink-0 px-5 py-4 flex gap-3" style={{borderTop:"1px solid oklch(1 0 0 / 8%)"}}>
          {stepIdx > 0 && step !== "generate" && (
            <button onClick={() => setStep(steps[stepIdx - 1])}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 transition-all active:scale-98"
              style={{background:"oklch(0.22 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)"}}>
              上一步
            </button>
          )}
          {step === "info" && (
            <button onClick={() => setStep("images")} disabled={!canProceedInfo}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 disabled:opacity-40"
              style={{background:"linear-gradient(135deg, #22c55e, #16a34a)"}}>
              下一步 <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
          {step === "images" && (
            <button onClick={() => setStep("generate")}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98"
              style={{background:"linear-gradient(135deg, #22c55e, #16a34a)"}}>
              {images.length > 0 ? "下一步" : "跳过，继续"} <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
          {step === "generate" && !generating && !generated && null}
          {step === "preview" && (
            <button onClick={() => setStep("publish")} disabled={selectedCount === 0}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 disabled:opacity-40"
              style={{background:"linear-gradient(135deg, #22c55e, #16a34a)"}}>
              确认 {selectedCount} 个平台 <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
          {step === "publish" && (
            <button onClick={handlePublish} disabled={publishing}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-98 flex items-center justify-center gap-2"
              style={{background:"linear-gradient(135deg, #22c55e, #16a34a)"}}>
              {publishing ? <><Zap className="w-4 h-4 animate-spin" />发布中...</> : <><Send className="w-4 h-4" />立即发布</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────

export default function ProductLaunch() {
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
              <h1 className="text-base font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>新产品发布</h1>
              <p className="text-xs text-slate-500">AI 生成内容 · 多平台一键发布</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white active:scale-95 transition-all"
              style={{background:"linear-gradient(135deg, #22c55e, #16a34a)"}}>
              <Plus className="w-3.5 h-3.5" />发布新品
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{scrollbarWidth:"none"}}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">已发布产品</p>
          <div className="space-y-3">
            {publishedProducts.map(p => (
              <div key={p.id} className="rounded-2xl overflow-hidden"
                style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                <div className="flex gap-3 p-4">
                  <img src={p.image} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white mb-1 truncate">{p.name}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.platforms.map(pl => (
                        <span key={pl} className="text-xs px-1.5 py-0.5 rounded bg-white/8 text-slate-400">{pl}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.impressions.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{p.inquiries} 询盘</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 h-fit flex-shrink-0">已发布</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl p-4"
            style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(0.50 0.10 250 / 20%)"}}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-sm font-bold text-white">发布流程</span>
            </div>
            <div className="space-y-2">
              {[
                { step: "1", desc: "填写产品名称和核心卖点（3 个字段）" },
                { step: "2", desc: "上传产品图片（最多 3 张）" },
                { step: "3", desc: "AI 生成 4 平台本地化内容" },
                { step: "4", desc: "审核编辑，选择发布平台" },
                { step: "5", desc: "OpenClaw 执行发布，监控互动" },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{background:"#22c55e20"}}>
                    <span className="text-xs font-bold text-green-400">{s.step}</span>
                  </div>
                  <p className="text-xs text-slate-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCreate && <LaunchWizard onClose={() => setShowCreate(false)} />}
    </div>
  );
}
