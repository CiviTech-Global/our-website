import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useLocale } from '@/i18n/LocaleProvider';

/**
 * "Posted by the company itself".
 *
 * Anywhere members and staff put things in the same list, a reader deserves to
 * know which is which. Without it the company's own listings look like just
 * another seller's, and a member's look like they carry our endorsement —
 * both of which mislead in the direction that flatters us, which is exactly
 * the direction to be careful about.
 *
 * `short` is for a card in a grid, where the full sentence would wrap to three
 * lines; the title attribute keeps the long form reachable either way.
 */
export function CompanyBadge({ short = false }: { short?: boolean }) {
  const { t } = useLocale();
  return (
    <Badge variant="info" title={t.books.postedByCompany}>
      <BadgeCheck className="size-3" aria-hidden="true" />
      {short ? t.books.postedByCompanyShort : t.books.postedByCompany}
    </Badge>
  );
}
