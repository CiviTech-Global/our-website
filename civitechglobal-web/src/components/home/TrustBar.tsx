import { usePublicOrganizations, usePublicProjects, showcaseImageSrc } from '@/api/showcase';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

/**
 * The trust bar: real numbers from the showcase API (projects delivered,
 * client organisations, projects under maintenance) plus an edge-masked
 * marquee of customer names and logos. Renders nothing until the API answers,
 * so a prerender without a server — or a failed request — leaves no empty
 * chrome behind.
 */
export function TrustBar() {
  const { t, locale } = useLocale();
  const customers = usePublicOrganizations('CUSTOMER');
  const projects = usePublicProjects('all');

  const customerList = customers.data ?? [];
  const projectList = projects.data ?? [];

  if (customerList.length === 0 && projectList.length === 0) return null;

  const maintained = projectList.filter((p) => p.status === 'MAINTAINED').length;
  const digits = (n: number) => (locale === 'fa' ? toPersianDigits(n) : String(n));

  const stats: Array<{ value: number; label: string }> = [];
  if (projectList.length > 0) stats.push({ value: projectList.length, label: t.home.trustProjects });
  if (customerList.length > 0)
    stats.push({ value: customerList.length, label: t.home.trustCustomers });
  if (maintained > 0) stats.push({ value: maintained, label: t.home.trustMaintained });

  return (
    <section className="py-10">
      {customerList.length > 0 && (
        <>
          <AnimatedSection>
            <p className="eyebrow justify-center">{t.home.trustEyebrow}</p>
          </AnimatedSection>
          {/* Two copies of the list slide -50% and loop; the mask fades both
              ends. Pauses on hover (CSS), and the global kill-switch stops it
              for reduced motion. */}
          <div className="marquee mt-6" dir="ltr">
            <div className="marquee-track items-center gap-12 pe-12">
              {[...customerList, ...customerList].map((org, i) => {
                const logo = showcaseImageSrc(org.logoUrl);
                return (
                  <span
                    key={`${org.id}-${i}`}
                    className="flex items-center gap-2.5 whitespace-nowrap text-lg font-bold text-text-secondary"
                    aria-hidden={i >= customerList.length}
                  >
                    {logo && (
                      <img src={logo} alt="" className="size-8 rounded-lg object-contain" loading="lazy" />
                    )}
                    {org.name}
                  </span>
                );
              })}
            </div>
          </div>
        </>
      )}

      {stats.length > 0 && (
        <AnimatedSection delay={0.08}>
          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 text-center sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="card-edge flex flex-col rounded-2xl px-4 py-5">
                {/* dt precedes dd in the DOM (spec order); the flex order
                    keeps the big value on top visually. */}
                <dt className="order-2 mt-1 text-sm font-medium text-text-secondary">{stat.label}</dt>
                <dd className="order-1 text-4xl font-bold tabular-nums text-brand-green-600 dark:text-brand-green-300">
                  {digits(stat.value)}
                </dd>
              </div>
            ))}
          </dl>
        </AnimatedSection>
      )}
    </section>
  );
}
