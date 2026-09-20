import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl } from '@/components/app/SegmentedControl';
import { useState, type FormEvent } from 'react';
import { Building2 } from 'lucide-react';
import { usePlaceCompanyOffer, useProjectQueue, useReviewProject } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate } from '@/i18n/utils';
import { moderationVariant } from '@/lib/marketplace';
import { ReviewActions } from '@/components/marketplace/ReviewActions';
import { ListingOpsPanel } from '@/components/admin/ListingOpsPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type { ModerationStatus } from '@/types/marketplace';

const PAGE_SIZE = 20;
const STATUSES: ModerationStatus[] = [
  'PENDING_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
];

/**
 * The project queue, and the one place the company can bid on a client's work.
 *
 * The offer is only offered on an approved project: bidding on something not
 * yet published would mean the company saw the work before anybody else could.
 * It then goes through review like any other bid.
 */
export default function ProjectQueuePage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.queueProjects);

  const controls = useListControls({
    pageSize: PAGE_SIZE,
    filters: { status: 'PENDING_REVIEW' },
  });
  const [offerFor, setOfferFor] = useState<string | null>(null);

  const { data, isLoading } = useProjectQueue({
    page: controls.page,
    pageSize: PAGE_SIZE,
    status: controls.filters.status,
    search: controls.search || undefined,
  });
  const review = useReviewProject();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.market.queueProjects} description={t.app.queueDescriptions.freelanceProjects} className="mb-2" />
      <ListToolbar
        controls={controls}
        searchPlaceholder={t.market.searchQueueProjects}
        total={data?.total}
        isLoading={isLoading}
        filters={
          <SegmentedControl<ModerationStatus>
            label={t.app.filterByStatus}
            value={controls.filters.status as ModerationStatus}
            segments={STATUSES.map((value) => ({ value, label: t.market[value] }))}
            onChange={(value) => controls.setFilter('status', value)}
          />
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          title={controls.activeCount > 0 ? t.list.noResults : t.market.emptyQueue}
          description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
        />
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((row) => (
          <li key={row.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-app-text">{row.title}</p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    {row.companyName && `${row.companyName} · `}
                    <span className="ltr font-mono">{row.code}</span>
                    {row.submittedAt && ` · ${formatDate(row.submittedAt, locale)}`}
                  </p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    {t.market.submittedBy}: {row.author.firstName} {row.author.lastName}{' '}
                    <span className="ltr">({row.author.email})</span>
                  </p>
                </div>
                <Badge variant={moderationVariant(row.moderationStatus)}>
                  {t.market[row.moderationStatus]}
                </Badge>
              </div>

              <div className="mt-3">
                <ListingOpsPanel kind="project" id={row.id} featured={row.featured} />
              </div>

              {row.moderationStatus === 'APPROVED' ? (
                <div className="mt-4">
                  <Button size="sm" variant="outline" onClick={() => setOfferFor(row.id)}>
                    <Building2 className="size-4" aria-hidden="true" />
                    {t.market.placeCompanyOffer}
                  </Button>
                </div>
              ) : (
                <ReviewActions
                  isPending={review.isPending}
                  onReview={(input) => review.mutateAsync({ id: row.id, ...input })}
                />
              )}
            </Card>
          </li>
        ))}
      </ul>

      {data && data.totalPages > 1 && (
        <Pagination
          page={controls.page}
          totalPages={data.totalPages}
          onPageChange={controls.setPage}
        />
      )}

      {offerFor && <CompanyOfferModal projectId={offerFor} onClose={() => setOfferFor(null)} />}
    </div>
  );
}

function CompanyOfferModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const offer = usePlaceCompanyOffer();

  const [amount, setAmount] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await offer.mutateAsync({
        projectId,
        payload: {
          amount: amount.replace(/[^0-9]/g, ''),
          deliveryDays: deliveryDays ? Number(deliveryDays) : undefined,
          message: message.trim(),
        },
      });
      showToast(t.market.companyOfferPlaced, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.market.placeCompanyOffer}>
      <p className="mb-4 text-body text-app-text-4">{t.market.companyOfferHint}</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={`${t.market.amount} (${t.market.currency})`} htmlFor="offerAmount">
            <Input
              id="offerAmount"
              required
              inputMode="numeric"
              className="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormField>
          <FormField label={t.market.deliveryDays} htmlFor="offerDeliveryDays">
            <Input
              id="offerDeliveryDays"
              type="number"
              min={1}
              className="ltr"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label={t.market.bidMessage} htmlFor="offerMessage">
          <TextArea
            id="offerMessage"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </FormField>

        <div className="flex gap-2">
          <Button type="submit" isLoading={offer.isPending}>
            {t.market.placeCompanyOffer}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
