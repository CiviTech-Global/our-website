import { useUploadFeedback } from '@/lib/useUploadFeedback';
import { UploadStatus } from '@/components/ui/UploadStatus';
import { PageHeader } from '@/components/app/PageHeader';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Building2, Plus, Users } from 'lucide-react';
import {
  useAcceptBid,
  useCreateProject,
  useOwnProjects,
  useOwnVerification,
  useProjectBids,
  useSubmitProject,
} from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatMoney, moderationVariant, outcomeVariant, stateVariant } from '@/lib/marketplace';
import { RatingStars } from '@/components/marketplace/RatingStars';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';

/**
 * What a client sees of their own projects, and the offers on them.
 *
 * Offers appear here only once reviewed — which is why the count on a project
 * awaiting review can sit at zero while people are in fact bidding. The sealed
 * hint says so, rather than leaving that to look like indifference.
 */
export default function MyProjectsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.myProjects);
  const { showToast } = useToast();

  const { data: verification } = useOwnVerification();
  const { data: projects, isLoading } = useOwnProjects();
  const create = useCreateProject();
  const submitProject = useSubmitProject();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openBids, setOpenBids] = useState<string | null>(null);

  const isVerified = verification?.status === 'APPROVED';
  const num = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  const [draft, setDraft] = useState({
    title: '',
    description: '',
    category: '',
    budgetMin: '',
    budgetMax: '',
    budgetUnknown: false,
    skills: '',
    deliverBy: '',
    openToCompanyOffer: true,
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const upload = useUploadFeedback('project-attachments');

  const set = (name: keyof typeof draft) => (value: string | boolean) =>
    setDraft((prev) => ({ ...prev, [name]: value }));

  // The event is absent when this is a retry of a failed upload.
  async function handleCreate(event?: FormEvent) {
    event?.preventDefault();
    upload.start(attachments);

    try {
      await create.mutateAsync({
        payload: {
          title: draft.title.trim(),
          description: draft.description.trim(),
          category: draft.category.trim() || undefined,
          budgetUnknown: draft.budgetUnknown,
          budgetMin: draft.budgetUnknown
            ? undefined
            : draft.budgetMin.replace(/[^0-9]/g, '') || undefined,
          budgetMax: draft.budgetUnknown
            ? undefined
            : draft.budgetMax.replace(/[^0-9]/g, '') || undefined,
          deliverBy: draft.deliverBy || undefined,
          openToCompanyOffer: draft.openToCompanyOffer,
          skills: draft.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean),
        },
        attachments,
        onProgress: upload.onProgress,
      });
      upload.done();
      setIsFormOpen(false);
      showToast(t.market.draftCreated, 'success');
    } catch (error) {
      showToast(upload.fail(error).message, 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.market.myProjects}
        description={t.app.memberDescriptions.myProjects}
        className="mb-2"
        actions={
          isVerified && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t.market.newProject}
            </Button>
          )
        }
      />

      {!isVerified && (
        <Card>
          <p className="text-body text-app-text-3">{t.market.verificationRequired}</p>
          <Link to="/dashboard/verification" className="mt-3 inline-block">
            <Button variant="outline">{t.market.goToVerification}</Button>
          </Link>
        </Card>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && isVerified && projects?.length === 0 && (
        <EmptyState title={t.market.noProjects} />
      )}

      <ul className="flex flex-col gap-3">
        {projects?.map((project) => (
          <li key={project.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-app-text">{project.title}</p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    <span className="ltr font-mono">{project.code}</span>
                    {' · '}
                    {formatDate(project.createdAt, locale)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={moderationVariant(project.moderationStatus)}>
                    {t.market[project.moderationStatus]}
                  </Badge>
                  <Badge variant={stateVariant(project.state)}>{t.market[project.state]}</Badge>
                </div>
              </div>

              {project.reviewNote && (
                <div className="mt-3 rounded border border-app-border-light bg-app-fill p-3">
                  <p className="text-label font-medium text-app-text-3">{t.market.reviewNote}</p>
                  <p className="mt-1 text-body text-app-text">{project.reviewNote}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {(project.moderationStatus === 'DRAFT' ||
                  project.moderationStatus === 'CHANGES_REQUESTED') && (
                  <Button
                    size="sm"
                    isLoading={submitProject.isPending}
                    onClick={async () => {
                      try {
                        await submitProject.mutateAsync(project.id);
                        showToast(t.market.sentForReview, 'success');
                      } catch (error) {
                        showToast(apiMessage(error, t.common.error), 'error');
                      }
                    }}
                  >
                    {t.market.submitForReview}
                  </Button>
                )}

                {project.moderationStatus === 'APPROVED' && (
                  <Button size="sm" variant="outline" onClick={() => setOpenBids(project.id)}>
                    <Users className="size-4" aria-hidden="true" />
                    {t.market.bids} ({num(project._count.bids)})
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={t.market.newProject}>
        <form className="flex flex-col gap-4" onSubmit={handleCreate}>
          <FormField label={t.market.title} htmlFor="projectTitle">
            <Input
              id="projectTitle"
              required
              value={draft.title}
              onChange={(e) => set('title')(e.target.value)}
            />
          </FormField>

          <FormField label={t.market.description} htmlFor="projectDescription">
            <TextArea
              id="projectDescription"
              required
              rows={6}
              value={draft.description}
              onChange={(e) => set('description')(e.target.value)}
            />
          </FormField>

          <FormField label={t.market.category} htmlFor="category">
            <Input
              id="category"
              value={draft.category}
              onChange={(e) => set('category')(e.target.value)}
            />
          </FormField>

          <label className="flex items-center gap-2 text-body text-app-text-3">
            <input
              type="checkbox"
              className="size-4 rounded border-app-border"
              checked={draft.budgetUnknown}
              onChange={(e) => set('budgetUnknown')(e.target.checked)}
            />
            {t.market.budgetUnknown}
          </label>

          {!draft.budgetUnknown && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={`${t.market.budget} (${t.market.from})`} htmlFor="budgetMin">
                <Input
                  id="budgetMin"
                  inputMode="numeric"
                  className="ltr"
                  value={draft.budgetMin}
                  onChange={(e) => set('budgetMin')(e.target.value)}
                />
              </FormField>
              <FormField label={`${t.market.budget} (${t.market.to})`} htmlFor="budgetMax">
                <Input
                  id="budgetMax"
                  inputMode="numeric"
                  className="ltr"
                  value={draft.budgetMax}
                  onChange={(e) => set('budgetMax')(e.target.value)}
                />
              </FormField>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t.market.skills} htmlFor="projectSkills" hint="react, figma">
              <Input
                id="projectSkills"
                value={draft.skills}
                onChange={(e) => set('skills')(e.target.value)}
              />
            </FormField>
            <FormField label={t.market.deliverBy} htmlFor="deliverBy">
              <DateField
                id="deliverBy"
                value={draft.deliverBy}
                onChange={(next) => set('deliverBy')(next)}
              />
            </FormField>
          </div>

          <FormField label={t.market.attachments} htmlFor="projectAttachments">
            <Input
              id="projectAttachments"
              type="file"
              multiple
              onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
            />
          </FormField>

          {upload.state.phase !== 'idle' && (
            <UploadStatus state={upload.state} onRetry={() => void handleCreate()} />
          )}

          <label className="flex items-start gap-2 text-body text-app-text-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-app-border"
              checked={draft.openToCompanyOffer}
              onChange={(e) => set('openToCompanyOffer')(e.target.checked)}
            />
            {t.market.openToCompanyOffer}
          </label>

          <p className="text-label text-app-text-4">{t.market.submitWarning}</p>

          <div className="flex gap-2">
            <Button type="submit" isLoading={create.isPending}>
              {t.market.saveDraft}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      </Modal>

      {openBids && <BidsModal projectId={openBids} onClose={() => setOpenBids(null)} />}
    </div>
  );
}

/**
 * The offers on one project.
 *
 * The company's own offer is flagged rather than hidden or promoted: the
 * client should be able to weigh it knowing exactly what it is.
 */
function BidsModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const { data, isLoading } = useProjectBids(projectId);
  const accept = useAcceptBid();
  const [confirming, setConfirming] = useState<string | null>(null);

  async function handleAccept(bidId: string) {
    try {
      await accept.mutateAsync(bidId);
      showToast(t.market.accepted, 'success');
      setConfirming(null);
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.market.bids}>
      <p className="mb-4 text-body text-app-text-4">{t.market.sealedHint}</p>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.length === 0 && <EmptyState title={t.market.noBids} />}

      <ul className="flex flex-col gap-3">
        {data?.map((bid) => (
          <li key={bid.id}>
            <Card className={bid.isCompanyOffer ? 'border-app-primary/40' : undefined}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {bid.isCompanyOffer ? (
                    <p className="flex items-center gap-1.5 font-medium text-app-primary">
                      <Building2 className="size-4" aria-hidden="true" />
                      {t.market.companyOffer}
                    </p>
                  ) : (
                    <p className="font-medium text-app-text">
                      {bid.bidder?.firstName} {bid.bidder?.lastName}
                    </p>
                  )}
                  {!bid.isCompanyOffer && bid.bidderProfile && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-label">
                      <Link
                        to={`/profiles/${bid.bidderProfile.username}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        @{bid.bidderProfile.username}
                      </Link>
                      {bid.bidderProfile.verified && <VerifiedBadge />}
                      <RatingStars
                        avg={bid.bidderProfile.ratingAvg}
                        count={bid.bidderProfile.ratingCount}
                      />
                    </div>
                  )}
                  <p className="mt-0.5 text-body text-app-text-3">
                    {formatMoney(bid.amount, locale)} {t.market.currency}
                    {bid.deliveryDays
                      ? ` · ${locale === 'fa' ? toPersianDigits(bid.deliveryDays) : bid.deliveryDays} ${t.market.deliveryDays}`
                      : ''}
                  </p>
                </div>
                <Badge variant={outcomeVariant(bid.outcome)}>{t.market[bid.outcome]}</Badge>
              </div>

              {bid.isCompanyOffer && (
                <p className="mt-2 text-label text-app-text-4">{t.market.companyOfferHint}</p>
              )}

              <p className="mt-2 whitespace-pre-line text-body text-app-text">{bid.message}</p>

              {!bid.isCompanyOffer && (
                <div className="mt-3">
                  <Link to={`/dashboard/messages/b/${bid.id}`}>
                    <Button size="sm" variant="outline">
                      {t.market.sendMessageCta}
                    </Button>
                  </Link>
                </div>
              )}

              {bid.outcome === 'PENDING' && (
                <div className="mt-3">
                  {confirming === bid.id ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-body text-app-text-3">{t.market.acceptBidConfirm}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          isLoading={accept.isPending}
                          onClick={() => void handleAccept(bid.id)}
                        >
                          {t.market.accept}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                          {t.common.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setConfirming(bid.id)}>
                      {t.market.acceptBid}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
