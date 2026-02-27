/* ============================================================
   DESIGN: Night Commander — LinkedIn Manager
   Philosophy: B2B 外贸主动开发核心渠道
   功能：连接请求管理 + InMail 私信开发 + 账号健康监控
   ============================================================ */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Linkedin, Users, MessageSquare, TrendingUp,
  Shield, ChevronRight, Check, X, Clock, AlertCircle,
  Send, Star, Building2, Globe, Activity, RefreshCw,
  UserPlus, Mail, Eye, MoreHorizontal, Filter,
  CheckCircle2, Zap, Target
} from "lucide-react";
import { toast } from "sonner";

// ─── Mock 数据 ─────────────────────────────────────────────

const accountHealth = {
  status: "normal" as "normal" | "warning" | "restricted",
  score: 88,
  connectionsUsed: 14,
  connectionsLimit: 20,
  inMailUsed: 6,
  inMailLimit: 10,
  profileViews: 47,
  searchAppearances: 312,
  proxyNode: "SG-Residential-07",
  lastActive: "3 分钟前",
  accountName: "张建国 · 太阳能设备出口",
  followers: 1284,
  connections: 3421,
};

const connectionRequests = [
  {
    id: "cr1",
    name: "Marco Rossi",
    title: "Procurement Manager",
    company: "EuroPower Solutions",
    country: "🇮🇹 意大利",
    mutualConnections: 3,
    note: "Hi, I'm interested in your solar panel products for our European distribution network.",
    sentAt: "2小时前",
    status: "pending" as "pending" | "accepted" | "ignored",
    confidence: 82,
    isHighValue: true,
  },
  {
    id: "cr2",
    name: "Nguyen Van Thanh",
    title: "CEO",
    company: "Vietnam Green Energy",
    country: "🇻🇳 越南",
    mutualConnections: 1,
    note: "Looking for reliable solar panel supplier for Vietnam market.",
    sentAt: "5小时前",
    status: "pending" as "pending" | "accepted" | "ignored",
    confidence: 91,
    isHighValue: true,
  },
  {
    id: "cr3",
    name: "Ahmed Al-Rashid",
    title: "Business Development",
    company: "Gulf Solar Trading",
    country: "🇦🇪 阿联酋",
    mutualConnections: 0,
    note: "Interested in bulk purchase for Middle East projects.",
    sentAt: "1天前",
    status: "pending" as "pending" | "accepted" | "ignored",
    confidence: 74,
    isHighValue: false,
  },
  {
    id: "cr4",
    name: "Sarah Mitchell",
    title: "Sustainability Director",
    company: "CleanTech Australia",
    country: "🇦🇺 澳大利亚",
    mutualConnections: 5,
    note: "We're expanding our solar portfolio and would love to connect.",
    sentAt: "2天前",
    status: "accepted" as "pending" | "accepted" | "ignored",
    confidence: 88,
    isHighValue: true,
  },
];

const inMailMessages = [
  {
    id: "im1",
    name: "Klaus Weber",
    title: "Head of Procurement",
    company: "Deutsche Solar GmbH",
    country: "🇩🇪 德国",
    preview: "Thank you for reaching out. We are currently evaluating suppliers for Q2...",
    receivedAt: "1小时前",
    isRead: false,
    isReplied: false,
    confidence: 85,
    thread: [
      { role: "sent", content: "Hello Klaus, I noticed your company is expanding solar installations in Germany. We specialize in high-efficiency panels (22%+) with competitive pricing for European markets. Would you be open to a brief call?", time: "昨天 14:30" },
      { role: "received", content: "Thank you for reaching out. We are currently evaluating suppliers for Q2 procurement. Could you send me your product catalog and pricing sheet?", time: "1小时前" },
    ],
  },
  {
    id: "im2",
    name: "Priya Sharma",
    title: "Import Manager",
    company: "SunBright India",
    country: "🇮🇳 印度",
    preview: "We have a project requirement of 500KW. Can you provide...",
    receivedAt: "3小时前",
    isRead: false,
    isReplied: false,
    confidence: 79,
    thread: [
      { role: "sent", content: "Hi Priya, I see SunBright India is active in the renewable sector. We have competitive pricing for bulk orders with CE & IEC certifications. Interested in discussing?", time: "昨天 10:00" },
      { role: "received", content: "We have a project requirement of 500KW. Can you provide specifications and FOB pricing for 400W mono panels?", time: "3小时前" },
    ],
  },
  {
    id: "im3",
    name: "Carlos Mendoza",
    title: "Operations Director",
    company: "LatAm Energy Corp",
    country: "🇲🇽 墨西哥",
    preview: "Interested in your products. Please send more details.",
    receivedAt: "1天前",
    isRead: true,
    isReplied: true,
    confidence: 61,
    thread: [],
  },
];

