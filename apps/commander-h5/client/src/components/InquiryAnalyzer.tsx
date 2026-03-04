/**
 * InquiryAnalyzer — 询盘 AI 意图解析 + 智能回复建议 (V6.0)
 *
 * 功能：
 *  1. 实时解析询盘意图（采购意向 / 比价 / 技术咨询 / 垃圾询盘）
 *  2. 买家画像自动构建（公司规模 / 采购频率 / 决策权重）
 *  3. AI 智能回复草稿（中英双语 + 本土化语气）
 *  4. 一键确认发送 / 编辑后发送
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';

// ── 类型定义 ──────────────────────────────────────────────────
type IntentType = 'purchase' | 'compare' | 'technical' | 'spam' | 'unknown';
type BuyerTier  = 'A' | 'B' | 'C' | 'D';

interface BuyerProfile {
  name: string;
  company: string;
  country: string;
  flag: string;
  tier: BuyerTier;
  tierLabel: string;
  purchaseFrequency: string;
  decisionPower: string;
  estimatedValue: string;
  tags: string[];
}

interface IntentAnalysis {
  type: IntentType;
  label: string;
  confidence: number;
  signals: string[];
  urgency: 'low' | 'medium' | 'high';
  suggestedAction: string;
}

interface ReplyDraft {
  draftEn: string;
  draftZh: string;
  tone: string;
  keyPoints: string[];
  followupSuggestion: string;
}

export interface InquiryData {
  id: string;
  rawContent: string;
  buyerName: string;
  buyerCompany: string;
  buyerCountry: string;
  productName: string;
  platform: string;
  receivedAt: string;
  estimatedValue?: number;
}

// ── 设计 Token ────────────────────────────────────────────────
const C = {
  bg:    '#000000',
  P:     '#7C3AED',
  PL:    '#A78BFA',
  t1:    'rgba(255,255,255,0.92)',
  t2:    'rgba(255,255,255,0.52)',
  t3:    'rgba(255,255,255,0.26)',
  amber: '#F59E0B',
  green: '#10B981',
  red:   '#F87171',
  blue:  '#60A5FA',
  teal:  '#2DD4BF',
};

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

const INTENT_CONFIG: Record<IntentType, { label: string; color: string; bg: string; icon: string }> = {
  purchase:  { label: '采购意向', color: C.green,  bg: 'rgba(16,185,129,0.1)',  icon: '🛒' },
  compare:   { label: '比价询价', color: C.amber,  bg: 'rgba(245,158,11,0.1)',  icon: '⚖️' },
  technical: { label: '技术咨询', color: C.blue,   bg: 'rgba(96,165,250,0.1)',  icon: '🔧' },
  spam:      { label: '无效询盘', color: C.red,    bg: 'rgba(248,113,113,0.1)', icon: '🚫' },
  unknown:   { label: '待分析',  color: C.t3,     bg: 'rgba(255,255,255,0.05)', icon: '❓' },
};

const TIER_CONFIG: Record<BuyerTier, { color: string; bg: string; desc: string }> = {
  A: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', desc: '高价值客户' },
  B: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', desc: '潜力客户' },
  C: { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', desc: '普通客户' },
  D: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)', desc: '低优先级' },
};

// ── Mock AI 分析结果 ──────────────────────────────────────────
function mockAnalyzeInquiry(inquiry: InquiryData): { profile: BuyerProfile; intent: IntentAnalysis; reply: ReplyDraft } {
  const profile: BuyerProfile = {
    name: inquiry.buyerName || 'Ahmed Al-Rashid',
    company: inquiry.buyerCompany || 'Gulf Trading Co.',
    country: inquiry.buyerCountry || '沙特阿拉伯',
    flag: '🇸🇦',
    tier: 'A',
    tierLabel: '高价值',
    purchaseFrequency: '季度采购',
    decisionPower: '最终决策人',
    estimatedValue: inquiry.estimatedValue ? `$${(inquiry.estimatedValue / 1000).toFixed(0)}K` : '$12K-$48K',
    tags: ['中东买家', '大宗采购', 'SASO认证需求', '快速决策'],
  };

  const intent: IntentAnalysis = {
    type: 'purchase',
    label: '高意向采购',
    confidence: 87,
    signals: [
      '明确提及 MOQ 和交货期',
      '询问 SASO 认证状态',
      '要求提供样品',
      '公司背景显示为正规贸易商',
    ],
    urgency: 'high',
    suggestedAction: '立即回复并附上报价单，建议 2 小时内响应',
  };

  const reply: ReplyDraft = {
    draftEn: `Dear ${profile.name},

Thank you for your inquiry regarding our ${inquiry.productName}. We're delighted to assist you.

Regarding your requirements:
• MOQ: 500 pcs (flexible for first order)
• Lead time: 15-20 working days
• SASO Certification: ✓ Available
• Sample: Available within 5 days

Our products meet all GCC standards and we have extensive experience serving the Saudi market.

I'd love to schedule a brief call to discuss your specific requirements. When would be convenient for you?

Best regards,
Commander AI (on behalf of your team)`,
    draftZh: `尊敬的 ${profile.name} 先生/女士，

感谢您对我司 ${inquiry.productName} 的询价。

针对您的需求：
• 最小起订量：500件（首单可协商）
• 交货期：15-20个工作日
• SASO认证：✓ 已具备
• 样品：5天内可发出

我司产品符合全海湾地区标准，在沙特市场有丰富合作经验。

期待进一步沟通，请问您方便安排一个简短通话吗？

此致`,
    tone: '专业 · 热情 · 本土化',
    keyPoints: ['明确 MOQ 和交货期', '强调 SASO 认证', '提供样品', '邀请通话'],
    followupSuggestion: '若 24 小时内未回复，AI 将自动发送一条跟进消息',
  };

  return { profile, intent, reply };
}

// ── 买家画像卡片 ──────────────────────────────────────────────
function BuyerProfileCard({ profile }: { profile: BuyerProfile }) {
  const tierCfg = TIER_CONFIG[profile.tier];

  return (
    <div style={{ padding: '14px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {/* 头像 */}
        <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {profile.flag}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.t1, letterSpacing: -0.3 }}>{profile.name}</span>
            <div style={{ padding: '2px 7px', borderRadius: 50, background: tierCfg.bg, border: `1px solid ${tierCfg.color}30` }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: tierCfg.color }}>Tier {profile.tier} · {profile.tierLabel}</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{profile.company} · {profile.country}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.green, letterSpacing: -0.5 }}>{profile.estimatedValue}</div>
          <div style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>预估价值</div>
        </div>
      </div>

      {/* 标签 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {profile.tags.map((tag, i) => (
          <div key={i} style={{ padding: '3px 8px', borderRadius: 50, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 10, color: C.t2, fontWeight: 600 }}>{tag}</div>
        ))}
      </div>

      {/* 采购信息 */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 9, color: C.t3, fontWeight: 600, marginBottom: 3 }}>采购频率</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>{profile.purchaseFrequency}</div>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 9, color: C.t3, fontWeight: 600, marginBottom: 3 }}>决策权重</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>{profile.decisionPower}</div>
        </div>
      </div>
    </div>
  );
}

