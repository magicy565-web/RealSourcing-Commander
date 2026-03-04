/**
 * AutoReplyLog — AI 自动回复工作日志组件
 *
 * 展示 AI Agent 的自动回复记录，让老板直观看到
 * "AI 在过去 24 小时内帮你回复了哪些询盘"
 */
import { useState, useEffect, useCallback } from "react";
import { autoReplyApi, type AutoReplyLog } from "@/lib/api";

// ─── 工具函数 ─────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    alibaba: "阿里国际站",
    "made-in-china": "中国制造网",
    "global-sources": "环球资源",
    email: "邮件",
    custom: "手动录入",
    other: "其他",
  };
  return map[platform] ?? platform;
}

function platformColor(platform: string): string {
  const map: Record<string, string> = {
    alibaba: "#FF6A00",
    "made-in-china": "#E53935",
    "global-sources": "#1565C0",
    email: "#6B7280",
    custom: "#7C3AED",
  };
  return map[platform] ?? "#9CA3AF";
}

// ─── 主组件 ───────────────────────────────────────────────────

interface AutoReplyLogProps {
  /** 最多显示条数，默认 20 */
  limit?: number;
  /** 是否显示统计卡片，默认 true */
  showStats?: boolean;
  /** 自动刷新间隔（毫秒），默认 30 秒，0 = 不刷新 */
  refreshInterval?: number;
}

export function AutoReplyLogPanel({
  limit = 20,
  showStats = true,
  refreshInterval = 30000,
}: AutoReplyLogProps) {
  const [logs, setLogs] = useState<AutoReplyLog[]>([]);
  const [stats, setStats] = useState({ totalSent: 0, totalDraft: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await autoReplyApi.getLogs({ limit });
      setLogs(res.items);
      setStats(res.stats);
      setTotal(res.total);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "加载失败");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLogs();
    if (refreshInterval > 0) {
      const timer = setInterval(fetchLogs, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [fetchLogs, refreshInterval]);

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <div style={{
          display: "inline-block",
          width: 24, height: 24,
          border: "2px solid rgba(124,58,237,0.3)",
          borderTopColor: "#7C3AED",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ marginTop: 8, color: "#9CA3AF", fontSize: 13 }}>加载中...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        <p style={{ color: "#EF4444", fontSize: 13 }}>⚠️ {error}</p>
        <button
          onClick={fetchLogs}
          style={{
            marginTop: 8, padding: "6px 16px",
            background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 6, color: "#7C3AED", fontSize: 12, cursor: "pointer",
          }}
        >重试</button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* 统计卡片 */}
      {showStats && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10, marginBottom: 16,
        }}>
          <StatCard
            label="累计自动回复"
            value={String(total)}
            icon="🤖"
            color="#7C3AED"
          />
          <StatCard
            label="已发送"
            value={String(stats.totalSent)}
            icon="✉️"
            color="#10B981"
          />
          <StatCard
            label="草稿待发"
            value={String(stats.totalDraft)}
            icon="📝"
            color="#F59E0B"
          />
        </div>
      )}

      {/* 日志列表 */}
      {logs.length === 0 ? (
        <div style={{
          padding: "32px 16px", textAlign: "center",
          background: "rgba(255,255,255,0.03)", borderRadius: 12,
          border: "1px dashed rgba(255,255,255,0.1)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
          <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
            AI Agent 正在待命
          </p>
          <p style={{ color: "#4B5563", fontSize: 12, marginTop: 4 }}>
            当有新询盘到达时，将在 5 分钟内自动回复
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.map(log => (
            <LogCard
              key={log.id}
              log={log}
              expanded={expandedId === log.id}
              onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 子组件 ───────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string; value: string; icon: string; color: string;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${color}30`,
      borderRadius: 10, padding: "12px 10px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function LogCard({ log, expanded, onToggle }: {
  log: AutoReplyLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isSent = log.send_status === "sent";
  const statusColor = isSent ? "#10B981" : "#F59E0B";
  const statusLabel = isSent ? "已发送" : "草稿";
  const statusIcon = isSent ? "✅" : "📝";

  return (
    <div
      onClick={onToggle}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      {/* 主行 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* 平台标签 */}
        <div style={{
          flexShrink: 0,
          background: platformColor(log.source_platform) + "20",
          border: `1px solid ${platformColor(log.source_platform)}40`,
          borderRadius: 5, padding: "2px 7px",
          fontSize: 10, color: platformColor(log.source_platform), fontWeight: 600,
        }}>
          {platformLabel(log.source_platform)}
        </div>

        {/* 买家信息 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#F3F4F6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {log.buyer_name ?? "未知买家"}
            {log.buyer_company ? <span style={{ fontWeight: 400, color: "#9CA3AF" }}> · {log.buyer_company}</span> : null}
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {log.product_name ?? "未知产品"}
            {log.buyer_country ? ` · ${log.buyer_country}` : ""}
          </div>
        </div>

        {/* 状态 + 时间 */}
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>
            {statusIcon} {statusLabel}
          </div>
          <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
            {timeAgo(log.created_at)}
          </div>
        </div>
      </div>

      {/* 邮箱（脱敏） */}
      {log.buyerEmailMasked && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#4B5563" }}>
          📧 {log.buyerEmailMasked}
        </div>
      )}

      {/* 展开：邮件内容预览 */}
      {expanded && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: 10,
            padding: "10px 12px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 600, marginBottom: 6 }}>
            AI 生成的邮件内容
          </div>
          <div style={{
            fontSize: 12, color: "#D1D5DB", lineHeight: 1.7,
            whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto",
          }}>
            {log.content_en}
          </div>
        </div>
      )}
    </div>
  );
}
