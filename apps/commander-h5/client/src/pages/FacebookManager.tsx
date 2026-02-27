/**
 * Facebook/Meta 个人主页托管模块
 * Design: Dark command center, Facebook blue accent (#1877f2)
 * 业务边界：私信买家开发 + 评论回复 + 账号健康/操作额度监控
 * 全部操作需人工审核，私信回复可开启全自动
 * 公司主页托管：待开发状态
 */

import { useState } from "react";
import {
  ArrowLeft, MessageCircle, Heart, Users, Eye,
  Send, X, RefreshCw, Check, AlertCircle,
  Shield, Zap, Clock, TrendingUp, ChevronRight,
  UserPlus, Building2, Lock, Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ─── 类型定义 ──────────────────────────────────────────────────

type MessageStatus = "pending" | "replied" | "ignored";
type MessageIntent = "inquiry" | "connection" | "other";
type AccountHealth = "healthy" | "warning" | "restricted";

interface FBMessage {
  id: string;
  sender: string;
  senderAvatar: string;
  country: string;
  flag: string;
  platform: "messenger" | "comment";
  content: string;
  postedAt: string;
  intent: MessageIntent;
  intentScore: number;
  status: MessageStatus;
  aiDraft?: string;
  autoReply?: boolean;
}

// ─── Mock 数据 ─────────────────────────────────────────────────

const mockAccount = {
  name: "张伟 · 太阳能出口",
  handle: "zhangwei.solar.export",
  avatar: "👨‍💼",
  friends: 2840,
  followers: 1230,
  health: "healthy" as AccountHealth,
  proxyNode: "SG-Residential-03",
  sessionStatus: "active",
  todayOps: 14,
  dailyLimit: 20,
  msgOps: 8,
  msgLimit: 15,
  lastSync: "3分钟前",
};

const mockMessages: FBMessage[] = [
  {
    id: "m1",
    sender: "Carlos Mendez",
    senderAvatar: "🇲🇽",
    country: "墨西哥",
    flag: "🇲🇽",
    platform: "messenger",
    content: "Hi, I saw your post about solar panels. We are a distributor in Mexico looking for a reliable supplier. Can you share your product catalog and pricing?",
    postedAt: "1小时前",
    intent: "inquiry",
    intentScore: 92,
    status: "pending",
    aiDraft: "Hello Carlos! Thank you for reaching out. We're a leading solar panel manufacturer with 15+ years of experience exporting to Latin America. I'd be happy to share our product catalog and pricing. Could you tell me more about your typical order volume and the panel specifications you're looking for? This will help me prepare the most relevant information for you.",
  },
  {
    id: "m2",
    sender: "Fatima Al-Hassan",
    senderAvatar: "🇦🇪",
    country: "阿联酋",
    flag: "🇦🇪",
    platform: "messenger",
    content: "Hello, we are interested in your 400W panels for a commercial project in Dubai. What is your best price for 1000 units?",
    postedAt: "3小时前",
    intent: "inquiry",
    intentScore: 96,
    status: "pending",
    aiDraft: "Hello Fatima! A 1000-unit commercial project in Dubai — that's exactly the scale we specialize in. For this quantity, we can offer very competitive FOB pricing. Our 400W monocrystalline panels are certified for Middle East climate conditions (high temperature tolerance, anti-PID). Could you share your project timeline? I'll have our export team prepare a formal quotation within 24 hours.",
  },
  {
    id: "m3",
    sender: "Robert Johnson",
    senderAvatar: "🇬🇧",
    country: "英国",
    flag: "🇬🇧",
    platform: "comment",
    content: "Great post! What certifications do your panels have for the UK market?",
    postedAt: "5小时前",
    intent: "inquiry",
    intentScore: 68,
    status: "pending",
    aiDraft: "Hi Robert! Our panels hold IEC 61215, IEC 61730, and MCS certification for the UK market. We also comply with the latest UK WEEE regulations. Feel free to DM us for the full certification list and technical datasheets!",
  },
  {
    id: "m4",
    sender: "Ana Lima",
    senderAvatar: "🇧🇷",
    country: "巴西",
    flag: "🇧🇷",
    platform: "messenger",
    content: "Olá! Vocês têm representante no Brasil? Preciso de painéis para um projeto residencial.",
    postedAt: "1天前",
    intent: "inquiry",
    intentScore: 74,
    status: "replied",
    aiDraft: "Olá Ana! Sim, trabalhamos com distribuidores no Brasil. Para projetos residenciais, nossos painéis de 400W são uma excelente escolha. Poderia me informar a potência total necessária do projeto? Assim posso indicar o modelo mais adequado e conectá-la com nosso parceiro local.",
  },
  {
    id: "m5",
    sender: "Thomas Becker",
    senderAvatar: "🇩🇪",
    country: "德国",
    flag: "🇩🇪",
    platform: "messenger",
    content: "Interessante Produkte. Haben Sie Referenzen für den deutschen Markt?",
    postedAt: "2天前",
    intent: "connection",
    intentScore: 42,
    status: "replied",
  },
];

// ─── 工具函数 ──────────────────────────────────────────────────

function HealthBadge({ health }: { health: AccountHealth }) {
  const config = {
    healthy: { label: "账号正常", color: "#10b981", dot: "bg-emerald-400" },
    warning: { label: "风险警告", color: "#f97316", dot: "bg-orange-400" },
    restricted: { label: "功能受限", color: "#ef4444", dot: "bg-red-400" },
  };
  const c = config[health];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} />
      <span className="text-xs font-medium" style={{ color: c.color }}>{c.label}</span>
    </div>
  );
}

