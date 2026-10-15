import { HelpCircle } from 'lucide-react';
import type { Translations } from '@/i18n/LocaleProvider';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Card } from '@/components/ui/Card';

export type PageGuideCopy = Translations['guides']['team'];

/** The guide's questions, in the shape faqPageSchema takes. */
export function guideFaqs(copy: PageGuideCopy) {
  return copy.faqs.map(([question, answer]) => ({ question, answer }));
}

/**
 * The written half of a page whose main content is a list.
 *
 * The team, the customers club, the partners, the experts and the contact
 * page each show what the database holds — and a list of a few names, or an
 * empty state, is all a reader or a search engine found there. Search Console
 * filed them as thin. This is the part that says what the page is about: how
 * the thing works, what a visitor gets from it, and the questions people
 * actually ask, in the FAQ pattern the insurance landing page set.
 *
 * The questions are also the page's FAQPage structured data (guideFaqs), so
 * the markup states exactly what the page renders.
 */
export function PageGuide({ copy, id }: { copy: PageGuideCopy; id: string }) {
  return (
    <>
      <AnimatedSection className="mb-10">
        <section aria-labelledby={`${id}-guide`}>
          <h2
            id={`${id}-guide`}
            className="text-xl font-semibold text-text-primary sm:text-2xl"
          >
            {copy.title}
          </h2>
          <p className="mt-3 max-w-3xl leading-8 text-text-secondary">{copy.intro}</p>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {copy.points.map(([title, body]) => (
              <li key={title}>
                <Card className="h-full">
                  <h3 className="font-semibold text-text-primary">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">{body}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </AnimatedSection>

      <AnimatedSection delay={0.04} className="mb-12">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text-primary">
            <HelpCircle className="size-5 text-brand-green-500" aria-hidden="true" />
            {copy.faqTitle}
          </h2>
          <div className="flex flex-col divide-y divide-border-default">
            {copy.faqs.map(([question, answer]) => (
              <details key={question} className="group py-2 first:pt-0 last:pb-0">
                <summary className="cursor-pointer list-none text-sm font-medium text-text-primary marker:content-none">
                  {question}
                </summary>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{answer}</p>
              </details>
            ))}
          </div>
        </Card>
      </AnimatedSection>
    </>
  );
}
