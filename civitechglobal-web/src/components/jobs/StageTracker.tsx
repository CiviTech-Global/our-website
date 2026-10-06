import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import type { OwnApplication } from '@/types/marketplace';

/**
 * Where an application has got to, as a row of lamps: sent, seen by the
 * employer, shortlisted, interview, decision. The question every applicant
 * asks — "has anyone even looked?" — answered at a glance, and a "no" said as
 * plainly as a "yes".
 */
export function StageTracker({ application }: { application: Pick<OwnApplication, 'outcome' | 'employerSeenAt'> }) {
  const { t } = useLocale();
  const outcome = application.outcome;
  const declined = outcome === 'DECLINED';
  const reached = [
    true,
    Boolean(application.employerSeenAt) || outcome !== 'PENDING',
    outcome === 'SHORTLISTED' || outcome === 'INTERVIEW' || outcome === 'ACCEPTED',
    outcome === 'INTERVIEW' || outcome === 'ACCEPTED',
    outcome === 'ACCEPTED' || declined,
  ];
  const labels = [
    t.jobs.stageApplied,
    t.jobs.stageSeen,
    t.jobs.stageShortlisted,
    t.jobs.stageInterview,
    outcome === 'ACCEPTED' ? t.market.ACCEPTED : declined ? t.jobs.stageNotSelected : t.jobs.stageDecision,
  ];
  // The furthest step reached is the current one; the line between lamps
  // fills up to it.
  const current = reached.lastIndexOf(true);

  return (
    <ol aria-label={t.jobs.stageProgress} className="mt-3 flex items-start">
      {labels.map((label, index) => {
        const done = reached[index];
        const last = index === labels.length - 1;
        return (
          <li
            key={label}
            aria-current={index === current ? 'step' : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
          >
            {!last && (
              <span
                className={cn(
                  'absolute top-[5px] h-0.5 w-full ltr:left-1/2 rtl:right-1/2',
                  // Joins two steps only when both were reached: a decline skips the
                  // middle, and a green line through it would say otherwise.
                  done && reached[index + 1] ? 'bg-app-primary' : 'bg-app-border',
                )}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                'app-led relative z-10 !size-3',
                !done && 'app-led-off',
                last && declined && '!bg-status-error !shadow-[0_0_6px_var(--color-status-error)]',
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'truncate px-1 text-caption',
                index === current ? 'font-semibold text-app-text' : done ? 'text-app-text-3' : 'text-app-text-4',
                last && declined && 'text-status-error',
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
