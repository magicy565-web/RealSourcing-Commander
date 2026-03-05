// Environment variables
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  WECHAT_WEBHOOK: process.env.WECHAT_WEBHOOK || '',
  FEISHU_APP_TOKEN: process.env.FEISHU_APP_TOKEN || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
};

export default env;
