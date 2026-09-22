import { apiMessage } from '@/lib/apiMessage';
import { useUploadFeedback } from '@/lib/useUploadFeedback';
import { UploadStatus } from '@/components/ui/UploadStatus';
import { PageHeader } from '@/components/app/PageHeader';
import { useState, type FormEvent } from 'react';
import type { Locale } from '@/i18n/locales';
import { Link } from 'react-router';
import { AlertTriangle, CheckCircle2, Flag, Plus } from 'lucide-react';
import {
  useAddMilestone,
  useApproveMilestone,
  useCompleteAward,
  useDeliverMilestone,
  useMyAwards,
  useOpenDispute,
} from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useClientList } from '@/lib/clientList';
import { useListControls } from '@/lib/useListControls';
import { formatMoney } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { MilestoneTimeline } from '@/components/marketplace/MilestoneTimeline';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { ReviewForm } from '@/components/marketplace/ReviewForm';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import type { AwardView } from '@/types/marketplace';

/**
 * The collaborations the account is part of, on either side of the deal.
 *
 * One card per award: what it is, who the other side is, the milestone plan
 * with its current state, and the actions the viewer's role can take. The
 * page deliberately shows both roles in one list — a person who hires and
 * also freelances should see one honest inbox, not two half-inboxes.
 */
export default function MyAwardsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.myAwards);

  const { data, isLoading } = useMyAwards();

  const controls = useListControls({ pageSize: Number.MAX_SAFE_INTEGER, filters: { role: '' } });
  const shown = useClientList(data, controls, {
    searchFields: (view) => [view.listing.title, view.listing.code, view.counterpartyProfile?.username],
    // Work somebody was given and work they gave out are two different lists
    // that happen to share a table.
    filters: { role: (view, value) => view.myRole === value },
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.market.myAwards} description={t.app.memberDescriptions.myAwards} className="mb-2" />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {(data?.length ?? 0) > 0 && (
        <ListToolbar
          controls={controls}
          searchPlaceholder={t.market.searchAwards}
          total={shown.total}
          isLoading={isLoading}
          filters={
            <Select
              className="w-48"
              value={controls.filters.role}
              aria-label={t.market.filterAwardRole}
              onChange={(e) => controls.setFilter('role', e.target.value)}
            >
              <option value="">{t.list.allOption}</option>
              <option value="author">{t.market.awardsIGave}</option>
              <option value="counterparty">{t.market.awardsIReceived}</option>
            </Select>
          }
        />
      )}

      {!isLoading && data?.length === 0 && <EmptyState title={t.market.awardsEmpty} />}

      {!isLoading && shown.total === 0 && (data?.length ?? 0) > 0 && (
        <EmptyState title={t.list.noResults} description={t.list.noResultsBody} />
      )}

      {shown.items.map((award) => (
        <AwardCard key={award.award.id} award={award} locale={locale} />
      ))}
    </div>
  );
}

