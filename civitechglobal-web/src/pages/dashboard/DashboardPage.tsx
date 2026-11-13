import { Link } from 'react-router';
import {
  ChevronRight,
  ClipboardList,
  Code2,
  FileText,
  Handshake,
  MessagesSquare,
  Package,
  PackageSearch,
  Store,
  UserPlus,
  Users,
} from 'lucide-react';
import { useSendVerificationEmail } from '@/api/accountRecovery';
import { useCapabilities } from '@/api/capabilities';
import { useOwnVerification } from '@/api/marketplace';
import { useWorkspace } from '@/api/workspace';
import {
  ActivityPanel,
  ClientPanel,
  FreelancePanel,
  GetStartedPanel,
  HiringPanel,
  JobSearchPanel,
  NextStepsPanel,
  SellingPanel,
  type SetupStep,
} from '@/components/app/WorkspacePanels';
import { useOwnShops } from '@/api/trademaster';
import type { OwnShop } from '@/types/trademaster';
import { moderationVariant } from '@/lib/marketplace';
import { features } from '@/lib/features';
import { isApiError } from '@/config/api';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { PageHeader } from '@/components/app/PageHeader';
import { Panel } from '@/components/app/Panel';
import { StatCard, StatGrid } from '@/components/app/StatCard';
import { Badge } from '@/components/ui/Badge';

