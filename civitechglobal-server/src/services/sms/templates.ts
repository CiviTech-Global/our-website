/**
 * Every SMS this site sends, as a Kavenegar verify template.
 *
 * Iranian operators filter free-text bulk SMS, so each kind of message is a
 * template approved by Kavenegar and sent with verify/lookup. The `name` here
 * is the template's name at Kavenegar; the `text` is what was submitted.
 * guides/kavenegar-templates.md is generated from this list, and
 * `npm run sms:check -- --submit` submits it, so code, guide and account
 * cannot drift.
 *
 * Rules the texts and tokens follow:
 *  - No links. Ever. The owner's rule, and the operators'. assertNoLink
 *    enforces it on every text and every token at send time.
 *  - A token is letters and digits only — Persian or English, no spaces, no
 *    punctuation, no half-space (Kavenegar's rule for verify/lookup). So the
 *    punctuation lives in the template text: a time is "ساعت %token:%token2",
 *    sent as two numbers. assertTokens enforces it at send time.
 *  - Every text contains %token (Kavenegar's rule). Names: English letters
 *    only, no spaces or underscores.
 */

export type TokenKey = 'token' | 'token2' | 'token3' | 'token10' | 'token20';

export interface SmsTemplate {
  /** The template name at Kavenegar. */
  name: string;
  /** The text submitted for approval. Placeholders are filled in at send time. */
  text: string;
  /** What each token carries, for the guide. */
  tokens: Partial<Record<TokenKey, string>>;
  /** Who receives it and when, for the guide. */
  purpose: string;
}

const SIGNATURE = 'رایان تمدن جهان گستر';
const NOT_YOU = 'اگر این کار را شما انجام نداده‌اید، فوراً با پشتیبانی تماس بگیرید.';

export const SMS_TEMPLATES = {
  // "۵ دقیقه" is OTP_TTL_SECONDS (300, also otp_ttl_seconds in the deploy).
  // Change both together, and resubmit the template.
  otp: {
    name: 'civiOtp',
    text: `${SIGNATURE}\nکد تأیید شما: %token\nاین کد تا ۵ دقیقه معتبر است. آن را به هیچ‌کس، حتی پشتیبانی ما، ندهید.`,
    tokens: { token: 'the 6-digit code' },
    purpose: 'Every one-time code: insurance form, account phone check, password reset.',
  },
  passwordChanged: {
    name: 'civiPasswordChanged',
    text: `${SIGNATURE}\nرمز عبور حساب کاربری شما امروز ساعت %token:%token2 تغییر کرد.\n${NOT_YOU}`,
    tokens: { token: 'hour, e.g. 14', token2: 'minute, e.g. 30' },
    purpose: 'The password was changed, or reset by SMS. Sent at once to a verified phone.',
  },
  twoStepOff: {
    name: 'civiTwoStepOff',
    text: `${SIGNATURE}\nورود دومرحله‌ای حساب کاربری شما امروز ساعت %token:%token2 خاموش شد.\n${NOT_YOU}`,
    tokens: { token: 'hour', token2: 'minute' },
    purpose: 'Two-step sign-in was turned off. Sent at once to a verified phone.',
  },
  accountDeleted: {
    name: 'civiAccountDeleted',
    text: `${SIGNATURE}\nحساب کاربری شما امروز ساعت %token:%token2 حذف شد.\n${NOT_YOU}`,
    tokens: { token: 'hour', token2: 'minute' },
    purpose: 'The member deleted their account. Sent at once to the number the account had.',
  },
  received: {
    name: 'civiReceived',
    text: `${SIGNATURE}\nدرخواست %token2 شما ثبت شد.\nکد رهگیری: %token\nبا این کد می‌توانید در بخش «پیگیری درخواست» سایت، وضعیت درخواست خود را ببینید.`,
    tokens: { token: 'tracking code', token2: 'بیمه، پروژه، مشاوره or همکاری' },
    purpose: 'A visitor submitted a form: insurance, software project, consultation, CV.',
  },
  scheduled: {
    name: 'civiScheduled',
    text: `${SIGNATURE}\nزمان %token20 شما با کارشناس ما تعیین شد:\nروز %token %token2، ساعت %token3:%token10\nاگر این زمان برایتان مناسب نیست، با پشتیبانی تماس بگیرید.`,
    tokens: {
      token: 'day of the month, e.g. 25',
      token2: 'month, e.g. آبان',
      token3: 'hour, e.g. 14',
      token10: 'minute, e.g. 30',
      token20: 'تماس or مشاوره',
    },
    purpose: 'Staff set the time of an insurance callback or a consultation.',
  },
  proposalReady: {
    name: 'civiProposalReady',
    text: `${SIGNATURE}\nپیشنهاد ما (هزینه و زمان‌بندی) برای پروژهٔ نرم‌افزاری شما آماده است.\nبا کد رهگیری %token در بخش «پیگیری درخواست» سایت، آن را ببینید و پاسخ دهید.`,
    tokens: { token: 'tracking code' },
    purpose: 'Staff sent the proposal for a software project request.',
  },
  resumeUpdate: {
    name: 'civiResumeUpdate',
    text: `${SIGNATURE}\nبررسی رزومهٔ شما به نتیجه رسید.\nبا کد رهگیری %token در بخش «پیگیری درخواست» سایت، نتیجه را ببینید.`,
    tokens: { token: 'tracking code' },
    purpose: 'Staff decided a CV: shortlisted, matched or declined.',
  },
  account: {
    name: 'civiAccount',
    text: `${SIGNATURE}\n%token گرامی، حساب کاربری شما در سایت ما ساخته شد.\nبا نام کاربری و رمز عبوری که حضوری از ما گرفته‌اید وارد شوید و بعد از اولین ورود، رمز را تغییر دهید.`,
    tokens: { token: 'first name, one word' },
    purpose: 'Staff opened an account for a company or an expert. Neither the username nor the password is texted.',
  },
  waiting: {
    name: 'civiWaiting',
    text: `${SIGNATURE}\nیک %token تازه برای شما رسیده و منتظر پاسخ شماست.\nبرای دیدن جزئیات، وارد حساب کاربری خود در سایت شوید.`,
    tokens: { token: 'درخواست، پیشنهاد or سفارش' },
    purpose: 'A member has a new application, bid or purchase request. Off until SMS_MEMBER_ALERTS=true; at most one per member per 6 hours.',
  },
  verification: {
    name: 'civiVerification',
    text: `${SIGNATURE}\nاحراز هویت شما %token شد.\nبرای دیدن جزئیات، وارد حساب کاربری خود در سایت شوید.`,
    tokens: { token: 'تأیید or رد' },
    purpose: 'Staff decided an identity verification. Off until SMS_MEMBER_ALERTS=true.',
  },
} as const satisfies Record<string, SmsTemplate>;

