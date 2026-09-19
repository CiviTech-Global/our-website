import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const { t } = useLocale();
  useDocumentTitle(t.errors.notFoundTitle, { noindex: true });

  // Dead-end URLs should still hand a crawler and a visitor somewhere useful:
  // a small set of links to the pages that matter keeps link equity flowing
  // and turns a bounce into a next page.
  const waypoints = [
    { to: '/', label: t.nav.home },
    { to: '/insurance', label: t.nav.insurance },
    { to: '/services', label: t.nav.services },
    { to: '/jobs', label: t.nav.jobs },
    { to: '/contact', label: t.nav.contact },
  ];

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="gradient-text text-7xl font-bold">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-text-primary">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 max-w-md text-text-secondary">{t.errors.notFoundBody}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/">
          <Button>{t.errors.goHome}</Button>
        </Link>
      </div>
      <nav aria-label="sitemap shortcuts" className="mt-8 flex flex-wrap justify-center gap-2">
        {waypoints.map((waypoint) => (
          <Link
            key={waypoint.to}
            to={waypoint.to}
            className="rounded-full border border-border-default px-4 py-1.5 text-sm text-text-secondary transition-colors hover:border-brand-green-500/50 hover:text-text-primary"
          >
            {waypoint.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
