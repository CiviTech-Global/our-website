import { Link } from 'react-router';
import { AlertCircle, ClipboardList, Code2, Mail, UserPlus, Users } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useAdminDashboard } from '@/api/admin';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { StatusDonut } from '@/components/admin/StatusDonut';
import { leadStatusLabel } from '@/lib/leadStatus';
import type { IntakeCount, LeadStatus } from '@/types/requests';

export default function AdminDashboardPage() {
  const { t } = useLocale();
  useDocumentTitle(t.admin.dashboard);
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
          {/* Software work leads, because that is the business. Each tile is a
              link: seeing a queue has five things waiting is only useful if
              opening it is the next click. */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IntakeTile
              delay={0.05}
              to="/admin/projects"
              label={t.proposal.adminTitle}
              count={data.intake.projects}
              openLabel={t.admin.awaitingUs}
              icon={<Code2 className="size-6" aria-hidden="true" />}
              tone="green"
            />
            <IntakeTile
              delay={0.1}
              to="/admin/resumes"
              label={t.join.adminTitle}
              count={data.intake.resumes}
              openLabel={t.admin.awaitingUs}
              icon={<UserPlus className="size-6" aria-hidden="true" />}
              tone="amber"
            />
            <IntakeTile
              delay={0.15}
              to="/admin/requests"
              label={t.admin.requests}
              count={data.intake.insurance}
              openLabel={t.admin.awaitingUs}
              icon={<ClipboardList className="size-6" aria-hidden="true" />}
              tone="slate"
            />
            <IntakeTile
              delay={0.2}
              to="/admin/messages"
              label={t.contact.inboxTitle}
              count={data.intake.messages}
              openLabel={t.admin.unread}
              icon={<Mail className="size-6" aria-hidden="true" />}
              tone="slate"
            />
          </div>

          <AnimatedSection delay={0.25} className="mt-4">
            <Card className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-surface-200 text-text-secondary">
                <Users className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm text-text-secondary">{t.admin.totalUsers}</p>
                <p className="text-2xl font-semibold text-text-primary">{data.totalUsers}</p>
              </div>
            </Card>
          </AnimatedSection>

          <AnimatedSection delay={0.3} className="mt-6">
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

// Colour carries priority here, not identity — the icon and label already say
// which queue this is. Software work is the business, so it is the one tile in
// the brand colour.
const TONES = {
  green: 'bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400',
  amber: 'bg-brand-amber-500/10 text-brand-amber-600 dark:text-brand-amber-400',
  slate: 'bg-surface-200 text-text-secondary',
} as const;

function IntakeTile({
  to,
  label,
  count,
  openLabel,
  icon,
  tone,
  delay,
}: {
  to: string;
  label: string;
  count: IntakeCount;
  openLabel: string;
  icon: React.ReactNode;
  tone: keyof typeof TONES;
  delay: number;
}) {
  return (
    <AnimatedSection delay={delay}>
      <Link to={to} className="block h-full rounded-2xl transition-transform hover:-translate-y-0.5">
        <Card className="flex h-full items-center gap-4">
          <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
            {icon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm text-text-secondary">{label}</p>
            <p className="text-2xl font-semibold text-text-primary">{count.total}</p>
            {count.open > 0 && (
              <p className="mt-0.5 text-xs font-medium text-brand-amber-600 dark:text-brand-amber-400">
                {count.open} {openLabel}
              </p>
            )}
          </div>
        </Card>
      </Link>
    </AnimatedSection>
  );
}
