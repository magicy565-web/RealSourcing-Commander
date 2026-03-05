// feishu.ts — 飞书通知存根（未配置时静默跳过）
export async function sendFeishuCard(webhookUrl: string, card: unknown): Promise<void> {
  if (!webhookUrl) return;
  try {
    const { default: axios } = await import("axios");
    await axios.post(webhookUrl, card);
  } catch (e) {
    console.warn("[Feishu] 发送失败:", e);
  }
}
export async function pushQuotationNotification(data: unknown): Promise<void> {
  console.log("[Feishu] pushQuotationNotification stub", data);
}
export async function pushFollowupReminder(data: unknown): Promise<void> {
  console.log("[Feishu] pushFollowupReminder stub", data);
}
export async function addBitableRecord(data: unknown): Promise<void> {
  console.log("[Feishu] addBitableRecord stub", data);
}
export function createQuotationNotificationCard(data: unknown): unknown {
  return { msg_type: "text", content: { text: JSON.stringify(data) } };
}
export async function pushTaskNotification(data: unknown): Promise<void> {
  console.log("[Feishu] pushTaskNotification stub", data);
}
