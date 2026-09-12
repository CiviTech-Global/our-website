import type { BadgeVariant } from '@/components/ui/Badge';
import type fa from '@/i18n/fa';
import type { ListingState, ModerationStatus, OfferOutcome, VerificationStatus } from '@/types/marketplace';
import { toPersianDigits } from '@/i18n/utils';

/**
 * Money on the boards.
 *
 * Amounts arrive as decimal strings, and stay strings the whole way: grouping
 * is done on the digits themselves, so the value is never parsed and never
 * rounded. The only transformation is inserting separators and, in Persian,
 * swapping the digits.
 *
 * The unit is Toman (IRT), which is what every other price in this codebase
 * is — insurance premiums, project quotes, proposals. Labelling these as rial
 * would understate every figure on both boards by a factor of ten.
 */
export function formatMoney(value: string | null | undefined, locale: 'fa' | 'en'): string | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return null;

  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'fa' ? '٬' : ',');
  return locale === 'fa' ? toPersianDigits(grouped) : grouped;
}

/**
 * A range, where either end may be missing.
 *
 * "from 50,000,000" and "up to 90,000,000" are both real answers — a client who
 * knows their floor but not their ceiling should not be forced to invent one,
 * and the board should not render the gap as an empty dash.
 */
export function formatRange(
  min: string | null | undefined,
  max: string | null | undefined,
  locale: 'fa' | 'en',
  t: typeof fa
): string | null {
  const low = formatMoney(min, locale);
  const high = formatMoney(max, locale);

  if (low && high) return `${low} ${t.market.to} ${high} ${t.market.currency}`;
  if (low) return `${t.market.from} ${low} ${t.market.currency}`;
  if (high) return `${t.market.to} ${high} ${t.market.currency}`;
  return null;
}

/**
 * Colour carries the same meaning everywhere: green is settled and good, amber
 * is waiting on somebody, red is a no, blue is in motion. Repeating this per
 * page is how a "changes requested" ends up amber on one screen and red on the
 * next, which quietly tells two different stories about the same row.
 */
export function moderationVariant(status: ModerationStatus): BadgeVariant {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'CHANGES_REQUESTED':
      return 'warning';
    case 'PENDING_REVIEW':
      return 'info';
    default:
      return 'default';
  }
}

export function verificationVariant(status: VerificationStatus): BadgeVariant {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'PENDING':
      return 'info';
    default:
      return 'default';
  }
}

export function stateVariant(state: ListingState): BadgeVariant {
  switch (state) {
    case 'OPEN':
      return 'success';
    case 'AWARDED':
      return 'info';
    default:
      return 'default';
  }
}

export function outcomeVariant(outcome: OfferOutcome): BadgeVariant {
  switch (outcome) {
    case 'ACCEPTED':
      return 'success';
    case 'DECLINED':
      return 'danger';
    case 'SHORTLISTED':
      return 'info';
    default:
      return 'default';
  }
}
