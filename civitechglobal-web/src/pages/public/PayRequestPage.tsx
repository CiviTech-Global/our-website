import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { CreditCard, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useConfirmPaymentRequest, usePaymentRequestStatus, usePayPaymentRequest } from '@/api/payments';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatMoney } from '@/lib/marketplace';
import { formatDate } from '@/i18n/utils';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * The payer's landing page for a staff-issued payment request.
 *
 * Arrives three ways: a staff-sent link (/pay?code=…), the gateway's callback
 * after an attempt (/pay?code=…&reference=… — the reference triggers one
 * idempotent confirm), or a payer refreshing either. When no code is present
 * at all there is nothing to draw, and the not-found state says so.
 */

export default function PayRequestPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.pay.title);
  const [params, setParams] = useSearchParams();

  const code = params.get('code')?.trim().toUpperCase() || undefined;
  const reference = params.get('reference');

  const status = usePaymentRequestStatus(code);
  const pay = usePayPaymentRequest();
  const confirm = useConfirmPaymentRequest(code);

  // One confirm per reference, guarded against React's development
  // double-invoke the way the orders page guards it.
  const confirmed = useRef<string | null>(null);
  useEffect(() => {
    if (!reference || confirmed.current === reference) return;
    confirmed.current = reference;
    void confirm.mutateAsync(reference).finally(() => {
      const next = new URLSearchParams(params);
      next.delete('reference');
      setParams(next, { replace: true });
    });
  }, [reference, confirm, params, setParams]);

  const isError = Boolean(code) && !status.isFetching && status.isError;
  const request = status.data;

  async function handlePay() {
    if (!code) return;
    const { redirectUrl } = await pay.mutateAsync(code);
    if (redirectUrl) window.location.assign(redirectUrl);
  }

  return (
    <div className="page-frame page-frame-reading">
      <AnimatedSection className="mb-8 text-center">
        <CreditCard className="mx-auto mb-3 size-10 text-brand-green-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{t.pay.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-text-secondary">{t.pay.subtitle}</p>
      </AnimatedSection>

      {status.isFetching && (
        <div className="flex justify-center">
          <Spinner size={28} label={t.common.loading} />
        </div>
      )}

      {isError && (
        <EmptyState title={t.pay.notFoundTitle} description={t.pay.notFoundBody} />
      )}

      {request && !status.isFetching && (
        <AnimatedSection>
          <Card glass>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-text-muted">{t.pay.codeLabel}</p>
                <p className="ltr font-mono text-base font-semibold tracking-widest text-text-primary">
                  {request.code}
                </p>
              </div>
              <Badge variant={request.paid ? 'success' : 'info'}>
                {request.paid ? t.pay.paidBadge : t.pay.unpaidBadge}
              </Badge>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs text-text-muted">{t.pay.subjectLabel}</dt>
                <dd className="mt-1 text-sm text-text-primary">{request.title}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">{t.pay.amountLabel}</dt>
                <dd className="mt-1 text-sm font-semibold text-text-primary">
                  {formatMoney(request.amount, locale)} {t.pay.irt}
                </dd>
              </div>
              {request.paidAt && (
                <div>
                  <dt className="text-xs text-text-muted">{t.pay.paidAtLabel}</dt>
                  <dd className="mt-1 text-sm text-text-primary">{formatDate(request.paidAt, locale)}</dd>
                </div>
              )}
            </dl>

            {request.description && (
              <p className="mt-6 border-t border-border-default pt-4 text-sm text-text-secondary">
                {request.description}
              </p>
            )}

            <div className="mt-6 border-t border-border-default pt-4">
              {request.paid ? (
                <div className="flex items-center gap-2 text-sm text-brand-green-600">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                  {t.pay.paidBody}
                </div>
              ) : (
                <Button onClick={handlePay} isLoading={pay.isPending} className="w-full sm:w-fit">
                  {t.pay.payButton}
                </Button>
              )}
            </div>
          </Card>
        </AnimatedSection>
      )}

      {confirm.isError && (
        <AnimatedSection className="mt-6">
          <Card>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Clock3 className="size-5 text-amber-500" aria-hidden="true" />
              {t.pay.pendingBody}
            </div>
          </Card>
        </AnimatedSection>
      )}

      {pay.isError && (
        <AnimatedSection className="mt-6">
          <Card>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <XCircle className="size-5" aria-hidden="true" />
              {t.pay.error}
            </div>
          </Card>
        </AnimatedSection>
      )}
    </div>
  );
}
