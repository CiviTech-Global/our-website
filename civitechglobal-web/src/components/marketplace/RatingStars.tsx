import { Star } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  avg: number;
  count: number;
  className?: string;
}

/**
 * The reputation line: five stars, the average, and how many reviews it
 * stands on. Averages are only as trustworthy as the count under them, so
 * the count is always shown when it is not zero.
 */
export function RatingStars({ avg, count, className }: RatingStarsProps) {
  const { locale } = useLocale();
  const filled = Math.round(avg);

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs text-text-secondary', className)}
      aria-label={locale === 'fa' ? `${toPersianDigits(avg.toFixed(1))} از ۵` : `${avg.toFixed(1)} out of 5`}
    >
      <span className="inline-flex" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={cn(
              'size-3.5',
              index < filled
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-surface-300 dark:text-surface-200'
            )}
          />
        ))}
      </span>
      <span>{locale === 'fa' ? toPersianDigits(avg.toFixed(1)) : avg.toFixed(1)}</span>
      {count > 0 && (
        <span>({locale === 'fa' ? toPersianDigits(count) : count})</span>
      )}
    </span>
  );
}
