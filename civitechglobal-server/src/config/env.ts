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

  // --- Uploaded file storage ----------------------------------------------
  //
  // 'local' writes to UPLOAD_DIR; 's3' talks to any S3-compatible endpoint
  // (ArvanCloud, MinIO, Backblaze, AWS). Production refuses 'local' unless
  // STORAGE_ALLOW_LOCAL_IN_PRODUCTION says the directory is a durable,
  // backed-up volume — see services/storage/index.ts for why.
  STORAGE_DRIVER: optional('STORAGE_DRIVER', 'local'),
  STORAGE_ALLOW_LOCAL_IN_PRODUCTION: optional('STORAGE_ALLOW_LOCAL_IN_PRODUCTION', '') === 'true',
  STORAGE_ENDPOINT: optional('STORAGE_ENDPOINT', ''),
  STORAGE_BUCKET: optional('STORAGE_BUCKET', ''),
  STORAGE_REGION: optional('STORAGE_REGION', 'us-east-1'),
  STORAGE_ACCESS_KEY: optional('STORAGE_ACCESS_KEY', ''),
  STORAGE_SECRET_KEY: optional('STORAGE_SECRET_KEY', ''),
  /** Most non-AWS providers want endpoint/bucket/key rather than a subdomain. */
  STORAGE_FORCE_PATH_STYLE: optional('STORAGE_FORCE_PATH_STYLE', 'true') !== 'false',

  // --- Email (password reset, address verification) -----------------------
  //
  // Same arrangement as SMS below: 'console' logs the message instead of
  // sending it, which is the development default and the only provider that
  // needs no account. Production must name a real one; see
  // `services/email/index.ts` for the guard that enforces that.
  EMAIL_PROVIDER: optional('EMAIL_PROVIDER', 'console'),
  EMAIL_API_KEY: optional('EMAIL_API_KEY', ''),
  /** The From line. Must be an address on a domain the provider has verified. */
  EMAIL_FROM: optional('EMAIL_FROM', 'no-reply@civitechglobal.com'),
  /** Mailgun only: the sending domain. */
  EMAIL_DOMAIN: optional('EMAIL_DOMAIN', ''),

  /**
   * Where the links in those emails point.
   *
   * Never derived from the request's own Host header: an attacker who can set
   * that could have a reset link built against their own domain and mailed to
   * the victim by us.
   */
  APP_URL: optional('APP_URL', 'http://localhost:5173'),

  /** A reset link is a live credential; it should not sit in an inbox for days. */
  PASSWORD_RESET_TTL_MINUTES: parseInt(optional('PASSWORD_RESET_TTL_MINUTES', '60'), 10),
  /** Verification is not a credential, so it can afford to be patient. */
  EMAIL_VERIFICATION_TTL_HOURS: parseInt(optional('EMAIL_VERIFICATION_TTL_HOURS', '48'), 10),

  // --- Phone verification (one-time codes on insurance requests) ----------
  //
  // 'console' logs the code instead of sending it — the development default,
  // and the only provider that needs no account. Production must name a real
  // one; see `services/sms/index.ts` for the guard that enforces that.
  SMS_PROVIDER: optional('SMS_PROVIDER', 'console'),
  SMS_API_KEY: optional('SMS_API_KEY', ''),
  /** Sender line or template identifier, depending on the provider. */
  SMS_SENDER: optional('SMS_SENDER', ''),
  /** Kavenegar/SMS.ir verify-lookup template name. */
  SMS_OTP_TEMPLATE: optional('SMS_OTP_TEMPLATE', ''),

  OTP_TTL_SECONDS: parseInt(optional('OTP_TTL_SECONDS', '300'), 10),
  /** Seconds a caller must wait between requesting codes for one number. */
  OTP_RESEND_COOLDOWN_SECONDS: parseInt(optional('OTP_RESEND_COOLDOWN_SECONDS', '60'), 10),
  /** Wrong guesses allowed before the code is burned. */
  OTP_MAX_ATTEMPTS: parseInt(optional('OTP_MAX_ATTEMPTS', '5'), 10),
  /** How long a verified-phone token stays usable to submit a request. */
  PHONE_TOKEN_TTL_SECONDS: parseInt(optional('PHONE_TOKEN_TTL_SECONDS', '900'), 10),

  // Where client-supplied project attachments are written. MUST be outside
  // any directory a web server serves: nothing here is ever executed or
  // linked to directly, and the files are handed back only through an
  // authenticated download route. On the server this is a bind-mounted volume
  // so uploads survive a container rebuild and get picked up by the backup job.
  UPLOAD_DIR: optional('UPLOAD_DIR', './storage/project-attachments'),
};

assertNotWeak('JWT_SECRET', env.JWT_SECRET, isProduction);
assertNotWeak('JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET, isProduction);
