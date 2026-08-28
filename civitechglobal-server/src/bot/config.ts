import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value : fallback;
}

export const botConfig = {
  token: required('TELEGRAM_BOT_TOKEN'),
  mode: optional('TELEGRAM_BOT_MODE', 'polling') as 'polling' | 'webhook',
  webhookUrl: optional('TELEGRAM_WEBHOOK_URL', ''),
  webhookSecret: optional('TELEGRAM_WEBHOOK_SECRET', ''),
  port: parseInt(optional('BOT_PORT', '4000'), 10),
  adminUserIds: optional('TELEGRAM_ADMIN_USER_IDS', '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id)),
  nodeEnv: optional('NODE_ENV', 'development'),
  get isProduction() {
    return this.nodeEnv === 'production';
  },
  // Optional: when unset/empty, Sentry initialization is a no-op.
  sentryDsn: optional('SENTRY_DSN', ''),
};
