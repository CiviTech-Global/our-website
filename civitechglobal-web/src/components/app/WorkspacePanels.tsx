import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  ChevronRight,
  FileText,
  FolderKanban,
  Gavel,
  MessagesSquare,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { features } from '@/lib/features';
import { moderationVariant, outcomeVariant } from '@/lib/marketplace';
import { Panel } from '@/components/app/Panel';
import { Badge } from '@/components/ui/Badge';
import type { Workspace } from '@/api/workspace';

/**
 * The member home's panels, one per part a member plays.
 *
 * Each renders only for somebody who plays that part — a panel headed "your
 * projects" for somebody who has none is a permanent reminder of a thing they
 * did not ask to do. The parts they do not play yet are offered together, as
 * invitations, at the foot of the page.
 */

function useNumber() {
  const { locale } = useLocale();
  return (value: number) => (locale === 'fa' ? toPersianDigits(value) : value.toLocaleString('en'));
}

/** A row of small figures inside a panel, each a link to where it is counted. */
function Figures({ items }: { items: Array<{ label: string; value: number; to: string; tone?: 'attention' }> }) {
  const number = useNumber();
  return (
    <dl className="grid grid-cols-2 divide-app-border-light border-b border-app-border-light sm:grid-cols-4 sm:divide-x rtl:sm:divide-x-reverse">
      {items.map((item) => (
        <Link key={item.label} to={item.to} className="px-4 py-3 hover:bg-app-hover">
          <dt className="text-label text-app-text-3">{item.label}</dt>
          <dd
            className={
              item.tone === 'attention' && item.value > 0
                ? 'mt-0.5 text-title font-semibold text-status-warning'
                : 'mt-0.5 text-title font-semibold text-app-text'
            }
          >
            {number(item.value)}
          </dd>
        </Link>
      ))}
    </dl>
  );
}

