// emailService.ts — 邮件服务存根
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  console.log("[Email] sendEmail stub:", { to, subject });
}
export function buildFirstReplyHtml(data: unknown): string {
  return `<p>First reply stub: ${JSON.stringify(data)}</p>`;
}
export function buildFollowupHtml(data: unknown): string {
  return `<p>Followup stub: ${JSON.stringify(data)}</p>`;
}
