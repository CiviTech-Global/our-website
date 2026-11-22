import { useState } from 'react';
import { CreditCard, Link2 } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { toman } from '@/lib/planFormat';
import {
  useCreatePaymentRequest,
  usePaymentConfig,
  usePaymentRequestList,
  type CreatePaymentRequestInput,
} from '@/api/payments';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Staff: the money side in one place — how this deployment takes payments,
 * and the bills issued for arranged work (consultations, freelance
 * contracts). The bills' payer side is the public /pay page; this page is
 * where they are born and watched.
 */

function GatewayStatusCard() {
  const { t } = useLocale();
  const p = t.payments;
  const config = usePaymentConfig();

  if (config.isLoading) {
    return (
      <Card>
        <div className="flex justify-center py-6">
          <Spinner size={24} label={t.common.loading} />
        </div>
      </Card>
    );
  }
  if (config.isError || !config.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{p.statusCard}</CardTitle>
          <CardDescription>{p.loadError}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const c = config.data;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{p.statusCard}</CardTitle>
            <CardDescription>
              {c.driver} · {p.merchantLabel}: {c.merchantConfigured ? p.merchantSet : p.merchantMissing}
            </CardDescription>
          </div>
          <Badge variant={c.testMerchant ? 'warning' : 'success'}>
            {c.testMerchant ? p.modeBadgeTest : p.modeBadgeLive}
          </Badge>
        </div>
      </CardHeader>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-text-muted">{p.commissionLabel}</dt>
          <dd className="mt-1 text-sm text-text-primary">{c.commissionPercent}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-text-muted">{p.callbackLabel}</dt>
          <dd className="ltr mt-1 break-all text-sm text-text-primary">{c.callbackUrl}</dd>
        </div>
      </dl>
    </Card>
  );
}

interface BillFormState {
  title: string;
  amount: string;
  description: string;
  beneficiaryIban: string;
  beneficiaryName: string;
}

const EMPTY_FORM: BillFormState = {
  title: '',
  amount: '',
  description: '',
  beneficiaryIban: '',
  beneficiaryName: '',
};

function IssueBillCard() {
  const { t } = useLocale();
  const p = t.payments;
  const { showToast } = useToast();
  const [form, setForm] = useState<BillFormState>(EMPTY_FORM);
  const [issued, setIssued] = useState<{ code: string; payUrl: string } | null>(null);
  const create = useCreatePaymentRequest();

  const set = (key: keyof BillFormState) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input: CreatePaymentRequestInput = {
      title: form.title.trim(),
      amount: form.amount.trim().replace(/[,،٬\s]/g, ''),
    };
    if (form.description.trim()) input.description = form.description.trim();
    if (form.beneficiaryIban.trim()) input.beneficiaryIban = form.beneficiaryIban.trim();
    if (form.beneficiaryName.trim()) input.beneficiaryName = form.beneficiaryName.trim();

    try {
      const result = await create.mutateAsync(input);
      setIssued({ code: result.code, payUrl: result.payUrl });
      setForm(EMPTY_FORM);
      showToast(p.createdBill, 'success');
    } catch (error) {
      showToast(apiMessage(error, p.createError), 'error');
    }
  }

  async function copyLink() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.payUrl);
      showToast(p.copied, 'success');
    } catch {
      showToast(issued.payUrl, 'info');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{p.newBillTitle}</CardTitle>
        <CardDescription>{p.billDescriptionLabel}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField label={p.billTitleLabel} htmlFor="bill-title">
          <Input id="bill-title" value={form.title} onChange={set('title')} maxLength={200} required />
        </FormField>
        <FormField label={p.billAmountLabel} htmlFor="bill-amount">
          <Input
            id="bill-amount"
            value={form.amount}
            onChange={set('amount')}
            inputMode="numeric"
            className="ltr"
            required
          />
        </FormField>
        <FormField label={p.billDescriptionLabel} htmlFor="bill-description">
          <Input id="bill-description" value={form.description} onChange={set('description')} maxLength={1000} />
        </FormField>
        <FormField label={p.billShebaLabel} htmlFor="bill-sheba">
          <Input
            id="bill-sheba"
            value={form.beneficiaryIban}
            onChange={set('beneficiaryIban')}
            placeholder="IR________________________"
            className="ltr"
            maxLength={40}
          />
        </FormField>
        <FormField label={p.billBeneficiaryLabel} htmlFor="bill-beneficiary">
          <Input id="bill-beneficiary" value={form.beneficiaryName} onChange={set('beneficiaryName')} maxLength={120} />
        </FormField>
        <Button type="submit" isLoading={create.isPending} className="w-full sm:w-fit">
          <CreditCard className="size-4" />
          {create.isPending ? p.creating : p.createButton}
        </Button>
      </form>

      {issued && (
        <div className="mt-4 rounded-lg border border-brand-green-300 bg-brand-green-50 p-4">
          <p className="text-sm text-text-primary">{p.createdBill}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link2 className="size-4 text-text-muted" aria-hidden="true" />
            <a href={issued.payUrl} className="ltr break-all text-sm text-brand-green-700 underline" target="_blank" rel="noreferrer">
              {issued.payUrl}
            </a>
            <Button variant="outline" size="sm" onClick={copyLink}>
              {p.copyButton}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function BillsCard() {
  const { t, locale } = useLocale();
  const p = t.payments;
  const [page, setPage] = useState(1);
  const list = usePaymentRequestList(page);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{p.billsCard}</CardTitle>
      </CardHeader>
      {list.isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size={24} label={t.common.loading} />
        </div>
      ) : list.isError || !list.data ? (
        <CardDescription>{p.loadError}</CardDescription>
      ) : list.data.items.length === 0 ? (
        <EmptyState title={p.billsCard} description={p.newBillTitle} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-start text-xs text-text-muted">
                  <th className="py-2 pe-4 text-start font-normal">{p.listCode}</th>
                  <th className="py-2 pe-4 text-start font-normal">{p.listTitle}</th>
                  <th className="py-2 pe-4 text-start font-normal">{p.listAmount}</th>
                  <th className="py-2 pe-4 text-start font-normal">{p.listBeneficiary}</th>
                  <th className="py-2 pe-4 text-start font-normal">{p.listStatus}</th>
                  <th className="py-2 text-start font-normal">{p.listCreated}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((item) => (
                  <tr key={item.id} className="border-b border-border-subtle last:border-0">
                    <td className="py-2 pe-4 font-mono text-xs">{item.code}</td>
                    <td className="py-2 pe-4">{item.title}</td>
                    <td className="py-2 pe-4 whitespace-nowrap">
                      {toman(item.amount, locale)} {p.irt}
                    </td>
                    <td className="py-2 pe-4">{item.beneficiaryName ?? '—'}</td>
                    <td className="py-2 pe-4">
                      <Badge variant={item.paidAt ? 'success' : 'info'}>
                        {item.paidAt ? p.paidBadge : p.unpaidBadge}
                      </Badge>
                    </td>
                    <td className="py-2 whitespace-nowrap">{formatDate(item.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
                {t.common.back}
              </Button>
              <span className="text-xs text-text-muted">
                {page} / {list.data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= list.data.totalPages}
                onClick={() => setPage((v) => v + 1)}
              >
                {t.common.next}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/** Staff: gateway status, issuing bills, and watching them get paid. */
export default function AdminPaymentsPage() {
  const { t } = useLocale();
  useDocumentTitle(t.payments.adminTitle);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.payments.adminTitle} className="mb-0" />
      <GatewayStatusCard />
      <IssueBillCard />
      <BillsCard />
    </div>
  );
}
