/* ============================================================
   DESIGN: Night Commander — Mobile UX v4
   Philosophy: 意图驱动 · 手动 + 语音双路径 · 兼容性优先
   
   架构：
     主视图一：今日状态（战报 + 数字员工 + 待处理）
     主视图二：询盘管理（8状态 + 置信度 + 完整报价流程）
     全局：语音助手浮动入口（批量指令 + 上下文感知）
   
   询盘状态：
     我方未回复 → 未报价 → 已报价 → 客户未回复
     → 询盘转出 / 询盘转合同 / 询盘失效
   
   报价流程：
     置信度评估 → 飞书模板拉取 → 语音/手动填价
     → 选跟进风格（强势/友好/商务）→ 预览确认 → 发送
     → 24h 自动跟进启动
   ============================================================ */
import { useState, useEffect, useRef, useCallback } from "react";
import { inquiriesApi, feedApi, type Inquiry, type FeedItem, type FeedQuota } from "@/lib/api";
import { useInquiries, useOpenClawStatus } from "@/hooks/useInquiries";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Bell, Zap, Plus, Coins, ChevronRight, ChevronDown,
  CheckCircle2, Loader2, Clock, AlertCircle,
  MessageSquare, Globe, TrendingUp, Target,
  Linkedin, Facebook, Smartphone, Shield,
  Send, X, Check, ArrowLeft, RefreshCw,
  Building2, FileText, Activity, Settings,
  Mic, MicOff, Package, Map, Layers,
  MoreHorizontal, Inbox, Bot, Star,
  Phone, Mail, Filter,
  BarChart3, Users, ChevronUp, Eye,
  Copy, Trash2, UserCheck, Handshake,
  Timer, Repeat, Volume2, Sparkles,
  TrendingDown, Hash, ExternalLink,
  AlertTriangle, Info, Zap as ZapIcon,
  PlayCircle, PauseCircle, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { useNotifSettings, useUserPlan } from "../App";
import AIThinkingPanel, { useAIThinking } from "../components/AIThinkingPanel";

// ─── 类型定义 ─────────────────────────────────────────────────

type InquiryStatus =
  | "unread"        // 我方未回复
  | "unquoted"      // 未报价（看了但未发）
  | "quoted"        // 已报价
  | "no_reply"      // 客户未回复
  | "transferred"   // 询盘转出（转人工）
  | "contracted"    // 询盘转合同
  | "expired";      // 询盘失效

type FollowUpStyle = "aggressive" | "friendly" | "business";
type MainView = "status" | "feed" | "inquiries";
type InquiryTab = "pending" | "following" | "closed";

interface ConfidenceScore {
  total: number;          // 0-100
  channelWeight: number;  // 渠道权重
  contentQuality: number; // 内容质量
  buyerCompleteness: number; // 买家信息完整度
  label: "高意向" | "中等" | "待验证";
  color: string;
}

interface FollowUpRecord {
  id: string;
  sentAt: string;
  style: FollowUpStyle;
  content: string;
  status: "sent" | "opened" | "replied";
}

interface Lead {
  id: string;
  // 来源
  channel: string;
  channelType: "alibaba" | "linkedin" | "facebook" | "tiktok" | "whatsapp" | "seo" | "geo" | "email" | "custom";
  // 买家
  company: string;
  country: string;
  flag: string;
  contact: string;
  contactTitle?: string;
  email?: string;
  whatsapp?: string;
  // 询盘内容
  product: string;
  quantity?: string;
  originalMsg: string;
  receivedAt: string;
  // 状态
  status: InquiryStatus;
  urgency: "high" | "normal" | "low";
  confidence: ConfidenceScore;
  // 报价
  quotedPrice?: string;
  quotedUnit?: string;
  quotedAt?: string;
  followUpStyle?: FollowUpStyle;
  followUpRecords: FollowUpRecord[];
  nextFollowUpAt?: string;
  // AI
  aiDraftCn: string;
  aiDraftEn: string;
  aiAnalysis: string;
  // 自定义标签
  tags: string[];
  // 转出
  transferredTo?: string;
  transferNote?: string;
}

// ─── Mock 数据 ────────────────────────────────────────────────

