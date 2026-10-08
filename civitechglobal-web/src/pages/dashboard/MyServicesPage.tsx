import { Link } from 'react-router';
import { Eye, Pause, Pencil, Play, Plus, Send, Trash2 } from 'lucide-react';
import { serviceImagePath, useDeleteService, useOwnServices, useSetServiceState, useSubmitService } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { fill, formatNumber } from '@/lib/jobFormat';
import { moderationVariant } from '@/lib/marketplace';
import { money } from '@/lib/workFormat';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import { Stars } from '@/components/work/WorkUi';
import type { OwnService } from '@/types/work';

/**
 * The seller's services: each with its state, its gauges (views, orders
 * waiting, in progress, rating) and the moves — edit, submit, pause, delete.
 */
export default function MyServicesPage() {
  const { t } = useLocale();
  const { data, isLoading } = useOwnServices();
  useDocumentTitle(t.work.myServicesTitle);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.work.myServicesTitle}
        actions={
          <div className="flex gap-2">
            <Link to="/dashboard/service-orders">
              <Button variant="outline">{t.work.navOrders}</Button>
            </Link>
            <Link to="/dashboard/services/new">
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                {t.work.newService}
              </Button>
            </Link>
          </div>
        }
      />
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && data?.length === 0 && (
        <EmptyState
          title={t.work.myServicesEmpty}
          action={
            <Link to="/dashboard/services/new">
              <Button>{t.work.newService}</Button>
            </Link>
          }
        />
      )}
      <ul className="flex flex-col gap-3">
        {data?.map((service) => (
          <ServiceRow key={service.id} service={service} />
        ))}
      </ul>
    </div>
  );
}

function ServiceRow({ service }: { service: OwnService }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const submit = useSubmitService();
  const setState = useSetServiceState();
  const remove = useDeleteService();
  const basic = service.packages.find((pkg) => pkg.tier === 'BASIC') ?? service.packages[0];
  const live = service.moderationStatus === 'APPROVED';
  const editable = service.moderationStatus !== 'PENDING_REVIEW';
  const number = (value: number) => formatNumber(value, locale);

  async function run(action: Promise<unknown>, message: string) {
    try {
      await action;
      showToast(message, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  const gauges = [
    { label: t.jobs.viewsCount.replace('{count}', '').trim(), value: number(service.viewCount) },
    { label: t.work.orderStatus.REQUESTED, value: number(service.orders?.REQUESTED ?? 0) },
    { label: t.work.orderStatus.ACCEPTED, value: number(service.orders?.ACCEPTED ?? 0) },
    { label: t.work.reviewsTitle, value: number(service.rating?.count ?? 0) },
  ];

  return (
    <li>
      <Card className="flex flex-col gap-3 sm:flex-row">
        <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:w-36">
          {service.images[0] && (
            <StaffImage path={serviceImagePath(service.images[0].id, 'own')} alt="" className="size-full object-cover" fallback={null} />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={moderationVariant(service.moderationStatus)}>
              {live ? t.market.OPEN : service.moderationStatus === 'REJECTED' ? t.market.REJECTED : t.market[service.moderationStatus]}
            </Badge>
            {service.state === 'PAUSED' && <Badge variant="warning">{t.work.paused}</Badge>}
            {service.featured && <Badge variant="warning">{t.work.featured}</Badge>}
            {service.rating && service.rating.count > 0 && <Stars value={service.rating.avg} count={service.rating.count} />}
          </div>
          <h2 className="font-semibold text-text-primary">{service.title}</h2>
          {basic && (
            <p className="text-sm text-text-secondary">
              {t.work.startingAt} {money(basic.price, basic.currency ?? 'IRT', locale, t)} ·{' '}
              {fill(t.work.deliveryIn, { days: number(basic.deliveryDays) })} · {t.work.packages}: {number(service.packages.length)}
            </p>
          )}
          {service.reviewNote && service.moderationStatus !== 'APPROVED' && (
            <p className="rounded-lg bg-brand-amber-50 p-2 text-sm text-brand-amber-900 dark:bg-brand-amber-900/30 dark:text-brand-amber-200">
              <span className="font-medium">{t.market.reviewNote}: </span>
              {service.reviewNote}
            </p>
          )}
          <dl className="grid grid-cols-4 gap-2">
            {gauges.map((gauge) => (
              <div key={gauge.label} className="min-w-0">
                <dt className="app-label truncate">{gauge.label}</dt>
                <dd className="app-readout mt-1 truncate px-2 py-0.5 text-body font-semibold">{gauge.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            {live && (
              <Link to={`/freelance-services/${service.code}`}>
                <Button size="sm" variant="ghost">
                  <Eye className="size-4" aria-hidden="true" />
                  {t.common.view}
                </Button>
              </Link>
            )}
            {editable && (
              <Link to={`/dashboard/services/${service.id}/edit`}>
                <Button size="sm" variant="outline">
                  <Pencil className="size-4" aria-hidden="true" />
                  {t.common.edit}
                </Button>
              </Link>
            )}
            {(service.moderationStatus === 'DRAFT' || service.moderationStatus === 'CHANGES_REQUESTED') && (
              <Button size="sm" onClick={() => void run(submit.mutateAsync(service.id), t.work.serviceSubmitted)}>
                <Send className="size-4" aria-hidden="true" />
                {t.work.submitForReview}
              </Button>
            )}
            {live && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void run(
                    setState.mutateAsync({ id: service.id, state: service.state === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }),
                    t.work.serviceSaved,
                  )
                }
              >
                {service.state === 'ACTIVE' ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                {service.state === 'ACTIVE' ? t.work.pause : t.work.activate}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (window.confirm(t.work.deleteServiceConfirm)) void run(remove.mutateAsync(service.id), t.work.serviceDeleted);
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t.common.delete}
            </Button>
          </div>
        </div>
      </Card>
    </li>
  );
}
