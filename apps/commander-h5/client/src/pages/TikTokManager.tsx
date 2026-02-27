/**
 * TikTok 企业账号托管模块
 * Design: Dark command center, TikTok brand red accent (#fe2c55)
 * 业务边界：数据监控 + 评论管理（全人工审核）+ 高意向评论转询盘
 * 不含：私信回复、主动开发（需电脑端人工操作）
 */

import { useState, useEffect } from "react";
import {
  ArrowLeft, TrendingUp, TrendingDown, MessageCircle,
  Heart, Share2, Eye, Users, Play, BookmarkCheck,
  ChevronRight, ChevronDown, ChevronUp, Send,
  AlertCircle, Star, Check, X, RefreshCw,
  BarChart2, Clock, Zap, ExternalLink, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ─── 类型定义 ──────────────────────────────────────────────────

type CommentStatus = "pending" | "replied" | "transferred" | "ignored";
type CommentIntent = "inquiry" | "compliment" | "question" | "other";

interface TikTokComment {
  id: string;
  videoId: string;
  videoTitle: string;
  author: string;
  authorAvatar: string;
  country: string;
  flag: string;
  content: string;
  likeCount: number;
  postedAt: string;
  intent: CommentIntent;
  intentScore: number; // 0-100 询价意向评分
  status: CommentStatus;
  aiDraft?: string; // AI 起草的回复
  repliedAt?: string;
}

interface TikTokVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTime: number; // 平均观看时长（秒）
  completionRate: number; // 完播率 %
  engagementRate: number; // 互动率 %
  inquiryComments: number; // 询价评论数
}

// ─── Mock 数据 ─────────────────────────────────────────────────

const mockAccount = {
  name: "SunPower Solar Official",
  handle: "@sunpower_solar_b2b",
  avatar: "☀️",
  followers: 12840,
  followersGrowth: +234,
  verified: true,
  proxyNode: "US-Residential-07",
  sessionHealth: "healthy" as const,
};

const mockOverview = {
  period: "近 7 天",
  videoViews: 284600,
  videoViewsGrowth: +18.4,
  profileViews: 3210,
  profileViewsGrowth: +22.1,
  likes: 8940,
  likesGrowth: +12.3,
  comments: 412,
  commentsGrowth: +34.7,
  shares: 1230,
  sharesGrowth: +8.9,
  followers: 12840,
  followersGrowth: +234,
  avgWatchTime: 28.4,
  avgWatchTimeGrowth: +3.2,
  completionRate: 42.6,
  completionRateGrowth: +1.8,
  inquiryComments: 23,
  inquiryCommentsGrowth: +9,
};

const mockVideos: TikTokVideo[] = [
  {
    id: "v1",
    title: "400W Monocrystalline Solar Panel - Factory Tour",
    thumbnail: "🏭",
    publishedAt: "2天前",
    views: 84200,
    likes: 3120,
    comments: 156,
    shares: 420,
    saves: 890,
    watchTime: 32,
    completionRate: 48.2,
    engagementRate: 5.4,
    inquiryComments: 12,
  },
  {
    id: "v2",
    title: "How We Test Solar Panels Before Shipping",
    thumbnail: "🔬",
    publishedAt: "4天前",
    views: 62400,
    likes: 2340,
    comments: 98,
    shares: 310,
    saves: 560,
    watchTime: 41,
    completionRate: 55.8,
    engagementRate: 5.2,
    inquiryComments: 7,
  },
  {
    id: "v3",
    title: "Solar Installation in Vietnam - Customer Case",
    thumbnail: "🌏",
    publishedAt: "6天前",
    views: 138000,
    likes: 3480,
    comments: 158,
    shares: 500,
    saves: 1240,
    watchTime: 24,
    completionRate: 38.4,
    engagementRate: 3.9,
    inquiryComments: 4,
  },
];