export type SmsKind = keyof typeof SMS_TEMPLATES;

export type SmsTokens = { token: string } & Partial<Record<Exclude<TokenKey, 'token'>, string>>;

/**
 * Anything that looks like a link: a scheme, www., or a domain-shaped word.
 * Deliberately broad — an SMS from this site never needs a dot between two
 * Latin words, and a false positive is a text not sent, which is the safe way
 * to be wrong.
 */
const LINK = /(https?:|ftp:|www\.|[a-z0-9-]+\.(?:ir|com|net|org|io|me|app|co|info|xyz|link|site|online)\b|t\.me|wa\.me)/i;

/** Letters and digits, any script; nothing else (Kavenegar's token rule). */
const TOKEN = /^[\p{L}\p{M}\p{N}]{1,100}$/u;

export class SmsLinkError extends Error {
  constructor(where: string) {
    super(`SMS refused: a link in ${where}`);
    this.name = 'SmsLinkError';
  }
}

export class SmsTokenError extends Error {
  constructor(where: string) {
    super(`SMS refused: ${where} is not letters and digits only`);
    this.name = 'SmsTokenError';
  }
}

/** Throws if the template text or any token contains a link. */
export function assertNoLink(kind: SmsKind, tokens: SmsTokens): void {
  if (LINK.test(SMS_TEMPLATES[kind].text)) throw new SmsLinkError(`template ${kind}`);
  for (const [key, value] of Object.entries(tokens)) {
    if (value !== undefined && LINK.test(value)) throw new SmsLinkError(`${kind}.${key}`);
  }
}

/** Throws if a token carries anything Kavenegar would refuse. */
export function assertTokens(kind: SmsKind, tokens: SmsTokens): void {
  for (const [key, value] of Object.entries(tokens)) {
    if (value !== undefined && !TOKEN.test(value)) throw new SmsTokenError(`${kind}.${key}`);
  }
}

/** The first word of a name, letters only: a greeting token Kavenegar accepts. */
export function greetingName(name: string): string | null {
  const first = name.trim().split(/\s+/)[0] ?? '';
  const letters = first.replace(/[^\p{L}\p{M}]/gu, '');
  return letters || null;
}
