import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

/**
 * Email delivery, behind one interface — the same shape as the SMS provider
 * next door, and for the same reasons.
 *
 * There is no SMTP transport here on purpose. Every provider below is one HTTP
 * POST, so the whole module needs no dependency; a real SMTP client would mean
 * pulling in nodemailer to send perhaps three kinds of message. If a local
 * SMTP-only host is ever a hard requirement, that is the point to add it.
 *
 * The console provider is not a stub for tests only: it is the correct choice
 * in development, where nobody wants a real message per password reset — and
 * it prints the link, which is what a developer actually needs.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. Every message here is short enough not to need HTML. */
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  /** Sends one message. Throws on delivery failure. */
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';

  async send(message: EmailMessage): Promise<void> {
    // Deliberately at info level and deliberately including the body: this
    // provider exists so a developer can read the link. It is refused in
    // production by build() below, so no reset link can leak into real logs.
    logger.info({ to: message.to, subject: message.subject, text: message.text }, '[console email]');
  }
}

/** Resend — https://resend.com/docs/api-reference/emails/send-email */
class ResendProvider implements EmailProvider {
  readonly name = 'resend';

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      // The body carries the reason (unverified domain, bad key); the status
      // alone sends whoever reads the log hunting.
      const body = await response.text().catch(() => '');
      throw new Error(`Resend responded ${response.status} ${body.slice(0, 200)}`.trim());
    }
  }
}

/** Mailgun — https://api.mailgun.net/v3/{domain}/messages */
class MailgunProvider implements EmailProvider {
  readonly name = 'mailgun';

  constructor(
    private readonly apiKey: string,
    private readonly domain: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const form = new URLSearchParams({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });

    const response = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Mailgun responded ${response.status} ${body.slice(0, 200)}`.trim());
    }
  }
}

function build(): EmailProvider {
  const name = env.EMAIL_PROVIDER.toLowerCase();

  if (name === 'console') {
    if (env.isProduction) {
      // Logging reset links to stdout instead of emailing them would look like
      // a working system while every locked-out user stayed locked out — and
      // the links would sit in the log aggregator, each one a live credential.
      throw new Error(
        'FATAL: EMAIL_PROVIDER=console is not permitted in production. ' +
          'Set EMAIL_PROVIDER to resend or mailgun and supply EMAIL_API_KEY and EMAIL_FROM.',
      );
    }
    return new ConsoleEmailProvider();
  }

  if (!env.EMAIL_API_KEY) throw new Error(`EMAIL_API_KEY is required when EMAIL_PROVIDER=${name}`);
  if (!env.EMAIL_FROM) throw new Error(`EMAIL_FROM is required when EMAIL_PROVIDER=${name}`);

  switch (name) {
    case 'resend':
      return new ResendProvider(env.EMAIL_API_KEY, env.EMAIL_FROM);
    case 'mailgun':
      if (!env.EMAIL_DOMAIN) throw new Error('EMAIL_DOMAIN is required when EMAIL_PROVIDER=mailgun');
      return new MailgunProvider(env.EMAIL_API_KEY, env.EMAIL_DOMAIN, env.EMAIL_FROM);
    default:
      throw new Error(
        `Unknown EMAIL_PROVIDER "${env.EMAIL_PROVIDER}" (expected: console, resend, mailgun)`,
      );
  }
}

let provider: EmailProvider | undefined;

/** Lazily built so importing this module never throws at load time. */
export function emailProvider(): EmailProvider {
  provider ??= build();
  return provider;
}
