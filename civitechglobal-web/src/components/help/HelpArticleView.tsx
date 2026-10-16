import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpen, HelpCircle, Lightbulb, ListChecks, Sparkles } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { canReadHelp, helpEntry, helpEntryHome } from '@/content/help/registry';
import type { HelpLibrary } from '@/content/help/load';
import type { HelpArticleText, HelpEntry } from '@/content/help/types';
import { cn } from '@/lib/utils';

/**
 * One guide, written out in full.
 *
 * Shared by the side panel and the help centre's article page so a guide reads
 * the same wherever it is opened. `compact` is the panel: narrower type, and the
 * related guides open in place rather than navigating away from the page the
 * reader is trying to use.
 */
export function HelpArticleView({
  entry,
  text,
  library,
  isStaff,
  compact = false,
  onOpenGuide,
  headingLevel = 2,
  hideTips = false,
}: {
  entry: HelpEntry;
  text: HelpArticleText;
  library: HelpLibrary;
  isStaff: boolean;
  compact?: boolean;
  /** Opens a related guide in place; without it, related guides are links to the help centre. */
  onOpenGuide?: (id: string) => void;
  /** The level of the section headings; the panel and the page sit under different titles. */
  headingLevel?: 2 | 3;
  /** For a page that places its tips beside the sections they are about. */
  hideTips?: boolean;
}) {
  const { t, locale } = useLocale();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;
  const number = (n: number) => (locale === 'fa' ? toPersianDigits(n) : String(n));

  const related = entry.related
    .map((id) => helpEntry(id))
    .filter((other): other is HelpEntry => !!other && canReadHelp(other.audience, { isStaff }))
    .map((other) => ({ other, title: library.article(other.id)?.text.title, why: text.related?.[other.id] }))
    .filter((item): item is { other: HelpEntry; title: string; why: string | undefined } => !!item.title);

  const sectionTitle = cn(
    'mb-3 flex items-center gap-2 font-semibold text-text-primary',
    compact ? 'text-base' : 'text-lg'
  );
  const body = compact ? 'text-sm leading-7' : 'leading-8';

  return (
    <div className="flex flex-col gap-7">
      <p className={cn(body, 'text-text-secondary')}>{text.intro}</p>

      {text.steps && text.steps.length > 0 && (
        <section>
          <Heading className={sectionTitle}>
            <ListChecks className="size-5 text-brand-green-500" aria-hidden="true" />
            {t.help.stepsTitle}
          </Heading>
          <ol className="flex flex-col gap-3">
            {text.steps.map(([title, detail], index) => (
              <li key={title} className="flex gap-3">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-green-500/10 text-sm font-semibold text-brand-green-600 dark:text-brand-green-300"
                  aria-hidden="true"
                >
                  {number(index + 1)}
                </span>
                <div>
                  <p className="font-medium text-text-primary">{title}</p>
                  <p className={cn('mt-0.5 text-text-secondary', compact ? 'text-sm leading-6' : 'text-sm leading-7')}>
                    {detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {text.points && text.points.length > 0 && (
        <section>
          <Heading className={sectionTitle}>
            <Sparkles className="size-5 text-brand-amber-500" aria-hidden="true" />
            {t.help.pointsTitle}
          </Heading>
          <ul className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
            {text.points.map(([title, detail]) => (
              <li key={title} className="rounded-xl border border-border-default bg-surface-50 p-4">
                <p className="font-medium text-text-primary">{title}</p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hideTips && text.tips && text.tips.length > 0 && (
        <section>
          <Heading className={sectionTitle}>
            <Lightbulb className="size-5 text-brand-amber-500" aria-hidden="true" />
            {t.help.tipsTitle}
          </Heading>
          <ul className="flex flex-col gap-2">
            {text.tips.map(([title, detail]) => (
              <li key={title} className="rounded-xl border border-brand-amber-500/25 bg-brand-amber-500/5 p-3">
                <p className="text-sm font-medium text-text-primary">{title}</p>
                <p className="mt-0.5 text-sm leading-6 text-text-secondary">{detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {text.faqs.length > 0 && (
        <section>
          <Heading className={sectionTitle}>
            <HelpCircle className="size-5 text-brand-green-500" aria-hidden="true" />
            {text.faqTitle ?? t.help.faqTitle}
          </Heading>
          <div className="flex flex-col divide-y divide-border-default rounded-xl border border-border-default px-4">
            {text.faqs.map(([question, answer]) => (
              <details key={question} className="group py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-text-primary marker:content-none">
                  {question}
                </summary>
                <p className="mt-2 text-sm leading-7 text-text-secondary">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <Heading className={sectionTitle}>
            <BookOpen className="size-5 text-brand-green-500" aria-hidden="true" />
            {t.help.relatedTitle}
          </Heading>
          <ul className="flex flex-col gap-2">
            {related.map(({ other, title, why }) => {
              const home = helpEntryHome(other);
              return (
                <li key={other.id} className="rounded-xl border border-border-default p-3">
                  <p className="text-sm font-medium text-text-primary">{title}</p>
                  {why && <p className="mt-0.5 text-sm leading-6 text-text-secondary">{why}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {home && (
                      <Link
                        to={home}
                        className="inline-flex items-center gap-1 font-medium text-brand-green-600 hover:underline dark:text-brand-green-400"
                      >
                        {t.help.openPage}
                        <ArrowIcon className="size-3.5" aria-hidden="true" />
                      </Link>
                    )}
                    {onOpenGuide ? (
                      <button
                        type="button"
                        onClick={() => onOpenGuide(other.id)}
                        className="font-medium text-text-secondary hover:text-text-primary hover:underline"
                      >
                        {t.help.openRelatedGuide}
                      </button>
                    ) : (
                      <Link to={`/help/${other.id}`} className="font-medium text-text-secondary hover:text-text-primary hover:underline">
                        {t.help.openRelatedGuide}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
