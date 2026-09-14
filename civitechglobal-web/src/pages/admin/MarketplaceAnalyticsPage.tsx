import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useToast } from '@/contexts/ToastContext';
import { apiMessage } from '@/lib/apiMessage';
import {
  useMarketplaceAnalytics,
  useOpenDisputes,
  useResolveDispute,
  type OpenDisputeRow,
} from '@/api/marketplace';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { formatDate, toPersianDigits } from '@/i18n/utils';

/**
 * The marketplace health view. Counts over known windows, rendered as plain
 * cards and CSS bars — this dashboard answers "how is it going and where is
 * the queue stuck", and a number you can read beats a chart you can admire.
 */
export default function MarketplaceAnalyticsPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const canView = user?.role === 'SUPER_ADMIN' || user?.permissions.includes('analytics');
  const canOps = user?.role === 'SUPER_ADMIN' || user?.permissions.includes('marketplace-ops');
  const { data, isLoading } = useMarketplaceAnalytics(Boolean(canView));
  const { data: disputes } = useOpenDisputes(Boolean(canOps));

  useDocumentTitle(t.analytics.title);

  const digits = (value: number | null | undefined) =>
    value === null || value === undefined ? '—' : locale === 'fa' ? toPersianDigits(value) : value;

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  const queueDefs = [
    { key: 'jobs', label: t.market.queueJobs },
    { key: 'projects', label: t.market.queueProjects },
    { key: 'verifications', label: t.market.queueVerifications },
    { key: 'applications', label: t.market.queueApplications },
    { key: 'bids', label: t.market.queueBids },
  ];

  const maxWeekly = Math.max(1, ...data.weeklyTrend.map((week) => week.jobs + week.projects));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text-primary">{t.analytics.title}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t.analytics.totalAwards} value={digits(data.awards.total)} />
        <StatCard
          label={t.analytics.completionRate}
          value={data.awards.completionRate === null ? '—' : `${digits(data.awards.completionRate)}٪`}
        />
        <StatCard label={t.analytics.openDisputes} value={digits(data.awards.openDisputes)} />
        <StatCard
          label={t.analytics.featuredListings}
          value={digits(data.featured.jobs + data.featured.projects)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">{t.analytics.queueDepths}</h2>
          <div className="flex flex-col gap-4">
            {queueDefs.map((queue) => {
              const rows = data.queues[queue.key] ?? {};
              const entries = Object.entries(rows);
              const total = entries.reduce((sum, [, count]) => sum + count, 0);
              return (
                <div key={queue.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-text-primary">{queue.label}</span>
                    <span className="text-text-muted">{digits(total)}</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-300">
                    {entries.map(([status, count]) => (
                      <span
                        key={status}
                        title={`${status}: ${count}`}
                        className="bg-brand-green-500 first:rounded-s-full last:rounded-e-full"
                        style={{ width: `${total === 0 ? 0 : (count / total) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">{t.analytics.reviewSpeed}</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(data.reviewSpeedHours).map(([key, hours]) => (
              <div key={key} className="rounded-xl border border-surface-200 p-3 dark:border-surface-300">
                <p className="text-xs text-text-muted">
                  {key === 'jobs'
                    ? t.market.queueJobs
                    : key === 'projects'
                      ? t.market.queueProjects
                      : key === 'applications'
                        ? t.market.queueApplications
                        : t.market.queueBids}
                </p>
                <p className="text-lg font-semibold text-text-primary">
                  {hours === null ? '—' : locale === 'fa' ? toPersianDigits(hours) : hours}
                  <span className="ms-1 text-xs font-normal text-text-muted">{t.analytics.hoursSuffix}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {disputes && disputes.length > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            {t.analytics.openDisputes}
          </h2>
          <ul className="flex flex-col gap-3">
            {disputes.map((dispute) => (
              <DisputeRow key={dispute.awardId} dispute={dispute} />
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">{t.analytics.weeklyTrend}</h2>
          <div className="flex h-32 items-end gap-1">
            {data.weeklyTrend.map((week) => {
              const height = Math.round(((week.jobs + week.projects) / maxWeekly) * 100);
              return (
                <div key={week.week} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-col justify-end rounded-t bg-brand-green-500/80" style={{ height: `${Math.max(2, height)}%` }} title={`${week.week}: ${week.jobs + week.projects}`} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-text-primary">{t.analytics.topSkills}</h2>
          <div className="flex flex-wrap gap-2">
            {data.topSkills.length === 0 && <p className="text-sm text-text-muted">{t.analytics.empty}</p>}
            {data.topSkills.map((skill) => (
              <span key={skill.value} className="rounded-full bg-surface-200 px-3 py-1 text-sm text-text-primary dark:bg-surface-300">
                {skill.value} · {digits(skill.total)}
              </span>
            ))}
          </div>
          <h2 className="mb-3 mt-6 text-lg font-semibold text-text-primary">{t.analytics.topCategories}</h2>
          <div className="flex flex-wrap gap-2">
            {data.topCategories.length === 0 && <p className="text-sm text-text-muted">{t.analytics.empty}</p>}
            {data.topCategories.map((category) => (
              <span key={category.value} className="rounded-full border border-border-default px-3 py-1 text-sm text-text-secondary">
                {category.value} · {digits(category.total)}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DisputeRow({ dispute }: { dispute: OpenDisputeRow }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const resolve = useResolveDispute();
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-surface-200 p-3 dark:border-surface-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/${dispute.kind === 'job' ? 'jobs' : 'projects'}/${dispute.listing.code}`}
          className="font-medium text-text-primary hover:underline"
        >
          {dispute.listing.title}
        </Link>
        <span className="text-xs text-text-muted">
          {dispute.disputeOpenedAt
            ? formatDate(dispute.disputeOpenedAt, locale)
            : ''}
        </span>
      </div>
      {dispute.disputeReason && (
        <p className="whitespace-pre-line text-sm text-text-secondary">{dispute.disputeReason}</p>
      )}
      {open ? (
        <div className="flex flex-wrap items-end gap-2">
          <TextArea
            rows={2}
            className="min-w-60 flex-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label={t.ops.resolveDisputeNote}
          />
          <Button
            size="sm"
            isLoading={resolve.isPending}
            disabled={!note.trim()}
            onClick={async () => {
              try {
                await resolve.mutateAsync({ awardId: dispute.awardId, note: note.trim() });
                showToast(t.ops.disputeResolvedToast, 'success');
              } catch (error) {
                showToast(apiMessage(error, t.common.error), 'error');
              }
            }}
          >
            {t.ops.resolveDispute}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-fit" onClick={() => setOpen(true)}>
          {t.ops.resolveDispute}
        </Button>
      )}
    </li>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-2xl font-bold text-text-primary">{value}</span>
    </Card>
  );
}
