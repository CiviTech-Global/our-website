import { useParams } from 'react-router';
import { Printer } from 'lucide-react';
import { useProjectTracking } from '@/api/projects';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatThousands } from '@/lib/persian';

/**
 * The proposal as a printable document.
 *
 * Deliberately outside the site layout: there is no navbar and no footer to
 * strip, because the page IS the document. "Save as PDF" is the browser's own
 * print-to-PDF, which is the right tool here rather than a shortcoming —
 *
 *   - the browser already shapes and orders Persian correctly, while
 *     server-side PDF libraries (pdfkit and friends) do no Arabic shaping or
 *     bidi, so Persian comes out disconnected and reversed;
 *   - the output is vector text: selectable, searchable, and a few tens of
 *     kilobytes rather than a rasterised megabyte;
 *   - headless Chromium would need roughly the whole 512 MB the API container
 *     is allowed, on a box with 2 GB total.
 *
 * The print rules live in index.css under `@media print`.
 */
export default function ProposalDocumentPage() {
  const { code } = useParams();
  const { t, locale } = useLocale();
  const { data, isLoading, isError } = useProjectTracking(code ?? null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !data || !data.proposal) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-text-secondary">{t.proposal.docNotFound}</p>
      </div>
    );
  }

  const proposal = data.proposal;
  const money = (value: string | null) =>
    value ? `${formatThousands(value)} ${t.project.currency}` : '—';

  return (
    <div className="min-h-screen bg-surface-100 py-8 print:bg-white print:py-0">
      {/* Screen-only toolbar. */}
      <div className="no-print mx-auto mb-6 flex max-w-[820px] items-center justify-between gap-4 px-6">
        <p className="text-sm text-text-secondary">{t.proposal.docHint}</p>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="size-4" />
          {t.proposal.savePdf}
        </Button>
      </div>

      <article className="proposal-doc mx-auto max-w-[820px] bg-surface-50 p-10 shadow-soft print:max-w-none print:bg-white print:p-0 print:shadow-none">
        {/* Letterhead. The registered name, because this is the document a
            client may attach to a purchase order. */}
        <header className="mb-8 border-b border-border-default pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-text-primary">{t.common.legalName}</p>
              <p className="mt-0.5 text-sm text-text-muted">{t.proposal.docSubtitle}</p>
            </div>
            <dl className="text-sm">
              <Row label={t.insurance.trackingCode} value={data.trackingCode} ltr />
              <Row label={t.proposal.docVersion} value={`v${proposal.version}`} />
              {proposal.sentAt && (
                <Row label={t.proposal.docIssued} value={formatDate(proposal.sentAt, locale)} />
              )}
              {proposal.validUntil && (
                <Row label={t.proposal.validUntil} value={formatDate(proposal.validUntil, locale)} />
              )}
            </dl>
          </div>
        </header>

        <h1 className="mb-6 text-2xl font-bold text-text-primary">{data.title}</h1>

        {proposal.message && (
          <p className="mb-6 text-sm leading-7 text-text-secondary">{proposal.message}</p>
        )}

        <Section title={t.proposal.scope}>
          <p className="text-sm leading-7 text-text-secondary">{proposal.scopeSummary}</p>
        </Section>

        <Section title={t.proposal.deliverables}>
          <Bullets items={proposal.deliverables} marker="✓" />
        </Section>

        {proposal.assumptions.length > 0 && (
          <Section title={t.proposal.assumptions}>
            <Bullets items={proposal.assumptions} marker="•" />
          </Section>
        )}

        {/* Never allowed to fall off the end of a page on its own: the
            exclusions are the part a reader most needs to actually see. */}
        <Section title={t.proposal.exclusions}>
          <p className="mb-2 text-xs text-text-muted">{t.proposal.exclusionsHint}</p>
          <Bullets items={proposal.exclusions} marker="×" />
        </Section>

        <Section title={t.proposal.estimate}>
          <p className="mb-3 text-xs text-text-muted">{t.proposal.estimateHint}</p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {proposal.pertHours !== null && (
                <TableRow
                  label={t.proposal.effort}
                  value={`${proposal.pertHours} ${t.proposal.hours}`}
                  note={`${t.proposal.range}: ${proposal.optimisticHours}–${proposal.pessimisticHours} ${t.proposal.hours}`}
                />
              )}
              <TableRow
                label={t.proposal.price}
                value={money(proposal.priceLikely)}
                note={
                  proposal.priceMin || proposal.priceMax
                    ? `${t.proposal.range}: ${money(proposal.priceMin)} – ${money(proposal.priceMax)}`
                    : undefined
                }
              />
              <TableRow
                label={t.project.engagement}
                value={t.project.engagements[proposal.engagementModel]}
                note={
                  proposal.hourlyRate
                    ? `${money(proposal.hourlyRate)} / ${t.proposal.perHour}`
                    : undefined
                }
              />
              {(proposal.timelineWeeksMin !== null || proposal.timelineWeeksMax !== null) && (
                <TableRow
                  label={t.proposal.timeline}
                  value={`${proposal.timelineWeeksMin}–${proposal.timelineWeeksMax} ${t.proposal.weeks}`}
                />
              )}
              {proposal.discoveryRequired && (
                <TableRow
                  label={t.proposal.discovery}
                  value={money(proposal.discoveryPrice)}
                  note={
                    proposal.discoveryDays
                      ? `${proposal.discoveryDays} ${t.proposal.days}`
                      : undefined
                  }
                />
              )}
            </tbody>
          </table>
        </Section>

        {proposal.milestones && proposal.milestones.length > 0 && (
          <Section title={t.proposal.milestones}>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {proposal.milestones.map((m, i) => (
                  <tr key={`${m.title}-${i}`} className="border-b border-border-subtle">
                    <td className="py-2 align-top text-text-muted">{i + 1}</td>
                    <td className="py-2 align-top">
                      <p className="font-medium text-text-primary">{m.title}</p>
                      {m.description && (
                        <p className="mt-0.5 text-text-secondary">{m.description}</p>
                      )}
                    </td>
                    <td className="py-2 text-end align-top text-text-secondary">
                      {m.price ? money(m.price) : ''}
                      {m.durationDays != null && (
                        <span className="block text-xs text-text-muted">
                          {m.durationDays} {t.proposal.days}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <footer className="mt-10 border-t border-border-default pt-4 text-xs leading-6 text-text-muted">
          <p>{t.proposal.docFooter}</p>
          {proposal.validUntil && (
            <p className="mt-1">
              {t.proposal.validUntil}: {formatDate(proposal.validUntil, locale)}
            </p>
          )}
          <p className="mt-1">{t.common.legalName}</p>
        </footer>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="doc-section mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullets({ items, marker }: { items: string[]; marker: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm leading-6 text-text-secondary">
          <span aria-hidden="true" className="shrink-0 text-text-muted">
            {marker}
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-text-muted">{label}</dt>
      <dd className={ltr ? 'ltr font-mono text-text-primary' : 'text-text-primary'}>{value}</dd>
    </div>
  );
}

function TableRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <tr className="border-b border-border-subtle">
      <th scope="row" className="w-40 py-2 text-start align-top font-normal text-text-muted">
        {label}
      </th>
      <td className="py-2 align-top">
        <span className="font-medium text-text-primary">{value}</span>
        {note && <span className="block text-xs text-text-muted">{note}</span>}
      </td>
    </tr>
  );
}
