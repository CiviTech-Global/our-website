import { Link } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  CircleUserRound,
  Code2,
  MailWarning,
  PackageSearch,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useSendVerificationEmail } from '@/api/accountRecovery';
import { isApiError } from '@/config/api';
import { useOwnMarketplaceStats, useOwnVerification } from '@/api/marketplace';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useAuth } from '@/contexts/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export default function DashboardPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const sendVerification = useSendVerificationEmail();
  useDocumentTitle(t.nav.dashboard);
  const { user } = useAuth();
  const { data: stats } = useOwnMarketplaceStats(Boolean(user));
  const { data: verification } = useOwnVerification(Boolean(user));

  const hasPhone = Boolean(user?.phone);
  const completion = hasPhone ? 100 : 66;

  return (
    <div className="mx-auto max-w-4xl">
      <AnimatedSection>
        <h1 className="text-2xl font-semibold text-text-primary">
          {t.dashboard.welcome}, {user?.firstName}
        </h1>
      </AnimatedSection>

      {/* Only while it matters. A banner that stays after the thing is done is
          how people learn to stop reading banners. */}
      {user?.emailVerified === false && (
        <AnimatedSection delay={0.02} className="mt-6">
          <Card className="flex flex-wrap items-center gap-3 border-brand-amber-500/40">
            <MailWarning
              className="size-5 shrink-0 text-brand-amber-500"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary">{t.auth.verifyBannerTitle}</p>
              <p className="mt-0.5 text-sm text-text-secondary">{t.auth.verifyBannerBody}</p>
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
                  showToast(
                    isApiError(error) ? error.message : t.common.error,
                    'error'
                  );
                }
              }}
            >
              {t.auth.verifyBannerAction}
            </Button>
          </Card>
        </AnimatedSection>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatedSection delay={0.05}>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <CircleUserRound className="size-6 text-brand-green-500" aria-hidden="true" />
              <span className="text-sm font-medium text-text-secondary">{completion}%</span>
            </div>
            <p className="text-sm font-medium text-text-primary">{t.dashboard.profileCompletionTitle}</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-200">
              <div
                className="h-full rounded-full bg-brand-green-500 transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </Card>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <CheckCircle2 className="size-6 text-brand-green-500" aria-hidden="true" />
              <Badge variant="success">{t.dashboard.accountStatusActive}</Badge>
            </div>
            <p className="text-sm font-medium text-text-primary">{t.dashboard.accountStatusTitle}</p>
          </Card>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <ShieldCheck className="size-6 text-brand-amber-500" aria-hidden="true" />
              <Badge variant="info">{user?.role}</Badge>
            </div>
            <p className="text-sm font-medium text-text-primary">{t.dashboard.roleTitle}</p>
          </Card>
        </AnimatedSection>
      </div>

      {stats && (
        <AnimatedSection delay={0.18} className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary">{t.meStats.sectionTitle}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatLink to="/dashboard/jobs" label={t.meStats.listings} value={stats.listings.total} />
            <StatLink to="/dashboard/jobs" label={t.meStats.views} value={stats.listings.views} />
            <StatLink to="/dashboard/applications" label={t.meStats.applications} value={stats.applications.total} />
            <StatLink to="/dashboard/bids" label={t.meStats.bids} value={stats.bids.total} />
            <StatLink to="/dashboard/awards" label={t.meStats.wonAwards} value={stats.awards.won} />
            <StatLink
              to="/dashboard/messages"
              label={t.meStats.unreadMessages}
              value={stats.unread.messages + stats.unread.notifications}
            />
          </div>
        </AnimatedSection>
      )}

      {verification && verification.status !== 'APPROVED' && (
        <AnimatedSection delay={0.19} className="mt-6">
          <Card className="flex flex-wrap items-center gap-3 border-brand-amber-500/40">
            <ShieldCheck className="size-5 shrink-0 text-brand-amber-500" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm text-text-secondary">{t.meStats.verificationNudge}</p>
            <Link to="/dashboard/verification">
              <Button type="button" variant="secondary">
                {t.market.verificationTitle}
              </Button>
            </Link>
          </Card>
        </AnimatedSection>
      )}

      {/* Submissions are tracked by code, not tied to an account, so there is no
          list of "your requests" to show here. Links to the things an account
          holder actually came to do are more use than an empty table. */}
      <AnimatedSection delay={0.2} className="mt-8">
        <h2 className="text-lg font-semibold text-text-primary">{t.dashboard.quickActions}</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <QuickAction
            to="/start-project"
            icon={<Code2 className="size-5" aria-hidden="true" />}
            label={t.nav.startProject}
          />
          <QuickAction
            to="/join"
            icon={<UserPlus className="size-5" aria-hidden="true" />}
            label={t.join.title}
          />
          <QuickAction
            to="/track"
            icon={<PackageSearch className="size-5" aria-hidden="true" />}
            label={t.nav.track}
          />
        </div>
      </AnimatedSection>
    </div>
  );
}

function StatLink({ to, label, value }: { to: string; label: string; value: number }) {
  return (
    <Link to={to} className="block transition-transform hover:-translate-y-0.5">
      <Card className="flex h-full flex-col gap-1">
        <span className="text-xl font-bold text-text-primary">{value}</span>
        <span className="text-xs text-text-secondary">{label}</span>
      </Card>
    </Link>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="block rounded-2xl transition-transform hover:-translate-y-0.5">
      <Card className="flex h-full items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{label}</span>
        <ArrowLeft className="size-4 shrink-0 text-text-muted ltr:rotate-180" aria-hidden="true" />
      </Card>
    </Link>
  );
}