function AwardCard({ award, locale }: { award: AwardView; locale: Locale }) {
  const { t } = useLocale();
  const active = award.award.status === 'ACTIVE';
  const listPath = award.kind === 'job' ? '/jobs' : '/projects';

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`${listPath}/${award.listing.code}`}
              className="text-title-sm font-semibold text-app-text hover:underline"
            >
              {award.listing.title}
            </Link>
            <Badge variant="info">{award.kind === 'job' ? t.market.awardKindJob : t.market.awardKindProject}</Badge>
            <Badge
              variant={
                award.award.status === 'COMPLETED'
                  ? 'success'
                  : award.award.disputeStatus === 'OPEN'
                    ? 'danger'
                    : 'default'
              }
            >
              {award.award.disputeStatus === 'OPEN'
                ? t.market.disputeOpenBadge
                : t.market[`award${award.award.status}` as 'awardActive']}
            </Badge>
          </div>
          <p className="mt-1 text-body text-app-text-3">
            {award.myRole === 'author' ? t.market.awardRoleAuthor : t.market.awardRoleCounterparty}
            {award.award.agreedAmount && (
              <>
                {' · '}
                {t.market.agreedAmountLabel}: {formatMoney(award.award.agreedAmount, locale)} {award.award.currency}
              </>
            )}
          </p>
          {award.counterpartyProfile && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-body">
              <Link
                to={`/profiles/${award.counterpartyProfile.username}`}
                className="font-medium text-brand-600 hover:underline"
              >
                @{award.counterpartyProfile.username}
              </Link>
              {award.counterpartyProfile.verified && <VerifiedBadge />}
              <RatingStars
                avg={award.counterpartyProfile.ratingAvg}
                count={award.counterpartyProfile.ratingCount}
              />
            </div>
          )}
        </div>
        {active && <DisputeButton awardId={award.award.id} />}
      </div>

      {award.award.disputeStatus === 'OPEN' && (
        <div className="flex items-start gap-2 rounded border border-status-error-border bg-status-error-bg p-3 text-body text-status-error">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{t.market.disputeOpenBadge}</p>
            {award.award.disputeReason && <p>{award.award.disputeReason}</p>}
          </div>
        </div>
      )}

      {award.milestones.length > 0 && (
        <div>
          <h2 className="mb-3 text-body font-medium text-app-text-3">{t.market.milestones}</h2>
          <MilestoneTimeline milestones={award.milestones} />
        </div>
      )}

      {active && <AwardActions award={award} />}

      {award.award.status === 'COMPLETED' && !award.myReview && (
        <div className="rounded border border-app-border-light p-4">
          <h2 className="mb-3 text-body font-medium text-app-text-3">{t.market.reviewAward}</h2>
          <ReviewForm awardId={award.award.id} />
        </div>
      )}

      {award.myReview && (
        <p className="flex items-center gap-2 text-body text-app-text-3">
          <CheckCircle2 className="size-4 text-app-primary" aria-hidden />
          {t.market.reviewSubmitted}
        </p>
      )}
      {award.theirReview && (
        <p className="flex items-center gap-2 text-body text-app-text-3">
          {t.market.theirRating}: <RatingStars avg={award.theirReview.rating} count={0} />
        </p>
      )}
    </Card>
  );
}

