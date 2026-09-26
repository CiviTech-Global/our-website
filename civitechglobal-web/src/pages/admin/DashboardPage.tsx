import { Link } from 'react-router';
import {
  Store,
  Package,
  AlertCircle,
  BookOpen,
  Briefcase,
  ChevronRight,
  ClipboardList,
  Code2,
  FileText,
  FolderKanban,
  Gavel,
  GraduationCap,
  Inbox,
  KeyRound,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
  UserPlus,
  Users,
} from 'lucide-react';
import { useWorkload } from '@/api/admin';
import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { leadStatusBadgeVariant, leadStatusLabel } from '@/lib/leadStatus';
import { projectStatusBadgeVariant, projectStatusLabel } from '@/lib/projectStatus';
import { ArrivalsChart } from '@/components/app/ArrivalsChart';
import { PageHeader } from '@/components/app/PageHeader';
import { DetailList, Panel } from '@/components/app/Panel';
import { StatCard, StatGrid } from '@/components/app/StatCard';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ActivityItem, QueueKey } from '@/types/admin';
import type { LeadStatus } from '@/types/requests';
import type { ProjectRequestStatus } from '@/types/project';
import type { ResumeStatus } from '@/types/resume';

type Translations = ReturnType<typeof useLocale>['t'];

interface QueueMeta {
  label: string;
  to: string;
  icon: LucideIcon;
}

function queueMeta(t: Translations): Record<QueueKey, QueueMeta> {
  return {
    projects: { label: t.proposal.adminTitle, to: '/admin/projects', icon: Code2 },
    resumes: { label: t.join.adminTitle, to: '/admin/resumes', icon: UserPlus },
    programme: { label: t.volunteer.adminTitle, to: '/admin/programme', icon: GraduationCap },
    insurance: { label: t.admin.requests, to: '/admin/requests', icon: ClipboardList },
    messages: { label: t.contact.inboxTitle, to: '/admin/messages', icon: Mail },
    verification: { label: t.market.queueVerifications, to: '/admin/verifications', icon: ShieldCheck },
    jobPosts: { label: t.market.queueJobs, to: '/admin/job-postings', icon: Briefcase },
    applications: { label: t.market.queueApplications, to: '/admin/applications', icon: FileText },
    freelanceProjects: { label: t.market.queueProjects, to: '/admin/freelance-projects', icon: FolderKanban },
    bids: { label: t.market.queueBids, to: '/admin/bids', icon: Gavel },
    books: { label: t.books.queueTitle, to: '/admin/books', icon: BookOpen },
    consultations: { label: t.consult.queueTitle, to: '/admin/consultations', icon: MessageCircle },
    disputes: { label: t.analytics.title, to: '/admin/marketplace', icon: AlertCircle },
    tradeMasterShops: { label: t.trademaster.queueShops, to: '/admin/trademaster/shops', icon: Store },
    tradeMasterProducts: {
      label: t.trademaster.queueProducts,
      to: '/admin/trademaster/products',
      icon: Package,
    },
  };
}

/** Intake queues lead the summary row: they are the company's own business. */
const SUMMARY_ORDER: QueueKey[] = ['projects', 'resumes', 'programme', 'insurance', 'messages'];

/**
 * The admin home.
 *
 * Answers one question first — what is waiting on me? — for exactly the areas
 * this person looks after. Summary figures for the intakes, a "needs attention"
 * list across every queue they hold ordered by how much is waiting, the latest
 * submissions, and fourteen days of arrivals to show whether things are
 * getting busier.
 *
 * It no longer needs the analytics permission. It used to, so an admin
 * granted only CVs opened their own home screen onto an error.
 */