/**
 * The member home.
 *
 * Answers, in this order: what should I do next, how are the parts I play
 * going, and what else could I do here.
 *
 * - The figures across the top are only those for parts the member plays.
 *   Five zeros on a new account read as five things they are failing at.
 * - "Your next steps" is one ranked list — what is waiting on them, then what
 *   is left of setting the account up — with the first step set apart.
 * - One panel per part they play; the parts they do not play yet are offered
 *   together at the foot.
 *
 * The account details card this page used to carry repeated the profile
 * screen and the user menu, so it is gone.
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
  // One request for the whole home: which parts this member plays, and what
  // is waiting in each. See workspace.service on the server.
  const { data: workspace, isLoading: statsLoading } = useWorkspace(Boolean(user));
  const { data: verification } = useOwnVerification(Boolean(user));
  // Only when the module exists. Asking every member for a shop list on a
  // deployment that has no marketplace is a request that can only ever answer
  // 404, once per visit to the home screen.
  const { data: shops } = useOwnShops(features.tradeMaster && Boolean(user));

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : value.toLocaleString('en'));

  async function resendVerification() {
    try {
      await sendVerification.mutateAsync();
      showToast(t.auth.verifyBannerSent, 'success');
    } catch (error) {
      // The server explains a 501 here by naming the contact form, which is
      // more use than "something went wrong".
      showToast(isApiError(error) ? error.message : t.common.error, 'error');
    }
  }

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
            state: (user?.emailVerified === false ? 'todo' : 'done') as SetupStep['state'],
            onAction: () => void resendVerification(),
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

  const greeting = user
    ? `${t.dashboard.welcome}${locale === 'fa' ? '،' : ','} ${user.firstName}`
    : t.dashboard.welcome;

  const unreadTotal = workspace ? workspace.unread.messages + workspace.unread.notifications : 0;
  const figures = workspace
    ? [
        <StatCard
          key="messages"
          label={t.meStats.unreadMessages}
          value={unreadTotal}
          icon={MessagesSquare}
          to="/dashboard/messages"
          tone={unreadTotal > 0 ? 'attention' : 'neutral'}
        />,
        ...(workspace.hiring.postings > 0
          ? [
              <StatCard
                key="applicants"
                label={t.workspace.applicants}
                value={workspace.hiring.applicants}
                icon={Users}
                to="/dashboard/jobs"
                tone={workspace.hiring.unseen > 0 ? 'attention' : 'neutral'}
                hint={
                  workspace.hiring.unseen > 0
                    ? `${number(workspace.hiring.unseen)} ${t.workspace.newApplicants}`
                    : undefined
                }
              />,
            ]
          : []),
        ...(workspace.jobSearch.applications > 0
          ? [
              <StatCard
                key="applications"
                label={t.meStats.applications}
                value={workspace.jobSearch.applications}
                icon={FileText}
                to="/dashboard/applications"
              />,
            ]
          : []),
        ...(workspace.collaborations.active + workspace.collaborations.completed > 0
          ? [
              <StatCard
                key="collaborations"
                label={t.workspace.collaborationsTitle}
                value={workspace.collaborations.active}
                icon={Handshake}
                to="/dashboard/awards"
                tone="positive"
                hint={
                  workspace.collaborations.completed > 0
                    ? `${number(workspace.collaborations.completed)} ${t.workspace.completedLabel}`
                    : undefined
                }
              />,
            ]
          : []),
        ...(workspace.trackedRequests > 0
          ? [
              <StatCard
                key="requests"
                label={t.workspace.requestsTitle}
                value={workspace.trackedRequests}
                icon={ClipboardList}
                to="/dashboard/requests"
              />,
            ]
          : []),
      ]
    : [];
  const columns = Math.min(5, Math.max(3, figures.length)) as 3 | 4 | 5;

  return (
    <div>
      <PageHeader
        title={greeting}
        description={t.app.memberOverviewDescription}
        summary={
          statsLoading ? (
            <StatGrid columns={3}>
              <StatCard label={t.meStats.unreadMessages} value={undefined} loading icon={MessagesSquare} />
            </StatGrid>
          ) : figures.length > 1 ? (
            <StatGrid columns={columns}>{figures}</StatGrid>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          {workspace && <NextStepsPanel data={workspace} setup={steps} />}

          {/* Only for people who actually sell something. A panel headed "your
              shops" that is empty for every other member is a permanent
              reminder of a thing they did not ask to do. */}
          {(shops?.length ?? 0) > 0 && (
            <Panel
              title={t.trademaster.myShops}
              viewAll={{ to: '/dashboard/shops', label: t.common.view }}
              flush
            >
              <ul className="divide-y divide-app-border-light">
                {shops?.map((shop) => (
                  <ShopRow key={shop.id} shop={shop} number={number} />
                ))}
              </ul>
            </Panel>
          )}

          {/* One panel per part this member plays; the parts they do not
              play yet are offered together at the foot. */}
          {workspace && workspace.hiring.postings > 0 && <HiringPanel data={workspace} />}
          {workspace &&
            (workspace.jobSearch.applications > 0 ||
              workspace.jobSearch.savedJobs > 0 ||
              workspace.jobSearch.activeAlerts > 0) && <JobSearchPanel data={workspace} />}
          {workspace && workspace.client.projects > 0 && <ClientPanel data={workspace} />}
          {workspace && workspace.freelance.bids > 0 && <FreelancePanel data={workspace} />}
          {workspace && workspace.selling.books > 0 && <SellingPanel data={workspace} />}
          {workspace && <GetStartedPanel data={workspace} />}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {workspace && <ActivityPanel data={workspace} />}

          <Panel title={t.dashboard.quickActions} flush>
            <ul className="divide-y divide-app-border-light">
              <QuickAction to="/start-project" icon={<Code2 />} label={t.nav.startProject} />
              <QuickAction to="/join" icon={<UserPlus />} label={t.join.title} />
              <QuickAction to="/track" icon={<PackageSearch />} label={t.nav.track} />
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/**
 * One shop, as its owner needs to see it from the home screen.
 *
 * The moderation status and the reviewer's note are the whole point. A seller
 * whose shop is sitting in CHANGES_REQUESTED has something to do and no way
 * to find that out without opening the shops screen; here it is the first
 * thing on the row, in the colour that says so.
 */
function ShopRow({ shop, number }: { shop: OwnShop; number: (value: number) => string }) {
  const { t } = useLocale();

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
      <Store className="size-4 shrink-0 text-app-icon" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-body font-medium text-app-text">{shop.name}</span>

      <span className="inline-flex items-center gap-1 text-caption text-app-text-3">
        <Package className="size-3.5" aria-hidden="true" />
        {t.trademaster.productCount.replace('{count}', number(shop.productCount))}
      </span>

      <Badge variant={moderationVariant(shop.moderationStatus)}>
        {t.market[shop.moderationStatus]}
      </Badge>

      {shop.reviewNote && (
        <p className="w-full text-caption text-app-text-2">
          <span className="font-medium">{t.market.reviewNote}: </span>
          {shop.reviewNote}
        </p>
      )}
    </li>
  );
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