/** The role-dependent action block: plan (author), deliver (doer), complete. */
function AwardActions({ award }: { award: AwardView }) {
  const { t } = useLocale();
  const deliver = useDeliverMilestone();
  const approve = useApproveMilestone();
  const complete = useCompleteAward();
  const addMilestone = useAddMilestone();
  const { showToast } = useToast();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const upload = useUploadFeedback('milestone-delivery');
  const [confirmingComplete, setConfirmingComplete] = useState(false);

  const isAuthor = award.myRole === 'author';
  const allApproved =
    award.milestones.length > 0 && award.milestones.every((m) => m.status === 'APPROVED');

  async function handleAddMilestone(event: FormEvent) {
    event.preventDefault();
    try {
      await addMilestone.mutateAsync({
        awardId: award.award.id,
        title: title.trim(),
        dueDate: dueDate || undefined,
      });
      setAdding(false);
      setTitle('');
      setDueDate('');
      showToast(t.market.milestoneAdded, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function handleDeliver(milestoneId: string) {
    upload.start(attachment);

    try {
      await deliver.mutateAsync({
        milestoneId,
        deliveryNote: deliveryNote.trim(),
        attachment,
        onProgress: upload.onProgress,
      });
      upload.done();
      setDeliveringId(null);
      setDeliveryNote('');
      setAttachment(null);
      showToast(t.market.milestoneDelivered, 'success');
    } catch (error) {
      showToast(upload.fail(error).message, 'error');
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-app-border-light pt-3">
      {!isAuthor &&
        award.milestones
          .filter((m) => m.status === 'PENDING')
          .map((milestone) =>
            deliveringId === milestone.id ? (
              <div key={milestone.id} className="flex flex-col gap-2 rounded bg-app-subtle p-3">
                <FormField label={t.market.deliveryNoteLabel} htmlFor={`note-${milestone.id}`}>
                  <TextArea
                    id={`note-${milestone.id}`}
                    rows={3}
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                  />
                </FormField>
                <FormField label={t.market.deliveryAttachment} htmlFor={`file-${milestone.id}`}>
                  <Input
                    id={`file-${milestone.id}`}
                    type="file"
                    onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  />
                </FormField>

                {upload.state.phase !== 'idle' && (
                  <UploadStatus
                    state={upload.state}
                    onRetry={() => void handleDeliver(milestone.id)}
                  />
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    isLoading={deliver.isPending}
                    disabled={!deliveryNote.trim()}
                    onClick={() => handleDeliver(milestone.id)}
                  >
                    {t.market.deliverSubmit}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeliveringId(null)}>
                    {t.common.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <Button key={milestone.id} size="sm" variant="outline" className="w-fit" onClick={() => setDeliveringId(milestone.id)}>
                {t.market.deliverMilestone}: {milestone.title}
              </Button>
            ),
          )}

      {isAuthor &&
        award.milestones
          .filter((m) => m.status === 'IN_REVIEW')
          .map((milestone) => (
            <Button
              key={milestone.id}
              size="sm"
              className="w-fit"
              isLoading={approve.isPending}
              onClick={async () => {
                try {
                  await approve.mutateAsync(milestone.id);
                  showToast(t.market.milestoneApproved, 'success');
                } catch (error) {
                  showToast(apiMessage(error, t.common.error), 'error');
                }
              }}
            >
              {t.market.approveMilestone}: {milestone.title}
            </Button>
          ))}

      {isAuthor &&
        (adding ? (
          <form onSubmit={handleAddMilestone} className="flex flex-col gap-2 rounded bg-app-subtle p-3">
            <FormField label={t.market.milestoneTitle} htmlFor="milestoneTitle">
              <Input id="milestoneTitle" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </FormField>
            <FormField label={t.market.milestoneDue} htmlFor="milestoneDue">
              <Input id="milestoneDue" type="date" dir="ltr" className="ltr" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>
            <div className="flex gap-2">
              <Button type="submit" size="sm" isLoading={addMilestone.isPending} disabled={!title.trim()}>
                {t.market.addMilestone}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>
                {t.common.cancel}
              </Button>
            </div>
          </form>
        ) : (
          <Button size="sm" variant="outline" className="w-fit" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            {t.market.addMilestone}
          </Button>
        ))}

      {(allApproved || award.milestones.length === 0) && (
        confirmingComplete ? (
          <div className="flex flex-col gap-2 rounded bg-app-subtle p-3">
            <p className="text-body text-app-text-3">{t.market.completeAwardConfirm}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                isLoading={complete.isPending}
                onClick={async () => {
                  try {
                    await complete.mutateAsync(award.award.id);
                    showToast(t.market.awardCompletedToast, 'success');
                  } catch (error) {
                    showToast(apiMessage(error, t.common.error), 'error');
                  }
                }}
              >
                {t.market.completeAward}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmingComplete(false)}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" className="w-fit" onClick={() => setConfirmingComplete(true)}>
            <CheckCircle2 className="size-4" aria-hidden />
            {t.market.completeAward}
          </Button>
        )
      )}
    </div>
  );
}

/** Opens a dispute with a required reason, behind one confirm step. */
function DisputeButton({ awardId }: { awardId: string }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const openDispute = useOpenDispute();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="w-fit" onClick={() => setOpen(true)}>
        <Flag className="size-4" aria-hidden />
        {t.market.openDispute}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded bg-app-subtle p-3 sm:w-auto">
      <p className="text-body text-app-text-4">{t.market.disputeConfirm}</p>
      <TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-label={t.market.disputeReasonLabel} />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          isLoading={openDispute.isPending}
          disabled={reason.trim().length < 10}
          onClick={async () => {
            try {
              await openDispute.mutateAsync({ awardId, reason: reason.trim() });
              showToast(t.market.disputeOpenedToast, 'success');
            } catch (error) {
              showToast(apiMessage(error, t.common.error), 'error');
            }
          }}
        >
          {t.market.openDispute}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
