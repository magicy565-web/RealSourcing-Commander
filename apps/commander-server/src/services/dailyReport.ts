/**
 * Phase 5 — Sprint 5.4
 * 每日战报定时推送服务
 * 每天 09:00 自动向飞书推送昨日业务总结
 */
import { db } from "../db/index.js";
import { sendFeishuCard } from "./feishu.js";

interface DailyReportData {
  date: string;
  newInquiries: number;
  quotedCount: number;
  contractedCount: number;
  totalValue: number;
  aiDraftCount: number;
  socialMessages: number;
  topCountry: string;
  creditUsed: number;
}

/**
 * 收集昨日业务数据
 */
function collectYesterdayData(tenantId: string): DailyReportData {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];
  const startOfDay = `${dateStr}T00:00:00`;
  const endOfDay = `${dateStr}T23:59:59`;

  const newInquiries = (db.prepare(`
    SELECT COUNT(*) as c FROM inquiries
    WHERE tenant_id = ? AND received_at BETWEEN ? AND ?
  `).get(tenantId, startOfDay, endOfDay) as any)?.c ?? 0;

  const quotedCount = (db.prepare(`
    SELECT COUNT(*) as c FROM inquiries
    WHERE tenant_id = ? AND status = 'quoted' AND updated_at BETWEEN ? AND ?
  `).get(tenantId, startOfDay, endOfDay) as any)?.c ?? 0;

  const contractedCount = (db.prepare(`
    SELECT COUNT(*) as c FROM inquiries
    WHERE tenant_id = ? AND status = 'contracted' AND updated_at BETWEEN ? AND ?
  `).get(tenantId, startOfDay, endOfDay) as any)?.c ?? 0;

  const totalValue = (db.prepare(`
    SELECT SUM(estimated_value) as v FROM inquiries
    WHERE tenant_id = ? AND status = 'contracted' AND updated_at BETWEEN ? AND ?
  `).get(tenantId, startOfDay, endOfDay) as any)?.v ?? 0;

  const aiDraftCount = (db.prepare(`
    SELECT COUNT(*) as c FROM inquiries
    WHERE tenant_id = ? AND ai_draft_en IS NOT NULL AND ai_draft_en != ''
    AND received_at BETWEEN ? AND ?
  `).get(tenantId, startOfDay, endOfDay) as any)?.c ?? 0;

  const socialMessages = (() => {
    try {
      return (db.prepare(`
        SELECT COUNT(*) as c FROM social_messages
        WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
      `).get(tenantId, startOfDay, endOfDay) as any)?.c ?? 0;
    } catch { return 0; }
  })();

  const topCountryRow = db.prepare(`
    SELECT buyer_country, COUNT(*) as c FROM inquiries
    WHERE tenant_id = ? AND received_at BETWEEN ? AND ?
    GROUP BY buyer_country ORDER BY c DESC LIMIT 1
  `).get(tenantId, startOfDay, endOfDay) as any;

  const creditUsed = (db.prepare(`
    SELECT SUM(ABS(amount)) as v FROM credit_ledger
    WHERE tenant_id = ? AND type = 'deduct' AND created_at BETWEEN ? AND ?
  `).get(tenantId, startOfDay, endOfDay) as any)?.v ?? 0;

  return {
    date: dateStr,
    newInquiries,
    quotedCount,
    contractedCount,
    totalValue,
    aiDraftCount,
    socialMessages,
    topCountry: topCountryRow?.buyer_country ?? "暂无",
    creditUsed,
  };
}

/**
 * 构建飞书每日战报卡片
 */
function buildDailyReportCard(data: DailyReportData, tenantName: string) {
  const dateDisplay = data.date.replace(/-/g, "/");
  const valueDisplay = data.totalValue >= 10000
    ? `$${(data.totalValue / 10000).toFixed(1)}万`
    : `$${data.totalValue.toLocaleString()}`;

  return {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          content: `📊 ${tenantName} 昨日战报 · ${dateDisplay}`,
          tag: "plain_text",
        },
        template: "blue",
      },
      elements: [
        {
          tag: "div",
          text: {
            content: [
              `**📥 新增询盘：** ${data.newInquiries} 条`,
              `**📤 已报价：** ${data.quotedCount} 条`,
              `**🤝 成交订单：** ${data.contractedCount} 单（${valueDisplay}）`,
              `**🤖 AI 草稿：** ${data.aiDraftCount} 份`,
              `**💬 社媒消息：** ${data.socialMessages} 条`,
              `**🌍 热门市场：** ${data.topCountry}`,
              `**💎 积分消耗：** ${data.creditUsed} 分`,
            ].join("\n"),
            tag: "lark_md",
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "div",
          text: {
            content: data.newInquiries > 0
              ? `💡 昨日共处理 ${data.newInquiries} 条询盘，AI 辅助率 ${data.newInquiries > 0 ? Math.round((data.aiDraftCount / data.newInquiries) * 100) : 0}%，继续加油！`
              : "💡 昨日暂无新询盘，今日继续拓展渠道！",
            tag: "lark_md",
          },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: { content: "查看 Dashboard", tag: "plain_text" },
              type: "primary",
              url: "realsourcing://dashboard",
            },
            {
              tag: "button",
              text: { content: "处理询盘", tag: "plain_text" },
              type: "default",
              url: "realsourcing://inquiries",
            },
          ],
        },
      ],
    },
  };
}

/**
 * 推送每日战报到飞书
 */
export async function pushDailyReport(tenantId?: string): Promise<void> {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("[DailyReport] FEISHU_WEBHOOK_URL 未配置，跳过推送");
    return;
  }

  // 如果未指定 tenantId，推送所有租户
  const tenants = tenantId
    ? [db.prepare("SELECT id, name FROM tenants WHERE id = ?").get(tenantId) as any]
    : (db.prepare("SELECT id, name FROM tenants").all() as any[]);

  for (const tenant of tenants) {
    if (!tenant) continue;
    try {
      const data = collectYesterdayData(tenant.id);
      const card = buildDailyReportCard(data, tenant.name ?? "RealSourcing");
      await sendFeishuCard(webhookUrl, card as any);
      console.log(`[DailyReport] 已推送 ${tenant.name} 的昨日战报`);
    } catch (err) {
      console.error(`[DailyReport] 推送失败 tenant=${tenant.id}:`, err);
    }
  }
}

/**
 * 获取战报数据（供 API 调用）
 */
export function getDailyReportData(tenantId: string): DailyReportData {
  return collectYesterdayData(tenantId);
}

/**
 * 启动每日战报定时任务（每天 09:00）
 */
export function scheduleDailyReport(): void {
  const now = new Date();
  const next9am = new Date(now);
  next9am.setHours(9, 0, 0, 0);

  // 如果今天 9 点已过，设置为明天 9 点
  if (next9am <= now) {
    next9am.setDate(next9am.getDate() + 1);
  }

  const msUntilNext9am = next9am.getTime() - now.getTime();
  console.log(`[DailyReport] 下次战报推送时间: ${next9am.toLocaleString("zh-CN")} (${Math.round(msUntilNext9am / 60000)} 分钟后)`);

  // 首次触发
  setTimeout(() => {
    pushDailyReport().catch(err => console.error("[DailyReport] 定时推送失败:", err));

    // 之后每 24 小时触发一次
    setInterval(() => {
      pushDailyReport().catch(err => console.error("[DailyReport] 定时推送失败:", err));
    }, 24 * 60 * 60 * 1000);
  }, msUntilNext9am);
}
