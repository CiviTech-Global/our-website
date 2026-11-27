import { useState } from 'react';
import { Link, type To } from 'react-router';
import { Check, ChevronDown, Sparkles } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { LOCALE_TAGS } from '@/i18n/locales';
import { useDocumentTitle } from '@/lib/documentTitle';
import { faqPageSchema } from '@/lib/structuredData';
import { useAuth } from '@/contexts/AuthProvider';
import {
  PLAN_SUBJECTS,
  PLAN_TIERS,
  featureLabelKey,
  usePlanCatalog,
  type PlanSubject,
  type PlanTier,
} from '@/api/billing';
import { describeLimit, fill, toman } from '@/lib/planFormat';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { BandCta } from '@/components/marketing/BandCta';
import { EngagementTiers } from '@/components/marketing/EngagementTiers';

/**
 * Pricing, in two parts. The studio's engagement tiers lead — the same three
 * fixed-scope packages the home page shows, shared as one component so the
 * offer never drifts — then the marketplace's monthly plan catalogue: three
 * kinds of holder, four tiers each, every item with its own limit and monthly
 * price. A tier's price is the sum of its items, which is also why a custom
 * mix is possible — the billing page builds one. The pricing FAQ kills the
 * objections raised before signing, and the page closes on the deep band.
 */
