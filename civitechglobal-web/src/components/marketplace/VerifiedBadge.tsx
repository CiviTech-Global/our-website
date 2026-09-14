import { BadgeCheck } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

/**
 * The green check that means a person or company has been through identity
 * verification. One component so the badge never drifts between the boards,
 * applications and profiles.
 */
export function VerifiedBadge() {
  const { t } = useLocale();

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium text-brand-green-700 dark:bg-brand-green-900/40 dark:text-brand-green-300">
      <BadgeCheck className="size-3.5" aria-hidden />
      {t.market.verifiedBadge}
    </span>
  );
}
