import { Link } from 'react-router';
import { BellOff, BellRing, Search, Trash2 } from 'lucide-react';
import { useDeleteProjectAlert, useProjectAlerts, useUpdateProjectAlert, useWorkCategories } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { countryName } from '@/lib/geo';
import { categoryName } from '@/lib/jobFormat';
import { languageName, money } from '@/lib/workFormat';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import type { ProjectAlertQuery } from '@/types/work';

/** The board address an alert's search opens at. */
function searchHref(query: ProjectAlertQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('q', query.search);
  for (const key of ['workCategoryId', 'pricingType', 'experienceLevel', 'budgetMin', 'country', 'language'] as const) {
    if (query[key]) params.set(key, query[key]!);
  }
  const text = params.toString();
  return text ? `/projects?${text}` : '/projects';
}

/** The saved project searches that notify, and the switches to pause or drop them. */
export default function ProjectAlertsPage() {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const { data, isLoading } = useProjectAlerts();
  const { data: categories } = useWorkCategories();
  const update = useUpdateProjectAlert();
  const remove = useDeleteProjectAlert();
  useDocumentTitle(t.work.alertsTitle);

  function describe(query: ProjectAlertQuery): string[] {
    const parts: string[] = [];
    if (query.search) parts.push(`“${query.search}”`);
    const category = categories?.find((item) => item.id === query.workCategoryId);
    if (category) parts.push(categoryName(category, locale));
    if (query.pricingType) parts.push(t.work.pricing[query.pricingType]);
    if (query.experienceLevel) parts.push(t.work.experience[query.experienceLevel]);
    if (query.budgetMin) parts.push(`≥ ${money(query.budgetMin, 'IRT', locale, t)}`);
    if (query.country) parts.push(countryName(query.country, locale));
    if (query.language) parts.push(languageName(query.language, locale));
    for (const skill of query.skills ?? []) parts.push(skill);
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
      <PageHeader title={t.work.alertsTitle} description={t.work.alertsIntro} />
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && data?.length === 0 && (
        <EmptyState
          title={t.work.alertsEmpty}
          action={
            <Link to="/projects">
              <Button variant="outline">{t.work.findWork}</Button>
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
                  <p className="flex items-center gap-2 font-medium text-text-primary">
                    {alert.active ? (
                      <BellRing className="size-4 text-brand-green-600" aria-hidden="true" />
                    ) : (
                      <BellOff className="size-4 text-text-tertiary" aria-hidden="true" />
                    )}
                    {alert.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {describe(alert.query).map((part) => (
                      <Badge key={part}>{part}</Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-text-tertiary">
                    {t.jobs.lastNotified}: {alert.lastNotifiedAt ? formatDate(alert.lastNotifiedAt, locale) : t.jobs.never}
                  </p>
                </div>
                <Badge variant={alert.active ? 'success' : 'default'}>{alert.active ? t.jobs.alertActive : t.jobs.alertPaused}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={searchHref(alert.query)}>
                  <Button size="sm" variant="outline">
                    <Search className="size-4" aria-hidden="true" />
                    {t.jobs.openSearch}
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => void run(update.mutateAsync({ id: alert.id, active: !alert.active }))}>
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
    </div>
  );
}
