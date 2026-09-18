import { Link } from 'react-router';
import {
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Code2,
  Eye,
  FileText,
  Gavel,
  Handshake,
  MailWarning,
  MessagesSquare,
  PackageSearch,
  UserPlus,
} from 'lucide-react';
import { useSendVerificationEmail } from '@/api/accountRecovery';
import { useCapabilities } from '@/api/capabilities';
import { useOwnMarketplaceStats, useOwnVerification } from '@/api/marketplace';
import { isApiError } from '@/config/api';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { PageHeader } from '@/components/app/PageHeader';
import { DetailList, Panel } from '@/components/app/Panel';
import { StatCard, StatGrid } from '@/components/app/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type StepState = 'done' | 'pending' | 'todo';

interface SetupStep {
  id: string;
  label: string;
  state: StepState;
  to?: string;
}

/**
 * The member home.
 *
 * Built on the same pattern as the admin home so the two panels read as one
 * product: a row of figures that each open the screen they summarise, then a
 * main column and a side column of panels.
 *
 * The profile-completion bar, "account status: active" and "role" cards this
 * replaced each answered a question nobody arrives asking. "Getting set up"
 * answers the one they do — what do I still need to do before I can use the
 * marketplace — as a checklist with a link beside each open step. Once every
 * step is done the panel is not shown at all: a finished checklist is noise.
 */
