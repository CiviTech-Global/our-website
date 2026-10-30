import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Trash2 } from 'lucide-react';
import { useDeleteAccount, useDeletionStatus } from '@/api/workspace';
import { useMfaStatus } from '@/api/mfa';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';

/**
 * The member closes their own account. Asks for what signing in asks for —
 * the password, and the second factor when it is on — plus a deliberate tick,
 * because nothing here can be taken back. Contracts in progress block it; the
 * card says which, rather than letting the request fail.
 *
 * Staff accounts are the super admin's to close, so they see a note instead.
 */
export function DeleteAccount() {
  const { t } = useLocale();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isCustomer = user?.role === 'USER';
  const status = useDeletionStatus(isCustomer);
  const mfa = useMfaStatus(isCustomer);
  const remove = useDeleteAccount();

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [understood, setUnderstood] = useState(false);

  const blocked = status.data && !status.data.canDelete;
  const needsCode = mfa.data?.enabled === true;

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await remove.mutateAsync({ password, code: needsCode ? code : undefined });
      showToast(t.workspace.accountDeleted, 'success');
      // The server already ended every session; this clears the browser's copy.
      await logout().catch(() => {});
      navigate('/');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.workspace.deleteTitle}</CardTitle>
        <CardDescription>{isCustomer ? t.workspace.deleteHint : t.workspace.deleteStaffNote}</CardDescription>
      </CardHeader>

      {isCustomer &&
        (blocked ? (
          <p role="status" className="text-body text-status-error">
            {t.workspace.deleteBlocked
              .replace('{contracts}', String(status.data!.activeContracts))
              .replace('{books}', String(status.data!.booksInHandOver))}
          </p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t.workspace.currentPassword} htmlFor="delete-password">
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
              {needsCode && (
                <FormField label={t.auth.mfaCode} htmlFor="delete-code" hint={t.auth.mfaCodeHint}>
                  <Input
                    id="delete-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </FormField>
              )}
            </div>
            <label className="flex items-center gap-2 text-body text-app-text">
              <input
                type="checkbox"
                className="size-4 rounded border-app-border-light accent-[var(--color-app-primary)]"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
              />
              {t.workspace.deleteConfirm}
            </label>
            <Button
              type="submit"
              variant="danger"
              className="w-fit"
              disabled={!understood || !password || (needsCode && !code)}
              isLoading={remove.isPending}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t.workspace.deleteButton}
            </Button>
          </form>
        ))}
    </Card>
  );
}
