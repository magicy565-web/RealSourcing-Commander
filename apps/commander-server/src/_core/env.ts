// Environment variables
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  WECHAT_WEBHOOK: process.env.WECHAT_WEBHOOK || '',
  WECHAT_APP_ID: process.env.WECHAT_APP_ID || '',
  WECHAT_APP_SECRET: process.env.WECHAT_APP_SECRET || '',
  WECHAT_TEMPLATE_LEAD_ARRIVED: process.env.WECHAT_TEMPLATE_LEAD_ARRIVED || '',
  WECHAT_TEMPLATE_TASK_PROGRESS: process.env.WECHAT_TEMPLATE_TASK_PROGRESS || '',
  WECHAT_TEMPLATE_DAILY_REPORT: process.env.WECHAT_TEMPLATE_DAILY_REPORT || '',
  FEISHU_APP_TOKEN: process.env.FEISHU_APP_TOKEN || '',
  COMMANDER_APP_URL: process.env.COMMANDER_APP_URL || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
};

export default env;