export default function DashboardPage() {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const sendVerification = useSendVerificationEmail();
  // No mail service, no email step: the server would answer 501, and a
  // checklist item nobody can ever tick is worse than a shorter checklist.
  const { email: canEmail } = useCapabilities();
  useDocumentTitle(t.nav.dashboard);
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useOwnMarketplaceStats(Boolean(user));
  const { data: verification } = useOwnVerification(Boolean(user));

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : value.toLocaleString('en'));

  const steps: SetupStep[] = [
    {
      id: 'phone',
      label: t.app.setupPhone,
      state: user?.phone ? 'done' : 'todo',
      to: '/dashboard/profile',
    },
    ...(canEmail
      ? [
          {
            id: 'email',
            label: t.app.setupEmail,
            // Undefined means the server does not report it; not a step we can show.
            state: (user?.emailVerified === false ? 'todo' : 'done') as StepState,
          },
        ]
      : []),
    {
      id: 'identity',
      label: t.app.setupIdentity,
      state:
        verification?.status === 'APPROVED'
          ? 'done'
          : verification?.status === 'PENDING'
            ? 'pending'
            : 'todo',
      to: '/dashboard/verification',
    },
  ];
  const doneCount = steps.filter((step) => step.state === 'done').length;

  const greeting = user
    ? `${t.dashboard.welcome}${locale === 'fa' ? '،' : ','} ${user.firstName}`
    : t.dashboard.welcome;

  return (
    <div>
      <PageHeader
        title={greeting}
        description={t.app.memberOverviewDescription}
        summary={
          <StatGrid columns={5}>
            <StatCard
              label={t.meStats.listings}
              value={stats?.listings.total}
              loading={statsLoading}
              icon={Briefcase}
              to="/dashboard/jobs"
              hint={
                stats && (
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3" aria-hidden="true" />
                    {number(stats.listings.views)}
                  </span>
                )
              }
            />
            <StatCard
              label={t.meStats.applications}
              value={stats?.applications.total}
              loading={statsLoading}
              icon={FileText}
              to="/dashboard/applications"
            />
            <StatCard
              label={t.meStats.bids}
              value={stats?.bids.total}
              loading={statsLoading}
              icon={Gavel}
              to="/dashboard/bids"
            />
            <StatCard
              label={t.meStats.wonAwards}
              value={stats?.awards.won}
              loading={statsLoading}
              icon={Handshake}
              to="/dashboard/awards"
              tone="positive"
            />
            <StatCard
              label={t.meStats.unreadMessages}
              value={stats ? stats.unread.messages + stats.unread.notifications : undefined}
              loading={statsLoading}
              icon={MessagesSquare}
              to="/dashboard/messages"
              tone={stats && stats.unread.messages + stats.unread.notifications > 0 ? 'attention' : 'neutral'}
            />
          </StatGrid>
        }
      />

      {/* Only while it matters. A banner that stays after the thing is done is
          how people learn to stop reading banners. */}
      {canEmail && user?.emailVerified === false && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded border border-status-warning-border bg-status-warning-bg px-4 py-3">
          <MailWarning className="size-5 shrink-0 text-status-warning" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium text-app-text">{t.auth.verifyBannerTitle}</p>
            <p className="text-body text-app-text-3">{t.auth.verifyBannerBody}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            isLoading={sendVerification.isPending}
            onClick={async () => {
              try {
                await sendVerification.mutateAsync();
                showToast(t.auth.verifyBannerSent, 'success');
              } catch (error) {
                // The server explains a 501 here by naming the contact form,
                // which is more use than "something went wrong".
                showToast(isApiError(error) ? error.message : t.common.error, 'error');
              }
            }}
          >
            {t.auth.verifyBannerAction}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          {doneCount < steps.length && (
            <Panel
              title={t.app.setupTitle}
              actions={
                <span className="text-label text-app-text-3">
                  {t.app.setupProgress
                    .replace('{done}', number(doneCount))
                    .replace('{total}', number(steps.length))}
                </span>
              }
              flush
            >
              {/* A thin progress rule under the header: the checklist below is
                the detail, this is the glance. */}
              <div className="h-1 bg-app-fill" aria-hidden="true">
                <div
                  className="h-full bg-app-primary transition-[width]"
                  style={{ width: `${(doneCount / steps.length) * 100}%` }}
                />
              </div>
              <ol className="divide-y divide-app-border-light">
                {steps.map((step) => (
                  <li key={step.id} className="flex items-center gap-3 px-4 py-3">
                    <StepIcon state={step.state} />
                    <span
                      className={cn(
                        'min-w-0 flex-1 text-body',
                        step.state === 'done'
                          ? 'text-app-text-3 line-through decoration-app-text-4'
                          : 'text-app-text'
                      )}
                    >
                      {step.label}
                    </span>
                    {step.state === 'done' && <Badge variant="success">{t.app.setupDone}</Badge>}
                    {step.state === 'pending' && <Badge variant="warning">{t.app.setupPending}</Badge>}
                    {step.state === 'todo' && step.to && (
                      <Link to={step.to}>
                        <Button variant="outline" size="sm">
                          {t.app.setupAction}
                        </Button>
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          <Panel title={t.dashboard.quickActions} flush>
            <ul className="grid grid-cols-1 divide-y divide-app-border-light sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
              <QuickAction to="/start-project" icon={<Code2 />} label={t.nav.startProject} />
              <QuickAction to="/join" icon={<UserPlus />} label={t.join.title} />
              <QuickAction to="/track" icon={<PackageSearch />} label={t.nav.track} />
            </ul>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title={t.app.accountTitle} viewAll={{ to: '/dashboard/profile', label: t.nav.profile }}>
            <DetailList
              columns={2}
              items={[
                {
                  label: t.admin.fullName,
                  value: user ? `${user.firstName} ${user.lastName}` : null,
                  wide: true,
                },
                { label: t.auth.email, value: user ? <span dir="ltr">{user.email}</span> : null, wide: true },
                { label: t.dashboard.roleTitle, value: user ? t.app.roles[user.role] : null },
                {
                  label: t.dashboard.accountStatusTitle,
                  value: (
                    <Badge variant="success" dot>
                      {t.dashboard.accountStatusActive}
                    </Badge>
                  ),
                },
              ]}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') {
    return <CheckCircle2 className="size-5 shrink-0 text-status-success" aria-hidden="true" />;
  }
  if (state === 'pending') {
    return <Clock className="size-5 shrink-0 text-status-warning" aria-hidden="true" />;
  }
  return <Circle className="size-5 shrink-0 text-app-text-4" aria-hidden="true" />;
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <li>
      <Link
        to={to}
        className="group flex h-full items-center gap-3 px-4 py-3.5 hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded border border-app-border-light bg-app-subtle text-app-icon [&_svg]:size-4 group-hover:text-app-primary">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-body font-medium text-app-text">{label}</span>
        <ChevronRight className="size-4 shrink-0 text-app-text-4 rtl:rotate-180" aria-hidden="true" />
      </Link>
    </li>
  );
}
