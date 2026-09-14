import { Link } from 'react-router';
import { Bell } from 'lucide-react';
import { useUnreadCounts } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  /** Where the bell takes the viewer — the notifications page of this shell. */
  to: string;
}

/**
 * The header bell: notifications plus unread messages, summed into one badge
 * so the header stays quiet. Polls at the same honest interval as the counts
 * hook — this stack has no websocket gateway, and 30 seconds is fast enough
 * for everything the bell announces.
 */
export function NotificationBell({ to }: NotificationBellProps) {
  const { locale } = useLocale();
  const { data } = useUnreadCounts();
  const total = (data?.notifications ?? 0) + (data?.messages ?? 0);
  const digits = (value: number) => (locale === 'fa' ? toPersianDigits(value) : value);

  return (
    <Link
      to={to}
      aria-label={locale === 'fa' ? 'اعلان‌ها' : 'Notifications'}
      className="relative flex size-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-200 hover:text-text-primary"
    >
      <Bell className="size-4" aria-hidden />
      {total > 0 && (
        <span
          className={cn(
            'absolute -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-brand-red-500 px-1 text-[10px] font-semibold text-white',
            // RTL and LTR put the corner on different sides; both are "the
            // far corner from the icon's visual weight".
            locale === 'fa' ? '-left-0.5' : '-right-0.5',
          )}
        >
          {digits(total > 99 ? 99 : total)}
        </span>
      )}
    </Link>
  );
}
