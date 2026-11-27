import { usePublicOrganizations, usePublicProjects } from '@/api/showcase';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

/**
 * The stability signals: real numbers from the showcase API — projects
 * delivered, client organisations, projects under maintenance — as a row of
 * stat tiles with tabular numerals. The same figures the home page's trust
 * bar shows, without the logo marquee, so the about page can claim only what
 * the data already proves. Renders nothing until the API answers, so a
 * prerender without a server — or a failed request — leaves no empty chrome.
 */
export function CompanyStats() {
  const { t, locale } = useLocale();
  const customers = usePublicOrganizations('CUSTOMER');
  const projects = usePublicProjects('all');

  const customerList = customers.data ?? [];
  const projectList = projects.data ?? [];
  const maintained = projectList.filter((p) => p.status === 'MAINTAINED').length;
  const digits = (n: number) => (locale === 'fa' ? toPersianDigits(n) : String(n));

  const stats: Array<{ value: number; label: string }> = [];
  if (projectList.length > 0) stats.push({ value: projectList.length, label: t.home.trustProjects });
  if (customerList.length > 0) stats.push({ value: customerList.length, label: t.home.trustCustomers });
  if (maintained > 0) stats.push({ value: maintained, label: t.home.trustMaintained });

  if (stats.length === 0) return null;

  return (
    <AnimatedSection className="mb-12">
      <dl className="mx-auto grid max-w-3xl grid-cols-1 gap-6 text-center sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card-edge flex flex-col rounded-2xl px-4 py-5">
            {/* dt precedes dd in the DOM (spec order); the flex order keeps
                the big value on top visually. */}
            <dt className="order-2 mt-1 text-sm font-medium text-text-secondary">{stat.label}</dt>
            <dd className="order-1 text-4xl font-bold tabular-nums text-brand-green-600 dark:text-brand-green-300">
              {digits(stat.value)}
            </dd>
          </div>
        ))}
      </dl>
    </AnimatedSection>
  );
}
