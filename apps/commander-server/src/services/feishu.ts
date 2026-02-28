import { HonoRequest } from "hono";

/**
 * 飞书集成服务模块
 * 负责 Token 获取、刷新、API 调用等基础功能
 */

interface FeishuTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

interface FeishuBitableRecord {
  fields: Record<string, any>;
}

interface FeishuBitableCreateResponse {
  code: number;
  msg: string;
  data?: {
    record: {
      record_id: string;
      created_at: number;
      fields: Record<string, any>;
    };
  };
}

interface FeishuCardMessage {
  msg_type: "interactive";
  card: {
    config: {
      wide_screen_mode: {
        enable: boolean;
      };
    };
    elements: any[];
    header: {
      title: {
        content: string;
        tag: "plain_text";
      };
      template: "blue" | "red" | "orange" | "green" | "purple";
    };
  };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * 获取飞书 Tenant Access Token
 * 使用缓存机制，避免频繁调用 API
 */
async function getFeishuToken(): Promise<string> {
  const now = Date.now();

  // 如果缓存的 Token 还有效（留 60 秒缓冲），直接返回
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Missing FEISHU_APP_ID or FEISHU_APP_SECRET in .env");
  }

  try {
    const response = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: appId,
          app_secret: appSecret,
        }),
      }
    );

    const data = (await response.json()) as FeishuTokenResponse;

    if (data.code !== 0) {
      throw new Error(`Feishu API error: ${data.msg}`);
    }

    // 缓存 Token，有效期为 expire 秒
    cachedToken = {
      token: data.tenant_access_token,
      expiresAt: now + data.expire * 1000,
    };

    return data.tenant_access_token;
  } catch (error) {
    console.error("Failed to get Feishu token:", error);
    throw error;
  }
}

/**
 * 发送飞书卡片消息
 * @param webhookUrl 飞书机器人 Webhook URL
 * @param card 卡片内容
 */
async function sendFeishuCard(
  webhookUrl: string,
  card: FeishuCardMessage
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(card),
    });

    const result = await response.json();
    if (result.code !== 0) {
      console.error("Failed to send Feishu card:", result);
    }
  } catch (error) {
    console.error("Error sending Feishu card:", error);
  }
}

/**
 * 向飞书多维表格（Bitable）添加记录
 * @param appToken 飞书应用 Token（从 URL 获取）
 * @param tableId 表格 ID
 * @param fields 记录字段
 */
async function addBitableRecord(
  appToken: string,
  tableId: string,
  fields: Record<string, any>
): Promise<string | null> {
  const token = await getFeishuToken();

  try {
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields,
        }),
      }
    );

    const data = (await response.json()) as FeishuBitableCreateResponse;

    if (data.code !== 0) {
      console.error("Failed to add Bitable record:", data.msg);
      return null;
    }

    return data.data?.record.record_id || null;
  } catch (error) {
    console.error("Error adding Bitable record:", error);
    return null;
  }
}

/**
 * 生成新询盘通知卡片
 */
function createInquiryNotificationCard(inquiry: {
  id: string;
  buyer_name: string;
  buyer_company: string;
  product_name: string;
  estimated_value: number;
  confidence_score: number;
}): FeishuCardMessage {
  return {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          content: "🔔 新询盘到达",
          tag: "plain_text",
        },
        template: "blue",
      },
      elements: [
        {
          tag: "div",
          text: {
            content: `**买家：** ${inquiry.buyer_name}\n**公司：** ${inquiry.buyer_company}\n**产品：** ${inquiry.product_name}\n**预估金额：** $${inquiry.estimated_value}\n**置信度：** ${inquiry.confidence_score}%`,
            tag: "lark_md",
          },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: {
                content: "查看详情",
                tag: "plain_text",
              },
              type: "primary",
              url: `realsourcing://inquiry/${inquiry.id}`,
            },
            {
              tag: "button",
              text: {
                content: "转人工",
                tag: "plain_text",
              },
              type: "default",
            },
          ],
        },
      ],
    },
  };
}

/**
 * 生成报价完成通知卡片
 */