const mockLeads: Lead[] = [
  {
    id: "1",
    channel: "Alibaba RFQ", channelType: "alibaba",
    company: "SunPower Solutions", country: "越南", flag: "🇻🇳",
    contact: "Nguyen Van An", contactTitle: "采购总监", email: "nguyen@sunpower.vn", whatsapp: "+84901234567",
    product: "400W 单晶硅太阳能板", quantity: "5,000 件",
    originalMsg: "Hi, I'm interested in your solar panel products. We need 5000 units of 400W monocrystalline panels. Could you provide your best FOB price and delivery time? We are a registered solar installer in Vietnam with 10 years experience.",
    receivedAt: "3分钟前", status: "unread", urgency: "high",
    confidence: { total: 87, channelWeight: 90, contentQuality: 85, buyerCompleteness: 88, label: "高意向", color: "#10b981" },
    followUpRecords: [],
    aiDraftCn: "您好 Nguyen，感谢您对我们太阳能板产品的关注！\n\n400W单晶硅组件，5000件数量，我们的FOB报价为 $[价格]/件。交货期：下单后 25 个工作日。\n\n我们备有 IEC、CE、TÜV 认证，可提供完整认证文件。\n\n请问您需要哪些规格的技术参数？期待进一步合作！",
    aiDraftEn: "Dear Nguyen,\n\nThank you for your interest in our solar panels!\n\nFor 400W monocrystalline panels, 5,000 units, our FOB price is $[PRICE]/unit. Lead time: 25 working days after order confirmation.\n\nWe hold IEC, CE, and TÜV certifications. Please let me know if you need technical specifications.\n\nLooking forward to working with you!",
    aiAnalysis: "高意向买家：有具体数量（5000件）、明确规格（400W单晶）、提供公司背景（10年经验）。Alibaba RFQ 渠道权重高，建议 24 小时内回复，可主动提供认证文件增加信任度。",
    tags: ["大单", "越南市场"],
  },
  {
    id: "2",
    channel: "LinkedIn (OpenClaw)", channelType: "linkedin",
    company: "EcoHome Trading GmbH", country: "德国", flag: "🇩🇪",
    contact: "Klaus Weber", contactTitle: "采购经理", email: "k.weber@ecohome.de",
    product: "户外柚木家具套装", quantity: "50套起",
    originalMsg: "Hello! I found your company through an AI search on Perplexity. We are a furniture importer in Germany, mainly supplying to IKEA-style retail chains. Are you able to supply teak outdoor furniture sets? What's your MOQ and can you do private label?",
    receivedAt: "18分钟前", status: "unquoted", urgency: "normal",
    confidence: { total: 72, channelWeight: 75, contentQuality: 70, buyerCompleteness: 72, label: "中等", color: "#f97316" },
    followUpRecords: [],
    aiDraftCn: "您好 Klaus，很高兴通过 AI 搜索与您相遇！\n\n我们专注户外柚木家具出口超过 10 年，MOQ 50套，支持私标定制。\n\n德国市场是我们的重点市场，我们了解欧盟家具标准（EN 581）。可否告知您主要的零售渠道？我们可以推荐最适合的款式。",
    aiDraftEn: "Dear Klaus,\n\nGreat to connect via AI search! We've been exporting teak outdoor furniture for 10+ years. MOQ starts at 50 sets, private label available.\n\nGermany is one of our key markets and we're familiar with EU furniture standards (EN 581). Could you share your retail channels? We can recommend the most suitable styles.\n\nBest regards",
    aiAnalysis: "中等意向：通过 GEO（Perplexity AI）主动找到我们，说明 GEO 策略有效。买家提到 IKEA 风格零售链，是优质渠道商。建议了解具体款式需求后提供定制方案。",
    tags: ["GEO引流", "德国市场"],
  },
  {
    id: "3",
    channel: "WhatsApp", channelType: "whatsapp",
    company: "Pacific Imports LLC", country: "美国", flag: "🇺🇸",
    contact: "Mike Johnson", contactTitle: "CEO", email: "mike@pacificimports.com", whatsapp: "+12025551234",
    product: "LED 灯具 OEM 定制", quantity: "2000件/SKU × 5 SKU",
    originalMsg: "Hi! We're looking for LED lighting OEM manufacturer. Need custom packaging and private label. 2000 units per SKU, 5 SKUs. UL/ETL certification required. Can you quote?",
    receivedAt: "1小时前", status: "quoted", urgency: "normal",
    confidence: { total: 91, channelWeight: 80, contentQuality: 95, buyerCompleteness: 95, label: "高意向", color: "#10b981" },
    quotedPrice: "$12.50", quotedUnit: "件 FOB", quotedAt: "45分钟前",
    followUpStyle: "business",
    followUpRecords: [
      { id: "f1", sentAt: "45分钟前", style: "business", content: "Dear Mike, please find our quotation attached...", status: "opened" }
    ],
    nextFollowUpAt: "明天 10:00",
    aiDraftCn: "您好 Mike，感谢您的询盘！\n\nOEM 定制是我们的核心业务，2000件/SKU 完全可以接受。UL/ETL 认证我们均已具备。\n\n报价：$12.50/件 FOB，含私标包装设计。交货期 35 个工作日。",
    aiDraftEn: "Dear Mike,\n\nThank you for your inquiry! OEM customization is our core business. 2,000 units/SKU works perfectly. We hold both UL and ETL certifications.\n\nQuotation: $12.50/unit FOB, including private label packaging design. Lead time: 35 working days.",
    aiAnalysis: "高意向买家：CEO 直接联系，有具体 SKU 数量和认证要求，WhatsApp 直接沟通说明决策效率高。已报价，等待回复中。",
    tags: ["OEM", "美国市场", "已报价"],
  },
  {
    id: "4",
    channel: "TikTok 评论", channelType: "tiktok",
    company: "未知", country: "印尼", flag: "🇮🇩",
    contact: "@indo_buyer_2024", email: undefined,
    product: "太阳能路灯",
    originalMsg: "how much for 100pcs solar street light? pls dm price",
    receivedAt: "3小时前", status: "no_reply", urgency: "low",
    confidence: { total: 31, channelWeight: 40, contentQuality: 25, buyerCompleteness: 20, label: "待验证", color: "#94a3b8" },
    followUpRecords: [],
    aiDraftCn: "您好！感谢您对我们太阳能路灯的关注。100件太阳能路灯，请问您需要什么功率规格？我们有 30W、60W、100W 可选。",
    aiDraftEn: "Hello! Thank you for your interest in our solar street lights. For 100 units, could you specify the wattage? We have 30W, 60W, and 100W options available.",
    aiAnalysis: "低置信度：TikTok 评论渠道，买家信息不完整（无公司名、无邮件），询盘内容简短。建议先发送标准询问模板获取更多信息，再决定是否深入跟进。",
    tags: ["待验证", "TikTok"],
  },
  {
    id: "5",
    channel: "SEO 官网表单", channelType: "seo",
    company: "Nordik Furniture AB", country: "瑞典", flag: "🇸🇪",
    contact: "Erik Lindqvist", contactTitle: "采购总监", email: "erik@nordik.se",
    product: "实木橡木餐桌椅套装", quantity: "200套/月",
    originalMsg: "We found your website through Google search. We are a furniture retailer in Sweden with 50+ stores. Looking for a reliable OEM supplier for solid oak dining sets. Monthly volume: 200 sets. Please send catalog and price list.",
    receivedAt: "昨天 16:30", status: "transferred", urgency: "normal",
    confidence: { total: 94, channelWeight: 85, contentQuality: 98, buyerCompleteness: 95, label: "高意向", color: "#10b981" },
    followUpRecords: [],
    transferredTo: "李明（高级业务员）",
    transferNote: "大客户，月量 200 套，已转交李明跟进，预计本周安排视频会议",
    aiDraftCn: "", aiDraftEn: "",
    aiAnalysis: "超高意向：50+门店零售商，月量 200 套，SEO 渠道主动找来。已转人工跟进。",
    tags: ["大客户", "瑞典市场", "已转出"],
  },
  // ─── 社媒渠道转入询盘 ────────────────────────────────────────────
  {
    id: "6",
    channel: "LinkedIn InMail", channelType: "linkedin",
    company: "EuroPower Solutions", country: "意大利", flag: "🇮🇹",
    contact: "Marco Rossi", contactTitle: "Procurement Manager", email: "marco@europower.it",
    product: "400W 单晶硅太阳能板", quantity: "500件起",
    originalMsg: "Thank you for reaching out. We are currently evaluating suppliers for Q2 procurement. Could you send me your product catalog and pricing sheet?",
    receivedAt: "1小时前", status: "unread", urgency: "high",
    confidence: { total: 82, channelWeight: 78, contentQuality: 80, buyerCompleteness: 85, label: "高意向", color: "#10b981" },
    followUpRecords: [],
    aiDraftCn: "您好 Marco，感谢您的回复！\n\n附上我们 400W 单晶硅组件的产品目录和 Q2 报价单。\n\n主要参数：效率 22.1%，25年质保，CE/IEC 认证齐全。\n\n请问您的 Q2 采购时间节点是什么时候？我们可以优先安排产能。",
    aiDraftEn: "Dear Marco,\n\nThank you for your reply! Please find our 400W monocrystalline panel catalog and Q2 pricing sheet attached.\n\nKey specs: 22.1% efficiency, 25-year warranty, CE/IEC certified.\n\nWhat is your Q2 procurement timeline? We can prioritize production capacity for you.",
    aiAnalysis: "LinkedIn InMail 转入：买家主动回复询问产品目录，意向明确。欧洲采购商，Q2 采购计划说明有实际需求。建议附上产品目录并询问时间节点。",
    tags: ["LinkedIn转入", "意大利市场", "Q2采购"],
  },
  {
    id: "7",
    channel: "Facebook 私信", channelType: "facebook",
    company: "Gulf Energy Trading", country: "阿联酋", flag: "🇦🇪",
    contact: "Ahmed Hassan", contactTitle: "Business Development", whatsapp: "+971501234567",
    product: "太阳能逆变器", quantity: "200台",
    originalMsg: "Hi, I saw your Facebook post about solar inverters. We need 200 units for a project in Dubai. What's your best price?",
    receivedAt: "2小时前", status: "unquoted", urgency: "normal",
    confidence: { total: 68, channelWeight: 65, contentQuality: 68, buyerCompleteness: 70, label: "中等", color: "#f97316" },
    followUpRecords: [],
    aiDraftCn: "您好 Ahmed！感谢您通过 Facebook 联系我们。\n\n200台逆变器，迪拜项目，我们有多种规格可选（5KW / 10KW / 20KW）。\n\n请问项目的总装机容量是多少？这样我可以为您推荐最合适的型号和报价。",
    aiDraftEn: "Hi Ahmed! Thank you for reaching out via Facebook.\n\nFor 200 inverter units for your Dubai project, we have multiple options (5KW/10KW/20KW).\n\nCould you share the total system capacity? This will help me recommend the most suitable model and provide an accurate quote.",
    aiAnalysis: "Facebook 私信转入：通过帖子主动联系，有具体项目（迪拜）和数量（200台）。中东市场项目型采购，建议先了解系统规格再报价。",
    tags: ["Facebook转入", "中东市场", "项目采购"],
  },
  {
    id: "8",
    channel: "WhatsApp Business", channelType: "whatsapp",
    company: "Vietnam Solar Co.", country: "越南", flag: "🇻🇳",
    contact: "Nguyen Thi Lan", whatsapp: "+84901234567",
    product: "500KW 单晶硅组件", quantity: "500KW",
    originalMsg: "你好，我们是越南太阳能公司，需要500KW的单晶硅组件，请报价",
    receivedAt: "30分钟前", status: "unread", urgency: "high",
    confidence: { total: 85, channelWeight: 80, contentQuality: 82, buyerCompleteness: 88, label: "高意向", color: "#10b981" },
    followUpRecords: [],
    aiDraftCn: "您好 Lan 女士！感谢您通过 WhatsApp 联系我们。\n\n500KW 单晶硅组件，我们完全可以满足。\n\n报价参考：400W 组件 × 1250 件 = 500KW，FOB 价格约 $[价格]/W。\n\n请问项目地点和安装时间节点？我们可以安排专属报价。",
    aiDraftEn: "Dear Lan,\n\nThank you for contacting us via WhatsApp!\n\nFor 500KW monocrystalline panels (approximately 1,250 units of 400W), our FOB price is approximately $[PRICE]/W.\n\nCould you share the project location and installation timeline? We'll prepare a dedicated quotation for you.",
    aiAnalysis: "WhatsApp Business 转入：用中文沟通说明是华人或熟悉中国供应商的买家，500KW 是中等规模项目采购。意向明确，建议快速响应。",
    tags: ["WhatsApp转入", "越南市场", "项目采购"],
  },
  {
    id: "9",
    channel: "TikTok 评论", channelType: "tiktok",
    company: "未知", country: "印度", flag: "🇮🇳",
    contact: "@solar_india_buyer",
    product: "太阳能板",
    originalMsg: "price for 50pcs? need for my rooftop project in Mumbai",
    receivedAt: "4小时前", status: "unread", urgency: "low",
    confidence: { total: 38, channelWeight: 40, contentQuality: 35, buyerCompleteness: 35, label: "待验证", color: "#94a3b8" },
    followUpRecords: [],
    aiDraftCn: "您好！感谢您的询问。\n\n50件太阳能板用于孟买屋顶项目，请问您需要什么功率？我们有 200W-600W 多种规格。\n\n如方便，请提供您的 WhatsApp 号码，我们可以发送详细报价。",
    aiDraftEn: "Hello! Thank you for your inquiry.\n\nFor 50 solar panels for your Mumbai rooftop project, what wattage do you need? We have options from 200W to 600W.\n\nIf convenient, please share your WhatsApp number so we can send you a detailed quote.",
    aiAnalysis: "TikTok 评论转入：个人屋顶项目，数量小（50件），买家信息不完整。低置信度，建议发送标准询问模板引导到 WhatsApp 进一步沟通。",
    tags: ["TikTok转入", "印度市场", "小单"],
  },
];

// ─── 工具函数 ─────────────────────────────────────────────────

const statusConfig: Record<InquiryStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  unread:      { label: "未回复", color: "text-orange-400", bg: "bg-orange-500/15", icon: <Inbox className="w-3 h-3" /> },
  unquoted:    { label: "未报价", color: "text-yellow-400", bg: "bg-yellow-500/15", icon: <FileText className="w-3 h-3" /> },
  quoted:      { label: "已报价", color: "text-blue-400", bg: "bg-blue-500/15", icon: <Send className="w-3 h-3" /> },
  no_reply:    { label: "客户未回复", color: "text-slate-400", bg: "bg-slate-500/15", icon: <Clock className="w-3 h-3" /> },
  transferred: { label: "已转出", color: "text-purple-400", bg: "bg-purple-500/15", icon: <UserCheck className="w-3 h-3" /> },
  contracted:  { label: "已转合同", color: "text-teal-400", bg: "bg-teal-500/15", icon: <Handshake className="w-3 h-3" /> },
  expired:     { label: "已失效", color: "text-slate-600", bg: "bg-slate-700/30", icon: <Trash2 className="w-3 h-3" /> },
};

const channelIcons: Record<string, React.ReactNode> = {
  alibaba:  <span className="text-orange-400 font-bold text-xs">阿里</span>,
  linkedin: <Linkedin className="w-3.5 h-3.5 text-blue-400" />,
  facebook: <Facebook className="w-3.5 h-3.5 text-blue-500" />,
  tiktok:   <span className="text-pink-400 font-bold text-xs">TK</span>,
  whatsapp: <MessageSquare className="w-3.5 h-3.5 text-green-400" />,
  seo:      <Globe className="w-3.5 h-3.5 text-teal-400" />,
  geo:      <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
  email:    <Mail className="w-3.5 h-3.5 text-slate-400" />,
  custom:   <Hash className="w-3.5 h-3.5 text-slate-400" />,
};

const followUpStyles: Record<FollowUpStyle, { label: string; desc: string; color: string; preview: string }> = {
  aggressive: {
    label: "强势", color: "text-red-400",
    desc: "直接表达紧迫感，推动买家快速决策",
    preview: "Dear [Name], I noticed you haven't responded to our quotation. This price is valid for 3 days only. Please confirm your order to secure the best rate.",
  },
  friendly: {
    label: "友好", color: "text-teal-400",
    desc: "温和亲切，建立长期合作关系",
    preview: "Dear [Name], Just checking in to see if you had a chance to review our quotation. We're happy to answer any questions or adjust the specs to better fit your needs!",
  },
  business: {
    label: "商务", color: "text-blue-400",
    desc: "专业正式，适合大客户和欧美市场",
    preview: "Dear [Name], I'm following up on our quotation sent [DATE]. Please let us know if you require any additional information or would like to schedule a call to discuss further.",
  },
};

// ─── API 数据转换 ─────────────────────────────────────────────
function formatRelativeTime(isoStr: string): string {
  try {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "昨天";
    if (days < 7) return `${days}天前`;
    return new Date(isoStr).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  } catch {
    return isoStr;
  }
}

const PLATFORM_LABELS: Record<string, string> = {
  alibaba: "阿里巴巴", linkedin: "LinkedIn", facebook: "Facebook",
  tiktok: "TikTok", whatsapp: "WhatsApp", geo: "GEO引流",
  seo: "SEO", email: "邮件", custom: "自定义",
};
const COUNTRY_FLAGS: Record<string, string> = {
  "越南": "🇻🇳", "德国": "🇩🇪", "美国": "🇺🇸", "英国": "🇬🇧",
  "澳大利亚": "🇦🇺", "加拿大": "🇨🇦", "法国": "🇫🇷", "日本": "🇯🇵",
  "韩国": "🇰🇷", "印度": "🇮🇳", "巴西": "🇧🇷", "瑞典": "🇸🇪",
  "荷兰": "🇳🇱", "意大利": "🇮🇹", "西班牙": "🇪🇸", "波兰": "🇵🇱",
};

