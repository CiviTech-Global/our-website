import { Eye, FileText, Users } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';

interface ListingStatsProps {
  views: number;
  responses: number;
  /** Which board this is: the icon and wording follow it. */
  variant: 'applications' | 'bids';
  responsesLabel: string;
}

/**
 * The quiet numbers under a listing title: how many times it was read, and
 * how many people answered it. Counts only — on the project board the bids
 * stay sealed even in aggregate shape beyond this number.
 */
export function ListingStats({ views, responses, variant, responsesLabel }: ListingStatsProps) {
  const { locale, t } = useLocale();
  const digits = (value: number) => (locale === 'fa' ? toPersianDigits(value) : value);
  const ResponseIcon = variant === 'bids' ? FileText : Users;

  return (
    <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
      <span className="inline-flex items-center gap-1">
        <Eye className="size-3.5" aria-hidden />
        {digits(views)} {t.market.viewsLabel}
      </span>
      <span className="inline-flex items-center gap-1">
        <ResponseIcon className="size-3.5" aria-hidden />
        {digits(responses)} {responsesLabel}
      </span>
    </div>
  );
}
