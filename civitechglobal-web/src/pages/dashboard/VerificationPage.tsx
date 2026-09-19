import { useUploadFeedback } from '@/lib/useUploadFeedback';
import { UploadStatus } from '@/components/ui/UploadStatus';
import { PageHeader } from '@/components/app/PageHeader';
import { useState, type FormEvent } from 'react';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useOwnVerification, useSubmitVerification } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { verificationVariant } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type { AccountKind, VerificationDocumentKind } from '@/types/marketplace';

const KINDS: AccountKind[] = ['INDIVIDUAL', 'COMPANY'];

const DOCUMENT_KINDS: VerificationDocumentKind[] = [
  'NATIONAL_ID_CARD',
  'PASSPORT',
  'COMPANY_REGISTRATION',
  'AUTHORITY_LETTER',
  'OTHER',
];

/**
 * What the server refuses to proceed without, mirrored from its
 * REQUIRED_DOCUMENTS. Checked here so somebody is told before they upload and
 * submit, not after — the server still enforces it, as it must.
 */
const REQUIRED_DOCUMENTS: Record<AccountKind, VerificationDocumentKind[]> = {
  INDIVIDUAL: ['NATIONAL_ID_CARD'],
  COMPANY: ['NATIONAL_ID_CARD', 'COMPANY_REGISTRATION'],
};

interface DocumentRow {
  /** Stable across re-renders so React does not reorder file inputs. */
  key: number;
  kind: VerificationDocumentKind;
  file: File | null;
}

/**
 * Identity verification: the gate in front of both boards.
 *
 * Whether the form is shown at all depends on where the account already is.
 * Approved means there is nothing to do; pending means waiting, and a second
 * submission would only reset the wait. Only "not started" and "rejected"
 * offer the form — and rejected shows the reviewer's note above it, because
 * resubmitting the same thing helps nobody.
 */
