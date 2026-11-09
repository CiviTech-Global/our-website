import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles } from 'lucide-react';
import { isApiError } from '@/config/api';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { featureLabelKey, type QuotaExceeded } from '@/api/billing';
import { describeLimit, fill } from '@/lib/planFormat';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/**
 * The offer to upgrade, shown wherever an action is refused for a plan limit.
 *
 * One component for the whole app rather than one per form: the server answers
 * every limited action the same way — 402 with code QUOTA_EXCEEDED — so the
 * query client's mutation cache reports it here, and no form has to know.
 */

const EVENT = 'civitech:quota-exceeded';

/** Wired as the query client's mutation onError; ignores every other error. */
export function announceQuotaExceeded(error: unknown): void {
  if (!isApiError(error) || error.status !== 402) return;
  const body = error.response.data as { code?: string; data?: QuotaExceeded } | undefined;
  if (body?.code !== 'QUOTA_EXCEEDED' || !body.data) return;
  window.dispatchEvent(new CustomEvent<QuotaExceeded>(EVENT, { detail: body.data }));
}

export function QuotaPrompt() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [hit, setHit] = useState<QuotaExceeded | null>(null);

  useEffect(() => {
    const listener = (event: Event) => setHit((event as CustomEvent<QuotaExceeded>).detail);
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, []);

  if (!hit) return null;
  const p = t.plans;
  const featureName =
    (p.features as Record<string, string | undefined>)[featureLabelKey(hit.feature)] ?? hit.feature;

  return (
    <Modal isOpen onClose={() => setHit(null)} title={p.limitTitle}>
      <div className="flex flex-col gap-4">
        <p className="text-body text-app-text-2">
          <span className="font-medium text-app-text">{featureName}</span>
          {' — '}
          {describeLimit({ kind: hit.kind, limit: hit.limit, liveDays: null }, p, locale)}
        </p>
        {hit.resetsAt && (
          <p className="text-label text-app-text-4">{fill(p.limitResets, { date: formatDate(hit.resetsAt, locale) })}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setHit(null);
              navigate(`/dashboard/billing?subject=${hit.subject}`);
            }}
          >
            <Sparkles aria-hidden="true" />
            {p.seePlans}
          </Button>
          <Button variant="outline" onClick={() => setHit(null)}>
            {t.common.close}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