export default function PricingPage() {
  const { t, locale } = useLocale();
  const p = t.plans;

  // The FAQ section's questions, stated for rich results; the schema is built
  // from the same copy the section renders, so the two can never disagree.
  const faqSchema = faqPageSchema(
    t.pricing.faq.map((item) => ({ question: item.q, answer: item.a })),
    LOCALE_TAGS[locale]
  );

  useDocumentTitle(p.pricingTitle, {
    description: p.pricingIntro,
    jsonLd: faqSchema ?? undefined,
  });
  const { user } = useAuth();
  const [subject, setSubject] = useState<PlanSubject>('USER');
  const { data, isLoading } = usePlanCatalog();

  const features = data?.features.filter((feature) => feature.subject === subject) ?? [];
  const totals = data?.tiers[subject] ?? [];
  /**
   * Signed in, straight to the billing page with the choice made. Signed out,
   * to registration — which reads `from` and continues to that same page once
   * the account exists, instead of dropping a buyer on the dashboard.
   */
  const go = (search: string): { to: To; state?: unknown } =>
    user ? { to: `/dashboard/billing?${search}` } : { to: '/register', state: { from: { pathname: '/dashboard/billing', search: `?${search}` } } };
  const buyHref = (tier: PlanTier) => go(`subject=${subject}${tier === 'FREE' ? '' : `&tier=${tier}`}`);
  const customHref = go(`subject=${subject}&custom=1`);

  return (
    <div className="page-frame !pt-0">
      <AnimatedSection className="hero-canvas bagh-ground -mx-4 mb-10 px-4 pb-12 pt-12 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <p className="eyebrow">{t.nav.pricing}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold text-text-primary sm:text-5xl">
          {p.pricingTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-loose text-text-secondary">{p.pricingIntro}</p>
      </AnimatedSection>

      {/* The studio's engagement tiers lead: fixed scope, price settled up
          front, the recommended middle path on the gradient edge. */}
      <EngagementTiers />

      {/* The marketplace's monthly plans, clearly the second offer. */}
      <AnimatedSection className="mb-8 mt-6">
        <h2 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
          {t.pricing.plansTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-text-secondary">{t.pricing.plansSubtitle}</p>
        <p className="mt-3 flex items-start gap-2 text-sm text-text-secondary">
          <Check className="mt-0.5 size-4 shrink-0 text-brand-green-500 dark:text-brand-green-400" aria-hidden="true" />
          {p.alwaysFree}
        </p>
      </AnimatedSection>

      <div role="tablist" aria-label={t.pricing.plansTitle} className="mb-6 flex flex-wrap gap-2">
        {PLAN_SUBJECTS.map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={subject === value}
            onClick={() => setSubject(value)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm transition-colors',
              subject === value
                ? 'border-brand-green-500 bg-brand-green-500/10 text-text-primary'
                : 'border-border-default text-text-secondary hover:border-brand-green-500/50',
            )}
          >
            {p.subjects[value]}
          </button>
        ))}
      </div>
      <p className="mb-6 text-sm text-text-secondary">{p.subjectHints[subject]}</p>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {data && (
        <div className="overflow-x-auto rounded-2xl border border-border-default bg-surface-50 shadow-soft dark:bg-surface-100">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border-default bg-surface-muted text-start">
                <th scope="col" className="p-3 text-start font-medium text-text-secondary">
                  {p.feature}
                </th>
                {PLAN_TIERS.map((tier) => (
                  <th key={tier} scope="col" className="p-3 text-start font-semibold text-text-primary">
                    {p.tiers[tier]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.key} className="border-b border-border-default last:border-0">
                  <th scope="row" className="p-3 text-start font-normal text-text-primary">
                    {(p.features as Record<string, string | undefined>)[featureLabelKey(feature.key)] ?? feature.name}
                  </th>
                  {feature.levels.map((level) => (
                    <td key={level.tier} className="p-3 align-top">
                      <p className="text-text-primary">{describeLimit(level, p, locale)}</p>
                      {level.tier !== 'FREE' && (
                        <p className="mt-0.5 text-xs text-text-muted">
                          {level.priceIrt === null ? p.notPriced : fill(p.perMonth, { amount: toman(level.priceIrt, locale) })}
                        </p>
                      )}
                      {level.tier !== 'FREE' && level.priceUsdt && (
                        <p className="text-xs text-text-muted" dir="auto">
                          {fill(p.perMonthUsdt, { amount: level.priceUsdt })}
                        </p>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-muted">
                <th scope="row" className="p-3 text-start font-medium text-text-secondary">
                  {p.monthlyTotal}
                </th>
                {PLAN_TIERS.map((tier) => {
                  const row = totals.find((item) => item.tier === tier);
                  const total = row?.monthlyIrt ?? null;
                  return (
                    <td key={tier} className="p-3 align-top">
                      <p className="font-semibold text-text-primary">
                        {tier === 'FREE' ? p.tiers.FREE : total === null ? p.notPriced : `${toman(total, locale)} ${p.toman}`}
                      </p>
                      {tier !== 'FREE' && row?.monthlyUsdt && (
                        <p className="text-xs text-text-muted" dir="auto">
                          {fill(p.perMonthUsdt, { amount: row.monthlyUsdt })}
                        </p>
                      )}
                      {(tier === 'FREE' || total !== null) && (
                        <Link to={buyHref(tier).to} state={buyHref(tier).state} className="mt-2 inline-block">
                          <Button size="sm" variant={tier === 'PRO' ? 'primary' : 'outline'}>
                            {p.choose}
                          </Button>
                        </Link>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-6">
        <Link to={customHref.to} state={customHref.state}>
          <Button variant="outline">
            <Sparkles className="size-4" aria-hidden="true" />
            {p.buildCustom}
          </Button>
        </Link>
      </div>

      {/* The pricing FAQ: native <details> accordions, the same pattern the
          home page uses, so it works in the prerendered HTML too. */}
      <section className="py-12">
        <AnimatedSection className="mb-10 text-center">
          <p className="eyebrow justify-center">{t.pricing.faqEyebrow}</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold text-text-primary sm:text-4xl">
            {t.pricing.faqTitle}
          </h2>
        </AnimatedSection>
        <div className="mx-auto max-w-3xl space-y-4">
          {t.pricing.faq.map((item, i) => (
            <AnimatedSection key={item.q} delay={i * 0.05}>
              <details className="group rounded-2xl border border-border-default bg-surface-50 shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-bold text-text-primary [&::-webkit-details-marker]:hidden sm:text-base">
                  {item.q}
                  <ChevronDown
                    className="size-5 shrink-0 text-brand-green-600 transition-transform group-open:rotate-180 dark:text-brand-green-300"
                    aria-hidden="true"
                  />
                </summary>
                <p className="px-5 pb-5 text-sm leading-7 text-text-secondary">{item.a}</p>
              </details>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* The page closer: the same deep band every public page ends on. */}
      <BandCta
        title={t.services.ctaTitle}
        body={t.services.ctaSubtitle}
        primaryLabel={t.nav.startProject}
        primaryTo="/start-project"
        secondaryLabel={t.home.heroCtaSecondary}
        secondaryTo="/contact"
      />
    </div>
  );
}
