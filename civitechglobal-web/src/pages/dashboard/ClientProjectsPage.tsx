import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ChevronDown, ChevronUp, Pencil, Plus, Send, Users, XCircle } from 'lucide-react';
import { useCloseProject, useSubmitProject } from '@/api/marketplace';
import { useClientPipeline, useOwnProjectsV2 } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { fill, formatNumber } from '@/lib/jobFormat';
import { moderationVariant, stateVariant } from '@/lib/marketplace';
import { budgetText } from '@/lib/workFormat';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ProposalInbox } from '@/components/work/ProposalInbox';
import type { OwnProjectV2 } from '@/types/work';

type Tab = 'all' | 'open' | 'drafts' | 'closed';

/**
 * The client's projects, second generation: gauges across everything (new
 * proposals, shortlisted, interviewing, hired, invitations), then each project
 * with its own gauges and its proposals inbox opening in place. ?open=<id>
 * opens one directly, which is where notifications and the project page link.
 */
export default function ClientProjectsPage() {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const [params, setParams] = useSearchParams();
  const { data: projects, isLoading } = useOwnProjectsV2();
  const { data: pipeline } = useClientPipeline();
  const submit = useSubmitProject();
  const close = useCloseProject();
  const [tab, setTab] = useState<Tab>('all');
  const openId = params.get('open');
  const number = (value: number) => formatNumber(value, locale);

  useDocumentTitle(t.work.navMyProjects);

  const shown = useMemo(
    () =>
      (projects ?? []).filter((project) => {
        const live = project.moderationStatus === 'APPROVED';
        if (tab === 'open') return live && project.state === 'OPEN';
        if (tab === 'drafts') return !live;
        if (tab === 'closed') return live && project.state !== 'OPEN';
        return true;
      }),
    [projects, tab],
  );

  async function run(action: Promise<unknown>, message: string) {
    try {
      await action;
      showToast(message, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  function toggleInbox(id: string) {
    const next = new URLSearchParams(params);
    if (openId === id) next.delete('open');
    else next.set('open', id);
    setParams(next, { replace: true });
  }

  const totalInvites = Object.values(pipeline?.invites ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);
  const gauges = [
    { label: t.work.openProjects, value: pipeline?.projects.OPEN ?? 0 },
    { label: t.work.pipelineNew, value: pipeline?.unseenBids ?? 0, attention: (pipeline?.unseenBids ?? 0) > 0 },
    { label: t.work.pipelineShortlisted, value: pipeline?.bids.SHORTLISTED ?? 0 },
    { label: t.work.pipelineInterviewing, value: pipeline?.bids.INTERVIEW ?? 0 },
    { label: t.work.pipelineHired, value: pipeline?.bids.ACCEPTED ?? 0 },
    { label: t.work.invitesSent, value: totalInvites },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.work.navMyProjects}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/freelancers">
              <Button variant="outline">
                <Users className="size-4" aria-hidden="true" />
                {t.work.findTalent}
              </Button>
            </Link>
            <Link to="/dashboard/projects/new">
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                {t.work.postProject}
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {gauges.map((gauge) => (
            <div key={gauge.label} className="min-w-0">
              <dt className="app-label truncate">{gauge.label}</dt>
              <dd className={cn('app-readout mt-1 px-2 py-0.5 text-lg font-semibold', gauge.attention && 'text-status-warning')}>
                {number(gauge.value)}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="flex flex-wrap gap-2" role="tablist">
        {(
          [
            ['all', t.work.allStages],
            ['open', t.work.openProjects],
            ['drafts', t.work.awaitingReview],
            ['closed', t.work.closed],
          ] as const
        ).map(([value, label]) => (
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
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && shown.length === 0 && (
        <EmptyState
          title={t.market.noProjects}
          action={
            <Link to="/dashboard/projects/new">
              <Button>{t.work.postProject}</Button>
            </Link>
          }
        />
      )}

      <ul className="flex flex-col gap-3">
        {shown.map((project) => (
          <li key={project.id}>
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <StatusBadges project={project} />
                  <h2 className="font-semibold text-text-primary">
                    {project.moderationStatus === 'APPROVED' ? (
                      <Link to={`/projects/${project.code}`} className="hover:underline">
                        {project.title}
                      </Link>
                    ) : (
                      project.title
                    )}
                  </h2>
                  <p className="text-sm text-text-secondary">{budgetText(project, locale, t)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(project.moderationStatus === 'DRAFT' || project.moderationStatus === 'CHANGES_REQUESTED') && (
                    <>
                      <Link to={`/dashboard/projects/${project.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Pencil className="size-4" aria-hidden="true" />
                          {t.common.edit}
                        </Button>
                      </Link>
                      <Button size="sm" onClick={() => void run(submit.mutateAsync(project.id), t.work.submitted)}>
                        <Send className="size-4" aria-hidden="true" />
                        {t.work.submitForReview}
                      </Button>
                    </>
                  )}
                  {project.moderationStatus === 'APPROVED' && (
                    <Button size="sm" variant="outline" aria-expanded={openId === project.id} onClick={() => toggleInbox(project.id)}>
                      {openId === project.id ? (
                        <ChevronUp className="size-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="size-4" aria-hidden="true" />
                      )}
                      {t.work.inboxTitle} ({number(project.activity?.bidCount ?? project._count.bids)})
                    </Button>
                  )}
                  {project.moderationStatus === 'APPROVED' && project.state === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(t.work.closeProjectConfirm)) void run(close.mutateAsync(project.id), t.work.projectClosed);
                      }}
                    >
                      <XCircle className="size-4" aria-hidden="true" />
                      {t.work.closeProject}
                    </Button>
                  )}
                </div>
              </div>

              {project.reviewNote && project.moderationStatus !== 'APPROVED' && (
                <p className="rounded-lg bg-brand-amber-50 p-3 text-sm text-brand-amber-900 dark:bg-brand-amber-900/30 dark:text-brand-amber-200">
                  <span className="font-medium">{t.market.reviewNote}: </span>
                  {project.reviewNote}
                </p>
              )}

              {project.moderationStatus === 'APPROVED' && <ProjectGauges project={project} />}
              {openId === project.id && project.moderationStatus === 'APPROVED' && <ProposalInbox project={project} />}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadges({ project }: { project: OwnProjectV2 }) {
  const { t, locale } = useLocale();
  const state = project.state ?? 'OPEN';
  return (
    <div className="mb-1 flex flex-wrap gap-1.5">
      {project.moderationStatus === 'APPROVED' ? (
        <Badge variant={stateVariant(project.state ?? 'OPEN')}>{t.market[state]}</Badge>
      ) : project.moderationStatus === 'REJECTED' ? (
        <Badge variant={moderationVariant(project.moderationStatus)}>{t.market.REJECTED}</Badge>
      ) : (
        <Badge variant={moderationVariant(project.moderationStatus)}>{t.market[project.moderationStatus]}</Badge>
      )}
      {project.pricingType && <Badge>{t.work.pricing[project.pricingType]}</Badge>}
      {project.nda && <Badge>{t.work.nda}</Badge>}
      {project.visibility && project.visibility !== 'PUBLIC' && <Badge variant="info">{t.work.visibility[project.visibility]}</Badge>}
      {(project.unseenBids ?? 0) > 0 && (
        <Badge variant="warning">{fill(t.work.newProposals, { count: formatNumber(project.unseenBids!, locale) })}</Badge>
      )}
    </div>
  );
}

function ProjectGauges({ project }: { project: OwnProjectV2 }) {
  const { t, locale } = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const activity = project.activity;
  const gauges = [
    { label: t.jobs.viewsCount.replace('{count}', '').trim(), value: number(project.viewCount) },
    { label: t.work.proposals, value: number(activity?.bidCount ?? project._count.bids) },
    { label: t.work.pipelineNew, value: number(project.unseenBids ?? 0), attention: (project.unseenBids ?? 0) > 0 },
    { label: t.work.interviewing, value: number(activity?.interviewing ?? 0) },
    { label: t.work.invitesSent, value: number(activity?.invitesSent ?? 0) },
    { label: t.work.hired, value: `${number(activity?.hired ?? 0)} / ${number(project.freelancersNeeded ?? 1)}` },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {gauges.map((gauge) => (
        <div key={gauge.label} className="min-w-0">
          <dt className="app-label truncate">{gauge.label}</dt>
          <dd className={cn('app-readout mt-1 truncate px-2 py-0.5 text-body font-semibold', gauge.attention && 'text-status-warning')}>
            {gauge.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
