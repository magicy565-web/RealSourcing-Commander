/* ============================================================
   DESIGN: Night Commander — WhatsApp Business Manager
   Philosophy: 对话驱动的询盘入口，快速处理 + 转询盘闭环
   功能：对话列表 + 消息回复 + 快捷模板 + 账号状态 + 转询盘
   ============================================================ */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, MessageCircle, Phone, Shield, Target,
  Send, X, Check, CheckCheck, Clock, AlertCircle,
  Zap, Filter, Search, ChevronRight, Star,
  Mic, Image, FileText, MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";

// ─── Mock 数据 ─────────────────────────────────────────────

const accountStatus = {
  phone: "+86 138 0013 8000",
  displayName: "张建国 · 太阳能设备",
  status: "active" as "active" | "banned" | "restricted",
  qualityRating: "High" as "High" | "Medium" | "Low",
  messagingLimit: "1K/day",
  usedToday: 47,
  limitToday: 250,
  proxyNode: "CN-Residential-03",
  lastSync: "刚刚",
};

const conversations = [
  {
    id: "wa1",
    name: "Marco Rossi",
    phone: "+39 02 1234 5678",
    country: "🇮🇹",
    company: "EuroPower Solutions",
    lastMessage: "Can you send me the price list for 400W panels? We need at least 500 units.",
    time: "10:23",
    unread: 2,
    isOnline: true,
    confidence: 88,
    isHighValue: true,
    status: "new_inquiry" as "new_inquiry" | "quoted" | "following" | "closed",
    messages: [
      { id: "m1", role: "received" as const, content: "Hello! I found your company on LinkedIn. We are looking for solar panel suppliers for our European distribution.", time: "昨天 15:30", read: true },
      { id: "m2", role: "sent" as const, content: "Hi Marco, thank you for reaching out! We specialize in high-efficiency monocrystalline panels with CE certification. What's your target market and volume?", time: "昨天 16:00", read: true },
      { id: "m3", role: "received" as const, content: "We mainly cover Italy and Spain. Looking at 500+ units per order.", time: "昨天 18:45", read: true },
      { id: "m4", role: "received" as const, content: "Can you send me the price list for 400W panels? We need at least 500 units.", time: "10:23", read: false },
    ],
  },
  {
    id: "wa2",
    name: "Nguyen Thi Lan",
    phone: "+84 90 123 4567",
    country: "🇻🇳",
    company: "Vietnam Solar Co.",
    lastMessage: "我们需要500KW的组件，请报价",
    time: "09:15",
    unread: 1,
    isOnline: false,
    confidence: 92,
    isHighValue: true,
    status: "new_inquiry" as "new_inquiry" | "quoted" | "following" | "closed",
    messages: [
      { id: "m1", role: "received" as const, content: "你好，我们是越南太阳能公司，需要500KW的单晶硅组件，请报价", time: "09:15", read: false },
    ],
  },
  {
    id: "wa3",
    name: "Ahmed Hassan",
    phone: "+971 50 123 4567",
    country: "🇦🇪",
    company: "Gulf Energy Trading",
    lastMessage: "Thank you for the quotation. We will review and get back to you.",
    time: "昨天",
    unread: 0,
    isOnline: false,
    confidence: 71,
    isHighValue: false,
    status: "quoted" as "new_inquiry" | "quoted" | "following" | "closed",
    messages: [
      { id: "m1", role: "sent" as const, content: "Dear Ahmed, please find our quotation attached. FOB price for 400W: $0.28/W, MOQ 100 units.", time: "昨天 14:00", read: true },
      { id: "m2", role: "received" as const, content: "Thank you for the quotation. We will review and get back to you.", time: "昨天 16:30", read: true },
    ],
  },
  {
    id: "wa4",
    name: "Priya Sharma",
    phone: "+91 98 1234 5678",
    country: "🇮🇳",
    company: "SunBright India",
    lastMessage: "Please confirm the delivery timeline for 200 units.",
    time: "周一",
    unread: 0,
    isOnline: false,
    confidence: 79,
    isHighValue: false,
    status: "following" as "new_inquiry" | "quoted" | "following" | "closed",
    messages: [
      { id: "m1", role: "received" as const, content: "Please confirm the delivery timeline for 200 units.", time: "周一 11:00", read: true },
    ],
  },
];