function apiInquiryToLead(inq: Inquiry): Lead {
  const breakdown = inq.confidence_breakdown ?? { channelWeight: 0, contentQuality: 0, buyerCompleteness: 0 };
  const score = inq.confidence_score ?? 0;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label: "高意向" | "中等" | "待验证" = score >= 80 ? "高意向" : score >= 60 ? "中等" : "待验证";
  const platform = inq.source_platform;
  const channelType = (["alibaba","linkedin","facebook","tiktok","whatsapp","seo","geo","email"].includes(platform)
    ? platform : "custom") as Lead["channelType"];
  const country = inq.buyer_country ?? "";
  return {
    id: inq.id,
    channel: PLATFORM_LABELS[platform] ?? platform,
    channelType,
    company: inq.buyer_company ?? "未知公司",
    contact: inq.buyer_name ?? "未知买家",
    contactTitle: "",
    email: inq.buyer_contact?.includes("@") ? inq.buyer_contact : undefined,
    whatsapp: inq.buyer_contact && !inq.buyer_contact.includes("@") ? inq.buyer_contact : undefined,
    country,
    flag: COUNTRY_FLAGS[country] ?? "🌍",
    product: inq.product_name ?? "",
    quantity: inq.quantity ?? "",
    originalMsg: inq.raw_content ?? "",
    aiDraftCn: inq.ai_draft_cn ?? "",
    aiDraftEn: inq.ai_draft_en ?? "",
    aiAnalysis: inq.ai_analysis ?? "",
    confidence: {
      total: score,
      color,
      label,
      channelWeight: breakdown.channelWeight,
      contentQuality: breakdown.contentQuality,
      buyerCompleteness: breakdown.buyerCompleteness,
    },
    status: inq.status as Lead["status"],
    urgency: (inq.urgency as "high" | "normal" | "low") ?? "normal",
    tags: Array.isArray(inq.tags) ? inq.tags : [],
    receivedAt: formatRelativeTime(inq.received_at),
    followUpRecords: [],
    followUpStyle: "business",
    quotedPrice: undefined,
    quotedUnit: undefined,
    quotedAt: undefined,
    nextFollowUpAt: undefined,
    transferredTo: undefined,
    transferNote: undefined,
  };
}

function getNextPushTime(hour: number, minute: number) {
  const now = new Date();
  const bjNow = new Date(now.getTime() + 8 * 3600 * 1000);
  const bjH = bjNow.getUTCHours(), bjM = bjNow.getUTCMinutes(), bjS = bjNow.getUTCSeconds();
  let s = (hour * 3600 + minute * 60) - (bjH * 3600 + bjM * 60 + bjS);
  if (s <= 0) s += 86400;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m 后推送` : `${m}m 后推送`;
}

// ─── 状态栏 ───────────────────────────────────────────────────

function StatusBar() {
  const now = new Date();
  const bj = new Date(now.getTime() + 8 * 3600 * 1000);
  const t = `${String(bj.getUTCHours()).padStart(2,"0")}:${String(bj.getUTCMinutes()).padStart(2,"0")}`;
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1">
      <span className="text-xs font-medium text-white/70 font-mono">{t}</span>
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5 items-end">
          {[3,5,7,9].map((h,i) => <div key={i} className="w-1 rounded-sm bg-white/70" style={{height:`${h}px`}} />)}
        </div>
        <svg className="w-4 h-3" viewBox="0 0 24 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" strokeOpacity="0.7"/>
          <rect x="22" y="3.5" width="2" height="5" rx="1" fill="white" fillOpacity="0.7"/>
          <rect x="2" y="2" width="17" height="8" rx="2" fill="white"/>
        </svg>
      </div>
    </div>
  );
}

// ─── 顶部导航 ─────────────────────────────────────────────────

function TopNav({ view, onChangeView, credits, unreadCount, feedCount, onBack }: {
  view: MainView; onChangeView: (v: MainView) => void;
  credits: number; unreadCount: number; feedCount: number; onBack: () => void;
}) {
  const [, navigate] = useLocation();
  return (
    <div className="px-4 pt-1 pb-3 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Commander</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{background:"oklch(0.22 0.04 40 / 60%)"}}>
            <Coins className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-mono text-orange-300">{credits.toLocaleString()}</span>
          </div>
          <button onClick={() => navigate("/notifications")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 relative active:scale-90 transition-transform">
            <Bell className="w-4 h-4 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-white font-bold" style={{fontSize:"9px"}}>{unreadCount}</span>
              </span>
            )}
          </button>
        </div>
      </div>
      {/* 三 Tab 导航：今日状态 | 信息流 | 我的询盘 */}
      <div className="flex rounded-xl p-0.5" style={{background:"oklch(0.20 0.02 250)"}}>
        <button onClick={() => onChangeView("status")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${view==="status"?"bg-white text-slate-900 shadow-sm":"text-slate-400 hover:text-white"}`}>
          今日状态
        </button>
        <button onClick={() => onChangeView("feed")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 relative ${view==="feed"?"bg-white text-slate-900 shadow-sm":"text-slate-400 hover:text-white"}`}>
          信息流
          {feedCount > 0 && (
            <span className="absolute top-1.5 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-sky-500 flex items-center justify-center">
              <span className="text-white font-bold" style={{fontSize:"8px"}}>{feedCount}</span>
            </span>
          )}
        </button>
        <button onClick={() => onChangeView("inquiries")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 relative ${view==="inquiries"?"bg-white text-slate-900 shadow-sm":"text-slate-400 hover:text-white"}`}>
          我的询盘
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold" style={{fontSize:"8px"}}>{unreadCount}</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── 今日状态视图 ─────────────────────────────────────────────

