/**
 * Commander 5.0 Phase 3 — M1 信息流卡片流页面
 * 仿抖音/小红书风格的竖向滚动卡片流
 * 每日配额 10 条，推荐引擎三维加权排序
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { feedApi, FeedItem, FeedQuota } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";

// ─── 国旗 Emoji 映射 ──────────────────────────────────────────
const FLAG_MAP: Record<string, string> = {
  瑞典: "🇸🇪", 德国: "🇩🇪", 美国: "🇺🇸", 日本: "🇯🇵",
  阿联酋: "🇦🇪", 韩国: "🇰🇷", 英国: "🇬🇧", 澳大利亚: "🇦🇺",
  加拿大: "🇨🇦", 荷兰: "🇳🇱", 法国: "🇫🇷", 意大利: "🇮🇹",
  西班牙: "🇪🇸", 巴西: "🇧🇷", 印度: "🇮🇳", 墨西哥: "🇲🇽",
};

// ─── 行业颜色映射 ─────────────────────────────────────────────
const INDUSTRY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  furniture: { bg: "bg-amber-100", text: "text-amber-700", label: "家具" },
  textile: { bg: "bg-purple-100", text: "text-purple-700", label: "纺织" },
  electronics: { bg: "bg-blue-100", text: "text-blue-700", label: "电子" },
  other: { bg: "bg-gray-100", text: "text-gray-600", label: "其他" },
};

// ─── 置信度颜色 ───────────────────────────────────────────────
function getConfidenceColor(score: number) {
  if (score >= 80) return { ring: "ring-green-400", badge: "bg-green-500", label: "高意向" };
  if (score >= 60) return { ring: "ring-yellow-400", badge: "bg-yellow-500", label: "中意向" };
  return { ring: "ring-gray-300", badge: "bg-gray-400", label: "待评估" };
}

// ─── 单张信息流卡片 ───────────────────────────────────────────
function FeedCard({
  item,
  onBookmark,
  isBookmarking,
  isBookmarked,
  isLocked,
}: {
  item: FeedItem;
  onBookmark: (id: string) => void;
  isBookmarking: boolean;
  isBookmarked: boolean;
  isLocked: boolean;
}) {
  const flag = FLAG_MAP[item.buyer_country] ?? "🌍";
  const industry = INDUSTRY_STYLE[item.industry] ?? INDUSTRY_STYLE.other;
  const conf = getConfidenceColor(item.confidence_score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative bg-white rounded-2xl shadow-lg overflow-hidden mx-4 mb-4 ring-2 ${conf.ring} ${isLocked ? "opacity-60 pointer-events-none" : ""}`}
    >
      {/* 顶部行业标签 + 置信度 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${industry.bg} ${industry.text}`}>
          {industry.label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs text-white font-bold px-2 py-0.5 rounded-full ${conf.badge}`}>
            {conf.label} {item.confidence_score}分
          </span>
          {item.recommendation_score && (
            <span className="text-xs text-indigo-500 font-medium">
              推荐 {Math.round(item.recommendation_score)}
            </span>
          )}
        </div>
      </div>

      {/* 买家信息 */}
      <div className="px-4 pb-3">
        <div className="flex items-start gap-3">
          {/* 头像占位 */}
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {item.buyer_company.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">{item.buyer_company}</span>
              <span className="text-base">{flag}</span>
              <span className="text-xs text-gray-500">{item.buyer_country}</span>
            </div>
            {item.buyer_name && (
              <p className="text-xs text-gray-400 mt-0.5">{item.buyer_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* 产品信息 */}
      <div className="px-4 pb-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-gray-800">{item.product_name}</span>
            {item.quantity && (
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
                {item.quantity}
              </span>
            )}
          </div>
          {item.estimated_value > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-500">预估价值</span>
              <span className="text-sm font-bold text-green-600">
                ${item.estimated_value.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* AI 摘要 */}
      {item.ai_summary && (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2">
            <span className="text-indigo-500 text-sm shrink-0">✦</span>
            <p className="text-sm text-gray-600 leading-relaxed">{item.ai_summary}</p>
          </div>
        </div>
      )}

      {/* AI 标签 */}
      {item.ai_tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {item.ai_tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => !isBookmarked && !isBookmarking && onBookmark(item.id)}
          disabled={isBookmarking || isBookmarked}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
            ${isBookmarked
              ? "bg-green-100 text-green-600 cursor-default"
              : isBookmarking
              ? "bg-indigo-100 text-indigo-400 cursor-wait"
              : "bg-indigo-600 text-white active:scale-95 hover:bg-indigo-700"
            }`}
        >
          {isBookmarked ? (
            <>✓ 已加入询盘</>
          ) : isBookmarking ? (
            <>
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              处理中...
            </>
          ) : (
            <>⚡ 一键加入询盘</>
          )}
        </button>
        <button className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
          ···
        </button>
      </div>

      {/* 锁定遮罩 */}
      {isLocked && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
          <span className="text-3xl">🔒</span>
          <p className="text-sm font-semibold text-gray-600">今日配额已用完</p>
          <p className="text-xs text-gray-400">明日 00:00 重置</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── 配额进度条 ───────────────────────────────────────────────
function QuotaBar({ quota }: { quota: FeedQuota }) {
  const pct = Math.round((quota.used / quota.total) * 100);
  const color = pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-indigo-500";

  return (
    <div className="px-4 py-2 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">今日配额</span>
        <span className="text-xs font-semibold text-gray-700">
          {quota.used} / {quota.total}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── 空状态 ───────────────────────────────────────────────────
function EmptyFeed({ quotaExhausted }: { quotaExhausted: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-5xl mb-4">{quotaExhausted ? "🔒" : "🎉"}</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {quotaExhausted ? "今日配额已用完" : "暂无更多询盘"}
      </h3>
      <p className="text-sm text-gray-400">
        {quotaExhausted
          ? "每日 10 条免费配额，明日 00:00 重置"
          : "已看完所有推荐询盘，明日再来看看"}
      </p>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────
export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [quota, setQuota] = useState<FeedQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await feedApi.getFeed();
      setItems(data.items);
      setQuota(data.quota);
    } catch (err: any) {
      setError(err.message ?? "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleBookmark = useCallback(
    async (id: string) => {
      if (bookmarkingId) return;
      setBookmarkingId(id);
      try {
        const res = await feedApi.bookmark(id);
        setBookmarkedIds((prev) => new Set([...prev, id]));
        setQuota((prev) =>
          prev
            ? { ...prev, used: prev.used + 1, remaining: Math.max(0, prev.remaining - 1) }
            : prev
        );
        showToast(`已加入询盘 ✓`, "success");
      } catch (err: any) {
        showToast(err.message ?? "操作失败", "error");
      } finally {
        setBookmarkingId(null);
      }
    },
    [bookmarkingId, showToast]
  );

  const quotaExhausted = quota ? quota.remaining <= 0 : false;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-gray-900">买家信息流</h1>
          <button
            onClick={loadFeed}
            className="text-xs text-indigo-600 font-medium flex items-center gap-1"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            刷新
          </button>
        </div>
        <p className="text-xs text-gray-400">AI 推荐 · 每日更新 · 按意向度排序</p>
      </div>

      {/* 配额条 */}
      {quota && <QuotaBar quota={quota} />}

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto pt-3 pb-20">
        {loading ? (
          <div className="flex flex-col gap-4 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow h-48 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <button
              onClick={loadFeed}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
            >
              重试
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyFeed quotaExhausted={quotaExhausted} />
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item, idx) => (
              <FeedCard
                key={item.id}
                item={item}
                onBookmark={handleBookmark}
                isBookmarking={bookmarkingId === item.id}
                isBookmarked={bookmarkedIds.has(item.id)}
                isLocked={quotaExhausted && !bookmarkedIds.has(item.id) && idx >= (quota?.remaining ?? 0)}
              />
            ))}
          </AnimatePresence>
        )}

        {!loading && !error && items.length > 0 && quotaExhausted && (
          <EmptyFeed quotaExhausted={true} />
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-white text-sm font-medium shadow-lg z-50
              ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
