import { useState } from 'react';
import { Link, type To } from 'react-router';
import { Check, Sparkles } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
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

/**
 * The price list: three kinds of holder, four tiers each, every item with its
 * own limit and monthly price. A tier's price is the sum of its items, which is
 * also why a custom mix is possible — the billing page builds one.
 */
export default function PricingPage() {
  const { t, locale } = useLocale();
  const p = t.plans;
  useDocumentTitle(p.pricingTitle, { description: p.pricingIntro });
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
    <div className="page-frame">
      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-text-primary">{p.pricingTitle}</h1>
        <p className="mt-2 text-text-secondary">{p.pricingIntro}</p>
        <p className="mt-3 flex items-start gap-2 text-sm text-text-secondary">
          <Check className="mt-0.5 size-4 shrink-0 text-brand-green-500" aria-hidden="true" />
          {p.alwaysFree}
        </p>
      </header>

      <div role="tablist" aria-label={p.pricingTitle} className="mb-6 flex flex-wrap gap-2">
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
        <div className="overflow-x-auto rounded-xl border border-border-default">
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
    </div>
  );
}
