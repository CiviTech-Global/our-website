import { useState } from 'react';
import { Link } from 'react-router';
import { Eye, Handshake, Pencil } from 'lucide-react';
import { useMyProposals, useWithdrawBid } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { fill, formatNumber } from '@/lib/jobFormat';
import { agoText, amountText } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { StageTracker } from '@/components/jobs/StageTracker';
import { ProjectCard } from '@/components/work/WorkUi';
import type { MyProposal } from '@/types/work';

const ACTIVE = ['PENDING', 'SHORTLISTED', 'INTERVIEW'];

/**
 * The freelancer's proposals: active ones first, each under its project's
 * card, with where it stands (sent, seen, shortlisted, interviewing,
 * decided), the amount, and the moves left — edit, withdraw, or open the
 * contract once hired.
 */
export default function MyProposalsPage() {
  const { t } = useLocale();
  const { data, isLoading } = useMyProposals();
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  useDocumentTitle(t.work.proposalsTitle);

  const rows = (data ?? []).filter((row) =>
    tab === 'active' ? ACTIVE.includes(row.outcome) && row.project.state === 'OPEN' : !(ACTIVE.includes(row.outcome) && row.project.state === 'OPEN'),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.work.proposalsTitle}
        actions={
          <Link to="/projects">
            <Button variant="outline">{t.work.findWork}</Button>
          </Link>
        }
      />
      <div className="flex gap-2" role="tablist">
        {(['active', 'archived'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              tab === value
                ? 'border-brand-green-600 bg-brand-green-50 text-brand-green-800 dark:bg-brand-green-900/30 dark:text-brand-green-300'
                : 'border-border-default text-text-secondary',
            )}
          >
            {value === 'active' ? t.work.activeProposals : t.work.archivedProposals}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && rows.length === 0 && (
        <EmptyState
          title={t.work.proposalsEmpty}
          action={
            <Link to="/projects">
              <Button>{t.work.findWork}</Button>
            </Link>
          }
        />
      )}
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <ProjectCard key={row.id} project={row.project} footer={<ProposalFooter proposal={row} />} />
        ))}
      </ul>
    </div>
  );
}

function ProposalFooter({ proposal }: { proposal: MyProposal }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const withdraw = useWithdrawBid();
  const live = ACTIVE.includes(proposal.outcome) && proposal.project.state === 'OPEN';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-text-primary">
            {amountText(proposal.amount, proposal.currency, proposal.project.pricingType, locale, t)}
          </span>
          {proposal.deliveryDays !== null && (
            <span className="text-text-secondary">{fill(t.work.daysCount, { count: formatNumber(proposal.deliveryDays, locale) })}</span>
          )}
          <Badge variant={proposal.outcome === 'ACCEPTED' ? 'success' : proposal.outcome === 'DECLINED' ? 'danger' : 'info'}>
            {t.work.bidStage[proposal.outcome]}
          </Badge>
          {proposal.invited && <Badge>{t.work.invitedBadge}</Badge>}
          <span className="text-xs text-text-tertiary">
            {agoText(proposal.createdAt, locale, t)} · {proposal.clientSeenAt ? t.work.seenByClient : t.work.notSeenYet}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {proposal.award ? (
            <Link to="/dashboard/awards">
              <Button size="sm">
                <Handshake className="size-4" aria-hidden="true" />
                {t.work.openContract}
              </Button>
            </Link>
          ) : (
            <Link to={`/projects/${proposal.project.code}#proposal`}>
              <Button size="sm" variant="outline">
                {live ? <Pencil className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                {live ? t.work.editProposal : t.work.viewProject}
              </Button>
            </Link>
          )}
          {live && (
            <Button
              size="sm"
              variant="ghost"
              isLoading={withdraw.isPending}
              onClick={() => {
                if (!window.confirm(t.work.withdrawConfirm)) return;
                withdraw.mutate(proposal.id, {
                  onSuccess: () => showToast(t.work.proposalWithdrawn, 'success'),
                  onError: (error) => showToast(apiMessage(error, t.common.error), 'error'),
                });
              }}
            >
              {t.work.withdraw}
            </Button>
          )}
        </div>
      </div>
      {proposal.outcome !== 'WITHDRAWN' && (
        <StageTracker application={{ outcome: proposal.outcome, employerSeenAt: proposal.clientSeenAt }} />
      )}
    </div>
  );
}