const quickReplies = [
  { id: "qr1", label: "发送产品目录", content: "Please find our latest product catalog attached. It includes full specifications and pricing for our solar panel range." },
  { id: "qr2", label: "报价确认", content: "Thank you for your inquiry. Based on your requirements, I'll prepare a detailed quotation and send it within 24 hours." },
  { id: "qr3", label: "安排视频会议", content: "I'd be happy to schedule a video call to discuss your requirements in detail. Please let me know your available time slots." },
  { id: "qr4", label: "交货期说明", content: "Our standard lead time is 15-20 working days after order confirmation. For urgent orders, we can arrange expedited production." },
];

const statusConfig = {
  new_inquiry: { label: "新询盘", color: "#f59e0b", bg: "#f59e0b20" },
  quoted: { label: "已报价", color: "#0a66c2", bg: "#0a66c220" },
  following: { label: "跟进中", color: "#a78bfa", bg: "#a78bfa20" },
  closed: { label: "已结束", color: "#6b7280", bg: "#6b728020" },
};

// ─── 主组件 ─────────────────────────────────────────────────

export default function WhatsAppManager() {
  const [, navigate] = useLocation();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [convList, setConvList] = useState(conversations);
  const [autoReply, setAutoReply] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeConv = convList.find(c => c.id === selectedConv);
  const totalUnread = convList.reduce((sum, c) => sum + c.unread, 0);
  const newInquiries = convList.filter(c => c.status === "new_inquiry").length;

  const filtered = convList.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleSendReply(convId: string) {
    if (!replyText.trim()) return;
    setConvList(prev => prev.map(c => {
      if (c.id !== convId) return c;
      return {
        ...c,
        unread: 0,
        lastMessage: replyText,
        time: "刚刚",
        messages: [...c.messages, {
          id: `m${Date.now()}`,
          role: "sent" as const,
          content: replyText,
          time: "刚刚",
          read: true,
        }],
      };
    }));
    toast.success("消息已发送", { description: "OpenClaw 将以您的 WhatsApp 账号发出" });
    setReplyText("");
  }

  function handleConvertToLead(conv: typeof conversations[0]) {
    toast.success(`已将 ${conv.name} 的对话转入询盘管理`, {
      description: `来源：WhatsApp · ${conv.company} · ${conv.country}`,
    });
    setConvList(prev => prev.map(c => c.id === conv.id ? { ...c, status: "quoted" as const } : c));
    setSelectedConv(null);
  }

  function handleQuickReply(content: string) {
    setReplyText(content);
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
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#25d36620" }}>
              <MessageCircle className="w-4 h-4" style={{ color: "#25d366" }} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">WhatsApp Business</h1>
              <p className="text-xs text-slate-500 mt-0.5">{accountStatus.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "#25d36620" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold" style={{ color: "#25d366" }}>已连接</span>
            </div>
          </div>
        </div>

        {/* 统计摘要 */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "未读消息", value: `${totalUnread}`, color: "#25d366" },
            { label: "新询盘", value: `${newInquiries}`, color: "#f59e0b" },
            { label: "今日发送", value: `${accountStatus.usedToday}`, color: "#0a66c2" },
            { label: "质量评级", value: accountStatus.qualityRating, color: "#22c55e" },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-2.5 text-center"
              style={{ background: "oklch(0.18 0.02 250)", border: "1px solid oklch(1 0 0 / 6%)" }}>
              <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
              <p className="text-xs text-slate-500 leading-tight mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {/* 搜索 + 自动回复开关 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "oklch(0.18 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索联系人..."
              className="flex-1 text-xs text-white placeholder-slate-600 bg-transparent outline-none"
            />
          </div>
          <button
            onClick={() => {
              setAutoReply(!autoReply);
              toast.info(autoReply ? "已关闭自动回复" : "已开启自动回复（仅限常见问题）");
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={autoReply
              ? { background: "#25d36620", color: "#25d366", border: "1px solid #25d36630" }
              : { background: "oklch(0.18 0.02 250)", color: "oklch(0.5 0.01 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <Zap className="w-3.5 h-3.5" />
            {autoReply ? "自动回复开" : "自动回复关"}
          </button>
        </div>
      </div>

      {/* 账号健康 */}
      <div className="px-4 py-3">
        <div className="rounded-xl p-3" style={{ background: "oklch(0.18 0.02 250)", border: "1px solid oklch(1 0 0 / 6%)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-green-400" />账号状态
            </span>
            <span className="text-xs text-slate-500">{accountStatus.proxyNode}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>今日发送额度</span>
                <span className="font-mono">{accountStatus.usedToday}/{accountStatus.limitToday}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${(accountStatus.usedToday / accountStatus.limitToday) * 100}%`,
                  background: "#25d366"
                }} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold text-green-400">{accountStatus.qualityRating}</p>
              <p className="text-xs text-slate-500">质量评级</p>
            </div>
          </div>
        </div>
      </div>

      {/* 对话列表 */}
      <div className="px-4 pb-24 space-y-1">
        {filtered.map(conv => {
          const sc = statusConfig[conv.status];
          return (
            <button key={conv.id} onClick={() => setSelectedConv(conv.id)}
              className="w-full text-left rounded-xl p-4 transition-all active:scale-98"
              style={{ background: "oklch(0.18 0.02 250)", border: `1px solid ${conv.unread > 0 ? "#25d36630" : "oklch(1 0 0 / 6%)"}` }}>
              <div className="flex items-center gap-3">
                {/* 头像 */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: `hsl(${conv.name.charCodeAt(0) * 9 % 360}, 50%, 35%)` }}>
                    {conv.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  {conv.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 bg-green-400"
                      style={{ borderColor: "oklch(0.18 0.02 250)" }} />
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">{conv.name}</span>
                      <span className="text-xs">{conv.country}</span>
                      {conv.isHighValue && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">{conv.time}</span>
                      {conv.unread > 0 && (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: "#25d366" }}>{conv.unread}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{conv.company}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-500 truncate flex-1 mr-2">{conv.lastMessage}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-semibold"
                      style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 对话详情抽屉 */}
      {activeConv && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "oklch(0.13 0.02 250)" }}>
          {/* 对话 Header */}
          <div className="px-4 pt-12 pb-3 flex-shrink-0"
            style={{ background: "oklch(0.16 0.02 250)", borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 active:scale-90 transition-all">
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: `hsl(${activeConv.name.charCodeAt(0) * 9 % 360}, 50%, 35%)` }}>
                {activeConv.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-white">{activeConv.name}</p>
                  <span className="text-xs">{activeConv.country}</span>
                </div>
                <p className="text-xs text-slate-400 truncate">{activeConv.company}</p>
              </div>
              <button onClick={() => handleConvertToLead(activeConv)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e30" }}>
                <Target className="w-3.5 h-3.5" />转询盘
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {activeConv.messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "sent" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] rounded-2xl px-4 py-3"
                  style={msg.role === "sent"
                    ? { background: "#25d36620", border: "1px solid #25d36630", borderBottomRightRadius: "4px" }
                    : { background: "oklch(0.22 0.02 250)", borderBottomLeftRadius: "4px" }}>
                  <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1.5">
                    <span className="text-xs text-slate-500">{msg.time}</span>
                    {msg.role === "sent" && (
                      msg.read
                        ? <CheckCheck className="w-3 h-3" style={{ color: "#25d366" }} />
                        : <Check className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 快捷回复 */}
          <div className="px-4 py-2 flex-shrink-0" style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {quickReplies.map(qr => (
                <button key={qr.id} onClick={() => handleQuickReply(qr.content)}
                  className="text-xs px-3 py-1.5 rounded-full border whitespace-nowrap flex-shrink-0 active:scale-95 transition-all"
                  style={{ border: "1px solid oklch(1 0 0 / 15%)", color: "oklch(0.7 0.01 250)", background: "oklch(0.18 0.02 250)" }}>
                  {qr.label}
                </button>
              ))}
            </div>
          </div>

          {/* 输入框 */}
          <div className="px-4 py-3 flex-shrink-0" style={{ background: "oklch(0.16 0.02 250)", borderTop: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="flex items-end gap-2">
              <div className="flex-1 rounded-2xl px-4 py-3 flex items-end gap-2"
                style={{ background: "oklch(0.22 0.02 250)", border: "1px solid oklch(1 0 0 / 10%)" }}>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="用中文输入，AI 翻译成商务英文..."
                  rows={1}
                  className="flex-1 text-sm text-white placeholder-slate-600 bg-transparent outline-none resize-none"
                  style={{ maxHeight: "80px" }}
                />
              </div>
              <button onClick={() => handleSendReply(activeConv.id)}
                disabled={!replyText.trim()}
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
                style={{ background: "#25d366" }}>
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
