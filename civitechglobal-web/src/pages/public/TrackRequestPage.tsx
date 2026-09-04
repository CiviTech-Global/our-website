import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { PackageSearch, Search } from 'lucide-react';
import { useTrackRequest } from '@/api/insurance';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { leadStatusBadgeVariant, leadStatusLabel } from '@/lib/leadStatus';
import type { LeadStatus } from '@/types/requests';

export default function TrackRequestPage() {
  const { t, locale } = useLocale();
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('code') ?? '');

  const code = params.get('code') ?? undefined;
  const { data, isFetching, isError } = useTrackRequest(code);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim().toUpperCase();
    // Kept in the URL so a tracking link can be bookmarked or shared with the
    // person the policy is actually for.
    setParams(trimmed ? { code: trimmed } : {});
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <AnimatedSection className="mb-8 text-center">
        <PackageSearch className="mx-auto mb-3 size-10 text-brand-green-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{t.insurance.trackTitle}</h1>
        <p className="mx-auto mt-3 max-w-md text-text-secondary">{t.insurance.trackSubtitle}</p>
      </AnimatedSection>

      <AnimatedSection>
        <Card glass>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <FormField label={t.insurance.trackingCode} htmlFor="tracking-code">
              <Input
                id="tracking-code"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder="XXXXXXXXXX"
                autoComplete="off"
                className="ltr text-start font-mono tracking-widest"
              />
            </FormField>
            <Button type="submit" isLoading={isFetching} className="w-full sm:w-fit">
              <Search className="size-4" />
              {t.insurance.trackButton}
            </Button>
          </form>
        </Card>
      </AnimatedSection>

      {isFetching && (
        <div className="mt-8 flex justify-center">
          <Spinner size={28} label={t.common.loading} />
        </div>
      )}

      {code && isError && !isFetching && (
        <div className="mt-8">
          <EmptyState title={t.insurance.trackNotFoundTitle} description={t.insurance.trackNotFoundBody} />
        </div>
      )}

      {data && !isFetching && (
        <AnimatedSection className="mt-8">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-text-muted">{t.insurance.trackingCode}</p>
                <p className="ltr font-mono text-base font-semibold tracking-widest text-text-primary">
                  {data.trackingCode}
                </p>
              </div>
              <Badge variant={leadStatusBadgeVariant(data.status as LeadStatus)}>
                {leadStatusLabel(t, data.status as LeadStatus)}
              </Badge>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-text-muted">{t.insurance.product}</dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {(locale === 'fa' ? data.productTitle : data.productTitleEn) ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">{t.insurance.submittedAt}</dt>
                <dd className="mt-1 text-sm text-text-primary">{formatDate(data.submittedAt, locale)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">{t.insurance.lastUpdated}</dt>
                <dd className="mt-1 text-sm text-text-primary">{formatDate(data.updatedAt, locale)}</dd>
              </div>
              {data.callbackScheduledAt && (
                <div>
                  <dt className="text-xs text-text-muted">{t.insurance.callbackScheduled}</dt>
                  <dd className="mt-1 text-sm text-text-primary">
                    {formatDate(data.callbackScheduledAt, locale)}
                  </dd>
                </div>
              )}
            </dl>

            {/* Deliberately no name, phone or answers: a tracking code is not a
                secret, so this page must stay useless to anyone who finds one. */}
            <p className="mt-6 text-xs text-text-muted">{t.insurance.trackPrivacyNote}</p>
          </Card>
        </AnimatedSection>
      )}
    </div>
  );
}