// ── 意图分析卡片 ──────────────────────────────────────────────
function IntentCard({ intent }: { intent: IntentAnalysis }) {
  const cfg = INTENT_CONFIG[intent.type];

  return (
    <div style={{ padding: '14px', borderRadius: 16, background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>{intent.label}</div>
            <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>置信度 {intent.confidence}%</div>
          </div>
        </div>
        {/* 置信度进度条 */}
        <div style={{ width: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${intent.confidence}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            style={{ height: '100%', background: cfg.color, borderRadius: 3 }}
          />
        </div>
      </div>

      {/* 信号列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        {intent.signals.map((signal, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color, flexShrink: 0 }}/>
            <span style={{ fontSize: 11, color: C.t2 }}>{signal}</span>
          </div>
        ))}
      </div>

      {/* 建议行动 */}
      <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 10, color: C.t3, fontWeight: 600, marginBottom: 3 }}>AI 建议</div>
        <div style={{ fontSize: 11.5, color: C.t1, fontWeight: 600 }}>{intent.suggestedAction}</div>
      </div>
    </div>
  );
}

// ── 回复草稿组件 ──────────────────────────────────────────────
function ReplyDraftCard({ draft, onSend, onEdit }: { draft: ReplyDraft; onSend: () => void; onEdit: () => void }) {
  const [showZh, setShowZh] = useState(false);

  return (
    <div style={{ padding: '14px', borderRadius: 16, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.PL} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.PL }}>AI 回复草稿</span>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {/* 语言切换 */}
          <button
            onClick={() => setShowZh(z => !z)}
            style={{ padding: '4px 10px', borderRadius: 50, background: showZh ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showZh ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}`, fontSize: 10, fontWeight: 700, color: showZh ? C.PL : C.t3, cursor: 'pointer' } as React.CSSProperties}
          >
            {showZh ? '中文' : 'EN'}
          </button>
        </div>
      </div>

      {/* 语气标签 */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {draft.tone.split(' · ').map((t, i) => (
          <div key={i} style={{ padding: '2px 8px', borderRadius: 50, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', fontSize: 9, color: C.PL, fontWeight: 600 }}>{t}</div>
        ))}
      </div>

      {/* 草稿内容 */}
      <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 10, maxHeight: 180, overflowY: 'auto' }}>
        <pre style={{ fontSize: 11, color: C.t2, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
          {showZh ? draft.draftZh : draft.draftEn}
        </pre>
      </div>

      {/* 关键点 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
        {draft.keyPoints.map((pt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 50, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>{pt}</span>
          </div>
        ))}
      </div>

      {/* 跟进建议 */}
      <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: C.amber, fontWeight: 700, marginBottom: 2 }}>自动跟进</div>
        <div style={{ fontSize: 11, color: 'rgba(245,158,11,0.7)' }}>{draft.followupSuggestion}</div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSend}
          style={{ flex: 1, padding: '10px', borderRadius: 50, background: `linear-gradient(135deg, ${C.P}, rgba(124,58,237,0.7))`, border: '1px solid rgba(124,58,237,0.4)', boxShadow: '0 4px 16px rgba(124,58,237,0.25)', fontSize: 12.5, fontWeight: 800, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 } as React.CSSProperties}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          确认发送
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onEdit}
          style={{ padding: '10px 16px', borderRadius: 50, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, fontWeight: 700, color: C.t2, cursor: 'pointer' } as React.CSSProperties}
        >
          编辑
        </motion.button>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────
interface InquiryAnalyzerProps {
  inquiry: InquiryData;
  onClose: () => void;
  onSent: (inquiryId: string) => void;
}

export function InquiryAnalyzer({ inquiry, onClose, onSent }: InquiryAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof mockAnalyzeInquiry> | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sentState, setSentState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [activeSection, setActiveSection] = useState<'profile' | 'intent' | 'reply'>('profile');

  // 真实 AI 分析（对接后端 /api/v1/ai/inquiries/:id/analyze）
  useEffect(() => {
    setIsAnalyzing(true);
    setAiError(null);

    fetch(`/api/v1/ai/inquiries/${inquiry.id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawContent: inquiry.rawContent,
        buyerName: inquiry.buyerName,
        buyerCompany: inquiry.buyerCompany,
        buyerCountry: inquiry.buyerCountry,
        productName: inquiry.productName,
        sourcePlatform: inquiry.platform,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'AI 分析失败' }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // 将后端返回的结构化数据映射到前端格式
        const bp = data.buyerProfile;
        const ia = data.intentAnalysis;
        const rd = data.replyDraft;

        const COUNTRY_FLAGS: Record<string, string> = {
          SA: '🇸🇦', AE: '🇦🇪', US: '🇺🇸', DE: '🇩🇪',
          GB: '🇬🇧', CN: '🇨🇳', MX: '🇲🇽', IN: '🇮🇳',
          BR: '🇧🇷', TR: '🇹🇷',
        };
        const tierMap: Record<string, 'A'|'B'|'C'> = { high: 'A', medium: 'B', low: 'C' };
        const tierLabelMap: Record<string, string> = { A: '高价值', B: '潜力客户', C: '普通客户' };
        const intentTypeMap: Record<string, string> = {
          price_inquiry: '价格询盘',
          sample_request: '样品申请',
          bulk_order: '大宗采购',
          agent_seeking: '寻找代理',
          general_inquiry: '一般咨询',
        };

        const profile: BuyerProfile = {
          name: bp.name || inquiry.buyerName || '未知买家',
          company: bp.company || inquiry.buyerCompany || '未知公司',
          country: bp.country || inquiry.buyerCountry || '未知',
          flag: COUNTRY_FLAGS[inquiry.buyerCountry] || '🏳️',
          tier: tierMap[bp.decisionPower] || 'B',
          tierLabel: tierLabelMap[tierMap[bp.decisionPower] || 'B'],
          purchaseFrequency: bp.purchaseRole || '待确认',
          decisionPower: bp.decisionPower === 'high' ? '最终决策人' : bp.decisionPower === 'medium' ? '影响者' : '执行者',
          estimatedValue: inquiry.estimatedValue ? `$${(inquiry.estimatedValue / 1000).toFixed(0)}K` : '待评估',
          tags: [bp.purchaseRole || '待确认', ...(ia.keyRequirements || []).slice(0, 3)],
        };

        // 将后端意图类型映射到前端 IntentType
        const intentTypeToFrontend = (t: string): IntentType => {
          if (t === 'bulk_order') return 'purchase';
          if (t === 'price_inquiry') return 'compare';
          if (t === 'sample_request') return 'technical';
          if (t === 'general_inquiry') return 'unknown';
          return 'unknown';
        };
        // 将后端 urgency 映射到前端 urgency
        const urgencyToFrontend = (u: string): 'low' | 'medium' | 'high' => {
          if (u === 'urgent' || u === 'high') return 'high';
          if (u === 'normal') return 'medium';
          return 'low';
        };

        const intent: IntentAnalysis = {
          type: intentTypeToFrontend(ia.intentType),
          label: intentTypeMap[ia.intentType] || ia.intentType,
          confidence: ia.confidenceScore || 75,
          signals: ia.keyRequirements || [],
          urgency: urgencyToFrontend(ia.urgency),
          suggestedAction: ia.reasoning || '建议尽快回复',
        };

        const reply: ReplyDraft = {
          draftEn: rd.bodyEn || '',
          draftZh: rd.bodyCn || '',
          tone: rd.tone === 'formal' ? '专业 · 正式' : rd.tone === 'urgent' ? '紧迫 · 快速' : '专业 · 热情',
          keyPoints: ia.keyRequirements?.slice(0, 4) || [],
          followupSuggestion: rd.followUpSuggestion || '建议 24h 内跟进',
        };

        setAnalysisResult({ profile, intent, reply });
        setIsAnalyzing(false);
      })
      .catch((err) => {
        console.error('[InquiryAnalyzer] AI 分析失败:', err);
        // 降级到 Mock 数据
        setAnalysisResult(mockAnalyzeInquiry(inquiry));
        setAiError(err.message || 'AI 分析失败，展示预设结果');
        setIsAnalyzing(false);
      });
  }, [inquiry]);

  const handleSend = () => {
    hapticMedium();
    setSentState('sending');
    setTimeout(() => {
      setSentState('sent');
      hapticSuccess();
      setTimeout(() => {
        onSent(inquiry.id);
        onClose();
      }, 1500);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={SPRING}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(24px)',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '52px 16px 100px' }}>

        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button onClick={() => { hapticLight(); onClose(); }} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.t2} strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.4 }}>询盘 AI 解析</div>
            <div style={{ fontSize: 10, color: C.PL, fontWeight: 600, marginTop: 1 }}>{inquiry.platform} · {inquiry.productName}</div>
          </div>
          <div style={{ width: 36 }}/>
        </div>

        {/* AI 降级提示 */}
        {aiError && (
          <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 12, fontSize: 11, color: '#F59E0B' }}>
            ⚠️ AI 实时分析不可用，展示预设结果
          </div>
        )}

        {/* 原始询盘内容 */}
        <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>原始询盘</div>
          <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, margin: 0 }}>{inquiry.rawContent}</p>
        </div>

        {/* AI 分析中状态 */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}
            >
              {['分析买家意图...', '构建买家画像...', '生成回复草稿...'].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.4 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}
                >
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.PL} strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  </motion.div>
                  <span style={{ fontSize: 12, color: C.PL, fontWeight: 600 }}>{step}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 分析结果 */}
        <AnimatePresence>
          {analysisResult && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING}
            >
              {/* Tab 切换 */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
                {(['profile', 'intent', 'reply'] as const).map(tab => {
                  const labels = { profile: '买家画像', intent: '意图分析', reply: 'AI草稿' };
                  return (
                    <motion.button
                      key={tab}
                      onClick={() => { hapticLight(); setActiveSection(tab); }}
                      animate={{ background: activeSection === tab ? 'rgba(124,58,237,0.25)' : 'transparent', color: activeSection === tab ? C.PL : C.t3 }}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 10, border: activeSection === tab ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {labels[tab]}
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {activeSection === 'profile' && (
                  <motion.div key="profile" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <BuyerProfileCard profile={analysisResult.profile}/>
                  </motion.div>
                )}
                {activeSection === 'intent' && (
                  <motion.div key="intent" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <IntentCard intent={analysisResult.intent}/>
                  </motion.div>
                )}
                {activeSection === 'reply' && (
                  <motion.div key="reply" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    {sentState === 'sent' ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}
                      >
                        <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: C.green, marginBottom: 6 }}>回复已发送！</div>
                        <div style={{ fontSize: 12, color: 'rgba(16,185,129,0.6)' }}>AI 将自动跟踪买家回复状态</div>
                      </motion.div>
                    ) : (
                      <ReplyDraftCard
                        draft={analysisResult.reply}
                        onSend={handleSend}
                        onEdit={() => hapticLight()}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
