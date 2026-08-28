import { Users, ClipboardList, AlertCircle } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAdminDashboard } from '@/api/admin';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { StatusDonut } from '@/components/admin/StatusDonut';
import { leadStatusLabel } from '@/lib/leadStatus';
import type { LeadStatus } from '@/types/leads';

export default function AdminDashboardPage() {
  const { t } = useLocale();
  const { data, isLoading, isError } = useAdminDashboard();

  return (
    <div className="mx-auto max-w-5xl">
      <AnimatedSection>
        <h1 className="text-2xl font-semibold text-text-primary">{t.admin.dashboard}</h1>
      </AnimatedSection>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {isError && !isLoading && (
        <Card className="mt-6 flex items-center gap-3 border-brand-red-500/30">
          <AlertCircle className="size-5 text-brand-red-500" aria-hidden="true" />
          <p className="text-sm text-text-secondary">{t.errors.networkError}</p>
        </Card>
      )}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AnimatedSection delay={0.05}>
              <Card className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400">
                  <Users className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm text-text-secondary">{t.admin.totalUsers}</p>
                  <p className="text-2xl font-semibold text-text-primary">{data.totalUsers}</p>
                </div>
              </Card>
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <Card className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-amber-500/10 text-brand-amber-600 dark:text-brand-amber-400">
                  <ClipboardList className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm text-text-secondary">{t.admin.totalLeads}</p>
                  <p className="text-2xl font-semibold text-text-primary">{data.totalLeads}</p>
                </div>
              </Card>
            </AnimatedSection>
          </div>

          <AnimatedSection delay={0.15} className="mt-6">
            <Card>
              <h2 className="mb-6 text-lg font-semibold text-text-primary">{t.admin.leadsByStatus}</h2>
              <StatusDonut
                data={Object.entries(data.leadsByStatus).map(([status, value]) => ({
                  label: leadStatusLabel(t, status as LeadStatus),
                  value,
                }))}
              />
            </Card>
          </AnimatedSection>
        </>
      )}
    </div>
  );
}
