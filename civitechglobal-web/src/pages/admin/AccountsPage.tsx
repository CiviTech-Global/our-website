import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { useCreateCompanyAccount, useVouchedAccounts, type PlanSubject } from '@/api/billing';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';

const EMPTY = {
  companyName: '',
  nationalId: '',
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  phone: '',
  password: '',
};

/**
 * Staff: accounts opened for a company or an expert the desk met, whose
 * credentials are handed over in person. Experts are opened from the experts
 * page, where their profile is written at the same time.
 */
export default function AdminAccountsPage() {
  const { t, locale } = useLocale();
  const p = t.plans;
  useDocumentTitle(p.adminAccountsTitle);
  const { showToast } = useToast();
  const create = useCreateCompanyAccount();
  const [form, setForm] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useVouchedAccounts(page);
  const { user } = useAuth();
  // Granting is billing's key; the shortcut is only offered to whoever holds it.
  const canGrant = user?.role === 'SUPER_ADMIN' || (user?.permissions ?? []).includes('billing');
  const grantHref = (subject: PlanSubject, holder: string, name: string) =>
    `/admin/plans?${new URLSearchParams({ subject, holder, name }).toString()}`;

  const field = (name: keyof typeof EMPTY) => ({
    id: `account-${name}`,
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync({
        companyName: form.companyName,
        nationalId: form.nationalId,
        account: {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username || undefined,
          phone: form.phone || undefined,
        },
      });
      showToast(p.accountCreated, 'success');
      setForm(EMPTY);
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={p.adminAccountsTitle} description={p.adminAccountsIntro} className="mb-0" />

      <Card>
        <CardHeader>
          <CardTitle>{p.newCompanyAccount}</CardTitle>
        </CardHeader>
        <form onSubmit={(e) => void onCreate(e)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={p.companyName} htmlFor="account-companyName">
              <Input required {...field('companyName')} />
            </FormField>
            <FormField label={p.companyNationalId} htmlFor="account-nationalId" hint={p.companyNationalIdHint}>
              <Input required inputMode="numeric" dir="ltr" className="ltr text-start" {...field('nationalId')} />
            </FormField>
          </div>
          <p className="text-body font-medium text-app-text">{p.operator}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label={p.firstName} htmlFor="account-firstName">
              <Input required {...field('firstName')} />
            </FormField>
            <FormField label={p.lastName} htmlFor="account-lastName">
              <Input required {...field('lastName')} />
            </FormField>
            <FormField label={p.phone} htmlFor="account-phone">
              <Input type="tel" dir="ltr" className="ltr text-start" placeholder="09…" {...field('phone')} />
            </FormField>
            <FormField label={p.email} htmlFor="account-email">
              <Input required type="email" dir="ltr" className="ltr text-start" {...field('email')} />
            </FormField>
            <FormField label={p.username} htmlFor="account-username">
              <Input dir="ltr" className="ltr text-start" {...field('username')} />
            </FormField>
            <FormField label={p.password} htmlFor="account-password" hint={t.auth.passwordHint}>
              <Input required type="text" autoComplete="new-password" dir="ltr" className="ltr text-start" {...field('password')} />
            </FormField>
          </div>
          <Button type="submit" isLoading={create.isPending} className="w-fit">
            {p.createAccount}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{p.adminAccountsTitle}</CardTitle>
        </CardHeader>
        {isLoading && <Spinner label={t.common.loading} />}
        {data?.items.length === 0 && <p className="text-body text-app-text-4">{p.noAccounts}</p>}
        <ul className="flex flex-col divide-y divide-app-border">
          {data?.items.map((account) => (
            <li key={account.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="text-body text-app-text">
                  {account.company?.name ?? account.expertProfile?.fullName ?? `${account.firstName} ${account.lastName}`}
                </p>
                <p className="text-label text-app-text-4">
                  <span dir="ltr">{account.email}</span>
                  {account.username && (
                    <>
                      {' · '}
                      <span dir="ltr">@{account.username}</span>
                    </>
                  )}
                  {' · '}
                  {p.vouchedAt} {formatDate(account.staffVouchedAt, locale)}
                </p>
                <p className="text-label text-app-text-4">
                  {p.grantUserId}: <span dir="ltr" className="select-all">{account.id}</span>
                  {account.company && (
                    <>
                      {' · '}
                      {p.grantCompanyId}: <span dir="ltr" className="select-all">{account.company.id}</span>
                    </>
                  )}
                </p>
                {canGrant && (
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-label">
                    <span className="text-app-text-4">{p.grantTitle}:</span>
                    {account.company && (
                      <Link className="text-app-primary hover:underline" to={grantHref('COMPANY', account.company.id, account.company.name)}>
                        {p.subjects.COMPANY}
                      </Link>
                    )}
                    {(['BUSINESS', 'USER'] as const).map((subject) => (
                      <Link
                        key={subject}
                        className="text-app-primary hover:underline"
                        to={grantHref(subject, account.id, `${account.firstName} ${account.lastName}`.trim() || account.email)}
                      >
                        {p.subjects[subject]}
                      </Link>
                    ))}
                  </p>
                )}
              </div>
              <Badge>{account.accountKind === 'COMPANY' ? p.kindCompany : p.expertTitle}</Badge>
            </li>
          ))}
        </ul>
        {data && data.total > data.pageSize && (
          <div className="mt-4">
            <Pagination page={page} totalPages={Math.ceil(data.total / data.pageSize)} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
