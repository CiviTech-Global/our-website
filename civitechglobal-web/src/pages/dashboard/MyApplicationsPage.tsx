import { useState, type FormEvent } from 'react';
import { useOwnApplications, useReviseApplication } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate } from '@/i18n/utils';
import { formatMoney, moderationVariant, outcomeVariant } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type { OwnApplication } from '@/types/marketplace';

/**
 * Everything the applicant has sent, and where it got to.
 *
 * The outcome is shown only once the employer has actually seen the
 * application — while it is still in review, "pending" is about the review and
 * not about the employer's opinion, and conflating the two would tell somebody
 * they had been passed over when nobody has read them yet.
 */
export default function MyApplicationsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.myApplications);

  const { data, isLoading } = useOwnApplications();
  const [revising, setRevising] = useState<OwnApplication | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-page font-semibold text-app-text">{t.market.myApplications}</h1>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.length === 0 && <EmptyState title={t.common.noResults} />}

      <ul className="flex flex-col gap-3">
        {data?.map((application) => (
          <li key={application.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-app-text">{application.job.title}</p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    {application.job.companyName && `${application.job.companyName} · `}
                    <span className="ltr font-mono">{application.job.code}</span>
                    {' · '}
                    {formatDate(application.createdAt, locale)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={moderationVariant(application.moderationStatus)}>
                    {t.market[application.moderationStatus]}
                  </Badge>
                  {application.moderationStatus === 'APPROVED' && (
                    <Badge variant={outcomeVariant(application.outcome)}>
                      {t.market[application.outcome]}
                    </Badge>
                  )}
                </div>
              </div>

              {application.expectedSalary && (
                <p className="mt-2 text-body text-app-text-3">
                  {t.market.expectedSalary}: {formatMoney(application.expectedSalary, locale)}{' '}
                  {t.market.currency}
                </p>
              )}

              {application.reviewNote && (
                <div className="mt-3 rounded border border-app-border-light bg-app-fill p-3">
                  <p className="text-label font-medium text-app-text-3">{t.market.reviewNote}</p>
                  <p className="mt-1 text-body text-app-text">{application.reviewNote}</p>
                </div>
              )}

              {application.moderationStatus === 'CHANGES_REQUESTED' && (
                <div className="mt-3">
                  <Button size="sm" onClick={() => setRevising(application)}>
                    {t.market.revise}
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {revising && <ReviseModal application={revising} onClose={() => setRevising(null)} />}
    </div>
  );
}

/** Answering the reviewer. Sending it puts the application back in the queue. */
function ReviseModal({
  application,
  onClose,
}: {
  application: OwnApplication;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const revise = useReviseApplication();

  const [coverLetter, setCoverLetter] = useState(application.coverLetter ?? '');
  const [expectedSalary, setExpectedSalary] = useState(application.expectedSalary ?? '');
  const [cv, setCv] = useState<File | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await revise.mutateAsync({
        id: application.id,
        payload: {
          coverLetter: coverLetter.trim() || undefined,
          expectedSalary: expectedSalary.replace(/[^0-9]/g, '') || undefined,
        },
        cv,
      });
      showToast(t.market.revised, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.market.revise}>
      {application.reviewNote && (
        <div className="mb-4 rounded border border-app-border-light bg-app-fill p-3">
          <p className="text-label font-medium text-app-text-3">{t.market.reviewNote}</p>
          <p className="mt-1 text-body text-app-text">{application.reviewNote}</p>
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FormField label={t.market.coverLetter} htmlFor="reviseCoverLetter">
          <TextArea
            id="reviseCoverLetter"
            rows={6}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
          />
        </FormField>

        <FormField label={t.market.expectedSalary} htmlFor="reviseExpectedSalary">
          <Input
            id="reviseExpectedSalary"
            inputMode="numeric"
            className="ltr"
            value={expectedSalary}
            onChange={(e) => setExpectedSalary(e.target.value)}
          />
        </FormField>

        {/* Optional: most notes are about the letter, and leaving this empty
            keeps the CV already on file rather than clearing it. */}
        <FormField
          label={t.market.cv}
          htmlFor="reviseCv"
          hint={application.cvOriginalName ?? undefined}
        >
          <Input
            id="reviseCv"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setCv(e.target.files?.[0] ?? null)}
          />
        </FormField>

        <div className="flex gap-2">
          <Button type="submit" isLoading={revise.isPending}>
            {t.market.revise}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
