import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Eye, FileLock2, GitCompare, MessageSquare, Paperclip, Star, UserCheck, UserPlus, XCircle } from 'lucide-react';
import { useAcceptBidV2, useNdaSignatures, useProjectInbox, useProjectInvites, useSetBidNote, useSetBidStage } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { fill, formatNumber } from '@/lib/jobFormat';
import { agoText, amountText, money, percent } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FilePreview } from '@/components/ui/FilePreview';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { InviteModal } from '@/components/work/InviteModal';
import { FreelancerFacts, LevelBadge } from '@/components/work/WorkUi';
import type { InboxBid, OwnProjectV2 } from '@/types/work';

type Stage = 'ALL' | 'PENDING' | 'SHORTLISTED' | 'INTERVIEW' | 'ACCEPTED' | 'DECLINED';
type Sort = 'best' | 'lowest' | 'fastest' | 'newest';
const STAGES: Stage[] = ['ALL', 'PENDING', 'SHORTLISTED', 'INTERVIEW', 'ACCEPTED', 'DECLINED'];

/**
 * One project's proposals, as its client works through them.
 *
 * Stage tabs with counts, sorting, each proposal with the freelancer's earned
 * record, the plan and the answers, a private note, and the moves — shortlist,
 * interview, decline, hire. Up to three can be compared side by side, and
 * freelancers invited from here. Invitations sent and NDA signatures follow.
 */