export default function VerificationPage() {
  const { t } = useLocale();
  useDocumentTitle(t.market.verificationTitle);
  const { showToast } = useToast();

  const { data, isLoading } = useOwnVerification();
  const submit = useSubmitVerification();
  const upload = useUploadFeedback('verification-documents');

  const [kind, setKind] = useState<AccountKind>('INDIVIDUAL');
  const [fields, setFields] = useState({
    legalFirstName: '',
    legalLastName: '',
    nationalId: '',
    phone: '',
    birthDate: '',
    province: '',
    city: '',
    addressLine: '',
    companyName: '',
    companyRegistrationNo: '',
    companyEconomicCode: '',
    companyRole: '',
    companyWebsite: '',
  });
  const [documents, setDocuments] = useState<DocumentRow[]>([
    { key: 0, kind: 'NATIONAL_ID_CARD', file: null },
  ]);

  const set = (name: keyof typeof fields) => (value: string) =>
    setFields((prev) => ({ ...prev, [name]: value }));

  const needsCompany = kind === 'COMPANY';

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  const status = data?.status ?? 'UNVERIFIED';
  const canSubmit = status === 'UNVERIFIED' || status === 'REJECTED';

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();

    const ready = documents.filter((doc): doc is DocumentRow & { file: File } => doc.file !== null);

    // The server checks this too. Doing it here as well means somebody is told
    // before they upload and submit rather than after, and it is the only way
    // the form can name which document is missing.
    const supplied = new Set(ready.map((doc) => doc.kind));
    const missing = REQUIRED_DOCUMENTS[kind].filter((required) => !supplied.has(required));
    if (missing.length > 0) {
      showToast(
        kind === 'COMPANY' ? t.market.requiredDocumentsCompany : t.market.requiredDocumentsIndividual,
        'error'
      );
      return;
    }

    upload.start(ready.map((doc) => doc.file));

    try {
      await submit.mutateAsync({
        payload: {
          kind,
          legalFirstName: fields.legalFirstName.trim(),
          legalLastName: fields.legalLastName.trim(),
          nationalId: fields.nationalId.trim(),
          phone: fields.phone.trim(),
          // Blank is not the same as absent to the server's schema, and blank
          // is the one that fails. Anything empty simply does not travel.
          birthDate: fields.birthDate || undefined,
          province: fields.province.trim() || undefined,
          city: fields.city.trim() || undefined,
          addressLine: fields.addressLine.trim() || undefined,
          ...(needsCompany
            ? {
                companyName: fields.companyName.trim() || undefined,
                companyRegistrationNo: fields.companyRegistrationNo.trim() || undefined,
                companyEconomicCode: fields.companyEconomicCode.trim() || undefined,
                companyRole: fields.companyRole.trim() || undefined,
                companyWebsite: fields.companyWebsite.trim() || undefined,
              }
            : {}),
        },
        documents: ready.map((doc) => ({ kind: doc.kind, file: doc.file })),
        onProgress: upload.onProgress,
      });
      upload.done();
      showToast(t.market.verificationSubmitted, 'success');
    } catch (error) {
      showToast(upload.fail(error).message, 'error');
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageHeader title={t.market.verificationTitle} description={t.market.verificationIntro} className="mb-2" />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-body text-app-text-3">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {t.market.verificationStatus}
          </span>
          <Badge variant={verificationVariant(status)}>{t.market[status]}</Badge>
        </div>

        {status === 'PENDING' && (
          <p className="mt-3 text-body text-app-text-3">{t.market.verificationPendingHint}</p>
        )}
        {status === 'APPROVED' && (
          <p className="mt-3 text-body text-app-text-3">{t.market.verificationApprovedHint}</p>
        )}
        {status === 'REJECTED' && (
          <p className="mt-3 text-body text-app-text-3">{t.market.verificationRejectedHint}</p>
        )}

        {data?.reviewNote && (
          <div className="mt-3 rounded border border-app-border-light bg-app-fill p-3">
            <p className="text-label font-medium text-app-text-3">{t.market.reviewNote}</p>
            <p className="mt-1 text-body text-app-text">{data.reviewNote}</p>
          </div>
        )}
      </Card>

      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle>{t.market.submitVerification}</CardTitle>
          </CardHeader>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <FormField label={t.market.accountKind} htmlFor="kind">
              <Select
                id="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as AccountKind)}
              >
                {KINDS.map((value) => (
                  <option key={value} value={value}>
                    {t.market[value]}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t.market.legalFirstName} htmlFor="legalFirstName">
                <Input
                  id="legalFirstName"
                  required
                  value={fields.legalFirstName}
                  onChange={(e) => set('legalFirstName')(e.target.value)}
                />
              </FormField>
              <FormField label={t.market.legalLastName} htmlFor="legalLastName">
                <Input
                  id="legalLastName"
                  required
                  value={fields.legalLastName}
                  onChange={(e) => set('legalLastName')(e.target.value)}
                />
              </FormField>
              <FormField label={t.market.nationalId} htmlFor="nationalId">
                <Input
                  id="nationalId"
                  required
                  inputMode="numeric"
                  className="ltr"
                  value={fields.nationalId}
                  onChange={(e) => set('nationalId')(e.target.value)}
                />
              </FormField>
              <FormField label={t.market.phone} htmlFor="phone">
                <Input
                  id="phone"
                  required
                  inputMode="tel"
                  className="ltr"
                  value={fields.phone}
                  onChange={(e) => set('phone')(e.target.value)}
                />
              </FormField>
              <FormField label={t.market.birthDate} htmlFor="birthDate">
                <DateField
                  id="birthDate"
                  value={fields.birthDate}
                  onChange={(next) => set('birthDate')(next)}
                  // Nobody was born tomorrow.
                  max={new Date().toISOString().slice(0, 10)}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t.market.residenceProvince} htmlFor="province">
                <Input
                  id="province"
                  value={fields.province}
                  onChange={(e) => set('province')(e.target.value)}
                />
              </FormField>
              <FormField label={t.market.residenceCity} htmlFor="city">
                <Input
                  id="city"
                  value={fields.city}
                  onChange={(e) => set('city')(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label={t.market.address} htmlFor="addressLine">
              <TextArea
                id="addressLine"
                rows={2}
                value={fields.addressLine}
                onChange={(e) => set('addressLine')(e.target.value)}
              />
            </FormField>

            {needsCompany && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t.market.companyName} htmlFor="companyName">
                  <Input
                    id="companyName"
                    required
                    value={fields.companyName}
                    onChange={(e) => set('companyName')(e.target.value)}
                  />
                </FormField>
                <FormField label={t.market.companyRegistrationNo} htmlFor="companyRegistrationNo">
                  <Input
                    id="companyRegistrationNo"
                    required
                    className="ltr"
                    value={fields.companyRegistrationNo}
                    onChange={(e) => set('companyRegistrationNo')(e.target.value)}
                  />
                </FormField>
                <FormField label={t.market.companyEconomicCode} htmlFor="companyEconomicCode">
                  <Input
                    id="companyEconomicCode"
                    className="ltr"
                    value={fields.companyEconomicCode}
                    onChange={(e) => set('companyEconomicCode')(e.target.value)}
                  />
                </FormField>
                <FormField label={t.market.companyRole} htmlFor="companyRole">
                  <Input
                    id="companyRole"
                    value={fields.companyRole}
                    onChange={(e) => set('companyRole')(e.target.value)}
                  />
                </FormField>
                <FormField label={t.market.companyWebsite} htmlFor="companyWebsite">
                  <Input
                    id="companyWebsite"
                    type="url"
                    className="ltr"
                    placeholder="https://"
                    value={fields.companyWebsite}
                    onChange={(e) => set('companyWebsite')(e.target.value)}
                  />
                </FormField>
              </div>
            )}

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-body font-medium text-app-text">
                {t.market.documents}
              </legend>
              <p className="-mt-2 text-label text-app-text-4">
                {needsCompany
                  ? t.market.requiredDocumentsCompany
                  : t.market.requiredDocumentsIndividual}
              </p>

              {upload.state.phase !== 'idle' && (
                <UploadStatus state={upload.state} onRetry={() => void handleSubmit()} className="mb-3" />
              )}

              {documents.map((doc, index) => (
                <div key={doc.key} className="flex flex-wrap items-end gap-3">
                  <div className="w-48">
                    <FormField label={t.market.documentKind} htmlFor={`kind-${doc.key}`}>
                      <Select
                        id={`kind-${doc.key}`}
                        value={doc.kind}
                        onChange={(e) =>
                          setDocuments((prev) =>
                            prev.map((row, i) =>
                              i === index
                                ? { ...row, kind: e.target.value as VerificationDocumentKind }
                                : row
                            )
                          )
                        }
                      >
                        {DOCUMENT_KINDS.map((value) => (
                          <option key={value} value={value}>
                            {t.market[value]}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </div>

                  <div className="min-w-48 flex-1">
                    <FormField label={t.market.documents} htmlFor={`file-${doc.key}`}>
                      <Input
                        id={`file-${doc.key}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          setDocuments((prev) =>
                            prev.map((row, i) =>
                              i === index ? { ...row, file: e.target.files?.[0] ?? null } : row
                            )
                          )
                        }
                      />
                    </FormField>
                  </div>

                  {documents.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={t.market.removeDocument}
                      onClick={() => setDocuments((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDocuments((prev) => [
                      ...prev,
                      // Keyed off a counter rather than the length, so removing
                      // a middle row cannot hand a new row a key that is still
                      // in use and make React reuse the wrong file input.
                      { key: (prev.at(-1)?.key ?? 0) + 1, kind: 'OTHER', file: null },
                    ])
                  }
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {t.market.addDocument}
                </Button>
              </div>
            </fieldset>

            <div>
              <Button type="submit" isLoading={submit.isPending}>
                {t.market.submitVerification}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
