/**
 * Phase 5 — Sprint 5.1
 * TikTok 社媒管理模块 — 高保真原型
 *
 * 定位：Commander 是 OpenClaw 操作员的指挥台。
 * OpenClaw 在云电脑上直接操作浏览器抓取 TikTok 评论/私信，
 * 数据推送到 Commander 后，操作员在此快速阅读、选择模板、一键下发回复指令。
 */
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, MessageCircle, Send, X, RefreshCw,
  Shield, BarChart2, Sparkles, Target,
  ThumbsUp, ThumbsDown, Minus,
  ArrowRightCircle, Check, BookOpen, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { socialApi } from "../lib/api";

type MsgStatus = "pending" | "replied" | "ignored" | "converted";
type MsgIntent = "inquiry" | "complaint" | "spam" | "general";
type Sentiment = "positive" | "neutral" | "negative";

interface SocialMsg {
  id: string; account_id: string; platform: string; message_type: string;
  sender_name: string; sender_avatar: string; content: string;
  intent: MsgIntent; intent_score: number; sentiment: Sentiment;
  ai_summary: string; ai_draft_en: string; ai_draft_zh: string;
  suggested_action: string; isHighValue: boolean; status: MsgStatus;
  replied_at?: string; reply_content?: string; converted_inquiry_id?: string;
  post_title?: string; created_at: string;
}
interface ReplyTemplate {
  id: string; platform: string; category: string; name: string;
  content_en: string; content_zh: string; tags: string[]; use_count: number;
}
interface SocialAccount {
  id: string; platform: string; accountName: string; healthStatus: string;
  dailyOpsUsed: number; dailyOpsLimit: number;
  messageStats: { total: number; pending: number; highValue: number; inquiries: number };
}

function HealthDot({ status }: { status: string }) {
  const m: Record<string, { c: string; l: string }> = {
    normal: { c: "#10b981", l: "正常" }, warning: { c: "#f97316", l: "警告" },
    suspended: { c: "#ef4444", l: "暂停" }, banned: { c: "#ef4444", l: "封禁" },
  };
  const d = m[status] ?? { c: "#64748b", l: status };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: d.c }} />
      <span className="text-xs font-medium" style={{ color: d.c }}>{d.l}</span>
    </span>
  );
}

function IntentBadge({ intent, score }: { intent: MsgIntent; score: number }) {
  const m: Record<MsgIntent, { l: string; c: string; bg: string; i: string }> = {
    inquiry:   { l: "询价", c: "#fe2c55", bg: "#fe2c5518", i: "💰" },
    complaint: { l: "投诉", c: "#ef4444", bg: "#ef444418", i: "⚠️" },
    spam:      { l: "垃圾", c: "#64748b", bg: "#64748b18", i: "🚫" },
    general:   { l: "一般", c: "#94a3b8", bg: "#94a3b818", i: "💬" },
  };
  const d = m[intent] ?? m.general;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ color: d.c, background: d.bg }}>
      <span>{d.i}</span>{d.l}
      {intent === "inquiry" && score > 0 && <span className="font-mono opacity-80">{score}</span>}
    </span>
  );
}

function SentimentIcon({ s }: { s: Sentiment }) {
  if (s === "positive") return <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (s === "negative") return <ThumbsDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function StatusPill({ status }: { status: MsgStatus }) {
  const m: Record<MsgStatus, { l: string; c: string; bg: string }> = {
    pending:   { l: "待处理", c: "#f59e0b", bg: "#f59e0b18" },
    replied:   { l: "已回复", c: "#10b981", bg: "#10b98118" },
    ignored:   { l: "已忽略", c: "#64748b", bg: "#64748b18" },
    converted: { l: "已转化", c: "#8b5cf6", bg: "#8b5cf618" },
  };
  const d = m[status];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: d.c, background: d.bg }}>{d.l}</span>
  );
}

