import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

/**
 * SMS delivery, behind one interface.
 *
 * Two Iranian providers are wired up because those are what an Iranian business
 * can actually buy; both expose a "verify lookup" endpoint that sends a code
 * through a pre-approved template, which is the only route that reliably
 * delivers OTPs on Iranian networks — a plain bulk-SMS send gets filtered.
 *
 * The console provider is not a stub for tests only: it is the correct choice
 * in development, where nobody wants a real message per form submission.
 */
export interface SmsProvider {
  readonly name: string;
  /** Sends a one-time code. Throws on delivery failure. */
  sendOtp(phone: string, code: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';

  async sendOtp(phone: string, code: string): Promise<void> {
    // Deliberately at info level and deliberately including the code: this
    // provider exists so a developer can read it. It is refused in production
    // by createSmsProvider() below, so the code cannot leak into real logs.
    logger.info({ phone, code }, '[console SMS] one-time code');
  }
}

/** Kavenegar — https://api.kavenegar.com/v1/{key}/verify/lookup.json */
class KavenegarProvider implements SmsProvider {
  readonly name = 'kavenegar';

  constructor(
    private readonly apiKey: string,
    private readonly template: string,
  ) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const url = new URL(`https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json`);
    url.searchParams.set('receptor', phone);
    url.searchParams.set('token', code);
    url.searchParams.set('template', this.template);

    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(`Kavenegar responded ${response.status}`);
    }

    // Kavenegar returns HTTP 200 with a non-200 status inside the body on
    // failure (bad template, no credit, blocked number), so the HTTP code alone
    // is not evidence of delivery.
    const body = (await response.json()) as { return?: { status?: number; message?: string } };
    const status = body.return?.status;
    if (status !== 200) {
      throw new Error(`Kavenegar rejected the send: ${status} ${body.return?.message ?? ''}`.trim());
    }
  }
}

/** SMS.ir — https://api.sms.ir/v1/send/verify */
class SmsIrProvider implements SmsProvider {
  readonly name = 'sms.ir';

  constructor(
    private readonly apiKey: string,
    private readonly templateId: string,
  ) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const response = await fetch('https://api.sms.ir/v1/send/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        mobile: phone,
        templateId: Number(this.templateId),
        parameters: [{ name: 'CODE', value: code }],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`SMS.ir responded ${response.status}`);
    }

    const body = (await response.json()) as { status?: number; message?: string };
    if (body.status !== 1) {
      throw new Error(`SMS.ir rejected the send: ${body.status} ${body.message ?? ''}`.trim());
    }
  }
}

function build(): SmsProvider {
  const name = env.SMS_PROVIDER.toLowerCase();

  if (name === 'console') {
    if (env.isProduction) {
      // Silently logging codes to stdout instead of texting them would look
      // like a working system while every applicant is locked out — and the
      // codes would sit in the log aggregator. Refuse to start.
      throw new Error(
        'FATAL: SMS_PROVIDER=console is not permitted in production. ' +
          'Set SMS_PROVIDER to kavenegar or smsir and supply SMS_API_KEY and SMS_OTP_TEMPLATE.',
      );
    }
    return new ConsoleSmsProvider();
  }

  if (!env.SMS_API_KEY) throw new Error(`SMS_API_KEY is required when SMS_PROVIDER=${name}`);
  if (!env.SMS_OTP_TEMPLATE) throw new Error(`SMS_OTP_TEMPLATE is required when SMS_PROVIDER=${name}`);

  switch (name) {
    case 'kavenegar':
      return new KavenegarProvider(env.SMS_API_KEY, env.SMS_OTP_TEMPLATE);
    case 'smsir':
    case 'sms.ir':
      return new SmsIrProvider(env.SMS_API_KEY, env.SMS_OTP_TEMPLATE);
    default:
      throw new Error(`Unknown SMS_PROVIDER "${env.SMS_PROVIDER}" (expected: console, kavenegar, smsir)`);
  }
}

let provider: SmsProvider | undefined;

/** Lazily built so importing this module never throws at load time. */
export function smsProvider(): SmsProvider {
  provider ??= build();
  return provider;
}