const mockComments: TikTokComment[] = [
  {
    id: "c1",
    videoId: "v1",
    videoTitle: "400W Monocrystalline Solar Panel",
    author: "Ahmed Al-Rashid",
    authorAvatar: "🇸🇦",
    country: "沙特阿拉伯",
    flag: "🇸🇦",
    content: "What is the price for 500 units? We need FOB Shanghai quote. Our company is doing a large residential project.",
    likeCount: 3,
    postedAt: "2小时前",
    intent: "inquiry",
    intentScore: 94,
    status: "pending",
    aiDraft: "Hello Ahmed! Thank you for your interest in our 400W monocrystalline panels. For 500 units FOB Shanghai, we can offer a competitive price. Could you please share your project timeline and any specific certifications required? I'll have our sales team prepare a detailed quotation within 24 hours. Feel free to reach out via WhatsApp for faster communication: +86-XXX-XXXX-XXXX",
  },
  {
    id: "c2",
    videoId: "v1",
    videoTitle: "400W Monocrystalline Solar Panel",
    author: "Maria Santos",
    authorAvatar: "🇧🇷",
    country: "巴西",
    flag: "🇧🇷",
    content: "MOQ? And do you have INMETRO certification for Brazil market?",
    likeCount: 1,
    postedAt: "5小时前",
    intent: "inquiry",
    intentScore: 88,
    status: "pending",
    aiDraft: "Hi Maria! Our MOQ is 100 units for standard orders. Regarding INMETRO certification for the Brazilian market — we currently have IEC 61215 and IEC 61730 certifications. INMETRO is in progress and expected Q3 2026. Would you like to discuss your project requirements? We can arrange a sample shipment. Please DM us for detailed specs.",
  },
  {
    id: "c3",
    videoId: "v3",
    videoTitle: "Solar Installation in Vietnam",
    author: "Nguyen Van Minh",
    authorAvatar: "🇻🇳",
    country: "越南",
    flag: "🇻🇳",
    content: "How much for 200 panels? We are a solar installer in Ho Chi Minh City",
    likeCount: 2,
    postedAt: "1天前",
    intent: "inquiry",
    intentScore: 91,
    status: "pending",
    aiDraft: "Xin chào Minh! Great to connect with a solar installer in Ho Chi Minh City! For 200 panels, we offer very competitive pricing for the Vietnamese market. We've completed several projects in Vietnam and understand local requirements well. Please send us a DM with your specifications and we'll provide a detailed quote within 24 hours. 感谢您的关注！",
  },
  {
    id: "c4",
    videoId: "v2",
    videoTitle: "How We Test Solar Panels",
    author: "John Williams",
    authorAvatar: "🇦🇺",
    country: "澳大利亚",
    flag: "🇦🇺",
    content: "Impressive quality control! Do you ship to Australia? What's the warranty period?",
    likeCount: 5,
    postedAt: "1天前",
    intent: "inquiry",
    intentScore: 76,
    status: "pending",
    aiDraft: "Hi John! Yes, we ship to Australia regularly! Our panels come with a 25-year linear power output warranty and 12-year product warranty. We're familiar with Australian standards (AS/NZS 5033). Shipping to major Australian ports takes approximately 18-22 days. Would you like a sample to test first? Feel free to DM us for pricing details!",
  },
  {
    id: "c5",
    videoId: "v1",
    videoTitle: "400W Monocrystalline Solar Panel",
    author: "Klaus Müller",
    authorAvatar: "🇩🇪",
    country: "德国",
    flag: "🇩🇪",
    content: "Very professional video. What efficiency rating are these panels?",
    likeCount: 8,
    postedAt: "2天前",
    intent: "question",
    intentScore: 45,
    status: "replied",
    repliedAt: "1天前",
    aiDraft: "Hallo Klaus! Our 400W monocrystalline panels achieve 21.3% efficiency with PERC technology. They meet IEC 61215 and IEC 61730 standards. Feel free to download our full technical datasheet from our bio link!",
  },
  {
    id: "c6",
    videoId: "v3",
    videoTitle: "Solar Installation in Vietnam",
    author: "Priya Sharma",
    authorAvatar: "🇮🇳",
    country: "印度",
    flag: "🇮🇳",
    content: "Amazing work! Keep it up 👍",
    likeCount: 2,
    postedAt: "3天前",
    intent: "compliment",
    intentScore: 8,
    status: "replied",
    repliedAt: "2天前",
  },
];