const outreachQueue = [
  { id: "oq1", name: "Thomas Müller", company: "Berlin Solar AG", country: "🇩🇪", status: "scheduled", scheduledAt: "今天 15:00", template: "产品介绍模板 A" },
  { id: "oq2", name: "Li Wei", company: "Pacific Trade Ltd", country: "🇦🇺", status: "scheduled", scheduledAt: "今天 16:30", template: "市场调研模板" },
  { id: "oq3", name: "Fatima Al-Hassan", company: "MENA Solar", country: "🇸🇦", status: "pending_review", scheduledAt: "明天 09:00", template: "中东市场模板" },
];

// ─── 子组件 ─────────────────────────────────────────────────

function HealthBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  const warn = pct >= 80;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: warn ? "#f59e0b" : color }} />
      </div>
      <span className={`text-xs font-mono ${warn ? "text-amber-400" : "text-slate-400"}`}>{value}/{max}</span>
    </div>
  );
}

function ConfidenceDot({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: `${color}20`, color }}>
      {score}
    </span>
  );
}

// ─── 主组件 ─────────────────────────────────────────────────

export default function LinkedInManager() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"connections" | "inmail" | "outreach">("connections");
  const [selectedInMail, setSelectedInMail] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [requests, setRequests] = useState(connectionRequests);
  const [mails, setMails] = useState(inMailMessages);

  const pendingRequests = requests.filter(r => r.status === "pending");
  const unreadMails = mails.filter(m => !m.isRead && !m.isReplied);
  const selectedMail = mails.find(m => m.id === selectedInMail);
  const selectedReq = requests.find(r => r.id === selectedRequest);

  function handleAcceptRequest(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "accepted" as const } : r));
    toast.success("已接受连接请求，OpenClaw 将发送感谢消息");
    setSelectedRequest(null);
  }

  function handleIgnoreRequest(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "ignored" as const } : r));
    toast.info("已忽略该连接请求");
    setSelectedRequest(null);
  }

  function handleConvertToLead(person: { name: string; company: string; country: string }) {
    toast.success(`已将 ${person.name} 的消息转入询盘管理`, {
      description: `来源：LinkedIn InMail · ${person.company}`,
    });
  }

  function handleSendReply(mailId: string) {
    if (!replyDraft.trim()) return;
    setMails(prev => prev.map(m => m.id === mailId ? { ...m, isReplied: true, isRead: true } : m));
    toast.success("回复已发送", { description: "OpenClaw 将以您的账号发出" });
    setReplyDraft("");
    setSelectedInMail(null);
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.13 0.02 250)", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-12 pb-3"
        style={{ background: "oklch(0.13 0.02 250 / 95%)", backdropFilter: "blur(12px)", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/phone")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 active:scale-90 transition-all">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#0a66c220" }}>
              <Linkedin className="w-4 h-4" style={{ color: "#0a66c2" }} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">LinkedIn 托管</h1>
              <p className="text-xs text-slate-500 mt-0.5">{accountHealth.accountName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#22c55e20" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-green-400">运行中</span>
          </div>
        </div>

        {/* 账号健康摘要 */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "连接请求", value: `${pendingRequests.length}`, sub: "待处理", color: "#0a66c2" },
            { label: "未读私信", value: `${unreadMails.length}`, sub: "待回复", color: "#f59e0b" },
            { label: "主页浏览", value: `${accountHealth.profileViews}`, sub: "今日", color: "#22c55e" },
            { label: "搜索曝光", value: `${accountHealth.searchAppearances}`, sub: "本周", color: "#a78bfa" },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-2.5 text-center"
              style={{ background: "oklch(0.18 0.02 250)", border: "1px solid oklch(1 0 0 / 6%)" }}>
              <p className="text-base font-bold" style={{ color: item.color }}>{item.value}</p>
              <p className="text-xs text-slate-500 leading-tight mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Tab */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "oklch(0.18 0.02 250)" }}>
          {([
            { key: "connections", label: "连接请求", badge: pendingRequests.length },
            { key: "inmail", label: "私信开发", badge: unreadMails.length },
            { key: "outreach", label: "外发队列", badge: 0 },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all relative"
              style={activeTab === tab.key
                ? { background: "#0a66c2", color: "#fff" }
                : { color: "oklch(0.6 0.01 250)" }}>
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{ background: "#ef4444", color: "#fff", fontSize: "10px" }}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 操作额度 */}
      <div className="px-4 py-3">
        <div className="rounded-xl p-3" style={{ background: "oklch(0.18 0.02 250)", border: "1px solid oklch(1 0 0 / 6%)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-green-400" />今日安全额度
            </span>
            <span className="text-xs text-slate-500">{accountHealth.proxyNode}</span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>连接请求</span>
              </div>
              <HealthBar value={accountHealth.connectionsUsed} max={accountHealth.connectionsLimit} color="#0a66c2" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>InMail 外发</span>
              </div>
              <HealthBar value={accountHealth.inMailUsed} max={accountHealth.inMailLimit} color="#a78bfa" />
            </div>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="px-4 pb-24">

        {/* 连接请求 Tab */}
        {activeTab === "connections" && (
          <div className="space-y-2">
            {requests.map(req => (
              <button key={req.id} onClick={() => setSelectedRequest(req.id)}
                className="w-full text-left rounded-xl p-4 transition-all active:scale-98"
                style={{ background: "oklch(0.18 0.02 250)", border: `1px solid ${req.status === "pending" ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 5%)"}`, opacity: req.status !== "pending" ? 0.6 : 1 }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                    style={{ background: `hsl(${req.name.charCodeAt(0) * 7 % 360}, 50%, 35%)` }}>
                    {req.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white">{req.name}</span>
                      <ConfidenceDot score={req.confidence} />
                      {req.isHighValue && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{req.title} · {req.company}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{req.country} · {req.mutualConnections} 个共同联系人</p>
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{req.note}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-600">{req.sentAt}</span>
                      {req.status === "accepted" && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />已接受</span>}
                      {req.status === "ignored" && <span className="text-xs text-slate-500">已忽略</span>}
                      {req.status === "pending" && <span className="text-xs text-blue-400">待处理</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* InMail 私信 Tab */}
        {activeTab === "inmail" && (
          <div className="space-y-2">
            {mails.map(mail => (
              <button key={mail.id} onClick={() => setSelectedInMail(mail.id)}
                className="w-full text-left rounded-xl p-4 transition-all active:scale-98"
                style={{ background: "oklch(0.18 0.02 250)", border: `1px solid ${!mail.isRead ? "#0a66c230" : "oklch(1 0 0 / 6%)"}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                    style={{ background: `hsl(${mail.name.charCodeAt(0) * 11 % 360}, 50%, 35%)` }}>
                    {mail.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!mail.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                      <span className="text-sm font-semibold text-white">{mail.name}</span>
                      <ConfidenceDot score={mail.confidence} />
                    </div>
                    <p className="text-xs text-slate-400 truncate">{mail.title} · {mail.company}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{mail.country}</p>
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{mail.preview}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-600">{mail.receivedAt}</span>
                      {mail.isReplied
                        ? <span className="text-xs text-green-400 flex items-center gap-1"><Check className="w-3 h-3" />已回复</span>
                        : <span className="text-xs text-amber-400">待回复</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 外发队列 Tab */}
        {activeTab === "outreach" && (
          <div className="space-y-2">
            <div className="rounded-xl p-3 mb-3 flex items-center gap-2"
              style={{ background: "#0a66c215", border: "1px solid #0a66c230" }}>
              <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "#0a66c2" }} />
              <p className="text-xs text-slate-300">OpenClaw 将按计划时间自动发送，敏感内容需您审核后发出</p>
            </div>
            {outreachQueue.map(item => (
              <div key={item.id} className="rounded-xl p-4"
                style={{ background: "oklch(0.18 0.02 250)", border: `1px solid ${item.status === "pending_review" ? "#f59e0b30" : "oklch(1 0 0 / 6%)"}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: item.status === "pending_review" ? "#f59e0b20" : "#0a66c220" }}>
                    {item.status === "pending_review"
                      ? <AlertCircle className="w-4 h-4 text-amber-400" />
                      : <Clock className="w-4 h-4" style={{ color: "#0a66c2" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-white">{item.name}</span>
                      <span className="text-xs text-slate-500">{item.scheduledAt}</span>
                    </div>
                    <p className="text-xs text-slate-400">{item.company} {item.country}</p>
                    <p className="text-xs text-slate-500 mt-1">模板：{item.template}</p>
                    {item.status === "pending_review" && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => toast.success("已审核通过，将按计划发送")}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{ background: "#0a66c2" }}>审核通过</button>
                        <button onClick={() => toast.info("已取消该外发任务")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 bg-white/8">取消</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 连接请求详情抽屉 */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "oklch(0 0 0 / 70%)" }}
          onClick={() => setSelectedRequest(null)}>
          <div className="w-full rounded-t-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
            style={{ background: "oklch(0.16 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
            <div className="px-5 pb-8">
              <div className="flex items-center justify-between py-4 border-b border-white/8 mb-4">
                <h2 className="text-base font-bold text-white">连接请求详情</h2>
                <button onClick={() => setSelectedRequest(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
                  style={{ background: `hsl(${selectedReq.name.charCodeAt(0) * 7 % 360}, 50%, 35%)` }}>
                  {selectedReq.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{selectedReq.name}</h3>
                    <ConfidenceDot score={selectedReq.confidence} />
                  </div>
                  <p className="text-sm text-slate-400">{selectedReq.title}</p>
                  <p className="text-sm text-slate-500">{selectedReq.company} · {selectedReq.country}</p>
                </div>
              </div>

              <div className="rounded-xl p-3 mb-4" style={{ background: "oklch(0.20 0.02 250)" }}>
                <p className="text-xs text-slate-400 mb-1">附言</p>
                <p className="text-sm text-white leading-relaxed">{selectedReq.note}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-xl p-3 text-center" style={{ background: "oklch(0.20 0.02 250)" }}>
                  <p className="text-lg font-bold text-blue-400">{selectedReq.mutualConnections}</p>
                  <p className="text-xs text-slate-500">共同联系人</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "oklch(0.20 0.02 250)" }}>
                  <p className="text-lg font-bold text-purple-400">{selectedReq.confidence}</p>
                  <p className="text-xs text-slate-500">置信度评分</p>
                </div>
              </div>

              {selectedReq.status === "pending" ? (
                <div className="space-y-2">
                  <button onClick={() => handleAcceptRequest(selectedReq.id)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: "#0a66c2" }}>
                    接受连接请求
                  </button>
                  <button onClick={() => {
                    handleConvertToLead(selectedReq);
                    handleAcceptRequest(selectedReq.id);
                  }}
                    className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e30" }}>
                    <Target className="w-4 h-4" />接受并转入询盘管理
                  </button>
                  <button onClick={() => handleIgnoreRequest(selectedReq.id)}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-slate-400 bg-white/8">
                    忽略
                  </button>
                </div>
              ) : (
                <div className="py-3 text-center text-sm text-slate-500">
                  {selectedReq.status === "accepted" ? "✅ 已接受该连接请求" : "已忽略该请求"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* InMail 回复抽屉 */}
      {selectedMail && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "oklch(0 0 0 / 70%)" }}
          onClick={() => setSelectedInMail(null)}>
          <div className="w-full rounded-t-3xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background: "oklch(0.16 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
            <div className="px-5 pt-2 pb-3 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">{selectedMail.name}</h2>
                  <p className="text-xs text-slate-400">{selectedMail.title} · {selectedMail.company}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleConvertToLead(selectedMail)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                    style={{ background: "#22c55e20", color: "#22c55e" }}>
                    <Target className="w-3 h-3" />转询盘
                  </button>
                  <button onClick={() => setSelectedInMail(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* 对话记录 */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {selectedMail.thread.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "sent" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%] rounded-2xl px-4 py-3"
                    style={msg.role === "sent"
                      ? { background: "#0a66c2", borderBottomRightRadius: "4px" }
                      : { background: "oklch(0.22 0.02 250)", borderBottomLeftRadius: "4px" }}>
                    <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                    <p className="text-xs mt-1.5 text-right" style={{ color: msg.role === "sent" ? "rgba(255,255,255,0.6)" : "oklch(0.5 0.01 250)" }}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 回复输入 */}
            {!selectedMail.isReplied && (
              <div className="px-5 py-3 border-t border-white/8 flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  {["发送产品目录", "安排视频会议", "提供报价单"].map(quick => (
                    <button key={quick} onClick={() => setReplyDraft(quick)}
                      className="text-xs px-2.5 py-1 rounded-full border border-white/15 text-slate-400 active:scale-95 transition-all whitespace-nowrap">
                      {quick}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={replyDraft}
                    onChange={e => setReplyDraft(e.target.value)}
                    placeholder="用中文输入，AI 翻译成商务英文..."
                    rows={2}
                    className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 resize-none outline-none"
                    style={{ background: "oklch(0.22 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)" }}
                  />
                  <button onClick={() => handleSendReply(selectedMail.id)}
                    disabled={!replyDraft.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 self-end transition-all active:scale-90 disabled:opacity-40"
                    style={{ background: "#0a66c2" }}>
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
