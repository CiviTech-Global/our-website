import { Link } from 'react-router';
import { BellOff, BellRing, Search, Trash2 } from 'lucide-react';
import { useDeleteJobAlert, useJobAlerts, useJobCategories, useUpdateJobAlert } from '@/api/jobs';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { formatDate } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { displayProvince } from '@/lib/iranProvinces';
import { countryName } from '@/lib/geo';
import { categoryName, formatNumber } from '@/lib/jobFormat';
import { formatMoney } from '@/lib/marketplace';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import type { AlertQuery, JobSeniority } from '@/types/jobs';
import type { JobEmploymentType, JobWorkArrangement } from '@/types/marketplace';

/** The board address an alert's search opens at, so its owner can see what it matches. */
function searchHref(query: AlertQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('q', query.search);
  for (const key of ['country', 'province', 'jobCategoryId', 'employmentType', 'workArrangement', 'seniority', 'salaryMin'] as const) {
    if (query[key]) params.set(key, query[key]!);
  }
  const text = params.toString();
  return text ? `/jobs?${text}` : '/jobs';
}

/** The saved searches that notify, and the switches to pause or drop them. */
export default function JobAlertsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.jobs.alertsTitle);
  const { showToast } = useToast();
  const { data, isLoading } = useJobAlerts();
  const { data: categories } = useJobCategories();
  const update = useUpdateJobAlert();
  const remove = useDeleteJobAlert();

  /** The filters an alert runs, in words. */
  function describe(query: AlertQuery): string[] {
    const parts: string[] = [];
    if (query.search) parts.push(`“${query.search}”`);
    if (query.jobCategoryId) {
      const category = categories?.find((item) => item.id === query.jobCategoryId);
      if (category) parts.push(categoryName(category, locale));
    }
    if (query.country) parts.push(countryName(query.country, locale));
    if (query.province) parts.push(displayProvince(query.province, locale));
    if (query.employmentType) parts.push(t.market[query.employmentType as JobEmploymentType]);
    if (query.workArrangement) parts.push(t.market[query.workArrangement as JobWorkArrangement]);
    if (query.seniority) parts.push(t.jobs.seniorityLevels[query.seniority as JobSeniority]);
    if (query.salaryMin) parts.push(`≥ ${formatMoney(query.salaryMin, locale)} ${t.market.currency}`);
    return parts;
  }

  async function run(action: Promise<unknown>) {
    try {
      await action;
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.jobs.alertsTitle} description={t.jobs.alertsIntro} className="mb-2" />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.length === 0 && (
        <EmptyState
          title={t.jobs.alertsEmpty}
          action={
            <Link to="/jobs">
              <Button variant="outline">{t.market.jobsTitle}</Button>
            </Link>
          }
        />
      )}

      <ul className="flex flex-col gap-3">
        {data?.map((alert) => (
          <li key={alert.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-app-text">
                    {alert.active ? (
                      <BellRing className="size-4 text-brand-green-600" aria-hidden="true" />
                    ) : (
                      <BellOff className="size-4 text-app-text-4" aria-hidden="true" />
                    )}
                    {alert.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {describe(alert.query).map((part) => (
                      <Badge key={part}>{part}</Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-label text-app-text-4">
                    {t.jobs.lastNotified}:{' '}
                    {alert.lastNotifiedAt ? formatDate(alert.lastNotifiedAt, locale) : t.jobs.never}
                  </p>
                </div>
                <Badge variant={alert.active ? 'success' : 'default'}>
                  {alert.active ? t.jobs.alertActive : t.jobs.alertPaused}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={searchHref(alert.query)}>
                  <Button size="sm" variant="outline">
                    <Search className="size-4" aria-hidden="true" />
                    {t.jobs.openSearch}
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void run(update.mutateAsync({ id: alert.id, active: !alert.active }))}
                >
                  {alert.active ? t.jobs.pause : t.jobs.resume}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void run(remove.mutateAsync(alert.id))}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t.jobs.delete}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {data && data.length > 0 && (
        <p className="text-label text-app-text-4">{formatNumber(data.length, locale)} / 20</p>
      )}
    </div>
  );
}
