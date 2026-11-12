/**
 * Every SMS this site sends, as a Kavenegar verify template.
 *
 * Iranian operators filter free-text bulk SMS, so each kind of message is a
 * template approved in the Kavenegar panel (Verify → templates) and sent with
 * verify/lookup. The `name` here must match the panel exactly; the `text` is
 * what to submit there. guides/kavenegar-templates.md is generated from this
 * list, so the two cannot drift.
 *
 * Rules the texts and tokens follow:
 *  - No links. Ever. The owner's rule, and the operators'. assertNoLink
 *    enforces it on every text and every token at send time.
 *  - Tokens carry no spaces (Kavenegar refuses them). Multi-word values are
 *    joined with a zero-width non-joiner, which Persian already uses inside
 *    words, so they read naturally.
 *  - Template names: English letters only, no spaces or underscores.
 */

export interface SmsTemplate {
  /** The template name in the Kavenegar panel. */
  name: string;
  /** The text to submit for approval. %token, %token2, %token3 are filled in. */
  text: string;
  /** What each token carries, for the guide. */
  tokens: Partial<Record<'token' | 'token2' | 'token3', string>>;
  /** Who receives it and when, for the guide. */
  purpose: string;
}

const SIGNATURE = 'رایان تمدن جهان گستر';

export const SMS_TEMPLATES = {
  otp: {
    name: 'civiOtp',
    text: `${SIGNATURE}\nکد تأیید شما: %token\nاین کد را به هیچ‌کس ندهید.`,
    tokens: { token: 'the 6-digit code' },
    purpose: 'Every one-time code: insurance form, account phone check, password reset.',
  },
  security: {
    name: 'civiSecurity',
    text: `${SIGNATURE}\nهشدار امنیتی: %token در حساب شما انجام شد.\nاگر این کار شما نبوده، فوراً با پشتیبانی تماس بگیرید.`,
    tokens: { token: 'what happened, e.g. تغییر‌رمز‌عبور' },
    purpose: 'Password changed or reset, two-step sign-in turned off, account deleted. Always sent to a verified phone.',
  },
  received: {
    name: 'civiReceived',
    text: `${SIGNATURE}\n%token2 شما ثبت شد.\nکد رهگیری: %token\nبرای پیگیری، این کد را در بخش «پیگیری درخواست» سایت وارد کنید.`,
    tokens: { token: 'tracking code', token2: 'what was submitted, e.g. درخواست‌بیمه' },
    purpose: 'A visitor submitted a form: insurance, software project, consultation, CV.',
  },
  scheduled: {
    name: 'civiScheduled',
    text: `${SIGNATURE}\n%token3 شما برای %token ساعت %token2 هماهنگ شد.`,
    tokens: { token: 'date, e.g. 1405/08/25', token2: 'time, e.g. 14:30', token3: 'what, e.g. تماس‌مشاور‌بیمه' },
    purpose: 'Staff set the time of an insurance callback or a consultation.',
  },
  update: {
    name: 'civiUpdate',
    text: `${SIGNATURE}\nوضعیت درخواست %token: %token2\nجزئیات را با همین کد در بخش «پیگیری درخواست» سایت ببینید.`,
    tokens: { token: 'tracking code', token2: 'new status, e.g. پیشنهاد‌آماده‌است' },
    purpose: 'Staff moved a visitor request on: proposal ready, CV decided.',
  },
  account: {
    name: 'civiAccount',
    text: `${SIGNATURE}\nحساب کاربری شما ساخته شد.\nنام کاربری: %token\nرمز عبور را حضوری دریافت کرده‌اید؛ پس از ورود آن را تغییر دهید.`,
    tokens: { token: 'username' },
    purpose: 'Staff opened an account for a company or an expert. The password is never texted.',
  },
  waiting: {
    name: 'civiWaiting',
    text: `${SIGNATURE}\n%token تازه منتظر پاسخ شماست.\nبرای دیدن، وارد حساب کاربری خود شوید.`,
    tokens: { token: 'what, e.g. درخواست‌همکاری' },
    purpose: 'A member has a new application, bid or purchase request. Off until SMS_MEMBER_ALERTS=true; at most one per member per 6 hours.',
  },
  verification: {
    name: 'civiVerification',
    text: `${SIGNATURE}\nنتیجهٔ احراز هویت شما: %token\nجزئیات در حساب کاربری شماست.`,
    tokens: { token: 'تأیید‌شد or تأیید‌نشد' },
    purpose: 'Staff decided an identity verification. Off until SMS_MEMBER_ALERTS=true.',
  },
} as const satisfies Record<string, SmsTemplate>;

export type SmsKind = keyof typeof SMS_TEMPLATES;

export interface SmsTokens {
  token: string;
  token2?: string;
  token3?: string;
}

/** Joins words for a token: Kavenegar refuses spaces, and a ZWNJ reads as Persian does. */
export const tokenWords = (...words: string[]) => words.join('‌');

/**
 * Anything that looks like a link: a scheme, www., or a domain-shaped word.
 * Deliberately broad — an SMS from this site never needs a dot between two
 * Latin words, and a false positive is a text not sent, which is the safe way
 * to be wrong.
 */
const LINK = /(https?:|ftp:|www\.|[a-z0-9-]+\.(?:ir|com|net|org|io|me|app|co|info|xyz|link|site|online)\b|t\.me|wa\.me)/i;

export class SmsLinkError extends Error {
  constructor(where: string) {
    super(`SMS refused: a link in ${where}`);
    this.name = 'SmsLinkError';
  }
}

/** Throws if the template text or any token contains a link. */
export function assertNoLink(kind: SmsKind, tokens: SmsTokens): void {
  if (LINK.test(SMS_TEMPLATES[kind].text)) throw new SmsLinkError(`template ${kind}`);
  for (const [key, value] of Object.entries(tokens)) {
    if (value !== undefined && LINK.test(value)) throw new SmsLinkError(`${kind}.${key}`);
  }
}
