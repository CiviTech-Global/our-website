import { useState } from 'react';
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Compass,
  FileText,
  ListChecks,
  Scale,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router';
import { useRespondToProposal } from '@/api/projects';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { formatThousands } from '@/lib/persian';
import type { PublicProposal } from '@/types/project';

/**
 * The proposal, as the client reads it.
 *
 * Ordered the way it should be read rather than the way it is stored: what we
 * understood first, then what is included, then — with equal weight — what is
 * not, then the effort and the money, then the deadline for answering. The
 * exclusions are not tucked away at the bottom; they are the half of the scope
 * people are most likely to be surprised by later.
 */
export function ProposalView({
  proposal,
  trackingCode,
  onResponded,
}: {
  proposal: PublicProposal;
  trackingCode: string;
  onResponded: () => void;
}) {
  const { t, locale } = useLocale();
  const respond = useRespondToProposal();

  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<'ACCEPTED' | 'DECLINED' | null>(null);

  const decided = proposal.status === 'ACCEPTED' || proposal.status === 'DECLINED';
  const answerable = proposal.status === 'SENT' && !proposal.expired;

  async function send(choice: 'ACCEPTED' | 'DECLINED') {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t.proposal.errEmail);
      return;
    }
    try {
      await respond.mutateAsync({ trackingCode, email: email.trim(), decision: choice, note });
      setDecision(choice);
      onResponded();
    } catch (err) {
      setError(
        err instanceof AxiosError
          ? ((err.response?.data as { message?: string } | undefined)?.message ?? t.proposal.errSend)
          : t.proposal.errSend
      );
    }
  }

  const money = (value: string | null) =>
    value ? `${formatThousands(value)} ${t.project.currency}` : '—';

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-text-primary">
            {t.proposal.title} <span className="text-text-muted">v{proposal.version}</span>
          </h2>
          {proposal.expired ? (
            <Badge variant="danger">{t.proposal.expired}</Badge>
          ) : proposal.status === 'ACCEPTED' ? (
            <Badge variant="success">{t.proposal.accepted}</Badge>
          ) : proposal.status === 'DECLINED' ? (
            <Badge variant="default">{t.proposal.declined}</Badge>
          ) : (
            <Badge variant="info">{t.proposal.awaiting}</Badge>
          )}
        </div>

        <Link to={`/proposal/${trackingCode}`} className="mb-4 inline-block">
          <Button type="button" variant="secondary">
            <FileText className="size-4" />
            {t.proposal.openDocument}
          </Button>
        </Link>

        {proposal.message && (
          <p className="mb-4 rounded-lg border border-border-default bg-surface-50 p-3 text-sm leading-6 text-text-secondary">
            {proposal.message}
          </p>
        )}

        <h3 className="mb-1 text-sm font-semibold text-text-primary">{t.proposal.scope}</h3>
        <p className="text-sm leading-7 text-text-secondary">{proposal.scopeSummary}</p>
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <List
          icon={<ListChecks className="size-4 text-brand-green-500" />}
          title={t.proposal.deliverables}
          items={proposal.deliverables}
          tone="ok"
        />
        {/* Equal billing with the deliverables, deliberately. */}
        <List
          icon={<XCircle className="size-4 text-brand-red-500" />}
          title={t.proposal.exclusions}
          hint={t.proposal.exclusionsHint}
          items={proposal.exclusions}
          tone="bad"
        />
      </div>

      {proposal.assumptions.length > 0 && (
        <List
          icon={<AlertTriangle className="size-4 text-brand-amber-500" />}
          title={t.proposal.assumptions}
          hint={t.proposal.assumptionsHint}
          items={proposal.assumptions}
          tone="neutral"
        />
      )}

      {/* Effort and money. Both are ranges, and the page says why rather than
          letting a single number imply a precision that does not exist yet. */}
      <Card>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Scale className="size-4 text-brand-green-500" aria-hidden="true" />
          {t.proposal.estimate}
        </h3>
        <p className="mb-4 text-xs text-text-muted">{t.proposal.estimateHint}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {proposal.pertHours !== null && (
            <div className="rounded-xl border border-border-default p-4">
              <p className="text-xs text-text-muted">{t.proposal.effort}</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">
                {proposal.pertHours} <span className="text-sm font-normal">{t.proposal.hours}</span>
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {t.proposal.range}: {proposal.optimisticHours}–{proposal.pessimisticHours}{' '}
                {t.proposal.hours}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border-default p-4">
            <p className="text-xs text-text-muted">{t.proposal.price}</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">
              {money(proposal.priceLikely)}
            </p>
            {(proposal.priceMin || proposal.priceMax) && (
              <p className="mt-1 text-xs text-text-muted">
                {t.proposal.range}: {money(proposal.priceMin)} – {money(proposal.priceMax)}
              </p>
            )}
            <p className="mt-2 text-xs text-text-muted">
              {t.project.engagements[proposal.engagementModel]}
              {proposal.hourlyRate && ` · ${money(proposal.hourlyRate)}/${t.proposal.perHour}`}
            </p>
          </div>
        </div>

        {(proposal.timelineWeeksMin !== null || proposal.timelineWeeksMax !== null) && (
          <p className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <CalendarClock className="size-4 text-text-muted" aria-hidden="true" />
            {t.proposal.timeline}: {proposal.timelineWeeksMin}–{proposal.timelineWeeksMax}{' '}
            {t.proposal.weeks}
          </p>
        )}
      </Card>

      {/* A paid discovery is the honest answer to a brief that cannot be priced
          firmly yet, so it gets stated plainly rather than buried in the text. */}
      {proposal.discoveryRequired && (
        <Card className="border-brand-amber-500/40 bg-brand-amber-500/5">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Compass className="size-4 text-brand-amber-500" aria-hidden="true" />
            {t.proposal.discovery}
          </h3>
          <p className="text-sm leading-6 text-text-secondary">{t.proposal.discoveryHint}</p>
          <p className="mt-2 text-sm text-text-primary">
            {money(proposal.discoveryPrice)}
            {proposal.discoveryDays ? ` · ${proposal.discoveryDays} ${t.proposal.days}` : ''}
          </p>
        </Card>
      )}

      {proposal.milestones && proposal.milestones.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">{t.proposal.milestones}</h3>
          <ol className="flex flex-col divide-y divide-border-default">
            {proposal.milestones.map((m, i) => (
              <li key={`${m.title}-${i}`} className="flex flex-wrap gap-2 py-2.5 first:pt-0">
                <span className="text-sm text-text-muted">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{m.title}</p>
                  {m.description && (
                    <p className="mt-0.5 text-sm text-text-secondary">{m.description}</p>
                  )}
                </div>
                <div className="text-end text-sm text-text-secondary">
                  {m.price && <p>{money(m.price)}</p>}
                  {m.durationDays != null && (
                    <p className="text-xs text-text-muted">
                      {m.durationDays} {t.proposal.days}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Answering ------------------------------------------------------- */}

      {decision || decided ? (
        <Card className="text-center">
          <CheckCircle2 className="mx-auto mb-2 size-8 text-brand-green-500" aria-hidden="true" />
          <p className="text-sm text-text-secondary">
            {(decision ?? proposal.status) === 'ACCEPTED'
              ? t.proposal.thanksAccepted
              : t.proposal.thanksDeclined}
          </p>
        </Card>
      ) : (
        <Card>
          <h3 className="text-sm font-semibold text-text-primary">{t.proposal.yourAnswer}</h3>

          {proposal.validUntil && (
            <p className="mt-1 text-xs text-text-muted">
              {proposal.expired
                ? t.proposal.expiredHint
                : `${t.proposal.validUntil}: ${formatDate(proposal.validUntil, locale)}`}
            </p>
          )}

          {answerable ? (
            <div className="mt-4 flex flex-col gap-4">
              {/* The tracking code alone must not be enough to accept a
                  contract, so the email the brief was filed under is asked
                  for as a second factor. */}
              <FormField
                label={t.proposal.confirmEmail}
                htmlFor="respond-email"
                hint={t.proposal.confirmEmailHint}
                error={error ?? undefined}
              >
                <Input
                  id="respond-email"
                  type="email"
                  dir="ltr"
                  className="ltr text-start"
                  value={email}
                  invalid={!!error}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>

              <FormField label={t.proposal.note} htmlFor="respond-note">
                <TextArea
                  id="respond-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </FormField>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => send('ACCEPTED')}
                  isLoading={respond.isPending}
                >
                  <CheckCircle2 className="size-4" />
                  {t.proposal.accept}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => send('DECLINED')}
                  isLoading={respond.isPending}
                >
                  {t.proposal.decline}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-muted">{t.proposal.cannotAnswer}</p>
          )}
        </Card>
      )}
    </div>
  );
}

function List({
  icon,
  title,
  hint,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  items: string[];
  tone: 'ok' | 'bad' | 'neutral';
}) {
  if (items.length === 0) return null;
  const marker = tone === 'ok' ? '✓' : tone === 'bad' ? '×' : '•';
  const markerClass =
    tone === 'ok'
      ? 'text-brand-green-500'
      : tone === 'bad'
        ? 'text-brand-red-500'
        : 'text-text-muted';

  return (
    <Card className="h-full">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
        {icon}
        {title}
      </h3>
      {hint && <p className="mb-2 text-xs text-text-muted">{hint}</p>}
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-6 text-text-secondary">
            <span className={`shrink-0 ${markerClass}`} aria-hidden="true">
              {marker}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
