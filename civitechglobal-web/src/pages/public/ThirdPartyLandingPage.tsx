import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, ChevronLeft, HelpCircle, ShieldCheck } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { CANONICAL_ORIGIN, SITE_NAME, useDocumentTitle } from '@/lib/documentTitle';
import { breadcrumbSchema, faqPageSchema, insuranceProductSchema } from '@/lib/structuredData';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * The intent landing for "قیمت بیمه شخص ثالث" — the highest-volume insurance
 * query in Persian. One page, one intent: explain what moves the price, then
 * hand the visitor to the quote flow. Structured data states exactly what the
 * page shows: a Service, its breadcrumb, and the visible FAQ section.
 */
export default function ThirdPartyLandingPage() {
  const { t, locale } = useLocale();
  const copy = t.landing.thirdParty;

  const siteName = locale === 'fa' ? SITE_NAME.fa : SITE_NAME.en;
  const contentLocale = 'fa-IR';
  const pageUrl = `${CANONICAL_ORIGIN}/insurance/third-party`;
  // FAQs are stored as [question, answer] tuples in the dictionaries (the
  // i18n duplicate-key lint cannot see repeated keys inside array objects),
  // and shaped for the schema here.
  const faqs = copy.faqs.map(([question, answer]) => ({ question, answer }));
  const faqLd = faqPageSchema(faqs, contentLocale);

  useDocumentTitle(copy.title, {
    description: copy.description,
    jsonLd: [
      insuranceProductSchema({
        name: copy.title,
        description: copy.description,
        url: pageUrl,
        providerName: siteName,
        origin: CANONICAL_ORIGIN,
        locale: contentLocale,
        faqs,
      })[0],
      breadcrumbSchema(CANONICAL_ORIGIN, [
        { name: t.nav.insurance, path: '/insurance' },
        { name: copy.title, path: '/insurance/third-party' },
      ]),
      ...(faqLd ? [faqLd] : []),
    ],
  });

  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <AnimatedSection className="mb-6">
        <Link
          to="/insurance"
          className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t.nav.insurance}
        </Link>
      </AnimatedSection>

      <AnimatedSection className="mb-10">
        <h1 className="text-3xl font-bold leading-tight text-text-primary sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 text-lg leading-8 text-text-secondary">{copy.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/insurance">
            <Button size="lg">
              {copy.ctaPrimary}
              <ArrowIcon className="size-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link to="/blog/third-party-price-factors">
            <Button size="lg" variant="outline">
              {copy.ctaSecondary}
            </Button>
          </Link>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.04}>
        <h2 className="mb-4 text-xl font-semibold text-text-primary sm:text-2xl">{copy.factorsTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {copy.factorsHead.map((head) => (
                  <th
                    key={head}
                    className="border border-border-default bg-surface-50 px-3 py-2 text-start font-semibold text-text-primary"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {copy.factors.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => (
                    <td key={cell} className="border border-border-default px-3 py-2 text-text-secondary">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.06} className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-text-primary sm:text-2xl">{copy.stepsTitle}</h2>
        <ol className="flex flex-col gap-3">
          {copy.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-sm leading-7 text-text-secondary">
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-green-500/10 text-xs font-medium text-brand-green-600 dark:text-brand-green-400"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </AnimatedSection>

      <AnimatedSection delay={0.08} className="mt-10">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text-primary">
            <HelpCircle className="size-5 text-brand-green-500" aria-hidden="true" />
            {copy.faqTitle}
          </h2>
          <div className="flex flex-col divide-y divide-border-default">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-2 first:pt-0 last:pb-0">
                <summary className="cursor-pointer list-none text-sm font-medium text-text-primary marker:content-none">
                  {faq.question}
                </summary>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{faq.answer}</p>
              </details>
            ))}
          </div>
        </Card>
      </AnimatedSection>

      <AnimatedSection delay={0.1} className="mt-10">
        <Card glass className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-0.5 size-6 shrink-0 text-brand-green-500" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{copy.ctaTitle}</h2>
              <p className="mt-1 max-w-xl text-sm text-text-secondary">{copy.ctaBody}</p>
            </div>
          </div>
          <Link to="/insurance" className="shrink-0">
            <Button>
              {copy.ctaPrimary}
              <ArrowIcon className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        </Card>
      </AnimatedSection>
    </div>
  );
}
