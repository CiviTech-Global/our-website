import { useState, type FormEvent } from 'react';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useOwnVerification, useSubmitVerification } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { verificationVariant } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type { AccountKind, VerificationDocumentKind } from '@/types/marketplace';

const KINDS: AccountKind[] = ['INDIVIDUAL', 'COMPANY', 'COMPANY_REPRESENTATIVE'];

const DOCUMENT_KINDS: VerificationDocumentKind[] = [
  'NATIONAL_ID_CARD',
  'BIRTH_CERTIFICATE',
  'COMPANY_REGISTRATION',
  'OFFICIAL_GAZETTE',
  'AUTHORISATION_LETTER',
  'OTHER',
];

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

  const [kind, setKind] = useState<AccountKind>('INDIVIDUAL');
  const [fields, setFields] = useState({
    legalFirstName: '',
    legalLastName: '',
    nationalId: '',
    phone: '',
    birthDate: '',
    address: '',
    companyName: '',
    companyRegistrationNumber: '',
    companyNationalId: '',
    positionTitle: '',
  });
  const [documents, setDocuments] = useState<DocumentRow[]>([
    { key: 0, kind: 'NATIONAL_ID_CARD', file: null },
  ]);

  const set = (name: keyof typeof fields) => (value: string) =>
    setFields((prev) => ({ ...prev, [name]: value }));

  const needsCompany = kind === 'COMPANY' || kind === 'COMPANY_REPRESENTATIVE';

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  const status = data?.status ?? 'UNVERIFIED';
  const canSubmit = status === 'UNVERIFIED' || status === 'REJECTED';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const ready = documents.filter((doc): doc is DocumentRow & { file: File } => doc.file !== null);
    if (ready.length === 0) {
      showToast(t.market.documents, 'error');
      return;
    }

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
          address: fields.address.trim() || undefined,
          ...(needsCompany
            ? {
                companyName: fields.companyName.trim() || undefined,
                companyRegistrationNumber: fields.companyRegistrationNumber.trim() || undefined,
                companyNationalId: fields.companyNationalId.trim() || undefined,
                positionTitle: fields.positionTitle.trim() || undefined,
              }
            : {}),
        },
        documents: ready.map((doc) => ({ kind: doc.kind, file: doc.file })),
      });
      showToast(t.market.verificationSubmitted, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t.market.verificationTitle}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.market.verificationIntro}</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-text-secondary">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {t.market.verificationStatus}
          </span>
          <Badge variant={verificationVariant(status)}>{t.market[status]}</Badge>
        </div>

        {status === 'PENDING' && (
          <p className="mt-3 text-sm text-text-secondary">{t.market.verificationPendingHint}</p>
        )}
        {status === 'APPROVED' && (
          <p className="mt-3 text-sm text-text-secondary">{t.market.verificationApprovedHint}</p>
        )}
        {status === 'REJECTED' && (
          <p className="mt-3 text-sm text-text-secondary">{t.market.verificationRejectedHint}</p>
        )}

        {data?.reviewNote && (
          <div className="mt-3 rounded-lg border border-border-default bg-surface-200 p-3">
            <p className="text-xs font-medium text-text-secondary">{t.market.reviewNote}</p>
            <p className="mt-1 text-sm text-text-primary">{data.reviewNote}</p>
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
                <Input
                  id="birthDate"
                  type="date"
                  className="ltr"
                  value={fields.birthDate}
                  onChange={(e) => set('birthDate')(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label={t.market.address} htmlFor="address">
              <TextArea
                id="address"
                rows={2}
                value={fields.address}
                onChange={(e) => set('address')(e.target.value)}
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
                <FormField
                  label={t.market.companyRegistrationNumber}
                  htmlFor="companyRegistrationNumber"
                >
                  <Input
                    id="companyRegistrationNumber"
                    required
                    className="ltr"
                    value={fields.companyRegistrationNumber}
                    onChange={(e) => set('companyRegistrationNumber')(e.target.value)}
                  />
                </FormField>
                <FormField label={t.market.companyNationalId} htmlFor="companyNationalId">
                  <Input
                    id="companyNationalId"
                    className="ltr"
                    value={fields.companyNationalId}
                    onChange={(e) => set('companyNationalId')(e.target.value)}
                  />
                </FormField>
                {kind === 'COMPANY_REPRESENTATIVE' && (
                  <FormField label={t.market.positionTitle} htmlFor="positionTitle">
                    <Input
                      id="positionTitle"
                      required
                      value={fields.positionTitle}
                      onChange={(e) => set('positionTitle')(e.target.value)}
                    />
                  </FormField>
                )}
              </div>
            )}

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-medium text-text-primary">
                {t.market.documents}
              </legend>

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
