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
    text: `${SIGNATURE}\nرمز عبور حساب کاربری شما در تاریخ %token ساعت %token2 تغییر کرد.\nاگر این کار را شما انجام نداده‌اید، فوراً با پشتیبانی تماس بگیرید.`,
    tokens: { token: 'date, e.g. 1405/08/25', token2: 'time, e.g. 14:30' },
    purpose: 'The password was changed, or reset by SMS. Always sent to a verified phone.',
  },
  twoStepOff: {
    name: 'civiTwoStepOff',
    text: `${SIGNATURE}\nورود دومرحله‌ای حساب کاربری شما در تاریخ %token ساعت %token2 خاموش شد.\nاگر این کار را شما انجام نداده‌اید، فوراً با پشتیبانی تماس بگیرید.`,
    tokens: { token: 'date', token2: 'time' },
    purpose: 'Two-step sign-in was turned off. Always sent to a verified phone.',
  },
  accountDeleted: {
    name: 'civiAccountDeleted',
    text: `${SIGNATURE}\nحساب کاربری شما در تاریخ %token ساعت %token2 حذف شد.\nاگر این کار را شما انجام نداده‌اید، فوراً با پشتیبانی تماس بگیرید.`,
    tokens: { token: 'date', token2: 'time' },
    purpose: 'The member deleted their account. Sent to the number the account had.',
  },
  received: {
    name: 'civiReceived',
    text: `${SIGNATURE}\nدرخواست شما برای %token2 ثبت شد.\nکد رهگیری: %token\nبا این کد می‌توانید در بخش «پیگیری درخواست» سایت، وضعیت درخواست خود را ببینید.`,
    tokens: { token: 'tracking code', token2: 'بیمه، ساخت‌نرم‌افزار، مشاوره یا همکاری' },
    purpose: 'A visitor submitted a form: insurance, software project, consultation, CV.',
  },
  scheduled: {
    name: 'civiScheduled',
    text: `${SIGNATURE}\nزمان %token3 شما با کارشناس ما تعیین شد:\nتاریخ %token، ساعت %token2\nاگر این زمان برایتان مناسب نیست، با پشتیبانی تماس بگیرید.`,
    tokens: { token: 'date, e.g. 1405/08/25', token2: 'time, e.g. 14:30', token3: 'تماس or مشاوره' },
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
    text: `${SIGNATURE}\nحساب کاربری شما در سایت ما ساخته شد.\nنام کاربری: %token\nرمز عبور را حضوری از ما گرفته‌اید؛ بعد از اولین ورود، آن را تغییر دهید.`,
    tokens: { token: 'username' },
    purpose: 'Staff opened an account for a company or an expert. The password is never texted.',
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
