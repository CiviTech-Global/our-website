import { useState, type FormEvent } from 'react';
import { Check, Clock, HelpCircle } from 'lucide-react';
import { useReviewTimesheet, useSubmitTimesheet } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { fill, formatNumber } from '@/lib/jobFormat';
import { hoursText, money, weekStartIso } from '@/lib/workFormat';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import type { AwardView } from '@/types/marketplace';
import type { Timesheet } from '@/types/work';

/**
 * An hourly contract's weeks: the rate and limit, what has been approved and
 * what it comes to, every week logged — and, depending on the side, the form
 * to log a week or the buttons to approve or query one.
 */
export function TimesheetPanel({ award }: { award: AwardView }) {
  const { t, locale } = useLocale();
  const sheets = award.timesheets ?? [];
  const approvedMinutes = sheets.filter((sheet) => sheet.status === 'APPROVED').reduce((sum, sheet) => sum + sheet.minutes, 0);
  const rate = award.award.hourlyRate ? BigInt(award.award.hourlyRate) : null;
  // Whole minutes times a whole rate, divided once at the end: no rounding on the way.
  const owed = rate === null ? null : ((rate * BigInt(approvedMinutes)) / 60n).toString();
  const active = award.award.status === 'ACTIVE' && award.award.disputeStatus !== 'OPEN';

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-default p-4" aria-label={t.work.timesheets}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-medium text-text-primary">
          <Clock className="size-4" aria-hidden="true" />
          {t.work.timesheets}
        </h2>
        <p className="text-sm text-text-secondary">
          {t.work.hourlyRate}: {money(award.award.hourlyRate, award.award.currency, locale, t)} {t.work.perHour} ·{' '}
          {award.award.weeklyHourLimit
            ? fill(t.work.weeklyLimit, { hours: formatNumber(award.award.weeklyHourLimit, locale) })
            : t.work.noWeeklyLimit}
        </p>
      </div>
      <p className="text-sm font-medium text-text-primary">
        {fill(t.work.totalApproved, {
          hours: hoursText(approvedMinutes, locale),
          amount: money(owed, award.award.currency, locale, t) ?? '—',
        })}
      </p>

      {sheets.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t.work.noTimesheets}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sheets.map((sheet) => (
            <SheetRow key={sheet.id} sheet={sheet} canReview={active && award.myRole === 'author'} />
          ))}
        </ul>
      )}

      {active && award.myRole === 'counterparty' && <LogHoursForm awardId={award.award.id} limit={award.award.weeklyHourLimit ?? null} />}
    </section>
  );
}

function SheetRow({ sheet, canReview }: { sheet: Timesheet; canReview: boolean }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const review = useReviewTimesheet();
  const [querying, setQuerying] = useState(false);
  const [note, setNote] = useState('');

  async function decide(decision: 'APPROVED' | 'QUERIED') {
    try {
      await review.mutateAsync({ id: sheet.id, decision, note: decision === 'QUERIED' ? note.trim() : undefined });
      setQuerying(false);
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <li className="rounded-lg bg-surface-muted p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-text-primary">{fill(t.work.weekOf, { date: formatDate(sheet.weekStart, locale) })}</span>
        <span className="flex items-center gap-2">
          <span className="font-semibold text-text-primary">{hoursText(sheet.minutes, locale)}</span>
          <Badge variant={sheet.status === 'APPROVED' ? 'success' : sheet.status === 'QUERIED' ? 'warning' : 'info'}>
            {t.work.timesheetStatus[sheet.status]}
          </Badge>
        </span>
      </div>
      <p className="mt-1 whitespace-pre-line text-text-secondary">{sheet.memo}</p>
      {sheet.clientNote && <p className="mt-1 text-brand-amber-800 dark:text-brand-amber-300">{sheet.clientNote}</p>}
      {canReview && sheet.status === 'SUBMITTED' && (
        <div className="mt-2 flex flex-col gap-2">
          {querying && (
            <TextArea aria-label={t.work.queryNote} placeholder={t.work.queryNote} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          )}
          <div className="flex gap-2">
            <Button size="sm" isLoading={review.isPending} onClick={() => void decide('APPROVED')}>
              <Check className="size-4" aria-hidden="true" />
              {t.work.approve}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={querying && !note.trim()}
              onClick={() => (querying ? void decide('QUERIED') : setQuerying(true))}
            >
              <HelpCircle className="size-4" aria-hidden="true" />
              {t.work.query}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function LogHoursForm({ awardId, limit }: { awardId: string; limit: number | null }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const submit = useSubmitTimesheet();
  const [week, setWeek] = useState(weekStartIso(new Date()));
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('0');
  const [memo, setMemo] = useState('');

  async function handle(event: FormEvent) {
    event.preventDefault();
    const total = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
    try {
      await submit.mutateAsync({ awardId, weekStart: weekStartIso(new Date(week)), minutes: total, memo: memo.trim() });
      showToast(t.work.hoursLogged, 'success');
      setHours('');
      setMinutes('0');
      setMemo('');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <form className="flex flex-col gap-3 border-t border-border-default pt-3" onSubmit={handle}>
      <h3 className="text-sm font-medium text-text-primary">{t.work.logHours}</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label={t.work.weekOf.replace('{date}', '').trim()} htmlFor={`week-${awardId}`}>
          <Input id={`week-${awardId}`} type="date" className="ltr" required value={week} onChange={(e) => setWeek(e.target.value)} />
        </FormField>
        <FormField label={t.work.hours} htmlFor={`hours-${awardId}`}>
          <Input
            id={`hours-${awardId}`}
            type="number"
            min={0}
            max={limit ?? 168}
            className="ltr"
            required
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </FormField>
        <FormField label={t.work.minutes} htmlFor={`minutes-${awardId}`}>
          <Input id={`minutes-${awardId}`} type="number" min={0} max={59} step={5} className="ltr" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </FormField>
      </div>
      <FormField label={t.work.workMemo} htmlFor={`memo-${awardId}`}>
        <TextArea id={`memo-${awardId}`} required minLength={5} maxLength={2000} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </FormField>
      <Button type="submit" size="sm" className="self-start" isLoading={submit.isPending}>
        {t.work.logHours}
      </Button>
    </form>
  );
}