function createQuotationNotificationCard(quotation: {
  id: string;
  inquiry_id: string;
  product_name: string;
  unit_price: number;
  currency: string;
}): FeishuCardMessage {
  return {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          content: "✅ 报价已发出",
          tag: "plain_text",
        },
        template: "green",
      },
      elements: [
        {
          tag: "div",
          text: {
            content: `**产品：** ${quotation.product_name}\n**单价：** ${quotation.currency} ${quotation.unit_price}`,
            tag: "lark_md",
          },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: {
                content: "查看询盘",
                tag: "plain_text",
              },
              type: "primary",
              url: `realsourcing://inquiry/${quotation.inquiry_id}`,
            },
          ],
        },
      ],
    },
  };
}

/**
 * 生成任务完成通知卡片
 */
function createTaskCompletionCard(task: {
  id: string;
  task_type: string;
  status: "completed" | "failed";
  target_info: string;
  credits_used: number;
}): FeishuCardMessage {
  const isSuccess = task.status === "completed";
  const template = isSuccess ? "green" : "red";
  const title = isSuccess ? "✅ 任务完成" : "❌ 任务失败";

  return {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          content: title,
          tag: "plain_text",
        },
        template,
      },
      elements: [
        {
          tag: "div",
          text: {
            content: `**任务类型：** ${task.task_type}\n**目标：** ${task.target_info}\n**积分消耗：** ${task.credits_used}`,
            tag: "lark_md",
          },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: {
                content: "查看任务队列",
                tag: "plain_text",
              },
              type: "primary",
              url: "realsourcing://task-queue",
            },
          ],
        },
      ],
    },
  };
}

/**
 * 生成24小时跟进提醒卡片
 */
function createFollowupReminderCard(quotation: {
  id: string;
  inquiry_id: string;
  buyer_name: string;
  product_name: string;
}): FeishuCardMessage {
  return {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          content: "⏰ 24小时跟进提醒",
          tag: "plain_text",
        },
        template: "orange",
      },
      elements: [
        {
          tag: "div",
          text: {
            content: `**买家：** ${quotation.buyer_name}\n**产品：** ${quotation.product_name}\n\n买家 24 小时内未回复，建议跟进一次。`,
            tag: "lark_md",
          },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: {
                content: "确认发送跟进",
                tag: "plain_text",
              },
              type: "primary",
              url: `realsourcing://inquiry/${quotation.inquiry_id}?action=followup`,
            },
            {
              tag: "button",
              text: {
                content: "稍后再说",
                tag: "plain_text",
              },
              type: "default",
            },
          ],
        },
      ],
    },
  };
}

/**
 * 通过 Webhook 推送报价通知到飞书
 */
async function pushQuotationNotification(quotation: {
  id: string;
  inquiry_id: string;
  product_name: string;
  unit_price: number;
  currency: string;
  buyer_name?: string;
}): Promise<void> {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (!webhookUrl) return;

  const card = createQuotationNotificationCard(quotation);
  await sendFeishuCard(webhookUrl, card);
}

/**
 * 通过 Webhook 推送新询盘通知到飞书
 */
async function pushInquiryNotification(inquiry: {
  id: string;
  buyer_name: string;
  buyer_company: string;
  product_name: string;
  estimated_value: number;
  confidence_score: number;
}): Promise<void> {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (!webhookUrl) return;

  const card = createInquiryNotificationCard(inquiry);
  await sendFeishuCard(webhookUrl, card);
}

/**
 * 通过 Webhook 推送任务完成通知到飞书
 */
async function pushTaskNotification(task: {
  id: string;
  task_type: string;
  status: "completed" | "failed";
  target_info: string;
  credits_used: number;
}): Promise<void> {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (!webhookUrl) return;

  const card = createTaskCompletionCard(task);
  await sendFeishuCard(webhookUrl, card);
}

/**
 * 通过 Webhook 推送24小时跟进提醒到飞书
 */
async function pushFollowupReminder(quotation: {
  id: string;
  inquiry_id: string;
  buyer_name: string;
  product_name: string;
}): Promise<void> {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (!webhookUrl) return;

  const card = createFollowupReminderCard(quotation);
  await sendFeishuCard(webhookUrl, card);
}

export {
  getFeishuToken,
  sendFeishuCard,
  addBitableRecord,
  createInquiryNotificationCard,
  createQuotationNotificationCard,
  createTaskCompletionCard,
  createFollowupReminderCard,
  pushQuotationNotification,
  pushInquiryNotification,
  pushTaskNotification,
  pushFollowupReminder,
};