function IntentBadge({ intent, score }: { intent: MessageIntent; score: number }) {
  const config = {
    inquiry: { label: "询价", color: "#1877f2", bg: "#1877f220" },
    connection: { label: "建联", color: "#8b5cf6", bg: "#8b5cf620" },
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

export default function FacebookManager() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "messages" | "settings">("overview");
  const [messages, setMessages] = useState<FBMessage[]>(mockMessages);
  const [selectedMsg, setSelectedMsg] = useState<FBMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [msgFilter, setMsgFilter] = useState<"all" | "pending" | "inquiry">("pending");

  const pendingCount = messages.filter(m => m.status === "pending").length;
  const pendingInquiries = messages.filter(m => m.status === "pending" && m.intent === "inquiry").length;

  const filteredMessages = messages.filter(m => {
    if (msgFilter === "pending") return m.status === "pending";
    if (msgFilter === "inquiry") return m.intent === "inquiry";
    return true;
  });

  const handleReply = (msg: FBMessage) => {
    if (!replyText.trim()) { toast.error("请填写回复内容"); return; }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, status: "replied" } : m
      ));
      setSelectedMsg(null);
      setReplyText("");
      toast.success("回复已发出", {
        description: `OpenClaw 已以 ${mockAccount.name} 的账号发送私信`,
      });
    }, 1600);
  };

  const handleTransferToInquiry = (msg: FBMessage) => {
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, status: "replied" } : m
    ));
    setSelectedMsg(null);
    toast.success("已转入询盘管理", {
      description: `来自 ${msg.sender} 的消息已创建询盘记录`,
    });
  };

  const handleIgnore = (msg: FBMessage) => {
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, status: "ignored" } : m
    ));
    if (selectedMsg?.id === msg.id) setSelectedMsg(null);
    toast.info("已忽略");
  };

  const openMsg = (msg: FBMessage) => {
    setSelectedMsg(msg);
    setReplyText(msg.aiDraft || "");
  };

  // 操作额度进度条颜色
  const opsUsedPct = (mockAccount.todayOps / mockAccount.dailyLimit) * 100;
  const msgUsedPct = (mockAccount.msgOps / mockAccount.msgLimit) * 100;
  const opsColor = opsUsedPct > 80 ? "#ef4444" : opsUsedPct > 60 ? "#f97316" : "#1877f2";

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
            <span className="text-lg">📘</span>
            <p className="text-sm font-bold text-white truncate">{mockAccount.name}</p>
          </div>
          <p className="text-xs text-slate-500">{mockAccount.handle}</p>
        </div>
        <HealthBadge health={mockAccount.health} />
      </div>

      {/* 操作额度状态条 */}
      <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl flex-shrink-0"
        style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">今日安全操作额度</span>
          </div>
          <span className="text-xs font-mono" style={{ color: opsColor }}>
            {mockAccount.todayOps} / {mockAccount.dailyLimit}
          </span>
        </div>
        <div className="h-1.5 rounded-full mb-2" style={{ background: "oklch(1 0 0 / 8%)" }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${opsUsedPct}%`, background: opsColor }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600">私信 {mockAccount.msgOps}/{mockAccount.msgLimit}</span>
            <span className="text-xs text-slate-600">代理: {mockAccount.proxyNode}</span>
          </div>
          <span className="text-xs text-slate-600">同步: {mockAccount.lastSync}</span>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="mx-4 mb-3 flex rounded-xl p-0.5 flex-shrink-0"
        style={{ background: "oklch(0.18 0.02 250)" }}>
        {[
          { key: "overview", label: "账号概览" },
          { key: "messages", label: `消息管理${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
          { key: "settings", label: "托管设置" },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === tab.key ? "text-white shadow-sm" : "text-slate-400"
            }`}
            style={activeTab === tab.key ? { background: "#1877f2" } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto pb-6" style={{ scrollbarWidth: "none" }}>

        {/* ── 账号概览 ── */}
        {activeTab === "overview" && (
          <div className="px-4 space-y-3">
            {/* 核心数据 */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "好友数", value: mockAccount.friends.toLocaleString(), icon: <Users className="w-4 h-4" />, color: "#1877f2" },
                { label: "主页关注者", value: mockAccount.followers.toLocaleString(), icon: <Eye className="w-4 h-4" />, color: "#8b5cf6" },
                { label: "待处理消息", value: pendingCount.toString(), icon: <MessageCircle className="w-4 h-4" />, color: "#f97316" },
                { label: "待处理询价", value: pendingInquiries.toString(), icon: <Zap className="w-4 h-4" />, color: "#1877f2" },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                  <div className="flex items-center gap-1.5 mb-2" style={{ color: m.color }}>
                    {m.icon}
                    <span className="text-xs text-slate-500">{m.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white font-mono">{m.value}</p>
                </div>
              ))}
            </div>

            {/* 今日 OpenClaw 操作摘要 */}
            <div className="p-4 rounded-2xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid #1877f230" }}>
              <p className="text-xs text-slate-500 mb-3 font-medium">今日 OpenClaw 操作记录</p>
              <div className="space-y-2">
                {[
                  { time: "09:12", action: "发送私信给 Carlos Mendez (墨西哥)", type: "msg", status: "done" },
                  { time: "10:34", action: "回复评论：Robert Johnson 关于认证问题", type: "comment", status: "done" },
                  { time: "11:20", action: "发送私信给 Fatima Al-Hassan (阿联酋)", type: "msg", status: "done" },
                  { time: "14:05", action: "监控到 3 条新询价私信", type: "monitor", status: "alert" },
                  { time: "待执行", action: "自动跟进：Ana Lima 48h 未回复", type: "followup", status: "pending" },
                ].map((log, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xs text-slate-600 w-12 flex-shrink-0 pt-0.5 font-mono">{log.time}</span>
                    <div className="flex items-start gap-2 flex-1">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        log.status === "done" ? "bg-emerald-400" :
                        log.status === "alert" ? "bg-orange-400" :
                        "bg-slate-600"
                      }`} />
                      <p className="text-xs text-slate-400 leading-relaxed">{log.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 公司主页托管 - 待开发 */}
            <div className="p-4 rounded-2xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "oklch(0.22 0.02 250)" }}>
                  <Building2 className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">公司主页托管</p>
                  <p className="text-xs text-slate-500">Facebook Page 自动化运营</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full text-slate-500 border border-white/10">
                  开发中
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                包含：主页内容发布、广告受众管理、主页私信自动化、粉丝增长分析。需要 Facebook Business Manager 权限。
              </p>
            </div>
          </div>
        )}

        {/* ── 消息管理 ── */}
        {activeTab === "messages" && (
          <div className="px-4 space-y-3">
            {/* 自动回复开关 */}
            <div className="p-3 rounded-xl flex items-center justify-between"
              style={{ background: "oklch(0.17 0.02 250)", border: `1px solid ${autoReplyEnabled ? "#1877f240" : "oklch(1 0 0 / 8%)"}` }}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: autoReplyEnabled ? "#1877f2" : "#64748b" }} />
                <div>
                  <p className="text-xs font-semibold text-white">私信全自动回复</p>
                  <p className="text-xs text-slate-500">开启后 OpenClaw 自动发送 AI 草稿，无需审核</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAutoReplyEnabled(!autoReplyEnabled);
                  toast(autoReplyEnabled ? "已关闭自动回复" : "已开启自动回复", {
                    description: autoReplyEnabled ? "切换为人工审核模式" : "⚠️ OpenClaw 将自动发送私信，请确认风险",
                  });
                }}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${autoReplyEnabled ? "" : "bg-white/10"}`}
                style={autoReplyEnabled ? { background: "#1877f2" } : {}}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${autoReplyEnabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>

            {/* 筛选 */}
            <div className="flex gap-2">
              {[
                { key: "pending", label: "待处理" },
                { key: "inquiry", label: "询价" },
                { key: "all", label: "全部" },
              ].map(f => (
                <button key={f.key}
                  onClick={() => setMsgFilter(f.key as typeof msgFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    msgFilter === f.key ? "text-white" : "text-slate-500 bg-white/5"
                  }`}
                  style={msgFilter === f.key ? { background: "#1877f2" } : {}}>
                  {f.label}
                </button>
              ))}
            </div>

            {filteredMessages.length === 0 && (
              <div className="py-12 text-center">
                <MessageCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">暂无符合条件的消息</p>
              </div>
            )}

            {filteredMessages.map(msg => (
              <div key={msg.id} className="rounded-2xl overflow-hidden"
                style={{
                  background: "oklch(0.17 0.02 250)",
                  border: `1px solid ${msg.intent === "inquiry" && msg.status === "pending" ? "#1877f240" : "oklch(1 0 0 / 8%)"}`,
                }}>
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: "oklch(0.22 0.02 250)" }}>
                      {msg.senderAvatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-white">{msg.sender}</p>
                        <span className="text-xs text-slate-600">{msg.flag} {msg.country}</span>
                        <span className="text-xs text-slate-600">
                          {msg.platform === "messenger" ? "📨 私信" : "💬 评论"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{msg.postedAt}</p>
                    </div>
                    <IntentBadge intent={msg.intent} score={msg.intentScore} />
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed mb-3 pl-11 line-clamp-3">{msg.content}</p>

                  {msg.status === "pending" ? (
                    <div className="pl-11 flex gap-2">
                      <button onClick={() => openMsg(msg)}
                        className="flex-1 py-2 rounded-lg text-xs font-medium text-white active:scale-95 transition-all"
                        style={{ background: "#1877f2" }}>
                        回复
                      </button>
                      {msg.intent === "inquiry" && (
                        <button onClick={() => handleTransferToInquiry(msg)}
                          className="flex-1 py-2 rounded-lg text-xs font-medium text-orange-400 border border-orange-500/30 active:scale-95">
                          转询盘
                        </button>
                      )}
                      <button onClick={() => handleIgnore(msg)}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-slate-500 border border-white/10 active:scale-95">
                        忽略
                      </button>
                    </div>
                  ) : (
                    <div className="pl-11">
                      <span className="text-xs px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10">
                        ✓ 已回复
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 托管设置 ── */}
        {activeTab === "settings" && (
          <div className="px-4 space-y-3">
            {/* 安全设置 */}
            <div className="p-4 rounded-2xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <p className="text-xs text-slate-500 mb-3 font-medium">安全与风控</p>
              <div className="space-y-3">
                {[
                  { label: "每日私信上限", value: "15 条", icon: <MessageCircle className="w-4 h-4" />, color: "#1877f2" },
                  { label: "每日总操作上限", value: "20 次", icon: <Shield className="w-4 h-4" />, color: "#10b981" },
                  { label: "操作间隔随机化", value: "30-90 秒", icon: <Clock className="w-4 h-4" />, color: "#f97316" },
                  { label: "代理节点", value: mockAccount.proxyNode, icon: <Wifi className="w-4 h-4" />, color: "#8b5cf6" },
                  { label: "Session 加密", value: "AES-256", icon: <Lock className="w-4 h-4" />, color: "#64748b" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ color: s.color }}>{s.icon}</span>
                      <span className="text-xs text-slate-400">{s.label}</span>
                    </div>
                    <span className="text-xs font-mono text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 自动跟进设置 */}
            <div className="p-4 rounded-2xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <p className="text-xs text-slate-500 mb-3 font-medium">自动跟进规则</p>
              <div className="space-y-3">
                {[
                  { label: "首次回复后跟进", value: "24 小时", active: true },
                  { label: "二次跟进间隔", value: "48 小时", active: true },
                  { label: "最大跟进次数", value: "3 次", active: true },
                  { label: "跟进风格", value: "商务", active: true },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{r.label}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ background: "#1877f220", color: "#1877f2" }}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 危险操作 */}
            <div className="p-4 rounded-2xl" style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <p className="text-xs text-slate-500 mb-3 font-medium">账号管理</p>
              <button className="w-full py-2.5 rounded-xl text-xs font-medium text-red-400 border border-red-500/20 active:scale-95"
                onClick={() => toast.warning("暂停托管后，OpenClaw 将停止所有自动化操作", { description: "可随时重新启动" })}>
                暂停此账号托管
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 回复抽屉 */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "oklch(0 0 0 / 60%)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedMsg(null); }}>
          <div className="rounded-t-3xl overflow-hidden flex flex-col max-h-[85vh]"
            style={{ background: "oklch(0.16 0.02 250)" }}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/8 flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-white">
                  {selectedMsg.platform === "messenger" ? "回复私信" : "回复评论"}
                </p>
                <p className="text-xs text-slate-500">{selectedMsg.sender} · {selectedMsg.flag}</p>
              </div>
              <button onClick={() => setSelectedMsg(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "none" }}>
              <div className="p-3 rounded-xl" style={{ background: "oklch(0.20 0.02 250)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{selectedMsg.senderAvatar}</span>
                  <span className="text-xs font-semibold text-white">{selectedMsg.sender}</span>
                  <IntentBadge intent={selectedMsg.intent} score={selectedMsg.intentScore} />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{selectedMsg.content}</p>
              </div>

              {selectedMsg.aiDraft && (
                <div className="flex items-center gap-2 px-1">
                  <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: "#1877f220" }}>
                    <Zap className="w-2.5 h-2.5" style={{ color: "#1877f2" }} />
                  </span>
                  <p className="text-xs text-slate-500">AI 已根据询价意图起草回复，请审核后发出</p>
                </div>
              )}

              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="输入回复内容（英文）..."
                rows={6}
                className="w-full p-3 rounded-xl text-sm text-white placeholder-slate-600 resize-none outline-none"
                style={{ background: "oklch(0.20 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)" }}
              />
              <p className="text-xs text-slate-600 text-right">{replyText.length} / 500 字符</p>
            </div>

            <div className="px-4 pb-6 pt-3 flex gap-2 flex-shrink-0 border-t border-white/8">
              {selectedMsg.intent === "inquiry" && (
                <button onClick={() => handleTransferToInquiry(selectedMsg)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-orange-400 border border-orange-500/30 active:scale-95">
                  转入询盘
                </button>
              )}
              <button onClick={() => handleReply(selectedMsg)}
                disabled={sending || !replyText.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                style={{ background: sending ? "#1877f280" : "#1877f2" }}>
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
