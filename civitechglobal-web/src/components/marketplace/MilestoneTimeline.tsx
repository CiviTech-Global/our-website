import { Check, Clock, Loader2, Paperclip } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { cn } from '@/lib/utils';
import type { AwardMilestone } from '@/types/marketplace';

interface MilestoneTimelineProps {
  milestones: AwardMilestone[];
}

const STATUS_STYLES: Record<AwardMilestone['status'], string> = {
  APPROVED: 'border-brand-green-500 bg-brand-green-500 text-white',
  IN_REVIEW: 'border-brand-amber-500 bg-brand-amber-500 text-white',
  PENDING: 'border-surface-300 bg-surface-100 text-text-muted dark:border-surface-300 dark:bg-surface-200',
};

function StatusIcon({ status }: { status: AwardMilestone['status'] }) {
  if (status === 'APPROVED') return <Check className="size-4" aria-hidden />;
  if (status === 'IN_REVIEW') return <Loader2 className="size-4 animate-spin" aria-hidden />;
  return <Clock className="size-4" aria-hidden />;
}

/**
 * The work plan as a vertical stepper. The author reads it top to bottom as
 * "what I asked for and what came back"; the doer reads it as "what I owe
 * next". Same component both ways — the actions around it differ by role.
 */
export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  const { t, locale } = useLocale();

  return (
    <ol className="relative flex flex-col gap-0 border-s-2 border-surface-200 ms-2 dark:border-surface-300">
      {milestones.map((milestone) => (
        <li key={milestone.id} className="relative pb-6 ps-6 last:pb-0">
          <span
            className={cn(
              'absolute -start-[15px] flex size-7 items-center justify-center rounded-full border-2',
              STATUS_STYLES[milestone.status],
            )}
          >
            <StatusIcon status={milestone.status} />
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-text-primary">{milestone.title}</span>
              <span className="text-xs text-text-muted">
                {milestone.status === 'APPROVED'
                  ? t.market.approvedState
                  : t.market[milestone.status === 'IN_REVIEW' ? 'milestoneInReview' : 'milestonePending']}
              </span>
            </div>
            {milestone.description && (
              <p className="text-sm text-text-secondary">{milestone.description}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
              {milestone.dueDate && (
                <span>
                  {t.market.milestoneDue}: {formatDate(milestone.dueDate, locale)}
                </span>
              )}
              {milestone.deliveredAt && (
                <span>
                  {t.market.deliveredLabel}: {formatDate(milestone.deliveredAt, locale)}
                </span>
              )}
              {milestone.deliveryOriginalName && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="size-3" aria-hidden />
                  {milestone.deliveryOriginalName}
                </span>
              )}
            </div>
            {milestone.deliveryNote && (
              <p className="whitespace-pre-line rounded-lg bg-surface-100 p-2 text-sm text-text-primary dark:bg-surface-200">
                {milestone.deliveryNote}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
