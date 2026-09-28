import { useState } from 'react';
import { AlertTriangle, Database, RefreshCw, Trash2 } from 'lucide-react';
import { useClearDemo, useDemoStatus, useSeedDemo } from '@/api/demo';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { toPersianDigits } from '@/i18n/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Creating and removing demonstration data.
 *
 * Super-admin only, and the endpoints behind it do not exist in production at
 * all — so if this page is ever reached there, every request 404s and it says
 * the tool is unavailable rather than showing an error.
 *
 * Removal asks first. It is the one control here that destroys anything, and
 * an accidental press between two harmless buttons is exactly the mistake a
 * confirmation is for. The confirmation says what survives as well as what
 * goes, because "remove demo data" is only reassuring if you know it cannot
 * take the real catalogue with it.
 */
export default function DemoDataPage() {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  useDocumentTitle(t.demo.title);

  const status = useDemoStatus();
  const seed = useSeedDemo();
  const clear = useClearDemo();

  const [confirming, setConfirming] = useState(false);

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  // A 404 here is not a failure: it is how the server says the tool is absent
  // in this environment. Anything else is a real error worth showing.
  const unavailable = status.isError;

  async function handleSeed() {
    try {
      await seed.mutateAsync();
      showToast(t.demo.seeded, 'success');
      void status.refetch();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function handleClear() {
    setConfirming(false);
    try {
      const result = await clear.mutateAsync();
      showToast(`${t.demo.cleared} (${number(result.deleted)})`, 'success');
      void status.refetch();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.demo.title} description={t.demo.subtitle} className="mb-2" />

      {unavailable ? (
        <Card>
          <p className="text-body text-app-text-3">{t.demo.devOnly}</p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-3">
            <p className="flex items-start gap-2 rounded border border-status-warning-border bg-status-warning-bg p-3 text-label text-app-text-3">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-status-warning" aria-hidden="true" />
              {t.demo.warning}
            </p>
            <p className="text-caption text-app-text-3">{t.demo.location}</p>
            <p className="text-caption text-app-text-3">{t.demo.accounts}</p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleSeed()} disabled={seed.isPending || clear.isPending}>
                <Database className="size-4" aria-hidden="true" />
                {seed.isPending ? t.demo.seeding : t.demo.seed}
              </Button>

              <Button
                variant="outline"
                onClick={() => setConfirming(true)}
                disabled={seed.isPending || clear.isPending}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {clear.isPending ? t.demo.clearing : t.demo.clear}
              </Button>

              <Button variant="ghost" onClick={() => void status.refetch()}>
                <RefreshCw className="size-4" aria-hidden="true" />
                {t.demo.refresh}
              </Button>
            </div>
          </Card>

          {status.isLoading && (
            <div className="flex justify-center py-12">
              <Spinner label={t.common.loading} />
            </div>
          )}

          {!status.isLoading && (status.data?.length ?? 0) === 0 && (
            <EmptyState title={t.demo.nothing} icon={<Database aria-hidden="true" />} />
          )}

          {(status.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-2 text-label text-app-text-2">{t.demo.batches}</h2>

              <ul className="flex flex-col gap-3">
                {status.data?.map((batch) => (
                  <li key={batch.batch}>
                    <Card>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="ltr font-mono text-label text-app-text-4">
                          {batch.batch}
                        </span>
                        <span className="ms-auto text-label text-app-text-3">
                          {t.demo.rows.replace('{count}', number(batch.total))}
                        </span>
                      </div>

                      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-caption sm:grid-cols-3">
                        {Object.entries(batch.models)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([model, count]) => (
                            <div key={model} className="flex justify-between gap-2">
                              <dt className="truncate text-app-text-4">{model}</dt>
                              <dd className="text-app-text-2">{number(count)}</dd>
                            </div>
                          ))}
                      </dl>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Modal isOpen={confirming} onClose={() => setConfirming(false)} title={t.demo.clear}>
        <div className="flex flex-col gap-4">
          <p className="text-body text-app-text-2">{t.demo.confirmClear}</p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={() => void handleClear()} disabled={clear.isPending}>
              {t.demo.clear}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
