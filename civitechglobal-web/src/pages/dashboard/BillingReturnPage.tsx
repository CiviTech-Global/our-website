import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { fill } from '@/lib/planFormat';
import { useConfirmPlanPayment, type ConfirmResult } from '@/api/billing';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Where the gateway sends the buyer back.
 *
 * Coming back proves nothing — the address is a redirect anybody can type — so
 * this page asks the server to verify with the gateway, and shows what the
 * server says. Asking twice is safe; the server activates a subscription once.
 */
export default function BillingReturnPage() {
  const { t } = useLocale();
  const p = t.plans;
  useDocumentTitle(p.returnTitle);
  const [params] = useSearchParams();
  const reference = params.get('reference') ?? params.get('Authority') ?? '';
  const confirm = useConfirmPlanPayment();
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function check() {
    setError(null);
    try {
      setResult(await confirm.mutateAsync(reference));
    } catch (e) {
      setError(apiMessage(e, t.common.error));
    }
  }

  useEffect(() => {
    // Once, even under StrictMode's double effect in development.
    if (started.current || !reference) return;
    started.current = true;
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  const status = result?.status;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={p.returnTitle} className="mb-0" />
      <Card>
        <div className="flex flex-col items-start gap-4">
          {confirm.isPending && <Spinner label={p.returnChecking} />}
          {status === 'SUCCEEDED' && (
            <p className="flex items-center gap-2 text-body text-app-text">
              <CheckCircle2 className="size-5 text-brand-green-600" aria-hidden="true" />
              {fill(p.returnSuccess, { code: result!.code })}
            </p>
          )}
          {(status === 'FAILED' || (!reference && !confirm.isPending)) && (
            <p className="flex items-center gap-2 text-body text-app-text">
              <XCircle className="size-5 text-red-600" aria-hidden="true" />
              {p.returnFailed}
            </p>
          )}
          {(status === 'PENDING' || status === 'CREATED') && (
            <p className="flex items-center gap-2 text-body text-app-text">
              <Clock className="size-5 text-amber-600" aria-hidden="true" />
              {p.returnPending}
            </p>
          )}
          {error && <p className="text-body text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {(status === 'PENDING' || status === 'CREATED' || error) && reference && (
              <Button variant="outline" onClick={() => void check()} isLoading={confirm.isPending}>
                {p.checkAgain}
              </Button>
            )}
            <Link to="/dashboard/billing">
              <Button>{p.backToBilling}</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
