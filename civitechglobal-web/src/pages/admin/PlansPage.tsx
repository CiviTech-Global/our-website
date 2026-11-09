import { useEffect, useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { count, fill, toman } from '@/lib/planFormat';
import {
  PAID_TIERS,
  PLAN_SUBJECTS,
  featureLabelKey,
  useAdminSubscriptions,
  useCancelSubscription,
  useGrantPlan,
  usePlanCatalog,
  useSetPlanPrices,
  type PaidTier,
  type PlanSubject,
  type PriceUpdate,
} from '@/api/billing';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

type PriceCell = { irt: string; usdt: string };
const cellKey = (featureKey: string, tier: string) => `${featureKey}|${tier}`;

/** Staff: what each level costs, who holds what, and plans given by hand. */
export default function AdminPlansPage() {
  const { t } = useLocale();
  const p = t.plans;
  useDocumentTitle(p.adminPlansTitle);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={p.adminPlansTitle} description={p.adminPlansIntro} className="mb-0" />
      <PriceGrid />
      <GrantForm />
      <SubscriptionList />
    </div>
  );
}

function PriceGrid() {
  const { t } = useLocale();
  const p = t.plans;
  const { showToast } = useToast();
  const { data: catalog, isLoading } = usePlanCatalog();
  const save = useSetPlanPrices();
  const [subject, setSubject] = useState<PlanSubject>('USER');
  const [cells, setCells] = useState<Record<string, PriceCell>>({});

  useEffect(() => {
    if (!catalog) return;
    const next: Record<string, PriceCell> = {};
    for (const feature of catalog.features) {
      for (const level of feature.levels) {
        next[cellKey(feature.key, level.tier)] = { irt: level.priceIrt ?? '', usdt: level.priceUsdt ?? '' };
      }
    }
    setCells(next);
  }, [catalog]);

  async function onSave() {
    if (!catalog) return;
    const updates: PriceUpdate[] = [];
    for (const feature of catalog.features.filter((f) => f.subject === subject)) {
      for (const tier of PAID_TIERS) {
        const cell = cells[cellKey(feature.key, tier)];
        if (!cell) continue;
        updates.push({
          featureKey: feature.key,
          tier,
          priceIrt: cell.irt.trim() === '' ? null : cell.irt.trim(),
          priceUsdt: cell.usdt.trim() === '' ? null : cell.usdt.trim(),
        });
      }
    }
    try {
      await save.mutateAsync(updates);
      showToast(p.pricesSaved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  const set = (key: string, field: keyof PriceCell, value: string) =>
    setCells((current) => ({ ...current, [key]: { ...(current[key] ?? { irt: '', usdt: '' }), [field]: value } }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{p.adminPlansTitle}</CardTitle>
      </CardHeader>
      <Select value={subject} onChange={(e) => setSubject(e.target.value as PlanSubject)} className="mb-4 w-56" aria-label={p.holder}>
        {PLAN_SUBJECTS.map((value) => (
          <option key={value} value={value}>
            {p.subjects[value]}
          </option>
        ))}
      </Select>
      {isLoading && <Spinner label={t.common.loading} />}
      {catalog && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-body">
            <thead>
              <tr className="border-b border-app-border text-start text-label text-app-text-3">
                <th className="p-2 text-start">{p.feature}</th>
                {PAID_TIERS.map((tier) => (
                  <th key={tier} className="p-2 text-start">
                    {p.tiers[tier]}
                    <span className="block font-normal">
                      {p.priceIrt} / {p.priceUsdt}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catalog.features
                .filter((feature) => feature.subject === subject)
                .map((feature) => (
                  <tr key={feature.key} className="border-b border-app-border last:border-0">
                    <td className="p-2 text-app-text">
                      {(p.features as Record<string, string | undefined>)[featureLabelKey(feature.key)] ?? feature.name}
                      <span className="block text-label text-app-text-4" dir="ltr">
                        {feature.key}
                      </span>
                    </td>
                    {PAID_TIERS.map((tier) => {
                      const key = cellKey(feature.key, tier);
                      const level = feature.levels.find((l) => l.tier === tier);
                      return (
                        <td key={tier} className="p-2 align-top">
                          <span className="mb-1 block text-label text-app-text-4">
                            {level?.limit === null ? p.unlimited : count(level?.limit ?? 0, 'en')}
                          </span>
                          <div className="flex gap-1">
                            <Input
                              aria-label={`${feature.key} ${tier} ${p.priceIrt}`}
                              inputMode="numeric"
                              dir="ltr"
                              className="ltr w-28 text-start"
                              value={cells[key]?.irt ?? ''}
                              onChange={(e) => set(key, 'irt', e.target.value.replace(/[^\d]/g, ''))}
                            />
                            <Input
                              aria-label={`${feature.key} ${tier} ${p.priceUsdt}`}
                              inputMode="decimal"
                              dir="ltr"
                              className="ltr w-20 text-start"
                              value={cells[key]?.usdt ?? ''}
                              onChange={(e) => set(key, 'usdt', e.target.value.replace(/[^\d.]/g, ''))}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <Button className="mt-4 w-fit" onClick={() => void onSave()} isLoading={save.isPending}>
        {p.savePrices}
      </Button>
    </Card>
  );
}

function GrantForm() {
  const { t } = useLocale();
  const p = t.plans;
  const { showToast } = useToast();
  const grant = useGrantPlan();
  const [subject, setSubject] = useState<PlanSubject>('USER');
  const [holderId, setHolderId] = useState('');
  const [tier, setTier] = useState<PaidTier>('PRO');
  const [months, setMonths] = useState(6);
  const [note, setNote] = useState('');

  async function onGrant() {
    try {
      await grant.mutateAsync({
        subject,
        tier,
        months,
        note: note.trim() || undefined,
        ...(subject === 'COMPANY' ? { companyId: holderId.trim() } : { userId: holderId.trim() }),
      });
      showToast(p.granted, 'success');
      setHolderId('');
      setNote('');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{p.grantTitle}</CardTitle>
        <CardDescription>{p.grantHint}</CardDescription>
      </CardHeader>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FormField label={p.holder} htmlFor="grant-subject">
          <Select id="grant-subject" value={subject} onChange={(e) => setSubject(e.target.value as PlanSubject)}>
            {PLAN_SUBJECTS.map((value) => (
              <option key={value} value={value}>
                {p.subjects[value]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={subject === 'COMPANY' ? p.grantCompanyId : p.grantUserId} htmlFor="grant-holder">
          <Input id="grant-holder" dir="ltr" className="ltr text-start" value={holderId} onChange={(e) => setHolderId(e.target.value)} />
        </FormField>
        <FormField label={p.wholeTier} htmlFor="grant-tier">
          <Select id="grant-tier" value={tier} onChange={(e) => setTier(e.target.value as PaidTier)}>
            {PAID_TIERS.map((value) => (
              <option key={value} value={value}>
                {p.tiers[value]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={p.months} htmlFor="grant-months">
          <Select id="grant-months" value={String(months)} onChange={(e) => setMonths(Number(e.target.value))}>
            {[1, 3, 6, 12].map((value) => (
              <option key={value} value={value}>
                {fill(p.monthsOption, { count: value })}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={p.note} htmlFor="grant-note">
          <Input id="grant-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
      </div>
      <Button className="mt-4 w-fit" onClick={() => void onGrant()} isLoading={grant.isPending} disabled={!holderId.trim()}>
        {p.grant}
      </Button>
    </Card>
  );
}

function SubscriptionList() {
  const { t, locale } = useLocale();
  const p = t.plans;
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminSubscriptions({ page, search: search.trim() || undefined });
  const cancel = useCancelSubscription();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{p.subscriptionsTitle}</CardTitle>
      </CardHeader>
      <Input
        className="mb-4 max-w-sm"
        placeholder={t.common.search}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        aria-label={t.common.search}
      />
      {isLoading && <Spinner label={t.common.loading} />}
      <ul className="flex flex-col divide-y divide-app-border">
        {data?.items.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-body text-app-text">
                {row.company?.name ?? (row.user ? `${row.user.firstName} ${row.user.lastName}` : '—')}
                <span className="ms-2 text-label text-app-text-4" dir="ltr">
                  {row.user?.email}
                </span>
              </p>
              <p className="text-label text-app-text-4">
                <span dir="ltr">{row.code}</span> · {p.subjects[row.subject]} · {row.tier ? p.tiers[row.tier] : p.custom} ·{' '}
                {fill(p.monthsOption, { count: count(row.months, locale) })} · {p.sources[row.source]}
                {row.source === 'PURCHASE' && ` · ${toman(row.total, locale)} ${p.toman}`}
                {row.endsAt && ` · ${fill(p.activeUntil, { date: formatDate(row.endsAt, locale) })}`}
                {row.note && ` · ${row.note}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'CANCELLED' ? 'danger' : 'default'}>
                {p.statuses[row.status]}
              </Badge>
              {row.status === 'ACTIVE' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void cancel.mutateAsync(row.id).catch((error) => showToast(apiMessage(error, t.common.error), 'error'))
                  }
                >
                  {p.cancelSubscription}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {data && data.total > data.pageSize && (
        <div className="mt-4">
          <Pagination page={page} totalPages={Math.ceil(data.total / data.pageSize)} onPageChange={setPage} />
        </div>
      )}
    </Card>
  );
}
