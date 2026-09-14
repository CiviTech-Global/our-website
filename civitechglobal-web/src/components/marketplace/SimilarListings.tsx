import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { Badge } from '@/components/ui/Badge';

interface SimilarJob {
  code: string;
  title: string;
  category: string | null;
  employmentType?: string;
}

interface SimilarListingsProps {
  title: string;
  /** Where the codes link to: /jobs or /projects. */
  basePath: '/jobs' | '/projects';
  items: SimilarJob[];
}

/**
 * The detail-page rail of same-category, same-skill listings. Counts and
 * identities stay exactly as sealed here as on the board itself.
 */
export function SimilarListings({ title, basePath, items }: SimilarListingsProps) {
  const { t } = useLocale();

  if (items.length === 0) return null;

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.code}>
            <Link
              to={`${basePath}/${item.code}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 p-3 transition-colors hover:border-brand-400 dark:border-surface-300"
            >
              <span className="font-medium text-text-primary">{item.title}</span>
              <span className="flex items-center gap-2">
                {item.category && <Badge>{item.category}</Badge>}
                {item.employmentType && (
                  <Badge variant="info">{t.market[item.employmentType as 'FULL_TIME']}</Badge>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
