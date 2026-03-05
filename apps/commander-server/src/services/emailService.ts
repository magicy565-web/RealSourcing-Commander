/**
 * Email Service for inquiry responses
 */

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  console.log("[EmailService] Sending email to", to);
  return true;
}

export function buildFirstReplyHtml(data: any): string {
  return "<html><body>First reply</body></html>";
}

export function buildFollowupHtml(data: any): string {
  return "<html><body>Followup</body></html>";
}

export default { sendEmail, buildFirstReplyHtml, buildFollowupHtml };