function StatusView({ onGoFeed, onGoInquiries, isEnterprise = false }: { onGoFeed: () => void; onGoInquiries: () => void; isEnterprise?: boolean }) {
  const { inquiries: rawInquiries, stats } = useInquiries();
  const { status: clawStatus, simulateLead } = useOpenClawStatus();
  const { pushHour, pushMinute } = useNotifSettings();
  const [nextPush, setNextPush] = useState(() => getNextPushTime(pushHour, pushMinute));
  const [showLaunch, setShowLaunch] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const t = setInterval(() => setNextPush(getNextPushTime(pushHour, pushMinute)), 60000);
    return () => clearInterval(t);
  }, [pushHour, pushMinute]);

  const instances = [
    { id:"oc-001", name:"李总 · 广州明辉照明", status:"running" as const, todayOps:28, pendingMsgs:4, lastAction:"LinkedIn: 发现新询盘 · SunPower Solutions" },
    { id:"oc-002", name:"张总 · 佛山顺达五金", status:"running" as const, todayOps:12, pendingMsgs:0, lastAction:"完成每日连接配额 (25/25)" },
  ];

  const allLeads = rawInquiries.map(inq => apiInquiryToLead(inq));
  const pending = allLeads.filter(l => l.status === "unread" || l.status === "unquoted");
  const following = allLeads.filter(l => l.status === "quoted" || l.status === "no_reply");

  return (
    <div className="flex-1 overflow-y-auto pb-28" style={{scrollbarWidth:"none"}}>
      {/* 战报卡 */}
      <div className="rounded-2xl overflow-hidden mx-4 mb-3"
        style={{background:"linear-gradient(135deg, oklch(0.20 0.04 250) 0%, oklch(0.17 0.03 250) 100%)", border:"1px solid oklch(0.50 0.10 250 / 30%)"}}>
        <div className="px-4 pt-4 pb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs text-teal-400 font-medium">系统正常运行</span>
            </div>
            <h2 className="text-base font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>今日战报</h2>
            <p className="text-xs text-slate-400 mt-0.5">{nextPush} · 北京时间</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">今日新增</p>
            <p className="text-2xl font-bold text-orange-400 font-mono">+4</p>
            <p className="text-xs text-slate-500">条询盘</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-px mx-4 mb-3 rounded-xl overflow-hidden" style={{background:"oklch(1 0 0 / 5%)"}}>
          {[
            {label:"待处理", value:`${pending.length}`, color:"text-orange-400"},
            {label:"跟进中", value:`${following.length}`, color:"text-blue-400"},
            {label:"AI操作", value:"28", color:"text-purple-400"},
            {label:"积分消耗", value:"180", color:"text-teal-400"},
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-2.5" style={{background:"oklch(0.16 0.02 250)"}}>
              <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <button onClick={onGoInquiries}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 active:scale-98 transition-transform"
            style={{background:"linear-gradient(135deg, oklch(0.70 0.18 40) 0%, oklch(0.63 0.20 35) 100%)"}}>
            <Inbox className="w-4 h-4" />
            处理 {pending.length} 条待回复询盘
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      </div>

      {/* 数字员工 */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">数字员工状态</h3>
          <span className="text-xs text-teal-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />{instances.length} 个运行中
          </span>
        </div>
        <div className="space-y-2">
          {instances.map(inst => (
            <button key={inst.id}
              onClick={() => navigate("/openclaw")}
              className="w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 active:scale-98 transition-all"
              style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse flex-shrink-0" />
                  <span className="text-sm font-semibold text-white truncate">{inst.name}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{inst.lastAction}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-blue-400 font-mono">{inst.todayOps}</p>
                <p className="text-xs text-slate-500">操作</p>
                {inst.pendingMsgs > 0 && (
                  <span className="text-xs text-orange-400">{inst.pendingMsgs}条消息</span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* 社媒托管入口 */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">社媒账号托管</h3>
          {isEnterprise
            ? <span className="text-xs text-teal-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400" />4 个账号运行中</span>
            : <span className="text-xs text-amber-500 flex items-center gap-1">🔒 独立部署专属</span>
          }
        </div>
        {!isEnterprise && (
          <div className="rounded-xl p-4 mb-2 flex items-start gap-3"
            style={{background:"oklch(0.19 0.02 250)", border:"1px solid #f59e0b30"}}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{background:"#f59e0b15"}}>
              <span className="text-base">🔒</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white mb-0.5">社媒账号托管</p>
              <p className="text-xs text-slate-400 mb-2.5">LinkedIn、Facebook、TikTok、WhatsApp 账号托管仅对独立部署用户开放。升级后 OpenClaw 将为您的账号自动运营。</p>
              <button onClick={() => toast.info("请联系销售团队了解独立部署方案")}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95"
                style={{background:"linear-gradient(135deg, #f59e0b, #d97706)", color:"#000"}}>
                了解独立部署方案 →
              </button>
            </div>
          </div>
        )}
        <div className={`grid grid-cols-2 gap-2 ${!isEnterprise ? "opacity-30 pointer-events-none" : ""}`}>
          <button onClick={() => navigate("/tiktok")}
            className="text-left rounded-xl p-3 flex items-center gap-2.5 active:scale-95 transition-all"
            style={{background:"oklch(0.19 0.02 250)", border:"1px solid #fe2c5530"}}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{background:"#fe2c5520"}}>
              <span className="text-base">🎵</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">TikTok</p>
              <p className="text-xs" style={{color:"#fe2c55"}}>23 条询价评论</p>
            </div>
          </button>
          <button onClick={() => navigate("/facebook")}
            className="text-left rounded-xl p-3 flex items-center gap-2.5 active:scale-95 transition-all"
            style={{background:"oklch(0.19 0.02 250)", border:"1px solid #1877f230"}}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{background:"#1877f220"}}>
              <span className="text-base">📘</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">Facebook</p>
              <p className="text-xs" style={{color:"#1877f2"}}>3 条待回复</p>
            </div>
          </button>
          <button onClick={() => navigate("/linkedin")}
            className="text-left rounded-xl p-3 flex items-center gap-2.5 active:scale-95 transition-all"
            style={{background:"oklch(0.19 0.02 250)", border:"1px solid #0a66c230"}}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{background:"#0a66c220"}}>
              <span className="text-base">💼</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">LinkedIn</p>
              <p className="text-xs" style={{color:"#0a66c2"}}>5 条连接请求</p>
            </div>
          </button>
          <button onClick={() => navigate("/whatsapp")}
            className="text-left rounded-xl p-3 flex items-center gap-2.5 active:scale-95 transition-all"
            style={{background:"oklch(0.19 0.02 250)", border:"1px solid #25d36630"}}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{background:"#25d36620"}}>
              <span className="text-base">💬</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">WhatsApp</p>
              <p className="text-xs" style={{color:"#25d366"}}>3 条未读消息</p>
            </div>
          </button>
        </div>
      </div>

      {/* 快捷功能入口 */}
      <div className="px-4 space-y-2">
        {/* OpenClaw 任务队列 */}
        <button onClick={() => navigate("/task-queue")}
          className="w-full text-left rounded-xl p-3.5 flex items-center gap-3 active:scale-95 transition-all"
          style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)"}}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:"linear-gradient(135deg, #6366f1, #8b5cf6)"}}>
            <span className="text-base">🤖</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">OpenClaw 任务队列</p>
            <p className="text-xs text-slate-400">人工触发 · AI 规划 · 自动执行</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
        </button>
        {/* AI 风格训练 */}
        <button onClick={() => navigate("/style-training")}
          className="w-full text-left rounded-xl p-3.5 flex items-center gap-3 active:scale-95 transition-all"
          style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)"}}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:"linear-gradient(135deg, #a855f7, #ec4899)"}}>
            <span className="text-base">✨</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">AI 风格训练</p>
            <p className="text-xs text-slate-400">上传历史报价 · 学习你的风格 · 个性化草稿</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
        </button>
        {/* Phase 3: 买家信息流 */}
        <button onClick={onGoFeed}
          className="w-full text-left rounded-xl p-3.5 flex items-center gap-3 active:scale-95 transition-all"
          style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)"}}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:"linear-gradient(135deg, #0ea5e9, #6366f1)"}}>
            <span className="text-base">📡</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">买家信息流</p>
            <p className="text-xs text-slate-400">AI 推荐 · 每日 10 条 · 一键加入询盘</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
        </button>
        {/* Phase 3: 管理后台 */}
        <button onClick={() => navigate("/admin")}
          className="w-full text-left rounded-xl p-3.5 flex items-center gap-3 active:scale-95 transition-all"
          style={{background:"oklch(0.19 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)"}}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:"linear-gradient(135deg, #10b981, #0ea5e9)"}}>
            <span className="text-base">🛠️</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">管理后台</p>
            <p className="text-xs text-slate-400">系统监控 · 知识库 · 信息流管理</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
        </button>
        {/* 更多任务 */}
        <button onClick={() => setShowLaunch(true)}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 border border-dashed border-white/15 hover:border-white/25 hover:text-white transition-all active:scale-98">
          <Plus className="w-4 h-4" />发起新任务
        </button>
      </div>

      {showLaunch && (
        <div className="fixed inset-0 z-50 flex items-end" style={{background:"oklch(0 0 0 / 70%)"}} onClick={() => setShowLaunch(false)}>
          <div className="w-full rounded-t-3xl overflow-hidden" style={{background:"oklch(0.16 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)"}} onClick={e=>e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
            <div className="px-5 pb-8">
              <div className="flex items-center justify-between py-4 border-b border-white/8 mb-4">
                <h2 className="text-base font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>发起新任务</h2>
                <button onClick={() => setShowLaunch(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10"><X className="w-4 h-4 text-white" /></button>
              </div>
              <div className="space-y-2.5">
                {[
                  {icon:<Map className="w-5 h-5"/>, color:"text-teal-400", bg:"bg-teal-500/15", title:"开拓新市场", desc:"选择目标市场 + 产品，AI 全套执行", route:"/market"},
                  {icon:<Package className="w-5 h-5"/>, color:"text-blue-400", bg:"bg-blue-500/15", title:"发布新产品", desc:"填写产品信息，AI 生成多语言描述并发布", route:"/product-launch"},
                  {icon:<Layers className="w-5 h-5"/>, color:"text-purple-400", bg:"bg-purple-500/15", title:"调整社媒策略", desc:"修改 OpenClaw 运营频率和目标人群", route:""},
                  {icon:<Globe className="w-5 h-5"/>, color:"text-orange-400", bg:"bg-orange-500/15", title:"GEO 加速优化", desc:"针对特定 AI 搜索引擎提升可见度", route:"/geo"},
                ].map(task => (
                  <button key={task.title}
                    onClick={() => { if(task.route){ setShowLaunch(false); navigate(task.route); } else { toast.info(`${task.title}向导即将上线`); setShowLaunch(false); } }}
                    className="w-full text-left flex items-center gap-3 p-4 rounded-xl active:scale-98 transition-all"
                    style={{background:"oklch(0.20 0.02 250)", border:"1px solid oklch(1 0 0 / 8%)"}}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${task.bg} ${task.color}`}>{task.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{task.title}</p>
                      <p className="text-xs text-slate-500">{task.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 跟进时间线 ─────────────────────────────────────────────────

function FollowUpTimeline({ lead }: { lead: Lead }) {
  const [countdown, setCountdown] = useState("");

  // 计算距离下次跟进的倒计时（模拟：明天10:00）
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const bj = new Date(now.getTime() + 8 * 3600 * 1000);
      const next = new Date(bj);
      next.setUTCHours(10, 0, 0, 0);
      if (next <= bj) next.setUTCDate(next.getUTCDate() + 1);
      const diff = Math.max(0, Math.floor((next.getTime() - bj.getTime()) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setCountdown(`${h}h ${m}m`);
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, []);

  // 构建时间线节点
  const timelineNodes = [
    {
      id: "quoted",
      label: "报价已发送",
      time: lead.quotedAt || "—",
      status: "done" as const,
      detail: `${lead.quotedPrice}/${lead.quotedUnit}`,
      icon: <Send className="w-3 h-3" />,
      color: "#10b981",
    },
    ...lead.followUpRecords.map((r, i) => ({
      id: r.id,
      label: `第 ${i + 1} 次跟进`,
      time: r.sentAt,
      status: r.status === "replied" ? "done" as const : r.status === "opened" ? "active" as const : "done" as const,
      detail: `【${followUpStyles[r.style].label}】${r.status === "replied" ? "买家已回复" : r.status === "opened" ? "买家已读，未回复" : "已发送，未读"}`,
      icon: <Repeat className="w-3 h-3" />,
      color: r.status === "replied" ? "#10b981" : r.status === "opened" ? "#f97316" : "#60a5fa",
    })),
    {
      id: "next",
      label: lead.status === "no_reply" ? "再次跟进（待执行）" : "自动跟进（待执行）",
      time: lead.nextFollowUpAt || `${countdown} 后`,
      status: "pending" as const,
      detail: lead.followUpStyle ? `将以【${followUpStyles[lead.followUpStyle].label}】风格发送` : "跟进风格待设置",
      icon: <Timer className="w-3 h-3" />,
      color: "#94a3b8",
    },
  ];

  return (
    <div className="px-4 py-4 border-b border-white/8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">跟进时间线</p>
        {lead.status === "no_reply" && (
          <span className="text-xs text-orange-400 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10">
            <AlertCircle className="w-3 h-3" />客户未回复
          </span>
        )}
      </div>

      {/* 报价金额摘要 */}
      <div className="flex items-center gap-3 p-3 rounded-xl mb-3"
        style={{background:"oklch(0.18 0.03 250)", border:"1px solid oklch(0.50 0.15 250 / 20%)"}}>
        <div className="flex-1">
          <p className="text-xs text-slate-500">报价金额</p>
          <p className="text-base font-bold text-white font-mono">{lead.quotedPrice}<span className="text-xs text-slate-400 font-normal">/{lead.quotedUnit}</span></p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500">跟进风格</p>
          <p className={`text-sm font-semibold ${
            lead.followUpStyle === "aggressive" ? "text-red-400" :
            lead.followUpStyle === "friendly" ? "text-teal-400" : "text-blue-400"
          }`}>{lead.followUpStyle ? `【${followUpStyles[lead.followUpStyle].label}】` : "未设置"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">下次跟进</p>
          <p className="text-xs text-orange-400 font-mono">{countdown}</p>
        </div>
      </div>

      {/* 时间线 */}
      <div className="relative">
        {/* 竖线 */}
        <div className="absolute left-[11px] top-3 bottom-3 w-px" style={{background:"oklch(1 0 0 / 10%)"}} />

        <div className="space-y-0">
          {timelineNodes.map((node, idx) => (
            <div key={node.id} className="flex gap-3 pb-4 last:pb-0">
              {/* 节点圆圈 */}
              <div className="flex-shrink-0 relative z-10">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  node.status === "pending" ? "border border-dashed" : ""
                }`}
                  style={{
                    background: node.status === "pending" ? "oklch(0.16 0.02 250)" : `${node.color}25`,
                    borderColor: node.status === "pending" ? "oklch(1 0 0 / 20%)" : "transparent",
                    color: node.status === "pending" ? "#64748b" : node.color,
                  }}>
                  {node.icon}
                </div>
              </div>
              {/* 内容 */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-semibold ${
                    node.status === "pending" ? "text-slate-500" : "text-white"
                  }`}>{node.label}</p>
                  <span className="text-xs text-slate-600 flex-shrink-0">{node.time}</span>
                </div>
                <p className="text-xs mt-0.5" style={{color: node.status === "pending" ? "#475569" : node.color}}>
                  {node.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 置信度徽章 ───────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: ConfidenceScore }) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{background:`${score.color}20`, border:`1px solid ${score.color}40`}}>
      <Star className="w-2.5 h-2.5" style={{color:score.color}} />
      <span className="text-xs font-semibold" style={{color:score.color}}>{score.label} {score.total}</span>
    </div>
  );
}

// ─── 询盘卡片 ─────────────────────────────────────────────────

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const sc = statusConfig[lead.status];
  return (
    <button onClick={onOpen}
      className="w-full text-left rounded-xl overflow-hidden active:scale-98 transition-all"
      style={{background:"oklch(0.19 0.02 250)", border:`1px solid ${lead.urgency==="high"?"oklch(0.70 0.18 40 / 30%)":"oklch(1 0 0 / 8%)"}`}}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
            <span className="text-xl">{lead.flag}</span>
            <span className="text-xs text-slate-600">{lead.country}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1 mb-1">
              <p className="text-sm font-bold text-white leading-tight">{lead.company}</p>
              <span className="text-xs text-slate-500 flex-shrink-0">{lead.receivedAt}</span>
            </div>
            <p className="text-xs text-slate-400 mb-1.5">{lead.product}{lead.quantity ? ` · ${lead.quantity}` : ""}</p>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{lead.originalMsg}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-white/8">
              {channelIcons[lead.channelType]}
            </div>
            <span className="text-xs text-slate-500">{lead.channel}</span>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceBadge score={lead.confidence} />
            <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${sc.bg} ${sc.color}`}>
              {sc.icon}{sc.label}
            </span>
          </div>
        </div>
        {lead.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {lead.tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-xs text-slate-500 bg-white/5">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── 询盘详情 + 完整流程 ──────────────────────────────────────

type DetailStep = "overview" | "quote" | "followup" | "preview" | "transfer";

function LeadDetailFlow({ lead: initialLead, onBack, onUpdate }: {
  lead: Lead; onBack: () => void; onUpdate: (updated: Lead) => void;
}) {
  const [lead, setLead] = useState(initialLead);
  const [step, setStep] = useState<DetailStep>("overview");
  const [price, setPrice] = useState(lead.quotedPrice?.replace("$","") || "");
  const [priceUnit, setPriceUnit] = useState(lead.quotedUnit || "件 FOB");
  const [draftCn, setDraftCn] = useState(lead.aiDraftCn);
  const [selectedStyle, setSelectedStyle] = useState<FollowUpStyle>(lead.followUpStyle || "business");
  const [sending, setSending] = useState(false);
  const [showConfidence, setShowConfidence] = useState(false);
  const [showAIThinking, setShowAIThinking] = useState(false);
  const [aiThinkingTriggered, setAiThinkingTriggered] = useState(false);
  const { steps: thinkingSteps, isRunning: thinkingRunning, totalDuration: thinkingDuration } = useAIThinking(aiThinkingTriggered);
  const [transferTo, setTransferTo] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const sc = statusConfig[lead.status];

  const handleSend = async () => {
    if (!price) { toast.error("请填写报价金额"); return; }
    setSending(true);
    try {
      // 先发送报价到后端
      await inquiriesApi.quote(lead.id, {
        unitPrice: parseFloat(price),
        unit: priceUnit.split(" ")[0] || "件",
        priceTerm: priceUnit.includes("FOB") ? "FOB" : "EXW",
        followupStyle: selectedStyle,
      });
      // 再发送回复（AI草稿）
      await inquiriesApi.reply(lead.id, {
        contentZh: draftCn,
        useAiDraft: true,
      });
      const updated: Lead = {
        ...lead, status: "quoted",
        quotedPrice: `$${price}`, quotedUnit: priceUnit, quotedAt: "刚刚",
        followUpStyle: selectedStyle,
        nextFollowUpAt: "明天 10:00",
        followUpRecords: [...lead.followUpRecords, {
          id: Date.now().toString(), sentAt: "刚刚", style: selectedStyle,
          content: followUpStyles[selectedStyle].preview, status: "sent",
        }],
      };
      setLead(updated);
      onUpdate(updated);
      setStep("overview");
      toast.success("报价已发送", { description: `24小时后将自动以【${followUpStyles[selectedStyle].label}】风格跟进` });
    } catch (err: any) {
      toast.error(err.message ?? "发送失败，请重试");
    } finally {
      setSending(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferTo) { toast.error("请填写业务员姓名"); return; }
    try {
      await inquiriesApi.transfer(lead.id, transferTo, transferNote);
      const updated: Lead = { ...lead, status: "transferred", transferredTo: transferTo, transferNote };
      setLead(updated);
      onUpdate(updated);
      setStep("overview");
      toast.success(`已转交给 ${transferTo}`, { description: "系统将通知业务员跟进" });
    } catch (err: any) {
      toast.error(err.message ?? "转交失败");
    }
  };

  const handleExpire = () => {
    const updated: Lead = { ...lead, status: "expired" };
    setLead(updated);
    onUpdate(updated);
    onBack();
    toast.info("询盘已标记为失效");
  };

  // ── 概览页 ──
  if (step === "overview") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 flex-shrink-0">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{lead.company}</p>
            <p className="text-xs text-slate-500">{lead.contact}{lead.contactTitle ? ` · ${lead.contactTitle}` : ""}</p>
          </div>
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${sc.bg} ${sc.color}`}>
            {sc.icon}{sc.label}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pb-4" style={{scrollbarWidth:"none"}}>
          {/* 置信度 */}
          <button onClick={() => setShowConfidence(!showConfidence)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <ConfidenceBadge score={lead.confidence} />
              <span className="text-xs text-slate-500">AI 置信度评估</span>
            </div>
            {showConfidence ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {showConfidence && (
            <div className="px-4 py-3 border-b border-white/8 space-y-2" style={{background:"oklch(0.17 0.02 250)"}}>
              {[
                {label:"渠道权重", value:lead.confidence.channelWeight},
                {label:"内容质量", value:lead.confidence.contentQuality},
                {label:"买家完整度", value:lead.confidence.buyerCompleteness},
              ].map(d => (
                <div key={d.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">{d.label}</span>
                    <span className="text-xs font-mono" style={{color:lead.confidence.color}}>{d.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${d.value}%`, background:lead.confidence.color}} />
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500 pt-1 leading-relaxed">{lead.aiAnalysis}</p>
            </div>
          )}
          {/* M4: AI 思考过程可视化 */}
          <button
            onClick={() => {
              setShowAIThinking(!showAIThinking);
              if (!aiThinkingTriggered) setAiThinkingTriggered(true);
            }}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <span className="text-base">🧠</span>
              <span className="text-xs text-slate-400">AI 思考过程</span>
              {thinkingRunning && (
                <span className="flex items-center gap-1 text-xs text-indigo-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />分析中
                </span>
              )}
              {!thinkingRunning && thinkingSteps.length > 0 && (
                <span className="text-xs text-green-400">✓ 已完成</span>
              )}
            </div>
            {showAIThinking ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {showAIThinking && (
            <div className="px-4 py-3 border-b border-white/8">
              <AIThinkingPanel
                steps={thinkingSteps}
                isRunning={thinkingRunning}
                totalDuration={thinkingDuration}
                creditsUsed={thinkingRunning ? undefined : 3}
                styleUsed={false}
              />
            </div>
          )}

          {/* 买家信息 */}
          <div className="px-4 py-4 border-b border-white/8">
            <p className="text-xs text-slate-500 mb-2">买家信息</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {label:"来源渠道", value:lead.channel},
                {label:"询盘产品", value:lead.product},
                {label:"询盘数量", value:lead.quantity || "未注明"},
                {label:"收到时间", value:lead.receivedAt},
              ].map(f => (
                <div key={f.label} className="p-2.5 rounded-lg" style={{background:"oklch(0.20 0.02 250)"}}>
                  <p className="text-xs text-slate-500 mb-0.5">{f.label}</p>
                  <p className="text-xs font-medium text-white">{f.value}</p>
                </div>
              ))}
            </div>
            {/* 联系方式 */}
            <div className="flex gap-2 mt-2">
              {lead.email && (
                <button onClick={() => toast.info(`邮件：${lead.email}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-blue-400 bg-blue-500/10 active:scale-95">
                  <Mail className="w-3 h-3" />{lead.email}
                </button>
              )}
              {lead.whatsapp && (
                <button onClick={() => toast.info(`WhatsApp：${lead.whatsapp}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-green-400 bg-green-500/10 active:scale-95">
                  <MessageSquare className="w-3 h-3" />{lead.whatsapp}
                </button>
              )}
            </div>
          </div>

          {/* 原始询盘 */}
          <div className="px-4 py-4 border-b border-white/8">
            <p className="text-xs text-slate-500 mb-2">买家原文</p>
            <div className="p-3 rounded-xl" style={{background:"oklch(0.20 0.02 250)"}}>
              <p className="text-sm text-slate-300 leading-relaxed">{lead.originalMsg}</p>
            </div>
          </div>

          {/* 跟进时间线 */}
          {(lead.status === "quoted" || lead.status === "no_reply") && lead.quotedPrice && (
            <FollowUpTimeline lead={lead} />
          )}

          {/* 转出状态 */}
          {lead.status === "transferred" && lead.transferredTo && (
            <div className="px-4 py-4 border-b border-white/8">
              <p className="text-xs text-slate-500 mb-2">转出记录</p>
              <div className="p-3 rounded-xl" style={{background:"oklch(0.20 0.02 250)"}}>
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white">{lead.transferredTo}</span>
                </div>
                {lead.transferNote && <p className="text-xs text-slate-400">{lead.transferNote}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {(lead.status === "unread" || lead.status === "unquoted") && (
          <div className="px-4 py-3 flex-shrink-0 border-t border-white/8 space-y-2">
            <button onClick={() => setStep("quote")}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
              style={{background:"linear-gradient(135deg, oklch(0.70 0.18 40) 0%, oklch(0.63 0.20 35) 100%)"}}>
              <Bot className="w-4 h-4" />开始报价流程
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
            <div className="flex gap-2">
              <button onClick={() => setStep("transfer")}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-purple-400 border border-purple-500/30 active:scale-95">
                转人工跟进
              </button>
              <button onClick={handleExpire}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-500 border border-white/10 active:scale-95">
                标记失效
              </button>
            </div>
          </div>
        )}
        {lead.status === "quoted" && (
          <div className="px-4 py-3 flex-shrink-0 border-t border-white/8 space-y-2">
            <div className="flex gap-2">
              <button onClick={() => setStep("followup")}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-blue-400 border border-blue-500/30 active:scale-95">
                调整跟进策略
              </button>
              <button onClick={() => { const u = {...lead, status:"contracted" as InquiryStatus}; setLead(u); onUpdate(u); onBack(); toast.success("已标记为转合同！"); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-teal-400 border border-teal-500/30 active:scale-95">
                标记转合同
              </button>
            </div>
            {/* 模拟 24h 客户未回复状态流转 */}
            <button
              onClick={() => {
                const updated: Lead = { ...lead, status: "no_reply" as InquiryStatus };
                setLead(updated);
                onUpdate(updated);
                toast.warning("已模拟 24h 客户未回复，询盘状态已更新", {
                  description: "实际业务中由 OpenClaw 监控并自动触发通知"
                });
              }}
              className="w-full py-2 rounded-xl text-xs font-medium text-slate-500 border border-dashed border-white/10 hover:border-white/20 hover:text-slate-400 transition-all active:scale-95 flex items-center justify-center gap-1.5">
              <Timer className="w-3 h-3" />
              模拟：24h 客户未回复（测试状态流转）
            </button>
          </div>
        )}
        {lead.status === "no_reply" && (
          <div className="px-4 py-3 flex-shrink-0 border-t border-white/8 space-y-2">
            <div className="flex gap-2">
              <button onClick={() => setStep("followup")}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-orange-400 border border-orange-500/30 active:scale-95">
                立即跟进
              </button>
              <button onClick={() => setStep("transfer")}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-purple-400 border border-purple-500/30 active:scale-95">
                转人工
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const u = {...lead, status:"contracted" as InquiryStatus}; setLead(u); onUpdate(u); onBack(); toast.success("已标记为转合同！"); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-teal-400 border border-teal-500/30 active:scale-95">
                标记转合同
              </button>
              <button onClick={handleExpire}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-500 border border-white/10 active:scale-95">
                标记失效
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 报价页 ──
  if (step === "quote") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 flex-shrink-0">
          <button onClick={() => setStep("overview")} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <p className="text-sm font-bold text-white flex-1">报价设置</p>
          <span className="text-xs text-blue-400 flex items-center gap-1"><Bot className="w-3 h-3" />飞书模板已就绪</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{scrollbarWidth:"none"}}>
          {/* 飞书模板提示 */}
          <div className="p-3 rounded-xl flex items-center gap-2.5" style={{background:"oklch(0.18 0.03 250)", border:"1px solid oklch(0.50 0.10 250 / 20%)"}}>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-white">飞书报价模板已拉取</p>
              <p className="text-xs text-slate-500">太阳能板 · B2B 标准报价单 · 含付款条件/交货期</p>
            </div>
            <button onClick={() => toast.info("报价单预览即将上线")}
              className="text-xs text-blue-400 flex items-center gap-0.5">
              <Eye className="w-3 h-3" />预览
            </button>
          </div>

          {/* 报价金额 */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">报价金额 <span className="text-orange-400">*</span></label>
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{background:"oklch(0.20 0.02 250)", border:"1px solid oklch(0.70 0.18 40 / 30%)"}}>
              <span className="text-slate-400 font-mono">$</span>
              <input type="number" placeholder="输入单价，如 12.50"
                value={price} onChange={e => setPrice(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-600 font-mono" />
              <select value={priceUnit} onChange={e => setPriceUnit(e.target.value)}
                className="bg-transparent text-xs text-slate-400 outline-none">
                {["件 FOB","件 CIF","套 FOB","KG FOB","M² FOB"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <button onClick={() => toast.info("语音输入报价即将上线")}
              className="mt-1.5 flex items-center gap-1 text-xs text-orange-400">
              <Mic className="w-3 h-3" />语音输入报价
            </button>
          </div>

          {/* 草稿编辑 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400">中文草稿 <span className="text-slate-600">（AI 生成，可修改）</span></label>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      toast.info("🤖 AI 正在重新生成草稿...");
                      const res = await inquiriesApi.regenerateDraft(lead.id, { priceHint: price ? `$${price}/${priceUnit}` : undefined });
                      setDraftCn(res.draftCn);
                      toast.success("✨ AI 草稿已更新！");
                    } catch (e: any) {
                      toast.error(e.message ?? "生成失败");
                    }
                  }}
                  className="text-xs text-purple-400 flex items-center gap-0.5 hover:text-purple-300 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />AI 重生成
                </button>
                <button onClick={() => setDraftCn(lead.aiDraftCn)} className="text-xs text-blue-400 flex items-center gap-0.5">
                  <RefreshCw className="w-3 h-3" />重置
                </button>
              </div>
            </div>
            <textarea value={draftCn} onChange={e => setDraftCn(e.target.value)} rows={7}
              className="w-full p-3 rounded-xl text-sm text-white leading-relaxed resize-none outline-none"
              style={{background:"oklch(0.20 0.02 250)", border:"1px solid oklch(1 0 0 / 12%)"}} />
          </div>

          {/* 跟进风格 */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">报价后跟进风格</label>
            <div className="space-y-2">
              {(Object.entries(followUpStyles) as [FollowUpStyle, typeof followUpStyles[FollowUpStyle]][]).map(([key, s]) => (
                <button key={key} onClick={() => setSelectedStyle(key)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${selectedStyle===key?"ring-1":"opacity-60"}`}
                  style={{
                    background:"oklch(0.20 0.02 250)",
                    outline: selectedStyle===key ? `2px solid ${key==="aggressive"?"#f87171":key==="friendly"?"#34d399":"#60a5fa"}` : "none",
                    border: selectedStyle===key ? `1px solid ${key==="aggressive"?"#f87171":key==="friendly"?"#34d399":"#60a5fa"}40` : "1px solid oklch(1 0 0 / 8%)"
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${s.color}`}>【{s.label}】</span>
                    <span className="text-xs text-slate-500">{s.desc}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{s.preview}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl flex items-start gap-2" style={{background:"oklch(0.18 0.03 250)", border:"1px solid oklch(0.50 0.10 250 / 20%)"}}>
            <Shield className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              OpenClaw 将把中文草稿翻译为专业英文，以您的账号发送。报价发出后 24 小时内自动以选定风格跟进。
            </p>
          </div>
        </div>

        <div className="px-4 py-3 flex-shrink-0 border-t border-white/8">
          <button onClick={() => setStep("preview")}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{background:"linear-gradient(135deg, oklch(0.70 0.18 40) 0%, oklch(0.63 0.20 35) 100%)"}}>
            预览并确认发送 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── 跟进策略调整页 ──
  if (step === "followup") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 flex-shrink-0">
          <button onClick={() => setStep("overview")} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <p className="text-sm font-bold text-white flex-1">调整跟进策略</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{scrollbarWidth:"none"}}>
          <p className="text-xs text-slate-500 mb-2">选择跟进风格</p>
          {(Object.entries(followUpStyles) as [FollowUpStyle, typeof followUpStyles[FollowUpStyle]][]).map(([key, s]) => (
            <button key={key} onClick={() => setSelectedStyle(key)}
              className={`w-full text-left p-4 rounded-xl transition-all`}
              style={{background:"oklch(0.20 0.02 250)", border:`1px solid ${selectedStyle===key?(key==="aggressive"?"#f87171":key==="friendly"?"#34d399":"#60a5fa")+"60":"oklch(1 0 0 / 8%)"}`}}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-bold ${s.color}`}>【{s.label}】</span>
                <span className="text-xs text-slate-500">{s.desc}</span>
                {selectedStyle===key && <Check className="w-4 h-4 ml-auto" style={{color:key==="aggressive"?"#f87171":key==="friendly"?"#34d399":"#60a5fa"}} />}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{s.preview}</p>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 flex-shrink-0 border-t border-white/8">
          <button onClick={() => {
            const updated = {...lead, followUpStyle: selectedStyle};
            setLead(updated); onUpdate(updated);
            setStep("overview");
            toast.success(`跟进风格已更新为【${followUpStyles[selectedStyle].label}】`);
          }}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white active:scale-95 transition-transform"
            style={{background:"linear-gradient(135deg, oklch(0.70 0.18 40) 0%, oklch(0.63 0.20 35) 100%)"}}>
            保存设置
          </button>
        </div>
      </div>
    );
  }

  // ── 转人工页 ──
  if (step === "transfer") {
    const salesTeam = ["李明（高级业务员）","王芳（外贸专员）","陈刚（大客户经理）"];
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 flex-shrink-0">
          <button onClick={() => setStep("overview")} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <p className="text-sm font-bold text-white flex-1">转人工跟进</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{scrollbarWidth:"none"}}>
          <p className="text-xs text-slate-500 mb-2">选择业务员</p>
          <div className="space-y-2">
            {salesTeam.map(name => (
              <button key={name} onClick={() => setTransferTo(name)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{background:"oklch(0.20 0.02 250)", border:`1px solid ${transferTo===name?"oklch(0.70 0.18 250 / 50%)":"oklch(1 0 0 / 8%)"}`}}>
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-400">{name[0]}</span>
                </div>
                <span className="text-sm text-white flex-1">{name}</span>
                {transferTo===name && <Check className="w-4 h-4 text-purple-400" />}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">备注（可选）</label>
            <textarea value={transferNote} onChange={e => setTransferNote(e.target.value)}
              placeholder="如：大客户，建议本周安排视频会议..."
              rows={3} className="w-full p-3 rounded-xl text-sm text-white resize-none outline-none placeholder:text-slate-600"
              style={{background:"oklch(0.20 0.02 250)", border:"1px solid oklch(1 0 0 / 12%)"}} />
          </div>
        </div>
        <div className="px-4 py-3 flex-shrink-0 border-t border-white/8">
          <button onClick={handleTransfer}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white active:scale-95 transition-transform"
            style={{background:"linear-gradient(135deg, oklch(0.60 0.15 290) 0%, oklch(0.53 0.18 285) 100%)"}}>
            确认转出
          </button>
        </div>
      </div>
    );
  }

  // ── 预览确认页 ──
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 flex-shrink-0">
        <button onClick={() => setStep("quote")} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <p className="text-sm font-bold text-white flex-1">确认发送</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{scrollbarWidth:"none"}}>
        <div className="p-3 rounded-xl flex items-center gap-3" style={{background:"oklch(0.20 0.02 250)"}}>
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400">发送至</p>
            <p className="text-sm font-semibold text-white">{lead.contact} · {lead.company}</p>
          </div>
          <span className="text-sm font-bold text-teal-400 font-mono">${price}/{priceUnit}</span>
        </div>
        <div className="p-3 rounded-xl flex items-center gap-2" style={{background:"oklch(0.20 0.02 250)"}}>
          <Repeat className="w-4 h-4 text-orange-400" />
          <div>
            <p className="text-xs text-slate-400">自动跟进</p>
            <p className="text-sm text-white">24小时后 · 【{followUpStyles[selectedStyle].label}】风格</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
            <Globe className="w-3 h-3" />英文发送内容（OpenClaw 翻译）
          </p>
          <div className="p-3 rounded-xl" style={{background:"oklch(0.20 0.02 250)", border:"1px solid oklch(0.50 0.15 250 / 20%)"}}>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {lead.aiDraftEn.replace("[PRICE]", price || "X")}
            </p>
          </div>
        </div>
        <div className="p-3 rounded-xl flex items-start gap-2" style={{background:"oklch(0.22 0.04 40 / 20%)", border:"1px solid oklch(0.70 0.18 40 / 25%)"}}>
          <AlertCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-300 leading-relaxed">确认后将立即通过 OpenClaw 以您的账号发送，无法撤回。</p>
        </div>
      </div>
      <div className="px-4 py-3 flex-shrink-0 border-t border-white/8 flex gap-2">
        <button onClick={() => setStep("quote")}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-300 border border-white/15 active:scale-95">
          返回修改
        </button>
        <button onClick={handleSend} disabled={sending}
          className="flex-2 px-6 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
          style={{background:"linear-gradient(135deg, oklch(0.70 0.18 40) 0%, oklch(0.63 0.20 35) 100%)", flex:2}}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "发送中..." : "确认发送"}
        </button>
      </div>
    </div>
  );
}

// ─── 询盘管理视图 ─────────────────────────────────────────────

function InquiriesView() {
  const { inquiries: rawInquiries, loading: inquiriesLoading, refresh: refreshInquiries } = useInquiries();
  const [localUpdates, setLocalUpdates] = useState<Record<string, Partial<Lead>>>({});
  const leads: Lead[] = rawInquiries.map(inq => {
    const base = apiInquiryToLead(inq);
    return localUpdates[inq.id] ? { ...base, ...localUpdates[inq.id] } : base;
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<InquiryTab>("pending");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const handleUpdate = (updated: Lead) => {
    setLocalUpdates(prev => ({ ...prev, [updated.id]: updated }));
    refreshInquiries();
    setSelectedLead(null);
  };

  const pendingLeads = leads.filter(l => l.status === "unread" || l.status === "unquoted");
  const followingLeads = leads.filter(l => l.status === "quoted" || l.status === "no_reply" || l.status === "transferred");
  const closedLeads = leads.filter(l => l.status === "contracted" || l.status === "expired");

  const tabLeads = activeTab === "pending" ? pendingLeads : activeTab === "following" ? followingLeads : closedLeads;

  if (selectedLead) {
    return <LeadDetailFlow lead={selectedLead} onBack={() => setSelectedLead(null)} onUpdate={handleUpdate} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab 切换 */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div className="flex gap-1 p-0.5 rounded-xl" style={{background:"oklch(0.18 0.02 250)"}}>
          {([
            {key:"pending", label:"待处理", count:pendingLeads.length, color:"text-orange-400"},
            {key:"following", label:"跟进中", count:followingLeads.length, color:"text-blue-400"},
            {key:"closed", label:"已结束", count:closedLeads.length, color:"text-slate-500"},
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${activeTab===tab.key?"bg-white text-slate-900":"text-slate-400"}`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs font-bold ${activeTab===tab.key?"text-slate-700":tab.color}`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-2.5" style={{scrollbarWidth:"none"}}>
        {tabLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
              <Inbox className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">暂无{activeTab==="pending"?"待处理":activeTab==="following"?"跟进中":"已结束"}询盘</p>
          </div>
        ) : (
          tabLeads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onOpen={() => setSelectedLead(lead)} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── 语音助手浮动按钮 ─────────────────────────────────────────

type VoiceState = "idle" | "listening" | "processing" | "result";

const voiceExamples = [
  "越南那条询盘，报 $12.5，用友好风格，今天发",
  "把所有未回复询盘先发感谢邮件",
  "李总的 OpenClaw 暂停今天的 LinkedIn",
  "开始测试越南太阳能市场，预算 500 积分",
  "德国客户三天没回，换强势风格再跟进",
];

const voiceResponses: Record<string, { type: "safe" | "sensitive"; action: string; preview?: string }> = {
  "越南那条询盘，报 $12.5，用友好风格，今天发": {
    type: "sensitive",
    action: "向 SunPower Solutions 发送报价 $12.5/件 FOB，友好风格，24h 后自动跟进",
    preview: "Dear Nguyen, Thank you for your interest! Our FOB price for 400W panels is $12.5/unit...",
  },
  "把所有未回复询盘先发感谢邮件": {
    type: "safe",
    action: "向 2 条未回复询盘发送标准感谢邮件（不含报价）",
  },
  "李总的 OpenClaw 暂停今天的 LinkedIn": {
    type: "safe",
    action: "暂停 oc-001（广州明辉照明）今日 LinkedIn 操作",
  },
  "开始测试越南太阳能市场，预算 500 积分": {
    type: "sensitive",
    action: "创建越南太阳能市场推广任务，消耗 500 积分，预计 3-5 天出结果",
  },
  "德国客户三天没回，换强势风格再跟进": {
    type: "safe",
    action: "将 EcoHome Trading 跟进风格改为【强势】，立即发送跟进消息",
  },
};

function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<{type:"safe"|"sensitive"; action:string; preview?:string} | null>(null);
  const [exampleIdx, setExampleIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMicPress = () => {
    if (voiceState !== "idle") return;
    setVoiceState("listening");
    setTranscript("");
    setResult(null);
    // 模拟语音识别
    timerRef.current = setTimeout(() => {
      const example = voiceExamples[exampleIdx % voiceExamples.length];
      setTranscript(example);
      setExampleIdx(i => i + 1);
      setVoiceState("processing");
      setTimeout(() => {
        const r = voiceResponses[example] || { type: "safe", action: "已理解指令，正在处理..." };
        setResult(r);
        setVoiceState("result");
      }, 1200);
    }, 2000);
  };

  const handleConfirm = () => {
    toast.success("指令已执行", { description: result?.action });
    setVoiceState("idle");
    setTranscript("");
    setResult(null);
    setOpen(false);
  };

  const handleCancel = () => {
    setVoiceState("idle");
    setTranscript("");
    setResult(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <>
      {/* 浮动按钮 */}
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
        style={{background:"linear-gradient(135deg, oklch(0.70 0.18 40) 0%, oklch(0.63 0.20 35) 100%)", boxShadow:"0 8px 32px oklch(0.70 0.18 40 / 40%)"}}>
        <Mic className="w-6 h-6 text-white" />
      </button>

      {/* 语音助手面板 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end" style={{background:"oklch(0 0 0 / 70%)"}} onClick={() => { handleCancel(); setOpen(false); }}>
          <div className="w-full rounded-t-3xl overflow-hidden"
            style={{background:"oklch(0.16 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)"}}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
            <div className="px-5 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between py-4 border-b border-white/8 mb-5">
                <div>
                  <h2 className="text-base font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>语音助手</h2>
                  <p className="text-xs text-slate-500">说出指令，AI 理解并执行</p>
                </div>
                <button onClick={() => { handleCancel(); setOpen(false); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* 麦克风区域 */}
              <div className="flex flex-col items-center mb-6">
                <button onMouseDown={handleMicPress}
                  disabled={voiceState === "processing" || voiceState === "result"}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    voiceState === "listening"
                      ? "ring-4 ring-orange-500/50 scale-110"
                      : voiceState === "processing"
                      ? "opacity-60"
                      : ""
                  }`}
                  style={{background: voiceState === "listening"
                    ? "linear-gradient(135deg, oklch(0.70 0.18 40) 0%, oklch(0.63 0.20 35) 100%)"
                    : "oklch(0.22 0.02 250)",
                    boxShadow: voiceState === "listening" ? "0 0 40px oklch(0.70 0.18 40 / 50%)" : "none"
                  }}>
                  {voiceState === "processing"
                    ? <Loader2 className="w-8 h-8 text-white animate-spin" />
                    : <Mic className={`w-8 h-8 ${voiceState === "listening" ? "text-white" : "text-slate-400"}`} />
                  }
                </button>
                <p className="text-xs text-slate-500 mt-3">
                  {voiceState === "idle" && "点击开始说话"}
                  {voiceState === "listening" && <span className="text-orange-400 animate-pulse">正在聆听...</span>}
                  {voiceState === "processing" && <span className="text-blue-400">AI 正在理解指令...</span>}
                  {voiceState === "result" && "指令已识别"}
                </p>
              </div>

              {/* 识别结果 */}
              {transcript && (
                <div className="mb-4 p-3 rounded-xl" style={{background:"oklch(0.20 0.02 250)"}}>
                  <p className="text-xs text-slate-500 mb-1">您说：</p>
                  <p className="text-sm text-white">"{transcript}"</p>
                </div>
              )}

              {/* 执行预览 */}
              {result && voiceState === "result" && (
                <div className="mb-4 space-y-3">
                  <div className="p-3 rounded-xl" style={{
                    background: result.type === "sensitive" ? "oklch(0.22 0.04 40 / 20%)" : "oklch(0.18 0.03 250)",
                    border: `1px solid ${result.type === "sensitive" ? "oklch(0.70 0.18 40 / 30%)" : "oklch(0.50 0.10 250 / 20%)"}`
                  }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {result.type === "sensitive"
                        ? <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                      }
                      <span className={`text-xs font-medium ${result.type === "sensitive" ? "text-orange-400" : "text-teal-400"}`}>
                        {result.type === "sensitive" ? "需要您确认" : "安全操作，可直接执行"}
                      </span>
                    </div>
                    <p className="text-sm text-white">{result.action}</p>
                    {result.preview && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">{result.preview}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCancel}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-white/10 active:scale-95">
                      取消
                    </button>
                    <button onClick={handleConfirm}
                      className="flex-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 active:scale-95"
                      style={{background:"linear-gradient(135deg, oklch(0.70 0.18 40) 0%, oklch(0.63 0.20 35) 100%)", flex:2}}>
                      <Check className="w-4 h-4" />
                      {result.type === "sensitive" ? "确认执行" : "立即执行"}
                    </button>
                  </div>
                </div>
              )}

              {/* 示例指令 */}
              {voiceState === "idle" && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">示例指令（点击体验）</p>
                  <div className="flex flex-wrap gap-2">
                    {voiceExamples.slice(0,3).map(ex => (
                      <button key={ex}
                        onClick={() => { setTranscript(ex); setVoiceState("processing"); setTimeout(() => { const r = voiceResponses[ex]; setResult(r); setVoiceState("result"); }, 1000); }}
                        className="px-3 py-1.5 rounded-full text-xs text-slate-400 border border-white/10 hover:border-white/20 hover:text-white transition-all active:scale-95 text-left">
                        "{ex}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── 内嵌信息流视图（M1 三 Tab 版）────────────────────────────

const FEED_FLAG_MAP: Record<string, string> = {
  瑞典: "🇸🇪", 德国: "🇩🇪", 美国: "🇺🇸", 日本: "🇯🇵",
  阿联酋: "🇦🇪", 韩国: "🇰🇷", 英国: "🇬🇧", 澳大利亚: "🇦🇺",
  加拿大: "🇨🇦", 荷兰: "🇳🇱", 法国: "🇫🇷", 意大利: "🇮🇹",
  西班牙: "🇪🇸", 巴西: "🇧🇷", 印度: "🇮🇳", 墨西哥: "🇲🇽",
};
const FEED_INDUSTRY: Record<string, { bg: string; text: string; label: string }> = {
  furniture: { bg: "bg-amber-100", text: "text-amber-700", label: "家具" },
  textile: { bg: "bg-purple-100", text: "text-purple-700", label: "纺织" },
  electronics: { bg: "bg-blue-100", text: "text-blue-700", label: "电子" },
  other: { bg: "bg-gray-100", text: "text-gray-600", label: "其他" },
};
function getFeedConfColor(score: number) {
  if (score >= 80) return { ring: "ring-green-400", badge: "bg-green-500", label: "高意向" };
  if (score >= 60) return { ring: "ring-yellow-400", badge: "bg-yellow-500", label: "中意向" };
  return { ring: "ring-gray-300", badge: "bg-gray-400", label: "待评估" };
}

function EmbeddedFeedCard({
  item, onBookmark, isBookmarking, isBookmarked, isLocked,
}: {
  item: FeedItem; onBookmark: (id: string) => void;
  isBookmarking: boolean; isBookmarked: boolean; isLocked: boolean;
}) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flag = FEED_FLAG_MAP[item.buyer_country] ?? "🌍";
  const industry = FEED_INDUSTRY[item.industry] ?? FEED_INDUSTRY.other;
  const conf = getFeedConfColor(item.confidence_score);

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoPlaying) { videoRef.current.pause(); setVideoPlaying(false); }
    else { videoRef.current.play(); setVideoPlaying(true); }
  };

  return (
    <div className={`relative bg-white rounded-2xl shadow-md overflow-hidden mx-3 mb-3 ring-2 ${conf.ring} ${isLocked ? "opacity-50 pointer-events-none" : ""}`}>
      {/* 图片卡片 */}
      {item.media_type === "image" && item.media_url && (
        <div className="relative w-full h-40 bg-gray-100 overflow-hidden">
          <img src={item.media_url} alt={item.product_name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${industry.bg} ${industry.text}`}>
            {industry.label}
          </span>
        </div>
      )}
      {/* 视频卡片 */}
      {item.media_type === "video" && item.media_url && (
        <div className="relative w-full h-44 bg-black overflow-hidden cursor-pointer" onClick={toggleVideo}>
          <video ref={videoRef} src={item.media_url} className="w-full h-full object-cover" loop playsInline />
          <div className="absolute inset-0 flex items-center justify-center">
            {!videoPlaying && (
              <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center shadow-lg">
                <PlayCircle className="w-7 h-7 text-indigo-600" />
              </div>
            )}
          </div>
          <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${industry.bg} ${industry.text}`}>
            {industry.label}
          </span>
          <span className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white">
            🎬 视频
          </span>
        </div>
      )}
      {/* 顶部标签行（纯文字卡片时显示） */}
      {item.media_type === "text" && (
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${industry.bg} ${industry.text}`}>
            {industry.label}
          </span>
          <span className={`text-xs text-white font-bold px-2 py-0.5 rounded-full ${conf.badge}`}>
            {conf.label} {item.confidence_score}分
          </span>
        </div>
      )}
      {/* 买家信息 */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {item.buyer_company.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm truncate">{item.buyer_company}</span>
              <span>{flag}</span>
              <span className="text-xs text-gray-400">{item.buyer_country}</span>
            </div>
            {item.buyer_name && <p className="text-xs text-gray-400">{item.buyer_name}</p>}
          </div>
          {(item.media_type !== "text") && (
            <span className={`text-xs text-white font-bold px-2 py-0.5 rounded-full ${conf.badge} shrink-0`}>
              {item.confidence_score}分
            </span>
          )}
        </div>
      </div>
      {/* 产品 */}
      <div className="px-3 pb-2">
        <div className="bg-gray-50 rounded-xl p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800 truncate">{item.product_name}</span>
            {item.quantity && (
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full ml-2 shrink-0">{item.quantity}</span>
            )}
          </div>
          {item.estimated_value > 0 && (
            <span className="text-xs font-bold text-green-600">预估 ${item.estimated_value.toLocaleString()}</span>
          )}
        </div>
      </div>
      {/* AI 摘要 */}
      {item.ai_summary && (
        <div className="px-3 pb-2 flex items-start gap-1.5">
          <span className="text-indigo-500 text-xs shrink-0">✦</span>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.ai_summary}</p>
        </div>
      )}
      {/* 标签 */}
      {item.ai_tags.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {item.ai_tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">#{tag}</span>
          ))}
        </div>
      )}
      {/* 操作按钮 */}
      <div className="px-3 pb-3">
        <button
          onClick={() => !isBookmarked && !isBookmarking && onBookmark(item.id)}
          disabled={isBookmarking || isBookmarked}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
            ${isBookmarked ? "bg-green-100 text-green-600 cursor-default"
              : isBookmarking ? "bg-indigo-100 text-indigo-400 cursor-wait"
              : "bg-indigo-600 text-white active:scale-95"}`}
        >
          {isBookmarked ? "✓ 已加入询盘" : isBookmarking ? "处理中..." : "⚡ 一键加入询盘"}
        </button>
      </div>
      {/* 锁定遮罩 */}
      {isLocked && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">🔒</span>
          <p className="text-xs font-semibold text-gray-600">今日配额已用完</p>
        </div>
      )}
    </div>
  );
}

function EmbeddedFeedView({ onBookmark }: { onBookmark: () => void }) {
  const [, navigate] = useLocation();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [quota, setQuota] = useState<FeedQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"recommendation" | "latest" | "value">("recommendation");
  const [toast2, setToast2] = useState<string | null>(null);

  const showToast2 = useCallback((msg: string) => {
    setToast2(msg);
    setTimeout(() => setToast2(null), 2500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [feedRes, quotaRes] = await Promise.all([
        feedApi.getFeed({ sort: sortBy, limit: 20 }),
        feedApi.getQuota(),
      ]);
      setItems(feedRes.items);
      setQuota(quotaRes);
    } catch {
      showToast2("加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [sortBy, showToast2]);

  useEffect(() => { load(); }, [load]);

  const handleBookmark = useCallback(async (id: string) => {
    if (bookmarkingId) return;
    setBookmarkingId(id);
    try {
      await feedApi.bookmark(id);
      setBookmarkedIds((prev) => new Set(Array.from(prev).concat(id)));
      showToast2("✓ 已加入询盘");
      onBookmark();
      const q = await feedApi.getQuota();
      setQuota(q);
    } catch (e: any) {
      showToast2(e.message ?? "操作失败");
    } finally {
      setBookmarkingId(null);
    }
  }, [bookmarkingId, showToast2, onBookmark]);

  const quotaExhausted = quota ? quota.remaining <= 0 : false;
  const pct = quota ? Math.round((quota.used / quota.total) * 100) : 0;
  const barColor = pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-sky-500";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 配额条 */}
      {quota && (
        <div className="px-3 py-2 flex-shrink-0" style={{background:"oklch(0.17 0.02 250)", borderBottom:"1px solid oklch(1 0 0 / 6%)"}}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">今日配额</span>
            <span className="text-xs font-semibold text-slate-300">{quota.used}/{quota.total}</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{width:`${pct}%`}} />
          </div>
        </div>
      )}
      {/* 排序筛选 */}
      <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0" style={{background:"oklch(0.16 0.02 250)", borderBottom:"1px solid oklch(1 0 0 / 6%)"}}>
        {(["recommendation", "latest", "value"] as const).map((s) => (
          <button key={s} onClick={() => setSortBy(s)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
              sortBy === s ? "bg-sky-500 text-white" : "bg-white/8 text-slate-400 hover:text-white"
            }`}>
            {s === "recommendation" ? "🎯 推荐" : s === "latest" ? "🕐 最新" : "💰 价値"}
          </button>
        ))}
        {/* 视频信息流入口 */}
        <button
          onClick={() => navigate("/video-feed")}
          className="ml-auto flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-gradient-to-r from-pink-500 to-red-500 text-white active:opacity-80 transition-opacity"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          视频
        </button>
      </div>
      {/* 列表 */}
      <div className="flex-1 overflow-y-auto pt-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <span className="text-4xl mb-3">{quotaExhausted ? "🔒" : "🎉"}</span>
            <p className="text-sm font-semibold text-slate-300">
              {quotaExhausted ? "今日配额已用完" : "暂无更多询盘"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {quotaExhausted ? "明日 00:00 重置" : "已看完所有推荐"}
            </p>
          </div>
        ) : (
          items.map((item, idx) => (
            <EmbeddedFeedCard
              key={item.id}
              item={item}
              onBookmark={handleBookmark}
              isBookmarking={bookmarkingId === item.id}
              isBookmarked={bookmarkedIds.has(item.id)}
              isLocked={quotaExhausted && !bookmarkedIds.has(item.id) && idx >= (quota?.remaining ?? 0)}
            />
          ))
        )}
      </div>
      {/* Toast */}
      {toast2 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-50 whitespace-nowrap">
          {toast2}
        </div>
      )}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────

export default function CommanderPhone() {
  const [view, setView] = useState<MainView>("status");
  const [, navigate] = useLocation();
  const { isEnterprise, plan, setPlan } = useUserPlan();
  const { user } = useAuth();
  const { stats } = useInquiries();
  const [feedQuota, setFeedQuota] = useState<FeedQuota | null>(null);

  // 加载信息流配额，用于 Tab 徽标显示
  useEffect(() => {
    feedApi.getQuota().then(setFeedQuota).catch(() => {});
  }, []);

  const feedRemaining = feedQuota ? Math.max(0, feedQuota.remaining) : 0;

  return (
    <div className="min-h-screen flex items-start justify-center sm:py-8" style={{background:"oklch(0.10 0.02 250)"}}>
      <div className="w-full sm:rounded-3xl sm:overflow-hidden sm:shadow-2xl flex flex-col relative"
        style={{background:"oklch(0.14 0.02 250)", border:"1px solid oklch(1 0 0 / 10%)", maxWidth:"390px", height:"100dvh"}}>

        <StatusBar />
        <TopNav
          view={view}
          onChangeView={setView}
          credits={stats?.credits?.balance ?? user?.creditsBalance ?? 2840}
          unreadCount={stats?.pipeline?.unread ?? 0}
          feedCount={feedRemaining}
          onBack={() => navigate("/")}
        />

        {/* Demo 模式切换器（原型演示用）*/}
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 flex-shrink-0"
          style={{background:"oklch(0.17 0.02 250)", borderBottom:"1px solid oklch(1 0 0 / 6%)"}}>
          <span className="text-xs text-slate-500">演示模式：</span>
          <button onClick={() => setPlan("standard")}
            className="text-xs px-2.5 py-1 rounded-full font-semibold transition-all"
            style={!isEnterprise
              ? {background:"#f59e0b20", color:"#f59e0b", border:"1px solid #f59e0b40"}
              : {background:"oklch(0.22 0.02 250)", color:"oklch(0.5 0.01 250)", border:"1px solid oklch(1 0 0 / 10%)"}}>
            标准版
          </button>
          <button onClick={() => setPlan("enterprise")}
            className="text-xs px-2.5 py-1 rounded-full font-semibold transition-all"
            style={isEnterprise
              ? {background:"#22c55e20", color:"#22c55e", border:"1px solid #22c55e40"}
              : {background:"oklch(0.22 0.02 250)", color:"oklch(0.5 0.01 250)", border:"1px solid oklch(1 0 0 / 10%)"}}>
            独立部署版
          </button>
        </div>

        {view === "status" && <StatusView onGoFeed={() => setView("feed")} onGoInquiries={() => setView("inquiries")} isEnterprise={isEnterprise} />}
        {view === "feed" && <EmbeddedFeedView onBookmark={() => feedApi.getQuota().then(setFeedQuota).catch(() => {})} />}
        {view === "inquiries" && <InquiriesView />}

        <VoiceAssistant />
      </div>
    </div>
  );
}
