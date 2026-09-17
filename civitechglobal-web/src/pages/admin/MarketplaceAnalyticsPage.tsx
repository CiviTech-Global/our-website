import { AlertTriangle, CheckCircle2, Handshake, Star } from 'lucide-react';
import { ArrivalsChart } from '@/components/app/ArrivalsChart';
import { StatCard, StatGrid } from '@/components/app/StatCard';
import { PageHeader } from '@/components/app/PageHeader';
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

  // The deepest queue sets the scale for every bar in the queue panel.
  const queueCeiling = Math.max(
    1,
    ...queueDefs.map((queue) => Object.values(data.queues[queue.key] ?? {}).reduce((sum, count) => sum + count, 0))
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.analytics.title}
        className="mb-2"
        summary={
          <StatGrid columns={4}>
            <StatCard label={t.analytics.totalAwards} value={digits(data.awards.total)} icon={Handshake} />
            <StatCard
              label={t.analytics.completionRate}
              value={
                data.awards.completionRate === null
                  ? '—'
                  : `${digits(data.awards.completionRate)}${locale === 'fa' ? '٪' : '%'}`
              }
              icon={CheckCircle2}
            />
            <StatCard
              label={t.analytics.openDisputes}
              value={digits(data.awards.openDisputes)}
              icon={AlertTriangle}
              tone={data.awards.openDisputes > 0 ? 'critical' : 'neutral'}
            />
            <StatCard
              label={t.analytics.featuredListings}
              value={digits(data.featured.jobs + data.featured.projects)}
              icon={Star}
            />
          </StatGrid>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-title-sm font-semibold text-app-text">{t.analytics.queueDepths}</h2>
          {/* Bars are scaled against the deepest queue, not against their own
              total: the point of the panel is which queue is worst, and a row
              that always fills its track cannot say that. */}
          <div className="flex flex-col gap-4">
            {queueDefs.map((queue) => {
              const rows = data.queues[queue.key] ?? {};
              const total = Object.values(rows).reduce((sum, count) => sum + count, 0);
              return (
                <div key={queue.key}>
                  <div className="mb-1 flex items-center justify-between text-body">
                    <span className="font-medium text-app-text">{queue.label}</span>
                    <span className="tabular-nums text-app-text-3">{digits(total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-app-fill">
                    <span
                      className="block h-full rounded-full bg-app-primary"
                      style={{ width: `${total === 0 ? 0 : Math.max(2, (total / queueCeiling) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-title-sm font-semibold text-app-text">{t.analytics.reviewSpeed}</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(data.reviewSpeedHours).map(([key, hours]) => (
              <div key={key} className="rounded border border-app-border-light p-3">
                <p className="text-label text-app-text-4">
                  {key === 'jobs'
                    ? t.market.queueJobs
                    : key === 'projects'
                      ? t.market.queueProjects
                      : key === 'applications'
                        ? t.market.queueApplications
                        : t.market.queueBids}
                </p>
                <p className="text-title-sm font-semibold text-app-text">
                  {hours === null ? '—' : locale === 'fa' ? toPersianDigits(hours) : hours}
                  <span className="ms-1 text-label font-normal text-app-text-4">{t.analytics.hoursSuffix}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {disputes && disputes.length > 0 && (
        <Card>
          <h2 className="mb-4 text-title-sm font-semibold text-app-text">
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
          <h2 className="mb-4 text-title-sm font-semibold text-app-text">{t.analytics.weeklyTrend}</h2>
          <ArrivalsChart
            label={t.analytics.weeklyTrend}
            points={data.weeklyTrend.map((week) => ({ day: week.week, count: week.jobs + week.projects }))}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-title-sm font-semibold text-app-text">{t.analytics.topSkills}</h2>
          <div className="flex flex-wrap gap-2">
            {data.topSkills.length === 0 && <p className="text-body text-app-text-4">{t.analytics.empty}</p>}
            {data.topSkills.map((skill) => (
              <span key={skill.value} className="rounded-full bg-app-fill px-3 py-1 text-body text-app-text">
                {skill.value} · {digits(skill.total)}
              </span>
            ))}
          </div>
          <h2 className="mb-3 mt-6 text-title-sm font-semibold text-app-text">{t.analytics.topCategories}</h2>
          <div className="flex flex-wrap gap-2">
            {data.topCategories.length === 0 && <p className="text-body text-app-text-4">{t.analytics.empty}</p>}
            {data.topCategories.map((category) => (
              <span key={category.value} className="rounded-full border border-app-border-light px-3 py-1 text-body text-app-text-3">
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
    <li className="flex flex-col gap-2 rounded border border-app-border-light p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/${dispute.kind === 'job' ? 'jobs' : 'projects'}/${dispute.listing.code}`}
          className="font-medium text-app-text hover:underline"
        >
          {dispute.listing.title}
        </Link>
        <span className="text-label text-app-text-4">
          {dispute.disputeOpenedAt
            ? formatDate(dispute.disputeOpenedAt, locale)
            : ''}
        </span>
      </div>
      {dispute.disputeReason && (
        <p className="whitespace-pre-line text-body text-app-text-3">{dispute.disputeReason}</p>
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