export default function AdminDashboardPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  useDocumentTitle(t.admin.dashboard);
  const { data, isLoading, isError } = useWorkload(Boolean(user));

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : value.toLocaleString('en'));
  const meta = queueMeta(t);

  const queues = (Object.entries(data?.queues ?? {}) as Array<[QueueKey, { open: number; total: number }]>).filter(
    ([key]) => key !== 'disputes'
  );
  const summary = SUMMARY_ORDER.filter((key) => data?.queues[key]);
  const attention = queues.filter(([, count]) => count.open > 0).sort((a, b) => b[1].open - a[1].open);
  const nothingGranted = data && data.permissions.length === 0;

  return (
    <div>
      <PageHeader
        // The Persian comma in Persian: a Latin one reads as a typo mid-sentence.
        title={user ? `${t.app.welcomeBack}${locale === 'fa' ? '،' : ','} ${user.firstName}` : t.admin.dashboard}
        description={t.app.adminOverviewDescription}
        summary={
          summary.length > 0 && (
            <StatGrid columns={summary.length >= 5 ? 5 : 4}>
              {summary.map((key) => {
                const count = data!.queues[key]!;
                return (
                  <StatCard
                    key={key}
                    label={meta[key].label}
                    value={count.total}
                    icon={meta[key].icon}
                    to={meta[key].to}
                    tone={count.open > 0 ? 'attention' : 'neutral'}
                    hint={
                      count.open > 0 ? `${number(count.open)} ${t.app.waiting}` : t.app.nothingWaitingShort
                    }
                  />
                );
              })}
            </StatGrid>
          )
        }
      />

      {isLoading && (
        <StatGrid columns={4}>
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCard key={index} label="" value={undefined} loading />
          ))}
        </StatGrid>
      )}

      {isError && !isLoading && (
        <EmptyState
          icon={<AlertCircle aria-hidden="true" />}
          title={t.common.error}
          description={t.errors.networkError}
        />
      )}

      {nothingGranted && (
        <EmptyState icon={<KeyRound aria-hidden="true" />} title={t.app.noAccessTitle} description={t.app.noAccessBody} />
      )}

      {data && !nothingGranted && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
            {data.recent.length > 0 || summary.length > 0 ? (
              <Panel title={t.app.arrivals} description={`${t.app.arrivalsTotal}: ${number(data.trend.reduce((sum, point) => sum + point.count, 0))}`}>
                <ArrivalsChart points={data.trend} label={t.app.arrivals} />
              </Panel>
            ) : null}

            {summary.length > 0 && (
              <Panel title={t.app.recentActivity} flush>
                {data.recent.length === 0 ? (
                  <p className="px-4 py-10 text-center text-body text-app-text-3">{t.app.recentEmpty}</p>
                ) : (
                  <ul className="divide-y divide-app-border-light">
                    {data.recent.map((item) => (
                      <li key={`${item.kind}-${item.id}`}>
                        <ActivityRow item={item} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <Panel title={t.app.needsAttention} flush>
              {attention.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-status-success-bg text-status-success">
                    <Inbox className="size-5" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-body font-semibold text-app-text">{t.app.allClearTitle}</p>
                  <p className="mt-0.5 text-label text-app-text-3">{t.app.allClearBody}</p>
                </div>
              ) : (
                <ul className="divide-y divide-app-border-light">
                  {attention.map(([key, count]) => {
                    const Icon = meta[key].icon;
                    return (
                      <li key={key}>
                        <Link
                          to={meta[key].to}
                          className="group flex items-center gap-3 px-4 py-2.5 hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded border border-app-border-light bg-app-subtle text-app-icon">
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body font-medium text-app-text">{meta[key].label}</span>
                            <span className="block text-label text-app-text-3">
                              {number(count.total)} {t.app.total}
                            </span>
                          </span>
                          <Badge variant="warning">
                            {number(count.open)} {t.app.waiting}
                          </Badge>
                          <ChevronRight
                            className="size-4 shrink-0 text-app-text-4 group-hover:text-app-text rtl:rotate-180"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            {data.users && (
              <Panel title={t.admin.users} viewAll={{ to: '/admin/users', label: t.app.viewAll }}>
                <DetailList
                  columns={2}
                  items={[
                    {
                      label: t.admin.totalUsers,
                      value: (
                        <span className="inline-flex items-center gap-1.5 text-title-sm font-semibold">
                          <Users className="size-4 text-app-icon" aria-hidden="true" />
                          {number(data.users.total)}
                        </span>
                      ),
                    },
                    {
                      label: t.app.staff,
                      value: <span className="text-title-sm font-semibold">{number(data.users.staff)}</span>,
                    },
                  ]}
                />
              </Panel>
            )}

            {data.showcase && (
              <Panel title={t.showcase.groupAdmin} viewAll={{ to: '/admin/customers', label: t.app.viewAll }}>
                <DetailList
                  columns={2}
                  items={[
                    { label: t.showcase.adminCustomersTitle, value: number(data.showcase.customers) },
                    { label: t.showcase.adminPartnersTitle, value: number(data.showcase.partners) },
                    { label: t.showcase.adminProjectsTitle, value: number(data.showcase.projects) },
                    {
                      label: t.showcase.hidden,
                      value: (
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-app-icon" aria-hidden="true" />
                          {number(data.showcase.hidden)} {t.app.hiddenEntries}
                        </span>
                      ),
                    },
                  ]}
                />
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function activityStatus(t: Translations, item: ActivityItem): { label: string; variant: BadgeVariant } {
  switch (item.kind) {
    case 'project':
      return {
        label: projectStatusLabel(t, item.status as ProjectRequestStatus),
        variant: projectStatusBadgeVariant(item.status as ProjectRequestStatus),
      };
    case 'insurance':
      return {
        label: leadStatusLabel(t, item.status as LeadStatus),
        variant: leadStatusBadgeVariant(item.status as LeadStatus),
      };
    case 'message': {
      const status = item.status as keyof typeof t.contact.statuses;
      return { label: t.contact.statuses[status] ?? item.status, variant: status === 'OPEN' ? 'warning' : 'default' };
    }
    default: {
      const status = item.status as ResumeStatus;
      return {
        label: t.join.statuses[status] ?? item.status,
        variant: status === 'RECEIVED' || status === 'IN_REVIEW' ? 'warning' : status === 'MATCHED' ? 'success' : 'default',
      };
    }
  }
}

function activityLink(item: ActivityItem): string {
  switch (item.kind) {
    case 'project':
      return `/admin/projects/${item.id}`;
    case 'insurance':
      return `/admin/requests/${item.id}`;
    case 'message':
      return '/admin/messages';
    default:
      return `/admin/resumes/${item.id}`;
  }
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const { t, locale } = useLocale();
  const status = activityStatus(t, item);

  return (
    <Link
      to={activityLink(item)}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none sm:flex-nowrap"
    >
      <span className="w-28 shrink-0 text-label text-app-text-3">{t.app.activityKinds[item.kind]}</span>
      <span className="min-w-0 flex-1 truncate text-body font-medium text-app-text">{item.title}</span>
      <Badge variant={status.variant}>{status.label}</Badge>
      <span className="w-24 shrink-0 text-end text-label text-app-text-3">{formatDate(item.createdAt, locale)}</span>
    </Link>
  );
}
