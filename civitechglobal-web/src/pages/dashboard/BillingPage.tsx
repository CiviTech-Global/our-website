import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CreditCard, Info } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { count, describeLimit, fill, toman } from '@/lib/planFormat';
import { cn } from '@/lib/utils';
import {
  PAID_TIERS,
  PLAN_TIERS,
  featureLabelKey,
  useCheckout,
  useOwnBilling,
  usePlanCatalog,
  useQuote,
  type FeatureUsage,
  type PaidTier,
  type PlanSelection,
  type PlanSubject,
  type PlanTier,
  type Subscription,
} from '@/api/billing';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

const STATUS_VARIANT = {
  ACTIVE: 'success',
  PENDING_PAYMENT: 'warning',
  EXPIRED: 'default',
  CANCELLED: 'danger',
} as const;

/**
 * The member's plans: for each plan they can hold, what is in force and how
 * much is used; then buying a whole tier or a custom mix for 1–12 months.
 */
export default function BillingPage() {
  const { t, locale } = useLocale();
  const p = t.plans;
  useDocumentTitle(p.billingTitle);
  const [params] = useSearchParams();
  const { data: billing, isLoading } = useOwnBilling();

  const featureName = (key: string) =>
    (p.features as Record<string, string | undefined>)[featureLabelKey(key)] ?? key;

  if (isLoading || !billing) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  const subjects = billing.plans.map((plan) => plan.subject);
  const requested = params.get('subject') as PlanSubject | null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={p.billingTitle} description={p.billingIntro} className="mb-0" />

      {!billing.enforced && (
        <p className="flex items-start gap-2 rounded-lg border border-app-border bg-app-well p-3 text-body text-app-text-3">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {p.measuringOnly}
        </p>
      )}

      {billing.plans.map((plan) => (
        <Card key={plan.subject}>
          <CardHeader>
            <CardTitle>
              {plan.subject === 'COMPANY' && billing.company
                ? fill(p.companyPlanFor, { name: billing.company.name })
                : p.subjects[plan.subject]}
            </CardTitle>
            <CardDescription>
              {plan.active.length === 0
                ? p.noActive
                : plan.active
                    .map((s) => `${s.tier ? p.tiers[s.tier] : p.custom} · ${fill(p.activeUntil, { date: formatDate(s.endsAt!, locale) })}`)
                    .join(' — ')}
            </CardDescription>
          </CardHeader>
          <ul className="flex flex-col gap-3">
            {plan.usage.map((usage) => (
              <UsageRow key={usage.featureKey} usage={usage} name={featureName(usage.featureKey)} />
            ))}
          </ul>
        </Card>
      ))}

      <BuyPlan
        subjects={subjects}
        initialSubject={requested && subjects.includes(requested) ? requested : subjects[0]!}
        initialTier={(params.get('tier') as PaidTier | null) ?? undefined}
        initialCustom={params.get('custom') === '1'}
        featureName={featureName}
      />

      <Card>
        <CardHeader>
          <CardTitle>{p.history}</CardTitle>
        </CardHeader>
        {billing.history.length === 0 ? (
          <p className="text-body text-app-text-4">{p.noHistory}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-app-border">
            {billing.history.map((row) => (
              <HistoryRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function UsageRow({ usage, name }: { usage: FeatureUsage; name: string }) {
  const { t, locale } = useLocale();
  const p = t.plans;
  const ratio = usage.limit ? Math.min(1, usage.used / usage.limit) : 0;
  const full = usage.limit !== null && usage.used >= usage.limit;

  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-body text-app-text">{name}</span>
        <span className={cn('text-label', full ? 'text-red-600' : 'text-app-text-3')}>
          {usage.limit === null
            ? fill(p.usedUnlimited, { used: count(usage.used, locale) })
            : fill(p.used, { used: count(usage.used, locale), limit: count(usage.limit, locale) })}
          {' · '}
          {p.tiers[usage.tier]} · {describeLimit(usage, p, locale)}
        </span>
      </div>
      {usage.limit !== null && (
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-app-well"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={usage.limit}
          aria-valuenow={usage.used}
          aria-label={name}
        >
          <div
            className={cn('h-full rounded-full', full ? 'bg-red-500' : 'bg-brand-green-500')}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      )}
    </li>
  );
}

function HistoryRow({ row }: { row: Subscription }) {
  const { t, locale } = useLocale();
  const p = t.plans;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className="min-w-0">
        <p className="text-body text-app-text">
          {p.subjects[row.subject]} · {row.tier ? p.tiers[row.tier] : p.custom} · {fill(p.monthsOption, { count: count(row.months, locale) })}
        </p>
        <p className="text-label text-app-text-4">
          <span dir="ltr">{row.code}</span> · {formatDate(row.createdAt, locale)} · {p.sources[row.source]}
          {row.source === 'PURCHASE' && ` · ${toman(row.total, locale)} ${p.toman}`}
        </p>
      </div>
      <Badge variant={STATUS_VARIANT[row.status]}>{p.statuses[row.status]}</Badge>
    </li>
  );
}

function BuyPlan({
  subjects,
  initialSubject,
  initialTier,
  initialCustom,
  featureName,
}: {
  subjects: PlanSubject[];
  initialSubject: PlanSubject;
  initialTier?: PaidTier;
  initialCustom: boolean;
  featureName: (key: string) => string;
}) {
  const { t, locale } = useLocale();
  const p = t.plans;
  const { showToast } = useToast();
  const { data: catalog } = usePlanCatalog();
  const checkout = useCheckout();

  const [subject, setSubject] = useState<PlanSubject>(initialSubject);
  const [custom, setCustom] = useState(initialCustom);
  const [tier, setTier] = useState<PaidTier>(initialTier && PAID_TIERS.includes(initialTier) ? initialTier : 'PRO');
  const [mix, setMix] = useState<Record<string, PlanTier>>({});
  const [months, setMonths] = useState(1);

  const features = useMemo(
    () => catalog?.features.filter((feature) => feature.subject === subject) ?? [],
    [catalog, subject],
  );
  // A fresh subject starts its mix from free.
  useEffect(() => setMix({}), [subject]);

  const selection: PlanSelection | null = useMemo(() => {
    if (custom) {
      const items = Object.entries(mix)
        .filter(([, value]) => value !== 'FREE')
        .map(([featureKey, value]) => ({ featureKey, tier: value }));
      return items.length ? { subject, months, items } : null;
    }
    return { subject, months, tier };
  }, [custom, mix, subject, months, tier]);

  const quote = useQuote(selection);

  async function pay() {
    if (!selection) return;
    try {
      const result = await checkout.mutateAsync({ ...selection, locale });
      if (result.redirectUrl) window.location.assign(result.redirectUrl);
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{p.buyTitle}</CardTitle>
        <CardDescription>{p.sandboxNote}</CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          {subjects.length > 1 && (
            <Select value={subject} aria-label={p.pricingTitle} onChange={(e) => setSubject(e.target.value as PlanSubject)} className="w-52">
              {subjects.map((value) => (
                <option key={value} value={value}>
                  {p.subjects[value]}
                </option>
              ))}
            </Select>
          )}
          <Select value={custom ? 'custom' : 'tier'} aria-label={p.buyTitle} onChange={(e) => setCustom(e.target.value === 'custom')} className="w-44">
            <option value="tier">{p.wholeTier}</option>
            <option value="custom">{p.customMix}</option>
          </Select>
          <Select value={String(months)} aria-label={p.months} onChange={(e) => setMonths(Number(e.target.value))} className="w-44">
            {(catalog?.periods ?? [{ months: 1, discountPercent: 0 }]).map((period) => (
              <option key={period.months} value={period.months}>
                {fill(p.monthsOption, { count: count(period.months, locale) })}
                {period.discountPercent > 0 ? ` (${fill(p.discount, { percent: count(period.discountPercent, locale) })})` : ''}
              </option>
            ))}
          </Select>
        </div>

        {!custom ? (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={p.wholeTier}>
            {PAID_TIERS.map((value) => {
              const monthly = catalog?.tiers[subject]?.find((row) => row.tier === value)?.monthlyIrt ?? null;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={tier === value}
                  disabled={monthly === null}
                  onClick={() => setTier(value)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-start transition-colors disabled:opacity-50',
                    tier === value ? 'border-brand-green-500 bg-brand-green-500/10' : 'border-app-border hover:border-brand-green-500/50',
                  )}
                >
                  <span className="block font-medium text-app-text">{p.tiers[value]}</span>
                  <span className="block text-label text-app-text-4">
                    {monthly === null ? p.notPriced : fill(p.perMonth, { amount: toman(monthly, locale) })}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-label text-app-text-4">{p.customHint}</p>
            {features.map((feature) => (
              <div key={feature.key} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-body text-app-text">{featureName(feature.key)}</span>
                <Select
                  className="w-64"
                  aria-label={featureName(feature.key)}
                  value={mix[feature.key] ?? 'FREE'}
                  onChange={(e) => setMix((current) => ({ ...current, [feature.key]: e.target.value as PlanTier }))}
                >
                  {PLAN_TIERS.map((value) => {
                    const level = feature.levels.find((l) => l.tier === value);
                    if (!level) return null;
                    const priced = value === 'FREE' || level.priceIrt !== null;
                    return (
                      <option key={value} value={value} disabled={!priced}>
                        {p.tiers[value]} — {describeLimit(level, p, locale)}
                        {value !== 'FREE' && level.priceIrt !== null ? ` — ${toman(level.priceIrt, locale)}` : ''}
                      </option>
                    );
                  })}
                </Select>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
          <div>
            <p className="text-label text-app-text-4">{p.total}</p>
            <p className="text-lg font-semibold text-app-text">
              {quote.data ? `${toman(quote.data.total, locale)} ${p.toman}` : quote.isFetching ? '…' : '—'}
            </p>
            {quote.error && <p className="text-label text-red-600">{apiMessage(quote.error, t.common.error)}</p>}
          </div>
          <Button onClick={() => void pay()} isLoading={checkout.isPending} disabled={!quote.data}>
            <CreditCard aria-hidden="true" />
            {p.pay}
          </Button>
        </div>
        <Link to="/pricing" className="w-fit text-label text-app-text-3 hover:underline">
          {p.pricingTitle}
        </Link>
      </div>
    </Card>
  );
}