// ─── 工具函数 ──────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function GrowthBadge({ value, unit = "" }: { value: number; unit?: string }) {
  const isPos = value >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isPos ? "text-emerald-400" : "text-red-400"}`}>
      {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPos ? "+" : ""}{value}{unit}
    </span>
  );
}

function IntentBadge({ intent, score }: { intent: CommentIntent; score: number }) {
  const config = {
    inquiry: { label: "询价", color: "#fe2c55", bg: "#fe2c5520" },
    question: { label: "咨询", color: "#f97316", bg: "#f9731620" },
    compliment: { label: "好评", color: "#10b981", bg: "#10b98120" },
    other: { label: "其他", color: "#64748b", bg: "#64748b20" },
  };
  const c = config[intent];
  return (
    <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
      style={{ color: c.color, background: c.bg }}>
      {intent === "inquiry" && <Zap className="w-2.5 h-2.5" />}
      {c.label}
      {intent === "inquiry" && <span className="font-mono">{score}</span>}
    </span>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────

export default function TikTokManager() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "videos" | "comments">("overview");
  const [comments, setComments] = useState<TikTokComment[]>(mockComments);
  const [selectedComment, setSelectedComment] = useState<TikTokComment | null>(null);
  const [commentFilter, setCommentFilter] = useState<"all" | "pending" | "inquiry">("pending");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pendingInquiries = comments.filter(c => c.status === "pending" && c.intent === "inquiry").length;
  const pendingAll = comments.filter(c => c.status === "pending").length;

  const filteredComments = comments.filter(c => {
    if (commentFilter === "pending") return c.status === "pending";
    if (commentFilter === "inquiry") return c.intent === "inquiry";
    return true;
  });

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success("数据已刷新", { description: "最后同步：刚刚" });
    }, 1500);
  };

  const handleReply = (comment: TikTokComment) => {
    if (!replyText.trim()) { toast.error("请填写回复内容"); return; }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setComments(prev => prev.map(c =>
        c.id === comment.id ? { ...c, status: "replied", repliedAt: "刚刚" } : c
      ));
      setSelectedComment(null);
      setReplyText("");
      toast.success("回复已发出", { description: "OpenClaw 已以您的账号发布评论回复" });
    }, 1500);
  };

  const handleTransferToInquiry = (comment: TikTokComment) => {
    setComments(prev => prev.map(c =>
      c.id === comment.id ? { ...c, status: "transferred" } : c
    ));
    setSelectedComment(null);
    toast.success("已转入询盘管理", {
      description: `来自 ${comment.author} 的询价评论已创建询盘记录`,
    });
  };

  const handleIgnore = (comment: TikTokComment) => {
    setComments(prev => prev.map(c =>
      c.id === comment.id ? { ...c, status: "ignored" } : c
    ));
    if (selectedComment?.id === comment.id) setSelectedComment(null);
    toast.info("已忽略该评论");
  };

  // 打开评论详情时预填 AI 草稿
  const openComment = (comment: TikTokComment) => {
    setSelectedComment(comment);
    setReplyText(comment.aiDraft || "");
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(0.13 0.02 250)", color: "white" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 flex-shrink-0">
        <button onClick={() => navigate("/phone")}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 active:scale-90 transition-transform">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎵</span>
            <p className="text-sm font-bold text-white truncate">{mockAccount.name}</p>
            {mockAccount.verified && (
              <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "#fe2c55" }}>
                <Check className="w-2.5 h-2.5 text-white" />
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{mockAccount.handle}</p>
        </div>
        <button onClick={handleRefresh}
          className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/10 active:scale-90 transition-transform ${refreshing ? "animate-spin" : ""}`}>
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* 账号健康状态条 */}
      <div className="mx-4 mb-3 px-3 py-2 rounded-xl flex items-center gap-3 flex-shrink-0"
        style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">账号正常</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <span className="text-xs text-slate-500">代理节点: {mockAccount.proxyNode}</span>
        <div className="ml-auto flex items-center gap-1">
          {pendingInquiries > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "#fe2c5520", color: "#fe2c55" }}>
              {pendingInquiries} 条询价待处理
            </span>
          )}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="mx-4 mb-3 flex rounded-xl p-0.5 flex-shrink-0"
        style={{ background: "oklch(0.18 0.02 250)" }}>
        {[
          { key: "overview", label: "数据概览" },
          { key: "videos", label: "视频列表" },
          { key: "comments", label: `评论管理${pendingAll > 0 ? ` (${pendingAll})` : ""}` },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto pb-6" style={{ scrollbarWidth: "none" }}>

        {/* ── 数据概览 ── */}
        {activeTab === "overview" && (
          <div className="px-4 space-y-3">
            {/* 粉丝数 */}
            <div className="p-4 rounded-2xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid #fe2c5530" }}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-xs text-slate-500 mb-1">粉丝数</p>
                  <p className="text-3xl font-bold text-white font-mono">{formatNumber(mockOverview.followers)}</p>
                </div>
                <div className="text-right">
                  <GrowthBadge value={mockOverview.followersGrowth} />
                  <p className="text-xs text-slate-600 mt-0.5">{mockOverview.period}</p>
                </div>
              </div>
              <div className="h-1 rounded-full mt-3" style={{ background: "oklch(1 0 0 / 8%)" }}>
                <div className="h-full rounded-full" style={{ width: "68%", background: "#fe2c55" }} />
              </div>
              <p className="text-xs text-slate-600 mt-1">距离下一个里程碑（15K）还差 2,160</p>
            </div>

            {/* 核心指标 2x3 网格 */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "视频播放量", value: formatNumber(mockOverview.videoViews), growth: mockOverview.videoViewsGrowth, unit: "%", icon: <Play className="w-3.5 h-3.5" />, color: "#fe2c55" },
                { label: "主页访问量", value: formatNumber(mockOverview.profileViews), growth: mockOverview.profileViewsGrowth, unit: "%", icon: <Eye className="w-3.5 h-3.5" />, color: "#f97316" },
                { label: "点赞数", value: formatNumber(mockOverview.likes), growth: mockOverview.likesGrowth, unit: "%", icon: <Heart className="w-3.5 h-3.5" />, color: "#ec4899" },
                { label: "评论数", value: formatNumber(mockOverview.comments), growth: mockOverview.commentsGrowth, unit: "%", icon: <MessageCircle className="w-3.5 h-3.5" />, color: "#8b5cf6" },
                { label: "分享数", value: formatNumber(mockOverview.shares), growth: mockOverview.sharesGrowth, unit: "%", icon: <Share2 className="w-3.5 h-3.5" />, color: "#06b6d4" },
                { label: "询价评论", value: mockOverview.inquiryComments.toString(), growth: mockOverview.inquiryCommentsGrowth, unit: "条", icon: <Zap className="w-3.5 h-3.5" />, color: "#fe2c55" },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                  <div className="flex items-center gap-1.5 mb-2" style={{ color: m.color }}>
                    {m.icon}
                    <span className="text-xs text-slate-500">{m.label}</span>
                  </div>
                  <p className="text-xl font-bold text-white font-mono">{m.value}</p>
                  <GrowthBadge value={m.growth} unit={m.unit} />
                </div>
              ))}
            </div>

            {/* 内容质量指标 */}
            <div className="p-4 rounded-2xl space-y-3" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <p className="text-xs text-slate-500 font-medium">内容质量指标</p>
              {[
                { label: "平均观看时长", value: `${mockOverview.avgWatchTime}s`, growth: mockOverview.avgWatchTimeGrowth, unit: "s", desc: "行业均值 22s", pct: 72 },
                { label: "完播率", value: `${mockOverview.completionRate}%`, growth: mockOverview.completionRateGrowth, unit: "%", desc: "行业均值 35%", pct: mockOverview.completionRate },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">{m.label}</span>
                    <div className="flex items-center gap-2">
                      <GrowthBadge value={m.growth} unit={m.unit} />
                      <span className="text-sm font-bold text-white font-mono">{m.value}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "oklch(1 0 0 / 8%)" }}>
                    <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: "#fe2c55" }} />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{m.desc}</p>
                </div>
              ))}
            </div>

            {/* 询价转化漏斗 */}
            <div className="p-4 rounded-2xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid #fe2c5530" }}>
              <p className="text-xs text-slate-500 mb-3 font-medium">询价转化漏斗（近 7 天）</p>
              {[
                { label: "视频播放", value: 284600, pct: 100, color: "#64748b" },
                { label: "主页访问", value: 3210, pct: 1.1, color: "#f97316" },
                { label: "评论互动", value: 412, pct: 0.14, color: "#8b5cf6" },
                { label: "询价评论", value: 23, pct: 0.008, color: "#fe2c55" },
              ].map((f, i) => (
                <div key={f.label} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-slate-500 w-16 text-right">{f.label}</span>
                  <div className="flex-1 h-5 rounded-lg overflow-hidden" style={{ background: "oklch(1 0 0 / 6%)" }}>
                    <div className="h-full rounded-lg flex items-center px-2"
                      style={{ width: `${Math.max(f.pct * 90, 8)}%`, background: f.color + "60" }}>
                      <span className="text-xs font-mono text-white">{formatNumber(f.value)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 视频列表 ── */}
        {activeTab === "videos" && (
          <div className="px-4 space-y-3">
            {mockVideos.map(video => (
              <div key={video.id} className="rounded-2xl overflow-hidden"
                style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: "oklch(0.20 0.02 250)" }}>
                      {video.thumbnail}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-tight mb-1 line-clamp-2">{video.title}</p>
                      <p className="text-xs text-slate-500">{video.publishedAt}</p>
                    </div>
                    {video.inquiryComments > 0 && (
                      <span className="flex-shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "#fe2c5520", color: "#fe2c55" }}>
                        <Zap className="w-2.5 h-2.5" />{video.inquiryComments}
                      </span>
                    )}
                  </div>

                  {/* 核心数据 */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { icon: <Play className="w-3 h-3" />, value: formatNumber(video.views), label: "播放" },
                      { icon: <Heart className="w-3 h-3" />, value: formatNumber(video.likes), label: "点赞" },
                      { icon: <MessageCircle className="w-3 h-3" />, value: formatNumber(video.comments), label: "评论" },
                      { icon: <Share2 className="w-3 h-3" />, value: formatNumber(video.shares), label: "分享" },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <div className="flex items-center justify-center gap-0.5 text-slate-500 mb-0.5">{m.icon}</div>
                        <p className="text-sm font-bold text-white font-mono">{m.value}</p>
                        <p className="text-xs text-slate-600">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* 质量指标 */}
                  <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-400">均看 {video.watchTime}s</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BarChart2 className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-400">完播 {video.completionRate}%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-400">互动 {video.engagementRate}%</span>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <BookmarkCheck className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-400">{formatNumber(video.saves)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 评论管理 ── */}
        {activeTab === "comments" && (
          <div className="px-4 space-y-3">
            {/* 筛选 */}
            <div className="flex gap-2">
              {[
                { key: "pending", label: "待处理" },
                { key: "inquiry", label: "询价评论" },
                { key: "all", label: "全部" },
              ].map(f => (
                <button key={f.key}
                  onClick={() => setCommentFilter(f.key as typeof commentFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    commentFilter === f.key
                      ? "text-white"
                      : "text-slate-500 bg-white/5"
                  }`}
                  style={commentFilter === f.key ? { background: "#fe2c55" } : {}}>
                  {f.label}
                </button>
              ))}
            </div>

            {filteredComments.length === 0 && (
              <div className="py-12 text-center">
                <MessageCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">暂无符合条件的评论</p>
              </div>
            )}

            {filteredComments.map(comment => (
              <div key={comment.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "oklch(0.17 0.02 250)",
                  border: `1px solid ${comment.intent === "inquiry" && comment.status === "pending" ? "#fe2c5540" : "oklch(1 0 0 / 8%)"}`,
                }}>
                <div className="p-4">
                  {/* 评论头部 */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: "oklch(0.22 0.02 250)" }}>
                      {comment.authorAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-white">{comment.author}</p>
                        <span className="text-xs text-slate-600">{comment.flag} {comment.country}</span>
                      </div>
                      <p className="text-xs text-slate-500">{comment.videoTitle} · {comment.postedAt}</p>
                    </div>
                    <IntentBadge intent={comment.intent} score={comment.intentScore} />
                  </div>

                  {/* 评论内容 */}
                  <p className="text-sm text-slate-300 leading-relaxed mb-3 pl-11">{comment.content}</p>

                  {/* 状态和操作 */}
                  {comment.status === "pending" ? (
                    <div className="pl-11 flex gap-2">
                      <button onClick={() => openComment(comment)}
                        className="flex-1 py-2 rounded-lg text-xs font-medium text-white active:scale-95 transition-all"
                        style={{ background: "#fe2c55" }}>
                        回复
                      </button>
                      {comment.intent === "inquiry" && (
                        <button onClick={() => handleTransferToInquiry(comment)}
                          className="flex-1 py-2 rounded-lg text-xs font-medium text-orange-400 border border-orange-500/30 active:scale-95">
                          转询盘
                        </button>
                      )}
                      <button onClick={() => handleIgnore(comment)}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-slate-500 border border-white/10 active:scale-95">
                        忽略
                      </button>
                    </div>
                  ) : (
                    <div className="pl-11">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        comment.status === "replied" ? "text-emerald-400 bg-emerald-500/10" :
                        comment.status === "transferred" ? "text-orange-400 bg-orange-500/10" :
                        "text-slate-500 bg-white/5"
                      }`}>
                        {comment.status === "replied" ? `✓ 已回复 ${comment.repliedAt || ""}` :
                         comment.status === "transferred" ? "→ 已转入询盘" : "已忽略"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 评论回复抽屉 */}
      {selectedComment && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "oklch(0 0 0 / 60%)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedComment(null); }}>
          <div className="rounded-t-3xl overflow-hidden flex flex-col max-h-[85vh]"
            style={{ background: "oklch(0.16 0.02 250)" }}>
            {/* 抽屉 Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/8 flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-white">回复评论</p>
                <p className="text-xs text-slate-500">{selectedComment.author} · {selectedComment.flag}</p>
              </div>
              <button onClick={() => setSelectedComment(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "none" }}>
              {/* 原评论 */}
              <div className="p-3 rounded-xl" style={{ background: "oklch(0.20 0.02 250)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{selectedComment.authorAvatar}</span>
                  <span className="text-xs font-semibold text-white">{selectedComment.author}</span>
                  <IntentBadge intent={selectedComment.intent} score={selectedComment.intentScore} />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{selectedComment.content}</p>
              </div>

              {/* AI 草稿说明 */}
              {selectedComment.aiDraft && (
                <div className="flex items-center gap-2 px-1">
                  <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: "#fe2c5520" }}>
                    <Zap className="w-2.5 h-2.5" style={{ color: "#fe2c55" }} />
                  </span>
                  <p className="text-xs text-slate-500">AI 已根据询价意图起草回复，请审核后发出</p>
                </div>
              )}

              {/* 回复编辑框 */}
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="输入回复内容（英文）..."
                rows={6}
                className="w-full p-3 rounded-xl text-sm text-white placeholder-slate-600 resize-none outline-none"
                style={{ background: "oklch(0.20 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)" }}
              />

              {/* 字数 */}
              <p className="text-xs text-slate-600 text-right">{replyText.length} / 150 字符</p>
            </div>

            {/* 操作按钮 */}
            <div className="px-4 pb-6 pt-3 flex gap-2 flex-shrink-0 border-t border-white/8">
              {selectedComment.intent === "inquiry" && (
                <button onClick={() => handleTransferToInquiry(selectedComment)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-orange-400 border border-orange-500/30 active:scale-95">
                  转入询盘
                </button>
              )}
              <button onClick={() => handleReply(selectedComment)}
                disabled={sending || !replyText.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                style={{ background: sending ? "#fe2c5580" : "#fe2c55" }}>
                {sending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />发送中...</>
                ) : (
                  <><Send className="w-4 h-4" />确认发出</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