export function ProposalInbox({ project }: { project: OwnProjectV2 }) {
  const { t, locale } = useLocale();
  const { data: bids, isLoading } = useProjectInbox(project.id);
  const { data: invites } = useProjectInvites(project.id);
  const { data: signatures } = useNdaSignatures(project.id, Boolean(project.nda));
  const [stage, setStage] = useState<Stage>('ALL');
  const [sort, setSort] = useState<Sort>('best');
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const number = (value: number) => formatNumber(value, locale);

  const inStage = (bid: InboxBid, value: Stage) => (value === 'ALL' ? bid.outcome !== 'WITHDRAWN' : bid.outcome === value);

  const shown = useMemo(() => {
    const rows = (bids ?? []).filter((bid) => inStage(bid, stage));
    // "Best match": the operator's offer first, then invited people, then the earned record.
    const score = (bid: InboxBid) =>
      (bid.isCompanyOffer ? 100 : 0) +
      (bid.invited ? 5 : 0) +
      (bid.bidderStats?.ratingAvg ?? 0) * 2 +
      (bid.bidderStats?.jobSuccess ?? 0) / 20 +
      (bid.bidderStats?.completed ?? 0) / 5;
    return [...rows].sort((a, b) => {
      if (sort === 'lowest') return BigInt(a.amount) < BigInt(b.amount) ? -1 : BigInt(a.amount) > BigInt(b.amount) ? 1 : 0;
      if (sort === 'fastest') return (a.deliveryDays ?? 9999) - (b.deliveryDays ?? 9999);
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return score(b) - score(a);
    });
  }, [bids, stage, sort]);

  return (
    <div className="flex flex-col gap-4 border-t border-border-default pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t.work.stageLabel}>
          {STAGES.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={stage === value}
              onClick={() => setStage(value)}
              className={cn(
                'rounded-full px-3 py-1 text-sm',
                stage === value ? 'bg-text-primary text-surface-default' : 'bg-surface-muted text-text-secondary',
              )}
            >
              {value === 'ALL' ? t.work.allStages : t.work.bidStage[value]} ({number((bids ?? []).filter((bid) => inStage(bid, value)).length)})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-44" aria-label={t.work.sortProposals} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="best">{t.work.sortBest}</option>
            <option value="lowest">{t.work.sortLowest}</option>
            <option value="fastest">{t.work.sortFastest}</option>
            <option value="newest">{t.work.sortNewest}</option>
          </Select>
          <Button size="sm" variant="outline" disabled={compare.length < 2} onClick={() => setComparing(true)}>
            <GitCompare className="size-4" aria-hidden="true" />
            {t.work.compare} ({number(compare.length)})
          </Button>
          {project.state === 'OPEN' && (
            <Button size="sm" variant="outline" onClick={() => setInviting(true)}>
              <UserPlus className="size-4" aria-hidden="true" />
              {t.work.inviteFreelancers}
            </Button>
          )}
        </div>
      </div>

      {isLoading && <Spinner label={t.common.loading} />}
      {!isLoading && shown.length === 0 && <p className="text-sm text-text-tertiary">{t.work.inboxEmpty}</p>}

      <ul className="flex flex-col gap-3">
        {shown.map((bid) => (
          <BidRow
            key={bid.id}
            bid={bid}
            project={project}
            selected={compare.includes(bid.id)}
            onSelect={(on) => setCompare(on ? [...compare, bid.id].slice(-3) : compare.filter((id) => id !== bid.id))}
          />
        ))}
      </ul>

      {(invites?.length ?? 0) > 0 && (
        <section aria-label={t.work.invitesTitle}>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">{t.work.invitesTitle}</h3>
          <ul className="flex flex-col gap-2">
            {invites!.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted p-3 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  {invite.profile?.username ? (
                    <Link to={`/profiles/${invite.profile.username}`} className="font-medium text-text-primary hover:underline">
                      @{invite.profile.username}
                    </Link>
                  ) : (
                    '—'
                  )}
                  {invite.stats && <LevelBadge level={invite.stats.level} />}
                </span>
                <span className="flex items-center gap-2 text-text-tertiary">
                  <Badge variant={invite.status === 'ACCEPTED' ? 'success' : invite.status === 'DECLINED' ? 'danger' : 'default'}>
                    {t.work.inviteStatus[invite.status]}
                  </Badge>
                  {agoText(invite.createdAt, locale, t)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {project.nda && (signatures?.length ?? 0) > 0 && (
        <section aria-label={t.work.ndaSignatures}>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <FileLock2 className="size-4" aria-hidden="true" />
            {t.work.ndaSignatures}
          </h3>
          <ul className="flex flex-col gap-1 text-sm text-text-secondary">
            {signatures!.map((signature) => (
              <li key={`${signature.signedName}-${signature.signedAt}`}>
                {signature.signedName}
                {signature.user.username && <span className="text-text-tertiary"> (@{signature.user.username})</span>} ·{' '}
                {formatDate(signature.signedAt, locale)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {comparing && (
        <CompareModal bids={(bids ?? []).filter((bid) => compare.includes(bid.id))} project={project} onClose={() => setComparing(false)} />
      )}
      {inviting && <InviteModal projectId={project.id} onClose={() => setInviting(false)} />}
    </div>
  );
}

function bidderName(bid: InboxBid, companyOffer: string): string {
  if (bid.isCompanyOffer) return companyOffer;
  return bid.bidder ? `${bid.bidder.firstName} ${bid.bidder.lastName}` : '—';
}

/** One proposal, with every move the client can make on it. */
function BidRow({
  bid,
  project,
  selected,
  onSelect,
}: {
  bid: InboxBid;
  project: OwnProjectV2;
  selected: boolean;
  onSelect: (selected: boolean) => void;
}) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const stage = useSetBidStage();
  const accept = useAcceptBidV2();
  const [expanded, setExpanded] = useState(!bid.clientSeenAt);
  const [preview, setPreview] = useState(false);
  const name = bidderName(bid, t.work.companyOffer);
  const decided = bid.outcome === 'ACCEPTED' || bid.outcome === 'WITHDRAWN';
  const open = project.state === 'OPEN';

  async function move(outcome: 'PENDING' | 'SHORTLISTED' | 'INTERVIEW' | 'DECLINED') {
    try {
      await stage.mutateAsync({ bidId: bid.id, outcome });
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function hire() {
    if (!window.confirm(fill(t.work.hireConfirm, { name }))) return;
    try {
      await accept.mutateAsync(bid.id);
      showToast(t.work.hiredToast, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <li
      className={cn(
        'rounded-xl border p-4',
        bid.isCompanyOffer ? 'border-brand-green-300 bg-brand-green-50/40 dark:bg-brand-green-900/10' : 'border-border-default',
        !bid.clientSeenAt && 'ring-1 ring-brand-amber-300',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-border-default"
            checked={selected}
            aria-label={`${t.work.compare}: ${name}`}
            onChange={(e) => onSelect(e.target.checked)}
          />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold text-text-primary">
              {bid.bidderProfile?.username ? (
                <Link to={`/profiles/${bid.bidderProfile.username}`} className="hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
              {bid.invited && <Badge variant="info">{t.work.invitedBadge}</Badge>}
              <Badge variant={bid.outcome === 'ACCEPTED' ? 'success' : bid.outcome === 'DECLINED' ? 'danger' : 'default'}>
                {t.work.bidStage[bid.outcome]}
              </Badge>
            </p>
            {bid.bidderProfile?.headline && <p className="text-sm text-text-secondary">{bid.bidderProfile.headline}</p>}
            {bid.bidderStats && <FreelancerFacts stats={bid.bidderStats} className="mt-1" />}
          </div>
        </div>
        <div className="text-end">
          <p className="text-lg font-semibold text-text-primary">{amountText(bid.amount, bid.currency, project.pricingType, locale, t)}</p>
          {bid.deliveryDays !== null && (
            <p className="text-sm text-text-secondary">{fill(t.work.daysCount, { count: formatNumber(bid.deliveryDays, locale) })}</p>
          )}
          <p className="text-xs text-text-tertiary">{agoText(bid.createdAt, locale, t)}</p>
        </div>
      </div>

      <p className={cn('mt-3 whitespace-pre-line text-sm text-text-secondary', !expanded && 'line-clamp-3')}>{bid.message}</p>
      <button type="button" className="mt-1 text-xs text-brand-green-600 hover:underline" onClick={() => setExpanded(!expanded)}>
        {expanded ? t.work.hideDetails : t.work.showDetails}
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3">
          {bid.milestones && bid.milestones.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-text-primary">{t.work.proposedPlan}</p>
              <ol className="flex flex-col gap-1 text-sm">
                {bid.milestones.map((step, index) => (
                  <li key={index} className="flex justify-between gap-2 rounded-lg bg-surface-muted px-3 py-1.5">
                    <span className="text-text-secondary">
                      {formatNumber(index + 1, locale)}. {step.title}
                    </span>
                    <span className="text-text-primary">
                      {money(step.amount, bid.currency, locale, t)} · {fill(t.work.daysCount, { count: formatNumber(step.days, locale) })}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {project.screeningQuestions.length > 0 && bid.screeningAnswers.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-text-primary">{t.work.answers}</p>
              <dl className="flex flex-col gap-2 text-sm">
                {project.screeningQuestions.map((question, index) => (
                  <div key={question}>
                    <dt className="text-text-tertiary">{question}</dt>
                    <dd className="whitespace-pre-line text-text-secondary">{bid.screeningAnswers[index] ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {bid.attachmentOriginalName && (
            <button
              type="button"
              onClick={() => setPreview(true)}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-muted"
            >
              <Paperclip className="size-4" aria-hidden="true" />
              {bid.attachmentOriginalName}
            </button>
          )}
          {!bid.isCompanyOffer && <ClientNote bidId={bid.id} initial={bid.clientNote ?? ''} />}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border-default pt-3">
        {!decided && open && (
          <>
            {bid.outcome !== 'SHORTLISTED' && bid.outcome !== 'DECLINED' && (
              <Button size="sm" variant="outline" disabled={stage.isPending} onClick={() => void move('SHORTLISTED')}>
                <Star className="size-4" aria-hidden="true" />
                {t.work.shortlist}
              </Button>
            )}
            {bid.outcome !== 'INTERVIEW' && bid.outcome !== 'DECLINED' && (
              <Button size="sm" variant="outline" disabled={stage.isPending} onClick={() => void move('INTERVIEW')}>
                <MessageSquare className="size-4" aria-hidden="true" />
                {t.work.interview}
              </Button>
            )}
            {bid.outcome === 'DECLINED' ? (
              <Button size="sm" variant="ghost" onClick={() => void move('PENDING')}>
                {t.work.restore}
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => void move('DECLINED')}>
                  <XCircle className="size-4" aria-hidden="true" />
                  {t.work.decline}
                </Button>
                <Button size="sm" isLoading={accept.isPending} onClick={() => void hire()}>
                  <UserCheck className="size-4" aria-hidden="true" />
                  {t.work.hire}
                </Button>
              </>
            )}
          </>
        )}
        {!bid.isCompanyOffer && (
          <Link to={`/dashboard/messages/b/${bid.id}`}>
            <Button size="sm" variant="ghost">
              <MessageSquare className="size-4" aria-hidden="true" />
              {t.market.messagesNav}
            </Button>
          </Link>
        )}
        {bid.outcome === 'ACCEPTED' && (
          <Link to="/dashboard/awards">
            <Button size="sm" variant="ghost">
              <Eye className="size-4" aria-hidden="true" />
              {t.work.openContract}
            </Button>
          </Link>
        )}
      </div>

      {preview && bid.attachmentOriginalName && (
        <FilePreview url={`/work/me/bids/${bid.id}/attachment`} filename={bid.attachmentOriginalName} onClose={() => setPreview(false)} />
      )}
    </li>
  );
}

/** The client's private note on a proposal, saved when they leave the box. */
function ClientNote({ bidId, initial }: { bidId: string; initial: string }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const save = useSetBidNote();
  const [note, setNote] = useState(initial);
  useEffect(() => setNote(initial), [initial]);
  return (
    <div>
      <label htmlFor={`note-${bidId}`} className="mb-1 block text-sm font-medium text-text-primary">
        {t.work.privateNote}
      </label>
      <TextArea
        id={`note-${bidId}`}
        rows={2}
        maxLength={2000}
        placeholder={t.work.privateNoteHint}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (note === initial) return;
          save.mutate(
            { bidId, note: note.trim() || null },
            {
              onSuccess: () => showToast(t.work.noteSaved, 'success'),
              onError: (error) => showToast(apiMessage(error, t.common.error), 'error'),
            },
          );
        }}
      />
    </div>
  );
}

/** Up to three proposals side by side: price, time, record, plan, stage. */
function CompareModal({ bids, project, onClose }: { bids: InboxBid[]; project: OwnProjectV2; onClose: () => void }) {
  const { t, locale } = useLocale();
  const rows: Array<[string, (bid: InboxBid) => string]> = [
    [project.pricingType === 'HOURLY' ? t.work.bidAmountHourly : t.work.bidAmountFixed, (bid) => amountText(bid.amount, bid.currency, project.pricingType, locale, t)],
    [t.work.deliveryDays, (bid) => (bid.deliveryDays === null ? '—' : formatNumber(bid.deliveryDays, locale))],
    [t.work.levelAtLeast, (bid) => (bid.bidderStats ? t.work.levels[bid.bidderStats.level] : '—')],
    [
      t.work.clientRating,
      (bid) =>
        bid.bidderStats?.ratingCount
          ? `${formatNumber(Math.round(bid.bidderStats.ratingAvg * 10) / 10, locale)} (${formatNumber(bid.bidderStats.ratingCount, locale)})`
          : '—',
    ],
    [t.work.jobSuccess, (bid) => percent(bid.bidderStats?.jobSuccess, locale)],
    [t.work.onTime, (bid) => percent(bid.bidderStats?.onTime, locale)],
    [t.work.completedContracts.replace('{count}', '').trim(), (bid) => formatNumber(bid.bidderStats?.completed ?? 0, locale)],
    [t.work.proposedPlan, (bid) => (bid.milestones?.length ? formatNumber(bid.milestones.length, locale) : '—')],
    [t.work.stageLabel, (bid) => t.work.bidStage[bid.outcome]],
  ];
  return (
    <Modal isOpen onClose={onClose} title={t.work.compareTitle}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-border-default p-2" />
              {bids.map((bid) => (
                <th key={bid.id} className="border border-border-default p-2 text-start font-semibold text-text-primary">
                  {bidderName(bid, t.work.companyOffer)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td className="border border-border-default p-2 text-text-secondary">{label}</td>
                {bids.map((bid) => (
                  <td key={bid.id} className="border border-border-default p-2 text-text-primary">
                    {value(bid)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
