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

function assertNotWeak(key: string, value: string, isProduction: boolean): void {
  if (value.length >= 32) return;

  const message = `${key} should be at least 32 characters long.`;
  if (isProduction) {
    // A weak signing secret in production is a critical vulnerability
    // (forgeable/brute-forceable tokens) — fail startup instead of merely
    // warning.
    throw new Error(`FATAL: ${message}`);
  }
  console.warn(`WARNING: ${message}`);
}

const nodeEnv = optional('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';
const rawCookieSecure = optional('COOKIE_SECURE', 'false') === 'true';

export const env = {
  NODE_ENV: nodeEnv,
  get isProduction() {
    return this.NODE_ENV === 'production';
  },

  PORT: parseInt(optional('PORT', '5000'), 10),

  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: required('REDIS_URL'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),

  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:5173'),
  // Cookies must be Secure whenever the app runs in production, regardless
  // of how COOKIE_SECURE is set (misconfiguration should not silently
  // downgrade cookie security over HTTPS deployments).
  COOKIE_SECURE: isProduction || rawCookieSecure,

  LOG_LEVEL: optional('LOG_LEVEL', 'info'),

  // Optional: when unset/empty, Sentry initialization is a no-op.
  SENTRY_DSN: optional('SENTRY_DSN', ''),
};

assertNotWeak('JWT_SECRET', env.JWT_SECRET, isProduction);
assertNotWeak('JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET, isProduction);
