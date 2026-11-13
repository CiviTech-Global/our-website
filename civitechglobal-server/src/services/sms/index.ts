import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { KavenegarClient } from './kavenegar.js';
import type { SmsTokens } from './templates.js';

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
/** What a gateway reports about one accepted message. */
export interface SentSms {
  messageId?: string;
  /** In Rials, as the gateway reports it. */
  cost?: number;
}

export interface SmsProvider {
  readonly name: string;
  /** Sends a one-time code. Throws on delivery failure. */
  sendOtp(phone: string, code: string): Promise<void>;
  /**
   * Sends any approved template. Throws on delivery failure. Callers go
   * through services/sms/dispatch.ts, which adds the link guard, the cap and
   * the log; nothing else should call this directly.
   */
  sendTemplate(phone: string, template: string, tokens: SmsTokens): Promise<SentSms>;
}

/**
 * No gateway at all.
 *
 * The mirror of NoEmailProvider next door, and the honest setting for a
 * deployment that has decided not to buy SMS. Sending throws, so nothing can
 * believe a code went out; the routes that would have sent one check
 * canSendSms() first and skip the step instead of failing in front of a
 * person.
 *
 * Permitted in production, unlike the console provider: "we do not text
 * people" is a decision, whereas "we print codes to the log" is an accident.
 */
class NoSmsProvider implements SmsProvider {
  readonly name = 'none';

  async sendOtp(): Promise<void> {
    throw new Error('This deployment has no SMS provider configured (SMS_PROVIDER=none).');
  }

  async sendTemplate(): Promise<SentSms> {
    throw new Error('This deployment has no SMS provider configured (SMS_PROVIDER=none).');
  }
}

class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';

  async sendOtp(phone: string, code: string): Promise<void> {
    // Deliberately at info level and deliberately including the code: this
    // provider exists so a developer can read it. It is refused in production
    // by createSmsProvider() below, so the code cannot leak into real logs.
    logger.info({ phone, code }, '[console SMS] one-time code');
  }

  async sendTemplate(phone: string, template: string, tokens: SmsTokens): Promise<SentSms> {
    logger.info({ phone, template, tokens }, '[console SMS] template');
    return {};
  }
}

/** Kavenegar: see ./kavenegar.ts for the wire format and status codes. */
class KavenegarProvider implements SmsProvider {
  readonly name = 'kavenegar';

  private readonly client: KavenegarClient;

  constructor(
    apiKey: string,
    private readonly template: string,
  ) {
    this.client = new KavenegarClient(apiKey);
  }

  /** Through the verify template; see KavenegarClient.verifyLookup. */
  async sendOtp(phone: string, code: string): Promise<void> {
    await this.client.verifyLookup(phone, { token: code }, this.template);
  }

  async sendTemplate(phone: string, template: string, tokens: SmsTokens): Promise<SentSms> {
    return this.client.verifyLookup(phone, tokens, template);
  }

  /** Remaining credit, for the readiness check. Sends nothing. */
  async accountInfo() {
    return this.client.accountInfo();
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

  /**
   * Codes only. SMS.ir templates are numeric ids configured per message, and
   * this deployment uses Kavenegar; the code path is kept so a switch back is a
   * setting, but the other templates are not wired here.
   */
  async sendTemplate(): Promise<SentSms> {
    throw new Error('SMS.ir is configured for one-time codes only.');
  }
}

function build(): SmsProvider {
  const name = env.SMS_PROVIDER.toLowerCase();

  if (name === 'none') return new NoSmsProvider();

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
      throw new Error(`Unknown SMS_PROVIDER "${env.SMS_PROVIDER}" (expected: none, console, kavenegar, smsir)`);
  }
}

let provider: SmsProvider | undefined;

/** Lazily built so importing this module never throws at load time. */
export function smsProvider(): SmsProvider {
  provider ??= build();
  return provider;
}

/**
 * Whether this deployment can deliver a text message to a real phone.
 *
 * The console provider prints the code to the server log, which is exactly
 * right on a laptop and is not delivery: nobody holding the phone ever sees
 * it. So it counts as 'no' here, and the page does not offer a step that
 * cannot complete. Mirrors canSendEmail next door.
 */
export function canSendSms(): boolean {
  const { name } = smsProvider();
  return name !== 'console' && name !== 'none';
}
