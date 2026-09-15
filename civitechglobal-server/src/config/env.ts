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

/**
 * A comma-separated list, trimmed, with blanks dropped.
 *
 * CORS_ORIGIN needs this because a site is reachable at more than one name:
 * the apex and the www alias are different origins to a browser, and during a
 * move to a new domain the old address has to keep working too. A single
 * string meant the API rejected its own front end from every name but one,
 * which presents as "login does nothing".
 */
export function optionalList(key: string, fallback: string): string[] {
  return optional(key, fallback)
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
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

  CORS_ORIGIN: optionalList('CORS_ORIGIN', 'http://localhost:5173'),
  // Cookies must be Secure whenever the app runs in production, regardless
  // of how COOKIE_SECURE is set (misconfiguration should not silently
  // downgrade cookie security over HTTPS deployments).
  COOKIE_SECURE: isProduction || rawCookieSecure,

  LOG_LEVEL: optional('LOG_LEVEL', 'info'),

  // Optional: when unset/empty, Sentry initialization is a no-op.
  SENTRY_DSN: optional('SENTRY_DSN', ''),

  // --- Telemetry -----------------------------------------------------------
  //
  // Bearer token for GET /api/metrics. Unset means the endpoint 404s rather
  // than describing our traffic shape to anyone who asks.
  METRICS_TOKEN: optional('METRICS_TOKEN', ''),

  // --- Malware scanning ----------------------------------------------------
  //
  // 'none' accepts everything; 'clamav' streams each upload to clamd. Same
  // arrangement as the SMS and email providers: production refuses the
  // do-nothing option unless it is waived on purpose.
  MALWARE_SCANNER: optional('MALWARE_SCANNER', 'none'),
  MALWARE_SCANNER_ALLOW_NONE: optional('MALWARE_SCANNER_ALLOW_NONE', '') === 'true',
  CLAMAV_HOST: optional('CLAMAV_HOST', 'clamav'),
  CLAMAV_PORT: parseInt(optional('CLAMAV_PORT', '3310'), 10),
  CLAMAV_TIMEOUT_MS: parseInt(optional('CLAMAV_TIMEOUT_MS', '30000'), 10),

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
  // needs no account. Production must name a real one — or 'none', which says
  // this deployment has no mail service and makes the features that need one
  // refuse out loud instead of accepting a request they cannot fulfil. See
  // `services/email/index.ts`.
  EMAIL_PROVIDER: optional('EMAIL_PROVIDER', 'console'),
  EMAIL_API_KEY: optional('EMAIL_API_KEY', ''),
  /**
   * The From line. Must be an address on a domain the provider has verified.
   *
   * Empty by default: there is no mailbox to name until somebody sets up a
   * provider, and a plausible-looking default is a bounce address that nobody
   * notices is wrong. build() requires it for every real provider.
   */
  EMAIL_FROM: optional('EMAIL_FROM', ''),
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