/** What is waiting on this person, across every part they play. */
export function AttentionPanel({ data }: { data: Workspace }) {
  const { t } = useLocale();
  const number = useNumber();
  const changes = (data.hiring.byStatus.CHANGES_REQUESTED ?? 0) + (data.client.byStatus.CHANGES_REQUESTED ?? 0) +
    (data.selling.booksByStatus.CHANGES_REQUESTED ?? 0);
  const items: Array<{ icon: ReactNode; label: string; to: string }> = [];

  if (data.verification !== 'APPROVED' && data.verification !== 'PENDING') {
    items.push({ icon: <ShieldCheck />, label: t.workspace.attentionVerify, to: '/dashboard/verification' });
  }
  if (data.hiring.unseen > 0) {
    items.push({
      icon: <Users />,
      label: t.workspace.attentionApplicants.replace('{count}', number(data.hiring.unseen)),
      to: '/dashboard/jobs',
    });
  }
  if (data.client.bidsAwaiting > 0) {
    items.push({
      icon: <Gavel />,
      label: t.workspace.attentionBids.replace('{count}', number(data.client.bidsAwaiting)),
      to: '/dashboard/projects',
    });
  }
  if (changes > 0) {
    items.push({
      icon: <AlertCircle />,
      label: t.workspace.attentionChanges.replace('{count}', number(changes)),
      to: (data.hiring.byStatus.CHANGES_REQUESTED ?? 0) > 0 ? '/dashboard/jobs' : (data.client.byStatus.CHANGES_REQUESTED ?? 0) > 0 ? '/dashboard/projects' : '/dashboard/books',
    });
  }
  if (data.unread.messages > 0) {
    items.push({
      icon: <MessagesSquare />,
      label: t.workspace.attentionMessages.replace('{count}', number(data.unread.messages)),
      to: '/dashboard/messages',
    });
  }

  return (
    <Panel title={t.workspace.attentionTitle} flush>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-body text-app-text-3">{t.workspace.allClear}</p>
      ) : (
        <ul className="divide-y divide-app-border-light">
          {items.map((item) => (
            <li key={item.label}>
              <Link to={item.to} className="flex items-center gap-3 px-4 py-3 hover:bg-app-hover">
                <span className="text-status-warning [&_svg]:size-4">{item.icon}</span>
                <span className="min-w-0 flex-1 text-body text-app-text">{item.label}</span>
                <ChevronRight className="size-4 text-app-text-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function HiringPanel({ data }: { data: Workspace }) {
  const { t, locale } = useLocale();
  const { hiring } = data;
  return (
    <Panel
      title={t.workspace.hiringTitle}
      viewAll={{ to: '/dashboard/jobs', label: t.workspace.viewAll }}
      actions={
        features.jobsV2 && (
          <Link to="/dashboard/company" className="text-label text-app-text-3 hover:text-app-primary">
            {t.workspace.companyPage}
          </Link>
        )
      }
      flush
    >
      <Figures
        items={[
          { label: t.workspace.openPostings, value: hiring.open, to: '/dashboard/jobs' },
          { label: t.workspace.applicants, value: hiring.applicants, to: '/dashboard/jobs' },
          ...(features.jobsV2
            ? [{ label: t.workspace.newApplicants, value: hiring.unseen, to: '/dashboard/jobs', tone: 'attention' as const }]
            : []),
          { label: t.workspace.shortlisted, value: hiring.byOutcome.SHORTLISTED ?? 0, to: '/dashboard/jobs' },
          ...(features.jobsV2
            ? [{ label: t.workspace.interviews, value: hiring.byOutcome.INTERVIEW ?? 0, to: '/dashboard/jobs' }]
            : []),
        ].slice(0, 4)}
      />
      {hiring.recent.length > 0 && (
        <>
          <p className="px-4 pt-3 text-label font-medium text-app-text-3">{t.workspace.recentApplicants}</p>
          <ul className="divide-y divide-app-border-light">
            {hiring.recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-body text-app-text">
                  {row.applicant.firstName} {row.applicant.lastName}
                  <span className="text-app-text-4"> · {row.job.title}</span>
                </span>
                {features.jobsV2 && !row.employerSeenAt && <Badge variant="warning">{t.jobs.newBadge}</Badge>}
                <Badge variant={outcomeVariant(row.outcome)}>{t.market[row.outcome]}</Badge>
                <span className="text-caption text-app-text-4">{formatDate(row.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

export function JobSearchPanel({ data }: { data: Workspace }) {
  const { t, locale } = useLocale();
  const { jobSearch } = data;
  const waiting = (jobSearch.byOutcome.PENDING ?? 0) + (jobSearch.byOutcome.SHORTLISTED ?? 0);
  return (
    <Panel
      title={t.workspace.jobSearchTitle}
      viewAll={{ to: '/dashboard/applications', label: t.workspace.viewAll }}
      actions={
        <Link to="/jobs" className="inline-flex items-center gap-1 text-label text-app-text-3 hover:text-app-primary">
          <Search className="size-3.5" aria-hidden="true" />
          {t.workspace.findJobs}
        </Link>
      }
      flush
    >
      <Figures
        items={
          features.jobsV2
            ? [
                { label: t.workspace.applications, value: jobSearch.applications, to: '/dashboard/applications' },
                { label: t.workspace.interviewing, value: jobSearch.byOutcome.INTERVIEW ?? 0, to: '/dashboard/applications' },
                { label: t.workspace.savedJobs, value: jobSearch.savedJobs, to: '/dashboard/saved-jobs' },
                { label: t.workspace.activeAlerts, value: jobSearch.activeAlerts, to: '/dashboard/job-alerts' },
              ]
            : [
                { label: t.workspace.applications, value: jobSearch.applications, to: '/dashboard/applications' },
                { label: t.workspace.underReview, value: waiting, to: '/dashboard/applications' },
                { label: t.workspace.accepted, value: jobSearch.byOutcome.ACCEPTED ?? 0, to: '/dashboard/applications' },
              ]
        }
      />
      {jobSearch.recent.length > 0 && (
        <>
          <p className="px-4 pt-3 text-label font-medium text-app-text-3">{t.workspace.recentApplications}</p>
          <ul className="divide-y divide-app-border-light">
            {jobSearch.recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <Link to={`/jobs/${row.job.code}`} className="min-w-0 flex-1 truncate text-body text-app-text hover:underline">
                  {row.job.title}
                  {row.job.companyName && <span className="text-app-text-4"> · {row.job.companyName}</span>}
                </Link>
                {row.moderationStatus === 'APPROVED' ? (
                  <Badge variant={outcomeVariant(row.outcome)}>{t.market[row.outcome]}</Badge>
                ) : (
                  <Badge variant={moderationVariant(row.moderationStatus)}>{t.market[row.moderationStatus]}</Badge>
                )}
                <span className="text-caption text-app-text-4">{formatDate(row.updatedAt, locale)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

export function ClientPanel({ data }: { data: Workspace }) {
  const { t } = useLocale();
  return (
    <Panel title={t.workspace.clientTitle} viewAll={{ to: '/dashboard/projects', label: t.workspace.viewAll }} flush>
      <Figures
        items={[
          { label: t.workspace.openProjects, value: data.client.open, to: '/dashboard/projects' },
          { label: t.workspace.bidsAwaiting, value: data.client.bidsAwaiting, to: '/dashboard/projects', tone: 'attention' },
          { label: t.workspace.inReview, value: data.client.byStatus.PENDING_REVIEW ?? 0, to: '/dashboard/projects' },
        ]}
      />
    </Panel>
  );
}

export function FreelancePanel({ data }: { data: Workspace }) {
  const { t } = useLocale();
  const { byOutcome } = data.freelance;
  return (
    <Panel title={t.workspace.freelanceTitle} viewAll={{ to: '/dashboard/bids', label: t.workspace.viewAll }} flush>
      <Figures
        items={[
          { label: t.workspace.bidsSent, value: data.freelance.bids, to: '/dashboard/bids' },
          { label: t.workspace.shortlisted, value: byOutcome.SHORTLISTED ?? 0, to: '/dashboard/bids' },
          { label: t.workspace.accepted, value: byOutcome.ACCEPTED ?? 0, to: '/dashboard/bids' },
          { label: t.workspace.activeLabel, value: data.collaborations.active, to: '/dashboard/awards' },
        ]}
      />
    </Panel>
  );
}

export function SellingPanel({ data }: { data: Workspace }) {
  const { t } = useLocale();
  return (
    <Panel title={t.workspace.sellingTitle} viewAll={{ to: '/dashboard/books', label: t.workspace.viewAll }} flush>
      <Figures
        items={[
          { label: t.workspace.booksListed, value: data.selling.booksByStatus.APPROVED ?? 0, to: '/dashboard/books' },
          { label: t.workspace.inReview, value: data.selling.booksByStatus.PENDING_REVIEW ?? 0, to: '/dashboard/books' },
        ]}
      />
    </Panel>
  );
}

/** The notifications, newest first: what happened while the member was away. */
export function ActivityPanel({ data }: { data: Workspace }) {
  const { t, locale } = useLocale();
  return (
    <Panel title={t.workspace.activityTitle} viewAll={{ to: '/dashboard/notifications', label: t.workspace.viewAll }} flush>
      {data.recentNotifications.length === 0 ? (
        <p className="px-4 py-4 text-body text-app-text-3">{t.workspace.noActivity}</p>
      ) : (
        <ul className="divide-y divide-app-border-light">
          {data.recentNotifications.map((item) => {
            const body = (
              <>
                <span className="flex items-center gap-2">
                  {!item.readAt && <span className="size-1.5 shrink-0 rounded-full bg-app-primary" aria-hidden="true" />}
                  <span className="text-body font-medium text-app-text">{item.title}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-label text-app-text-3">{item.body}</span>
                <span className="mt-0.5 block text-caption text-app-text-4">{formatDate(item.createdAt, locale)}</span>
              </>
            );
            return (
              <li key={item.id}>
                {item.link ? (
                  <Link to={item.link} className="block px-4 py-3 hover:bg-app-hover">
                    {body}
                  </Link>
                ) : (
                  <div className="px-4 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/** The parts this member does not play yet, offered once, together. */
export function GetStartedPanel({ data }: { data: Workspace }) {
  const { t } = useLocale();
  const offers: Array<{ show: boolean; to: string; icon: ReactNode; title: string; body: string }> = [
    { show: data.hiring.postings === 0, to: '/dashboard/jobs', icon: <Briefcase />, title: t.workspace.startHiring, body: t.workspace.startHiringBody },
    {
      show: data.jobSearch.applications === 0 && data.jobSearch.savedJobs === 0,
      to: '/jobs',
      icon: <FileText />,
      title: t.workspace.startJobSearch,
      body: t.workspace.startJobSearchBody,
    },
    { show: data.freelance.bids === 0, to: '/projects', icon: <Gavel />, title: t.workspace.startFreelance, body: t.workspace.startFreelanceBody },
    { show: data.client.projects === 0, to: '/dashboard/projects', icon: <FolderKanban />, title: t.workspace.startClient, body: t.workspace.startClientBody },
    { show: data.selling.books === 0, to: '/dashboard/books', icon: <BookOpen />, title: t.workspace.startSelling, body: t.workspace.startSellingBody },
  ];
  const shown = offers.filter((offer) => offer.show);
  if (shown.length === 0) return null;

  return (
    <Panel title={t.workspace.getStartedTitle} flush>
      <ul className="grid grid-cols-1 divide-y divide-app-border-light sm:grid-cols-2 sm:divide-y-0">
        {shown.map((offer) => (
          <li key={offer.title} className="border-app-border-light sm:border-b sm:odd:border-e">
            <Link to={offer.to} className="group flex h-full gap-3 px-4 py-3.5 hover:bg-app-hover">
              <span className="flex size-8 shrink-0 items-center justify-center rounded border border-app-border-light bg-app-subtle text-app-icon group-hover:text-app-primary [&_svg]:size-4">
                {offer.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-body font-medium text-app-text">{offer.title}</span>
                <span className="block text-label text-app-text-3">{offer.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
