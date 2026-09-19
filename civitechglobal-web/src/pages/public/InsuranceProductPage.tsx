import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  CheckCircle2,
  ChevronLeft,
  Copy,
  FileText,
  HelpCircle,
  Info,
  PhoneCall,
  Plus,
  ListChecks,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
  Zap,
} from 'lucide-react';
import { useInsuranceProduct } from '@/api/insurance';
import { useLocale } from '@/i18n/LocaleProvider';
import { CANONICAL_ORIGIN, useDocumentTitle } from '@/lib/documentTitle';
import { insuranceProductSchema } from '@/lib/structuredData';
import { useToast } from '@/contexts/ToastContext';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { InsuranceForm } from '@/components/insurance/InsuranceForm';
import type { SubmitResult } from '@/types/insurance';

function SubmittedPanel({ result }: { result: SubmitResult }) {
  const { t } = useLocale();
  const { showToast } = useToast();

  return (
    <Card glass className="text-center">
      <CheckCircle2 className="mx-auto mb-4 size-12 text-brand-green-500" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-text-primary">{t.insurance.submittedTitle}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
        {result.intakeMode === 'CALLBACK'
          ? t.insurance.submittedCallbackBody
          : t.insurance.submittedBody}
      </p>

      <div className="mx-auto mt-6 max-w-xs rounded-xl border border-border-default bg-surface-100 p-4">
        <p className="text-xs text-text-muted">{t.insurance.trackingCode}</p>
        <p className="ltr mt-1 font-mono text-lg font-semibold tracking-widest text-text-primary">
          {result.trackingCode}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => {
            // Clipboard access can be refused (insecure context, permissions);
            // the code is on screen either way, so failing quietly is fine.
            void navigator.clipboard
              ?.writeText(result.trackingCode)
              .then(() => showToast(t.insurance.copied, 'success'))
              .catch(() => undefined);
          }}
        >
          <Copy className="size-3.5" />
          {t.insurance.copyCode}
        </Button>
      </div>

      <p className="mt-4 text-xs text-text-muted">{t.insurance.trackingHint}</p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/track">
          <Button variant="outline">{t.insurance.trackNow}</Button>
        </Link>
        <Link to="/insurance">
          <Button variant="ghost">{t.insurance.browseMore}</Button>
        </Link>
      </div>
    </Card>
  );
}

