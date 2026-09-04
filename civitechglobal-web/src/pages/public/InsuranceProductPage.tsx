import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { CheckCircle2, ChevronLeft, Copy, Info, PhoneCall, Plus, ShieldCheck, Zap } from 'lucide-react';
import { useInsuranceProduct } from '@/api/insurance';
import { useLocale } from '@/i18n/LocaleProvider';
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
