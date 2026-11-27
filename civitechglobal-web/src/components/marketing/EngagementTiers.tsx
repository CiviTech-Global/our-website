import { Link } from 'react-router';
import { Boxes, Cable, Store } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

/**
 * The three engagement tiers: fixed-scope packages with the scope and price
 * settled up front. The middle path is the recommended one and says so — the
 * gradient card edge and the badge — while the other two stay quiet surface
 * cards so the eye lands on the middle first. Shared by the home page and the
 * pricing page so the offer never drifts between them. Each card deep-links
 * to the intake form with its package preselected.
 */
export function EngagementTiers() {
  const { t } = useLocale();
  const packages = [
    {
      icon: Store,
      title: t.home.pkg1Title,
      desc: t.home.pkg1Desc,
      meta: t.home.pkg1Meta,
      query: 'shop-website',
      recommended: false,
    },
    {
      icon: Boxes,
      title: t.home.pkg2Title,
      desc: t.home.pkg2Desc,
      meta: t.home.pkg2Meta,
      query: 'ordering-inventory',
      recommended: true,
    },
    {
      icon: Cable,
      title: t.home.pkg3Title,
      desc: t.home.pkg3Desc,
      meta: t.home.pkg3Meta,
      query: 'custom-integration',
      recommended: false,
    },
  ];
  return (
    <section className="py-12">
      <AnimatedSection className="mb-10">
        <p className="eyebrow">{t.home.packagesEyebrow}</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-extrabold text-text-primary sm:text-4xl">
          {t.home.packagesTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">{t.home.packagesSubtitle}</p>
      </AnimatedSection>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {packages.map((pkg, i) => (
          <AnimatedSection key={pkg.title} delay={i * 0.08} className="h-full">
            <article
              className={`ct-lift flex h-full flex-col rounded-3xl p-7 ${
                pkg.recommended
                  ? 'card-edge'
                  : 'border border-border-default bg-surface-50 shadow-soft'
              }`}
            >
              {pkg.recommended && (
                <span className="bagh-chip absolute end-5 top-5 text-xs">
                  {t.home.pkgPopular}
                </span>
              )}
              <span className="flex size-12 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-700 dark:bg-brand-green-400/10 dark:text-brand-green-300">
                <pkg.icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-bold text-text-primary">{pkg.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-7 text-text-secondary">{pkg.desc}</p>
              <p className="mt-4 flex items-center gap-2 text-xs font-bold text-brand-green-700 dark:text-brand-green-300">
                <span className="size-1.5 rounded-full bg-brand-green-500" aria-hidden="true" />
                {pkg.meta}
              </p>
              <Link to={`/start-project?package=${pkg.query}`} className="glass-pill mt-5 !min-h-11 px-5 text-sm">
                {t.home.packagesCta}
              </Link>
            </article>
          </AnimatedSection>
        ))}
      </div>
      <AnimatedSection delay={0.1}>
        <p className="mt-6 text-center text-sm text-text-muted">{t.home.packagesNote}</p>
      </AnimatedSection>
    </section>
  );
}