export default function InsuranceProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale } = useLocale();
  const { data: product, isLoading, isError } = useInsuranceProduct(slug);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Named after the product once it loads, so a shared link says what it is
  // rather than "Insurance" for every one of them. The summary and the
  // structured data come from the product itself — the FAQ markup states
  // exactly the questions the page renders, nothing more.
  const productTitle = product ? (locale === 'fa' ? product.title : product.titleEn) : undefined;
  const productDescription = product
    ? locale === 'fa'
      ? product.description
      : product.descriptionEn
    : undefined;

  useDocumentTitle(productTitle ?? t.nav.insurance, {
    description: productDescription ?? t.seo.insurance,
    jsonLd: product
      ? insuranceProductSchema({
          name: productTitle ?? t.nav.insurance,
          description: productDescription ?? t.seo.insurance,
          url: `${CANONICAL_ORIGIN}/insurance/${product.slug}`,
          providerName: locale === 'fa' ? 'رایان تمدن جهان گستر' : 'Rayan Tamaddon Jahan Gostar',
          origin: CANONICAL_ORIGIN,
          locale: locale === 'fa' ? 'fa-IR' : 'en',
          faqs: product.faq,
        })
      : undefined,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={32} label={t.common.loading} />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title={t.insurance.notFoundTitle} description={t.insurance.notFoundBody} />
        <div className="mt-6 text-center">
          <Link to="/insurance">
            <Button variant="outline">{t.insurance.backToCatalog}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const title = locale === 'fa' ? product.title : product.titleEn;
  const description = locale === 'fa' ? product.description : product.descriptionEn;
  const categoryTitle = locale === 'fa' ? product.category.title : product.category.titleEn;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <AnimatedSection className="mb-6">
        <Link
          to="/insurance"
          className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t.insurance.backToCatalog}
        </Link>
      </AnimatedSection>

      <AnimatedSection className="mb-8">
        <p className="text-sm text-text-muted">
          <span aria-hidden="true">{product.category.emoji} </span>
          {categoryTitle}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text-primary sm:text-3xl">{title}</h1>

        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border-default px-3 py-1.5 text-xs text-text-secondary">
          {product.intakeMode === 'SELF_SERVE' ? (
            <>
              <Zap className="size-3.5 text-brand-green-500" aria-hidden="true" />
              {t.insurance.selfServeBadge}
            </>
          ) : (
            <>
              <PhoneCall className="size-3.5 text-brand-amber-500" aria-hidden="true" />
              {t.insurance.callbackBadge}
            </>
          )}
        </span>

        {product.keyFacts.length > 0 && (
          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 rounded-xl border border-border-default bg-surface-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.keyFacts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs text-text-muted">{fact.label}</dt>
                <dd className="text-sm font-medium text-text-primary">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </AnimatedSection>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* What this product is — read before deciding to fill anything in. */}
        <AnimatedSection className="lg:col-span-2">
          <div className="flex flex-col gap-5 lg:sticky lg:top-24">
            <Card>
              <p className="text-sm leading-7 text-text-secondary">{description}</p>
            </Card>

            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <ShieldCheck className="size-4 text-brand-green-500" aria-hidden="true" />
                {t.insurance.coverages}
              </h2>
              <ul className="flex flex-col gap-2">
                {product.coverages.map((coverage) => (
                  <li key={coverage} className="flex items-start gap-2 text-sm text-text-secondary">
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-brand-green-500"
                      aria-hidden="true"
                    />
                    {coverage}
                  </li>
                ))}
              </ul>
            </Card>

            {product.optionalCoverages.length > 0 && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Plus className="size-4 text-brand-amber-500" aria-hidden="true" />
                  {t.insurance.optionalCoverages}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {product.optionalCoverages.map((coverage) => (
                    <li
                      key={coverage}
                      className="rounded-full border border-border-default px-3 py-1 text-xs text-text-secondary"
                    >
                      {coverage}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {product.exclusions.length > 0 && (
              <Card>
                <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <XCircle className="size-4 text-brand-red-500" aria-hidden="true" />
                  {t.insurance.exclusions}
                </h2>
                <p className="mb-3 text-xs text-text-muted">{t.insurance.exclusionsHint}</p>
                <ul className="flex flex-col gap-2">
                  {product.exclusions.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                      <XCircle
                        className="mt-0.5 size-4 shrink-0 text-brand-red-500/70"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {product.claimSteps.length > 0 && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <ListChecks className="size-4 text-brand-green-500" aria-hidden="true" />
                  {t.insurance.claimSteps}
                </h2>
                <ol className="flex flex-col gap-3">
                  {product.claimSteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3 text-sm leading-6 text-text-secondary">
                      <span
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-green-500/10 text-xs font-medium text-brand-green-600 dark:text-brand-green-400"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {product.requiredDocuments.length > 0 && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <FileText className="size-4 text-brand-green-500" aria-hidden="true" />
                  {t.insurance.requiredDocuments}
                </h2>
                <ul className="flex flex-col gap-2">
                  {product.requiredDocuments.map((item) => (
                    <li key={item} className="text-sm leading-6 text-text-secondary">
                      • {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {product.premiumFactors.length > 0 && (
              <Card>
                <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <SlidersHorizontal className="size-4 text-brand-amber-500" aria-hidden="true" />
                  {t.insurance.premiumFactors}
                </h2>
                <p className="mb-3 text-xs text-text-muted">{t.insurance.premiumFactorsHint}</p>
                <ul className="flex flex-wrap gap-2">
                  {product.premiumFactors.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-border-default px-3 py-1 text-xs text-text-secondary"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {product.faq.length > 0 && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <HelpCircle className="size-4 text-brand-green-500" aria-hidden="true" />
                  {t.insurance.faq}
                </h2>
                <div className="flex flex-col divide-y divide-border-default">
                  {product.faq.map((entry) => (
                    <details key={entry.question} className="group py-2 first:pt-0 last:pb-0">
                      <summary className="cursor-pointer list-none text-sm font-medium text-text-primary marker:content-none">
                        {entry.question}
                      </summary>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">{entry.answer}</p>
                    </details>
                  ))}
                </div>
              </Card>
            )}

            {product.notes.length > 0 && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Info className="size-4 text-text-muted" aria-hidden="true" />
                  {t.insurance.goodToKnow}
                </h2>
                <ul className="flex flex-col gap-2">
                  {product.notes.map((note) => (
                    <li key={note} className="text-sm leading-6 text-text-secondary">
                      • {note}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.06} className="lg:col-span-3">
          <Card glass>
            {result ? (
              <SubmittedPanel result={result} />
            ) : (
              <>
                {product.intakeMode === 'CALLBACK' && (
                  <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-amber-500/40 bg-brand-amber-500/5 p-4">
                    <PhoneCall
                      className="mt-0.5 size-4 shrink-0 text-brand-amber-500"
                      aria-hidden="true"
                    />
                    <p className="text-xs leading-6 text-text-secondary">
                      {t.insurance.callbackExplainer}
                    </p>
                  </div>
                )}
                <InsuranceForm product={product} onSubmitted={setResult} />
              </>
            )}
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
}
