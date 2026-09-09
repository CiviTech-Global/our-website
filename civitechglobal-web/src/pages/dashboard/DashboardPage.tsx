import { Link } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  CircleUserRound,
  Code2,
  PackageSearch,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useAuth } from '@/contexts/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export default function DashboardPage() {
  const { t } = useLocale();
  useDocumentTitle(t.nav.dashboard);
  const { user } = useAuth();

  const hasPhone = Boolean(user?.phone);
  const completion = hasPhone ? 100 : 66;

  return (
    <div className="mx-auto max-w-4xl">
      <AnimatedSection>
        <h1 className="text-2xl font-semibold text-text-primary">
          {t.dashboard.welcome}, {user?.firstName}
        </h1>
      </AnimatedSection>

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