export default function TikTokManager() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"messages" | "templates" | "stats">("messages");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [messages, setMessages] = useState<SocialMsg[]>([]);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [templateCategories, setTemplateCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedMsg, setSelectedMsg] = useState<SocialMsg | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [msgFilter, setMsgFilter] = useState<"pending" | "inquiry" | "high_value" | "all">("pending");

  const tkAccount = accounts.find(a => a.platform === "tiktok");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [msgRes, statsRes, accRes, tplRes] = await Promise.all([
        socialApi.getMessages({ platform: "tiktok", limit: "50" }),
        socialApi.getStats(),
        socialApi.getAccounts(),
        socialApi.getTemplates({ platform: "tiktok" }),
      ]);
      setMessages(msgRes.messages ?? []);
      setStats(statsRes);
      setAccounts(accRes.accounts ?? []);
      setTemplates(tplRes.templates ?? []);
      setTemplateCategories(tplRes.categories ?? []);
    } catch (e: any) {
      toast.error("加载失败", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredMessages = messages.filter(m => {
    if (msgFilter === "pending")    return m.status === "pending";
    if (msgFilter === "inquiry")    return m.intent === "inquiry";
    if (msgFilter === "high_value") return m.isHighValue;
    return true;
  });

  const filteredTemplates = templates.filter(t =>
    templateFilter === "all" || t.category === templateFilter
  );

  const applyTemplate = async (tpl: ReplyTemplate) => {
    try {
      const res = await socialApi.useTemplate(tpl.id, {
        vars: { name: selectedMsg?.sender_name ?? "there" },
      });
      setReplyText(res.contentEn);
      setShowTemplates(false);
      toast.success(`已应用模板：${tpl.name}`);
    } catch {
      setReplyText(tpl.content_en.replace(/\{name\}/g, selectedMsg?.sender_name ?? "there"));
      setShowTemplates(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedMsg) return;
    setGeneratingDraft(true);
    try {
      const res = await socialApi.generateReply(selectedMsg.id);
      setReplyText(res.draftEn);
      toast.success("AI 草稿已生成");
    } catch (e: any) {
      toast.error("生成失败", { description: e.message });
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleReply = async () => {
    if (!selectedMsg || !replyText.trim()) { toast.error("请填写回复内容"); return; }
    setSending(true);
    try {
      await socialApi.reply(selectedMsg.id, replyText);
      toast.success("指令已下发给 OpenClaw", {
        description: `OpenClaw 将以 ${tkAccount?.accountName ?? "账号"} 身份在 TikTok 上发送回复`,
      });
      setSelectedMsg(null); setReplyText(""); setShowTemplates(false);
      await loadAll();
    } catch (e: any) {
      toast.error("发送失败", { description: e.message });
    } finally {
      setSending(false);
    }
  };

  const handleConvert = async (msg: SocialMsg) => {
    setConverting(msg.id);
    try {
      const res = await socialApi.convert(msg.id);
      toast.success("已转入询盘管理", {
        description: `询盘 #${res.inquiryId.slice(-6)} 已创建，来自 ${msg.sender_name}`,
      });
      setSelectedMsg(null);
      await loadAll();
    } catch (e: any) {
      toast.error("转化失败", { description: e.message });
    } finally {
      setConverting(null);
    }
  };

  const openMsg = (msg: SocialMsg) => {
    setSelectedMsg(msg); setReplyText(msg.ai_draft_en ?? ""); setShowTemplates(false);
  };

  const opsUsedPct = tkAccount ? (tkAccount.dailyOpsUsed / tkAccount.dailyOpsLimit) * 100 : 0;
  const opsColor = opsUsedPct > 80 ? "#ef4444" : opsUsedPct > 60 ? "#f97316" : "#fe2c55";
  const pendingCount = messages.filter(m => m.status === "pending").length;
  const highValueCount = messages.filter(m => m.isHighValue).length;

  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(0.13 0.02 250)", color: "white" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 flex-shrink-0">
        <button onClick={() => navigate("/phone")}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 active:scale-90 transition-transform">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎵</span>
            <p className="text-sm font-bold truncate">{tkAccount?.accountName ?? "TikTok 管理"}</p>
          </div>
          <p className="text-xs text-slate-500">OpenClaw 指挥台 · Phase 5</p>
        </div>
        {tkAccount && <HealthDot status={tkAccount.healthStatus} />}
        <button onClick={loadAll}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 active:scale-90">
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* 操作额度进度条 */}
      {tkAccount && (
        <div className="mx-4 mb-3 px-3.5 py-2.5 rounded-2xl flex-shrink-0"
          style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-400">今日安全操作额度</span>
            </div>
            <span className="text-xs font-mono font-bold" style={{ color: opsColor }}>
              {tkAccount.dailyOpsUsed} / {tkAccount.dailyOpsLimit}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(opsUsedPct, 100)}%`, background: opsColor }} />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {pendingCount > 0 && (
              <span className="text-xs font-semibold text-amber-400">{pendingCount} 条待处理</span>
            )}
            {highValueCount > 0 && (
              <span className="text-xs font-semibold text-blue-400">⭐ {highValueCount} 高价值评论</span>
            )}
          </div>
        </div>
      )}

      {/* Tab 导航 */}
      <div className="flex gap-1 mx-4 mb-3 p-1 rounded-2xl flex-shrink-0"
        style={{ background: "oklch(0.17 0.02 250)" }}>
        {[
          { key: "messages",  label: "评论处理", icon: MessageCircle },
          { key: "templates", label: "回复模板", icon: BookOpen },
          { key: "stats",     label: "数据统计", icon: BarChart2 },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: activeTab === tab.key ? "#fe2c55" : "transparent",
              color: activeTab === tab.key ? "white" : "#64748b",
            }}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500">正在从 OpenClaw 同步数据…</p>
          </div>
        ) : activeTab === "messages" ? (
          <>
            {/* 筛选器 */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {[
                { key: "pending",    label: `待处理${pendingCount > 0 ? " ("+pendingCount+")" : ""}` },
                { key: "inquiry",    label: "询价意图" },
                { key: "high_value", label: `⭐ 高价值${highValueCount > 0 ? " ("+highValueCount+")" : ""}` },
                { key: "all",        label: "全部" },
              ].map(f => (
                <button key={f.key} onClick={() => setMsgFilter(f.key as any)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: msgFilter === f.key ? "#fe2c55" : "oklch(0.19 0.02 250)",
                    color: msgFilter === f.key ? "white" : "#64748b",
                    border: `1px solid ${msgFilter === f.key ? "#fe2c55" : "oklch(1 0 0 / 8%)"}`,
                  }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* 消息列表 */}
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">暂无消息</p>
                <p className="text-xs mt-1 opacity-60">OpenClaw 抓取后将在此显示</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMessages.map(msg => (
                  <button key={msg.id} onClick={() => openMsg(msg)}
                    className="w-full text-left rounded-2xl p-3.5 transition-all active:scale-[0.98]"
                    style={{
                      background: "oklch(0.17 0.02 250)",
                      border: `1px solid ${msg.isHighValue ? "#fe2c5530" : "oklch(1 0 0 / 7%)"}`,
                    }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: "oklch(0.22 0.02 250)" }}>
                        {msg.sender_avatar || "👤"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white truncate">{msg.sender_name}</span>
                          {msg.isHighValue && <span className="text-amber-400 text-xs">⭐</span>}
                          <span className="ml-auto flex-shrink-0"><StatusPill status={msg.status} /></span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">{msg.content}</p>
                        {msg.ai_summary && (
                          <p className="text-xs text-blue-400 mb-2 flex items-start gap-1">
                            <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{msg.ai_summary}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <IntentBadge intent={msg.intent} score={msg.intent_score} />
                          <SentimentIcon s={msg.sentiment} />
                          <span className="text-xs text-slate-600 ml-auto">
                            {msg.message_type === "comment" ? "💬 评论" : "✉️ 私信"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : activeTab === "templates" ? (
          <>
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {["all", ...templateCategories].map(cat => (
                <button key={cat} onClick={() => setTemplateFilter(cat)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: templateFilter === cat ? "#fe2c55" : "oklch(0.19 0.02 250)",
                    color: templateFilter === cat ? "white" : "#64748b",
                    border: `1px solid ${templateFilter === cat ? "#fe2c55" : "oklch(1 0 0 / 8%)"}`,
                  }}>
                  {cat === "all" ? "全部" : cat}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filteredTemplates.map(tpl => (
                <div key={tpl.id} className="rounded-2xl p-3.5"
                  style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 7%)" }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{tpl.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{tpl.category}</span>
                        {tpl.use_count > 0 && (
                          <span className="text-xs text-blue-400">已用 {tpl.use_count} 次</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "#fe2c5518", color: "#fe2c55" }}>
                      {tpl.platform === "all" ? "通用" : tpl.platform}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">{tpl.content_en}</p>
                  {tpl.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {tpl.tags.map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: "oklch(0.22 0.02 250)", color: "#64748b" }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {stats?.overall && (
              <div className="rounded-2xl p-4"
                style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 7%)" }}>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-400" />TikTok 评论统计
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "总消息", value: stats.overall.total, color: "#94a3b8" },
                    { label: "待处理", value: stats.overall.pending, color: "#f59e0b" },
                    { label: "高价值", value: stats.overall.high_value, color: "#f59e0b" },
                    { label: "询价意图", value: stats.overall.inquiries, color: "#fe2c55" },
                    { label: "已回复", value: stats.overall.replied, color: "#10b981" },
                    { label: "已转化", value: stats.overall.converted, color: "#8b5cf6" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-2.5 text-center"
                      style={{ background: "oklch(0.22 0.02 250)" }}>
                      <p className="text-xs text-slate-500 mb-0.5">{s.label}</p>
                      <p className="text-xl font-black" style={{ color: s.color }}>{s.value ?? 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-2xl p-4"
              style={{ background: "oklch(0.17 0.02 250)", border: "1px solid #fe2c5520" }}>
              <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />OpenClaw 工作流说明
              </h3>
              <div className="space-y-2.5">
                {[
                  "OpenClaw 在云电脑上登录 TikTok，自动抓取帖子评论和私信",
                  "数据推送到 Commander，AI 自动分析意图和情感倾向",
                  "操作员在此快速阅读，选择回复模板或 AI 草稿",
                  "点击发送后，指令下发给 OpenClaw，由其在 Facebook 上执行回复",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "#fe2c55", color: "white" }}>{i + 1}</span>
                    <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 消息详情抽屉 */}
      {selectedMsg && (
        <div className="absolute inset-0 z-50 flex flex-col"
          style={{ background: "oklch(0.13 0.02 250)" }}>
          <div className="flex items-center gap-3 px-4 pt-5 pb-3 flex-shrink-0"
            style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}>
            <button onClick={() => { setSelectedMsg(null); setReplyText(""); setShowTemplates(false); }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{selectedMsg.sender_name}</span>
                {selectedMsg.isHighValue && <span className="text-amber-400">⭐</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <IntentBadge intent={selectedMsg.intent} score={selectedMsg.intent_score} />
                <SentimentIcon s={selectedMsg.sentiment} />
                <StatusPill status={selectedMsg.status} />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* 原始消息 */}
            <div className="rounded-2xl p-3.5"
              style={{ background: "oklch(0.17 0.02 250)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <p className="text-xs text-slate-500 mb-2">
                {selectedMsg.message_type === "comment" ? "💬 TikTok 评论" : "✉️ TikTok 私信"}
                {selectedMsg.post_title && ` · ${selectedMsg.post_title}`}
              </p>
              <p className="text-sm text-white leading-relaxed">{selectedMsg.content}</p>
            </div>

            {/* AI 分析 */}
            {selectedMsg.ai_summary && (
              <div className="rounded-2xl p-3.5"
                style={{ background: "oklch(0.17 0.02 250)", border: "1px solid #fe2c5520" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400">AI 分析</span>
                </div>
                <p className="text-sm text-slate-200 mb-2">{selectedMsg.ai_summary}</p>
                {selectedMsg.suggested_action && (
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-400">{selectedMsg.suggested_action}</p>
                  </div>
                )}
              </div>
            )}

            {/* 已回复展示 */}
            {selectedMsg.status === "replied" && selectedMsg.reply_content && (
              <div className="rounded-2xl p-3.5"
                style={{ background: "oklch(0.17 0.02 250)", border: "1px solid #10b98120" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">OpenClaw 已执行回复</span>
                </div>
                <p className="text-sm text-slate-300">{selectedMsg.reply_content}</p>
              </div>
            )}

            {/* 回复编辑区 */}
            {selectedMsg.status !== "replied" && selectedMsg.status !== "converted" && (
              <>
                <div className="flex gap-2">
                  <button onClick={handleGenerateDraft} disabled={generatingDraft}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: "oklch(0.22 0.02 250)", color: "#94a3b8", border: "1px solid oklch(1 0 0 / 8%)" }}>
                    {generatingDraft
                      ? <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                      : <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                    AI 生成草稿
                  </button>
                  <button onClick={() => setShowTemplates(!showTemplates)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: showTemplates ? "#fe2c5520" : "oklch(0.22 0.02 250)",
                      color: showTemplates ? "#fe2c55" : "#94a3b8",
                      border: `1px solid ${showTemplates ? "#fe2c5540" : "oklch(1 0 0 / 8%)"}`,
                    }}>
                    <BookOpen className="w-3.5 h-3.5" />选择模板
                  </button>
                </div>

                {showTemplates && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ border: "1px solid #fe2c5530" }}>
                    <div className="px-3 py-2 flex items-center justify-between"
                      style={{ background: "#fe2c5515" }}>
                      <span className="text-xs font-semibold text-blue-400">选择回复模板</span>
                      <span className="text-xs text-slate-500">{templates.length} 个模板</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto"
                      style={{ background: "oklch(0.17 0.02 250)" }}>
                      {templates
                        .filter(t => t.platform === "tiktok" || t.platform === "all")
                        .map(tpl => (
                          <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                            className="w-full text-left px-3 py-2.5 transition-all hover:bg-white/5 active:scale-[0.99]"
                            style={{ borderBottom: "1px solid oklch(1 0 0 / 5%)" }}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-semibold text-white">{tpl.name}</span>
                              <span className="text-xs text-slate-600">{tpl.category}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">{tpl.content_en}</p>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">回复内容（英文）</span>
                    <span className="text-xs text-slate-600">{replyText.length} 字符</span>
                  </div>
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="输入回复内容，或使用 AI 草稿 / 选择模板…"
                    className="w-full rounded-2xl p-3.5 text-sm text-white resize-none outline-none leading-relaxed"
                    style={{
                      background: "oklch(0.17 0.02 250)",
                      border: "1px solid oklch(1 0 0 / 12%)",
                      minHeight: "110px",
                    }} />
                </div>
              </>
            )}
          </div>

          {/* 底部操作按钮 */}
          {selectedMsg.status !== "replied" && selectedMsg.status !== "converted" && (
            <div className="px-4 pb-8 pt-3 flex gap-2.5 flex-shrink-0"
              style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}>
              <button onClick={() => handleConvert(selectedMsg)} disabled={!!converting}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "#8b5cf215", color: "#8b5cf6", border: "1px solid #8b5cf230" }}>
                {converting === selectedMsg.id
                  ? <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                  : <ArrowRightCircle className="w-4 h-4" />}
                转为询盘
              </button>
              <button onClick={handleReply} disabled={sending || !replyText.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "#fe2c55", color: "white" }}>
                {sending
                  ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : <Send className="w-4 h-4" />}
                下发回复指令
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
