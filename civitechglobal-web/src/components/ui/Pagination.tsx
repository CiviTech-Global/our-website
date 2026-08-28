import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { t, locale } = useLocale();
  if (totalPages <= 1) return null;

  const format = (n: number) => (locale === 'fa' ? toPersianDigits(n) : String(n));

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={t.common.previous}
      >
        {locale === 'fa' ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        <span className="hidden sm:inline">{t.common.previous}</span>
      </Button>
      <span className="whitespace-nowrap text-sm text-text-secondary">
        {t.common.page} {format(page)} {t.common.of} {format(totalPages)}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label={t.common.next}
      >
        <span className="hidden sm:inline">{t.common.next}</span>
        {locale === 'fa' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
      </Button>
    </nav>
  );
}
