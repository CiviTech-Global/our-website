import { CheckCircle2, CircleUserRound, ShieldCheck } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export default function DashboardPage() {
  const { t } = useLocale();
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
    </div>
  );
}
